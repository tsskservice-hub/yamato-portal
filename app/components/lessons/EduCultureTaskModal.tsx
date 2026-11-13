/**
 * @file app/components/lessons/EduCultureTaskModal.tsx
 * @description 文化タスク（全レッスン共通）
 *   1. 紙芝居：カードを1枚ずつ、ナレーション音声と英語字幕に合わせて見せる
 *   2. Think about it（採点しない問いかけ）
 *   3. Quick Check：選択式クイズ。正解で正解音、全問終了で共通の完了画面＋完了音
 *   内容は app/data/culture-tasks.ts で、レッスンごとに渡す。
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSoundEffect } from "~/hooks/useSoundEffect";
import { EduFinishedView } from "~/components/lessons/EduFinishedView";
import type { CultureTask } from "~/data/culture-tasks";

interface EduCultureTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted: () => void;
  task: CultureTask;
}

type Phase = "intro" | "story" | "think" | "quiz" | "finished";

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];

/** Fisher-Yates シャッフル（元配列は変更しない） */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 字幕の切り替え位置（各行の終わりが全体の何割の位置か）を文字数の割合で求める */
function subtitleBreakpoints(lines: string[]): number[] {
  const total = lines.reduce((sum, l) => sum + l.length, 0) || 1;
  let acc = 0;
  return lines.map((l) => {
    acc += l.length;
    return acc / total;
  });
}

