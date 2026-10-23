/**
 * @file ChatYamatoKanjiGrammarCheckerVce.tsx
 * @description 漢字文法チェッカー専用ヤマト（YamatoChatCommon ラッパー版 / 写真アップロード非表示）
 */
import React from "react";
import YamatoChatCommon from "./YamatoChatCommon";

export interface ChatYamatoKanjiGrammarCheckerVceProps {
  defaultOpen?: boolean;
  userId?: string;
  initialLearningPace?: "steady" | "normal" | "accelerated";
  credits?: number;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
}

export const ChatYamatoKanjiGrammarCheckerVce: React.FC<ChatYamatoKanjiGrammarCheckerVceProps> = ({
  defaultOpen = false,
  userId,
  initialLearningPace = "normal",
  credits,
  onOpenAuth,
  ...restProps
}) => {
  return (
    <YamatoChatCommon
      appType="kanji-grammar-checker"
      characterName="漢字文法チェッカーヤマト"
      initialGreeting="Are you studying Japanese hard and keeping your spirits high today? The vocabulary and grammar checker is truly excellent, isn't it? I'll do my absolute best today to be just as excellent and provide you with truly helpful support!"
      themeColor="yellow"
      defaultOpen={defaultOpen}
      userId={userId}
      initialLearningPace={initialLearningPace}
      credits={credits}
      onOpenAuth={onOpenAuth}
      enableImageUpload={false} // 💡 写真アップロードボタン（Upload Photo）を非表示に設定
      {...restProps}
    />
  );
};

export default ChatYamatoKanjiGrammarCheckerVce;
