/**
 * @file app/components/lessons/EduListeningTaskModal.tsx
 * @description 「何人家族ですか」「〜人家族です」の会話を聞き、人数をタイピングで答えるリスニング課題モーダル
 *              5問クリアで EduFinishedView を表示し、onCompleted を1回だけ呼ぶ
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "~/lib/supabaseClient";
import { EduFinishedView } from "~/components/lessons/EduFinishedView";
import { useSoundEffect } from "~/hooks/useSoundEffect";

// ---------- 型・設定 ----------

export interface ListeningQuestion {
  id: string | number;
  /** 任意：先に再生する質問音声のパス（例: 「なんにんかぞくですか。」） */
  question_audio_path?: string;
  /** dialogue-audio バケット内の答え音声のパス（例: "family/family_count_4.mp3"） */
  audio_path: string;
  /** 正解の人数 */
  answer_count: number;
  /** 任意：解答後に表示する会話スクリプト */
  transcript?: string;
}

interface EduListeningTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted: () => void;
  /** 省略時は DEFAULT_FAMILY_QUESTIONS を使用 */
  questions?: ListeningQuestion[];
}

const AUDIO_BUCKET = "dialogue-audio";
const QUESTIONS_PER_TASK = 5;
const MAX_ATTEMPTS_BEFORE_REVEAL = 2; // この回数間違えると答えを表示
const GAP_BETWEEN_AUDIO_MS = 400; // 質問音声と答え音声の間の間隔

/** 「なんにんかぞくですか。」の質問音声 */
const FAMILY_QUESTION_AUDIO_PATH = "family/dialogue_4fd15199-82d7-4897-a24f-79fe3cced9ed.mp3";
/** family_count_1.mp3 〜 family_count_10.mp3 */
const FAMILY_COUNT_MAX = 10;

// ---------- 解答判定ユーティリティ ----------

const KANJI_NUMBERS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const ENGLISH_NUMBERS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const HIRAGANA_READINGS: Record<number, string[]> = {
  1: ["ひとり"],
  2: ["ふたり"],
  3: ["さんにん"],
  4: ["よにん"],
  5: ["ごにん"],
  6: ["ろくにん"],
  7: ["しちにん", "ななにん"],
  8: ["はちにん"],
  9: ["きゅうにん", "くにん"],
  10: ["じゅうにん"],
};
const ROMAJI_READINGS: Record<number, string[]> = {
  1: ["hitori"],
  2: ["futari"],
  3: ["sannin"],
  4: ["yonin"],
  5: ["gonin"],
  6: ["rokunin"],
  7: ["shichinin", "nananin"],
  8: ["hachinin"],
  9: ["kyuunin", "kyunin", "kunin"],
  10: ["juunin", "junin"],
};

/**
 * Storage の family フォルダの音声から自動生成（family_count_N.mp3 = 「Nにんかぞくです。」）
 * この中からランダムに5問が出題される
 */
export const DEFAULT_FAMILY_QUESTIONS: ListeningQuestion[] = Array.from(
  { length: FAMILY_COUNT_MAX },
  (_, i) => {
    const n = i + 1;
    return {
      id: `family_count_${n}`,
      question_audio_path: FAMILY_QUESTION_AUDIO_PATH,
      audio_path: `family/family_count_${n}.mp3`,
      answer_count: n,
      transcript: `A: なんにんかぞくですか。\nB: ${HIRAGANA_READINGS[n][0]}かぞくです。`,
    };
  }
);

