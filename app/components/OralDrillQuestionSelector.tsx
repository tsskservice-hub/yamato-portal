import React from "react";

export interface OralDrillQuestionSelectorProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  selectedLevel?: "steady" | "normal" | "accelerated";
  onSelectLevel?: (level: "steady" | "normal" | "accelerated") => void;
  mode?: "steady" | "normal" | "accelerated";
  onSelectMode?: (mode: "steady" | "normal" | "accelerated") => void;
  // 💡 追加: 読み上げスピード選択用プロパティ（デフォルト 1）
  selectedSpeed?: number;
  onSelectSpeed?: (speed: number) => void;
  questionsCount?: number;
  themeColor?: string;
}

export const OralDrillQuestionSelector: React.FC<OralDrillQuestionSelectorProps> = ({
  categories,
  selectedCategory = "all", // 第一要件: clear all の状態をデフォルトに
  onSelectCategory,
  selectedLevel,
  onSelectLevel,
  mode = "normal", // 第二要件: normal をデフォルトに
  onSelectMode,
  selectedSpeed = 1, // 第三要件: スピードのデフォルトを 1 に
  onSelectSpeed,
  questionsCount = 0,
  themeColor = "#eab308",
}) => {
  const currentLevel = selectedLevel || mode;
  const handleLevelChange = (lvl: "steady" | "normal" | "accelerated") => {
    if (onSelectLevel) onSelectLevel(lvl);
    if (onSelectMode) onSelectMode(lvl);
  };

  const speedOptions = [0.75, 1, 1.25, 1.5];

  return (
    <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      {/* 1段目: Learning Pace & Speed と Speech Speed の設定 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* Learning Pace */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Learning Pace
          </span>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(["steady", "normal", "accelerated"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleLevelChange(m)}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                  currentLevel === m
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* 💡 第三要件: 問題文を読むスピードの選択 (デフォルト: 1x) */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Speech Speed
          </span>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {speedOptions.map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => onSelectSpeed && onSelectSpeed(spd)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedSpeed === spd
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2段目: Category Filter (第一要件: 初期状態は 'all' で全クリア) */}
      <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Category Filter
          </span>
          {questionsCount > 0 && (
            <span className="text-[10px] font-bold text-slate-400">
              {questionsCount} Questions Available
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => onSelectCategory("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
              selectedCategory === "all"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            All Questions
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                selectedCategory === cat
                  ? "text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
              style={{
                backgroundColor: selectedCategory === cat ? themeColor : undefined,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OralDrillQuestionSelector;