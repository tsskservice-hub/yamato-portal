/**
 * @file ChatYamatoEoyOralElaborate.tsx
 * @description Supabase YAMATO_CONFIGS から設定を動的取得する VCE EOY Oral Elaborate 専用AIチャットコンポーネント（ラッパー方式）
 * 💡 特徴：
 *   1. YamatoChatCommon をベースにした完全ラッパー方式
 *   2. Supabase の "eoy-oral-elaborate" 設定（テーマカラー #a855f7、ボタンスタイル等）を動的反映
 *   3. 写真アップロードボタン（Upload Photo）を有効化（enableImageUpload={true}）
 */
import React, { useState, useEffect } from "react";
import YamatoChatCommon from "./YamatoChatCommon";
import { fetchYamatoConfigsData, BotConfig } from "../data/yamato-configs";
import { supabase } from "../lib/supabaseClient";

export interface ChatYamatoEoyOralElaborateProps {
  systemPrompt?: string;
  defaultOpen?: boolean;
  userId?: string;
  userNickname?: string;
  credits?: number;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
  externalImageFile?: File | null;
  externalImagePreview?: string | null;
  onClearExternalImage?: () => void;
  assignedQuestion?: string;
}

export const ChatYamatoEoyOralElaborate: React.FC<ChatYamatoEoyOralElaborateProps> = ({
  systemPrompt = "",
  defaultOpen = false,
  ...restProps
}) => {
  const appType = "eoy-oral-elaborate";
  const [config, setConfig] = useState<BotConfig | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const configsData = await fetchYamatoConfigsData(supabase);
        if (configsData && configsData[appType]) {
          setConfig(configsData[appType]);
        }
      } catch (err) {
        console.error("Failed to load eoy-oral-elaborate config from Supabase:", err);
      }
    }
    loadConfig();
  }, [appType]);

  const defaultButtonStyle = {
    background: "#a855f7",
    border: "2px solid #e9d5ff",
    color: "#ffffff"
  };

  return (
    <YamatoChatCommon
      appType={appType}
      systemPrompt={systemPrompt}
      characterName={config?.name || "EOY Oral Elaborate"}
      initialGreeting={
        config?.greeting ||
        "Hello, my friend! 🌟 Welcome to the EOY Oral Elaborate session. Let's dive deeper into your detailed study and responses."
      }
      themeColor={config?.themeColor || "#a855f7"}
      buttonStyle={config?.floatingButtonStyle || config?.buttonStyle || defaultButtonStyle}
      defaultOpen={defaultOpen}
      enableImageUpload={true} // 💡 写真アップロードボタン（Upload Photo）を表示
      {...restProps}
    />
  );
};

export default ChatYamatoEoyOralElaborate;