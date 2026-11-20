/**
 * @file app/data/listening-tasks.ts
 * @description リスニング課題（全レッスン共通の形）
 *
 * 1問 = 短い会話（A が聞き、B が答える）＋ 生徒がタイピングする答え。
 *   - 会話の音声は Supabase Storage の dialogue-audio バケット（lines[].audioPath）。
 *     音声ファイルが無い・読み込めない時は、ブラウザの音声合成で lines[].text を読み上げる
 *   - 答えは answers のどれかと一致すれば正解（全角半角・大文字小文字・カタカナ／ひらがな・空白のゆれは吸収）。
 *     stripPatterns で「〜からきました」「〜人家族です」などの言い足しを取り除いてから比べる
 *
 * 1つのレッスンのリスニング課題は、いくつかの「パート」でできている（語彙ドリルのモードと同じく、画面上部のタブでどれからでも始められる。
 * 全部のパートを終えるとタスク完了）。パートは2種類：
 *   - ListeningTask（会話を聞いて答えを1つタイピングする問題を、規定の数だけランダムに出す）
 *   - ListeningTablePart（少し長い音声を聞いて、英語で表を埋める）
 * 新しいレッスンにリスニング課題を足すときは、LISTENING_TASKS にレッスンの slug をキーにして、パートの配列を追加する。
 * 音声を作るときは、lines の text と audioPath を一覧にして generate_audio_ondoku.py で作る。
 */

import { normalizeEnglish } from "~/utils/normalization";

export interface ListeningLine {
  speaker: "A" | "B";
  /** 読み上げる日本語（音声合成でもこの文を読む） */
  text: string;
  /** dialogue-audio バケット内のパス（例："countries/where_from.mp3"） */
  audioPath?: string;
}

export interface ListeningItem {
  id: string;
  lines: ListeningLine[];
  /** 正解として受け付ける答え */
  answers: string[];
  /** 正解・答えの表示（例："オーストラリア (Australia)"） */
  answerLabel: string;
}

export interface ListeningTask {
  kind?: "dialogue";
  /** パートの ID（レッスンの中で重ならない名前） */
  id: string;
  /** 画面上部のタブに出す短い名前 */
  tabLabel: string;
  /** 見出し（例："How many people are in the family?"） */
  title: string;
  /** 生徒への指示（例："Listen and type where B is from."） */
  instruction: string;
  /** 解答欄の例 */
  placeholder: string;
  /** 正解した時に出す一言（{answer} が answerLabel に置きかわる） */
  correctMessage?: string;
  /** 答えを比べる前に取り除く言い足し（正規化した後の文字に対して使う） */
  stripPatterns?: RegExp[];
  /** 1回の課題で出す問題数（items からランダムに選ぶ） */
  questionsPerTask: number;
  items: ListeningItem[];
}

/** 表の1マス：決まっている文字（text）か、生徒が英語で埋める空欄（answers のどれかで正解） */
export type ListeningTableCell = { text: string } | { answers: string[]; placeholder?: string };

/** 少し長い音声を聞いて、英語で表を埋めるパート */
export interface ListeningTablePart {
  kind: "table";
  id: string;
  tabLabel: string;
  title: string;
  instruction: string;
  /** 音声（Storage のバケットとパス）。無い・読み込めない時はブラウザの音声合成で text を読み上げる */
  audio: { bucket: string; path: string; text: string };
  /** 1列目（2行目の見出し。例："how many people"） */
  rowLabel: string;
  /** 2列目から右の列：header = 1行目（人の名前）、value = 2行目（人数） */
  columns: { header: ListeningTableCell; value: ListeningTableCell }[];
}

export type ListeningPart = ListeningTask | ListeningTablePart;

/** 表の空欄の答えの比較用：大文字小文字・空白・数詞（six → 6）・「people」「san」などの言い足しをそろえる */
function normalizeTableAnswer(raw: string): string {
  return normalizeEnglish(raw || "")
    .replace(/\s*(people|persons|person)$/, "")
    .replace(/[\s-]*(san|kun|chan)$/, "")
    .replace(/\s+/g, "");
}

/** 表の空欄の答えが正解か */
export function isTableAnswerCorrect(cell: ListeningTableCell, input: string): boolean {
  if (!("answers" in cell)) return true;
  const clean = normalizeTableAnswer(input);
  return !!clean && cell.answers.some((a) => normalizeTableAnswer(a) === clean);
}

