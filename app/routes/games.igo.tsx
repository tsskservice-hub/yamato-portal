/**
 * @file igo.tsx
 * @description 9路 囲碁対局ページ（iframeによる9by9go.html埋め込み対応版）
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/ToolPageWrapper';
import { type PageLayoutRef } from '~/components/PageLayout';
import { generateModuleMeta } from '~/utils/seoMeta';
import { supabase } from '~/lib/supabaseClient';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  let portalContent = null;
  try {
    const { data: portalData } = await supabase
      .from('portal_settings')
      .select('content')
      .eq('key', 'PORTAL_CONTENT')
      .single();
    portalContent = portalData?.content || null;
  } catch (e) {}

  return json({
    portalContent,
    currentPath: url.pathname,
  });
}

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta(data?.portalContent || null, data?.currentPath || '');
};

function IgoFrameView({ userId, credits }: { userId: string | null; credits: number | null }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center">
        <div className="flex items-center space-x-2 mb-2">
          <h2 className="text-xl font-bold">ミニ5路 囲碁（5x5 Go Board）</h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold">
            ⚔️ 囲碁対局アリーナ
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 font-medium text-center">
          やまと先生との囲碁対局をお楽しみください。
        </p>

        {/* 9by9go.html を埋め込むiframe */}
        <div className="w-full max-w-3xl h-[650px] bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border-4 border-amber-800/40">
          <iframe
            src="/games/9by9go.html"
            title="9by9 Go Game"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      </div>
    </div>
  );
}

export default function IgoRoute() {
  const layoutRef = useRef<PageLayoutRef>(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  const [userCredits, setUserCredits] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchUserCredits(userId: string) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("credits")
          .eq("id", userId)
          .single();
        if (!error && data && isMounted) {
          setUserCredits(data.credits);
        }
      } catch (err) {
        console.error("Error fetching user credits:", err);
      }
    }

    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          setUser(session.user);
          await fetchUserCredits(session.user.id);
        }
      } catch (err) {
        console.error("Session check error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchUserCredits(session.user.id);
      } else {
        setUser(null);
        setUserCredits(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return (
      <ToolPageWrapper layoutRef={layoutRef}>
        <div className="flex justify-center items-center h-screen bg-[#f4f1ea] font-sans">
          <h3 className="text-xl font-semibold text-slate-700 animate-pulse">
            Loading 5x5 Go Board... ♟️
          </h3>
        </div>
      </ToolPageWrapper>
    );
  }

  return (
    <ToolPageWrapper layoutRef={layoutRef}>
      <div className="min-h-screen bg-[#f4f1ea] dark:bg-slate-950 pb-16">
        <main className="max-w-4xl mx-auto px-4 pt-8">
          {userCredits !== null && (
            <div className="mb-4 flex justify-end">
              <span className="text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 px-3 py-1.5 rounded-full font-bold shadow-xs flex items-center space-x-1.5">
                <span>💎 Credits:</span>
                <span>{userCredits}</span>
              </span>
            </div>
          )}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800">
            <IgoFrameView userId={user?.id} credits={userCredits} />
          </div>
        </main>
      </div>
    </ToolPageWrapper>
  );
}