/**
 * @file app/components/lessons/EduVocabularyDrillModal.tsx
 * @description 4つのモード（日→英タイピング、音声→英タイピング、英→日タイピング、英→日発声）を網羅した本格語彙ドリル（ランダム出題・表記ゆれ対応版）
 */

import React, { useState, useEffect, useRef } from "react";

interface EduVocabularyDrillModalProps {
  vocabulary: any[];
  isOpen: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

type DrillMode = "jp_to_en" | "audio_to_en" | "en_to_jp" | "en_to_voice";

export const EduVocabularyDrillModal: React.FC<EduVocabularyDrillModalProps> = ({
  vocabulary = [],
  isOpen,
  onClose,
  onCompleted,
}) => {
  const [shuffledVocab, setShuffledVocab] = useState<any[]>([]);
  const [currentMode, setCurrentMode] = useState<DrillMode>("jp_to_en");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // 音声認識用・音声合成・音声再生用の参照
  const [isListening, setIsListening] = useState(false);
  const [speechStatusMessage, setSpeechStatusMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 再生中のHTMLAudioElementを保持して重複再生（反響）を防ぐためのref
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // 目標スコア（vocabulary の数×2、または最低5問）
  const targetScore = Math.max(vocabulary.length * 2, 5);

  // モーダルが開いた時、または vocabulary が変わった時にランダムにシャッフルする
  useEffect(() => {
    if (isOpen && vocabulary.length > 0) {
      const shuffled = [...vocabulary].sort(() => Math.random() - 0.5);
      setShuffledVocab(shuffled);
      setCurrentIndex(0);
      setScore(0);
      setUserInput("");
      setFeedback(null);
      setIsFinished(false);
      setCurrentMode("jp_to_en");
    }
    // クリーンアップ：モーダル閉時に音声があれば停止
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
    };
  }, [isOpen, vocabulary]);

  useEffect(() => {
    if (isOpen && currentMode === "audio_to_en" && shuffledVocab.length > 0) {
      playVocabAudio(shuffledVocab[currentIndex % shuffledVocab.length]);
    }
  }, [currentMode, currentIndex, isOpen, shuffledVocab]);

  if (!isOpen || shuffledVocab.length === 0) return null;

  const currentItem = shuffledVocab[currentIndex % shuffledVocab.length];

  // フォールバック用の音声合成関数
  const playFallbackSpeech = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // 統合された音声再生関数（重複再生・反響防止対応）
  const playVocabAudio = (vocab: any) => {
    // 既存で再生中の音声があれば完全に停止してリセットする（反響防止）
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current = null;
    }

    // Web Speech APIの発話も念のためキャンセル
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    // 1. 自作音声URLが登録されている場合は、そのMP3ファイルを再生
    if (vocab?.audio_url) {
      const audio = new Audio(vocab.audio_url);
      activeAudioRef.current = audio;

      audio.play().catch((err) => {
        console.warn("Audio playback failed, falling back to Web Speech API:", err);
        activeAudioRef.current = null;
        playFallbackSpeech(vocab.jp_text);
      });
      return;
    }

    // 2. 音声URLが無い場合は従来の自動音声合成にフォールバック
    playFallbackSpeech(vocab?.jp_text);
  };

  // モード切替時に音声を自動再生または初期化
  const handleModeChange = (mode: DrillMode) => {
    setCurrentMode(mode);
    setUserInput("");
    setFeedback(null);
    if (mode === "audio_to_en") {
      playVocabAudio(currentItem);
    }
  };

  // 表記ゆれや数字・句読点を正規化するヘルパー関数
  const normalizeAnswer = (str: string): string => {
    if (!str) return "";
    let s = str.trim().toLowerCase();
    
    // 末尾の句読点（? . ! ,）を取り除く
    s = s.replace(/[?.!,]+$/, "");
    
    // 数字とスペルの相互変換対応（1 ⇔ one など）
    s = s.replace(/\b1\b/g, "one");
    s = s.replace(/\bone\b/g, "1");
    s = s.replace(/\b2\b/g, "two");
    s = s.replace(/\btwo\b/g, "2");
    s = s.replace(/\b3\b/g, "three");
    s = s.replace(/\bthree\b/g, "3");
    s = s.replace(/\b4\b/g, "four");
    s = s.replace(/\bfour\b/g, "4");
    s = s.replace(/\b5\b/g, "five");
    s = s.replace(/\bfive\b/g, "5");
    
    // 連続する空白を1つにまとめる
    s = s.replace(/\s+/g, " ");
    
    return s;
  };

