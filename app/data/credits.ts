/**
 * @file credits.ts
 * @description クレジット（/credits ページ）の中身。新しいサービスや素材を使い始めたら、ここに足す
 *
 * フッターには「Voice By ondoku3.com」と「Credits」（このページへのリンク）だけを出す。
 * ElevenLabs・OpenAI は有料プランなので、フッターには書かず、このページで説明するだけにする。
 * link があるものだけリンクにする（ondoku3.com はリンクが必要）。
 */

export interface CreditItem {
  /** サービス・素材の名前 */
  name: string;
  /** リンク（あるものだけ） */
  link?: string;
  /** どこで使っているか */
  usedFor: string[];
}

/** AI の声 */
export const VOICE_SERVICES: CreditItem[] = [
  {
    name: "ondoku3.com",
    link: "https://ondoku3.com/",
    usedFor: [
      "Audio for the vocabulary in the lessons",
      "Audio for the listening tasks in the lessons",
      "AI Yamato's introduction on the home page",
    ],
  },
  {
    name: "ElevenLabs",
    usedFor: [
      "Audio for the VCE oral exam questions (Oral Exam Questions, Drill, Elaborate and Mock)",
      "Voices in the class live game (for example, 「じゃんけんぽん」 and 「問題です」)",
    ],
  },
  {
    name: "OpenAI",
    usedFor: [
      "AI Yamato reading answers aloud",
      "The examiner's voice in the Oral Mock Exam",
      "Yamato-sensei's voice in the Oral Superb conversation",
    ],
  },
];

/** 音声を文字にする・AI の返事やフィードバックを作るサービス */
export const AI_SERVICES: CreditItem[] = [
  {
    name: "OpenAI",
    usedFor: ["Turning your recorded voice into text in the speaking practice pages", "Real-time conversation in Oral Superb"],
  },
  {
    name: "Google Gemini (Google Cloud)",
    usedFor: ["AI Yamato's replies and feedback", "Pictures drawn by AI Yamato"],
  },
];

/** 写真・絵（faq_036 と同じ内容） */
export const PICTURE_SOURCES: CreditItem[] = [
  { name: "Our own photos", usedFor: ["Photos we took ourselves"] },
  { name: "Stock photos", usedFor: ["Photos used under their licence terms, such as Photo AC (写真AC)"] },
  { name: "Public-domain artworks", usedFor: ["For example, ukiyo-e prints"] },
  {
    name: "AI illustrations",
    usedFor: ["Some illustrations, for example some pictures in the class live game. Every picture is checked by a teacher before it is used."],
  },
];
