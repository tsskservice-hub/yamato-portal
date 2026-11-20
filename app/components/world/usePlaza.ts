/**
 * @file usePlaza.ts
 * @description Yamato Town の「みんなで（Together）」モード — 部屋（api の Durable Object: src/world/plaza-room.ts）とつなぐ
 *
 * 流れ: 入れるか確かめる（/api/world/plaza/status）→ 決まりに同意していなければ同意してもらう（agree）
 *       → 空いている部屋を聞く（join）→ WebSocket でつなぎ、最初のメッセージで Supabase のトークンを送る
 *
 * 送れるのは、位置・アバターの番号・決まった文の番号・スタンプの番号・「AI と話し中か」だけ（自由な文字は送れない）。
 * ほかの人は pid（つなぐたびに変わる番号）とランダムの町の名前でしか分からない。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { YAMATO_API_BASE, getAccessToken, yamatoFetch } from '~/lib/yamatoApi';

/** 決まりの版（api の PLAZA_RULES_VERSION と同じにする） */
export const PLAZA_RULES_VERSION = 1;

export type PlazaPhase = 'off' | 'checking' | 'needs-agree' | 'connecting' | 'live' | 'closed';
export type PlazaPlayer = { pid: string; name: string; avatar: number; x: number; y: number; talking: boolean };
export type PlazaBubble = { id: number; text: string; stamp: boolean };

export const PLAZA_CLOSED_MESSAGES: Record<string, string> = {
  LOGIN_REQUIRED: 'Please log in to use Together mode.',
  SCHOOL_ACCOUNT:
    'Together mode is only for personal accounts. Teacher accounts and students in a school class can use the Speaking Tasks instead.',
  SUSPENDED: 'You cannot use Together mode at the moment because of reports from other users.',
  ROOM_FULL: 'The shop is full right now. Please try again in a few minutes.',
  FULL: 'The shop is full right now. Please try again in a few minutes.',
  OPENED_ELSEWHERE: 'You opened Together mode in another tab or device, so this one was closed.',
  IDLE: 'You were away for a while, so you left Together mode.',
  AUTH_TIMEOUT: 'The connection timed out. Please try again.',
  CONNECTION_LOST: 'The connection was lost. Please try again.',
  NOT_AGREED: 'Please agree to the Together mode rules first.',
  SERVER_ERROR: 'Something went wrong on the server. Please try again later.',
};

const MOVE_SEND_MS = 200;
const BUBBLE_MS = 4500;

