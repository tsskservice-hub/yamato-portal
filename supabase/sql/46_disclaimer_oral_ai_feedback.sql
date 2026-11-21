-- =====================================================================
-- 46: 免責事項（Disclaimer）に「話す練習の AI フィードバック」の章を足す
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）の kl_app key = 'LEGAL_CONTENTS'
--
-- 背景: EOY Oral（Drill・Elaborate・Mock・Superb）は、生徒の声を文字にして、その文字をもとに AI がフィードバックする。
--   発音・抑揚・リズムは評価していない。テンポは、録音の時刻から測った数字で一部だけ。FAQ（faq_037）と同じ内容を、免責事項にも書く。
-- 内容はコードで確認済み（2026-11-17）:
--   ・Drill・Elaborate・Mock は、送る前に生徒が文字を確かめ、ちがえば言い直せる。Superb は、フィードバックの前に文字を直せる
--   ・Mock・Superb は、画面が測った時間（答え始めるまでの秒数・答えの長さ）もフィードバックに使う
--   ・Mock・Superb の Band は、このサイトの 5 段階の目安で、VCAA の公式の点数ではない
--
-- 章は disclaimer.sections の最後に足す。ほかの見出しに番号（「5. …」）があれば、続きの番号を付ける。
-- すでにこの章があれば何もしない（二重に実行しても重ならない）。lastUpdated は実行した日になる。
-- 実行する前に、(0) で今の見出しの並びを確認してください。
-- =====================================================================

-- (0) 今の免責事項の見出し（足す前の確認）
select t.ord, t.s ->> 'heading' as heading
from public.kl_app k, jsonb_array_elements(k.data #> '{disclaimer,sections}') with ordinality as t(s, ord)
where k.key = 'LEGAL_CONTENTS'
order by t.ord;

-- (1) 章を足す
update public.kl_app k
set data = jsonb_set(
      jsonb_set(
        k.data,
        '{disclaimer,sections}',
        (k.data #> '{disclaimer,sections}') || jsonb_build_array(jsonb_build_object(
          'heading',
          coalesce(
            (select (max((substring(s ->> 'heading' from '^(\d+)\.'))::int) + 1)::text || '. '
             from jsonb_array_elements(k.data #> '{disclaimer,sections}') s
             where s ->> 'heading' ~ '^\d+\.'),
            ''
          ) || 'AI Feedback on Speaking Practice',
          'content',
          $t$In the EOY Oral practice pages (Drill, Elaborate, Mock and Superb), what students say is turned into text by speech recognition, and AI Yamato's feedback is based on that text. The feedback can comment on whether answers fit the questions, how much the student elaborates, how they keep the conversation going, and the range and accuracy of their vocabulary and grammar. In the Mock and Superb pages, the app also uses the times of the student's recordings to measure part of their tempo, such as how quickly they start answering and how long each answer lasts, and the feedback may comment on these numbers. The feedback does not assess pronunciation, intonation or rhythm, or tempo beyond these timing measures. Speech recognition can mishear words, so the feedback may sometimes be based on text that differs from what the student said; students can check the text before sending each answer, and in the Superb page they can correct it before receiving feedback. Bands and comments are practice estimates on this site's own 5-level scale. They are not official VCAA scores and do not predict exam results.$t$
        ))
      ),
      '{disclaimer,lastUpdated}',
      to_jsonb(to_char(now() at time zone 'Australia/Melbourne', 'FMMonth FMDD, YYYY'))
    ),
    updated_at = now()
where k.key = 'LEGAL_CONTENTS'
  and jsonb_typeof(k.data #> '{disclaimer,sections}') = 'array'
  and not exists (
    select 1 from jsonb_array_elements(k.data #> '{disclaimer,sections}') s
    where s ->> 'heading' like '%AI Feedback on Speaking Practice%'
  );

-- (2) 確認: 最後の章が「AI Feedback on Speaking Practice」になっていれば成功
select data #>> '{disclaimer,lastUpdated}' as last_updated,
       jsonb_array_length(data #> '{disclaimer,sections}') as sections,
       data #> '{disclaimer,sections}' -> -1 ->> 'heading' as last_heading
from public.kl_app
where key = 'LEGAL_CONTENTS';
