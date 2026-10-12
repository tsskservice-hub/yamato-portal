import React, { useState, useEffect } from "react";
import type { MetaFunction } from "@remix-run/react";
import PageLayout from "~/components/PageLayout";

type Item =
  | { type: "num"; value: string }
  | { type: "char"; value: string }
  | { type: "co"; main: string; sub: string };

// ページトップへ戻るボタン（右上固定に変更）
function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const toggleVisible = () => {
      if (window.scrollY > 300) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };
    window.addEventListener("scroll", toggleVisible);
    return () => window.removeEventListener("scroll", toggleVisible);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed top-6 right-6 z-40 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-full shadow-lg transition cursor-pointer text-xs font-bold"
      title="ページトップへ戻る"
    >
      ▲ Top
    </button>
  );
}

export default function GenkoyoshiEditor() {
  const [format, setFormat] = useState<string>("400");
  const [title, setTitle] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [isClient, setIsClient] = useState<boolean>(false);

  // 🤖 AIチューター常駐窓用のステート
  const [isAiTutorOpen, setIsAiTutorOpen] = useState<boolean>(false);
  const [isAiTutorExpanded, setIsAiTutorExpanded] = useState<boolean>(false);
  const [tutorMessages, setTutorMessages] = useState<{ role: "assistant" | "user"; content: string }[]>([
    {
      role: "assistant",
      content: "Hello! I'm your Japanese Writing Tutor. Have any questions about your writing, kanji, or studies? Ask me anything!",
    },
  ]);
  const [tutorInput, setTutorInput] = useState<string>("");
  const [isTutorLoading, setIsTutorLoading] = useState<boolean>(false);
  const [tutorLevel, setTutorLevel] = useState<"steady" | "normal" | "accelerated">("steady");

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isPunctuation = (char: string): boolean => {
    return ["、", "。", "，", "．", "！", "？", "」", "』", "）", "〕", "］", "｝", "』", "〉", "》"].includes(char);
  };

  const isHalfWidthDigit = (char: string): boolean => {
    return /^[0-9]$/.test(char);
  };

  const parseTextToItems = (inputText: string): Item[] => {
    const chars = Array.from(inputText);
    const items: Item[] = [];
    let i = 0;
    while (i < chars.length) {
      const c1 = chars[i];
      if (isHalfWidthDigit(c1) && i + 1 < chars.length && isHalfWidthDigit(chars[i + 1])) {
        items.push({ type: "num", value: c1 + chars[i + 1] });
        i += 2;
      } else {
        items.push({ type: "char", value: c1 });
        i += 1;
      }
    }
    return items;
  };

  // 空の1マスを生成するヘルパー関数
  const createEmptyCell = (): Item => ({ type: "char", value: "" });

  // 1行（Item[]）を必ず colsPerLine (20マス) に補填するヘルパー関数
  const padRowToLength = (row: Item[], colsPerLine: number = 20): Item[] => {
    const padded = [...row];
    while (padded.length < colsPerLine) {
      padded.push(createEmptyCell());
    }
    return padded;
  };

  const generatePages = (): Item[][][] => {
    const colsPerLine = 20;
    const maxRows = format === "400" ? 20 : 10;
    const paragraphs = text.split("\n");
    const contentLines: Item[][] = [];

    for (const p of paragraphs) {
      const parsedItems = parseTextToItems(p);
      if (parsedItems.length > 0) {
        const first = parsedItems[0];
        if (!(first.type === "char" && first.value === " ")) {
          parsedItems.unshift({ type: "char", value: " " });
        }
      }

      let currentLineItems: Item[] = [];
      let i = 0;
      while (i < parsedItems.length) {
        const item = parsedItems[i];

        if (currentLineItems.length === colsPerLine) {
          contentLines.push(padRowToLength(currentLineItems, colsPerLine));
          currentLineItems = [];
        }

        if (
          currentLineItems.length === 0 &&
          item.type === "char" &&
          isPunctuation(item.value) &&
          contentLines.length > 0
        ) {
          const prevLine = contentLines[contentLines.length - 1];
          if (prevLine.length > 0) {
            const lastItem = prevLine[prevLine.length - 1];
            if (lastItem.type === "co") {
              prevLine[prevLine.length - 1] = {
                type: "co",
                main: lastItem.main,
                sub: lastItem.sub + item.value,
              };
            } else if (lastItem.type === "char") {
              prevLine[prevLine.length - 1] = {
                type: "co",
                main: lastItem.value,
                sub: item.value,
              };
            }
            i++;
            continue;
          }
        }

        currentLineItems.push(item);
        i++;
      }
      if (currentLineItems.length > 0) {
        contentLines.push(padRowToLength(currentLineItems, colsPerLine));
      }
    }

    const allPagesLines: Item[][][] = [];
    let currentPageLines: Item[][] = [];

    // 0行目: 題名
    const row0: Item[] = Array.from({ length: colsPerLine }, createEmptyCell);
    if (title) {
      const titleItems = parseTextToItems(title);
      for (let idx = 0; idx < titleItems.length && 3 + idx < colsPerLine; idx++) {
        row0[3 + idx] = titleItems[idx];
      }
    }
    currentPageLines.push(row0);

    // 1行目: 氏名
    const row1: Item[] = Array.from({ length: colsPerLine }, createEmptyCell);
    if (name) {
      const nameItems = parseTextToItems(name);
      let startIndex = colsPerLine - 1 - nameItems.length;
      if (startIndex < 0) startIndex = 0;
      for (let idx = 0; idx < nameItems.length && startIndex + idx < colsPerLine - 1; idx++) {
        row1[startIndex + idx] = nameItems[idx];
      }
    }
    currentPageLines.push(row1);

    let contentIndex = 0;
    while (contentIndex < contentLines.length) {
      if (currentPageLines.length >= maxRows) {
        allPagesLines.push(currentPageLines);
        currentPageLines = [];
      }
      currentPageLines.push(contentLines[contentIndex]);
      contentIndex++;
    }

    if (currentPageLines.length > 0) {
      allPagesLines.push(currentPageLines);
    }

    // ページ単位で maxRows (20行/10行) になるまで空行を追加
    return allPagesLines.map((pageLines) => {
      const paddedPage = [...pageLines];
      while (paddedPage.length < maxRows) {
        paddedPage.push(Array.from({ length: colsPerLine }, createEmptyCell));
      }
      return paddedPage;
    });
  };

  const pages = isClient ? generatePages() : [];
  const charCount = text.replace(/\n/g, "").length;

  const clearAll = () => {
    setTitle("");
    setName("");
    setText("");
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // 🤖 AIチューターへのメッセージ送信ハンドラ
  const handleSendTutorMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorInput.trim() || isTutorLoading) return;

    const userMsg = tutorInput.trim();
    setTutorInput("");
    const newMessages = [...tutorMessages, { role: "user" as const, content: userMsg }];
    setTutorMessages(newMessages);
    setIsTutorLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          chatHistory: tutorMessages,
          learningPace: tutorLevel,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from AI tutor");
      }

      const data = (await response.json()) as any;
      const replyText = data.reply || "I'm here to help you with your Japanese studies!";
      setTutorMessages([...newMessages, { role: "assistant", content: replyText }]);
    } catch (err) {
      console.error(err);
      setTutorMessages([
        ...newMessages,
        { role: "assistant", content: "Sorry, I encountered an error. Please try asking again!" },
      ]);
    } finally {
      setIsTutorLoading(false);
    }
  };

  return (
    <PageLayout>
      <div className="genko-editor-root flex flex-col min-h-screen">
        <style>{`
          :root {
            --cell-size: 41px;
            --line-gap: 8px;
          }

          .genko-editor-root {
            font-family: sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f4f6f9;
            color: #333;
            position: relative;
          }

          .genko-container {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
          }

          .genko-editor-pane {
            flex: 1;
            min-width: 300px;
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }

          .genko-preview-pane {
            flex: 1.5;
            min-width: 350px;
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow-x: auto;
          }

          .genko-control-group {
            margin-bottom: 15px;
          }

          .genko-control-group label {
            display: block;
            font-weight: bold;
            margin-bottom: 5px;
            font-size: 0.9rem;
          }

          .genko-control-group input[type="text"],
          .genko-control-group textarea,
          .genko-control-group select {
            width: 100%;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-sizing: border-box;
            font-size: 1rem;
          }

          .genko-control-group textarea {
            height: 150px;
            resize: vertical;
          }

          .genko-btn-container {
            display: flex;
            gap: 10px;
            margin-top: 20px;
          }

          .genko-btn-container button {
            padding: 10px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
          }

          .genko-btn-print {
            background-color: #0066cc;
            color: #fff;
            flex: 1;
          }

          .genko-btn-print:hover {
            background-color: #0052a3;
          }

          .genko-btn-clear {
            background-color: #e0e0e0;
            color: #333;
          }

          .genko-btn-clear:hover {
            background-color: #d0d0d0;
          }

          .genko-stats {
            margin-top: 10px;
            font-size: 0.85rem;
            color: #555;
          }

          .genko-sheet {
            background: #fff;
            border: 1px solid #ccc;
            padding: 30px;
            box-sizing: border-box;
            display: inline-block;
            min-width: 100%;
            margin-bottom: 20px;
          }

          .genko-grid {
            display: flex;
            flex-direction: column;
            gap: var(--line-gap);
          }

          .genko-row {
            display: flex;
            gap: 0;
          }

          .genko-cell {
            width: var(--cell-size);
            height: var(--cell-size);
            border: 1px solid #999;
            box-sizing: border-box;
            display: flex;
            align-items: flex-end;   
            justify-content: center;   
            padding-bottom: 2mm;        
            font-size: 1.35rem;         
            line-height: 1;
            position: relative;
            background-color: #fff;
          }

          .genko-cell::after {
            content: "";
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            border: 1px dotted #ffcccc;
            pointer-events: none;
          }

          .co-cell {
            justify-content: flex-end; 
            padding-right: 2px;
          }

          .co-wrapper {
            display: flex;
            align-items: flex-end;     
            font-size: 1.35rem;         
            line-height: 1;
            transform: translateX(3mm); 
          }

          .co-main {
            display: inline-block;
          }

          .co-sub {
            display: inline-block;
            font-size: 1.35rem;         
          }

          .num-cell {
            justify-content: center;
            align-items: flex-end;
            padding-bottom: 2mm;
          }

          .num-pair {
            display: inline-flex;
            font-size: 1.2rem;
            letter-spacing: -0.5px;
            line-height: 1;
          }

          @page {
            size: B4 portrait;
            margin: 10mm;
          }

          @media print {
            body, .genko-editor-root {
              background: none !important;
              padding: 0 !important;
            }
            header,
            footer,
            .genko-editor-pane,
            .genko-btn-container,
            aside {
              display: none !important;
            }
            .genko-preview-pane {
              box-shadow: none !important;
              padding: 0 !important;
              overflow: visible !important;
            }
            .genko-sheet {
              border: none !important;
              margin: 0 !important;
              page-break-after: always;
            }
          }
        `}</style>

        {/* 🚀 ページ右上固定の上戻りボタン */}
        <ScrollTopButton />

        <div className="genko-container mt-6">
          <div className="genko-editor-pane">
            <div className="genko-control-group">
              <label htmlFor="format">用紙フォーマット</label>
              <select
                id="format"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                <option value="400">400字詰め（20字×20行）</option>
                <option value="200">200字詰め（20字×10行）</option>
              </select>
            </div>

            <div className="genko-control-group">
              <label htmlFor="titleInput">題名（タイトル）</label>
              <input
                type="text"
                id="titleInput"
                placeholder="例：日本のアニメについて"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="genko-control-group">
              <label htmlFor="nameInput">氏名</label>
              <input
                type="text"
                id="nameInput"
                placeholder="例：山田 太郎"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="genko-control-group">
              <label htmlFor="textInput">本文</label>
              <textarea
                id="textInput"
                placeholder="ここに文を書いてください。"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>

            <div className="genko-stats">文字数: {charCount}字</div>

            <div className="genko-btn-container">
              <button className="genko-btn-print" onClick={handlePrint}>
                印刷する / PDF保存
              </button>
              <button className="genko-btn-clear" onClick={clearAll}>
                消す
              </button>
            </div>
          </div>

          <div className="genko-preview-pane">
            <div>
              {isClient &&
                pages.map((pageRows, pageIdx) => (
                  <div key={pageIdx} className="genko-sheet">
                    <div className="genko-grid">
                      {pageRows.map((rowItems, rowIdx) => (
                        <div key={rowIdx} className="genko-row">
                          {rowItems.map((item, colIdx) => {
                            if (item.type === "co") {
                              return (
                                <div key={colIdx} className="genko-cell co-cell">
                                  <div className="co-wrapper">
                                    <span className="co-main">{item.main}</span>
                                    <span className="co-sub">{item.sub}</span>
                                  </div>
                                </div>
                              );
                            } else if (item.type === "num") {
                              return (
                                <div key={colIdx} className="genko-cell num-cell">
                                  <span className="num-pair">{item.value}</span>
                                </div>
                              );
                            } else if (item.type === "char") {
                              return (
                                <div key={colIdx} className="genko-cell">
                                  {item.value}
                                </div>
                              );
                            }
                            return <div key={colIdx} className="genko-cell"></div>;
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* 🤖 右下常駐・折りたたみ式 AIチューター常駐窓 */}
        <aside aria-label="AI Tutor" className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
          {!isAiTutorOpen ? (
            <button
              type="button"
              onClick={() => setIsAiTutorOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all cursor-pointer text-sm"
            >
              <span>🤖</span>
              <span>AI Tutor</span>
            </button>
          ) : (
            <div className={`bg-white border-2 border-blue-300 rounded-2xl p-5 shadow-2xl transition-all duration-200 space-y-4 ${
              isAiTutorExpanded ? "w-[90vw] sm:w-[500px] md:w-[600px]" : "w-80 sm:w-96"
            }`}>
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2 m-0">
                  <span>🤖</span> Japanese Writing AI Tutor
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsAiTutorExpanded(!isAiTutorExpanded)}
                    className="text-slate-500 hover:text-blue-700 text-xs font-bold px-2 py-1 rounded-md bg-slate-100 hover:bg-blue-50 transition cursor-pointer"
                    title={isAiTutorExpanded ? "元のサイズに戻す" : "窓を大きく広げる"}
                  >
                    {isAiTutorExpanded ? "🗗 元に戻す" : "🗖 拡大"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAiTutorOpen(false);
                      setIsAiTutorExpanded(false);
                    }}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1 rounded-md transition cursor-pointer"
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Ask questions about your writing, kanji, or get study advice!
              </p>

              {/* 学習レベル選択UI */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900">Learning Pace</span>
                <div className="inline-flex rounded-lg bg-white p-0.5 shadow-xs border border-blue-200">
                  {(["steady", "normal", "accelerated"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setTutorLevel(level)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold capitalize transition cursor-pointer ${
                        tutorLevel === level
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-blue-700"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* チャット履歴エリア */}
              <div className={`bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-y-auto space-y-2.5 transition-all duration-200 ${
                isAiTutorExpanded ? "h-96" : "h-44"
              }`}>
                {tutorMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[90%] p-2.5 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white rounded-br-xs"
                          : "bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isTutorLoading && (
                  <div className="text-xs text-slate-500 italic">🤖 AI Tutor is thinking...</div>
                )}
              </div>

              {/* 入力フォーム */}
              <form onSubmit={handleSendTutorMessage} className="flex gap-2">
                <input
                  type="text"
                  value={tutorInput}
                  onChange={(e) => setTutorInput(e.target.value)}
                  placeholder="Ask AI tutor anything..."
                  disabled={isTutorLoading}
                  className="flex-grow p-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                />
                <button
                  type="submit"
                  disabled={isTutorLoading || !tutorInput.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
                >
                  Send
                </button>
              </form>
            </div>
          )}
        </aside>
      </div>
    </PageLayout>
  );
}