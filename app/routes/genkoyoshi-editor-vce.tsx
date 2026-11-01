/**
 * @file genkoyoshi-editor-vce.tsx
 * @description VCE日本語 原稿用紙エディタ ＆ AI添削（完全クリーン・型エラー解消版）
 */
import React, { useState, useEffect, useRef } from "react";
import type { LinksFunction } from "@remix-run/cloudflare";
import { useRouteLoaderData } from "@remix-run/react";
import { 
  FileText, 
  Trash2, 
  Copy, 
  Printer, 
  Sparkles, 
  BookOpen, 
  Check, 
  HelpCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import PageLayout, { PageLayoutRef } from "../components/PageLayout";
import { generateGenkoyoshiPages, calculateCharCount } from "../utils/genkoyoshi-engine";
import GenkoyoshiPreviewPane from "../components/GenkoyoshiPreviewPane";
import ChatYamatoGenkoyoshiEditorVce from "../components/ChatYamatoGenkoyoshiEditorVce";
import genkoStyles from "../styles/genkoyoshi.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: genkoStyles },
];

export default function GenkoyoshiEditorVce() {
  const rootData = useRouteLoaderData("root") as {
    user?: any;
    credits?: number;
    nickname?: string;
  } | undefined;

  const [user, setUser] = useState<any>(rootData?.user ?? null);
  const [credits, setCredits] = useState<number>(rootData?.credits ?? 10);
  const nickname = rootData?.nickname ?? "";

  const layoutRef = useRef<PageLayoutRef>(null);

  // 原稿用紙フォームステート
  const [format, setFormat] = useState<string>("400");
  const [title, setTitle] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [isClient, setIsClient] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [showFaq, setShowFaq] = useState<boolean>(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 計算エンジンからページデータと文字数を取得
  const pages = isClient ? generateGenkoyoshiPages({ text, title, name, format }) : [];
  const charCount = calculateCharCount(text);

  const handleClear = () => {
    if (window.confirm("入力内容をすべて消去しますか？")) {
      setTitle("");
      setName("");
      setText("");
    }
  };

  const handleCopy = () => {
    const parts: string[] = [];
    if (title) parts.push("【題名】" + title);
    if (name) parts.push("【氏名】" + name);
    if (text) parts.push(text);
    const fullContent = parts.join("\n\n");
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <PageLayout 
      ref={layoutRef} 
      user={user} 
      credits={credits} 
      nickname={nickname}
      breadcrumbTitle="VCE Genkoyoshi Editor"
    >
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* ヘッダーセクション */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800">
              <FileText className="w-3.5 h-3.5" />
              <span>VCE Japanese Writing Tool</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              原稿用紙エディタ (VCE仕様) 🌸
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              文字数や縦書き禁則処理を自動リアルタイム計算。VCE試験本番の原稿用紙レイアウトを忠実に再現します。
            </p>
          </div>

          {/* メインレイアウト（2カラム：エディタフォーム / プレビュー） */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* 左カラム：テキスト入力フォーム */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
              
              {/* フォーマット＆操作ボタン */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-500">用紙形式:</span>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border text-xs font-bold bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500"
                  >
                    <option value="400">400字詰め (20×20)</option>
                    <option value="200">200字詰め (20×10)</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="テキストをコピー"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-2 rounded-xl border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 transition-colors cursor-pointer"
                    title="入力内容を消去"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-colors cursor-pointer"
                    title="原稿用紙を印刷 / PDF出力"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 題名＆氏名入力欄 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">題名（1行目に配置）</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例: 私の将来の夢"
                    className="w-full px-4 py-2 rounded-xl border text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">氏名（2行目に配置）</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例: 山本 太郎"
                    className="w-full px-4 py-2 rounded-xl border text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 本文入力欄 */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-500">本文</label>
                  <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                    {charCount} 文字
                  </span>
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={14}
                  placeholder="ここに日本語の文章を入力してください。改行、句読点（。、）、鍵かっこ（「」）の原稿用紙ルールが自動適用されます..."
                  className="w-full px-4 py-3 rounded-2xl border text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 leading-relaxed font-sans"
                />
              </div>

              {/* FAQ アコーディオン */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setShowFaq(!showFaq)}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  <span className="flex items-center space-x-1.5">
                    <HelpCircle className="w-4 h-4 text-blue-600" />
                    <span>原稿用紙のルールと使い方</span>
                  </span>
                  {showFaq ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showFaq && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-xs space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed">
                    <p>📌 <strong>インデント:</strong> 段落の冒頭は自動的に1マス空けられます。</p>
                    <p>📌 <strong>禁則処理:</strong> 句読点（。、）や閉じかっこ（」）が行頭に来る場合、前の行の最後のマスに自動でぶら下げ配置されます。</p>
                    <p>📌 <strong>2桁数字:</strong> 半角の2桁数字（例: 25）は1つのマス目に横並びで配置されます。</p>
                  </div>
                )}
              </div>

            </div>

            {/* 右カラム：原稿用紙プレビュー表示（GenkoyoshiPreviewPane） */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl min-h-[600px]">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="font-extrabold text-base flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>リアルタイム原稿用紙プレビュー</span>
                </h2>
                <span className="text-xs font-medium text-slate-400">
                  {pages.length} ページ作成済み
                </span>
              </div>

              {/* モジュール化した GenkoyoshiPreviewPane の呼び出し */}
              <GenkoyoshiPreviewPane 
                pages={pages} 
                format={format} 
                totalCharCount={charCount} 
              />
            </div>

          </div>

          {/* AIチャットコンシェルジュ（ChatYamatoGenkoyoshiEditorVce） */}
          <ChatYamatoGenkoyoshiEditorVce 
            onOpenAuth={(mode) => layoutRef.current?.openAuthModal(mode || 'signup')} 
          />

        </div>
      </div>
    </PageLayout>
  );
}
