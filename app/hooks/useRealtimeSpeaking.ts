/**
 * @file app/hooks/useRealtimeSpeaking.ts
 * @description OpenAI Realtime API (WebRTC GA仕様) を用いた日本語スピーキング対話管理カスタムフック
 */
import { useState, useCallback, useRef } from 'react';

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
  apiBaseUrl = '',
  appType = 'obento-unit-4-lesson-1',
  lessonSlug = 'obento-unit-4-lesson-1',
  topic = '家族の人数や構成、ペットについての質問と答え方の練習',
}: UseRealtimeSpeakingProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [statusText, setStatusText] = useState('Click "Start Conversation" to begin.');
  const [turnCount, setTurnCount] = useState(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const stopSession = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null;
      audioElementRef.current.remove();
      audioElementRef.current = null;
    }
    setIsConnected(false);
    setIsAiSpeaking(false);
    setStatusText('Conversation ended.');
  }, []);

  const startSession = useCallback(async () => {
    try {
      setStatusText('Requesting microphone permission...');
      setTurnCount(0);
      setChatHistory([]);

      // 1. マイク権限の取得
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      setStatusText('Connecting to AI Yamato...');

      // 2. バックエンドから一時トークン（client_secrets）を取得
      const endpoint = `${apiBaseUrl}/api/realtime/session`;
      const tokenRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          appType,
          lessonSlug,
          topic,
          prompt: "あなたは日本語会話の先生です。日本語で短く挨拶し、家族の人数や構成について最初の質問をしてください。",
        }),
      });

      if (!tokenRes.ok) {
        const errData = (await tokenRes.json().catch(() => ({}))) as any;
        throw new Error(errData.error || 'Failed to get session token');
      }

      const { value } = (await tokenRes.json()) as { value: string };

      // 3. WebRTC PeerConnection セットアップ
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      audioElementRef.current = document.createElement("audio");
      audioElementRef.current.autoplay = true;
      document.body.appendChild(audioElementRef.current);

      pc.ontrack = (event) => {
        if (audioElementRef.current) {
          audioElementRef.current.srcObject = event.streams[0];
          void audioElementRef.current.play().catch(() => {
            console.warn("音声再生には追加のユーザー操作が必要です。");
          });
          setIsAiSpeaking(true);
          setStatusText('AI Yamato is speaking...');
        }
      };

      // マイクのオーディオトラックを追加
      mediaStreamRef.current.getTracks().forEach((track) => {
        if (mediaStreamRef.current) {
          pc.addTrack(track, mediaStreamRef.current);
        }
      });

      // データチャネルの設定
      const dc = pc.createDataChannel("oai-events");
      dc.onopen = () => {
        setStatusText('Connected! Speak to AI Yamato.');
        // 接続直後の初期挨拶トリガー
        dc.send(
          JSON.stringify({
            type: "response.create",
            response: {
              instructions: "日本語で短く挨拶し、家族の人数や構成について最初の質問をしてください。",
            },
          })
        );
      };

      dc.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "response.done") {
            setIsAiSpeaking(false);
            setStatusText('Your turn (Please reply in Japanese...)');
            setTurnCount((prev) => {
              const next = prev + 1;
              if (next >= 5 && onFinished) {
                onFinished();
              }
              return next;
            });
          }
        } catch {
          // JSONパース例外無視
        }
      };

      // 4. SDP Offer の作成と OpenAI への送信
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${value}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });

      if (!sdpResponse.ok) {
        throw new Error(`WebRTC接続に失敗しました: ${sdpResponse.status}`);
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });

      setIsConnected(true);

    } catch (err: any) {
      console.error('❌ [useRealtimeSpeaking] Start Error:', err);
      setStatusText(`Error: ${err?.message || 'Connection failed'}`);
      stopSession();
    }
  }, [userId, apiBaseUrl, appType, lessonSlug, topic, stopSession, onFinished]);

  return {
    isConnected,
    isAiSpeaking,
    statusText,
    turnCount,
    startSession,
    stopSession,
  };
}