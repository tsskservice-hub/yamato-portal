/**
 * @file app/components/lessons/EduListeningTaskModal.tsx
 * @description リスニング課題モーダル（全レッスン共通）
 *   1つのレッスンのリスニング課題は、いくつかのパートでできている（app/data/listening-tasks.ts）。
 *   画面上部のタブでどのパートからでも始められ、全部のパートを終えるとタスク完了（EduFinishedView・onCompleted を1回だけ）。
 *   - 会話パート：会話（A が聞き、B が答える）を聞いて、答えをタイピングする問題をランダムに出す
 *   - 表パート：少し長い音声を聞いて、英語で表の空欄を全部埋める（何度でも聞き直せる）
 *   音声は Storage のファイルを再生し、無い・読み込めない時はブラウザの音声合成で読み上げる。
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "~/lib/supabaseClient";
import { EduFinishedView } from "~/components/lessons/EduFinishedView";
import { useSoundEffect } from "~/hooks/useSoundEffect";
import {
  isListeningAnswerCorrect,
  isTableAnswerCorrect,
  type ListeningItem,
  type ListeningPart,
  type ListeningTablePart,
  type ListeningTableCell,
  type ListeningTask,
} from "~/data/listening-tasks";

// ---------- 設定 ----------

const AUDIO_BUCKET = "dialogue-audio";
const MAX_ATTEMPTS_BEFORE_REVEAL = 2; // この回数間違えると答えを表示
const GAP_BETWEEN_AUDIO_MS = 400; // A の音声と B の音声の間の間隔

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

// ---------- 会話パート ----------

interface DialoguePartProps {
  /** このパートを今表示していて、モーダルが開いているか */
  isOpen: boolean;
  task: ListeningTask;
  /** このパートの問題を全部終えた時（1回だけ） */
  onFinished: (firstTryCorrect: number, total: number) => void;
}

