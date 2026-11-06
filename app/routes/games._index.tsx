/**
 * @file app/routes/games/_index.tsx
 * @description Japanese Learning Arcade のハブページ（useGamesContent & ToolPageWrapper 統合版）
 */

import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React from 'react';
import { Link, useLoaderData } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/ToolPageWrapper';
import { generateModuleMeta } from '~/utils/seoMeta';
import { useGamesContent } from '~/data/content-games';
import { supabase } from '~/lib/supabaseClient';
import { Brain, Gamepad2, Compass, Target, Swords, Sparkles, Grid } from 'lucide-react';

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

// Helper function to render dynamic icons based on iconName string
function renderGameIcon(iconName?: string) {
  switch (iconName) {
    case 'Brain':
      return <Brain className="w-5 h-5 text-indigo-600" />;
    case 'Gamepad2':
      return <Gamepad2 className="w-5 h-5 text-indigo-600" />;
    case 'Compass':
      return <Compass className="w-5 h-5 text-indigo-600" />;
    case 'Target':
      return <Target className="w-5 h-5 text-indigo-600" />;
    case 'Swords':
      return <Swords className="w-5 h-5 text-indigo-600" />;
    case 'Sparkles':
      return <Sparkles className="w-5 h-5 text-indigo-600" />;
    case 'Grid':
      return <Grid className="w-5 h-5 text-indigo-600" />;
    default:
      return <Gamepad2 className="w-5 h-5 text-indigo-600" />;
  }
}

export default function GamesHubIndex() {
  // ご提示いただいたカスタムフックを利用して Supabase からデータを安全に取得
  const { gamesData, isLoading, isError, errorMessage, refetch } = useGamesContent(supabase);

  return (
    <ToolPageWrapper 
      breadcrumbTitle="Japanese Learning Arcade"
      hasError={isError}
      errorTitle="Failed to Load Games"
      errorMessage={errorMessage || "Could not retrieve arcade games content. Please check your connection and try again."}
      onRetry={refetch}
    >
      <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* ローディング中の表示（オプションでスケルトンやシンプル表示に切り替え可能） */}
          {isLoading && !gamesData ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-4"></div>
              <p className="text-slate-600 font-medium">Loading arcade games...</p>
            </div>
          ) : (
            <>
              {/* ヘッダーセクション */}
              <div className="text-center mb-12">
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl mb-4">
                  {gamesData?.title || "Japanese Learning Arcade"}
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                  {gamesData?.subtitle || "Have fun mastering Hiragana, Katakana, and cognitive skills through interactive games!"}
                </p>
              </div>

              {/* セクションおよびゲームカード一覧 */}
              {gamesData?.sections.map((section, sIdx) => (
                <div key={sIdx} className="mb-12">
                  <div className="mb-6 border-b border-slate-200 pb-3">
                    <h2 className="text-2xl font-bold text-slate-900">{section.title}</h2>
                    {section.subtitle && (
                      <p className="text-sm text-slate-500 mt-1">{section.subtitle}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {section.games.map((game) => (
                      <div 
                        key={game.id} 
                        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                              {renderGameIcon(game.iconName)}
                              {game.category && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                  {game.category}
                                </span>
                              )}
                            </div>
                            {game.badge && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                                {game.badge}
                              </span>
                            )}
                          </div>
                          
                          <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                            {game.name}
                          </h3>
                          
                          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                            {game.description}
                          </p>
                        </div>

                        <div>
                          {game.isComingSoon ? (
                            <span className="inline-block w-full text-center py-2.5 px-4 bg-slate-100 text-slate-400 font-medium rounded-xl cursor-not-allowed">
                              Coming Soon
                            </span>
                          ) : (
                            <Link
                              to={game.path}
                              className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors shadow-sm"
                            >
                              {game.actionLabel || "Play Now"}
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </ToolPageWrapper>
  );
}

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta((data as any)?.portalContent || null, (data as any)?.currentPath || "");
};