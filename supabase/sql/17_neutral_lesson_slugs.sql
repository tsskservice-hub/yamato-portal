-- 17. レッスンとトピックの ID（slug）を教科書に依存しない形にする（ステップ B）
--
--  ※ 実行するのは、ポータルと api の新しいコードをデプロイした「あと」。
--    新しいコードは古い slug と新しい slug のどちらでも動くが、古いコードは新しい slug では動かないため。
--
--  このファイルがすること：
--    1. edu_lessons.slug       obento-unit-4-lesson-1 → family-1 など（16 レッスン）
--    2. edu_topics.slug        obento-unit-4          → family など（6 トピック）
--       edu_topics.title_en/jp から「Obento Unit 4: 」「おべんとう第4課：」を外す
--    3. edu_lesson_dialogues.lesson_key（スピーキングの会話データ）も同じ slug にそろえる
--    4. 対応表の page_ref から「Unit 4, 」を外す（ユニット番号は対応表が持っているため）
--  古い URL（/lessons/obento-unit-4-lesson-1 など）は、ポータルのコードで新しい URL へ転送する。
--  何度実行しても同じ結果になる。

begin;

-- 1・3. レッスン
with map(old_slug, new_slug) as (
  values
    ('obento-unit-1-lesson-1', 'greetings-1'),
    ('obento-unit-1-lesson-2', 'greetings-2'),
    ('obento-unit-1-lesson-3', 'greetings-3'),
    ('obento-unit-2-lesson-1', 'numbers-1'),
    ('obento-unit-2-lesson-2', 'numbers-2'),
    ('obento-unit-2-lesson-3', 'numbers-3'),
    ('obento-unit-3-lesson-1', 'countries-1'),
    ('obento-unit-3-lesson-2', 'countries-2'),
    ('obento-unit-3-lesson-3', 'countries-3'),
    ('obento-unit-4-lesson-1', 'family-1'),
    ('obento-unit-4-lesson-2', 'family-2'),
    ('obento-unit-4-lesson-3', 'family-3'),
    ('obento-unit-5-lesson-1', 'pets-1'),
    ('obento-unit-5-lesson-2', 'pets-2'),
    ('obento-unit-6-lesson-1', 'food-1'),
    ('obento-unit-6-lesson-2', 'food-2')
),
upd_lessons as (
  update public.edu_lessons l
  set slug = m.new_slug
  from map m
  where l.slug = m.old_slug
  returning l.id
)
update public.edu_lesson_dialogues d
set lesson_key = m.new_slug
from map m
where d.lesson_key = m.old_slug;

-- 2. トピック
update public.edu_topics t
set slug = m.new_slug
from (values
  ('obento-unit-1', 'greetings'),
  ('obento-unit-2', 'numbers'),
  ('obento-unit-3', 'countries'),
  ('obento-unit-4', 'family'),
  ('obento-unit-5', 'pets'),
  ('obento-unit-6', 'food')
) as m(old_slug, new_slug)
where t.slug = m.old_slug;

update public.edu_topics
set title_en = regexp_replace(title_en, '^Obento Unit \d+:\s*', ''),
    title_jp = regexp_replace(title_jp, '^おべんとう第\d+課[：:]\s*', '')
where title_en ~ '^Obento Unit \d+:' or title_jp ~ '^おべんとう第\d+課';

-- 4. 対応表のページ番号から「Unit N, 」を外す
update public.edu_lesson_textbook_units
set page_ref = regexp_replace(page_ref, '^Unit \d+,\s*', '')
where page_ref ~ '^Unit \d+,';

commit;

-- 確認 1：16 行。slug が family-1 などになっていれば OK
select l.site_order, l.slug, t.slug as topic_slug, t.title_en as topic_title, m.page_ref
from public.edu_lessons l
left join public.edu_topics t on t.id = l.topic_id
left join public.edu_lesson_textbook_units m on m.lesson_id = l.id
order by l.site_order nulls last;

-- 確認 2：スピーキングの会話データ（family-1 だけになっていれば OK）
select lesson_key, count(*) from public.edu_lesson_dialogues group by lesson_key;
