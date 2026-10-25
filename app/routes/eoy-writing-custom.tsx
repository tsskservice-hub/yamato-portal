/**
 * @file eoy-writing-custom.tsx
 * @description 外部教材・過去問持ち込み型 Custom EOY Writing Practice モジュール（複数画像・OCR完全連動版）
 */
import { useState, useEffect, useRef } from "react";
import { Link, useRouteLoaderData } from "@remix-run/react";
import TextTypeModal from "../components/TextTypeModal";
import PageLayout, { PageLayoutRef } from "../components/PageLayout";
import ChatYamatoEoyWritingCustom from "../components/ChatYamatoEoyWritingCustom";

import TEXT_TYPES_DATA, { fetchTextTypesData, TextTypesData } from "../data/texttypes";
import { supabase } from "../lib/supabaseClient";

// 💡 原稿用紙ガイドのフォールバックデータ
const DEFAULT_GENKOYOSHI_DATA = {
  title: "Genkoyoshi Usage Guide (原稿用紙の使い方)",
  purpose: "This guide outlines the general rules for formatting titles, names, main text, and square usage on genkoyoshi. Refer to each text type for details.",
  structure: [
    "Title (Line 1): Leave 3 spaces at the beginning, then write the title",
    "Name (Line 2): Write at the end, leaving the last square blank",
    "Main Text: Indent 1 space at the beginning of each paragraph",
    "Square Usage: Place punctuation marks (、。) in their own square. Never start a line with punctuation."
  ],
  sampleImage: "/genkoyoshi.pdf"
};

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
}

