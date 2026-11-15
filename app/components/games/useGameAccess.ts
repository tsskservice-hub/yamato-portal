/**
 * @file useGameAccess.ts
 * @description 「ゲームを遊べるか」をサーバー（/api/game-access）に確認するフック
 *
 * ゲームのロックは、学校契約のクラスで先生が授業中に使う「クラスコントロール」の機能。
 * - クラスに入っている生徒：先生がロックしている間は遊べない（status: 'locked'）
 * - それ以外の人（個人の学習者・先生）：ロックとは関係なく遊べる
 *
 * 30 秒ごと（とタブに戻ったとき、ログイン／ログアウトしたとき）にもう一度確認するので、
 * 先生がロック／ロック解除すると、開いたままのページにもしばらくすると反映される。
 *
 * - ゲームのページ（GameAccessGate）：ticket（iframe のゲームを読み込むための署名）を受け取る
 * - ゲーム一覧（hub: true）：ticket は作らず、代わりに先生には自分のクラスのロック状況（teacher）を返す
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '~/lib/supabaseClient';

const POLL_MS = 30_000;

/** 先生が担任しているクラスの数と、そのうちゲームをロック中のクラスの数 */
export type TeacherLockSummary = { classCount: number; lockedCount: number };

export type GameAccessState =
  | { status: 'checking' }
  | { status: 'login' }
  | { status: 'locked'; className: string }
  | { status: 'allowed'; ticket: string; teacher: TeacherLockSummary | null }
  | { status: 'error' };

function sameTeacher(a: TeacherLockSummary | null, b: TeacherLockSummary | null) {
  return a === b || (!!a && !!b && a.classCount === b.classCount && a.lockedCount === b.lockedCount);
}

function parseTeacher(value: unknown): TeacherLockSummary | null {
  if (!value || typeof value !== 'object') return null;
  const { classCount, lockedCount } = value as Record<string, unknown>;
  if (typeof classCount !== 'number' || typeof lockedCount !== 'number' || classCount <= 0) return null;
  return { classCount, lockedCount };
}

export function useGameAccess(options?: { hub?: boolean }) {
  const hub = options?.hub === true;
  const [state, setState] = useState<GameAccessState>({ status: 'checking' });
  // 遊べる間は最初のチケットを使い続ける（変えると iframe が読み込み直されてゲームが最初からになる）
  const ticketRef = useRef<string | null>(null);

  const check = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        ticketRef.current = null;
        setState((prev) => (prev.status === 'login' ? prev : { status: 'login' }));
        return;
      }
      const res = await fetch(hub ? '/api/game-access?hub=1' : '/api/game-access', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`game-access ${res.status}`);
      const body = (await res.json()) as { status?: string; ticket?: unknown; className?: unknown; teacher?: unknown };

      if (body.status === 'allowed' && (hub || typeof body.ticket === 'string')) {
        if (!ticketRef.current) ticketRef.current = typeof body.ticket === 'string' ? body.ticket : '';
        const ticket = ticketRef.current ?? '';
        const teacher = parseTeacher(body.teacher);
        setState((prev) =>
          prev.status === 'allowed' && prev.ticket === ticket && sameTeacher(prev.teacher, teacher)
            ? prev
            : { status: 'allowed', ticket, teacher }
        );
      } else if (body.status === 'locked') {
        ticketRef.current = null;
        const className = typeof body.className === 'string' ? body.className : '';
        setState((prev) => (prev.status === 'locked' && prev.className === className ? prev : { status: 'locked', className }));
      } else if (body.status === 'login') {
        ticketRef.current = null;
        setState((prev) => (prev.status === 'login' ? prev : { status: 'login' }));
      } else {
        throw new Error('Unexpected game-access response');
      }
    } catch (err) {
      console.error('[useGameAccess] check failed:', err);
      // 一時的な通信エラーでは、今の表示を変えない（最初の確認だけエラーにする）
      setState((prev) => (prev.status === 'checking' ? { status: 'error' } : prev));
    }
  }, [hub]);

  useEffect(() => {
    check();
    const timer = setInterval(() => {
      if (!document.hidden) check();
    }, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) check();
    };
    document.addEventListener('visibilitychange', onVisible);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') check();
    });
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      subscription?.unsubscribe();
    };
  }, [check]);

  /** 「もう一度試す」用：確認中の表示に戻してから確認し直す */
  const retry = useCallback(() => {
    setState({ status: 'checking' });
    check();
  }, [check]);

  return { state, retry };
}
