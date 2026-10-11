import React from "react";
import { Link } from "react-router";

type TextTypeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  modalKey: string; // 親からモーダルのキー名（'Article', 'Report' 等）を受け取る
  title: string;
  purpose: string;
  structure: string[];
  sample?: string;
  sampleImage?: string;
};

// 文法のキーワードと文法一覧ページのハッシュIDを紐付けるヘルパー関数
function renderGrammarText(text: string, modalKey: string) {
  const grammarLinks: { [key: string]: string } = {
    "べきです": "/grammar#beki-desu",
    "〜べきだ": "/grammar#beki-desu",
    "ので": "/grammar#kara-node",
    "から": "/grammar#kara-node",
    "一方で": "/grammar#ippou",
    "によると": "/grammar#particles",
    "によると〜そうです": "/grammar#sou-desu-hearsay",
  };

  const matchedKey = Object.keys(grammarLinks).find((key) =>
    text.includes(key)
  );

  if (matchedKey) {
    const parts = text.split(matchedKey);
    return (
      <span>
        <span dangerouslySetInnerHTML={{ __html: parts[0] }} />
        <Link
          to={grammarLinks[matchedKey]}
          className="text-blue-600 underline font-semibold hover:text-blue-800"
          onClick={(e) => {
            e.stopPropagation(); // モーダルが意図せず閉じるのを防ぐ
            if (typeof window !== "undefined") {
              sessionStorage.setItem("reopenModalTitle", modalKey);
            }
          }}
        >
          {matchedKey}
        </Link>
        <span dangerouslySetInnerHTML={{ __html: parts[1] }} />
      </span>
    );
  }
  return <span dangerouslySetInnerHTML={{ __html: text }} />;
}

