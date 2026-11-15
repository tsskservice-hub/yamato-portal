-- =====================================================================
-- 33: Reference のハブページに「Oral Exam Question Bank」のカードを足す
--   ページ本体は /vce/speaking/oral-exam-questions のまま。Reference からはリンクするだけ。
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: いつでもよい（ページはすでに公開済み）
--
-- kl_app の CONTENT_REFERENCE は「配列」か「{ modules: [...] }」のどちらか
-- （app/data/content-reference.ts が両方を読む）。どちらの形でも末尾に 1 枚足す。
-- id が 'oral-exam-questions' のカードがすでにあれば何もしない（二重に実行しても重ならない）。
-- =====================================================================

with card as (
  select jsonb_build_object(
    'id',           'oral-exam-questions',
    'name',         'Oral Exam Question Bank',
    'category',     'Speaking',
    'badge',        'VCE Oral',
    'description',  'Practice questions commonly asked in the VCE Japanese oral exam, with audio at three paces and model answers. Not official VCAA material.',
    'path',         '/vce/speaking/oral-exam-questions',
    'actionLabel',  'Open Question Bank',
    'isComingSoon', false
  ) as c
)
update public.kl_app k
set data = case
             when jsonb_typeof(k.data) = 'array'
               then k.data || jsonb_build_array(card.c)
             else jsonb_set(k.data, '{modules}',
                            coalesce(k.data -> 'modules', '[]'::jsonb) || jsonb_build_array(card.c))
           end,
    updated_at = now()
from card
where k.key = 'CONTENT_REFERENCE'
  and not exists (
    select 1
    from jsonb_array_elements(
           case when jsonb_typeof(k.data) = 'array' then k.data
                else coalesce(k.data -> 'modules', '[]'::jsonb) end
         ) m
    where m ->> 'id' = 'oral-exam-questions'
  );

-- 確認: カードの id と名前を順番に表示
select m ->> 'id' as id, m ->> 'name' as name, m ->> 'path' as path
from public.kl_app k,
     jsonb_array_elements(
       case when jsonb_typeof(k.data) = 'array' then k.data
            else coalesce(k.data -> 'modules', '[]'::jsonb) end
     ) m
where k.key = 'CONTENT_REFERENCE';
