/**
 * @file useLiveGameSocket.ts
 * @description クラスのライブゲームの部屋（api の Durable Object）とつなぐ WebSocket
 *
 * つないだら最初に Supabase のアクセストークンを送り、部屋の中で本人を確かめてもらう。
 * 通信が切れたときは自動でつなぎ直す（サーバーが理由つきで閉じたときはつなぎ直さない）。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { YAMATO_API_BASE, getAccessToken } from '~/lib/yamatoApi';

export type SocketStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

export function useLiveGameSocket(gameId: string | null, onMessage: (msg: any) => void) {
  const [status, setStatus] = useState<SocketStatus>('connecting');
  const [closedCode, setClosedCode] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    if (!gameId) return;
    let stopped = false;
    let retries = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = async () => {
      const token = await getAccessToken();
      if (stopped) return;
      if (!token) {
        setClosedCode('LOGIN_REQUIRED');
        setStatus('closed');
        return;
      }
      const url = `${YAMATO_API_BASE.replace(/^http/, 'ws')}/api/live-game/${gameId}/ws`;
      const ws = new WebSocket(url);
      wsRef.current = ws;
      let serverClosed = false;

      ws.onopen = () => {
        retries = 0;
        ws.send(JSON.stringify({ t: 'auth', token }));
        setStatus('open');
      };
      ws.onmessage = (event) => {
        let msg: any;
        try {
          msg = JSON.parse(String(event.data));
        } catch {
          return;
        }
        if (msg?.t === 'closed' || msg?.t === 'cancelled') {
          serverClosed = true;
          setClosedCode(msg.t === 'cancelled' ? 'CANCELLED' : String(msg.code || 'CLOSED'));
        }
        handlerRef.current(msg);
      };
      ws.onclose = (event) => {
        if (wsRef.current === ws) wsRef.current = null;
        if (stopped) return;
        if (serverClosed || event.code === 4000) {
          setStatus('closed');
          return;
        }
        // 通信が切れただけなら、少し待ってつなぎ直す
        retries += 1;
        if (retries > 20) {
          setClosedCode('CONNECTION_LOST');
          setStatus('closed');
          return;
        }
        setStatus('reconnecting');
        retryTimer = setTimeout(connect, Math.min(1000 * retries, 5000));
      };
    };

    setStatus('connecting');
    setClosedCode(null);
    connect();

    return () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [gameId]);

  const send = useCallback((msg: unknown) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  return { status, closedCode, send };
}

/** サーバーの時計とのずれを考えた残り秒数 */
export function useCountdown(endsAt: number, serverOffset: number) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!endsAt) {
      setLeft(0);
      return;
    }
    const tick = () => setLeft(Math.max(0, Math.ceil((endsAt - (Date.now() + serverOffset)) / 1000)));
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [endsAt, serverOffset]);
  return left;
}

export function formatClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const QUESTION_SET_LABELS: Record<string, string> = {
  hiragana: 'Hiragana',
  katakana: 'Katakana',
  kanji: 'VCE Kanji',
};

/** サーバーが部屋を閉じた理由を、生徒・先生に見せる文に */
export const CLOSED_MESSAGES: Record<string, string> = {
  LOGIN_REQUIRED: 'Please log in again to join the game.',
  NOT_IN_CLASS: 'This game is only for students in this class.',
  REMOVED: 'Your teacher removed you from this game.',
  OPENED_ELSEWHERE: 'You opened the game in another tab or device, so this one was closed.',
  GAME_OVER: 'This game has already finished.',
  CANCELLED: 'Your teacher closed this game.',
  NO_GAME: 'This game could not be found.',
  AUTH_TIMEOUT: 'The connection timed out. Please reload the page.',
  CONNECTION_LOST: 'The connection was lost. Please reload the page.',
  SERVER_ERROR: 'Something went wrong on the server. Please reload the page.',
};