export function usePlaza({
  placeId,
  active,
  getStart,
}: {
  placeId: string;
  /** 「みんなで」を選んでいる間 true */
  active: boolean;
  /** つなぐときの自分の位置とアバター */
  getStart: () => { x: number; y: number; avatar: number };
}) {
  const [phase, setPhase] = useState<PlazaPhase>('off');
  const [closedCode, setClosedCode] = useState<string | null>(null);
  const [me, setMe] = useState<PlazaPlayer | null>(null);
  const [others, setOthers] = useState<Record<string, PlazaPlayer>>({});
  const [bubbles, setBubbles] = useState<Record<string, PlazaBubble>>({});
  const [phrases, setPhrases] = useState<{ ja: string; en: string }[]>([]);
  const [stamps, setStamps] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const getStartRef = useRef(getStart);
  getStartRef.current = getStart;
  const phrasesRef = useRef<{ ja: string; en: string }[]>([]);
  const stampsRef = useRef<string[]>([]);
  const bubbleId = useRef(0);
  const pendingMove = useRef<{ x: number; y: number } | null>(null);
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBubble = useCallback((pid: string, text: string, stamp: boolean) => {
    const id = ++bubbleId.current;
    setBubbles((prev) => ({ ...prev, [pid]: { id, text, stamp } }));
    setTimeout(() => {
      setBubbles((prev) => {
        if (prev[pid]?.id !== id) return prev;
        const next = { ...prev };
        delete next[pid];
        return next;
      });
    }, BUBBLE_MS);
  }, []);

  const onMessage = useCallback(
    (msg: any) => {
      switch (msg.t) {
        case 'welcome': {
          phrasesRef.current = Array.isArray(msg.phrases) ? msg.phrases : [];
          stampsRef.current = Array.isArray(msg.stamps) ? msg.stamps : [];
          setPhrases(phrasesRef.current);
          setStamps(stampsRef.current);
          setMe(msg.you);
          const map: Record<string, PlazaPlayer> = {};
          for (const p of msg.players ?? []) map[p.pid] = p;
          setOthers(map);
          setPhase('live');
          break;
        }
        case 'join':
          setOthers((prev) => ({ ...prev, [msg.p.pid]: msg.p }));
          break;
        case 'leave':
          setOthers((prev) => {
            if (!prev[msg.pid]) return prev;
            const next = { ...prev };
            delete next[msg.pid];
            return next;
          });
          break;
        case 'moves':
          setOthers((prev) => {
            const next = { ...prev };
            for (const [pid, x, y] of msg.m ?? []) if (next[pid]) next[pid] = { ...next[pid], x, y };
            return next;
          });
          break;
        case 'avatar':
        case 'talking':
          setOthers((prev) =>
            prev[msg.pid] ? { ...prev, [msg.pid]: { ...prev[msg.pid], ...(msg.t === 'avatar' ? { avatar: msg.i } : { talking: !!msg.on }) } } : prev
          );
          if (msg.t === 'avatar') setMe((m) => (m && m.pid === msg.pid ? { ...m, avatar: msg.i } : m));
          break;
        case 'say': {
          const p = phrasesRef.current[msg.i];
          if (p) showBubble(msg.pid, p.ja, false);
          break;
        }
        case 'stamp': {
          const s = stampsRef.current[msg.i];
          if (s) showBubble(msg.pid, s, true);
          break;
        }
        case 'blocked':
          setNotice('Blocked. You and this person will not see each other in Yamato Town.');
          break;
        case 'reported':
          setNotice('Thank you. We will check your report. You and this person will not see each other any more.');
          break;
      }
    },
    [showBubble]
  );

  // 入れるか確かめる → つなぐ
  useEffect(() => {
    if (!active) {
      setPhase('off');
      setOthers({});
      setBubbles({});
      setMe(null);
      return;
    }
    let stopped = false;
    let retries = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const fail = (code: string) => {
      if (stopped) return;
      setClosedCode(code);
      setPhase('closed');
    };

    const connect = async () => {
      // 空いている部屋を聞く
      const joinRes = await yamatoFetch(`${YAMATO_API_BASE}/api/world/plaza/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place: placeId }),
      }).catch(() => null);
      const join = (await joinRes?.json().catch(() => ({}))) as { status?: string; room?: number } | undefined;
      if (stopped) return;
      if (!joinRes) return fail('CONNECTION_LOST');
      if (join?.status === 'NOT_AGREED') return setPhase('needs-agree');
      if (!joinRes.ok || !join?.room) return fail(join?.status || 'SERVER_ERROR');

      const token = await getAccessToken();
      if (stopped) return;
      if (!token) return fail('LOGIN_REQUIRED');

      const ws = new WebSocket(`${YAMATO_API_BASE.replace(/^http/, 'ws')}/api/world/plaza/room/${placeId}/${join.room}/ws`);
      wsRef.current = ws;
      let serverClosed = false;
      ws.onopen = () => {
        retries = 0;
        const start = getStartRef.current();
        ws.send(JSON.stringify({ t: 'auth', token, avatar: start.avatar, x: start.x, y: start.y }));
      };
      ws.onmessage = (event) => {
        let msg: any;
        try {
          msg = JSON.parse(String(event.data));
        } catch {
          return;
        }
        if (msg?.t === 'closed') {
          serverClosed = true;
          fail(String(msg.code || 'SERVER_ERROR'));
          return;
        }
        onMessage(msg);
      };
      ws.onclose = (event) => {
        if (wsRef.current === ws) wsRef.current = null;
        if (stopped || serverClosed || event.code === 4000) return;
        // 通信が切れただけなら、少し待ってつなぎ直す
        retries += 1;
        setOthers({});
        if (retries > 5) return fail('CONNECTION_LOST');
        setPhase('connecting');
        retryTimer = setTimeout(connect, Math.min(1000 * retries, 5000));
      };
    };

    (async () => {
      setClosedCode(null);
      setNotice(null);
      setPhase('checking');
      const res = await yamatoFetch(`${YAMATO_API_BASE}/api/world/plaza/status`).catch(() => null);
      const data = (await res?.json().catch(() => ({}))) as { status?: string } | undefined;
      if (stopped) return;
      if (!res) return fail('CONNECTION_LOST');
      if (res.status === 401) return fail('LOGIN_REQUIRED');
      if (data?.status === 'NOT_AGREED') return setPhase('needs-agree');
      if (data?.status !== 'OK') return fail(data?.status || 'SERVER_ERROR');
      setPhase('connecting');
      connect();
    })();

    // 何もしなくても切られないように（サーバーは 15 分何もしない人を切る。ping は「何かした」に数えない）
    const ping = setInterval(() => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 'ping' }));
    }, 30_000);

    return () => {
      stopped = true;
      clearInterval(ping);
      if (retryTimer) clearTimeout(retryTimer);
      if (moveTimer.current) clearTimeout(moveTimer.current);
      moveTimer.current = null;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [active, placeId, attempt, onMessage]);

  const send = useCallback((msg: unknown) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  /** 自分の位置（送りすぎないよう、0.2 秒に 1 回まで） */
  const sendMove = useCallback(
    (p: { x: number; y: number }) => {
      pendingMove.current = p;
      if (moveTimer.current) return;
      moveTimer.current = setTimeout(() => {
        moveTimer.current = null;
        const next = pendingMove.current;
        pendingMove.current = null;
        if (next) send({ t: 'move', x: next.x, y: next.y });
      }, MOVE_SEND_MS);
    },
    [send]
  );

  /** 決まりに同意する */
  const agree = useCallback(async () => {
    const res = await yamatoFetch(`${YAMATO_API_BASE}/api/world/plaza/agree`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: PLAZA_RULES_VERSION }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { status?: string; message?: string } | undefined;
    if (data?.status === 'OK') {
      setAttempt((n) => n + 1); // もう一度確かめて、つなぐ
      return null;
    }
    if (data?.status && PLAZA_CLOSED_MESSAGES[data.status]) {
      setClosedCode(data.status);
      setPhase('closed');
      return null;
    }
    return data?.message || 'Something went wrong. Please try again.';
  }, []);

  return {
    phase,
    closedCode,
    me,
    others,
    bubbles,
    phrases,
    stamps,
    notice,
    clearNotice: () => setNotice(null),
    retry: () => setAttempt((n) => n + 1),
    agree,
    sendMove,
    say: (i: number) => send({ t: 'say', i }),
    stamp: (i: number) => send({ t: 'stamp', i }),
    setAvatar: (i: number) => send({ t: 'avatar', i }),
    setTalking: (on: boolean) => send({ t: 'talking', on }),
    block: (pid: string) => send({ t: 'block', pid }),
    report: (pid: string, reason: 'spam' | 'following' | 'unkind' | 'other') => send({ t: 'report', pid, reason }),
  };
}
