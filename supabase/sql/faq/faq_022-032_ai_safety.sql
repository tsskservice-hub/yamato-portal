-- =====================================================================
-- FAQ: 保護者・先生向け「AI の安全性」と「データの扱い」（faq_022〜029, 031, 032）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）の kl_app key = 'FAQ'
-- 実行タイミング: いつでもよい
--
-- 内容はチャットで作った下書きを、2026-11-14 にコードと照らし合わせて直したもの:
--   - faq_023: 経歴は「数十年（decades）」と書く（本人の希望）
--   - faq_025 / 026: ニックネームは入力欄で不適切な語を弾き、ヤマトも「適切な場合だけ」呼ぶ（二重の仕組み）
--   - faq_031: ヤマトチャットは保存しない。ただしレッスンの手書き課題は、読み取った文字を保存する（実際の仕様）
-- faq_030（手書き写真の保存）は、期限切れの写真を自動で消す仕組みができてから faq_030_photos.sql で入れる
-- faq_033 は実行済み（faq_033_content_accuracy.sql）
-- まだ入っていない ID だけを足す（二重に実行しても重ならない）
-- =====================================================================

update kl_app
set data = data || coalesce((
      select jsonb_agg(item order by ord)
      from jsonb_array_elements($json$[
  {
    "id": "faq_022",
    "category": "AI Safety for Parents & Teachers",
    "question": "What is AI Yamato, and is it a general-purpose chatbot?",
    "answer": "AI Yamato is an AI study assistant built specifically for VCE Japanese learners. It is not a general-purpose chatbot. Every conversation is guided by a system prompt that defines Yamato's role, teaching style and boundaries, so Yamato stays focused on supporting Japanese learning."
  },
  {
    "id": "faq_023",
    "category": "AI Safety for Parents & Teachers",
    "question": "Who designed the portal and the AI's behaviour?",
    "answer": "The portal was designed by a Japanese teacher with decades of full-time experience teaching in Victorian secondary schools. Because of that classroom experience, student safety and keeping lessons on track were built in from the start, not added later."
  },
  {
    "id": "faq_024",
    "category": "AI Safety for Parents & Teachers",
    "question": "How is AI Yamato's behaviour controlled?",
    "answer": "Every Yamato page combines two layers of instructions:<br><br><ul><li><strong>Core layer (all pages):</strong> Yamato's teaching philosophy and safety guardrails. Yamato is always kind and supportive of each individual student, and does not allow inappropriate conversations or off-topic tangents.</li><li><strong>Page layer:</strong> Instructions specific to that page's purpose, such as VCE writing feedback or oral practice.</li></ul><br>The two layers are combined into one set of instructions each time, so the safety guardrails apply on every page."
  },
  {
    "id": "faq_025",
    "category": "AI Safety for Parents & Teachers",
    "question": "What if a student tries to chat about inappropriate or unrelated topics?",
    "answer": "Yamato is designed to politely steer the conversation back to learning. The safety guardrails in Yamato's core instructions do not allow inappropriate conversations or off-topic tangents. Nicknames are checked too: the nickname form blocks inappropriate words, and Yamato is instructed to use a student's nickname only if it is appropriate."
  },
  {
    "id": "faq_026",
    "category": "AI Safety for Parents & Teachers",
    "question": "Can students set their own nickname for Yamato to use?",
    "answer": "Yes. Students can choose a nickname, and Yamato will call them by it. The nickname form blocks inappropriate words, and Yamato is also instructed not to use a nickname that is not appropriate, so students cannot simply set up Yamato to address them in an unsuitable way."
  },
  {
    "id": "faq_027",
    "category": "AI Safety for Parents & Teachers",
    "question": "What can AI Yamato actually do on each page?",
    "answer": "Yamato's role changes depending on the page, and each role is limited to that page's purpose:<br><br><ul><li><strong>Landing page (Concierge Yamato):</strong> Answers questions about pricing, legal information and the site in general.</li><li><strong>VCE writing pages:</strong> Gives advice and feedback using the VCE writing criteria and the required kanji and grammar data.</li><li><strong>Handwriting feedback:</strong> Reads a photo of a student's handwritten answer, transcribes it and gives feedback on the content.</li><li><strong>Oral practice:</strong> Asks examiner-style questions prepared in advance by a teacher, and the student answers them.</li></ul>"
  },
  {
    "id": "faq_028",
    "category": "AI Safety for Parents & Teachers",
    "question": "In oral practice, does the AI make up its own questions?",
    "answer": "No. In oral practice, Yamato asks questions that were prepared in advance by a teacher, which keeps the practice close to what students can expect in the real exam. The student's task is to answer appropriately. Yamato is not making up its own topics."
  },
  {
    "id": "faq_029",
    "category": "AI Safety for Parents & Teachers",
    "question": "Is AI Yamato guaranteed to be 100% safe? What should I do if I see a problem?",
    "answer": "No AI system is perfect, and the safeguards above are designed to reduce risk, not to guarantee that nothing will ever go wrong. If you notice anything inappropriate or unexpected in Yamato's responses, please tell us using <strong>Report a Bug / Issue</strong> or <strong>Quick Feedback & Suggestions</strong> on your dashboard so we can look into it and improve."
  },
  {
    "id": "faq_031",
    "category": "AI Safety for Parents & Teachers",
    "question": "Are chat conversations and the text transcribed from photos saved?",
    "answer": "Conversations with Yamato in the chat are <strong>not saved</strong>. This includes any text Yamato reads from a photo in the chat. The conversation stays only in the open chat window and is gone when the chat is closed.<br><br>The one exception is <strong>handwriting tasks in lessons</strong>. There, the text Yamato reads from the student's writing is saved, so that their attempts can be counted and, if the student is in a class, their teacher can review their work. We also keep a record of credit use (such as which feature was used), but not the content of conversations.<br><br>To create its replies, Yamato sends each message securely to the AI service that powers it. For more detail, please see our <a href=\"/legal/privacy\">Privacy Policy</a>."
  },
  {
    "id": "faq_032",
    "category": "AI Safety for Parents & Teachers",
    "question": "Does AI Yamato remember what we talked about before?",
    "answer": "Within a single chat, yes. Yamato can refer back to what was said earlier in the same conversation, so students can ask follow-up questions naturally. Because conversations are not saved, Yamato does not remember them once the chat is closed. A new chat starts fresh. This is a deliberate choice to protect students' privacy."
  }
]$json$::jsonb) with ordinality as x(item, ord)
      where not (kl_app.data @> jsonb_build_array(jsonb_build_object('id', item ->> 'id')))
    ), '[]'::jsonb),
    updated_at = now()
where key = 'FAQ';

-- 確認用: added が 10（faq_022〜029・031・032）なら成功。total は 32 になる（faq_030・034・035 はまだ）
select
  jsonb_array_length(data) as total,
  (select count(*) from jsonb_array_elements(data) e
    where e ->> 'id' in ('faq_022','faq_023','faq_024','faq_025','faq_026','faq_027','faq_028','faq_029','faq_031','faq_032')) as added
from kl_app
where key = 'FAQ';
