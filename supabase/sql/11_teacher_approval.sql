-- =====================================================================
-- 11: 先生アカウントの審査（管理者が SQL Editor で使う定型文）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 使い方: ① で一覧を見て、② か ③ のメールアドレスを書き換えて実行する
--
-- 承認の目安:
--   - verified_school_email が入っている（学校の Google / Microsoft アカウントで確認済み）
--   - そのドメインが学校・教育省のもの（例: @education.vic.gov.au は州の公立校の先生）
--   - school_name と矛盾しない
-- verified_school_email が空の人は、学校アカウントの確認が済むまで承認しない（承認してもクラスは作れない）
-- 登録時のメールアドレス（signup_email_unverified）は確認していないので、判断材料にしない
-- =====================================================================

-- ① 審査待ちの一覧
select
  p.email as signup_email_unverified,
  p.nickname,
  p.state,
  p.school_name,
  (
    select string_agg(i.identity_data ->> 'email', ', ')
    from auth.identities i
    where i.user_id = p.id
      and i.provider in ('google', 'azure')
      and (i.identity_data ->> 'email_verified')::boolean is true
  ) as verified_school_email,
  p.teacher_requested_at
from public.profiles p
where p.teacher_status = 'pending'
order by p.teacher_requested_at;

-- ② 承認する（教師ダッシュボードとヘッダーの「Teacher Panel」が使えるようになる）
-- update public.profiles
-- set is_teacher = true, teacher_status = 'approved'
-- where email = 'teacher@example.com' and teacher_status = 'pending';

-- ③ 承認しない（生徒アカウントとしてはそのまま使える）
-- update public.profiles
-- set is_teacher = false, teacher_status = 'rejected'
-- where email = 'someone@example.com' and teacher_status = 'pending';
