import React from "react";

export const EduFlexibleDataRenderer = ({ data }: { data: any }) => {
  if (!data) return <span className="text-slate-400 italic">None</span>;

  let parsedData = data;
  if (typeof data === "string") {
    try {
      parsedData = JSON.parse(data);
    } catch (e) {
      return <p className="text-slate-700 dark:text-slate-300">{data}</p>;
    }
  }

  if (Array.isArray(parsedData)) {
    return (
      <div className="space-y-2">
        {parsedData.map((item, idx) => (
          <div key={idx} className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl text-xs space-y-1 border border-slate-200/60 dark:border-slate-800">
            {typeof item === "object" && item !== null ? (
              Object.entries(item).map(([key, val]) => (
                <div key={key} className="flex gap-2">
                  <span className="font-semibold text-orange-600 dark:text-orange-400 uppercase text-[10px] w-14 shrink-0">
                    {key}:
                  </span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {String(val)}
                  </span>
                </div>
              ))
            ) : (
              <span className="text-slate-800 dark:text-slate-200">{String(item)}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (typeof parsedData === "object" && parsedData !== null) {
    return (
      <div className="space-y-1">
        {Object.entries(parsedData).map(([key, val]) => (
          <div key={key} className="flex gap-2 text-xs">
            <span className="font-semibold text-orange-600 dark:text-orange-400 uppercase text-[10px] w-20 shrink-0">
              {key}:
            </span>
            <span className="text-slate-800 dark:text-slate-200">
              {String(val)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-slate-700 dark:text-slate-300">{String(parsedData)}</span>;
};