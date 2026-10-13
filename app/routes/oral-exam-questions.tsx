import { useState, useEffect, useRef } from "react";
import type { MetaFunction } from "@remix-run/react";
import { useNavigate } from "@remix-run/react";
import { createClient } from "@supabase/supabase-js";

// 🚀 モノレポ依存を排除し、app内のローカルデータファイルへ直接インポートする形に変更
import questionDataRaw from "../data/oral-exam-questions.json";
import PageLayout from "../components/PageLayout";

export const meta: MetaFunction = () => {
  return [
    { title: "VCE Japanese Oral Exam - Free Audio Resources | JPTutor AI Yamato" },
    { name: "description", content: "VCE Japanese EOY Oral Exam Free Audio Resources" },
  ];
};

// Supabase クライアント初期化用
const SUPABASE_URL = typeof window !== "undefined" ? (window as any).ENV?.SUPABASE_URL || "" : "";
const SUPABASE_ANON_KEY = typeof window !== "undefined" ? (window as any).ENV?.SUPABASE_ANON_KEY || "" : "";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type QuestionItem = {
  category: string;
  text: string;
  audio?: string; // 実際の音声ファイルパス
  text_original?: string;
};

type QuestionData = {
  beforeSec1: {
    steady: QuestionItem[];
    normal: QuestionItem[];
    accelerated: QuestionItem[];
  };
  sec1: {
    steady: QuestionItem[];
    normal: QuestionItem[];
    accelerated: QuestionItem[];
  };
  sec2: {
    steady: QuestionItem[];
    normal: QuestionItem[];
    accelerated: QuestionItem[];
  };
  afterSec2: {
    steady: QuestionItem[];
    normal: QuestionItem[];
    accelerated: QuestionItem[];
  };
};

const questionData: QuestionData = questionDataRaw as QuestionData;

// 💡 チャットメッセージの型定義
type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  imageUrl?: string;
};

/**
 * 💡 万が一AIがマークダウン記号（##や**）を出力した際に除去するサニタイズ関数
 */
