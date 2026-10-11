import type { MetaFunction } from "@remix-run/react";
import { useSearchParams } from "@remix-run/react";
import { useState } from "react";
import { YamatoChat } from "../components/YamatoChat";

export const meta: MetaFunction = () => {
  return [
    { title: "AI Yamato 独立APIテスト画面" },
    { name: "description", content: "独立APIサーバーと連携するヤマトのテストページです。" },
  ];
};

// サポートするアプリタイプの型定義
type AppType = "concierge" | "writing" | "oral" | "general";

export default function TestYamatoPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  // === 合言葉を tssk224 に設定 ===
  const SECRET_TOKEN = "tssk224";

  // ★修正1: useState に正しく型を指定
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

  // ★修正2: as const を付与して型エラーを回避
  const appConfig: Record<AppType, { name: string; greeting: string }> = {
    concierge: {
      name: "Yamato Concierge (LP案内役)",
      greeting: "Hello, my friend! 🌟 Welcome to Yamato Portal. I'm Yamato, your portal guide. Whether you're a student, parent, or educator, how can I assist you today?",
    },
    writing: {
      name: "VCEライティングヤマト",
      greeting: "Hello, my friend! 🌟 Welcome to your VCE Japanese writing practice session! Please upload your handwritten text or type your response.",
    },
    oral: {
      name: "VCE口頭試験ヤマト",
      greeting: "Hello, my friend! 🌟 Welcome to your VCE Oral Exam practice room. Are you ready for Section 1 General Conversation or Section 2 Detailed Study?",
    },
    general: {
      name: "一般学習ヤマト",
      greeting: "Hello, my friend! 🌟 Welcome! What would you like to learn about the Japanese language or culture today?",
    },
  };

  const currentConfig = appConfig[activeAppType];

  // 以降は合言葉が一致した場合のみレンダリングされるテスト画面
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
                {type === "concierge" && "👋 LP Concierge"}
                {type === "writing" && "✍️ VCE Writing"}
                {type === "oral" && "🎤 VCE Oral"}
                {type === "general" && "🌟 General"}
              </button>
            ))}
          </div>

          <div className="mt-4 text-xs text-slate-400">
            Current active appType: <code className="bg-slate-100 px-2 py-1 rounded text-slate-600">{activeAppType}</code>
          </div>
        </div>
      </main>

      {/* ★修正3: YamatoChat に appType を渡す */}
      <YamatoChat 
        appType={activeAppType}
        characterName={currentConfig.name}
        initialGreeting={currentConfig.greeting}
      />

      <footer className="text-center text-xs text-slate-400 mt-8">
        <p>&copy; 2026 JPTutor AI Yamato.</p>
      </footer>
    </div>
  );
}