/**
 * @file YamatoFeature.tsx
 * @description マスコットのヤマトの自己紹介（ボタン＋モーダル）
 *
 * - LP のタイトル（Japanese Tutor AI Yamato）のすぐ後ろに小さな丸いボタンを置き、
 *   押すとヤマトの3D風の絵と自己紹介のモーダルが開く。
 * - 画像: public/images/yamato-character-3d.webp
 *   （元の yamato-character-3d-transparent.png 1600×1600 / 1.3MB を 640×640 の WebP 43KB に縮小。透過はそのまま）
 * - 音声: public/audio/yamato-intro.mp3（ブラウザは自動再生を止めるので、ボタンを押して再生する）
 * - 3D モデルに切り替えるときは、モーダルの <img> を <Yamato3D /> に置き換えるだけでよい。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Volume2, X } from 'lucide-react';

const IMAGE_SRC = '/images/yamato-character-3d.webp';
const AUDIO_SRC = '/audio/yamato-intro.mp3';

const INTRO_HEADING = 'こんにちは！ヤマトです。';
const INTRO_TEXT = `一緒に楽しく日本語を勉強しましょう。
24時間、いつでもページの右下からチャットをおくってください。`;

interface YamatoIntroButtonProps {
  isDarkMode: boolean;
}

/** タイトル横に置く小さなボタン。押すと自己紹介モーダルが開く */
export function YamatoIntroButton({ isDarkMode }: YamatoIntroButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Meet Yamato"
        title="Meet Yamato"
        className="inline-flex align-middle ml-2 w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-white ring-2 ring-blue-400 shadow-md hover:scale-110 hover:ring-blue-600 transition-transform cursor-pointer"
      >
        <img src={IMAGE_SRC} alt="" width={48} height={48} className="w-full h-full object-cover object-top scale-150 translate-y-[18%]" />
      </button>
      {isOpen && <YamatoIntroModal isDarkMode={isDarkMode} onClose={close} />}
    </>
  );
}

interface YamatoIntroModalProps {
  isDarkMode: boolean;
  onClose: () => void;
}

function YamatoIntroModal({ isDarkMode, onClose }: YamatoIntroModalProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [hasAudio, setHasAudio] = useState(true);

  // Esc で閉じる・開いたら閉じるボタンにフォーカス・閉じたら音声を止める
  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    const audio = audioRef.current;
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      audio?.pause();
    };
  }, [onClose]);

  const toggleIntro = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      return;
    }
    try {
      await audio.play();
    } catch {
      // 再生できなかったときはボタンを隠してテキストだけにする
      setHasAudio(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="yamato-intro-heading"
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-2xl rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 text-left ${
          isDarkMode ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-white text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={`absolute top-3 right-3 p-2 rounded-full transition cursor-pointer ${
            isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* 3D風ヤマト（透過画像） */}
        <img
          src={IMAGE_SRC}
          alt="Yamato, the mascot of jptutoraiyamato.com"
          width={320}
          height={320}
          className="w-48 sm:w-64 h-auto shrink-0 drop-shadow-xl"
        />

        {/* 自己紹介 */}
        <div className="flex-1 text-center sm:text-left">
          <h2 id="yamato-intro-heading" className="text-2xl sm:text-3xl font-black tracking-tight mb-3">
            {INTRO_HEADING}
          </h2>
          <p className={`whitespace-pre-line leading-loose mb-5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            {INTRO_TEXT}
          </p>

          <audio
            ref={audioRef}
            src={AUDIO_SRC}
            preload="none"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onError={() => setHasAudio(false)}
          />
          {hasAudio && (
            <button
              type="button"
              onClick={toggleIntro}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-base font-bold shadow-md transition-colors cursor-pointer"
            >
              {playing ? <Pause className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {playing ? '止める' : 'ヤマトの声を聞く'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
