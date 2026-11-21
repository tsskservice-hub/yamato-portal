/**
 * @file useGameSounds.ts
 * @description ゲームの効果音（public/game-assets/<ゲーム名>/ の音声ファイル）を鳴らす共通フック
 *
 *  const sounds = useGameSounds({ correct: '/game-assets/character-maze/correct-answer.mp3', ... });
 *  sounds.load();            // Start ボタンなど、ユーザーの操作の中で 1 回呼ぶ（ブラウザが音を許可するため）
 *  sounds.play('correct');   // 鳴らす。続けて鳴らしても前の音は切れない
 *  sounds.muted / sounds.setMuted   // ミュートボタン用
 *
 * ファイルが見つからない音は鳴らさないだけで、ゲームは止まらない。
 */
import { useCallback, useRef, useState } from 'react';

export function useGameSounds<K extends string>(files: Record<K, string>, volume = 0.8) {
  const baseRef = useRef<Partial<Record<K, HTMLAudioElement>> | null>(null);
  const failedRef = useRef(new Set<K>());
  const filesRef = useRef(files);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const load = useCallback(() => {
    if (baseRef.current || typeof Audio === 'undefined') return;
    const base: Partial<Record<K, HTMLAudioElement>> = {};
    for (const name of Object.keys(filesRef.current) as K[]) {
      const audio = new Audio(filesRef.current[name]);
      audio.preload = 'auto';
      audio.addEventListener('error', () => failedRef.current.add(name), { once: true });
      base[name] = audio;
    }
    baseRef.current = base;
  }, []);

  const play = useCallback(
    (name: K) => {
      const source = baseRef.current?.[name];
      if (!source || mutedRef.current || failedRef.current.has(name)) return;
      const audio = source.cloneNode(true) as HTMLAudioElement;
      audio.volume = volume;
      audio.play().catch(() => {});
    },
    [volume]
  );

  return { load, play, muted, setMuted };
}
