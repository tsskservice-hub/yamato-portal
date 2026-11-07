import React from "react";
import { themeStyles, type ThemeColorKey } from "../../styles/chatThemes";

export type YCC2ChatHeaderControlsProps = {
  characterName: string;
  activeUserId?: string;
  currentCredits: number;
  tutorLevel: "steady" | "normal" | "accelerated";
  chatFontSize: "sm" | "base" | "lg" | "xl";
  themeColor: string;
  onPaceChange: (level: "steady" | "normal" | "accelerated") => void;
  onFontSizeChange: (size: "sm" | "base" | "lg" | "xl") => void;
};

export function YCC2ChatHeaderControls({
  characterName,
  activeUserId,
  currentCredits,
  tutorLevel,
  chatFontSize,
  themeColor,
  onPaceChange,
  onFontSizeChange,
}: YCC2ChatHeaderControlsProps) {
  const isHexColor = themeColor.startsWith("#");
  const currentTheme =
    !isHexColor && themeStyles[themeColor as ThemeColorKey]
      ? themeStyles[themeColor as ThemeColorKey]
      : themeStyles.orange;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4 gap-4 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 flex items-center justify-center text-2xl font-black shadow-inner">
          👩‍🏫
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>{characterName}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 font-bold">
              Live Lesson Room
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Your primary Japanese teacher guiding you step by step.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
        {/* Credit Balance */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 flex items-center gap-2">
          <span className="text-xs font-bold text-amber-800">Credits:</span>
          {activeUserId ? (
            <span className="text-xs font-bold text-amber-900">🪙 {currentCredits}</span>
          ) : (
            <span className="text-xs font-bold text-slate-500">🔒 Guest</span>
          )}
        </div>

        {/* 学習ペース選択 */}
        <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 flex items-center">
          {(["steady", "normal", "accelerated"] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => onPaceChange(level)}
              style={
                tutorLevel === level && isHexColor
                  ? { backgroundColor: themeColor, color: "#ffffff" }
                  : undefined
              }
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition ${
                tutorLevel === level
                  ? currentTheme.buttonActive
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* フォントサイズ */}
        <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 flex items-center">
          {(
            [
              { key: "sm", label: "小" },
              { key: "base", label: "中" },
              { key: "lg", label: "大" },
              { key: "xl", label: "特大" },
            ] as const
          ).map((size) => (
            <button
              key={size.key}
              type="button"
              onClick={() => onFontSizeChange(size.key)}
              style={
                chatFontSize === size.key && isHexColor
                  ? { backgroundColor: themeColor, color: "#ffffff" }
                  : undefined
              }
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                chatFontSize === size.key
                  ? currentTheme.buttonActive
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              {size.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}