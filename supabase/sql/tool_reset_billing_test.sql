-- =====================================================================
-- 道具: テスト用アカウントの「支払いの状態」をまっさらに戻す（Stripe の sandbox での動作確認用）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）。何度でも使ってよい
--
-- 消すもの: サブスク・パス・AI 体験の記録・Stripe のお客様 ID・毎月のクレジットの記録（51）
-- 戻すもの: ai_unlocked_at を空に（＝新しく登録したフリーの人と同じく、体験前は毎日クイズのクレジットを AI に使えない）
-- 残すもの: アカウント・クラス・学習の記録・クレジットの残高と履歴（クレジットを減らしたいときは tool_adjust_credits.sql）
--
-- ⚠ 本物の利用者に使わないよう、@jptutoraiyamato.com のアカウントにしか効かない
-- ⚠ Stripe 側のサブスクは消えない。sandbox の画面（Customers）で、そのお客様のサブスクを Cancel しておくこと
--   （残っていると、次の月に Webhook がまたクレジットを渡す）
-- 使い方: email を書き換えて実行する。最後の SELECT に、戻したあとの状態が出る
-- =====================================================================

with target as (
  select u.id
  from auth.users u
  where lower(u.email) = lower('preview2@jptutoraiyamato.com')   -- ← 対象のメールアドレス
    and lower(u.email) like '%@jptutoraiyamato.com'
),
d1 as (delete from public.subscription_credit_grants where user_id in (select id from target) returning 1),
d2 as (delete from public.subscriptions where user_id in (select id from target) returning 1),
d3 as (delete from public.season_passes where user_id in (select id from target) returning 1),
d4 as (delete from public.ai_trials where user_id in (select id from target) returning 1),
d5 as (delete from public.stripe_customers where user_id in (select id from target) returning 1),
u1 as (update public.profiles set ai_unlocked_at = null where id in (select id from target) returning id)
select (select count(*) from target) as accounts_matched,
       (select count(*) from d2) as subscriptions_removed,
       (select count(*) from d3) as passes_removed,
       (select count(*) from d4) as trials_removed,
       (select count(*) from u1) as ai_locked_again;
