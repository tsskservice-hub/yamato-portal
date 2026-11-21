-- =====================================================================
-- 道具: Stripe を本番（live）に切り替える前の確認（読むだけ。何も変えない）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
--
-- 1) パック（Top Up）の Price ID
--    PRICE_PLANS（本番サイト用）の id は live の Price ID（price_…）になっているか、
--    PRICE_PLANS_SANDBOX と同じ値のままになっていないか（same_as_sandbox が true なら直す必要あり）
-- 2) sandbox の動作確認で残った支払いの記録の数
--    stripe_customers などに残っている sandbox のお客様 ID は、live の Stripe には存在しない。
--    残ったままのアカウントで本番サイトから買おうとすると失敗するので、
--    tool_reset_billing_test.sql で 1 人ずつ消しておく（test_accounts の欄にメールが出る）
-- =====================================================================

with packs as (
  select p.key, pack.k, pack.v
  from public.kl_app p,
       jsonb_each(p.data -> 'pricePlans') as pack(k, v)
  where p.key in ('PRICE_PLANS', 'PRICE_PLANS_SANDBOX')
    and pack.k <> 'free'
),
billing_users as (
  select user_id from public.stripe_customers
  union select user_id from public.subscriptions
  union select user_id from public.season_passes
  union select user_id from public.ai_trials
)
select '1 pack' as section,
       l.k as item,
       l.v ->> 'name' as name,
       l.v ->> 'price' as price,
       l.v ->> 'id' as live_price_id,
       ((l.v ->> 'id') = (s.v ->> 'id'))::text as same_as_sandbox
from packs l
left join packs s on s.key = 'PRICE_PLANS_SANDBOX' and s.k = l.k
where l.key = 'PRICE_PLANS'
union all
select '2 records', 'stripe_customers', null, null, count(*)::text, null from public.stripe_customers
union all
select '2 records', 'subscriptions', null, null, count(*)::text, null from public.subscriptions
union all
select '2 records', 'season_passes', null, null, count(*)::text, null from public.season_passes
union all
select '2 records', 'ai_trials', null, null, count(*)::text, null from public.ai_trials
union all
select '2 records', 'test_accounts', null, null,
       coalesce(string_agg(u.email, ', ' order by u.email), '(none)'), null
from billing_users b
join auth.users u on u.id = b.user_id
order by 1, 2;
