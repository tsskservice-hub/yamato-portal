/**
 * @file igoFreeComments.ts
 * @description 囲碁フリー対局モードにおけるやまと先生の対局中コメント・相槌集（日本語・英語併記）
 */

export interface IgoComment {
  jp: string;
  en: string;
}

export const FREE_PLAY_COMMENTS = {
  // 対局開始時の挨拶
  greeting: [
    { jp: "よろしくお願いします。真剣勝負を楽しみましょう！", en: "Let's have a good game. Let's enjoy a serious match!" },
    { jp: "お手をどうぞ。良い勝負にしましょう。", en: "Please make your move. Let's make it a great game." }
  ],
  
  // プレイヤーが石を置いた後の相槌・感想
  afterMove: [
    { jp: "なるほど、そこに打ってきましたか。", en: "I see, you played there." },
    { jp: "手堅い一手ですね。", en: "That's a solid move." },
    { jp: "ふむ、面白い展開になってきました。", en: "Hmm, this is getting interesting." },
    { jp: "そこは急所になり得る場所ですね。", en: "That could be a vital point." },
    { jp: "しっかりとした陣地作りです。", en: "That's solid territory building." },
    { jp: "お見事な着手です！", en: "That's a brilliant move!" }
  ],

  // AIが長考している時や手番のセリフ
  aiThinking: [
    { jp: "次はどこに打とうか……。", en: "Where should I play next..." },
    { jp: "ここは勝負どころですね。", en: "This is a critical moment." }
  ],

  // 終局時のコメント
  gameEnd: [
    { jp: "お疲れ様でした。とても楽しい対局でした！", en: "Good game. It was a very enjoyable match!" },
    { jp: "素晴らしい集中力でしたね。感想戦をしましょう。", en: "You had great concentration. Let's review the game (kanshasen)." }
  ]
};

/**
 * 指定したカテゴリーからランダムにコメントを1つ取得するヘルパー関数
 * @param category コメントのカテゴリー ('greeting' | 'afterMove' | 'aiThinking' | 'gameEnd')
 */
export function getRandomComment(category: keyof typeof FREE_PLAY_COMMENTS): IgoComment {
  const list = FREE_PLAY_COMMENTS[category];
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}