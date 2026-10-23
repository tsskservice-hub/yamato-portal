/**
 * @file test-yamato-note.tsx
 * @description AIヤマト・エコシステム アーキテクチャ構成表 & 詳細コラム（独立ノートページ）
 */
import type { MetaFunction } from "@remix-run/react";
import { Link, useSearchParams } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "AI Yamato アーキテクチャノート" },
    { name: "description", content: "AIヤマト・エコシステムのアーキテクチャ構成と詳細解説ノートです。" },
  ];
};

export default function TestYamatoNotePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const tokenQuery = token ? `?token=${token}` : "";

  return (
    <div style={{ backgroundColor: "#f1f5f9", minHeight: "100vh", color: "#1e293b", display: "flex", flexDirection: "column", justifyContent: "space-between", fontFamily: "sans-serif", padding: "32px" }}>
      
      <main style={{ maxWidth: "1400px", width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* ナビゲーションヘッダー */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "16px", padding: "16px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h1 style={{ fontSize: "18px", fontWeight: "bold", color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <span>📖</span> AIヤマト・エコシステム アーキテクチャノート
          </h1>
          <Link
            to={`/test-yamato${tokenQuery}`}
            style={{
              padding: "8px 16px",
              backgroundColor: "#3b82f6",
              color: "#ffffff",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: "bold",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
            }}
          >
            ← テスト画面に戻る
          </Link>
        </div>

        {/* 追加セクション：test-yamato.tsxから移動した「変えられるもの・変わらないもの」 */}
        <div style={{ width: "100%", backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#0f172a", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🔍</span> ペルソナ切替時に変わるもの・変わらないもの
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

        {/* セクション2：AIヤマト・エコシステム アーキテクチャ構成表 ＆ 詳細コラム */}
        <div style={{ width: "100%", backgroundColor: "#ffffff", color: "#1e293b", border: "1px solid #cbd5e1", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", marginBottom: "16px", borderBottom: "1px solid #e2e8f0" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "bold", color: "#1e3a8a", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <span>🚀</span> AIヤマト・エコシステム 構成表 & メタデータ (プロジェクト別詳細解説)
            </h2>
            <span style={{ fontSize: "11px", backgroundColor: "#eff6ff", color: "#1d4ed8", padding: "4px 8px", borderRadius: "6px", border: "1px solid #bfdbfe", fontWeight: "600" }}>
              Architecture Reference
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* 基本構成テーブル */}
            <table style={{ width: "100%", textAlign: "left", fontSize: "14px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#475569", backgroundColor: "#f8fafc" }}>
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

        {/* 追加セクション：YamatoChatCommon から各ヤマトを作る方法 */}
        <div style={{ width: "100%", backgroundColor: "#ffffff", color: "#1e293b", border: "1px solid #cbd5e1", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", marginBottom: "16px", borderBottom: "1px solid #e2e8f0" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "bold", color: "#0d9488", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <span>🧩</span> YamatoChatCommon から各ヤマトを作る方法（設定とロジックの分離設計）
            </h2>
            <span style={{ fontSize: "11px", backgroundColor: "#f0fdfa", color: "#0f766e", padding: "4px 8px", borderRadius: "6px", border: "1px solid #ccfbf1", fontWeight: "600" }}>
              Component Architecture
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "13px", color: "#334155", lineHeight: "1.6" }}>
            <p>
              AIヤマト・エコシステムでは、UIや通信、認証などの共通ロジックをすべて <code>YamatoChatCommon.tsx</code> に集約し、各部屋（アプリ）用のヤマトはそのラッパーとして薄いコンポーネント（例: <code>ChatYamatoConcierge.tsx</code> や <code>ChatYamatoKanjiGrammarCheckerVce.tsx</code>）を作成してページにインポートする設計をとっています。
            </p>

            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "bold", color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                <span>✨</span> 1. ラッパーコンポーネントの作成と配置
              </h3>
              <p style={{ fontSize: "12px", color: "#475569", margin: 0 }}>
                <code>YamatoChatCommon</code> をベースにして、<code>appType</code>、<code>characterName</code>、<code>initialGreeting</code>、<code>themeColor</code> などの固有のパラメータを渡すだけのシンプルなラッパーを作成し、それを各ページのファイルでそのまま配置します。
              </p>
            </div>

            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "bold", color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🔧</span> 2. 機能を削除（非表示）または追加する場合の手順
              </h3>
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#334155", display: "flex", flexDirection: "column", gap: "6px" }}>
                <li><strong>機能を削除・非表示にする場合:</strong> <code>YamatoChatCommon.tsx</code> 側で切り替え用の Props（例: <code>enableImageUpload?: boolean</code> など）を用意し、各ヤマトのラッパー側から <code>enableImageUpload={false}</code> と1行指定するだけで非表示にします。</li>
                <li><strong>固有の機能を追加する場合:</strong> <code>YamatoChatCommon.tsx</code> 側にパーツの差し込み口（スロット、例: <code>customAction?: React.ReactNode</code>）を用意しておき、各ヤマトのラッパーからそのスロットに独自のボタンやJSXを渡して拡張します。</li>
              </ul>
            </div>
          </div>
        </div>

        {/* セクション4：デバッグ手法まとめ（Workers リアルタイムログ） */}
        <div style={{ width: "100%", backgroundColor: "#ffffff", color: "#1e293b", border: "1px solid #cbd5e1", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", marginBottom: "16px", borderBottom: "1px solid #e2e8f0" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "bold", color: "#b91c1c", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <span>🛠️</span> デバッグ手法まとめ ①: Workers のリアルタイムログ (`wrangler tail`) の確認
            </h2>
            <span style={{ fontSize: "11px", backgroundColor: "#fef2f2", color: "#b91c1c", padding: "4px 8px", borderRadius: "6px", border: "1px solid #fecaca", fontWeight: "600" }}>
              Debugging Guide
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "13px", color: "#334155", lineHeight: "1.6" }}>
            <p>
              実際にブラウザからチャットや画像生成を試した際、期待どおりに動作しない場合はバックエンド側で何が起きているかをリアルタイムに把握することが不可欠です。以下の方法でエラーを特定できます。
            </p>

            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "bold", color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                <span>💻</span> 1. ローカル開発環境でのターミナル確認
              </h3>
              <p style={{ fontSize: "12px", color: "#475569", margin: 0 }}>
                ローカルで Workers を起動しているターミナル上で、API リクエスト時にコンソール出力されるエラー内容（<code>console.error</code> やスタックトレース）を直接確認します。
              </p>
            </div>

            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: "bold", color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                <span>📡</span> 2. 本番環境での `npx wrangler tail` の実行
              </h3>
              <p style={{ fontSize: "12px", color: "#475569", margin: 0 }}>
                本番デプロイ済みの Cloudflare Workers からリアルタイムにログをストリーミング受信するには、ターミナルで以下のコマンドを実行します。
              </p>
              <div style={{ fontFamily: "monospace", fontSize: "12px", backgroundColor: "#0f172a", color: "#38bdf8", padding: "10px 14px", borderRadius: "8px" }}>
                npx wrangler tail
              </div>
            </div>

            <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <h3 style={{ fontSize: "12px", fontWeight: "bold", color: "#92400e", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                <span>⚠️</span> 主に見るべきエラーの例と原因
              </h3>
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#334155", display: "flex", flexDirection: "column", gap: "6px" }}>
                <li><strong>401 Unauthorized / 403 Forbidden:</strong> APIキーやGoogle Cloudの認証情報、プロジェクト権限のミスマッチ。</li>
                <li><strong>TypeError / FetchError:</strong> 外部API（Vertex AI等）のエンドポイントURL不正や、ネットワーク接続エラー。</li>
                <li><strong>JSON.parse エラー:</strong> バックエンドからHTMLエラーページ（500 Internal Server Errorなど）が返却されている状態。</li>
              </ul>
            </div>
          </div>
        </div>

      </main>

      <footer style={{ textAlign: "center", fontSize: "12px", color: "#94a3b8", marginTop: "32px" }}>
        <p>&copy; 2026 JPTutor AI Yamato.</p>
      </footer>
    </div>
  );
}