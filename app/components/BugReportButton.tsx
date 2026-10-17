import React from "react";

type BugReportButtonProps = {
  onClick?: () => void;
  className?: string;
};

export default function BugReportButton({ onClick, className = "" }: BugReportButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 hover:border-amber-300 rounded-lg font-medium text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5 ${className}`}
    >
      <span>🐛</span>
      <span>Report Bug</span>
    </button>
  );
}