/**
 * @file app/components/lessons/EduVocabularySidebar.tsx
 * @description レッスン内の語彙リスト表示用サイドバーコンポーネント（文字サイズ・視認性改善・ドリル起動ボタン・音声ボタン対応版）
 *   🔊 ボタンで語彙の音声（kl_vocabulary.audio_url）を再生する。
 *   音声ファイルが無い・読み込めない時は、ブラウザの音声合成で読み上げる（語彙ドリルと同じ動き）。
 */

import React, { useEffect, useRef, useState } from "react";

interface EduVocabularySidebarProps {
  vocabulary: any[];
  onStartDrill?: () => void;
}

export const EduVocabularySidebar: React.FC<EduVocabularySidebarProps> = ({
  vocabulary = [],
  onStartDrill
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** 再生中の語彙の番号（ボタンの見た目用） */
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const stopAll = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  // ページを離れる時は音を止める
  useEffect(() => stopAll, []);

  /** 音声合成で読み上げる（読み仮名があれば読み仮名を使う） */
  const speak = (vocab: any, index: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setPlayingIndex(null);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(vocab?.jp_kana || vocab?.jp_text || "");
    utterance.lang = "ja-JP";
    utterance.rate = 0.9;
    utterance.onend = () => setPlayingIndex((cur) => (cur === index ? null : cur));
    utterance.onerror = () => setPlayingIndex((cur) => (cur === index ? null : cur));
    window.speechSynthesis.speak(utterance);
  };

  const play = (vocab: any, index: number) => {
    stopAll();
    setPlayingIndex(index);

    const url = typeof vocab?.audio_url === "string" ? vocab.audio_url.trim() : "";
    if (!url) {
      speak(vocab, index);
      return;
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    let fellBack = false;
    const fallback = () => {
      if (fellBack || audioRef.current !== audio) return; // 別の語彙に切り替わっていたら何もしない
      fellBack = true;
      audioRef.current = null;
      speak(vocab, index);
    };
    audio.onerror = fallback;
    audio.onended = () => {
      if (audioRef.current === audio) audioRef.current = null;
      setPlayingIndex((cur) => (cur === index ? null : cur));
    };
    audio.play().catch(fallback);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>📝</span>
          <span>Lesson Vocabulary ({vocabulary.length})</span>
        </h2>
        {vocabulary.length > 0 && onStartDrill && (
          <button
            type="button"
            onClick={onStartDrill}
            className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>🚀</span>
            <span>Vocab Drill</span>
          </button>
        )}
      </div>

      {vocabulary.length === 0 ? (
        <p className="text-xs text-slate-500 italic">No vocabulary items registered for this lesson.</p>
      ) : (
        <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
          {vocabulary.map((vocab: any, vIdx: number) => {
            const isPlaying = playingIndex === vIdx;
            return (
              <div key={vocab.id || vIdx} className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                {/* 音声ボタン */}
                <button
                  type="button"
                  onClick={() => play(vocab, vIdx)}
                  aria-label={`Listen: ${vocab.jp_text}`}
                  title="Listen"
                  className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base transition cursor-pointer active:scale-90 ${
                    isPlaying
                      ? "bg-orange-500 text-white shadow-md animate-pulse"
                      : "bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-900 hover:bg-orange-50 dark:hover:bg-orange-950"
                  }`}
                >
                  🔊
                </button>
                {/* 右の列：日本語・ローマ字・英語を1行ずつ */}
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-slate-900 dark:text-slate-100 block text-base sm:text-lg break-words">
                    {vocab.jp_text}
                  </span>
                  {vocab.romaji && (
                    <span className="text-slate-600 dark:text-slate-300 font-medium italic text-xs block mt-0.5 break-words">
                      {vocab.romaji}
                    </span>
                  )}
                  {vocab.english_text && (
                    <span className="text-slate-700 dark:text-slate-300 font-semibold text-sm block mt-0.5 break-words">
                      {vocab.english_text}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
