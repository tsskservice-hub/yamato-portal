import React from "react";

export interface OralDrillQuestionSelectorProps {
  categories: string[];
  selectedTopics: string[];
  onToggleTopic: (topic: string) => void;
  onSelectAllTopics: () => void;
  onClearAllTopics: () => void;
  selectedLevel?: "steady" | "normal" | "accelerated";
  onSelectLevel?: (level: "steady" | "normal" | "accelerated") => void;
  mode?: "steady" | "normal" | "accelerated";
  onSelectMode?: (mode: "steady" | "normal" | "accelerated") => void;
  selectedSpeed?: number;
  onSelectSpeed?: (speed: number) => void;
  questionsCount?: number;
  themeColor?: string;
}

export const OralDrillQuestionSelector: React.FC<OralDrillQuestionSelectorProps> = ({
  categories,
  selectedTopics,
  onToggleTopic,
  onSelectAllTopics,
  onClearAllTopics,
  selectedLevel,
  onSelectLevel,
  mode = "normal",
  onSelectMode,
  selectedSpeed = 1,
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
    <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      {/* 1段目: Learning Pace & Speech Speed */}
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

        {/* Speech Speed */}
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

      {/* 2段目: マルチセレクト対応のトピックフィルター（ここに親の機能を統合） */}
      {categories.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                🏷 Select Topics (Multiple Selection Allowed)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300">
                {selectedTopics.length} / {categories.length} selected
              </span>
            </div>
            <div className="space-x-2">
              <button
                type="button"
                onClick={onSelectAllTopics}
                className="text-xs text-amber-600 font-bold hover:underline cursor-pointer"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={onClearAllTopics}
                className="text-xs text-slate-400 font-bold hover:underline cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((topic) => {
              const isSelected = selectedTopics.includes(topic);
              return (
                <button
                  key={topic}
                  type="button"
                  onClick={() => onToggleTopic(topic)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center gap-1.5 ${
                    isSelected
                      ? "text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                  }`}
                  style={{
                    backgroundColor: isSelected ? themeColor : undefined,
                    borderColor: isSelected ? themeColor : undefined,
                  }}
                >
                  <span>{isSelected ? "☑" : "□"}</span>
                  <span>{topic}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default OralDrillQuestionSelector;