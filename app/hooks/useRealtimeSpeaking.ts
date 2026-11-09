/**
 * @file app/hooks/useRealtimeSpeaking.ts
 * @description Google Cloud Vertex AI 対応の日本語スピーキング対話管理カスタムフック
 */
import { useState, useCallback, useEffect } from 'react';

interface UseRealtimeSpeakingProps {
  userId: string;
  onFinished?: () => void;
  apiBaseUrl?: string; 
  appType?: string;    
  lessonSlug?: string; 
  topic?: string;      
}

export function useRealtimeSpeaking({
  userId,
  onFinished,
  apiBaseUrl = 'https://api.jptutoraiyamato.com',
  appType = 'obento-unit-4-lesson-1',
  lessonSlug = 'obento-unit-4-lesson-1',
  topic = '家族の人数や構成、ペットについての質問と答え方の練習',
}: UseRealtimeSpeakingProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [statusText, setStatusText] = useState('Click "Start Conversation" to begin.');
  const [turnCount, setTurnCount] = useState(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  const stopSession = useCallback(() => {
    setIsConnected(false);
    setIsAiSpeaking(false);
    setStatusText('Conversation ended.');
  }, []);

  // AIの返答を音声ブラウザ合成（SpeechSynthesis）で読み上げる補助関数
  const speakText = (text: string, onEnd?: () => void) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP'; // 日本語音声
      utterance.rate = 0.9;     // 少しゆっくり（学習者向け）
      utterance.onend = () => {
        setIsAiSpeaking(false);
        if (onEnd) onEnd();
      };
      setIsAiSpeaking(true);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsAiSpeaking(false);
      if (onEnd) onEnd();
    }
  };

  const startSession = useCallback(async () => {
    try {
      setStatusText('Connecting to AI Yamato...');
      setTurnCount(0);
      setChatHistory([]);

      const endpoint = `${apiBaseUrl}/api/realtime/session`;
      
      // 最初の一言（挨拶と最初の質問）をAIに要求する
      const initialMessage = "こんにちは！スピーキング課題を始めます。最初の質問をしてください。";
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          appType,
          lessonSlug,
          topic,
          message: initialMessage,
          history: [],
        }),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as any;
        throw new Error(errData.error || 'Failed to start session');
      }

      const data = (await res.json()) as any;
      const aiReply = data.reply || "こんにちは！";

      setIsConnected(true);
      setStatusText('AI Yamato is speaking...');
      setChatHistory([
        { role: 'user', content: initialMessage },
        { role: 'assistant', content: aiReply },
      ]);

      // AIの返答を音声で読み上げ
      speakText(aiReply, () => {
        setStatusText('Your turn (Please reply in Japanese...)');
      });

    } catch (err: any) {
      console.error('❌ [useRealtimeSpeaking] Start Error:', err);
      setStatusText(`Error: ${err?.message || 'Connection failed'}`);
      stopSession();
    }
  }, [userId, apiBaseUrl, appType, lessonSlug, topic, stopSession]);

  // ユーザーが生徒としての返答を送信する関数
  const sendUserMessage = async (userText: string) => {
    if (!isConnected) return;

    try {
      setStatusText('AI Yamato is thinking...');
      setIsAiSpeaking(true);

      const newHistory = [
        ...chatHistory,
        { role: 'user', content: userText }
      ];
      setChatHistory(newHistory);

      const endpoint = `${apiBaseUrl}/api/realtime/session`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          appType,
          lessonSlug,
          topic,
          message: userText,
          history: newHistory,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to send message');
      }

      const data = (await res.json()) as any;
      const aiReply = data.reply || "なるほど！";

      setChatHistory([
        ...newHistory,
        { role: 'assistant', content: aiReply }
      ]);

      setTurnCount((prev) => {
        const next = prev + 1;
        if (next >= 5 && onFinished) {
          onFinished();
        }
        return next;
      });

      setStatusText('AI Yamato is speaking...');
      speakText(aiReply, () => {
        setStatusText('Your turn (Please reply in Japanese...)');
      });

    } catch (err: any) {
      console.error('❌ Send Message Error:', err);
      setStatusText(`Error: ${err?.message}`);
      setIsAiSpeaking(false);
    }
  };

  return {
    isConnected,
    isAiSpeaking,
    statusText,
    turnCount,
    startSession,
    stopSession,
    sendUserMessage,
    chatHistory,
  };
}