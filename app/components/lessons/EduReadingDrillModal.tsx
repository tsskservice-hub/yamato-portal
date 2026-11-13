/**
 * @file app/components/lessons/EduReadingDrillModal.tsx
 * @description 全問完了時にお祝いメッセージを表示するリーディングドリルモーダル
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { normalizeJapanese, normalizeEnglish } from "~/utils/normalization";
import { useSoundEffect } from "~/hooks/useSoundEffect";
import { EduFinishedView } from "~/components/lessons/EduFinishedView";

interface ReadingItem {
  id?: string | number;
  jp_text: string; // 対象の日本語（文や語彙）
  english_text: string; // 英語の意味・翻訳
  audio_url?: string; // 任意：自作音声MP3 URL
}

interface EduReadingDrillModalProps {
  items: ReadingItem[];
  isOpen: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

// ---------- ユーティリティ ----------

/** Fisher-Yates シャッフル（元配列は変更しない） */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** レーベンシュタイン距離 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[b.length];
}

/** 類似度 0〜1 */
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

const JP_SIMILARITY_THRESHOLD = 0.8;
const EN_SIMILARITY_THRESHOLD = 0.85;
const SHORT_TEXT_LENGTH = 3; // これ以下は完全一致のみ

/** 厳格な一致判定（部分一致は使わない） */
function isStrictMatch(input: string, target: string, threshold: number): boolean {
  if (!input || !target) return false;
  if (input === target) return true;
  if (Math.max(input.length, target.length) <= SHORT_TEXT_LENGTH) return false;
  return similarity(input, target) >= threshold;
}

