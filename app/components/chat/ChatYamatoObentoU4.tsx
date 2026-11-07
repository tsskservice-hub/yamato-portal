/**
 * @file src/components/ChatYamatoObentoU4.tsx
 * @description Obento Deluxe Unit 4 (Family and Pets) 専用のAIヤマトチャットウィジェットコンポーネント
 */

import React from "react";
import { YamatoChatCommon } from "../YamatoChatCommon";

export interface ChatYamatoObentoU4Props {
  /** ユーザーID */
  userId?: string;
  /** ユーザーのニックネーム */
  userNickname?: string;
  /** 保有クレジット数 */
  credits?: number;
  /** 認証モーダルを開くコールバック */
  onOpenAuth?: (mode?: "signin" | "signup") => void;
  /** 外部から渡される添付画像ファイル */
  externalImageFile?: File | null;
  /** 外部から渡される添付画像のプレビューURL */
  externalImagePreview?: string | null;
  /** 外部画像のクリアコールバック */
  onClearExternalImage?: () => void;
  /** 現在の設問やコンテキスト */
  assignedQuestion?: string;
  /** 先生用PDFエクスポート連携コールバック */
  onExportPdf?: (content: string) => void;
  /** チャットを最初から開いた状態にするか */
  defaultOpen?: boolean;
}

export function ChatYamatoObentoU4({
  userId,
  userNickname,
  credits,
  onOpenAuth,
  externalImageFile,
  externalImagePreview,
  onClearExternalImage,
  assignedQuestion,
  onExportPdf,
  defaultOpen = false,
}: ChatYamatoObentoU4Props) {
  return (
    <YamatoChatCommon
      characterName="Obento U4 Yamato"
      initialGreeting="Hello, my friend! 🌟 Welcome to Obento Unit 4 (Family & Pets). Let's practise talking about your family members, counting people (一人、二人...), and discussing your pets together! What would you like to start with?"
      systemPrompt=""
      appType="obento-u4"
      defaultOpen={defaultOpen}
      themeColor="#f97316" // 温かみのあるオレンジ（Unit 4のカラーテーマ等に合わせて調整可能）
      userId={userId}
      userNickname={userNickname}
      credits={credits}
      onOpenAuth={onOpenAuth}
      enableImageUpload={true}
      externalImageFile={externalImageFile}
      externalImagePreview={externalImagePreview}
      onClearExternalImage={onClearExternalImage}
      assignedQuestion={assignedQuestion || "Obento Deluxe Unit 4: Family and Pets Practice"}
      onExportPdf={onExportPdf}
    />
  );
}

export default ChatYamatoObentoU4;