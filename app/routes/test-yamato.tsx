/**
 * @file test-yamato.tsx
 * @description ヤマトAI 独立APIテスト画面（Action経由Cookieセッション同期・ToolPageWrapper統合版）
 */

import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { Link, useFetcher } from "@remix-run/react";
import { useState, useEffect, useRef } from "react";
import { YamatoChatCommon } from "../components/YamatoChatCommon";
import { fetchYamatoConfigsData, YamatoConfigsData, AppType } from "../data/yamato-configs";
import { supabase } from "../lib/supabaseClient";
import { createServerSupabaseClient } from "../lib/supabase.server";
import { ToolPageWrapper } from "../components/ToolPageWrapper";
import type { PageLayoutRef } from "../components/PageLayout";
import { generateModuleMeta } from "../utils/seoMeta";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  let portalContent = null;
  try {
    const { data: portalData } = await supabase
      .from('portal_settings')
      .select('content')
      .eq('key', 'PORTAL_CONTENT')
      .single();
    portalContent = portalData?.content || null;
  } catch (e) {}

  return json({
    portalContent,
    currentPath: url.pathname,
  });
}

// 💡 サーバーサイドでログイン・ログアウト処理を実行し、Cookieセッションを確実に確立・破棄する Action
export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  
  // サーバーサイドSupabaseクライアント（Cookieの送受信に対応）
  const { supabase: serverSupabase, headers } = createServerSupabaseClient(request, context);

  if (intent === "logout") {
    await serverSupabase.auth.signOut();
    return json({ success: true }, { headers });
  }

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return json({ success: false, error: "メールアドレスとパスワードを入力してください。" }, { status: 400 });
  }

  const { error } = await serverSupabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return json({ success: false, error: error.message }, { status: 400 });
  }

  // 💡 認証成功時に Supabase が生成したセッションCookieヘッダーを返却
  return json({ success: true }, { headers });
}

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta(data?.portalContent || null, data?.currentPath || '');
};

