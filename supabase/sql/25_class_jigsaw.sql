-- =====================================================================
-- 25: クラスのライブゲーム「みんなでジグソー」（Class Jigsaw）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: api（yamato-api）をデプロイする「前」（22・24 のあと）
--
-- ・写真は 3 種類: サイトの写真集（teacher_id が NULL）／先生がアップロードした写真（その先生だけが使える）。
--   浮世絵などもサイトの写真集に入れる。
-- ・写真とピースは Storage の live-jigsaw バケットに置く。ファイル名はランダムなので、一覧も推測もできない
--   （バケットは「公開」だが、一覧を見るポリシーは作らない）。どのピースがどこに入るかは api のサーバーだけが知る。
-- ・表はブラウザから読み書きできない（RLS 有効・ポリシーなし）。api が service_role で扱う。
-- 何度実行しても安全。
-- =====================================================================

-- 1. 写真
create table if not exists public.edu_jigsaw_images (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references auth.users (id) on delete cascade,   -- NULL ならサイトの写真集（すべての先生が使える）
  title text not null check (char_length(title) between 1 and 100),
  credit text check (credit is null or char_length(credit) <= 200),   -- 完成したときに出す出典
  storage_path text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  created_at timestamptz not null default now()
);
create index if not exists edu_jigsaw_images_teacher_idx on public.edu_jigsaw_images (teacher_id, created_at desc);

alter table public.edu_jigsaw_images enable row level security;
revoke all on public.edu_jigsaw_images from anon, authenticated;
grant select, insert, update, delete on public.edu_jigsaw_images to service_role;

-- 2. ゲームに「遊び方」とジグソーの設定を足す
alter table public.edu_live_games
  add column if not exists mode text not null default 'coins',
  add column if not exists jigsaw_image_id uuid references public.edu_jigsaw_images (id) on delete set null,
  add column if not exists piece_count integer,
  add column if not exists completed boolean;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'edu_live_games_mode_check') then
    alter table public.edu_live_games add constraint edu_live_games_mode_check check (mode in ('coins', 'jigsaw'));
  end if;
end $$;

-- 3. 生徒ごとの結果に「貢献度」（正しく置けたピースの数）を足す
alter table public.edu_live_game_results add column if not exists contributions integer not null default 0;

-- 4. Storage のバケット（5MB まで・画像だけ）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('live-jigsaw', 'live-jigsaw', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

notify pgrst, 'reload schema';

-- 確認用（SQL Editor は最後の SELECT しか表示しない）:
-- 4 行とも ok = true なら成功
select 'table edu_jigsaw_images (rls)' as item,
       coalesce((select relrowsecurity from pg_class where relname = 'edu_jigsaw_images'), false) as ok
union all
select 'edu_live_games.mode',
       exists (select 1 from information_schema.columns where table_name = 'edu_live_games' and column_name = 'mode')
union all
select 'edu_live_game_results.contributions',
       exists (select 1 from information_schema.columns where table_name = 'edu_live_game_results' and column_name = 'contributions')
union all
select 'bucket live-jigsaw',
       exists (select 1 from storage.buckets where id = 'live-jigsaw');
