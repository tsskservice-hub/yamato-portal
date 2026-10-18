/**
 * @file test-yamato.tsx
 * @description ヤマトAI 独立APIテスト画面（ログイン仕様削除・API同期ナレッジ完全移行版・YamatoChatCommon最新対応・個別ボタン配色指定・完全解説コラム復元版）
 */
import type { MetaFunction } from "@remix-run/react";
import { useSearchParams } from "@remix-run/react";
import { useState, useEffect } from "react";
import { YamatoChatCommon } from "../components/YamatoChatCommon";

export const meta: MetaFunction = () => {
  return [
    { title: "AI Yamato 独立APIテスト画面" },
    { name: "description", content: "独立APIサーバーと連携するヤマトのテストページです。" },
  ];
};

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

type AppConfig = {
  name: string;
  greeting: string;
  themeColor: "emerald" | "blue" | "yellow" | "purple" | "cyan" | "orange" | "black" | "green" | "navy";
  apiSourceFile: string;
  targetAudience: string;
  floatingButtonClassName: string; // 💡 収縮時ボタンのカスタム配色クラス
  buttonLabel: string;
};

export default function TestYamatoPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const SECRET_TOKEN = "tssk224";

  const [activeAppType, setActiveAppType] = useState<AppType>("concierge");
  const [apiFields, setApiFields] = useState<string[]>([]);
  const [isLoadingSchema, setIsLoadingSchema] = useState<boolean>(false);

  // 💡 バックエンドから非同期で取得するエコシステムのメタデータ
  const [ecosystemMeta, setEcosystemMeta] = useState<any>(null);

  // 💡 実行環境に応じて API のベースURLを自動切り替えし、スキーマと構成メタデータを同時に取得
  useEffect(() => {
    async function fetchData() {
      setIsLoadingSchema(true);
      try {
        const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";
        const apiBaseUrl = isLocal ? "http://localhost:8787" : "https://api.jptutoraiyamato.com";

        // 1. スキーマ情報の取得
        const schemaRes = await fetch(`${apiBaseUrl}/api/schema/${activeAppType}`);
        if (schemaRes.ok) {
          const data = (await schemaRes.json()) as { appType: string; fields: string[] };
          setApiFields(data.fields || []);
        } else {
          setApiFields([]);
        }

        // 2. バックエンドのエコシステムメタデータの取得
        const metaRes = await fetch(`${apiBaseUrl}/api/ecosystem-metadata`);
        if (metaRes.ok) {
          const metaJson = (await metaRes.json()) as { metadata: any };
          setEcosystemMeta(metaJson.metadata);
        }
      } catch (err) {
        console.error("Failed to fetch data from API:", err);
        setApiFields([]);
      } finally {
        setIsLoadingSchema(false);
      }
    }

    fetchData();
  }, [activeAppType]);

  if (token !== SECRET_TOKEN) {
    return (
      <div style={{ backgroundColor: "#f1f5f9", minHeight: "100vh", color: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px", fontFamily: "sans-serif" }}>
        <div style={{ maxWidth: "400px", width: "100%", backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "16px", padding: "32px", textAlign: "center" }}>
          <div style={{ fontSize: "36px", marginBottom: "16px" }}>🔒</div>
          <h1 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "8px" }}>アクセス権がありません</h1>
          <p style={{ fontSize: "14px", color: "#475569", lineHeight: "1.5" }}>
            このページを表示するための有効なトークンが指定されていません。正しいURLからアクセスしてください。
          </p>
        </div>
      </div>
    );
  }

  // 💡 ご指定の配色ルールを各ペルソナに完全反映
  const appConfig: Record<AppType, AppConfig> = {
    concierge: {
      name: "やまと先生",
      greeting: "Hello, my friend! 🌟 Welcome to Yamato Portal. I'm Yamato, your portal guide. Whether you're a student, parent, or educator, how can I assist you today?",
      themeColor: "blue",
      apiSourceFile: "concierge.ts (経由: chat.ts / index.ts)",
      targetAudience: "ポータル全体の訪問者（生徒・保護者・教員）",
      floatingButtonClassName: "border-2 border-red-500 bg-white hover:bg-slate-50 text-slate-900", // コンシェルジュ: 枠線赤、背景白、文字黒
      buttonLabel: "👋 LP Concierge",
    },
    "genkoyoshi-editor-general": {
      name: "原稿用紙エディター (一般)",
      greeting: "こんにちは！一般向け原稿用紙エディターです。日本語の文章構成や推敲をサポートします。",
      themeColor: "navy",
      apiSourceFile: "genkoyoshi-editor-general.ts (経由: FoundationLayout.ts)",
      targetAudience: "一般的な日本語の文章作成・作文を行う学習者",
      floatingButtonClassName: "border-2 border-cyan-400 bg-blue-600 hover:bg-blue-700 text-white", // 原稿用紙一般: 枠線水色、ボタン背景青、文字白
      buttonLabel: "📄 原稿用紙 (一般)",
    },
    "game-igo": {
      name: "囲碁ヤマト",
      greeting: "こんにちは！囲碁AIヤマトです。一局打ってみましょうか？それともルールや定石について質問しますか？",
      themeColor: "black",
      apiSourceFile: "game-igo.ts (経由: FoundationLayout.ts)",
      targetAudience: "囲碁に興味のある日本語学習者",
      floatingButtonClassName: "border-2 border-white bg-black hover:bg-slate-900 text-white", // 囲碁ヤマト: 枠線白、ボタン背景黒、文字白
      buttonLabel: "⚪ 囲碁ヤマト",
    },
    "genkoyoshi-editor-vce": {
      name: "原稿用紙エディター (VCE)",
      greeting: "Hello, my friend! 🌟 Welcome to the VCE Genkoyoshi Editor. Let's polish your Japanese essay to meet strict VCE standards.",
      themeColor: "navy",
      apiSourceFile: "genkoyoshi-editor-vce.ts (経由: FoundationLayout.ts)",
      targetAudience: "オーストラリア・ビクトリア州 VCE日本語学習者 (Years 11–12)",
      floatingButtonClassName: "border-2 border-cyan-400 bg-blue-600 hover:bg-blue-700 text-white", // 原稿用紙VCE: 枠線水色、ボタン背景青、文字白
      buttonLabel: "📄 原稿用紙 (VCE)",
    },
    "eoy-oral-drill": {
      name: "EOY Oral Drill",
      greeting: "Hello, my friend! 🌟 Welcome to your EOY Oral Drill practice session! Let's sharpen your speaking skills.",
      themeColor: "yellow",
      apiSourceFile: "eoy-oral-drill.ts (経由: FoundationLayout.ts)",
      targetAudience: "VCE期末口頭試験（Oral Exam）を控える生徒",
      floatingButtonClassName: "border-2 border-yellow-400 bg-emerald-100 hover:bg-emerald-200 text-slate-900", // Oral Drill: 枠線黄色、ボタン背景薄い緑、文字黒
      buttonLabel: "🗣️ Oral Drill",
    },
    "eoy-oral-elaborate": {
      name: "EOY Oral Elaborate",
      greeting: "Hello, my friend! 🌟 Welcome to the EOY Oral Elaborate session. Let's dive deeper into your detailed study and responses.",
      themeColor: "purple",
      apiSourceFile: "eoy-oral-elaborate.ts (経由: FoundationLayout.ts)",
      targetAudience: "VCE口頭試験の詳細研究セクション対策の生徒",
      floatingButtonClassName: "border-2 border-purple-500 bg-purple-100 hover:bg-purple-200 text-slate-900", // Oral Elaborate: 枠線紫、ボタン背景うすい紫、文字黒
      buttonLabel: "💭 Oral Elaborate",
    },
    "eoy-oral-mock": {
      name: "EOY Oral Mock Exam",
      greeting: "Hello, my friend! 🌟 Welcome to your EOY Oral Mock Exam. Ready to simulate the real exam experience?",
      themeColor: "cyan",
      apiSourceFile: "eoy-oral-mock.ts (経由: FoundationLayout.ts)",
      targetAudience: "本番さながらの模擬試験を体験したいVCE受験生",
      floatingButtonClassName: "border-2 border-red-500 bg-blue-600 hover:bg-blue-700 text-white", // Oral Mock: 枠線赤、ボタン背景青、文字白
      buttonLabel: "📝 Oral Mock",
    },
    "eoy-writing": {
      name: "EOY Writing Practice",
      greeting: "Hello, my friend! 🌟 Welcome to your EOY Writing practice session! Let's polish your Japanese writing skills.",
      themeColor: "orange",
      apiSourceFile: "eoy-writing.ts (経由: FoundationLayout.ts)",
      targetAudience: "VCE期末ライティング試験対策を行う生徒",
      floatingButtonClassName: "border-2 border-blue-500 bg-sky-100 hover:bg-sky-200 text-slate-900", // VCE Writing: 枠線青、ボタン背景うすい水色、文字黒
      buttonLabel: "✍️ Writing",
    },
    "oral-exam-questions": {
      name: "語彙文法チェッカー",
      greeting: "Hello, my friend! 🌟 Welcome to the Vocabulary & Grammar Checker. What expressions or sentences would you like to check today?",
      themeColor: "green",
      apiSourceFile: "oral-exam-questions.ts (経由: FoundationLayout.ts)",
      targetAudience: "VCE日本語の語彙や文法を確認したい生徒・教員",
      floatingButtonClassName: "border-2 border-green-500 bg-yellow-300 hover:bg-yellow-400 text-slate-900", // 語彙文法チェッカー: 枠線緑、ボタン背景黄色、文字黒
      buttonLabel: "✨ 語彙文法チェッカー",
    },
  };

  const currentConfig = appConfig[activeAppType];

  return (
    <div style={{ backgroundColor: "#f1f5f9", minHeight: "100vh", color: "#1e293b", display: "flex", flexDirection: "column", justifyContent: "space-between", fontFamily: "sans-serif", padding: "32px" }}>
      
      {/* メインコンテンツ（上下フルワイド配置） */}
      <main style={{ maxWidth: "1400px", width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* セクション1：ヤマトAI 独立APIテスト画面 */}
        <div style={{ width: "100%", backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h1 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🇯🇵</span> ヤマト AI 独立APIテスト
          </h1>
          <p style={{ fontSize: "13px", color: "#475569", lineHeight: "1.5", marginBottom: "12px" }}>
            右下のチャット窓、または以下のセクション別ボタンから各ペルソナの動作テストを行えます（ボタン配色も各仕様に連動しています）。
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" }}>
            {/* 共通コンシェルジュ */}
            <div style={{ backgroundColor: "#f8fafc", padding: "12px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <h2 style={{ fontSize: "11px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>📌 ポータル共通</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setActiveAppType("concierge")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    backgroundColor: activeAppType === "concierge" ? "#0f172a" : "#ffffff",
                    color: activeAppType === "concierge" ? "#ffffff" : "#475569",
                    border: "1px solid #cbd5e1"
                  }}
                >
                  👋 LP Concierge (コンシェルジュ)
                </button>
              </div>
            </div>

            {/* 🌍 Section 1 */}
            <div style={{ backgroundColor: "#eff6ff", padding: "12px", borderRadius: "12px", border: "1px solid #bfdbfe" }}>
              <h2 style={{ fontSize: "11px", fontWeight: "bold", color: "#1d4ed8", textTransform: "uppercase", marginBottom: "8px" }}>
                🌍 Section 1: 全世界対応
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {(["genkoyoshi-editor-general", "game-igo"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setActiveAppType(type)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      backgroundColor: activeAppType === type ? "#0f172a" : "#ffffff",
                      color: activeAppType === type ? "#ffffff" : "#475569",
                      border: "1px solid #cbd5e1"
                    }}
                  >
                    {type === "genkoyoshi-editor-general" && "📄 原稿用紙一般"}
                    {type === "game-igo" && "⚪ 囲碁ヤマト"}
                  </button>
                ))}
              </div>
            </div>

            {/* 🇦🇺🦘 Section 2 */}
            <div style={{ backgroundColor: "#fef2f2", padding: "12px", borderRadius: "12px", border: "1px solid #fecaca" }}>
              <h2 style={{ fontSize: "11px", fontWeight: "bold", color: "#b91c1c", textTransform: "uppercase", marginBottom: "8px" }}>
                🇦🇺🦘 Section 2: VCE / オーストラリア
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
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
                    type="button"
                    onClick={() => setActiveAppType(type)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      backgroundColor: activeAppType === type ? "#0f172a" : "#ffffff",
                      color: activeAppType === type ? "#ffffff" : "#475569",
                      border: "1px solid #cbd5e1"
                    }}
                  >
                    {type === "genkoyoshi-editor-vce" && "📄 原稿用紙 VCE"}
                    {type === "eoy-oral-drill" && "🗣️ Oral Drill"}
                    {type === "eoy-oral-elaborate" && "💭 Oral Elaborate"}
                    {type === "eoy-oral-mock" && "📝 Oral Mock"}
                    {type === "eoy-writing" && "✍️ VCE Writing"}
                    {type === "oral-exam-questions" && "✨ 語彙文法チェッカー"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: "20px", fontSize: "12px", color: "#64748b", backgroundColor: "#f8fafc", padding: "12px", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Selected: <strong style={{ color: "#1e293b" }}>{currentConfig.name}</strong></span>
            <span style={{ fontFamily: "monospace", backgroundColor: "#e2e8f0", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", color: "#334155" }}>{activeAppType}</span>
          </div>
        </div>

        {/* セクション2：AIヤマト・エコシステム アーキテクチャ構成表 ＆ 詳細コラム */}
        <div style={{ width: "100%", backgroundColor: "#ffffff", color: "#1e293b", border: "1px solid #cbd5e1", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", marginBottom: "16px", borderBottom: "1px solid #e2e8f0" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "bold", color: "#1e3a8a", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <span>🚀</span> AIヤマト・エコシステム 構成表 & メタデータ (プロジェクト別詳細解説)
            </h2>
            <span style={{ fontSize: "11px", backgroundColor: "#eff6ff", color: "#1d4ed8", padding: "4px 8px", borderRadius: "6px", border: "1px solid #bfdbfe", fontWeight: "600" }}>
              Live API Synced
            </span>
          </div>

          <div style={{ maxHeight: "850px", overflowY: "auto", paddingRight: "4px", display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* 1. 基本構成テーブル */}
            <table style={{ width: "100%", textAlign: "left", fontSize: "14px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#475569", backgroundColor: "#f8fafc", position: "sticky", top: 0, zIndex: 10 }}>
                  <th style={{ padding: "12px", fontWeight: "bold", width: "25%" }}>役割・レイヤー</th>
                  <th style={{ padding: "12px", fontWeight: "bold", width: "37.5%" }}>バックエンド (api)</th>
                  <th style={{ padding: "12px", fontWeight: "bold", width: "37.5%" }}>フロントエンド (portal)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "14px 12px", fontWeight: "bold", color: "#0f172a", verticalAlign: "top" }}>土台 (機体)</td>
                  <td style={{ padding: "14px 12px", verticalAlign: "top" }}>
                    <span style={{ fontWeight: "bold", color: "#2563eb" }}>🚀 FoundationLayout.ts</span>
                    <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", lineHeight: "1.4" }}>
                      すべてのプロンプトの根本的なルールやエンジンを組み立てる大元
                    </p>
                  </td>
                  <td style={{ padding: "14px 12px", verticalAlign: "top" }}>
                    <span style={{ fontWeight: "bold", color: "#94a3b8" }}>(🚀 PageLayout.tsx)</span>
                    <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px", lineHeight: "1.4" }}>
                      ポータル全体の共通レイアウト
                    </p>
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "14px 12px", fontWeight: "bold", color: "#0f172a", verticalAlign: "top" }}>窓口・外装</td>
                  <td style={{ padding: "14px 12px", verticalAlign: "top" }}>
                    <span style={{ fontWeight: "bold", color: "#9333ea" }}>🛠️ YamatoApiCommon.tsx</span>
                    <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", lineHeight: "1.4" }}>
                      共通プロンプト構造やオプションを受け渡す基盤
                    </p>
                  </td>
                  <td style={{ padding: "14px 12px", verticalAlign: "top" }}>
                    <span style={{ fontWeight: "bold", color: "#9333ea" }}>🛠️ YamatoChatCommon.tsx</span>
                    <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", lineHeight: "1.4" }}>
                      対話UIの汎用テンプレート・操縦士コックピット
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 2. プロジェクト別詳細解説 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "14px", padding: "16px" }}>
                <div style={{ fontSize: "13px", fontWeight: "bold", color: "#1d4ed8", borderBottom: "2px solid #93c5fd", paddingBottom: "6px" }}>
                  ⚙️ APIプロジェクト側（バックエンド / Cloudflare Workers）
                </div>
                <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "14px" }}>
                  <h4 style={{ fontSize: "12px", fontWeight: "bold", color: "#1e40af", margin: 0 }}>🚀 FoundationLayout.ts (基盤エンジン)</h4>
                  <p style={{ fontSize: "11px", color: "#334155", marginTop: "4px" }}>すべてのプロンプトの根本ルール、オーストラリア英語規則、Socratic対話ガイドライン等を網羅。</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* セクション3：ライフサイクル & 3大ファイル連携フロー図 */}
        <div style={{ width: "100%", backgroundColor: "#ffffff", color: "#1e293b", border: "1px solid #cbd5e1", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", marginBottom: "16px", borderBottom: "1px solid #e2e8f0" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "bold", color: "#1e3a8a", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <span>🗺️</span> AIヤマト・エコシステム 往来ライフサイクル & 3大ファイル連携フロー図
            </h2>
          </div>
          <p style={{ fontSize: "12px", color: "#475569" }}>
            生徒からの入力が各ペルソナ（a-template.ts）および共通窓口を経てGeminiに到達し、応答がレンダリングされるまでの往復フローです。
          </p>
        </div>

      </main>

      {/* 💡 YamatoChatCommon 呼び出し（各ヤマト固有の配色クラスを floatingButtonClassName に適用） */}
      <YamatoChatCommon 
        appType={activeAppType}
        characterName={currentConfig.name}
        initialGreeting={currentConfig.greeting}
        themeColor={currentConfig.themeColor as any}
        floatingButtonClassName={currentConfig.floatingButtonClassName}
        defaultOpen={false}
      />

      <footer style={{ textAlign: "center", fontSize: "12px", color: "#94a3b8", marginTop: "32px" }}>
        <p>&copy; 2026 JPTutor AI Yamato.</p>
      </footer>
    </div>
  );
}