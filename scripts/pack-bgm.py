"""
クラスのライブゲームの BGM を、サイトに置ける形（.bin）に変える。

OpenTracks（旧 DOVA-SYNDROME）の音源利用ライセンス 禁止事項 8 により、
「エンドユーザーが容易に音源ファイルに音声ファイルとしてアクセス、複製が可能な状態」で置いてはいけない。
そこで、音声ファイルとしては開けない形に変えてから public/live-game/bgm/ に置く。
元に戻す処理は app/components/class-game/bgm.ts（鍵と目印は両方で同じにする）。

使い方（yamato-portal フォルダで）:
    python scripts/pack-bgm.py <元の曲フォルダ>
例:
    python scripts/pack-bgm.py C:/ai-yamato-network/bgm-originals

元の曲フォルダの .mp3 / .m4a / .ogg / .wav を、同じ名前の .bin にして public/live-game/bgm/ に書き出す。
元の曲ファイルは public の中やリポジトリには置かないこと。
"""
import os
import re
import sys

KEY = b'yamato-live-game-bgm'
MAGIC = b'YLGB1'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'live-game', 'bgm')
EXTS = ('.mp3', '.m4a', '.ogg', '.wav')


def main():
    if len(sys.argv) != 2 or not os.path.isdir(sys.argv[1]):
        print(__doc__)
        sys.exit(1)
    src = sys.argv[1]
    os.makedirs(OUT, exist_ok=True)
    count = 0
    for name in sorted(os.listdir(src)):
        stem, ext = os.path.splitext(name)
        if ext.lower() not in EXTS:
            continue
        if not re.fullmatch(r'[a-z0-9-]{1,40}', stem):
            print(f'skip {name}: use only lowercase letters, numbers and hyphens in the file name')
            continue
        data = open(os.path.join(src, name), 'rb').read()
        packed = MAGIC + bytes(b ^ KEY[i % len(KEY)] for i, b in enumerate(data))
        out = os.path.join(OUT, stem + '.bin')
        open(out, 'wb').write(packed)
        print(f'{name} -> public/live-game/bgm/{stem}.bin ({len(data) // 1024} KB)')
        count += 1
    print(f'done: {count} file(s)')


if __name__ == '__main__':
    main()
