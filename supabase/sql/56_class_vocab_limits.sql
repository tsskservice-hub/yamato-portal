-- =====================================================================
-- 56: クラスごとの「語彙ドリルで 1 つのモードに出す語の数」の制限（学校契約の先生用）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: いつでもよい（ポータルは、この SQL の前でも後でも動く。前なら制限なし＝全部の語）
--
-- 初期値は「制限なし」（そのレッスンの語を全部、4 つのモードで出す）。
-- 先生は教師ダッシュボードで
--   - 生徒ごとの上限（edu_class_student_settings。いちばん優先。全レッスンに効く）
--   - レッスンごとの上限（edu_class_lesson_settings。一括の設定より優先）
--   - クラスの全レッスン一括の上限（edu_classes.vocab_words_per_mode）
-- を決められる。null = 制限なし。優先順：生徒ごと → レッスンごと → 全レッスン一括 → 制限なし
-- 生徒が複数のクラスに入っている場合は、いちばん小さい上限を使う。
-- 判定はポータルのサーバー（管理者キー）が行う。ブラウザからは読み書きできない。
-- =====================================================================

-- 1. クラスの全レッスン一括の上限
alter table public.edu_classes
  add column if not exists vocab_words_per_mode int
    check (vocab_words_per_mode is null or vocab_words_per_mode between 1 and 50);

-- 2. レッスンごとの上限（一括の設定より優先する）
create table if not exists public.edu_class_lesson_settings (
  class_id uuid not null references public.edu_classes (id) on delete cascade,
  lesson_id text not null,                  -- edu_lessons.id（edu_homework.lesson_id と同じく文字列）
  vocab_words_per_mode int
    check (vocab_words_per_mode is null or vocab_words_per_mode between 1 and 50),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  primary key (class_id, lesson_id)
);

-- 3. 生徒ごとの上限（いちばん優先する。例：クラス全体は制限なしで、この生徒だけ語の数を減らす）
create table if not exists public.edu_class_student_settings (
  class_id uuid not null references public.edu_classes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  vocab_words_per_mode int
    check (vocab_words_per_mode is null or vocab_words_per_mode between 1 and 50),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  primary key (class_id, user_id)
);

-- ブラウザからは触れないようにする（RLS 有効・ポリシーなし＝管理者キー以外は読み書き不可）
alter table public.edu_class_lesson_settings enable row level security;
alter table public.edu_class_student_settings enable row level security;
revoke all on public.edu_class_lesson_settings, public.edu_class_student_settings from anon, authenticated;
-- 管理者キー（service_role）には読み書きを許す（24_service_role_grants.sql と同じ考え方）
grant select, insert, update, delete on public.edu_class_lesson_settings, public.edu_class_student_settings to service_role;

-- 確認用: vocab_words_per_mode が出て、edu_class_lesson_settings と edu_class_student_settings の rls が true なら成功
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'edu_classes' and column_name = 'vocab_words_per_mode';

select relname, relrowsecurity
from pg_class
where relname in ('edu_class_lesson_settings', 'edu_class_student_settings');
