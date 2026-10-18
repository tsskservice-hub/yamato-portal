import fs from 'fs';
import path from 'path';

async function main() {
  console.log("📦 [portal-sync-knowledge] ナレッジの集約を開始します...");

  try {
    const payload = {
      // 1. アプリ全体で汎用的なデータ
      faqList: await import('../app/data/faq-database.ts').then((m: any) => m.default || m),
      legalContent: await import('../app/data/legal-content.ts').then((m: any) => m.default || m),
      pricePlans: await import('../app/data/price-plans.ts').then((m: any) => m.default || m),
      quizzes: await import('../app/data/quizzes.ts').then((m: any) => m.default || m),

      // 2. VCE関連の教材・問題・各種リストデータ
      vceResources: {
        kanjiList: JSON.parse(fs.readFileSync('./app/data/kanji-list.json', 'utf-8')),
        vceVocabularyList: JSON.parse(fs.readFileSync('./app/data/vce-vocabulary-list.json', 'utf-8')),
        oralExamQuestions: JSON.parse(fs.readFileSync('./app/data/oral-exam-questions.json', 'utf-8')),
        writingExamQuestions: JSON.parse(fs.readFileSync('./app/data/writing-exam-questions.json', 'utf-8')),
        textTypes: JSON.parse(fs.readFileSync('./app/data/texttypes.json', 'utf-8')),
        grammarList: await import('../app/data/vce-grammar-list.ts').then((m: any) => m.default || m),
        writingStyles: await import('../app/data/writing-styles.ts').then((m: any) => m.default || m),
      },

      // 3. VCEの評価基準・レポート・ディスクリプター（純粋な基準データ）
      vceCriteria: {
        eoyWrittenCriteria: await import('../app/data/vce-eoy-written-criteria.ts').then((m: any) => m.default || m),
        eoyWrittenReport2025: await import('../app/data/vce-eoy-written-report2025.ts').then((m: any) => m.default || m),
        eoyWrittenSpec: await import('../app/data/vce-eoy-written-spec.ts').then((m: any) => m.default || m),
        eoyOralAdvice2026: await import('../app/data/vce-eoy-oral-advice2026.ts').then((m: any) => m.default || m),
        eoyOralReport2025: await import('../app/data/vce-eoy-oral-report2025.ts').then((m: any) => m.default || m),
        eoyOralSpec: await import('../app/data/vce-eoy-oral-spec.ts').then((m: any) => m.default || m),
        oralCriteria: await import('../app/data/vce-oral-criteria.ts').then((m: any) => m.default || m),
        u3o1Descriptor: await import('../app/data/vce-u3o1-descriptor.ts').then((m: any) => m.default || m),
        u3o2Descriptor: await import('../app/data/vce-u3o2-descriptor.ts').then((m: any) => m.default || m),
        u3o3Descriptor: await import('../app/data/vce-u3o3-descriptor.ts').then((m: any) => m.default || m),
        u4o1Descriptor: await import('../app/data/vce-u4o1-descriptor.ts').then((m: any) => m.default || m),
        u4o2Descriptor: await import('../app/data/vce-u4o2-descriptor.ts').then((m: any) => m.default || m),
        u4o3Descriptor: await import('../app/data/vce-u4o3-descriptor.ts').then((m: any) => m.default || m),
      }
    };

    const workerUrl = process.env.YAMATO_API_URL || "https://api.jptutoraiyamato.com/api/sync-knowledge";
    const apiKey = process.env.SYNC_API_KEY || "your-secret-key";

    console.log(`🚀 [portal-sync-knowledge] 送信先: ${workerUrl}`);

    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`サーバーエラー: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log("✅ [portal-sync-knowledge] ナレッジの同期が完了しました:", result);

  } catch (error) {
    console.error("❌ [portal-sync-knowledge] ナレッジの同期に失敗しました:", error);
    process.exit(1);
  }
}

main();