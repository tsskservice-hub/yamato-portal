/**
 * @file eoy-writing-custom.tsx
 * @description 外部教材・過去問持ち込み型 Custom EOY Writing Practice モジュール（揮発型セッション・完全非保存版・問題画像連携対応）
 */
import { useState, useEffect, useRef } from "react";
import { Link, useRouteLoaderData } from "@remix-run/react";
import TextTypeModal from "../components/TextTypeModal";
import PageLayout, { PageLayoutRef } from "../components/PageLayout";
import ChatYamatoEoyWritingCustom from "../components/ChatYamatoEoyWritingCustom";

import textTypesData from "../data/texttypes.json";

const modalData: { [key: string]: any } = textTypesData;

export default function CustomDashboard() {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  
  const rootData = useRouteLoaderData("root") as {
    user?: any;
    credits?: number;
    nickname?: string;
  } | undefined;

  const user = rootData?.user ?? null;
  const credits = rootData?.credits ?? 10;
  const nickname = rootData?.nickname ?? "";

  const layoutRef = useRef<PageLayoutRef>(null);
  const answerFileInputRef = useRef<HTMLInputElement>(null);
  const questionFileInputRef = useRef<HTMLInputElement>(null);

  // 💡 すべてブラウザのメモリ（State）のみで管理し、データベースやストレージへの保存は一切行わない揮発型データ
  const [selectedQuestionText, setSelectedQuestionText] = useState<string>("");
  const [questionImagePreview, setQuestionImagePreview] = useState<string | null>(null);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Custom Practice | VCE EOY Exam Writing Tutor";
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

  const handleAnswerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQuestionImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setQuestionImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // チャットウィジェットおよびバックエンドに渡すアサインされた質問情報（カスタム問題）
  const assignedQuestionText = selectedQuestionText.trim()
    ? `Custom Prompt: ${selectedQuestionText}`
    : questionImagePreview
    ? `Custom Prompt Image Attached`
    : "";

  const currentSystemPrompt = assignedQuestionText
    ? `[Custom External Exam / Textbook Writing Task]\nDetails: ${assignedQuestionText}`
    : "";

  return (
    <PageLayout ref={layoutRef} breadcrumbTitle="Custom Practice (External / Past Exams)">
      <div className="min-h-screen bg-white text-slate-800 font-sans relative">
        <main className="max-w-4xl mx-auto px-4 py-8 relative">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setActiveModal("Genkooyooshi")}
              className="w-full text-left p-3.5 bg-gradient-to-r from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-xl cursor-pointer font-bold text-sm shadow-xs transition-all flex items-center justify-between box-border"
            >
              <div className="flex items-center space-x-2 truncate">
                <span className="text-base">📝</span>
                <span className="truncate">How to use Genkooyooshi</span>
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

              {/* Step 1: カスタム問題の入力または画像アップロード */}
              <div className="bg-white/90 border border-indigo-200 rounded-xl p-4 space-y-3">
                <div className="text-sm font-bold text-indigo-900 flex items-center gap-1.5">
                  <span>1️⃣</span> Step 1: Enter or Upload External Question / Prompt
                </div>
                <textarea
                  value={selectedQuestionText}
                  onChange={(e) => setSelectedQuestionText(e.target.value)}
                  placeholder="Type or paste the exam question / prompt here (e.g., Write a speech about environmental volunteer work...)"
                  className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  rows={3}
                />
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="file"
                    accept="image/*"
                    ref={questionFileInputRef}
                    onChange={handleQuestionImageChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => questionFileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>📸</span>
                    <span>{questionImagePreview ? "Change Question Photo" : "Upload Question Photo (Optional)"}</span>
                  </button>
                  {questionImagePreview && (
                    <div className="flex items-center gap-2">
                      <img src={questionImagePreview} alt="Question Preview" className="w-8 h-8 object-cover rounded border" />
                      <span className="text-xs text-emerald-700 font-bold">✓ Question Photo Attached</span>
                      <button
                        type="button"
                        onClick={() => {
                          setQuestionImagePreview(null);
                          if (questionFileInputRef.current) questionFileInputRef.current.value = '';
                        }}
                        className="text-red-600 hover:text-red-800 text-xs font-bold px-1"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: 生徒の答案画像のアップロード */}
              <div className="bg-white/90 border border-indigo-200 rounded-xl p-4 space-y-3">
                <div className="text-sm font-bold text-indigo-900 flex items-center gap-1.5">
                  <span>2️⃣</span> Step 2: Upload Your Handwritten / Typed Answer Photo
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="file"
                    accept="image/*"
                    ref={answerFileInputRef}
                    onChange={handleAnswerImageChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => answerFileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>📷</span>
                    <span>{selectedImagePreview ? "Change Answer Photo" : "Upload Answer Photo"}</span>
                  </button>
                  {selectedImagePreview && (
                    <span className="text-xs text-emerald-700 font-bold bg-emerald-100 px-2 py-1 rounded">
                      ✓ Answer Attached
                    </span>
                  )}
                </div>

                {selectedImagePreview && (
                  <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-lg text-sm mt-2">
                    <img src={selectedImagePreview} alt="Answer Preview" className="w-10 h-10 object-cover rounded border" />
                    <div className="flex-grow">
                      <div className="font-bold text-indigo-900 text-xs">Answer Photo Ready for AI Evaluation</div>
                      <div className="text-slate-600 text-xs truncate">Open chat and send to evaluate against your custom question!</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImage(null);
                        setSelectedImagePreview(null);
                        if (answerFileInputRef.current) answerFileInputRef.current.value = '';
                      }}
                      className="text-red-600 hover:text-red-800 text-xs font-bold px-2 py-1 bg-red-50 rounded"
                    >
                      Remove ✕
                    </button>
                  </div>
                )}
              </div>

              <div id="active-ai-tutor-banner" className="px-4 py-3 bg-white/80 border border-indigo-200 rounded-lg text-indigo-900 text-sm font-bold flex justify-between items-center shadow-xs">
                <div>
                  🎯 <strong>Active Custom Question:</strong> {assignedQuestionText ? (assignedQuestionText.length > 60 ? assignedQuestionText.slice(0, 60) + "..." : assignedQuestionText) : <span className="text-amber-700 font-normal">⚠️ Please enter or upload a question above</span>}
                </div>
              </div>

              <div className="pt-2 border-t border-indigo-100 text-slate-700 text-sm leading-relaxed">
                <div className="text-indigo-900 font-bold mb-1">💡 How it works:</div>
                <p className="text-xs text-slate-600">
                  Your question details and uploaded answer photos are processed in real-time by AI and are <strong>never stored</strong> in our database. Once you refresh or close the session, all data is completely purged.
                </p>
              </div>
            </div>
          </div>

          {/* 💡 カスタムチャットウィジェットへの連携（問題写真のプレビューも渡すように修正） */}
          <ChatYamatoEoyWritingCustom
            systemPrompt={currentSystemPrompt}
            userId={user?.id}
            userNickname={nickname || (user?.email ? user.email.split('@')[0] : "Student")}
            credits={credits}
            externalImageFile={selectedImage}
            externalImagePreview={selectedImagePreview}
            assignedQuestion={assignedQuestionText}
            questionImagePreview={questionImagePreview}
            onClearExternalImage={() => {
              setSelectedImage(null);
              setSelectedImagePreview(null);
              if (answerFileInputRef.current) answerFileInputRef.current.value = '';
            }}
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

          {activeModal && modalData[activeModal] && (
            <TextTypeModal
              isOpen={true}
              onClose={() => setActiveModal(null)}
              modalKey={activeModal}
              {...modalData[activeModal]}
            />
          )}
        </main>
      </div>
    </PageLayout>
  );
}