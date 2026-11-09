/**
 * @file kanji-sudoku.tsx
 * @description 漢字数独（Kanji Sudoku）ページ（ワイドレイアウト・iframe埋め込み対応版）
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import { type PageLayoutRef } from '~/components/layout/PageLayout';
import { generateModuleMeta } from '~/utils/seoMeta';
import { supabase } from '~/lib/supabaseClient';
import { Grid } from 'lucide-react';

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

function KanjiSudokuFrameView({ userId }: { userId: string | null }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center">
        <div className="flex items-center space-x-2 mb-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Kanji Sudoku Puzzle</h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold">
            🧩 Puzzle Game
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 font-medium text-center">
          Challenge your kanji reading and logic skills with Kanji Sudoku!
        </p>

        {/* Kanji Sudoku iframe (Wide Layout for Table & Number Pad side-by-side) */}
        <div className="w-full max-w-5xl h-[700px] bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border-4 border-indigo-800/40 p-2">
          <iframe
            src="/games/kanji_sudoku.html"
            title="Kanji Sudoku Puzzle"
            className="w-full h-full border-0 rounded-xl"
            sandbox="allow-scripts allow-same-origin allow-forms"
            allowFullScreen
            allow="fullscreen"
          />
        </div>
      </div>
    </div>
  );
}

export default function KanjiSudokuRoute() {
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
            Loading Kanji Sudoku... 🧩
          </h3>
        </div>
      </ToolPageWrapper>
    );
  }

  return (
    <ToolPageWrapper layoutRef={layoutRef}>
      <div className="min-h-screen bg-[#f4f1ea] dark:bg-slate-950 pb-16">
        {/* Widened max-w-6xl container for spacious layout */}
        <main className="max-w-6xl mx-auto px-4 pt-8">
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800">
            <KanjiSudokuFrameView userId={user?.id} />
          </div>
        </main>
      </div>
    </ToolPageWrapper>
  );
}