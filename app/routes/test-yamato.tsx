/**
 * @file test-yamato.tsx
 * @description ヤマトAI 独立APIテスト画面（portalData動的インスペクション対応版）
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

// 各アプリタイプごとの設定（表示名、挨拶、テーマカラー、APIファイル名、および送信する portalData の実体）
type AppConfig = {
  name: string;
  greeting: string;
  themeColor: "emerald" | "blue" | "yellow" | "purple" | "cyan" | "orange" | "black" | "green" | "navy";
  apiSourceFile: string;
  targetAudience: string;
  // ★各ペルソナがバックエンドに渡す専用データをここで動的に定義（今後フィールドが増減してもここを変更するだけで自動追従）
  getPortalPayload: () => Record<string, any>;
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

  // ★全9ペルソナごとの設定と、バックエンド（api/src/）へ実際に送出する portalData のペイロードを関数で定義
  const appConfig: Record<AppType, AppConfig> = {
    concierge: {
      name: "やまと先生",
      greeting: "Hello, my friend! 🌟 Welcome to Yamato Portal. I'm Yamato, your portal guide. Whether you're a student, parent, or educator, how can I assist you today?",
      themeColor: "blue",
      apiSourceFile: "concierge.ts (経由: chat.ts / index.ts)",
      targetAudience: "ポータル全体の訪問者（生徒・保護者・教員）",
      getPortalPayload: () => ({
        userRole: "guest / student / educator",
        preferredLanguage: "English / Japanese",
        activePage: "Landing Page / Concierge",
      }),
    },
    "game-igo": {
      name: "囲碁ヤマト",
      greeting: "こんにちは！囲碁AIヤマトです。一局打ってみましょうか？それともルールや定石について質問しますか？",
      themeColor: "black",
      apiSourceFile: "game-igo.ts (経由: foundation.ts)",
      targetAudience: "囲碁に興味のある日本語学習者",
      getPortalPayload: () => ({
        boardSize: "5x5 mini board",
        currentMove: 0,
        playerColor: "black",
      }),
    },
    "genkoyoshi-editor-general": {
      name: "原稿用紙エディター (一般)",
      greeting: "こんにちは！一般向け原稿用紙エディターです。日本語の文章構成や推敲をサポートします。",
      themeColor: "navy",
      apiSourceFile: "genkoyoshi-editor-general.ts (経由: foundation.ts)",
      targetAudience: "一般的な日本語の文章作成・作文を行う学習者",
      getPortalPayload: () => ({
        studentEssay: "（サンプル入力中の文章データ）",
        targetLength: "400字",
        focusArea: "文体チェック・誤字脱字",
      }),
    },
    "genkoyoshi-editor-vce": {
      name: "原稿用紙エディター (VCE)",
      greeting: "Hello, my friend! 🌟 Welcome to the VCE Genkoyoshi Editor. Let's polish your Japanese essay to meet strict VCE standards.",
      themeColor: "navy",
      apiSourceFile: "genkoyoshi-editor-vce.ts (経由: foundation.ts)",
      targetAudience: "オーストラリア・ビクトリア州 VCE日本語学習者 (Years 11–12)",
      // ★ genkoyoshi-editor-vce.ts の VceGenkoyoshiPortalData 型に対応する動的ペイロード
      getPortalPayload: () => ({
        studentName: "Sample Student",
        selectedTextType: "Article / Speech",
        studentEssay: "（VCEエッセイのプレビューデータ）",
        kanjiList: "[kanji-list.json data]",
        textTypes: "[texttypes.json data]",
        grammarList: "[vce-grammar-list.ts data]",
        vocabList: "[vce-vocabulary-list.json data]",
        writingStyles: "[writing-styles.ts data]",
        u3o3Descriptor: "[vce-u3o3-descriptor.ts data]",
        u4o3Descriptor: "[vce-u4o3-descriptor.ts data]",
        eoyWrittenCriteria: "[vce-eoy-written-criteria.ts data]",
        faqList: "[FAQ Data Bank]",
        timeZone: "Australia/Melbourne",
        cityName: "Melbourne",
      }),
    },
    "eoy-oral-drill": {
      name: "EOY Oral Drill",
      greeting: "Hello, my friend! 🌟 Welcome to your EOY Oral Drill practice session! Let's sharpen your speaking skills.",
      themeColor: "yellow",
      apiSourceFile: "eoy-oral-drill.ts (経由: foundation.ts)",
      targetAudience: "VCE期末口頭試験（Oral Exam）を控える生徒",
      getPortalPayload: () => ({
        learningPace: "normal",
        sectionType: "Section 1 General Conversation",
        audioEnabled: true,
      }),
    },
    "eoy-oral-elaborate": {
      name: "EOY Oral Elaborate",
      greeting: "Hello, my friend! 🌟 Welcome to the EOY Oral Elaborate session. Let's dive deeper into your detailed study and responses.",
      themeColor: "purple",
      apiSourceFile: "eoy-oral-elaborate.ts (経由: foundation.ts)",
      targetAudience: "VCE口頭試験の詳細研究セクション対策の生徒",
      getPortalPayload: () => ({
        detailedStudyTopic: "Japanese Pop Culture & Society",
        subTheme: "Anime and Modern Ethics",
        learningPace: "accelerated",
      }),
    },
    "eoy-oral-mock": {
      name: "EOY Oral Mock Exam",
      greeting: "Hello, my friend! 🌟 Welcome to your EOY Oral Mock Exam. Ready to simulate the real exam experience?",
      themeColor: "cyan",
      apiSourceFile: "eoy-oral-mock.ts (経由: foundation.ts)",
      targetAudience: "本番さながらの模擬試験を体験したいVCE受験生",
      getPortalPayload: () => ({
        examMode: "Full Mock (Section 1 & 2)",
        examinerTone: "Strict yet encouraging VCE examiner",
        timerSeconds: 900,
      }),
    },
    "eoy-writing": {
      name: "EOY Writing Practice",
      greeting: "Hello, my friend! 🌟 Welcome to your EOY Writing practice session! Let's polish your Japanese writing skills.",
      themeColor: "orange",
      apiSourceFile: "eoy-writing.ts (経由: foundation.ts)",
      targetAudience: "VCE期末ライティング試験対策を行う生徒",
      getPortalPayload: () => ({
        promptNumber: "75",
        originalPromptsCount: 110,
        targetCriteria: "Content, Grammar, Vocabulary",
      }),
    },
    "oral-exam-questions": {
      name: "口頭試験問題ジェネレーター",
      greeting: "Hello, my friend! 🌟 Welcome to Oral Exam Questions generator. What kind of practice questions would you like to explore?",
      themeColor: "green",
      apiSourceFile: "oral-exam-questions.ts (経由: foundation.ts)",
      targetAudience: "VCE口頭試験の練習問題を作成したい生徒・教員",
      getPortalPayload: () => ({
        generatedTopicCount: 5,
        difficultyLevel: "VCE Units 3/4 Standard",
        targetSchoolContext: "Victorian Secondary Schools",
      }),
    },
  };

  const currentConfig = appConfig[activeAppType];
  const activePortalPayload = currentConfig.getPortalPayload();
  const payloadKeys = Object.keys(activePortalPayload);

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

        {/* 右側カラム：動的インスペクターパネル */}
        <div className="lg:col-span-6 bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl p-6 shadow-md">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
            <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <span>📊</span> [{currentConfig.name}] の動的データ内訳
            </h2>
            <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
              Dynamic Inspector
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* 1. API側の対応ソースファイル */}
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
              <h3 className="font-bold text-purple-400 mb-2 flex items-center gap-1.5">
                <span>⚙️</span> 1. api/src/ 側の対応ファイル
              </h3>
              <ul className="space-y-1.5 text-slate-300 list-disc list-inside leading-relaxed">
                <li>
                  <strong className="text-white">担当ペルソナモジュール:</strong> <span className="text-amber-300 font-mono">{currentConfig.apiSourceFile}</span>
                </li>
                <li>
                  <strong className="text-white">対象ユーザー層:</strong> <span className="text-slate-200">{currentConfig.targetAudience}</span>
                </li>
              </ul>
            </div>

            {/* 2. ペルソナ固有の portalData（オブジェクトのキーを動的に展開表示） */}
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
              <h3 className="font-bold text-blue-400 mb-2 flex items-center gap-1.5">
                <span>📥</span> 2. portalData 動的マッピング ({activeAppType}.ts)
              </h3>
              <p className="text-slate-400 mb-2">
                現在このペルソナに対して定義されている送信ペイロード項目（自動抽出）：
              </p>
              <div className="bg-slate-900 p-2.5 rounded border border-slate-800 font-mono text-[11px] space-y-1">
                {payloadKeys.map((key) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-amber-300 font-bold">- {key}</span>
                    <span className="text-slate-500 text-[10px]">{typeof activePortalPayload[key]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. 同時送信される共通コンテキスト概要 */}
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
              <h3 className="font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                <span>📦</span> 3. 共通ポータルデータ概要
              </h3>
              <ul className="space-y-1 text-slate-300 list-disc list-inside leading-relaxed">
                <li>価格プラン総数: <strong className="text-white">{pricePlanKeys.length} 件</strong> ({pricePlanKeys.join(', ')})</li>
                <li>クイズデータ: 本日のクイズ ＋ 全 <strong className="text-white">{DAILY_QUIZZES?.length ?? 0} 問</strong></li>
                <li>法的・サポート規約: ロード済み (<code className="text-slate-300">LEGAL_CONTENT</code>)</li>
              </ul>
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