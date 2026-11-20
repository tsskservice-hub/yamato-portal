/**
 * @file WorldTalk.tsx
 * @description 会話練習の空間（Yamato Town）で、AI のキャラクター（店員など）と声で話す画面
 *
 * ・つなぎ方は EOY Oral Superb（components/oral/OralRealtimeSession.tsx）と同じ:
 *   ブラウザが WebRTC の申し込み（SDP）を作る → api（/api/world/start）がクレジットを引いて OpenAI につなぐ → 答えを受け取る
 * ・AI の役割と使う言葉はサーバーが決める（ブラウザは場所の ID だけを送る）
 * ・会話の文字は画面に出すだけで、保存しない。時間が来たら自動で終わる（サーバーも切る）
 * ・英語の言葉が出た回数を数えて、終わるときにサーバーに知らせる（言葉の絞り方がうまくいっているかを見るため）
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link } from '@remix-run/react';
import { YAMATO_API_BASE, yamatoFetch } from '~/lib/yamatoApi';
import type { WorldPlace } from '~/data/world/places';

type Line = { id: string; speaker: 'you' | 'npc'; text: string };

/** 英語の言葉（ローマ字 2 文字以上）が入っているか。S・M・L のサイズは数えない */
const hasEnglishWord = (text: string) => /[A-Za-z]{2,}/.test(text);

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

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const finishedRef = useRef(false);
  const englishRef = useRef(0);
  const logEndRef = useRef<HTMLDivElement>(null);

  const cleanup = () => {
    try {
      pcRef.current?.close();
    } catch {
      /* もう閉じている */
    }
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
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
    setStatus('ended');
  };

  const onEvent = (msg: any) => {
    switch (msg.type) {
      case 'conversation.item.input_audio_transcription.completed': {
        const text = String(msg.transcript || '').trim();
        if (text) setLines((prev) => [...prev, { id: String(msg.item_id), speaker: 'you', text }]);
        break;
      }
      case 'response.output_audio_transcript.done': {
        const text = String(msg.transcript || '').trim();
        if (!text) break;
        if (hasEnglishWord(text)) englishRef.current += 1;
        setLines((prev) => [...prev, { id: String(msg.item_id), speaker: 'npc', text }]);
        break;
      }
      case 'output_audio_buffer.started':
        setNpcSpeaking(true);
        break;
      case 'output_audio_buffer.stopped':
      case 'output_audio_buffer.cleared':
        setNpcSpeaking(false);
        break;
    }
  };

  // つなぐ
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
        const audio = document.createElement('audio');
        audio.autoplay = true;
        document.body.appendChild(audio);
        audioRef.current = audio;
        pc.ontrack = (e) => {
          audio.srcObject = e.streams[0];
          audio.play().catch(() => {});
        };
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        const dc = pc.createDataChannel('oai-events');
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
      } catch (err: any) {
        if (cancelled) return;
        cleanup();
        finishedRef.current = true;
        setError({
          text:
            err?.name === 'NotAllowedError'
              ? 'Microphone access is blocked. Please allow the microphone in your browser settings.'
              : 'We could not connect. Please check your internet and try again.',
          plans: false,
        });
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

  return (
    <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
      {/* 会話 */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`text-4xl ${npcSpeaking ? 'animate-bounce' : ''}`}>{place.npc.icon}</span>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">{place.npc.nameJa}（{place.npc.name}）</p>
              <p className="text-xs text-slate-500">
                {status === 'connecting' && 'Connecting…'}
                {status === 'live' && (npcSpeaking ? 'Speaking…' : 'Listening — speak in Japanese')}
                {status === 'ended' && 'Conversation ended'}
                {status === 'error' && 'Could not start'}
              </p>
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

        <div className="h-72 overflow-y-auto space-y-2 rounded-xl bg-slate-50 dark:bg-slate-950 p-3" aria-live="polite">
          {!lines.length && status !== 'error' && <p className="text-sm text-slate-400">The conversation will appear here.</p>}
          {lines.map((l) => (
            <div key={l.id} className={`flex ${l.speaker === 'you' ? 'justify-end' : 'justify-start'}`}>
              <p
                lang="ja"
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  l.speaker === 'you' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {l.text}
              </p>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>

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
