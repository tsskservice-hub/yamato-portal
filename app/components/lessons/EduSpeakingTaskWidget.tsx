/**
 * @file app/components/lessons/EduSpeakingTaskWidget.tsx
 * @description 教科書準拠の学習ページに配置する、一問一答スピーキング課題ウィジェット（挨拶・事前定義質問の音声読み上げ・マイク音声認識・終了挨拶対応版）
 */

import React, { useState } from "react";
import { supabase } from "~/lib/supabaseClient";

export interface EduSpeakingTaskWidgetProps {
  title: string;          // 課題のタイトル（例: "Speaking Task: Family Members"）
  description?: string;   // 課題の説明文やプロンプト
  userId: string;         // ユーザーID
  appType?: string;       // アプリ種別（例: "obento-unit-4-lesson-1"）
  lessonSlug?: string;    // レッスンSlug
  topic?: string;         // AIに渡すトピックや学習内容の指定
  questions?: {           // あらかじめ先生が用意した質問リスト
    question: string;
    english?: string;
  }[];
  onCompleted?: () => void; // 全問完了時のコールバック
}

export const EduSpeakingTaskWidget: React.FC<EduSpeakingTaskWidgetProps> = ({
  title,
  description = "Practice speaking by listening to AI Yamato's questions and answering via microphone.",
  userId,
  appType = "obento-unit-4-lesson-1",
  lessonSlug = "obento-unit-4-lesson-1",
  topic,
  questions = [
    { question: "家族は何人ですか？", english: "How many people are in your family?" },
    { question: "お父さんはどんな人ですか？", english: "What is your father like?" },
    { question: "ペットを飼っていますか？", english: "Do you keep any pets?" }
  ],
  onCompleted,
}) => {
  const [isStarted, setIsStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [sessionFinished, setSessionFinished] = useState(false);

  // 音声合成（TTS）関数（日本語の挨拶や質問を読み上げ）
  const speakText = (text: string, onEnded?: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      if (onEnded) onEnded();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.9;
    
    if (onEnded) {
      utterance.onend = () => onEnded();
    }
    
    window.speechSynthesis.speak(utterance);
  };

  // 練習セッション開始（最初の挨拶 ➔ 1問目の質問）
  const startSession = () => {
    setIsStarted(true);
    setSessionFinished(false);
    setCurrentIndex(0);
    setTranscript("");
    
    setStatusMessage("AI Yamato is greeting...");
    speakText("こんにちは！やまと先生です。それでは、スピーキングの練習を始めましょう。", () => {
      playCurrentQuestion(0);
    });
  };

  // 指定インデックスの質問を読み上げ、マイク入力を有効化
  const playCurrentQuestion = (index: number) => {
    if (index >= questions.length) {
      setStatusMessage("Session completed! Saying goodbye...");
      speakText("よく頑張りましたね！これでスピーキングの練習を終わります。お疲れ様でした！", () => {
        setSessionFinished(true);
        setIsStarted(false);
        if (onCompleted) {
          onCompleted();
        }
      });
      return;
    }

    const q = questions[index];
    setStatusMessage(`Question ${index + 1} of ${questions.length}: Listening for your answer...`);
    speakText(q.question, () => {
      startSpeechRecognition(index);
    });
  };

  // Web Speech Recognition API による音声認識
  const startSpeechRecognition = (index: number) => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatusMessage("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setStatusMessage(`🎤 Listening... Please answer in Japanese.`);
    };

    recognition.onresult = (event: any) => {
      const speechResult = event.results[0][0].transcript;
      setTranscript(speechResult);
      setIsListening(false);
      setStatusMessage(`Recognised: "${speechResult}" ✅ Moving to next...`);

      setTimeout(() => {
        setTranscript("");
        const nextIdx = index + 1;
        setCurrentIndex(nextIdx);
        playCurrentQuestion(nextIdx);
      }, 1500);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setStatusMessage("Voice recognition error. Click the mic button to retry.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (err) {
      setIsListening(false);
    }
  };

  // セッション中断・終了
  const stopSession = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsStarted(false);
    setIsListening(false);
    setStatusMessage("Session stopped.");
  };

  return (
    <div className="my-6 p-6 bg-gradient-to-br from-indigo-50/60 to-white rounded-3xl border border-indigo-100 shadow-sm space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <span className="inline-block px-2.5 py-1 mb-2 text-xs font-bold tracking-wide text-indigo-700 bg-indigo-100 rounded-full">
            🗣️ Speaking Task (AI Yamato Drill)
          </span>
          <h3 className="text-lg sm:text-xl font-black text-slate-900">{title}</h3>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">{description}</p>
          {topic && (
            <p className="text-xs text-indigo-600 font-medium mt-1">Topic: {topic}</p>
          )}
        </div>
      </div>

      {isStarted && (
        <div className="p-4 bg-white rounded-2xl border border-indigo-100 shadow-inner space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Progress: Question {Math.min(currentIndex + 1, questions.length)} / {questions.length}</span>
            <span className="text-indigo-600">{Math.round(((currentIndex) / questions.length) * 100)}% Completed</span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
            />
          </div>

          {currentIndex < questions.length && (
            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center space-y-1">
              <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">AI Question</span>
              <p className="text-xl font-black text-slate-900">{questions[currentIndex].question}</p>
              {questions[currentIndex].english && (
                <p className="text-xs text-slate-500 italic">({questions[currentIndex].english})</p>
              )}
            </div>
          )}

          {transcript && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-800">
              Your Answer: "{transcript}"
            </div>
          )}
        </div>
      )}

      <div className="text-xs sm:text-sm font-bold text-slate-700 bg-white/80 px-4 py-3 rounded-xl border border-slate-100 shadow-sm">
        📢 {statusMessage || (sessionFinished ? "🎉 Speaking Task Completed Successfully!" : "Ready to start speaking practice.")}
      </div>

      <div className="flex items-center gap-3">
        {!isStarted ? (
          <button
            type="button"
            onClick={startSession}
            className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition transform active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <span>🎙️</span>
            <span>Start Voice Speaking Practice</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={stopSession}
            className="py-3 px-6 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition transform active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <span>⏹️</span>
            <span>End Session</span>
          </button>
        )}
      </div>
    </div>
  );
};