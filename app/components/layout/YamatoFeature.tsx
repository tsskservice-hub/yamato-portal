/**
 * @file YamatoFeature.tsx
 * @description マスコットのヤマトの自己紹介（ボタン＋モーダル）
 *
 * - LP のタイトル（Japanese Tutor AI Yamato）のすぐ後ろに小さな丸いボタンを置き、
 *   押すとヤマトの3D風の絵と、吹き出しに入った自己紹介のモーダルが開き、声が流れる。
 * - モーダルのヤマトの絵をクリックすると、声の再生／停止が切り替わる。
 * - 画像: public/images/yamato-character-3d.webp
 *   （元の yamato-character-3d-transparent.png 1600×1600 / 1.3MB を 640×640 の WebP 43KB に縮小。透過はそのまま）
 * - 音声: public/audio/yamato-intro.mp3
 *   ブラウザはクリックなしの自動再生を止めるので、ボタンを押したその場（クリックの処理の中）で play() する。
 *   そのため <audio> はモーダルではなくボタン側に置いている。
 * - 3D モデルに切り替えるときは、モーダルの <img> を <Yamato3D /> に置き換えるだけでよい。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Volume2, X } from 'lucide-react';

const IMAGE_SRC = '/images/yamato-character-3d.webp';
const AUDIO_SRC = '/audio/yamato-intro.mp3';

const INTRO_LINES = [
  'こんにちは！ヤマトです。',
  '一緒に楽しく日本語を勉強しましょう。',
  '24時間、いつでもページの右下からチャットをおくってください。',
];

// 再生できなかった理由をコンソールに出す（画面上のボタンは隠さない）
const logPlayError = (err: unknown) => console.warn('[YamatoIntro] 音声を再生できませんでした:', err);

interface YamatoIntroButtonProps {
  isDarkMode: boolean;
}

/** タイトル横に置く小さなボタン。押すと自己紹介モーダルが開き、声が流れる */
export function YamatoIntroButton({ isDarkMode }: YamatoIntroButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [playing, setPlaying] = useState(false);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(logPlayError);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    // 最後まで聞き終わっていたら最初から、途中で止めていたら続きから
    if (audio.ended) audio.currentTime = 0;
    audio.play().catch(logPlayError);
  }, []);

  const open = () => {
    setIsOpen(true);
    play(); // クリックの処理の中で再生するので、ブラウザに止められない
  };

  const close = useCallback(() => {
    audioRef.current?.pause();
    setIsOpen(false);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Meet Yamato"
        title="Meet Yamato"
        className="inline-flex align-middle ml-2 w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-white ring-2 ring-blue-400 shadow-md hover:scale-110 hover:ring-blue-600 transition-transform cursor-pointer"
      >
        <img src={IMAGE_SRC} alt="" width={48} height={48} className="w-full h-full object-cover object-top scale-150 translate-y-[18%]" />
      </button>

      <audio
        ref={audioRef}
        src={AUDIO_SRC}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => console.warn('[YamatoIntro] 音声を読み込めませんでした:', AUDIO_SRC, audioRef.current?.error)}
      />

      {isOpen && (
        <YamatoIntroModal
          isDarkMode={isDarkMode}
          playing={playing}
          onTogglePlay={togglePlay}
          onClose={close}
        />
      )}
    </>
  );
}

interface YamatoIntroModalProps {
  isDarkMode: boolean;
  playing: boolean;
  onTogglePlay: () => void;
  onClose: () => void;
}

function YamatoIntroModal({ isDarkMode, playing, onTogglePlay, onClose }: YamatoIntroModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Esc で閉じる・開いたら閉じるボタンにフォーカス
  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const bubbleColors = isDarkMode
    ? 'bg-slate-800 text-slate-100 border-slate-700'
    : 'bg-blue-50 text-slate-800 border-blue-200';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Yamato"
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-sm rounded-2xl shadow-2xl px-6 pt-10 pb-6 flex flex-col items-center text-left ${
          isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={`absolute top-2 right-2 p-2 rounded-full transition cursor-pointer ${
            isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* 吹き出し（しっぽは下のヤマトに向ける） */}
        <div className={`relative w-full rounded-2xl border px-4 py-3 text-sm font-medium leading-relaxed shadow-sm ${bubbleColors}`}>
          {INTRO_LINES.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <span
            aria-hidden="true"
            className={`absolute left-1/2 -bottom-2 w-4 h-4 -translate-x-1/2 rotate-45 border-r border-b ${bubbleColors}`}
          />
        </div>

        {/* 3D風ヤマト（クリックで声の再生／停止） */}
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? 'Stop Yamato’s voice' : 'Play Yamato’s voice'}
          title={playing ? '止める' : 'ヤマトの声を聞く'}
          className="relative mt-4 rounded-2xl cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <img
            src={IMAGE_SRC}
            alt="Yamato, the mascot of jptutoraiyamato.com"
            width={320}
            height={320}
            className={`w-52 sm:w-60 h-auto drop-shadow-xl transition-transform ${playing ? 'animate-pulse' : 'hover:scale-105'}`}
          />
          <span className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
            {playing ? <Pause className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </span>
        </button>
      </div>
    </div>
  );
}
