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

// 💡 スポーツチームのユニフォーム配色テンプレート
const sportsColorTemplates = [
  { name: "セルティック", sport: "サッカー / スコットランド", border: "2px solid #000000", background: "#018749", color: "#FFFFFF" },
  { name: "マンチェスター・シティ", sport: "サッカー / イングランド", border: "2px solid #FFFFFF", background: "#6CABDD", color: "#000000" },
  { name: "マンチェスター・ユナイテッド", sport: "サッカー / イングランド", border: "2px solid #FBE122", background: "#DA291C", color: "#FFFFFF" },
  { name: "Aston Villa", sport: "サッカー / イングランド", border: "2px solid #F1BE48", background: "#670E36", color: "#95BFE5" },
  { name: "レアル・マドリード", sport: "サッカー / スペイン", border: "2px solid #FEBE10", background: "#FFFFFF", color: "#00529F" },
  { name: "リヴァプールFC", sport: "サッカー / イングランド", border: "2px solid #F6EB61", background: "#C8102E", color: "#FFFFFF" },
  { name: "アーセナルFC", sport: "サッカー / イングランド", border: "2px solid #9C824A", background: "#FFFFFF", color: "#EF0107" },
  { name: "チェルシーFC", sport: "サッカー / イングランド", border: "2px solid #034694", background: "#1A1A1A", color: "#FFFFFF" },
  { name: "トッテナム・ホットスパー", sport: "サッカー / イングランド", border: "2px solid #132257", background: "#FFFFFF", color: "#132257" },
  { name: "ユベントスFC", sport: "サッカー / イタリア", border: "2px solid #000000", background: "#FFFFFF", color: "#000000" },
  { name: "ACミラン", sport: "サッカー / イタリア", border: "2px solid #FB090B", background: "#FFFFFF", color: "#000000" },
  { name: "インテル・ミラノ", sport: "サッカー / イタリア", border: "2px solid #000000", background: "#111111", color: "#0099FF" },
  { name: "ASローマ", sport: "サッカー / イタリア", border: "2px solid #8B0000", background: "#5B0E2D", color: "#F1BE48" },
  { name: "バイエルン・ミュンヘン", sport: "サッカー / ドイツ", border: "2px solid #DC052D", background: "#0066B2", color: "#FFFFFF" },
  { name: "ボルシア・ドルトムント", sport: "サッカー / ドイツ", border: "2px solid #000000", background: "#FDE100", color: "#000000" },
  { name: "パリ・サンジェルマン", sport: "サッカー / フランス", border: "2px solid #004170", background: "#FFFFFF", color: "#DA291C" },
  { name: "オリンピック・マルセイユ", sport: "サッカー / フランス", border: "2px solid #0096D6", background: "#FFFFFF", color: "#0096D6" },
  { name: "アヤックス・アムステルダム", sport: "サッカー / オランダ", border: "2px solid #D2122E", background: "#FFFFFF", color: "#D2122E" },
  { name: "FCポルト", sport: "サッカー / ポルトガル", border: "2px solid #003399", background: "#003399", color: "#FFFFFF" },
  { name: "SLベンフィカ", sport: "サッカー / ポルトガル", border: "2px solid #ED1C24", background: "#000000", color: "#FFFFFF" },
  { name: "ボカ・ジュニアーズ", sport: "サッカー / アルゼンチン", border: "2px solid #FCD116", background: "#003399", color: "#FCD116" },
  { name: "リーベル・プレート", sport: "サッカー / アルゼンチン", border: "2px solid #ED1C24", background: "#FFFFFF", color: "#000000" },
  { name: "フラメンゴ", sport: "サッカー / ブラジル", border: "2px solid #000000", background: "#C32021", color: "#FFFFFF" },
  { name: "コリンチャンス", sport: "サッカー / ブラジル", border: "2px solid #000000", background: "#FFFFFF", color: "#000000" },
  { name: "鹿島アントラーズ", sport: "Jリーグ / 日本", border: "2px solid #A80000", background: "#FFFFFF", color: "#000000" },
  { name: "浦和レッドダイヤモンズ", sport: "Jリーグ / 日本", border: "2px solid #000000", background: "#E60012", color: "#FFFFFF" },
  { name: "横浜F・マリノス", sport: "Jリーグ / 日本", border: "2px solid #002D62", background: "#FFFFFF", color: "#ED1C24" },
  { name: "川崎フロンターレ", sport: "Jリーグ / 日本", border: "2px solid #1E90FF", background: "#FFFFFF", color: "#000000" },
  { name: "FC東京", sport: "Jリーグ / 日本", border: "2px solid #002060", background: "#FFFFFF", color: "#CC0000" },
  { name: "サンフレッチェ広島", sport: "Jリーグ / 日本", border: "2px solid #5C2D91", background: "#FFFFFF", color: "#E5A823" },
  { name: "ヴィッセル神戸", sport: "Jリーグ / 日本", border: "2px solid #7A003C", background: "#000000", color: "#FFFFFF" },
  { name: "名古屋グランパス", sport: "Jリーグ / 日本", border: "2px solid #FF6600", background: "#CC0000", color: "#FFFFFF" },
  { name: "ガンバ大阪", sport: "Jリーグ / 日本", border: "2px solid #000080", background: "#000000", color: "#00FFFF" },
  { name: "セレッソ大阪", sport: "Jリーグ / 日本", border: "2px solid #E4007F", background: "#FFFFFF", color: "#000000" },
  { name: "シカゴ・ブルズ", sport: "NBA / アメリカ", border: "2px solid #CE1141", background: "#000000", color: "#FFFFFF" },
  { name: "ロサンゼルス・レイカーズ", sport: "NBA / アメリカ", border: "2px solid #FDB927", background: "#FFFFFF", color: "#552583" },
  { name: "ボストン・セルティックス", sport: "NBA / アメリカ", border: "2px solid #007A33", background: "#000000", color: "#FFFFFF" },
  { name: "ゴールデンステート・ウォリアーズ", sport: "NBA / アメリカ", border: "2px solid #1D428A", background: "#FFFFFF", color: "#FFC72C" },
  { name: "ニューヨーク・ヤンキース", sport: "MLB / アメリカ", border: "2px solid #0C2340", background: "#0C2340", color: "#FFFFFF" },
  { name: "ロサンゼルス・ドジャース", sport: "MLB / アメリカ", border: "2px solid #005A9C", background: "#FFFFFF", color: "#005A9C" },
  { name: "オールブラックキーズ / ニュージーランド代表", sport: "ラグビー / ニュージーランド", border: "2px solid #C0C0C0", background: "#000000", color: "#FFFFFF" },
  { name: "スプリングボクス / 南アフリカ代表", sport: "ラグビー / 南アフリカ", border: "2px solid #007A3D", background: "#FFFFFF", color: "#FFB81C" },
  { name: "ワラビーズ / オーストラリア代表", sport: "ラグビー / オーストラリア", border: "2px solid #006600", background: "#FFCC00", color: "#006600" },
  { name: "イングランド代表", sport: "ラグビー / イングランド", border: "2px solid #0B162A", background: "#FFFFFF", color: "#0B162A" },
  { name: "ブラジル代表", sport: "サッカー / ブラジル", border: "2px solid #009B3A", background: "#FEDF00", color: "#002776" },
  { name: "アルゼンチン代表", sport: "サッカー / アルゼンチン", border: "2px solid #75AADB", background: "#FFFFFF", color: "#000000" },
  { name: "ドイツ代表", sport: "サッカー / ドイツ", border: "2px solid #000000", background: "#FFFFFF", color: "#000000" },
  { name: "フランス代表", sport: "サッカー / フランス", border: "2px solid #002395", background: "#FFFFFF", color: "#ED2939" },
  { name: "イタリア代表", sport: "サッカー / イタリア", border: "2px solid #FFFFFF", background: "#002F6C", color: "#FFFFFF" },
  { name: "日本代表（サムライブルー）", sport: "サッカー / 日本", border: "2px solid #BC002D", background: "#002B49", color: "#FFFFFF" },
];

