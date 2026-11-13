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