function sanitizeAiOutput(text: string): string {
  if (!text) return "";
  return text
    .replace(/^#{1,6}\s+/gm, '') // 行頭の # などを削除
    .replace(/\*\*/g, '');        // 太字の ** を削除
}

export default function OralExamQuestions() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  const [userCredits, setUserCredits] = useState<number | null>(null);

  const [currentSection, setCurrentSection] = useState<"beforeSec1" | "sec1" | "sec2" | "afterSec2">("sec1");
  const [currentPace, setCurrentPace] = useState<"steady" | "normal" | "accelerated">("steady");
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  
  // 🚀 追従型の上に戻るボタン用のステートとスクロール監視
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  // 🤖 ラップトップ画面右側に常駐するAIチューター窓用のステート
  const [isAiTutorOpen, setIsAiTutorOpen] = useState<boolean>(false);
  
  // 💡 デバイスの画面に合わせたフルスクリーン用のステートとRef
  const [isAiFullscreen, setIsAiFullscreen] = useState<boolean>(false);
  const aiChatRef = useRef<HTMLDivElement>(null);
  
  const [tutorMessages, setTutorMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hello! I'm Japanese Tutor AI Yamato. Have any questions about these VCE oral exam questions or need tips on your Japanese studies? Ask me anything!",
    },
  ]);
  const [tutorInput, setTutorInput] = useState<string>("");
  const [isTutorLoading, setIsTutorLoading] = useState<boolean>(false);

  // 🎨 ユーザーが明示的に図解・イラスト生成を要求するためのチェックボックス用ステート
  const [requestVisualAid, setRequestVisualAid] = useState<boolean>(false);

  // 🔍 拡大表示（モーダル）用のステート
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);
  
  // 💡 AIチューター専用の学習レベル選択ステート（steady / normal / accelerated）
  const [tutorLevel, setTutorLevel] = useState<"steady" | "normal" | "accelerated">("steady");

  // Supabase セッション監視とクレジット情報取得
  useEffect(() => {
    let isMounted = true;

    async function fetchUserCredits(userId: string) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("credits")
          .eq("id", userId)
          .single();
        if (!error && data && isMounted) {
          setUserCredits(data.credits);
        }
      } catch (err) {
        console.error("Error fetching user credits:", err);
      }
    }

    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          if (isMounted) {
            setUser(session.user);
            await fetchUserCredits(session.user.id);
          }
        }
      } catch (err) {
        console.error("Session check error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchUserCredits(session.user.id);
      } else {
        setUser(null);
        setUserCredits(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [navigate]);

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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 💡 デバイスの画面全体に合わせた全画面（フルスクリーン）の切り替え処理
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
      console.error("Fullscreen toggle failed:", err);
    }
  };

  // 💡 ユーザーがESCキーなどで全画面を解除した場合の状態同期
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsAiFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handlePlayAudio = (item: QuestionItem, index: number) => {
    if (item.audio) {
      const audio = new Audio(item.audio);
      setPlayingIndex(index);
      audio.play().catch(() => {
        alert("音声ファイルの再生に失敗しました。");
        setPlayingIndex(null);
      });
      audio.onended = () => setPlayingIndex(null);
      audio.onerror = () => {
        setPlayingIndex(null);
      };
      return;
    }

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("お使いのブラウザは音声読み上げに対応していません。");
      return;
    }

    window.speechSynthesis.cancel();
    const plainText = item.text.replace(/<[^>]*>?/gm, '');
    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.lang = "ja-JP";
    utterance.rate = currentPace === "steady" ? 0.85 : currentPace === "accelerated" ? 1.05 : 0.95;

    setPlayingIndex(index);

    utterance.onend = () => {
      setPlayingIndex(null);
    };
    utterance.onerror = () => {
      setPlayingIndex(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // 🤖 AIチューターへのメッセージ送信ハンドラ（チェックボックス連動版）
  const handleSendTutorMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorInput.trim() || isTutorLoading) return;

    const userMsg = tutorInput.trim();
    const needsVisual = requestVisualAid; // 🎨 チェック状態を保持

    setTutorInput("");
    setRequestVisualAid(false); // 送信後にチェックを自動リセット

    const newMessages: ChatMessage[] = [...tutorMessages, { role: "user", content: userMsg }];
    setTutorMessages(newMessages);
    setIsTutorLoading(true);

    try {
      // 🎨 チェックが入っている場合のみ、確実に対象メッセージに基づえた visualPrompt を構築
      const visualPrompt = needsVisual
        ? `Educational instructional diagram and visual aid for VCE Japanese high school students explaining: ${userMsg}. Clean layout, high quality, professional illustration style.`
        : undefined;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          chatHistory: tutorMessages,
          learningPace: tutorLevel,
          visualPrompt: visualPrompt, // 🎨 バックエンドへ visualPrompt を送信
          userNickname: user?.email ? user.email.split('@')[0] : "Student",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from AI tutor");
      }

      const data = (await response.json()) as any;
      const replyText = data.reply || "I'm here to help you with your Japanese studies!";
      const imageUrl = data.imageUrl; // 💡 生成画像URL
      
      const sanitizedReply = sanitizeAiOutput(replyText);

      setTutorMessages([
        ...newMessages,
        {
          role: "assistant",
          content: sanitizedReply,
          imageUrl: imageUrl,
        },
      ]);
    } catch (err) {
      console.error(err);
      setTutorMessages([
        ...newMessages,
        { role: "assistant", content: "Sorry, I encountered an error. Please try asking again!" },
      ]);
    } finally {
      setIsTutorLoading(false);
    }
  };

  const activeItems = questionData[currentSection][currentPace];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-amber-50 font-sans">
        <h3 className="text-xl font-semibold text-slate-700 animate-pulse">
          Loading Oral Exam Audio Resources... 🎙️
        </h3>
      </div>
    );
  }

  return (
    <PageLayout>
      <div className="bg-amber-50 min-h-screen text-slate-800 flex flex-col justify-between font-sans relative">
        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-10 flex-grow w-full">
          {/* User Credits Banner if available */}
          {userCredits !== null && (
            <div className="mb-6 flex justify-end">
              <span className="text-sm bg-amber-200 text-amber-900 px-4 py-1.5 rounded-full font-bold shadow-xs">
                💎 Credits: {userCredits}
              </span>
            </div>
          )}

          {/* Hero Section */}
          <div className="bg-white border-2 border-amber-300 rounded-2xl p-6 sm:p-8 shadow-xl mb-10 text-center relative overflow-hidden">
            <div className="absolute -right-1 -bottom-1 text-amber-100 text-9xl select-none pointer-events-none">🎙️</div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
              VCE Oral Exam: Frequently Used Examiner Questions Audio Library
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed mb-6">
              Listen to authentic examiner questions with exam-style speed and pronunciation. Switch between learning paces and sections to start improving your listening skills!
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href="/#vce-app"
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-3 rounded-xl shadow-xs transition text-sm flex items-center gap-2"
              >
                <span>✨ Try AI Tutor</span>
              </a>
            </div>
          </div>

          {/* Controls / Filter Section */}
          <div className="bg-amber-100/70 border border-amber-300 rounded-2xl p-5 mb-8 shadow-inner flex flex-col md:flex-row gap-6 justify-between items-center">
            {/* Section Selector */}
            <div className="w-full md:w-auto">
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-900 mb-2">Select Section</label>
              <div className="inline-flex flex-wrap rounded-xl bg-white p-1 shadow-xs border border-amber-200 w-full sm:w-auto gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentSection("beforeSec1")}
                  className={`flex-1 sm:flex-none px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition shadow-xs ${
                    currentSection === "beforeSec1"
                      ? "bg-amber-600 text-white"
                      : "text-slate-700 hover:text-amber-700"
                  }`}
                >
                  Before
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentSection("sec1")}
                  className={`flex-1 sm:flex-none px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition shadow-xs ${
                    currentSection === "sec1"
                      ? "bg-amber-600 text-white"
                      : "text-slate-700 hover:text-amber-700"
                  }`}
                >
                  Section 1
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentSection("sec2")}
                  className={`flex-1 sm:flex-none px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
                    currentSection === "sec2"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-slate-700 hover:text-amber-700"
                  }`}
                >
                  Section 2
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentSection("afterSec2")}
                  className={`flex-1 sm:flex-none px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
                    currentSection === "afterSec2"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-slate-700 hover:text-amber-700"
                  }`}
                >
                  After
                </button>
              </div>
            </div>

            {/* Learning Pace Selector */}
            <div className="w-full md:w-auto">
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-900 mb-2">Learning Pace</label>
              <div className="inline-flex rounded-xl bg-white p-1 shadow-xs border border-amber-200 w-full sm:w-auto">
                {(["steady", "normal", "accelerated"] as const).map((pace) => (
                  <button
                    key={pace}
                    type="button"
                    onClick={() => setCurrentPace(pace)}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-bold capitalize transition ${
                      currentPace === pace
                        ? "bg-amber-600 text-white shadow-xs"
                        : "text-slate-700 hover:text-amber-700"
                    }`}
                  >
                    {pace}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Audio Content Display Area */}
          <div className="space-y-4">
            {activeItems.map((item, index) => (
              <div
                key={index}
                className="bg-white border border-amber-200 rounded-xl p-5 shadow-xs hover:shadow-md transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <span className="inline-block bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {item.category}
                  </span>
                  <p 
                    className="question-text font-medium text-slate-900 pt-1"
                    dangerouslySetInnerHTML={{ __html: item.text }}
                  />
                </div>
                <button
                  type="button"
                  disabled={playingIndex === index}
                  onClick={() => handlePlayAudio(item, index)}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-xs shrink-0 disabled:opacity-60 cursor-pointer"
                >
                  {playingIndex === index ? (
                    <span>⏳ 再生中...</span>
                  ) : (
                    <span>🔊 音声をきく</span>
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Bottom CTA Card */}
          <div className="mt-12 bg-gradient-to-r from-amber-600 to-amber-700 rounded-2xl p-8 text-white shadow-xl text-center">
            <h3 className="text-xl sm:text-2xl font-bold mb-3">Why not take your practice a step beyond just listening to audio and actually have a conversation with an AI?</h3>
            <p className="text-amber-100 text-sm sm:text-base max-w-xl mx-auto mb-6">
              With the EOY Oral Exam AI Tutor app, you can experience a realistic mock oral exam tailored to your level and pace.
            </p>
            <a
              href="/#vce-app"
              className="inline-block bg-white text-amber-800 hover:bg-amber-50 font-extrabold px-8 py-3.5 rounded-full shadow-lg transition transform hover:-translate-y-0.5"
            >
              Check out the app today! 🚀 
            </a>
          </div>
        </main>

        {/* 🤖 右下常駐エリア（AIチューター窓 & 上に戻るボタンを一体化して配置） */}
        <aside aria-label="AI Yamato" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
          {showScrollTop && (
            <button
              type="button"
              onClick={scrollToTop}
              className="bg-amber-600 hover:bg-amber-700 text-white p-3 rounded-full shadow-lg transition-all cursor-pointer text-sm flex items-center justify-center"
              title="Scroll to top"
            >
              ⬆️
            </button>
          )}

          {!isAiTutorOpen ? (
            <button
              type="button"
              onClick={() => setIsAiTutorOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all cursor-pointer text-sm"
            >
              <span>🤖</span>
              <span>AI Yamato</span>
            </button>
          ) : (
            <div
              ref={aiChatRef}
              className={`bg-white border-2 border-emerald-300 rounded-2xl p-5 shadow-2xl flex flex-col transition-all ${
                isAiFullscreen
                  ? "w-screen h-screen rounded-none border-none p-6 sm:p-10 overflow-auto"
                  : "w-80 sm:w-96 h-[500px] min-w-[280px] min-h-[350px] max-w-[90vw] max-h-[85vh] resize overflow-auto [transform:rotate(180deg)]"
              }`}
            >
              <div className={`w-full h-full flex flex-col ${!isAiFullscreen ? "[transform:rotate(180deg)]" : ""}`}>
                <div className="flex items-center justify-between border-b pb-2 mb-3 shrink-0">
                  <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2 m-0">
                    <span>🤖</span> 日本語Tutor AI Yamato
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={toggleAiFullscreen}
                      className="text-slate-500 hover:text-slate-700 text-xs font-bold px-2 py-1 rounded-md transition cursor-pointer border border-slate-200"
                      title={isAiFullscreen ? "元の大きさに戻す" : "デバイスの画面に合わせて最大化"}
                    >
                      {isAiFullscreen ? "🗗 縮小" : "🗖 最大化"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (document.fullscreenElement) {
                          document.exitFullscreen().catch(() => {});
                        }
                        setIsAiTutorOpen(false);
                        setIsAiFullscreen(false);
                      }}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1 rounded-md transition cursor-pointer"
                    >
                      ✕ Close
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-3 shrink-0">
                  Ask questions about examiner phrasing, grammar, or get study advice!
                </p>

                {/* 💡 AIチューターの学習レベル選択UI */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 mb-3 flex items-center justify-between shrink-0">
                  <span className="text-xs font-bold text-emerald-900">Learning Pace</span>
                  <div className="inline-flex rounded-lg bg-white p-0.5 shadow-xs border border-emerald-200">
                    {(["steady", "normal", "accelerated"] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setTutorLevel(level)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold capitalize transition ${
                          tutorLevel === level
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-emerald-700"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* チャット履歴エリア */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-y-auto space-y-2.5 flex-grow mb-3">
                  {tutorMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[95%] p-2.5 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                          msg.role === "user"
                            ? "bg-emerald-600 text-white rounded-br-xs"
                            : "bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs"
                        }`}
                      >
                        {msg.role === "user" ? (
                          msg.content
                        ) : (
                          <div className="space-y-2">
                            <div 
                              className="ai-markdown-content overflow-x-auto [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:p-1.5 [&_th]:text-left [&_td]:border [&_td]:border-slate-200 [&_td]:p-1.5"
                              dangerouslySetInnerHTML={{ __html: msg.content }}
                            />
                            {/* 🎨 インライン表示される生成画像（クリックで拡大可能） */}
                            {msg.imageUrl && (
                              <div className="mt-2 rounded-lg overflow-hidden border border-emerald-200 bg-emerald-50/50 p-1">
                                <img
                                  src={msg.imageUrl}
                                  alt="AI Yamato Visual Explanation"
                                  onClick={() => setModalImageSrc(msg.imageUrl || null)}
                                  className="w-full h-auto rounded-md object-contain max-h-48 cursor-pointer hover:opacity-95 transition"
                                  title="クリックして画像を拡大"
                                />
                                <p className="text-[10px] text-emerald-800 text-center mt-1 font-medium cursor-pointer" onClick={() => setModalImageSrc(msg.imageUrl || null)}>
                                  ✨ ヤマト特製図解・イラスト（クリックして拡大）
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isTutorLoading && (
                    <div className="text-xs text-slate-500 italic">🤖 AI Yamato is thinking (and creating visual illustration)...</div>
                  )}
                </div>

                {/* 入力フォーム & 図解生成チェックボックス */}
                <form onSubmit={handleSendTutorMessage} className="flex flex-col gap-2 shrink-0">
                  {/* 🎨 ユーザーが明示的に図解を要求するためのチェックボックス */}
                  <div className="flex items-center gap-2 px-1">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={requestVisualAid}
                        onChange={(e) => setRequestVisualAid(e.target.checked)}
                        disabled={isTutorLoading}
                        className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>🎨 explain with diagrams and illustrations</span>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tutorInput}
                      onChange={(e) => setTutorInput(e.target.value)}
                      placeholder="Ask AI tutor anything..."
                      disabled={isTutorLoading}
                      className="flex-grow p-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                    />
                    <button
                      type="submit"
                      disabled={isTutorLoading || !tutorInput.trim()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      Send
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </aside>

        {/* 🔍 画像拡大表示用モーダル（Lightbox） */}
        {modalImageSrc && (
          <div 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setModalImageSrc(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl p-2 shadow-2xl flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setModalImageSrc(null)}
                className="absolute top-3 right-3 bg-slate-800/70 hover:bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition cursor-pointer z-10"
              >
                ✕
              </button>
              <img
                src={modalImageSrc}
                alt="Enlarged AI Yamato Visual"
                className="max-w-full max-h-[80vh] rounded-lg object-contain"
              />
              <p className="text-xs text-slate-600 mt-2 font-medium">✨ ヤマト特製図解・イラスト（拡大表示）</p>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}