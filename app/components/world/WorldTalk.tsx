/**
 * @file WorldTalk.tsx
 * @description 会話練習の空間（Yamato Town）で、AI のキャラクター（店員など）と声で話す画面
 *
 * ・店員の声: EOY Oral Superb（components/oral/OralRealtimeSession.tsx）と同じつなぎ方（WebRTC・OpenAI Realtime）
 *   ブラウザが WebRTC の申し込み（SDP）を作る → api（/api/world/start）がクレジットを引いて OpenAI につなぐ → 答えを受け取る
 *   ブラウザは声を「受け取るだけ」（recvonly）。マイクの音は OpenAI に流さない
 * ・生徒の発言（2026-11-21 に変更）: レッスンのスピーキングタスク・Oral Drill と同じ「録音 → 文字にする → 確かめる」
 *     1. 🎤 Record（Space）で録音 → もう一度押して止める
 *     2. 文字起こし（/api/stt。クレジットは使わない）の結果を画面に出す
 *     3. 合っていれば ✅ Send（Enter）で店員に送る。違っていれば 🔁 Record again（Space）で録り直す
 *   聞き間違いのまま店員が返事をして、会話がかみ合わなくなるのを防ぐ
 * ・AI の役割と使う言葉はサーバーが決める（ブラウザは場所の ID だけを送る）
 * ・会話の文字は画面に出すだけで、保存しない。時間が来たら自動で終わる（サーバーも切る）
 * ・店員の言葉は、はじめは隠す（聞き取りの練習）。生徒が押すと、その行だけ見られる。「Show all」で全部（2026-11-21）
 * ・会話が終わったら、毎回フィードバックを出す（/api/world/feedback。生徒の learning pace に合わせる。追加のクレジットなし）
 * ・店員の言葉に英語が出た回数を数えて、終わるときにサーバーに知らせる（言葉の絞り方がうまくいっているかを見るため）
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link } from '@remix-run/react';
import { YAMATO_API_BASE, yamatoFetch } from '~/lib/yamatoApi';
import { isLikelyHallucination } from '~/utils/stt-guard';
import { formatFeedback } from '~/components/oral/OralMockReport';
import type { WorldPlace } from '~/data/world/places';

type Line = { id: string; speaker: 'you' | 'npc'; text: string };
/** 生徒の番の状態: 待つ → 録音中 → 文字にしている → 確かめる */
type Mic = 'idle' | 'recording' | 'transcribing' | 'confirm';

/** 英語の言葉（ローマ字 2 文字以上）が入っているか。S・M・L のサイズは数えない */
const hasEnglishWord = (text: string) => /[A-Za-z]{2,}/.test(text);
/** 店員に送る 1 回の発言の長さの上限（文字） */
const MAX_SAY_LENGTH = 120;
/** これより短い録音は、押しまちがいとみなす（ミリ秒） */
const MIN_RECORD_MS = 500;
/** 録音の長さの上限（止め忘れ）。ミリ秒 */
const MAX_RECORD_MS = 20000;
const PACE_LABEL: Record<string, string> = { steady: 'Steady', normal: 'Normal', accelerated: 'Accelerated' };
type FeedbackState = {
  state: 'idle' | 'loading' | 'done' | 'error' | 'none';
  text?: string;
  pace?: string;
  message?: string;
};

