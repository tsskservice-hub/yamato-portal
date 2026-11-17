-- =====================================================================
-- 42: 宿題・課題を、クラス全員または選んだ生徒に出す。教師が作る語彙クイズも出せるようにする
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）。何度実行しても安全。
-- 実行タイミング: ポータルを公開する前（公開前でも後でも壊れないが、実行するまで新しい機能は使えない）
--
-- これまで（10 / 15）: edu_homework = 1 つのレッスンのタスクを、クラス全員に出す宿題だけ。
-- これから:
--   * kind        … 'homework'（宿題）/ 'classwork'（授業内の課題）。一覧と集計を分ける
--   * item_type   … 'lesson'（レッスンのタスク。今まで通り lesson_id + task_keys）/ 'vocab_quiz'（教師が作る語彙クイズ。quiz_id）
--   * assign_to   … 'class'（クラス全員）/ 'students'（edu_homework_students に入れた生徒だけ）
--   * 語彙クイズ: edu_teacher_quizzes（クイズ）と edu_teacher_quiz_items（単語。サイトの単語帳からの写し、または先生が入力）
--   * クイズの記録: edu_quiz_attempts（1 回ごとの点数）。先生には「完了・最高点・回数・最後にやった日」を見せる
--
-- どの表もブラウザからは読み書きできない（RLS 有効・ポリシーなし）。ポータルのサーバーが、
-- 担任か・その生徒が対象かを確認してから管理者キー（service_role）で読み書きする（10 と同じ考え方）。
-- =====================================================================

-- 1. 教師が作る語彙クイズ
create table if not exists public.edu_teacher_quizzes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  created_at timestamptz not null default now()
);
create index if not exists edu_teacher_quizzes_teacher_idx on public.edu_teacher_quizzes (teacher_id, created_at desc);

-- 単語は「写し」を持つ（サイトの単語帳が後で直されても、出したクイズの答えは変わらない）
-- vocabulary_id: サイトの単語帳（kl_vocabulary）から選んだときの元の ID（先生が入力した単語は null）
create table if not exists public.edu_teacher_quiz_items (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.edu_teacher_quizzes (id) on delete cascade,
  position integer not null check (position >= 0),
  vocabulary_id text,
  jp_text text not null check (char_length(jp_text) between 1 and 50),
  jp_kana text check (jp_kana is null or char_length(jp_kana) <= 50),
  english_text text not null check (char_length(english_text) between 1 and 100),
  audio_url text check (audio_url is null or char_length(audio_url) <= 500)
);
create index if not exists edu_teacher_quiz_items_quiz_idx on public.edu_teacher_quiz_items (quiz_id, position);

-- 2. edu_homework に列を足す
alter table public.edu_homework add column if not exists kind text not null default 'homework';
alter table public.edu_homework add column if not exists item_type text not null default 'lesson';
alter table public.edu_homework add column if not exists assign_to text not null default 'class';
alter table public.edu_homework add column if not exists quiz_id uuid references public.edu_teacher_quizzes (id) on delete cascade;

-- 語彙クイズの宿題にはレッスンもタスクもないので、空でもよくする
alter table public.edu_homework alter column lesson_id drop not null;
alter table public.edu_homework alter column task_keys drop not null;

-- 制約を作り直す（task_keys の古い制約を消し、種類ごとに必要な列をまとめて確認する）
do $$
declare
  c text;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.edu_homework'::regclass
       and contype = 'c'
       and (pg_get_constraintdef(oid) like '%task_keys%'
            or conname in ('edu_homework_kind_check', 'edu_homework_item_type_check', 'edu_homework_assign_to_check', 'edu_homework_item_check'))
  loop
    execute format('alter table public.edu_homework drop constraint %I', c);
  end loop;

  alter table public.edu_homework
    add constraint edu_homework_kind_check check (kind in ('homework', 'classwork')),
    add constraint edu_homework_item_type_check check (item_type in ('lesson', 'vocab_quiz')),
    add constraint edu_homework_assign_to_check check (assign_to in ('class', 'students')),
    add constraint edu_homework_item_check check (
      (item_type = 'lesson'
        and lesson_id is not null
        and quiz_id is null
        and task_keys is not null
        and cardinality(task_keys) > 0
        and task_keys <@ array['vocabulary', 'listening', 'reading', 'speaking', 'writing', 'culture'])
      or
      (item_type = 'vocab_quiz'
        and quiz_id is not null
        and lesson_id is null
        and task_keys is null)
    );
end $$;

create index if not exists edu_homework_quiz_idx on public.edu_homework (quiz_id);

-- 3. 選んだ生徒だけに出すときの対象（assign_to = 'students' のときだけ使う）
create table if not exists public.edu_homework_students (
  homework_id uuid not null references public.edu_homework (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (homework_id, user_id)
);
create index if not exists edu_homework_students_user_idx on public.edu_homework_students (user_id);

-- 4. 語彙クイズの記録（1 回やるごとに 1 行。何度でも挑戦できる）
create table if not exists public.edu_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.edu_homework (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  score integer not null check (score >= 0),
  total integer not null check (total > 0 and score <= total),
  created_at timestamptz not null default now()
);
create index if not exists edu_quiz_attempts_hw_user_idx on public.edu_quiz_attempts (homework_id, user_id);

-- 5. ブラウザからは触れないようにする（RLS 有効・ポリシーなし）。サーバー（service_role）だけが読み書きする
alter table public.edu_teacher_quizzes enable row level security;
alter table public.edu_teacher_quiz_items enable row level security;
alter table public.edu_homework_students enable row level security;
alter table public.edu_quiz_attempts enable row level security;
revoke all on public.edu_teacher_quizzes, public.edu_teacher_quiz_items, public.edu_homework_students, public.edu_quiz_attempts
  from anon, authenticated;
grant select, insert, update, delete on
  public.edu_teacher_quizzes, public.edu_teacher_quiz_items, public.edu_homework_students, public.edu_quiz_attempts, public.edu_homework
  to service_role;

notify pgrst, 'reload schema';

-- 確認用: 4 つの表が出て、rls がすべて true、browser_can_read がすべて false、
--         homework_new_columns が 4 なら成功
select c.relname as table_name,
       c.relrowsecurity as rls,
       (has_table_privilege('anon', c.oid, 'SELECT') or has_table_privilege('authenticated', c.oid, 'SELECT')) as browser_can_read,
       (select count(*) from information_schema.columns
         where table_schema = 'public' and table_name = 'edu_homework'
           and column_name in ('kind', 'item_type', 'assign_to', 'quiz_id')) as homework_new_columns
  from pg_class c
 where c.relnamespace = 'public'::regnamespace
   and c.relname in ('edu_teacher_quizzes', 'edu_teacher_quiz_items', 'edu_homework_students', 'edu_quiz_attempts')
 order by c.relname;
