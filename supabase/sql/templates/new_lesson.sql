-- 新しいレッスンを足すときのひな形（19・20 を実行したあとで使う）
--
--  使い方：下の「ここを書きかえる」の 4 つだけ直して実行する。
--    topic         … app/data/lesson-topics.ts のトピック名（例：dates）
--    lesson_number … そのトピックの何番目のレッスンか（例：1 → slug は dates-1）
--    title_en / title_jp … レッスンの名前
--  これで次がすべて決まる：
--    - edu_lessons の行（slug = dates-1、topic_id、lesson_order、site_order = 7×100 + 1×10 = 710）
--    - 教科書との対応（edu_lesson_textbook_units：そのトピックのユニットすべて）
--    - トピックの「準備中」を外す
--  実行すると /lessons/dates-1 のページがすぐ開く（中身はまだ空）。
--  そのあとで足すもの：語彙（kl_vocabulary）、スピーキングの会話（edu_lesson_dialogues、lesson_key = slug）、
--  ライティング課題、文化タスク（culture-tasks.ts の lessons）、AI Yamato のプロンプト（api の prompt-dispatcher）。
--  何度実行しても同じ結果になる（同じ slug があれば名前だけ更新する）。

begin;

create temporary table _new_lesson on commit drop as
select
  'dates'::text        as topic,          -- ★ ここを書きかえる
  1::int               as lesson_number,  -- ★ ここを書きかえる
  'Asking about dates'::text as title_en, -- ★ ここを書きかえる
  '日付の尋ね方'::text  as title_jp;       -- ★ ここを書きかえる

insert into public.edu_lessons (topic_id, slug, title_en, title_jp, lesson_order, site_order)
select t.id, n.topic || '-' || n.lesson_number, n.title_en, n.title_jp, n.lesson_number,
       t.sort_order * 100 + n.lesson_number * 10
from _new_lesson n
join public.edu_topics t on t.slug = n.topic
where not exists (select 1 from public.edu_lessons l where l.slug = n.topic || '-' || n.lesson_number);

update public.edu_lessons l
set title_en = n.title_en, title_jp = n.title_jp
from _new_lesson n
where l.slug = n.topic || '-' || n.lesson_number;

insert into public.edu_lesson_textbook_units (lesson_id, textbook_unit_id, coverage)
select l.id, tu.id, 'full'
from _new_lesson n
join public.edu_topics t on t.slug = n.topic
join public.edu_lessons l on l.slug = n.topic || '-' || n.lesson_number
join public.edu_textbook_units tu on tu.topic_id = t.id
on conflict (lesson_id, textbook_unit_id) do nothing;

update public.edu_topics t
set is_coming_soon = false
from _new_lesson n
where t.slug = n.topic and t.is_coming_soon;

-- 確認（教科書の行が出ていれば OK。トピック名が間違っていると 0 行になる）
select l.slug, l.title_en, l.site_order, tb.title as textbook, tu.unit_number, tu.title as unit_topic
from public.edu_lessons l
left join public.edu_lesson_textbook_units m on m.lesson_id = l.id
left join public.edu_textbook_units tu on tu.id = m.textbook_unit_id
left join public.edu_textbooks tb on tb.id = tu.textbook_id
where l.slug like (select topic from _new_lesson limit 1) || '-%'
order by l.site_order;

commit;
