-- =====================================================================
-- FAQ: 口頭試験の練習で、AI が評価できること・できないこと（faq_037）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）の kl_app key = 'FAQ'
--
-- 背景: EOY Oral（Drill・Elaborate・Mock・Superb）は、生徒の声を文字にして、その文字をもとに AI がフィードバックする。
--   発音・抑揚・リズム・テンポは文字に残らないので、評価していない。
--   コードと合っていること（2026-11-17 確認）:
--     ・Drill・Elaborate・Mock は、送る前に生徒が文字を確かめ、ちがえば言い直せる
--     ・Superb は、会話のあとフィードバックの前に、生徒が文字を直せる
--     ・Mock・Superb の Band は、このサイトの 5 段階の目安で、VCAA の公式の点数ではない
-- まだ入っていなければ足す（二重に実行しても重ならない）
-- =====================================================================
update kl_app
set data = data || $json$[
  {
    "id": "faq_037",
    "category": "About Our Learning Content",
    "question": "How does AI Yamato assess my speaking in the oral exam practice?",
    "answer": "In the EOY Oral practice pages (Drill, Elaborate, Mock and Superb), what you say is turned into text by speech recognition, and AI Yamato gives feedback based on that text.<br><br><b>What AI Yamato can assess:</b> whether your answers fit the questions, how much you elaborate (reasons, details, examples, feelings), how you keep the conversation going, and the range and accuracy of your vocabulary and grammar.<br><br><b>What it does not assess:</b> pronunciation, intonation, rhythm and tempo. These are not kept in the text, so please practise them with your teacher, or by listening to and copying native speakers.<br><br>Speech recognition sometimes mishears words. You can check the text before you send each answer, and in the Superb page you can correct the text before you get your feedback. The band in the Mock and Superb feedback is a practice estimate on this site's own 5-level scale, not an official VCAA score."
  }
]$json$::jsonb,
    updated_at = now()
where key = 'FAQ'
  and not (data @> '[{"id": "faq_037"}]'::jsonb);

-- 確認用: faq_037_added が true なら成功
select jsonb_array_length(data) as total, data @> '[{"id": "faq_037"}]'::jsonb as faq_037_added
from kl_app where key = 'FAQ';
