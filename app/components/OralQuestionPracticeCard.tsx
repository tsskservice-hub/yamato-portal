import React, { useState, useEffect } from "react";
import { OralExamQuestionItem } from "../data/oral-exam-questions";
import useOralAudioRecorder from "./OralAudioRecorder";
import OralDrillFeedbackCard, { FeedbackData } from "./OralDrillFeedbackCard";

// Props の型定義
export interface OralQuestionPracticeCardProps {
  questions: OralExamQuestionItem[];
  selectedQuestion: OralExamQuestionItem | null;
  onSelectQuestion: (question: OralExamQuestionItem | null) => void;
  selectedLevel?: "steady" | "normal" | "accelerated";
  userId?: string;                          // Supabase減算用のユーザーID
  userNickname?: string;                    // AIの呼びかけ用ニックネーム
  appType?: string;                         // クレジット判定用アプリ種別
  isVoiceMode?: string;                     // 音声モード指定
  onCreditsUpdated?: (newCredits: number) => void; // ヘッダー表示の即時同期
  themeColor?: string;
  apiEndpoint?: string;
  modeLabel?: string;
}

export const OralQuestionPracticeCard: React.FC<OralQuestionPracticeCardProps> = ({
  questions,
  selectedQuestion,
  onSelectQuestion,
  selectedLevel = "normal",
  userId,
  userNickname = "VCE Student",
  appType = "eoy-oral-drill",
  isVoiceMode = "drill",
  onCreditsUpdated,
  themeColor = "#a855f7",
  apiEndpoint = "https://api.jptutoraiyamato.com/chat",
  modeLabel = "Practice",
}) => {
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [userSpeechText, setUserSpeechText] = useState<string>("");

  const { isRecording, startRecording, stopRecording, audioBlob } = useOralAudioRecorder();

  // 設問が変更されたらフィードバックとテキストをリセット
  useEffect(() => {
    setFeedback(null);
    setUserSpeechText("");
  }, [selectedQuestion?.text]);

  // 音声データ生成時の自動AI送信
  useEffect(() => {
    if (audioBlob && selectedQuestion) {
      processAudioSubmission(audioBlob);
    }
  }, [audioBlob]);

  const processAudioSubmission = async (blob: Blob) => {
    if (!selectedQuestion) return;
    setIsAnalyzing(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append("audio", blob, "answer.webm");
      formData.append("mode", "drill-practice");
      formData.append("question", selectedQuestion.text);
      formData.append("expectedQuestion", selectedQuestion.text);
      formData.append(
        "registeredAnswer",
        selectedQuestion.defaultAnswer || selectedQuestion.default_answer_original || ""
      );
      formData.append("level", selectedLevel);

      // ログイン情報・機能パラメータを FormData に追加
      if (userId) {
        formData.append("userId", userId);
      }
      if (userNickname) {
        formData.append("userNickname", userNickname);
      }
      formData.append("appType", appType);
      formData.append("isVoiceMode", isVoiceMode);

      const response = await fetch(apiEndpoint, { method: "POST", body: formData });
      if (!response.ok) throw new Error(`API response error: ${response.status}`);

      const data = (await response.json()) as any;

      setUserSpeechText(data.userText || "（音声入力の書き起こし完了）");

      // 💡 【修正ポイント (ステップ２)】
      // API通信成功後に親側の fetchProfile(user.id) 等を起動できるよう無条件で onCreditsUpdated を呼び出す
      if (onCreditsUpdated) {
        onCreditsUpdated(typeof data.currentCredits === "number" ? data.currentCredits : 0);
      }

      setFeedback({
        scoreLabel: data.scoreLabel || "👍 Great Answer!",
        evaluationHtml: data.evaluationHtml || "",
        correctionsHtml: data.correctionsHtml || "",
        refinedPolishHtml:
          data.refinedPolishHtml || selectedQuestion.defaultAnswer || selectedQuestion.default_answer_original,
        defaultAnswerWithRuby: selectedQuestion.defaultAnswer || selectedQuestion.default_answer_original,
      });
    } catch (err) {
      console.error("Failed to process oral response:", err);
      alert("申し訳ありません。音声解析に失敗しました。もう一度お試しください。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNextQuestion = () => {
    if (!questions || questions.length === 0) return;
    const currentIndex = selectedQuestion ? questions.findIndex((q) => q.text === selectedQuestion.text) : -1;
    const nextIndex = (currentIndex + 1) % questions.length;
    onSelectQuestion(questions[nextIndex]);
    setFeedback(null);
    setUserSpeechText("");
  };

  return (
    <div className="space-y-8">
      {/* 設問選択グリッド */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>📚</span>
            <span>
              {modeLabel} Questions ({questions.length})
            </span>
          </span>
          <span className="text-xs text-slate-400 font-normal">
            Select a prompt below to practice
          </span>
        </h3>

        {questions.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500 text-sm">
            該当するカテゴリ・難易度の設問が見つかりませんでした。
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {questions.map((q, idx) => {
              const isSelected = selectedQuestion?.text === q.text;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectQuestion(q)}
                  className={`p-5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? "bg-purple-50/90 dark:bg-purple-950/40 border-purple-500 ring-2 ring-purple-300 shadow-md"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-300"
                  }`}
                  style={isSelected ? { borderColor: themeColor } : {}}
                >
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {q.category || "General"}
                    </span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">
                      {q.text}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">
                      {isSelected ? "🎯 Active Prompt" : "Click to select"}
                    </span>
                    <span className="font-bold" style={{ color: themeColor }}>
                      Practice →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 選択中設問の練習 ＆ 録音エリア */}
      {selectedQuestion && (
        <div
          className="bg-white dark:bg-slate-900 border-2 rounded-3xl p-6 shadow-md space-y-6"
          style={{ borderColor: themeColor }}
        >
          <div className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold" style={{ color: themeColor }}>
                Selected Practice Question
              </span>
              <span className="text-xs text-slate-400">
                Category: {selectedQuestion.category || "General"}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              「{selectedQuestion.text}」
            </h2>
          </div>

          {/* マイク録音コントロール */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <p className="font-bold text-slate-800 dark:text-slate-200">
                🎙 スピーキング回答手順:
              </p>
              <p>
                「Start Recording」を押して回答を録音し、終わったら「Stop & Submit」を押してください。
              </p>
            </div>

            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                disabled={isAnalyzing}
                className="text-white font-bold px-6 py-3 rounded-xl shadow-md transition cursor-pointer text-sm shrink-0 disabled:opacity-50"
                style={{ backgroundColor: themeColor }}
              >
                🎙 Start Recording
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-6 py-3 rounded-xl shadow-md transition animate-pulse cursor-pointer text-sm shrink-0"
              >
                ⏹ Stop & Submit
              </button>
            )}
          </div>

          {/* 解析・書き起こし状況 */}
          {isAnalyzing && (
            <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-200 dark:border-purple-900 text-center text-xs font-bold text-purple-700 dark:text-purple-300 animate-pulse">
              ⏳ AI面接官が音声を聞き取って評価中...
            </div>
          )}

          {userSpeechText && !isAnalyzing && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <span className="font-bold" style={{ color: themeColor }}>
                Your Transcribed Speech:
              </span>
              <p className="italic">"{userSpeechText}"</p>
            </div>
          )}

          {/* AI 即時フィードバックカード */}
          {feedback && (
            <OralDrillFeedbackCard
              feedback={feedback}
              onNextQuestion={handleNextQuestion}
              themeColor={themeColor}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default OralQuestionPracticeCard;