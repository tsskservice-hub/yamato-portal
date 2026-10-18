/**
 * @file eoy-writing.tsx
 * @description EOY Writing Practice モジュール（Useful Resources削除・Genkooyooshiガイド移動版）
 */
import { useState, useEffect, useRef } from "react";
import { Link, useRouteLoaderData } from "@remix-run/react";
import TextTypeModal from "../components/TextTypeModal";
import PageLayout, { PageLayoutRef } from "../components/PageLayout";

// --- 📦 外部のJSONファイルから正式なデータをインポート ---
import questionsData from "../data/writing-exam-questions.json";
import textTypesData from "../data/texttypes.json";

function BugReportCard() {
  return (
    <div className="w-full p-4 bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 hover:border-amber-300 rounded-xl font-bold text-lg shadow-sm transition-all cursor-pointer">
      🐛 Report a Bug / Issue
    </div>
  );
}

function QuickFeedbackCard() {
  return (
    <div className="w-full p-4 bg-white hover:bg-blue-50 text-blue-800 border border-blue-200 hover:border-blue-300 rounded-xl font-bold text-lg shadow-sm transition-all cursor-pointer">
      💬 Quick Feedback & Suggestions
    </div>
  );
}

const questions = questionsData as any[];
const modalData: { [key: string]: any } = textTypesData;

function sanitizeAiOutput(text: string): string {
  if (!text) return "";
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*/g, '');
}

