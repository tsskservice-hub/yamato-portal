-- =====================================================================
-- ジグソーの写真を「サイトの写真集」に移す（すべての先生が使えるようにする）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
--
-- 使い方:
--   1. 先生のアカウント（例: sample@）で /class-game を開き、「みんなでジグソー」の準備画面から写真をアップロードする
--      （作品名と出典もそこで入れる）
--   2. 下の ① で一覧を見て、写真集に入れたいものの title を ② に書いて実行する
-- =====================================================================

-- ① アップロードされた写真の一覧（teacher_email が空のものは、すでにサイトの写真集）
select i.title, i.credit, u.email as teacher_email, i.width, i.height, i.created_at
from public.edu_jigsaw_images i
left join auth.users u on u.id = i.teacher_id
order by i.created_at desc;

-- ② サイトの写真集に移す（title を書き換えてから、この 3 行だけを選んで実行）
-- update public.edu_jigsaw_images
-- set teacher_id = null
-- where title = 'ここに作品名' and teacher_id is not null;
