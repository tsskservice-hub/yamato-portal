/**
 * @file app/routes/games/_index.tsx
 * @description ゲーム一覧（Japanese Learning Arcade）
 *
 * - 一覧の内容（kl_app の CONTENT_GAMES）は loader で読み込むので、開いた瞬間から表示される。
 * - ゲームのロックは、学校契約のクラスで先生が授業中に使う「クラスコントロール」の機能。
 *   そのため、ロックに関する表示は関係のある人にだけ出す：
 *     - クラスの生徒で、先生がロック中 … 案内を出し、各ゲームのボタンを押せなくする
 *     - 先生 … 自分のクラスのロック状況と、教師ダッシュボードへのリンクを出す
 *     - それ以外（個人の学習者など）… ロックについては何も出さない
 *   状況は 30 秒ごとに確認し直すので、先生がロック／解除すると開いたままの一覧にも反映される。
 */

import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React from 'react';
import { Link, useLoaderData, useRevalidator } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import { generateModuleMeta } from '~/utils/seoMeta';
import { fetchGamesContentData } from '~/data/content-games';
import { useGameAccess } from '~/components/games/useGameAccess';
import { supabase } from '~/lib/supabaseClient';
import { Brain, Gamepad2, Compass, Target, Swords, Sparkles, Grid, Lock, LockOpen, ShieldCheck } from 'lucide-react';

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

  // 一覧の内容もここで読み込む（以前はブラウザで読み込んでいたので、毎回まずスピナーが出ていた）
  const fetched = await fetchGamesContentData(supabase);
  const gamesData = fetched && fetched.sections.length > 0 ? fetched : null;

  return json({
    portalContent,
    currentPath: url.pathname,
    gamesData,
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
  const { gamesData } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const { state: access } = useGameAccess({ hub: true });

  // 先生がロック中のクラスの生徒だけ true。確認中・エラー・ログインしていない時は、ロックの表示を出さない
  // （各ゲームのページでもう一度サーバーが確認するので、ここは案内のための表示）。
  const lockedClassName = access.status === 'locked' ? access.className : null;
  const isLocked = access.status === 'locked';
  const teacher = access.status === 'allowed' ? access.teacher : null;

  return (
    <ToolPageWrapper 
      breadcrumbTitle="Japanese Learning Arcade"
      hasError={!gamesData}
      errorTitle="Failed to Load Games"
      errorMessage="Could not retrieve arcade games content. Please check your connection and try again."
      onRetry={() => revalidator.revalidate()}
    >
      <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {gamesData && (
            <>
              {/* Header Section */}
              <div className="text-center mb-12">
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl mb-4">
                  {gamesData?.title || "Japanese Learning Arcade"}
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                  {gamesData?.subtitle || "Have fun mastering Hiragana, Katakana, and cognitive skills through interactive games!"}
                </p>
              </div>

              {/* クラスの生徒：先生がゲームをロックしている間の案内 */}
              {isLocked && (
                <div role="status" className="mb-10 flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-white">
                    <Lock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-amber-900">Games are locked right now</h2>
                    <p className="mt-1 text-sm leading-relaxed text-amber-900/90">
                      Your teacher has locked games{lockedClassName ? <> for <strong>{lockedClassName}</strong></> : null}. Please listen to
                      your teacher. The games will open by themselves when your teacher unlocks them.
                    </p>
                  </div>
                </div>
              )}

              {/* 先生：自分のクラスのロック状況（クラスコントロール） */}
              {teacher && (
                <div className="mb-10 flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50">
                    {teacher.lockedCount > 0 ? <Lock className="h-5 w-5 text-indigo-600" /> : <LockOpen className="h-5 w-5 text-indigo-600" />}
                  </div>
                  <div className="flex-1">
                    <h2 className="flex items-center gap-1.5 text-base font-bold text-slate-900">
                      <ShieldCheck className="h-4 w-4 text-indigo-600" /> Class control
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      {teacher.lockedCount === 0
                        ? teacher.classCount === 1
                          ? 'Games are open for your class.'
                          : `Games are open for all ${teacher.classCount} of your classes.`
                        : teacher.classCount === 1
                          ? 'Games are locked for your class.'
                          : `Games are locked for ${teacher.lockedCount} of your ${teacher.classCount} classes.`}{' '}
                      You can lock games during a lesson so students listen, and unlock them for the whole class or for one student.
                      Your own account can always play.
                    </p>
                  </div>
                  <Link
                    to="/teacher-dashboard"
                    className="inline-flex shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition-colors hover:bg-indigo-100"
                  >
                    Open Teacher Dashboard
                  </Link>
                </div>
              )}

              {/* Sections and Game Card Listings */}
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
                        <div>
                            {renderGameIcon(game.iconName)}
                            {game.category && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 ml-2">
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
                      ) : isLocked ? (
                        <span
                          aria-disabled="true"
                          className="inline-flex items-center justify-center gap-1.5 w-full text-center py-2.5 px-4 bg-amber-50 border border-amber-200 text-amber-800 font-medium rounded-xl cursor-not-allowed"
                        >
                          <Lock className="w-4 h-4" /> Locked by your teacher
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

              {access.status === 'login' && (
                <p className="text-center text-sm text-slate-500">
                  You need to log in to play. Games are free with an AI Yamato account.
                </p>
              )}
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