-- =====================================================================
-- FAQ: サイトで使っている絵・写真には AI で作ったものもある（faq_036）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）の kl_app key = 'FAQ'
--
-- 背景: クラスのライブゲームの宝箱の絵（鬼・天狗・竜宮城など）には AI で作ったものがある。
--   絵の一枚一枚には表示せず、サイト全体の説明としてここに書く。
--   ヤマトが描く絵のラベル（faq_034・035）とは別の話（こちらはサイトが用意した絵）。
-- まだ入っていなければ足す（二重に実行しても重ならない）
-- =====================================================================
update kl_app
set data = data || $json$[
  {
    "id": "faq_036",
    "category": "About Our Learning Content",
    "question": "Are the pictures and illustrations on the portal made by AI?",
    "answer": "Some of them are. The portal uses a mix of photos we took ourselves, stock photos used under their licence terms, public-domain artworks such as ukiyo-e prints, and illustrations created with AI tools (for example, some of the pictures in the class live game). Every picture is chosen and checked by a teacher before it is used.<br><br>AI-made illustrations are used to make learning more fun. They are not historical records, so details such as clothing, buildings or objects may not be exactly accurate. Pictures that teachers upload themselves (for example, for a class jigsaw) are the responsibility of the teacher who uploads them."
  }
]$json$::jsonb,
    updated_at = now()
where key = 'FAQ'
  and not (data @> '[{"id": "faq_036"}]'::jsonb);

-- 確認用: faq_036_added が true なら成功
select jsonb_array_length(data) as total, data @> '[{"id": "faq_036"}]'::jsonb as faq_036_added
from kl_app where key = 'FAQ';
