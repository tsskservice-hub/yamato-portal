import React, { useState, useEffect } from "react";
import { OralExamQuestionItem } from "../data/oral-exam-questions";
import useOralAudioRecorder from "./OralAudioRecorder";
import OralDrillFeedbackCard, { FeedbackData } from "./OralDrillFeedbackCard";

export interface OralQuestionPracticeCardProps {
  questions: OralExamQuestionItem[];
  selectedQuestion: OralExamQuestionItem | null;
  onSelectQuestion: (question: OralExamQuestionItem | null) => void;
  selectedLevel?: "steady" | "normal" | "accelerated";
  themeColor?: string;
  apiEndpoint?: string;
  modeLabel?: string;
  userId?: string;
  onCreditsUpdated?: (newCredits?: number) => void;
}

export const OralQuestionPracticeCard: React.FC<OralQuestionPracticeCardProps> = ({
  questions,
  selectedQuestion,
  onSelectQuestion,
  selectedLevel = "normal",
  themeColor = "#a855f7",
  apiEndpoint = "https://api.jptutoraiyamato.com/chat",
  modeLabel = "Practice",
  userId,
  onCreditsUpdated,
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
      const isElaborate = modeLabel.toLowerCase().includes("detailed") || modeLabel.toLowerCase().includes("elaborate");
      const appType = isElaborate ? "eoy-oral-elaborate" : "eoy-oral-drill";
      const isVoiceMode = isElaborate ? "elaborate" : "drill";

      const formData = new FormData();
      formData.append("audio", blob, "answer.webm");
      formData.append("mode", isElaborate ? "drill-elaborate-transcribe" : "drill-transcribe");
      formData.append("appType", appType);
      formData.append("isVoiceMode", isVoiceMode);
      formData.append("question", selectedQuestion.text);
      formData.append("level", selectedLevel);
      if (userId) {
        formData.append("userId", userId);
      }

      const response = await fetch(apiEndpoint, { method: "POST", body: formData });
      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as any;
        if (response.status === 402) {
          alert(`Insufficient credits (${errorData.message || "Please top up credits"}).`);
          return;
        }
        throw new Error("API response error");
      }

      const data = (await response.json()) as any;

      setUserSpeechText(data.userText || "（音声入力の書き起こし完了）");

      setFeedback({
        scoreLabel: data.scoreLabel || "👍 Great Answer!",
        evaluationHtml: data.evaluationHtml || "Well structured response with good grammar usage.",
        correctionsHtml: data.correctionsHtml || "Try adding more detail with 〜からです or 〜ので.",
        refinedPolishHtml: data.refinedPolishHtml || selectedQuestion.defaultAnswer || selectedQuestion.default_answer_original,
        defaultAnswerWithRuby: selectedQuestion.defaultAnswer || selectedQuestion.default_answer_original,
      });

      // 💡 クレジット残高の動的更新通知
      if (onCreditsUpdated) {
        if (typeof data.remainingCredits === "number") {
          onCreditsUpdated(data.remainingCredits);
        } else if (typeof data.currentCredits === "number") {
          onCreditsUpdated(data.currentCredits);
        } else {
          onCreditsUpdated();
        }
      }
    } catch (err) {
      console.error("Failed to process oral response:", err);
      alert("申し訳ありません。音声解析に失敗しました。もう一度お試しください。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNextQuestion = () => {
    if (!questions || questions.length === 0) return;
    const currentIndex = selectedQuestion
      ? questions.findIndex((q) => q.text === selectedQuestion.text)
      : -1;
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
                  style={
                    isSelected
                      ? { borderColor: themeColor }
                      : {}
                  }
                >
                  <div className="space-y-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    >
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