-- =====================================================================
-- 22: クラス全員で遊ぶライブゲーム（Class Live Game）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: api（yamato-api）をデプロイする「前」（10・13 のあと）
--
-- ・ゲームの部屋は 1 クラスに 1 つ。参加コードはなく、入れるのはそのクラスで先生が承認した生徒だけ。
-- ・問題を出す・正解を判定する・金貨を数えるのは、すべて api のサーバー（Durable Object）。
--   ブラウザからこれらの表は読み書きできない（RLS 有効・ポリシーなし）。
-- ・用意した名前の一覧は kl_app の LIVE_GAME_NAMES。Supabase の画面から編集できる。
-- =====================================================================

-- 1. ゲーム（1 回ごと）
create table if not exists public.edu_live_games (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.edu_classes (id) on delete cascade,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  question_set text not null check (question_set in ('hiragana', 'katakana', 'kanji')),
  duration_sec integer not null check (duration_sec between 60 and 900),   -- 1〜15 分
  name_mode text not null check (name_mode in ('free', 'preset')),
  status text not null default 'lobby' check (status in ('lobby', 'running', 'ended', 'cancelled')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz
);
create index if not exists edu_live_games_class_idx on public.edu_live_games (class_id, created_at desc);
-- 1 クラスで同時に開ける部屋は 1 つだけ
create unique index if not exists edu_live_games_one_active_per_class
  on public.edu_live_games (class_id) where status in ('lobby', 'running');

-- 2. 生徒ごとの結果（ゲームが終わったときにサーバーが書く）
create table if not exists public.edu_live_game_results (
  game_id uuid not null references public.edu_live_games (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  coins integer not null default 0,
  correct_count integer not null default 0,
  answered_count integer not null default 0,
  missed jsonb not null default '{}'::jsonb,   -- 間違えた文字と回数 {"ぬ": 2, ...}
  primary key (game_id, user_id)
);

alter table public.edu_live_games enable row level security;
alter table public.edu_live_game_results enable row level security;
revoke all on public.edu_live_games, public.edu_live_game_results from anon, authenticated;

-- 3. 「用意した名前」モードで使う名前（すでにあれば上書きしない）
insert into public.kl_app (key, data, updated_at)
values (
  'LIVE_GAME_NAMES',
  jsonb_build_object('names', jsonb_build_array(
    'Sushi', 'Onigiri', 'Tempura', 'Ramen', 'Mochi', 'Dango', 'Takoyaki', 'Gyoza',
    'Bento', 'Matcha', 'Dorayaki', 'Taiyaki', 'Edamame', 'Udon', 'Soba', 'Natto',
    'Tanuki', 'Kitsune', 'Usagi', 'Neko', 'Inu', 'Tora', 'Panda', 'Kame',
    'Tsuru', 'Koi', 'Saru', 'Kuma', 'Fukurou', 'Hiyoko', 'Tako', 'Iruka',
    'Sakura', 'Fuji', 'Momiji', 'Hanabi', 'Kaminari', 'Niji', 'Hoshi', 'Tsuki',
    'Daruma', 'Kokeshi', 'Origami', 'Furin', 'Chochin', 'Kendama', 'Uchiwa', 'Torii'
  )),
  now()
)
on conflict (key) do nothing;

-- 確認用（SQL Editor は最後の SELECT しか表示しないので 1 つにまとめる）:
-- table の 2 行が true、names の行が 48 なら成功
select 'table: ' || relname as item, relrowsecurity::text as result
from pg_class
where relname in ('edu_live_games', 'edu_live_game_results')
union all
select 'names: ' || key, jsonb_array_length(data->'names')::text
from public.kl_app
where key = 'LIVE_GAME_NAMES';
