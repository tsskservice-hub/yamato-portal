import fs from 'fs';
import path from 'path';

// 例: 各データファイルをインポートまたは読み込む
// ※ TypeScriptやES Modulesの環境に合わせてパスを調整してください
async function main() {
  console.log("📦 [Sync] ナレッジの集約を開始します...");

  try {
    // 1. 各データファイルを読み込んでオブジェクトにまとめる
    // （例として、JSONやエクスポートされたデータを集約するイメージです）
    const payload = {
      faqList: JSON.parse(fs.readFileSync('./app/components/data/kanji-list.json', 'utf-8')), // サンプル
      vceCriteria: {}, // 必要に応じて他のデータも追加
      pricePlans: {},  // 必要に応じて追加
    };

    // 2. Cloudflare Workers のエンドポイントへ送信
    const workerUrl = process.env.YAMATO_API_URL || "https://your-worker-api.workers.dev/api/sync-knowledge";
    const apiKey = process.env.SYNC_API_KEY || "your-secret-key";

    console.log(`🚀 [Sync] 送信先: ${workerUrl}`);

    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`, // セキュリティ用ヘッダー
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`サーバーエラー: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log("✅ [Sync] ナレッジの同期が完了しました:", result);

  } catch (error) {
    console.error("❌ [Sync] ナレッジの同期に失敗しました:", error);
    process.exit(1); // ビルドやデプロイを失敗させる場合
  }
}

main();