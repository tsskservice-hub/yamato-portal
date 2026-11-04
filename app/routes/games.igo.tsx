/**
 * @file igo.tsx
 * @description 9路 囲碁対局ページ（2カラムレイアウト・全英語化・クレジット非表示対応版）
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/ToolPageWrapper';
import { type PageLayoutRef } from '~/components/PageLayout';
import { generateModuleMeta } from '~/utils/seoMeta';
import { supabase } from '~/lib/supabaseClient';
import { Swords, Trophy, Sparkles, Info } from 'lucide-react';

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

function IgoFrameView({ userId }: { userId: string | null }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Go Board iframe (Compact View) */}
      <div className="lg:col-span-7 flex flex-col items-center">
        <div className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border-4 border-amber-800/40 p-2">
          <div className="w-full h-[550px] relative">
            <iframe
              src="/games/9by9go.html"
              title="9by9 Go Game"
              className="w-full h-full border-0 rounded-xl"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        </div>
      </div>

      {/* Right Column: Information, Rules, and Yamato-sensei Guidance */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <span className="p-2 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-xl">
              <Swords className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">9x9 & 5x5 Go Board Arena</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold inline-block mt-1">
                Strategic Board Game
              </span>
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
            Engage in a tactical Go match against Yamato-sensei! Test your strategic thinking, surround territory, and capture opponent stones on the grid.
          </p>

          <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-5">
            <div className="flex items-start space-x-3">
              <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">How to Play</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Click on the intersections of the board to place your stones. Surround liberties to capture enemy groups.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Trophy className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Yamato-sensei's Tip</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Keep an eye on eye spaces and stay connected to avoid being surrounded. Good luck!
                </p>
              </div>
            </div>
          </div>
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

  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          setUser(session.user);
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
      } else {
        setUser(null);
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
            Loading Go Board Arena... ♟️
          </h3>
        </div>
      </ToolPageWrapper>
    );
  }

  return (
    <ToolPageWrapper layoutRef={layoutRef}>
      <div className="min-h-screen bg-[#f4f1ea] dark:bg-slate-950 pb-16">
        <main className="max-w-6xl mx-auto px-4 pt-8">
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800">
            <IgoFrameView userId={user?.id} />
          </div>
        </main>
      </div>
    </ToolPageWrapper>
  );
}