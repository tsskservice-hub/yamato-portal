/**
 * @file ChatYamatoGenkoyoshiEditorVce.tsx
 * @description Supabase YAMATO_CONFIGS から設定を動的取得するVCE原稿用紙エディタ専用チャットコンポーネント（YamatoChatCommon ラッパー版）
 */
import React, { useState, useEffect } from "react";
import YamatoChatCommon from "./YamatoChatCommon";
import { fetchYamatoConfigsData, BotConfig, YAMATO_BOT_CONFIGS } from "../data/yamato-configs";
import { supabase } from "../lib/supabaseClient";

export interface ChatYamatoGenkoyoshiEditorVceProps {
  defaultOpen?: boolean;
  themeColor?: string;
  floatingButtonClassName?: string;
  buttonStyle?: {
    border?: string;
    background?: string;
    color?: string;
  };
  initialLearningPace?: "steady" | "normal" | "accelerated";
  userId?: string;
  userNickname?: string;
  credits?: number;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
  externalImageFile?: File | null;
  externalImagePreview?: string | null;
  onClearExternalImage?: () => void;
}

export const ChatYamatoGenkoyoshiEditorVce: React.FC<ChatYamatoGenkoyoshiEditorVceProps> = ({
  defaultOpen = false,
  themeColor: propThemeColor,
  buttonStyle: propButtonStyle,
  ...restProps
}) => {
  // 💡 初期値として YAMATO_BOT_CONFIGS の設定を持たせ、チラつきやデフォルト青へのフォールバックを防止
  const [config, setConfig] = useState<BotConfig | null>(
    YAMATO_BOT_CONFIGS["genkoyoshi-editor-vce"] || null
  );

  useEffect(() => {
    let isMounted = true;
    async function loadConfig() {
      try {
        const configsData = await fetchYamatoConfigsData(supabase);
        if (isMounted && configsData && configsData["genkoyoshi-editor-vce"]) {
          setConfig(configsData["genkoyoshi-editor-vce"]);
        }
      } catch (err) {
        console.error("Failed to load genkoyoshi-editor-vce config from Supabase:", err);
      }
    }
    loadConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  // 💡 指定されたボタン配色（floatingButtonStyle / buttonStyle）を確実に解決
  const effectiveButtonStyle =
    propButtonStyle ||
    config?.floatingButtonStyle ||
    config?.buttonStyle;

  return (
    <YamatoChatCommon
      appType="genkoyoshi-editor-vce"
      characterName={config?.name || "原稿用紙エディタ for VCE"}
      initialGreeting={
        config?.greeting ||
        "Hello, my friend! 🌟 Are you studying hard today? Let's master correct Genkoyoshi usage and stay well prepared for your SACs and End of Year Exam! 📝✨"
      }
      themeColor={propThemeColor || config?.themeColor || "blue"}
      buttonStyle={effectiveButtonStyle}
      defaultOpen={defaultOpen}
      enableImageUpload={true}
      {...restProps}
    />
  );
};

export default ChatYamatoGenkoyoshiEditorVce;