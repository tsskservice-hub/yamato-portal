/**
 * @file tdbd-passcode-card.tsx
 * @description 本日の時限パスコード設定・更新カード
 */
import React from 'react';

type TdbdPasscodeCardProps = {
  passcode: string;
  onRefresh: () => void;
};

export default function TdbdPasscodeCard({
  passcode,
  onRefresh,
}: TdbdPasscodeCardProps) {
  return (
    <div className="bg-white border border-slate-200 p-5 rounded-xl flex items-center justify-between shadow-sm">
      <div>
        <h2 className="font-bold text-slate-800 text-base">本日の時限パスコード</h2>
        <p className="text-xs text-slate-500 mt-0.5">生徒が自力で入力して解除するためのコードです。</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="bg-slate-100 text-rose-600 font-mono text-xl font-bold px-4 py-1.5 rounded-lg border border-slate-300 tracking-widest">
          {passcode}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="bg-slate-100 hover:bg-slate-200 text-xs font-bold px-3.5 py-2.5 rounded-lg text-slate-700 cursor-pointer transition border border-slate-200"
        >
          🔄 更新
        </button>
      </div>
    </div>
  );
}