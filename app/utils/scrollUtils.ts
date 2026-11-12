import React from 'react';

/**
 * ページ内の指定されたアンカー要素へスムーズにスクロールする共通関数
 */
export const handleScrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, anchorId: string) => {
  e.preventDefault();
  const element = document.getElementById(anchorId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

/**
 * カテゴリー名等から安全なDOM用IDを生成するヘルパー関数
 */
export const getAnchorId = (text: string) => {
  return `cat-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
};