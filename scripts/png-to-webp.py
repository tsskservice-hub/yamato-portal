"""
PNG -> WebP 変換スクリプト

WebP にしたほうがファイルが小さくなる場合だけ .webp を書き出す。
元の PNG は削除しない。

使い方:
  python scripts/png-to-webp.py 画像.png                  # 1ファイル
  python scripts/png-to-webp.py フォルダ/                  # フォルダ内の PNG すべて（サブフォルダも）
  python scripts/png-to-webp.py フォルダ/ --out public/images   # 出力先を指定
  python scripts/png-to-webp.py 画像.png --quality 75      # 画質を下げてさらに小さく（既定 85）
  python scripts/png-to-webp.py 画像.png --lossless        # 劣化なし（ロゴ・図表向け）
  python scripts/png-to-webp.py フォルダ/ --dry-run        # 書き出さずに結果だけ表示

必要: pip install pillow
"""

import argparse
import io
import sys
from pathlib import Path

from PIL import Image


def human(n: int) -> str:
    return f"{n / 1024:.1f} KB" if n < 1024 * 1024 else f"{n / 1024 / 1024:.2f} MB"


def to_webp_bytes(png_path: Path, quality: int, lossless: bool) -> bytes:
    with Image.open(png_path) as img:
        # パレット画像などは透過を保ったまま RGBA / RGB に揃える
        if img.mode not in ("RGB", "RGBA"):
            has_alpha = img.mode in ("LA", "PA") or "transparency" in img.info
            img = img.convert("RGBA" if has_alpha else "RGB")
        buf = io.BytesIO()
        img.save(buf, "WEBP", quality=quality, lossless=lossless, method=6)
        return buf.getvalue()


def collect_pngs(target: Path) -> list[Path]:
    if target.is_dir():
        return sorted(p for p in target.rglob("*") if p.suffix.lower() == ".png")
    if target.is_file() and target.suffix.lower() == ".png":
        return [target]
    return []


def main() -> int:
    # Windows のコンソール（cp932）でも文字化け・エラーにならないようにする
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(description="PNG を WebP に変換（小さくなる場合のみ）")
    parser.add_argument("inputs", nargs="+", type=Path, help="PNG ファイルまたはフォルダ")
    parser.add_argument("--out", type=Path, help="出力先フォルダ（省略時は PNG と同じ場所）")
    parser.add_argument("--quality", type=int, default=85, help="画質 0–100（既定 85）")
    parser.add_argument("--lossless", action="store_true", help="劣化なしで変換")
    parser.add_argument("--overwrite", action="store_true", help="既存の .webp を上書きする")
    parser.add_argument("--dry-run", action="store_true", help="書き出さずに結果だけ表示")
    args = parser.parse_args()

    pngs: list[tuple[Path, Path]] = []  # (PNG, 基準フォルダ)
    for target in args.inputs:
        found = collect_pngs(target)
        if not found:
            print(f"[!] PNG が見つかりません: {target}")
        base = target if target.is_dir() else target.parent
        pngs += [(p, base) for p in found]

    converted = skipped = 0
    saved_total = 0

    for png, base in pngs:
        if args.out:
            dest = (args.out / png.relative_to(base)).with_suffix(".webp")
        else:
            dest = png.with_suffix(".webp")

        if dest.exists() and not args.overwrite:
            print(f"- スキップ（既に存在）: {dest}")
            skipped += 1
            continue

        try:
            data = to_webp_bytes(png, args.quality, args.lossless)
        except Exception as e:
            print(f"[NG] 失敗: {png} ({e})")
            skipped += 1
            continue

        png_size = png.stat().st_size
        webp_size = len(data)

        if webp_size >= png_size:
            print(f"- そのまま PNG: {png.name}  {human(png_size)} -> WebP だと {human(webp_size)}（大きくなる）")
            skipped += 1
            continue

        rate = (1 - webp_size / png_size) * 100
        print(f"[OK] {png.name}  {human(png_size)} -> {human(webp_size)}  (-{rate:.0f}%)  -> {dest}")
        if not args.dry_run:
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
        converted += 1
        saved_total += png_size - webp_size

    label = "変換予定" if args.dry_run else "変換"
    print(f"\n{label}: {converted} 件 / スキップ: {skipped} 件 / 削減合計: {human(saved_total)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
