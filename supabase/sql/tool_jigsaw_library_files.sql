-- =====================================================================
-- ジグソーの「サイトの写真集」に、ポータルに置いた絵を登録する（scripts/pack-jigsaw.py が書き出したファイル）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: public/live-game/jigsaw/ の絵をデプロイした「あと」（25 のあと）
-- すでに登録してある絵（同じ場所）は足さない。何度実行しても安全。
-- =====================================================================
insert into public.edu_jigsaw_images (teacher_id, title, credit, storage_path, width, height)
select null, v.title, v.credit, v.storage_path, v.width, v.height
from (values
  ('Tama River in Musashi Province', 'Katsushika Hokusai, c. 1830–33 — Art Institute of Chicago (CC0)', '/live-game/jigsaw/hokusai-tama-river.webp', 1600, 1090),
  ('Chrysanthemum and Horsefly', 'Katsushika Hokusai, c. 1831–33 — Art Institute of Chicago (CC0)', '/live-game/jigsaw/hokusai-chrysanthemum.webp', 1600, 1100),
  ('A Mild Breeze on a Fine Day (Red Fuji)', 'Katsushika Hokusai, c. 1830–33 — Art Institute of Chicago (CC0)', '/live-game/jigsaw/hokusai-red-fuji.webp', 1600, 1102),
  ('The Great Wave off Kanagawa', 'Katsushika Hokusai, c. 1830–33 — Art Institute of Chicago (CC0)', '/live-game/jigsaw/hokusai-great-wave.webp', 1600, 1107),
  ('Togetsu Bridge at Arashiyama', 'Katsushika Hokusai, c. 1833–34 — Art Institute of Chicago (CC0)', '/live-game/jigsaw/hokusai-togetsu-bridge.webp', 1600, 1084),
  ('Mitsuke: Ferries Crossing the Tenryū River', 'Utagawa Hiroshige, c. 1837–42 — Art Institute of Chicago (CC0)', '/live-game/jigsaw/hiroshige-mitsuke-tenryu.webp', 1600, 1195),
  ('Hamamatsu on the Tōkaidō', 'Utagawa Hiroshige, c. 1837–42 — Art Institute of Chicago (CC0)', '/live-game/jigsaw/hiroshige-hamamatsu.webp', 1600, 1192),
  ('Mishima: Morning Mist', 'Utagawa Hiroshige, c. 1833–34 — Art Institute of Chicago (CC0)', '/live-game/jigsaw/hiroshige-mishima-mist.webp', 1600, 1025),
  ('Afternoon Downpour at Mount Tenpō, Osaka', 'Yashima Gakutei, c. 1834 — Art Institute of Chicago (CC0)', '/live-game/jigsaw/gakutei-tenpozan-downpour.webp', 1600, 1071),
  ('Clearing Weather at Enoshima', 'Utagawa Toyoshige (Toyokuni II), c. 1833–34 — Art Institute of Chicago (CC0)', '/live-game/jigsaw/toyoshige-enoshima-clearing.webp', 1600, 1051),
  ('The Cave at Enoshima', 'Utagawa Hiroshige, c. 1837–39 — Art Institute of Chicago (CC0)', '/live-game/jigsaw/hiroshige-enoshima-cave.webp', 1600, 1026),
  ('Nichiren Calming the Waves at Kakuta', 'Utagawa Kuniyoshi, c. 1830–35 — Art Institute of Chicago (CC0)', '/live-game/jigsaw/kuniyoshi-kakuta-waves.webp', 1600, 1020),
  ('Tago Bay near Ejiri', 'Katsushika Hokusai, c. 1830–33 — Art Institute of Chicago (CC0)', '/live-game/jigsaw/hokusai-tago-bay.webp', 1600, 1104),
  ('Whaling off the Gotō Islands', 'Katsushika Hokusai, c. 1831–33 — Art Institute of Chicago (CC0)', '/live-game/jigsaw/hokusai-goto-whaling.webp', 1600, 1182),
  ('Fishing Boats at Chōshi', 'Katsushika Hokusai, c. 1833–34 — Art Institute of Chicago (CC0)', '/live-game/jigsaw/hokusai-choshi-boats.webp', 1600, 1182)
) as v(title, credit, storage_path, width, height)
where not exists (select 1 from public.edu_jigsaw_images i where i.storage_path = v.storage_path);

-- 確認用: 登録されている、ポータルに置いた絵の一覧
select title, credit, storage_path, width, height
from public.edu_jigsaw_images
where storage_path like '/live-game/jigsaw/%'
order by title;
