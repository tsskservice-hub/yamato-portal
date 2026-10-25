/**
 * @file GenkoyoshiModal.tsx
 * @description VCE日本語 原稿用紙の使い方専用モーダルコンポーネント
 * 💡 特徴:
 * 1. texttypes や外部DBに依存しない完全独立設計（インポートエラーの恒久防止）
 * 2. タイトル・氏名・段落・マス目ルール（句読点の禁則処理・数字アルファベット等）を体系的に網羅
 * 3. PDF見本（/genkoyoshi.pdf）のインライン iframe 埋め込み ＆ 別タブ閲覧ボタン完備
 * 4. Escキーおよび背景クリックでのスムーズなクローズ対応
 */
import React, { useEffect } from "react";

export interface GenkoyoshiModalProps {
  isOpen: boolean;
  onClose: () => void;
  samplePdfUrl?: string;
}

export const GENKOYOSHI_RULES = [
  {
    title: "Title & Author Name (タイトルと氏名)",
    icon: "🏷️",
    items: [
      "Title (1st Line): Leave 3 blank squares at the top, then write your title. (タイトルは1行目、上を3マス空けて書き始める)",
      "Author Name (2nd Line): Align towards the bottom, leaving the very last 1 square blank. (名前は2行目、一番下の1マスを空けて末尾に揃える)",
    ],
  },
  {
    title: "Paragraphs & Main Text (段落と本文)",
    icon: "✍️",
    items: [
      "New Paragraph: Indent 1 square at the beginning of each paragraph. (新しい段落の書き出しは、必ず1マス空ける)",
      "No Blank Lines: Do not leave blank lines between paragraphs. (段落と段落の間に空行を作らない)",
      "Dialogue (Conversations): Start conversation with a new line, placing the opening bracket 「 in the first square. (会話文は行を変え、1マス目に「 を書く)",
    ],
  },
  {
    title: "Square Usage & Punctuation (マス目の使い方と禁則処理)",
    icon: "📐",
    items: [
      "1 Character per Square: As a general rule, write one letter in each square. (基本的に1マスに1文字)",
      "Punctuation Marks (、/ 。): Never start a new line with punctuation! Place it in the bottom-right of the previous line's last square, or write it in the margin outside. (句読点を行頭に書いてはいけない。前の行の最後のマスに文字と一緒に書くか、欄外に置く)",
      "Brackets (「 」): Opening brackets cannot be at the end of a line; closing brackets cannot be at the beginning of a line. (開き括弧を行末に、閉じ括弧を行頭に置かない)",
      "Numbers & Alphabet: In vertical writing, write Kanji numbers (一, 二, 三) or fit 2 half-width Arabic numbers (e.g. 25) into one square horizontally. (縦書きでは漢数字が基本。算用数字や英字は1マスに2文字収める)",
    ],
  },
];

export function GenkoyoshiModal({
  isOpen,
  onClose,
  samplePdfUrl = "/genkoyoshi.pdf",
}: GenkoyoshiModalProps) {
  // Escキーでモーダルを閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="genkoyoshi-modal-title"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col relative my-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-gradient-to-r from-rose-50 to-pink-50 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📝</span>
            <div>
              <h3
                id="genkoyoshi-modal-title"
                className="text-lg sm:text-xl font-bold text-rose-900 m-0"
              >
                Genkoyoshi Usage Guide (原稿用紙の使い方)
              </h3>
              <p className="text-xs text-rose-700 m-0 mt-0.5">
                Standard formatting rules & conventions for VCE Japanese Writing
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-lg transition border border-rose-200 cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* スクロール可能メインコンテンツ */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-grow text-slate-800">
          
          {/* ルール解説セクション */}
          <div className="space-y-4">
            {GENKOYOSHI_RULES.map((section, idx) => (
              <div
                key={idx}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-2xs"
              >
                <h4 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2 m-0 mb-2.5 pb-1.5 border-b border-slate-200">
                  <span>{section.icon}</span>
                  <span>{section.title}</span>
                </h4>
                <ul className="space-y-2 pl-5 list-disc text-xs sm:text-sm text-slate-700 leading-relaxed m-0">
                  {section.items.map((item, itemIdx) => (
                    <li key={itemIdx}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* 実物サンプル・PDFプレビューセクション */}
          <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">📄</span>
                <span className="text-sm font-bold text-rose-900">
                  Official Genkoyoshi Sample & Layout
                </span>
              </div>
              <a
                href={samplePdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-2xs flex items-center gap-1 no-underline"
              >
                <span>View Full PDF in New Tab ↗</span>
              </a>
            </div>

            {/* インライン PDF / 見本枠 */}
            <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-inner h-[380px] sm:h-[460px]">
              <iframe
                src={`${samplePdfUrl}#toolbar=0&navpanes=0`}
                title="Genkoyoshi PDF Preview"
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 rounded-xl transition shadow-xs cursor-pointer"
          >
            Close Guide (閉じる)
          </button>
        </div>
      </div>
    </div>
  );
}

export default GenkoyoshiModal;