/**
 * @file genkoyoshi-editor-vce.tsx
 * @description VCE Japanese Genkoyoshi Editor & AI Feedback (English UI, Horizontal Default, GenkoyoshiModal)
 */
import { json, type LinksFunction, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { useRouteLoaderData } from "@remix-run/react";
import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, 
  Trash2, 
  Copy, 
  Printer, 
  Sparkles, 
  BookOpen, 
  Check, 
  HelpCircle,
  RotateCcw,
  Edit3,
  AlignLeft,
  AlignJustify
} from "lucide-react";

import { ToolPageWrapper } from '~/components/ToolPageWrapper';
import PageLayout, { type PageLayoutRef } from '~/components/PageLayout';
import ChatYamatoGenkoyoshiEditorVce from '~/components/chat/ChatYamatoGenkoyoshiEditorVce';
import GenkoyoshiPreviewPane from '~/components/GenkoyoshiPreviewPane';
import GenkoyoshiModal from '~/components/GenkoyoshiModal';
import { generateGenkoyoshiPages, calculateCharCount } from '~/utils/genkoyoshi-engine';
import genkoStyles from '~/styles/genkoyoshi.css?url';
import { generateModuleMeta } from '~/utils/seoMeta';
import { supabase } from '~/lib/supabaseClient';

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: genkoStyles },
];

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

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta(data?.portalContent || null, data?.currentPath || "");
};

export default function GenkoyoshiEditorVce() {
  const layoutRef = useRef<PageLayoutRef>(null);

  const rootData = useRouteLoaderData("root") as {
    user?: any;
    credits?: number;
    nickname?: string;
    learningPace?: "steady" | "normal" | "accelerated";
  } | undefined;

  const user = rootData?.user ?? null;
  const credits = rootData?.credits ?? 10;
  const nickname = rootData?.nickname ?? "";
  const learningPace = rootData?.learningPace ?? "normal";

  // Form states
  const [format, setFormat] = useState<string>("400"); // "400" | "200"
  const [writingMode, setWritingMode] = useState<"vertical" | "horizontal">("horizontal"); // Default: horizontal
  const [title, setTitle] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [isClient, setIsClient] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const pages = isClient ? generateGenkoyoshiPages({ text, title, name, format }) : [];
  const charCount = calculateCharCount(text);

  const handleCopyText = async () => {
    if (!text) return;
    try {
      const fullContent = [title && `[Title] ${title}`, name && `[Name] ${name}`, text].filter(Boolean).join("\n\n");
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
    <ToolPageWrapper layoutRef={layoutRef}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header Section */}
          <div className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-red-600/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 flex items-center justify-center shadow-inner">
                  <Edit3 className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                    <span>VCE Japanese Genkoyoshi Editor</span>
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800">
                      Genkoyoshi
                    </span>
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Automatic character counts, line wrap rules, and instant AI tutor feedback for VCE writing tasks.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <HelpCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Writing Guidelines</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column / Essay Input Form */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
              
              {/* Form Options Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                
                {/* Format Selection */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-500">Grid:</span>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border text-xs font-bold bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none focus:border-red-500"
                  >
                    <option value="400">400 Squares (20×20)</option>
                    <option value="200">200 Squares (20×10)</option>
                  </select>
                </div>

                {/* Direction Toggle */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-500">Direction:</span>
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setWritingMode("horizontal")}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        writingMode === "horizontal"
                          ? "bg-red-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                      title="Horizontal Writing Mode"
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                      <span>Horizontal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWritingMode("vertical")}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        writingMode === "vertical"
                          ? "bg-red-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                      title="Vertical Writing Mode"
                    >
                      <AlignJustify className="w-3.5 h-3.5" />
                      <span>Vertical</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Title & Name Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Title (Line 1)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. 私の将来の夢"
                    className="w-full px-4 py-2.5 rounded-xl border text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:border-red-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Author Name (Line 2)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. 山本 太郎"
                    className="w-full px-4 py-2.5 rounded-xl border text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:border-red-500 transition-colors"
                  />
                </div>
              </div>

              {/* Main Essay Text Area */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-500">
                    Essay Text
                  </label>
                  <span className={`text-xs font-mono font-bold ${charCount > 500 ? "text-amber-600" : "text-slate-500"}`}>
                    Character Count: {charCount}
                  </span>
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={14}
                  placeholder="Type or paste your Japanese essay here. Paragraph indentation, punctuation rules, and number pairs will be formatted automatically..."
                  className="w-full px-4 py-3 rounded-2xl border text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:border-red-500 leading-relaxed font-sans"
                />
              </div>

              {/* Form Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyText}
                    disabled={!text}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
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

            {/* Right Column / Real-time Genkoyoshi Grid Preview */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xl min-h-[600px]">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="font-extrabold text-base flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-red-600" />
                  <span>Real-time Genkoyoshi Preview</span>
                </h2>
                <span className="text-xs font-medium text-slate-400">
                  {pages.length > 0 ? `Total Pages: ${pages.length}` : ""}
                </span>
              </div>

              {/* Genkoyoshi Preview Grid */}
              <GenkoyoshiPreviewPane 
                pages={pages} 
                format={format} 
                writingMode={writingMode}
                totalCharCount={charCount} 
              />
            </div>

          </div>

          {/* AI Tutor Chat Widget */}
          <ChatYamatoGenkoyoshiEditorVce 
            initialLearningPace={learningPace}
            userId={user?.id}
            userNickname={nickname}
            credits={credits}
            onOpenAuth={(mode) => layoutRef.current?.openAuthModal(mode || 'signup')} 
          />

        </div>
      </div>

      {/* Writing Guidelines Modal */}
      <GenkoyoshiModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </ToolPageWrapper>
  );
}
