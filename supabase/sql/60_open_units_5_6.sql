-- =====================================================================
-- 60: ユニット 5（pets）とユニット 6（food）のレッスンを公開する（Coming Soon を外す）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: portal（文化タスク japan-food を足した版）を本番に公開したあと
--
-- 確認済み（2026-11-21）: pets-1・pets-2・food-1・food-2 のレッスン（学習意図・成功基準・表現・文法）、
--   語彙（kl_vocabulary：11・9・23・6 語、すべて音声あり）、教科書との対応（edu_lesson_textbook_units）は
--   29 で入っている。staging では /lessons/food-1 が表示される。止めているのは is_coming_soon だけ。
-- リスニング・スピーキングの課題はまだ無い（countries-2・3 などと同じ状態）。
-- 何度実行しても安全。
-- =====================================================================

update public.edu_topics
set is_coming_soon = false
where slug in ('pets', 'food')
  and is_coming_soon;

-- 確認用: 2 行とも is_coming_soon が false、lessons が 2 なら成功
select t.slug, t.sort_order, t.is_coming_soon, count(l.id) as lessons
from public.edu_topics t
left join public.edu_lessons l on l.topic_id = t.id
where t.slug in ('pets', 'food')
group by t.slug, t.sort_order, t.is_coming_soon
order by t.sort_order;