export default function TextTypeModal({
  isOpen,
  onClose,
  modalKey,
  title,
  purpose,
  structure,
  sample,
  sampleImage,
}: TextTypeModalProps) {
  if (!isOpen) return null;

  // "Refer to each text type for details." の後ろに再生ボタン風の絵文字リンクを埋め込む関数
  const renderPurposeWithJump = (text: string) => {
    const targetPhrase = "Refer to each text type for details.";
    if (text.includes(targetPhrase)) {
      const parts = text.split(targetPhrase);
      return (
        <span>
          <span dangerouslySetInnerHTML={{ __html: parts[0] }} />
          {targetPhrase}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose(); // モーダルを閉じる
              setTimeout(() => {
                const banner = document.getElementById("text-type-instruction");
                if (banner) {
                  banner.scrollIntoView({ behavior: "smooth" }); // スムーズスクロール
                  // 視覚的に分かりやすくするため、一時的にバナーを緑色に光らせる
                  banner.classList.add("ring-4", "ring-emerald-400");
                  setTimeout(() => {
                    banner.classList.remove("ring-4", "ring-emerald-400");
                  }, 1500);
                }
              }, 100); // モーダルが閉じるのを待つためのわずかな遅延
            }}
            className="ml-1.5 inline-baseline text-blue-500 hover:text-blue-600 hover:scale-110 transition-transform cursor-pointer align-baseline"
            title="Go to Text Type instruction"
          >
            ▶️
          </button>
          {parts[1] && <span dangerouslySetInnerHTML={{ __html: parts[1] }} />}
        </span>
      );
    }
    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 w-full max-w-2xl rounded-xl shadow-2xl relative max-h-[85vh] overflow-y-auto box-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 閉じるボタン */}
        <button
          className="absolute top-3 right-4 bg-transparent border-none text-2xl cursor-pointer text-slate-500 hover:text-slate-900 transition-colors"
          onClick={onClose}
        >
          ×
        </button>

        {/* タイトル文字を大きく (text-2xl) */}
        <h3
          className="mt-0 text-slate-800 text-2xl font-bold pr-8"
          dangerouslySetInnerHTML={{ __html: title }}
        />

        {/* キーポイントセクション */}
        <div className="mt-4 bg-slate-50 p-5 rounded-lg border border-slate-200">
          <h4 className="m-0 mb-3 font-bold text-slate-800 text-lg">
            📌 Key points
          </h4>
          
          {/* Purpose の文字を大きく (text-lg) ＆ 再生ボタン風絵文字付き */}
          <p className="m-0 text-lg text-slate-700 mb-4 leading-relaxed">
            <strong>✨</strong> {renderPurposeWithJump(purpose)}
          </p>

          {/* リスト全体の文字を大きく (text-lg) */}
          <ul className="m-0 pl-5 text-slate-700 space-y-3 text-lg">
            {structure.map((point, index) => {
              // Main Text のサブリスト処理
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
                        <li key={subIndex} className="text-base text-slate-600">
                          {sub}
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              }

              // Square Usage のサブリスト処理
              if (point.startsWith("Square Usage:")) {
                const squareUsageSubItems = [
                  "1 character per square",
                  "Use Arabic numerals (2 digits per square) for horizontal dates",
                  "Punctuation never goes in the first square; instead, put it in the last square along with the character already in that square",
                ];
                return (
                  <li key={index} className="mb-2">
                    <strong>Square Usage:</strong>
                    <ul className="mt-1 pl-5 list-disc space-y-1">
                      {squareUsageSubItems.map((sub, subIndex) => (
                        <li key={subIndex} className="text-base text-slate-600">
                          {sub}
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              }

              // Items you should include のサブリスト処理
              if (point.startsWith("Items you should include:")) {
                const contentAfterColon = point
                  .substring("Items you should include:".length)
                  .trim();
                const subItems = contentAfterColon
                  ? contentAfterColon.split(",").map((s) => s.trim())
                  : [];

                return (
                  <li key={index} className="mb-2">
                    <strong>Items you should include:</strong>
                    {subItems.length > 0 && (
                      <ul className="mt-1 pl-5 list-disc space-y-1">
                        {subItems.map((sub, subIndex) => (
                          <li key={subIndex} className="text-base text-slate-600">
                            {renderGrammarText(sub, modalKey)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              }

              // Content のサブリスト処理
              if (point.startsWith("Content:")) {
                const contentAfterColon = point
                  .substring("Content:".length)
                  .trim();
                const subItems = contentAfterColon
                  ? contentAfterColon.split(",").map((s) => s.trim())
                  : [];

                return (
                  <li key={index} className="mb-2">
                    <strong>Content:</strong>
                    {subItems.length > 0 && (
                      <ul className="mt-1 pl-5 list-disc space-y-1">
                        {subItems.map((sub, subIndex) => (
                          <li key={subIndex} className="text-base text-slate-600">
                            {renderGrammarText(sub, modalKey)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              }

              // Sentence style または Possible grammar patterns のサブリスト処理
              if (
                point.startsWith("Sentence style:") ||
                point.startsWith("Possible grammar patterns:")
              ) {
                const prefix = point.startsWith("Sentence style:")
                  ? "Sentence style:"
                  : "Possible grammar patterns:";
                const contentAfterColon = point.substring(prefix.length).trim();
                const subItems = contentAfterColon
                  ? contentAfterColon.split(",").map((s) => s.trim())
                  : [];

                return (
                  <li key={index} className="mb-2">
                    <strong>{prefix}</strong>
                    {subItems.length > 0 && (
                      <ul className="mt-1 pl-5 list-disc space-y-1">
                        {subItems.map((sub, subIndex) => (
                          <li key={subIndex} className="text-base text-slate-600">
                            {renderGrammarText(sub, modalKey)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              }

              const colonIndex = point.indexOf(":");
              if (colonIndex !== -1) {
                const label = point.substring(0, colonIndex + 1);
                const rest = point.substring(colonIndex + 1).trim();
                const subItems = rest
                  ? rest.split(",").map((s) => s.trim())
                  : [];

                return (
                  <li key={index} className="mb-2">
                    <strong>{label}</strong>
                    {subItems.length > 0 && (
                      <ul className="mt-1 pl-5 list-disc space-y-1">
                        {subItems.map((sub, subIndex) => (
                          <li key={subIndex} className="text-base text-slate-600">
                            {renderGrammarText(sub, modalKey)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              }

              return (
                <li key={index} className="mb-1">
                  {renderGrammarText(point, modalKey)}
                </li>
              );
            })}
          </ul>
        </div>

        {/* サンプルセクション */}
        <div className="mt-4 bg-slate-50 p-5 rounded-lg border border-slate-200">
          <h4 className="m-0 mb-3 font-bold text-slate-800 text-lg">
            💡 Sample
          </h4>
          {sampleImage ? (
            <div className="mt-2">
              {sampleImage.endsWith(".pdf") ? (
                <>
                  <div className="text-center mb-3">
                    <a
                      href={sampleImage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-base font-medium no-underline transition-colors shadow-sm"
                    >
                      📄 View PDF Sample in New Tab ↗
                    </a>
                  </div>
                  <div className="border border-slate-300 rounded-lg overflow-hidden h-[450px] sm:h-[550px]">
                    <iframe
                      src={sampleImage}
                      width="100%"
                      height="100%"
                      className="border-none"
                    />
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <img
                    src={sampleImage}
                    alt={`${title} Sample`}
                    className="max-w-full h-auto rounded-md border border-slate-300 shadow-sm"
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="italic text-slate-700 bg-white p-4 rounded-md border-l-4 border-blue-600 m-0 whitespace-pre-wrap text-base">
              {sample}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}