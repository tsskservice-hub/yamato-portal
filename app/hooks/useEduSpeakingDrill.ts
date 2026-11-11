/**
 * @file app/hooks/useEduSpeakingDrill.ts
 * @description スピーキング課題の音声認識・合成、ステート管理、採点ロジックをカプセル化したカスタムフック
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { supabase } from "~/lib/supabaseClient";
import { normalizeJapanese } from "~/utils/normalization";

interface SlotValue {
  text: string;
  reading?: string;
  romaji?: string;
  en?: string;
  cue?: string;
  alt?: string[];
  /** この組み合わせの返答音声（例: 「三人家族です」） */
  response_audio_url?: string;
}

export interface DialogueRow {
  id: string;
  prompt_text: string;
  prompt_en: string | null;
  prompt_audio_url: string | null;
  response_text: string;
  response_reading: string | null;
  response_romaji: string | null;
  response_en: string | null;
  /** 返答が1パターンだけの会話用の音声（slots 側に無いときの代わり） */
  response_audio_url: string | null;
  accepted_responses: string[] | null;
  slots: Record<string, SlotValue[]> | null;
}

export interface Model {
  key: string;
  text: string;
  reading?: string;
  en?: string;
  cue?: string;
  cueHint?: string;
  /** AIが返答するときに再生する音声。無ければ音声合成で読み上げる */
  audioUrl?: string;
  accepted: string[];
}

export type RoundMode = "speak" | "ask";
export type AskStep = "question" | "typing";

export interface Round {
  dialogue: DialogueRow;
  target: Model | null;
  cue: string | null;
  cueHint: string | null;
  mode: RoundMode;
}

type UsedKeys = Record<string, string[]>;

const MAX_ATTEMPTS = 3;
const NEXT_DELAY_MS = 1500;
const JP_SIMILARITY_THRESHOLD = 0.8;
const SHORT_TEXT_LENGTH = 3;

const GREETING_AUDIO_URL =
  "https://ybquwzoreecxxbewjpdn.supabase.co/storage/v1/object/public/dialogue-audio/family/dialogue_cf5e3f6a-bb8c-434a-bb46-a4dc78241767.mp3";
const FAREWELL_AUDIO_URL =
  "https://ybquwzoreecxxbewjpdn.supabase.co/storage/v1/object/public/dialogue-audio/family/dialogue_a38d5708-9450-4615-9686-8792e3a29623.mp3";

const KANJI_NUMBERS: Record<string, string> = {
  一: "1", 二: "2", 三: "3", 四: "4", 五: "5", 六: "6", 七: "7", 八: "8", 九: "9", 十: "10",
};

function norm(s: string): string {
  return normalizeJapanese(s.normalize("NFKC"));
}
function normQuestion(s: string): string {
  return norm(s).replace(/[。、．.,？?！!\s]/g, "");
}
function parseCount(input: string): string | null {
  const s = input.normalize("NFKC").replace(/\s/g, "").replace(/人$/, "");
  if (!s) return null;
  if (/^\d+$/.test(s)) return String(Number(s));
  if (KANJI_NUMBERS[s]) return KANJI_NUMBERS[s];
  return null;
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
function fillWith(template: string, combo: Record<string, SlotValue>, pick: (key: string) => string): string {
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

    // 返答音声：slots の要素のURL → 行の response_audio_url → なし（音声合成）
    const audioUrl =
      slotValues.map((v) => v.response_audio_url).find((u) => !!u) ||
      d.response_audio_url ||
      undefined;

    return {
      key: text,
      text,
      reading: d.response_reading ? fillWith(d.response_reading, combo, (k) => combo[k].reading ?? combo[k].text) : undefined,
      en: d.response_en ? fillWith(d.response_en, combo, (k) => combo[k].en ?? combo[k].text) : undefined,
      cue: slotValues.length ? slotValues.map(slotCue).join(" / ") : undefined,
      cueHint: slotValues.length ? slotValues.map((v) => v.en).filter(Boolean).join(" / ") || undefined : undefined,
      audioUrl,
      accepted: Array.from(accepted),
    };
  });
}

