# 🔄 Staging の最新ファイルを `bp` ブランチにバックアップする手順

開発中の特定のファイル（例：`eoy-oral-drill.tsx` と `eoy-oral-elaborate.tsx`）の最新の状態を、安全にバックアップ用の `bp` ブランチへ保存・プッシュするための手順です。

## 📋 実行手順

### 1. バックアップ用ブランチ（`bp`）に移動する
```bash
git checkout bp


# 🔄 Staging の最新ファイルを強制保存してプッシュする手順

手元のファイルの変更状況に関わらず、`staging` の最新状態に上書きし、ステージング・コミット・プッシュをまとめて実行して作業用ブランチに戻ります。

## 📋 実行用コマンド

以下のコマンドをターミナルにまとめて貼り付けて実行します。

```bash
git checkout staging -- app/routes/eoy-oral-drill.tsx app/routes/eoy-oral-elaborate.tsx
git add app/routes/eoy-oral-drill.tsx app/routes/eoy-oral-elaborate.tsx
git commit -m "bp用バックアップ更新: eoy oral drill, eoy oral elaborate"
git push origin bp
git checkout staging