  // タイピング回答の判定
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || feedback !== null) return;

    let isCorrect = false;
    const cleanInput = normalizeAnswer(userInput);

    if (currentMode === "jp_to_en" || currentMode === "audio_to_en") {
      const correctEn = normalizeAnswer(currentItem.english_text || "");
      isCorrect = cleanInput === correctEn;
    } else if (currentMode === "en_to_jp") {
      const correctJp = (currentItem.jp_text || "").trim();
      const correctRomaji = (currentItem.romaji || "").trim().toLowerCase();
      const cleanUserJp = userInput.trim();
      isCorrect = cleanUserJp === correctJp || cleanUserJp.toLowerCase() === correctRomaji;
    }

    if (isCorrect) {
      setFeedback("correct");
      const nextScore = score + 1;
      setScore(nextScore);

      setTimeout(() => {
        setUserInput("");
        setFeedback(null);
        if (nextScore >= targetScore) {
          setIsFinished(true);
          onCompleted();
        } else {
          const nextIdx = currentIndex + 1;
          // リストの最後まで行ったら、再度シャッフルし直してランダム性を維持する
          if (nextIdx % shuffledVocab.length === 0) {
            const reShuffled = [...vocabulary].sort(() => Math.random() - 0.5);
            setShuffledVocab(reShuffled);
            setCurrentIndex(0);
            const modes: DrillMode[] = ["jp_to_en", "audio_to_en", "en_to_jp", "en_to_voice"];
            const nextModeIdx = (modes.indexOf(currentMode) + 1) % modes.length;
            handleModeChange(modes[nextModeIdx]);
          } else {
            setCurrentIndex(nextIdx);
            if (currentMode === "audio_to_en") {
              playVocabAudio(shuffledVocab[nextIdx % shuffledVocab.length]);
            }
          }
        }
      }, 1000);
    } else {
      setFeedback("incorrect");
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  // 発声練習（Web Speech Recognition API）の実行
  const startSpeechRecognition = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechStatusMessage("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setSpeechStatusMessage("Listening... Please speak clearly in Japanese.");
    };

    recognition.onresult = (event: any) => {
      const speechResult = event.results[0][0].transcript;
      const targetJp = currentItem.jp_text.trim();
      
      if (speechResult.includes(targetJp) || targetJp.includes(speechResult)) {
        setFeedback("correct");
        setSpeechStatusMessage(`Recognised: "${speechResult}" - Correct!`);
        const nextScore = score + 1;
        setScore(nextScore);

        setTimeout(() => {
          setFeedback(null);
          setSpeechStatusMessage("");
          setIsListening(false);
          if (nextScore >= targetScore) {
            setIsFinished(true);
            onCompleted();
          } else {
            setCurrentIndex((prev) => prev + 1);
          }
        }, 1200);
      } else {
        setFeedback("incorrect");
        setSpeechStatusMessage(`Recognised: "${speechResult}" - Try again!`);
        setTimeout(() => {
          setFeedback(null);
          setSpeechStatusMessage("");
          setIsListening(false);
        }, 1500);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setSpeechStatusMessage("Voice recognition error. Please try again.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (err) {
      setIsListening(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full p-6 sm:p-10 shadow-2xl space-y-6 transition-all duration-300 ${
        isFullscreen ? "max-w-full min-h-screen sm:min-h-[90vh] flex flex-col justify-between rounded-none sm:rounded-3xl" : "max-w-2xl"
      }`}>
        
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>📖</span>
              <span>Vocabulary Mastery Drill</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Complete {targetScore} correct answers across drills to finish this task.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* フルスクリーン切り替えボタン */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold text-sm p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
            >
              {isFullscreen ? "🗗" : "⛶"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-sm p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {!isFinished ? (
          <div className="space-y-6 sm:space-y-8 flex-1 flex flex-col justify-center">
            
            {/* モード切り替えタブ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => handleModeChange("jp_to_en")}
                className={`py-3 px-2 text-xs sm:text-sm font-bold rounded-xl transition ${currentMode === "jp_to_en" ? "bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"}`}
              >
                📝 日→英
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("audio_to_en")}
                className={`py-3 px-2 text-xs sm:text-sm font-bold rounded-xl transition ${currentMode === "audio_to_en" ? "bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"}`}
              >
                🎧 音声→英
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("en_to_jp")}
                className={`py-3 px-2 text-xs sm:text-sm font-bold rounded-xl transition ${currentMode === "en_to_jp" ? "bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"}`}
              >
                🔤 英→日
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("en_to_voice")}
                className={`py-3 px-2 text-xs sm:text-sm font-bold rounded-xl transition ${currentMode === "en_to_voice" ? "bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"}`}
              >
                🎤 発声練習
              </button>
            </div>

            {/* スコア・進捗バー */}
            <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 bg-orange-50/60 dark:bg-orange-950/20 px-5 py-3.5 rounded-2xl border border-orange-100 dark:border-orange-900/40">
              <span>Progress: {score} / {targetScore} correct</span>
              <span className="uppercase text-[11px] tracking-wider bg-orange-200 dark:bg-orange-900/60 text-orange-800 dark:text-orange-300 px-3 py-1 rounded-lg font-extrabold">
                Mode: {currentMode.replace(/_/g, " ")}
              </span>
            </div>

            {/* 問題提示エリア */}
            <div className={`bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-4 ${isFullscreen ? "py-16" : ""}`}>
              {currentMode === "jp_to_en" && (
                <>
                  <span className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-slate-100 block tracking-tight">
                    {currentItem.jp_text}
                  </span>
                  <span className="text-base sm:text-lg font-medium text-slate-500 italic block">
                    {currentItem.romaji}
                  </span>
                  <p className="text-xs sm:text-sm text-slate-400 pt-2">Type the English translation:</p>
                </>
              )}

              {currentMode === "audio_to_en" && (
                <>
                  <div className="flex justify-center py-2">
                    <button
                      type="button"
                      onClick={() => playVocabAudio(currentItem)}
                      className="w-20 h-20 sm:w-24 sm:h-24 bg-orange-500 hover:bg-orange-600 text-white rounded-3xl flex items-center justify-center text-3xl sm:text-4xl shadow-lg transition transform active:scale-95"
                      title="Play Audio"
                    >
                      🔊
                    </button>
                  </div>
                  <span className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-300 block">
                    Listen carefully and type the English translation
                  </span>
                  <span className="text-xs sm:text-sm text-slate-400 italic">
                    (Romaji hint: {currentItem.romaji})
                  </span>
                </>
              )}

              {currentMode === "en_to_jp" && (
                <>
                  <span className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-slate-100 block tracking-tight">
                    {currentItem.english_text}
                  </span>
                  <p className="text-xs sm:text-sm text-slate-400 pt-2">Type the Japanese text (kana/kanji) or romaji:</p>
                </>
              )}

              {currentMode === "en_to_voice" && (
                <>
                  <span className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-slate-100 block tracking-tight">
                    {currentItem.english_text}
                  </span>
                  <span className="text-sm sm:text-base text-slate-500 block pt-2">
                    Target Japanese: <strong className="text-orange-600 dark:text-orange-400">{currentItem.jp_text}</strong> ({currentItem.romaji})
                  </span>
                </>
              )}
            </div>

            {/* 入力フォーム または 音声ボタン */}
            {currentMode !== "en_to_voice" ? (
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder={currentMode === "en_to_jp" ? "Type Japanese or Romaji..." : "Type English translation..."}
                  className={`w-full px-6 py-5 rounded-2xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold text-lg sm:text-xl focus:outline-none focus:ring-2 transition shadow-sm ${
                    feedback === "correct"
                      ? "border-emerald-500 ring-2 ring-emerald-500 bg-emerald-50/20"
                      : feedback === "incorrect"
                      ? "border-rose-500 ring-2 ring-rose-500 bg-rose-50/20 animate-shake"
                      : "border-slate-200 dark:border-slate-700 focus:ring-orange-500"
                  }`}
                  autoFocus
                  autoComplete="off"
                />
                {feedback === "correct" && (
                  <p className="text-center text-sm font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">
                    ✨ Correct! Great job!
                  </p>
                )}
                {feedback === "incorrect" && (
                  <p className="text-center text-sm font-bold text-rose-600 dark:text-rose-400">
                    ❌ Incorrect. Correct answer: <span className="underline">{currentMode === "en_to_jp" ? currentItem.jp_text : currentItem.english_text}</span>
                  </p>
                )}
              </form>
            ) : (
              <div className="text-center space-y-4 py-2">
                <button
                  type="button"
                  onClick={startSpeechRecognition}
                  disabled={isListening}
                  className={`w-full py-5 px-8 rounded-2xl font-black text-base text-white shadow-md transition flex items-center justify-center gap-3 ${
                    isListening
                      ? "bg-amber-500 animate-pulse"
                      : "bg-orange-500 hover:bg-orange-600 active:scale-95"
                  }`}
                >
                  <span className="text-2xl">🎤</span>
                  <span>{isListening ? "Listening... Speak now!" : "Click to Speak in Japanese"}</span>
                </button>
                {speechStatusMessage && (
                  <p className={`text-sm font-bold ${feedback === "correct" ? "text-emerald-600" : "text-slate-600 dark:text-slate-400"}`}>
                    {speechStatusMessage}
                  </p>
                )}
              </div>
            )}

          </div>
        ) : (
          <div className="text-center space-y-6 py-12 flex-1 flex flex-col justify-center items-center">
            <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center text-5xl font-black shadow-inner">
              🏆
            </div>
            <div className="space-y-2 max-w-md">
              <h4 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
                Vocabulary Drill Mastered!
              </h4>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                You successfully completed all required drills. The Vocabulary Task is now marked as completed in your lesson progress!
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="py-4 px-10 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-base transition shadow-md cursor-pointer"
            >
              Return to Lesson
            </button>
          </div>
        )}

      </div>
    </div>
  );
};