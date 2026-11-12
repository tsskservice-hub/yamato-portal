-- =====================================================================
-- 02: ブラウザから credits / is_teacher などを書き換えられないようにする
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: クイズを RPC に変えたポータルを本番に公開した「後」
-- ※ Worker・Stripe Webhook は管理者キー（service_role）を使うため、影響を受けない
-- =====================================================================

-- profiles: いったん書き込み権限をすべて外し、ブラウザが使う列だけ戻す
revoke insert, update on public.profiles from anon, authenticated;
grant update (email, nickname, learning_pace) on public.profiles to authenticated;

-- profiles: ブラウザから行を作ることはない（新規登録時の行はトリガーが作る）
drop policy if exists "Users can insert own profile" on public.profiles;

-- credit_transactions: ブラウザは読むだけ。書き込みは Worker（管理者キー）だけ
drop policy if exists "Users can insert their own transactions" on public.credit_transactions;
revoke insert, update, delete on public.credit_transactions from anon, authenticated;

-- 確認用: credits / is_teacher / id などが false になっていれば成功
select column_name,
       has_column_privilege('authenticated', 'public.profiles', column_name, 'UPDATE') as can_update
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
order by ordinal_position;
