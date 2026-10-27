/**
 * @file ChatYamatoEoyOralDrill.tsx
 * @description Supabase YAMATO_CONFIGS から設定を動的取得する VCE EOY Oral Drill 専用AIチャットコンポーネント（ラッパー方式）
 * 💡 特徴：
 *   1. YamatoChatCommon をベースにした完全ラッパー方式
 *   2. Supabase の "eoy-oral-drill" 設定（テーマカラー #eab308、ボタンスタイル等）を動的反映
 *   3. 写真アップロードボタン（Upload Photo）を有効化（enableImageUpload={true}）
 */
import React, { useState, useEffect } from "react";
import YamatoChatCommon from "./YamatoChatCommon";
import { fetchYamatoConfigsData, BotConfig } from "../data/yamato-configs";
import { supabase } from "../lib/supabaseClient";

export interface ChatYamatoEoyOralDrillProps {
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

export const ChatYamatoEoyOralDrill: React.FC<ChatYamatoEoyOralDrillProps> = ({
  systemPrompt = "",
  defaultOpen = false,
  ...restProps
}) => {
  const appType = "eoy-oral-drill";
  const [config, setConfig] = useState<BotConfig | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const configsData = await fetchYamatoConfigsData(supabase);
        if (configsData && configsData[appType]) {
          setConfig(configsData[appType]);
        }
      } catch (err) {
        console.error("Failed to load eoy-oral-drill config from Supabase:", err);
      }
    }
    loadConfig();
  }, [appType]);

  const defaultButtonStyle = {
    background: "#eab308",
    border: "2px solid #fef08a",
    color: "#ffffff"
  };

  return (
    <YamatoChatCommon
      appType={appType}
      systemPrompt={systemPrompt}
      characterName={config?.name || "EOY Oral Drill"}
      initialGreeting={
        config?.greeting ||
        "Hello, my friend! 🌟 Welcome to your EOY Oral Drill practice session! Let's sharpen your speaking skills."
      }
      themeColor={config?.themeColor || "#eab308"}
      buttonStyle={config?.floatingButtonStyle || config?.buttonStyle || defaultButtonStyle}
      defaultOpen={defaultOpen}
      enableImageUpload={true} // 💡 写真アップロードボタン（Upload Photo）を表示
      {...restProps}
    />
  );
};

export default ChatYamatoEoyOralDrill;