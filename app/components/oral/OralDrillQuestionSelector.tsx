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

  const speedOptions = [0.8, 1.0, 1.2];

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      {/* 1段目: Learning Pace & Speech Speed (2カラムレイアウト & 統一スタイル) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Column 1: Learning Pace */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            ⚡ Learning Pace
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {(["steady", "normal", "accelerated"] as const).map((m) => {
              const isSelected = currentLevel === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleLevelChange(m)}
                  className={`p-3 rounded-2xl border text-xs font-bold transition cursor-pointer capitalize ${
                    isSelected
                      ? "text-white shadow-sm"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                  }`}
                  style={{
                    backgroundColor: isSelected ? themeColor : undefined,
                    borderColor: isSelected ? themeColor : undefined,
                  }}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        {/* Column 2: Speech Speed */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            🔊 Speech Speed
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {speedOptions.map((spd) => {
              const isSelected = selectedSpeed === spd;
              return (
                <button
                  key={spd}
                  type="button"
                  onClick={() => onSelectSpeed && onSelectSpeed(spd)}
                  className={`p-3 rounded-2xl border text-xs font-bold transition cursor-pointer ${
                    isSelected
                      ? "text-white shadow-sm"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                  }`}
                  style={{
                    backgroundColor: isSelected ? themeColor : undefined,
                    borderColor: isSelected ? themeColor : undefined,
                  }}
                >
                  {spd}x
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2段目: トピックフィルター */}
      {categories.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                🏷 Select Topics (Multiple Selection Allowed)
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                style={{
                  backgroundColor: `${themeColor}20`,
                  color: themeColor,
                  borderColor: `${themeColor}40`,
                }}
              >
                {selectedTopics.length} / {categories.length} selected
              </span>
            </div>
            <div className="space-x-2">
              <button
                type="button"
                onClick={onSelectAllTopics}
                className="text-xs font-bold hover:underline cursor-pointer"
                style={{ color: themeColor }}
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