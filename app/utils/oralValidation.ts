/**
 * @file oralValidation.ts
 * @description Elaborate学習における「有効な1文」の評価・判定ロジック
 */

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * 有効な1文かどうかを判定する関数
 * - 英語（アルファベット）が含まれる場合はNG
 * - 10文字未満はNG
 * - 「はい」「いいえ」などの一言応答はNG
 */
export const validateSentence = (text: string): ValidationResult => {
  const trimmed = text.trim();

  if (!trimmed) {
    return { isValid: false, reason: "未入力です" };
  }

  // 1. 英語・アルファベットの検知（厳禁）
  if (/[a-zA-Zａ-ｚＡ-Ｚ]/.test(trimmed)) {
    return {
      isValid: false,
      reason: "英語は使用できません。日本語で入力してください。",
    };
  }

  // 2. 文字数チェック（10文字以上）
  if (trimmed.length < 10) {
    return {
      isValid: false,
      reason: `10文字以上必要です（現在 ${trimmed.length} 文字）`,
    };
  }

  // 3. NGワード（一言・単一の応答）の除外
  const forbiddenShorts = [
    "はい",
    "いいえ",
    "はい。",
    "いいえ。",
    "そうですね",
    "たしかに",
    "わかりません",
    "わかりません。",
    "ないです",
    "ありません",
    "そうです",
  ];
  if (forbiddenShorts.includes(trimmed)) {
    return {
      isValid: false,
      reason: "「はい」「いいえ」などの一言ではなく、文章で入力してください。",
    };
  }

  return { isValid: true };
};

/**
 * 配列形式または文字列内の「有効な1文」の総数をカウントする関数
 */
export const countValidSentences = (sentences: string[]): number => {
  return sentences.filter((s) => validateSentence(s).isValid).length;
};