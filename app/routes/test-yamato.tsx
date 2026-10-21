/**
 * @file test-yamato.tsx
 * @description ヤマトAI 独立APIテスト画面（絵で説明ヤマト・虹色テーマ対応版）
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
  | "oral-exam-questions"
  | "image-explanation"; // 💡 絵で説明ヤマト追加

type AppConfig = {
  name: string;
  greeting: string;
  themeColor: "red" | "blue" | "black" | "green" | "yellow" | "orange" | "purple" | "cyan" | "pink" | "rainbow"; // 💡 rainbow追加
  apiSourceFile: string;
  targetAudience: string;
  buttonStyle: {
    border: string;
    background: string;
    color: string;
  };
  floatingButtonStyle: {
    border: string;
    background: string;
    color: string;
  };
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
      themeColor: "red", // 💡 やまと先生（赤）
      apiSourceFile: "concierge.ts (経由: chat.ts / index.ts)",
      targetAudience: "ポータル全体の訪問者（生徒・保護者・教員）",
      buttonStyle: { border: "2px solid #ef4444", background: "#ffffff", color: "#000000" },
      floatingButtonStyle: { border: "2px solid #ef4444", background: "#ffffff", color: "#000000" },
    },
    "game-igo": {
      name: "囲碁ヤマト",
      greeting: "こんにちは！囲碁AIヤマトです。一局打ってみましょうか？それともルールや定石について質問しますか？",
      themeColor: "black", // 💡 囲碁ヤマト（黒）
      apiSourceFile: "game-igo.ts (経由: FoundationLayout.ts)",
      targetAudience: "囲碁に興味のある日本語学習者",
      buttonStyle: { border: "2px solid #ffffff", background: "#000000", color: "#ffffff" },
      floatingButtonStyle: { border: "2px solid #ffffff", background: "#000000", color: "#ffffff" },
    },
    "genkoyoshi-editor-general": {
      name: "原稿用紙エディター (一般)",
      greeting: "こんにちは！一般向け原稿用紙エディターです。日本語の文章構成や推敲をサポートします。",
      themeColor: "blue", // 💡 原稿用紙一般（青）
      apiSourceFile: "genkoyoshi-editor-general.ts (経由: FoundationLayout.ts)",
      targetAudience: "一般的な日本語の文章作成・作文を行う学習者",
      buttonStyle: { border: "2px solid #38bdf8", background: "#3b82f6", color: "#ffffff" },
      floatingButtonStyle: { border: "2px solid #38bdf8", background: "#3b82f6", color: "#ffffff" },
    },
    "genkoyoshi-editor-vce": {
      name: "原稿用紙エディター (VCE)",
      greeting: "Hello, my friend! 🌟 Welcome to the VCE Genkoyoshi Editor. Let's polish your Japanese essay to meet strict VCE standards.",
      themeColor: "blue", // 💡 原稿用紙VCE（青）
      apiSourceFile: "genkoyoshi-editor-vce.ts (経由: FoundationLayout.ts)",
      targetAudience: "オーストラリア・ビクトリア州 VCE日本語学習者 (Years 11–12)",
      buttonStyle: { border: "2px solid #38bdf8", background: "#3b82f6", color: "#ffffff" },
      floatingButtonStyle: { border: "2px solid #38bdf8", background: "#3b82f6", color: "#ffffff" },
    },
    "eoy-oral-drill": {
      name: "EOY Oral Drill",
      greeting: "Hello, my friend! 🌟 Welcome to your EOY Oral Drill practice session! Let's sharpen your speaking skills.",
      themeColor: "green", // 💡 Oral Drill（緑）
      apiSourceFile: "eoy-oral-drill.ts (経由: FoundationLayout.ts)",
      targetAudience: "VCE期末口頭試験（Oral Exam）を控える生徒",
      buttonStyle: { border: "2px solid #eab308", background: "#dcfce7", color: "#000000" },
      floatingButtonStyle: { border: "2px solid #eab308", background: "#dcfce7", color: "#000000" },
    },
    "eoy-oral-elaborate": {
      name: "EOY Oral Elaborate",
      greeting: "Hello, my friend! 🌟 Welcome to the EOY Oral Elaborate session. Let's dive deeper into your detailed study and responses.",
      themeColor: "purple", // 💡 Oral Elaborate（紫）
      apiSourceFile: "eoy-oral-elaborate.ts (経由: FoundationLayout.ts)",
      targetAudience: "VCE口頭試験の詳細研究セクション対策の生徒",
      buttonStyle: { border: "2px solid #a855f7", background: "#f3e8ff", color: "#000000" },
      floatingButtonStyle: { border: "2px solid #a855f7", background: "#f3e8ff", color: "#000000" },
    },
    "eoy-oral-mock": {
      name: "EOY Oral Mock Exam",
      greeting: "Hello, my friend! 🌟 Welcome to your EOY Oral Mock Exam. Ready to simulate the real exam experience?",
      themeColor: "pink", // 💡 Oral Mock（ピンク）
      apiSourceFile: "eoy-oral-mock.ts (経由: FoundationLayout.ts)",
      targetAudience: "本番さながらの模擬試験を体験したいVCE受験生",
      buttonStyle: { border: "2px solid #ef4444", background: "#3b82f6", color: "#ffffff" },
      floatingButtonStyle: { border: "2px solid #ef4444", background: "#3b82f6", color: "#ffffff" },
    },
    "eoy-writing": {
      name: "VCE Writing Practice",
      greeting: "Hello, my friend! 🌟 Welcome to your EOY Writing practice session! Let's polish your Japanese writing skills.",
      themeColor: "cyan", // 💡 VCE Writing（水色）
      apiSourceFile: "eoy-writing.ts (経由: FoundationLayout.ts)",
      targetAudience: "VCE期末ライティング試験対策を行う生徒",
      buttonStyle: { border: "2px solid #3b82f6", background: "#e0f2fe", color: "#000000" },
      floatingButtonStyle: { border: "2px solid #3b82f6", background: "#e0f2fe", color: "#000000" },
    },
    "oral-exam-questions": {
      name: "語彙文法チェッカー",
      greeting: "Hello, my friend! 🌟 Welcome to the Vocabulary & Grammar Checker. What expressions or sentences would you like to check today?",
      themeColor: "orange", // 💡 語彙文法チェッカー（オレンジ）
      apiSourceFile: "oral-exam-questions.ts (経由: FoundationLayout.ts)",
      targetAudience: "VCE日本語の語彙や文法を確認したい生徒・教員",
      buttonStyle: { border: "2px solid #22c55e", background: "#fde047", color: "#000000" },
      floatingButtonStyle: { border: "2px solid #22c55e", background: "#fde047", color: "#000000" },
    },
    "image-explanation": {
      name: "絵で説明ヤマト",
      greeting: "Hello, my friend! 🎨 Welcome to Image Explanation Yamato. Ask me anything about Japanese culture, customs, or vocabulary, and I will generate vivid visual illustrations to explain it!",
      themeColor: "rainbow", // 💡 絵で説明ヤマト（虹色）
      apiSourceFile: "image-explanation.ts (経由: FoundationLayout.ts & imagen-service.ts)",
      targetAudience: "日本語や日本文化を視覚的な図解・イラストで学びたい全学習者",
      buttonStyle: { border: "2px solid #ec4899", background: "linear-gradient(135deg, #ef4444, #f59e0b, #10b981, #3b82f6, #8b5cf6)", color: "#ffffff" },
      floatingButtonStyle: { border: "3px solid #ec4899", background: "linear-gradient(135deg, #ef4444, #f59e0b, #10b981, #3b82f6, #8b5cf6)", color: "#ffffff" },
    },
  };

  const currentConfig = appConfig[activeAppType];

  return (
    <div style={{ backgroundColor: "#f1f5f9", minHeight: "100vh", color: "#1e293b", display: "flex", flexDirection: "column", justifyContent: "space-between", fontFamily: "sans-serif", padding: "32px" }}>
      
      {/* メインコンテンツ（上下フルワイド配置） */}
      <main style={{ maxWidth: "1400px", width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* 追加セクション：test-yamato.tsxで変えられるもの・変わらないもの */}
        <div style={{ width: "100%", backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#0f172a", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🔍</span> test-yamato.tsx でペルソナ切替時に変わるもの・変わらないもの
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", fontSize: "13px" }}>
            
            {/* 🔄 変わるもの */}
            <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "16px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#166534", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🔄</span> 変わるもの
              </h3>
              <ul style={{ margin: 0, paddingLeft: "18px", color: "#334155", display: "flex", flexDirection: "column", gap: "10px", lineHeight: "1.5" }}>
                <li>
                  <strong>AIのペルソナ頭脳とバックエンド処理 (appType):</strong>
                  <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                    バックエンドのAPIに送信される <code>appType</code> が切り替わり、それぞれの専門分野（一般コンシェルジュ、絵で説明特化、囲碁、VCEライティングなど）に応じた固有のシステムプロンプトや知識データが適用されます。
                  </div>
                </li>
                <li>
                  <strong>キャラクターの名前 (characterName):</strong>
                  <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                    チャットヘッダーやフローティングボタンに表示される名前（「やまと先生」、「絵で説明ヤマト」、「VCE Writing Practice」など）が各ペルソナの名称に変わります。
                  </div>
                </li>
                <li>
                  <strong>初期の挨拶メッセージ (initialGreeting):</strong>
                  <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                    チャットを開いた際に最初に表示されるウェルカムメッセージが、各ペルソナ固有の挨拶に変わります。
                  </div>
                </li>
                <li>
                  <strong>テーマカラーとボタンスタイル (themeColor / buttonStyle):</strong>
                  <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                    ウィジェットのヘッダー色、バッジ、入力欄のフォーカスリング、ユーザーの吹き出し背景、およびボタンの枠線・背景・文字色（赤、黒、水色、緑、紫、虹色など）が各ペルソナの設定に合わせて変化します。
                  </div>
                </li>
              </ul>
            </div>

            {/* 🔒 変わらないもの */}
            <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "16px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#1e40af", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🔒</span> 変わらないもの（共通の機能・レイアウト）
              </h3>
              <ul style={{ margin: 0, paddingLeft: "18px", color: "#334155", display: "flex", flexDirection: "column", gap: "10px", lineHeight: "1.5" }}>
                <li>
                  <strong>ユーザーのログイン状態とクレジット残高管理:</strong>
                  <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                    どのペルソナに切り替えても、Supabaseによる認証セッションの自動検知、リアルタイムのクレジット残高表示（🪙 XX credits）、およびゼロクレジット時のガード機能は共通して動き続けます。
                  </div>
                </li>
                <li>
                  <strong>学習ペースの切替機能:</strong>
                  <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                    <code>steady</code>（じっくり）、<code>normal</code>（標準）、<code>accelerated</code>（加速）の学習ペース切替UIと、Supabaseの <code>profiles</code> テーブルへの即時保存の仕組みはすべてのペルソナで共通です。
                  </div>
                </li>
                <li>
                  <strong>文字サイズの動的変更機能:</strong>
                  <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                    チャット内のフォントサイズ（小・中・大・特大）を切り替えるUIと機能は共通です。
                  </div>
                </li>
                <li>
                  <strong>画像アップロード & ビジョン解析・全画面表示機能:</strong>
                  <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                    手書き答案などの画像を添付してプレビューする機能、視覚支援（Visual Aid）チェックボックス、およびチャット画面の最大化（フルスクリーン）機能は共通で利用できます。
                  </div>
                </li>
                <li>
                  <strong>消費クレジットのルールとスマートエラーハンドリング:</strong>
                  <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                    テキストチャット（2クレジット）および画像AI（4クレジット）の消費ルールや、402エラー時のスマートなクレジット不足ハンドリングはすべてのペルソナで共通です。
                  </div>
                </li>
              </ul>
            </div>

          </div>
        </div>

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
                    border: appConfig.concierge.buttonStyle.border,
                    backgroundColor: appConfig.concierge.buttonStyle.background,
                    color: appConfig.concierge.buttonStyle.color
                  }}
                >
                  👋 LP Concierge (コンシェルジュ) {activeAppType === "concierge" && " ✓"}
                </button>
              </div>
            </div>

            {/* 🌍 Section 1: 全世界対応（ここに「絵で説明ヤマト」を配置） */}
            <div style={{ backgroundColor: "#eff6ff", padding: "12px", borderRadius: "12px", border: "1px solid #bfdbfe" }}>
              <h2 style={{ fontSize: "11px", fontWeight: "bold", color: "#1d4ed8", textTransform: "uppercase", marginBottom: "8px" }}>
                🌍 Section 1: 全世界対応
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {(["genkoyoshi-editor-general", "game-igo", "image-explanation"] as const).map((type) => {
                  const cfg = appConfig[type];
                  const isSelected = activeAppType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setActiveAppType(type)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        border: cfg.buttonStyle.border,
                        background: cfg.buttonStyle.background,
                        color: cfg.buttonStyle.color
                      }}
                    >
                      {type === "genkoyoshi-editor-general" && (<span>📄 原稿用紙 (一般) {isSelected && " ✓"}</span>)}
                      {type === "game-igo" && (<span>⚪ 囲碁ヤマト {isSelected && " ✓"}</span>)}
                      {type === "image-explanation" && (<span>🌈 絵で説明ヤマト {isSelected && " ✓"}</span>)}
                    </button>
                  );
                })}
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
                ).map((type) => {
                  const cfg = appConfig[type];
                  const isSelected = activeAppType === type;
                  return (
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
                        border: cfg.buttonStyle.border,
                        backgroundColor: cfg.buttonStyle.background,
                        color: cfg.buttonStyle.color
                      }}
                    >
                      {type === "genkoyoshi-editor-vce" && (<span>📄 原稿用紙 (VCE) {isSelected && " ✓"}</span>)}
                      {type === "eoy-oral-drill" && (<span>🗣️ Oral Drill {isSelected && " ✓"}</span>)}
                      {type === "eoy-oral-elaborate" && (<span>💭 Oral Elaborate {isSelected && " ✓"}</span>)}
                      {type === "eoy-oral-mock" && (<span>📝 Oral Mock {isSelected && " ✓"}</span>)}
                      {type === "eoy-writing" && (<span>✍️ Writing {isSelected && " ✓"}</span>)}
                      {type === "oral-exam-questions" && (<span>✨ 語彙文法チェッカー {isSelected && " ✓"}</span>)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 💡 選択中であることがひと目でわかるステータスインジケーター */}
          <div style={{ marginTop: "20px", fontSize: "12px", color: "#1e293b", backgroundColor: "#f8fafc", padding: "12px", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: "#16a34a", fontWeight: "bold" }}>✓ 現在選択中のヤマト:</span> 
              <strong style={{ color: "#0f172a" }}>{currentConfig.name}</strong>
            </span>
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
            
            {/* 基本構成テーブル */}
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
                      すべてのプロンプトの根本的なルールやエンジンを組み立てる大元（同期データのうち全てのヤマトに必要なデータを取り込む場所）
                    </p>
                  </td>
                  <td style={{ padding: "14px 12px", verticalAlign: "top" }}>
                    <span style={{ fontWeight: "bold", color: "#94a3b8" }}>(🚀 PageLayout.tsx)</span>
                    <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px", lineHeight: "1.4" }}>
                      ポータル全体の共通レイアウト（※ヤマトチャット作成には直接関与しません）
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
                <tr>
                  <td style={{ padding: "14px 12px", fontWeight: "bold", color: "#0f172a", verticalAlign: "top" }}>乗組員 (ひな形)</td>
                  <td style={{ padding: "14px 12px", verticalAlign: "top" }}>
                    <span style={{ fontWeight: "bold", color: "#d97706" }}>👨‍✈️ a-template.ts / image-explanation.ts</span>
                    <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", lineHeight: "1.4" }}>
                      FoundationLayout のデータが内包されている YamatoApiCommon.tsx をインポートしてペルソナを記述するひな形（同期データのうち個別のヤマトに必要なデータを取り込む場所）
                    </p>
                  </td>
                  <td style={{ padding: "14px 12px", verticalAlign: "top" }}>
                    <span style={{ fontWeight: "bold", color: "#d97706" }}>👨‍✈️ YamatoChatCommon をコピーして新規作成</span>
                    <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", lineHeight: "1.4" }}>固有の名前・テーマ・プロンプトをカスタマイズ</p>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* プロジェクト別詳細解説 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              
              {/* APIプロジェクト側コラム */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "14px", padding: "16px" }}>
                <div style={{ fontSize: "13px", fontWeight: "bold", color: "#1d4ed8", borderBottom: "2px solid #93c5fd", paddingBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>⚙️</span> APIプロジェクト側（バックエンド / Cloudflare Workers）
                </div>

                <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <h4 style={{ fontSize: "12px", fontWeight: "bold", color: "#1e40af", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>🚀</span> FoundationLayout.ts (基盤エンジン)
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "11px", color: "#334155", display: "flex", flexDirection: "column", gap: "5px", lineHeight: "1.4" }}>
                    <li><strong>コア機体設計:</strong> 全ペルソナ共通のLLMシステムプロンプトの根本大元。<strong>同期データのうち全てのヤマトに必要なデータ（FAQ等）を取り込む場所</strong>として機能。</li>
                    <li><strong>👤 命名規則管理:</strong> ユーザーニックネームが存在する場合はその名前で親しみやすく呼びかけ、未設定時は「my friend」に自動フォールバック。</li>
                    <li><strong>🗣️ 通信・言語規則:</strong> 厳格な英語強制（AIの応答原則はすべて英語、日本語はターゲット語句や例文・漢字等の解説時のみ許可）。オーストラリア英語標準を厳守。</li>
                  </ul>
                </div>

                <div style={{ backgroundColor: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <h4 style={{ fontSize: "12px", fontWeight: "bold", color: "#6b21a8", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>🛠️</span> YamatoApiCommon.tsx (バックエンド共通層)
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "11px", color: "#334155", display: "flex", flexDirection: "column", gap: "5px", lineHeight: "1.4" }}>
                    <li><strong>共通プロンプトインジェクション:</strong> 各ペルソナ固有のロジックに共通基盤を安全に注入するAPI層のパイプライン。</li>
                    <li><strong>🔌 エンドポイント中継:</strong> HonoベースのCloudflare WorkersワーカーとVertex AI（Gemini）間のシームレスな通信制御。</li>
                  </ul>
                </div>
              </div>

              {/* yamato-portalプロジェクト側コラム */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "14px", padding: "16px" }}>
                <div style={{ fontSize: "13px", fontWeight: "bold", color: "#166534", borderBottom: "2px solid #86efac", paddingBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>🌐</span> yamato-portalプロジェクト側（フロントエンド / Remix）
                </div>

                <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <h4 style={{ fontSize: "12px", fontWeight: "bold", color: "#92400e", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>🛠️</span> YamatoChatCommon.tsx (フロントAIウィジェット)
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "11px", color: "#334155", display: "flex", flexDirection: "column", gap: "5px", lineHeight: "1.4" }}>
                    <li><strong>汎用対話UIコックピット:</strong> すべてのペルソナテスト画面や学習ポータルで共有される高機能AIチャットウィジェット。</li>
                    <li><strong>🎨 多彩なテーマカラー対応:</strong> 虹色テーマを含む多彩なカラーテーマの動的切り替え。</li>
                    <li><strong>⚡ Supabase即時DB同期:</strong> 学習ペースやクレジット残高の変更をリアルタイム同期。</li>
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
                  
                  <div style={{ backgroundColor: "#f0fdf4", border: "2px solid #22c55e", borderRadius: "8px", padding: "8px", margin: "6px 0" }}>
                    <div style={{ fontSize: "10px", fontWeight: "bold", color: "#15803d", marginBottom: "4px" }}>
                      ⚙️ APIプロジェクト側（バックエンド処理ブロック）
                    </div>
                    [3] a-template.ts 派生ファイル (各ヤマトの固有頭脳)<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;▼<br/>
                    [4] YamatoApiCommon.tsx (共通パイプライン)<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;▼<br/>
                    [5] FoundationLayout.ts (基盤エンジン)
                  </div>
                  &nbsp;&nbsp;&nbsp;&nbsp;▼<br/>
                  [6] Vertex AI (Gemini) へ送信
                </div>
              </div>

              {/* 復路（帰り） */}
              <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <h3 style={{ fontSize: "13px", fontWeight: "bold", color: "#166534", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>✨</span> 復路（帰り）: AI生成から生徒への到達まで
                </h3>
                <div style={{ fontFamily: "monospace", fontSize: "11px", backgroundColor: "white", padding: "10px", borderRadius: "8px", border: "1px solid #dcfce7", lineHeight: "1.5" }}>
                  [1] Vertex AI (Gemini) が回答生成<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;│<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;▼<br/>
                  [2] index.ts (APIサーバー後半処理)<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;│ (テキスト抽出・画像生成・クレジット減算)<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;▼<br/>
                  [3] YamatoChatCommon.tsx (フロントUI)<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;▼<br/>
                  [4] 生徒の目に届く（画面表示完了 🎉）
                </div>
              </div>

            </div>

          </div>
        </div>

      </main>

      {/* 💡 YamatoChatCommon 呼び出し（虹色テーマ対応） */}
      <YamatoChatCommon 
        appType={activeAppType}
        characterName={currentConfig.name}
        initialGreeting={currentConfig.greeting}
        themeColor={currentConfig.themeColor as any}
        buttonStyle={currentConfig.floatingButtonStyle}
        defaultOpen={false}
      />

      <footer style={{ textAlign: "center", fontSize: "12px", color: "#94a3b8", marginTop: "32px" }}>
        <p>&copy; 2026 JPTutor AI Yamato.</p>
      </footer>
    </div>
  );
}