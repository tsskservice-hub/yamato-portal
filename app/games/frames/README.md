# iframe で表示する HTML ゲーム

このフォルダの HTML ゲーム（将棋・囲碁・花札・数独・都道府県パズル・ひらがな神経衰弱）は、
ポータルのゲームページの中に iframe で表示する。

**`public/` には置かない。** `public/` に置くと URL を直接開くだけで遊べてしまい、
ログイン確認や先生のゲームのロック（教師ダッシュボード）を回避できてしまう。

## 仕組み

1. ゲームのページ（`app/routes/games.*.tsx`）を開くと、`GameAccessGate` がブラウザのログイン情報で
   `/api/game-access` に問い合わせる（ログインしているか・先生がロックしていないか）。
2. 遊べる場合は「チケット」（署名つき・10 分で期限切れ）が返り、`GameFrame` が
   `/game-frame/<名前>?t=<チケット>` を iframe で開く。
3. `app/routes/game-frame.$name.ts` がチケットとロックをもう一度確認し、このフォルダの HTML を返す。
   直接開いた（iframe ではない）場合は `/games` に戻す。
4. 返す HTML の `<head>` には共通の「ブリッジ」（`FRAME_BRIDGE`）を差し込む。ブリッジは次を担当する：
   - ページの高さを親へ知らせる（iframe の高さが自動で合い、スクロールが二重にならない）
   - 画面に見えている範囲を受け取り、ダイアログをその中央に出す
   - `html` に `yg-embedded` クラスを付ける（ゲーム側で「ポータルの中」かどうかの判定に使える）
5. 先生がロックすると、`GameAccessGate` が 30 秒以内に気づいてゲームを閉じる。

全画面ボタンは、ゲームの外側の `GameFrame` のツールバーにある。
Fullscreen API が使えない端末（iPhone など）では、画面いっぱいに広げる表示に切り替わる。

## 新しいゲームを追加する手順

例：`karuta`（かるた）を追加する場合

### 1. HTML をこのフォルダに置く

`app/games/frames/karuta.html`。ファイル名と URL 名（`/game-frame/karuta`）を揃える。

### 2. 配信ルートに登録する

`app/routes/game-frame.$name.ts`：

```ts
import karuta from '~/games/frames/karuta.html?raw';

const FRAMES: Record<string, string> = {
  // ...既存のゲーム
  karuta,
};
```

ここに登録したものだけが配信される（未登録の名前は 404）。

### 3. ゲームのページを作る

`app/routes/games.shogi.tsx` をコピーして `app/routes/games.karuta.tsx` を作り、
`name="karuta"`・タイトル・説明文・`breadcrumbTitle` を変える。

同じゲームに Easy / Hard などの版がある場合は、`app/routes/games.prefecture-puzzle.tsx` の `VARIANTS` を参考にする
（同じ HTML を `?version=easy` のように開き分ける。両方読み込んだままなので、切り替えても進み具合が残る）。

### 4. ゲーム一覧に載せる

Supabase の `kl_app`（key: `CONTENT_GAMES`）の該当セクションにカードを足す。`path` は `/games/karuta`。

## HTML を作るときのチェックリスト

- [ ] **`<head>` タグがある**（ブリッジを差し込む場所）。
- [ ] **全画面ボタンを入れない**（外側のツールバーにある）。**`window.open` も使わない**（iframe の制限で開けない）。
- [ ] **ダイアログは `position: fixed` で、クラス名を `overlay` か `modal-backdrop` にする。**
      こうすると、iframe が縦に長くても画面に見えている位置に出る。
      別のクラス名を使う場合は、`game-frame.$name.ts` の `FRAME_BRIDGE` の CSS にそのクラス名を足す。
- [ ] **自分の画面の高さ（`100vh`・`window.innerHeight`）で大きさを決めない。**
      iframe はゲームの高さに合わせて伸びるので、拡大が止まらなくなる。
      画面の高さが必要なら、`yg-embedded` のときは `window.parent.innerHeight` を使う
      （例：`hiragana-memory-match.html` の `fitBoard`）。
      `body { min-height: 100vh }` はブリッジが打ち消すので書いてあってもよい。
- [ ] **タイマーがあれば、タブを離れたら止める**（`document.hidden` / `visibilitychange`）。
- [ ] **UI は英語**（日本語は学習する内容の文字だけ）。
- [ ] **画像・音声などのファイル**
  - 小さいものは HTML に埋め込む（SVG・data URI）のが一番簡単。
  - 大きいものは `public/game-assets/<ゲーム名>/` に置き、**`/game-assets/...` のように `/` から始まるパス**で参照する。
    HTML は `/game-frame/<名前>` で配信されるので、`./img.png` のような相対パスは壊れる。
    画像や音声は HTML がなければ遊べないので、`public/` に置いてよい。
- [ ] 外部の読み込み（Google Fonts など）は可。チケットが外部へ漏れないよう、ルートが `Referrer-Policy: same-origin` を付けている。

## サイズの注意

HTML はサーバー（Cloudflare Worker）のバンドルに組み込まれる。
2026-11 時点でバンドルは約 3.4MB（圧縮前）。Cloudflare の上限は圧縮後で、無料プラン 3MB・有料プラン 10MB。
数十〜数百 KB のゲームなら問題ないが、1 本が数 MB のゲームや本数が大きく増える場合は、
Supabase Storage の非公開バケットに置いて `game-frame.$name.ts` から読み込む形に変える。

## ローカルでの確認

`npm run dev`（remix vite:dev）は既存の問題で全ページが 500 になるため、次で確認する：

```sh
npm run build
npx wrangler pages dev build/client
git checkout -- "functions/[[path]].js"   # ビルドで書き換わる追跡ファイルを元に戻す
```

ローカルには管理者キー（`SUPABASE_SERVICE_ROLE_KEY`）がないため、チケットの発行とロックの判定はプレビュー環境で確認する。