// ---------- コンポーネント ----------

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

  // 録音停止後、判定の前に「この文字でいいか」を生徒が確認するステップ
  // （意図と違う文字に変換されたら、判定せずに録音し直せる）
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const awaitingConfirmRef = useRef(false);
  const setAwaiting = (v: boolean) => {
    awaitingConfirmRef.current = v;
    setAwaitingConfirm(v);
  };

  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 音声認識・音声合成用
  const [isListening, setIsListening] = useState(false);
  const [speechStatusMessage, setSpeechStatusMessage] = useState("");

  const recognitionRef = useRef<any>(null);
  const isManuallyStoppedRef = useRef<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // 同期的に最新値を参照するための ref
  const spokenTextRef = useRef("");
  const isListeningRef = useRef(false);
  const speechVerifiedRef = useRef(false);
  const finalizedRef = useRef(false); // 1回の録音につき判定は1回だけ
  const finalizeFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初期化・完了管理
  const initializedRef = useRef(false);
  const isFinishedRef = useRef(false);
  const completedRef = useRef(false);
  const onCompletedRef = useRef(onCompleted);
  const itemsRef = useRef<ReadingItem[]>(items);

  // タイマー管理
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 効果音（正解音・完了音）。ほかのタスクと同じ useSoundEffect を使う
  const { playSound, playCompleteSound } = useSoundEffect();
  const playCompleteSoundRef = useRef(playCompleteSound);
  playCompleteSoundRef.current = playCompleteSound;

  // 毎レンダーで最新値を ref に反映
  onCompletedRef.current = onCompleted;
  itemsRef.current = items;
  isFinishedRef.current = isFinished;
  speechVerifiedRef.current = speechVerified;

  // items の「中身」が変わった時だけ検知する（参照が変わるだけでは再初期化しない）
  const itemsKey = useMemo(
    () => items.map((i) => `${i.id ?? ""}|${i.jp_text}|${i.english_text}`).join("\u0001"),
    [items]
  );

  const totalItems = shuffledItems.length;
  const currentItem: ReadingItem =
    shuffledItems[currentIndex] || items[0] || { jp_text: "", english_text: "" };
  const currentItemRef = useRef<ReadingItem>(currentItem);
  currentItemRef.current = currentItem;

  const clearTimers = () => {
    [nextTimerRef, feedbackTimerRef, focusTimerRef, finalizeFallbackTimerRef].forEach((ref) => {
      if (ref.current) {
        clearTimeout(ref.current);
        ref.current = null;
      }
    });
  };

  const resetSpokenEdit = () => {
    setAwaiting(false);
  };

  const stopAllMedia = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null; // 古いイベントを無視させる
      try {
        rec.abort();
      } catch (e) {}
    }
    isListeningRef.current = false;
  };

  // 初期化・シャッフル（開いた時 / items の中身が変わった時のみ）
  useEffect(() => {
    if (!isOpen) {
      initializedRef.current = false;
      return;
    }

    // 完了後に親が items を更新しても、お祝い画面は維持する
    if (initializedRef.current && isFinishedRef.current) return;

    const source = itemsRef.current;
    if (source.length === 0) return;

    clearTimers();
    stopAllMedia();

    setShuffledItems(shuffleArray(source));
    setCurrentIndex(0);
    setScore(0);
    setSpeechVerified(false);
    setUserInput("");
    setUserSpokenText("");
    spokenTextRef.current = "";
    resetSpokenEdit();
    setFeedback(null);
    setIsFinished(false);
    setIsListening(false);
    setSpeechStatusMessage("");
    isManuallyStoppedRef.current = false;
    finalizedRef.current = false;
    completedRef.current = false;
    initializedRef.current = true;
  }, [isOpen, itemsKey]);

  // 閉じた時・アンマウント時のクリーンアップ
  useEffect(() => {
    if (!isOpen) return;
    return () => {
      clearTimers();
      stopAllMedia();
    };
  }, [isOpen]);

  // 完了時に完了音を鳴らし、onCompleted を1回だけ呼ぶ
  useEffect(() => {
    if (isFinished && !completedRef.current) {
      completedRef.current = true;
      playCompleteSoundRef.current(); // 🎉 完了音
      onCompletedRef.current();
    }
  }, [isFinished]);

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

  // 🎯 音声の最終判定（onend で最終結果が届いてから実行）
  const finalizeVerification = useCallback(() => {
    if (finalizedRef.current || speechVerifiedRef.current) return;
    finalizedRef.current = true;

    if (finalizeFallbackTimerRef.current) {
      clearTimeout(finalizeFallbackTimerRef.current);
      finalizeFallbackTimerRef.current = null;
    }

    isListeningRef.current = false;
    setIsListening(false);

    const spoken = spokenTextRef.current.trim();
    if (!spoken) {
      setSpeechStatusMessage("No speech detected. Please click 'Start Recording' and try speaking.");
      return;
    }

    // すぐには判定せず、生徒に「この文字でいいか」を確認してもらう
    setAwaiting(true);
    setSpeechStatusMessage(
      "Is this what you said? If not, press 'Record Again' (Space). If yes, press 'Check' (Enter)."
    );
  }, []);

  // ✅ 生徒が「この文字でOK」と確認した時に判定する
  const confirmSpokenText = useCallback(() => {
    if (!awaitingConfirmRef.current || speechVerifiedRef.current) return;
    const spoken = spokenTextRef.current.trim();
    setAwaiting(false);
    if (!spoken) return;
    verifySpokenText(spoken);
  }, []);

  /** 発話テキストを判定する */
  const verifySpokenText = (spoken: string) => {
    const target = currentItemRef.current.jp_text;
    const targetClean = normalizeJapanese(target);
    const spokenClean = normalizeJapanese(spoken);

    if (isStrictMatch(spokenClean, targetClean, JP_SIMILARITY_THRESHOLD)) {
      setSpeechVerified(true);
      speechVerifiedRef.current = true;
      setSpeechStatusMessage(`🎤 Voice Verified! ("${spoken}"). Now type the English meaning below.`);
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      focusTimerRef.current = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setSpeechStatusMessage(`Heard: "${spoken}" (Target: ${target}). Try recording again!`);
    }
  };

  // 🎙️ 録音開始
  const startRecording = useCallback(() => {
    if (speechVerifiedRef.current || isListeningRef.current) return;
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechStatusMessage("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    if (recognitionRef.current) {
      const old = recognitionRef.current;
      recognitionRef.current = null;
      try {
        old.abort();
      } catch (e) {}
    }

    try {
      isManuallyStoppedRef.current = false;
      finalizedRef.current = false;
      spokenTextRef.current = "";

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = "ja-JP";
      recognition.interimResults = true;
      recognition.maxAlternatives = 5;
      recognition.continuous = true;

      recognition.onstart = () => {
        if (recognitionRef.current !== recognition) return;
        isListeningRef.current = true;
        setIsListening(true);
        setUserSpokenText("");
        setAwaiting(false);
        setSpeechStatusMessage("🔴 Recording... Speak clearly, or press Spacebar to Stop & Verify.");
      };

      recognition.onresult = (event: any) => {
        if (recognitionRef.current !== recognition) return;
        // continuous モードでは先頭から全結果を連結する
        let text = "";
        for (let i = 0; i < event.results.length; ++i) {
          text += event.results[i][0].transcript;
        }
        if (text) {
          spokenTextRef.current = text;
          setUserSpokenText(text);
        }
      };

      recognition.onerror = (event: any) => {
        if (recognitionRef.current !== recognition) return;
        console.warn("Speech recognition error:", event.error);
        if (event.error === "aborted") return;

        if (event.error === "no-speech") {
          // onend → finalizeVerification で「No speech detected」を表示
          return;
        }

        finalizedRef.current = true; // エラー時は判定しない
        isListeningRef.current = false;
        setIsListening(false);
        setSpeechStatusMessage(
          event.error === "not-allowed"
            ? "Microphone access was denied. Please allow microphone permissions."
            : "Voice recognition error. Please click 'Start Recording' again."
        );
      };

      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return;
        // 手動停止でも自然終了でも、最終結果が届いたこのタイミングで判定する
        finalizeVerification();
      };

      recognition.start();
    } catch (err) {
      isListeningRef.current = false;
      setIsListening(false);
      setSpeechStatusMessage("Could not start recording. Please check microphone permissions.");
    }
  }, [finalizeVerification]);

  // ⏹️ 録音停止 ＆ 検証
  const stopRecordingAndVerify = useCallback(() => {
    if (speechVerifiedRef.current || !isListeningRef.current) return;
    isManuallyStoppedRef.current = true;
    setSpeechStatusMessage("Processing...");

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop(); // 最終結果の後に onend が発火する
      } catch (e) {}
    }

    // 保険：onend が来ない環境でも判定が走るようにする
    if (finalizeFallbackTimerRef.current) clearTimeout(finalizeFallbackTimerRef.current);
    finalizeFallbackTimerRef.current = setTimeout(() => {
      finalizeVerification();
    }, 1200);
  }, [finalizeVerification]);

  // ⌨️ スペースキーによる録音コントロール
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || isFinished) return;
      if (e.code === "Space") {
        const activeElem = document.activeElement;
        const isInputFocused =
          activeElem?.tagName === "INPUT" || activeElem?.tagName === "TEXTAREA";

        if (isInputFocused && speechVerified) return;

        e.preventDefault();
        if (e.repeat) return;

        if (!isListening && !speechVerified) {
          startRecording();
        } else if (isListening) {
          stopRecordingAndVerify();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isListening, speechVerified, isFinished, startRecording, stopRecordingAndVerify]);

  // ⏎ 確認待ちの時は Enter で判定
  useEffect(() => {
    if (!isOpen || !awaitingConfirm) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.repeat) return;
      e.preventDefault();
      confirmSpokenText();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, awaitingConfirm, confirmSpokenText]);

  // 英語意味タイピング判定
  const handleTypingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || feedback !== null) return;

    const cleanInput = normalizeEnglish(userInput);
    const correctEn = normalizeEnglish(currentItem.english_text || "");

    if (isStrictMatch(cleanInput, correctEn, EN_SIMILARITY_THRESHOLD)) {
      setFeedback("correct");
      playSound(); // ✅ 正解音
      setScore((prev) => prev + 1);

      if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
      nextTimerRef.current = setTimeout(() => {
        nextTimerRef.current = null;
        setUserInput("");
        setUserSpokenText("");
        spokenTextRef.current = "";
        resetSpokenEdit();
        setFeedback(null);
        setSpeechVerified(false);
        speechVerifiedRef.current = false;
        setSpeechStatusMessage("");
        isManuallyStoppedRef.current = false;
        finalizedRef.current = false;

        const nextIndex = currentIndex + 1;
        if (nextIndex >= totalItems) {
          // onCompleted は isFinished の useEffect で1回だけ呼ばれる
          setIsFinished(true);
        } else {
          setCurrentIndex(nextIndex);
        }
      }, 1200);
    } else {
      setFeedback("incorrect");
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => {
        feedbackTimerRef.current = null;
        setFeedback(null);
      }, 1500);
    }
  };

  // 完了後は items が空になってもお祝い画面を維持する
  if (!isOpen || (totalItems === 0 && !isFinished)) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full p-6 sm:p-10 shadow-2xl space-y-6 transition-all duration-300 ${
          isFullscreen
            ? "max-w-full min-h-screen sm:min-h-[90vh] flex flex-col justify-between rounded-none sm:rounded-3xl"
            : "max-w-2xl"
        }`}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>📖</span>
              <span>Reading Comprehension Drill</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Step 1: Record & Read Aloud (Press{" "}
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border rounded text-xs font-mono">
                Space
              </kbd>
              ) ➔ Step 2: Type English ({score} / {totalItems})
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
                style={{ width: `${Math.min(100, (score / totalItems) * 100)}%` }}
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
                    <span>{isListening ? "Recording... (Space to Stop)" : "Start Recording (Space)"}</span>
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
                  <span
                    className={`text-base sm:text-lg font-black ${
                      userSpokenText ? "text-slate-900 dark:text-slate-100" : "text-slate-400 italic"
                    }`}
                  >
                    {userSpokenText
                      ? `"${userSpokenText}"`
                      : "(Press Spacebar or click 'Start Recording' and speak)"}
                  </span>
                </div>

                {speechStatusMessage && (
                  <p
                    className={`text-xs sm:text-sm font-bold text-center ${
                      speechVerified ? "text-emerald-600" : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {speechStatusMessage}
                  </p>
                )}

                {/* 判定前の確認：意図と違う文字なら判定せずに録音し直せる */}
                {awaitingConfirm && !speechVerified && !isListening && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={startRecording}
                      className="py-3 px-3 rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-orange-500 hover:text-orange-600 font-black text-sm transition flex flex-col items-center justify-center cursor-pointer active:scale-95"
                    >
                      <span>🔁 Record Again (Space)</span>
                      <span className="text-xs font-bold opacity-75">Not what I said</span>
                    </button>
                    <button
                      type="button"
                      onClick={confirmSpokenText}
                      className="py-3 px-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm transition shadow flex flex-col items-center justify-center cursor-pointer active:scale-95"
                    >
                      <span>✅ Check (Enter)</span>
                      <span className="text-xs font-bold opacity-90">This is what I said</span>
                    </button>
                  </div>
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
                    placeholder={
                      speechVerified
                        ? "Step 2: Type English meaning..."
                        : "Complete Step 1 (Record & Verify) above first ↑"
                    }
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
                    className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-base transition shadow cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Submit English Meaning ➔</span>
                    <span className="text-xs opacity-80 font-normal">(Press Enter to Submit)</span>
                  </button>
                )}

                {feedback === "correct" && (
                  <p className="text-center text-sm font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">
                    ✨ Correct! Both speech and meaning matched! Moving to next...
                  </p>
                )}
                {feedback === "incorrect" && (
                  <p className="text-center text-sm font-bold text-rose-600 dark:text-rose-400">
                    ❌ Incorrect English meaning. Correct answer:{" "}
                    <span className="underline">{currentItem.english_text}</span>
                  </p>
                )}
              </form>
            </div>
          </div>
        ) : (
          // ほかのタスクと共通の完了画面
          <EduFinishedView taskName="reading and comprehension items" onClose={onClose} />
        )}
      </div>
    </div>
  );
};