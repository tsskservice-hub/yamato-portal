import { useState, useEffect } from "react";
import type { MetaFunction } from "@remix-run/react";
import { useNavigate } from "@remix-run/react";

// 🚀 モノレポ依存を排除し、app内のローカルデータファイルへ直接インポートする形に変更
import questionDataRaw from "../data/oral-exam-questions";
import PageLayout from "../components/PageLayout";
import ChatYamatoOralExamQuestions from "../components/ChatYamatoOralExamQuestions";

export const meta: MetaFunction = () => {
  return [
    { title: "VCE Japanese Oral Exam - Free Audio Resources | JPTutor AI Yamato" },
    { name: "description", content: "VCE Japanese EOY Oral Exam Free Audio Resources" },
  ];
};

// Supabase クライアント初期化用
import { supabase } from "../lib/supabaseClient";

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

export default function OralExamQuestions() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);

  const [currentSection, setCurrentSection] = useState<"beforeSec1" | "sec1" | "sec2" | "afterSec2">("sec1");
  const [currentPace, setCurrentPace] = useState<"steady" | "normal" | "accelerated">("steady");
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  
  // 🚀 追従型の上に戻るボタン用のステートとスクロール監視
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  // Supabase セッション監視
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          if (isMounted) {
            setUser(session.user);
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
      } else {
        setUser(null);
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

  const userNickname = user?.email ? user.email.split('@')[0] : "Student";

  return (
    <PageLayout>
      <div className="bg-amber-50 min-h-screen text-slate-800 flex flex-col justify-between font-sans relative">
        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-10 flex-grow w-full">
          {/* Hero Section */}
          <div className="bg-white border-2 border-amber-300 rounded-2xl p-6 sm:p-8 shadow-xl mb-10 text-center relative overflow-hidden">
            <div className="absolute -right-1 -bottom-1 text-amber-100 text-9xl select-none pointer-events-none">🎙️</div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
              VCE Oral Exam: Frequently Used Examiner Questions Audio Library
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
              Listen to authentic examiner questions with exam-style speed and pronunciation. Switch between learning paces and sections to start improving your listening skills!
            </p>
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
        </main>

        {/* 🤖 右下常駐エリア（フローティングコントロール & チャットコンポーネント） */}
        <aside aria-label="Floating Controls" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
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

          <ChatYamatoOralExamQuestions
            userId={user?.id}
            userNickname={userNickname}
          />
        </aside>
      </div>
    </PageLayout>
  );
}