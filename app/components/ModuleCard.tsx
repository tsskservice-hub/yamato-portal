/**
 * @file ModuleCard.tsx
 * @description ポータルページのモジュールカード共通コンポーネント
 */
import React from 'react';
import { Gamepad2, Grid, Mic, FileText, Sparkles, ArrowRight } from 'lucide-react';
import { ModuleItem } from '../data/lp-card-modules';

interface ModuleCardProps {
  module: ModuleItem;
  isDarkMode: boolean;
  onActionClick?: (module: ModuleItem) => void;
}

export function ModuleCard({ module, isDarkMode, onActionClick }: ModuleCardProps) {
  // アイコン名の文字列から対応するLucideアイコンコンポーネントを解決
  const renderIcon = (iconName: ModuleItem['iconName']) => {
    switch (iconName) {
      case 'Gamepad2':
        return <Gamepad2 className="w-5 h-5" />;
      case 'Grid':
        return <Grid className="w-5 h-5" />;
      case 'Mic':
        return <Mic className="w-5 h-5" />;
      case 'FileText':
        return <FileText className="w-5 h-5" />;
      case 'Sparkles':
        return <Sparkles className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const cardBaseStyle = `p-6 rounded-3xl border flex flex-col justify-between shadow-sm transition-colors ${
    isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
  }`;

  const opacityStyle = module.isComingSoon ? 'opacity-75' : module.borderHoverColor;

  return (
    <div className={`${cardBaseStyle} ${opacityStyle}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className={`w-10 h-10 rounded-xl ${module.iconBgColor} ${module.iconTextColor} flex items-center justify-center`}>
            {renderIcon(module.iconName)}
          </div>
          {module.isComingSoon && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-500/10 text-slate-500">
              Coming Soon
            </span>
          )}
        </div>
        <h4 className="font-bold text-base">{module.title}</h4>
        <p className="text-xs text-slate-500 leading-relaxed">{module.description}</p>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-500/10 flex items-center justify-between text-xs">
        <span className={module.isComingSoon ? 'text-slate-400 font-medium' : `${module.iconTextColor} font-medium`}>
          {module.badge || 'Module'}
        </span>

        {module.isComingSoon ? (
          <span className="text-slate-400 font-medium cursor-not-allowed">Coming Soon</span>
        ) : (
          <button
            type="button"
            onClick={() => onActionClick && onActionClick(module)}
            className={`${module.iconTextColor} font-bold flex items-center space-x-1 hover:underline cursor-pointer`}
          >
            <span>{module.actionText || 'Open'}</span> <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}