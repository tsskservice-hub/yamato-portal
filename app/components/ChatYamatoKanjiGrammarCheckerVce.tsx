/**
 * @file ChatYamatoKanjiGrammarCheckerVce.tsx
 * @description 添付画像の設定（kanji-grammar-checker）に完全に合わせた漢字文法チェッカー専用ヤマトコンポーネント
 */
import React, { useState, useEffect } from "react";
import YamatoChatCommon from "./YamatoChatCommon";
import { fetchYamatoConfigsData, BotConfig } from "../data/yamato-configs";
import { supabase } from "../lib/supabaseClient";

export interface ChatYamatoKanjiGrammarCheckerVceProps {
  defaultOpen?: boolean;
  userId?: string;
  initialLearningPace?: "steady" | "normal" | "accelerated";
  credits?: number;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
}

export const ChatYamatoKanjiGrammarCheckerVce: React.FC<ChatYamatoKanjiGrammarCheckerVceProps> = ({
  defaultOpen = false,
  ...restProps
}) => {
  // 💡 添付画像の設定データを動的に取得するステート
  const [config, setConfig] = useState<BotConfig | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const configsData = await fetchYamatoConfigsData(supabase);
        // 💡 添付画像に合わせてハイフン付きの "kanji-grammar-checker" キーから設定を取得
        if (configsData && configsData["kanji-grammar-checker"]) {
          setConfig(configsData["kanji-grammar-checker"]);
        }
      } catch (err) {
        console.error("Failed to load kanji-grammar-checker config from Supabase:", err);
      }
    }
    loadConfig();
  }, []);

  return (
    <YamatoChatCommon
      appType="kanji-grammar-checker"
      characterName={config?.name || "漢字文法チェッカーヤマト"}
      initialGreeting={
        config?.greeting ||
        "Are you working hard and cheerfully on your Japanese studies today? The grammar and vocabulary checker is truly brilliant, isn't it? I will do my best today to be just as brilliant and provide helpful support for you!"
      }
      themeColor={config?.themeColor || "#eab308"}
      buttonStyle={config?.buttonStyle || config?.floatingButtonStyle}
      defaultOpen={defaultOpen}
      enableImageUpload={false} // 💡 写真アップロードボタン（Upload Photo）を非表示に設定
      {...restProps}
    />
  );
};

export default ChatYamatoKanjiGrammarCheckerVce;