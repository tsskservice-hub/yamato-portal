/**
 * @file chatThemes.ts
 * @description AIヤマトチャットおよびポータル共通カラーテーマ定義
 * 💡 各部屋や用途に合わせた9色のプリセットスタイル（Tailwind CSSクラス）
 */

export interface ThemeStyle {
  floatingBg: string;
  floatingText: string;
  floatingBorder: string;
  border: string;
  headerText: string;
  badgeBg: string;
  badgeText: string;
  buttonActive: string;
  buttonInactive: string;
  userBubble: string;
  inputRing: string;
  submitBtn: string;
}

export type ThemeColorKey =
  | "red"
  | "blue"
  | "black"
  | "green"
  | "yellow"
  | "orange"
  | "purple"
  | "cyan"
  | "pink";

export const themeStyles: Record<ThemeColorKey, ThemeStyle> = {
  red: {
    floatingBg: "bg-red-600 hover:bg-red-700",
    floatingText: "text-white",
    floatingBorder: "border border-red-400",
    border: "border-red-300",
    headerText: "text-red-900",
    badgeBg: "bg-red-50 border-red-200",
    badgeText: "text-red-900",
    buttonActive: "bg-red-600 text-white shadow-xs",
    buttonInactive: "text-slate-600 hover:text-red-700",
    userBubble: "bg-red-600 text-white rounded-br-xs",
    inputRing: "focus:ring-red-500",
    submitBtn: "bg-red-600 hover:bg-red-700 text-white",
  },
  blue: {
    floatingBg: "bg-blue-600 hover:bg-blue-700",
    floatingText: "text-white",
    floatingBorder: "border border-blue-400",
    border: "border-blue-300",
    headerText: "text-blue-900",
    badgeBg: "bg-blue-50 border-blue-200",
    badgeText: "text-blue-900",
    buttonActive: "bg-blue-600 text-white shadow-xs",
    buttonInactive: "text-slate-600 hover:text-blue-700",
    userBubble: "bg-blue-600 text-white rounded-br-xs",
    inputRing: "focus:ring-blue-500",
    submitBtn: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  black: {
    floatingBg: "bg-slate-900 hover:bg-black",
    floatingText: "text-white",
    floatingBorder: "border border-slate-700",
    border: "border-slate-700",
    headerText: "text-slate-900",
    badgeBg: "bg-slate-100 border-slate-300",
    badgeText: "text-slate-900",
    buttonActive: "bg-slate-900 text-white shadow-xs",
    buttonInactive: "text-slate-600 hover:text-slate-900",
    userBubble: "bg-slate-900 text-white rounded-br-xs",
    inputRing: "focus:ring-slate-900",
    submitBtn: "bg-slate-900 hover:bg-black text-white",
  },
  green: {
    floatingBg: "bg-green-600 hover:bg-green-700",
    floatingText: "text-white",
    floatingBorder: "border border-green-400",
    border: "border-green-300",
    headerText: "text-green-900",
    badgeBg: "bg-green-50 border-green-200",
    badgeText: "text-green-900",
    buttonActive: "bg-green-600 text-white shadow-xs",
    buttonInactive: "text-slate-600 hover:text-green-700",
    userBubble: "bg-green-600 text-white rounded-br-xs",
    inputRing: "focus:ring-green-500",
    submitBtn: "bg-green-600 hover:bg-green-700 text-white",
  },
  yellow: {
    floatingBg: "bg-yellow-500 hover:bg-yellow-600",
    floatingText: "text-slate-900",
    floatingBorder: "border border-yellow-300",
    border: "border-yellow-300",
    headerText: "text-yellow-900",
    badgeBg: "bg-yellow-50 border-yellow-200",
    badgeText: "text-yellow-900",
    buttonActive: "bg-yellow-500 text-slate-900 shadow-xs",
    buttonInactive: "text-slate-600 hover:text-yellow-700",
    userBubble: "bg-yellow-500 text-slate-900 rounded-br-xs",
    inputRing: "focus:ring-yellow-500",
    submitBtn: "bg-yellow-500 hover:bg-yellow-600 text-slate-900",
  },
  orange: {
    floatingBg: "bg-orange-500 hover:bg-orange-600",
    floatingText: "text-white",
    floatingBorder: "border border-orange-300",
    border: "border-orange-300",
    headerText: "text-orange-900",
    badgeBg: "bg-orange-50 border-orange-200",
    badgeText: "text-orange-900",
    buttonActive: "bg-orange-500 text-white shadow-xs",
    buttonInactive: "text-slate-600 hover:text-orange-700",
    userBubble: "bg-orange-500 text-white rounded-br-xs",
    inputRing: "focus:ring-orange-500",
    submitBtn: "bg-orange-500 hover:bg-orange-600 text-white",
  },
  purple: {
    floatingBg: "bg-purple-600 hover:bg-purple-700",
    floatingText: "text-white",
    floatingBorder: "border border-purple-400",
    border: "border-purple-300",
    headerText: "text-purple-900",
    badgeBg: "bg-purple-50 border-purple-200",
    badgeText: "text-purple-900",
    buttonActive: "bg-purple-600 text-white shadow-xs",
    buttonInactive: "text-slate-600 hover:text-purple-700",
    userBubble: "bg-purple-600 text-white rounded-br-xs",
    inputRing: "focus:ring-purple-500",
    submitBtn: "bg-purple-600 hover:bg-purple-700 text-white",
  },
  cyan: {
    floatingBg: "bg-cyan-600 hover:bg-cyan-700",
    floatingText: "text-white",
    floatingBorder: "border border-cyan-400",
    border: "border-cyan-300",
    headerText: "text-cyan-900",
    badgeBg: "bg-cyan-50 border-cyan-200",
    badgeText: "text-cyan-900",
    buttonActive: "bg-cyan-600 text-white shadow-xs",
    buttonInactive: "text-slate-600 hover:text-cyan-700",
    userBubble: "bg-cyan-600 text-white rounded-br-xs",
    inputRing: "focus:ring-cyan-500",
    submitBtn: "bg-cyan-600 hover:bg-cyan-700 text-white",
  },
  pink: {
    floatingBg: "bg-pink-600 hover:bg-pink-700",
    floatingText: "text-white",
    floatingBorder: "border border-pink-400",
    border: "border-pink-300",
    headerText: "text-pink-900",
    badgeBg: "bg-pink-50 border-pink-200",
    badgeText: "text-pink-900",
    buttonActive: "bg-pink-600 text-white shadow-xs",
    buttonInactive: "text-slate-600 hover:text-pink-700",
    userBubble: "bg-pink-600 text-white rounded-br-xs",
    inputRing: "focus:ring-pink-500",
    submitBtn: "bg-pink-600 hover:bg-pink-700 text-white",
  },
};