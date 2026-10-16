/**
 * @file test-yamato.tsx
 * @description ヤマトAI 独立APIテスト画面（アーキテクチャ構成表・インポート連鎖解説版）
 */
import type { MetaFunction } from "@remix-run/react";
import { useSearchParams } from "@remix-run/react";
import { useState, useEffect } from "react";
import { YamatoChatCommon } from "../components/YamatoChatCommon";
// ★価格データとクレジット消費ガイドをインポート
import { PRICE_PLANS, CREDIT_CONSUMPTION_GUIDE } from "../data/price-plans";
// ★本日のクイズ取得関数（getRandomQuiz）とクイズリストをインポート
import { getRandomQuiz, DAILY_QUIZZES } from "../data/quizzes";
// ★法的・サポートコンテンツデータをインポート
import { LEGAL_CONTENT } from "../data/legal-content";

export const meta: MetaFunction = () => {
  return [
    { title: "AI Yamato 独立APIテスト画面" },
    { name: "description", content: "独立APIサーバーと連携するヤマトのテストページです。" },
  ];
};

// サポートするアプリタイプの型定義（全9種類）
type AppType = 
  | "concierge" 
  | "game-igo" 
  | "genkoyoshi-editor-general" 
  | "genkoyoshi-editor-vce" 
  | "eoy-oral-drill" 
  | "eoy-oral-elaborate" 
  | "eoy-oral-mock" 
  | "eoy-writing" 
  | "oral-exam-questions";

// 各アプリタイプごとの設定（表示名、挨拶、テーマカラー、APIファイル名、対象ユーザー層など）
type AppConfig = {
  name: string;
  greeting: string;
  themeColor: "emerald" | "blue" | "yellow" | "purple" | "cyan" | "orange" | "black" | "green" | "navy";
  apiSourceFile: string;
  targetAudience: string;
};

