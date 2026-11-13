-- =====================================================================
-- 04: Stripe 購入時のクレジット付与を「1つの決済につき1回だけ」にする
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: ポータルの修正を公開する「前」（関数の追加と、使われていない危険な権限の削除だけ）
--
-- 事前確認済み（2026-11-13）:
--   - purchases.stripe_session_id には UNIQUE 制約あり（重複データ 0 件）
--   - purchases にチェック制約なし。amount_paid / credits_granted は NOT NULL
--   - credit_transactions にチェック制約なし
-- =====================================================================

-- 購入記録の保存とクレジット加算を1回で行う。
-- 同じ stripe_session_id が2回来たら、2回目は何もしない（granted: false）。
-- 途中で失敗したら全部取り消される（記録だけ残ってクレジットが付かない、は起きない）。
create or replace function public.grant_purchase_credits(
  p_user_id uuid,
  p_session_id text,
  p_amount_paid integer,
  p_regular_credits integer,
  p_bonus_credits integer
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer := coalesce(p_regular_credits, 0) + coalesce(p_bonus_credits, 0);
  v_purchase_id uuid;
  v_new_balance integer;
begin
  if p_user_id is null or p_session_id is null or p_session_id = '' then
    raise exception 'INVALID_ARGUMENTS';
  end if;
  if v_total <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  insert into public.purchases (user_id, stripe_session_id, amount_paid, credits_granted, regular_credits, bonus_credits)
  values (p_user_id, p_session_id, coalesce(p_amount_paid, 0), v_total, coalesce(p_regular_credits, 0), coalesce(p_bonus_credits, 0))
  on conflict (stripe_session_id) do nothing
  returning id into v_purchase_id;

  if v_purchase_id is null then
    -- すでに処理済みの決済（Stripe の再送など）
    return json_build_object('granted', false, 'reason', 'ALREADY_PROCESSED');
  end if;

  update public.profiles
     set credits = coalesce(credits, 0) + v_total
   where id = p_user_id
  returning credits into v_new_balance;

  if not found then
    -- プロフィールが無い → 全部取り消して Webhook に 500 を返させる（Stripe が再送する）
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  insert into public.credit_transactions (user_id, amount, feature_used, description)
  values (p_user_id, v_total, 'credit_charge', 'Stripe purchase ' || p_session_id);

  return json_build_object('granted', true, 'credits', v_new_balance);
end;
$$;

-- Webhook（service_role）だけが呼べるようにする
revoke all on function public.grant_purchase_credits(uuid, text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.grant_purchase_credits(uuid, text, integer, integer, integer) to service_role;

-- 危険: だれでも呼べる increment_credits を削除する（どこからも使われなくなる）
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.proname = 'increment_credits' and p.pronamespace = 'public'::regnamespace
  loop
    execute 'drop function ' || r.sig;
  end loop;
end $$;

-- 危険: だれでも purchases に行を追加できるポリシーを削除する（書き込みは Webhook だけ）
drop policy if exists "Enable insert for service role and users" on public.purchases;
revoke insert, update, delete on public.purchases from anon, authenticated;

-- 確認用: 3行とも期待どおりなら成功
select 'grant_purchase_credits exists (expect 1)' as item, count(*)::text as value
  from pg_proc where proname = 'grant_purchase_credits'
union all
select 'increment_credits exists (expect 0)', count(*)::text
  from pg_proc where proname = 'increment_credits'
union all
select 'purchases insert policies (expect 0)', count(*)::text
  from pg_policies where schemaname = 'public' and tablename = 'purchases' and cmd = 'INSERT';
