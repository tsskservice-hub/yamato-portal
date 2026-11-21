-- =====================================================================
-- 21: クラスごとのゲームのロック（授業中に生徒がゲームに夢中にならないように）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: この機能を含むポータルを公開する「前」（10・13 のあと）
--
-- 先生が教師ダッシュボードで「クラス全体をロック／ロック解除」「生徒を 1 人ずつロック解除」する。
-- ロックはクラスに入っている生徒にだけ効く（クラスに入っていない個人の学習者・先生には効かない）。
-- 初期値はロック解除（既存のクラスもロック解除のまま）。
-- 判定はポータルのサーバー（管理者キー）が行う。ブラウザからは読み書きできない。
-- =====================================================================

-- 1. クラス全体のロック
alter table public.edu_classes
  add column if not exists games_locked boolean not null default false,
  add column if not exists games_locked_at timestamptz;

-- 2. ロック中のクラスで、先生が個別にロック解除した生徒
--    クラス全体をロックし直す・ロック解除するときに、このクラスの行はすべて消す
create table if not exists public.edu_class_game_unlocks (
  class_id uuid not null references public.edu_classes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (class_id, user_id)
);

-- ブラウザからは触れないようにする（RLS 有効・ポリシーなし＝管理者キー以外は読み書き不可）
alter table public.edu_class_game_unlocks enable row level security;
revoke all on public.edu_class_game_unlocks from anon, authenticated;

-- 確認用: games_locked / games_locked_at が出て、edu_class_game_unlocks の rls が true なら成功
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'edu_classes' and column_name in ('games_locked', 'games_locked_at');

select relname, relrowsecurity
from pg_class
where relname = 'edu_class_game_unlocks';
