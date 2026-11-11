/**
 * @file app/hooks/useSoundEffect.ts
 * @description Supabase Storage の効果音ファイルを再生するカスタムフック（フォールバック付き）
 */

import { useCallback } from "react";

export function useSoundEffect(customSoundUrl?: string) {
  // Supabase Storageのデフォルト音声URLを自動生成
  // ※プロジェクトURL環境変数（例: import.meta.env.VITE_SUPABASE_URL など）がある場合はそちらを利用してください
  const supabaseProjectUrl = typeof window !== "undefined" 
    ? (import.meta as any).env?.VITE_SUPABASE_URL || "https://your-supabase-project.supabase.co"
    : "";

  const defaultSupabaseUrl = `${supabaseProjectUrl}/storage/v1/object/public/sound-effect-audio/correct-answer-1.mp3`;

  const playSound = useCallback((overrideUrl?: string) => {
    const targetUrl = overrideUrl || customSoundUrl || defaultSupabaseUrl;

    try {
      if (targetUrl) {
        const audio = new Audio(targetUrl);
        audio.play().catch((e) => {
          console.warn("Audio play failed from Supabase, falling back to Web Audio API:", e);
          playFallbackBeep();
        });
        return;
      }

      playFallbackBeep();
    } catch (e) {
      console.error("Sound effect error:", e);
      playFallbackBeep();
    }
  }, [customSoundUrl, defaultSupabaseUrl]);

  return { playSound };
}

// 音声ファイルが再生できなかった場合のフォールバック（Web Audio APIによる合成音）
function playFallbackBeep() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = audioCtx.currentTime;

    // 1音目（ドの音：523.25Hz）
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now);
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
    osc2.frequency.setValueAtTime(659.25, now + 0.1);
    gain2.gain.setValueAtTime(0.1, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.35);
  } catch (e) {
    console.error("Fallback sound error:", e);
  }
}