export default function TestYamatoPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  // === 合言葉を tssk224 に設定 ===
  const SECRET_TOKEN = "tssk224";

  const [activeAppType, setActiveAppType] = useState<AppType>("concierge");

  // ★ APIから動的に取得したフィールド一覧を格納するステート
  const [apiFields, setApiFields] = useState<string[]>([]);
  const [isLoadingSchema, setIsLoadingSchema] = useState<boolean>(false);

  // ★ activeAppType が切り替わるたびに、バックエンドの /api/schema/:appType から最新のフィールド一覧を取得する
  useEffect(() => {
    async function fetchSchema() {
      setIsLoadingSchema(true);
      try {
        const apiBaseUrl = "http://localhost:8787"; 
        const res = await fetch(`${apiBaseUrl}/api/schema/${activeAppType}`);
        if (res.ok) {
          const data = (await res.json()) as { appType: string; fields: string[] };
          setApiFields(data.fields || []);
        } else {
          setApiFields([]);
        }
      } catch (err) {
        console.error("Failed to fetch schema from API:", err);
        setApiFields([]);
      } finally {
        setIsLoadingSchema(false);
      }
    }

    fetchSchema();
  }, [activeAppType]);

  // トークンが一致しない場合はアクセス権なし画面を返す
  if (token !== SECRET_TOKEN) {
    return (
      <div className="bg-slate-100 min-h-screen text-slate-800 flex items-center justify-center p-8 font-sans">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">アクセス権がありません</h1>
          <p className="text-slate-600 text-sm leading-relaxed">
            このページを表示するための有効なトークンが指定されていません。正しいURLからアクセスしてください。
          </p>
        </div>
      </div>
    );
  }

  // ★全9ペルソナごとのメタ情報（表示名・対応ファイル等）
  const appConfig: Record<AppType, AppConfig> = {
    concierge: {
      name: "やまと先生",
      greeting: "Hello, my friend! 🌟 Welcome to Yamato Portal. I'm Yamato, your portal guide. Whether you're a student, parent, or educator, how can I assist you today?",
      themeColor: "blue",
      apiSourceFile: "concierge.ts (経由: chat.ts / index.ts)",
      targetAudience: "ポータル全体の訪問者（生徒・保護者・教員）",
    },
    "game-igo": {
      name: "囲碁ヤマト",
      greeting: "こんにちは！囲碁AIヤマトです。一局打ってみましょうか？それともルールや定石について質問しますか？",
      themeColor: "black",
      apiSourceFile: "game-igo.ts (経由: FoundationLayout.ts)",
      targetAudience: "囲碁に興味のある日本語学習者",
    },
    "genkoyoshi-editor-general": {
      name: "原稿用紙エディター (一般)",
      greeting: "こんにちは！一般向け原稿用紙エディターです。日本語の文章構成や推敲をサポートします。",
      themeColor: "navy",
      apiSourceFile: "genkoyoshi-editor-general.ts (経由: FoundationLayout.ts)",
      targetAudience: "一般的な日本語の文章作成・作文を行う学習者",
    },
    "genkoyoshi-editor-vce": {
      name: "原稿用紙エディター (VCE)",
      greeting: "Hello, my friend! 🌟 Welcome to the VCE Genkoyoshi Editor. Let's polish your Japanese essay to meet strict VCE standards.",
      themeColor: "navy",
      apiSourceFile: "genkoyoshi-editor-vce.ts (経由: FoundationLayout.ts)",
      targetAudience: "オーストラリア・ビクトリア州 VCE日本語学習者 (Years 11–12)",
    },
    "eoy-oral-drill": {
      name: "EOY Oral Drill",
      greeting: "Hello, my friend! 🌟 Welcome to your EOY Oral Drill practice session! Let's sharpen your speaking skills.",
      themeColor: "yellow",
      apiSourceFile: "eoy-oral-drill.ts (経由: FoundationLayout.ts)",
      targetAudience: "VCE期末口頭試験（Oral Exam）を控える生徒",
    },
    "eoy-oral-elaborate": {
      name: "EOY Oral Elaborate",
      greeting: "Hello, my friend! 🌟 Welcome to the EOY Oral Elaborate session. Let's dive deeper into your detailed study and responses.",
      themeColor: "purple",
      apiSourceFile: "eoy-oral-elaborate.ts (経由: FoundationLayout.ts)",
      targetAudience: "VCE口頭試験の詳細研究セクション対策の生徒",
    },
    "eoy-oral-mock": {
      name: "EOY Oral Mock Exam",
      greeting: "Hello, my friend! 🌟 Welcome to your EOY Oral Mock Exam. Ready to simulate the real exam experience?",
      themeColor: "cyan",
      apiSourceFile: "eoy-oral-mock.ts (経由: FoundationLayout.ts)",
      targetAudience: "本番さながらの模擬試験を体験したいVCE受験生",
    },
    "eoy-writing": {
      name: "EOY Writing Practice",
      greeting: "Hello, my friend! 🌟 Welcome to your EOY Writing practice session! Let's polish your Japanese writing skills.",
      themeColor: "orange",
      apiSourceFile: "eoy-writing.ts (経由: FoundationLayout.ts)",
      targetAudience: "VCE期末ライティング試験対策を行う生徒",
    },
    "oral-exam-questions": {
      name: "口頭試験問題ジェネレーター",
      greeting: "Hello, my friend! 🌟 Welcome to Oral Exam Questions generator. What kind of practice questions would you like to explore?",
      themeColor: "green",
      apiSourceFile: "oral-exam-questions.ts (経由: FoundationLayout.ts)",
      targetAudience: "VCE口頭試験の練習問題を作成したい生徒・教員",
    },
  };

  const currentConfig = appConfig[activeAppType];

  const portalContextData = {
    pricePlans: PRICE_PLANS,
    creditGuide: CREDIT_CONSUMPTION_GUIDE,
    todayQuiz: getRandomQuiz(),
    allQuizzes: DAILY_QUIZZES,
    legalContent: LEGAL_CONTENT,
  };

  return (
    <div className="bg-slate-100 min-h-screen text-slate-800 flex flex-col justify-between font-sans relative p-6 lg:p-10">
      {/* メインコンテンツ（左右2カラムレイアウト） */}
      <main className="max-w-7xl mx-auto w-full my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* 左側カラム：ヤマトAI 独立APIテスト画面（切り替えパネル） */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <span>🇯🇵</span> ヤマト AI 独立APIテスト
          </h1>
          <p className="text-slate-600 text-xs leading-relaxed mb-6">
            右下のチャット窓、または以下のセクション別ボタンから各ペルソナの動作テストを行えます。
          </p>

          <div className="space-y-4 text-left">
            {/* 共通コンシェルジュ */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">📌 ポータル共通</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveAppType("concierge")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                    activeAppType === "concierge" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  👋 LP Concierge (青)
                </button>
              </div>
            </div>

            {/* 🌍 Section 1: 全世界対応 (Global & General) */}
            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-200">
              <h2 className="text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>🌍</span> Section 1: 全世界対応
              </h2>
              <div className="flex flex-wrap gap-2">
                {(["genkoyoshi-editor-general", "game-igo"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveAppType(type)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                      activeAppType === type ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {type === "genkoyoshi-editor-general" && "📄 原稿用紙 (一般)"}
                    {type === "game-igo" && "⚪ 囲碁ヤマト"}
                  </button>
                ))}
              </div>
            </div>

            {/* 🇦🇺🦘 Section 2: オーストラリア・ビクトリア州対応 (Victorian Curriculum & VCE) */}
            <div className="bg-red-50/50 p-3 rounded-xl border border-red-200">
              <h2 className="text-[11px] font-bold text-red-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>🇦🇺🦘</span> Section 2: VCE / オーストラリア
              </h2>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    "genkoyoshi-editor-vce",
                    "eoy-oral-drill",
                    "eoy-oral-elaborate",
                    "eoy-oral-mock",
                    "eoy-writing",
                    "oral-exam-questions",
                  ] as const
                ).map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveAppType(type)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                      activeAppType === type ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {type === "genkoyoshi-editor-vce" && "📄 原稿用紙 (VCE)"}
                    {type === "eoy-oral-drill" && "🗣️ Oral Drill"}
                    {type === "eoy-oral-elaborate" && "💭 Oral Elaborate"}
                    {type === "eoy-oral-mock" && "📝 Oral Mock"}
                    {type === "eoy-writing" && "✍️ Writing"}
                    {type === "oral-exam-questions" && "❓ 口頭試験問題"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
            <span>Selected: <strong className="text-slate-800">{currentConfig.name}</strong></span>
            <span className="font-mono bg-slate-200 px-2 py-0.5 rounded text-[11px] text-slate-700">{activeAppType}</span>
          </div>
        </div>

        {/* 右側カラム：AIヤマト・エコシステム アーキテクチャ構成表（一回り大きい文字 ＆ スクロールバー対応） */}
        <div className="lg:col-span-6 bg-white text-slate-800 border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-blue-900 flex items-center gap-2">
              <span>🚀</span> AIヤマト・エコシステム 構成表
            </h2>
            <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200 font-semibold">
              Architecture Overview
            </span>
          </div>

          {/* スクロールバー付きコンテナ（文字を一回り大きく：text-smベース） */}
          <div className="max-h-[580px] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 bg-slate-50/80 sticky top-0">
                  <th className="py-3 px-3 font-bold w-1/4 rounded-l-lg">役割・レイヤー</th>
                  <th className="py-3 px-3 font-bold w-3/8">バックエンド (api)</th>
                  <th className="py-3 px-3 font-bold w-3/8 rounded-r-lg">フロントエンド (portal)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-3 font-bold text-slate-900 align-top">土台 (機体)</td>
                  <td className="py-3.5 px-3 align-top">
                    <span className="font-bold text-blue-600">🚀 FoundationLayout.ts</span>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">すべてのプロンプトの根本的なルールやエンジンを組み立てる大元</p>
                  </td>
                  <td className="py-3.5 px-3 align-top">
                    <span className="font-bold text-blue-600">🚀 PageLayout.tsx</span>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">ポータル全体の共通レイアウト、ヘッダー/フッター、パスキー認証基盤</p>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-3 font-bold text-slate-900 align-top">窓口・外装</td>
                  <td className="py-3.5 px-3 align-top">
                    <span className="font-bold text-purple-600">🛠️ YamatoApiCommon.tsx</span>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">共通プロンプト構造や portalData などの共通オプションを受け渡す基盤</p>
                  </td>
                  <td className="py-3.5 px-3 align-top">
                    <span className="font-bold text-purple-600">🛠️ YamatoChatCommon.tsx</span>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">対話UIの汎用テンプレート・操縦士コックピット</p>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-3 font-bold text-slate-900 align-top">乗組員 (ひな形)</td>
                  <td className="py-3.5 px-3 align-top">
                    <span className="font-bold text-amber-600">👨‍✈️ a-template.ts</span>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      FoundationLayout のデータが内包・インポートされている 
                      <strong className="text-slate-700"> YamatoApiCommon.tsx </strong> 
                      をインポートしてペルソナを記述するひな形
                    </p>
                  </td>
                  <td className="py-3.5 px-3 align-top">
                    <span className="font-bold text-amber-600">👨‍✈️ YamatoChatCommon をコピーして新規作成</span>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">（ChatYamatoGrammar.tsx等）固有の名前・テーマ・プロンプトをカスタマイズ</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* YamatoChatCommon に設定とデータを渡す */}
      <YamatoChatCommon 
        appType={activeAppType}
        characterName={currentConfig.name}
        initialGreeting={currentConfig.greeting}
        themeColor={currentConfig.themeColor as any}
        defaultOpen={false}
        additionalContext={portalContextData}
      />

      <footer className="text-center text-xs text-slate-400 mt-8">
        <p>&copy; 2026 JPTutor AI Yamato.</p>
      </footer>
    </div>
  );
}