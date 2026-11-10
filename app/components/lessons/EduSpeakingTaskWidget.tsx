/**
 * @file app/components/lessons/EduSpeakingTaskWidget.tsx
 * @description Supabase(edu_lesson_dialogues → kl_dialogues)から質問を取得し、AIが質問して生徒が録音で答える一問一答スピーキング課題ウィジェット
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "~/lib/supabaseClient";
import { normalizeJapanese } from "~/utils/normalization";

// ---------- 型 ----------

interface SlotValue {
  text: string;
  reading?: string;
  romaji?: string;
  en?: string;
  alt?: string[];
}

interface DialogueRow {
  id: string;
  prompt_text: string;
  prompt_en: string | null;
  prompt_audio_url: string | null;
  response_text: string;
  response_reading: string | null;
  response_romaji: string | null;
  response_en: string | null;
  accepted_responses: string[] | null;
  slots: Record<string, SlotValue[]> | null;
}

/** 1つの正解パターン（動的データの場合は候補の数だけ作られる） */
interface Model {
  text: string;
  reading?: string;
  en?: string;
  accepted: string[];
}

export interface EduSpeakingTaskWidgetProps {
  title: string;
  description?: string;
  userId: string;
  appType?: string;
  lessonSlug?: string; // edu_lesson_dialogues.lesson_key として使う
  topic?: string;
  /** DBに行がない場合のフォールバック（任意）。返答の判定はせず、何か話せば次へ進む */
  questions?: { question: string; english?: string }[];
  onCompleted?: () => void;
}

// ---------- ユーティリティ ----------

const MAX_ATTEMPTS = 3;
const NEXT_DELAY_MS = 1500;
const JP_SIMILARITY_THRESHOLD = 0.8;
const SHORT_TEXT_LENGTH = 3; // これ以下は完全一致のみ

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

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

function isStrictMatch(input: string, target: string, threshold: number): boolean {
  if (!input || !target) return false;
  if (input === target) return true;
  if (Math.max(input.length, target.length) <= SHORT_TEXT_LENGTH) return false;
  return similarity(input, target) >= threshold;
}

/** "{count}家族です" のプレースホルダーを置き換える */
function fillWith(
  template: string,
  combo: Record<string, SlotValue>,
  pick: (key: string) => string
): string {
  return template.replace(/\{(\w+)\}/g, (m, key) => (combo[key] ? pick(key) : m));
}

/** テンプレートから「文字・読み・別表記」の全パターンを展開する */
function expandTemplate(template: string, combo: Record<string, SlotValue>): string[] {
  const out = new Set<string>();
  const keys = Object.keys(combo);
  out.add(fillWith(template, combo, (k) => combo[k].text));
  out.add(fillWith(template, combo, (k) => combo[k].reading ?? combo[k].text));
  keys.forEach((key) => {
    (combo[key].alt ?? []).forEach((a) => {
      out.add(fillWith(template, combo, (k) => (k === key ? a : combo[k].text)));
    });
  });
  return Array.from(out);
}

/** slots の全組み合わせ（slots が無ければ空の組み合わせ1つ） */
function buildCombos(slots: DialogueRow["slots"]): Record<string, SlotValue>[] {
  let combos: Record<string, SlotValue>[] = [{}];
  Object.entries(slots ?? {}).forEach(([key, values]) => {
    if (!Array.isArray(values) || values.length === 0) return;
    combos = combos.flatMap((c) => values.map((v) => ({ ...c, [key]: v })));
  });
  return combos;
}

/** 1つの会話から、正解パターン（Model）の一覧を作る。response_text が空なら自由回答（判定なし） */
function buildModels(d: DialogueRow): Model[] {
  if (!d.response_text) return [];
  return buildCombos(d.slots).map((combo) => {
    const accepted = new Set<string>([
      ...expandTemplate(d.response_text, combo),
      ...(d.response_reading ? expandTemplate(d.response_reading, combo) : []),
      ...(d.accepted_responses ?? []).flatMap((t) => expandTemplate(t, combo)),
    ]);
    return {
      text: fillWith(d.response_text, combo, (k) => combo[k].text),
      reading: d.response_reading
        ? fillWith(d.response_reading, combo, (k) => combo[k].reading ?? combo[k].text)
        : undefined,
      en: d.response_en
        ? fillWith(d.response_en, combo, (k) => combo[k].en ?? combo[k].text)
        : undefined,
      accepted: Array.from(accepted),
    };
  });
}

// ---------- コンポーネント ----------

