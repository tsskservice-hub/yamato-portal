/**
 * @file oral-topics.ts
 * @description 口頭試験の練習（mock・accelerated）で、約 1 分ごとに切りかえる話題のリスト
 *
 * 話題は、ほかの EOY oral のページ（問題集 ORAL_EXAM_QUESTIONS の category）と同じものを中心にしている。
 *   Section 1: 家族・学校・アルバイト・日本・将来（いつも入れる）＋ 趣味・スポーツ・休みの日・テクノロジー（いくつか）
 *   Section 2: 特別研究のサブトピックを、約 1 分ごとに別の角度（くわしい説明・理由・比べる・意見…）から話す
 */

export interface OralTopic {
  /** AI に伝える名前（日本語 + 英語） */
  label: string;
  /** 問題集の category（質問の例を選ぶのに使う） */
  categories: string[];
}

/** 1 つの話題を話す時間のめやす（秒） */
export const TOPIC_SECONDS = 60;

const SEC1_CORE: OralTopic[] = [
  { label: "家族 (family)", categories: ["Family"] },
  { label: "学校 (school)", categories: ["School"] },
  { label: "アルバイト (part-time job)", categories: ["Part time Job"] },
  { label: "日本 (going to Japan, studying Japanese)", categories: ["Travel", "Japanese Study"] },
];
const SEC1_EXTRA: OralTopic[] = [
  { label: "趣味 (hobbies)", categories: ["Hobby"] },
  { label: "スポーツ (sports)", categories: ["Sports"] },
  { label: "休みの日の過ごし方 (weekends and holidays)", categories: ["Leisure Activity"] },
  { label: "テクノロジー・SNS (technology)", categories: ["Technology"] },
];
const SEC1_LAST: OralTopic = { label: "将来 (future plans)", categories: ["Future"] };

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Section 1 の話題の順番（毎回ちがう）。count は話題の数（7 分なら 7 つ）。
 * 家族・学校・アルバイト・日本はいつも入れ、残りを趣味などから選ぶ。「将来」は話のまとめにしやすいので最後
 */
export function planSec1Topics(count = 7): OralTopic[] {
  const extrasNeeded = Math.max(0, Math.min(SEC1_EXTRA.length, count - SEC1_CORE.length - 1));
  const middle = shuffle([...SEC1_CORE, ...shuffle(SEC1_EXTRA).slice(0, extrasNeeded)]);
  return [...middle, SEC1_LAST];
}

/** Section 2 で、サブトピックを話す角度の順番（問題集の sec2 の category と同じ順） */
export const SEC2_ANGLES: OralTopic[] = [
  { label: "サブトピックの紹介 (introduce the sub-topic)", categories: ["Discussion Intro & Pitch"] },
  { label: "くわしい説明 (details and examples)", categories: ["Clarification & Details"] },
  { label: "理由 (reasons)", categories: ["Reasons & Justifications"] },
  { label: "影響・よい点と悪い点 (impacts, pros and cons)", categories: ["Impacts, Pros & Cons"] },
  { label: "比べる (comparison, e.g. Japan and Australia)", categories: ["Comparison & Contrast"] },
  { label: "自分の意見 (opinions)", categories: ["Opinions & Stance"] },
  { label: "これからのこと・解決 (future and solutions)", categories: ["Solutions & Future Prospects"] },
  { label: "別の考え方 (other points of view)", categories: ["Examiner Prompts & Counter-arguments"] },
];
