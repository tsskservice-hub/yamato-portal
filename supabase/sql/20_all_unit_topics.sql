-- 20. Obento Deluxe / Supreme の全ユニットのトピックを先に登録する
--
--  目的：どのユニットのレッスンページを作り始めても、URL の名前（slug）と教科書の対応で迷わないようにする。
--        例：Deluxe Unit 7 Dates → トピック dates（/lessons/dates）、レッスン dates-1（/lessons/dates-1）
--        名前の一覧はコードの app/data/lesson-topics.ts と同じ。
--
--  このファイルがすること（19 を先に実行しておく）：
--    1. edu_textbook_units.topic_id … そのユニットを扱うこのサイトのトピック
--    2. まだ無い 18 トピック（Deluxe 7〜12、Supreme 1〜12）を「準備中」で登録する
--       ※ レッスンが1つも無いトピックは /lessons の一覧に出ない（コード側で隠す）
--    3. 全 24 ユニットをトピックに結びつけ、トピックの並び順をユニットの順にする
--
--  何度実行しても同じ結果になる。

begin;

-- 1. ユニット → トピック
alter table public.edu_textbook_units
  add column if not exists topic_id uuid references public.edu_topics (id) on delete set null;

-- 2. トピックの一覧（slug, 教科書, ユニット, 英語名, 日本語名, 並び順）
create temporary table _unit_topics (
  slug text, textbook_id text, unit_number int, title_en text, title_jp text, ord int
) on commit drop;

insert into _unit_topics values
  ('greetings',  'obento-deluxe',   1, 'Introductions', 'あいさつと自己紹介', 1),
  ('numbers',    'obento-deluxe',   2, 'Numbers',       '数字',             2),
  ('countries',  'obento-deluxe',   3, 'Nationality',   '国と国籍',         3),
  ('family',     'obento-deluxe',   4, 'Family',        '家族',             4),
  ('pets',       'obento-deluxe',   5, 'Pets',          'ペット',           5),
  ('food',       'obento-deluxe',   6, 'Food',          '食べ物',           6),
  ('dates',      'obento-deluxe',   7, 'Dates',         '日付',             7),
  ('hobbies',    'obento-deluxe',   8, 'Hobbies',       'しゅみ',           8),
  ('transport',  'obento-deluxe',   9, 'Transport',     '交通',             9),
  ('activities', 'obento-deluxe',  10, 'Activities',    '活動',             10),
  ('leisure',    'obento-deluxe',  11, 'Leisure',       '自由な時間',       11),
  ('holidays',   'obento-deluxe',  12, 'Holidays',      '休み',             12),
  ('parties',    'obento-supreme',  1, 'Parties',       'パーティー',       13),
  ('housing',    'obento-supreme',  2, 'Housing',       '住まい',           14),
  ('school',     'obento-supreme',  3, 'School',        '学校',             15),
  ('seasons',    'obento-supreme',  4, 'Seasons',       '季節',             16),
  ('shopping',   'obento-supreme',  5, 'Shopping',      '買い物',           17),
  ('dining',     'obento-supreme',  6, 'Dining',        '食事',             18),
  ('appearance', 'obento-supreme',  7, 'Appearance',    '見た目',           19),
  ('homestay',   'obento-supreme',  8, 'Homestay',      'ホームステイ',     20),
  ('directions', 'obento-supreme',  9, 'Directions',    '道案内',           21),
  ('sports',     'obento-supreme', 10, 'Sports',        'スポーツ',         22),
  ('work',       'obento-supreme', 11, 'Work',          'アルバイト',       23),
  ('manga',      'obento-supreme', 12, 'Manga',         'まんが',           24);

-- まだ無いトピックだけ足す（今ある 6 トピックの名前・説明は変えない）
insert into public.edu_topics (slug, title_en, title_jp, description, category, is_coming_soon, sort_order, yamato_persona_prompt)
select u.slug, u.title_en, u.title_jp,
       'Lessons on ' || lower(u.title_en) || ' are coming soon.',
       'Textbook Unit', true, u.ord,
       'You are AI Yamato, a warm and supportive Japanese tutor. Help the student practise Japanese for the topic "' || u.title_en || '" with a Socratic approach.'
from _unit_topics u
where not exists (select 1 from public.edu_topics t where t.slug = u.slug);

-- 3. 並び順と、ユニット → トピックの結びつけ
update public.edu_topics t
set sort_order = u.ord
from _unit_topics u
where t.slug = u.slug and t.sort_order is distinct from u.ord;

update public.edu_textbook_units tu
set topic_id = t.id
from _unit_topics u
join public.edu_topics t on t.slug = u.slug
where tu.textbook_id = u.textbook_id
  and tu.unit_number = u.unit_number
  and tu.topic_id is distinct from t.id;

commit;

-- 確認：24 行、すべてに topic が入っていれば OK
select tb.title as textbook, tu.unit_number, tu.title as unit_topic, t.slug as site_topic, t.sort_order, t.is_coming_soon,
       (select count(*) from public.edu_lessons l where l.topic_id = t.id) as lessons
from public.edu_textbook_units tu
join public.edu_textbooks tb on tb.id = tu.textbook_id
left join public.edu_topics t on t.id = tu.topic_id
order by tb.sort_order, tu.unit_number;
