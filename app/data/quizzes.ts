// src/data/quizzes.ts

export type QuizItem = {
  id: string;
  date: string; // "YYYY-MM-DD" 形式
  question: string;
  options: string[];
  answer: number; // 正解のインデックス (0始まり)
  explanation: string;
};

export const DAILY_QUIZZES: QuizItem[] = [
  {
    id: "q-001",
    date: "2026-10-12",
    question: "日本の伝統的な挨拶「いただきます」の意味として最も適切なものはどれですか？",
    options: [
      "料理を作ってくれた人への感謝",
      "食材（命）の恵みや、作ってくれた人への感謝",
      "ただの食事前の決まり文句",
      "お腹が空いたという合図"
    ],
    answer: 1,
    explanation: "「いただきます」は、動物や植物の命をいただくことへの畏敬の念と、生産者や調理者への感謝を表す美しい日本の言葉です。"
  },
  {
    id: "q-002",
    date: "2026-10-13",
    question: "日本語の数え方で、薄くて平らなもの（紙や切手、シャツなど）を数えるときに使う助数詞はどれですか？",
    options: [
      "本（ほん）",
      "枚（まい）",
      "匹（ひき）",
      "個（こ）"
    ],
    answer: 1,
    explanation: "紙、切手、衣類、お皿などの薄い平らなものは「〜枚（まい）」を使って数えます。"
  },
  {
    id: "q-003",
    date: "2026-10-14",
    question: "次のうち、日本の「祝日」ではないものはどれですか？",
    options: [
      "海の日",
      "山の日",
      "川の日",
      "こどもの日"
    ],
    answer: 2,
    explanation: "「海の日」「山の日」「こどもの日」はすべて日本の国民の祝日ですが、「川の日」は祝日ではありません（7月7日などは「川の日」の記念日として制定されていますが祝日ではありません）。"
  },
  {
    id: "q-004",
    date: "2026-10-15",
    question: "日本語の敬語で、自分の動作について使う「謙譲語（けんじょうご）」に該当するものはどれですか？",
    options: [
      "いらっしゃる",
      "おっしゃる",
      "伺う（うかがう）",
      "ご覧になる"
    ],
    answer: 2,
    explanation: "「伺う」は「行く」「聞く」の謙譲語です。「いらっしゃる」「おっしゃる」「ご覧になる」は尊敬語になります。"
  },
  {
    id: "q-005",
    date: "2026-10-16",
    question: "日本で春の季節を代表する花といえば、桜（さくら）ですが、秋の紅葉（こうよう）のシーズンに美しく色づく代表的な木はどれですか？",
    options: [
      "ひまわり",
      "もみじ（楓）",
      "あじさい",
      "梅"
    ],
    answer: 1,
    explanation: "秋になると葉が赤や黄色に色づく「もみじ（楓）」は、日本の秋の代名詞であり、紅葉狩りなどで親しまれています。"
  }
];

/**
 * 本日の日付（YYYY-MM-DD）に対応するクイズを取得するヘルパー関数
 * 一致するものがない場合は配列の最初の要素を返します。
 */
export function getTodayQuiz(): QuizItem {
  const todayStr = new Date().toISOString().split('T')[0];
  const matched = DAILY_QUIZZES.find(q => q.date === todayStr);
  return matched || DAILY_QUIZZES[0];
}