/**
 * @file games.tsx
 * @description 日本語学習ゲーム一覧ページ
 * 💡 Supabase GAMES_CONTENT 動的取得・フォールバック廃止・ToolPageWrapper 統合型対応版
 */

import React from 'react';
import { useNavigate, useRouteLoaderData } from '@remix-run/react';
import { Gamepad2, Sparkles, Trophy, Flame, ArrowRight, Zap, Target } from 'lucide-react';
import { ToolPageWrapper } from '../components/ToolPageWrapper';
import { supabase } from '../lib/supabaseClient';
import { useGamesContent, GameItem } from '../data/games-content';

export default function GamesPage() {
  const navigate = useNavigate();

  const rootData = useRouteLoaderData("root") as {
    user?: any;
    credits?: number;
    nickname?: string;
  } | undefined;

  const { gamesData, isLoading, isError, errorMessage, refetch } = useGamesContent(supabase);

  const renderGameIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Gamepad2': return <Gamepad2 className="w-6 h-6" />;
      case 'Trophy': return <Trophy className="w-6 h-6" />;
      case 'Flame': return <Flame className="w-6 h-6" />;
      case 'Zap': return <Zap className="w-6 h-6" />;
      case 'Target': return <Target className="w-6 h-6" />;
      default: return <Sparkles className="w-6 h-6" />;
    }
  };

  return (
    <ToolPageWrapper
      breadcrumbTitle="Learning Games"
      hasError={isError || (!isLoading && !gamesData)}
      errorTitle="データの読み込みエラー"
      errorMessage={errorMessage || 'Supabase から GAMES_CONTENT の取得に失敗しました。'}
      onRetry={refetch}
    >
      {gamesData && (
        <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto space-y-12">
            {/* 1. Header Section */}
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 text-xs font-bold uppercase tracking-wider">
                <Gamepad2 className="w-4 h-4" />
                <span>AI Yamato Arcade</span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
                {gamesData.title}
              </h1>
              <p className="text-base text-slate-600 leading-relaxed">
                {gamesData.subtitle}
              </p>
            </div>

            {/* 2. Sections & Game Cards */}
            {gamesData.sections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-6">
                <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{section.title}</h2>
                    {section.subtitle && (
                      <p className="text-xs text-slate-500 mt-1">{section.subtitle}</p>
                    )}
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    {section.games.length} Games
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {section.games.map((game: GameItem) => (
                    <div
                      key={game.id}
                      onClick={() => {
                        if (!game.isComingSoon) {
                          navigate(game.path);
                        }
                      }}
                      className={`p-6 rounded-3xl border bg-white shadow-sm transition-all duration-200 flex flex-col justify-between ${
                        game.isComingSoon
                          ? 'opacity-75 cursor-not-allowed border-slate-200'
                          : 'hover:shadow-md hover:border-purple-400 cursor-pointer border-slate-200'
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-inner">
                            {renderGameIcon(game.iconName)}
                          </div>
                          {game.badge && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              {game.badge}
                            </span>
                          )}
                          {game.isComingSoon && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                              Coming Soon
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-slate-900 mb-1">{game.name}</h3>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {game.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">{game.category || 'Arcade'}</span>
                        {!game.isComingSoon ? (
                          <button
                            type="button"
                            className="text-purple-600 font-bold flex items-center space-x-1 hover:underline cursor-pointer"
                          >
                            <span>{game.actionLabel || 'Play Now'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-slate-400 font-medium">Coming Soon</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ToolPageWrapper>
  );
}