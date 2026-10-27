/**
 * @file ChatYamatoOralExamQuestions.tsx
 * @description Supabase YAMATO_CONFIGS から設定を動的取得する Oral Exam Questions 専用AIチャットコンポーネント（ラッパー方式）
 * 💡 特徴：
 *   1. YamatoChatCommon をベースにした完全ラッパー方式
 *   2. Supabase の "oral-exam-questions" 設定（テーマカラー #22c55e、ボタンスタイル等）を動的反映
 *   3. 写真アップロードボタン（Upload Photo）を有効化（enableImageUpload={true}）
 */
import React, { useState, useEffect } from "react";
import YamatoChatCommon from "./YamatoChatCommon";
import { fetchYamatoConfigsData, BotConfig } from "../data/yamato-configs";
import { supabase } from "../lib/supabaseClient";

export interface ChatYamatoOralExamQuestionsProps {
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

export const ChatYamatoOralExamQuestions: React.FC<ChatYamatoOralExamQuestionsProps> = ({
  systemPrompt = "",
  defaultOpen = false,
  ...restProps
}) => {
  const appType = "oral-exam-questions";
  const [config, setConfig] = useState<BotConfig | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const configsData = await fetchYamatoConfigsData(supabase);
        if (configsData && configsData[appType]) {
          setConfig(configsData[appType]);
        }
      } catch (err) {
        console.error("Failed to load oral-exam-questions config from Supabase:", err);
      }
    }
    loadConfig();
  }, [appType]);

  const defaultButtonStyle = {
    background: "#22c55e",
    border: "2px solid #86efac",
    color: "#ffffff"
  };

  return (
    <YamatoChatCommon
      appType={appType}
      systemPrompt={systemPrompt}
      characterName={config?.name || "Oral Exam Qs"}
      initialGreeting={
        config?.greeting ||
        "Hello, my friend! 🌟 Welcome to the Oral Exam Questions page. You can listen to expected examiner questions, train your ear, and practice shadowing to prepare for your oral exam!"
      }
      themeColor={config?.themeColor || "#22c55e"}
      buttonStyle={config?.floatingButtonStyle || config?.buttonStyle || defaultButtonStyle}
      defaultOpen={defaultOpen}
      enableImageUpload={true} // 💡 写真アップロードボタン（Upload Photo）を表示
      {...restProps}
    />
  );
};

export default ChatYamatoOralExamQuestions;