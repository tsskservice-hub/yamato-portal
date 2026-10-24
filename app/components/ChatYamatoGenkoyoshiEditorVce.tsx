/**
 * @file ChatYamatoGenkoyoshiEditorVce.tsx
 * @description Supabase YAMATO_CONFIGS から設定を動的取得するVCE原稿用紙エディタ専用チャットコンポーネント（YamatoChatCommon ラッパー版）
 */
import React, { useState, useEffect } from "react";
import YamatoChatCommon from "./YamatoChatCommon";
import { fetchYamatoConfigsData, BotConfig } from "../data/yamato-configs";
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
  // 💡 Supabase から動的に設定を取得するステート
  const [config, setConfig] = useState<BotConfig | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const configsData = await fetchYamatoConfigsData(supabase);
        if (configsData && configsData["genkoyoshi-editor-vce"]) {
          setConfig(configsData["genkoyoshi-editor-vce"]);
        }
      } catch (err) {
        console.error("Failed to load genkoyoshi-editor-vce config from Supabase:", err);
      }
    }
    loadConfig();
  }, []);

  return (
    <YamatoChatCommon
      appType="genkoyoshi-editor-vce"
      characterName={config?.name || "原稿用紙エディター (VCE)"}
      initialGreeting={
        config?.greeting ||
        "Hello, my friend! 🌟 Welcome to the VCE Genkoyoshi Editor. Let's polish your Japanese essay to meet strict VCE standards."
      }
      themeColor={propThemeColor || config?.themeColor || "#2563eb"}
      buttonStyle={propButtonStyle || config?.buttonStyle || config?.floatingButtonStyle}
      defaultOpen={defaultOpen}
      {...restProps}
    />
  );
};

export default ChatYamatoGenkoyoshiEditorVce;