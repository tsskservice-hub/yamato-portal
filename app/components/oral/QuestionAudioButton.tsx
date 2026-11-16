import React, { useEffect, useRef, useState } from "react";

/** いま鳴っている質問の音声（ほかのボタンを押したら止める。同時に 2 つ鳴らさない） */
let currentAudio: HTMLAudioElement | null = null;

export interface QuestionAudioButtonProps {
  /** 質問の音声ファイル（/audio/Q001.mp3 など） */
  src: string;
  /** 再生の速さ（ページで選んだ Speech Speed） */
  playbackRate?: number;
  themeColor?: string;
}

/** 答えを書く欄の質問の前に置く、質問の音声を聞くボタン（もう一度押すと止まる） */
export const QuestionAudioButton: React.FC<QuestionAudioButtonProps> = ({
  src,
  playbackRate = 1,
  themeColor = "#eab308",
}) => {
  const [state, setState] = useState<"idle" | "playing" | "error">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 画面から消えるときは止める
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (currentAudio === audioRef.current) currentAudio = null;
    };
  }, []);

  const stop = (audio: HTMLAudioElement) => {
    audio.pause();
    audio.currentTime = 0;
    audio.dispatchEvent(new Event("ended"));
  };

  const handleClick = async () => {
    if (state === "playing" && audioRef.current) {
      stop(audioRef.current);
      return;
    }
    if (currentAudio) stop(currentAudio);

    const audio = new Audio(src);
    audio.playbackRate = playbackRate || 1;
    audio.addEventListener("ended", () => {
      setState("idle");
      if (currentAudio === audio) currentAudio = null;
    });
    audio.addEventListener("error", () => setState("error"));
    audioRef.current = audio;
    currentAudio = audio;
    try {
      setState("playing");
      await audio.play();
    } catch {
      setState("error");
    }
  };

  const label =
    state === "playing" ? "Stop the question audio" : state === "error" ? "Audio unavailable" : "Listen to the question";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === "error"}
      title={label}
      aria-label={label}
      className="shrink-0 w-8 h-8 rounded-full border-2 bg-white dark:bg-slate-900 flex items-center justify-center text-sm transition cursor-pointer hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ borderColor: themeColor, color: themeColor }}
    >
      {state === "playing" ? "⏹" : state === "error" ? "🔇" : "🔊"}
    </button>
  );
};

export default QuestionAudioButton;
