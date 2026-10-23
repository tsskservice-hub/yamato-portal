/**
 * @file test-yamato.tsx
 * @description ヤマトAI 独立APIテスト画面（絵で説明ヤマト・虹色テーマ・テーマ連動上に戻るボタン対応版）
 */
import type { MetaFunction } from "@remix-run/react";
import { Link, useSearchParams } from "@remix-run/react";
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
  themeColor: "red" | "blue" | "black" | "green" | "yellow" | "orange" | "purple" | "cyan" | "pink" | "rainbow"; // 💡 rainbow対応
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
  const tokenQuery = token ? `?token=${token}` : "";

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
      themeColor: "red",
      apiSourceFile: "concierge.ts (経由: chat.ts / index.ts)",
      targetAudience: "ポータル全体の訪問者（生徒・保護者・教員）",
      buttonStyle: { border: "2px solid #ef4444", background: "#ffffff", color: "#000000" },
      floatingButtonStyle: { border: "2px solid #ef4444", background: "#ffffff", color: "#000000" },
    },
    "game-igo": {
      name: "囲碁ヤマト",
      greeting: "こんにちは！囲碁AIヤマトです。一局打ってみましょうか？それともルールや定石について質問しますか？",
      themeColor: "black",
      apiSourceFile: "game-igo.ts (経由: FoundationLayout.ts)",
      targetAudience: "囲碁に興味のある日本語学習者",
      buttonStyle: { border: "2px solid #ffffff", background: "#000000", color: "#ffffff" },
      floatingButtonStyle: { border: "2px solid #ffffff", background: "#000000", color: "#ffffff" },
    },
    "genkoyoshi-editor-general": {
      name: "原稿用紙エディター (一般)",
      greeting: "こんにちは！一般向け原稿用紙エディターです。日本語の文章構成や推敲をサポートします。",
      themeColor: "blue",
      apiSourceFile: "genkoyoshi-editor-general.ts (経由: FoundationLayout.ts)",
      targetAudience: "一般的な日本語の文章作成・作文を行う学習者",
      buttonStyle: { border: "2px solid #38bdf8", background: "#3b82f6", color: "#ffffff" },
      floatingButtonStyle: { border: "2px solid #38bdf8", background: "#3b82f6", color: "#ffffff" },
    },
    "genkoyoshi-editor-vce": {
      name: "原稿用紙エディター (VCE)",
      greeting: "Hello, my friend! 🌟 Welcome to the VCE Genkoyoshi Editor. Let's polish your Japanese essay to meet strict VCE standards.",
      themeColor: "blue",
      apiSourceFile: "genkoyoshi-editor-vce.ts (経由: FoundationLayout.ts)",
      targetAudience: "オーストラリア・ビクトリア州 VCE日本語学習者 (Years 11–12)",
      buttonStyle: { border: "2px solid #38bdf8", background: "#3b82f6", color: "#ffffff" },
      floatingButtonStyle: { border: "2px solid #38bdf8", background: "#3b82f6", color: "#ffffff" },
    },
    "eoy-oral-drill": {
      name: "EOY Oral Drill",
      greeting: "Hello, my friend! 🌟 Welcome to your EOY Oral Drill practice session! Let's sharpen your speaking skills.",
      themeColor: "green",
      apiSourceFile: "eoy-oral-drill.ts (経由: FoundationLayout.ts)",
      targetAudience: "VCE期末口頭試験（Oral Exam）を控える生徒",
      buttonStyle: { border: "2px solid #eab308", background: "#dcfce7", color: "#000000" },
      floatingButtonStyle: { border: "2px solid #eab308", background: "#dcfce7", color: "#000000" },
    },
    "eoy-oral-elaborate": {
      name: "EOY Oral Elaborate",
      greeting: "Hello, my friend! 🌟 Welcome to the EOY Oral Elaborate session. Let's dive deeper into your detailed study and responses.",
      themeColor: "purple",
      apiSourceFile: "eoy-oral-elaborate.ts (経由: FoundationLayout.ts)",
      targetAudience: "VCE口頭試験の詳細研究セクション対策の生徒",
      buttonStyle: { border: "2px solid #a855f7", background: "#f3e8ff", color: "#000000" },
      floatingButtonStyle: { border: "2px solid #a855f7", background: "#f3e8ff", color: "#000000" },
    },
    "eoy-oral-mock": {
      name: "EOY Oral Mock Exam",
      greeting: "Hello, my friend! 🌟 Welcome to your EOY Oral Mock Exam. Ready to simulate the real exam experience?",
      themeColor: "pink",
      apiSourceFile: "eoy-oral-mock.ts (経由: FoundationLayout.ts)",
      targetAudience: "本番さながらの模擬試験を体験したいVCE受験生",
      buttonStyle: { border: "2px solid #ef4444", background: "#3b82f6", color: "#ffffff" },
      floatingButtonStyle: { border: "2px solid #ef4444", background: "#3b82f6", color: "#ffffff" },
    },
    "eoy-writing": {
      name: "VCE Writing Practice",
      greeting: "Hello, my friend! 🌟 Welcome to your EOY Writing practice session! Let's polish your Japanese writing skills.",
      themeColor: "cyan",
      apiSourceFile: "eoy-writing.ts (経由: FoundationLayout.ts)",
      targetAudience: "VCE期末ライティング試験対策を行う生徒",
      buttonStyle: { border: "2px solid #3b82f6", background: "#e0f2fe", color: "#000000" },
      floatingButtonStyle: { border: "2px solid #3b82f6", background: "#e0f2fe", color: "#000000" },
    },
    "oral-exam-questions": {
      name: "語彙文法チェッカー",
      greeting: "Hello, my friend! 🌟 Welcome to the Vocabulary & Grammar Checker. What expressions or sentences would you like to check today?",
      themeColor: "orange",
      apiSourceFile: "oral-exam-questions.ts (経由: FoundationLayout.ts)",
      targetAudience: "VCE日本語の語彙や文法を確認したい生徒・教員",
      buttonStyle: { border: "2px solid #22c55e", background: "#fde047", color: "#000000" },
      floatingButtonStyle: { border: "2px solid #22c55e", background: "#fde047", color: "#000000" },
    },
    "image-explanation": {
      name: "絵で説明ヤマト",
      greeting: "Hello, my friend! 🎨 Welcome to Image Explanation Yamato. Ask me anything about Japanese culture, customs, or vocabulary, and I will generate vivid visual illustrations to explain it!",
      themeColor: "rainbow",
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
        
        {/* 💡 最上部に配置した test-yamato-note への遷移リンクバナー */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "14px", padding: "14px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#1e40af", fontWeight: "bold" }}>
            <span>💡</span> AIヤマト・エコシステムの仕組みやアーキテクチャ詳細を確認したいですか？
          </div>
          <Link
            to={`/test-yamato-note${tokenQuery}`}
            style={{
              padding: "8px 16px",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: "bold",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              whiteSpace: "nowrap"
            }}
          >
            📖 アーキテクチャノートを見る →
          </Link>
        </div>

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
                <li>
                  <strong>上に戻るボタンの枠線と文字の色:</strong>
                  <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                    ヤマトチャットのテーマカラーに連動して、ページトップへ戻るボタンの枠線やアイコンの色（赤、青、緑、紫、虹色対応など）が自動的に同期して変化します。
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
            新規ページに対するヤマトチャットを作るとき、YamatoChatCommon.tsx で必ず色などを登録する。でないと、その後PageLayoutで全てを流し込んでもらえない。
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

      </main>

      {/* 💡 YamatoChatCommon 呼び出し（虹色テーマ & 画像生成対応） */}
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