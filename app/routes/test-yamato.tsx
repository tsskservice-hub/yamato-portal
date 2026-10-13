/**
 * @file test-yamato.tsx
 * @description ヤマトAI 独立APIテスト画面（価格データおよびクイズデータ連携対応版）
 */
import type { MetaFunction } from "@remix-run/react";
import { useSearchParams } from "@remix-run/react";
import { useState } from "react";
import { YamatoChat } from "../components/YamatoChat";
// ★価格データとクレジット消費ガイドをインポート
import { PRICE_PLANS, CREDIT_CONSUMPTION_GUIDE } from "../data/price-plans";
// ★本日のクイズ取得関数とクイズリストをインポート
import { getTodayQuiz, DAILY_QUIZZES } from "../data/quizzes";

export const meta: MetaFunction = () => {
  return [
    { title: "AI Yamato 独立APIテスト画面" },
    { name: "description", content: "独立APIサーバーと連携するヤマトのテストページです。" },
  ];
};

// サポートするアプリタイプの型定義
type AppType = "concierge" | "writing" | "oral" | "general";

// 各アプリタイプごとの設定（表示名、挨拶、テーマカラー）
type AppConfig = {
  name: string;
  greeting: string;
  themeColor: "emerald" | "blue";
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
    writing: {
      name: "VCEライティングヤマト",
      greeting: "Hello, my friend! 🌟 Welcome to your VCE Japanese writing practice session! Please upload your handwritten text or type your response.",
      themeColor: "emerald",
    },
    oral: {
      name: "VCE口頭試験ヤマト",
      greeting: "Hello, my friend! 🌟 Welcome to your VCE Oral Exam practice room. Are you ready for Section 1 General Conversation or Section 2 Detailed Study?",
      themeColor: "emerald",
    },
    general: {
      name: "一般学習ヤマト",
      greeting: "Hello, my friend! 🌟 Welcome! What would you like to learn about the Japanese language or culture today?",
      themeColor: "emerald",
    },
  };

  const currentConfig = appConfig[activeAppType];

  // ★コンシェルジュヤマト等に渡すポータルデータ（価格プラン、消費ガイド、本日のクイズ）を定義
  const portalContextData = {
    pricePlans: PRICE_PLANS,
    creditGuide: CREDIT_CONSUMPTION_GUIDE,
    todayQuiz: getTodayQuiz(),     // 本日の日付に対応するクイズデータを渡す
    allQuizzes: DAILY_QUIZZES,     // 全クイズデータ
  };

  return (
    <div className="bg-slate-100 min-h-screen text-slate-800 flex flex-col justify-between font-sans relative p-8">
      {/* ページ本体のヘッダー・切り替えUI */}
      <main className="max-w-2xl mx-auto w-full my-auto space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-3">🇯🇵 ヤマト AI 独立APIテスト画面</h1>
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            右下に常駐しているAIヤマトのチャット窓、または以下の切り替えパネルから、各ペルソナ（appType）の動作テストを行えます。
          </p>

          {/* モード切り替えタブ・ボタン群 */}
          <div className="flex flex-wrap justify-center gap-2">
            {(["concierge", "writing", "oral", "general"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setActiveAppType(type)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                  activeAppType === type
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {type === "concierge" && "👋 LP Concierge (青)"}
                {type === "writing" && "✍️ VCE Writing (緑)"}
                {type === "oral" && "🎤 VCE Oral (緑)"}
                {type === "general" && "🌟 General (緑)"}
              </button>
            ))}
          </div>

          <div className="mt-4 text-xs text-slate-400">
            Current active appType: <code className="bg-slate-100 px-2 py-1 rounded text-slate-600">{activeAppType}</code> | Theme: <code className="bg-slate-100 px-2 py-1 rounded text-slate-600">{currentConfig.themeColor}</code>
          </div>
        </div>
      </main>

      {/* YamatoChat に additionalContext としてクイズデータを追加した portalContextData を渡す */}
      <YamatoChat 
        appType={activeAppType}
        characterName={currentConfig.name}
        initialGreeting={currentConfig.greeting}
        themeColor={currentConfig.themeColor}
        defaultOpen={false}
        additionalContext={portalContextData}
      />

      <footer className="text-center text-xs text-slate-400 mt-8">
        <p>&copy; 2026 JPTutor AI Yamato.</p>
      </footer>
    </div>
  );
}