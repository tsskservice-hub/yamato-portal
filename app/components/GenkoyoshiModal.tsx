/**
 * @file GenkoyoshiModal.tsx
 * @description VCE Japanese Genkoyoshi Usage Guide Modal Component
 * 💡 Features:
 * 1. Fully independent design without relying on texttypes or external DB (prevents import errors permanently)
 * 2. Systematically covers rules for titles, names, paragraphs, and square usage (punctuation rules, numbers, etc.) in English
 * 3. Inline iframe embedding for sample PDF (/genkoyoshi.pdf) with a "View in New Tab" button
 * 4. Smooth closing via Escape key and backdrop click
 */
import React, { useEffect } from "react";

export interface GenkoyoshiModalProps {
  isOpen: boolean;
  onClose: () => void;
  samplePdfUrl?: string;
}

export const GENKOYOSHI_RULES = [
  {
    title: "Title & Author Name",
    icon: "🏷️",
    items: [
      "Title (Line 1): Leave 3 blank squares at the beginning, then write your title.",
      "Author Name (Line 2): Write towards the end, leaving the very last 1 square blank.",
    ],
  },
  {
    title: "Paragraphs & Main Text",
    icon: "✍️",
    items: [
      "New Paragraph: Indent 1 square at the beginning of each paragraph.",
      "No Blank Lines: Do not leave blank lines between paragraphs.",
      "Dialogue (Conversations): Start a conversation on a new line, placing the opening quotation mark 「 in the first square.",
    ],
  },
  {
    title: "Square Usage & Punctuation Rules",
    icon: "📐",
    items: [
      "1 Character per Square: As a general rule, write one letter or symbol in each square.",
      "Punctuation Marks (、/ 。): Never start a new line with punctuation. Place it in the bottom-right of the previous square or in the margin.",
      "Brackets (「 」): Opening brackets cannot be placed at the end of a line, and closing brackets cannot be placed at the beginning of a line.",
      "Numbers & Alphabet: In vertical writing, use Kanji numerals (一, 二, 三) or fit two half-width Arabic digits (e.g. 25) horizontally into a single square.",
    ],
  },
];

export function GenkoyoshiModal({
  isOpen,
  onClose,
  samplePdfUrl = "/genkoyoshi.pdf",
}: GenkoyoshiModalProps) {
  // Close modal on Escape key
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
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-gradient-to-r from-rose-50 to-pink-50 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📝</span>
            <div>
              <h3
                id="genkoyoshi-modal-title"
                className="text-lg sm:text-xl font-bold text-rose-900 m-0"
              >
                Genkoyoshi Usage Guide
              </h3>
              <p className="text-xs text-rose-700 m-0 mt-0.5">
                This guide outlines the general rules for formatting titles, names, main text, and square usage on genkoyoshi.
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

        {/* Scrollable Main Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-grow text-slate-800">
          
          {/* Rules Section */}
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

          {/* Sample PDF Preview Section */}
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

            {/* Inline PDF Preview Frame */}
            <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-inner h-[380px] sm:h-[460px]">
              <iframe
                src={`${samplePdfUrl}#toolbar=0&navpanes=0`}
                title="Genkoyoshi PDF Preview"
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 rounded-xl transition shadow-xs cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}

export default GenkoyoshiModal;