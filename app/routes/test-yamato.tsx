/**
 * @file test-yamato.tsx
 * @description ヤマトAI 独立APIテスト画面（Supabase YAMATO_CONFIGS 動的取得・漢字文法チェッカー追加版）
 */
import type { MetaFunction } from "@remix-run/react";
import { Link } from "@remix-run/react";
import { useState, useEffect } from "react";
import { YamatoChatCommon } from "../components/YamatoChatCommon";
import { fetchYamatoConfigsData, YamatoConfigsData, AppType } from "../data/yamato-configs";
import { supabase } from "../lib/supabaseClient";

export const meta: MetaFunction = () => {
  return [
    { title: "AI Yamato 独立APIテスト画面" },
    { name: "description", content: "独立APIサーバーと連携するヤマトのテストページです。" },
  ];
};

export default function TestYamatoPage() {
  const [activeAppType, setActiveAppType] = useState<AppType>("concierge");
  const [apiFields, setApiFields] = useState<string[]>([]);
  const [isLoadingSchema, setIsLoadingSchema] = useState<boolean>(false);

  // 💡 Supabase から動的に取得するボット設定データ（ハードコードされたフォールバックは持たない）
  const [yamatoConfigs, setYamatoConfigs] = useState<YamatoConfigsData | null>(null);
  const [isConfigLoading, setIsConfigLoading] = useState<boolean>(true);

  // 💡 実行環境に応じて API のベースURLを自動切り替えし、スキーマと構成メタデータを同時に取得
  useEffect(() => {
    async function fetchData() {
      setIsLoadingSchema(true);
      setIsConfigLoading(true);
      try {
        const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";
        const apiBaseUrl = isLocal ? "http://localhost:8787" : "https://api.jptutoraiyamato.com";

        // 1. Supabase の app_knowledge テーブルから YAMATO_CONFIGS を非同期取得
        const remoteConfigs = await fetchYamatoConfigsData(supabase);
        if (remoteConfigs) {
          setYamatoConfigs(remoteConfigs);
        }

        // 2. スキーマ情報の取得
        const schemaRes = await fetch(`${apiBaseUrl}/api/schema/${activeAppType}`);
        if (schemaRes.ok) {
          const data = (await schemaRes.json()) as { appType: string; fields: string[] };
          setApiFields(data.fields || []);
        } else {
          setApiFields([]);
        }
      } catch (err) {
        console.error("Failed to fetch data from API or Supabase:", err);
        setApiFields([]);
      } finally {
        setIsLoadingSchema(false);
        setIsConfigLoading(false);
      }
    }

    fetchData();
  }, [activeAppType]);

  const currentConfig = yamatoConfigs ? yamatoConfigs[activeAppType] : null;

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
            to="/test-yamato-note"
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

        {/* セクション1：ヤマトAI 独立APIテスト画面 */}
        <div style={{ width: "100%", backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h1 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🇯🇵</span> ヤマト AI 独立APIテスト {isConfigLoading && <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "normal" }}>(Supabaseから設定読込中...)</span>}
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
                    border: yamatoConfigs?.concierge?.buttonStyle.border || "2px solid #ef4444",
                    backgroundColor: yamatoConfigs?.concierge?.buttonStyle.background || "#ffffff",
                    color: yamatoConfigs?.concierge?.buttonStyle.color || "#000000"
                  }}
                >
                  👋 LP Concierge (コンシェルジュ) {activeAppType === "concierge" && " ✓"}
                </button>
              </div>
            </div>

            {/* 🌍 Section 1: 全世界対応 */}
            <div style={{ backgroundColor: "#eff6ff", padding: "12px", borderRadius: "12px", border: "1px solid #bfdbfe" }}>
              <h2 style={{ fontSize: "11px", fontWeight: "bold", color: "#1d4ed8", textTransform: "uppercase", marginBottom: "8px" }}>
                🌍 Section 1: 全世界対応
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {(["genkoyoshi-editor-general", "game-igo", "image-explanation"] as const).map((type) => {
                  const cfg = yamatoConfigs?.[type];
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
                        border: cfg?.buttonStyle.border || "1px solid #cbd5e1",
                        background: cfg?.buttonStyle.background || "#ffffff",
                        color: cfg?.buttonStyle.color || "#000000"
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
                    "eoy-writing-custom",
                    "oral-exam-questions",
                    "kanji-grammar-checker",
                  ] as const
                ).map((type) => {
                  const cfg = yamatoConfigs?.[type];
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
                        border: cfg?.buttonStyle.border || "1px solid #cbd5e1",
                        backgroundColor: cfg?.buttonStyle.background || "#ffffff",
                        color: cfg?.buttonStyle.color || "#000000"
                      }}
                    >
                      {type === "genkoyoshi-editor-vce" && (<span>📄 原稿用紙 (VCE) {isSelected && " ✓"}</span>)}
                      {type === "eoy-oral-drill" && (<span>🗣️ Oral Drill {isSelected && " ✓"}</span>)}
                      {type === "eoy-oral-elaborate" && (<span>💭 Oral Elaborate {isSelected && " ✓"}</span>)}
                      {type === "eoy-oral-mock" && (<span>📝 Oral Mock {isSelected && " ✓"}</span>)}
                      {type === "eoy-writing" && (<span>✍️ Writing {isSelected && " ✓"}</span>)}
                      {type === "eoy-writing-custom" && (<span>✍️ Writing (Custom) {isSelected && " ✓"}</span>)}
                      {type === "oral-exam-questions" && (<span>✨ 口頭試験質問集 {isSelected && " ✓"}</span>)}
                      {type === "kanji-grammar-checker" && (<span>📚 漢字文法チェッカー {isSelected && " ✓"}</span>)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 💡 選択中であることがひと目でわかるステータスインジケーター & 登録 appType 一覧表示 */}
          <div style={{ marginTop: "20px", fontSize: "12px", color: "#1e293b", backgroundColor: "#f8fafc", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ color: "#16a34a", fontWeight: "bold" }}>✓ 現在選択中のヤマト:</span> 
                <strong style={{ color: "#0f172a" }}>{currentConfig?.name || activeAppType}</strong>
              </span>
              <span style={{ fontFamily: "monospace", backgroundColor: "#e2e8f0", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", color: "#334155" }}>{activeAppType}</span>
            </div>

            {/* 💡 Supabase から取得したすべての appType キー一覧を可視化 */}
            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: "bold", color: "#64748b" }}>📦 Supabase (YAMATO_CONFIGS) に登録されている appType 一覧:</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {yamatoConfigs ? (
                  Object.keys(yamatoConfigs).map((key) => (
                    <span
                      key={key}
                      style={{
                        fontFamily: "monospace",
                        fontSize: "11px",
                        backgroundColor: activeAppType === key ? "#dbeafe" : "#e2e8f0",
                        color: activeAppType === key ? "#1e40af" : "#334155",
                        border: activeAppType === key ? "1px solid #93c5fd" : "1px solid transparent",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontWeight: activeAppType === key ? "bold" : "normal"
                      }}
                    >
                      {key}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>読み込み中...</span>
                )}
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* 💡 YamatoChatCommon 呼び出し */}
      <YamatoChatCommon 
        appType={activeAppType}
        characterName={currentConfig?.name || "やまと先生"}
        initialGreeting={currentConfig?.greeting || ""}
        themeColor={(currentConfig?.themeColor as any) || "red"}
        buttonStyle={currentConfig?.floatingButtonStyle || { border: "2px solid #ef4444", background: "#ffffff", color: "#000000" }}
        defaultOpen={false}
      />

      <footer style={{ textAlign: "center", fontSize: "12px", color: "#94a3b8", marginTop: "32px" }}>
        <p>&copy; 2026 JPTutor AI Yamato.</p>
      </footer>
    </div>
  );
}