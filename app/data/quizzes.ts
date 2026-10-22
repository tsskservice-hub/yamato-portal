/**
 * @file quizzes.ts
 * @description Type definitions and helper functions for Daily Quizzes and Japanese Cultural trivia (Yamato Portal)
 */

export type QuizItem = {
  id: string;
  topic: string;
  date?: string; // 日付指定は任意（必要に応じて残す・削除可能）
  question: string;
  options: string[];
  answer: number; // 正解のインデックス (0始まり)
  explanation: string;
  images?: string[];
};

/**
 * 全トピック（Supabase等から取得したクイズ配列）からランダムに1つのクイズを取得する関数
 * @param quizzes List of quiz items fetched from Supabase
 */
export function getRandomQuiz(quizzes: QuizItem[]): QuizItem | null {
  if (!quizzes || quizzes.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * quizzes.length);
  return quizzes[randomIndex];
}

/**
 * 指定された数だけ重複なくランダムなクイズの配列を取得したい場合の便利なヘルパー関数
 * @param quizzes List of quiz items fetched from Supabase
 * @param count Number of quizzes to retrieve
 */
export function getRandomQuizzes(quizzes: QuizItem[], count: number): QuizItem[] {
  if (!quizzes || quizzes.length === 0) return [];
  const shuffled = [...quizzes].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.max(1, Math.min(count, shuffled.length)));
}