export default function CustomDashboard() {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  
  // 💡 TEXTTYPES データをステートで管理（Supabaseからの動的取得に対応）
  const [modalData, setModalData] = useState<TextTypesData>({
    ...TEXT_TYPES_DATA,
    Genkoyoshi: DEFAULT_GENKOYOSHI_DATA,
    Genkooyooshi: DEFAULT_GENKOYOSHI_DATA,
  });

  const rootData = useRouteLoaderData("root") as {
    user?: any;
    credits?: number;
    nickname?: string;
  } | undefined;

  const user = rootData?.user ?? null;
  const credits = rootData?.credits ?? 10;
  const nickname = rootData?.nickname ?? "";

  const layoutRef = useRef<PageLayoutRef>(null);
  const questionFileInputRef = useRef<HTMLInputElement>(null);
  const answerFileInputRef = useRef<HTMLInputElement>(null);

  const [selectedQuestionText, setSelectedQuestionText] = useState<string>("");
  const [questionImages, setQuestionImages] = useState<UploadedImage[]>([]);
  const [answerImages, setAnswerImages] = useState<UploadedImage[]>([]);
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Custom Practice | VCE EOY Exam Writing Tutor";
  }, []);

  // 💡 ページ表示時に Supabase から TEXTTYPES データを非同期フェッチ
  useEffect(() => {
    let isMounted = true;

    async function loadDataFromSupabase() {
      try {
        const fetchedTextTypes = await fetchTextTypesData(supabase);
        if (isMounted && fetchedTextTypes && typeof fetchedTextTypes === "object" && Object.keys(fetchedTextTypes).length > 0) {
          setModalData((prev) => ({
            ...prev,
            ...fetchedTextTypes,
            Genkoyoshi: fetchedTextTypes["Genkoyoshi"] || fetchedTextTypes["Genkooyooshi"] || prev["Genkoyoshi"] || DEFAULT_GENKOYOSHI_DATA,
            Genkooyooshi: fetchedTextTypes["Genkoyoshi"] || fetchedTextTypes["Genkooyooshi"] || prev["Genkooyooshi"] || DEFAULT_GENKOYOSHI_DATA,
          }));
        }
      } catch (err) {
        console.error("Failed to load text types from Supabase:", err);
      }
    }

    loadDataFromSupabase();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleQuestionImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newObj: UploadedImage = {
          id: Math.random().toString(36).substring(2, 9),
          file,
          preview: reader.result as string,
        };
        setQuestionImages((prev) => [...prev, newObj]);
      };
      reader.readAsDataURL(file);
    });

    if (questionFileInputRef.current) questionFileInputRef.current.value = "";
  };

  const handleAnswerImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newObj: UploadedImage = {
          id: Math.random().toString(36).substring(2, 9),
          file,
          preview: reader.result as string,
        };
        setAnswerImages((prev) => [...prev, newObj]);
      };
      reader.readAsDataURL(file);
    });

    if (answerFileInputRef.current) answerFileInputRef.current.value = "";
  };

  // 💡 テキストまたは問題画像の状態に応じて確実な assignedQuestion 文字列を生成
  const assignedQuestionText = selectedQuestionText.trim()
    ? `Custom Prompt: ${selectedQuestionText}`
    : questionImages.length > 0
    ? `[External Question Images Attached for AI OCR (${questionImages.length} page(s))]`
    : "";

  const currentSystemPrompt = assignedQuestionText
    ? `[Custom External Exam / Textbook Writing Task]\nDetails: ${assignedQuestionText}`
    : "";

  // 💡 TextType モーダル用データの堅牢な解決
  const activeModalData = activeModal
    ? modalData[activeModal] ||
      (activeModal === "Genkoyoshi" ? modalData["Genkooyooshi"] || DEFAULT_GENKOYOSHI_DATA : null) ||
      (activeModal === "Genkooyooshi" ? modalData["Genkoyoshi"] || DEFAULT_GENKOYOSHI_DATA : null)
    : null;

  return (
    <PageLayout ref={layoutRef} breadcrumbTitle="Custom Practice (External / Past Exams)">
      <div className="min-h-screen bg-white text-slate-800 font-sans relative">
        <main className="max-w-4xl mx-auto px-4 py-8 relative">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <button
              type="button"
              onClick={() => setActiveModal("Genkoyoshi")}
              className="w-full text-left p-3.5 bg-gradient-to-r from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-xl cursor-pointer font-bold text-sm shadow-xs transition-all flex items-center justify-between box-border"
            >
              <div className="flex items-center space-x-2 truncate">
                <span className="text-base">📝</span>
                <span className="truncate">How to use Genkoyoshi</span>
              </div>
              <span className="text-xs font-bold bg-white px-2 py-0.5 rounded-lg shadow-2xs border border-rose-200 shrink-0 ml-2">View →</span>
            </button>

            <Link
              to="/kanji-grammar-checker"
              className="w-full text-left p-3.5 bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 text-amber-800 border border-amber-200 hover:border-amber-300 rounded-xl cursor-pointer font-bold text-sm shadow-xs transition-all flex items-center justify-between box-border no-underline"
            >
              <div className="flex items-center space-x-2 truncate">
                <span className="text-base">✨</span>
                <span className="truncate">VCE Kanji & Grammar Checker</span>
              </div>
              <span className="text-xs font-bold bg-white px-2 py-0.5 rounded-lg shadow-2xs border border-amber-200 shrink-0 ml-2">Open →</span>
            </Link>
          </div>

          <div>
            <div className="mb-6 p-5 bg-indigo-50 border border-indigo-200 rounded-xl shadow-sm space-y-4">
              
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-lg">
                  <span>🤖</span> Custom AI Yamato Workspace (Volatile Session)
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
                  🔒 No Data Stored (Zero Persistence)
                </span>
              </div>

              {/* Step 1: カスタム問題の入力 ＆ 複数問題画像アップロード (OCR) */}
              <div className="bg-white/90 border border-indigo-200 rounded-xl p-4 space-y-3">
                <div className="text-sm font-bold text-indigo-900 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <span>1️⃣</span> Step 1: Enter Question / Prompt (or Upload Multiple Question Photos for AI OCR)
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      ref={questionFileInputRef}
                      onChange={handleQuestionImagesChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => questionFileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>📸</span>
                      <span>Upload Question Photos (Multiple OK)</span>
                    </button>
                  </div>
                </div>

                {questionImages.length > 0 && (
                  <div className="flex items-center gap-3 flex-wrap bg-indigo-50 border border-indigo-200 p-3 rounded-lg">
                    {questionImages.map((img, index) => (
                      <div key={img.id} className="relative group flex items-center bg-white border border-indigo-200 rounded p-1 shadow-2xs">
                        <img 
                          src={img.preview} 
                          alt={`Question ${index + 1}`} 
                          className="w-12 h-12 object-cover rounded cursor-pointer" 
                          onClick={() => setModalImageSrc(img.preview)} 
                        />
                        <span className="absolute -top-2 -left-2 bg-indigo-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                          {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuestionImages(prev => prev.filter(item => item.id !== img.id))}
                          className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center hover:bg-red-800"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                  ))}
                  <div className="text-xs text-indigo-900 font-bold ml-2">
                    {questionImages.length} question page(s) attached for AI OCR.
                  </div>
                </div>
              )}

              <textarea
                value={selectedQuestionText}
                onChange={(e) => setSelectedQuestionText(e.target.value)}
                placeholder="Type or paste the exam question / prompt here (or upload photos above)..."
                className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                rows={3}
              />
            </div>

            {/* Step 2: 生徒の複数答案画像のアップロード */}
            <div className="bg-white/90 border border-indigo-200 rounded-xl p-4 space-y-3">
              <div className="text-sm font-bold text-indigo-900 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <span>2️⃣</span> Step 2: Upload Your Answer Photos (Multiple Pages OK)
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    ref={answerFileInputRef}
                    onChange={handleAnswerImagesChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => answerFileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>📷</span>
                    <span>Upload Answer Photos (Multiple OK)</span>
                  </button>
                </div>
              </div>

              {answerImages.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap bg-indigo-50 border border-indigo-200 p-3 rounded-lg">
                  {answerImages.map((img, index) => (
                    <div key={img.id} className="relative group flex items-center bg-white border border-indigo-200 rounded p-1 shadow-2xs">
                      <img 
                        src={img.preview} 
                        alt={`Answer ${index + 1}`} 
                        className="w-12 h-12 object-cover rounded cursor-pointer" 
                        onClick={() => setModalImageSrc(img.preview)} 
                      />
                      <span className="absolute -top-2 -left-2 bg-emerald-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAnswerImages(prev => prev.filter(item => item.id !== img.id))}
                        className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center hover:bg-red-800"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div className="text-xs text-emerald-800 font-bold ml-2">
                    ✓ {answerImages.length} answer page(s) attached for evaluation.
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* チャットウィジェットへの連携 */}
        <ChatYamatoEoyWritingCustom
          systemPrompt={currentSystemPrompt}
          userId={user?.id}
          userNickname={nickname || (user?.email ? user.email.split('@')[0] : "Student")}
          credits={credits}
          externalQuestionFiles={questionImages.map(i => i.file)}
          externalImageFile={answerImages.length > 0 ? answerImages[0].file : null}
          externalImagePreview={answerImages.length > 0 ? answerImages[0].preview : null}
          assignedQuestion={assignedQuestionText}
          onClearExternalImage={() => setAnswerImages([])}
        />

        {showScrollTop && (
          <aside aria-label="Scroll controls" className="fixed bottom-24 right-6 z-40 flex flex-col items-end gap-3">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="p-3.5 bg-white hover:bg-slate-50 rounded-full shadow-xl cursor-pointer transition-all flex items-center justify-center w-12 h-12 border-2 border-red-500"
              aria-label="Scroll to top"
            >
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4l-8 8h5v8h6v-8h5z" />
              </svg>
            </button>
          </aside>
        )}

        {modalImageSrc && (
          <div className="fixed inset-0 z-[2147483648] bg-black/80 flex items-center justify-center p-4" onClick={() => setModalImageSrc(null)}>
            <div className="relative max-w-4xl max-h-[90vh]">
              <button onClick={() => setModalImageSrc(null)} className="absolute -top-10 right-0 text-white text-xl font-bold bg-black/50 px-3 py-1 rounded-full hover:bg-black/80 transition">
                ✕ Close
              </button>
              <img src={modalImageSrc} alt="Enlarged View" className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl bg-white" />
            </div>
          </div>
        )}

        {/* 💡 TextTypeModal: Genkoyoshi モーダルを描画 */}
        {activeModal && activeModalData && (
          <TextTypeModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            modalKey={activeModal}
            {...activeModalData}
          />
        )}
      </main>
    </div>
  </PageLayout>
);
}