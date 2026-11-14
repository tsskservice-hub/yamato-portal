/**
 * @file app/data/culture-tasks.ts
 * @description 各レッスンの文化タスク（紙芝居カード＋ナレーション字幕＋選択式クイズ）の内容
 *
 * 新しい文化タスクを足すときは、CULTURE_TASKS にタスクの ID（例：natural-disasters）をキーにして追加する。
 * - 追加したタスクは文化ページ（/culture）に自動で並ぶ
 * - レッスンで使う時は、そのタスクの lessons にレッスンの slug を書く。
 *   レッスンページは findCultureTaskForLesson(slug) で自分の文化タスクを見つける。
 *   /culture でタスクを終えた生徒（ログイン中）は、lessons のレッスンの文化タスクも完了になる
 * （タスクの ID はレッスンと切り離しているので、レッスンページができる前に作っておける）
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

export interface CultureThinkAbout {
  /** 画面に出す問いかけ（1要素 = 1文。ナレーションに合わせて今の文を強調する） */
  lines: string[];
  /** ナレーション音声の URL。無い時は合成音声で lines を読み上げる */
  audioUrl?: string;
}

export interface CultureTask {
  title: string;
  /** 文化ページ（/culture）の一覧に出す短い紹介（英語・1〜2文） */
  summary: string;
  /**
   * このタスクを6つ目のタスク（文化）として使うレッスン（edu_lessons.slug と表示名）。
   * ここが「どのレッスンでどの文化タスクを使うか」の唯一の情報源：
   * レッスンページの文化タスクも、/culture で終えた時に完了にするレッスンも、ここで決まる。
   */
  lessons?: { slug: string; label: string }[];
  cards: CultureCard[];
  /** カードを見終わった後の「考えてみよう」（採点しない） */
  thinkAbout?: CultureThinkAbout;
  questions: CultureQuestion[];
}

const audio = (file: string) => `${PICTURE_STORY_AUDIO_BASE}/${file}`;

/** レッスン（slug）が6つ目のタスクとして使う文化タスクを返す（無ければ null） */
export function findCultureTaskForLesson(lessonSlug: string): { id: string; task: CultureTask } | null {
  for (const [id, task] of Object.entries(CULTURE_TASKS)) {
    if (task.lessons?.some((l) => l.slug === lessonSlug)) return { id, task };
  }
  return null;
}

