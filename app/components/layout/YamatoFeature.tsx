/**
 * @file YamatoFeature.tsx
 * @description LP 上部でマスコットのヤマトが自己紹介するセクション（3D風の絵版）
 *
 * - 画像: public/images/yamato-character-3d.webp
 *   （元の yamato-character-3d-transparent.png 1600×1600 / 1.3MB を 640×640 の WebP 43KB に縮小。透過はそのまま）
 * - 音声: public/audio/yamato-intro.mp3 を置くと「ヤマトの声を聞く」ボタンが出る。
 *   ファイルが無い間は、ボタンは出ずにテキストだけの紹介になる。
 * - パソコンでは左にヤマト・右に自己紹介、スマホでは縦並び。
 * - 3D モデルに切り替えるときは <img> を <Yamato3D /> に置き換えるだけでよい。
 */
import { useEffect, useRef, useState } from 'react';
import { Pause, Volume2 } from 'lucide-react';

const IMAGE_SRC = '/images/yamato-character-3d.webp';
const AUDIO_SRC = '/audio/yamato-intro.mp3';

const INTRO_HEADING = 'こんにちは！ぼくはヤマト。';
const INTRO_TEXT = `日本語を楽しく学ぶお手伝いをするよ。
24時間、いつでも話しかけてね。
あ、ぼくは声を自由に変えられるんだ。会話の練習では、いろんな声で話すよ。
さあ、いっしょにがんばろう！`;

interface YamatoFeatureProps {
  isDarkMode: boolean;
}

export function YamatoFeature({ isDarkMode }: YamatoFeatureProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  // 音声ファイルが本当にあると確認できるまでボタンは出さない
  // （preload="none" だと再生ボタンを押すまで onError が起きないため、先に確認する）
  const [hasAudio, setHasAudio] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(AUDIO_SRC, { method: 'HEAD' })
      .then((res) => {
        const type = res.headers.get('content-type') || '';
        // ファイルが無いとき HTML の 404 ページが返ることがあるので、種類も確かめる
        if (!cancelled && res.ok && type.startsWith('audio/')) setHasAudio(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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
    <section
      aria-labelledby="yamato-intro-heading"
      className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-6 sm:gap-10"
    >
      {/* 左: 3D風ヤマト（透過画像） */}
      <img
        src={IMAGE_SRC}
        alt="Yamato, the mascot of jptutoraiyamato.com"
        width={320}
        height={320}
        className="w-56 sm:w-72 lg:w-80 h-auto shrink-0 drop-shadow-xl"
      />

      {/* 右: 自己紹介 */}
      <div className="flex-1 text-center sm:text-left">
        <h2 id="yamato-intro-heading" className="text-2xl sm:text-3xl font-black tracking-tight mb-3">
          {INTRO_HEADING}
        </h2>
        <p className={`whitespace-pre-line leading-loose mb-5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          {INTRO_TEXT}
        </p>

        {hasAudio && (
          <>
            {/* ブラウザは自動再生を止めるので、必ずタップで再生する */}
            <audio
              ref={audioRef}
              src={AUDIO_SRC}
              preload="none"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              onError={() => setHasAudio(false)}
            />
            <button
              type="button"
              onClick={toggleIntro}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md transition-colors cursor-pointer"
            >
              {playing ? <Pause className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {playing ? '止める' : 'ヤマトの声を聞く'}
            </button>
          </>
        )}

        <p className={`text-sm mt-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          24時間365日、いつでも学習の悩みをサポートします。
        </p>
      </div>
    </section>
  );
}
