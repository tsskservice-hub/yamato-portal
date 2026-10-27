/**
 * @file oral-exam-questions.tsx
 * @description VCE Japanese Oral Exam 音声設問ライブラリページ
 * （Supabase app_knowledge key: 'ORAL_EXAM_QUESTIONS' 100%動的連動・DataErrorState版）
 * 模範: terms.tsx
 */

import { useState, useEffect, useCallback } from "react";
import type { MetaFunction } from "@remix-run/react";
import { useNavigate } from "@remix-run/react";
import PageLayout from "../components/PageLayout";
import ChatYamatoOralExamQuestions from "../components/ChatYamatoOralExamQuestions";
import DataErrorState from "../components/DataErrorState";
import { 
  fetchOralExamQuestionsData, 
  OralExamQuestionsData, 
  OralExamQuestionItem 
} from "../data/oral-exam-questions";
import { supabase } from "../lib/supabaseClient";

export const meta: MetaFunction = () => {
  return [
    { title: "VCE Japanese Oral Exam - Free Audio Resources | JPTutor AI Yamato" },
    { name: "description", content: "VCE Japanese EOY Oral Exam Free Audio Resources and Practice Library" },
  ];
};

export default function OralExamQuestions() {
  const navigate = useNavigate();

  // 💡 terms.tsx 模範の独立ステート管理 (データ・ローディング・エラー)
  const [oralData, setOralData] = useState<OralExamQuestionsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  // ユーザー・セッションステート
  const [user, setUser] = useState<any>(null);

  // 表示・再生コントロールステート
  const [currentSection, setCurrentSection] = useState<"beforeSec1" | "sec1" | "sec2" | "afterSec2">("sec1");
  const [currentPace, setCurrentPace] = useState<"steady" | "normal" | "accelerated">("steady");
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  // 追従型の上に戻るボタン用のステート
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  // 💡 再試行（Retry）時にも再利用できるフェッチコールバック
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await fetchOralExamQuestionsData(supabase);
      if (result && typeof result === "object" && Object.keys(result).length > 0) {
        setOralData(result);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error("Failed to load oral exam questions from Supabase:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Supabase セッション監視
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          setUser(session.user);
        }
      } catch (err) {
        console.error("Session check error:", err);
      }
    }

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // スクロール監視
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

  // 音声再生ハンドラー（音声ファイルまたは Web Speech API）
  const handlePlayAudio = (item: OralExamQuestionItem, index: number) => {
    if (item.audio) {
      const audio = new Audio(item.audio);
      setPlayingIndex(index);
      audio.play().catch(() => {
        alert("音声ファイルの再生に失敗しました。");
        setPlayingIndex(null);
      });
      audio.onended = () => setPlayingIndex(null);
      audio.onerror = () => setPlayingIndex(null);
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

  // 選択されたセクションとペースの設問配列を安全に抽出
  const activeItems: OralExamQuestionItem[] = oralData?.[currentSection]?.[currentPace] || [];
  const userNickname = user?.email ? user.email.split('@') : "Student";

  return (
    <PageLayout>
      <div className="bg-amber-50 min-h-screen text-slate-800 flex flex-col justify-between font-sans relative">
        <main className="max-w-4xl mx-auto px-4 py-10 flex-grow w-full">
          
          {/* Hero Section */}
          <div className="bg-white border-2 border-amber-300 rounded-2xl p-6 sm:p-8 shadow-xl mb-10 text-center relative overflow-hidden">
            <div className="absolute -right-1 -bottom-1 text-amber-100 text-9xl select-none pointer-events-none">🎙️</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
              VCE Oral Exam: Frequently Used Examiner Questions Audio Library
            </h1>
            <p className="text-slate-600 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
              Listen to authentic examiner questions with exam-style speed and pronunciation. Switch between learning paces and sections to start improving your listening skills!
            </p>
          </div>

          {/* 1. ローディング状態 */}
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-4 bg-white/80 rounded-2xl border border-amber-200 shadow-sm">
              <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
              <p className="text-slate-600 font-bold text-sm animate-pulse">Loading Oral Exam Audio Resources... 🎙️</p>
            </div>
          ) : error || !oralData ? (
            /* 2. 💡 データ取得失敗時の DataErrorState フォールバック */
            <div className="py-8">
              <DataErrorState
                title="Oral Exam Resources Unavailable"
                message="Failed to load oral exam questions from the database. Please check your network connection and try again."
                errorMessage="Failed to fetch key 'ORAL_EXAM_QUESTIONS' from app_knowledge table in Supabase."
                onRetry={loadData}
              />
            </div>
          ) : (
            /* 3. 正常取得時のコンテンツ描画 */
            <>
              {/* Controls / Filter Section */}
              <div className="bg-amber-100/70 border border-amber-300 rounded-2xl p-5 mb-8 shadow-inner flex flex-col md:flex-row gap-6 justify-between items-center">
                {/* Section Selector */}
                <div className="w-full md:w-auto">
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-900 mb-2">Select Section</label>
                  <div className="inline-flex flex-wrap rounded-xl bg-white p-1 shadow-xs border border-amber-200 w-full sm:w-auto gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentSection("beforeSec1")}
                      className={`flex-1 sm:flex-none px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer ${
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
                      className={`flex-1 sm:flex-none px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer ${
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
                      className={`flex-1 sm:flex-none px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer ${
                        currentSection === "sec2"
                          ? "bg-amber-600 text-white"
                          : "text-slate-700 hover:text-amber-700"
                      }`}
                    >
                      Section 2
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentSection("afterSec2")}
                      className={`flex-1 sm:flex-none px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer ${
                        currentSection === "afterSec2"
                          ? "bg-amber-600 text-white"
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
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-bold capitalize transition cursor-pointer ${
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
                {activeItems.length > 0 ? (
                  activeItems.map((item, index) => (
                    <div
                      key={index}
                      className="bg-white border border-amber-200 rounded-xl p-5 shadow-xs hover:shadow-md transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <span className="inline-block bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                          {item.category}
                        </span>
                        {/* 💡 フォントサイズを一回り大きく修正 (text-base sm:text-lg) */}
                        <div 
                          className="question-text text-base sm:text-lg font-medium text-slate-900 pt-1 leading-relaxed"
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
                  ))
                ) : (
                  <div className="text-center py-12 bg-white rounded-2xl border border-amber-200 p-8">
                    <p className="text-slate-500 font-medium text-sm">
                      No questions available for this section and pace.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

        </main>

        {/* 🤖 右下常駐エリア（スクロールトップ ＆ AIヤマトチャット） */}
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