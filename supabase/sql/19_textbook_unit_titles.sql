-- 19. 教科書のユニット名と、トピックの言葉の修正
--
--  このファイルがすること：
--    1. Obento Supreme の版を 5th edition にする
--    2. edu_textbook_units に Obento Deluxe / Supreme の Unit 1〜12 をすべて登録し、
--       title（英語のトピック名：例 Family）と title_jp（教科書のユニット名：例 かぞく）を入れる
--       ※ レッスンページには「Unit 4: Family」のように英語のトピック名だけを出す
--    3. edu_topics の並び順をユニットの順（あいさつ→数字→国→家族→ペット→食べ物）にする
--    4. edu_topics の説明文の取り違え（pets に食事の説明、food にスポーツの説明）を直す
--
--  何度実行しても同じ結果になる。対応表（edu_lesson_textbook_units）は変えない。

begin;

-- 1. 版
update public.edu_textbooks set edition = '5th edition'
where id in ('obento-deluxe', 'obento-supreme') and edition is distinct from '5th edition';

-- 2. ユニット名
alter table public.edu_textbook_units add column if not exists title_jp text;

insert into public.edu_textbook_units (textbook_id, unit_number, sort_order, title, title_jp) values
  ('obento-deluxe',  1, 1, 'Introductions', 'どうぞよろしく'),
  ('obento-deluxe',  2, 2, 'Numbers', '一、二、三'),
  ('obento-deluxe',  3, 3, 'Nationality', 'どこから?'),
  ('obento-deluxe',  4, 4, 'Family', 'かぞく'),
  ('obento-deluxe',  5, 5, 'Pets', 'ワンワン、ガーガー'),
  ('obento-deluxe',  6, 6, 'Food', 'すしが すき!'),
  ('obento-deluxe',  7, 7, 'Dates', 'いつですか'),
  ('obento-deluxe',  8, 8, 'Hobbies', 'しゅみは?'),
  ('obento-deluxe',  9, 9, 'Transport', 'どこに? だれと? なんで?'),
  ('obento-deluxe', 10, 10, 'Activities', 'なにを しますか'),
  ('obento-deluxe', 11, 11, 'Leisure', 'ひまなとき'),
  ('obento-deluxe', 12, 12, 'Holidays', 'どうでしたか'),
  ('obento-supreme',  1, 1, 'Parties', 'ゆきさんのカラオケパーティー'),
  ('obento-supreme',  2, 2, 'Housing', 'ひっこし'),
  ('obento-supreme',  3, 3, 'School', 'あたらしい学校'),
  ('obento-supreme',  4, 4, 'Seasons', 'きせつ'),
  ('obento-supreme',  5, 5, 'Shopping', 'たん生日のプレゼント'),
  ('obento-supreme',  6, 6, 'Dining', 'いただきます!'),
  ('obento-supreme',  7, 7, 'Appearance', 'どんな人'),
  ('obento-supreme',  8, 8, 'Homestay', 'ホームステイ'),
  ('obento-supreme',  9, 9, 'Directions', 'まっすぐ行きます'),
  ('obento-supreme', 10, 10, 'Sports', 'スポーツヒーロー'),
  ('obento-supreme', 11, 11, 'Work', 'アルバイト'),
  ('obento-supreme', 12, 12, 'Manga', 'まんが')
on conflict (textbook_id, unit_number) do update
  set title = excluded.title, title_jp = excluded.title_jp;

-- 3. トピックの並び順（/lessons の並び）
update public.edu_topics t
set sort_order = v.ord
from (values ('greetings', 1), ('numbers', 2), ('countries', 3), ('family', 4), ('pets', 5), ('food', 6)) as v(slug, ord)
where t.slug = v.slug and t.sort_order is distinct from v.ord;

-- 4. 説明文の取り違え
update public.edu_topics
set description = 'Learn how to talk about your pet''s name, describe pets, and say what animals eat and drink.'
where slug = 'pets';

update public.edu_topics
set description = 'Learn how to talk about breakfast and meals, and say which foods you like and dislike.'
where slug = 'food';

commit;

-- 確認 1：24 行（Deluxe 12・Supreme 12）、すべてに title と title_jp
select t.title as textbook, t.edition, u.unit_number, u.title, u.title_jp
from public.edu_textbook_units u
join public.edu_textbooks t on t.id = u.textbook_id
order by t.sort_order, u.unit_number;

-- 確認 2：トピックが greetings → food の順
select sort_order, slug, title_en, description from public.edu_topics order by sort_order;
