/**
 * @file OralMockSession.tsx
 * @description EOY Oral Mock（模擬試験）の試験中の画面
 *
 * ・試験の途中ではフィードバックを出さない（試験官は短い返事と次の質問だけ）。フィードバックは終わったあとにまとめて
 * ・録音はスペースバーで開始・停止 → 文字を目で確かめて、Enter で送る／Space で言い直す（drill・elaborate と同じ）
 * ・「すみません。もういちどおねがいします。」と言うと、試験官のことばをもう一度流す（AI は呼ばない）
 * ・入室・退室のやりとり（問題集の beforeSec1 / afterSec2）は、録音済みの音声で流す（AI を呼ばないので待ち時間なし）
 * ・Section 1・2 は AI の試験官。返事は「考える時間なし・短い文・音声もいっしょに 1 回で返す」で、5 秒以内をめざす
 * ・時間（Section 1: 7 分 / Section 2: 8 分）が来たら、試験官がそのセクションを締めて、次に進む
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import OralExaminerAvatar from "./OralExaminerAvatar";
import type { MockExamConfig } from "./OralMockConfig";
import { yamatoFetch, YAMATO_API_BASE } from "~/lib/yamatoApi";
import { isRepeatRequest } from "~/hooks/OralPracticeHooks";
import type { OralExamQuestionsData, OralExamQuestionItem } from "~/data/oral-exam-questions";

export type MockStageId = "before" | "sec1" | "sec2" | "after";

export interface MockLogItem {
  stage: MockStageId;
  speaker: "examiner" | "student";
  text: string;
}

export interface ExamResultData {
  config: MockExamConfig;
  sessionId: string;
  transcript: MockLogItem[];
  /** AI のセクションにかかった秒数 */
  durations: Partial<Record<"sec1" | "sec2", number>>;
  totalDurationSeconds: number;
}

export interface OralMockSessionProps {
  config: MockExamConfig;
  sessionId: string;
  questionsData: OralExamQuestionsData;
  /** Section 2 の写真を AI が見終わるのを待つもの（null なら写真なし）。結果が文字なら、使えなかった知らせ */
  supportPhotoReady?: Promise<string | null> | null;
  onExamComplete: (result: ExamResultData) => void;
  onCancel: () => void;
  themeColor?: string;
}

const STAGE_LIMIT_SECONDS: Record<"sec1" | "sec2", number> = { sec1: 7 * 60, sec2: 8 * 60 };
const STAGE_LABEL: Record<MockStageId, string> = {
  before: "Entering the room",
  sec1: "Section 1 · General Conversation",
  sec2: "Section 2 · Detailed Study",
  after: "Leaving the room",
};

type Status =
  | "speaking"
  | "listening"
  | "recording"
  | "transcribing"
  | "sttFailed"
  | "confirm"
  | "thinking"
  | "error"
  | "finished";

interface ScriptLine {
  text: string;
  audio?: string;
  needsAnswer: boolean;
}

/** 入室・退室のことばのうち、生徒が答えるもの（質問・あいさつ） */
function lineNeedsAnswer(text: string, isLast: boolean): boolean {
  if (isLast) return true;
  return /か[。？?]?$|教えて|伺って|^こんにちは|お疲れ様でした。?$/.test(text.trim());
}

function buildScript(
  data: OralExamQuestionsData,
  key: "beforeSec1" | "afterSec2",
  difficulty: string,
  examSection: string
): ScriptLine[] {
  const group = (data as any)[key] || {};
  const list: OralExamQuestionItem[] = group[difficulty] || group.normal || group.steady || [];
  const filtered = list.filter((q) => {
    const t = q.text_original || q.text || "";
    // Section 2 だけのときは「一般会話から始めましょう」などを入れない。Section 1 だけのときは「特別研究を終わります」などを入れない
    if (examSection === "section2" && /一般|セクション[1１]|会話から始め/.test(t)) return false;
    if (examSection === "section1" && /特別研究|ディスカッション/.test(t)) return false;
    return Boolean(t);
  });
  return filtered.map((q, i) => {
    const text = (q.text_original || q.text || "").replace(/<[^>]+>/g, "");
    return { text, audio: q.audio, needsAnswer: lineNeedsAnswer(text, i === filtered.length - 1) };
  });
}

