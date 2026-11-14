-- =====================================================================
-- テスト用アカウントの準備（プレビューで先生・生徒の機能を試すため）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
--
-- してくれること:
--   1. sample@（先生用）と preview@（生徒用）のパスワードを変える
--      （古いパスワードは developer.test-yamato.tsx に書かれていて、本番の JS からも読めるため）
--   2. sample@ を承認済みの先生にする
--   3. sample@ のテスト用クラス「TEST CLASS (preview)」を作る（なければ）
--      ※ 本来は学校の Google アカウントの確認が必要。テスト用なので SQL で直接作る
--   4. preview@ と preview2@ を、そのクラスの生徒にする（まだ入っていなければ）
--
-- 使い方: 下の 2 つの '新しいパスワード…' を、自分で決めたパスワードに書き換えてから全体を実行する。
-- 何度実行しても、クラスや生徒が二重にはならない（パスワードはそのたびに上書き）。
-- =====================================================================

begin;

-- 1. パスワードを変える
update auth.users
set encrypted_password = extensions.crypt('新しいパスワード（先生用）', extensions.gen_salt('bf')),
    updated_at = now()
where email = 'sample@jptutoraiyamato.com';

update auth.users
set encrypted_password = extensions.crypt('新しいパスワード（生徒用）', extensions.gen_salt('bf')),
    updated_at = now()
where email = 'preview@jptutoraiyamato.com';

-- 2. sample@ を承認済みの先生にする
update public.profiles p
set is_teacher = true, teacher_status = 'approved'
from auth.users u
where u.id = p.id and u.email = 'sample@jptutoraiyamato.com';

-- 3. テスト用クラス（まだなければ）
insert into public.edu_classes (teacher_id, name, join_code, school_domain)
select u.id, 'TEST CLASS (preview)', upper(substr(md5(random()::text), 1, 8)), 'jptutoraiyamato.com'
from auth.users u
where u.email = 'sample@jptutoraiyamato.com'
  and not exists (
    select 1 from public.edu_classes c where c.teacher_id = u.id and c.name = 'TEST CLASS (preview)'
  );

-- 4. preview@ と preview2@ をクラスの生徒にする（まだ入っていなければ）
insert into public.edu_class_members (class_id, user_id, role, school_email)
select c.id, s.id, 'student', s.email
from public.edu_classes c
join auth.users t on t.id = c.teacher_id and t.email = 'sample@jptutoraiyamato.com'
cross join auth.users s
where c.name = 'TEST CLASS (preview)'
  and s.email in ('preview@jptutoraiyamato.com', 'preview2@jptutoraiyamato.com')
  and not exists (
    select 1 from public.edu_class_members m where m.class_id = c.id and m.user_id = s.id
  );

commit;

-- 確認用: 先生 1 行（is_teacher = true）と、生徒 2 行（role = student）が出れば成功
select u.email, p.is_teacher, p.teacher_status, c.name as class_name, m.role
from auth.users u
left join public.profiles p on p.id = u.id
left join public.edu_class_members m on m.user_id = u.id
left join public.edu_classes c on c.id = coalesce(m.class_id, (select id from public.edu_classes where teacher_id = u.id and name = 'TEST CLASS (preview)'))
where u.email in ('sample@jptutoraiyamato.com', 'preview@jptutoraiyamato.com', 'preview2@jptutoraiyamato.com')
order by p.is_teacher desc, u.email;

-- あとで片付けるとき（テスト用クラスごと消す。生徒の所属も一緒に消える）:
-- delete from public.edu_classes
-- where name = 'TEST CLASS (preview)'
--   and teacher_id = (select id from auth.users where email = 'sample@jptutoraiyamato.com');
