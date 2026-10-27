/**
 * @file ChatYamatoOralExamQuestions.tsx
 * @description Supabase YAMATO_CONFIGS から設定を動的取得する Oral Exam Questions 専用AIチャットコンポーネント（ラッパー方式）
 * 💡 特徴：
 * 1. YamatoChatCommon をベースにした完全ラッパー方式
 * 2. Supabase の "oral-exam-questions" 設定（テーマカラー #22c55e、ボタンスタイル等）を動的反映
 * 3. リスニング・シャドーイング練習向けに写真アップロードボタン（Upload Photo）を非表示化（enableImageUpload={false}）
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
  initialLearningPace?: "steady" | "normal" | "accelerated";
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
  assignedQuestion?: string;
}

export const ChatYamatoOralExamQuestions: React.FC<ChatYamatoOralExamQuestionsProps> = ({
  systemPrompt = "",
  defaultOpen = false,
  ...restProps
}) => {
  const appType = "oral-exam-questions";

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
        console.error("Failed to load oral-exam-questions config from Supabase:", err);
      }
    }
    loadConfig();
  }, [appType]);

  // ご提示いただいたデフォルトのボタンスタイル（イエロー背景 ＆ グリーン枠線）
  const defaultButtonStyle = {
    color: "#000000",
    border: "2px solid #22c55e",
    background: "#fde047",
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
      enableImageUpload={false} // 💡 質問リスニング・シャドーイング用のため、写真アップロードボタンは非表示
      {...restProps}
    />
  );
};

export default ChatYamatoOralExamQuestions;