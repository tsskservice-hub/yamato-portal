/**
 * @file app/components/lessons/EduFlexibleDataRenderer.tsx
 * @description 柔軟なレッスンデータレンダラーコンポーネント（文字サイズ拡大・レイアウト崩れ/重なり防止改善版）
 */

import React from "react";

interface EduFlexibleDataRendererProps {
  data: any;
}

export const EduFlexibleDataRenderer: React.FC<EduFlexibleDataRendererProps> = ({ data }) => {
  if (!data) return <span className="text-slate-400 italic text-base">None</span>;

  let parsedData = data;
  if (typeof data === "string") {
    try {
      parsedData = JSON.parse(data);
    } catch (e) {
      return <p className="text-slate-700 dark:text-slate-300 text-base leading-relaxed">{data}</p>;
    }
  }

  if (Array.isArray(parsedData)) {
    return (
      <div className="space-y-3">
        {parsedData.map((item, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-2xl text-base space-y-2.5 border-2 border-slate-200/80 dark:border-slate-800 shadow-xs">
            {typeof item === "object" && item !== null ? (
              Object.entries(item).map(([key, val]) => (
                <div key={key} className="flex flex-col sm:flex-row sm:gap-3">
                  <span className="font-extrabold text-orange-600 dark:text-orange-400 uppercase text-xs sm:text-sm tracking-wider sm:w-32 shrink-0">
                    {key}:
                  </span>
                  <span className="text-slate-800 dark:text-slate-200 text-base leading-relaxed">
                    {String(val)}
                  </span>
                </div>
              ))
            ) : (
              <span className="text-slate-800 dark:text-slate-200 text-base leading-relaxed">{String(item)}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (typeof parsedData === "object" && parsedData !== null) {
    return (
      <div className="space-y-3">
        {Object.entries(parsedData).map(([key, val]) => (
          <div key={key} className="flex flex-col sm:flex-row sm:gap-3 text-base">
            <span className="font-extrabold text-orange-600 dark:text-orange-400 uppercase text-xs sm:text-sm tracking-wider sm:w-36 shrink-0 pt-0.5">
              {key}:
            </span>
            <span className="text-slate-800 dark:text-slate-200 text-base leading-relaxed">
              {String(val)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-slate-700 dark:text-slate-300 text-base leading-relaxed">{String(parsedData)}</span>;
};

export default EduFlexibleDataRenderer;