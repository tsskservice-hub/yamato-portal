/**
 * @file app/components/lessons/EduSpeakingTaskWidget.tsx
 * @description 教科書準拠の学習ページに配置する、リアルタイム音声スピーキング課題用の再利用可能ウィジェット（Unit 4 / 英語指示対応版）
 */
import React from 'react';
import { useRealtimeSpeaking } from '../../hooks/useRealtimeSpeaking';

interface EduSpeakingTaskWidgetProps {
  title: string;       // 課題のタイトル（例: "Speaking Task: Family Members"）
  description?: string;// 課題の説明文やプロンプト
  userId: string;      // ユーザーID
  appType?: string;    // アプリ種別（例: "obento-unit-4-lesson-1"）
  lessonSlug?: string; // レッスンSlug
  topic?: string;      // AIに渡す具体的なトピックや課題指示
  onCompleted?: () => void; // 5往復完了時のコールバック（クレジット報酬付与など）
}

export const EduSpeakingTaskWidget: React.FC<EduSpeakingTaskWidgetProps> = ({
  title,
  description = "Have a 5-turn interactive voice conversation with AI Yamato to practice your speaking skills.",
  userId,
  appType = "obento-unit-4-lesson-1",
  lessonSlug = "obento-unit-4-lesson-1",
  topic = "Practice asking and answering questions about family members and household size.",
  onCompleted,
}) => {
  const {
    isConnected,
    isAiSpeaking,
    statusText,
    turnCount,
    startSession,
    stopSession,
  } = useRealtimeSpeaking({
    userId,
    appType,
    lessonSlug,
    topic,
    onFinished: () => {
      if (onCompleted) {
        onCompleted();
      }
    },
  });

  // 進捗率の計算（最大5往復）
  const progressPercent = Math.min(Math.round((turnCount / 5) * 100), 100);

  return (
    <div className="my-6 p-6 bg-gradient-to-br from-indigo-50/60 to-white rounded-2xl border border-indigo-100 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="inline-block px-2.5 py-1 mb-2 text-xs font-semibold tracking-wide text-indigo-700 bg-indigo-100 rounded-full">
            🗣️ Speaking Task (AI Yamato)
          </span>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
      </div>

      {/* ステータス & カウンター表示 */}
      {isConnected && (
        <div className="mb-4 p-4 bg-white rounded-xl border border-indigo-50 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Task Progress</span>
            <span className="text-xs font-bold text-indigo-600">{turnCount} / 5 Turns</span>
          </div>

          {/* プログレスバー */}
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3 overflow-hidden">
            <div
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          <div className="flex items-center space-x-2">
            {isAiSpeaking ? (
              <span className="inline-flex items-center text-xs font-semibold text-amber-600 animate-pulse">
                <span className="w-2 h-2 mr-1.5 bg-amber-500 rounded-full"></span>
                AI Yamato is speaking...
              </span>
            ) : (
              <span className="inline-flex items-center text-xs font-semibold text-emerald-600">
                <span className="w-2 h-2 mr-1.5 bg-emerald-500 rounded-full"></span>
                Your turn (Please speak...)
              </span>
            )}
          </div>
        </div>
      )}

      {/* 状態メッセージ */}
      <div className="mb-4 text-sm font-medium text-gray-700 bg-white/80 px-4 py-2.5 rounded-lg border border-gray-100">
        📢 {statusText}
      </div>

      {/* アクションボタン */}
      <div className="flex items-center space-x-3">
        {!isConnected ? (
          <button
            onClick={startSession}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-md transition transform active:scale-95 flex items-center space-x-2 cursor-pointer"
          >
            <span>🎙️ Start Voice Conversation</span>
          </button>
        ) : (
          <button
            onClick={stopSession}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm rounded-xl shadow-md transition transform active:scale-95 flex items-center space-x-2 cursor-pointer"
          >
            <span>⏹️ End Conversation</span>
          </button>
        )}
      </div>
    </div>
  );
};