/**
 * @file ChatYamatoEoyWritingCustom.tsx
 * @description 外部教材・過去問持ち込み型 VCE Writing 用 AI チャットコンポーネント（YamatoChatCommon ラッパー方式）
 * 💡 特徴：
 * 1. YamatoChatCommon をベースにした完全ラッパー方式
 * 2. 入力欄の「Upload Photo」ボタンを非表示化（enableImageUpload={false}）
 * 3. 「Select Writing Section」（Sec 2 Part B / Sec 3 / Other）の選択バーを customWidget として提供
 * 4. 添削結果の先生用編集・備考付きPDF印刷機能として FeedbackPdfModal.tsx をインポート＆連携
 */
import React, { useState, useEffect } from "react";
import YamatoChatCommon from "./YamatoChatCommon";
import { FeedbackPdfModal } from "./FeedbackPdfModal";
import { fetchYamatoConfigsData, BotConfig } from "../data/yamato-configs";
import { supabase } from "../lib/supabaseClient";

export interface ChatYamatoEoyWritingCustomProps {
  systemPrompt?: string;
  defaultOpen?: boolean;
  userId?: string;
  userNickname?: string;
  credits?: number;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
  externalQuestionFiles?: File[];
  externalImageFile?: File | null;
  externalImagePreview?: string | null;
  onClearExternalImage?: () => void;
  assignedQuestion?: string;
}

export function ChatYamatoEoyWritingCustom({
  systemPrompt = "",
  defaultOpen = false,
  assignedQuestion = "",
  ...restProps
}: ChatYamatoEoyWritingCustomProps) {
  const appType = "eoy-writing-custom";

  // 💡 Supabase から動的に取得するボット設定（テーマカラー、挨拶文など）
  const [config, setConfig] = useState<BotConfig | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const configsData = await fetchYamatoConfigsData(supabase);
        if (configsData && configsData[appType]) {
          setConfig(configsData[appType]);
        }
      } catch (err) {
        console.error("Failed to load eoy-writing-custom config from Supabase:", err);
      }
    }
    loadConfig();
  }, [appType]);

  const themeColor = config?.themeColor || "#06b6d4";

  // 💡 VCE Writing セクション選択用ステート ("section2b" | "section3" | "other")
  const [writingSection, setWritingSection] = useState<"section2b" | "section3" | "other">("section2b");

  // 💡 FeedbackPdfModal 用のステート（null でない場合にモーダルを開く）
  const [pdfTargetContent, setPdfTargetContent] = useState<string | null>(null);

  // セクションごとの判定基準プロンプト
  const sectionInstructions = {
    section2b: "\n[Target Section: VCE Section 2 Part B Writing (Recommended Length: around 300 characters)]",
    section3: "\n[Target Section: VCE Section 3 Writing (Strict Criteria: Must write 400+ characters, ideally around 500 characters)]",
    other: "\n[Target Section: Other / General Writing Task (Evaluate based on student's custom guidelines)]",
  };

  const enhancedSystemPrompt = `${systemPrompt || ""}${sectionInstructions[writingSection]}`;

  const sectionTitleMap = {
    section2b: "VCE Section 2 Part B",
    section3: "VCE Section 3 (400-500字)",
    other: "Custom Writing",
  };

  // 💡 チャット上部に挿入する「Select Writing Section」ウィジェット
  const sectionSelectWidget = (
    <div
      className="border rounded-xl p-2 mb-2 flex flex-col gap-1.5 shrink-0"
      style={{
        backgroundColor: `${themeColor}0d`,
        borderColor: `${themeColor}40`,
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold" style={{ color: themeColor }}>
          Select Writing Section
        </span>
        {/* PDF出力ツールを直接開くためのクイックボタン */}
        <button
          type="button"
          onClick={() => {
            const initialText = assignedQuestion 
              ? `【Assigned Prompt / Question】\n${assignedQuestion}\n\n【Feedback & Notes】\n`
              : `【Feedback Report】\n`;
            setPdfTargetContent(initialText);
          }}
          className="text-[10px] font-bold px-2 py-0.5 rounded transition flex items-center gap-1 cursor-pointer hover:opacity-80"
          style={{ color: themeColor, backgroundColor: `${themeColor}20` }}
          title="Open PDF Export Tool"
        >
          <span>📄</span>
          <span>PDF Tool</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1">
        {(
          [
            { key: "section2b", label: "Sec 2 Part B" },
            { key: "section3", label: "Sec 3 (400-500字)" },
            { key: "other", label: "Other" },
          ] as const
        ).map((sec) => (
          <button
            key={sec.key}
            type="button"
            onClick={() => setWritingSection(sec.key)}
            style={
              writingSection === sec.key
                ? { backgroundColor: themeColor, color: "#ffffff" }
                : {}
            }
            className={`py-1 px-1 rounded-md text-[10px] font-bold transition text-center truncate cursor-pointer ${
              writingSection === sec.key
                ? "shadow-xs"
                : "bg-white text-slate-700 hover:opacity-80 border border-slate-200"
            }`}
          >
            {sec.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <YamatoChatCommon
        appType={appType}
        systemPrompt={enhancedSystemPrompt}
        characterName={config?.name || "VCE Writing Tutor (Yamato)"}
        initialGreeting={
          config?.greeting ||
          "Hello, my friend! 🌟 Please select your writing section (Section 2 Part B, Section 3, or Other) and share your brought question and answer. I am ready to give you detailed VCE feedback!"
        }
        themeColor={themeColor}
        buttonStyle={config?.floatingButtonStyle}
        defaultOpen={defaultOpen}
        enableImageUpload={false} // 💡 Upload Photo ボタンを削除（非表示）
        customWidget={sectionSelectWidget} // 💡 Select Writing Section バーを追加
        assignedQuestion={assignedQuestion}
        onExportPdf={(content: string) => setPdfTargetContent(content)} // 💡 チャットメッセージ内の Export PDF から連携
        {...restProps}
      />

      {/* 💡 ソースの FeedbackPdfModal を呼び出して先生用編集＆PDF印刷を実行 */}
      {pdfTargetContent && (
        <FeedbackPdfModal
          initialContent={pdfTargetContent}
          themeColor={themeColor}
          sectionTitle={sectionTitleMap[writingSection]}
          studentName={restProps.userNickname || "Student"}
          onClose={() => setPdfTargetContent(null)}
        />
      )}
    </>
  );
}

export default ChatYamatoEoyWritingCustom;