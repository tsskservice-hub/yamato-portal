/**
 * @file test-yamato.tsx
 * @description ヤマトAI 独立APIテスト画面（全ペルソナ固有データのリアルタイム連動インスペクション対応版）
 */
import type { MetaFunction } from "@remix-run/react";
import { useSearchParams } from "@remix-run/react";
import { useState } from "react";
import { YamatoChat } from "../components/YamatoChat";
// ★価格データとクレジット消費ガイドをインポート
import { PRICE_PLANS, CREDIT_CONSUMPTION_GUIDE } from "../data/price-plans";
// ★本日のクイズ取得関数とクイズリストをインポート
import { getTodayQuiz, DAILY_QUIZZES } from "../data/quizzes";
// ★法的・サポートコンテンツデータをインポート
import { LEGAL_CONTENT } from "../data/legal-content";

export const meta: MetaFunction = () => {
  return [
    { title: "AI Yamato 独立APIテスト画面" },
    { name: "description", content: "独立APIサーバーと連携するヤマトのテストページです。" },
  ];
};

// サポートするアプリタイプの型定義（全9種類）
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

// 各アプリタイプごとの設定（表示名、挨拶、テーマカラー、ペルソナ固有の読み込みデータ詳細）
type AppConfig = {
  name: string;
  greeting: string;
  themeColor: "emerald" | "blue" | "yellow" | "purple" | "cyan" | "orange" | "black" | "green" | "navy";
  targetAudience: string;
  curriculumScope: string;
  coreMethodology: string;
  specialRules: string[];
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

  // ★全9ペルソナごとの詳細な設定と固有データを定義
  const appConfig: Record<AppType, AppConfig> = {
    concierge: {
      name: "やまと先生",
      greeting: "Hello, my friend! 🌟 Welcome to Yamato Portal. I'm Yamato, your portal guide. Whether you're a student, parent, or educator, how can I assist you today?",
      themeColor: "blue",
      targetAudience: "ポータル全体の訪問者（生徒・保護者・教員）",
      curriculumScope: "ポータル全般の機能案内・価格プラン・利用ガイド",
      coreMethodology: "フレンドリーかつ丁寧なコンシェルジュ対応",
      specialRules: [
        "ポータル共通のナビゲーションを担当",
        "価格プランやクレジット消費の仕組みを分かりやすく案内",
        "必要に応じて各学習アプリへの誘導を行う"
      ],
    },
    "game-igo": {
      name: "囲碁ヤマト",
      greeting: "こんにちは！囲碁AIヤマトです。一局打ってみましょうか？それともルールや定石について質問しますか？",
      themeColor: "black",
      targetAudience: "囲碁に興味のある日本語学習者・一般ユーザー",
      curriculumScope: "囲碁の基本ルール、定石、ミニ碁盤での対話形式プレイング",
      coreMethodology: "対話を通じた楽しく自然な囲碁の指南",
      specialRules: [
        "5路盤などのミニ碁盤でのシミュレーション対応",
        "日本語での囲碁用語（アタリ、コウ、セキなど）の解説",
        "Socraticな問いかけによる思考の促し"
      ],
    },
    "genkoyoshi-editor-general": {
      name: "原稿用紙エディター (一般)",
      greeting: "こんにちは！一般向け原稿用紙エディターです。日本語の文章構成や推敲をサポートします。",
      themeColor: "navy",
      targetAudience: "一般的な日本語の文章作成・作文を行う学習者",
      curriculumScope: "一般日本語の文章構成、表現力向上、誤字脱字チェック",
      coreMethodology: "文脈に寄り添った丁寧な推敲・アドバイス",
      specialRules: [
        "原稿用紙のマス目カウントとレイアウト補助",
        "自然な表現への書き換え提案（直接的な答えの全書き換えを避ける）",
        "語彙力と文体の一貫性のチェック"
      ],
    },
    "genkoyoshi-editor-vce": {
      name: "原稿用紙エディター (VCE)",
      greeting: "Hello, my friend! 🌟 Welcome to the VCE Genkoyoshi Editor. Let's polish your Japanese essay to meet strict VCE standards.",
      themeColor: "navy",
      targetAudience: "オーストラリア・ビクトリア州 VCE日本語学習者 (Years 11–12)",
      curriculumScope: "VCE Japanese Detailed Study / EOY Writing Standards",
      coreMethodology: "厳格なVCE基準に基づいたSocraticコーチング",
      specialRules: [
        "オーストラリア英語（UK/AU spelling: realise, colour等）の許容",
        "VCE漢字・文法ハイライトチェッカー連携",
        "直接的なエッセイの書き直しを避け、生徒自身の思考を引き出す"
      ],
    },
    "eoy-oral-drill": {
      name: "EOY Oral Drill",
      greeting: "Hello, my friend! 🌟 Welcome to your EOY Oral Drill practice session! Let's sharpen your speaking skills.",
      themeColor: "yellow",
      targetAudience: "VCE期末口頭試験（Oral Exam）を控える生徒",
      curriculumScope: "セクション1（General Conversation）および基礎受け答えドリル",
      coreMethodology: "反復練習による発話の流暢さ向上",
      specialRules: [
        "短いやり取りを通じたスピーキングの反射神経強化",
        "音声入力・音声合成を前提とした発音・イントネーションの確認",
        "シンプルな質問から徐々にステップアップ"
      ],
    },
    "eoy-oral-elaborate": {
      name: "EOY Oral Elaborate",
      greeting: "Hello, my friend! 🌟 Welcome to the EOY Oral Elaborate session. Let's dive deeper into your detailed study and responses.",
      themeColor: "purple",
      targetAudience: "VCE口頭試験の詳細研究（Detailed Study）セクション対策の生徒",
      curriculumScope: "Detailed Studyのテーマ深掘り・批判的思考力育成",
      coreMethodology: "多角的な問いかけによる議論の深化",
      specialRules: [
        "詳細研究のサブテーマに関する深い考察の引き出し",
        "論理的な説明構成と意見の正当化を促すコーチング",
        "アカデミックで自然な日本語表現のサポート"
      ],
    },
    "eoy-oral-mock": {
      name: "EOY Oral Mock Exam",
      greeting: "Hello, my friend! 🌟 Welcome to your EOY Oral Mock Exam. Ready to simulate the real exam experience?",
      themeColor: "cyan",
      targetAudience: "本番さながらの模擬試験を体験したいVCE受験生",
      curriculumScope: "VCE Oral Exam 本番形式（Section 1 & Section 2通し）のシミュレーション",
      coreMethodology: "本番同様の緊張感を持つ厳格かつ温かい試験官モード",
      specialRules: [
        "実際の試験形式に準拠したロールプレイ進行",
        "試験後の詳細なフィードバックと改善ポイントの提示",
        "タイムマネジメントと受け答えのトーンの調整"
      ],
    },
    "eoy-writing": {
      name: "EOY Writing Practice",
      greeting: "Hello, my friend! 🌟 Welcome to your EOY Writing practice session! Let's polish your Japanese writing skills.",
      themeColor: "orange",
      targetAudience: "VCE期末ライティング試験対策を行う生徒",
      curriculumScope: "VCE Writing Exam 過去問および110オリジナルプロンプト対応",
      coreMethodology: "段階的な構成チェックと自己修正の誘導",
      specialRules: [
        "原稿用紙レイアウトと文字数制限の厳守",
        "構成（序論・本論・結論）の論理性チェック",
        "VCE特有の評価基準（Criteria）に基づいたアドバイス"
      ],
    },
    "oral-exam-questions": {
      name: "口頭試験問題ジェネレーター",
      greeting: "Hello, my friend! 🌟 Welcome to Oral Exam Questions generator. What kind of practice questions would you like to explore?",
      themeColor: "green",
      targetAudience: "VCE口頭試験の練習問題を作成したい生徒・教員",
      curriculumScope: "多岐にわたるトピックに基づく口頭試験用質問の自動生成・カスタマイズ",
      coreMethodology: "学習者の習熟度に応じたカスタム質問の提示",
      specialRules: [
        "学習者の興味や学習進度に合わせた個別最適化された質問の作成",
        "質問の意図や回答のポイントの解説付与",
        "オーストラリアの学校現場の文脈に配慮したトピック選定"
      ],
    },
  };

  const currentConfig = appConfig[activeAppType];

  // ★ポータルデータ（価格プラン、消費ガイド、本日のクイズ、法的データ）を定義
  const portalContextData = {
    pricePlans: PRICE_PLANS,
    creditGuide: CREDIT_CONSUMPTION_GUIDE,
    todayQuiz: getTodayQuiz(),     // 本日の日付に対応するクイズデータを渡す
    allQuizzes: DAILY_QUIZZES,     // 全クイズデータ
    legalContent: LEGAL_CONTENT,   // 利用規約・免責・プライバシー・連絡先の全データを渡す
  };

  const todayQuiz = getTodayQuiz() as any;
  const pricePlanKeys = PRICE_PLANS ? Object.keys(PRICE_PLANS) : [];

  return (
    <div className="bg-slate-100 min-h-screen text-slate-800 flex flex-col justify-between font-sans relative p-6 lg:p-10">
      {/* メインコンテンツ（左右2カラムレイアウト） */}
      <main className="max-w-7xl mx-auto w-full my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* 左側カラム：ヤマトAI 独立APIテスト画面（切り替えパネル） */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <span>🇯🇵</span> ヤマト AI 独立APIテスト
          </h1>
          <p className="text-slate-600 text-xs leading-relaxed mb-6">
            右下のチャット窓、または以下のセクション別ボタンから各ペルソナの動作テストを行えます。
          </p>

          <div className="space-y-4 text-left">
            {/* 共通コンシェルジュ */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">📌 ポータル共通</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveAppType("concierge")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                    activeAppType === "concierge" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  👋 LP Concierge (青)
                </button>
              </div>
            </div>

            {/* 🌍 Section 1: 全世界対応 (Global & General) */}
            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-200">
              <h2 className="text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>🌍</span> Section 1: 全世界対応
              </h2>
              <div className="flex flex-wrap gap-2">
                {(["genkoyoshi-editor-general", "game-igo"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveAppType(type)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                      activeAppType === type ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {type === "genkoyoshi-editor-general" && "📄 原稿用紙 (一般)"}
                    {type === "game-igo" && "⚪ 囲碁ヤマト"}
                  </button>
                ))}
              </div>
            </div>

            {/* 🇦🇺🦘 Section 2: オーストラリア・ビクトリア州対応 (Victorian Curriculum & VCE) */}
            <div className="bg-red-50/50 p-3 rounded-xl border border-red-200">
              <h2 className="text-[11px] font-bold text-red-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>🇦🇺🦘</span> Section 2: VCE / オーストラリア
              </h2>
              <div className="flex flex-wrap gap-2">
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
                    onClick={() => setActiveAppType(type)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                      activeAppType === type ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
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

          <div className="mt-6 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
            <span>Selected: <strong className="text-slate-800">{currentConfig.name}</strong></span>
            <span className="font-mono bg-slate-200 px-2 py-0.5 rounded text-[11px] text-slate-700">{activeAppType}</span>
          </div>
        </div>

        {/* 右側カラム：選択中ペルソナ固有データおよびポータル共通データの可視化パネル */}
        <div className="lg:col-span-6 bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
            <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <span>📊</span> [{currentConfig.name}] の読み込みデータ構成
            </h2>
            <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
              Persona Inspector
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* 1. 現在選択中のアプリ・ペルソナ固有設定 */}
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
              <h3 className="font-bold text-blue-400 mb-2 flex items-center gap-1.5">
                <span>👤</span> 1. ペルソナ固有の定義・指導方針 (<code className="text-slate-300">{activeAppType}</code>)
              </h3>
              <ul className="space-y-1.5 text-slate-300 list-disc list-inside leading-relaxed">
                <li>
                  <strong className="text-white">対象ユーザー層:</strong> <span className="text-amber-300">{currentConfig.targetAudience}</span>
                </li>
                <li>
                  <strong className="text-white">カリキュラム範囲:</strong> <span className="text-slate-200">{currentConfig.curriculumScope}</span>
                </li>
                <li>
                  <strong className="text-white">指導メソッド:</strong> <span className="text-slate-200">{currentConfig.coreMethodology}</span>
                </li>
                <li>
                  <strong className="text-white">テーマカラー:</strong> <span className="text-amber-300">{currentConfig.themeColor}</span>
                </li>
                <li>
                  <strong className="text-white">初期挨拶:</strong> <span className="text-slate-400 italic">"{currentConfig.greeting}"</span>
                </li>
              </ul>
              <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                <p className="font-semibold text-slate-400 mb-1">個別指導ルール (Special Rules):</p>
                <ul className="space-y-1 text-slate-300 list-disc list-inside">
                  {currentConfig.specialRules.map((rule, idx) => (
                    <li key={idx}>{rule}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 2. 価格プランデータ */}
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
              <h3 className="font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                <span>💳</span> 2. 価格プランデータ (<code className="text-slate-300">PRICE_PLANS</code>)
              </h3>
              <p className="text-slate-300 leading-relaxed mb-1.5">
                定義プラン数: <strong className="text-white">{pricePlanKeys.length} 件</strong> の料金体系データがロードされています。
              </p>
              <div className="text-[11px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800 font-mono">
                {pricePlanKeys.map((key) => (
                  <div key={key} className="truncate">
                    - プランキー: <span className="text-amber-300">{key}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. クレジット消費ガイド */}
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
              <h3 className="font-bold text-purple-400 mb-2 flex items-center gap-1.5">
                <span>⚡</span> 3. クレジット消費ガイド (<code className="text-slate-300">CREDIT_CONSUMPTION_GUIDE</code>)
              </h3>
              <p className="text-slate-300 leading-relaxed">
                AI機能利用時（チャット、原稿用紙推敲、音声生成など）のクレジット消化ルール一覧データがロードされています。
              </p>
            </div>

            {/* 4. 本日のクイズ・全クイズ */}
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
              <h3 className="font-bold text-yellow-400 mb-2 flex items-center gap-1.5">
                <span>🧠</span> 4. クイズデータ (<code className="text-slate-300">todayQuiz / DAILY_QUIZZES</code>)
              </h3>
              <ul className="space-y-1.5 text-slate-300 list-disc list-inside leading-relaxed">
                <li>
                  <strong className="text-white">本日のクイズ:</strong>{" "}
                  {todayQuiz ? <span className="text-amber-300">"{todayQuiz.question || todayQuiz.title || '取得成功'}"</span> : <span className="text-slate-400">データなし</span>}
                </li>
                <li>
                  <strong className="text-white">全クイズリスト数:</strong> <span className="text-white">{DAILY_QUIZZES?.length ?? 0} 問</span> がロードされています。
                </li>
              </ul>
            </div>

            {/* 5. 法的・サポート情報 */}
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
              <h3 className="font-bold text-cyan-400 mb-2 flex items-center gap-1.5">
                <span>📜</span> 5. 法的・サポート情報 (<code className="text-slate-300">LEGAL_CONTENT</code>)
              </h3>
              <p className="text-slate-300 leading-relaxed">
                利用規約、免責事項、プライバシーポリシー、連絡先などの公式文書データがロードされています。
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* YamatoChat に設定とデータを渡す */}
      <YamatoChat 
        appType={activeAppType}
        characterName={currentConfig.name}
        initialGreeting={currentConfig.greeting}
        themeColor={currentConfig.themeColor as any}
        defaultOpen={false}
        additionalContext={portalContextData}
      />

      <footer className="text-center text-xs text-slate-400 mt-8">
        <p>&copy; 2026 JPTutor AI Yamato.</p>
      </footer>
    </div>
  );
}