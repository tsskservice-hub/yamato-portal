import { useState, useEffect, useRef, useCallback } from "react";

export interface OralAudioRecorderState {
  isRecording: boolean;
  audioBlob: Blob | null;
  audioUrl: string | null;
  volume: number; // 0 to 100 for visualizer
  silenceDetected: boolean;
  fillerCount: number;
  duration: number; // seconds
}

export interface UseOralAudioRecorderOptions {
  silenceThresholdMs?: number; // default: 1200ms
  volumeThreshold?: number;   // 0-100 volume level below which is considered silence
  onSilenceDetected?: () => void;
}

export function useOralAudioRecorder(options: UseOralAudioRecorderOptions = {}) {
  const {
    silenceThresholdMs = 1200,
    volumeThreshold = 8,
    onSilenceDetected,
  } = options;

  const [state, setState] = useState<OralAudioRecorderState>({
    isRecording: false,
    audioBlob: null,
    audioUrl: null,
    volume: 0,
    silenceDetected: false,
    fillerCount: 0,
    duration: 0,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Stop recording cleanly
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }

    setState((prev) => ({ ...prev, isRecording: false, volume: 0 }));
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Audio Context for Volume analysis
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setState((prev) => ({
          ...prev,
          audioBlob: blob,
          audioUrl: url,
          isRecording: false,
        }));

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);

      setState({
        isRecording: true,
        audioBlob: null,
        audioUrl: null,
        volume: 0,
        silenceDetected: false,
        fillerCount: 0,
        duration: 0,
      });

      // Duration counter
      durationTimerRef.current = setInterval(() => {
        setState((prev) => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);

      // Volume monitoring & Silence detection loop
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let lastSoundTime = Date.now();

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalizedVolume = Math.min(100, Math.round((avg / 128) * 100));

        if (normalizedVolume > volumeThreshold) {
          lastSoundTime = Date.now();
        } else {
          if (Date.now() - lastSoundTime >= silenceThresholdMs) {
            setState((prev) => {
              if (!prev.silenceDetected) {
                if (onSilenceDetected) onSilenceDetected();
                return { ...prev, silenceDetected: true };
              }
              return prev;
            });
          }
        }

        setState((prev) => ({ ...prev, volume: normalizedVolume }));
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err) {
      console.error("Microphone access failed:", err);
      throw err;
    }
  }, [silenceThresholdMs, volumeThreshold, onSilenceDetected]);

  // Reset recording state
  const resetRecording = useCallback(() => {
    stopRecording();
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }
    setState({
      isRecording: false,
      audioBlob: null,
      audioUrl: null,
      volume: 0,
      silenceDetected: false,
      fillerCount: 0,
      duration: 0,
    });
  }, [stopRecording, state.audioUrl]);

  // Count Japanese speech fillers ("えーと", "あのう", etc.) from transcript
  const countFillers = useCallback((transcript: string) => {
    const fillerRegex = /(えーと|あのう|えっと|あのー|そのー|んーと)/g;
    const matches = transcript.match(fillerRegex);
    const count = matches ? matches.length : 0;
    setState((prev) => ({ ...prev, fillerCount: count }));
    return count;
  }, []);

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    ...state,
    startRecording,
    stopRecording,
    resetRecording,
    countFillers,
  };
}

export default useOralAudioRecorder;
