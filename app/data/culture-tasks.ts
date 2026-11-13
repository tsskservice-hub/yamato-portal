/**
 * @file app/data/culture-tasks.ts
 * @description 各レッスンの文化タスク（紙芝居カード＋ナレーション字幕＋選択式クイズ）の内容
 *
 * 新しいレッスンを足すときは CULTURE_TASKS にレッスンの slug をキーにして追加する。
 * - カード画像：public/images/picture-story/ に置く
 * - ナレーション音声：Supabase Storage の picture-story-audio バケットに置く
 *   （音声ファイルが見つからない時は、ブラウザの合成音声で narration を読み上げる）
 */

const PICTURE_STORY_AUDIO_BASE =
  "https://ybquwzoreecxxbewjpdn.supabase.co/storage/v1/object/public/picture-story-audio";

export interface CultureCard {
  /** カードの見出し（例：Names tell a story） */
  title: string;
  /** カード画像のパス（public からの絶対パス） */
  imageUrl: string;
  /** 画像の代替テキスト */
  imageAlt: string;
  /** ナレーション音声の URL */
  audioUrl: string;
  /**
   * ナレーションの英文（字幕として表示する）。
   * 1要素 = 字幕1行。音声の長さに合わせて、文字数の割合で順に切り替わる。
   */
  narration: string[];
}

export interface CultureQuestion {
  question: string;
  /** 選択肢（表示時に順番をシャッフルする） */
  options: string[];
  /** options の中の正解の位置（0 始まり） */
  answerIndex: number;
  /** 正解後に出す短い解説 */
  explanation: string;
  /** まちがえた時のヒント（どのカードを見ればよいか。1 始まり） */
  hintCard: number;
}

export interface CultureTask {
  title: string;
  cards: CultureCard[];
  /** カードを見終わった後の「考えてみよう」（採点しない） */
  thinkAbout?: string;
  questions: CultureQuestion[];
}

const audio = (file: string) => `${PICTURE_STORY_AUDIO_BASE}/${file}`;

export const CULTURE_TASKS: Record<string, CultureTask> = {
  "obento-unit-4-lesson-1": {
    title: "Japanese Names – Then and Now",
    cards: [
      {
        title: "Names tell a story",
        imageUrl: "/images/picture-story/U4-card-1.webp",
        imageAlt: "Parents holding up the kanji 名 (name) next to their new baby, with a timeline from 1912 to 2025",
        audioUrl: audio("names_01.mp3"),
        narration: [
          "In Japan, most names are written in kanji.",
          "Parents choose kanji for both their sound and their meaning.",
          "Every year, a Japanese company publishes a list of the most popular baby names.",
          "The list goes all the way back to 1912, so we can see how names have changed over 100 years.",
        ],
      },
      {
        title: "Your great-grandparents' time (1910s–1930s)",
        imageUrl: "/images/picture-story/U4-card-2.webp",
        imageAlt: "Children in kimono and a school uniform in front of a Shōwa-era house, with the kanji 子, 幸 and 清 (Kazuko, Sachiko, Kiyoshi)",
        audioUrl: audio("names_02.mp3"),
        narration: [
          "Many girls' names ended in -ko (子), which means \"child\".",
          "Two of the most popular were Kazuko and Sachiko (幸 = happiness).",
          "Kazuko became very popular after 1926, when a new era called Shōwa (昭和) began.",
          "Parents borrowed the kanji 和 (peace) from the era's name.",
          "Popular boys' names included Kiyoshi and Shigeru.",
        ],
      },
      {
        title: "Your parents' time (1980s)",
        imageUrl: "/images/picture-story/U4-card-3.webp",
        imageAlt: "Two children in a 1980s room with a cassette player and an old TV, under a poster of the kanji 愛 (love) and a No.1 1983 badge",
        audioUrl: audio("names_03.mp3"),
        narration: [
          "Names ending in -ko slowly became less common.",
          "In 1983, Ai (愛 = love) became the No.1 girls' name, and the \"-ko era\" came to an end.",
          "Popular names in the 1980s included Mai for girls and Kenta for boys.",
        ],
      },
      {
        title: "Today",
        imageUrl: "/images/picture-story/U4-card-4.webp",
        imageAlt: "Banners with the kanji 湊 (harbour), 翠 (jade green), 結 (to connect) and 翔 (to soar) above a baseball field by a harbour",
        audioUrl: audio("names_04.mp3"),
        narration: [
          "Short, one-kanji names that come from nature are popular now.",
          "In 2025, the top names were Minato (湊 = harbour) for boys and Sui (翠 = jade green) for girls.",
          "Big events also shape names.",
          "After the 2011 earthquake, the kanji 結 (to connect) became popular, as in Yua.",
          "Since baseball star Shohei Ohtani won MVP in 2021, 翔 (to soar) has been the most popular kanji in boys' names.",
        ],
      },
    ],
    thinkAbout: "What names were popular when your grandparents were born?",
    questions: [
      {
        question: "What does the name ending -ko (子) mean?",
        options: ["flower", "child", "beautiful", "sea"],
        answerIndex: 1,
        explanation: "子 (-ko) means \"child\". Many girls' names ended in -ko in your great-grandparents' time.",
        hintCard: 2,
      },
      {
        question: "Why did the name Kazuko become popular after 1926?",
        options: [
          "A famous singer had that name",
          "A new era, Shōwa, began, and 和 comes from its name",
          "It was the Emperor's name",
          "It was easy to write",
        ],
        answerIndex: 1,
        explanation: "The Shōwa (昭和) era began in 1926, and parents borrowed the kanji 和 (peace) from its name.",
        hintCard: 2,
      },
      {
        question: "Which name would most likely belong to a great-grandmother?",
        options: ["Sui", "Yua", "Sachiko", "Ai"],
        answerIndex: 2,
        explanation: "Sachiko ends in -ko and was one of the most popular names in the 1910s–1930s.",
        hintCard: 2,
      },
      {
        question: "Which girls' name became No.1 in 1983 and ended the \"-ko era\"?",
        options: ["Kazuko", "Ai", "Mai", "Sui"],
        answerIndex: 1,
        explanation: "In 1983, Ai (愛 = love) became the No.1 girls' name.",
        hintCard: 3,
      },
      {
        question: "Why has the kanji 翔 (to soar) been so popular for boys recently?",
        options: [
          "It is the easiest kanji",
          "Parents admire Shohei Ohtani",
          "It was in a famous anime",
          "It means \"Japan\"",
        ],
        answerIndex: 1,
        explanation: "Since Shohei Ohtani (大谷翔平) won MVP in 2021, 翔 has been the most popular kanji in boys' names.",
        hintCard: 4,
      },
      {
        question: "Which statement best describes popular names today?",
        options: [
          "Most girls' names end in -ko",
          "Short names inspired by nature are popular",
          "Names are only written in hiragana",
          "Names never change",
        ],
        answerIndex: 1,
        explanation: "Short, one-kanji names from nature, like Minato (湊) and Sui (翠), are popular today.",
        hintCard: 4,
      },
    ],
  },
};
