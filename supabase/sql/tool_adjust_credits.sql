-- =====================================================================
-- 道具: クレジットを手動で増減する（履歴にも残高つきで記録する）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）。何度でも使ってよい
-- 使い方: 下の params の 3 つの値だけを書き換えて実行する
--   email  … 対象ユーザーのメールアドレス
--   amount … 足すなら正の数（例 100）、引くなら負の数（例 -20）
--   note   … 履歴の Description に出る文（例 'Test credits'）
-- 結果:
--   1 行表示される → 成功（増減と、増減後の残高が表示される）
--   0 行（No rows returned）→ 何も変わっていない。
--     メールアドレスの間違い、または残高がマイナスになる引き算のどちらか
-- ※ 管理画面で profiles.credits を直接書き換えないこと（履歴と残高がずれる）
-- =====================================================================

with params as (
  select 'preview2@jptutoraiyamato.com'::text as email,   -- ← 対象のメールアドレス
         100::integer                         as amount,  -- ← 増減（負の数で減らす）
         'Test credits'::text                 as note     -- ← 履歴に出る説明
),
target as (
  select u.id, p.amount, p.note
  from params p
  join auth.users u on lower(u.email) = lower(p.email)
  where p.amount <> 0
),
updated as (
  update public.profiles pr
     set credits = pr.credits + t.amount
    from target t
   where pr.id = t.id
     and pr.credits + t.amount >= 0
  returning pr.id, pr.credits, t.amount, t.note
),
logged as (
  insert into public.credit_transactions (user_id, amount, feature_used, description, balance_after)
  select id, amount, 'manual_adjustment', note, credits
  from updated
  returning user_id, amount, balance_after, description, created_at
)
select u.email, l.amount, l.balance_after, l.description, l.created_at
from logged l
join auth.users u on u.id = l.user_id;
