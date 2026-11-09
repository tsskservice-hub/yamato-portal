/**
 * @file app/hooks/useRealtimeSpeaking.ts
 * @description OpenAI Realtime API を用いたWebRTC音声会話および5往復の進行状況を管理するカスタムフック（Unit 4 プロンプト連動版）
 */
import { useState, useRef, useCallback, useEffect } from 'react';

interface UseRealtimeSpeakingProps {
  userId: string;
  onFinished?: () => void;
  apiBaseUrl?: string; // バックエンドAPIのURL（デフォルト: https://api.jptutoraiyamato.com）
  appType?: string;    // アプリ種別・レッスン種別（例: "obento-unit-4-lesson-1"）
  lessonSlug?: string; // レッスンSlug
  topic?: string;      // 課題の具体的なトピック指示
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
  const [statusText, setStatusText] = useState('「スタート」を押して会話を始めてください');
  const [turnCount, setTurnCount] = useState(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  const stopSession = useCallback(() => {
    // マイクのストリームを停止
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // WebRTC接続を閉じる
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setIsConnected(false);
    setIsAiSpeaking(false);
    setStatusText('会話が終了しました');
  }, []);

  const startSession = useCallback(async () => {
    try {
      setStatusText('セッションを準備中...');
      setTurnCount(0);

      // 1. バックエンドからエフェメラルセッション（一時トークン）を取得（appTypeやlessonSlug、topicを送信）
      const endpoint = `${apiBaseUrl}/api/realtime/session`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          appType,
          lessonSlug,
          topic,
        }),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as any;
        throw new Error(errData.error || 'セッションの取得に失敗しました');
      }

      const data = (await res.json()) as any;
      const EPHEMERAL_KEY = data.session?.client_secret?.value;

      if (!EPHEMERAL_KEY) {
        throw new Error('有効なエフェメラルキーが取得できませんでした');
      }

      // 2. WebRTC PeerConnection の初期化
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      // 3. AIからの音声出力を再生するための <audio> 要素の準備
      if (!audioElementRef.current) {
        audioElementRef.current = document.createElement('audio');
        audioElementRef.current.autoplay = true;
      }

      pc.ontrack = (e) => {
        if (audioElementRef.current) {
          audioElementRef.current.srcObject = e.streams[0];
        }
      };

      // 4. ブラウザのマイク音声を取得してWebRTCに追加
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = mediaStream;
      mediaStream.getTracks().forEach((track) => {
        pc.addTrack(track, mediaStream);
      });

      // 5. データチャネル（イベント監視・ターン数制御用）の設定
      const dataChannel = pc.createDataChannel('oai-events');
      dataChannel.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          // AIの発話開始・終了の検知
          if (msg.type === 'response.audio.started' || msg.type === 'response.content_part.added') {
            setIsAiSpeaking(true);
            setStatusText('AIが話しています...');
          }
          
          // 1回のAIのターンが完了したタイミング
          if (msg.type === 'response.done') {
            setIsAiSpeaking(false);
            setStatusText('あなたの番です（話してください...）');
            
            setTurnCount((prev) => {
              const next = prev + 1;
              if (next >= 5 && onFinished) {
                onFinished();
              }
              return next;
            });
          }
        } catch (err) {
          console.error('Data channel message parse error:', err);
        }
      };

      // 6. SDP Offer の作成と OpenAI Realtime API エンドポイントへの送信
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-realtime-preview';
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(`OpenAI Realtime SDP connection failed: ${sdpResponse.statusText}`);
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      setIsConnected(true);
      setStatusText('会話中（AIが聞いています...）');
    } catch (err: any) {
      console.error('❌ [useRealtimeSpeaking] Start Error:', err);
      setStatusText(`エラー: ${err?.message || '接続に失敗しました'}`);
      stopSession();
    }
  }, [userId, apiBaseUrl, appType, lessonSlug, topic, onFinished, stopSession]);

  return {
    isConnected,
    isAiSpeaking,
    statusText,
    turnCount,
    startSession,
    stopSession,
  };
}