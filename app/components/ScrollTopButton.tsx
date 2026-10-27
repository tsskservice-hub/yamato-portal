/**
 * @file ScrollTopButton.tsx
 * @description ポータル共通上に戻る（Scroll To Top）ボタン
 * 💡 特徴：
 * 1. 300px 以上スクロールしたときにスムーズにフェードイン表示
 * 2. クリック時に最上部へスムーズスクロール
 * 3. YamatoChatCommon のテーマカラーと完全連動可能
 * 4. チャットのない長文ページ（利用規約・履歴等）でも単独で配置可能
 */
import React, { useState, useEffect } from "react";

export type ScrollTopButtonProps = {
  floatingClass?: string;
  inlineStyle?: React.CSSProperties;
  threshold?: number; // 表示を開始するスクロール量（デフォルト: 300px）
  title?: string;
};

export function ScrollTopButton({
  floatingClass = "bg-blue-600 hover:bg-blue-700 text-white border border-blue-400",
  inlineStyle,
  threshold = 300,
  title = "ページトップへ戻る",
}: ScrollTopButtonProps) {
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    const toggleVisible = () => {
      if (window.scrollY > threshold) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisible, { passive: true });
    return () => window.removeEventListener("scroll", toggleVisible);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      style={inlineStyle}
      className={`${floatingClass} w-10 h-10 rounded-full shadow-lg transition-all duration-200 cursor-pointer text-xs font-bold flex items-center justify-center hover:scale-105 active:scale-95`}
      title={title}
      aria-label={title}
    >
      ▲
    </button>
  );
}

export default ScrollTopButton;