import React from "react";
import YamatoChatCommon from "../components/YamatoChatCommon";

export interface ChatYamatoKanjiGrammarCheckerVceProps {
  defaultOpen?: boolean;
  userId?: string;
  initialLearningPace?: "steady" | "normal" | "accelerated";
  credits?: number;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
}

export const ChatYamatoKanjiGrammarCheckerVce: React.FC<ChatYamatoKanjiGrammarCheckerVceProps> = ({
  defaultOpen = false,
  ...restProps
}) => {
  return (
    <YamatoChatCommon
      appType="kanji-grammar-checker"
      characterName="漢字文法チェッカーヤマト"
      initialGreeting="Are you studying Japanese hard and keeping your spirits high today? The vocabulary and grammar checker is truly excellent, isn't it? I'll do my absolute best today to be just as excellent and provide you with truly helpful support!"
      themeColor="yellow"
      defaultOpen={defaultOpen}
      {...restProps}
    />
  );
};

export default ChatYamatoKanjiGrammarCheckerVce;