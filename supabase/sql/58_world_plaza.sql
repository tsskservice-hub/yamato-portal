-- =====================================================================
-- 58: Yamato Town の「みんなで（Together）」モード — ほかの利用者が見える町
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: api（src/world/plaza-*.ts）とポータルを公開する「前」
--
-- 子どもを守る決まり（2026-11-21 に決定）:
--   ・ほかの人とのやりとりは、決まった日本語の文とスタンプだけ（自由なチャット・人どうしの声はなし）
--   ・名前は毎回ランダムの町の名前（例: たぬき 27）。本名・ニックネームは出さない
--   ・個別メッセージ・フレンドはなし。「ブロック」と「報告」がある
--   ・学校のアカウント（先生・クラスの生徒・クラスに申請中の人）は入れない（サーバーが毎回確かめる）
--   ・入る前に、決まりへの同意（18 歳未満は保護者の許可）が要る
--
-- 表はすべてサーバー（api の管理者キー）だけが読み書きする。ブラウザからは読めない・書けない（RLS・ポリシーなし）。
-- 何度実行しても安全。
-- =====================================================================

-- 1. 決まりへの同意（rules_version を上げると、もう一度同意してもらう）
create table if not exists public.world_plaza_consents (
  user_id uuid primary key references auth.users (id) on delete cascade,
  rules_version integer not null default 1,
  agreed_at timestamptz not null default now()
);

-- 2. ブロック（どちらからも相手が見えなくなる。ずっと続く）
create table if not exists public.world_plaza_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists world_plaza_blocks_blocked_idx on public.world_plaza_blocks (blocked_id);

-- 3. 報告（管理者が見る。reviewed_at を入れると「確認済み」）
--    recent_actions: 報告されたときの、その人の最近の発言（決まった文・スタンプ）
--    7 日以内に、確認前の報告が 3 人以上から来た人は、確認するまで入れない
create table if not exists public.world_plaza_reports (
  id bigserial primary key,
  reporter_id uuid references auth.users (id) on delete set null,
  reported_id uuid not null references auth.users (id) on delete cascade,
  place text not null check (char_length(place) <= 40),
  reason text not null check (reason in ('spam', 'following', 'unkind', 'other')),
  recent_actions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  review_note text
);
create index if not exists world_plaza_reports_reported_idx on public.world_plaza_reports (reported_id, created_at desc);

-- 4. 入れない人（管理者が手で入れる。until が null ならずっと）
create table if not exists public.world_plaza_bans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  until timestamptz,
  note text,
  created_at timestamptz not null default now()
);

-- ブラウザからは触れない。サーバー（service_role）だけ
alter table public.world_plaza_consents enable row level security;
alter table public.world_plaza_blocks enable row level security;
alter table public.world_plaza_reports enable row level security;
alter table public.world_plaza_bans enable row level security;
revoke all on public.world_plaza_consents, public.world_plaza_blocks, public.world_plaza_reports, public.world_plaza_bans from anon, authenticated;
grant select, insert, update, delete on public.world_plaza_consents, public.world_plaza_blocks, public.world_plaza_reports, public.world_plaza_bans to service_role;
grant usage, select on sequence public.world_plaza_reports_id_seq to service_role;

notify pgrst, 'reload schema';

-- 確認用: 4 行出て、rls がすべて true、browser_can_read がすべて false なら成功
select c.relname as table_name,
       c.relrowsecurity as rls,
       (has_table_privilege('anon', c.oid, 'SELECT') or has_table_privilege('authenticated', c.oid, 'SELECT')) as browser_can_read,
       has_table_privilege('service_role', c.oid, 'INSERT') as server_can_write
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname like 'world\_plaza\_%' and c.relkind = 'r'
order by c.relname;
