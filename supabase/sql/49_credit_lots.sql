-- =====================================================================
-- 49: クレジットに「有効期限」をつける（もらった単位ごとに管理する）＋ 新規登録の 10 クレジットをやめる
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: 26_daily_quiz_timezone.sql のあと（毎日クイズの関数を 26 から作り直すため）。api の毎時の期限切れ処理は、この SQL のあとに公開すれば動く。前でもエラーにはならない
--
-- これまで: クレジットは profiles.credits という 1 つの数字だけで、期限のしくみがなかった
--   （毎日クイズの「付与から 7 日で期限切れ」は説明の文だけで、実際には切れていなかった）。
-- これから: もらったクレジットを「ロット」（credit_lots）として、もらった単位ごとに残りと期限を持つ。
--   ・毎日クイズ: 7 日 ／ クレジットパック: 1 年 ／ 今ある残高（動作テスト用のアカウント）: 期限なし
--   ・サブスク・シーズンプランの分は、決済のしくみ（次の SQL）で同じロットとして足す
--   ・使うときは、期限の近いロットから減らす（consume_credits）
--   ・失敗した AI の処理で返すときは、引いたロットに戻す（refund_credits）
--   ・期限が来たロットは 0 にして、履歴に「期限切れ」を残す（api が 1 時間ごとに expire_credit_lots を呼ぶ。
--     使うときにも、その人の期限切れを先に片づける）
--   ・profiles.credits は「使えるロットの残りの合計」として今までどおり持つので、画面や api はそのまま動く
--   ・どの変更も credit_transactions に balance_after つきで記録する（07 の決まり）
-- 新規登録の 10 クレジット（ウェルカムボーナス）は、profiles.credits の初期値を 0 にしてやめる
--   （handle_new_user は初期値が 0 のときは何も記録しない）。
-- 何度実行しても安全（今ある残高をロットにする処理は、まだロットがない人だけ）。
-- =====================================================================

begin;

-- 1. 新規登録の 10 クレジットをやめる
alter table public.profiles alter column credits set default 0;

-- 2. ロット（もらった単位ごとのクレジット）
create table if not exists public.credit_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null check (source in (
    'legacy',        -- この SQL の前からあった残高（期限なし）
    'daily_quiz',    -- 毎日クイズ（7 日）
    'trial',         -- AI 体験 A$1（決済のしくみで使う）
    'subscription',  -- 月額・年払いの毎月の分（翌月末まで）
    'season',        -- シーズンプラン（期間の終わりまで）
    'pack',          -- クレジットパック（1 年）
    'refund',        -- 返したクレジット（元のロットが期限切れだったとき）
    'adjustment'     -- 管理者の調整
  )),
  amount integer not null check (amount > 0),
  remaining integer not null check (remaining >= 0),
  expires_at timestamptz,          -- NULL は期限なし
  reference text,                  -- Stripe の決済 ID など
  created_at timestamptz not null default now()
);
create index if not exists credit_lots_user_active_idx
  on public.credit_lots (user_id, expires_at) where remaining > 0;

-- 本人は自分のロットを見られる（「いつ何クレジットが切れるか」を画面に出すため）。書き換えはできない
alter table public.credit_lots enable row level security;
revoke all on public.credit_lots from anon, authenticated;
grant select on public.credit_lots to authenticated;
drop policy if exists credit_lots_select_own on public.credit_lots;
create policy credit_lots_select_own on public.credit_lots for select to authenticated using (user_id = auth.uid());
grant select, insert, update, delete on public.credit_lots to service_role;

