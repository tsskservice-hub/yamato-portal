/**
 * @file app/hooks/useSoundEffect.ts
 * @description Supabase Storage の効果音ファイルを再生するカスタムフック（フォールバック付き）
 */

import { useCallback, useRef } from "react";

const BUCKET = "sound-effect-audio";
const DEFAULT_FILE = "correct-answer-1.mp3";
const COMPLETE_FILE = "completed-sound-2.mp3"; 

/**
 * Supabase のプロジェクトURLを取得する。
 * 1. Vite の環境変数 (VITE_SUPABASE_URL)
 * 2. Remix でよく使う window.ENV (SUPABASE_URL / VITE_SUPABASE_URL)
 * のどちらかから探す。見つからなければ空文字を返す。
 */
function getSupabaseUrl(): string {
  const fromVite = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;

  const winEnv =
    typeof window !== "undefined" ? ((window as any).ENV as Record<string, string> | undefined) : undefined;
  const fromWindow = winEnv?.SUPABASE_URL || winEnv?.VITE_SUPABASE_URL;

  const url = fromVite || fromWindow || "";
  return url.replace(/\/$/, "");
}

// バケット内のファイル名から公開URLを組み立てる（再生時に呼ぶ。SSRとのズレを防ぐため）
function buildSoundUrl(fileName: string): string {
  const base = getSupabaseUrl();
  return base ? `${base}/storage/v1/object/public/${BUCKET}/${fileName}` : "";
}

// フォールバック音用の AudioContext は1つだけ作って使い回す
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudioCtx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    sharedAudioCtx = new Ctor();
  }
  return sharedAudioCtx;
}

export function useSoundEffect(customSoundUrl?: string) {
  // URLごとに Audio 要素をキャッシュして、2回目以降の再生を速くする
  const audioCacheRef = useRef<Record<string, HTMLAudioElement>>({});

  // 指定URLを再生する共通処理（失敗時はフォールバック音を鳴らす）
  const playUrl = useCallback((targetUrl: string) => {
    if (!targetUrl) {
      console.error(
        "[useSoundEffect] Supabase URL is not set. Set VITE_SUPABASE_URL (or window.ENV.SUPABASE_URL) and redeploy."
      );
      playFallbackBeep();
      return;
    }

    try {
      let audio = audioCacheRef.current[targetUrl];
      if (!audio) {
        audio = new Audio(targetUrl);
        audio.preload = "auto";
        audioCacheRef.current[targetUrl] = audio;
      }

      audio.currentTime = 0;
      audio.play().catch((e) => {
        console.warn("[useSoundEffect] audio.play failed, falling back to beep:", targetUrl, e);
        playFallbackBeep();
      });
    } catch (e) {
      console.error("[useSoundEffect] sound effect error:", e);
      playFallbackBeep();
    }
  }, []);

  // 正解音（デフォルト）。引数にURLを渡すと、そのURLを再生する
  const playSound = useCallback(
    (overrideUrl?: string) => {
      // 注意: useEffect などから playSound() を引数なしで呼ぶ想定。
      // もしイベントオブジェクトが渡された場合は無視する。
      const override = typeof overrideUrl === "string" ? overrideUrl : undefined;
      const targetUrl = override || customSoundUrl || buildSoundUrl(DEFAULT_FILE);
      playUrl(targetUrl);
    },
    [customSoundUrl, playUrl]
  );

  // タスク完了音
  const playCompleteSound = useCallback(() => {
    playUrl(buildSoundUrl(COMPLETE_FILE));
  }, [playUrl]);

  return { playSound, playCompleteSound };
}

// 音声ファイルが再生できなかった場合のフォールバック（Web Audio APIによる合成音）
function playFallbackBeep() {
  try {
    const audioCtx = getAudioContext();
    if (!audioCtx) return;

    // ブラウザの自動再生制限で suspended になっている場合は再開する
    if (audioCtx.state === "suspended") {
      void audioCtx.resume();
    }

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
    console.error("[useSoundEffect] fallback sound error:", e);
  }
}