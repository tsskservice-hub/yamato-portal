/**
 * @file PortalModulesGrid.tsx
 * @description Supabase の各 content モジュール（General, Speaking, Writing, Reference, Lessons, Junior）および Games を統合して描画するグリッドコンポーネント
 */
import React from 'react';
import { ArrowRight, BookOpen, FileText, Gamepad2, Grid, Mic, Sparkles } from 'lucide-react';
import type { PortalModule } from '~/data/content-other';

interface PortalModulesGridProps {
  generalModules: PortalModule[];
  speakingModules: PortalModule[];
  writingModules: PortalModule[];
  referenceModules: PortalModule[];
  juniorModules: PortalModule[];
  gamesData?: any;
  isDarkMode: boolean;
  onSelectModule: (mod: PortalModule) => Promise<void> | void;
  onNavigateGames: () => void;
}

export function PortalModulesGrid({
  generalModules,
  speakingModules,
  writingModules,
  referenceModules,
  juniorModules,
  gamesData,
  isDarkMode,
  onSelectModule,
  onNavigateGames,
}: PortalModulesGridProps) {

  const renderModuleIcon = (iconName: string, className: string) => {
    switch (iconName) {
      case "Grid": return <Grid className={className} />;
      case "Sparkles": return <Sparkles className={className} />;
      case "Mic": return <Mic className={className} />;
      case "FileText": return <FileText className={className} />;
      case "Gamepad2": return <Gamepad2 className={className} />;
      case "BookOpen": return <BookOpen className={className} />;
      default: return <FileText className={className} />;
    }
  };

  const renderCard = (mod: PortalModule, accentColor: string = 'blue') => {
    const hoverBorderClass = accentColor === 'red' ? 'hover:border-red-500/50' : 
                            accentColor === 'indigo' ? 'hover:border-indigo-500/50' : 
                            accentColor === 'emerald' ? 'hover:border-emerald-500/50' : 
                            accentColor === 'orange' ? 'hover:border-orange-500/50' : 
                            'hover:border-blue-500/50';

    const textHoverClass = accentColor === 'red' ? 'group-hover:text-red-500' : 
                           accentColor === 'indigo' ? 'group-hover:text-indigo-500' : 
                           accentColor === 'emerald' ? 'group-hover:text-emerald-500' : 
                           accentColor === 'orange' ? 'group-hover:text-orange-500' : 
                           'group-hover:text-blue-500';

    return (
      <div
        key={mod.id}
        onClick={() => onSelectModule(mod)}
        className={`p-6 rounded-3xl border flex flex-col justify-between ${
          mod.isComingSoon
            ? 'opacity-75 cursor-not-allowed'
            : `${hoverBorderClass} cursor-pointer group`
        } ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm transition-colors`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className={`w-10 h-10 rounded-xl bg-${accentColor}-500/10 text-${accentColor}-600 flex items-center justify-center`}>
              {renderModuleIcon(mod.iconName, "w-5 h-5")}
            </div>
            {mod.isComingSoon && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-500/10 text-slate-500">
                Coming Soon
              </span>
            )}
          </div>
          <h4 className={`font-bold text-base ${textHoverClass} transition-colors`}>
            {mod.name}
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed">{mod.description}</p>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">{mod.category}</span>
          {!mod.isComingSoon ? (
            <span className={`text-${accentColor}-600 font-bold flex items-center space-x-1 group-hover:translate-x-1 transition-transform`}>
              <span>{mod.actionLabel}</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          ) : (
            <span className="text-slate-400 font-medium">Coming Soon</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="space-y-12">
      {/* ページ全体のヘッダー */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-extrabold tracking-tight">Portal Pages & Modules</h2>
        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Direct access to all specialized exam prep modules, tools, and learning spaces.
        </p>
      </div>

      {/* VCE セクション全体のラッパー */}
      <div id="section-vce" className="space-y-8 pt-6">
        <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <span className="text-xl">🇦🇺🐨🦘</span>
          <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-200">
            Victorian Curriculum & VCE Students (Australia)
          </h3>
        </div>

        {/* 2. VCE Speaking (CONTENT_VCE_SPEAKING) */}
        {speakingModules.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm font-bold text-red-600 dark:text-red-400">
              <span>🗣️</span>
              <h4>VCE Speaking</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {speakingModules.map((mod) => renderCard(mod, 'red'))}
            </div>
          </div>
        )}

        {/* 3. VCE Writing (CONTENT_VCE_WRITING) */}
        {writingModules.length > 0 && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center space-x-2 text-sm font-bold text-red-600 dark:text-red-400">
              <span>✍️</span>
              <h4>VCE Writing</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {writingModules.map((mod) => renderCard(mod, 'red'))}
            </div>
          </div>
        )}

        {/* 4. VCE References & Guides (CONTENT_REFERENCE) - 語彙リストカードが Supabase から読み込まれてここに自動展開されます */}
        {referenceModules.length > 0 && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center space-x-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
              <span>📚</span>
              <h4>VCE Writing References & Guides</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {referenceModules.map((mod) => renderCard(mod, 'emerald'))}
            </div>
          </div>
        )}

        {/* 🌟 4.5. Lessons & Interactive Units (lessons._index.tsxへの誘導カード) */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center space-x-2 text-sm font-bold text-orange-600 dark:text-orange-400">
            <span>🍱</span>
            <h4>Japanese Lessons & Textbook Hub</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {renderCard(
              {
                id: 'lessons-hub',
                name: 'Textbook Lessons & Units',
                description: 'Explore interactive lessons such as Obento Deluxe Unit 4 (Family & Pets), vocabulary lists, and AI Yamato sensei guidance.',
                path: '/lessons',
                category: 'Curriculum Hub',
                iconName: 'BookOpen',
                actionLabel: 'Explore Lessons',
                isComingSoon: false,
                creditRequirement: null,
                accentColor: 'orange',
              },
              'orange'
            )}
          </div>
        </div>

        {/* 5. Years 7–10 Japanese (CONTENT_JUNIOR) */}
        {juniorModules.length > 0 && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center space-x-2 text-sm font-bold text-indigo-600 dark:text-indigo-400">
              <span>📖</span>
              <h4>Years 7–10 Japanese</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {juniorModules.map((mod) => renderCard(mod, 'indigo'))}
            </div>
          </div>
        )}

        {/* 6. 🎮 ゲームズ・アーケード総合ポータル誘導カード */}
        <div className="space-y-4 pt-6">
          <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <span className="text-xl">🎮</span>
            <h4 className="font-extrabold text-base text-red-600 dark:text-red-400">
              Interactive Learning Arcade & Games
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {renderCard(
              {
                id: 'games-arcade',
                name: gamesData?.subtitle || 'Japanese Learning Arcade',
                description: 'Have fun mastering Hiragana, Katakana, and Romaji through interactive games like the Shawshank Tunnel Escape and Typing Defense battles!',
                path: '/games',
                category: 'Arcade Portal',
                iconName: 'Gamepad2',
                actionLabel: 'View Arcade',
                isComingSoon: false,
                creditRequirement: null,
                accentColor: 'red',
              },
              'red'
            )}
          </div>
        </div>

      </div>

      {/* 1. 一般セクション (CONTENT_GENERAL) - ゲームズ・アーケードの下に移動 */}
      {generalModules.length > 0 && (
        <div className="space-y-4 pt-6">
          <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <span className="text-xl">🌍</span>
            <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-200">
              Global & General Japanese Learners
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {generalModules.map((mod) => renderCard(mod, 'blue'))}
          </div>
        </div>
      )}
    </section>
  );
}