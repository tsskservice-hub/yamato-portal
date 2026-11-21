/**
 * @file useSchoolAccountRedirect.ts
 * @description 学校のアカウント（先生・クラスの生徒・クラスに申請中の人）が Yamato Town（/world）を開いたら、
 *   Speaking Tasks（ほかの人が見えない入口）へ自動で移す。2026-11-21 に決定（SNS を心配する保護者・学校への対策）
 *
 *   判定はサーバー（api の /api/world/plaza/status。plaza-rules.ts の isSchoolAccount）。ログインしていない人はそのまま見せる。
 *   判定が終わるまでは 'checking' を返す（その間は町を見せない）
 */
import { useEffect, useState } from 'react';
import { useNavigate } from '@remix-run/react';
import { YAMATO_API_BASE, yamatoFetch } from '~/lib/yamatoApi';
import { supabase } from '~/lib/supabaseClient';

export function useSchoolAccountRedirect(target: string): 'checking' | 'ok' {
  const navigate = useNavigate();
  const [state, setState] = useState<'checking' | 'ok'>('checking');

  useEffect(() => {
    let stopped = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!stopped) setState('ok');
        return;
      }
      const res = await yamatoFetch(`${YAMATO_API_BASE}/api/world/plaza/status`).catch(() => null);
      const data = (await res?.json().catch(() => ({}))) as { status?: string } | undefined;
      if (stopped) return;
      if (data?.status === 'SCHOOL_ACCOUNT') navigate(target, { replace: true });
      else setState('ok');
    })();
    return () => {
      stopped = true;
    };
  }, [navigate, target]);

  return state;
}
