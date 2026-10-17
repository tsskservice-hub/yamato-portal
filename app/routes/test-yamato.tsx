/**
 * @file test-yamato.tsx
 * @description ヤマトAI 独立APIテスト画面（ログイン仕様削除・PageLayout詳細化版）
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

  const foundationMeta = ecosystemMeta?.foundation;
  const portalLayoutMeta = ecosystemMeta?.portalLayout;
  const apiCommonMeta = ecosystemMeta?.apiCommon;
  const chatCommonMeta = ecosystemMeta?.chatCommon;

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
            右下のチャット窓、または以下のセクション別ボタンから各ペルソナの動作テストを行えます。
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
                  👋 LP Concierge (青)
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
                    {type === "genkoyoshi-editor-general" && "📄 原稿用紙 (一般)"}
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

          <div style={{ marginTop: "20px", fontSize: "12px", color: "#64748b", backgroundColor: "#f8fafc", padding: "12px", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Selected: <strong style={{ color: "#1e293b" }}>{currentConfig.name}</strong></span>
            <span style={{ fontFamily: "monospace", backgroundColor: "#e2e8f0", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", color: "#334155" }}>{activeAppType}</span>
          </div>
        </div>

        {/* セクション2：AIヤマト・エコシステム アーキテクチャ構成表 ＆ 詳細コラム（1列縦並び：API先行配置） */}
        <div style={{ width: "100%", backgroundColor: "#ffffff", color: "#1e293b", border: "1px solid #cbd5e1", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", marginBottom: "16px", borderBottom: "1px solid #e2e8f0" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "bold", color: "#1e3a8a", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <span>🚀</span> AIヤマト・エコシステム 構成表 & メタデータ (プロジェクト別詳細解説)
            </h2>
            <span style={{ fontSize: "11px", backgroundColor: "#eff6ff", color: "#1d4ed8", padding: "4px 8px", borderRadius: "6px", border: "1px solid #bfdbfe", fontWeight: "600" }}>
              Live API Synced
            </span>
          </div>

          {/* スクロールバー付きコンテナ */}
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
                  <td style={{ padding: "14px 12px", fontWeight: "bold", color: "#0f172a", verticalAlign: "top" }}>
                    {foundationMeta?.layer || "土台 (機体)"}
                  </td>
                  <td style={{ padding: "14px 12px", verticalAlign: "top" }}>
                    <span style={{ fontWeight: "bold", color: "#2563eb" }}>
                      🚀 {foundationMeta?.fileName || "FoundationLayout.ts"}
                    </span>
                    <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", lineHeight: "1.4" }}>
                      {foundationMeta?.role || "すべてのプロンプトの根本的なルールやエンジンを組み立てる大元"}
                    </p>
                  </td>
                  <td style={{ padding: "14px 12px", verticalAlign: "top" }}>
                    <span style={{ fontWeight: "bold", color: "#94a3b8" }}>
                      (🚀 {portalLayoutMeta?.fileName || "PageLayout.tsx"})
                    </span>
                    <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px", lineHeight: "1.4" }}>
                      ポータル全体の共通レイアウト（※ヤマトチャット作成には直接関与しません）
                    </p>
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "14px 12px", fontWeight: "bold", color: "#0f172a", verticalAlign: "top" }}>窓口・外装</td>
                  <td style={{ padding: "14px 12px", verticalAlign: "top" }}>
                    <span style={{ fontWeight: "bold", color: "#9333ea" }}>
                      🛠️ {apiCommonMeta?.fileName || "YamatoApiCommon.tsx"}
                    </span>
                    <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", lineHeight: "1.4" }}>
                      {apiCommonMeta?.role || "共通プロンプト構造や portalData などの共通オプションを受け渡す基盤"}
                    </p>
                  </td>
                  <td style={{ padding: "14px 12px", verticalAlign: "top" }}>
                    <span style={{ fontWeight: "bold", color: "#9333ea" }}>
                      🛠️ {chatCommonMeta?.fileName || "YamatoChatCommon.tsx"}
                    </span>
                    <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", lineHeight: "1.4" }}>
                      {chatCommonMeta?.role || "対話UIの汎用テンプレート・操縦士コックピット"}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "14px 12px", fontWeight: "bold", color: "#0f172a", verticalAlign: "top" }}>乗組員 (ひな形)</td>
                  <td style={{ padding: "14px 12px", verticalAlign: "top" }}>
                    <span style={{ fontWeight: "bold", color: "#d97706" }}>
                      👨‍✈️ {ecosystemMeta?.template?.fileName || "a-template.ts"}
                    </span>
                    <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", lineHeight: "1.4" }}>
                      {ecosystemMeta?.template?.role || "FoundationLayout のデータが内包されている YamatoApiCommon.tsx をインポートしてペルソナを記述するひな形"}
                    </p>
                  </td>
                  <td style={{ padding: "14px 12px", verticalAlign: "top" }}>
                    <span style={{ fontWeight: "bold", color: "#d97706" }}>👨‍✈️ YamatoChatCommon をコピーして新規作成</span>
                    <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", lineHeight: "1.4" }}>（ChatYamatoGrammar.tsx等）固有の名前・テーマ・プロンプトをカスタマイズ</p>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 2. プロジェクト別詳細解説（1列縦並び：最初にAPIプロジェクト側、次にYamato Portal側） */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              
              {/* 【先頭】：APIプロジェクト側コラム（バックエンド） */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "14px", padding: "16px" }}>
                <div style={{ fontSize: "13px", fontWeight: "bold", color: "#1d4ed8", borderBottom: "2px solid #93c5fd", paddingBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>⚙️</span> APIプロジェクト側（バックエンド / Cloudflare Workers）
                </div>

                {/* ① FoundationLayout.ts */}
                <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <h4 style={{ fontSize: "12px", fontWeight: "bold", color: "#1e40af", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>🚀</span> FoundationLayout.ts (基盤エンジン)
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "11px", color: "#334155", display: "flex", flexDirection: "column", gap: "5px", lineHeight: "1.4" }}>
                    <li><strong>コア機体設計:</strong> 全9ペルソナ共通のLLMシステムプロンプトの根本大元。</li>
                    <li><strong>👤 命名規則管理:</strong> ユーザーニックネーム（`userNickname`）が存在する場合はその名前で親しみやすく呼びかけ、未設定時は「my friend」等の温かい表現に自動フォールバック。</li>
                    <li><strong>🗣️ 通信・言語規則:</strong> 厳格な英語強制（AIの応答原則はすべて英語、日本語はターゲット語句や例文・漢字等の解説時のみ許可）。オーストラリア英語標準（AU/UKスペル規則: realise, colour, centre等）を厳守し、矢印の記号指定は常に `&gt;` または `-&gt;` を使用。</li>
                    <li><strong>🌍 環境コンテキスト:</strong> タイムゾーンに基づく現在時刻・日付の動的挿入（デフォルト: Australia/Melbourne）。都市別の天気情報の自動連動とエラーハンドリング。</li>
                    <li><strong>📚 総合FAQナレッジバンク:</strong> 総合FAQデータベース（`faqList`）の自動コンパイルとシステム内埋め込みにより、料金やプランに関する質問に正確に回答。</li>
                    <li><strong>🎨 視覚支援・画像生成:</strong> 学習効果を高めるためのイラスト・ダイアグラム作成プロンプト（Imagen 3連携）の自動構成ルール。</li>
                    <li><strong>🔄 ターン制御・Socratic対話:</strong> 直接的な解答やエッセイの丸写しを避け、段階的に生徒の自発的思考を促すコーチング手法の徹底。</li>
                    <li><strong>🛡️ 安全性ガードレール:</strong> 不適切なプロンプトに対する強固な防御と、温かみのある人間の教師としてのロールプレイ維持。</li>
                  </ul>
                </div>

                {/* ② YamatoApiCommon.tsx */}
                <div style={{ backgroundColor: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <h4 style={{ fontSize: "12px", fontWeight: "bold", color: "#6b21a8", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>🛠️</span> YamatoApiCommon.tsx (バックエンド共通層)
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "11px", color: "#334155", display: "flex", flexDirection: "column", gap: "5px", lineHeight: "1.4" }}>
                    <li><strong>共通プロンプトインジェクション:</strong> 各ペルソナ固有のロジックに共通基盤を安全に注入するAPI層のパイプライン。</li>
                    <li><strong>📦 拡張オプション型:</strong> `YamatoApiCommonOptions` 型定義により、`portalData` や学習ペース、FAQ等の共通オプションを型安全に伝播。</li>
                    <li><strong>⚙️ パイプライン制御:</strong> `buildFoundationLayoutPrompt` を安全にラップし、リクエストごとの動的パラメータを漏れなく結合。</li>
                    <li><strong>🔌 エンドポイント中継:</strong> HonoベースのCloudflare WorkersワーカーとVertex AI（Gemini 2.5 Flash）間のシームレスな通信制御。</li>
                    <li><strong>🛡️ 型安全性とバリデーション:</strong> リクエストボディの検証、認証トークンチェック、およびエラーハンドリングの標準化。</li>
                  </ul>
                </div>
              </div>

              {/* 【2番目】：yamato-portalプロジェクト側コラム（フロントエンド） */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "14px", padding: "16px" }}>
                <div style={{ fontSize: "13px", fontWeight: "bold", color: "#166534", borderBottom: "2px solid #86efac", paddingBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>🌐</span> yamato-portalプロジェクト側（フロントエンド / Remix）
                </div>

                {/* ④ YamatoChatCommon.tsx */}
                <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <h4 style={{ fontSize: "12px", fontWeight: "bold", color: "#92400e", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>🛠️</span> YamatoChatCommon.tsx (フロントAIウィジェット)
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "11px", color: "#334155", display: "flex", flexDirection: "column", gap: "5px", lineHeight: "1.4" }}>
                    <li><strong>汎用対話UIコックピット:</strong> 全9ペルソナのテスト画面や学習ポータルで共有される高機能AIチャットウィジェット。</li>
                    <li><strong>🎨 9色テーマカラー対応:</strong> `emerald`, `blue`, `yellow`, `purple`, `cyan`, `orange`, `black`, `green`, `navy` の動的カラー切り替え。</li>
                    <li><strong>⚡ Supabase即時DB同期:</strong> 学習ペース（steady, normal, accelerated）やクレジット残高の変更をSupabase profilesとリアルタイム同期。</li>
                    <li><strong>🖥️ フルスクリーン切替:</strong> 没入型の学習やエッセイ執筆をサポートする全画面表示モードの搭載。</li>
                    <li><strong>💬 高度なインタラクション:</strong> 音声入力連携、画像プレビュー、クレジット消費ガイド、本日のクイズポップアップ等の総合機能。</li>
                  </ul>
                </div>

                {/* 💡 PageLayout.tsx (共通ポータルレイアウト ※枠外実装、ヤマト作成と非依存) */}
                <div style={{ backgroundColor: "#f1f5f9", border: "1px dashed #94a3b8", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <h4 style={{ fontSize: "12px", fontWeight: "bold", color: "#64748b", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>ℹ️</span> 枠外実装: PageLayout.tsx (共通ポータルレイアウト ※ヤマト作成とは非依存)
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "11px", color: "#475569", display: "flex", flexDirection: "column", gap: "5px", lineHeight: "1.4" }}>
                    <li><strong>全体外装とルーティング:</strong> Remixで構築された全画面の共通ヘッダー、フッター、およびグローバルナビゲーションの統括。</li>
                    <li><strong>🔒 パスキー認証基盤 (WebAuthn):</strong> セキュアな生体認証ログイン状態の保持、ユーザープロファイルの取得、およびセッション管理。</li>
                    <li><strong>💳 クレジット・プラン管理:</strong> サブスクリプション状態や利用可能クレジット残高の全局的な状態保持とリアルタイム監視。</li>
                    <li><strong>🛡️ セキュリティとルーティング保護:</strong> 保護されたページへのアクセス制御、トークン検証、および未認証ユーザーのリダイレクト制御。</li>
                    <li><strong>⚠️ 非依存性:</strong> 本番公開ページの全体外装や認証基盤を決定する枠外実装であり、個別チャット部品（ヤマトAI）の内部対話ロジックや動作・作成には直接関与しません。</li>
                  </ul>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* セクション3：独立した「AIヤマト・エコシステム 往来ライフサイクル & 3大ファイル連携フロー図」カード */}
        <div style={{ width: "100%", backgroundColor: "#ffffff", color: "#1e293b", border: "1px solid #cbd5e1", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", marginBottom: "16px", borderBottom: "1px solid #e2e8f0" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "bold", color: "#1e3a8a", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <span>🗺️</span> AIヤマト・エコシステム 往来ライフサイクル & 3大ファイル連携フロー図
            </h2>
            <span style={{ fontSize: "11px", backgroundColor: "#f0fdf4", color: "#166534", padding: "4px 8px", borderRadius: "6px", border: "1px solid #bbf7d0", fontWeight: "600" }}>
              Architecture Guide
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* 往路・復路の2カラムフロー図 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px", fontSize: "12px", color: "#334155" }}>
              
              {/* 往路（往き） */}
              <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <h3 style={{ fontSize: "13px", fontWeight: "bold", color: "#1e40af", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>🚀</span> 往路（往き）: 生徒の質問からAI送信まで
                </h3>
                <div style={{ fontFamily: "monospace", fontSize: "11px", backgroundColor: "white", padding: "10px", borderRadius: "8px", border: "1px solid #dbeafe", lineHeight: "1.5" }}>
                  [1] YamatoChatCommon.tsx (フロント)<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;│ (POST /chat + appType送信)<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;▼<br/>
                  [2] index.ts (APIサーバー / ルーター)<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;│ (appTypeを見てペルソナ判別)<br/>
                  
                  {/* ★ APIプロジェクト側の3ステップ [3], [4], [5] を色付きの専用枠で明示的にまとめる */}
                  <div style={{ backgroundColor: "#f0fdf4", border: "2px solid #22c55e", borderRadius: "8px", padding: "8px", margin: "6px 0" }}>
                    <div style={{ fontSize: "10px", fontWeight: "bold", color: "#15803d", marginBottom: "4px" }}>
                      ⚙️ APIプロジェクト側（バックエンド処理ブロック）
                    </div>
                    [3] a-template.ts 派生ファイル (各ヤマトの固有頭脳)<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;│ (専門知識プロンプトの構築)<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;▼<br/>
                    [4] YamatoApiCommon.tsx (共通パイプライン)<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;│ (portalDataやオプション結合)<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;▼<br/>
                    [5] FoundationLayout.ts (基盤エンジン)<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(根本ルール・オーストラリア英語等適用)
                  </div>

                  &nbsp;&nbsp;&nbsp;&nbsp;▼<br/>
                  [6] Vertex AI (Gemini 2.5 Flash) へ送信
                </div>
              </div>

              {/* 復路（帰り） */}
              <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <h3 style={{ fontSize: "13px", fontWeight: "bold", color: "#166534", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>✨</span> 復路（帰り）: AI生成から生徒への到達まで
                </h3>
                <div style={{ fontFamily: "monospace", fontSize: "11px", backgroundColor: "white", padding: "10px", borderRadius: "8px", border: "1px solid #dcfce7", lineHeight: "1.5" }}>
                  [1] Vertex AI (Gemini) が回答テキスト生成<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;│<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;▼<br/>
                  [2] index.ts (APIサーバーの後半処理)<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;│ (テキスト抽出・画像生成・クレジット減算処理)<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;▼<br/>
                  [3] YamatoChatCommon.tsx (フロントUI)<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;│ (JSONデータを吹き出しとして描画)<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;▼<br/>
                  [4] 生徒の目に届く（画面表示完了 🎉）
                </div>
              </div>

            </div>

            {/* 3大ファイルの連携まとめ（登場順 [3]➔[4]➔[5]） */}
            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "bold", color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                <span>📌</span> 3大ファイル（各ペルソナ頭脳・YamatoApiCommon・FoundationLayout）の役割分担順序
              </h3>
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#475569", display: "flex", flexDirection: "column", gap: "6px", lineHeight: "1.5" }}>
                <li><strong>[3] a-template.ts から作られたファイル（選択されたヤマト固有）:</strong> VCE試験対策や囲碁の対局など、それぞれのペルソナ専用の専門知識や対話の流れを定義するひな形。</li>
                <li><strong>[4] YamatoApiCommon.tsx（すべての通信を支える共通窓口）:</strong> 選択されたペルソナ固有のロジックとポータルデータ（`portalData`やFAQ等）を安全に結合・中継するバックエンドの共通パイプライン。</li>
                <li><strong>[5] FoundationLayout.ts（すべてのヤマトに適用）:</strong> 全ペルソナの根本にある普遍的なルール（オーストラリア英語強制、Socratic対話、安全性ガードレールなど）を統括する基盤エンジン。</li>
              </ul>
            </div>

          </div>
        </div>

      </main>

      {/* 💡 YamatoChatCommon 呼び出し（ログイン仕様削除に伴いuserIdを排除） */}
      <YamatoChatCommon 
        appType={activeAppType}
        characterName={currentConfig.name}
        initialGreeting={currentConfig.greeting}
        themeColor={currentConfig.themeColor as any}
        defaultOpen={false}
        additionalContext={portalContextData}
      />

      <footer style={{ textAlign: "center", fontSize: "12px", color: "#94a3b8", marginTop: "32px" }}>
        <p>&copy; 2026 JPTutor AI Yamato.</p>
      </footer>
    </div>
  );
}