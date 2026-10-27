/**
 * @file ChatYamatoEoyOralMock.tsx
 * @description Supabase YAMATO_CONFIGS から設定を動的取得する VCE EOY Oral Mock Exam 専用AIチャットコンポーネント（ラッパー方式）
 * 💡 特徴：
 * 1. YamatoChatCommon をベースにした完全ラッパー方式
 * 2. Supabase の "eoy-oral-mock" 設定（テーマカラー #ef4444、ボタンスタイル等）を動的反映
 * 3. 口頭模擬試験練習向けに写真アップロードボタン（Upload Photo）を非表示化（enableImageUpload={false}）
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
  initialLearningPace?: "steady" | "normal" | "accelerated";
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
  assignedQuestion?: string;
}

export const ChatYamatoEoyOralMock: React.FC<ChatYamatoEoyOralMockProps> = ({
  systemPrompt = "",
  defaultOpen = false,
  ...restProps
}) => {
  const appType = "eoy-oral-mock";

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
        console.error("Failed to load eoy-oral-mock config from Supabase:", err);
      }
    }
    loadConfig();
  }, [appType]);

  // ご提示いただいたデフォルトのボタンスタイル（青背景 ＆ 赤枠線）
  const defaultButtonStyle = {
    color: "#ffffff",
    border: "2px solid #ef4444",
    background: "#3b82f6",
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
      enableImageUpload={false} // 💡 模擬試験用のため、チャット内の写真アップロードボタンは非表示
      {...restProps}
    />
  );
};

export default ChatYamatoEoyOralMock;