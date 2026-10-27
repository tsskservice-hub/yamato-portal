/**
 * @file ChatYamatoEoyOralElaborate.tsx
 * @description Supabase YAMATO_CONFIGS から設定を動的取得する VCE EOY Oral Elaborate 専用AIチャットコンポーネント（ラッパー方式）
 * 💡 特徴：
 * 1. YamatoChatCommon をベースにした完全ラッパー方式
 * 2. Supabase の "eoy-oral-elaborate" 設定（テーマカラー #a855f7、ボタンスタイル等）を動的反映
 * 3. 口頭詳細研究練習向けに写真アップロードボタン（Upload Photo）を非表示化（enableImageUpload={false}）
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
  initialLearningPace?: "steady" | "normal" | "accelerated";
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
  assignedQuestion?: string;
}

export const ChatYamatoEoyOralElaborate: React.FC<ChatYamatoEoyOralElaborateProps> = ({
  systemPrompt = "",
  defaultOpen = false,
  ...restProps
}) => {
  const appType = "eoy-oral-elaborate";

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
        console.error("Failed to load eoy-oral-elaborate config from Supabase:", err);
      }
    }
    loadConfig();
  }, [appType]);

  // ご提示いただいたデフォルトのボタンスタイル（パープル系アクセント）
  const defaultButtonStyle = {
    color: "#000000",
    border: "2px solid #a855f7",
    background: "#f3e8ff",
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
      enableImageUpload={false} // 💡 口頭詳細研究練習のため、チャット内の写真アップロードボタンは非表示
      {...restProps}
    />
  );
};

export default ChatYamatoEoyOralElaborate;