/** 会話を聞いて答えを1つタイピングする問題を、規定の数だけランダムに出すパート */
const ListeningDialoguePart: React.FC<DialoguePartProps> = ({ isOpen, task, onFinished }) => {
  const questions = task.items;
  const [taskQuestions, setTaskQuestions] = useState<ListeningItem[]>([]);
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

  const { playSound } = useSoundEffect(); // 正解音

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackIdRef = useRef(0); // 再生し直した時に古い再生チェーンを無効化する
  const inputRef = useRef<HTMLInputElement>(null);
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;
  const questionsRef = useRef(questions);
  questionsRef.current = questions;
  const isFinishedRef = useRef(isFinished);
  isFinishedRef.current = isFinished;

  // questions の「中身」が変わった時だけ再初期化する
  const questionsKey = useMemo(
    () => questions.map((q) => `${q.id}|${q.lines.map((l) => `${l.speaker}:${l.text}:${l.audioPath ?? ""}`).join("/")}`).join("\u0001"),
    [questions]
  );

  const totalQuestions = taskQuestions.length;
  const currentQuestion = taskQuestions[currentIndex];

  const clearTimers = () => {
    [nextTimerRef, feedbackTimerRef, focusTimerRef].forEach((ref) => {
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
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
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

  // 開いた時に初期化（このパートを終えた後に開き直した時は、新しい問題で最初から）
  useEffect(() => {
    if (!isOpen) return;

    const source = questionsRef.current;
    if (source.length === 0) return;

    clearTimers();
    stopAudio();
    setTaskQuestions(shuffleArray(source).slice(0, task.questionsPerTask));
    setCurrentIndex(0);
    setAnsweredCount(0);
    setFirstTryCorrect(0);
    setIsFinished(false);
    completedRef.current = false;
    resetQuestionState();

    // 開いた直後から解答欄にフォーカスを移す
    // （ページ側の「Start Listening Task」ボタンにフォーカスが残ったままだと、Space がそのボタンに奪われるため）
    focusTimerRef.current = setTimeout(() => {
      focusTimerRef.current = null;
      inputRef.current?.focus();
    }, 50);
  }, [isOpen, questionsKey]);

  // 閉じた時・アンマウント時のクリーンアップ
  useEffect(() => {
    if (!isOpen) return;
    return () => {
      clearTimers();
      stopAudio();
    };
  }, [isOpen]);

  // このパートを終えた時に1回だけ知らせる
  useEffect(() => {
    if (isFinished && !completedRef.current) {
      completedRef.current = true;
      onFinishedRef.current(firstTryCorrect, totalQuestions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinished]);

  // 会話の行（A → B）を順に再生する。音声ファイルが無い・失敗した行は音声合成で読み上げる
  const playDialogue = () => {
    if (!currentQuestion) return;
    stopAudio();
    setAudioError("");

    const lines = currentQuestion.lines;
    const playbackId = playbackIdRef.current;
    const isStale = () => playbackIdRef.current !== playbackId;

    const finishLine = (index: number) => {
      if (isStale()) return;
      setActiveSpeaker(null);
      gapTimerRef.current = setTimeout(() => {
        gapTimerRef.current = null;
        playAt(index + 1);
      }, GAP_BETWEEN_AUDIO_MS);
    };

    const speakLine = (index: number) => {
      if (isStale()) return;
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setIsPlaying(false);
        setActiveSpeaker(null);
        setAudioError("Audio could not be played in this browser.");
        return;
      }
      const utterance = new SpeechSynthesisUtterance(lines[index].text);
      utterance.lang = "ja-JP";
      utterance.rate = 0.9;
      utterance.onend = () => finishLine(index);
      utterance.onerror = () => finishLine(index);
      window.speechSynthesis.speak(utterance);
    };

    const playAt = (index: number) => {
      if (isStale()) return;
      if (index >= lines.length) {
        audioRef.current = null;
        setIsPlaying(false);
        setActiveSpeaker(null);
        return;
      }

      const line = lines[index];
      setActiveSpeaker(line.speaker);
      if (!line.audioPath) {
        speakLine(index);
        return;
      }

      const audio = new Audio(getAudioUrl(line.audioPath));
      audioRef.current = audio;
      let fellBack = false;
      const fallback = (err?: unknown) => {
        if (fellBack || isStale()) return;
        fellBack = true;
        console.warn(`Listening audio could not be played, using speech synthesis instead: ${line.audioPath}`, err);
        audioRef.current = null;
        speakLine(index);
      };
      audio.onended = () => {
        if (isStale()) return;
        audioRef.current = null;
        finishLine(index);
      };
      audio.onerror = () => fallback(audio.error);
      audio.play().catch(fallback);
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

      // モーダル内のボタンにフォーカスがある時は、ボタン本来のスペース操作に任せる
      // （モーダルの外＝ページ側のボタンにフォーカスが残っている場合は、こちらで再生する）
      if (activeElem?.tagName === "BUTTON" && modalRef.current?.contains(activeElem)) return;

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

    if (isListeningAnswerCorrect(task, currentQuestion, userInput)) {
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

  if (!isOpen || totalQuestions === 0 || isFinished || !currentQuestion) return null;

  return (
    <div ref={modalRef}>
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
                Question {currentIndex + 1} of {totalQuestions}
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
                placeholder={task.placeholder}
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
                  ✨ Correct! {(task.correctMessage ?? "{answer}").replace("{answer}", currentQuestion.answerLabel)} Moving to next...
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
                    Answer: {currentQuestion.answerLabel}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
                    {currentQuestion.lines.map((l) => `${l.speaker}: ${l.text}`).join("\n")}
                  </p>
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
    </div>
  );
};


// ---------- 表を埋めるパート ----------

const MAX_TABLE_CHECKS_BEFORE_REVEAL = 3;

interface TablePartProps {
  isOpen: boolean;
  part: ListeningTablePart;
  onFinished: (firstTryCorrect: number, total: number) => void;
}

/** 少し長い音声を聞いて、英語で表の空欄を全部埋めるパート */
const ListeningTablePartView: React.FC<TablePartProps> = ({ isOpen, part, onFinished }) => {
  /** 空欄のキー（"h0" = 1行目の0列目、"v1" = 2行目の1列目） */
  const blanks = useMemo(
    () =>
      part.columns.flatMap((c, i) => [
        ...("answers" in c.header ? [{ key: `h${i}`, cell: c.header }] : []),
        ...("answers" in c.value ? [{ key: `v${i}`, cell: c.value }] : []),
      ]),
    [part]
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean> | null>(null);
  const [checks, setChecks] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playIdRef = useRef(0);
  const { playSound } = useSoundEffect();

  const stopAudio = () => {
    playIdRef.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setIsPlaying(false);
  };

  // 開いた時に初期化（終えた後に開き直した時は、最初から）
  useEffect(() => {
    if (!isOpen) return;
    setValues({});
    setChecked(null);
    setChecks(0);
    setRevealed(false);
    setDone(false);
    setHasPlayed(false);
    return () => stopAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, part.id]);

  /** 音声を最初から再生する（ファイルが無い・読み込めない時は音声合成で読み上げる） */
  const play = () => {
    stopAudio();
    const id = playIdRef.current;
    const stale = () => playIdRef.current !== id;
    setIsPlaying(true);
    setHasPlayed(true);

    const speak = () => {
      if (stale()) return;
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setIsPlaying(false);
        return;
      }
      const u = new SpeechSynthesisUtterance(part.audio.text);
      u.lang = "ja-JP";
      u.rate = 0.9;
      u.onend = () => !stale() && setIsPlaying(false);
      u.onerror = () => !stale() && setIsPlaying(false);
      window.speechSynthesis.speak(u);
    };

    const url = supabase.storage.from(part.audio.bucket).getPublicUrl(part.audio.path).data.publicUrl;
    const audio = new Audio(url);
    audioRef.current = audio;
    let fellBack = false;
    const fallback = (err?: unknown) => {
      if (fellBack || stale()) return;
      fellBack = true;
      console.warn(`Listening audio could not be played, using speech synthesis instead: ${part.audio.bucket}/${part.audio.path}`, err);
      audioRef.current = null;
      speak();
    };
    audio.onended = () => {
      if (stale()) return;
      audioRef.current = null;
      setIsPlaying(false);
    };
    audio.onerror = () => fallback(audio.error);
    audio.play().catch(fallback);
  };

  const allFilled = blanks.every((b) => (values[b.key] ?? "").trim() !== "");

  const check = () => {
    if (!allFilled || done) return;
    const result: Record<string, boolean> = {};
    blanks.forEach((b) => (result[b.key] = isTableAnswerCorrect(b.cell, values[b.key] ?? "")));
    setChecked(result);
    const nextChecks = checks + 1;
    setChecks(nextChecks);
    if (Object.values(result).every(Boolean)) {
      playSound(); // ✅ 正解音
      stopAudio();
      setDone(true);
      onFinished(nextChecks === 1 ? 1 : 0, 1);
    } else if (nextChecks >= MAX_TABLE_CHECKS_BEFORE_REVEAL) {
      setRevealed(true);
    }
  };

  const finishAfterReveal = () => {
    stopAudio();
    setDone(true);
    onFinished(0, 1);
  };

  if (!isOpen || done) return null;

  const answerOf = (cell: ListeningTableCell) => ("answers" in cell ? cell.answers[0] : cell.text);

  const renderCell = (cell: ListeningTableCell, key: string, isHeader: boolean) => {
    if ("text" in cell) {
      return <span className={isHeader ? "font-black text-slate-900 dark:text-slate-100" : "font-bold text-lg text-slate-900 dark:text-slate-100"}>{cell.text}</span>;
    }
    const state = checked ? (checked[key] ? "ok" : "ng") : null;
    return (
      <div className="space-y-1">
        <input
          type="text"
          value={values[key] ?? ""}
          onChange={(e) => {
            setValues((prev) => ({ ...prev, [key]: e.target.value }));
            setChecked((prev) => (prev ? { ...prev, [key]: false } : prev));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              check();
            }
          }}
          placeholder={cell.placeholder ?? ""}
          aria-label={cell.placeholder ? `Type the ${cell.placeholder}` : "Type your answer"}
          autoComplete="off"
          className={`w-full min-w-[5rem] px-3 py-2 rounded-xl border-2 text-center font-bold text-base bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500 ${
            state === "ok" ? "border-emerald-500 bg-emerald-50/40" : state === "ng" ? "border-rose-500 bg-rose-50/40" : "border-slate-300 dark:border-slate-600"
          }`}
        />
        {revealed && state !== "ok" && (
          <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">Answer: {answerOf(cell)}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 音声 */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-3">
        <p className="text-4xl" aria-hidden="true">📻</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={play}
            disabled={isPlaying}
            className={`py-4 px-8 rounded-2xl font-black text-base text-white shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:cursor-not-allowed ${
              isPlaying ? "bg-amber-500 animate-pulse" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            <span>{isPlaying ? "🔊" : hasPlayed ? "🔁" : "▶️"}</span>
            <span>{isPlaying ? "Playing..." : hasPlayed ? "Listen again" : "Play the audio"}</span>
          </button>
          {isPlaying && (
            <button
              type="button"
              onClick={stopAudio}
              className="py-4 px-6 rounded-2xl font-bold text-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 cursor-pointer"
            >
              ⏹ Stop
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400">You can listen as many times as you like.</p>
      </div>

      {/* 表 */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr>
              <th className="border border-slate-300 dark:border-slate-600 p-2 bg-slate-50 dark:bg-slate-800" />
              {part.columns.map((c, i) => (
                <th key={i} className="border border-slate-300 dark:border-slate-600 p-2 bg-slate-50 dark:bg-slate-800 text-center align-top">
                  {renderCell(c.header, `h${i}`, true)}
                </th>
              ))}
            </tr>
            <tr>
              <th className="border border-slate-300 dark:border-slate-600 p-2 text-left font-bold text-slate-700 dark:text-slate-300 align-middle">
                {part.rowLabel}
              </th>
              {part.columns.map((c, i) => (
                <td key={i} className="border border-slate-300 dark:border-slate-600 p-2 text-center align-top">
                  {renderCell(c.value, `v${i}`, false)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* 答え合わせ */}
      <div className="space-y-3">
        {!revealed ? (
          <button
            type="button"
            onClick={check}
            disabled={!allFilled}
            className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-black text-base transition shadow cursor-pointer"
          >
            {allFilled ? "Check answers (Enter)" : "Fill in every empty box to check"}
          </button>
        ) : (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-2xl text-center space-y-2">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">The answers are shown under the boxes.</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{part.audio.text}</p>
            <button type="button" onClick={finishAfterReveal} className="text-sm font-black text-orange-600 hover:text-orange-700 underline cursor-pointer">
              Finish this part ➔
            </button>
          </div>
        )}
        {checked && !revealed && !Object.values(checked).every(Boolean) && (
          <p className="text-center text-sm font-bold text-rose-600 dark:text-rose-400">
            ❌ The red boxes are not right yet. Listen again and fix them.
          </p>
        )}
      </div>
    </div>
  );
};

// ---------- モーダル（パートのタブ） ----------

interface EduListeningTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted: () => void;
  /** このレッスンのリスニング課題のパート（app/data/listening-tasks.ts） */
  parts: ListeningPart[];
}

/**
 * リスニング課題のモーダル。画面上部のタブで、どのパートからでも始められる。
 * 全部のパートを終えると EduFinishedView を表示し、onCompleted を1回だけ呼ぶ
 */
export const EduListeningTaskModal: React.FC<EduListeningTaskModalProps> = ({ isOpen, onClose, onCompleted, parts }) => {
  const [activeId, setActiveId] = useState(parts[0]?.id ?? "");
  const [doneIds, setDoneIds] = useState<string[]>([]);
  /** 今のパートを終えた直後の画面（次のパートへの案内）を出すか */
  const [justFinished, setJustFinished] = useState<string | null>(null);
  /** パートを開き直すための番号（同じパートをもう一度やる時に、中身を作り直す） */
  const [runKey, setRunKey] = useState(0);
  const [allDone, setAllDone] = useState(false);
  const completedRef = useRef(false);
  const { playCompleteSound } = useSoundEffect();

  const active = parts.find((p) => p.id === activeId) ?? parts[0];
  const showTabs = parts.length > 1;

  useEffect(() => {
    if (!parts.some((p) => p.id === activeId) && parts[0]) setActiveId(parts[0].id);
  }, [parts, activeId]);

  const selectPart = (id: string) => {
    setActiveId(id);
    setJustFinished(null);
    setAllDone(false);
    setRunKey((k) => k + 1);
  };

  const handlePartFinished = (partId: string) => {
    const nextDone = doneIds.includes(partId) ? doneIds : [...doneIds, partId];
    setDoneIds(nextDone);
    if (parts.every((p) => nextDone.includes(p.id))) {
      setAllDone(true);
      if (!completedRef.current) {
        completedRef.current = true;
        playCompleteSound(); // 🎉 全部のパートを終えた完了音
        onCompleted();
      }
    } else {
      setJustFinished(partId);
    }
  };

  if (!isOpen || !active) return null;

  const nextPart = parts.find((p) => !doneIds.includes(p.id) && p.id !== justFinished);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-6 sm:p-10 shadow-2xl space-y-6 my-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>🎧</span>
              <span>Listening Task: {active.title}</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">{active.instruction}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-sm p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
          >
            ✕ Close
          </button>
        </div>

        {/* パートのタブ（どれからでも始められる） */}
        {showTabs && !allDone && (
          <div className={`grid gap-2 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl ${parts.length === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>
            {parts.map((p, i) => {
              const isActive = p.id === active.id;
              const isDone = doneIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPart(p.id)}
                  className={`py-3 px-2 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer ${
                    isActive
                      ? "bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  {isDone ? "✅" : `${i + 1}.`} {p.tabLabel}
                </button>
              );
            })}
          </div>
        )}

        {allDone ? (
          <EduFinishedView
            taskName="listening tasks"
            description="You have finished every part of the listening task. Your progress has been saved and this task is now marked as complete."
            onClose={onClose}
          />
        ) : justFinished ? (
          <div className="text-center space-y-4 py-6">
            <p className="text-5xl" aria-hidden="true">✅</p>
            <p className="text-lg font-black text-slate-900 dark:text-slate-100">
              {parts.find((p) => p.id === justFinished)?.tabLabel}: done!
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {doneIds.length} of {parts.length} parts finished. Finish every part to complete the listening task.
            </p>
            {nextPart && (
              <button
                type="button"
                onClick={() => selectPart(nextPart.id)}
                className="py-3 px-6 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm shadow cursor-pointer"
              >
                Next: {nextPart.tabLabel} ➔
              </button>
            )}
          </div>
        ) : active.kind === "table" ? (
          <ListeningTablePartView key={`${active.id}-${runKey}`} isOpen={isOpen} part={active} onFinished={() => handlePartFinished(active.id)} />
        ) : (
          <ListeningDialoguePart key={`${active.id}-${runKey}`} isOpen={isOpen} task={active} onFinished={() => handlePartFinished(active.id)} />
        )}
      </div>
    </div>
  );
};

export default EduListeningTaskModal;
