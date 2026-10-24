/**
 * @file genkoyoshi-editor-vce.tsx
 * @description 原稿用紙エディター（PageLayout認証モーダル制御 & ChatYamatoGenkoyoshiEditorVce連携完全版）
 */
import React, { useState, useEffect, useRef } from "react";
import type { MetaFunction } from "@remix-run/react";
import { useNavigate, useRouteLoaderData } from "@remix-run/react";
import { supabase } from "../lib/supabaseClient";
import PageLayout, { PageLayoutRef } from "../components/PageLayout";

// 💡 専用ラッパーチャットコンポーネントをインポート
import ChatYamatoGenkoyoshiEditorVce from "../components/ChatYamatoGenkoyoshiEditorVce";

export const meta: MetaFunction = () => {
  return [
    { title: "Genkoyoshi Editor for VCE | AI Yamato Portal" },
    { name: "description", content: "VCE Japanese Genkoyoshi manuscript paper editor with instant character count, PDF export, and AI tutor support." },
  ];
};

type Item =
  | { type: "num"; value: string }
  | { type: "char"; value: string }
  | { type: "co"; main: string; sub: string };

export default function GenkoyoshiEditor() {
  const navigate = useNavigate();

  // 💡 PageLayout の ref 参照用（認証モーダル制御）
  const layoutRef = useRef<PageLayoutRef>(null);

  // 💡 root.tsx からグローバルデータを安全に取得
  const rootData = useRouteLoaderData("root") as {
    user?: any;
    credits?: number;
    nickname?: string;
  } | undefined;

  const [format, setFormat] = useState<string>("400");
  const [title, setTitle] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [isClient, setIsClient] = useState<boolean>(false);

  const [user, setUser] = useState<any>(rootData?.user ?? null);
  const [credits, setCredits] = useState<number>(rootData?.credits ?? 10);
  const [nickname, setNickname] = useState<string>(rootData?.nickname ?? "");

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 💡 rootData が更新された場合にステートを同期
  useEffect(() => {
    if (rootData) {
      if (rootData.user !== undefined) setUser(rootData.user);
      if (rootData.credits !== undefined) setCredits(rootData.credits);
      if (rootData.nickname !== undefined) setNickname(rootData.nickname);
    }
  }, [rootData]);

  // 💡 Auth and session handling
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isPunctuation = (char: string): boolean => {
    return ["、", "。", "，", "．", "！", "？", "」", "』", "）", "〕", "］", "｝", "』", "〉", "》"].includes(char);
  };

  const isHalfWidthDigit = (char: string): boolean => {
    return /^[1-9]$/.test(char);
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

  const createEmptyCell = (): Item => ({ type: "char", value: "" });

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

    const row0: Item[] = Array.from({ length: colsPerLine }, createEmptyCell);
    if (title) {
      const titleItems = parseTextToItems(title);
      for (let idx = 0; idx < titleItems.length && 3 + idx < colsPerLine; idx++) {
        row0[3 + idx] = titleItems[idx];
      }
    }
    currentPageLines.push(row0);

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

  return (
    <PageLayout 
      ref={layoutRef}
      user={user} 
      credits={credits} 
      nickname={nickname}
      breadcrumbTitle="Genkoyoshi Editor for VCE"
    >
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

        {/* 💡 右下常駐チャット：専用ラッパーコンポーネントを配置（Supabase YAMATO_CONFIGS の色・枠線が自動連動） */}
        <ChatYamatoGenkoyoshiEditorVce
          userId={user?.id}
          userNickname={nickname || (user?.email ? user.email.split('@') : "Student")}
          credits={credits}
          onOpenAuth={(mode) => layoutRef.current?.openAuthModal?.(mode || "signin")}
        />
      </div>
    </PageLayout>
  );
}