/**
 * @file app/components/lessons/EduReadingDrillModal.tsx
 * @description 語彙および文章（リーディング）対応のデュアルチェックドリル（音声発話 ＋ 英語意味タイピング）
 */

import React, { useState, useEffect, useRef } from "react";

interface ReadingItem {
  id?: string | number;
  jp_text: string;         // 対象の日本語（文や語彙）
  romaji?: string;         // ローマ字（任意）
  english_text: string;    // 英語の意味・翻訳
  audio_url?: string;      // 任意：自作音声MP3 URL
}

interface EduReadingDrillModalProps {
  items: ReadingItem[];
  isOpen: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

export const EduReadingDrillModal: React.FC<EduReadingDrillModalProps> = ({
  items = [],
  isOpen,
  onClose,
  onCompleted,
}) => {
  const [shuffledItems, setShuffledItems] = useState<ReadingItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // デュアルチェックのステップ管理 ("speech" -> "typing")
  const [drillStep, setDrillStep] = useState<"speech" | "typing">("speech");
  const [speechVerified, setSpeechVerified] = useState(false);
  const [userInput, setUserInput] = useState("");
  
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // 音声認識・音声合成・オーディオ用ref
  const [isListening, setIsListening] = useState(false);
  const [speechStatusMessage, setSpeechStatusMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // 目標スコア（itemsの数、または最低5問）
  const targetScore = Math.max(items.length, 5);

  // モーダルオープン時・アイテム変更時の初期化とシャッフル
  useEffect(() => {
    if (isOpen && items.length > 0) {
      const shuffled = [...items].sort(() => Math.random() - 0.5);
      setShuffledItems(shuffled);
      setCurrentIndex(0);
      setScore(0);
      setDrillStep("speech");
      setSpeechVerified(false);
      setUserInput("");
      setFeedback(null);
      setIsFinished(false);
      setSpeechStatusMessage("");
    }

    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isOpen, items]);

  if (!isOpen || shuffledItems.length === 0) return null;

  const currentItem = shuffledItems[currentIndex % shuffledItems.length];

  // 音声合成によるフォールバック
  const playFallbackSpeech = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // 模範音声の再生（リスニング確認用）
  const playModelAudio = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (currentItem?.audio_url && currentItem.audio_url.trim() !== "") {
      const audio = new Audio(currentItem.audio_url);
      activeAudioRef.current = audio;
      audio.play().catch((err) => {
        console.warn("Audio playback failed:", err);
        activeAudioRef.current = null;
      });
      return;
    }

    playFallbackSpeech(currentItem?.jp_text);
  };

  // 表記ゆれや句読点を正規化するヘルパー関数
  const normalizeAnswer = (str: string): string => {
    if (!str) return "";
    let s = str.trim().toLowerCase();
    s = s.replace(/[?.!,。、・]+$/, "");
    s = s.replace(/\s+/g, " ");
    return s;
  };

  // ステップ1: 音声認識（朗読チェック）
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
      setSpeechStatusMessage("Listening... Read the Japanese text clearly.");
    };

