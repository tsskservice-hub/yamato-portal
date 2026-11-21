-- =====================================================================
-- 道具: テスト用アカウントを作る（パスワードつき・メール確認済み）。Authentication → Add user と同じこと
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）。何度でも使ってよい
--
-- 使い方: 下の 3 つ（メールアドレス・パスワード・ニックネーム）を書き換えて実行する
-- ・作ると、サイトのプロフィールも自動で作られる（handle_new_user。クレジット 0・AI はロック）
-- ・同じメールアドレスのアカウントがすでにあるときは、何もしない
-- ⚠ @jptutoraiyamato.com のアドレスにしか使えない（本物の利用者のアカウントを作らないため）
-- ⚠ パスワードは SQL Editor の履歴に残る。テスト専用のパスワードにすること
-- 結果: 最後の SELECT に、作ったアカウントが 1 行出て、has_password と email_confirmed と has_profile が true なら成功
-- =====================================================================

do $$
declare
  v_email text := 'preview3@jptutoraiyamato.com';   -- ← メールアドレス
  v_password text := '123sss';                        -- ← パスワード（6 文字以上）
  v_nickname text := 'Preview3';                      -- ← ニックネーム
  v_id uuid := gen_random_uuid();
begin
  if lower(v_email) not like '%@jptutoraiyamato.com' then
    raise exception 'テスト用（@jptutoraiyamato.com）のアドレスだけに使えます';
  end if;
  if length(v_password) < 6 then
    raise exception 'パスワードは 6 文字以上にしてください';
  end if;
  if exists (select 1 from auth.users where lower(email) = lower(v_email)) then
    raise notice 'すでにあります: %', v_email;
    return;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', lower(v_email),
    extensions.crypt(v_password, extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('nickname', v_nickname),
    now(), now(),
    '', '', '', ''   -- 空文字にしておく（NULL だとログインのときにエラーになる）
  );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', lower(v_email), 'email_verified', true),
    'email', now(), now(), now()
  );
end $$;

-- 確認用
select u.email,
       u.encrypted_password is not null and u.encrypted_password <> '' as has_password,
       u.email_confirmed_at is not null as email_confirmed,
       exists (select 1 from public.profiles p where p.id = u.id) as has_profile,
       (select credits from public.profiles p where p.id = u.id) as credits
from auth.users u
where lower(u.email) = lower('preview3@jptutoraiyamato.com');   -- ← 上と同じメールアドレス