/** 比べるための正規化：全角半角・大文字小文字・カタカナ→ひらがな・空白と句読点を取り除く */
export function normalizeListeningAnswer(raw: string): string {
  return (raw || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/[\s。、.,!?！？「」"'’\-]/g, "");
}

/** 生徒の答えが正解か */
export function isListeningAnswerCorrect(task: ListeningTask, item: ListeningItem, input: string): boolean {
  let clean = normalizeListeningAnswer(input);
  for (const p of task.stripPatterns ?? []) clean = clean.replace(p, "");
  if (!clean) return false;
  return item.answers.some((a) => normalizeListeningAnswer(a) === clean);
}

// ======================================================================
// family-1：何人家族ですか（今ある音声：dialogue-audio/family/family_count_N.mp3）
// ======================================================================

const FAMILY_HIRAGANA: Record<number, string[]> = {
  1: ["ひとり"], 2: ["ふたり"], 3: ["さんにん"], 4: ["よにん"], 5: ["ごにん"],
  6: ["ろくにん"], 7: ["しちにん", "ななにん"], 8: ["はちにん"], 9: ["きゅうにん", "くにん"], 10: ["じゅうにん"],
};
const FAMILY_ROMAJI: Record<number, string[]> = {
  1: ["hitori"], 2: ["futari"], 3: ["sannin"], 4: ["yonin"], 5: ["gonin"],
  6: ["rokunin"], 7: ["shichinin", "nananin"], 8: ["hachinin"], 9: ["kyuunin", "kyunin", "kunin"], 10: ["juunin", "junin"],
};
const KANJI_NUMBERS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const ENGLISH_NUMBERS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

function familyAnswers(n: number): string[] {
  return [
    `${n}`, `${n}人`, `${n}にん`, `${n}nin`,
    KANJI_NUMBERS[n], `${KANJI_NUMBERS[n]}人`, ENGLISH_NUMBERS[n],
    ...FAMILY_HIRAGANA[n], ...FAMILY_ROMAJI[n],
  ].filter(Boolean);
}

const FAMILY_COUNT: ListeningTask = {
  id: "family-count",
  tabLabel: "Q&A: How many?",
  title: "How many people are in the family?",
  instruction: "Listen to the conversation and type the number of people.",
  placeholder: "e.g. 4 / 4人 / よにん",
  correctMessage: "{answer}",
  stripPatterns: [/(です|だ)$/, /(かぞく|家族|kazoku)$/, /(people|persons|person)$/],
  questionsPerTask: 5,
  items: Array.from({ length: 10 }, (_, i) => {
    const n = i + 1;
    return {
      id: `family_count_${n}`,
      lines: [
        { speaker: "A" as const, text: "なんにんかぞくですか。", audioPath: "family/dialogue_4fd15199-82d7-4897-a24f-79fe3cced9ed.mp3" },
        { speaker: "B" as const, text: `${FAMILY_HIRAGANA[n][0]}かぞくです。`, audioPath: `family/family_count_${n}.mp3` },
      ],
      answers: familyAnswers(n),
      answerLabel: `${n}人家族 (${FAMILY_HIRAGANA[n][0]}かぞく)`,
    };
  }),
};

/** 「わたしのかぞくは〜かぞくです。」（dialogue-audio/family-my-how-many/my_family_N.mp3。N = 2〜10） */
const FAMILY_MY_HOW_MANY: ListeningTask = {
  id: "family-my-how-many",
  tabLabel: "My family",
  title: "How many people are in my family?",
  instruction: "Listen to the person talking about their family and type the number of people.",
  placeholder: "e.g. 4 / 4人 / よにん",
  correctMessage: "{answer}",
  stripPatterns: [/(です|だ)$/, /(かぞく|家族|kazoku)$/, /(people|persons|person)$/],
  questionsPerTask: 6,
  items: Array.from({ length: 9 }, (_, i) => {
    const n = i + 2;
    return {
      id: `my_family_${n}`,
      lines: [
        { speaker: "B" as const, text: `わたしのかぞくは${FAMILY_HIRAGANA[n][0]}かぞくです。`, audioPath: `family-my-how-many/my_family_${n}.mp3` },
      ],
      answers: familyAnswers(n),
      answerLabel: `${n}人家族 (${FAMILY_HIRAGANA[n][0]}かぞく)`,
    };
  }),
};

/** 少し長い音声を聞いて表を埋める（listening-comprehension/family-1-lc.mp3） */
const FAMILY_LISTENING_COMPREHENSION: ListeningTablePart = {
  kind: "table",
  id: "family-1-lc",
  tabLabel: "Fill in the table",
  title: "Whose family is it?",
  instruction: "Listen to the talk and fill in every empty box in English (names and numbers).",
  audio: {
    bucket: "listening-comprehension",
    path: "family-1-lc.mp3",
    text: "わたしのかぞくは五人家族です。たけしのかぞくは三人家族です。まゆみのかぞくは八人家族です。リサのかぞくは六人家族です。ジョージのかぞくは四人家族です。",
  },
  rowLabel: "how many people",
  columns: [
    { header: { answers: ["Mayumi"], placeholder: "name" }, value: { text: "8" } },
    { header: { text: "Lisa" }, value: { answers: ["6", "six"], placeholder: "number" } },
    { header: { answers: ["Takeshi"], placeholder: "name" }, value: { text: "3" } },
    { header: { text: "George" }, value: { answers: ["4", "four"], placeholder: "number" } },
  ],
};

// ======================================================================
// countries-1：どこから きましたか（音声：dialogue-audio/countries/）
// ======================================================================

const COUNTRIES: { id: string; jp: string; en: string; answers: string[] }[] = [
  { id: "japan", jp: "日本", en: "Japan", answers: ["japan", "日本", "にほん", "にっぽん", "nihon", "nippon"] },
  { id: "america", jp: "アメリカ", en: "USA", answers: ["usa", "the usa", "us", "america", "united states", "the united states", "アメリカ", "amerika"] },
  { id: "canada", jp: "カナダ", en: "Canada", answers: ["canada", "カナダ", "kanada"] },
  { id: "newzealand", jp: "ニュージーランド", en: "New Zealand", answers: ["new zealand", "nz", "ニュージーランド", "nyuujiirando", "nyujiirando", "nyuujirando"] },
  { id: "australia", jp: "オーストラリア", en: "Australia", answers: ["australia", "オーストラリア", "oosutoraria", "osutoraria", "ōsutoraria"] },
  { id: "indonesia", jp: "インドネシア", en: "Indonesia", answers: ["indonesia", "インドネシア", "indoneshia"] },
  { id: "england", jp: "イギリス", en: "England", answers: ["england", "uk", "the uk", "britain", "great britain", "united kingdom", "イギリス", "igirisu"] },
];

const COUNTRIES_WHERE_FROM: ListeningTask = {
  id: "where-from",
  tabLabel: "Where from?",
  title: "Where are they from?",
  instruction: "Listen to the conversation and type the country B comes from (in English or Japanese).",
  placeholder: "e.g. Australia / オーストラリア",
  correctMessage: "{answer}から きました。",
  // 「オーストラリアからきました」「from Australia」「オーストラリアです」などの言い足しを取り除く
  stripPatterns: [/(です|だ)$/, /(から(きました|来ました|きた|来た)?|karakimashita|kara)$/, /^(from|imfrom|iamfrom|theyrefrom|heisfrom|sheisfrom)/],
  questionsPerTask: 5,
  items: COUNTRIES.map((c) => ({
    id: `where_from_${c.id}`,
    lines: [
      { speaker: "A" as const, text: "どこから きましたか。", audioPath: "countries/where_from.mp3" },
      { speaker: "B" as const, text: `${c.jp}から きました。`, audioPath: `countries/from_${c.id}.mp3` },
    ],
    answers: c.answers,
    answerLabel: `${c.jp} (${c.en})`,
  })),
};

/** レッスン（edu_lessons.slug）→ リスニング課題のパート（タブの順） */
export const LISTENING_TASKS: Record<string, ListeningPart[]> = {
  "family-1": [FAMILY_COUNT, FAMILY_MY_HOW_MANY, FAMILY_LISTENING_COMPREHENSION],
  "countries-1": [COUNTRIES_WHERE_FROM],
};

export function findListeningTaskForLesson(lessonSlug: string): ListeningPart[] | null {
  const parts = LISTENING_TASKS[lessonSlug];
  return parts && parts.length > 0 ? parts : null;
}