/** 入力を比較用に正規化（全角→半角、カタカナ→ひらがな、「人家族です」等の語尾除去） */
function normalizeAnswer(raw: string): string {
  return raw
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/[\s。、.,!?！？「」"']/g, "")
    .replace(/(です|だ)$/, "")
    .replace(/(かぞく|家族|kazoku)$/, "")
    .replace(/(people|persons|person)$/, "");
}

/** 人数 n に対して許容する解答の一覧 */
function buildAcceptedAnswers(n: number): Set<string> {
  const accepted = new Set<string>([`${n}`, `${n}人`, `${n}にん`, `${n}nin`]);
  if (KANJI_NUMBERS[n]) {
    accepted.add(KANJI_NUMBERS[n]);
    accepted.add(`${KANJI_NUMBERS[n]}人`);
  }
  if (ENGLISH_NUMBERS[n]) accepted.add(ENGLISH_NUMBERS[n]);
  (HIRAGANA_READINGS[n] || []).forEach((r) => accepted.add(r));
  (ROMAJI_READINGS[n] || []).forEach((r) => accepted.add(r));
  if (n === 1) accepted.add("一人");
  if (n === 2) accepted.add("二人");
  return accepted;
}

function isCorrectAnswer(input: string, answerCount: number): boolean {
  const clean = normalizeAnswer(input);
  if (!clean) return false;
  return buildAcceptedAnswers(answerCount).has(clean);
}

/** Fisher-Yates シャッフル（元配列は変更しない） */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getAudioUrl(path: string): string {
  return supabase.storage.from(AUDIO_BUCKET).getPublicUrl(path).data.publicUrl;
}

// ---------- 会話イラスト ----------

type Speaker = "A" | "B" | null;

/** しっぽ付きの吹き出しパス */
function bubblePath(x: number, y: number, w: number, h: number, r: number, tailX: number, tipX: number, tipY: number) {
  return [
    `M ${x + r} ${y}`,
    `H ${x + w - r}`,
    `Q ${x + w} ${y} ${x + w} ${y + r}`,
    `V ${y + h - r}`,
    `Q ${x + w} ${y + h} ${x + w - r} ${y + h}`,
    `H ${tailX + 10}`,
    `L ${tipX} ${tipY}`,
    `L ${tailX - 6} ${y + h}`,
    `H ${x + r}`,
    `Q ${x} ${y + h} ${x} ${y + h - r}`,
    `V ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    "Z",
  ].join(" ");
}

interface PersonProps {
  cx: number;
  /** 視線の向き（相手の方を向く） */
  lookDx: number;
  hair: "short" | "long";
  shirtClass: string;
  isSpeaking: boolean;
}

const Person: React.FC<PersonProps> = ({ cx, lookDx, hair, shirtClass, isSpeaking }) => {
  const cy = 128;
  return (
    <g>
      {/* 長い髪（頭の後ろ） */}
      {hair === "long" && (
        <path
          d={`M ${cx - 31} 154 C ${cx - 38} 80, ${cx + 38} 80, ${cx + 31} 154 Z`}
          className="fill-amber-900 dark:fill-amber-800"
        />
      )}
      {/* 体 */}
      <path
        d={`M ${cx - 46} 220 C ${cx - 46} 172, ${cx - 26} 156, ${cx} 156 C ${cx + 26} 156, ${cx + 46} 172, ${cx + 46} 220 Z`}
        className={shirtClass}
      />
      {/* 顔 */}
      <circle cx={cx} cy={cy} r={26} className="fill-[#f6d5b8]" />
      {/* 前髪 */}
      {hair === "short" ? (
        <path
          d={`M ${cx - 27} ${cy - 2} C ${cx - 28} ${cy - 40}, ${cx + 28} ${cy - 40}, ${cx + 27} ${cy - 2} C ${cx + 18} ${cy - 16}, ${cx - 14} ${cy - 18}, ${cx - 27} ${cy - 2} Z`}
          className="fill-slate-800 dark:fill-slate-600"
        />
      ) : (
        <path
          d={`M ${cx - 26} ${cy - 4} C ${cx - 27} ${cy - 39}, ${cx + 27} ${cy - 39}, ${cx + 26} ${cy - 4} C ${cx + 10} ${cy - 14}, ${cx - 10} ${cy - 14}, ${cx - 26} ${cy - 4} Z`}
          className="fill-amber-900 dark:fill-amber-800"
        />
      )}
      {/* 目 */}
      <circle cx={cx - 9 + lookDx} cy={cy + 2} r={2.6} className="fill-slate-800" />
      <circle cx={cx + 9 + lookDx} cy={cy + 2} r={2.6} className="fill-slate-800" />
      {/* 口：話している時は開く */}
      {isSpeaking ? (
        <ellipse cx={cx + lookDx} cy={cy + 13} rx={4.5} ry={3.5} className="fill-rose-700" />
      ) : (
        <path
          d={`M ${cx - 6 + lookDx} ${cy + 11} Q ${cx + lookDx} ${cy + 16} ${cx + 6 + lookDx} ${cy + 11}`}
          className="fill-none stroke-slate-700"
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}
    </g>
  );
};

interface SpeechBubbleProps {
  d: string;
  cx: number;
  isActive: boolean;
  content: "question" | "answer";
}

const SpeechBubble: React.FC<SpeechBubbleProps> = ({ d, cx, isActive, content }) => {
  const textClass = isActive ? "fill-orange-500" : "fill-slate-300 dark:fill-slate-600";
  return (
    <g className={`transition-opacity duration-300 ${isActive ? "opacity-100 motion-safe:animate-pulse" : "opacity-60"}`}>
      <path
        d={d}
        strokeWidth={2.5}
        strokeLinejoin="round"
        className={
          isActive
            ? "fill-orange-50 stroke-orange-500 dark:fill-orange-950"
            : "fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-600"
        }
      />
      {content === "question" ? (
        <text x={cx} y={56} textAnchor="middle" fontSize={34} fontWeight={900} className={textClass}>
          ？
        </text>
      ) : (
        [-16, 0, 16].map((dx) => <circle key={dx} cx={cx + dx} cy={42} r={5} className={textClass} />)
      )}
    </g>
  );
};

/** 会話している二人のイラスト。話している人の吹き出しが光り、口が開く */
const DialogueIllustration: React.FC<{ activeSpeaker: Speaker }> = ({ activeSpeaker }) => (
  <svg
    viewBox="0 0 360 220"
    className="w-full max-w-sm mx-auto h-auto"
    role="img"
    aria-label={
      activeSpeaker === "A"
        ? "Person A is asking a question"
        : activeSpeaker === "B"
        ? "Person B is answering"
        : "Two people having a conversation"
    }
  >
    <SpeechBubble d={bubblePath(25, 12, 140, 60, 18, 105, 98, 90)} cx={95} isActive={activeSpeaker === "A"} content="question" />
    <SpeechBubble d={bubblePath(195, 12, 140, 60, 18, 255, 262, 90)} cx={265} isActive={activeSpeaker === "B"} content="answer" />
    <Person cx={95} lookDx={3} hair="short" shirtClass="fill-sky-500" isSpeaking={activeSpeaker === "A"} />
    <Person cx={265} lookDx={-3} hair="long" shirtClass="fill-rose-400" isSpeaking={activeSpeaker === "B"} />
  </svg>
);

// ---------- コンポーネント ----------

export const EduListeningTaskModal: React.FC<EduListeningTaskModalProps> = ({
  isOpen,
  onClose,
  onCompleted,
  questions = DEFAULT_FAMILY_QUESTIONS,
}) => {
  const [taskQuestions, setTaskQuestions] = useState<ListeningQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<Speaker>(null); // イラストの話し手
  const isPlayingRef = useRef(false); // キー操作で同期的に再生中かを判定するため
  isPlayingRef.current = isPlaying;
  const [audioError, setAudioError] = useState("");

  const { playSound, playCompleteSound } = useSoundEffect(); // 正解音・完了音
  const playCompleteSoundRef = useRef(playCompleteSound);
  playCompleteSoundRef.current = playCompleteSound;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackIdRef = useRef(0); // 再生し直した時に古い再生チェーンを無効化する
  const inputRef = useRef<HTMLInputElement>(null);
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);
  const onCompletedRef = useRef(onCompleted);
  onCompletedRef.current = onCompleted;
  const questionsRef = useRef(questions);
  questionsRef.current = questions;
  const isFinishedRef = useRef(isFinished);
  isFinishedRef.current = isFinished;

  // questions の「中身」が変わった時だけ再初期化する
  const questionsKey = useMemo(
    () => questions.map((q) => `${q.id}|${q.question_audio_path ?? ""}|${q.audio_path}|${q.answer_count}`).join("\u0001"),
    [questions]
  );

  const totalQuestions = taskQuestions.length;
  const currentQuestion = taskQuestions[currentIndex];

  const clearTimers = () => {
    [nextTimerRef, feedbackTimerRef].forEach((ref) => {
      if (ref.current) {
        clearTimeout(ref.current);
        ref.current = null;
      }
    });
  };

  const stopAudio = () => {
    playbackIdRef.current += 1;
    if (gapTimerRef.current) {
      clearTimeout(gapTimerRef.current);
      gapTimerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    setIsPlaying(false);
    setActiveSpeaker(null);
  };

  const resetQuestionState = () => {
    setUserInput("");
    setFeedback(null);
    setWrongAttempts(0);
    setIsRevealed(false);
    setAudioError("");
  };

  // 開いた時に初期化（完了後はお祝い画面を維持）
  useEffect(() => {
    if (!isOpen) return;
    if (isFinishedRef.current) return;

    const source = questionsRef.current;
    if (source.length === 0) return;

    clearTimers();
    stopAudio();
    setTaskQuestions(shuffleArray(source).slice(0, QUESTIONS_PER_TASK));
    setCurrentIndex(0);
    setAnsweredCount(0);
    setFirstTryCorrect(0);
    setIsFinished(false);
    completedRef.current = false;
    resetQuestionState();
  }, [isOpen, questionsKey]);

  // 閉じた時・アンマウント時のクリーンアップ
  useEffect(() => {
    if (!isOpen) return;
    return () => {
      clearTimers();
      stopAudio();
    };
  }, [isOpen]);

  // 完了時に onCompleted を1回だけ呼ぶ
  useEffect(() => {
    if (isFinished && !completedRef.current) {
      completedRef.current = true;
      playCompleteSoundRef.current(); // 🎉 5問クリアの完了音
      onCompletedRef.current();
    }
  }, [isFinished]);

  // 質問音声 → 答え音声 の順に再生する
  const playDialogue = () => {
    if (!currentQuestion) return;
    stopAudio();
    setAudioError("");

    const playlist = [currentQuestion.question_audio_path, currentQuestion.audio_path].filter(
      (p): p is string => !!p
    );
    const playbackId = playbackIdRef.current;
    const isStale = () => playbackIdRef.current !== playbackId;

    const playAt = (index: number) => {
      if (isStale()) return;
      if (index >= playlist.length) {
        audioRef.current = null;
        setIsPlaying(false);
        setActiveSpeaker(null);
        return;
      }

      const path = playlist[index];
      const audio = new Audio(getAudioUrl(path));
      audioRef.current = audio;
      // 質問音声は A（左の人）、答え音声は B（右の人）が話している表示にする
      setActiveSpeaker(path === currentQuestion.question_audio_path ? "A" : "B");

      audio.onended = () => {
        if (isStale()) return;
        setActiveSpeaker(null);
        gapTimerRef.current = setTimeout(() => {
          gapTimerRef.current = null;
          playAt(index + 1);
        }, GAP_BETWEEN_AUDIO_MS);
      };
      audio.onerror = () => {
        if (isStale()) return;
        setIsPlaying(false);
        setActiveSpeaker(null);
        setAudioError(`The audio file "${path}" could not be loaded.`);
      };
      audio.play().catch((err) => {
        console.warn("Audio playback failed:", err);
        if (!isStale()) {
          setIsPlaying(false);
          setActiveSpeaker(null);
        }
      });
    };

    isPlayingRef.current = true; // 次のキー入力までに再描画を待たず反映する
    setIsPlaying(true);
    playAt(0);
  };

  const goToNext = () => {
    clearTimers();
    stopAudio();
    resetQuestionState();
    setAnsweredCount((prev) => prev + 1);

    const nextIndex = currentIndex + 1;
    if (nextIndex >= totalQuestions) {
      setIsFinished(true);
    } else {
      setCurrentIndex(nextIndex);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // スペースキーのハンドラーから常に最新の playDialogue を呼ぶための ref
  const playDialogueRef = useRef(playDialogue);
  playDialogueRef.current = playDialogue;

  // ⌨️ スペースキーで会話を再生
  // 入力欄にフォーカスがあっても、入力が空なら再生する（"4 people" のように文字の後のスペースは普通に入力できる）
  useEffect(() => {
    if (!isOpen || isFinished) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (e.isComposing) return; // 日本語IMEの変換中は何もしない

      const activeElem = document.activeElement as HTMLElement | null;
      const isTextField =
        activeElem?.tagName === "INPUT" || activeElem?.tagName === "TEXTAREA";
      if (isTextField && userInput.length > 0) return;

      // 再生中はスペースキーを無効にする（最初から再生し直さない）
      if (isPlayingRef.current) {
        e.preventDefault();
        return;
      }

      // ボタンにフォーカスがある時は、ボタン本来のスペース操作に任せる
      if (activeElem?.tagName === "BUTTON") return;

      e.preventDefault();
      if (e.repeat || feedback === "correct") return;
      playDialogueRef.current();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isFinished, userInput, feedback]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion || !userInput.trim() || feedback === "correct") return;

    if (isCorrectAnswer(userInput, currentQuestion.answer_count)) {
      setFeedback("correct");
      playSound(); // ✅ 正解音
      if (wrongAttempts === 0 && !isRevealed) setFirstTryCorrect((prev) => prev + 1);
      nextTimerRef.current = setTimeout(goToNext, 1200);
    } else {
      const attempts = wrongAttempts + 1;
      setWrongAttempts(attempts);
      setFeedback("incorrect");
      if (attempts >= MAX_ATTEMPTS_BEFORE_REVEAL) setIsRevealed(true);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => {
        feedbackTimerRef.current = null;
        setFeedback(null);
      }, 1500);
    }
  };

  if (!isOpen || (totalQuestions === 0 && !isFinished)) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-6 sm:p-10 shadow-2xl space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>🎧</span>
              <span>Listening Task: How many people are in the family?</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Listen to the conversation and type the number of people ({answeredCount} / {totalQuestions})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-sm p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
          >
            ✕ Close
          </button>
        </div>

        {!isFinished && currentQuestion ? (
          <div className="space-y-6">
            {/* 進捗バー */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
              <div
                className="bg-orange-500 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, (answeredCount / totalQuestions) * 100)}%` }}
              />
            </div>

            {/* 音声再生エリア */}
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-10 text-center space-y-4">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                Question {currentIndex + 1}
              </p>
              <DialogueIllustration activeSpeaker={activeSpeaker} />
              <button
                type="button"
                onClick={(e) => {
                  // e.detail === 0 はキーボード（Space/Enter）由来のクリック。再生中なら無視する
                  if (e.detail === 0 && isPlayingRef.current) return;
                  playDialogue();
                }}
                className={`mx-auto py-4 px-8 rounded-2xl font-black text-base text-white shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                  isPlaying ? "bg-amber-500 animate-pulse" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                <span>{isPlaying ? "🔊" : "▶️"}</span>
                <span>{isPlaying ? "Playing..." : "Play conversation (Space)"}</span>
              </button>
              <p className="text-xs text-slate-400">Press Space or click the button. You can replay the audio as many times as you like.</p>
              {audioError && <p className="text-xs font-bold text-rose-600">{audioError}</p>}
            </div>

            {/* 解答入力 */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={feedback === "correct"}
                placeholder="e.g. 4 / 4人 / よにん"
                className={`w-full px-6 py-5 rounded-2xl border font-bold text-lg sm:text-xl transition shadow-sm ${
                  feedback === "correct"
                    ? "border-emerald-500 ring-2 ring-emerald-500 bg-emerald-50/20 text-emerald-900"
                    : feedback === "incorrect"
                    ? "border-rose-500 ring-2 ring-rose-500 bg-rose-50/20 animate-shake text-rose-900"
                    : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-orange-500"
                }`}
                autoComplete="off"
              />

              {feedback !== "correct" && (
                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-base transition shadow cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Check answer</span>
                  <span className="text-xs opacity-80 font-normal">(Enter)</span>
                </button>
              )}

              {feedback === "correct" && (
                <p className="text-center text-sm font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">
                  ✨ Correct! {currentQuestion.answer_count}人家族です。 Moving to next...
                </p>
              )}
              {feedback === "incorrect" && !isRevealed && (
                <p className="text-center text-sm font-bold text-rose-600 dark:text-rose-400">
                  ❌ Not quite. Listen again and try once more.
                </p>
              )}

              {isRevealed && feedback !== "correct" && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-2xl text-center space-y-2">
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                    Answer: {currentQuestion.answer_count}人家族 ({HIRAGANA_READINGS[currentQuestion.answer_count]?.[0] ?? currentQuestion.answer_count}かぞく)
                  </p>
                  {currentQuestion.transcript && (
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
                      {currentQuestion.transcript}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={goToNext}
                    className="text-sm font-black text-orange-600 hover:text-orange-700 underline cursor-pointer"
                  >
                    Next question ➔
                  </button>
                </div>
              )}
            </form>
          </div>
        ) : (
          <EduFinishedView
            taskName="listening questions"
            description={`You answered ${firstTryCorrect} of ${totalQuestions} correctly on the first try. Your progress has been saved and this task is now marked as complete.`}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
};

export default EduListeningTaskModal;
