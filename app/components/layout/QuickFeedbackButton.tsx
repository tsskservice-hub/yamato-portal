import React from "react";

type QuickFeedbackButtonProps = {
  onClick?: () => void;
  className?: string;
};

export default function QuickFeedbackButton({ onClick, className = "" }: QuickFeedbackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-800 border border-blue-200 hover:border-blue-300 rounded-lg font-medium text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5 ${className}`}
    >
      <span>💬</span>
      <span>Feedback</span>
    </button>
  );
}