export function WorldTalk({
  place,
  onClose,
}: {
  place: WorldPlace;
  /** 会話が終わったとき・始められなかったとき */
  onClose: () => void;
}) {
  const [status, setStatus] = useState<'connecting' | 'live' | 'ended' | 'error'>('connecting');
  const [error, setError] = useState<{ text: string; plans: boolean } | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [endsAt, setEndsAt] = useState<number>(0);
  const [now, setNow] = useState(Date.now());
  const [npcSpeaking, setNpcSpeaking] = useState(false);
  /** 店員が返事を作っている（送ってから、声が終わるまで） */
  const [npcBusy, setNpcBusy] = useState(true);
  const [mic, setMic] = useState<Mic>('idle');
  const [heard, setHeard] = useState('');
  const [micNote, setMicNote] = useState<string | null>(null);
  /** 見せている店員の行（はじめは隠す） */
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({ state: 'idle' });
  const linesRef = useRef<Line[]>([]);
  linesRef.current = lines;

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const finishedRef = useRef(false);
  const englishRef = useRef(0);
  const speakingRef = useRef(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recStreamRef = useRef<MediaStream | null>(null);
  const recStartedRef = useRef(0);
  const recTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 文字起こしの手がかり（メニューの言葉）。同じ音の言葉の取り違えを減らす */
  const sttHint = place.menu.flatMap((m) => m.items.map((i) => i.ja)).join('、');

  const stopRecorderStream = () => {
    if (recTimerRef.current) clearTimeout(recTimerRef.current);
    recTimerRef.current = null;
    recStreamRef.current?.getTracks().forEach((t) => t.stop());
    recStreamRef.current = null;
  };

  const cleanup = () => {
    try {
      const recorder = recorderRef.current;
      if (recorder && recorder.state === 'recording') {
        recorder.onstop = null; // 終わったあとに文字起こしをしない
        recorder.stop();
      }
    } catch {
      /* もう止まっている */
    }
    recorderRef.current = null;
    stopRecorderStream();
    try {
      pcRef.current?.close();
    } catch {
      /* もう閉じている */
    }
    pcRef.current = null;
    dcRef.current = null;
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current.remove();
      audioRef.current = null;
    }
  };

  const tellServerEnded = () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    yamatoFetch(`${YAMATO_API_BASE}/api/world/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, englishLeaks: englishRef.current }),
      keepalive: true,
    }).catch(() => {});
  };

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    cleanup();
    tellServerEnded();
    setNpcSpeaking(false);
    setMic('idle');
    setStatus('ended');
  };

  const onEvent = (msg: any) => {
    switch (msg.type) {
      case 'response.created':
        setNpcBusy(true);
        break;
      case 'response.output_audio_transcript.done': {
        const text = String(msg.transcript || '').trim();
        if (!text) break;
        if (hasEnglishWord(text)) englishRef.current += 1;
        setLines((prev) => [...prev, { id: String(msg.item_id), speaker: 'npc', text }]);
        break;
      }
      case 'output_audio_buffer.started':
        speakingRef.current = true;
        setNpcSpeaking(true);
        break;
      case 'output_audio_buffer.stopped':
      case 'output_audio_buffer.cleared':
        speakingRef.current = false;
        setNpcSpeaking(false);
        setNpcBusy(false);
        break;
      case 'response.done':
        // 声が出なかった返事（失敗など）でも、生徒の番に戻す（声が出ているときは、声が終わってから）
        if (!speakingRef.current) setNpcBusy(false);
        break;
    }
  };

  // つなぐ（店員の声を受け取るだけ。マイクはここでは使わない）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pc = new RTCPeerConnection();
        pcRef.current = pc;
        const audio = document.createElement('audio');
        audio.autoplay = true;
        document.body.appendChild(audio);
        audioRef.current = audio;
        pc.ontrack = (e) => {
          audio.srcObject = e.streams[0];
          audio.play().catch(() => {});
        };
        pc.addTransceiver('audio', { direction: 'recvonly' });

        const dc = pc.createDataChannel('oai-events');
        dcRef.current = dc;
        dc.onmessage = (e) => {
          try {
            onEvent(JSON.parse(e.data));
          } catch {
            /* 読めないものは無視 */
          }
        };
        dc.onopen = () => {
          setStatus('live');
          // 店員から話し始める（「いらっしゃいませ」）
          setNpcBusy(true);
          dc.send(JSON.stringify({ type: 'response.create' }));
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const res = await yamatoFetch(`${YAMATO_API_BASE}/api/world/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ place: place.id, sdp: offer.sdp }),
        });
        const data = (await res.json().catch(() => ({}))) as any;
        if (cancelled) return;
        if (!res.ok || !data.answerSdp) {
          cleanup();
          finishedRef.current = true;
          setError({
            text: data.reply || data.message || 'We could not start the conversation. Please try again.',
            plans: res.status === 402,
          });
          setStatus('error');
          return;
        }
        sessionIdRef.current = data.sessionId;
        setEndsAt(Date.now() + (data.minutes ?? place.minutes) * 60 * 1000);
        await pc.setRemoteDescription({ type: 'answer', sdp: data.answerSdp });
      } catch {
        if (cancelled) return;
        cleanup();
        finishedRef.current = true;
        setError({ text: 'We could not connect. Please check your internet and try again.', plans: false });
        setStatus('error');
      }
    })();

    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
      if (!finishedRef.current) {
        finishedRef.current = true;
        cleanup();
        tellServerEnded();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 会話のあとのフィードバック（毎回。learning pace に合わせてサーバーが作る） ----
  const loadFeedback = async () => {
    const sessionId = sessionIdRef.current;
    const transcript = linesRef.current.map((l) => ({ speaker: l.speaker === 'you' ? 'student' : 'clerk', text: l.text }));
    if (!sessionId || !transcript.some((t) => t.speaker === 'student')) {
      setFeedback({ state: 'none', message: "You didn't say anything, so there is no feedback this time." });
      return;
    }
    setFeedback({ state: 'loading' });
    try {
      const res = await yamatoFetch(`${YAMATO_API_BASE}/api/world/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, transcript }),
      });
      const data = (await res.json().catch(() => ({}))) as { feedback?: string; pace?: string; message?: string; error?: string };
      if (!res.ok || !data.feedback) {
        const final = data.error === 'NO_ANSWERS' || data.error === 'SESSION_ENDED';
        setFeedback({ state: final ? 'none' : 'error', message: data.message || 'Sorry, we could not create your feedback.' });
        return;
      }
      setFeedback({ state: 'done', text: data.feedback, pace: data.pace });
    } catch {
      setFeedback({ state: 'error', message: 'Sorry, we could not create your feedback. Please check your internet.' });
    }
  };

  // 会話が終わったら、自動でフィードバックを頼む
  useEffect(() => {
    if (status === 'ended' && feedback.state === 'idle') loadFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // ---- 生徒の番: 録音 → 文字にする → 確かめる → 送る ----

  const transcribe = async (blob: Blob) => {
    setMic('transcribing');
    try {
      const form = new FormData();
      form.append('audio', blob, 'recording.webm');
      form.append('prompt', sttHint);
      const res = await yamatoFetch(`${YAMATO_API_BASE}/api/stt`, { method: 'POST', body: form });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json().catch(() => ({}))) as any;
      const text = String(data.userText || data.text || '').trim().slice(0, MAX_SAY_LENGTH);
      if (finishedRef.current) return;
      if (!text || isLikelyHallucination(text, sttHint)) {
        setMic('idle');
        setMicNote("We couldn't hear you clearly. Please record again, a little closer to the microphone.");
        return;
      }
      setHeard(text);
      setMic('confirm');
    } catch {
      if (finishedRef.current) return;
      setMic('idle');
      setMicNote('Sorry, we could not turn your recording into text. Please try again.');
    }
  };

  const startRecording = async () => {
    if (status !== 'live' || npcBusy || mic === 'recording' || mic === 'transcribing') return;
    setMicNote(null);
    setHeard('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (finishedRef.current) return stream.getTracks().forEach((t) => t.stop());
      recStreamRef.current = stream;
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
      else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        stopRecorderStream();
        recorderRef.current = null;
        if (Date.now() - recStartedRef.current < MIN_RECORD_MS) {
          setMic('idle');
          setMicNote('That was too short. Press Record, speak, then press Stop.');
          return;
        }
        transcribe(new Blob(chunks, { type: mimeType }));
      };
      recorderRef.current = recorder;
      recStartedRef.current = Date.now();
      recorder.start();
      setMic('recording');
      // 止め忘れたら、自動で止める
      recTimerRef.current = setTimeout(() => stopRecording(), MAX_RECORD_MS);
    } catch (err: any) {
      stopRecorderStream();
      setMic('idle');
      setMicNote(
        err?.name === 'NotAllowedError'
          ? 'Microphone access is blocked. Please allow the microphone in your browser settings.'
          : 'Could not start recording. Please check your microphone.'
      );
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === 'recording') recorder.stop();
  };

  /** ✅ 確かめた文字を店員に送り、返事を頼む */
  const send = () => {
    const dc = dcRef.current;
    const text = heard.trim();
    if (mic !== 'confirm' || !text || !dc || dc.readyState !== 'open') return;
    dc.send(
      JSON.stringify({
        type: 'conversation.item.create',
        item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] },
      })
    );
    dc.send(JSON.stringify({ type: 'response.create' }));
    setLines((prev) => [...prev, { id: `you-${Date.now()}`, speaker: 'you', text }]);
    setNpcBusy(true);
    setHeard('');
    setMic('idle');
  };

  // キー: Space = 録音 / 止める / 録り直す、Enter = 送る
  useEffect(() => {
    if (status !== 'live') return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.repeat) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (mic === 'recording') stopRecording();
        else if (mic === 'idle' || mic === 'confirm') startRecording();
      } else if (e.key === 'Enter' && mic === 'confirm') {
        e.preventDefault();
        send();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, mic, npcBusy, heard]);

  // 時間が来たら終わる
  const left = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : place.minutes * 60;
  useEffect(() => {
    if (status === 'live' && endsAt && left === 0) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, status, endsAt]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [lines.length]);

  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  const yourTurn = status === 'live' && !npcBusy;

  const statusText =
    status === 'connecting'
      ? 'Connecting…'
      : status === 'ended'
        ? 'Conversation ended'
        : status === 'error'
          ? 'Could not start'
          : npcSpeaking
            ? 'Speaking…'
            : npcBusy
              ? 'Thinking…'
              : 'Your turn — press Record and speak in Japanese';

  return (
    <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
      {/* 会話 */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`text-4xl ${npcSpeaking ? 'animate-bounce' : ''}`}>{place.npc.icon}</span>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">
                {place.npc.nameJa}（{place.npc.name}）
              </p>
              <p className="text-xs text-slate-500">{statusText}</p>
            </div>
          </div>
          {status === 'live' && <span className="text-2xl font-black tabular-nums text-amber-600">{clock}</span>}
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm p-3 space-y-2">
            <p>{error.text}</p>
            {error.plans && (
              <Link to="/prices" className="inline-block px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold">
                See plans
              </Link>
            )}
          </div>
        )}

        {/* 店員の言葉は、はじめは隠す（聞き取りの練習） */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            🎧 Listen first. The {place.npc.name.toLowerCase()}&apos;s words are hidden — tap “Show” if you need to read them.
          </span>
          <label className="flex items-center gap-1 cursor-pointer font-bold">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            Show all
          </label>
        </div>
        <div className="h-64 overflow-y-auto space-y-2 rounded-xl bg-slate-50 dark:bg-slate-950 p-3" aria-live="polite">
          {!lines.length && status !== 'error' && <p className="text-sm text-slate-400">The conversation will appear here.</p>}
          {lines.map((l) => {
            const hidden = l.speaker === 'npc' && !showAll && !revealed.has(l.id);
            return (
              <div key={l.id} className={`flex ${l.speaker === 'you' ? 'justify-end' : 'justify-start'}`}>
                {hidden ? (
                  <button
                    type="button"
                    onClick={() => setRevealed((prev) => new Set(prev).add(l.id))}
                    className="max-w-[85%] rounded-2xl px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 cursor-pointer hover:border-amber-400"
                  >
                    🔊 The {place.npc.name.toLowerCase()} said something · <span className="font-bold underline">Show</span>
                  </button>
                ) : (
                  <p
                    lang="ja"
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      l.speaker === 'you'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {l.text}
                  </p>
                )}
              </div>
            );
          })}
          <div ref={logEndRef} />
        </div>

        {/* 生徒の番: 録音 → 確かめる → 送る */}
        {status === 'live' && (
          <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-3 space-y-2">
            {mic === 'confirm' ? (
              <>
                <p className="text-xs font-bold text-slate-500">Is this what you said?</p>
                <p lang="ja" className="text-lg font-bold text-slate-900 dark:text-white bg-indigo-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                  {heard}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={send}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                  >
                    ✅ Yes, send (Enter)
                  </button>
                  <button
                    type="button"
                    onClick={startRecording}
                    className="px-4 py-2 rounded-xl border-2 border-slate-300 text-slate-700 dark:text-slate-200 font-bold cursor-pointer"
                  >
                    🔁 Record again (Space)
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                {mic === 'recording' ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer animate-pulse"
                  >
                    ⏹ Stop (Space)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={!yourTurn || mic === 'transcribing'}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    🎤 Record (Space)
                  </button>
                )}
                <p className="text-xs text-slate-500">
                  {mic === 'recording' && '🔴 Recording… press Stop when you finish.'}
                  {mic === 'transcribing' && 'Turning your voice into text…'}
                  {mic === 'idle' && (yourTurn ? 'Speak, then check the text before you send it.' : 'Please wait for the clerk.')}
                </p>
              </div>
            )}
            {micNote && <p className="text-sm text-rose-600">{micNote}</p>}
          </div>
        )}

        {/* 会話のあとのフィードバック */}
        {status === 'ended' && (
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50/60 dark:bg-slate-950 dark:border-amber-900 p-4 space-y-2" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-black text-slate-900 dark:text-white">📝 Feedback</p>
              {feedback.pace && (
                <span className="text-xs text-slate-500">
                  For your learning pace: <b>{PACE_LABEL[feedback.pace] ?? feedback.pace}</b> (you can change it in{' '}
                  <Link to="/my-account" className="underline">
                    My Account
                  </Link>
                  )
                </span>
              )}
            </div>
            {feedback.state === 'loading' && <p className="text-sm text-slate-500 animate-pulse">AI Yamato is writing your feedback…</p>}
            {feedback.state === 'done' && feedback.text && (
              <div className="text-sm text-slate-800 dark:text-slate-100" dangerouslySetInnerHTML={{ __html: formatFeedback(feedback.text, '#d97706') }} />
            )}
            {feedback.state === 'none' && <p className="text-sm text-slate-600 dark:text-slate-300">{feedback.message}</p>}
            {feedback.state === 'error' && (
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-rose-600">{feedback.message}</p>
                <button
                  type="button"
                  onClick={loadFeedback}
                  className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 font-bold text-sm cursor-pointer"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          {status === 'live' || status === 'connecting' ? (
            <button
              type="button"
              onClick={finish}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
            >
              End conversation
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
            >
              Back to the shop
            </button>
          )}
        </div>
      </div>

      {/* メニューと、話し方のヒント */}
      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <p className="font-bold text-slate-900 dark:text-white mb-2">📋 メニュー Menu</p>
          <div className="space-y-2 text-sm">
            {place.menu.map((m) => (
              <div key={m.section}>
                <p className="text-xs font-bold text-amber-700">{m.section}</p>
                {m.items.map((i) => (
                  <p key={i.ja} className="flex justify-between gap-2">
                    <span>
                      <span lang="ja" className="font-bold text-slate-800 dark:text-slate-100">
                        {i.ja}
                      </span>{' '}
                      <span className="text-xs text-slate-500">{i.en}</span>
                    </span>
                    <span lang="ja" className="shrink-0 text-slate-700 dark:text-slate-300">
                      {i.price}
                    </span>
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <p className="font-bold text-slate-900 dark:text-white mb-2">💬 Useful phrases</p>
          <ul className="space-y-1.5 text-sm">
            {place.phrases.map((p) => (
              <li key={p.ja}>
                <span lang="ja" className="font-bold text-slate-800 dark:text-slate-100">
                  {p.ja}
                </span>
                <span className="block text-xs text-slate-500">{p.en}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