export const EduCultureTaskModal: React.FC<EduCultureTaskModalProps> = ({
  isOpen,
  onClose,
  onCompleted,
  task,
}) => {
  const { cards, questions } = task;

  const [phase, setPhase] = useState<Phase>("intro");

  // ---------- 紙芝居 ----------
  const [cardIndex, setCardIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [subtitleIndex, setSubtitleIndex] = useState(0);
  const [heardCards, setHeardCards] = useState<boolean[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [usingSpeechFallback, setUsingSpeechFallback] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playTokenRef = useRef(0); // 古い再生のイベントを無視するための番号

  // ---------- クイズ ----------
  const [questionIndex, setQuestionIndex] = useState(0);
  const [optionOrders, setOptionOrders] = useState<number[][]>([]); // 問題ごとの選択肢の表示順
  const [wrongPicks, setWrongPicks] = useState<number[]>([]); // この問題でまちがえた選択肢（元の番号）
  const [solved, setSolved] = useState(false);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [shakeOption, setShakeOption] = useState<number | null>(null);

  const { playSound, playCompleteSound } = useSoundEffect();
  const completedRef = useRef(false);

  // ---------- 音声の停止 ----------
  const stopNarration = useCallback(() => {
    playTokenRef.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  }, []);

  // 開いた時に最初から
  useEffect(() => {
    if (!isOpen) {
      stopNarration();
      return;
    }
    setPhase("intro");
    setCardIndex(0);
    setSubtitleIndex(0);
    setHeardCards(cards.map(() => false));
    setShowTranscript(false);
    setUsingSpeechFallback(false);
    setQuestionIndex(0);
    setOptionOrders(questions.map((q) => shuffle(q.options.map((_, i) => i))));
    setWrongPicks([]);
    setSolved(false);
    setFirstTryCorrect(0);
    setReviewOpen(false);
    completedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // アンマウント時に音を止める
  useEffect(() => stopNarration, [stopNarration]);

  const markHeard = (index: number) =>
    setHeardCards((prev) => prev.map((v, i) => (i === index ? true : v)));

  /** 合成音声で1行ずつ読み上げる（音声ファイルが無い・読み込めない時の代わり） */
  const speakWithSynthesis = useCallback((index: number, token: number) => {
    const lines = cards[index].narration;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      // 読み上げもできない環境では、字幕を全部見せて先に進めるようにする
      setIsPlaying(false);
      setShowTranscript(true);
      markHeard(index);
      return;
    }
    setUsingSpeechFallback(true);
    window.speechSynthesis.cancel();
    const speakLine = (lineIndex: number) => {
      if (token !== playTokenRef.current) return;
      if (lineIndex >= lines.length) {
        setIsPlaying(false);
        markHeard(index);
        return;
      }
      setSubtitleIndex(lineIndex);
      // 字幕の漢字を含むかっこ書き（例：(子)、(幸 = happiness)）は読ませず、英語の部分だけを読み上げる
      const text = lines[lineIndex]
        .replace(/\s*\([^)]*[぀-ヿ㐀-鿿][^)]*\)/g, "")
        .replace(/[぀-ヿ㐀-鿿]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-AU";
      utterance.rate = 0.95;
      utterance.onend = () => speakLine(lineIndex + 1);
      utterance.onerror = () => speakLine(lineIndex + 1);
      window.speechSynthesis.speak(utterance);
    };
    setIsPlaying(true);
    speakLine(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]);

  /** カードのナレーションを最初から再生する */
  const playCard = useCallback((index: number) => {
    stopNarration();
    const token = playTokenRef.current;
    const card = cards[index];
    if (!card) return;
    setSubtitleIndex(0);

    const breakpoints = subtitleBreakpoints(card.narration);
    const audio = new Audio(card.audioUrl);
    audioRef.current = audio;

    let fellBack = false;
    const fallback = (reason: unknown) => {
      if (fellBack || token !== playTokenRef.current) return;
      fellBack = true;
      console.warn(`[EduCultureTask] Narration audio could not be played, using speech synthesis instead: ${card.audioUrl}`, reason);
      audioRef.current = null;
      speakWithSynthesis(index, token);
    };

    audio.ontimeupdate = () => {
      if (token !== playTokenRef.current || !audio.duration || !isFinite(audio.duration)) return;
      const ratio = audio.currentTime / audio.duration;
      const next = breakpoints.findIndex((b) => ratio < b);
      setSubtitleIndex(next === -1 ? card.narration.length - 1 : next);
    };
    audio.onended = () => {
      if (token !== playTokenRef.current) return;
      setIsPlaying(false);
      setSubtitleIndex(card.narration.length - 1);
      markHeard(index);
      audioRef.current = null;
    };
    audio.onerror = () => fallback(audio.error);

    setIsPlaying(true);
    audio.play().catch((err) => {
      // 自動再生がブロックされた時は、再生ボタンを押してもらう
      if (err?.name === "NotAllowedError") {
        if (token === playTokenRef.current) setIsPlaying(false);
        return;
      }
      fallback(err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, stopNarration, speakWithSynthesis]);

  /** 再生中なら一時停止、止まっていれば再生（続きから／最初から） */
  const togglePlay = () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        stopNarration(); // 合成音声は一時停止できないので止める
      }
      return;
    }
    const audio = audioRef.current;
    if (audio && !audio.ended && audio.currentTime > 0) {
      setIsPlaying(true);
      audio.play().catch(() => setIsPlaying(false));
      return;
    }
    playCard(cardIndex);
  };

  // カードが変わったら自動でナレーションを流す
  useEffect(() => {
    if (!isOpen || phase !== "story") return;
    playCard(cardIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, phase, cardIndex]);

  const goToCard = (index: number) => {
    stopNarration();
    setShowTranscript(false);
    setCardIndex(index);
  };

  const nextFromStory = () => {
    if (cardIndex < cards.length - 1) {
      goToCard(cardIndex + 1);
    } else {
      stopNarration();
      setPhase(task.thinkAbout ? "think" : "quiz");
    }
  };

  // ---------- クイズ ----------
  const currentQuestion = questions[questionIndex];
  const currentOrder = optionOrders[questionIndex] ?? currentQuestion?.options.map((_, i) => i) ?? [];

  const finishTask = useCallback(() => {
    setPhase("finished");
    if (completedRef.current) return;
    completedRef.current = true;
    playCompleteSound(); // 🎉 完了音
    onCompleted();
  }, [playCompleteSound, onCompleted]);

  const chooseOption = (originalIndex: number) => {
    if (!currentQuestion || solved || wrongPicks.includes(originalIndex)) return;
    if (originalIndex === currentQuestion.answerIndex) {
      setSolved(true);
      setReviewOpen(false);
      playSound(); // ✅ 正解音
      if (wrongPicks.length === 0) setFirstTryCorrect((n) => n + 1);
    } else {
      setWrongPicks((prev) => [...prev, originalIndex]);
      setShakeOption(originalIndex);
      setTimeout(() => setShakeOption(null), 500);
    }
  };

  const nextQuestion = () => {
    if (!solved) return;
    if (questionIndex >= questions.length - 1) {
      finishTask();
      return;
    }
    setQuestionIndex((i) => i + 1);
    setWrongPicks([]);
    setSolved(false);
    setReviewOpen(false);
  };

  // ---------- キーボード操作 ----------
  const keyStateRef = useRef({ phase, solved, currentOrder, togglePlay, nextFromStory, chooseOption, nextQuestion, heard: false });
  keyStateRef.current = {
    phase,
    solved,
    currentOrder,
    togglePlay,
    nextFromStory,
    chooseOption,
    nextQuestion,
    heard: !!heardCards[cardIndex],
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el?.tagName === "INPUT" || el?.tagName === "TEXTAREA") return;
      if (e.repeat) return;
      const s = keyStateRef.current;

      if (s.phase === "story") {
        if (e.code === "Space") {
          e.preventDefault();
          // ボタンにフォーカスがあると Space でそのボタンも押されてしまうので外す
          if (el instanceof HTMLElement && el.tagName === "BUTTON") el.blur();
          s.togglePlay();
        } else if (e.key === "Enter" && s.heard) {
          e.preventDefault();
          s.nextFromStory();
        }
        return;
      }

      if (s.phase === "quiz") {
        if (e.key === "Enter" && s.solved) {
          e.preventDefault();
          s.nextQuestion();
          return;
        }
        const pos = OPTION_LABELS.indexOf(e.key.toUpperCase());
        const numPos = /^[1-6]$/.test(e.key) ? Number(e.key) - 1 : -1;
        const p = pos !== -1 ? pos : numPos;
        if (p !== -1 && p < s.currentOrder.length) {
          e.preventDefault();
          s.chooseOption(s.currentOrder[p]);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleClose = () => {
    stopNarration();
    onClose();
  };

  const totalSteps = cards.length + questions.length;
  const doneSteps = useMemo(() => {
    if (phase === "intro") return 0;
    if (phase === "story") return cardIndex + (heardCards[cardIndex] ? 1 : 0);
    if (phase === "think") return cards.length;
    if (phase === "quiz") return cards.length + questionIndex + (solved ? 1 : 0);
    return totalSteps;
  }, [phase, cardIndex, heardCards, questionIndex, solved, cards.length, totalSteps]);

  if (!isOpen) return null;

  const card = cards[cardIndex];
  const heard = !!heardCards[cardIndex];
  const hintCard = currentQuestion ? cards[currentQuestion.hintCard - 1] : undefined;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl p-5 sm:p-8 shadow-2xl space-y-5 my-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>🎎</span>
              <span>Culture: {task.title}</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {phase === "quiz"
                ? `Quick Check: question ${questionIndex + 1} of ${questions.length}`
                : phase === "story"
                ? `Picture story: card ${cardIndex + 1} of ${cards.length}`
                : "Watch the picture story, then answer the Quick Check."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-sm p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
          >
            ✕ Close
          </button>
        </div>

        {phase !== "finished" && (
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-orange-500 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, (doneSteps / totalSteps) * 100)}%` }}
            />
          </div>
        )}

        {/* ---------- はじめに ---------- */}
        {phase === "intro" && (
          <div className="text-center space-y-5 py-6">
            <div className="text-5xl">📖</div>
            <div className="space-y-2">
              <h4 className="text-2xl font-black text-slate-900 dark:text-slate-100">{task.title}</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                First, watch a picture story with {cards.length} cards. Listen to the narration and read the
                subtitles. Then answer {questions.length} Quick Check questions.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500">🔊 Turn your sound on.</p>
            </div>
            <button
              type="button"
              onClick={() => setPhase("story")}
              className="py-4 px-10 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-base shadow-lg transition active:scale-95 cursor-pointer"
            >
              ▶ Start the picture story
            </button>
          </div>
        )}

        {/* ---------- 紙芝居 ---------- */}
        {phase === "story" && card && (
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
              <img
                key={card.imageUrl}
                src={card.imageUrl}
                alt={card.imageAlt}
                className="w-full aspect-[3/2] object-contain animate-fade-in"
              />
            </div>

            <h4 className="text-center text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
              Card {cardIndex + 1} | {card.title}
            </h4>

            {/* 字幕 */}
            <div
              className="min-h-[88px] px-4 py-3 rounded-2xl bg-slate-900 dark:bg-black text-center flex items-center justify-center"
              aria-live="polite"
            >
              <p className="text-base sm:text-lg font-bold text-white leading-relaxed">
                {card.narration[subtitleIndex]}
              </p>
            </div>
            {usingSpeechFallback && (
              <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                (The narration audio could not be loaded, so your browser is reading the text aloud.)
              </p>
            )}

            {/* 操作 */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => goToCard(cardIndex - 1)}
                disabled={cardIndex === 0}
                className="py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm transition hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                ◀ Back
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className={`py-3 rounded-2xl font-black text-xs sm:text-sm text-white transition active:scale-95 cursor-pointer ${
                  isPlaying ? "bg-amber-500" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {isPlaying ? "⏸ Pause (Space)" : heard ? "🔁 Play again (Space)" : "▶ Play (Space)"}
              </button>
              <button
                type="button"
                onClick={nextFromStory}
                disabled={!heard}
                title={heard ? undefined : "Listen to the whole card first"}
                className="py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs sm:text-sm transition disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed cursor-pointer"
              >
                {cardIndex < cards.length - 1 ? "Next ▶ (Enter)" : "Finish ▶ (Enter)"}
              </button>
            </div>
            {!heard && (
              <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                Listen to the whole card to unlock the Next button.
              </p>
            )}

            {/* 全文 */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowTranscript((v) => !v)}
                className="text-xs font-bold text-slate-500 hover:text-orange-600 underline cursor-pointer"
              >
                {showTranscript ? "Hide full text" : "📜 Show full text"}
              </button>
            </div>
            {showTranscript && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                {card.narration.map((line, i) => (
                  <p
                    key={i}
                    className={`text-sm leading-relaxed ${
                      i === subtitleIndex && isPlaying
                        ? "font-bold text-slate-900 dark:text-slate-100"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------- Think about it ---------- */}
        {phase === "think" && (
          <div className="text-center space-y-5 py-6">
            <div className="text-5xl">💭</div>
            <div className="space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                Think about it (not marked)
              </p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 max-w-lg mx-auto">
                {task.thinkAbout}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Take a moment to think, or ask someone in your family!
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setPhase("story");
                  setCardIndex(0);
                }}
                className="py-3 px-6 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm transition hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                ◀ Watch the story again
              </button>
              <button
                type="button"
                onClick={() => setPhase("quiz")}
                className="py-3 px-8 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm shadow-lg transition active:scale-95 cursor-pointer"
              >
                Start Quick Check ▶
              </button>
            </div>
          </div>
        )}

        {/* ---------- クイズ ---------- */}
        {phase === "quiz" && currentQuestion && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                Question {questionIndex + 1}
              </p>
              <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 leading-snug">
                {currentQuestion.question}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" aria-label="Answer choices">
              {currentOrder.map((originalIndex, pos) => {
                const isCorrect = originalIndex === currentQuestion.answerIndex;
                const isWrong = wrongPicks.includes(originalIndex);
                const showCorrect = solved && isCorrect;
                return (
                  <button
                    key={originalIndex}
                    type="button"
                    onClick={() => chooseOption(originalIndex)}
                    disabled={solved || isWrong}
                    className={`text-left p-4 rounded-2xl border-2 font-bold text-sm sm:text-base transition flex items-start gap-3 ${
                      showCorrect
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200"
                        : isWrong
                        ? "border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-400 dark:text-rose-500 line-through cursor-not-allowed"
                        : solved
                        ? "border-slate-200 dark:border-slate-700 text-slate-400 cursor-default"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:border-orange-500 hover:bg-orange-50/60 dark:hover:bg-orange-950/20 cursor-pointer active:scale-[0.98]"
                    } ${shakeOption === originalIndex ? "animate-shake" : ""}`}
                  >
                    <span
                      className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                        showCorrect
                          ? "bg-emerald-500 text-white"
                          : isWrong
                          ? "bg-rose-200 dark:bg-rose-900 text-rose-600 dark:text-rose-300"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {showCorrect ? "✓" : isWrong ? "✕" : OPTION_LABELS[pos]}
                    </span>
                    <span>{currentQuestion.options[originalIndex]}</span>
                  </button>
                );
              })}
            </div>

            {!solved && (
              <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                Click an answer, or press {OPTION_LABELS.slice(0, currentOrder.length).join(" / ")} on your keyboard.
              </p>
            )}

            {/* まちがえた時：ヒント＋カードの見直し */}
            {!solved && wrongPicks.length > 0 && hintCard && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 space-y-3">
                <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
                  ❌ Not quite. Try again! Hint: look at Card {currentQuestion.hintCard}.
                </p>
                <button
                  type="button"
                  onClick={() => setReviewOpen((v) => !v)}
                  className="text-xs font-bold text-rose-700 dark:text-rose-300 underline cursor-pointer"
                >
                  {reviewOpen ? "Hide card" : `👀 Look at Card ${currentQuestion.hintCard} again`}
                </button>
                {reviewOpen && (
                  <div className="space-y-2">
                    <img
                      src={hintCard.imageUrl}
                      alt={hintCard.imageAlt}
                      className="w-full max-h-64 object-contain rounded-xl bg-white dark:bg-slate-900"
                    />
                    <div className="space-y-1">
                      {hintCard.narration.map((line, i) => (
                        <p key={i} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 正解した時 */}
            {solved && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3">
                <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">✨ Correct!</p>
                <p className="text-sm text-emerald-900 dark:text-emerald-200 leading-relaxed">
                  {currentQuestion.explanation}
                </p>
                <button
                  type="button"
                  onClick={nextQuestion}
                  className="w-full py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm shadow transition active:scale-95 cursor-pointer"
                >
                  {questionIndex < questions.length - 1 ? "Next question ➔ (Enter)" : "Finish ➔ (Enter)"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---------- 完了 ---------- */}
        {phase === "finished" && (
          <EduFinishedView
            taskName="culture tasks"
            description={`You answered ${firstTryCorrect} of ${questions.length} questions correctly on the first try. Your progress has been saved and this task is now marked as complete.`}
            onClose={handleClose}
          />
        )}
      </div>
    </div>
  );
};

export default EduCultureTaskModal;
