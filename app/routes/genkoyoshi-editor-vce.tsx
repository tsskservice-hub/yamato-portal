/**
 * @file genkoyoshi-editor-vce.tsx
 * @description VCE日本語 原稿用紙エディター ＆ 即時AI添削（モジュール分割・CSS分離・ScrollTop共通化対応版）
 */
import React, { useState, useEffect, useRef } from "react";
import type { LinksFunction } from "@remix-run/cloudflare";
import { useRouteLoaderData } from "@remix-run/react";
import { 
  FileText, 
  Sparkles, 
  Printer, 
  RotateCcw, 
  Copy, 
  Check, 
  HelpCircle, 
  Info, 
  ChevronDown, 
  ChevronUp,
  BookOpen,
  Edit3
} from "lucide-react";

import PageLayout, { PageLayoutRef } from "../components/PageLayout";
import ChatYamatoGenkoyoshiEditorVce from "../components/ChatYamatoGenkoyoshiEditorVce";
import GenkoyoshiPreviewPane from "../components/GenkoyoshiPreviewPane";
import { generateGenkoyoshiPages, calculateCharCount } from "../utils/genkoyoshi-engine";
import genkoStyles from "../styles/genkoyoshi.css";

// CSSの分離・リンクエクスポート
export const links: LinksFunction = () => [
  { rel: "stylesheet", href: genkoStyles },
];

export default function GenkoyoshiEditorVCE() {
  const layoutRef = useRef<PageLayoutRef>(null);

  // root.tsx loader からユーザー情報の取得
  const rootData = useRouteLoaderData("root") as {
    user?: any;
    nickname?: string;
    credits?: number;
    learningPace?: "steady" | "normal" | "accelerated";
  } | undefined;

  const user = rootData?.user ?? null;
  const credits = rootData?.credits ?? 10;
  const nickname = rootData?.nickname ?? "";
  const learningPace = rootData?.learningPace ?? "normal";

  // エディタのステート管理
  const [format, setFormat] = useState<string>("400"); // "400" | "200"
  const [title, setTitle] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [isClient, setIsClient] = useState<boolean>(false);

  // クライアントハイドレーション対応
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 原稿用紙ページの自動計算（genkoyoshi-engine モジュール利用）
  const pages = isClient 
    ? generateGenkoyoshiPages({ text, title, name, format }) 
    : [];
  const charCount = calculateCharCount(text);

  // テキストコピー処理
  const handleCopyText = async () => {
    if (!text) return;
    try {
      const fullContent = `${title ? title + "\n" : ""}${name ? name + "\n" : ""}${text}`;
      await navigator.clipboard.writeText(fullContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  // 印刷処理
  const handlePrint = () => {
    window.print();
  };

  // フォームクリア処理
  const handleReset = () => {
    if (window.confirm("入力した内容をすべてクリアしますか？")) {
      setTitle("");
      setName("");
      setText("");
    }
  };

  return (
    <PageLayout
      ref={layoutRef}
      user={user}
      credits={credits}
      nickname={nickname}
      breadcrumbTitle="Genkoyoshi Editor (VCE)"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* 1. ページヘッダー ＆ VCEガイド案内 */}
        <div className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-red-600/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 flex items-center justify-center shadow-inner">
                <Edit3 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                  <span>VCE 日本語 原稿用紙エディター</span>
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800">
                    Genkoyoshi
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  原稿用紙ルール（インデント・行末ぶら下げ禁則処理・数字1マス納め）に自動対応。AIヤマトによるVCE即時添削も可能！
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-red-600" />
                <span>原稿用紙ルールガイド</span>
                {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* ルールガイド（アコーディオン） */}
          {showGuide && (
            <div className="p-4 sm:p-5 rounded-2xl bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-slate-700 dark:text-slate-300 space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 font-bold text-red-900 dark:text-red-200">
                <Info className="w-4 h-4 text-red-600 shrink-0" />
                <span>VCE試験での原稿用紙記入ルール（自動処理機能）</span>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pl-5 list-disc text-slate-600 dark:text-slate-400">
                <li><strong>タイトル:</strong> 1行目の上3マスを空けて記入します。</li>
                <li><strong>氏名:</strong> 2行目の下に1マス空けて収まるように右揃えで配置します。</li>
                <li><strong>段落頭:</strong> 各段落の書き始め（1文字目）は1マス空けます。</li>
                <li><strong>行末ぶら下げ（禁則）:</strong> 句読点（、。）や閉じ括弧が次の行の最初に来ないよう、前の行の最後のマスに自動で一緒にまとめます。</li>
                <li><strong>2桁数字:</strong> 2桁の半角数字（例: 25）は1マスにまとめて配置されます。</li>
              </ul>
            </div>
          )}
        </div>

        {/* 2. メインレイアウト（入力エリア ＆ プレビューエリア） */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* 左側 / 入力フォーム (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-5 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="font-extrabold text-base text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-red-600" />
                <span>作文入力</span>
              </h2>

              {/* 格式切り替え（400字詰 / 200字詰） */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFormat("400")}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    format === "400" 
                      ? "bg-red-600 text-white shadow-sm" 
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  400字詰
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("200")}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    format === "200" 
                      ? "bg-red-600 text-white shadow-sm" 
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  200字詰
                </button>
              </div>
            </div>

            {/* タイトル ＆ 氏名入力 */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  題名（タイトル）
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例: 私の将来の夢"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  名前（氏名）
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: 山田 太郎"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
            </div>

            {/* 本文エリア */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                  本文
                </label>
                <span className={`text-xs font-extrabold ${charCount > 500 ? "text-amber-600" : "text-slate-500"}`}>
                  文字数: {charCount} 字
                </span>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={14}
                placeholder="ここに本文を入力してください。改行を入れると自動で次の段落の頭が1マス空きます..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm leading-relaxed focus:outline-none focus:border-red-500 transition-colors resize-y font-mono"
              />
            </div>

            {/* 操作ボタンエリア */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>クリア</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyText}
                  disabled={!text}
                  className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? "コピー完了" : "コピー"}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={!text && !title}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>原稿用紙を印刷</span>
                </button>
              </div>
            </div>
          </div>

          {/* 右側 / 原稿用紙プレビュー領域 (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="font-extrabold text-base text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-red-600" />
                <span>リアルタイム 原稿用紙プレビュー</span>
              </h2>
              <span className="text-xs text-slate-400">
                {pages.length > 0 ? `全 ${pages.length} ページ` : ""}
              </span>
            </div>

            {/* 原稿用紙プレビューコンポーネント (GenkoyoshiPreviewPane モジュール) */}
            <GenkoyoshiPreviewPane 
              pages={pages} 
              format={format} 
              totalCharCount={charCount} 
            />
          </div>
        </div>
      </div>

      {/* 3. AIヤマト添削チャットウィジェット（完全カプセル化コンポーネント） */}
      <ChatYamatoGenkoyoshiEditorVce
        initialLearningPace={learningPace}
        userId={user?.id}
        userNickname={nickname}
        credits={credits}
        onOpenAuth={(mode) => layoutRef.current?.openAuthModal(mode || 'signup')}
      />
    </PageLayout>
  );
}