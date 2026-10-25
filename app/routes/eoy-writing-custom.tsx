/**
 * @file eoy-writing-custom.tsx
 * @description 外部教材・過去問持ち込み型 Custom EOY Writing Practice モジュール（複数画像・OCR完全連動・クレジット案内＆Step 3追加版）
 * 💡 特徴：
 * 1. 2枚以上一律6クレジット（最大4枚まで）の明確な料金案内バナーを配置
 * 2. (Volatile Session) 表記を削除しスッキリしたワークスペース名に改修
 * 3. Step 2 の写真アップロードボタンを見出しのすぐ下に配置
 * 4. Step 3（右下のヤマトチャットを開いて送信する手順）を英語で明記
 * 5. 複数問題画像（OCR用）および複数答案画像の一括管理
 */
import { useState, useEffect, useRef } from "react";
import { Link, useRouteLoaderData } from "@remix-run/react";
import TextTypeModal from "../components/TextTypeModal";
import PageLayout, { PageLayoutRef } from "../components/PageLayout";
import ChatYamatoEoyWritingCustom from "../components/ChatYamatoEoyWritingCustom";

import textTypesData from "../data/texttypes";

const modalData: { [key: string]: any } = textTypesData;

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
}

export default function CustomDashboard() {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
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

  // 問題画像のアップロードハンドラ
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

  // 答案画像のアップロードハンドラ（最大4枚まで制限）
  const handleAnswerImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (answerImages.length + files.length > 4) {
      alert("一度に送信できる答案写真は最大4枚までです。(Maximum 4 photos allowed per request)");
    }

    const availableSlots = Math.max(0, 4 - answerImages.length);
    const filesToAdd = Array.from(files).slice(0, availableSlots);

    filesToAdd.forEach((file) => {
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

  const assignedQuestionText = selectedQuestionText.trim()
    ? `Custom Prompt: ${selectedQuestionText}`
    : questionImages.length > 0
    ? `[External Question Images Attached for AI OCR (${questionImages.length} page(s))]`
    : "";

  const currentSystemPrompt = assignedQuestionText
    ? `[Custom External Exam / Textbook Writing Task]\nDetails: ${assignedQuestionText}`
    : "";

  return (
    <PageLayout ref={layoutRef} breadcrumbTitle="Custom Practice (External / Past Exams)">
      <div className="min-h-screen bg-white text-slate-800 font-sans relative">
        <main className="max-w-4xl mx-auto px-4 py-8 relative">
          
          {/* 原稿用紙の使い方 ＆ 漢字チェッカーのリンク */}
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
              
              {/* ワークスペースヘッダー：(Volatile Session) を削除 */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-lg">
                  <span>🤖</span> Custom AI Yamato Workspace
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
                  🔒 No Data Stored (Zero Persistence)
                </span>
              </div>

              {/* 💡 クレジット消費案内（2枚以上は一律6クレジット・最大4枚まで） */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2 text-amber-900 font-bold">
                  <span>🪙</span>
                  <span>Photo Evaluation Rates:</span>
                  <span className="font-normal text-amber-800">
                    1 Photo = 4 Credits | 2+ Photos = Flat 6 Credits (Max 4 photos per request)
                  </span>
                </div>
                <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                  ※ 2枚以上は一律6クレジット（最大4枚まで）
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

              {/* Step 2: 生徒の複数答案画像のアップロード（見出しのすぐ下にボタンを配置） */}
              <div className="bg-white/90 border border-indigo-200 rounded-xl p-4 space-y-3">
                <div>
                  <div className="text-sm font-bold text-indigo-900 flex items-center gap-1.5">
                    <span>2️⃣</span> Step 2: Upload Your Answer Photos (Multiple Pages OK)
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Upload photos of your handwritten essay or typed response (Up to 4 pages).
                  </p>
                </div>

                {/* 💡 見出しのすぐ下にボタンを配置 */}
                <div className="flex items-center gap-3 flex-wrap pt-1">
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
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>📷</span>
                    <span>Upload Answer Photos (Max 4 Pages)</span>
                  </button>
                  {answerImages.length > 0 && (
                    <span className="text-xs text-emerald-700 font-bold bg-emerald-100 px-2.5 py-1 rounded">
                      ✓ {answerImages.length} Page(s) Attached
                    </span>
                  )}
                </div>

                {answerImages.length > 0 && (
                  <div className="flex items-center gap-3 flex-wrap bg-indigo-50 border border-indigo-200 p-3 rounded-lg mt-2">
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

              {/* 💡 Step 3: 右下のヤマトチャットで送信を押す（英語） */}
              <div className="bg-white/90 border border-indigo-200 rounded-xl p-4 space-y-2">
                <div className="text-sm font-bold text-indigo-900 flex items-center gap-1.5">
                  <span>3️⃣</span> Step 3: Open Yamato Chat & Press "Send"
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Click on the <strong>Yamato AI Tutor</strong> floating button at the bottom right to open the chat window, then press <strong>Send</strong> to receive your structured VCE feedback and evaluation report! 🚀
                </p>
              </div>

            </div>
          </div>

          {/* チャットウィジェットへの連携 */}
          <ChatYamatoEoyWritingCustom
            systemPrompt={currentSystemPrompt}
            userId={user?.id}
            userNickname={nickname || (user?.email ? user.email.split('@') : "Student")}
            credits={credits}
            externalQuestionFiles={questionImages.map(i => i.file)}
            externalImageFile={answerImages.length > 0 ? answerImages[0].file : null}
            externalImagePreview={answerImages.length > 0 ? answerImages[0].preview : null}
            assignedQuestion={assignedQuestionText}
            onClearExternalImage={() => setAnswerImages([])}
          />

          {modalImageSrc && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setModalImageSrc(null)}>
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