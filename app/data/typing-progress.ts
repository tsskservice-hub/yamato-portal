/**
 * @file typing-progress.ts
 * @description ブラインドタッチ（/test/typing）の進み具合の保存先と、レッスンの数
 *   進み具合はその端末のブラウザにだけ残す（localStorage）。My Progress（/progress）もここを読む。
 *   TYPING_LESSON_COUNT は routes/test.typing.tsx の LESSONS の数と同じにする。
 */
export const TYPING_STORE_KEY = 'yamato-typing-progress-v1';
export const TYPING_LESSON_COUNT = 22;

export interface TypingBest {
  accuracy: number;
  kpm: number;
  passed: boolean;
}

export function readTypingProgress(): Record<string, TypingBest> {
  try {
    const v = JSON.parse(window.localStorage.getItem(TYPING_STORE_KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}
