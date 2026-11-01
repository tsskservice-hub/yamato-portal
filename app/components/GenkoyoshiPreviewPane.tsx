/**
 * @file GenkoyoshiPreviewPane.tsx
 * @description Real-time Genkoyoshi grid preview component for VCE Japanese writing.
 */
import React from 'react';
import { Item } from '../utils/genkoyoshi-engine';

export interface GenkoyoshiPreviewPaneProps {
  pages: Item[][][];
  format?: string; // "400" | "200"
  writingMode?: 'vertical' | 'horizontal';
  totalCharCount?: number;
}

export const GenkoyoshiPreviewPane: React.FC<GenkoyoshiPreviewPaneProps> = ({
  pages,
  format = "400",
  writingMode = "vertical",
  totalCharCount
}) => {
  const is200 = format === "200";
  const isHorizontal = writingMode === "horizontal";

  if (!pages || pages.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
        <p className="text-sm font-medium">Enter your essay text to see the Genkoyoshi grid preview here.</p>
      </div>
    );
  }

  return (
    <div className="genko-preview-container space-y-8 overflow-x-auto pb-4">
      {pages.map((page, pageIdx) => (
        <div 
          key={pageIdx} 
          className="genko-page border-2 border-red-700/80 bg-orange-50/20 p-4 sm:p-6 rounded-xl shadow-md max-w-full overflow-x-auto mx-auto"
          style={{ minWidth: is200 ? '360px' : '680px' }}
        >
          <div className="flex justify-between items-center mb-3 text-xs text-red-800/70 border-b border-red-200 pb-1 font-mono">
            <span>Genkoyoshi Grid ({format} Grid - {isHorizontal ? "Horizontal" : "Vertical"})</span>
            <span>Page {pageIdx + 1} / {pages.length}</span>
          </div>

          <div 
            className={`genko-grid flex justify-start gap-1 sm:gap-1.5 my-2 ${
              isHorizontal ? 'flex-col' : 'flex-row-reverse'
            }`}
          >
            {page.map((row, rowIdx) => (
              <div 
                key={rowIdx} 
                className={`genko-row flex gap-0.5 ${
                  isHorizontal ? 'flex-row' : 'flex-col'
                }`}
              >
                {row.map((cell, colIdx) => {
                  let cellContent = "";
                  let isCo = false;
                  let isNum = false;

                  if (cell.type === 'co') {
                    cellContent = cell.main + cell.sub;
                    isCo = true;
                  } else if (cell.type === 'num') {
                    cellContent = cell.value;
                    isNum = true;
                  } else {
                    cellContent = cell.value;
                  }

                  return (
                    <div
                      key={colIdx}
                      className={`genko-cell w-6 h-6 sm:w-7 sm:h-7 border border-red-400/50 flex items-center justify-center font-serif text-slate-900 leading-none select-none relative ${
                        isCo ? 'bg-amber-100/60 text-[10px] font-bold text-red-800' : ''
                      } ${isNum ? 'text-[11px] font-mono tracking-tighter' : 'text-sm sm:text-base'}`}
                      title={`Page ${pageIdx + 1}, Row ${rowIdx + 1}, Cell ${colIdx + 1}`}
                    >
                      {cellContent}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {totalCharCount !== undefined && pageIdx === pages.length - 1 && (
            <div className="mt-3 text-right text-xs font-semibold text-slate-500">
              Total Characters: {totalCharCount}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default GenkoyoshiPreviewPane;
