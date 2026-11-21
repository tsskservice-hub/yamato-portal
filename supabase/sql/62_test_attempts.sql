-- =====================================================================
-- 62: 認識テスト（/test の漢字・かな・語彙・文）の結果を残す表
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: portal（/progress と、結果を保存する /test/kanji）を公開する前。63 と一緒に
--
-- ・1 回のテスト = 1 行。どの文字・語彙に何秒かかったか・正解かは details（jsonb）に入れる
-- ・ブラウザは自分の行を読むだけ。書くのはポータルのサーバー（/api/test-attempts）だけ。
--   サーバーが正解かどうかを答え合わせし直してから書く（ブラウザの「正解」は信用しない）
-- ・答えた時間はブラウザで測っている（まだ試作。本番の記録はサーバーで 1 問ずつ出す形にする予定）
-- 何度実行しても安全。
-- =====================================================================

create table if not exists public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- 例: 'kanji-vce200'、のちに 'hiragana'、'katakana' など
  test_key text not null check (test_key ~ '^[a-z0-9-]{1,40}$'),
  -- 選んだ範囲（漢字のグループ名など。'all' は全部）
  scope text not null default 'all' check (char_length(scope) <= 300),
  item_count integer not null check (item_count between 1 and 500),
  correct_count integer not null check (correct_count between 0 and 500 and correct_count <= item_count),
  total_ms integer not null check (total_ms between 0 and 36000000),
  avg_ms integer not null check (avg_ms between 0 and 600000),
  -- [{ "c": "山", "ms": 2100, "ok": true }, ...]
  details jsonb not null default '[]'::jsonb check (jsonb_typeof(details) = 'array'),
  created_at timestamptz not null default now()
);

create index if not exists test_attempts_user_idx on public.test_attempts (user_id, test_key, created_at desc);

alter table public.test_attempts enable row level security;

drop policy if exists "test_attempts_select_own" on public.test_attempts;
create policy "test_attempts_select_own" on public.test_attempts
  for select to authenticated using (auth.uid() = user_id);

revoke all on public.test_attempts from anon;
revoke insert, update, delete on public.test_attempts from authenticated;
grant select on public.test_attempts to authenticated;
grant select, insert, update, delete on public.test_attempts to service_role;

-- 確認: 1 行（rls = true）が出れば OK
select relname, relrowsecurity as rls from pg_class where relname = 'test_attempts';