/** 問題集から、試験官に渡す「質問の例」をばらばらに選ぶ */
function pickIdeas(data: OralExamQuestionsData, section: "sec1" | "sec2", difficulty: string, count = 12): string[] {
  const group = (data as any)[section] || {};
  const list: OralExamQuestionItem[] = [...(group[difficulty] || group.normal || [])];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list
    .slice(0, count)
    .map((q) => (q.text_original || q.text || "").replace(/<[^>]+>/g, ""))
    .filter(Boolean);
}

/** 待つ時間に上限をつけた fetch（返事が来ないまま止まらないように） */
async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await yamatoFetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** 1 回の録音の長さの上限（秒）。これを超えたら自動で止めて文字にする */
const MAX_RECORDING_SECONDS = 120;

/**
 * Section 1 で、7 分の間に順に話すトピック（試験でよく出るもの）。
 * 時間で区切って、次のトピックに移るときは試験官が「では、話題を変えましょう」と大きく話題を変える
 */
const SEC1_TOPICS: { label: string; categories: string[] }[] = [
  { label: "家族 (family)", categories: ["Family"] },
  { label: "学校 (school)", categories: ["School"] },
  { label: "アルバイト (part-time job)", categories: ["Part time Job"] },
  { label: "日本 (going to Japan, studying Japanese)", categories: ["Travel", "Japanese Study"] },
  { label: "将来 (future plans)", categories: ["Future"] },
];

/** 毎回ちがう順にする（「将来」は話のまとめにしやすいので最後） */
function planSec1Topics() {
  const head = SEC1_TOPICS.slice(0, -1);
  for (let i = head.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [head[i], head[j]] = [head[j], head[i]];
  }
  return [...head, SEC1_TOPICS[SEC1_TOPICS.length - 1]];
}

/** 問題集から、そのトピックの質問の例を選ぶ */
function pickIdeasByCategory(data: OralExamQuestionsData, difficulty: string, categories: string[], count = 8): string[] {
  const group = (data as any).sec1 || {};
  const list: OralExamQuestionItem[] = (group[difficulty] || group.normal || []).filter((q: OralExamQuestionItem) =>
    categories.includes(q.category)
  );
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list
    .slice(0, count)
    .map((q) => (q.text_original || q.text || "").replace(/<[^>]+>/g, ""))
    .filter(Boolean);
}

