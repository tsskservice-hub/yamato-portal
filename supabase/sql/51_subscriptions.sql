-- =====================================================================
-- 51: サブスク（月額・年払い）・シーズンプラン・AI 体験（A$1）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: 49 のあと。ポータル（支払い画面・Webhook）を公開する「前」
--
-- 決まっていること（2026-11-18、メモ subscription-plan）:
--   ・Basic（A$5／月・A$51／年）: 毎月 200 クレジット ／ Plus（A$10／月・A$102／年）: 毎月 700 クレジット
--     毎月の分は翌月末まで使える（＝もらってから 2 か月）。年払いでも毎月渡す（月 1 回の定期処理）
--   ・シーズン 3 か月 A$15: 700 ／ 6 か月 A$30: 1,500。最初に全部渡し、期間の終わりまで使える。自動更新しない
--   ・AI 体験 A$1: 100 クレジット（期限 1 年。パックと同じ）。1 人 1 回・カード 1 枚 1 回。
--     2 回目のカードは Webhook が自動で全額返金し、クレジットは渡さない
--   ・AI 体験かプランの購入を済ませるまでは、毎日クイズのクレジットを AI に使えない（profiles.ai_unlocked_at）
--   ・初めてプランを買うとき: 体験を済ませた人は A$2 引き（FIRST_SUB_TRIAL）、まだの人は A$1 引き（FIRST_SUB）
--   ・クレジットパックは、プランを使っている人（サブスク・シーズン）だけが買える
-- 表はブラウザから書き換えられない。本人は自分のプランだけを get_my_plan() で見られる。
-- 何度実行しても安全。
-- =====================================================================

begin;

-- 1. AI を使えるようになった時刻（体験・プランの購入で入る）
alter table public.profiles add column if not exists ai_unlocked_at timestamptz;

-- 2. Stripe のお客様 ID（解約・カード変更のページを開くため）
create table if not exists public.stripe_customers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  customer_id text not null unique,
  created_at timestamptz not null default now()
);

-- 3. サブスク（Stripe の subscription 1 つに 1 行。Webhook が書く）
create table if not exists public.subscriptions (
  id text primary key,                         -- Stripe の subscription ID
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_id text not null,
  plan text not null check (plan in ('basic', 'plus')),
  billing_interval text not null check (billing_interval in ('month', 'year')),
  status text not null,                        -- active / past_due / canceled / incomplete など（Stripe のまま）
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on public.subscriptions (user_id);

-- 4. シーズンプラン（1 回の購入に 1 行）
create table if not exists public.season_passes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stripe_session_id text not null unique,
  months integer not null check (months in (3, 6)),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists season_passes_user_idx on public.season_passes (user_id, ends_at desc);

-- 5. AI 体験（1 人 1 回・カード 1 枚 1 回）。アカウントを消しても、カードの記録は残す（同じカードで体験をくり返させない）
create table if not exists public.ai_trials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  card_fingerprint text,
  stripe_session_id text not null unique,
  created_at timestamptz not null default now()
);
create unique index if not exists ai_trials_user_uniq on public.ai_trials (user_id) where user_id is not null;
create unique index if not exists ai_trials_card_uniq on public.ai_trials (card_fingerprint) where card_fingerprint is not null;

-- 6. 年払い・月額の毎月のクレジットを渡した記録（同じ月に 2 回渡さない）
create table if not exists public.subscription_credit_grants (
  subscription_id text not null,
  slot_start timestamptz not null,             -- その月の分の始まり
  user_id uuid not null references auth.users (id) on delete cascade,
  credits integer not null,
  created_at timestamptz not null default now(),
  primary key (subscription_id, slot_start)
);

alter table public.stripe_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.season_passes enable row level security;
alter table public.ai_trials enable row level security;
alter table public.subscription_credit_grants enable row level security;
revoke all on public.stripe_customers, public.subscriptions, public.season_passes, public.ai_trials, public.subscription_credit_grants
  from anon, authenticated;
