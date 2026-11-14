-- 16. 教科書とレッスンの対応表（ステップ A）
--
--  目的：レッスンを教科書（Obento / iiTomo など）から切り離し、
--        「このレッスンは、どの教科書のどのユニットに対応するか」を表で持つ。
--        後で iiTomo の対応を足す時は、この表に行を追加するだけにする。
--
--  このファイルがすること（既存のページの動きは変えない）：
--    1. edu_textbooks              … 教科書（例：Obento Deluxe）
--    2. edu_textbook_units         … 教科書のユニットと、その教科書の中での順番
--    3. edu_lesson_textbook_units  … レッスン ↔ ユニットの対応（多対多・一部対応も可）
--    4. edu_lessons.site_order     … このサイトの標準のレッスン順（slug の形に頼らない）
--    5. 今ある 16 レッスンを Obento Deluxe Unit 1〜6 に対応づける（obento_page_ref を引き継ぐ）
--
--  何度実行しても同じ結果になる。
--  edu_lessons.obento_page_ref / iitomo_page_ref はまだ消さない（ステップ B のあとで整理する）。

begin;

-- 1. 教科書
create table if not exists public.edu_textbooks (
  id text primary key,                       -- 例：'obento-deluxe', 'obento-supreme', 'iitomo-1'
  title text not null,                       -- 画面に出す名前：'Obento Deluxe'
  edition text,                              -- 版：'4th edition' など（分かったら入れる）
  sort_order int not null default 0,         -- 教科書の一覧を並べる順
  created_at timestamptz not null default now()
);

-- 2. 教科書のユニット（sort_order = その教科書の中で習う順番）
create table if not exists public.edu_textbook_units (
  id uuid primary key default gen_random_uuid(),
  textbook_id text not null references public.edu_textbooks (id) on delete cascade,
  unit_number int not null,                  -- 教科書に書いてあるユニット番号
  title text,                                -- 必要なら（教科書の見出しをそのまま写さない）
  sort_order int not null,                   -- 習う順番（ふつうは unit_number と同じ）
  created_at timestamptz not null default now(),
  unique (textbook_id, unit_number)
);
create index if not exists edu_textbook_units_order_idx
  on public.edu_textbook_units (textbook_id, sort_order);

-- 3. レッスン ↔ ユニットの対応
create table if not exists public.edu_lesson_textbook_units (
  lesson_id uuid not null references public.edu_lessons (id) on delete cascade,
  textbook_unit_id uuid not null references public.edu_textbook_units (id) on delete cascade,
  coverage text not null default 'full' check (coverage in ('full', 'partial')),  -- 全部対応 / 一部対応
  page_ref text,                             -- 例：'P. 1-3'
  note text,                                 -- 例：'Only the counting part'
  created_at timestamptz not null default now(),
  primary key (lesson_id, textbook_unit_id)
);
create index if not exists edu_lesson_textbook_units_unit_idx
  on public.edu_lesson_textbook_units (textbook_unit_id);

-- 4. サイトの標準のレッスン順
alter table public.edu_lessons add column if not exists site_order int;

-- 読み取りは誰でも可（レッスンページで表示するため）。書き込みは管理者キーのみ（ポリシーなし）
alter table public.edu_textbooks enable row level security;
alter table public.edu_textbook_units enable row level security;
alter table public.edu_lesson_textbook_units enable row level security;

-- 表を読む権限（このプロジェクトでは新しい表に自動で付かない。18 で本番に追加済み）
grant select on public.edu_textbooks             to anon, authenticated;
grant select on public.edu_textbook_units        to anon, authenticated;
grant select on public.edu_lesson_textbook_units to anon, authenticated;

drop policy if exists "edu_textbooks are readable" on public.edu_textbooks;
create policy "edu_textbooks are readable" on public.edu_textbooks
  for select to anon, authenticated using (true);

drop policy if exists "edu_textbook_units are readable" on public.edu_textbook_units;
create policy "edu_textbook_units are readable" on public.edu_textbook_units
  for select to anon, authenticated using (true);

drop policy if exists "edu_lesson_textbook_units are readable" on public.edu_lesson_textbook_units;
create policy "edu_lesson_textbook_units are readable" on public.edu_lesson_textbook_units
  for select to anon, authenticated using (true);

-- 5. 今あるデータの移行
insert into public.edu_textbooks (id, title, edition, sort_order) values
  ('obento-deluxe',  'Obento Deluxe',  '5th edition', 1),
  ('obento-supreme', 'Obento Supreme', null,          2)   -- 版が分かったら edition を入れる
on conflict (id) do nothing;

-- すでに行がある場合も、Obento Deluxe の版をそろえる
update public.edu_textbooks set edition = '5th edition'
where id = 'obento-deluxe' and edition is distinct from '5th edition';

-- 今の slug（obento-unit-N-lesson-M）から、Obento Deluxe の Unit N を作る
insert into public.edu_textbook_units (textbook_id, unit_number, sort_order)
select distinct 'obento-deluxe', u.unit, u.unit
from (
  select (regexp_match(slug, '^obento-unit-(\d+)-lesson-\d+$'))[1]::int as unit
  from public.edu_lessons
  where slug ~ '^obento-unit-\d+-lesson-\d+$'
) u
on conflict (textbook_id, unit_number) do nothing;

-- レッスンを Obento Deluxe の Unit N に対応づける（ページ番号は obento_page_ref から）
insert into public.edu_lesson_textbook_units (lesson_id, textbook_unit_id, coverage, page_ref)
select l.id, tu.id, 'full', l.obento_page_ref
from public.edu_lessons l
join public.edu_textbook_units tu
  on tu.textbook_id = 'obento-deluxe'
 and tu.unit_number = (regexp_match(l.slug, '^obento-unit-(\d+)-lesson-\d+$'))[1]::int
where l.slug ~ '^obento-unit-\d+-lesson-\d+$'
on conflict (lesson_id, textbook_unit_id) do nothing;

-- サイトの標準の順番：ユニット×100 ＋ レッスン×10（あとで間にレッスンを差し込めるよう間をあける）
update public.edu_lessons
set site_order = (regexp_match(slug, '^obento-unit-(\d+)-lesson-\d+$'))[1]::int * 100 + lesson_order * 10
where site_order is null
  and slug ~ '^obento-unit-\d+-lesson-\d+$';

commit;

-- 確認：16 行出て、すべてに textbook と unit_number が入っていれば OK
select l.site_order, l.slug, l.title_en, t.title as textbook, t.edition, tu.unit_number, m.coverage, m.page_ref
from public.edu_lessons l
left join public.edu_lesson_textbook_units m on m.lesson_id = l.id
left join public.edu_textbook_units tu on tu.id = m.textbook_unit_id
left join public.edu_textbooks t on t.id = tu.textbook_id
order by l.site_order nulls last, l.slug;
