/**
 * @file app/utils/normalization.ts
 * @description 日本語・英語のスマート表記ゆれ対応（正規化）およびひらがな変換ヘルパー関数群
 */

/**
 * 日本語の数字・漢数字・助数詞・漢字・ひらがな・カタカナの適切な表記ゆれを正規化する関数
 */
export const normalizeJapanese = (str: string): string => {
  if (!str) return "";
  let s = str.trim().toLowerCase();
  
  // 句読点やスペース、記号の除去
  s = s.replace(/[?.!,。、・\s]+/g, "");

  // 漢字 ⇔ ひらがな、数字・カウンターの適切な相互変換マップ
  const map: { [key: string]: string } = {
    // 疑問詞の正確な表記ゆれ（「何に」などの誤認は含めない）
    "何人": "なんにん",
    "なん人": "なんにん",
    "何": "なん",
    // 数字・漢数字
    "１": "1", "一": "1", "ひと": "1", "いち": "1",
    "２": "2", "二": "2", "ふた": "2", "に": "2",
    "３": "3", "三": "3", "みっ": "3", "さん": "3",
    "４": "4", "四": "4", "よん": "4", "し": "4", "よ": "4",
    "５": "5", "五": "5", "いつ": "5", "ご": "5",
    "６": "6", "六": "6", "むっ": "6", "ろく": "6",
    "７": "7", "七": "7", "なな": "7", "しち": "7",
    "８": "8", "八": "8", "やっ": "8", "はち": "8",
    "９": "9", "九": "9", "ここの": "9", "きゅう": "9", "く": "9",
    "１０": "10", "十": "10", "とお": "10", "じゅう": "10",
    // カウンター
    "人": "にん", "ニン": "にん",
    "匹": "ひき", "才": "さい", "歳": "さい", "本": "ほん", "個": "こ"
  };

  for (const [key, val] of Object.entries(map)) {
    s = s.split(key).join(val);
  }

  // 特殊読みの統一
  s = s.replace(/ひとり/g, "1人");
  s = s.replace(/ふたり/g, "2人");

  return s;
};

// 英語の数詞 → 数値
const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const SCALE_WORDS: Record<string, number> = { hundred: 100, thousand: 1000 };

const isNumberWord = (w: string) => w in NUMBER_WORDS || w in SCALE_WORDS;

/**
 * 文中の英語の数詞の並びを算用数字に変換する。
 * 例: "eight people" → "8 people", "twenty-one" → "21", "one hundred and five yen" → "105 yen"
 */
export const numberWordsToDigits = (input: string): string => {
  // twenty-one のようなハイフンつなぎを分割（数詞どうしの場合のみ）
  const s = input.replace(/\b([a-z]+)-([a-z]+)\b/g, (m, a, b) =>
    isNumberWord(a) && isNumberWord(b) ? `${a} ${b}` : m
  );

  const tokens = s.split(" ");
  const out: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    if (!isNumberWord(tokens[i])) {
      out.push(tokens[i]);
      i++;
      continue;
    }
    let total = 0;
    let current = 0;
    while (i < tokens.length) {
      const t = tokens[i];
      if (t in NUMBER_WORDS) {
        current += NUMBER_WORDS[t];
      } else if (t === "hundred") {
        current = (current || 1) * 100;
      } else if (t === "thousand") {
        total += (current || 1) * 1000;
        current = 0;
      } else if (t === "and" && i + 1 < tokens.length && tokens[i + 1] in NUMBER_WORDS && (total > 0 || current >= 100)) {
        // "one hundred and five" の and は読み飛ばす
      } else {
        break;
      }
      i++;
    }
    out.push(String(total + current));
  }
  return out.join(" ");
};

/** カタカナ → ひらがな（ー などの記号はそのまま） */
export const katakanaToHiragana = (str: string): string =>
  (str || "").replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

/** 日本語の答えの比較用：全角半角・空白・句読点・〜 のゆれを取り除く */
const cleanJapaneseAnswer = (str: string): string =>
  (str || "").normalize("NFKC").trim().replace(/[\s。、.,!?！？〜~]/g, "");

