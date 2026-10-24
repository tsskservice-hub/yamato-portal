/**
 * @file ChatYamatoConcierge.tsx
 * @description Supabase YAMATO_CONFIGS から設定を動的取得するコンシェルジュチャットコンポーネント
 */
import React, { useState, useEffect } from "react";
import YamatoChatCommon from "../components/YamatoChatCommon";
import { fetchYamatoConfigsData, BotConfig } from "../data/yamato-configs";
import { supabase } from "../lib/supabaseClient";

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
  // 💡 Supabase から動的に取得するコンシェルジュ設定
  const [config, setConfig] = useState<BotConfig | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const configsData = await fetchYamatoConfigsData(supabase);
        if (configsData && configsData.concierge) {
          setConfig(configsData.concierge);
        }
      } catch (err) {
        console.error("Failed to load concierge config from Supabase:", err);
      }
    }
    loadConfig();
  }, []);

  return (
    <YamatoChatCommon
      appType="concierge"
      characterName={config?.name || "コンシェルジュヤマト"}
      initialGreeting={config?.greeting || "Hello, my friend! How are you doing? I am Concierge Yamato, your general guide for the Yamato Portal. It is my true mission to help and support you on your learning journey. Please feel free to ask me anything anytime!"}
      themeColor={config?.themeColor || "#dc2626"}
      buttonStyle={config?.floatingButtonStyle}
      defaultOpen={defaultOpen}
      {...restProps}
    />
  );
};

export default ChatYamatoConcierge;