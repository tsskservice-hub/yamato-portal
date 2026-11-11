/**
 * @file app/components/lessons/EduSpeakingTaskModal.tsx
 * @description Supabase(edu_lesson_dialogues → kl_dialogues)から質問を取得し、AIが質問して生徒が録音で答える一問一答スピーキング課題モーダル（タスクカードから起動）
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "~/lib/supabaseClient";
import { normalizeJapanese } from "~/utils/normalization";

interface SlotValue {
  text: string;
  reading?: string;
  romaji?: string;
  en?: string;
  cue?: string;
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

interface Model {
  key: string;
  text: string;
  reading?: string;
  en?: string;
  cue?: string;
  cueHint?: string;
  accepted: string[];
}

interface Round {
  dialogue: DialogueRow;
  target: Model | null;
  cue: string | null;
  cueHint: string | null;
}

export interface EduSpeakingTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  userId: string;
  appType?: string;
  lessonSlug?: string;
  topic?: string;
  roundsPerDynamicQuestion?: number;
  questions?: { question: string; english?: string }[];
  onCompleted?: () => void;
}

const MAX_ATTEMPTS = 3;
const NEXT_DELAY_MS = 1500;
const JP_SIMILARITY_THRESHOLD = 0.8;
const SHORT_TEXT_LENGTH = 3;

const GREETING_AUDIO_URL =
  "https://ybquwzoreecxxbewjpdn.supabase.co/storage/v1/object/public/vocabulary-audio/dialogue_cf5e3f6a-bb8c-434a-bb46-a4dc78241767.mp3";
const FAREWELL_AUDIO_URL =
  "https://ybquwzoreecxxbewjpdn.supabase.co/storage/v1/object/public/vocabulary-audio/dialogue_a38d5708-9450-4615-9686-8792e3a29623.mp3";

function norm(s: string): string {
  return normalizeJapanese(s.normalize("NFKC"));
}

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
  if (threshold >= 1) return false;
  if (Math.max(input.length, target.length) <= SHORT_TEXT_LENGTH) return false;
  return similarity(input, target) >= threshold;
}

function slotCue(v: SlotValue): string {
  if (v.cue) return v.cue;
  for (const a of v.alt ?? []) {
    const m = a.normalize("NFKC").match(/^\d+/);
    if (m) return m[0];
  }
  return v.en ?? v.text;
}

function fillWith(
  template: string,
  combo: Record<string, SlotValue>,
  pick: (key: string) => string
): string {
  return template.replace(/\{(\w+)\}/g, (m, key) => (combo[key] ? pick(key) : m));
}

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

function buildCombos(slots: DialogueRow["slots"]): Record<string, SlotValue>[] {
  let combos: Record<string, SlotValue>[] = [{}];
  Object.entries(slots ?? {}).forEach(([key, values]) => {
    if (!Array.isArray(values) || values.length === 0) return;
    combos = combos.flatMap((c) => values.map((v) => ({ ...c, [key]: v })));
  });
  return combos;
}

function buildModels(d: DialogueRow): Model[] {
  if (!d.response_text) return [];
  return buildCombos(d.slots).map((combo) => {
    const accepted = new Set<string>([
      ...expandTemplate(d.response_text, combo),
      ...(d.response_reading ? expandTemplate(d.response_reading, combo) : []),
      ...(d.accepted_responses ?? []).flatMap((t) => expandTemplate(t, combo)),
    ]);
    const text = fillWith(d.response_text, combo, (k) => combo[k].text);
    const slotValues = Object.values(combo);
    return {
      key: text,
      text,
      reading: d.response_reading
        ? fillWith(d.response_reading, combo, (k) => combo[k].reading ?? combo[k].text)
        : undefined,
      en: d.response_en
        ? fillWith(d.response_en, combo, (k) => combo[k].en ?? combo[k].text)
        : undefined,
      cue: slotValues.length ? slotValues.map(slotCue).join(" / ") : undefined,
      cueHint: slotValues.length
        ? slotValues.map((v) => v.en).filter(Boolean).join(" / ") || undefined
        : undefined,
      accepted: Array.from(accepted),
    };
  });
}

export const EduSpeakingTaskModal: React.FC<EduSpeakingTaskModalProps> = ({
  isOpen,
  onClose,
  title,
  description = "Practice speaking by listening to AI Yamato's questions and answering via microphone.",
  lessonSlug = "obento-unit-4-lesson-1",
  topic,
  roundsPerDynamicQuestion = 3,
  questions,
  onCompleted,
}) => {
  const [dbDialogues, setDbDialogues] = useState<DialogueRow[] | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!isOpen) return;
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
  }, [lessonSlug, isOpen]);

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

  const [isStarted, setIsStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [requiredCount, setRequiredCount] = useState(0);
  const [isAIPlaying, setIsAIPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState<"correct" | "revealed" | null>(null);
  const [shownModel, setShownModel] = useState<Model | null>(null);
  const [score, setScore] = useState(0);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const dialoguesRef = useRef<DialogueRow[]>(dialogues);
  const onCompletedRef = useRef(onCompleted);
  const roundsRef = useRef<Round[]>([]);
  const currentRoundRef = useRef<Round | null>(null);
  // ★ 修正：型引数を戻した（以前は `useRef>>(new Map())` になっていた）
  const usedKeysRef = useRef<Map<string, Set<string>>>(new Map());
  const indexRef = useRef(0);
  const attemptsRef = useRef(0);
  const resultRef = useRef<"correct" | "revealed" | null>(null);
  const spokenTextRef = useRef("");
  const isListeningRef = useRef(false);
  const isAIPlayingRef = useRef(false);
  const finalizedRef = useRef(false);
  const completedRef = useRef(false);
  const speakTokenRef = useRef(0);
  const recognitionRef = useRef<any>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // ブラウザ/Node どちらの環境でも通る型
  const finalizeFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  dialoguesRef.current = dialogues;
  onCompletedRef.current = onCompleted;

  const clearTimers = useCallback(() => {
    if (nextTimerRef.current) {
      clearTimeout(nextTimerRef.current);
      nextTimerRef.current = null;
    }
    if (finalizeFallbackTimerRef.current) {
      clearTimeout(finalizeFallbackTimerRef.current);
      finalizeFallbackTimerRef.current = null;
    }
  }, []);

  const stopAllMedia = useCallback(() => {
    speakTokenRef.current += 1;
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      try {
        rec.abort();
      } catch (e) {}
    }
    isListeningRef.current = false;
    isAIPlayingRef.current = false;
  }, []);

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

  const pickRound = useCallback((d: DialogueRow): Round => {
    const models = buildModels(d);
    if (models.length === 0) return { dialogue: d, target: null, cue: null, cueHint: null };

    let used = usedKeysRef.current.get(d.id);
    if (!used) {
      used = new Set<string>();
      usedKeysRef.current.set(d.id, used);
    }
    let pool = models.filter((m) => !used!.has(m.key));
    if (pool.length === 0) {
      used.clear();
      pool = models;
    }
    const target = pool[Math.floor(Math.random() * pool.length)];
    used.add(target.key);
    return {
      dialogue: d,
      target,
      cue: target.cue ?? null,
      cueHint: target.cueHint ?? null,
    };
  }, []);

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
      FAREWELL_AUDIO_URL,
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

  const askQuestion = useCallback(
    (index: number) => {
      const rounds = roundsRef.current;
      if (index >= rounds.length) {
        finishSession();
        return;
      }
      const round = rounds[index];
      indexRef.current = index;
      setCurrentIndex(index);
      resetQuestionState();
      currentRoundRef.current = round;
      setCurrentRound(round);

      isAIPlayingRef.current = true;
      setIsAIPlaying(true);
      setStatusMessage("Listen to AI Yamato's question...");
      playAI(round.dialogue.prompt_text, round.dialogue.prompt_audio_url, () => {
        isAIPlayingRef.current = false;
        setIsAIPlaying(false);
        setStatusMessage(
          round.cue
            ? `Your turn! Answer using the number shown (${round.cue}). Click 'Start Recording' (or press Space).`
            : "Your turn! Click 'Start Recording' (or press Space) and answer in Japanese."
        );
      });
    },
    [finishSession, playAI, resetQuestionState]
  );

  const goNext = useCallback(() => {
    if (nextTimerRef.current) {
      clearTimeout(nextTimerRef.current);
      nextTimerRef.current = null;
    }
    if (resultRef.current === "revealed" && currentRoundRef.current) {
      roundsRef.current = [
        ...roundsRef.current,
        pickRound(currentRoundRef.current.dialogue),
      ];
    }
    askQuestion(indexRef.current + 1);
  }, [askQuestion, pickRound]);

  const replayQuestion = () => {
    if (isListeningRef.current || isAIPlayingRef.current || resultRef.current) return;
    const round = currentRoundRef.current;
    if (!round) return;
    isAIPlayingRef.current = true;
    setIsAIPlaying(true);
    playAI(round.dialogue.prompt_text, round.dialogue.prompt_audio_url, () => {
      isAIPlayingRef.current = false;
      setIsAIPlaying(false);
      setStatusMessage("Your turn! Click 'Start Recording' (or press Space) and answer in Japanese.");
    });
  };

  const startSession = () => {
    if (dialoguesRef.current.length === 0) return;
    clearTimers();
    stopAllMedia();
    completedRef.current = false;

    usedKeysRef.current = new Map();
    const rounds: Round[] = [];
    dialoguesRef.current.forEach((d) => {
      const first = pickRound(d);
      rounds.push(first);
      if (first.cue) {
        for (let i = 1; i < roundsPerDynamicQuestion; i++) rounds.push(pickRound(d));
      }
    });
    roundsRef.current = rounds;
    setRequiredCount(rounds.length);

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
      GREETING_AUDIO_URL,
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

    const round = currentRoundRef.current;
    const target = round?.target ?? null;
    const isFreeAnswer = !target;
    let isCorrect = isFreeAnswer;

    if (target && round) {
      const spokenClean = norm(spoken);
      const threshold = round.cue ? 1 : JP_SIMILARITY_THRESHOLD;
      isCorrect = target.accepted.some((c) =>
        isStrictMatch(spokenClean, norm(c), threshold)
      );
    }

    if (isCorrect) {
      resultRef.current = "correct";
      setResult("correct");
      setShownModel(target);
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
      setShownModel(target);
      setStatusMessage(
        `Heard: "${spoken}". Here is the answer for this number. You'll get another question to make up for it.`
      );
    } else {
      setStatusMessage(
        `Heard: "${spoken}" — not quite. Try recording again! (${attemptsRef.current} / ${MAX_ATTEMPTS})`
      );
    }
  }, [goNext]);

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
        if (event.error === "no-speech") return;

        finalizedRef.current = true;
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

  const stopRecordingAndVerify = useCallback(() => {
    if (!isListeningRef.current) return;
    setStatusMessage("Processing...");

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (finalizeFallbackTimerRef.current) clearTimeout(finalizeFallbackTimerRef.current);
    finalizeFallbackTimerRef.current = setTimeout(() => {
      finalizeVerification();
    }, 1200);
  }, [finalizeVerification]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || !isStarted || sessionFinished || isAIPlaying || result) return;
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
  }, [
    isOpen,
    isStarted,
    sessionFinished,
    isAIPlaying,
    result,
    isListening,
    startRecording,
    stopRecordingAndVerify,
  ]);

  useEffect(() => {
    return () => {
      clearTimers();
      stopAllMedia();
    };
  }, [clearTimers, stopAllMedia]);

  useEffect(() => {
    if (isOpen) return;
    clearTimers();
    stopAllMedia();
    setIsStarted(false);
    setIsAIPlaying(false);
    setIsListening(false);
    setSessionFinished(false);
    setScore(0);
    setCurrentIndex(0);
    setCurrentRound(null);
    setRequiredCount(0);
    currentRoundRef.current = null;
    roundsRef.current = [];
    indexRef.current = 0;
    setStatusMessage("");
    resetQuestionState();
  }, [isOpen, clearTimers, stopAllMedia, resetQuestionState]);

  const totalItems = dialogues.length;
  const canRecord = isStarted && !isAIPlaying && !result;

  const handleClose = () => {
    clearTimers();
    stopAllMedia();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full p-5 sm:p-8 shadow-2xl space-y-4 transition-all duration-300 ${
          isFullscreen
            ? "max-w-full min-h-screen sm:min-h-[90vh] flex flex-col justify-between rounded-none sm:rounded-3xl"
            : "max-w-2xl"
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <span className="inline-block px-2.5 py-1 mb-2 text-xs font-bold tracking-wide text-indigo-700 bg-indigo-100 rounded-full">
              🗣️ Speaking Task (AI Yamato Drill)
            </span>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              {description}
            </p>
            {topic && <p className="text-xs text-indigo-600 font-medium mt-1">Topic: {topic}</p>}
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
              onClick={handleClose}
              className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-sm p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {loadState === "loading" && (
          <div className="text-xs sm:text-sm font-bold text-slate-500 bg-white/80 px-4 py-3 rounded-xl border border-slate-100">
            Loading questions...
          </div>
        )}

        {loadState === "error" && totalItems === 0 && (
          <div className="text-xs sm:text-sm font-bold text-rose-600 bg-rose-50 px-4 py-3 rounded-xl border border-rose-200">
            Failed to load questions. Please close and try again.
          </div>
        )}

        {loadState === "ready" && totalItems === 0 && (
          <div className="text-xs sm:text-sm font-bold text-slate-500 bg-white/80 px-4 py-3 rounded-xl border border-slate-100">
            No speaking questions are registered for this lesson yet.
          </div>
        )}

        {isStarted && currentRound && !sessionFinished && (
          <div className="p-4 bg-white dark:bg-slate-800/40 rounded-2xl border border-indigo-100 dark:border-slate-800 shadow-inner space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                <span>Question {currentIndex + 1}</span>
                <span className="text-indigo-600 dark:text-indigo-400">
                  {score} / {requiredCount} Correct
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${requiredCount > 0 ? (Number(score) / Number(requiredCount)) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="p-4 bg-indigo-50/50 dark:bg-slate-800 rounded-xl border border-indigo-100 dark:border-slate-700 text-center space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">
                  AI Question
                </span>
                <button
                  type="button"
                  onClick={replayQuestion}
                  disabled={isAIPlaying || isListening || !!result}
                  className="text-xs bg-slate-200 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🔊</span> Listen Again
                </button>
              </div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                {currentRound.dialogue.prompt_text}
              </p>
              {currentRound.dialogue.prompt_en && (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                  ({currentRound.dialogue.prompt_en})
                </p>
              )}
            </div>

            {currentRound.cue && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border-2 border-amber-300 dark:border-amber-700 text-center space-y-1">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                  Answer with this number
                </span>
                <span className="text-5xl font-black text-amber-900 dark:text-amber-200">{currentRound.cue}</span>
                {currentRound.cueHint && (
                  <span className="text-xs text-amber-700 dark:text-amber-400 italic block">
                    ({currentRound.cueHint})
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={startRecording}
                disabled={!canRecord || isListening}
                className={`py-4 px-4 rounded-2xl font-black text-sm text-white shadow-md transition flex items-center justify-center gap-2 ${
                  !canRecord
                    ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                    : isListening
                    ? "bg-amber-500 animate-pulse"
                    : "bg-emerald-600 hover:bg-emerald-700 active:scale-95 cursor-pointer"
                }`}
              >
                <span>🎙️</span>
                <span>
                  {isListening ? "Recording... (Space to Stop)" : "Start Recording (Space)"}
                </span>
              </button>

              <button
                type="button"
                onClick={stopRecordingAndVerify}
                disabled={!canRecord || !isListening}
                className={`py-4 px-4 rounded-2xl font-black text-sm text-white shadow-md transition flex items-center justify-center gap-2 ${
                  !canRecord || !isListening
                    ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-rose-600 hover:bg-rose-700 active:scale-95 cursor-pointer"
                }`}
              >
                <span>⏹️</span>
                <span>Stop & Verify</span>
              </button>
            </div>

            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center min-h-[70px] flex flex-col justify-center">
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-bold mb-1">
                Your Spoken Text (認識されたあなたの発音):
              </span>
              <span
                className={`text-base sm:text-lg font-black ${
                  spokenText ? "text-slate-900 dark:text-slate-100" : "text-slate-400 italic"
                }`}
              >
                {spokenText
                  ? `"${spokenText}"`
                  : "(Press Spacebar or click 'Start Recording' and speak)"}
              </span>
            </div>

            {result === "correct" && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center space-y-0.5">
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">✨ Correct!</p>
                {shownModel && (
                  <>
                    <p className="text-base font-black text-emerald-900 dark:text-emerald-200">{shownModel.text}</p>
                    {shownModel.reading && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">{shownModel.reading}</p>
                    )}
                    {shownModel.en && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 italic">({shownModel.en})</p>
                    )}
                  </>
                )}
              </div>
            )}

            {result === "revealed" && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-center space-y-1">
                <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Answer:</p>
                {shownModel && (
                  <>
                    <p className="text-base font-black text-amber-900 dark:text-amber-200">{shownModel.text}</p>
                    {shownModel.reading && (
                      <p className="text-xs text-amber-700 dark:text-amber-400">{shownModel.reading}</p>
                    )}
                    {shownModel.en && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 italic">({shownModel.en})</p>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={goNext}
                  className="mt-2 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition active:scale-95 cursor-pointer"
                >
                  Next Question ➔
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

        <div className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-800/60 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
          📢{" "}
          {statusMessage ||
            (sessionFinished
              ? "🎉 Speaking Task Completed Successfully!"
              : "Ready to start speaking practice.")}
        </div>

        {!sessionFinished && (
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
        )}

        {sessionFinished && (
          <div className="text-center space-y-6 py-12 flex-1 flex flex-col justify-center items-center animate-fade-in">
            <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center text-5xl font-black shadow-inner">
              🎉
            </div>
            <div className="space-y-3 max-w-md">
              <h4 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Congratulations!
              </h4>
              <p className="text-base sm:text-lg font-bold text-orange-600 dark:text-orange-400">
                You have successfully mastered all speaking practice rounds!
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Fantastic effort. Your progress has been saved and this task is now marked as complete.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="py-4 px-12 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-base transition shadow-lg hover:shadow-orange-500/25 active:scale-95 cursor-pointer"
            >
              Complete & Return to Lesson ➔
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EduSpeakingTaskModal;