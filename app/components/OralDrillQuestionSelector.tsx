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
      {/* 1段目: Learning Pace & Yamato Speech Speed (視覚的にセクションを分離し、選択色をテーマカラーに統一) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Learning Pace セクション */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            🌱 Learning Pace
          </span>
          <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {(["steady", "normal", "accelerated"] as const).map((m) => {
              const isSelected = currentLevel === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleLevelChange(m)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition cursor-pointer text-center ${
                    isSelected ? "text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                  style={{
                    backgroundColor: isSelected ? themeColor : undefined,
                  }}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        {/* Yamato Speech Speed セクション（一目でわかるラベルに変更） */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            🔊 Yamato Speech Speed
          </span>
          <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {speedOptions.map((spd) => {
              const isSelected = selectedSpeed === spd;
              return (
                <button
                  key={spd}
                  type="button"
                  onClick={() => onSelectSpeed && onSelectSpeed(spd)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                    isSelected ? "text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                  style={{
                    backgroundColor: isSelected ? themeColor : undefined,
                  }}
                >
                  {spd}x
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2段目: マルチセレクト対応のトピックフィルター */}
      {categories.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                🏷 Select Topics (Multiple Selection Allowed)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
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