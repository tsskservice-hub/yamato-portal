import React from "react";

export interface OralExaminerAvatarProps {
  isSpeaking?: boolean;
  isListening?: boolean;
  isThinking?: boolean;
  statusText?: string;
  avatarUrl?: string;
  examinerName?: string;
  themeColor?: string;
  size?: "sm" | "md" | "lg";
}

export const OralExaminerAvatar: React.FC<OralExaminerAvatarProps> = ({
  isSpeaking = false,
  isListening = false,
  isThinking = false,
  statusText,
  avatarUrl,
  examinerName = "Yamato Sensei (AI Examiner)",
  themeColor = "#ef4444",
  size = "md",
}) => {
  const sizeClasses = {
    sm: "w-16 h-16 text-xl",
    md: "w-24 h-24 text-3xl",
    lg: "w-32 h-32 text-4xl",
  }[size];

  const currentStatus = statusText || (
    isSpeaking
      ? "Speaking..."
      : isListening
      ? "Listening to you..."
      : isThinking
      ? "Evaluating response..."
      : "Ready"
  );

  return (
    <div className="flex flex-col items-center justify-center space-y-3 select-none">
      <div className="relative flex items-center justify-center">
        {isSpeaking && (
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-30"
            style={{ backgroundColor: themeColor }}
          />
        )}
        {isListening && (
          <div
            className="absolute -inset-2 rounded-full animate-pulse border-2 border-dashed opacity-60"
            style={{ borderColor: themeColor }}
          />
        )}

        <div
          className={`relative rounded-full p-1 shadow-lg transition-all duration-300 ${sizeClasses} flex items-center justify-center overflow-hidden border-2`}
          style={{
            borderColor: isSpeaking || isListening ? themeColor : "#cbd5e1",
            boxShadow: isSpeaking ? `0 0 20px ${themeColor}60` : "none",
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={examinerName}
              className={`w-full h-full object-cover rounded-full ${
                isSpeaking ? "scale-105 transition-transform duration-200" : ""
              }`}
            />
          ) : (
            <div
              className="w-full h-full rounded-full flex items-center justify-center font-bold text-white shadow-inner"
              style={{
                background: `linear-gradient(135deg, ${themeColor}, #1e293b)`,
              }}
            >
              🌸
            </div>
          )}

          {isThinking && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center rounded-full">
              <div
                className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: `${themeColor} transparent ${themeColor} ${themeColor}` }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center space-y-1">
        <span className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          {examinerName}
        </span>

        <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <span
            className={`w-2 h-2 rounded-full ${
              isSpeaking
                ? "animate-bounce"
                : isListening
                ? "animate-pulse"
                : isThinking
                ? "animate-spin"
                : ""
            }`}
            style={{
              backgroundColor: isSpeaking
                ? themeColor
                : isListening
                ? "#22c55e"
                : isThinking
                ? "#eab308"
                : "#94a3b8",
            }}
          />
          <span className="text-slate-600 dark:text-slate-300">
            {currentStatus}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OralExaminerAvatar;