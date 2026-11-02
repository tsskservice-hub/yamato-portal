/**
 * @file genkoyoshi-engine.ts
 * @description 原稿用紙（400字詰め/200字詰め）レイアウト計算・禁則処理・文字解析ユーティリティエンジン
 */

export type Item =
  | { type: "num"; value: string }
  | { type: "char"; value: string }
  | { type: "co"; main: string; sub: string };

export type GenkoyoshiFormat = "400" | "200" | string;

export interface GenkoyoshiOptions {
  text: string;
  title?: string;
  name?: string;
  format?: GenkoyoshiFormat; // "400" = 20字×20行, "200" = 20字×10行
  colsPerLine?: number;      // デフォルト: 20
}

/**
 * 句読点・閉じ括弧等の禁則対象文字判定
 */
export const isPunctuation = (char: string): boolean => {
  return [
    "、", "。", "，", "．", "！", "？", 
    "」", "』", "）", "〕", "］", "｝", 
    "〉", "》"
  ].includes(char);
};

/**
 * 半角数字（0-9）判定
 */
export const isHalfWidthDigit = (char: string): boolean => {
  return /^[0-9]$/.test(char);
};

/**
 * 空セルオブジェクト生成
 */
export const createEmptyCell = (): Item => ({ type: "char", value: "" });

/**
 * テキストを原稿用紙マス目用Item配列に解析
 * 2桁の半角数字は1マスに2文字（type: "num"）としてペアリング
 */
export const parseTextToItems = (inputText: string): Item[] => {
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

/**
 * 1行のItem配列をcolsPerLine（デフォルト20マス）まで空セルで補填
 */
export const padRowToLength = (row: Item[], colsPerLine: number = 20): Item[] => {
  const padded = [...row];
  while (padded.length < colsPerLine) {
    padded.push(createEmptyCell());
  }
  return padded;
};

/**
 * 改行を除く純粋な文字数を計算
 */
export const calculateCharCount = (text: string): number => {
  return text.replace(/\n/g, "").length;
};

/**
 * 原稿用紙ページの2次元/3次元配列（[ページ][行][列]）を生成するコアエンジン関数
 */
export const generateGenkoyoshiPages = (options: GenkoyoshiOptions): Item[][][] => {
  const {
    text,
    title = "",
    name = "",
    format = "400",
    colsPerLine = 20,
  } = options;

  const maxRows = format === "400" ? 20 : 10;
  const paragraphs = text.split("\n");
  const contentLines: Item[][] = [];

  for (const p of paragraphs) {
    const parsedItems = parseTextToItems(p);
    // 段落冒頭のインデント処理（先頭がスペースでない場合は1マス空ける）
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

      // 1行の制限文字数に達したら改行
      if (currentLineItems.length === colsPerLine) {
        contentLines.push(padRowToLength(currentLineItems, colsPerLine));
        currentLineItems = [];
      }

      // 禁則処理：行頭に句読点が来る場合、前の行の最後のマスにぶら下げ（co cell）結合
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

  // 0行目: 題名（上を3マス空けて配置）
  const row0: Item[] = Array.from({ length: colsPerLine }, createEmptyCell);
  if (title) {
    const titleItems = parseTextToItems(title);
    for (let idx = 0; idx < titleItems.length && 3 + idx < colsPerLine; idx++) {
      row0[3 + idx] = titleItems[idx];
    }
  }
  currentPageLines.push(row0);

  // 1行目: 氏名（右詰めで一番下の1マスを空ける）
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

  // 本文行をページに割り当て
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

  // 各ページを maxRows 行まで空行で埋める
  return allPagesLines.map((pageLines) => {
    const paddedPage = [...pageLines];
    while (paddedPage.length < maxRows) {
      paddedPage.push(Array.from({ length: colsPerLine }, createEmptyCell));
    }
    return paddedPage;
  });
};
