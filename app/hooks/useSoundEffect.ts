/**
 * @file app/hooks/useSoundEffect.ts
 * @description アプリ内のタスクやクイズの正解時などに効果音を再生するための再利用可能なカスタムフック
 */

import { useCallback } from "react";

export function useSoundEffect(soundUrl?: string) {
  const playSound = useCallback(() => {
    try {
      // 音声ファイルのURLが指定されている場合はそちらを再生
      if (soundUrl) {
        const audio = new Audio(soundUrl);
        audio.play().catch((e) => console.log("Audio play failed:", e));
        return;
      }

      // 音声ファイルがない場合のフォールバック：
      // Web Audio API を用いて、追加アセットなしで明るい正解音（シャン♪）を自動生成して鳴らす
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;

      // 1音目（ドの音：523.25Hz）
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0.1, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // 2音目（ミの音：659.25Hz）
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, now + 0.1); // E5
      gain2.gain.setValueAtTime(0.1, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.35);
    } catch (e) {
      console.error("Sound effect error:", e);
    }
  }, [soundUrl]);

  return { playSound };
}