export default function Dashboard() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeTextType, setActiveTextType] = useState<string>("all");
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  
  // 💡 root.tsx からグローバルデータを安全に取得
  const rootData = useRouteLoaderData("root") as {
    user?: any;
    credits?: number;
    nickname?: string;
  } | undefined;

  const user = rootData?.user ?? null;
  const credits = rootData?.credits ?? 10;
  const nickname = rootData?.nickname ?? "";

  const [isAiTutorOpen, setIsAiTutorOpen] = useState<boolean>(false);
  const [isAiFullscreen, setIsAiFullscreen] = useState<boolean>(false);
  const [chatFontSize, setChatFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');

  const layoutRef = useRef<PageLayoutRef>(null);
  const aiChatRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "Learning Dashboard | VCE EOY Exam Writing Tutor";
  }, []);

  type ChatMessage = {
    role: 'assistant' | 'user';
    content: string;
    imageUrl?: string;
  };

  const [tutorMessages, setTutorMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hello! I'm AI Yamato, your Japanese Tutor. Ask me anything about VCE Japanese writing practice, grammar, or phrasing! You can also upload photos of your handwritten answers."
    }
  ]);
  const [tutorInput, setTutorInput] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [isTutorLoading, setIsTutorLoading] = useState<boolean>(false);
  const [requestVisualAid, setRequestVisualAid] = useState<boolean>(false);
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);
  const [tutorLevel, setTutorLevel] = useState<'steady' | 'normal' | 'accelerated'>('steady');

  const getFontSizeClass = () => {
    switch (chatFontSize) {
      case 'sm': return 'text-sm';
      case 'base': return 'text-base';
      case 'lg': return 'text-lg';
      case 'xl': return 'text-xl';
      default: return 'text-base';
    }
  };

  const toggleAiFullscreen = async () => {
    if (!aiChatRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await aiChatRef.current.requestFullscreen();
        setIsAiFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsAiFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen toggle failed:', err);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setIsAiFullscreen(false);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const assignedQuestionText = selectedQuestion 
    ? `Q${selectedQuestion.id}: ${selectedQuestion.english}` 
    : "";

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

  const handleSendTutorMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!tutorInput.trim() && !selectedImage) || isTutorLoading) return;
    const userMsg = tutorInput.trim() || "Please check this handwritten answer image.";
    const needsVisual = requestVisualAid;
    const imageBase64 = selectedImagePreview;
    
    setTutorInput('');
    setSelectedImage(null);
    setSelectedImagePreview(null);
    setRequestVisualAid(false);
    if (fileInputRef.current) fileInputRef.current.value = '';

    const newMessages: ChatMessage[] = [
      ...tutorMessages, 
      { role: 'user', content: userMsg, imageUrl: imageBase64 || undefined }
    ];
    setTutorMessages(newMessages);
    setIsTutorLoading(true);
    
    try {
      const visualPrompt = needsVisual ? `Educational diagram for: ${userMsg}` : undefined;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg, 
          chatHistory: tutorMessages, 
          learningPace: tutorLevel, 
          pace: tutorLevel,          
          visualPrompt,
          assignedQuestion: assignedQuestionText,
          userNickname: nickname || (user?.email ? user.email.split('@')[0] : "Student"),
          imageBase64: imageBase64
        }),
      });
      const data = (await res.json()) as any;
      setTutorMessages([...newMessages, { role: 'assistant', content: sanitizeAiOutput(data.reply || data.replyText || ''), imageUrl: data.imageUrl }]);
    } catch (err) {
      setTutorMessages([...newMessages, { role: 'assistant', content: 'Sorry, an error occurred. Please try asking again!' }]);
    } finally {
      setIsTutorLoading(false);
    }
  };

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

  const filteredQuestions = questions.filter((q) => {
    const matchesCategory =
      activeCategory === "all" || q.category === activeCategory;
    const matchesTextType =
      activeTextType === "all" || q.textType === activeTextType;
    return matchesCategory && matchesTextType;
  });

  return (
    <PageLayout ref={layoutRef}>
      <div className="min-h-screen bg-white text-slate-800 font-sans relative">
        <main className="max-w-4xl mx-auto px-4 py-8 relative">
          
          {/* 💡 Dedicated Kanji & Grammar Checker Banner / Link */}
          <div className="mb-8 p-6 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-emerald-500/10 border-2 border-amber-400/40 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-left">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white uppercase tracking-wider">
                <span>Dedicated Tool</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">
                ✨ VCE Kanji & Grammar Checker (New Dedicated Page)
              </h2>
              <p className="text-xs text-slate-600">
                Check your unique VCE Kanji (<span className="text-amber-700 font-bold">🟡 Yellow</span>) and Grammar (<span className="text-emerald-700 font-bold">🟢 Green</span>) in a dedicated workspace!
              </p>
            </div>
            <Link
              to="/kanji-grammar-checker"
              className="px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer"
            >
              <span>Open Checker Tool</span>
              <span className="text-sm">→</span>
            </Link>
          </div>

          <div>
            <div className="mb-6 p-5 bg-indigo-50 border border-indigo-200 rounded-xl shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-lg flex-wrap">
                <span>🤖</span> AI Yamato is ready for you
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
                    <span className="text-sm font-normal text-amber-700">⚠️ None selected (Type ID or select below)</span>
                  )}
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
                    <div>
                      <strong>Select your question & photo:</strong> Enter the question number above (or click task button) and upload your handwritten answer photo using the button above. 📋📸
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-indigo-900 shrink-0">2️⃣</span>
                    <div>
                      <strong>Chat with AI Yamato:</strong> Open the chat bubble at the bottom-right and click send!
                    </div>
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

          {/* 💡 How to use Genkooyooshi card placed neatly right above the filters */}
          <div className="mb-6">
            <button
              onClick={() => setActiveModal("Genkooyooshi")}
              className="w-full text-left p-4 bg-gradient-to-r from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-2xl cursor-pointer font-bold text-base shadow-sm transition-all flex items-center justify-between box-border"
            >
              <div className="flex items-center space-x-2">
                <span className="text-xl">📝</span>
                <span>How to use Genkooyooshi (Manuscript Paper Guidelines)</span>
              </div>
              <span className="text-sm font-bold bg-white px-3 py-1 rounded-xl shadow-xs border border-rose-200">View Guide →</span>
            </button>
          </div>

          <div className="mb-6">
            <div className="mb-2 text-lg font-bold text-slate-600">
              Filter by Writing Style
            </div>
            <div className="flex gap-2.5 flex-wrap mb-4">
              {[
                "all",
                "Informative",
                "Evaluative",
                "Persuasive",
                "Personal",
                "Imaginative",
              ].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-base font-bold cursor-pointer transition-colors ${
                    activeCategory === cat
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                  }`}
                >
                  {cat === "all" ? "All" : cat}
                </button>
              ))}
            </div>

            <div className="mb-2 text-lg font-bold text-slate-600">
              Filter by Text Type
            </div>
            <div className="flex gap-2.5 flex-wrap">
              {[
                "all",
                "Speech",
                "Email",
                "Letter",
                "Article",
                "Journal",
                "Essay",
                "Story",
                "Report",
                "Account",
                "Message",
                "Review",
                "Summary",
                "Official Report"
              ].map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveTextType(type)}
                  className={`px-4 py-2 rounded-lg text-base font-bold cursor-pointer transition-colors ${
                    activeTextType === type
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                  }`}
                >
                  {type === "all" ? "All" : type}
                </button>
              ))}
            </div>
          </div>

          <div id="text-type-instruction" className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 text-lg text-emerald-800 flex items-center gap-3 shadow-sm">
            <span className="text-xl">💡</span>
            <span>
              Click on the green text type tag on each question to see what is
              required for that text type and view a sample.
            </span>
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
                      <span className="text-base bg-sky-100 text-sky-800 px-3 py-1 rounded-md font-bold">
                        {q.category}
                      </span>
                      <span
                        onClick={() => setActiveModal(q.textType)}
                        className="text-base bg-emerald-100 text-emerald-800 px-3 py-1 rounded-md font-bold cursor-pointer hover:bg-emerald-200 transition-colors"
                      >
                        {q.textType}
                      </span>
                    </div>
                    <span className="text-lg text-slate-600 font-bold">
                      Q{q.id}
                    </span>
                  </div>

                  <p className="text-[20px] text-slate-800 mb-3 leading-relaxed font-medium">
                    {q.english}
                  </p>

                  <div
                    className="text-lg sm:text-[20px] text-slate-700 mb-4 border-l-4 border-slate-200 pl-4 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: q.japanese }}
                  />

                  <button
                    onClick={() => {
                      setSelectedQuestion(q);
                      const banner = document.getElementById("active-ai-tutor-banner");
                      if (banner) {
                        banner.scrollIntoView({ behavior: "smooth", block: "start" });
                      }
                    }}
                    className={`px-4 py-2 text-base rounded-lg cursor-pointer font-bold transition-colors shadow-sm ${
                      isSelected
                        ? "bg-indigo-600 text-white"
                        : "bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 text-indigo-700"
                    }`}
                  >
                    {isSelected ? "🤖 Currently Active in AI Tutor Bubble" : "🎯 Select for AI Tutor"}
                  </button>
                </div>
              );
            })}
          </div>

          <aside aria-label="AI Yamato" className="fixed bottom-6 right-6 z-[2147483647] flex flex-col items-end gap-3 text-base">
            {showScrollTop && (
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="p-3.5 bg-white hover:bg-slate-50 rounded-full shadow-xl cursor-pointer transition-all flex items-center justify-center w-12 h-12 border-2 border-red-500"
                aria-label="Scroll to top"
              >
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 4l-8 8h5v8h6v-8h5z" />
                </svg>
              </button>
            )}

            {!isAiTutorOpen ? (
              <button
                type="button"
                onClick={() => setIsAiTutorOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 transition-all cursor-pointer text-base border-2 border-white"
              >
                <span>🤖</span>
                <span>AI Yamato</span>
                {selectedQuestion && (
                  <span className="text-xs bg-blue-800 px-2 py-0.5 rounded text-blue-100">
                    Q{selectedQuestion.id}
                  </span>
                )}
                {selectedImagePreview && (
                  <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></span>
                )}
              </button>
            ) : (
              <div 
                ref={aiChatRef}
                className={`bg-white border-2 border-blue-300 rounded-2xl p-5 shadow-2xl flex flex-col ${
                  isAiFullscreen 
                    ? 'fixed inset-0 w-full h-full max-w-none max-h-none rounded-none z-[2147483647]' 
                    : 'w-80 sm:w-96 h-[520px] min-w-[280px] min-h-[350px] max-w-[90vw] max-h-[85vh] resize overflow-auto'
                }`}
              >
                <div className="w-full h-full flex flex-col">
                  <div className="flex items-center justify-between border-b pb-2 mb-3 shrink-0">
                    <h3 className="text-base font-bold text-blue-900 flex items-center gap-2 m-0">
                      <span>🤖</span> AIYAMATO Tutor
                      {selectedQuestion && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-normal">
                          Q{selectedQuestion.id} Active
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleAiFullscreen}
                        className="text-slate-500 hover:text-slate-700 text-sm font-bold px-2 py-1 rounded-md transition cursor-pointer"
                      >
                        {isAiFullscreen ? '🗗 Exit Fullscreen' : '🗖 Fullscreen'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAiTutorOpen(false)}
                        className="text-slate-400 hover:text-slate-600 text-sm font-bold px-2 py-1 rounded-md transition cursor-pointer"
                      >
                        ✕ Close
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed mb-3 shrink-0">
                    Ask questions about writing phrasing, grammar, or send your uploaded answer photo!
                  </p>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 mb-2 flex items-center justify-between shrink-0">
                    <span className="text-sm font-bold text-blue-900">Learning Pace</span>
                    <div className="inline-flex rounded-lg bg-white p-0.5 shadow-xs border border-blue-200">
                      {(["steady", "normal", "accelerated"] as const).map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setTutorLevel(level)}
                          className={`px-3 py-1 rounded-md text-xs font-bold capitalize transition ${
                            tutorLevel === level
                              ? "bg-blue-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-blue-700"
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-100 border border-slate-200 rounded-xl p-2.5 mb-3 flex items-center justify-between shrink-0">
                    <span className="text-sm font-bold text-slate-700">Font Size</span>
                    <div className="inline-flex rounded-lg bg-white p-0.5 shadow-xs border border-slate-200">
                      {(
                        [
                          { key: 'sm', label: '小' },
                          { key: 'base', label: '中' },
                          { key: 'lg', label: '大' },
                          { key: 'xl', label: '特大' },
                        ] as const
                      ).map((size) => (
                        <button
                          key={size.key}
                          type="button"
                          onClick={() => setChatFontSize(size.key)}
                          className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                            chatFontSize === size.key
                              ? "bg-blue-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-blue-700"
                          }`}
                        >
                          {size.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={`bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-y-auto space-y-3 flex-grow mb-3 ${getFontSizeClass()}`}>
                    {tutorMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[95%] p-3 rounded-xl leading-relaxed whitespace-pre-wrap ${
                            msg.role === "user"
                              ? "bg-blue-600 text-white rounded-br-xs"
                              : "bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs"
                          }`}
                        >
                          {msg.role === "user" ? (
                            <div>
                              {msg.content}
                              {msg.imageUrl && (
                                <div className="mt-2">
                                  <img 
                                    src={msg.imageUrl} 
                                    alt="User Upload" 
                                    className="rounded-lg max-w-full max-h-36 object-cover cursor-pointer"
                                    onClick={() => setModalImageSrc(msg.imageUrl || null)}
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div 
                                className="ai-markdown-content overflow-x-auto [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:p-2 [&_th]:text-left [&_td]:border [&_td]:border-slate-200 [&_td]:p-2"
                                dangerouslySetInnerHTML={{ __html: msg.content }}
                              />
                              {msg.imageUrl && (
                                <div className="mt-2">
                                  <img 
                                    src={msg.imageUrl} 
                                    alt="Visual Aid" 
                                    className="rounded-lg max-w-full cursor-pointer hover:opacity-90 transition"
                                    onClick={() => setModalImageSrc(msg.imageUrl || null)}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {isTutorLoading && (
                      <div className="text-slate-500 italic">🤖 AI Yamato is thinking & reading your answer... 📸</div>
                    )}
                  </div>

                  <form onSubmit={handleSendTutorMessage} className="flex flex-col gap-2 shrink-0">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={requestVisualAid} 
                          onChange={(e) => setRequestVisualAid(e.target.checked)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Request Visual Aid / Diagram</span>
                      </label>
                    </div>

                    {selectedImagePreview && (
                      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-2.5 py-2 rounded-lg text-xs">
                        <img src={selectedImagePreview} alt="Preview" className="w-8 h-8 object-cover rounded" />
                        <span className="truncate flex-grow text-blue-900 font-medium">Answer photo attached from dashboard</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedImage(null);
                            setSelectedImagePreview(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="text-red-600 hover:text-red-800 font-bold px-1"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={tutorInput}
                        onChange={(e) => setTutorInput(e.target.value)}
                        placeholder={selectedImagePreview ? "Ask feedback for attached photo..." : "Ask AI tutor..."}
                        disabled={isTutorLoading}
                        className="flex-grow p-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                      />
                      <button
                        type="submit"
                        disabled={isTutorLoading || (!tutorInput.trim() && !selectedImage)}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        Send
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </aside>

          {modalImageSrc && (
            <div 
              className="fixed inset-0 z-[2147483648] bg-black/80 flex items-center justify-center p-4"
              onClick={() => setModalImageSrc(null)}
            >
              <div className="relative max-w-4xl max-h-[90vh]">
                <button 
                  onClick={() => setModalImageSrc(null)}
                  className="absolute -top-10 right-0 text-white text-xl font-bold bg-black/50 px-3 py-1 rounded-full hover:bg-black/80 transition"
                >
                  ✕ Close
                </button>
                <img 
                  src={modalImageSrc} 
                  alt="Enlarged View" 
                  className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl bg-white" 
                />
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