/** ローマ字の答えの比較用：大文字小文字・空白・ハイフン・アポストロフィのゆれを取り除く */
const cleanRomajiAnswer = (str: string): string =>
  (str || "").normalize("NFKC").trim().toLowerCase().replace(/[\s'’\-.,!?]/g, "");

const KANJI_DIGITS: Record<string, number> = { 〇: 0, 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

/** 漢数字の並び（例：十、二十四、百五、三千）を数にする。読めなければ null */
function kanjiNumberToInt(run: string): number | null {
  // 「一二三四」のように位取りの字が無い並び（電話番号など）は、1字ずつ数字にする
  if (!/[十百千]/.test(run)) {
    const digits = [...run].map((c) => KANJI_DIGITS[c]);
    return digits.every((d) => d !== undefined) ? Number(digits.join("")) : null;
  }
  let total = 0;
  let current = 0;
  for (const ch of run) {
    if (ch in KANJI_DIGITS) {
      current = KANJI_DIGITS[ch];
    } else {
      const unit = ch === "十" ? 10 : ch === "百" ? 100 : ch === "千" ? 1000 : 0;
      if (!unit) return null;
      total += (current || 1) * unit;
      current = 0;
    }
  }
  return total + current;
}

/**
 * 数字の書き方をそろえる：全角数字→半角、漢数字→算用数字（十人 → 10人、二十日 → 20日、１０人 → 10人）。
 * 音声認識は「十人」を「10人」と書き出すことが多いので、日本語の答えはこの形で比べる（全レッスン共通）
 */
export function unifyJapaneseNumbers(str: string): string {
  return (str || "")
    .normalize("NFKC")
    .replace(/[〇零一二三四五六七八九十百千]+/g, (run) => {
      const n = kanjiNumberToInt(run);
      return n === null ? run : String(n);
    });
}

// ---------- 数字の答え（数字＋助数詞）をひとつの形にする ----------

const DIGIT_READINGS: Record<number, string[]> = {
  0: ["れい", "ぜろ"], 1: ["いち"], 2: ["に"], 3: ["さん"], 4: ["よん", "し", "よ"], 5: ["ご"],
  6: ["ろく"], 7: ["なな", "しち"], 8: ["はち"], 9: ["きゅう", "く"],
};
const TENS_PREFIX: Record<number, string[]> = {
  1: [""], 2: ["に"], 3: ["さん"], 4: ["よん"], 5: ["ご"], 6: ["ろく"], 7: ["なな"], 8: ["はち"], 9: ["きゅう"],
};
/** 「さい」の前の音の変化（いっさい・はっさい・じゅっさい） */
const GEMINATE: Record<string, string> = { いち: "いっ", はち: "はっ", じゅう: "じゅっ" };

/** ひらがなの数の読み（0〜99）→ 数。「じゅういっ」のような音の変化した形も入れる */
const READING_TO_NUMBER: Map<string, number> = (() => {
  const map = new Map<string, number>();
  const add = (reading: string, n: number) => {
    if (!map.has(reading)) map.set(reading, n);
    for (const [from, to] of Object.entries(GEMINATE)) {
      if (reading.endsWith(from)) {
        const g = reading.slice(0, -from.length) + to;
        if (!map.has(g)) map.set(g, n);
      }
    }
    if (reading.endsWith("じゅう")) map.set(reading.slice(0, -3) + "じっ", n);
  };
  for (let n = 0; n <= 9; n++) DIGIT_READINGS[n].forEach((r) => add(r, n));
  for (let t = 1; t <= 9; t++) {
    for (const prefix of TENS_PREFIX[t]) {
      add(`${prefix}じゅう`, t * 10);
      for (let d = 1; d <= 9; d++) DIGIT_READINGS[d].forEach((r) => add(`${prefix}じゅう${r}`, t * 10 + d));
    }
  }
  return map;
})();

/** 助数詞（漢字・ひらがな）→ そろえた形 */
const COUNTERS: Array<[RegExp, string]> = [
  [/(さい|歳|才)$/, "さい"],
  [/(にん|人)$/, "にん"],
];
/** 数と助数詞がひとまとまりになった特別な読み */
const SPECIAL_NUMBER_WORDS: Record<string, string> = {
  はたち: "20:さい", ひとり: "1:にん", ふたり: "2:にん",
};

/**
 * 答え全体が「数（＋助数詞）」なら "10:にん" のような形にする（そうでなければ null）。
 * 例：十人／10人／１０人／じゅうにん → "10:にん"、じゅういっさい／11歳 → "11:さい"、じゅういち／11／十一 → "11:"
 */
export function japaneseNumberKey(raw: string): string | null {
  let s = katakanaToHiragana(unifyJapaneseNumbers(raw || ""))
    .toLowerCase()
    .replace(/[\s。、.,!?！？〜~]/g, "")
    .replace(/です$/, "");
  if (!s) return null;
  if (SPECIAL_NUMBER_WORDS[s]) return SPECIAL_NUMBER_WORDS[s];

  let counter = "";
  for (const [re, name] of COUNTERS) {
    if (re.test(s)) {
      s = s.replace(re, "");
      counter = name;
      break;
    }
  }
  if (!s) return null;
  if (/^\d+$/.test(s)) return `${Number(s)}:${counter}`;
  const n = READING_TO_NUMBER.get(s);
  return n === undefined ? null : `${n}:${counter}`;
}

/** 2つの日本語の答えが、同じ数（＋同じ助数詞）を表しているか（十人 ＝ 10人 ＝ じゅうにん） */
export function sameJapaneseNumber(a: string, b: string): boolean {
  const ka = japaneseNumberKey(a);
  return ka !== null && ka === japaneseNumberKey(b);
}

/**
 * 日本語で答える問題の正誤判定（全レッスン共通）
 * 次のどれかと一致すれば正解：
 * - jp_text（漢字・かな表記。例：二人）
 * - jp_kana（読み。例：ふたり）／その読みをひらがなにしたもの（ロクニン → ろくにん）
 * - romaji（"rei / zero" のように / 区切りの別解にも対応）
 * - 数字の書き方の違い（十人 ＝ 10人 ＝ １０人）は同じとみなす
 * ※ ペット のようなカタカナ語は、ひらがな（ぺっと）では正解にしない
 */
export const matchesJapaneseAnswer = (
  input: string,
  item: { jp_text?: string | null; jp_kana?: string | null; romaji?: string | null }
): boolean => {
  const jp = cleanJapaneseAnswer(input);
  if (!jp) return false;

  const kanaCandidates = [item.jp_text, item.jp_kana, katakanaToHiragana(item.jp_kana || "")]
    .map((c) => cleanJapaneseAnswer(c || ""))
    .filter(Boolean);
  if (kanaCandidates.includes(jp)) return true;

  // 数字の書き方の違いは同じとみなす（十人 ＝ 10人 ＝ １０人）
  const jpNum = unifyJapaneseNumbers(jp);
  if (kanaCandidates.some((c) => unifyJapaneseNumbers(c) === jpNum)) return true;
  // 数の答えは、読み方・書き方の違いを同じとみなす（じゅうにん ＝ 10人、じゅういっさい ＝ 11歳）
  if (kanaCandidates.some((c) => sameJapaneseNumber(jp, c))) return true;

  const romaji = cleanRomajiAnswer(input);
  const romajiCandidates = (item.romaji || "")
    .split("/")
    .map(cleanRomajiAnswer)
    .filter(Boolean);
  return romajiCandidates.includes(romaji);
};

/**
 * 英語の答えの表記ゆれを正規化する関数（全レッスン共通）
 * - 大文字小文字・末尾の句読点・空白／ハイフンのゆれを吸収
 * - 桁区切りカンマを除去（3,000 → 3000）
 * - 英語の数詞を算用数字にそろえる（eight people ⇔ 8 people、twenty-one ⇔ 21、three thousand ⇔ 3000）
 */
export const normalizeEnglish = (str: string): string => {
  if (!str) return "";
  let s = str.trim().toLowerCase();

  // 末尾のピリオド、クエスチョンマーク、カンマを除去
  s = s.replace(/[?.!,]+$/, "");
  // 桁区切りカンマを除去
  s = s.replace(/(\d),(?=\d{3}\b)/g, "$1");
  // 余分なスペース・ハイフン・アンダースコアを単一スペースに
  s = s.replace(/[\s\-_]+/g, " ").trim();
  // 英語の数詞 → 算用数字
  s = numberWordsToDigits(s);

  return s.trim();
};

/**
 * 音声認識されたテキスト等の漢字・数字をひらがなベースの表示用に変換する関数
 */
export const toHiragana = (str: string): string => {
  if (!str) return "";
  let s = str.trim();

  // 画面表示用の漢字・数字 ⇒ ひらがな変換マップ
  const kanaMap: { [key: string]: string } = {
    "何人": "なんにん",
    "何": "なん",
    "人": "にん",
    "一": "いち", "二": "に", "三": "さん", "四": "よん", "五": "ご",
    "六": "ろく", "七": "なな", "八": "はち", "九": "きゅう", "十": "じゅう",
    "１": "いち", "２": "に", "３": "さん", "４": "よん", "５": "ご",
    "６": "ろく", "７": "なな", "８": "はち", "９": "きゅう", "１０": "じゅう",
    "1": "いち", "2": "に", "3": "さん", "4": "よん", "5": "ご",
    "6": "ろく", "7": "なな", "8": "はち", "9": "きゅう", "10": "じゅう"
  };

  for (const [key, val] of Object.entries(kanaMap)) {
    s = s.split(key).join(val);
  }

  return s;
};
/**
 * 英語の答えの候補（english_text を「/」で区切ったもの。例："watch / look / see" → 3つ）。
 * 区切らない全体も候補に入れる（"1 person" などは今までどおり）。全レッスン共通。
 */
export function englishAnswerOptions(englishText: string): string[] {
  const full = normalizeEnglish(englishText || "");
  const parts = (englishText || "").split("/").map((p) => normalizeEnglish(p)).filter(Boolean);
  return [...new Set([full, ...parts])].filter(Boolean);
}

/** 英語の答えが合っているか（english_text の「/」区切りのどれかと一致すれば正解） */
export function matchesEnglishAnswer(input: string, englishText: string): boolean {
  const clean = normalizeEnglish(input || "");
  return Boolean(clean) && englishAnswerOptions(englishText).includes(clean);
}
