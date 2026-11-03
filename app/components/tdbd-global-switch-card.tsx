/**
 * @file tdbd-global-switch-card.tsx
 * @description クラス全体の一斉解放スイッチカード
 */
import React from 'react';

type TdbdGlobalSwitchCardProps = {
  isGlobalUnlocked: boolean;
  onToggle: () => void;
};

export default function TdbdGlobalSwitchCard({
  isGlobalUnlocked,
  onToggle,
}: TdbdGlobalSwitchCardProps) {
  return (
    <div className="bg-white border border-slate-200 p-5 rounded-xl flex items-center justify-between shadow-sm">
      <div>
        <h2 className="font-bold text-slate-800 text-base">クラス全体の一斉解放スイッチ</h2>
        <p className="text-xs text-slate-500 mt-0.5">ONにすると、全員のゲームが一斉に解放されます。</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors cursor-pointer ${
          isGlobalUnlocked ? 'bg-emerald-500' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
            isGlobalUnlocked ? 'translate-x-8' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}