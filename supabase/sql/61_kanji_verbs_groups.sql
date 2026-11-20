-- =====================================================================
-- 61: VCE 漢字 4 字（思・考・会・習）のグループを直す
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: いつでもよい（portal の公開とは関係なし）
--
-- 理由: この 4 字の category が 'Verbs' になっていて、/reference/200kanji の
--   グループの並びに無いため、参照ページに表示されていなかった（196 字しか出ていない）。
-- 新しいグループ（2026-11-21 決定）:
--   Verbs (Body/Senses): 思 think（11 番目）、考 think, consider（12 番目）
--   Verbs (Activity):    会 meet（7 番目）、習 learn（8 番目）
-- 何度実行しても安全。
-- =====================================================================

update public.kl_character set category = 'Verbs (Body/Senses)', sort_order = 11
where char_type = 'kanji' and character = '思';
update public.kl_character set category = 'Verbs (Body/Senses)', sort_order = 12
where char_type = 'kanji' and character = '考';
update public.kl_character set category = 'Verbs (Activity)', sort_order = 7
where char_type = 'kanji' and character = '会';
update public.kl_character set category = 'Verbs (Activity)', sort_order = 8
where char_type = 'kanji' and character = '習';

-- 確認: 0 行なら OK（参照ページの並びに無いグループの漢字が残っていない）
select character, category from public.kl_character
where char_type = 'kanji'
  and coalesce(category, 'Miscellaneous') not in (
    'Numbers','Counters','Season','Days of the week','Day','Time','Parts of the body',
    'Positions','Directions','School life','People/family','Adjectives/adverbs',
    'Verbs (Movement)','Verbs (Body/Senses)','Verbs (Lifestyle)','Verbs (Activity)',
    'Country/city','Place','Travel/transport','Food','Nature','Animals','Colours',
    'Repeat sign','Miscellaneous');
