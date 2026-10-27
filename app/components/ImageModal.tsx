/**
 * @file ImageModal.tsx
 * @description ポータル共通画像拡大プレビューモーダル
 * 💡 特徴：
 * 1. チャット内の添付画像・AI図解の拡大だけでなく、原稿用紙エディタや漢字チェッカー等でも流用可能
 * 2. 背景（オーバーレイ）クリックまたは「✕ Close」ボタンで閉じる
 * 3. Escキー押下でも自然に閉じるキーボード対応
 */
import React, { useEffect } from "react";

export type ImageModalProps = {
  src: string;
  alt?: string;
  onClose: () => void;
};

export function ImageModal({
  src,
  alt = "Enlarged View",
  onClose,
}: ImageModalProps) {
  // 💡 Escキーを押した時にも閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh]"
        onClick={(e) => e.stopPropagation()} // 💡 画像本体をクリックしてもモーダルが閉じないように伝播を防止
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-10 right-0 text-white text-sm font-bold bg-black/50 px-3 py-1 rounded-full hover:bg-black/80 transition cursor-pointer"
        >
          ✕ Close
        </button>
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl bg-white"
        />
      </div>
    </div>
  );
}

export default ImageModal;