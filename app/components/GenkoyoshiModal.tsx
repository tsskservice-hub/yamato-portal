/**
 * @file GenkoyoshiModal.tsx
 * @description VCE Japanese Genkoyoshi Usage Guide Modal Component
 * 💡 Features:
 * 1. Fully independent design utilizing structured data (title, purpose, structure, sampleImage)
 * 2. Automatically handles sub-lists for Main Text and Square Usage
 * 3. Safe PDF preview path handling to prevent 404 errors
 * 4. Smooth closing via Escape key and backdrop click
 */
import React, { useEffect } from "react";

export interface GenkoyoshiModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  purpose?: string;
  structure?: string[];
  sampleImage?: string;
}

const DEFAULT_GENKOYOSHI_DATA = {
  title: "Genkoyoshi Usage Guide",
  purpose: "This guide outlines the general rules for formatting titles, names, main text, and square usage on genkoyoshi. Refer to each text type for details.",
  structure: [
    "Title (Line 1): Leave 3 spaces at the beginning, then write the title",
    "Name (Line 2): Write at the end, leaving the last square blank",
    "Main Text:",
    "Square Usage:"
  ],
  sampleImage: "text_type_samples/genkoyoshi.pdf",
};

export function GenkoyoshiModal({
  isOpen,
  onClose,
  title = DEFAULT_GENKOYOSHI_DATA.title,
  purpose = DEFAULT_GENKOYOSHI_DATA.purpose,
  structure = DEFAULT_GENKOYOSHI_DATA.structure,
  sampleImage = DEFAULT_GENKOYOSHI_DATA.sampleImage,
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

  // Ensure sampleImage path starts with a slash to prevent 404 errors in nested routing
  const resolvedPdfUrl = sampleImage
    ? sampleImage.startsWith("/")
      ? sampleImage
      : `/${sampleImage}`
    : "/genkoyoshi.pdf";

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
                dangerouslySetInnerHTML={{ __html: title }}
              />
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

        {/* Scrollable Main Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-grow text-slate-800">
          
          {/* Key Points & Purpose Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <h4 className="m-0 font-bold text-slate-800 text-base flex items-center gap-2 pb-2 border-b border-slate-200">
              <span>📌</span>
              <span>Key points</span>
            </h4>
            
            <p className="m-0 text-base text-slate-700 leading-relaxed">
              <strong>✨</strong> {purpose}
            </p>

            <ul className="m-0 pl-5 text-slate-700 space-y-3 text-base">
              {structure.map((point, index) => {
                // Main Text sub-items
                if (point.startsWith("Main Text:")) {
                  const mainTextSubItems = [
                    "Start from the 3rd line, leaving the 1st square blank",
                    "Indent 1 space for a new paragraph",
                    "Do not leave a blank line between paragraphs",
                  ];
                  return (
                    <li key={index} className="mb-2">
                      <strong>Main Text:</strong>
                      <ul className="mt-1 pl-5 list-disc space-y-1">
                        {mainTextSubItems.map((sub, subIndex) => (
                          <li key={subIndex} className="text-sm text-slate-600">
                            {sub}
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                }

                // Square Usage sub-items
                if (point.startsWith("Square Usage:")) {
                  const squareUsageSubItems = [
                    "1 character per square",
                    "Use Arabic numerals (2 digits per square) for horizontal numbers",
                    "Punctuation marks (、/。) never start a new line; place them in the bottom-right of the previous square or along with the last character",
                  ];
                  return (
                    <li key={index} className="mb-2">
                      <strong>Square Usage:</strong>
                      <ul className="mt-1 pl-5 list-disc space-y-1">
                        {squareUsageSubItems.map((sub, subIndex) => (
                          <li key={subIndex} className="text-sm text-slate-600">
                            {sub}
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                }

                return (
                  <li key={index} className="mb-1 leading-relaxed">
                    {point}
                  </li>
                );
              })}
            </ul>
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
                href={resolvedPdfUrl}
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
                src={resolvedPdfUrl}
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