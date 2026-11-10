/**
 * @file app/components/lessons/EduReadingDrillModal.tsx
 * @description 日本語・英語両方のスマート表記ゆれ対応、録音安定制御、デュアルチェック付きリーディングドリル
 */

import React, { useState, useEffect, useRef } from "react";

interface ReadingItem {
  id?: string | number;
  jp_text: string;         // 対象の日本語（文や語彙）
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
  
  // デュアルチェックの状態管理
  const [speechVerified, setSpeechVerified] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [userSpokenText, setUserSpokenText] = useState(""); // 認識されたテキスト
  
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // 音声認識・音声合成用 ref
  const [isListening, setIsListening] = useState(false);
  const [speechStatusMessage, setSpeechStatusMessage] = useState("");
  
  const recognitionRef = useRef<any>(null);
  const isManuallyStoppedRef = useRef<boolean>(false); // 勝手な再起動を防ぐフラグ
  const inputRef = useRef<HTMLInputElement>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // 目標スコア
  const targetScore = Math.max(items.length, 5);

  // 初期化・シャッフル
  useEffect(() => {
    if (isOpen && items.length > 0) {
      const shuffled = [...items].sort(() => Math.random() - 0.5);
      setShuffledItems(shuffled);
      setCurrentIndex(0);
      setScore(0);
      setSpeechVerified(false);
      setUserInput("");
      setUserSpokenText("");
      setFeedback(null);
      setIsFinished(false);
      setSpeechStatusMessage("");
      isManuallyStoppedRef.current = false;
    }

    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch(e) {}
      }
    };
  }, [isOpen, items]);

  if (!isOpen || shuffledItems.length === 0) return null;

  const currentItem = shuffledItems[currentIndex % shuffledItems.length];

  // 音声合成フォールバック
  const playFallbackSpeech = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // 模範音声再生
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

  // 💡 汎用スマート日本語表記ゆれ対応ヘルパー関数
  const normalizeJapanese = (str: string): string => {
    if (!str) return "";
    let s = str.trim().toLowerCase();
    
    s = s.replace(/[?.!,。、・\s]+/g, "");

    const map: { [key: string]: string } = {
      "１": "1", "一": "1", "ひと": "1", "いち": "1",
      "２": "2", "二": "2", "ふた": "2", "に": "2",
      "３": "3", "三": "3", "みっ": "3", "さん": "3",
      "４": "4", "四": "4", "よん": "4", "し": "4", "よ": "4",
      "５": "5", "五": "5", "いつ": "5", "ご": "5",
      "６": "6", "六": "6", "むっ": "6", "ろく": "6",
      "７": "7", "七": "7", "なな": "7", "しち": "7",
      "８": "8", "八": "8", "やっ": "8", "はち": "8",
      "９": "9", "九": "9", "ここの": "9", "きゅう": "9", "く": "9",
      "１０": "10", "十": "10", "とお": "10", "じゅう": "10",
      "人": "にん", "ニン": "にん", "りん": "にん",
      "匹": "ひき", "才": "さい", "歳": "さい", "本": "ほん", "個": "こ"
    };

    for (const [key, val] of Object.entries(map)) {
      s = s.split(key).join(val);
    }

    s = s.replace(/ひとり/g, "1人");
    s = s.replace(/ふたり/g, "2人");

    return s;
  };

  // 💡 汎用スマート英語表記ゆれ対応ヘルパー関数（大文字小文字、句読点、余分なスペースを柔軟に吸収）
  const normalizeEnglish = (str: string): string => {
    if (!str) return "";
    let s = str.trim().toLowerCase();
    // 末尾のピリオド、クエスチョンマーク、カンマや記号を除去
    s = s.replace(/[?.!,]+$/, "");
    // 連続するスペースや特殊記号を単一スペースに正規化
    s = s.replace(/[\s\-_]+/g, " ");
    return s.trim();
  };

  // 🎙️ 録音開始
  const startRecording = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechStatusMessage("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    try {
      isManuallyStoppedRef.current = false;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = "ja-JP";
      recognition.interimResults = true;
      recognition.maxAlternatives = 5;
      recognition.continuous = true;

      recognition.onstart = () => {
        setIsListening(true);
        setUserSpokenText("");
        setSpeechStatusMessage("🔴 Recording... Speak clearly into the microphone, then click 'Stop & Verify'.");
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        if (currentText) {
          setUserSpokenText(currentText);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (!isManuallyStoppedRef.current) {
          setIsListening(false);
          setSpeechStatusMessage("Voice recognition error. Please click 'Start Recording' again.");
        }
      };

      recognition.onend = () => {
        if (!isManuallyStoppedRef.current) {
          setIsListening(false);
        }
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
      setSpeechStatusMessage("Could not start recording. Please check microphone permissions.");
    }
  };

  // ⏹️ 録音停止 ＆ 検証
  const stopRecordingAndVerify = () => {
    isManuallyStoppedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);

    if (!userSpokenText.trim()) {
      setSpeechStatusMessage("No speech detected. Please click 'Start Recording' and try speaking.");
      return;
    }

    const targetJpClean = normalizeJapanese(currentItem.jp_text);
    const spokenClean = normalizeJapanese(userSpokenText);

    const isSpeechCorrect = 
      spokenClean === targetJpClean || 
      spokenClean.includes(targetJpClean) || 
      targetJpClean.includes(spokenClean);

    if (isSpeechCorrect) {
      setSpeechVerified(true);
      setSpeechStatusMessage(`🎤 Voice Verified! ("${userSpokenText}"). Now type the English meaning below.`);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setSpeechStatusMessage(`Heard: "${userSpokenText}" (Target: ${currentItem.jp_text}). Try recording again!`);
    }
  };

  // 英語意味タイピング判定（スマート英語表記ゆれ対応を適用）
  const handleTypingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || feedback !== null) return;

    const cleanInput = normalizeEnglish(userInput);
    const correctEn = normalizeEnglish(currentItem.english_text || "");

    // 完全一致または部分一致（複数の訳語が含まれている場合の柔軟判定）
    const isTypingCorrect = 
      cleanInput === correctEn || 
      correctEn.includes(cleanInput) || 
      cleanInput.includes(correctEn);

    if (isTypingCorrect) {
      setFeedback("correct");
      const nextScore = score + 1;
      setScore(nextScore);

      setTimeout(() => {
        setUserInput("");
        setUserSpokenText("");
        setFeedback(null);
        setSpeechVerified(false);
        setSpeechStatusMessage("");
        isManuallyStoppedRef.current = false;

        if (nextScore >= targetScore) {
          setIsFinished(true);
          onCompleted();
        } else {
          const nextIdx = currentIndex + 1;
          if (nextIdx % shuffledItems.length === 0) {
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
              Step 1: Record & Read Aloud ➔ Step 2: Type English meaning ({score} / {targetScore} completed)
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
            
            {/* 進捗バー */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
              <div 
                className="bg-orange-500 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, (score / targetScore) * 100)}%` }}
              />
            </div>

            {/* 問題文（日本語のみ・ローマ字なし） */}
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-10 text-center space-y-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={playModelAudio}
                  className="text-xs bg-slate-200 dark:bg-slate-700 hover:bg-orange-500 hover:text-white px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🔊</span> Listen Model Audio
                </button>
              </div>

              <span className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-slate-100 block tracking-tight leading-relaxed">
                {currentItem.jp_text}
              </span>
            </div>

            {/* デュアルチェックセクション */}
            <div className="space-y-4">
              
              {/* ステップ1: 録音コントロール ＆ テキスト化表示 */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={speechVerified || isListening}
                    className={`py-4 px-4 rounded-2xl font-black text-sm text-white shadow-md transition flex items-center justify-center gap-2 ${
                      speechVerified
                        ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                        : isListening
                        ? "bg-amber-500 animate-pulse"
                        : "bg-emerald-600 hover:bg-emerald-700 active:scale-95 cursor-pointer"
                    }`}
                  >
                    <span>🎙️</span>
                    <span>{isListening ? "Recording..." : "Start Recording"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={stopRecordingAndVerify}
                    disabled={speechVerified || !isListening}
                    className={`py-4 px-4 rounded-2xl font-black text-sm text-white shadow-md transition flex items-center justify-center gap-2 ${
                      speechVerified || !isListening
                        ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                        : "bg-rose-600 hover:bg-rose-700 active:scale-95 cursor-pointer"
                    }`}
                  >
                    <span>⏹️</span>
                    <span>Stop & Verify</span>
                  </button>
                </div>

                {/* 発話テキスト化の自己確認ボックス */}
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center min-h-[70px] flex flex-col justify-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-bold mb-1">
                    Your Spoken Text (認識されたあなたの発音):
                  </span>
                  <span className={`text-base sm:text-lg font-black ${userSpokenText ? "text-slate-900 dark:text-slate-100" : "text-slate-400 italic"}`}>
                    {userSpokenText ? `"${userSpokenText}"` : "(Click 'Start Recording' and speak into your mic)"}
                  </span>
                </div>

                {speechStatusMessage && (
                  <p className={`text-xs sm:text-sm font-bold text-center ${speechVerified ? "text-emerald-600" : "text-slate-600 dark:text-slate-400"}`}>
                    {speechStatusMessage}
                  </p>
                )}
              </div>

              {/* ステップ2: 英語意味タイピング */}
              <form onSubmit={handleTypingSubmit} className="space-y-3">
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    disabled={!speechVerified}
                    placeholder={speechVerified ? "Step 2: Type English meaning..." : "Complete Step 1 (Record & Verify) above first ↑"}
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
                    className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-base transition shadow cursor-pointer"
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