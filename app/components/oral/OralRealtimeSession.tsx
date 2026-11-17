/**
 * @file OralRealtimeSession.tsx
 * @description EOY Oral Superb の会話の画面（OpenAI Realtime を WebRTC でつなぐ。ボタンを押さずに、そのまま話せる）
 *
 * ・つなぎ方: ブラウザが WebRTC の申し込み（SDP）を作る → api（/api/oral-superb/start）がクレジットを引いて OpenAI につなぐ
 *   → 答えの SDP を受け取ってつながる。API キーはブラウザに出ない。時間を過ぎた会話は api がサーバー側から切る
 * ・英語を見張る: AI が話している言葉（文字）に英字が出たら、すぐにその返事を止めて消し、「日本語で言い直して」と伝える。
 *   英語が出た回数は api に送って記録する（「指示だけで日本語を守れるか」を判断するため）
 * ・時間: 残り 1 分で「まとめて」と伝え、時間になったら「お礼を言って終えて」と伝える。締めのあいさつが終わったら終了
 * ・会話の途中でフィードバックは出さない（終わったあとにまとめて）
 */
import React, { useEffect, useRef, useState } from "react";
import OralExaminerAvatar from "./OralExaminerAvatar";
import { yamatoFetch, YAMATO_API_BASE } from "~/lib/yamatoApi";
import { planSec1Topics, SEC2_ANGLES, TOPIC_SECONDS } from "~/data/oral-topics";

export type RealtimeFocus = "free" | "sec1" | "sec2";

export interface RealtimeConfig {
  minutes: 5 | 10;
  focus: RealtimeFocus;
  subtopic?: string;
  showAiText: boolean;
}

export interface RealtimeLogItem {
  id: string;
  speaker: "examiner" | "student";
  text: string;
  /** 答え始めるまでの秒数（やまと先生が話し終えてから、生徒が話し始めるまで。割りこんだときは 0） */
  latency?: number;
  /** 話した秒数 */
  duration?: number;
}

export interface RealtimeResult {
  sessionId: string;
  transcript: RealtimeLogItem[];
  totalSeconds: number;
}

interface Props {
  config: RealtimeConfig;
  /** 会話が始まった（クレジットを使った）。新しい残高 */
  onStarted: (balance: number | null) => void;
  onFinished: (result: RealtimeResult) => void;
  /** 始められなかった・何も話さずにやめた */
  onCancel: (message?: string) => void;
  themeColor?: string;
}

/** 英語の文によく出る言葉（これが入っていれば、英単語の並びは「名前」ではなく英語の文） */
const ENGLISH_FUNCTION_WORDS = new Set(
  ("the a an is are was were be you i we he she it they this that what how why when where who " +
    "do does did can could will would should so and but or of to in on for with about my your " +
    "okay ok yes yeah no sure great good nice really let's let me think").split(" ")
);

/**
 * 英語で話したかどうか。
 * AI の声を文字にしたものなので、日本語の発音で言った「ユーチューブ」が「YouTube」と英字で書かれることがある。
 * そのため、名前のような英字の言葉があるだけでは英語とみなさない。次のどちらかのときだけ英語とみなす:
 *   ・英単語が 3 つ以上つづき、その中に is / the / you / so などの英語のふつうの言葉がある（例: "That is a great idea"）
 *     （"Netflix Disney Plus" のような名前の並びは英語とみなさない）
 *   ・20 文字以上のうち、英字が 12 文字以上で日本語の 2 倍より多く、英語のふつうの言葉も入っている（ほとんど英語の返事）
 */
