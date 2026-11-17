/**
 * @file OralRealtimeSession.tsx
 * @description EOY Oral Accelerated の会話の画面（OpenAI Realtime を WebRTC でつなぐ。ボタンを押さずに、そのまま話せる）
 *
 * ・つなぎ方: ブラウザが WebRTC の申し込み（SDP）を作る → api（/api/oral-accelerated/start）がクレジットを引いて OpenAI につなぐ
 *   → 答えの SDP を受け取ってつながる。API キーはブラウザに出ない。時間を過ぎた会話は api がサーバー側から切る
 * ・英語を見張る: AI が話している言葉（文字）に英字が出たら、すぐにその返事を止めて消し、「日本語で言い直して」と伝える。
 *   英語が出た回数は api に送って記録する（「指示だけで日本語を守れるか」を判断するため）
 * ・時間: 残り 1 分で「まとめて」と伝え、時間になったら「お礼を言って終えて」と伝える。締めのあいさつが終わったら終了
 * ・会話の途中でフィードバックは出さない（終わったあとにまとめて）
 */
import React, { useEffect, useRef, useState } from "react";
import OralExaminerAvatar from "./OralExaminerAvatar";
import { yamatoFetch, YAMATO_API_BASE } from "~/lib/yamatoApi";

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

/** 英語が出たかどうか（「VCE」など、決まった言葉は除く） */
function hasEnglish(text: string): boolean {
  return /[A-Za-z]{2,}/.test(text.replace(/VCE|JLPT|SNS|AI/g, ""));
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
      yamatoFetch(`${YAMATO_API_BASE}/api/oral-accelerated/end`, {
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
  const handleEnglish = (itemId: string) => {
    if (leakedItemsRef.current.has(itemId)) return;
    leakedItemsRef.current.add(itemId);
    englishLeaksRef.current += 1;
    console.warn(`🔤 English detected in AI reply (${englishLeaksRef.current})`);
    send({ type: "response.cancel" });
    send({ type: "output_audio_buffer.clear" });
    send({ type: "conversation.item.delete", item_id: itemId });
    // 何度も続くときは、言い直しを頼むのをやめる（同じことのくり返しにしない）
    if (englishLeaksRef.current <= 5) {
      systemNote("直前のあなたの返事に英語が入っていたので、止めました。英語は一言も使わずに、同じ内容を日本語だけで、もう一度言ってください。");
      setTimeout(() => send({ type: "response.create" }), 150);
    }
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
        break;
      case "input_audio_buffer.speech_stopped":
        setStudentSpeaking(false);
        break;
      case "input_audio_buffer.committed":
        // 生徒が話した場所に、文字になる前の「…」を置いておく（順番を正しくするため）
        if (msg.item_id) setLogBoth([...logRef.current, { id: msg.item_id, speaker: "student", text: "…" }]);
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
        break;
      case "response.output_audio_transcript.delta": {
        const id = msg.item_id as string;
        if (!id || leakedItemsRef.current.has(id)) break;
        const text = (aiTextRef.current.get(id) || "") + (msg.delta || "");
        aiTextRef.current.set(id, text);
        if (hasEnglish(text)) handleEnglish(id);
        break;
      }
      case "response.output_audio_transcript.done": {
        const id = msg.item_id as string;
        const text = String(msg.transcript || aiTextRef.current.get(id) || "").trim();
        if (!id || leakedItemsRef.current.has(id)) break;
        if (hasEnglish(text)) {
          handleEnglish(id);
          break;
        }
        if (text) setLogBoth([...logRef.current, { id, speaker: "examiner", text }]);
        break;
      }
      case "response.done":
        responseActiveRef.current = false;
        if (closingRef.current === "pending") requestClosing();
        break;
      case "output_audio_buffer.started":
        setAiSpeaking(true);
        break;
      case "output_audio_buffer.stopped":
      case "output_audio_buffer.cleared":
        setAiSpeaking(false);
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
          // やまと先生から話し始める（あいさつと 1 つ目の質問）
          send({ type: "response.create" });
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const res = await yamatoFetch(`${YAMATO_API_BASE}/api/oral-accelerated/start`, {
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
          yamatoFetch(`${YAMATO_API_BASE}/api/oral-accelerated/end`, {
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
    if (remaining <= 0) requestClosing();
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
