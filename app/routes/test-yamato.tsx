import { useState, useEffect, useRef } from "react";
import type { MetaFunction } from "@remix-run/react";

// ローカルのオーラル試験問題データファイルをインポート
import questionDataRaw from "../data/oral-exam-questions.json";

export const meta: MetaFunction = () => {
  return [
    { title: "VCE Japanese Oral Exam - AI Yamato Test | JPTutor AI Yamato" },
    { name: "description", content: "VCE Japanese EOY Oral Exam AI Tutor Test Page" },
  ];
};

type QuestionItem = {
  category: string;
  text: string;
  audio?: string;
  text_original?: string;
};

type QuestionData = {
  beforeSec1: { steady: QuestionItem[]; normal: QuestionItem[]; accelerated: QuestionItem[] };
  sec1: { steady: QuestionItem[]; normal: QuestionItem[]; accelerated: QuestionItem[] };
  sec2: { steady: QuestionItem[]; normal: QuestionItem[]; accelerated: QuestionItem[] };
  afterSec2: { steady: QuestionItem[]; normal: QuestionItem[]; accelerated: QuestionItem[] };
};

const questionData: QuestionData = questionDataRaw as QuestionData;

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  imageUrl?: string;
};

function sanitizeAiOutput(text: string): string {
  if (!text) return "";
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*/g, '');
}

