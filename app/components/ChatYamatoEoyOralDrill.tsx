/**
 * @file ChatYamatoEoyOralDrill.tsx
 * @description Supabase YAMATO_CONFIGS から設定を動的取得する VCE EOY Oral Drill 専用AIチャットコンポーネント（ラッパー方式）
 * 💡 特徴：
 * 1. YamatoChatCommon をベースにした完全ラッパー方式
 * 2. Supabase の "eoy-oral-drill" 設定（テーマカラー #eab308、ボタンスタイル等）を動的反映
 * 3. 口頭練習向けに写真アップロードボタン（Upload Photo）を非表示化（enableImageUpload={false}）
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
  initialLearningPace?: "steady" | "normal" | "accelerated";
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
  assignedQuestion?: string;
}

export const ChatYamatoEoyOralDrill: React.FC<ChatYamatoEoyOralDrillProps> = ({
  systemPrompt = "",
  defaultOpen = false,
  ...restProps
}) => {
  const appType = "eoy-oral-drill";

  // 💡 Supabase から動的に取得するボット設定
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

  // ご提示いただいたデフォルトのボタンスタイル
  const defaultButtonStyle = {
    color: "#000000",
    border: "2px solid #eab308",
    background: "#dcfce7",
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
      enableImageUpload={false} // 💡 口頭練習のため、チャット内の写真アップロードボタンは非表示
      {...restProps}
    />
  );
};

export default ChatYamatoEoyOralDrill;