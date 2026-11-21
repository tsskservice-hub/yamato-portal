/**
 * @file chatThemeColor.ts
 * @description そのページのヤマトチャットの色を、ほかの部品（🔍 Kanji ボタンなど）に知らせる
 *
 * ヤマトチャット（YamatoChatCommon / YamatoChatCommon2）が表示されると、その色を知らせる。
 * チャットが無いページでは null（各部品の既定の色を使う）。
 */
import { useEffect, useState } from "react";

/** chatThemes.ts の名前つきの色（floatingBg と同じ 600 の色） */
const NAMED_COLORS: Record<string, string> = {
  red: "#dc2626",
  blue: "#2563eb",
  black: "#0f172a",
  green: "#16a34a",
  yellow: "#ca8a04",
  orange: "#ea580c",
  purple: "#9333ea",
  cyan: "#0891b2",
  pink: "#db2777",
};

const EVENT = "yamato:chat-theme";
let currentColor: string | null = null;

/** "#a855f7" はそのまま、"purple" などの名前は色の値にする */
export function resolveChatColor(themeColor: string | undefined | null): string | null {
  if (!themeColor) return null;
  if (themeColor.startsWith("#")) return themeColor;
  return NAMED_COLORS[themeColor] ?? null;
}

/** ヤマトチャットが使う: 表示している間、自分の色を知らせる */
export function useBroadcastChatColor(themeColor: string | undefined | null) {
  useEffect(() => {
    const color = resolveChatColor(themeColor);
    currentColor = color;
    window.dispatchEvent(new CustomEvent(EVENT, { detail: color }));
    return () => {
      if (currentColor === color) {
        currentColor = null;
        window.dispatchEvent(new CustomEvent(EVENT, { detail: null }));
      }
    };
  }, [themeColor]);
}

/** ほかの部品が使う: 今のページのヤマトチャットの色（無ければ null） */
export function useChatColor(): string | null {
  const [color, setColor] = useState<string | null>(null);
  useEffect(() => {
    setColor(currentColor);
    const onChange = (e: Event) => setColor((e as CustomEvent<string | null>).detail ?? null);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  return color;
}