export default function TestYamatoPage() {
  const [activeAppType, setActiveAppType] = useState<AppType>("concierge");
  const [apiFields, setApiFields] = useState<string[]>([]);
  const [isLoadingSchema, setIsLoadingSchema] = useState<boolean>(false);

  // 💡 Supabase から動的に取得するボット設定データ
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

        {/* ⚽ セクション2：スポーツチーム配色テンプレート (独立チャットボタンサイズプレビュー) */}
        <div style={{ width: "100%", backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#0f172a", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>⚽</span> スポーツチーム配色テンプレート (チャットボタンサイズプレビュー)
          </h2>
          <p style={{ fontSize: "13px", color: "#475569", lineHeight: "1.5", marginBottom: "24px" }}>
            実際の常駐チャットボタンサイズ（<code>px-4 py-3 rounded-full text-sm</code>）で「大和ヤマト」の表示雰囲気を比較できる配色案です。
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
            {sportsColorTemplates.map((template, idx) => (
              <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "6px", backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                
                {/* 💬 実際のチャットボタンと同じカプセル型サイズ・デザインのプレビュー */}
                <div
                  style={{
                    border: template.border,
                    backgroundColor: template.background,
                    color: template.color,
                    padding: "12px 16px",
                    borderRadius: "9999px",
                    fontSize: "14px",
                    fontWeight: "bold",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
                    cursor: "default"
                  }}
                >
                  <span>🤖</span>
                  <span>大和ヤマト</span>
                </div>

                {/* 元のチーム名 & スポーツ種目 */}
                <div style={{ marginTop: "4px", width: "100%" }}>
                  <div style={{ fontSize: "13px", fontWeight: "bold", color: "#0f172a" }}>
                    {template.name}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                    {template.sport}
                  </div>
                  <div style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "monospace", marginTop: "2px" }}>
                    枠: {template.border} / 背景: {template.background} / 文字: {template.color}
                  </div>
                </div>

              </div>
            ))}
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