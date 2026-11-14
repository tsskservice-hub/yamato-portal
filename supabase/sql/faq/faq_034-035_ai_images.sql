-- =====================================================================
-- FAQ: ヤマトが描いた絵の「AI-generated」ラベルと、学校の課題での使い方（faq_034, 035）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）の kl_app key = 'FAQ'
--
-- ⚠ 実行タイミング: 絵にラベルを焼き込む機能（app/utils/aiImageLabel.ts）を本番に公開した「あと」
--   以前の下書きでは faq_022・023 にしていたが、安全性の FAQ と番号が重なるので 034・035 に変えた
-- まだ入っていない ID だけを足す（二重に実行しても重ならない）
-- =====================================================================

update kl_app
set data = data || coalesce((
      select jsonb_agg(item order by ord)
      from jsonb_array_elements($json$[
  {
    "id": "faq_034",
    "category": "AI Safety for Parents & Teachers",
    "question": "Why do pictures drawn by AI Yamato have an \"AI-generated\" label?",
    "answer": "Every picture AI Yamato draws has a visible <strong>AI-generated · AI Yamato</strong> label across the bottom of the image. The label is part of the picture itself, so it stays when the picture is enlarged, saved or shared. This makes it clear to anyone who sees it, including teachers, that the picture was created by AI and not drawn by a person."
  },
  {
    "id": "faq_035",
    "category": "AI Safety for Parents & Teachers",
    "question": "Can students use pictures drawn by AI Yamato in their school assignments?",
    "answer": "Pictures drawn by AI Yamato carry a label showing that they are AI-generated. If a student wants to include one in a school assignment, they should <strong>follow their teacher's instructions</strong>. Each school and teacher may have different rules about using AI-generated content, so please check with the teacher first if you are unsure."
  }
]$json$::jsonb) with ordinality as x(item, ord)
      where not (kl_app.data @> jsonb_build_array(jsonb_build_object('id', item ->> 'id')))
    ), '[]'::jsonb),
    updated_at = now()
where key = 'FAQ';

-- 確認用: added が 2 なら成功
select jsonb_array_length(data) as total,
  (select count(*) from jsonb_array_elements(data) e where e ->> 'id' in ('faq_034', 'faq_035')) as added
from kl_app where key = 'FAQ';