function hasEnglish(text: string): boolean {
  const runs = text.match(/[A-Za-z']+(?:[\s,.!?]+[A-Za-z']+){2,}/g) || [];
  for (const run of runs) {
    const words = run.toLowerCase().split(/[\s,.!?]+/).filter(Boolean);
    if (words.some((w) => ENGLISH_FUNCTION_WORDS.has(w))) return true;
  }
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  const japanese = (text.match(/[぀-ヿ一-鿿]/g) || []).length;
  if (text.length < 20 || latin < 12 || latin <= japanese * 2) return false;
  // 英字がとても多くても、英語のふつうの言葉がなければ名前の並び（例: Taylor Swift Eras Tour）
  const words = text.toLowerCase().match(/[a-z']+/g) || [];
  return words.some((w) => ENGLISH_FUNCTION_WORDS.has(w));
}

const fmt = (secs: number) => {
  const s = Math.max(0, Math.round(secs));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export const OralRealtimeSession: React.FC<Props> = ({ config, onStarted, onFinished, onCancel, themeColor = "#8b5cf6" }) => {
  const [status, setStatus] = useState<"connecting" | "live" | "closing" | "ended">("connecting");
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [studentSpeaking, setStudentSpeaking] = useState(false);
  const [log, setLog] = useState<RealtimeLogItem[]>([]);
  const logRef = useRef<RealtimeLogItem[]>([]);
  const [showAiText, setShowAiText] = useState(config.showAiText);
  const [now, setNow] = useState(Date.now());

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number>(0);
  const finishedRef = useRef(false);
  const englishLeaksRef = useRef(0);
  const leakedItemsRef = useRef<Set<string>>(new Set());
  const aiTextRef = useRef<Map<string, string>>(new Map());
  const responseActiveRef = useRef(false);
  const warnedRef = useRef(false);
  const closingRef = useRef<"none" | "pending" | "sent">("none");
  // 英語で止めたあとの「言い直し」の返事か（言い直しは 1 回だけ。言い直しはもう止めない＝AI が黙ってしまわないように）
  const pendingRedoRef = useRef(false);

  // 約 1 分ごとに話題を変える（Section 2 は特別研究を話す角度を変える）
  const topicsRef = useRef(
    config.focus === "sec2" ? SEC2_ANGLES : planSec1Topics(Math.min(9, Math.round((config.minutes * 60) / TOPIC_SECONDS)))
  );
  const topicIdxRef = useRef(0);

  // 止まったままにしないための見張り（いつ何があったか）
  const lastActivityRef = useRef(Date.now());
  const speechStoppedAtRef = useRef(0);
  const responseCreatedAtRef = useRef(0);
  const audioStartedRef = useRef(false);
  const lastNudgeAtRef = useRef(0);

  // マイクの音の大きさ（0〜1）。マイクがちゃんと声をひろっているか、生徒が見て分かるように
  const [micLevel, setMicLevel] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // 時間を測る: やまと先生が話し終えた時刻、生徒が話し始めた・話し終えた時刻
  const aiStoppedAtRef = useRef(0);
  const aiSpeakingNowRef = useRef(false);
  const segmentRef = useRef<{ start: number; stop: number; latency?: number } | null>(null);
  const isRedoResponseRef = useRef(false);

  const setLogBoth = (next: RealtimeLogItem[]) => {
    logRef.current = next;
    setLog(next);
  };

  const send = (event: Record<string, unknown>) => {
    const dc = dcRef.current;
    if (dc && dc.readyState === "open") dc.send(JSON.stringify(event));
  };

  /** AI にだけ見える知らせ（返事はさせない） */
  const systemNote = (text: string) =>
    send({ type: "conversation.item.create", item: { type: "message", role: "system", content: [{ type: "input_text", text }] } });

  const cleanup = () => {
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    try {
      dcRef.current?.close();
    } catch {
      /* もう閉じている */
    }
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current.remove();
      audioRef.current = null;
    }
  };

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    cleanup();
    setStatus("ended");
    const sessionId = sessionIdRef.current;
    if (sessionId) {
      // 会話を切って、英語が出た回数を記録する（失敗しても、サーバーの定期処理が切る）
      yamatoFetch(`${YAMATO_API_BASE}/api/oral-superb/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, englishLeaks: englishLeaksRef.current }),
        keepalive: true,
      }).catch(() => {});
    }
    const transcript = logRef.current.filter((l) => l.text && l.text !== "…");
    if (!sessionId || !transcript.some((l) => l.speaker === "student")) {
      onCancel(sessionId ? "You didn't say anything, so there is no feedback this time." : undefined);
      return;
    }
    onFinished({
      sessionId,
      transcript,
      totalSeconds: startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : 0,
    });
  };

  /** 英語が出たとき: その返事を止めて消し、日本語で言い直させる */
  const handleEnglish = (itemId: string, text: string) => {
    if (leakedItemsRef.current.has(itemId)) return;
    leakedItemsRef.current.add(itemId);
    englishLeaksRef.current += 1;
    // 調べやすいように、英語と判断した文をコンソールに出す
    console.warn(`🔤 English detected in AI reply (${englishLeaksRef.current}): "${text}"`);
    if (isRedoResponseRef.current) {
      // 言い直しの返事にまた英語が出た: 止めずに最後まで話させる（AI が黙ってしまわないように）。回数だけ数える
      return;
    }
    send({ type: "response.cancel" });
    send({ type: "output_audio_buffer.clear" });
    send({ type: "conversation.item.delete", item_id: itemId });
    systemNote(
      "直前のあなたの返事に英語の文が入っていたので、止めました。英語の文は使わずに、同じ内容を日本語だけで、もう一度言ってください。外国の名前や言葉は、カタカナで言ってください。"
    );
    pendingRedoRef.current = true;
    setTimeout(() => send({ type: "response.create" }), 150);
  };

  /** 時間になった: お礼を言って終えてもらう */
  const requestClosing = () => {
    if (closingRef.current === "sent") return;
    if (responseActiveRef.current) {
      closingRef.current = "pending"; // 今の返事が終わってから
      return;
    }
    closingRef.current = "sent";
    setStatus("closing");
    // 生徒のマイクを止める（締めのあいさつを聞く）
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = false));
    systemNote("時間になりました。生徒の最後の話に短く反応して、お礼を言って会話を終えてください。質問はしないでください。");
    send({ type: "response.create" });
    // 念のため: 40 秒たっても終わらなければ終える
    setTimeout(finish, 40000);
  };

  const onEvent = (msg: any) => {
    switch (msg.type) {
      case "input_audio_buffer.speech_started":
        setStudentSpeaking(true);
        {
          const t = Date.now();
          // やまと先生が話している途中なら割りこみ（0 秒）。話し終えた後なら、その時からの秒数
          const latency = aiSpeakingNowRef.current ? 0 : aiStoppedAtRef.current ? (t - aiStoppedAtRef.current) / 1000 : undefined;
          segmentRef.current = { start: t, stop: 0, latency };
        }
        lastActivityRef.current = Date.now();
        speechStoppedAtRef.current = 0;
        break;
      case "input_audio_buffer.speech_stopped":
        setStudentSpeaking(false);
        if (segmentRef.current) segmentRef.current.stop = Date.now();
        lastActivityRef.current = Date.now();
        speechStoppedAtRef.current = Date.now();
        break;
      case "input_audio_buffer.committed":
        // 生徒が話した場所に、文字になる前の「…」を置いておく（順番を正しくするため）
        if (msg.item_id) {
          const seg = segmentRef.current;
          segmentRef.current = null;
          setLogBoth([
            ...logRef.current,
            {
              id: msg.item_id,
              speaker: "student",
              text: "…",
              latency: seg?.latency,
              duration: seg && seg.stop > seg.start ? (seg.stop - seg.start) / 1000 : undefined,
            },
          ]);
          // 次の答えは、また先生が話し終えてから測る
          aiStoppedAtRef.current = 0;
        }
        break;
      case "conversation.item.input_audio_transcription.completed":
        setLogBoth(
          logRef.current.map((l) => (l.id === msg.item_id ? { ...l, text: String(msg.transcript || "").trim() } : l))
        );
        break;
      case "conversation.item.input_audio_transcription.failed":
        setLogBoth(logRef.current.map((l) => (l.id === msg.item_id ? { ...l, text: "" } : l)));
        break;
      case "response.created":
        responseActiveRef.current = true;
        responseCreatedAtRef.current = Date.now();
        audioStartedRef.current = false;
        speechStoppedAtRef.current = 0;
        lastActivityRef.current = Date.now();
        // この返事が、英語で止めたあとの言い直しか
        isRedoResponseRef.current = pendingRedoRef.current;
        pendingRedoRef.current = false;
        break;
      case "response.output_audio_transcript.delta": {
        const id = msg.item_id as string;
        if (!id || leakedItemsRef.current.has(id)) break;
        const text = (aiTextRef.current.get(id) || "") + (msg.delta || "");
        aiTextRef.current.set(id, text);
        if (hasEnglish(text)) handleEnglish(id, text);
        break;
      }
      case "response.output_audio_transcript.done": {
        const id = msg.item_id as string;
        const text = String(msg.transcript || aiTextRef.current.get(id) || "").trim();
        if (!id || leakedItemsRef.current.has(id)) break;
        if (hasEnglish(text)) {
          handleEnglish(id, text);
          // 言い直しの返事は止めないので、記録には残す
          if (!isRedoResponseRef.current) break;
        }
        if (text) setLogBoth([...logRef.current, { id, speaker: "examiner", text }]);
        break;
      }
      case "response.done":
        responseActiveRef.current = false;
        lastActivityRef.current = Date.now();
        if (closingRef.current === "pending") requestClosing();
        break;
      case "output_audio_buffer.started":
        setAiSpeaking(true);
        aiSpeakingNowRef.current = true;
        audioStartedRef.current = true;
        lastActivityRef.current = Date.now();
        break;
      case "output_audio_buffer.stopped":
      case "output_audio_buffer.cleared":
        setAiSpeaking(false);
        aiSpeakingNowRef.current = false;
        aiStoppedAtRef.current = Date.now();
        lastActivityRef.current = Date.now();
        // 締めのあいさつを言い終わったら終了
        if (closingRef.current === "sent" && msg.type === "output_audio_buffer.stopped") setTimeout(finish, 800);
        break;
      case "error":
        console.warn("[realtime] error event:", msg.error?.message || msg);
        break;
      default:
        break;
    }
  };

  // ---- つなぐ ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;

        // マイクの音の大きさを測る（画面のメーター用。音は送らない）
        try {
          const ctx = new AudioContext();
          audioCtxRef.current = ctx;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          ctx.createMediaStreamSource(stream).connect(analyser);
          const buf = new Uint8Array(analyser.fftSize);
          let last = 0;
          const tick = (t: number) => {
            if (!audioCtxRef.current) return;
            if (t - last > 120) {
              last = t;
              analyser.getByteTimeDomainData(buf);
              let sum = 0;
              for (let i = 0; i < buf.length; i++) {
                const v = (buf[i] - 128) / 128;
                sum += v * v;
              }
              setMicLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
            }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        } catch {
          /* メーターが使えなくても会話はできる */
        }

        const pc = new RTCPeerConnection();
        pcRef.current = pc;
        const audio = document.createElement("audio");
        audio.autoplay = true;
        document.body.appendChild(audio);
        audioRef.current = audio;
        pc.ontrack = (e) => {
          audio.srcObject = e.streams[0];
          audio.play().catch(() => {});
        };
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        const dc = pc.createDataChannel("oai-events");
        dcRef.current = dc;
        dc.onmessage = (e) => {
          try {
            onEvent(JSON.parse(e.data));
          } catch {
            /* 読めないものは無視 */
          }
        };
        dc.onopen = () => {
          startedAtRef.current = Date.now();
          setStatus("live");
          // やまと先生から話し始める（あいさつと 1 つ目の質問）。最初の話題を伝えておく
          const first = topicsRef.current[0];
          if (first && config.focus !== "sec2") systemNote(`最初の話題は「${first.label}」です。`);
          lastActivityRef.current = Date.now();
          send({ type: "response.create" });
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const res = await yamatoFetch(`${YAMATO_API_BASE}/api/oral-superb/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            minutes: config.minutes,
            focus: config.focus,
            subtopic: config.subtopic,
            sdp: offer.sdp,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as any;
        if (cancelled) return;
        if (!res.ok || !data.answerSdp) {
          cleanup();
          onCancel(data.reply || data.message || "We could not start the conversation. Please try again.");
          return;
        }
        sessionIdRef.current = data.sessionId;
        onStarted(typeof data.balance === "number" ? data.balance : null);
        await pc.setRemoteDescription({ type: "answer", sdp: data.answerSdp });
      } catch (err: any) {
        if (cancelled) return;
        cleanup();
        onCancel(
          err?.name === "NotAllowedError"
            ? "Microphone access is blocked. Please allow the microphone in your browser settings."
            : "We could not connect. Please check your internet and try again."
        );
      }
    })();

    const timer = setInterval(() => setNow(Date.now()), 1000);
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!finishedRef.current && sessionIdRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (!finishedRef.current) {
        finishedRef.current = true;
        cleanup();
        const sessionId = sessionIdRef.current;
        if (sessionId) {
          yamatoFetch(`${YAMATO_API_BASE}/api/oral-superb/end`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, englishLeaks: englishLeaksRef.current }),
            keepalive: true,
          }).catch(() => {});
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 時間 ----
  const elapsed = startedAtRef.current ? (now - startedAtRef.current) / 1000 : 0;
  const remaining = config.minutes * 60 - elapsed;
  useEffect(() => {
    if (status !== "live" || !startedAtRef.current) return;
    if (remaining <= 60 && !warnedRef.current) {
      warnedRef.current = true;
      systemNote("残り約1分です。新しい話題は始めずに、自然に会話をまとめていってください。");
    }
    if (remaining <= 0) {
      requestClosing();
      return;
    }

    // 約 1 分ごとに話題（Section 2 は角度）を変える。残り 1 分を切ったら変えない
    const topics = topicsRef.current;
    const byTime = Math.min(Math.floor(elapsed / TOPIC_SECONDS), topics.length - 1);
    if (remaining > 60 && byTime > topicIdxRef.current) {
      topicIdxRef.current = byTime;
      const next = topics[byTime];
      systemNote(
        config.focus === "sec2"
          ? `そろそろ、サブトピックを別の角度から話しましょう。生徒の今の話に短く反応したら、「では、別の点について聞きます。」のように言って、次は「${next.label}」の点から質問してください。`
          : `そろそろ話題を変えてください。生徒の今の話に短く反応したら、「では、話題を変えましょう。」のように言って、次は「${next.label}」について質問してください。`
      );
    }

    // ---- 止まったままにしない見張り ----
    const t = Date.now();
    if (closingRef.current !== "none") return;
    // (1) 生徒が話し終わったのに 6 秒たっても返事が始まらない → 返事をうながす
    if (speechStoppedAtRef.current && !responseActiveRef.current && t - speechStoppedAtRef.current > 6000) {
      speechStoppedAtRef.current = 0;
      console.warn("[realtime] no reply after the student spoke — asking for a reply");
      send({ type: "response.create" });
      return;
    }
    // (2) 返事が始まったのに 12 秒たっても声が出ない → その返事を止めて、もう一度
    if (responseActiveRef.current && !audioStartedRef.current && t - responseCreatedAtRef.current > 12000) {
      console.warn("[realtime] reply started but no voice — retrying");
      responseCreatedAtRef.current = t;
      send({ type: "response.cancel" });
      setTimeout(() => send({ type: "response.create" }), 300);
      return;
    }
    // (3) だれも話さないまま 20 秒 → やまと先生からやさしく声をかける（30 秒に 1 回まで）
    if (
      !responseActiveRef.current &&
      !aiSpeaking &&
      !studentSpeaking &&
      t - lastActivityRef.current > 20000 &&
      t - lastNudgeAtRef.current > 30000
    ) {
      lastNudgeAtRef.current = t;
      lastActivityRef.current = t;
      systemNote(
        "生徒がしばらく話していません。マイクの声が届いていないのかもしれません。やさしく声をかけて（例：「聞こえていますか。ゆっくりで大丈夫ですよ。」）、今の質問をもっとかんたんに言いかえてください。"
      );
      send({ type: "response.create" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, status]);

  // 会話の一番下を見せる
  const boxRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [log]);

  const handleEndNow = () => {
    if (!window.confirm("End the conversation now?")) return;
    finish();
  };

  const statusLabel =
    status === "connecting"
      ? "Connecting to AI Yamato…"
      : status === "closing"
      ? "Yamato-sensei is finishing the conversation…"
      : aiSpeaking
      ? "Yamato-sensei is speaking — you can jump in any time"
      : studentSpeaking
      ? "Listening to you…"
      : "Your turn — just start speaking";

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
      <div className="px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${status === "live" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
          <h2 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
            Free Conversation with Yamato-sensei
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {startedAtRef.current > 0 && (
            <span
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold ${
                remaining <= 60 ? "bg-amber-100 text-amber-800" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              }`}
            >
              ⏱️ {fmt(remaining)} left
            </span>
          )}
          <button
            type="button"
            onClick={handleEndNow}
            disabled={status === "connecting"}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer disabled:opacity-40"
          >
            End &amp; get feedback
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3">
        <div className="p-6 bg-slate-50/50 dark:bg-slate-950/50 lg:border-r border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center gap-4">
          <OralExaminerAvatar
            isSpeaking={aiSpeaking}
            isListening={studentSpeaking}
            isThinking={status === "connecting"}
            examinerName="Yamato Sensei"
            themeColor={themeColor}
            size="lg"
          />
          <p className="text-xs font-bold text-center" style={{ color: themeColor }}>
            {statusLabel}
          </p>
          {/* マイクの音の大きさ（声をひろえているか確かめる） */}
          <div className="w-full max-w-[200px] space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
              <span>🎙️ Your mic</span>
              <span>{micLevel > 0.08 ? "hearing you" : "quiet"}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-100"
                style={{ width: `${Math.round(micLevel * 100)}%`, backgroundColor: micLevel > 0.08 ? "#10b981" : "#94a3b8" }}
              />
            </div>
          </div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
            <input type="checkbox" checked={showAiText} onChange={(e) => setShowAiText(e.target.checked)} className="cursor-pointer" />
            Show Yamato&apos;s words
          </label>
          <p className="text-[11px] text-slate-500 text-center leading-snug">
            🎧 Headphones work best. No buttons needed — just talk. To hear something again, say 「すみません。もういちどおねがいします。」
          </p>
        </div>

        <div className="lg:col-span-2">
          <div ref={boxRef} className="h-[50vh] min-h-[300px] p-4 sm:p-6 overflow-y-auto space-y-3">
            {log.length === 0 && (
              <p className="text-sm text-slate-400">{status === "connecting" ? "Connecting…" : "Yamato-sensei will start talking soon…"}</p>
            )}
            {log.map((m) =>
              m.text === "" ? null : (
                <div key={m.id} className={`flex ${m.speaker === "student" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm sm:text-base leading-relaxed ${
                      m.speaker === "student"
                        ? "text-white rounded-br-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm border border-slate-200 dark:border-slate-700"
                    }`}
                    style={m.speaker === "student" ? { backgroundColor: themeColor } : undefined}
                  >
                    {m.speaker === "examiner" && !showAiText ? <span className="text-slate-400">🔊 ……</span> : m.text}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OralRealtimeSession;
