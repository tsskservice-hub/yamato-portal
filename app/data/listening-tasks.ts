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
 * 新しいレッスンにリスニング課題を足すときは、LISTENING_TASKS にレッスンの slug をキーにして追加する。
 * 音声を作るときは、lines の text と audioPath を一覧にして generate_audio_ondoku.py で作る。
 */

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

/** レッスン（edu_lessons.slug）→ リスニング課題 */
export const LISTENING_TASKS: Record<string, ListeningTask> = {
  "family-1": FAMILY_COUNT,
  "countries-1": COUNTRIES_WHERE_FROM,
};

export function findListeningTaskForLesson(lessonSlug: string): ListeningTask | null {
  return LISTENING_TASKS[lessonSlug] ?? null;
}
