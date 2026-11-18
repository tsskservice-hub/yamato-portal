-- =====================================================================
-- 54: マイアカウントに「何か月のパスか」を出すため、get_my_plan() にパスの月数を足す
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: 51 のあと。ポータルの修正と前後してもかまわない
--   （ポータルは、この値がないときは「Pass」とだけ出す）
--
-- 足す値: season_months … 今有効なパスの月数を、買った順に並べたもの（例 [6] や、延長したときは [3, 6]）
-- ほかの値は 51 と同じ。何度実行しても安全。
-- =====================================================================

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
  v_months json;
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
  select json_agg(months order by created_at) into v_months
    from public.season_passes where user_id = uid and ends_at > now();
  return json_build_object(
    'paid_access', public.has_paid_access(uid),
    'plan', s.plan,
    'interval', s.billing_interval,
    'status', s.status,
    'period_end', s.current_period_end,
    'cancel_at_period_end', coalesce(s.cancel_at_period_end, false),
    'season_ends_at', v_season,
    'season_months', v_months,
    'trial_done', exists (select 1 from public.ai_trials where user_id = uid),
    'ai_unlocked', (select ai_unlocked_at is not null from public.profiles where id = uid),
    'has_customer', exists (select 1 from public.stripe_customers where user_id = uid),
    'first_plan_coupon', public.first_plan_coupon(uid)
  );
end;
$$;

revoke all on function public.get_my_plan() from public, anon;
grant execute on function public.get_my_plan() to authenticated;
notify pgrst, 'reload schema';

-- 確認用: ok が true なら成功
select 'get_my_plan returns season_months' as item,
       position('season_months' in pg_get_functiondef('public.get_my_plan()'::regprocedure)) > 0 as ok;