const formatTime = (secs: number) => {
  const s = Math.max(0, Math.floor(secs));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export const OralMockSession: React.FC<OralMockSessionProps> = ({
  config,
  sessionId,
  questionsData,
  supportPhotoReady = null,
  onExamComplete,
  onCancel,
  themeColor = "#ef4444",
}) => {
  // ---- 試験の流れ（入室 → Section 1 → Section 2 → 退室） ----
  const stagesRef = useRef<MockStageId[]>([]);
  if (stagesRef.current.length === 0) {
    const s: MockStageId[] = [];
    if (config.includeBeforeAfter) s.push("before");
    if (config.examSection !== "section2") s.push("sec1");
    if (config.examSection !== "section1") s.push("sec2");
    if (config.includeBeforeAfter) s.push("after");
    stagesRef.current = s;
  }
  const stages = stagesRef.current;
  const scriptsRef = useRef<Record<"before" | "after", ScriptLine[]>>({
    before: buildScript(questionsData, "beforeSec1", config.difficulty, config.examSection),
    after: buildScript(questionsData, "afterSec2", config.difficulty, config.examSection),
  });
  const ideasRef = useRef<Record<"sec1" | "sec2", string[]>>({
    sec1: pickIdeas(questionsData, "sec1", config.difficulty),
    sec2: pickIdeas(questionsData, "sec2", config.difficulty),
  });

  // Section 1 のトピックの順番と、いま話しているトピック（-1 = まだ）
  const sec1TopicsRef = useRef(planSec1Topics());
  const topicIdxRef = useRef(-1);

  const [stageIdx, setStageIdx] = useState(0);
  const stageIdxRef = useRef(0);
  const stageStartRef = useRef(Date.now());
  const examStartRef = useRef(Date.now());
  const scriptPosRef = useRef(0);
  const durationsRef = useRef<ExamResultData["durations"]>({});

  const [log, setLog] = useState<MockLogItem[]>([]);
  const logRef = useRef<MockLogItem[]>([]);
  const addLog = (item: MockLogItem) => {
    logRef.current = [...logRef.current, item];
    setLog(logRef.current);
  };

  const [status, setStatus] = useState<Status>("speaking");
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showText, setShowText] = useState(config.showExaminerText);
  const [now, setNow] = useState(Date.now());
  const finishedRef = useRef(false);
  const unmountedRef = useRef(false);

  // ---- 音声 ----
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSpokenRef = useRef<{ text: string; src?: string } | null>(null);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  };

  /** ブラウザの読み上げ（音声が使えないときの代わり） */
  const speakWithBrowser = (text: string) =>
    new Promise<void>((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP";
      u.rate = config.examinerSpeed;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });

  /** 試験官のことばを流す（終わるまで待つ） */
  const say = (text: string, src?: string) =>
    new Promise<void>((resolve) => {
      if (unmountedRef.current) return resolve();
      lastSpokenRef.current = { text, src };
      stopAudio();
      setStatus("speaking");
      if (!src) {
        speakWithBrowser(text).then(resolve);
        return;
      }
      const audio = new Audio(src);
      audio.playbackRate = config.examinerSpeed;
      audioRef.current = audio;
      audio.onended = () => resolve();
      audio.onerror = () => {
        audioRef.current = null;
        speakWithBrowser(text).then(resolve);
      };
      audio.play().catch(() => {
        audioRef.current = null;
        speakWithBrowser(text).then(resolve);
      });
    });

  // ---- 試験の進め方 ----
  const finishExam = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    stopAudio();
    stopMic();
    const stage = stages[stageIdxRef.current];
    if ((stage === "sec1" || stage === "sec2") && durationsRef.current[stage] === undefined) {
      durationsRef.current[stage] = (Date.now() - stageStartRef.current) / 1000;
    }
    setStatus("finished");
    onExamComplete({
      config,
      sessionId,
      transcript: logRef.current,
      durations: durationsRef.current,
      totalDurationSeconds: Math.round((Date.now() - examStartRef.current) / 1000),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  type TopicPlan = { topicIdx: number; switchTopic: boolean };
  const pendingTurnRef = useRef<{ mode: "open" | "reply" | "close"; studentText?: string; plan?: TopicPlan } | null>(null);

  /** Section 1 で、この返事のときに話すトピック（時間で決める）と、話題を大きく変えるか */
  const planTopic = (mode: "open" | "reply" | "close"): TopicPlan | undefined => {
    if (stages[stageIdxRef.current] !== "sec1" || mode === "close") return undefined;
    const topics = sec1TopicsRef.current;
    if (mode === "open") return { topicIdx: 0, switchTopic: false };
    const elapsed = (Date.now() - stageStartRef.current) / 1000;
    const byTime = Math.min(Math.floor(elapsed / (STAGE_LIMIT_SECONDS.sec1 / topics.length)), topics.length - 1);
    const current = Math.max(topicIdxRef.current, 0);
    return byTime > current ? { topicIdx: current + 1, switchTopic: true } : { topicIdx: current, switchTopic: false };
  };

  /** AI の試験官に次のひとことを言ってもらう */
  const examinerTurn = async (mode: "open" | "reply" | "close", studentText?: string, presetPlan?: TopicPlan) => {
    const stage = stages[stageIdxRef.current] as "sec1" | "sec2";
    setStatus("thinking");
    setErrorMessage(null);
    const plan = presetPlan ?? planTopic(mode);
    pendingTurnRef.current = { mode, studentText, plan };
    const topic = plan ? sec1TopicsRef.current[plan.topicIdx] : undefined;
    try {
      // このセクションの会話（いま送る生徒の答えは除く）
      const stageLog = logRef.current.filter((l) => l.stage === stage);
      const history = studentText ? stageLog.slice(0, -1) : stageLog;
      const res = await fetchWithTimeout(
        `${YAMATO_API_BASE}/api/oral-mock/turn`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            stage,
            mode,
            history,
            studentText,
            // Section 1 は、いまのトピックの質問の例。Section 2 は特別研究の質問の例
            ideas: topic ? pickIdeasByCategory(questionsData, config.difficulty, topic.categories) : ideasRef.current[stage],
            topic: topic?.label,
            switchTopic: plan?.switchTopic ?? false,
            isLastStage: !stages.slice(stageIdxRef.current + 1).some((s) => s === "sec1" || s === "sec2"),
            // このセクションのあとに何もない（退室のやりとりもない）→ 締めのことばで模擬試験ぜんたいを終える
            endsExam: stageIdxRef.current === stages.length - 1,
          }),
        },
        25000
      );
      const data = (await res.json().catch(() => ({}))) as any;
      if (unmountedRef.current || finishedRef.current) return;
      if (res.status === 409) {
        setErrorMessage(data.message || "This mock exam has ended.");
        setStatus("error");
        pendingTurnRef.current = null;
        return;
      }
      if (!res.ok || !data.text) throw new Error(data.message || `HTTP ${res.status}`);
      pendingTurnRef.current = null;
      if (plan) topicIdxRef.current = plan.topicIdx;
      addLog({ stage, speaker: "examiner", text: data.text });
      await say(data.text, data.audioBase64 ? `data:audio/mpeg;base64,${data.audioBase64}` : undefined);
      if (unmountedRef.current || finishedRef.current) return;
      if (mode === "close") {
        durationsRef.current[stage] = (Date.now() - stageStartRef.current) / 1000;
        goToStage(stageIdxRef.current + 1);
      } else {
        setStatus("listening");
      }
    } catch (err: any) {
      if (unmountedRef.current) return;
      setErrorMessage("The examiner couldn't reply (connection problem). Press 'Try again' — no extra credits are used.");
      setStatus("error");
    }
  };

  /** 入室・退室のことばを、pos 番目から順に流す。生徒が答える行で止まる */
  const playScriptFrom = async (pos: number) => {
    const stage = stages[stageIdxRef.current] as "before" | "after";
    const lines = scriptsRef.current[stage];
    for (let i = pos; i < lines.length; i++) {
      if (unmountedRef.current || finishedRef.current) return;
      const line = lines[i];
      addLog({ stage, speaker: "examiner", text: line.text });
      await say(line.text, line.audio);
      if (line.needsAnswer) {
        scriptPosRef.current = i + 1;
        if (!unmountedRef.current) setStatus("listening");
        return;
      }
    }
    goToStage(stageIdxRef.current + 1);
  };

  const goToStage = (idx: number) => {
    if (finishedRef.current) return;
    if (idx >= stages.length) {
      finishExam();
      return;
    }
    stageIdxRef.current = idx;
    setStageIdx(idx);
    stageStartRef.current = Date.now();
    const stage = stages[idx];
    if (stage === "before" || stage === "after") {
      scriptPosRef.current = 0;
      playScriptFrom(0);
    } else if (stage === "sec2" && supportPhotoReady) {
      // 写真を AI が見終わってから Section 2 を始める（ふつうは Section 1 の間に終わっている。最大 20 秒待つ）
      setStatus("thinking");
      setNotice("The examiner is looking at your photo…");
      Promise.race([supportPhotoReady, new Promise<string | null>((r) => setTimeout(() => r(null), 20000))]).then((msg) => {
        if (unmountedRef.current || finishedRef.current) return;
        setNotice(msg);
        examinerTurn("open");
      });
    } else {
      examinerTurn("open");
    }
  };

  /** 生徒の答えを送る */
  const sendAnswer = () => {
    const text = transcript.trim();
    if (!text) return;
    setTranscript("");
    const stage = stages[stageIdxRef.current];
    addLog({ stage, speaker: "student", text });
    if (stage === "before" || stage === "after") {
      playScriptFrom(scriptPosRef.current);
      return;
    }
    const elapsed = (Date.now() - stageStartRef.current) / 1000;
    examinerTurn(elapsed >= STAGE_LIMIT_SECONDS[stage] ? "close" : "reply", text);
  };

  /** このセクションをここで終わりにする（試験官が締めて、次に進む） */
  const endSectionNow = () => {
    const stage = stages[stageIdxRef.current];
    if (stage !== "sec1" && stage !== "sec2") return;
    if (!window.confirm(`End ${STAGE_LABEL[stage]} now and move on?`)) return;
    setTranscript("");
    examinerTurn("close");
  };

  // ---- 録音 → 文字 ----
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopMic = () => {
    if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // 文字にできなかった録音（同じ録音で、もう一度文字にできるように取っておく）
  const lastBlobRef = useRef<Blob | null>(null);

  const transcribe = async (blob: Blob) => {
    setStatus("transcribing");
    lastBlobRef.current = blob;
    try {
      const form = new FormData();
      form.append("audio", blob, "recording.webm");
      // 文字起こしの手がかり: 試験官の最後のことば（同じ音の漢字の取り違えを減らす）
      if (lastSpokenRef.current?.text) form.append("prompt", lastSpokenRef.current.text);
      // 45 秒待っても返事がなければやめる（止まったままにしない）
      const res = await fetchWithTimeout(`${YAMATO_API_BASE}/api/stt`, { method: "POST", body: form }, 45000);
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as any;
        const detail = String(errData?.error || "");
        throw new Error(
          res.status === 429 || /quota|rate limit/i.test(detail)
            ? `The speech-to-text service is busy or has reached its limit (error ${res.status}).`
            : `The speech-to-text service returned an error (error ${res.status}).`
        );
      }
      const data = (await res.json()) as any;
      const text = String(data.userText || data.text || "").trim();
      if (unmountedRef.current || finishedRef.current) return;
      if (!text) {
        setNotice("We couldn't hear anything. Please try again.");
        setStatus("listening");
        return;
      }
      // 「すみません。もういちどおねがいします。」→ 試験官のことばをもう一度（AI は呼ばない）
      if (isRepeatRequest(text)) {
        const last = lastSpokenRef.current;
        if (last) {
          await say(last.text, last.src);
          if (!unmountedRef.current && !finishedRef.current) setStatus("listening");
        } else {
          setStatus("listening");
        }
        return;
      }
      lastBlobRef.current = null;
      setTranscript(text);
      setStatus("confirm");
    } catch (err: any) {
      if (unmountedRef.current || finishedRef.current) return;
      const reason =
        err?.name === "AbortError"
          ? "It took too long (no reply for 45 seconds)."
          : err?.message?.startsWith("The speech")
          ? err.message
          : "Connection problem.";
      setNotice(`We couldn't turn your answer into text. ${reason}`);
      setStatus("sttFailed");
    }
  };

  /** 同じ録音で、もう一度文字にする */
  const retryTranscribe = () => {
    if (lastBlobRef.current) transcribe(lastBlobRef.current);
    else setStatus("listening");
  };

  const recordStartRef = useRef(0);
  const recordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startRecording = async () => {
    setNotice(null);
    setTranscript("");
    lastBlobRef.current = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) mimeType = "audio/webm;codecs=opus";
      else if (MediaRecorder.isTypeSupported("audio/mp4")) mimeType = "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
        // 録音が終わったらマイクを閉じる
        stream.getTracks().forEach((t) => t.stop());
        if (streamRef.current === stream) streamRef.current = null;
        transcribe(new Blob(chunksRef.current, { type: mimeType }));
      };
      recorder.start();
      recordStartRef.current = Date.now();
      // 長すぎる録音は自動で止める（2 分）
      if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
      recordTimerRef.current = setTimeout(() => {
        if (recorder.state === "recording") {
          setNotice(`Recording stopped automatically after ${MAX_RECORDING_SECONDS / 60} minutes.`);
          recorder.stop();
        }
      }, MAX_RECORDING_SECONDS * 1000);
      setStatus("recording");
    } catch {
      setNotice("Microphone access is blocked. Please allow the microphone in your browser settings.");
      setStatus("listening");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state === "recording") recorderRef.current.stop();
  };

  // ---- キーボード: Space で録音の開始・停止／言い直し、Enter で送る ----
  const statusRef = useRef(status);
  statusRef.current = status;
  const handlersRef = useRef({ startRecording, stopRecording, sendAnswer, retryTranscribe });
  handlersRef.current = { startRecording, stopRecording, sendAnswer, retryTranscribe };

  useEffect(() => {
    const isTyping = (el: EventTarget | null) => {
      const node = el as HTMLElement | null;
      return !!node && (node.tagName === "INPUT" || node.tagName === "TEXTAREA" || node.tagName === "SELECT" || node.isContentEditable);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const st = statusRef.current;
      if (e.key === "Enter" && st === "confirm") {
        e.preventDefault();
        handlersRef.current.sendAnswer();
        return;
      }
      if (e.key === "Enter" && st === "sttFailed") {
        e.preventDefault();
        handlersRef.current.retryTranscribe();
        return;
      }
      if (e.code !== "Space") return;
      e.preventDefault();
      if (e.repeat) return;
      if (st === "recording") handlersRef.current.stopRecording();
      else if (st === "listening" || st === "confirm" || st === "sttFailed") handlersRef.current.startRecording();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTyping(e.target)) e.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // ---- 始める・片づける ----
  useEffect(() => {
    unmountedRef.current = false;
    examStartRef.current = Date.now();
    goToStage(0);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    // 試験の途中でページを閉じようとしたら確認する
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!finishedRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      unmountedRef.current = true;
      clearInterval(timer);
      window.removeEventListener("beforeunload", onBeforeUnload);
      stopAudio();
      stopMic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 会話の一番下を見せる
  const logBoxRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (logBoxRef.current) logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
  }, [log, status]);

  const stage = stages[stageIdx];
  const isAiStage = stage === "sec1" || stage === "sec2";
  const stageElapsed = (now - stageStartRef.current) / 1000;
  const overTime = isAiStage && stageElapsed >= STAGE_LIMIT_SECONDS[stage];

  const handleCancel = () => {
    if (!window.confirm("Leave the mock exam? You won't get feedback, and the credits for this exam are not returned.")) return;
    finishedRef.current = true;
    stopAudio();
    stopMic();
    onCancel();
  };

  const handleFinishNow = () => {
    if (!logRef.current.some((l) => l.speaker === "student")) {
      if (window.confirm("You haven't answered anything yet, so there is nothing to give feedback on. Leave the exam?")) {
        finishedRef.current = true;
        stopAudio();
        stopMic();
        onCancel();
      }
      return;
    }
    if (window.confirm("Finish the exam now and get your feedback?")) finishExam();
  };

  const statusText: Record<Status, string> = {
    speaking: "The examiner is speaking…",
    listening: "Your turn — press Space (or the Record button) to answer",
    recording: "Recording… press Space to stop",
    transcribing: "Turning your answer into text…",
    sttFailed: "Your answer could not be turned into text",
    confirm: "Is this what you said?",
    thinking: "The examiner is listening…",
    error: "Something went wrong",
    finished: "Finished",
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
      {/* Top bar */}
      <div className="px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse shrink-0" />
          <div className="min-w-0">
            <h2 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 truncate">{STAGE_LABEL[stage]}</h2>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {stages.map((s, i) => (
                <span
                  key={s}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    i === stageIdx ? "text-white" : i < stageIdx ? "bg-slate-200 dark:bg-slate-700 text-slate-500" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  }`}
                  style={i === stageIdx ? { backgroundColor: themeColor } : undefined}
                >
                  {s === "before" ? "Enter" : s === "after" ? "Exit" : s === "sec1" ? "Sec 1" : "Sec 2"}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {isAiStage && (
            <span
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold ${
                overTime ? "bg-amber-100 text-amber-800" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              }`}
              title={overTime ? "Time is up — the examiner will close this section after your next answer" : undefined}
            >
              ⏱️ {formatTime(stageElapsed)} / {formatTime(STAGE_LIMIT_SECONDS[stage])}
            </span>
          )}
          {isAiStage && (status === "listening" || status === "confirm") && (
            <button
              type="button"
              onClick={endSectionNow}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              End section
            </button>
          )}
          <button
            type="button"
            onClick={handleFinishNow}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer"
          >
            Finish &amp; get feedback
          </button>
          <button type="button" onClick={handleCancel} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">
            Leave
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3">
        {/* Left: examiner */}
        <div className="p-6 bg-slate-50/50 dark:bg-slate-950/50 lg:border-r border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center gap-5">
          <OralExaminerAvatar
            isSpeaking={status === "speaking"}
            isListening={status === "recording"}
            isThinking={status === "thinking" || status === "transcribing"}
            examinerName="Yamato Sensei"
            themeColor={themeColor}
            size="lg"
          />
          {config.supportMaterialUrl && stage === "sec2" && (
            <div className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-1">
              <span className="text-[10px] font-bold text-slate-400">Your support material</span>
              <img src={config.supportMaterialUrl} alt="Support material" className="w-full max-h-48 object-contain rounded-xl" />
            </div>
          )}
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
            <input type="checkbox" checked={showText} onChange={(e) => setShowText(e.target.checked)} className="cursor-pointer" />
            Show the examiner&apos;s words
          </label>
        </div>

        {/* Right: conversation + controls */}
        <div className="lg:col-span-2 flex flex-col">
          <div ref={logBoxRef} className="h-[45vh] min-h-[280px] p-4 sm:p-6 overflow-y-auto space-y-3">
            {log.map((m, i) => (
              <div key={i} className={`flex ${m.speaker === "student" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm sm:text-base leading-relaxed ${
                    m.speaker === "student"
                      ? "text-white rounded-br-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm border border-slate-200 dark:border-slate-700"
                  }`}
                  style={m.speaker === "student" ? { backgroundColor: themeColor } : undefined}
                >
                  {m.speaker === "examiner" && !showText ? <span className="text-slate-400">🔊 ……</span> : m.text}
                </div>
              </div>
            ))}
            {status === "thinking" && <p className="text-xs font-bold text-slate-400 animate-pulse">The examiner is listening…</p>}
          </div>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3">
            <p className="text-xs font-bold" style={{ color: status === "error" ? "#e11d48" : themeColor }}>
              {statusText[status]}
              {overTime && status === "listening" ? " (time is up — this is the last answer for this section)" : ""}
            </p>
            {notice && <p className="text-xs text-amber-700 dark:text-amber-400">{notice}</p>}

            {status === "error" && (
              <div className="space-y-2">
                <p className="text-xs text-rose-700 dark:text-rose-300">{errorMessage}</p>
                {pendingTurnRef.current ? (
                  <button
                    type="button"
                    onClick={() => {
                      const p = pendingTurnRef.current;
                      if (p) examinerTurn(p.mode, p.studentText, p.plan);
                    }}
                    className="px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer"
                    style={{ backgroundColor: themeColor }}
                  >
                    🔄 Try again
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinishNow}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                  >
                    Finish &amp; get feedback
                  </button>
                )}
              </div>
            )}

            {(status === "listening" || status === "recording") && (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={status === "recording" ? stopRecording : startRecording}
                  className={`px-6 py-3 rounded-xl font-bold text-sm text-white shadow-md cursor-pointer flex items-center gap-2 ${
                    status === "recording" ? "animate-pulse" : "bg-rose-600 hover:bg-rose-700"
                  }`}
                  style={status === "recording" ? { backgroundColor: themeColor } : undefined}
                >
                  {status === "recording"
                    ? `⏹ Stop (${formatTime((now - recordStartRef.current) / 1000)})`
                    : "🎙️ Record"}
                  <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full">[Spacebar]</span>
                </button>
                <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                  🔁 To hear it again, say
                  <br />
                  <span className="font-bold text-slate-700 dark:text-slate-200">「すみません。もういちどおねがいします。」</span>
                </p>
              </div>
            )}

            {status === "sttFailed" && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={retryTranscribe}
                  className="py-3 px-3 rounded-2xl border-2 bg-white dark:bg-slate-900 font-black text-sm flex flex-col items-center cursor-pointer active:scale-95"
                  style={{ borderColor: themeColor, color: themeColor }}
                >
                  <span>🔄 Try again (Enter)</span>
                  <span className="text-xs font-bold opacity-75">Use the same recording</span>
                </button>
                <button
                  type="button"
                  onClick={startRecording}
                  className="py-3 px-3 rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-black text-sm flex flex-col items-center cursor-pointer active:scale-95"
                >
                  <span>🎙️ Record Again (Space)</span>
                  <span className="text-xs font-bold opacity-75">Say it again</span>
                </button>
              </div>
            )}

            {status === "confirm" && (
              <div className="space-y-3">
                <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  <p className="text-base font-bold text-slate-800 dark:text-slate-100">「{transcript}」</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    If only the kanji is different for a word that sounds the same (e.g. 買った／飼った), you can still send it.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={startRecording}
                    className="py-3 px-3 rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-black text-sm flex flex-col items-center cursor-pointer active:scale-95"
                  >
                    <span>🔁 Record Again (Space)</span>
                    <span className="text-xs font-bold opacity-75">Not what I said</span>
                  </button>
                  <button
                    type="button"
                    onClick={sendAnswer}
                    className="py-3 px-3 rounded-2xl border-2 bg-white dark:bg-slate-900 font-black text-sm flex flex-col items-center cursor-pointer active:scale-95 hover:shadow-md"
                    style={{ borderColor: themeColor, color: themeColor }}
                  >
                    <span>✅ Send (Enter)</span>
                    <span className="text-xs font-bold opacity-75">This is what I said</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OralMockSession;