export const EduSpeakingTaskWidget: React.FC<EduSpeakingTaskWidgetProps> = ({
  title,
  description = "Practice speaking by listening to AI Yamato's questions and answering via microphone.",
  lessonSlug = "obento-unit-4-lesson-1",
  topic,
  questions,
  onCompleted,
}) => {
  // ----- Supabase からの取得 -----
  const [dbDialogues, setDbDialogues] = useState<DialogueRow[] | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");

    (async () => {
      const { data, error } = await supabase
        .from("edu_lesson_dialogues")
        .select("sort_order, kl_dialogues(*)")
        .eq("lesson_key", lessonSlug)
        .eq("task_type", "speaking")
        .order("sort_order");

      if (cancelled) return;
      if (error) {
        console.error("Failed to load dialogues:", error);
        setLoadState("error");
        return;
      }
      const rows = (data ?? [])
        .map((r: any) => r.kl_dialogues)
        .filter(Boolean) as DialogueRow[];
      setDbDialogues(rows);
      setLoadState("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [lessonSlug]);

  const dialogues: DialogueRow[] = useMemo(() => {
    if (dbDialogues && dbDialogues.length > 0) return dbDialogues;
    return (questions ?? []).map((q, i) => ({
      id: `fallback-${i}`,
      prompt_text: q.question,
      prompt_en: q.english ?? null,
      prompt_audio_url: null,
      response_text: "",
      response_reading: null,
      response_romaji: null,
      response_en: null,
      accepted_responses: null,
      slots: null,
    }));
  }, [dbDialogues, questions]);

  // ----- 状態 -----
  const [isStarted, setIsStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAIPlaying, setIsAIPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState<"correct" | "revealed" | null>(null);
  const [shownModel, setShownModel] = useState<Model | null>(null);
  const [score, setScore] = useState(0);
  const [sessionFinished, setSessionFinished] = useState(false);

  // ----- ref（コールバックから最新値を同期的に参照するため）-----
  const dialoguesRef = useRef<DialogueRow[]>(dialogues);
  const onCompletedRef = useRef(onCompleted);
  const indexRef = useRef(0);
  const modelsRef = useRef<Model[]>([]);
  const exampleModelRef = useRef<Model | null>(null);
  const attemptsRef = useRef(0);
  const resultRef = useRef<"correct" | "revealed" | null>(null);
  const spokenTextRef = useRef("");
  const isListeningRef = useRef(false);
  const isAIPlayingRef = useRef(false);
  const finalizedRef = useRef(false); // 1回の録音につき判定は1回だけ
  const completedRef = useRef(false);
  const speakTokenRef = useRef(0); // 古い読み上げのコールバックを無効化する
  const recognitionRef = useRef<any>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const finalizeFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  dialoguesRef.current = dialogues;
  onCompletedRef.current = onCompleted;

  // ----- 共通処理 -----
  const clearTimers = useCallback(() => {
    [nextTimerRef, finalizeFallbackTimerRef].forEach((ref) => {
      if (ref.current) {
        clearTimeout(ref.current);
        ref.current = null;
      }
    });
  }, []);

  const stopAllMedia = useCallback(() => {
    speakTokenRef.current += 1; // 実行待ちの読み上げコールバックを全て無効化
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
    isAIPlayingRef.current = false;
  }, []);

  /** AIの発話（音声URLがあればそれを再生、なければ音声合成） */
  const playAI = useCallback(
    (text: string, audioUrl: string | null | undefined, onEnd?: () => void) => {
      const token = ++speakTokenRef.current;
      const done = () => {
        if (token === speakTokenRef.current) onEnd?.();
      };

      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      const speak = () => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
          done();
          return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "ja-JP";
        utterance.rate = 0.9;
        utterance.onend = done;
        utterance.onerror = done;
        window.speechSynthesis.speak(utterance);
      };

      if (audioUrl && audioUrl.trim() !== "") {
        let fellBack = false;
        const fallback = () => {
          if (fellBack) return;
          fellBack = true;
          activeAudioRef.current = null;
          speak();
        };
        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;
        audio.onended = () => {
          activeAudioRef.current = null;
          done();
        };
        audio.onerror = fallback;
        audio.play().catch(fallback);
        return;
      }
      speak();
    },
    []
  );

  const resetQuestionState = useCallback(() => {
    setSpokenText("");
    spokenTextRef.current = "";
    setAttempts(0);
    attemptsRef.current = 0;
    setResult(null);
    resultRef.current = null;
    setShownModel(null);
    finalizedRef.current = false;
  }, []);

  const finishSession = useCallback(() => {
    setStatusMessage("Session completed! Saying goodbye...");
    isAIPlayingRef.current = true;
    setIsAIPlaying(true);
    playAI(
      "よく頑張りましたね！これでスピーキングの練習を終わります。お疲れ様でした！",
      null,
      () => {
        isAIPlayingRef.current = false;
        setIsAIPlaying(false);
        setSessionFinished(true);
        setIsStarted(false);
        if (!completedRef.current) {
          completedRef.current = true;
          onCompletedRef.current?.();
        }
      }
    );
  }, [playAI]);

  /** 指定インデックスの質問をAIが読み上げ、終わったら生徒の番にする */
  const askQuestion = useCallback(
    (index: number) => {
      const list = dialoguesRef.current;
      if (index >= list.length) {
        finishSession();
        return;
      }
      const d = list[index];
      indexRef.current = index;
      setCurrentIndex(index);
      resetQuestionState();

      const models = buildModels(d);
      modelsRef.current = models;
      exampleModelRef.current = models.length
        ? models[Math.floor(Math.random() * models.length)]
        : null;

      isAIPlayingRef.current = true;
      setIsAIPlaying(true);
      setStatusMessage(`Question ${index + 1} of ${list.length}: Listen to AI Yamato...`);
      playAI(d.prompt_text, d.prompt_audio_url, () => {
        isAIPlayingRef.current = false;
        setIsAIPlaying(false);
        setStatusMessage("Your turn! Click 'Start Recording' (or press Space) and answer in Japanese.");
      });
    },
    [finishSession, playAI, resetQuestionState]
  );

  const goNext = useCallback(() => {
    if (nextTimerRef.current) {
      clearTimeout(nextTimerRef.current);
      nextTimerRef.current = null;
    }
    askQuestion(indexRef.current + 1);
  }, [askQuestion]);

  const replayQuestion = () => {
    if (isListeningRef.current || isAIPlayingRef.current || resultRef.current) return;
    const d = dialoguesRef.current[indexRef.current];
    if (!d) return;
    isAIPlayingRef.current = true;
    setIsAIPlaying(true);
    playAI(d.prompt_text, d.prompt_audio_url, () => {
      isAIPlayingRef.current = false;
      setIsAIPlaying(false);
      setStatusMessage("Your turn! Click 'Start Recording' (or press Space) and answer in Japanese.");
    });
  };

  // ----- セッション開始・中断 -----
  const startSession = () => {
    if (dialoguesRef.current.length === 0) return;
    clearTimers();
    stopAllMedia();
    completedRef.current = false;
    setIsStarted(true);
    setSessionFinished(false);
    setScore(0);
    resetQuestionState();
    setCurrentIndex(0);
    indexRef.current = 0;

    setStatusMessage("AI Yamato is greeting...");
    isAIPlayingRef.current = true;
    setIsAIPlaying(true);
    playAI(
      "こんにちは！やまと先生です。それでは、スピーキングの練習を始めましょう。",
      null,
      () => askQuestion(0)
    );
  };

  const stopSession = () => {
    clearTimers();
    stopAllMedia();
    setIsStarted(false);
    setIsAIPlaying(false);
    setIsListening(false);
    setStatusMessage("Session stopped.");
  };

  // ----- 🎯 最終判定（onend で最終結果が届いてから実行）-----
  const finalizeVerification = useCallback(() => {
    if (finalizedRef.current || resultRef.current) return;
    finalizedRef.current = true;

    if (finalizeFallbackTimerRef.current) {
      clearTimeout(finalizeFallbackTimerRef.current);
      finalizeFallbackTimerRef.current = null;
    }
    isListeningRef.current = false;
    setIsListening(false);

    const spoken = spokenTextRef.current.trim();
    if (!spoken) {
      setStatusMessage("No speech detected. Please click 'Start Recording' and try speaking.");
      return;
    }

    const models = modelsRef.current;
    let matched: Model | null = null;
    const isFreeAnswer = models.length === 0; // フォールバック質問：何か話せば正解

    if (!isFreeAnswer) {
      const spokenClean = normalizeJapanese(spoken);
      matched =
        models.find((m) =>
          m.accepted.some((c) =>
            isStrictMatch(spokenClean, normalizeJapanese(c), JP_SIMILARITY_THRESHOLD)
          )
        ) ?? null;
    }

    if (isFreeAnswer || matched) {
      resultRef.current = "correct";
      setResult("correct");
      setShownModel(matched);
      setScore((prev) => prev + 1);
      setStatusMessage(`✅ Correct! ("${spoken}") Moving to next...`);
      if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
      nextTimerRef.current = setTimeout(() => {
        nextTimerRef.current = null;
        goNext();
      }, NEXT_DELAY_MS);
      return;
    }

    attemptsRef.current += 1;
    setAttempts(attemptsRef.current);

    if (attemptsRef.current >= MAX_ATTEMPTS) {
      resultRef.current = "revealed";
      setResult("revealed");
      setShownModel(exampleModelRef.current);
      setStatusMessage(`Heard: "${spoken}". Let's look at an example answer and move on.`);
    } else {
      setStatusMessage(
        `Heard: "${spoken}" — not quite. Try recording again! (${attemptsRef.current} / ${MAX_ATTEMPTS})`
      );
    }
  }, [goNext]);

  // ----- 🎙️ 録音開始 -----
  const startRecording = useCallback(() => {
    if (isListeningRef.current || isAIPlayingRef.current || resultRef.current) return;
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatusMessage("Speech recognition is not supported in this browser. Please use Chrome.");
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
        setSpokenText("");
        setStatusMessage("🔴 Recording... Speak clearly, or press Spacebar to Stop & Verify.");
      };

      recognition.onresult = (event: any) => {
        if (recognitionRef.current !== recognition) return;
        let text = "";
        for (let i = 0; i < event.results.length; ++i) {
          text += event.results[i][0].transcript;
        }
        if (text) {
          spokenTextRef.current = text;
          setSpokenText(text);
        }
      };

      recognition.onerror = (event: any) => {
        if (recognitionRef.current !== recognition) return;
        console.warn("Speech recognition error:", event.error);
        if (event.error === "aborted") return;
        if (event.error === "no-speech") return; // onend → finalize で「No speech detected」を表示

        finalizedRef.current = true; // エラー時は判定しない
        isListeningRef.current = false;
        setIsListening(false);
        setStatusMessage(
          event.error === "not-allowed"
            ? "Microphone access was denied. Please allow microphone permissions."
            : "Voice recognition error. Please click 'Start Recording' again."
        );
      };

      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return;
        finalizeVerification();
      };

      recognition.start();
    } catch (err) {
      isListeningRef.current = false;
      setIsListening(false);
      setStatusMessage("Could not start recording. Please check microphone permissions.");
    }
  }, [finalizeVerification]);

  // ----- ⏹️ 録音停止 ＆ 検証 -----
  const stopRecordingAndVerify = useCallback(() => {
    if (!isListeningRef.current) return;
    setStatusMessage("Processing...");

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

  // ----- ⌨️ スペースキーによる録音コントロール -----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isStarted || sessionFinished || isAIPlaying || result) return;
      if (e.code !== "Space") return;

      const activeElem = document.activeElement;
      if (activeElem?.tagName === "INPUT" || activeElem?.tagName === "TEXTAREA") return;

      e.preventDefault();
      if (e.repeat) return;

      if (isListening) {
        stopRecordingAndVerify();
      } else {
        startRecording();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isStarted, sessionFinished, isAIPlaying, result, isListening, startRecording, stopRecordingAndVerify]);

  // アンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      clearTimers();
      stopAllMedia();
    };
  }, [clearTimers, stopAllMedia]);

  // ----- 表示用 -----
  const totalItems = dialogues.length;
  const currentDialogue = dialogues[currentIndex];
  const isLastQuestion = currentIndex >= totalItems - 1;
  const canRecord = isStarted && !isAIPlaying && !result;

  return (
    <div className="my-6 p-6 bg-gradient-to-br from-indigo-50/60 to-white rounded-3xl border border-indigo-100 shadow-sm space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <span className="inline-block px-2.5 py-1 mb-2 text-xs font-bold tracking-wide text-indigo-700 bg-indigo-100 rounded-full">
            🗣️ Speaking Task (AI Yamato Drill)
          </span>
          <h3 className="text-lg sm:text-xl font-black text-slate-900">{title}</h3>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">{description}</p>
          {topic && <p className="text-xs text-indigo-600 font-medium mt-1">Topic: {topic}</p>}
        </div>
      </div>

      {loadState === "loading" && (
        <div className="text-xs sm:text-sm font-bold text-slate-500 bg-white/80 px-4 py-3 rounded-xl border border-slate-100">
          Loading questions...
        </div>
      )}

      {loadState === "error" && totalItems === 0 && (
        <div className="text-xs sm:text-sm font-bold text-rose-600 bg-rose-50 px-4 py-3 rounded-xl border border-rose-200">
          Failed to load questions. Please reload the page.
        </div>
      )}

      {loadState === "ready" && totalItems === 0 && (
        <div className="text-xs sm:text-sm font-bold text-slate-500 bg-white/80 px-4 py-3 rounded-xl border border-slate-100">
          No speaking questions are registered for this lesson yet.
        </div>
      )}

      {isStarted && currentDialogue && (
        <div className="p-4 bg-white rounded-2xl border border-indigo-100 shadow-inner space-y-4">
          {/* 進捗 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600">
              <span>
                Progress: Question {Math.min(currentIndex + 1, totalItems)} / {totalItems}
              </span>
              <span className="text-indigo-600">
                {score} / {totalItems} Correct
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${(score / totalItems) * 100}%` }}
              />
            </div>
          </div>

          {/* AIの質問 */}
          <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">
                AI Question
              </span>
              <button
                type="button"
                onClick={replayQuestion}
                disabled={isAIPlaying || isListening || !!result}
                className="text-xs bg-slate-200 hover:bg-indigo-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>🔊</span> Listen Again
              </button>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900">
              {currentDialogue.prompt_text}
            </p>
            {currentDialogue.prompt_en && (
              <p className="text-xs text-slate-500 italic">({currentDialogue.prompt_en})</p>
            )}
          </div>

          {/* 録音コントロール */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={startRecording}
              disabled={!canRecord || isListening}
              className={`py-4 px-4 rounded-2xl font-black text-sm text-white shadow-md transition flex items-center justify-center gap-2 ${
                !canRecord
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
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
              disabled={!canRecord || !isListening}
              className={`py-4 px-4 rounded-2xl font-black text-sm text-white shadow-md transition flex items-center justify-center gap-2 ${
                !canRecord || !isListening
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-rose-600 hover:bg-rose-700 active:scale-95 cursor-pointer"
              }`}
            >
              <span>⏹️</span>
              <span>Stop & Verify</span>
            </button>
          </div>

          {/* 認識されたテキスト */}
          <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 text-center min-h-[70px] flex flex-col justify-center">
            <span className="text-xs text-slate-500 block font-bold mb-1">
              Your Spoken Text (認識されたあなたの発音):
            </span>
            <span
              className={`text-base sm:text-lg font-black ${
                spokenText ? "text-slate-900" : "text-slate-400 italic"
              }`}
            >
              {spokenText ? `"${spokenText}"` : "(Press Spacebar or click 'Start Recording' and speak)"}
            </span>
          </div>

          {/* 正解 */}
          {result === "correct" && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-0.5">
              <p className="text-sm font-bold text-emerald-700">✨ Correct!</p>
              {shownModel && (
                <>
                  <p className="text-base font-black text-emerald-900">{shownModel.text}</p>
                  {shownModel.reading && (
                    <p className="text-xs text-emerald-700">{shownModel.reading}</p>
                  )}
                  {shownModel.en && (
                    <p className="text-xs text-emerald-700 italic">({shownModel.en})</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* 模範解答の表示（規定回数を超えて間違えた場合） */}
          {result === "revealed" && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center space-y-1">
              <p className="text-sm font-bold text-amber-700">Example answer:</p>
              {shownModel && (
                <>
                  <p className="text-base font-black text-amber-900">{shownModel.text}</p>
                  {shownModel.reading && (
                    <p className="text-xs text-amber-700">{shownModel.reading}</p>
                  )}
                  {shownModel.en && (
                    <p className="text-xs text-amber-700 italic">({shownModel.en})</p>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={goNext}
                className="mt-2 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition active:scale-95 cursor-pointer"
              >
                {isLastQuestion ? "Finish ➔" : "Next Question ➔"}
              </button>
            </div>
          )}

          {!result && attempts > 0 && (
            <p className="text-center text-xs font-bold text-rose-600">
              Attempt {attempts} / {MAX_ATTEMPTS}
            </p>
          )}
        </div>
      )}

      <div className="text-xs sm:text-sm font-bold text-slate-700 bg-white/80 px-4 py-3 rounded-xl border border-slate-100 shadow-sm">
        📢{" "}
        {statusMessage ||
          (sessionFinished
            ? "🎉 Speaking Task Completed Successfully!"
            : "Ready to start speaking practice.")}
      </div>

      <div className="flex items-center gap-3">
        {!isStarted ? (
          <button
            type="button"
            onClick={startSession}
            disabled={loadState === "loading" || totalItems === 0}
            className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition transform active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <span>🎙️</span>
            <span>Start Voice Speaking Practice</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={stopSession}
            className="py-3 px-6 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition transform active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <span>⏹️</span>
            <span>End Session</span>
          </button>
        )}
      </div>
    </div>
  );
};