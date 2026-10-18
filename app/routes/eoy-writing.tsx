/**
 * @file eoy-writing.tsx
 * @description EOY Writing Practice モジュール（Uploadボタン位置変更版・ChatYamatoEoyWriting連携）
 */
import { useState, useEffect, useRef } from "react";
import { Link, useRouteLoaderData } from "@remix-run/react";
import TextTypeModal from "../components/TextTypeModal";
import PageLayout, { PageLayoutRef } from "../components/PageLayout";
import ChatYamatoEoyWriting from "../components/ChatYamatoEoyWriting";

import questionsData from "../data/writing-exam-questions.json";
import textTypesData from "../data/texttypes.json";

const questions = questionsData as any[];
const modalData: { [key: string]: any } = textTypesData;

export default function Dashboard() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeTextType, setActiveTextType] = useState<string>("all");
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ダッシュボード側の画像アップロード用ステート
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Learning Dashboard | VCE EOY Exam Writing Tutor";
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const filteredQuestions = questions.filter((q) => {
    const matchesCategory =
      activeCategory === "all" || q.category === activeCategory;
    const matchesTextType =
      activeTextType === "all" || q.textType === activeTextType;
    return matchesCategory && matchesTextType;
  });

  const currentSystemPrompt = selectedQuestion
    ? `[Selected VCE EOY Writing Question Q${selectedQuestion.id}]\nCategory: ${selectedQuestion.category}\nText Type: ${selectedQuestion.textType}\nPrompt (English): ${selectedQuestion.english}\nPrompt (Japanese): ${selectedQuestion.japanese}`
    : "";

  return (
    <PageLayout ref={layoutRef} breadcrumbTitle="End of Year Writing Practice">
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
              
              {/* 💡 「AI Yamato is ready for you」の右隣に Upload Answer Photo ボタンを配置 */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-lg">
                  <span>🤖</span> AI Yamato is ready for you
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>📷</span>
                    <span>{selectedImagePreview ? "Change Answer Photo" : "Upload Answer Photo"}</span>
                  </button>
                  {selectedImagePreview && (
                    <span className="text-xs text-emerald-700 font-bold bg-emerald-100 px-2 py-1 rounded">
                      ✓ Attached
                    </span>
                  )}
                </div>
              </div>

              <div id="active-ai-tutor-banner" className="px-4 py-3 bg-white/80 border border-indigo-200 rounded-lg text-indigo-900 text-base font-bold flex flex-col sm:flex-row justify-between items-start sm:items-center shadow-xs scroll-mt-6 gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>🎯 Active Question Q</span>
                  <input
                    type="number"
                    min="1"
                    max={questions.length}
                    value={selectedQuestion ? selectedQuestion.id : ""}
                    onChange={(e) => {
                      const qId = parseInt(e.target.value, 10);
                      const found = questions.find((q) => q.id === qId);
                      if (found) {
                        setSelectedQuestion(found);
                      } else if (e.target.value === "") {
                        setSelectedQuestion(null);
                      }
                    }}
                    placeholder="No."
                    className="w-16 px-2 py-1 bg-white border border-indigo-300 rounded text-center text-indigo-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {selectedQuestion ? (
                    <span className="text-sm font-normal text-indigo-700 truncate max-w-xs sm:max-w-sm">
                      ({selectedQuestion.textType}) {selectedQuestion.english}
                    </span>
                  ) : (
                    <span className="text-sm font-normal text-amber-700">⚠️ None selected</span>
                  )}
                </div>
              </div>

              {selectedImagePreview && (
                <div className="flex items-center gap-3 bg-white border border-indigo-200 px-3 py-2 rounded-lg text-sm">
                  <img src={selectedImagePreview} alt="Preview" className="w-10 h-10 object-cover rounded border" />
                  <div className="flex-grow">
                    <div className="font-bold text-indigo-900 text-xs">Handwritten Answer Ready for AI Tutor</div>
                    <div className="text-slate-600 text-xs truncate">You can now open the chat and send it!</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setSelectedImagePreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-red-600 hover:text-red-800 text-xs font-bold px-2 py-1 bg-red-50 rounded"
                  >
                    Remove ✕
                  </button>
                </div>
              )}

              <div className="pt-2 border-t border-indigo-100 text-slate-700 text-base leading-relaxed">
                <div className="mb-2 text-indigo-900 font-bold">
                  To get started, please follow these two quick steps:
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-indigo-900 shrink-0">1️⃣</span>
                    <div><strong>Select question & photo:</strong> Enter the question number and upload your handwritten answer photo using the button above. 📋📸</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-indigo-900 shrink-0">2️⃣</span>
                    <div><strong>Chat with AI Yamato:</strong> Open the chat bubble at the bottom-right and send it!</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-end border-b-2 border-slate-200 pb-2 mb-6">
            <h1 className="text-slate-800 text-2xl sm:text-3xl font-bold m-0">
              📚 Task List ({filteredQuestions.length} questions)
            </h1>
          </div>

          <div className="mb-6">
            <div className="mb-2 text-lg font-bold text-slate-600">Filter by Writing Style</div>
            <div className="flex gap-2.5 flex-wrap mb-4">
              {["all", "Informative", "Evaluative", "Persuasive", "Personal", "Imaginative"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-base font-bold cursor-pointer transition-colors ${
                    activeCategory === cat ? "bg-blue-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                  }`}
                >
                  {cat === "all" ? "All" : cat}
                </button>
              ))}
            </div>

            <div className="mb-2 text-lg font-bold text-slate-600">Filter by Text Type</div>
            <div className="flex gap-2.5 flex-wrap">
              {["all", "Speech", "Email", "Letter", "Article", "Journal", "Essay", "Story", "Report", "Account", "Message", "Review", "Summary", "Official Report"].map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveTextType(type)}
                  className={`px-4 py-2 rounded-lg text-base font-bold cursor-pointer transition-colors ${
                    activeTextType === type ? "bg-blue-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                  }`}
                >
                  {type === "all" ? "All" : type}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6 mb-12">
            {filteredQuestions.map((q) => {
              const isSelected = selectedQuestion?.id === q.id;
              return (
                <div
                  key={q.id}
                  className={`p-6 border rounded-xl bg-white shadow-sm transition-all ${
                    isSelected ? "border-indigo-500 ring-2 ring-indigo-200" : "border-slate-200"
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-base bg-sky-100 text-sky-800 px-3 py-1 rounded-md font-bold">{q.category}</span>
                      <span
                        onClick={() => setActiveModal(q.textType)}
                        className="text-base bg-emerald-100 text-emerald-800 px-3 py-1 rounded-md font-bold cursor-pointer hover:bg-emerald-200 transition-colors"
                      >
                        {q.textType}
                      </span>
                    </div>
                    <span className="text-lg text-slate-600 font-bold">Q{q.id}</span>
                  </div>

                  <p className="text-[20px] text-slate-800 mb-3 leading-relaxed font-medium">{q.english}</p>
                  <div className="text-lg sm:text-[20px] text-slate-700 mb-4 border-l-4 border-slate-200 pl-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: q.japanese }} />

                  <button
                    onClick={() => {
                      setSelectedQuestion(q);
                      const banner = document.getElementById("active-ai-tutor-banner");
                      if (banner) banner.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`px-4 py-2 text-base rounded-lg cursor-pointer font-bold transition-colors shadow-sm ${
                      isSelected ? "bg-indigo-600 text-white" : "bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 text-indigo-700"
                    }`}
                  >
                    {isSelected ? "🤖 Currently Active in AI Tutor Bubble" : "🎯 Select for AI Tutor"}
                  </button>
                </div>
              );
            })}
          </div>

          {/* 💡 チャットウィジェットとの連携 */}
          <ChatYamatoEoyWriting
            systemPrompt={currentSystemPrompt}
            userId={user?.id}
            userNickname={nickname || (user?.email ? user.email.split('@')[0] : "Student")}
            credits={credits}
            externalImageFile={selectedImage}
            externalImagePreview={selectedImagePreview}
            onClearExternalImage={() => {
              setSelectedImage(null);
              setSelectedImagePreview(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
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