/**
 * @file app/components/lessons/EduSpeakingHeader.tsx
 */

import React from "react";

interface EduSpeakingHeaderProps {
  title: string;
  description?: string;
  topic?: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onClose: () => void;
}

export const EduSpeakingHeader: React.FC<EduSpeakingHeaderProps> = ({
  title,
  description,
  topic,
  isFullscreen,
  onToggleFullscreen,
  onClose,
}) => {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
      <div>
        <span className="inline-block px-2.5 py-1 mb-2 text-xs font-bold tracking-wide text-indigo-700 bg-indigo-100 rounded-full">
          🗣️ Speaking Task (AI Yamato Drill)
        </span>
        <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
          {title}
        </h3>
        {description && (
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            {description}
          </p>
        )}
        {topic && <p className="text-xs text-indigo-600 font-medium mt-1">Topic: {topic}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold text-sm p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 transition"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
        >
          {isFullscreen ? "🗗" : "⛶"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-sm p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          ✕ Close
        </button>
      </div>
    </div>
  );
};