export default function TestYamatoPage() {
  const layoutRef = useRef<PageLayoutRef>(null);
  const fetcher = useFetcher<any>(); // 💡 サーバーActionを呼び出すためのRemix fetcher

  const [activeAppType, setActiveAppType] = useState<AppType>("concierge");
  const [apiFields, setApiFields] = useState<string[]>([]);
  const [isLoadingSchema, setIsLoadingSchema] = useState<boolean>(false);

  // 💡 Supabase から動的に取得するボット設定データ
  const [yamatoConfigs, setYamatoConfigs] = useState<YamatoConfigsData | null>(null);
  const [isConfigLoading, setIsConfigLoading] = useState<boolean>(true);

  // 💡 デバッグログイン用の状態管理
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [debugEmail, setDebugEmail] = useState("preview@jptutoraiyamato.com");
  const [debugPassword, setDebugPassword] = useState("123test");
  const [debugStatus, setDebugStatus] = useState("");

  // 💡 現在のログインセッション状態を監視
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 💡 fetcher の完了を監視し、成功したらページをリロードしてサーバーセッションを反映
  useEffect(() => {
    if (fetcher.data?.success) {
      setDebugStatus("✅ 認証成功！セッションを反映しています...");
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } else if (fetcher.data?.error) {
      setDebugStatus(`❌ 認証失敗: ${fetcher.data.error}`);
    }
  }, [fetcher.data]);

  const isLoggingIn = fetcher.state !== "idle";

  // 💡 サーバー Action を経由した直接ログイン実行関数
  const handleDirectLogin = (email: string, pass: string) => {
    setDebugEmail(email);
    setDebugPassword(pass);
    setDebugStatus(`${email} でログイン処理中...`);

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", pass);
    fetcher.submit(formData, { method: "POST" });
  };

  // 💡 フォーム送信によるデバッグログイン実行関数
  const handleDebugLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debugPassword) {
      setDebugStatus("⚠️ パスワードを入力してください。");
      return;
    }
    handleDirectLogin(debugEmail, debugPassword);
  };

  // 💡 サーバー Action を経由したログアウト実行関数
  const handleDebugLogout = () => {
    setDebugStatus("🔒 ログアウト処理中...");
    const formData = new FormData();
    formData.append("intent", "logout");
    fetcher.submit(formData, { method: "POST" });
  };

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
    <ToolPageWrapper layoutRef={layoutRef} breadcrumbTitle="API Test Dashboard">
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

          {/* 🧪 プレビュー環境用デバッグログインパネル */}
          <div style={{ backgroundColor: "#ffffff", border: "2px dashed #f59e0b", borderRadius: "16px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h2 style={{ fontSize: "15px", fontWeight: "bold", color: "#b45309", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>🧪</span> プレビュー環境用デバッグログイン (パスキーバイパス・Action同期版)
            </h2>
            <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "14px" }}>
              Remix Action経由でサーバークッキーにセッションを保存するため、リロード後もルートローダーがログイン状態・教師権限を正しく認識します。
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "13px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>現在の状態:</span>
                {currentUser ? (
                  <span style={{ color: "#16a34a", backgroundColor: "#dcfce7", padding: "2px 8px", borderRadius: "6px", fontSize: "12px" }}>
                    🟢 ログイン中 ({currentUser.email})
                  </span>
                ) : (
                  <span style={{ color: "#dc2626", backgroundColor: "#fee2e2", padding: "2px 8px", borderRadius: "6px", fontSize: "12px" }}>
                    🔴 未ログイン (ゲスト状態)
                  </span>
                )}
              </div>

              {/* 💡 クイックアカウント（ワンタップ直接ログイン）ボタン */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "12px", fontWeight: "bold", color: "#475569" }}>クイックテストアカウント:</span>
                <button
                  type="button"
                  onClick={() => handleDirectLogin("preview@jptutoraiyamato.com", "123test")}
                  disabled={isLoggingIn}
                  style={{ padding: "6px 12px", borderRadius: "8px", backgroundColor: "#fef3c7", border: "1px solid #f59e0b", color: "#92400e", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
                >
                  🎓 生徒用 (preview@jptutoraiyamato.com)
                </button>
                <button
                  type="button"
                  onClick={() => handleDirectLogin("sample@jptutoraiyamato.com", "abcd1234")}
                  disabled={isLoggingIn}
                  style={{ padding: "6px 12px", borderRadius: "8px", backgroundColor: "#e0e7ff", border: "1px solid #6366f1", color: "#3730a3", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
                >
                  👨‍🏫 先生用 (sample@jptutoraiyamato.com)
                </button>
              </div>

              {!currentUser ? (
                <form onSubmit={handleDebugLogin} style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                  <input
                    type="email"
                    value={debugEmail}
                    onChange={(e) => setDebugEmail(e.target.value)}
                    placeholder="Email"
                    style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12px", width: "240px" }}
                  />
                  <input
                    type="password"
                    value={debugPassword}
                    onChange={(e) => setDebugPassword(e.target.value)}
                    placeholder="パスワードを入力"
                    style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12px", width: "160px" }}
                  />
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    style={{ padding: "8px 16px", backgroundColor: "#f59e0b", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "12px", cursor: "pointer" }}
                  >
                    {isLoggingIn ? "ログイン中..." : "🚀 テストログイン実行"}
                  </button>
                </form>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={handleDebugLogout}
                    disabled={isLoggingIn}
                    style={{ padding: "8px 16px", backgroundColor: "#ef4444", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "12px", cursor: "pointer" }}
                  >
                    🔒 ログアウトする
                  </button>
                </div>
              )}

              {debugStatus && (
                <div style={{ fontSize: "12px", fontFamily: "monospace", color: "#334155", backgroundColor: "#f8fafc", padding: "8px 12px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                  {debugStatus}
                </div>
              )}
            </div>
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
    </ToolPageWrapper>
  );
}