-- =====================================================================
-- 10: 州・学校名、教師アカウント（手動承認）、クラス、宿題、学校一覧
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: ポータルを本番（またはプレビュー）に公開する「前」
--
-- edu_classes / edu_homework はブラウザから直接読み書きさせない。
-- 読み書きはすべてポータルのサーバー（管理者キー）が、ログイン中の人と教師かどうかを確認してから行う。
-- =====================================================================

-- 1. profiles: 州・学校名（任意）と、先生アカウントの審査状態
--    state: オーストラリアの州・準州、または OUTSIDE_AU（海外）
--    school_ref_id: 学校一覧（ref_au_schools）から選んだときの学校 ID（自由記述なら null）
--    teacher_status: 先生として申し込むと pending。管理者が承認すると approved（同時に is_teacher = true）
alter table public.profiles
  add column if not exists state text,
  add column if not exists school_name text,
  add column if not exists school_ref_id integer,
  add column if not exists teacher_status text,
  add column if not exists teacher_requested_at timestamptz;

alter table public.profiles drop constraint if exists profiles_state_check;
alter table public.profiles add constraint profiles_state_check
  check (state is null or state in ('ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA', 'OUTSIDE_AU'));

alter table public.profiles drop constraint if exists profiles_school_name_check;
alter table public.profiles add constraint profiles_school_name_check
  check (school_name is null or char_length(school_name) <= 100);

alter table public.profiles drop constraint if exists profiles_teacher_status_check;
alter table public.profiles add constraint profiles_teacher_status_check
  check (teacher_status is null or teacher_status in ('pending', 'approved', 'rejected'));

-- 既に is_teacher = true の人は承認済みとして扱う
update public.profiles set teacher_status = 'approved' where is_teacher = true and teacher_status is null;

-- マイアカウント画面（ブラウザ）から更新できる列に州・学校を追加する
-- （credits / is_teacher / teacher_status は 02 のとおり更新できないまま）
grant update (state, school_name, school_ref_id) on public.profiles to authenticated;

-- 2. 学校一覧（オートコンプリート用・公開データ）
--    中身はデータの利用許可が取れてから取り込む。空のあいだ、画面は自由記述として動く
create table if not exists public.ref_au_schools (
  id integer primary key,            -- ACARA SML ID など、元データの学校 ID
  name text not null,
  suburb text,
  state text not null,
  postcode text,
  sector text,                       -- Government / Catholic / Independent
  school_type text                   -- Primary / Secondary / Combined / Special
);
create index if not exists ref_au_schools_state_name_idx on public.ref_au_schools (state, name);

alter table public.ref_au_schools enable row level security;
drop policy if exists "Anyone can read schools" on public.ref_au_schools;
create policy "Anyone can read schools" on public.ref_au_schools for select to anon, authenticated using (true);
revoke all on public.ref_au_schools from anon, authenticated;
grant select on public.ref_au_schools to anon, authenticated;

-- 3. クラス（承認済みで、学校の Google / Microsoft アカウントを確認した教師が作る）
--    school_domain: クラスを作った先生の、確認済みの学校メールのドメイン。
--    生徒は、このドメインに合う学校アカウントを確認した人だけが参加を申請できる（ルールはポータルの teacher-config.ts）
create table if not exists public.edu_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  join_code text not null unique,
  school_domain text not null,
  created_at timestamptz not null default now()
);
create index if not exists edu_classes_teacher_id_idx on public.edu_classes (teacher_id);

-- 3b. クラスへの参加申請（先生が承認すると edu_class_members に role = 'student' で入る）
--     school_email: 申請したときに確認できた生徒の学校メール（先生が承認するときの判断材料）
create table if not exists public.edu_class_join_requests (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.edu_classes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  school_email text not null,
  created_at timestamptz not null default now(),
  unique (user_id)                   -- 1 人が申請できるのは同時に 1 クラスだけ
);
create index if not exists edu_class_join_requests_class_idx on public.edu_class_join_requests (class_id);

-- 3c. 既存の edu_class_members に、承認したときの生徒の学校メールを残す（先生には個人のメールではなくこれを見せる）
alter table public.edu_class_members add column if not exists school_email text;

-- 4. 宿題（レッスンのタスクをクラスに出す）
--    task_keys: vocabulary / listening / reading / speaking / writing / culture のうち出すもの
--    （culture は 15_culture_task.sql で追加）
--    完了かどうかは既存の edu_student_progress（user_id, lesson_id, task_key）で判定する
create table if not exists public.edu_homework (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.edu_classes (id) on delete cascade,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null,
  task_keys text[] not null check (
    cardinality(task_keys) > 0
    and task_keys <@ array['vocabulary', 'listening', 'reading', 'speaking', 'writing']
  ),
  title text not null check (char_length(title) between 1 and 100),
  due_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists edu_homework_class_id_idx on public.edu_homework (class_id, due_at);

-- ブラウザからは触れないようにする（RLS 有効・ポリシーなし＝管理者キー以外は読み書き不可）
alter table public.edu_classes enable row level security;
alter table public.edu_homework enable row level security;
alter table public.edu_class_join_requests enable row level security;
revoke all on public.edu_classes, public.edu_homework, public.edu_class_join_requests from anon, authenticated;

-- 確認用: state / school_name / school_ref_id だけでなく、email / nickname / learning_pace も true、ほかは false なら成功
select column_name, has_column_privilege('authenticated', 'public.profiles', column_name, 'UPDATE') as can_update
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
order by ordinal_position;