grant select, insert, update, delete on public.stripe_customers, public.subscriptions, public.season_passes, public.ai_trials,
  public.subscription_credit_grants to service_role;

-- 7. プランの毎月のクレジット数
create or replace function public._plan_monthly_credits(p_plan text)
returns integer
language sql
immutable
as $$
  select case p_plan when 'basic' then 200 when 'plus' then 700 else 0 end;
$$;

-- 8. いまプランを使っているか（サブスクが有効、またはシーズンプランの期間中）
create or replace function public.has_paid_access(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
           select 1 from public.subscriptions s
            where s.user_id = p_user_id
              and s.status in ('active', 'trialing', 'past_due')
              and (s.current_period_end is null or s.current_period_end > now() - interval '3 days')
         )
      or exists (
           select 1 from public.season_passes p
            where p.user_id = p_user_id and p.ends_at > now()
         );
$$;

-- 9. 初めてのプラン購入に使うクーポン（初めてでなければ NULL）
create or replace function public.first_plan_coupon(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
           when exists (select 1 from public.subscriptions where user_id = p_user_id)
             or exists (select 1 from public.season_passes where user_id = p_user_id) then null
           when exists (select 1 from public.ai_trials where user_id = p_user_id) then 'FIRST_SUB_TRIAL'
           else 'FIRST_SUB'
         end;
$$;

-- 10. 本人が自分のプランを見る（マイアカウント・料金ページ用）
create or replace function public.get_my_plan()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  s record;
  v_season timestamptz;
begin
  if uid is null then
    raise exception 'LOGIN_REQUIRED';
  end if;
  select plan, billing_interval, status, current_period_end, cancel_at_period_end into s
    from public.subscriptions
   where user_id = uid and status in ('active', 'trialing', 'past_due')
   order by current_period_end desc nulls last
   limit 1;
  select max(ends_at) into v_season from public.season_passes where user_id = uid and ends_at > now();
  return json_build_object(
    'paid_access', public.has_paid_access(uid),
    'plan', s.plan,
    'interval', s.billing_interval,
    'status', s.status,
    'period_end', s.current_period_end,
    'cancel_at_period_end', coalesce(s.cancel_at_period_end, false),
    'season_ends_at', v_season,
    'trial_done', exists (select 1 from public.ai_trials where user_id = uid),
    'ai_unlocked', (select ai_unlocked_at is not null from public.profiles where id = uid),
    'has_customer', exists (select 1 from public.stripe_customers where user_id = uid),
    'first_plan_coupon', public.first_plan_coupon(uid)
  );
end;
$$;

-- 11. Stripe のお客様 ID を覚える
create or replace function public.save_stripe_customer(p_user_id uuid, p_customer_id text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.stripe_customers (user_id, customer_id) values (p_user_id, p_customer_id)
  on conflict (user_id) do update set customer_id = excluded.customer_id;
$$;

-- 12. AI 体験（A$1）。同じ人・同じカードの 2 回目は渡さない（呼ぶ側が返金する）
create or replace function public.grant_ai_trial(
  p_user_id uuid, p_session_id text, p_amount_paid integer, p_card_fingerprint text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_user_id is null or coalesce(p_session_id, '') = '' then
    raise exception 'INVALID_ARGUMENTS';
  end if;
  if exists (select 1 from public.ai_trials where stripe_session_id = p_session_id) then
    return json_build_object('granted', false, 'reason', 'ALREADY_PROCESSED');
  end if;
  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;
  if exists (select 1 from public.ai_trials where user_id = p_user_id)
     or (p_card_fingerprint is not null and exists (select 1 from public.ai_trials where card_fingerprint = p_card_fingerprint)) then
    return json_build_object('granted', false, 'reason', 'DUPLICATE_TRIAL');
  end if;

  insert into public.ai_trials (user_id, card_fingerprint, stripe_session_id) values (p_user_id, p_card_fingerprint, p_session_id);
  insert into public.purchases (user_id, stripe_session_id, amount_paid, credits_granted, regular_credits, bonus_credits)
  values (p_user_id, p_session_id, coalesce(p_amount_paid, 0), 100, 100, 0)
  on conflict (stripe_session_id) do nothing;
  update public.profiles set ai_unlocked_at = coalesce(ai_unlocked_at, now()) where id = p_user_id;
  perform public._expire_user_credit_lots(p_user_id);
  v_balance := public._add_credit_lot(p_user_id, 'trial', 100, now() + interval '1 year',
                                      'ai_trial', 'AI Trial (A$1)', p_session_id);
  return json_build_object('granted', true, 'credits', v_balance);
end;
$$;

-- 13. シーズンプラン（3 か月 700 ／ 6 か月 1,500。期間の終わりまで使える）
create or replace function public.grant_season_pass(
  p_user_id uuid, p_session_id text, p_amount_paid integer, p_months integer
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credits integer := case p_months when 3 then 700 when 6 then 1500 else 0 end;
  v_ends timestamptz;
  v_balance integer;
begin
  if p_user_id is null or coalesce(p_session_id, '') = '' or v_credits = 0 then
    raise exception 'INVALID_ARGUMENTS';
  end if;
  if exists (select 1 from public.season_passes where stripe_session_id = p_session_id) then
    return json_build_object('granted', false, 'reason', 'ALREADY_PROCESSED');
  end if;
  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  -- 今のシーズンプランがまだ残っていれば、その終わりから続ける
  select greatest(now(), coalesce(max(ends_at), now())) + make_interval(months => p_months) into v_ends
    from public.season_passes where user_id = p_user_id and ends_at > now();
  insert into public.season_passes (user_id, stripe_session_id, months, ends_at)
  values (p_user_id, p_session_id, p_months, v_ends);
  insert into public.purchases (user_id, stripe_session_id, amount_paid, credits_granted, regular_credits, bonus_credits)
  values (p_user_id, p_session_id, coalesce(p_amount_paid, 0), v_credits, v_credits, 0)
  on conflict (stripe_session_id) do nothing;
  update public.profiles set ai_unlocked_at = coalesce(ai_unlocked_at, now()) where id = p_user_id;
  perform public._expire_user_credit_lots(p_user_id);
  v_balance := public._add_credit_lot(p_user_id, 'season', v_credits, v_ends,
                                      'season_pass', 'VCE Exam Season (' || p_months || ' months)', p_session_id);
  return json_build_object('granted', true, 'credits', v_balance, 'ends_at', v_ends);
end;
$$;

-- 14. サブスクの状態を記録する（Webhook が、作成・更新・終了のたびに呼ぶ）
create or replace function public.upsert_subscription(
  p_subscription_id text, p_user_id uuid, p_customer_id text, p_plan text, p_interval text,
  p_status text, p_period_start timestamptz, p_period_end timestamptz, p_cancel_at_period_end boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (id, user_id, customer_id, plan, billing_interval, status,
                                    current_period_start, current_period_end, cancel_at_period_end)
  values (p_subscription_id, p_user_id, p_customer_id, p_plan, p_interval, p_status,
          p_period_start, p_period_end, coalesce(p_cancel_at_period_end, false))
  on conflict (id) do update
     set status = excluded.status,
         plan = excluded.plan,
         billing_interval = excluded.billing_interval,
         current_period_start = coalesce(excluded.current_period_start, public.subscriptions.current_period_start),
         current_period_end = coalesce(excluded.current_period_end, public.subscriptions.current_period_end),
         cancel_at_period_end = excluded.cancel_at_period_end,
         updated_at = now();
  if p_status in ('active', 'trialing') then
    update public.profiles set ai_unlocked_at = coalesce(ai_unlocked_at, now()) where id = p_user_id;
  end if;
end;
$$;

-- 15. 1 か月分のクレジットを渡す（内部用。同じ月の分は 1 回だけ）。渡したら true
create or replace function public._grant_subscription_slot(
  p_subscription_id text, p_user_id uuid, p_plan text, p_slot_start timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credits integer := public._plan_monthly_credits(p_plan);
  v_inserted boolean;
begin
  if v_credits <= 0 then
    return false;
  end if;
  insert into public.subscription_credit_grants (subscription_id, slot_start, user_id, credits)
  values (p_subscription_id, p_slot_start, p_user_id, v_credits)
  on conflict do nothing
  returning true into v_inserted;
  if not coalesce(v_inserted, false) then
    return false;
  end if;
  perform 1 from public.profiles where id = p_user_id for update;
  perform public._expire_user_credit_lots(p_user_id);
  -- 翌月末まで使える（＝この月の始まりから 2 か月）
  perform public._add_credit_lot(p_user_id, 'subscription', v_credits, p_slot_start + interval '2 months',
                                 'subscription_credits',
                                 initcap(p_plan) || ' plan monthly credits', p_subscription_id);
  return true;
end;
$$;

-- 16. サブスクの支払いが済んだ（invoice.paid）。月額はその月の分、年払いは最初の月の分を渡す
create or replace function public.grant_subscription_invoice(
  p_invoice_id text, p_subscription_id text, p_user_id uuid, p_plan text, p_amount_paid integer, p_period_start timestamptz
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase_id uuid;
  v_granted boolean;
begin
  if coalesce(p_invoice_id, '') = '' or coalesce(p_subscription_id, '') = '' or p_user_id is null or p_period_start is null then
    raise exception 'INVALID_ARGUMENTS';
  end if;
  insert into public.purchases (user_id, stripe_session_id, amount_paid, credits_granted, regular_credits, bonus_credits)
  values (p_user_id, p_invoice_id, coalesce(p_amount_paid, 0), public._plan_monthly_credits(p_plan), public._plan_monthly_credits(p_plan), 0)
  on conflict (stripe_session_id) do nothing
  returning id into v_purchase_id;
  if v_purchase_id is null then
    return json_build_object('granted', false, 'reason', 'ALREADY_PROCESSED');
  end if;
  update public.profiles set ai_unlocked_at = coalesce(ai_unlocked_at, now()) where id = p_user_id;
  v_granted := public._grant_subscription_slot(p_subscription_id, p_user_id, p_plan, p_period_start);
  return json_build_object('granted', v_granted);
end;
$$;

-- 17. 年払いの 2 か月目以降の分を渡す（api の定期処理が 1 時間ごとに呼ぶ）。渡した数を返す
create or replace function public.grant_due_annual_credits()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  s record;
  k integer;
  v_slot timestamptz;
begin
  for s in
    select id, user_id, plan, current_period_start, current_period_end
      from public.subscriptions
     where billing_interval = 'year'
       and status in ('active', 'trialing', 'past_due')
       and current_period_start is not null and current_period_end is not null
  loop
    for k in 0..11 loop
      v_slot := s.current_period_start + make_interval(months => k);
      exit when v_slot > now() or v_slot >= s.current_period_end;
      if public._grant_subscription_slot(s.id, s.user_id, s.plan, v_slot) then
        v_count := v_count + 1;
      end if;
    end loop;
  end loop;
  return v_count;
end;
$$;

-- 18. クレジットを使う（49 と同じ。ただし AI 体験・プランの購入前は、毎日クイズのクレジットを使えない）
create or replace function public.consume_credits(p_user_id uuid, p_amount integer, p_feature text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unlocked boolean;
  v_available integer;
  v_locked integer;
  v_left integer := p_amount;
  v_take integer;
  v_consume_id uuid := gen_random_uuid();
  v_balance integer;
  r record;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  select ai_unlocked_at is not null into v_unlocked from public.profiles where id = p_user_id for update;
  if not found then
    return json_build_object('ok', false, 'balance', 0);
  end if;

  perform public._expire_user_credit_lots(p_user_id);

  select coalesce(sum(remaining) filter (where v_unlocked or source <> 'daily_quiz'), 0),
         coalesce(sum(remaining) filter (where not v_unlocked and source = 'daily_quiz'), 0)
    into v_available, v_locked
    from public.credit_lots
   where user_id = p_user_id and remaining > 0 and (expires_at is null or expires_at > now());
  if v_available < p_amount then
    return json_build_object('ok', false, 'balance', v_available,
                             'reason', case when v_locked > 0 then 'AI_TRIAL_REQUIRED' else 'INSUFFICIENT_CREDITS' end);
  end if;

  for r in
    select id, remaining
      from public.credit_lots
     where user_id = p_user_id and remaining > 0 and (expires_at is null or expires_at > now())
       and (v_unlocked or source <> 'daily_quiz')
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

-- 今いる利用者（動作テスト用のアカウント）は、今までどおり AI を使えるようにしておく
update public.profiles set ai_unlocked_at = now() where ai_unlocked_at is null;

-- 19. 実行できる人
revoke all on function public._plan_monthly_credits(text) from public, anon, authenticated;
revoke all on function public.has_paid_access(uuid) from public, anon, authenticated;
revoke all on function public.first_plan_coupon(uuid) from public, anon, authenticated;
revoke all on function public.save_stripe_customer(uuid, text) from public, anon, authenticated;
revoke all on function public.grant_ai_trial(uuid, text, integer, text) from public, anon, authenticated;
revoke all on function public.grant_season_pass(uuid, text, integer, integer) from public, anon, authenticated;
revoke all on function public.upsert_subscription(text, uuid, text, text, text, text, timestamptz, timestamptz, boolean) from public, anon, authenticated;
revoke all on function public._grant_subscription_slot(text, uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.grant_subscription_invoice(text, text, uuid, text, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.grant_due_annual_credits() from public, anon, authenticated;
revoke all on function public.consume_credits(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.has_paid_access(uuid) to service_role;
grant execute on function public.first_plan_coupon(uuid) to service_role;
grant execute on function public.save_stripe_customer(uuid, text) to service_role;
grant execute on function public.grant_ai_trial(uuid, text, integer, text) to service_role;
grant execute on function public.grant_season_pass(uuid, text, integer, integer) to service_role;
grant execute on function public.upsert_subscription(text, uuid, text, text, text, text, timestamptz, timestamptz, boolean) to service_role;
grant execute on function public.grant_subscription_invoice(text, text, uuid, text, integer, timestamptz) to service_role;
grant execute on function public.grant_due_annual_credits() to service_role;
grant execute on function public.consume_credits(uuid, integer, text) to service_role;
revoke all on function public.get_my_plan() from public, anon;
grant execute on function public.get_my_plan() to authenticated;

commit;

notify pgrst, 'reload schema';

-- 確認用: 5 行とも ok が true なら成功
select 'tables created' as item,
       (select count(*) from information_schema.tables
         where table_schema = 'public'
           and table_name in ('stripe_customers', 'subscriptions', 'season_passes', 'ai_trials', 'subscription_credit_grants')) = 5 as ok
union all
select 'browser cannot read subscriptions', not has_table_privilege('authenticated', 'public.subscriptions', 'select')
union all
select 'browser cannot grant a trial', not has_function_privilege('authenticated', 'public.grant_ai_trial(uuid, text, integer, text)', 'execute')
union all
select 'signed-in users can see their own plan', has_function_privilege('authenticated', 'public.get_my_plan()', 'execute')
union all
select 'existing users keep AI access', not exists (select 1 from public.profiles where ai_unlocked_at is null);
