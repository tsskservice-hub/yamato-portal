-- =====================================================================
-- 35: 語彙の「聴きます」「聴きません」などを「聞きます」「聞きません」に直す
--   サイト全体の表記ルール: 動詞の「きく」は、いつも「聞く」と書く（api/src/utils/japanese-style.ts と同じルール）
--   以前の語彙データ（obento_deluxe_vocab.json）に「聴きます」「聴きません」があったため、本番に残っていないか調べて直す
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 直すのは「聴」のすぐ後にひらがなの送り仮名が続く形だけ。「聴解」「視聴」などの熟語はそのまま
-- 手順: (1) を実行して対象を見る → よければ (2) を実行 → (3) で 0 件になったことを確認
-- =====================================================================

-- (1) 確認: 直す対象の語彙
select id, lesson_id, jp_text, jp_kana, english_text
from public.kl_vocabulary
where jp_text ~ '聴[かきくけこいっ]';

-- (2) 直す
update public.kl_vocabulary
set jp_text = regexp_replace(jp_text, '聴([かきくけこいっ])', '聞\1', 'g')
where jp_text ~ '聴[かきくけこいっ]';

-- (3) 確認: 語彙と kl_app（サイトの文章データ）に、動詞の「聴」が残っていないか（0 件なら OK）
select 'kl_vocabulary' as source, id::text as key, jp_text as text
from public.kl_vocabulary
where jp_text ~ '聴[かきくけこいっ]'
union all
select 'kl_app', key, substring(data::text from '.{0,20}聴[かきくけこいっ].{0,20}')
from public.kl_app
where data::text ~ '聴[かきくけこいっ]';
