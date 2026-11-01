/**
 * @file genkoyoshi-editor-vce.tsx
 * @description VCE Japanese Genkoyoshi Editor & AI Feedback (English UI with Vertical/Horizontal Writing Toggle)
 */
import React, { useState, useEffect, useRef } from "react";
import type { LinksFunction } from "@remix-run/cloudflare";
import { useRouteLoaderData } from "@remix-run/react";
import { 
  FileText, 
  Trash2, 
  Copy, 
  Printer, 
  BookOpen, 
  Check, 
  HelpCircle, 
  Info, 
  ChevronDown, 
  ChevronUp,
  Edit3,
  AlignLeft,
  AlignJustify
} from "lucide-react";

import PageLayout, { PageLayoutRef } from "../components/PageLayout";
import ChatYamatoGenkoyoshiEditorVce from "../components/ChatYamatoGenkoyoshiEditorVce";
import GenkoyoshiPreviewPane from "../components/GenkoyoshiPreviewPane";
import { generateGenkoyoshiPages, calculateCharCount } from "../utils/genkoyoshi-engine";
import genkoStyles from "../styles/genkoyoshi.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: genkoStyles },
];

export default function GenkoyoshiEditorVCE() {
  const layoutRef = useRef<PageLayoutRef>(null);

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

  // Form & Layout States
  const [format, setFormat] = useState<string>("400"); // "400" | "200"
  const [writingMode, setWritingMode] = useState<"vertical" | "horizontal">("vertical");
  const [title, setTitle] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [isClient, setIsClient] = useState<boolean>(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const pages = isClient 
    ? generateGenkoyoshiPages({ text, title, name, format }) 
    : [];
  const charCount = calculateCharCount(text);

  const handleCopyText = async () => {
    if (!text && !title && !name) return;
    try {
      const fullContent = [title && "Title: " + title, name && "Name: " + name, text]
        .filter(Boolean)
        .join("\n\n");
      await navigator.clipboard.writeText(fullContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to clear all inputs?")) {
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
        
        {/* Header Section */}
        <div className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-red-600/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 flex items-center justify-center shadow-inner">
                <Edit3 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                  <span>VCE Genkoyoshi Essay Editor</span>
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800">
                    Genkoyoshi
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Real-time Japanese manuscript grid layout, paragraph indents, Kinsoku punctuation rules, and instant AI tutoring.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-red-600" />
              <span>Writing Guidelines</span>
              {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Guidelines Accordion */}
          {showGuide && (
            <div className="p-4 sm:p-5 rounded-2xl bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-slate-700 dark:text-slate-300 space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 font-bold text-red-900 dark:text-red-200">
                <Info className="w-4 h-4 text-red-600 shrink-0" />
                <span>VCE Japanese Genkoyoshi Rules (Automatically Handled)</span>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pl-5 list-disc text-slate-600 dark:text-slate-400">
                <li><strong>Title:</strong> Placed on Line 1 with 3 blank cells at the top.</li>
                <li><strong>Name:</strong> Placed on Line 2, right-aligned leaving 1 blank cell at the bottom.</li>
                <li><strong>Paragraph Indent:</strong> The first cell of each paragraph is automatically indented by 1 blank cell.</li>
                <li><strong>Line-Head Punctuation (Kinsoku):</strong> Punctuation (、。) and closing quotes (」) never start a line; they append to the last cell of the preceding line.</li>
                <li><strong>Two-Digit Numbers:</strong> Half-width 2-digit numbers (e.g. "25") fit side-by-side inside a single cell.</li>
              </ul>
            </div>
          )}
        </div>

        {/* Main 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Input Form */}
          <div className="lg:col-span-5 space-y-5 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="font-extrabold text-base text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-red-600" />
                <span>Essay Input & Format</span>
              </h2>

              <div className="flex flex-wrap items-center gap-2">
                {/* Paper Grid Selector */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setFormat("400")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      format === "400" 
                        ? "bg-red-600 text-white shadow-sm" 
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    400 Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat("200")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      format === "200" 
                        ? "bg-red-600 text-white shadow-sm" 
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    200 Grid
                  </button>
                </div>

                {/* Writing Direction Selector (Vertical / Horizontal) */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setWritingMode("vertical")}
                    title="Vertical Writing (縦書き)"
                    className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                      writingMode === "vertical" 
                        ? "bg-red-600 text-white shadow-sm" 
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <AlignJustify className="w-3.5 h-3.5 rotate-90" />
                    <span>Vertical</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWritingMode("horizontal")}
                    title="Horizontal Writing (横書き)"
                    className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                      writingMode === "horizontal" 
                        ? "bg-red-600 text-white shadow-sm" 
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                    <span>Horizontal</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Inputs: Title & Author Name */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Essay Title (Line 1)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 私の将来の夢 (My Future Dream)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Author Name (Line 2)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. 山田 太郎 (Taro Yamada)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
            </div>

            {/* Main Textarea */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Essay Body Text
                </label>
                <span className={`text-xs font-extrabold ${charCount > 500 ? "text-amber-600" : "text-slate-500"}`}>
                  Character Count: {charCount}
                </span>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={14}
                placeholder="Type or paste your Japanese essay here. Paragraph indents, punctuation rules, and quotes will be automatically formatted..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm leading-relaxed focus:outline-none focus:border-red-500 transition-colors resize-y font-sans"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyText}
                  disabled={!text && !title && !name}
                  className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? "Copied!" : "Copy Text"}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={!text && !title}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Genkoyoshi</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Genkoyoshi Grid Preview */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="font-extrabold text-base text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-red-600" />
                <span>Real-Time Genkoyoshi Preview</span>
              </h2>
              <span className="text-xs text-slate-400">
                {pages.length > 0 ? `${pages.length} Page(s) Generated` : ""}
              </span>
            </div>

            {/* Genkoyoshi Grid Component */}
            <GenkoyoshiPreviewPane 
              pages={pages} 
              format={format} 
              writingMode={writingMode}
              totalCharCount={charCount} 
            />
          </div>
        </div>
      </div>

      {/* AI Yamato Chat Concierge */}
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
