"""
「みんなでジグソー」のサイトの写真集（すべての先生が使える絵）を、ゲームの画面を開かずに追加する。

使い方（yamato-portal フォルダで）:
    python scripts/pack-jigsaw.py <元の絵のフォルダ>
例:
    python scripts/pack-jigsaw.py C:/ai-yamato-network/jigsaw-originals

すること:
  1. 元の絵（.jpg / .jpeg / .png / .webp）を、長い辺 1600 ピクセルまでの WebP にして public/live-game/jigsaw/ に置く
  2. 写真集に登録する SQL を supabase/sql/tool_jigsaw_library_files.sql に書き出す（SQL Editor で実行する）
     作品名と出典は下の WORKS から取る（シカゴ美術館の所蔵番号で探す）。WORKS にない絵は、ファイル名を作品名にする
     （その場合のファイル名は半角英小文字・数字・ハイフンだけにする）。

⚠ ここに置いてよいのは、パブリックドメインの作品（CC0 の浮世絵など）や自分で撮った写真だけ。
   写真AC など、ジグソーパズルへの使用を禁止している素材サイトの写真は使わない。
"""
import os
import re
import sys

from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT_DIR = os.path.join(ROOT, 'public', 'live-game', 'jigsaw')
SQL_PATH = os.path.join(ROOT, 'supabase', 'sql', 'tool_jigsaw_library_files.sql')
LONG_SIDE = 1600
EXTS = ('.jpg', '.jpeg', '.png', '.webp')

# シカゴ美術館（Art Institute of Chicago）の浮世絵。同館の公開データで is_public_domain = true（CC0）を確認済み（2026-11-15）。
# 同館からダウンロードしたファイル名は「所蔵番号 - 作品名….jpg」なので、所蔵番号で探す。
# 所蔵番号 → (ファイル名, 作品名, 出典)
AIC = 'Art Institute of Chicago (CC0)'
WORKS = {
    '1925.3282': ('hokusai-tama-river', 'Tama River in Musashi Province', f'Katsushika Hokusai, c. 1830–33 — {AIC}'),
    '1925.3373': ('hokusai-chrysanthemum', 'Chrysanthemum and Horsefly', f'Katsushika Hokusai, c. 1831–33 — {AIC}'),
    '1928.1085': ('hokusai-red-fuji', 'A Mild Breeze on a Fine Day (Red Fuji)', f'Katsushika Hokusai, c. 1830–33 — {AIC}'),
    '1928.1086': ('hokusai-great-wave', 'The Great Wave off Kanagawa', f'Katsushika Hokusai, c. 1830–33 — {AIC}'),
    '1929.752': ('hokusai-togetsu-bridge', 'Togetsu Bridge at Arashiyama', f'Katsushika Hokusai, c. 1833–34 — {AIC}'),
    '1930.59': ('hiroshige-mitsuke-tenryu', 'Mitsuke: Ferries Crossing the Tenryū River', f'Utagawa Hiroshige, c. 1837–42 — {AIC}'),
    '1930.60': ('hiroshige-hamamatsu', 'Hamamatsu on the Tōkaidō', f'Utagawa Hiroshige, c. 1837–42 — {AIC}'),
    '1932.170': ('hiroshige-mishima-mist', 'Mishima: Morning Mist', f'Utagawa Hiroshige, c. 1833–34 — {AIC}'),
    '1942.151': ('gakutei-tenpozan-downpour', 'Afternoon Downpour at Mount Tenpō, Osaka', f'Yashima Gakutei, c. 1834 — {AIC}'),
    '1943.618': ('toyoshige-enoshima-clearing', 'Clearing Weather at Enoshima', f'Utagawa Toyoshige (Toyokuni II), c. 1833–34 — {AIC}'),
    '1943.673': ('hiroshige-enoshima-cave', 'The Cave at Enoshima', f'Utagawa Hiroshige, c. 1837–39 — {AIC}'),
    '1959.115': ('kuniyoshi-kakuta-waves', 'Nichiren Calming the Waves at Kakuta', f'Utagawa Kuniyoshi, c. 1830–35 — {AIC}'),
    '1964.1058b': ('hokusai-tago-bay', 'Tago Bay near Ejiri', f'Katsushika Hokusai, c. 1830–33 — {AIC}'),
    '1983.582': ('hokusai-goto-whaling', 'Whaling off the Gotō Islands', f'Katsushika Hokusai, c. 1831–33 — {AIC}'),
    '1983.583': ('hokusai-choshi-boats', 'Fishing Boats at Chōshi', f'Katsushika Hokusai, c. 1833–34 — {AIC}'),
}


def sql_text(s):
    return "'" + s.replace("'", "''") + "'"


def main():
    if len(sys.argv) != 2 or not os.path.isdir(sys.argv[1]):
        print(__doc__)
        sys.exit(1)
    src = sys.argv[1]
    os.makedirs(OUT_DIR, exist_ok=True)
    rows = []
    for name in sorted(os.listdir(src)):
        stem, ext = os.path.splitext(name)
        if ext.lower() not in EXTS:
            continue
        ref = name.split(' - ')[0].strip()
        work = WORKS.get(ref)
        if work:
            stem = work[0]
        elif not re.fullmatch(r'[a-z0-9-]{1,60}', stem):
            print(f'skip {name}: use only lowercase letters, numbers and hyphens in the file name')
            continue
        im = Image.open(os.path.join(src, name))
        im.load()
        im = im.convert('RGB')
        im.thumbnail((LONG_SIDE, LONG_SIDE), Image.LANCZOS)
        if min(im.size) < 200:
            print(f'skip {name}: too small ({im.size[0]}×{im.size[1]})')
            continue
        out = os.path.join(OUT_DIR, stem + '.webp')
        im.save(out, 'WEBP', quality=85, method=6)
        title, credit = (work[1], work[2]) if work else (stem.replace('-', ' ').title(), None)
        rows.append((title, credit, f'/live-game/jigsaw/{stem}.webp', im.size[0], im.size[1]))
        print(f'{name} -> public/live-game/jigsaw/{stem}.webp ({im.size[0]}×{im.size[1]}, {os.path.getsize(out) // 1024} KB)'
              + ('' if work else '  ⚠ not in WORKS: check the title and add a credit in the SQL'))

    values = ',\n'.join(
        f"  ({sql_text(t)}, {sql_text(c) if c else 'null'}, {sql_text(p)}, {w}, {h})" for t, c, p, w, h in rows
    )
    sql = f"""-- =====================================================================
-- ジグソーの「サイトの写真集」に、ポータルに置いた絵を登録する（scripts/pack-jigsaw.py が書き出したファイル）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: public/live-game/jigsaw/ の絵をデプロイした「あと」（25 のあと）
-- すでに登録してある絵（同じ場所）は足さない。何度実行しても安全。
-- =====================================================================
insert into public.edu_jigsaw_images (teacher_id, title, credit, storage_path, width, height)
select null, v.title, v.credit, v.storage_path, v.width, v.height
from (values
{values}
) as v(title, credit, storage_path, width, height)
where not exists (select 1 from public.edu_jigsaw_images i where i.storage_path = v.storage_path);

-- 確認用: 登録されている、ポータルに置いた絵の一覧
select title, credit, storage_path, width, height
from public.edu_jigsaw_images
where storage_path like '/live-game/jigsaw/%'
order by title;
"""
    if rows:
        open(SQL_PATH, 'w', encoding='utf-8').write(sql)
        print(f'wrote supabase/sql/tool_jigsaw_library_files.sql ({len(rows)} picture(s))')
    else:
        print('no pictures found')


if __name__ == '__main__':
    main()
