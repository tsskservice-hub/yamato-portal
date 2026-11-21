/**
 * @file lookalike-sets.ts
 * @description 似ている文字のテスト（/test/lookalike）の組み合わせと、かなのローマ字
 *
 * ・かなのローマ字は 1 つだけ（shi, chi, tsu, fu, ji, wo, n）。
 * ・漢字の答えは kl_character.meaning ＋ EXTRA_ANSWERS（漢字テストと同じ。~/lib/kanji-meaning-check）。
 * ・漢字は VCE 200 字に入っている字だけを使う。
 * ・byUser: true は運営者（先生）が指定した組み合わせ。false は追加で用意した組み合わせ。
 * ・ブラウザとサーバー（/api/test-attempts の答え合わせ）の両方で使う。
 */

export type LookalikeType = 'hiragana' | 'katakana' | 'kanji';

export interface LookalikeSet {
  chars: string[];
  byUser: boolean;
}

export const LOOKALIKE_TEST_KEYS: Record<LookalikeType, string> = {
  hiragana: 'lookalike-hiragana',
  katakana: 'lookalike-katakana',
  kanji: 'lookalike-kanji',
};

export const LOOKALIKE_LABELS: Record<LookalikeType, { title: string; jp: string; answer: string }> = {
  hiragana: { title: 'Hiragana', jp: 'ひらがな', answer: 'romaji' },
  katakana: { title: 'Katakana', jp: 'カタカナ', answer: 'romaji' },
  kanji: { title: 'Kanji', jp: '漢字', answer: 'English meaning' },
};

/** 目標（1 文字の平均秒数）。target 以下 = Excellent、good 以下 = Very good */
export const LOOKALIKE_TARGETS: Record<LookalikeType, { target: number; good: number }> = {
  hiragana: { target: 2, good: 3 },
  katakana: { target: 2, good: 3 },
  kanji: { target: 3, good: 4 },
};

const s = (chars: string, byUser: boolean): LookalikeSet => ({ chars: [...chars], byUser });

export const LOOKALIKE_SETS: Record<LookalikeType, LookalikeSet[]> = {
  hiragana: [
    s('しつ', true),
    s('はほ', true),
    s('しも', true),
    s('いこ', true),
    s('われ', true),
    s('ねれ', false),
    s('ぬめ', false),
    s('るろ', false),
    s('さち', false),
    s('きさ', false),
    s('あお', false),
    s('まも', false),
    s('いり', false),
    s('けは', false),
  ],
  katakana: [
    s('クワウ', true),
    s('ニエ', true),
    s('シツ', true),
    s('スヌ', true),
    s('マム', true),
    s('ナメ', true),
    s('ソン', false),
    s('シソ', false),
    s('ツン', false),
    s('チテ', false),
    s('コユ', false),
    s('アマ', false),
    s('ルレ', false),
    s('タク', false),
    s('フワ', false),
  ],
  kanji: [
    s('田口', true),
    s('持待寺', true),
    s('聞間', true),
    s('自目日', true),
    s('人入八', true),
    s('十千', true),
    s('週道', true),
    s('電雪', true),
    s('大犬天', true),
    s('午牛', true),
    s('白百', true),
    s('木本休体', false),
    s('東車', false),
    s('買売読', false),
    s('言話語', false),
    s('右左', false),
    s('今会', false),
  ],
};

/** かな → ローマ字（1 つだけ） */
const KANA_ROWS: [string, string, string[]][] = [
  ['あいうえお', 'アイウエオ', ['a', 'i', 'u', 'e', 'o']],
  ['かきくけこ', 'カキクケコ', ['ka', 'ki', 'ku', 'ke', 'ko']],
  ['さしすせそ', 'サシスセソ', ['sa', 'shi', 'su', 'se', 'so']],
  ['たちつてと', 'タチツテト', ['ta', 'chi', 'tsu', 'te', 'to']],
  ['なにぬねの', 'ナニヌネノ', ['na', 'ni', 'nu', 'ne', 'no']],
  ['はひふへほ', 'ハヒフヘホ', ['ha', 'hi', 'fu', 'he', 'ho']],
  ['まみむめも', 'マミムメモ', ['ma', 'mi', 'mu', 'me', 'mo']],
  ['やゆよ', 'ヤユヨ', ['ya', 'yu', 'yo']],
  ['らりるれろ', 'ラリルレロ', ['ra', 'ri', 'ru', 're', 'ro']],
  ['わをん', 'ワヲン', ['wa', 'wo', 'n']],
];

export const KANA_ROMAJI: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [h, k, r] of KANA_ROWS) {
    [...h].forEach((c, i) => (map[c] = r[i]));
    [...k].forEach((c, i) => (map[c] = r[i]));
  }
  return map;
})();

/** ローマ字の答えを比べる形にする（大文字・小文字、空白は区別しない） */
export function normalizeRomaji(input: string): string {
  return input.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
}

export function isCorrectRomaji(kana: string, input: string): boolean {
  const want = KANA_ROMAJI[kana];
  return Boolean(want) && normalizeRomaji(input) === want;
}

/** そのテストで使う文字（重なりなし） */
export function lookalikeChars(type: LookalikeType): string[] {
  return [...new Set(LOOKALIKE_SETS[type].flatMap((set) => set.chars))];
}

export function isLookalikeType(v: unknown): v is LookalikeType {
  return v === 'hiragana' || v === 'katakana' || v === 'kanji';
}
