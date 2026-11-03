/**
 * @file games.tsx
 * @description ゲーム総合ポータルページ（Supabase GAME_CONTENT 100%動的連動・ToolPageWrapper 統合型データエラーガード対応版）
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from '@remix-run/react';
import { ToolPageWrapper } from '../components/ToolPageWrapper';
import type { PageLayoutRef } from '../components/PageLayout';
import { generateModuleMeta } from '../utils/seoMeta';
import { fetchGamesContentData, GamesContentData } from '../data/games-content';
import { supabase } from '../lib/supabaseClient';
import { ArrowRight, Gamepad2, Loader2 } from 'lucide-react';

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

export default function GamesPortal() {
  const layoutRef = useRef<PageLayoutRef>(null);
  const navigate = useNavigate();

  const [gamesData, setGamesData] = useState<GamesContentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await fetchGamesContentData(supabase);
      if (result.data && !result.isError) {
        setGamesData(result.data);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <ToolPageWrapper layoutRef={layoutRef} breadcrumbTitle="Japanese Learning Arcade">
      <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-12">
          
          {/* ヘッダーセクション */}
          <header className="text-center space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20">
              <Gamepad2 className="w-4 h-4" />
              <span>Interactive Learning</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              {gamesData?.header.title || "Japanese Learning Arcade"}
            </h1>
            <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
              {gamesData?.header.subtitle || "Have fun mastering Hiragana, Katakana, and typing skills through interactive games!"}
            </p>
          </header>

          {/* ローディング・エラー状態のハンドリング */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-xs text-slate-400">Loading games arcade...</p>
            </div>
          ) : error || !gamesData ? (
            <div className="p-8 bg-rose-950/30 border border-rose-800/50 rounded-2xl text-center space-y-4">
              <p className="text-sm text-rose-300 font-semibold">Failed to load arcade games data from Supabase.</p>
              <button
                onClick={loadData}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
              >
                Retry
              </button>
            </div>
          ) : (
            /* ゲームカード一覧グリッド */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {gamesData.games.map((game) => (
                <div
                  key={game.id}
                  onClick={() => !game.isComingSoon && navigate(game.path)}
                  className={`p-6 sm:p-8 rounded-3xl border flex flex-col justify-between transition-all duration-300 ${
                    game.isComingSoon
                      ? 'opacity-75 cursor-not-allowed bg-slate-900/50 border-slate-800'
                      : 'bg-slate-900 border-slate-800 hover:border-indigo-500/60 hover:shadow-xl hover:shadow-indigo-500/5 cursor-pointer group'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-4xl p-3 rounded-2xl bg-slate-800/80 border border-slate-700/50 inline-block shadow-inner">
                        {game.icon}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {game.badge}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">
                        {game.category}
                      </span>
                      <h2 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {game.name}
                      </h2>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      {game.description}
                    </p>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-500">Arcade Module</span>
                    {!game.isComingSoon ? (
                      <span className="text-indigo-400 group-hover:text-indigo-300 flex items-center space-x-1 transition-transform group-hover:translate-x-1">
                        <span>Play Game</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="text-slate-500">Coming Soon</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </ToolPageWrapper>
  );
}