import React from "react";

type ChatOption = {
  label: string;
  value: string;
};

type YCC2ChatOptionButtonsProps = {
  options?: ChatOption[];
  isLoading: boolean;
  onSelect: (value: string, label: string) => void;
};

export function YCC2ChatOptionButtons({
  options,
  isLoading,
  onSelect,
}: YCC2ChatOptionButtonsProps) {
  if (!options || options.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
        Please choose an option:
      </p>
      <div className="flex flex-col gap-2">
        {options.map((opt, optIdx) => (
          <button
            key={optIdx}
            type="button"
            disabled={isLoading}
            onClick={() => onSelect(opt.value, opt.label)}
            className="text-left px-4 py-3 rounded-xl bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-500 hover:text-white text-slate-800 dark:text-slate-200 text-xs font-bold transition border border-orange-200 dark:border-orange-900/60 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}