    recognition.onresult = (event: any) => {
      const speechResult = event.results[0][0].transcript;
      const targetJp = currentItem.jp_text.trim();

      // 発話内容にターゲットが含まれているか、またはターゲットに含まれているか判定
      const isSpeechCorrect = speechResult.includes(targetJp) || targetJp.includes(speechResult) || normalizeAnswer(speechResult) === normalizeAnswer(targetJp);

      if (isSpeechCorrect) {
        setSpeechVerified(true);
        setDrillStep("typing");
        setSpeechStatusMessage(`🎤 Voice Verified! ("${speechResult}"). Now type the English meaning below.`);
        setIsListening(false);
        // タイピング欄へフォーカス
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      } else {
        setSpeechStatusMessage(`Heard: "${speechResult}". Please try reading aloud again!`);
        setIsListening(false);
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

  // ステップ2: 英語意味タイピングの判定と次への進行
  const handleTypingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || feedback !== null) return;

    const cleanInput = normalizeAnswer(userInput);
    const correctEn = normalizeAnswer(currentItem.english_text || "");
    const isTypingCorrect = cleanInput === correctEn || correctEn.includes(cleanInput);

    if (isTypingCorrect) {
      setFeedback("correct");
      const nextScore = score + 1;
      setScore(nextScore);

      setTimeout(() => {
        setUserInput("");
        setFeedback(null);
        setSpeechVerified(false);
        setDrillStep("speech");
        setSpeechStatusMessage("");

        if (nextScore >= targetScore) {
          setIsFinished(true);
          onCompleted();
        } else {
          const nextIdx = currentIndex + 1;
          if (nextIdx % shuffledItems.length === 0) {
            // 全問終了したら再シャッフルして継続
            const reShuffled = [...items].sort(() => Math.random() - 0.5);
            setShuffledItems(reShuffled);
            setCurrentIndex(0);
          } else {
            setCurrentIndex(nextIdx);
          }
        }
      }, 1200);
    } else {
      setFeedback("incorrect");
      setTimeout(() => setFeedback(null), 1500);
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
              <span>Reading Comprehension Drill</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Step 1: Read aloud in Japanese ➔ Step 2: Type English meaning ({score} / {targetScore} completed)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold text-sm p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 transition"
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
            
            {/* プロジェクト進捗バー */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
              <div 
                className="bg-orange-500 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, (score / targetScore) * 100)}%` }}
              />
            </div>

            {/* 問題文・リーディング表示エリア */}
            <div className={`bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-10 text-center space-y-4`}>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={playModelAudio}
                  className="text-xs bg-slate-200 dark:bg-slate-700 hover:bg-orange-500 hover:text-white px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5"
                  title="Listen to model pronunciation"
                >
                  <span>🔊</span> Listen Model Audio
                </button>
              </div>

              <span className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 block tracking-tight leading-relaxed">
                {currentItem.jp_text}
              </span>
              {currentItem.romaji && (
                <span className="text-sm sm:text-base font-medium text-slate-500 italic block">
                  {currentItem.romaji}
                </span>
              )}
            </div>

            {/* デュアルチェック進行ステップ */}
            <div className="space-y-4">
              
              {/* ステップ1: 音声発話ボタン */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={startSpeechRecognition}
                  disabled={speechVerified || isListening}
                  className={`w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base text-white shadow-md transition flex items-center justify-center gap-3 ${
                    speechVerified
                      ? "bg-emerald-500 cursor-default"
                      : isListening
                      ? "bg-amber-500 animate-pulse"
                      : "bg-orange-500 hover:bg-orange-600 active:scale-95"
                  }`}
                >
                  <span className="text-2xl">🎤</span>
                  <span>
                    {speechVerified
                      ? "Step 1 Completed: Speech Verified!"
                      : isListening
                      ? "Listening... Speak Japanese now!"
                      : "Step 1: Click & Read Aloud in Japanese"}
                  </span>
                </button>
                {speechStatusMessage && (
                  <p className={`text-xs sm:text-sm font-bold text-center ${speechVerified ? "text-emerald-600" : "text-slate-600 dark:text-slate-400"}`}>
                    {speechStatusMessage}
                  </p>
                )}
              </div>

              {/* ステップ2: 英語意味タイピングフォーム */}
              <form onSubmit={handleTypingSubmit} className="space-y-3">
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    disabled={!speechVerified}
                    placeholder={speechVerified ? "Step 2: Type English meaning..." : "Complete Step 1 (Speech) above first ↑"}
                    className={`w-full px-6 py-5 rounded-2xl border font-bold text-lg sm:text-xl transition shadow-sm ${
                      feedback === "correct"
                        ? "border-emerald-500 ring-2 ring-emerald-500 bg-emerald-50/20 text-emerald-900"
                        : feedback === "incorrect"
                        ? "border-rose-500 ring-2 ring-rose-500 bg-rose-50/20 animate-shake text-rose-900"
                        : speechVerified
                        ? "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-orange-500"
                        : "bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed"
                    }`}
                    autoComplete="off"
                  />
                </div>

                {speechVerified && feedback === null && (
                  <button
                    type="submit"
                    className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-base transition shadow"
                  >
                    Submit English Meaning ➔
                  </button>
                )}

                {feedback === "correct" && (
                  <p className="text-center text-sm font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">
                    ✨ Correct! Both speech and meaning matched! Moving to next...
                  </p>
                )}
                {feedback === "incorrect" && (
                  <p className="text-center text-sm font-bold text-rose-600 dark:text-rose-400">
                    ❌ Incorrect English meaning. Correct answer: <span className="underline">{currentItem.english_text}</span>
                  </p>
                )}
              </form>

            </div>

          </div>
        ) : (
          <div className="text-center space-y-6 py-12 flex-1 flex flex-col justify-center items-center">
            <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center text-5xl font-black shadow-inner">
              🏆
            </div>
            <div className="space-y-2 max-w-md">
              <h4 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
                Reading Task Mastered!
              </h4>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                You successfully completed all required reading and comprehension checks. This task is now marked as complete!
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