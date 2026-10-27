/**
 * @file ChatYamatoEoyOralMock.tsx
 * @description Supabase YAMATO_CONFIGS から設定を動的取得する VCE EOY Oral Mock Exam 専用AIチャットコンポーネント（ラッパー方式）
 * 💡 特徴：
 *   1. YamatoChatCommon をベースにした完全ラッパー方式
 *   2. Supabase の "eoy-oral-mock" 設定（テーマカラー #ef4444、ボタンスタイル等）を動的反映
 *   3. 写真アップロードボタン（Upload Photo）を有効化（enableImageUpload={true}）
 */
import React, { useState, useEffect } from "react";
import YamatoChatCommon from "./YamatoChatCommon";
import { fetchYamatoConfigsData, BotConfig } from "../data/yamato-configs";
import { supabase } from "../lib/supabaseClient";

export interface ChatYamatoEoyOralMockProps {
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

export const ChatYamatoEoyOralMock: React.FC<ChatYamatoEoyOralMockProps> = ({
  systemPrompt = "",
  defaultOpen = false,
  ...restProps
}) => {
  const appType = "eoy-oral-mock";
  const [config, setConfig] = useState<BotConfig | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const configsData = await fetchYamatoConfigsData(supabase);
        if (configsData && configsData[appType]) {
          setConfig(configsData[appType]);
        }
      } catch (err) {
        console.error("Failed to load eoy-oral-mock config from Supabase:", err);
      }
    }
    loadConfig();
  }, [appType]);

  const defaultButtonStyle = {
    background: "#ef4444",
    border: "2px solid #fca5a5",
    color: "#ffffff"
  };

  return (
    <YamatoChatCommon
      appType={appType}
      systemPrompt={systemPrompt}
      characterName={config?.name || "EOY Oral Mock Exam"}
      initialGreeting={
        config?.greeting ||
        "Hello, my friend! 🌟 Welcome to your EOY Oral Mock Exam. Ready to simulate the real exam experience?"
      }
      themeColor={config?.themeColor || "#ef4444"}
      buttonStyle={config?.floatingButtonStyle || config?.buttonStyle || defaultButtonStyle}
      defaultOpen={defaultOpen}
      enableImageUpload={true} // 💡 写真アップロードボタン（Upload Photo）を表示
      {...restProps}
    />
  );
};

export default ChatYamatoEoyOralMock;