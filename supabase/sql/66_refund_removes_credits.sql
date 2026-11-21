-- =====================================================================
-- 66: Stripe で返金したら、その支払いでもらったクレジットのうち「まだ使っていない分」を自動で消す
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: 51 のあと。ポータル（Webhook の charge.refunded）を公開する「前」でも「あと」でもよい
--   （関数がないあいだに来た返金は Webhook が 500 を返し、Stripe が送り直すので取りこぼさない）
--
-- 利用規約 8 章（2026-11-22）: 返金したら、その支払いの使っていないクレジットを消し、つながるプラン・パスを終える
-- 呼ぶのは Webhook（functions/api/webhook/stripe.ts）だけ。全額返金のときだけ呼ぶ（一部返金は手で調整する）
--
--   p_reference      … purchases.stripe_session_id と同じ値
--                       パック・AI 体験・パス = Checkout の session ID ／ サブスク = invoice ID
--   p_subscription_id, p_period_start, p_period_end … サブスクの請求のときだけ（その請求の期間）
--
-- ・同じ返金が何度届いても、1 回しか消さない（purchases.refunded_at）
-- ・もう使ったクレジットは取り戻さない（残高がマイナスにはならない）
-- ・AI 体験の記録（カードの識別コード）は残す（返金後に同じカードでもう一度体験させない）
-- 何度実行しても安全。
-- =====================================================================

begin;

alter table public.purchases add column if not exists refunded_at timestamptz;

create or replace function public.revoke_refunded_payment(
  p_reference text,
  p_subscription_id text default null,
  p_period_start timestamptz default null,
  p_period_end timestamptz default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_purchase_id uuid;
  v_removed integer := 0;
  v_balance integer;
  v_lot_ids uuid[];
begin
  if coalesce(p_reference, '') = '' then
    raise exception 'INVALID_ARGUMENTS';
  end if;

  select id, user_id into v_purchase_id, v_user_id
    from public.purchases
   where stripe_session_id = p_reference
   for update;
  if v_purchase_id is null then
    -- クレジットを渡していない支払い（2 回目の AI 体験の自動返金など）
    return json_build_object('revoked', false, 'reason', 'NOT_FOUND');
  end if;
  if exists (select 1 from public.purchases where id = v_purchase_id and refunded_at is not null) then
    return json_build_object('revoked', false, 'reason', 'ALREADY_PROCESSED');
  end if;
  if v_user_id is null then
    update public.purchases set refunded_at = now() where id = v_purchase_id;
    return json_build_object('revoked', false, 'reason', 'NO_USER');
  end if;

  perform 1 from public.profiles where id = v_user_id for update;
  perform public._expire_user_credit_lots(v_user_id);

  -- どのロットがこの支払いの分か
  if p_subscription_id is not null and p_period_start is not null and p_period_end is not null then
    -- サブスク: その請求の期間に渡した毎月の分（月額は 1 つ、年払いは最大 12）。
    -- 毎月の分は「その月の始まり + 2 か月」で切れるので、切れる日で見分ける
    select array_agg(id) into v_lot_ids
      from public.credit_lots
     where user_id = v_user_id
       and source = 'subscription'
       and reference = p_subscription_id
       and expires_at >= p_period_start + interval '2 months' - interval '1 hour'
       and expires_at <  p_period_end   + interval '2 months' - interval '1 hour';
  else
    -- パック・AI 体験・パス: ロットに session ID が入っている
    select array_agg(id) into v_lot_ids
      from public.credit_lots
     where user_id = v_user_id
       and reference = p_reference
       and source in ('pack', 'trial', 'season');
  end if;

  if v_lot_ids is not null then
    select coalesce(sum(remaining), 0) into v_removed from public.credit_lots where id = any(v_lot_ids);
    update public.credit_lots
       set remaining = 0,
           expires_at = least(coalesce(expires_at, now()), now())
     where id = any(v_lot_ids);
  end if;

  if v_removed > 0 then
    update public.profiles
       set credits = greatest(0, coalesce(credits, 0) - v_removed)
     where id = v_user_id
    returning credits into v_balance;
    insert into public.credit_transactions (user_id, amount, feature_used, description, balance_after)
    values (v_user_id, -v_removed, 'payment_refunded', 'Payment refunded — unused credits removed', v_balance);
  end if;

  -- パスなら、すぐ終える
  update public.season_passes set ends_at = least(ends_at, now()) where stripe_session_id = p_reference;

  -- サブスクの今の期間の請求なら、サブスクを終える（年払いの残りの月の分を定期処理が渡さないように）。
  -- Webhook は Stripe 側のサブスクも解約するので、あとで届く customer.subscription.deleted でも同じ状態になる
  if p_subscription_id is not null and p_period_end is not null and p_period_end > now() then
    update public.subscriptions
       set status = 'canceled', updated_at = now()
     where id = p_subscription_id and user_id = v_user_id;
  end if;

  update public.purchases set refunded_at = now() where id = v_purchase_id;
  return json_build_object('revoked', true, 'credits_removed', v_removed, 'lots', coalesce(array_length(v_lot_ids, 1), 0));
end;
$$;

revoke all on function public.revoke_refunded_payment(text, text, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.revoke_refunded_payment(text, text, timestamptz, timestamptz) to service_role;

commit;

-- 確認用: 関数が 1 行、purchases.refunded_at の列が 1 行出ること
select 'function' as what, p.proname::text as name
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'revoke_refunded_payment'
union all
select 'column', c.column_name::text
from information_schema.columns c
where c.table_schema = 'public' and c.table_name = 'purchases' and c.column_name = 'refunded_at';
