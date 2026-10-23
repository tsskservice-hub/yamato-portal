import React from "react";
import YamatoChatCommon from "~/components/YamatoChatCommon";

export interface ChatYamatoConciergeProps {
  defaultOpen?: boolean;
  // 💡 下位互換性のため残しても構いませんが、記述しなくても YamatoChatCommon が自動解決します
  userId?: string;
  initialLearningPace?: "steady" | "normal" | "accelerated";
  credits?: number;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
}

export const ChatYamatoConcierge: React.FC<ChatYamatoConciergeProps> = ({
  defaultOpen = false,
  ...restProps
}) => {
  return (
    <YamatoChatCommon
      appType="concierge"
      characterName="コンシェルジュヤマト"
      initialGreeting="Hello, my friend! How are you doing? I am Concierge Yamato, your general guide for the Yamato Portal. It is my true mission to help and support you on your learning journey. Please feel free to ask me anything anytime!"
      themeColor="teal"
      defaultOpen={defaultOpen}
      {...restProps}
    />
  );
};

export default ChatYamatoConcierge;