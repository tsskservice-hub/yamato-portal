/**
 * @file test-yamato.tsx
 * @description ヤマトAI 独立APIテスト画面（全8ペルソナ対応版）
 */
import type { MetaFunction } from "@remix-run/react";
import { useSearchParams } from "@remix-run/react";
import { useState } from "react";
import { YamatoChat } from "../components/YamatoChat";
// ★価格データとクレジット消費ガイドをインポート
import { PRICE_PLANS, CREDIT_CONSUMPTION_GUIDE } from "../data/price-plans";
// ★本日のクイズ取得関数とクイズリストをインポート
import { getTodayQuiz, DAILY_QUIZZES } from "../data/quizzes";
// ★法的・サポートコンテンツデータをインポート
import { LEGAL_CONTENT } from "../data/legal-content";

export const meta: MetaFunction = () => {
  return [
    { title: "AI Yamato 独立APIテスト画面" },
    { name: "description", content: "独立APIサーバーと連携するヤマトのテストページです。" },
  ];
};

// サポートするアプリタイプの型定義（全8種類）
type AppType = 
  | "concierge" 
  | "eoy-oral-drill" 
  | "eoy-oral-elaborate" 
  | "eoy-oral-mock" 
  | "eoy-writing" 
  | "game-igo" 
  | "genkoyoshi-editor" 
  | "oral-exam-questions";

// 各アプリタイプごとの設定（表示名、挨拶、テーマカラー）
type AppConfig = {
  name: string;
  greeting: string;
  themeColor: "emerald" | "blue" | "yellow" | "purple" | "cyan" | "orange" | "black" | "green";
};

export default function TestYamatoPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  // === 合言葉を tssk224 に設定 ===
  const SECRET_TOKEN = "tssk224";

  const [activeAppType, setActiveAppType] = useState<AppType>("concierge");

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

  const appConfig: Record<AppType, AppConfig> = {
    concierge: {
      name: "やまと先生",
      greeting: "Hello, my friend! 🌟 Welcome to Yamato Portal. I'm Yamato, your portal guide. Whether you're a student, parent, or educator, how can I assist you today?",
      themeColor: "blue",
    },
    "eoy-oral-drill": {
      name: "EOY Oral Drill",
      greeting: "Hello, my friend! 🌟 Welcome to your EOY Oral Drill practice session! Let's sharpen your speaking skills.",
      themeColor: "yellow",
    },
    "eoy-oral-elaborate": {
      name: "EOY Oral Elaborate",
      greeting: "Hello, my friend! 🌟 Welcome to the EOY Oral Elaborate session. Let's dive deeper into your detailed study and responses.",
      themeColor: "purple",
    },
    "eoy-oral-mock": {
      name: "EOY Oral Mock Exam",
      greeting: "Hello, my friend! 🌟 Welcome to your EOY Oral Mock Exam. Ready to simulate the real exam experience?",
      themeColor: "cyan",
    },
    "eoy-writing": {
      name: "EOY Writing Practice",
      greeting: "Hello, my friend! 🌟 Welcome to your EOY Writing practice session! Let's polish your Japanese writing skills.",
      themeColor: "orange",
    },
    "game-igo": {
      name: "囲碁ヤマト",
      greeting: "こんにちは！囲碁AIヤマトです。一局打ってみましょうか？それともルールや定石について質問しますか？",
      themeColor: "black",
    },
    "genkoyoshi-editor": {
      name: "原稿用紙エディター",
      greeting: "こんにちは！原稿用紙エディターです。原稿の構成や文章の推敲をサポートします。",
      themeColor: "blue",
    },
    "oral-exam-questions": {
      name: "口頭試験問題ジェネレーター",
      greeting: "Hello, my friend! 🌟 Welcome to Oral Exam Questions generator. What kind of practice questions would you like to explore?",
      themeColor: "green",
    },
  };

  const currentConfig = appConfig[activeAppType];

  // ★ポータルデータ（価格プラン、消費ガイド、本日のクイズ、法的データ）を定義
  const portalContextData = {
    pricePlans: PRICE_PLANS,
    creditGuide: CREDIT_CONSUMPTION_GUIDE,
    todayQuiz: getTodayQuiz(),     // 本日の日付に対応するクイズデータを渡す
    allQuizzes: DAILY_QUIZZES,     // 全クイズデータ
    legalContent: LEGAL_CONTENT,   // 利用規約・免責・プライバシー・連絡先の全データを渡す
  };

  return (
    <div className="bg-slate-100 min-h-screen text-slate-800 flex flex-col justify-between font-sans relative p-8">
      {/* ページ本体のヘッダー・切り替えUI */}
      <main className="max-w-4xl mx-auto w-full my-auto space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-3">🇯🇵 ヤマト AI 独立APIテスト画面</h1>
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            右下に常駐しているAIヤマトのチャット窓、または以下の切り替えパネルから、各ペルソナ（appType）の動作テストを行えます。
          </p>

          {/* モード切り替えタブ・ボタン群（全8種） */}
          <div className="flex flex-wrap justify-center gap-2">
            {(
              [
                "concierge",
                "eoy-oral-drill",
                "eoy-oral-elaborate",
                "eoy-oral-mock",
                "eoy-writing",
                "game-igo",
                "genkoyoshi-editor",
                "oral-exam-questions",
              ] as const
            ).map((type) => (
              <button
                key={type}
                onClick={() => setActiveAppType(type)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                  activeAppType === type
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {type === "concierge" && "👋 LP Concierge (青)"}
                {type === "eoy-oral-drill" && "🗣️ Oral Drill (黄)"}
                {type === "eoy-oral-elaborate" && "💭 Oral Elaborate (紫)"}
                {type === "eoy-oral-mock" && "📝 Oral Mock (水色)"}
                {type === "eoy-writing" && "✍️ Writing (オレンジ)"}
                {type === "game-igo" && "⚪ 囲碁 (黒)"}
                {type === "genkoyoshi-editor" && "📄 原稿用紙 (青)"}
                {type === "oral-exam-questions" && "❓ 口頭試験問題 (緑)"}
              </button>
            ))}
          </div>

          <div className="mt-4 text-xs text-slate-400">
            Current active appType: <code className="bg-slate-100 px-2 py-1 rounded text-slate-600">{activeAppType}</code> | Theme: <code className="bg-slate-100 px-2 py-1 rounded text-slate-600">{currentConfig.themeColor}</code>
          </div>
        </div>
      </main>

      {/* YamatoChat に設定とデータを渡す */}
      <YamatoChat 
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