export default function TestYamatoPage() {
  const [currentSection, setCurrentSection] = useState<"beforeSec1" | "sec1" | "sec2" | "afterSec2">("sec1");
  const [currentPace, setCurrentPace] = useState<"steady" | "normal" | "accelerated">("steady");
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const [isAiTutorOpen, setIsAiTutorOpen] = useState<boolean>(true);
  const [isAiFullscreen, setIsAiFullscreen] = useState<boolean>(false);
  const aiChatRef = useRef<HTMLDivElement>(null);
  
  const [tutorMessages, setTutorMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "こんにちは！日本語Tutor AI ヤマトです。VCEオーラル試験の質問や学習のコツについて何でも聞いてくださいね。",
    },
  ]);
  const [tutorInput, setTutorInput] = useState<string>("");
  const [isTutorLoading, setIsTutorLoading] = useState<boolean>(false);

  const [requestVisualAid, setRequestVisualAid] = useState<boolean>(false);
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);
  const [tutorLevel, setTutorLevel] = useState<"steady" | "normal" | "accelerated">("steady");

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
    utterance.onend = () => setPlayingIndex(null);
    utterance.onerror = () => setPlayingIndex(null);

    window.speechSynthesis.speak(utterance);
  };

  const handleSendTutorMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorInput.trim() || isTutorLoading) return;

    const userMsg = tutorInput.trim();
    setTutorInput("");
    setRequestVisualAid(false);

    const newMessages: ChatMessage[] = [...tutorMessages, { role: "user", content: userMsg }];
    setTutorMessages(newMessages);
    setIsTutorLoading(true);

    try {
      const response = await fetch("https://api.jptutoraiyamato.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: tutorMessages.map(m => ({ role: m.role, content: m.content })),
          learningPace: tutorLevel,
          userNickname: "生徒さん",
          appType: "oral",
        }),
      });

      if (!response.ok) {
        // 型を明示的にキャストしてエラープロパティに安全にアクセスする
        const errData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errData?.error || "独立APIサーバーとの通信に失敗しました。");
      }

      const data = (await response.json()) as { reply?: string; imageUrl?: string };
      const replyText = data.reply || "お返事がうまく取得できませんでした。";
      const imageUrl = data.imageUrl;
      
      const sanitizedReply = sanitizeAiOutput(replyText);

      setTutorMessages([
        ...newMessages,
        {
          role: "assistant",
          content: sanitizedReply,
          imageUrl: imageUrl,
        },
      ]);
    } catch (err: any) {
      console.error(err);
      setTutorMessages([
        ...newMessages,
        { role: "assistant", content: `エラーが発生しました: ${err.message || "通信エラー"}` },
      ]);
    } finally {
      setIsTutorLoading(false);
    }
  };

  const activeItems = questionData[currentSection][currentPace];

  return (
    <div className="bg-amber-50 min-h-screen text-slate-800 flex flex-col justify-between font-sans relative">
      <main className="max-w-4xl mx-auto px-4 py-10 flex-grow w-full">
        <div className="bg-white border-2 border-amber-300 rounded-2xl p-6 sm:p-8 shadow-xl mb-10 text-center relative overflow-hidden">
          <div className="absolute -right-1 -bottom-1 text-amber-100 text-9xl select-none pointer-events-none">🎙️</div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">
            VCE Oral Exam: ヤマトAI 動作テスト画面
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed mb-6">
            独立APIサーバー（<code>api.jptutoraiyamato.com</code>）と連携し、ヤマトのソクラテス式指導の振る舞いを確認するためのテストページです。
          </p>
        </div>

        <div className="bg-amber-100/70 border border-amber-300 rounded-2xl p-5 mb-8 shadow-inner flex flex-col md:flex-row gap-6 justify-between items-center">
          <div className="w-full md:w-auto">
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-900 mb-2">Select Section</label>
            <div className="inline-flex flex-wrap rounded-xl bg-white p-1 shadow-xs border border-amber-200 w-full sm:w-auto gap-1">
              {(["beforeSec1", "sec1", "sec2", "afterSec2"] as const).map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setCurrentSection(sec)}
                  className={`flex-1 sm:flex-none px-3 py-2 rounded-lg text-xs sm:text-sm font-bold transition shadow-xs ${
                    currentSection === sec ? "bg-amber-600 text-white" : "text-slate-700 hover:text-amber-700"
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full md:w-auto">
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-900 mb-2">Learning Pace</label>
            <div className="inline-flex rounded-xl bg-white p-1 shadow-xs border border-amber-200 w-full sm:w-auto">
              {(["steady", "normal", "accelerated"] as const).map((pace) => (
                <button
                  key={pace}
                  type="button"
                  onClick={() => setCurrentPace(pace)}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-bold capitalize transition ${
                    currentPace === pace ? "bg-amber-600 text-white shadow-xs" : "text-slate-700 hover:text-amber-700"
                  }`}
                >
                  {pace}
                </button>
              ))}
            </div>
          </div>
        </div>

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
                <p className="question-text font-medium text-slate-900 pt-1" dangerouslySetInnerHTML={{ __html: item.text }} />
              </div>
              <button
                type="button"
                disabled={playingIndex === index}
                onClick={() => handlePlayAudio(item, index)}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-xs shrink-0 disabled:opacity-60 cursor-pointer"
              >
                {playingIndex === index ? <span>⏳ 再生中...</span> : <span>🔊 音声をきく</span>}
              </button>
            </div>
          ))}
        </div>
      </main>

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
            <span>AI Yamato (Test)</span>
          </button>
        ) : (
          <div
            ref={aiChatRef}
            className={`bg-white border-2 border-emerald-300 rounded-2xl p-5 shadow-2xl flex flex-col transition-all ${
              isAiFullscreen
                ? "w-screen h-screen rounded-none border-none p-6 sm:p-10 overflow-auto"
                : "w-80 sm:w-96 h-[500px] min-w-[280px] min-h-[350px] max-w-[90vw] max-h-[85vh] resize overflow-auto"
            }`}
          >
            <div className="w-full h-full flex flex-col">
              <div className="flex items-center justify-between border-b pb-2 mb-3 shrink-0">
                <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2 m-0">
                  <span>🤖</span> ヤマト AI テスト窓
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleAiFullscreen}
                    className="text-slate-500 hover:text-slate-700 text-xs font-bold px-2 py-1 rounded-md transition cursor-pointer border border-slate-200"
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
                接続先: <code>api.jptutoraiyamato.com/chat</code>
              </p>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 mb-3 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-emerald-900">Learning Pace</span>
                <div className="inline-flex rounded-lg bg-white p-0.5 shadow-xs border border-emerald-200">
                  {(["steady", "normal", "accelerated"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setTutorLevel(level)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold capitalize transition ${
                        tutorLevel === level ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-emerald-700"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-y-auto space-y-2.5 flex-grow mb-3">
                {tutorMessages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-[95%] p-2.5 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-emerald-600 text-white rounded-br-xs"
                          : "bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isTutorLoading && (
                  <div className="text-xs text-slate-500 italic">🤖 ヤマトが考えています...</div>
                )}
              </div>

              <form onSubmit={handleSendTutorMessage} className="flex flex-col gap-2 shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tutorInput}
                    onChange={(e) => setTutorInput(e.target.value)}
                    placeholder="ヤマトに質問を入力..."
                    disabled={isTutorLoading}
                    className="flex-grow p-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                  />
                  <button
                    type="submit"
                    disabled={isTutorLoading || !tutorInput.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    送信
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </aside>

      <footer className="bg-white border-t border-amber-200 py-6 mt-12 text-center text-xs text-slate-500">
        <p>&copy; 2026 JPTutor AI Yamato. All rights reserved.</p>
      </footer>
    </div>
  );
}