-- 3. どのロットから何クレジット使ったか（返すときに、同じロットに戻すため）。ブラウザからは見えない
create table if not exists public.credit_lot_usage (
  id bigint generated always as identity primary key,
  consume_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  feature text not null,
  lot_id uuid not null references public.credit_lots (id) on delete cascade,
  amount integer not null check (amount > 0),
  refunded boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists credit_lot_usage_user_idx on public.credit_lot_usage (user_id, feature, created_at desc);
alter table public.credit_lot_usage enable row level security;
revoke all on public.credit_lot_usage from anon, authenticated;
grant select, insert, update, delete on public.credit_lot_usage to service_role;

-- 4. 今ある残高を「期限なし」のロットにする（まだロットがない人だけ）
insert into public.credit_lots (user_id, source, amount, remaining, expires_at)
select p.id, 'legacy', p.credits, p.credits, null
from public.profiles p
where coalesce(p.credits, 0) > 0
  and not exists (select 1 from public.credit_lots l where l.user_id = p.id);

-- 5. その人の期限切れのロットを片づける（内部用。呼ぶ側が profiles の行をロックしてから呼ぶ）
create or replace function public._expire_user_credit_lots(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expired integer;
  v_balance integer;
begin
  select coalesce(sum(remaining), 0) into v_expired
    from public.credit_lots
   where user_id = p_user_id and remaining > 0 and expires_at is not null and expires_at <= now();
  if v_expired = 0 then
    return 0;
  end if;

  update public.credit_lots
     set remaining = 0
   where user_id = p_user_id and remaining > 0 and expires_at is not null and expires_at <= now();

  update public.profiles
     set credits = greatest(0, coalesce(credits, 0) - v_expired)
   where id = p_user_id
  returning credits into v_balance;

  insert into public.credit_transactions (user_id, amount, feature_used, description, balance_after)
  values (p_user_id, -v_expired, 'credit_expired', 'Credits expired', v_balance);
  return v_expired;
end;
$$;

-- 6. ロットを足す（内部用。呼ぶ側が profiles の行をロックしてから呼ぶ）。新しい残高を返す
create or replace function public._add_credit_lot(
  p_user_id uuid,
  p_source text,
  p_amount integer,
  p_expires_at timestamptz,
  p_feature text,
  p_description text,
  p_reference text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;
  insert into public.credit_lots (user_id, source, amount, remaining, expires_at, reference)
  values (p_user_id, p_source, p_amount, p_amount, p_expires_at, p_reference);

  update public.profiles
     set credits = coalesce(credits, 0) + p_amount
   where id = p_user_id
  returning credits into v_balance;
  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  insert into public.credit_transactions (user_id, amount, feature_used, description, balance_after)
  values (p_user_id, p_amount, p_feature, p_description, v_balance);
  return v_balance;
end;
$$;

-- 7. クレジットを使う（期限の近いロットから）。引数と戻り値は今までと同じ
create or replace function public.consume_credits(p_user_id uuid, p_amount integer, p_feature text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_available integer;
  v_left integer := p_amount;
  v_take integer;
  v_consume_id uuid := gen_random_uuid();
  v_balance integer;
  r record;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  -- 同じ人の処理が同時に来ても二重に使えないよう、その人の行をロックする
  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    return json_build_object('ok', false, 'balance', 0);
  end if;

  perform public._expire_user_credit_lots(p_user_id);

  select coalesce(sum(remaining), 0) into v_available
    from public.credit_lots
   where user_id = p_user_id and remaining > 0 and (expires_at is null or expires_at > now());
  if v_available < p_amount then
    return json_build_object('ok', false, 'balance', v_available);
  end if;

  for r in
    select id, remaining
      from public.credit_lots
     where user_id = p_user_id and remaining > 0 and (expires_at is null or expires_at > now())
     order by expires_at asc nulls last, created_at asc, id asc
     for update
  loop
    exit when v_left <= 0;
    v_take := least(r.remaining, v_left);
    update public.credit_lots set remaining = remaining - v_take where id = r.id;
    insert into public.credit_lot_usage (consume_id, user_id, feature, lot_id, amount)
    values (v_consume_id, p_user_id, p_feature, r.id, v_take);
    v_left := v_left - v_take;
  end loop;

  update public.profiles
     set credits = coalesce(credits, 0) - p_amount
   where id = p_user_id
  returning credits into v_balance;

  insert into public.credit_transactions (user_id, amount, feature_used, description, balance_after)
  values (p_user_id, -p_amount, p_feature, 'Consumed for ' || p_feature || ' execution', v_balance);

  return json_build_object('ok', true, 'balance', v_balance);
end;
$$;

-- 8. 失敗した AI の処理のクレジットを返す（いちばん新しい、まだ返していない同じ機能・同じ数の使用を、同じロットに戻す）
create or replace function public.refund_credits(p_user_id uuid, p_amount integer, p_feature text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_consume_id uuid;
  v_balance integer;
  v_restored integer := 0;
  r record;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    return json_build_object('ok', false);
  end if;

  select u.consume_id into v_consume_id
    from public.credit_lot_usage u
   where u.user_id = p_user_id and u.feature = p_feature and not u.refunded
   group by u.consume_id
  having sum(u.amount) = p_amount
   order by max(u.created_at) desc
   limit 1;

  if v_consume_id is not null then
    for r in
      select u.id as usage_id, u.lot_id, u.amount, l.expires_at
        from public.credit_lot_usage u
        join public.credit_lots l on l.id = u.lot_id
       where u.consume_id = v_consume_id
       for update of u, l
    loop
      if r.expires_at is null or r.expires_at > now() then
        update public.credit_lots set remaining = remaining + r.amount where id = r.lot_id;
        v_restored := v_restored + r.amount;
      end if;
      update public.credit_lot_usage set refunded = true where id = r.usage_id;
    end loop;
  end if;

  -- 元のロットが期限切れだった分・見つからなかった分は、新しいロットで返す
  --  （元のロットが分からない古い使用は期限なし、期限切れのロットの分は 7 日）
  if v_restored < p_amount then
    insert into public.credit_lots (user_id, source, amount, remaining, expires_at)
    values (p_user_id, 'refund', p_amount - v_restored, p_amount - v_restored,
            case when v_consume_id is null then null else now() + interval '7 days' end);
  end if;

  update public.profiles
     set credits = coalesce(credits, 0) + p_amount
   where id = p_user_id
  returning credits into v_balance;

  insert into public.credit_transactions (user_id, amount, feature_used, description, balance_after)
  values (p_user_id, p_amount, p_feature, 'Refund: ' || p_feature || ' failed', v_balance);
  return json_build_object('ok', true, 'balance', v_balance);
end;
$$;

-- 9. 毎日クイズ（26 と同じ判定。足し方だけ「7 日で切れるロット」に変える）
create or replace function public.claim_daily_quiz_reward()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  tz text;
  today date;
  new_balance integer;
  v_claimed boolean := false;
  p record;
begin
  if uid is null then
    raise exception 'LOGIN_REQUIRED';
  end if;

  select timezone into tz from public.profiles where id = uid;
  tz := coalesce(tz, 'UTC');
  today := (now() at time zone tz)::date;

  update public.profiles
     set last_quiz_date = today,
         last_quiz_at = now()
   where id = uid
     and (last_quiz_date is null or last_quiz_date::date < today)
     and (last_quiz_at is null or last_quiz_at <= now() - interval '8 hours')
  returning true into v_claimed;

  if v_claimed then
    perform public._expire_user_credit_lots(uid);
    new_balance := public._add_credit_lot(uid, 'daily_quiz', 2, now() + interval '7 days', 'daily_quiz', 'Daily quiz reward');
  end if;

  select last_quiz_date::date as last_date, last_quiz_at into p from public.profiles where id = uid;

  if not coalesce(v_claimed, false) then
    return json_build_object(
      'granted', false,
      'seconds_until_next', greatest(0, ceil(extract(epoch from
          (public._daily_quiz_next_at(tz, p.last_date, p.last_quiz_at) - now()))))::integer
    );
  end if;

  return json_build_object(
    'granted', true,
    'credits', new_balance,
    'seconds_until_next', greatest(0, ceil(extract(epoch from
        (public._daily_quiz_next_at(tz, p.last_date, p.last_quiz_at) - now()))))::integer
  );
end;
$$;

-- 10. クレジットパックの購入（07 と同じ。足し方だけ「1 年で切れるロット」に変える）
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
    return json_build_object('granted', false, 'reason', 'ALREADY_PROCESSED');
  end if;

  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;
  perform public._expire_user_credit_lots(p_user_id);
  v_new_balance := public._add_credit_lot(p_user_id, 'pack', v_total, now() + interval '1 year',
                                          'credit_charge', 'Stripe purchase ' || p_session_id, p_session_id);
  return json_build_object('granted', true, 'credits', v_new_balance);
end;
$$;

-- 11. 期限切れのロットを全員分片づける（api の定期処理が呼ぶ）。片づけた人数を返す
create or replace function public.expire_credit_lots()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_users integer := 0;
  r record;
begin
  for r in
    select distinct user_id
      from public.credit_lots
     where remaining > 0 and expires_at is not null and expires_at <= now()
  loop
    perform 1 from public.profiles where id = r.user_id for update;
    if public._expire_user_credit_lots(r.user_id) > 0 then
      v_users := v_users + 1;
    end if;
  end loop;
  return v_users;
end;
$$;

-- 12. 実行できる人: 内部用・お金に関わるものは service_role だけ。毎日クイズはログインユーザー
revoke all on function public._expire_user_credit_lots(uuid) from public, anon, authenticated;
revoke all on function public._add_credit_lot(uuid, text, integer, timestamptz, text, text, text) from public, anon, authenticated;
revoke all on function public.consume_credits(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.refund_credits(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.grant_purchase_credits(uuid, text, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.expire_credit_lots() from public, anon, authenticated;
grant execute on function public.consume_credits(uuid, integer, text) to service_role;
grant execute on function public.refund_credits(uuid, integer, text) to service_role;
grant execute on function public.grant_purchase_credits(uuid, text, integer, integer, integer) to service_role;
grant execute on function public.expire_credit_lots() to service_role;
revoke all on function public.claim_daily_quiz_reward() from public, anon;
grant execute on function public.claim_daily_quiz_reward() to authenticated;

commit;

notify pgrst, 'reload schema';

-- 確認用（SQL Editor は最後の SELECT しか表示しない）: 4 行とも ok が true なら成功
select 'welcome bonus stopped (default credits = 0)' as item,
       (select column_default from information_schema.columns
         where table_schema = 'public' and table_name = 'profiles' and column_name = 'credits') = '0' as ok
union all
select 'every balance matches its lots',
       not exists (
         select 1 from public.profiles p
          where coalesce(p.credits, 0) <> coalesce((
                  select sum(remaining) from public.credit_lots l
                   where l.user_id = p.id and l.remaining > 0 and (l.expires_at is null or l.expires_at > now())), 0)
       )
union all
select 'browser cannot call consume_credits',
       not has_function_privilege('authenticated', 'public.consume_credits(uuid, integer, text)', 'execute')
union all
select 'daily quiz still callable by signed-in users',
       has_function_privilege('authenticated', 'public.claim_daily_quiz_reward()', 'execute');