interface UseEduSpeakingDrillProps {
  isOpen: boolean;
  lessonSlug: string;
  questions?: { question: string; english?: string }[];
  roundsPerDynamicQuestion: number;
  askRoundsPerDynamicQuestion: number;
  onCompleted?: () => void;
}

export function useEduSpeakingDrill({
  isOpen,
  lessonSlug,
  questions,
  roundsPerDynamicQuestion,
  askRoundsPerDynamicQuestion,
  onCompleted,
}: UseEduSpeakingDrillProps) {
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
        setLoadState("error");
        return;
      }
      const rows = (data ?? []).map((r: any) => r.kl_dialogues).filter(Boolean) as DialogueRow[];
      setDbDialogues(rows);
      setLoadState("ready");
    })();

    return () => { cancelled = true; };
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
      response_audio_url: null,
      accepted_responses: null,
      slots: null,
    }));
  }, [dbDialogues, questions]);

  const [isStarted, setIsStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [askStep, setAskStep] = useState<AskStep>("question");
  const [typedAnswer, setTypedAnswer] = useState("");
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

  const roundsRef = useRef<Round[]>([]);
  const currentRoundRef = useRef<Round | null>(null);
  const askStepRef = useRef<AskStep>("question");
  const usedKeysRef = useRef<UsedKeys>({});
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
  const inputRef = useRef<HTMLInputElement>(null!);

  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalizeFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (nextTimerRef.current) { clearTimeout(nextTimerRef.current); nextTimerRef.current = null; }
    if (finalizeFallbackTimerRef.current) { clearTimeout(finalizeFallbackTimerRef.current); finalizeFallbackTimerRef.current = null; }
  }, []);

  const stopAllMedia = useCallback(() => {
    speakTokenRef.current += 1;
    if (activeAudioRef.current) { activeAudioRef.current.pause(); activeAudioRef.current = null; }
    if (typeof window !== "undefined" && "speechSynthesis" in window) { window.speechSynthesis.cancel(); }
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      try { rec.abort(); } catch (e) {}
    }
    isListeningRef.current = false;
    isAIPlayingRef.current = false;
  }, []);

  /** AIの発話：音声URLがあれば再生し、無い・失敗したときは音声合成で読み上げる */
  const playAI = useCallback((text: string, audioUrl: string | null | undefined, onEnd?: () => void) => {
    const token = ++speakTokenRef.current;
    const done = () => { if (token === speakTokenRef.current) onEnd?.(); };

    if (activeAudioRef.current) { activeAudioRef.current.pause(); activeAudioRef.current = null; }
    if (typeof window !== "undefined" && "speechSynthesis" in window) { window.speechSynthesis.cancel(); }

    const speak = () => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) { done(); return; }
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
      audio.onended = () => { activeAudioRef.current = null; done(); };
      audio.onerror = fallback;
      audio.play().catch(fallback);
      return;
    }
    speak();
  }, []);

  const pickRound = useCallback((d: DialogueRow, mode: RoundMode): Round => {
    const models = buildModels(d);
    if (models.length === 0) return { dialogue: d, target: null, cue: null, cueHint: null, mode };

    const nsKey = `${d.id}:${mode}`;
    let used: string[] = usedKeysRef.current[nsKey] ?? [];
    let pool = models.filter((m) => !used.includes(m.key));
    if (pool.length === 0) { used = []; pool = models; }
    const target = pool[Math.floor(Math.random() * pool.length)];
    usedKeysRef.current[nsKey] = [...used, target.key];

    return { dialogue: d, target, cue: target.cue ?? null, cueHint: target.cueHint ?? null, mode };
  }, []);

  const resetQuestionState = useCallback(() => {
    setSpokenText(""); spokenTextRef.current = "";
    setTypedAnswer(""); setAttempts(0); attemptsRef.current = 0;
    setResult(null); resultRef.current = null; setShownModel(null); finalizedRef.current = false;
  }, []);

  const finishSession = useCallback(() => {
    setStatusMessage("Session completed! Saying goodbye...");
    isAIPlayingRef.current = true; setIsAIPlaying(true);
    playAI("よく頑張りましたね！これでスピーキングの練習を終わります。お疲れ様でした！", FAREWELL_AUDIO_URL, () => {
      isAIPlayingRef.current = false; setIsAIPlaying(false);
      setSessionFinished(true); setIsStarted(false);
      if (!completedRef.current) { completedRef.current = true; onCompleted?.(); }
    });
  }, [playAI, onCompleted]);

  /** Part 2：コンピュータが「〜人家族です」と答える（音声URLがあればそれを再生） */
  const startReply = useCallback((round: Round, prefix: string) => {
    askStepRef.current = "typing"; setAskStep("typing");
    attemptsRef.current = 0; setAttempts(0); setTypedAnswer("");
    const replyText = round.target ? round.target.reading ?? round.target.text : "";
    isAIPlayingRef.current = true; setIsAIPlaying(true);
    setStatusMessage(`${prefix} Listen to AI Yamato's answer...`);
    playAI(replyText, round.target?.audioUrl ?? null, () => {
      isAIPlayingRef.current = false; setIsAIPlaying(false);
      setStatusMessage("How many people are in the family? Type the number (e.g. 3) and press Submit.");
    });
  }, [playAI]);

  const replyAgain = () => {
    const round = currentRoundRef.current;
    if (!round || !round.target || isAIPlayingRef.current || resultRef.current) return;
    isAIPlayingRef.current = true; setIsAIPlaying(true);
    playAI(round.target.reading ?? round.target.text, round.target.audioUrl ?? null, () => {
      isAIPlayingRef.current = false; setIsAIPlaying(false);
      setStatusMessage("How many people are in the family? Type the number (e.g. 3) and press Submit.");
    });
  };

  const askQuestion = useCallback((index: number) => {
    const rounds = roundsRef.current;
    if (index >= rounds.length) { finishSession(); return; }
    const round = rounds[index];
    indexRef.current = index; setCurrentIndex(index);
    resetQuestionState();
    currentRoundRef.current = round; setCurrentRound(round);
    askStepRef.current = "question"; setAskStep("question");

    if (round.mode === "ask") {
      isAIPlayingRef.current = false; setIsAIPlaying(false);
      setStatusMessage(`Part 2: Now YOU ask the question! Say "${round.dialogue.prompt_text}"`);
      return;
    }

    isAIPlayingRef.current = true; setIsAIPlaying(true);
    setStatusMessage("Listen to AI Yamato's question...");
    playAI(round.dialogue.prompt_text, round.dialogue.prompt_audio_url, () => {
      isAIPlayingRef.current = false; setIsAIPlaying(false);
      setStatusMessage(round.cue ? `Your turn! Answer using (${round.cue}).` : "Your turn! Answer in Japanese.");
    });
  }, [finishSession, playAI, resetQuestionState]);

  const goNext = useCallback(() => {
    if (nextTimerRef.current) { clearTimeout(nextTimerRef.current); nextTimerRef.current = null; }
    const cur = currentRoundRef.current;
    if (resultRef.current === "revealed" && cur) {
      roundsRef.current = [...roundsRef.current, pickRound(cur.dialogue, cur.mode)];
    }
    askQuestion(indexRef.current + 1);
  }, [askQuestion, pickRound]);

  const replayQuestion = () => {
    if (isListeningRef.current || isAIPlayingRef.current || resultRef.current) return;
    const round = currentRoundRef.current;
    if (!round || round.mode !== "speak") return;
    isAIPlayingRef.current = true; setIsAIPlaying(true);
    playAI(round.dialogue.prompt_text, round.dialogue.prompt_audio_url, () => {
      isAIPlayingRef.current = false; setIsAIPlaying(false);
      setStatusMessage("Your turn! Answer in Japanese.");
    });
  };

  const startSession = () => {
    if (dialogues.length === 0) return;
    clearTimers(); stopAllMedia(); completedRef.current = false;
    usedKeysRef.current = {};
    const speakRounds: Round[] = [];
    const askRounds: Round[] = [];
    dialogues.forEach((d: DialogueRow) => {
      const first = pickRound(d, "speak");
      speakRounds.push(first);
      if (first.cue) {
        for (let i = 1; i < roundsPerDynamicQuestion; i++) speakRounds.push(pickRound(d, "speak"));
        for (let i = 0; i < askRoundsPerDynamicQuestion; i++) askRounds.push(pickRound(d, "ask"));
      }
    });
    const rounds = [...speakRounds, ...askRounds];
    roundsRef.current = rounds; setRequiredCount(rounds.length);
    setIsStarted(true); setSessionFinished(false); setScore(0);
    resetQuestionState(); setCurrentIndex(0); indexRef.current = 0;

    setStatusMessage("AI Yamato is greeting...");
    isAIPlayingRef.current = true; setIsAIPlaying(true);
    playAI("こんにちは！やまと先生です。それでは、スピーキングの練習を始めましょう。", GREETING_AUDIO_URL, () => askQuestion(0));
  };

  const stopSession = () => {
    clearTimers(); stopAllMedia();
    setIsStarted(false); setIsAIPlaying(false); setIsListening(false);
    setStatusMessage("Session stopped.");
  };

  const submitTypedAnswer = () => {
    if (resultRef.current || isAIPlayingRef.current) return;
    const round = currentRoundRef.current;
    if (!round || round.mode !== "ask" || !round.target) return;

    const typed = parseCount(typedAnswer);
    if (!typed) { setStatusMessage("Please type the number of people (e.g. 3)."); return; }

    const cue = round.cue ?? "";
    const expected = /^\d+$/.test(cue) ? String(Number(cue)) : cue;

    if (typed === expected) {
      resultRef.current = "correct"; setResult("correct");
      setShownModel(round.target); setScore((prev) => prev + 1);
      setStatusMessage(`✅ Correct! (${typed}) Moving to next...`);
      if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
      nextTimerRef.current = setTimeout(() => { nextTimerRef.current = null; goNext(); }, NEXT_DELAY_MS);
      return;
    }

    attemptsRef.current += 1; setAttempts(attemptsRef.current);
    if (attemptsRef.current >= MAX_ATTEMPTS) {
      resultRef.current = "revealed"; setResult("revealed");
      setShownModel(round.target);
      setStatusMessage("Not quite. Here is what AI Yamato said.");
    } else {
      setStatusMessage(`${typed} is not quite right. Try once more!`);
    }
  };

  const finalizeVerification = useCallback(() => {
    if (finalizedRef.current || resultRef.current) return;
    finalizedRef.current = true;
    if (finalizeFallbackTimerRef.current) { clearTimeout(finalizeFallbackTimerRef.current); finalizeFallbackTimerRef.current = null; }
    isListeningRef.current = false; setIsListening(false);

    const spoken = spokenTextRef.current.trim();
    if (!spoken) { setStatusMessage("No speech detected."); return; }

    const round = currentRoundRef.current;
    if (round && round.mode === "ask" && askStepRef.current === "question") {
      const ok = isStrictMatch(normQuestion(spoken), normQuestion(round.dialogue.prompt_text), JP_SIMILARITY_THRESHOLD);
      if (ok) { startReply(round, `✅ Good question! ("${spoken}")`); return; }
      attemptsRef.current += 1; setAttempts(attemptsRef.current);
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        startReply(round, `The question is "${round.dialogue.prompt_text}".`);
      } else {
        setStatusMessage(`Heard: "${spoken}" — try again!`);
      }
      return;
    }

    const target = round?.target ?? null;
    let isCorrect = !target;
    if (target && round) {
      isCorrect = target.accepted.some((c) => isStrictMatch(norm(spoken), norm(c), round.cue ? 1 : JP_SIMILARITY_THRESHOLD));
    }

    if (isCorrect) {
      resultRef.current = "correct"; setResult("correct");
      setShownModel(target); setScore((prev) => prev + 1);
      setStatusMessage(`✅ Correct! ("${spoken}") Moving to next...`);
      if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
      nextTimerRef.current = setTimeout(() => { nextTimerRef.current = null; goNext(); }, NEXT_DELAY_MS);
      return;
    }

    attemptsRef.current += 1; setAttempts(attemptsRef.current);
    if (attemptsRef.current >= MAX_ATTEMPTS) {
      resultRef.current = "revealed"; setResult("revealed");
      setShownModel(target);
      setStatusMessage(`Heard: "${spoken}". Here is the correct answer.`);
    } else {
      setStatusMessage(`Heard: "${spoken}" — try again!`);
    }
  }, [goNext, startReply]);

  const startRecording = useCallback(() => {
    if (isListeningRef.current || isAIPlayingRef.current || resultRef.current) return;
    if (currentRoundRef.current?.mode === "ask" && askStepRef.current === "typing") return;
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setStatusMessage("Speech recognition is not supported in this browser. Please use Chrome."); return; }

    if (recognitionRef.current) {
      const old = recognitionRef.current;
      recognitionRef.current = null;
      try { old.abort(); } catch (e) {}
    }

    try {
      finalizedRef.current = false; spokenTextRef.current = "";
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = "ja-JP"; recognition.interimResults = true; recognition.maxAlternatives = 5; recognition.continuous = true;

      recognition.onstart = () => {
        if (recognitionRef.current !== recognition) return;
        isListeningRef.current = true; setIsListening(true); setSpokenText("");
        setStatusMessage("🔴 Recording... (Spacebar to Stop)");
      };
      recognition.onresult = (event: any) => {
        if (recognitionRef.current !== recognition) return;
        let text = "";
        for (let i = 0; i < event.results.length; ++i) text += event.results[i][0].transcript;
        if (text) { spokenTextRef.current = text; setSpokenText(text); }
      };
      recognition.onerror = (event: any) => {
        if (recognitionRef.current !== recognition) return;
        console.warn("Speech recognition error:", event.error);
        if (event.error === "aborted" || event.error === "no-speech") return;
        finalizedRef.current = true; // エラー時は判定しない
        isListeningRef.current = false; setIsListening(false);
        setStatusMessage(
          event.error === "not-allowed"
            ? "Microphone access was denied. Please allow microphone permissions."
            : "Voice recognition error. Please click 'Start Recording' again."
        );
      };
      recognition.onend = () => { if (recognitionRef.current === recognition) finalizeVerification(); };
      recognition.start();
    } catch (err) {
      isListeningRef.current = false; setIsListening(false);
      setStatusMessage("Could not start recording. Please check microphone permissions.");
    }
  }, [finalizeVerification]);

  const stopRecordingAndVerify = useCallback(() => {
    if (!isListeningRef.current) return;
    setStatusMessage("Processing...");
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch (e) {} }
    if (finalizeFallbackTimerRef.current) clearTimeout(finalizeFallbackTimerRef.current);
    finalizeFallbackTimerRef.current = setTimeout(() => { finalizeVerification(); }, 1200);
  }, [finalizeVerification]);

  // アンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      clearTimers();
      stopAllMedia();
    };
  }, [clearTimers, stopAllMedia]);

  // モーダルが閉じられたら、再生・録音を止めて状態を初期化する
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
    setAskStep("question");
    askStepRef.current = "question";
    setRequiredCount(0);
    currentRoundRef.current = null;
    roundsRef.current = [];
    indexRef.current = 0;
    setStatusMessage("");
    resetQuestionState();
  }, [isOpen, clearTimers, stopAllMedia, resetQuestionState]);

  return {
    loadState, totalItems: dialogues.length, isStarted, sessionFinished, isFullscreen, setIsFullscreen,
    currentIndex, currentRound, askStep, typedAnswer, setTypedAnswer, requiredCount, isAIPlaying,
    isListening, spokenText, statusMessage, attempts, result, shownModel, score, inputRef,
    startSession, stopSession, startRecording, stopRecordingAndVerify, replayQuestion, replayAgainPlaceholder: undefined,
    replyAgain, submitTypedAnswer, goNext, clearTimers, stopAllMedia,
  };
}