/**
 * @file ChatYamatoEoyWriting.tsx
 * @description Supabase YAMATO_CONFIGS から設定を動的取得する VCE Writing Practice 用チャットコンポーネント（ラッパー方式）
 */
import React, { useState, useEffect } from "react";
import YamatoChatCommon from "../components/YamatoChatCommon";
import { fetchYamatoConfigsData, BotConfig } from "../data/yamato-configs";
import { supabase } from "../lib/supabaseClient";

export interface ChatYamatoEoyWritingProps {
  systemPrompt?: string; // 💡 systemPrompt を追加
  defaultOpen?: boolean;
  userId?: string;
  userNickname?: string;
  credits?: number;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
  externalImageFile?: File | null;
  externalImageFile2?: File | null;
  externalImagePreview?: string | null;
  externalImagePreview2?: string | null;
  onClearExternalImage?: () => void;
  assignedQuestion?: string;
}

export const ChatYamatoEoyWriting: React.FC<ChatYamatoEoyWritingProps> = ({
  systemPrompt = "",
  defaultOpen = false,
  ...restProps
}) => {
  const appType = "eoy-writing";
  const [config, setConfig] = useState<BotConfig | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const configsData = await fetchYamatoConfigsData(supabase);
        if (configsData && configsData[appType]) {
          setConfig(configsData[appType]);
        }
      } catch (err) {
        console.error("Failed to load eoy-writing config from Supabase:", err);
      }
    }
    loadConfig();
  }, [appType]);

  return (
    <YamatoChatCommon
      appType={appType}
      systemPrompt={systemPrompt} // 💡 YamatoChatCommon へ確実に渡す
      characterName={config?.name || "VCE Writing Practice"}
      initialGreeting={
        config?.greeting ||
        "Hello, my friend! 🌟 Welcome to your EOY Writing practice session! Let's polish your Japanese writing skills."
      }
      themeColor={config?.themeColor || "#06b6d4"}
      buttonStyle={config?.floatingButtonStyle}
      defaultOpen={defaultOpen}
      enableImageUpload={false} // 💡 チャット内の「Upload Photo」ボタンを非表示に設定
      {...restProps}
    />
  );
};

export default ChatYamatoEoyWriting;