export const CULTURE_TASKS: Record<string, CultureTask> = {
  // Unit 4 Lesson 1 で使用
  "japanese-names": {
    title: "Japanese Names – Then and Now",
    summary: "How Japanese parents choose names, and how popular names have changed over 100 years – from Kazuko to Minato.",
    lessons: [{ slug: "family-1", label: "Family 1: How many people are in your family?" }],
    cards: [
      {
        title: "Names tell a story",
        imageUrl: "/images/picture-story/name-card-1.webp",
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
        imageUrl: "/images/picture-story/name-card-2.webp",
        imageAlt: "Children in kimono and a school uniform in front of a Shōwa-era house, with the kanji 和, 幸 and 清 (Kazuko, Sachiko, Kiyoshi)",
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
        imageUrl: "/images/picture-story/name-card-3.webp",
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
        imageUrl: "/images/picture-story/name-card-4.webp",
        imageAlt: "Banners with the kanji 湊 (harbour), 翠 (jade green), 結 (to connect) and 翔 (to soar) above a baseball field by a harbour",
        audioUrl: audio("names_04.mp3"),
        narration: [
          "Short, one-kanji names that come from nature are popular now.",
          "In 2025, the top names were Minato (湊 = harbour) for boys and Sui (翠 = jade green) for girls.",
          "Big events also shape names:",
          "After the 2011 earthquake, the kanji 結 (to connect) became popular.",
          "That year, the No.1 girls' name was Yua (結愛), which uses this kanji.",
          "Since baseball star Shohei Ohtani won MVP in 2021, 翔 (to soar) has been the most popular kanji in boys' names.",
        ],
      },
    ],
    thinkAbout: {
      lines: [
        "What names were popular in your country in the past?",
        "How are they different from popular names today?",
      ],
      audioUrl: audio("names_05.mp3"),
    },
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

  // まだどのレッスンページにもつないでいない
  "natural-disasters": {
    title: "Living with Natural Disasters in Japan",
    summary: "Earthquakes, the rainy season, typhoons, an active volcano and the snowiest city in the world – and how people in Japan live with them.",
    cards: [
      {
        title: "Earthquakes 地震 (jishin)",
        imageUrl: "/images/picture-story/disaster-card-1.webp",
        imageAlt: "A family taking cover under a strong wooden table while a phone shows an earthquake alarm, next to a shindo scale chart from 0 to 7",
        audioUrl: audio("disaster_01.mp3"),
        narration: [
          "If you live in Japan, you will probably feel an earthquake.",
          "Most are small, but sometimes a big one comes.",
          "Japan measures shaking on its own scale called shindo, from 0 to 7.",
          "Japanese buildings are built to be very strong against earthquakes.",
          "Since 1981, new buildings have had to be designed so they do not fall down, even in shaking of shindo 6+ to 7.",
          "When your phone sounds an earthquake alarm:",
          "Drop, cover, and hold on under a strong table.",
          "Stay away from windows, and don't run outside.",
          "If you are near the sea after strong shaking, go to high ground quickly.",
        ],
      },
      {
        title: "Rainy season and typhoons 梅雨・台風 (tsuyu / taifū)",
        imageUrl: "/images/picture-story/disaster-card-2.webp",
        imageAlt: "A train running beside a stormy sea in heavy rain and wind, with hydrangeas and people walking with umbrellas",
        audioUrl: audio("disaster_02.mp3"),
        narration: [
          "In most of Japan, the rainy season, tsuyu, comes in June and July.",
          "Rain can fall for days, sometimes causing floods and landslides.",
          "In summer and autumn, especially August and September, typhoons bring very strong winds and heavy rain.",
          "Does taifū sound like \"typhoon\"? That's no accident!",
          "The Japanese word is said to have been made to match the English word typhoon.",
          "When a big typhoon is coming, trains may stop and schools sometimes close.",
        ],
      },
      {
        title: "Living next to a volcano: Sakurajima 桜島",
        imageUrl: "/images/picture-story/disaster-card-3.webp",
        imageAlt: "The volcano Sakurajima erupting across the bay from Kagoshima city, while people in masks collect ash in yellow kokuhai-bukuro bags",
        audioUrl: audio("disaster_03.mp3"),
        narration: [
          "In Kagoshima, in the south of Japan, the city sits right across the bay from an active volcano, Sakurajima.",
          "It erupts very often. In 2011, it had nearly 1,000 explosive eruptions!",
          "When the wind blows toward the city, volcanic ash falls like grey snow.",
          "The weather forecast even tells people which way the ash will blow.",
          "People collect the ash in special yellow bags called kokuhai-bukuro and put them out for collection.",
          "For people in Kagoshima, eruptions are part of everyday life.",
        ],
      },
      {
        title: "The snowiest city: Aomori 青森",
        imageUrl: "/images/picture-story/disaster-card-4.webp",
        imageAlt: "People clearing deep snow from a roof and a road in Aomori, with snowy mountains and a stormy sea behind them",
        audioUrl: audio("disaster_04.mp3"),
        narration: [
          "In the north of Japan's main island is Aomori City.",
          "It is known as the snowiest city in the world with more than 100,000 people.",
          "About 7–8 metres of snow falls there every year!",
          "Cold winds from the Sea of Japan bring huge amounts of snow.",
          "Heavy snow can block roads, and the weight of snow on roofs can be dangerous,",
          "so people clear snow from their roofs and roads almost every day in winter.",
          "In the nearby mountains, snow and ice cover the trees and turn them into \"snow monsters\"!",
        ],
      },
    ],
    thinkAbout: {
      lines: [
        "Which natural disasters happen where you live?",
        "How are they similar to or different from Japan's?",
      ],
      audioUrl: audio("disaster_05.mp3"),
    },
    questions: [
      {
        question: "Your phone sounds an earthquake alarm and the ground starts shaking. What should you do first?",
        options: [
          "Run outside quickly",
          "Stand next to a window",
          "Drop, cover, and hold on under a strong table",
          "Go to the beach",
        ],
        answerIndex: 2,
        explanation: "Drop, cover, and hold on under a strong table. Stay away from windows, and don't run outside.",
        hintCard: 1,
      },
      {
        question: "Since 1981, how must new buildings in Japan be designed?",
        options: [
          "They must be made of wood",
          "They must stay standing even in very strong shaking",
          "They must be lower than three floors",
          "They must have a garden",
        ],
        answerIndex: 1,
        explanation: "Since 1981, new buildings must be designed so they do not fall down, even in shaking of shindo 6+ to 7.",
        hintCard: 1,
      },
      {
        question: "When is tsuyu, the rainy season, in most of Japan?",
        options: ["December and January", "March and April", "June and July", "October and November"],
        answerIndex: 2,
        explanation: "In most of Japan, tsuyu (梅雨) comes in June and July.",
        hintCard: 2,
      },
      {
        question: "Why does the Japanese word taifū sound like \"typhoon\"?",
        options: [
          "It is a coincidence",
          "It is said to have been made to match the English word \"typhoon\"",
          "English took it from a Japanese song",
          "It is the name of a Japanese island",
        ],
        answerIndex: 1,
        explanation: "That's no accident! The Japanese word taifū (台風) is said to have been made to match the English word typhoon.",
        hintCard: 2,
      },
      {
        question: "What do people in Kagoshima use kokuhai-bukuro for?",
        options: [
          "Carrying snow",
          "Storing rainwater",
          "Collecting volcanic ash from Sakurajima",
          "Keeping food for emergencies",
        ],
        answerIndex: 2,
        explanation: "Kokuhai-bukuro are special yellow bags for collecting the volcanic ash from Sakurajima.",
        hintCard: 3,
      },
      {
        question: "Why do people in Aomori clear snow from their roofs?",
        options: [
          "To make snowmen",
          "Because heavy snow on roofs can be dangerous",
          "To sell the snow",
          "Because it is a festival",
        ],
        answerIndex: 1,
        explanation: "The weight of snow on roofs can be dangerous, so people clear their roofs almost every day in winter.",
        hintCard: 4,
      },
    ],
  },
};
