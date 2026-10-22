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
 * 💡 デイリークイズのサンプルデータリスト (DAILY_QUIZZES)
 */
export const DAILY_QUIZZES: QuizItem[] = [
  {
    id: "quiz-1",
    topic: "Grammar",
    question: "Which particle is used to indicate the direct object of an action in Japanese?",
    options: ["に (ni)", "で (de)", "を (wo)", "が (ga)"],
    answer: 2,
    explanation: "The particle を (wo) marks the direct object of a transitive verb in a Japanese sentence."
  },
  {
    id: "quiz-2",
    topic: "Culture",
    question: "What is the traditional Japanese art of flower arrangement called?",
    options: ["Origami", "Ikebana", "Bonsai", "Sadou"],
    answer: 1,
    explanation: "Ikebana is the traditional Japanese art of flower arrangement, also known as kado."
  },
  {
    id: "quiz-3",
    topic: "Kanji",
    question: "What is the correct reading for the kanji '学校'?",
    options: ["がっこう (gakkou)", "せんせい (sensei)", "ともだち (tomodachi)", "きょうしつ (kyoushitsu)"],
    answer: 0,
    explanation: "学校 is read as がっこう (gakkou), which means 'school'."
  }
];

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