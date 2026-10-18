import fs from 'fs';
import path from 'path';

async function main() {
  console.log("📦 [Sync] ナレッジの集約を開始します...");

  try {
    // 1. dataフォルダ内の全データを読み込んでオブジェクトにまとめる
    const payload = {
      // JSONファイル (fs.readFileSyncで読み込み)
      kanjiList: JSON.parse(fs.readFileSync('./app/data/kanji-list.json', 'utf-8')),
      oralExamQuestions: JSON.parse(fs.readFileSync('./app/data/oral-exam-questions.json', 'utf-8')),
      texttypes: JSON.parse(fs.readFileSync('./app/data/texttypes.json', 'utf-8')),
      vceVocabularyList: JSON.parse(fs.readFileSync('./app/data/vce-vocabulary-list.json', 'utf-8')),
      writingExamQuestions: JSON.parse(fs.readFileSync('./app/data/writing-exam-questions.json', 'utf-8')),

      // TypeScriptファイル (dynamic importで読み込み)
      faqDatabase: await import('../app/data/faq-database.ts').then(m => m.default || m),
      legalContent: await import('../app/data/legal-content.ts').then(m => m.default || m),
      pricePlans: await import('../app/data/price-plans.ts').then(m => m.default || m),
      quizzes: await import('../app/data/quizzes.ts').then(m => m.default || m),
      vceEoyOralAdvice2026: await import('../app/data/vce-eoy-oral-advice2026.ts').then(m => m.default || m),
      vceEoyOralReport2025: await import('../app/data/vce-eoy-oral-report2025.ts').then(m => m.default || m),
      vceEoyOralSpec: await import('../app/data/vce-eoy-oral-spec.ts').then(m => m.default || m),
      vceEoyWrittenCriteria: await import('../app/data/vce-eoy-written-criteria.ts').then(m => m.default || m),
      vceEoyWrittenReport2025: await import('../app/data/vce-eoy-written-report2025.ts').then(m => m.default || m),
      vceEoyWrittenSpec: await import('../app/data/vce-eoy-written-spec.ts').then(m => m.default || m),
      vceGrammarList: await import('../app/data/vce-grammar-list.ts').then(m => m.default || m),
      vceOralCriteria: await import('../app/data/vce-oral-criteria.ts').then(m => m.default || m),
      vceU3O1Descriptor: await import('../app/data/vce-u3o1-descriptor.ts').then(m => m.default || m),
      vceU3O2Descriptor: await import('../app/data/vce-u3o2-descriptor.ts').then(m => m.default || m),
      vceU3O3Descriptor: await import('../app/data/vce-u3o3-descriptor.ts').then(m => m.default || m),
      vceU4O1Descriptor: await import('../app/data/vce-u4o1-descriptor.ts').then(m => m.default || m),
      vceU4O2Descriptor: await import('../app/data/vce-u4o2-descriptor.ts').then(m => m.default || m),
      vceU4O3Descriptor: await import('../app/data/vce-u4o3-descriptor.ts').then(m => m.default || m),
      writingStyles: await import('../app/data/writing-styles.ts').then(m => m.default || m),
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