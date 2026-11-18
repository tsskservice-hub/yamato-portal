-- =====================================================================
-- 道具: テスト用アカウントにパスワードを設定し、メールを確認済みにする（テストログインのページで入れるようにする）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）。何度でも使ってよい
--
-- 使い方: email と password の 2 か所を書き換えて実行する
-- ⚠ 本物の利用者に使わないよう、@jptutoraiyamato.com のアカウントにしか効かない
-- ⚠ パスワードは SQL Editor の履歴に残る。テスト用の、ほかで使っていないパスワードにすること
-- 結果: 1 行出て、password_set と email_confirmed が true なら成功。0 行ならメールアドレスの間違いか、パスワードが 6 文字より短い
-- =====================================================================

with params as (
  select 'preview3@jptutoraiyamato.com'::text as email,   -- ← 対象のメールアドレス
         'ここに新しいパスワード'::text        as password  -- ← 設定するパスワード（6 文字以上）
),
updated as (
  update auth.users u
     set encrypted_password = extensions.crypt(p.password, extensions.gen_salt('bf')),
         email_confirmed_at = coalesce(u.email_confirmed_at, now()),
         updated_at = now()
    from params p
   where lower(u.email) = lower(p.email)
     and lower(u.email) like '%@jptutoraiyamato.com'
     and length(p.password) >= 6
  returning u.email, u.encrypted_password, u.email_confirmed_at
)
select email,
       encrypted_password is not null and encrypted_password <> '' as password_set,
       email_confirmed_at is not null as email_confirmed
from updated;
