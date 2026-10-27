import React from "react";

export interface OralDrillQuestionSelectorProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  selectedLevel?: "steady" | "normal" | "accelerated";
  onSelectLevel?: (level: "steady" | "normal" | "accelerated") => void;
  mode?: "steady" | "normal" | "accelerated";
  onSelectMode?: (mode: "steady" | "normal" | "accelerated") => void;
  questionsCount?: number;
  themeColor?: string;
}

export const OralDrillQuestionSelector: React.FC<OralDrillQuestionSelectorProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  selectedLevel,
  onSelectLevel,
  mode = "normal",
  onSelectMode,
  questionsCount = 0,
  themeColor = "#eab308",
}) => {
  const currentLevel = selectedLevel || mode;
  const handleLevelChange = (lvl: "steady" | "normal" | "accelerated") => {
    if (onSelectLevel) onSelectLevel(lvl);
    if (onSelectMode) onSelectMode(lvl);
  };

  return (
    <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
          Learning Pace & Speed
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

      <div className="space-y-1.5">
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