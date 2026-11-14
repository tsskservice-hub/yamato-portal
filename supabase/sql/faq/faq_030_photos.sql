-- =====================================================================
-- FAQ: 手書きの写真の扱い（faq_030）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）の kl_app key = 'FAQ'
--
-- ⚠ 実行タイミング: 保存期間が過ぎた写真を自動で消す仕組みを api に入れて、本番に公開した「あと」
--   2026-11-14 時点では、期限（image_delete_after）を記録するだけで、写真のファイルは消えていない。
--   この FAQ（とプライバシーポリシー 5 章）は「期間が過ぎたら消す」と約束しているので、先に仕組みを作る。
--
-- 仕様（コードで確認済み）:
--   - ヤマトチャットでの添削（VCE ライティングなど）: 写真はサーバーに保存しない
--   - レッスンの手書き課題: 読み取った文字は保存。写真は先生がクラスで保存期間を選んだときだけ、その期間（最大 180 日）保存
--   - 生徒には、提出するときに保存期間が表示される（EduWritingTaskModal）
-- まだ入っていなければ足す（二重に実行しても重ならない）
-- =====================================================================

update kl_app
set data = data || $json$[
  {
    "id": "faq_030",
    "category": "AI Safety for Parents & Teachers",
    "question": "What happens to the photos of handwritten work that students upload? Are they stored?",
    "answer": "It depends on where the photo is uploaded:<br><br><ul><li><strong>Writing feedback in the Yamato chat</strong> (for example on the VCE writing pages): the photo is used only to read the writing and give feedback. It is <strong>not saved</strong> on our servers.</li><li><strong>Handwriting tasks in lessons:</strong> the photo is kept only if the student's teacher has chosen to keep photos for their class, so the teacher can check the handwriting. It is kept only for the period the teacher chooses (up to 180 days) and is then deleted. Students are shown how long their photo will be kept when they submit it. If the teacher does not keep photos, the photo is not saved.</li></ul><br>To read a photo, Yamato sends it securely to the AI service that powers it. For more detail, please see our <a href=\"/legal/privacy\">Privacy Policy</a>."
  }
]$json$::jsonb,
    updated_at = now()
where key = 'FAQ'
  and not (data @> '[{"id": "faq_030"}]'::jsonb);

-- 確認用: faq_030_added が true なら成功
select jsonb_array_length(data) as total, data @> '[{"id": "faq_030"}]'::jsonb as faq_030_added
from kl_app where key = 'FAQ';
