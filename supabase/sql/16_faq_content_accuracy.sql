-- 本番 ybquwzoreecxxbewjpdn: kl_app の key = 'FAQ' に、教材の作り方と正確さについての FAQ を 1 件足す
-- 今ある項目はそのまま残す。faq_033 がすでにあれば何もしない（二重に実行しても重ならない）
update kl_app
set data = data || $json$[
  {
    "id": "faq_033",
    "category": "About Our Learning Content",
    "question": "How is the learning content created, and is all of it fact-checked?",
    "answer": "Our learning materials, including the cultural tasks, are created with the help of AI tools. Every item is reviewed by a teacher before it is published, and we take care to keep the information accurate. However, we have not independently verified every fact or piece of data against original sources. Cultural topics in particular can vary by region, era and source.<br><br>Please treat the portal as study support, not as an authoritative reference. If accuracy matters for an assessment or a school task, please check with your teacher or your official course materials. If you spot something that looks wrong, please let us know using <strong>Report a Bug / Issue</strong> or <strong>Quick Feedback & Suggestions</strong> on your dashboard, and we will look into it."
  }
]$json$::jsonb,
    updated_at = now()
where key = 'FAQ'
  and not (data @> '[{"id": "faq_033"}]'::jsonb);

-- 確認用: faq_033_added が true なら成功
select
  jsonb_array_length(data) as total,
  data @> '[{"id": "faq_033"}]'::jsonb as faq_033_added,
  updated_at
from kl_app
where key = 'FAQ';
