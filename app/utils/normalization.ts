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

/**
 * 英語の数字スペル（one〜ten）とアラビア数字の相互変換、句読点ゆれを正規化する関数
 */
export const normalizeEnglish = (str: string): string => {
  if (!str) return "";
  let s = str.trim().toLowerCase();
  
  // 末尾のピリオド、クエスチョンマーク、カンマを除去
  s = s.replace(/[?.!,]+$/, "");
  // 余分なスペースを単一スペースに
  s = s.replace(/[\s\-_]+/g, " ");

  // 数字のスペルとアラビア数字の相互統一マップ
  const numMap: { [key: string]: string } = {
    "one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
    "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10"
  };

  for (const [word, digit] of Object.entries(numMap)) {
    const regex = new RegExp(`\\b${word}\\b`, "g");
    s = s.replace(regex, digit);
  }

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