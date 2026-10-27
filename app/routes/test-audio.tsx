/**
 * @file test-audio.tsx
 * @description Audio TTS (Text-to-Speech) & STT (Speech-to-Text) Dedicated Debug Test Page
 * 💡 Features:
 * 1. Test AI Voice Generation (TTS) with detailed API response logs & Web Speech API Fallback
 * 2. Test Speech Transcription (STT) with microphone recording & mode selection
 * 3. Real-time API log console for endpoint, status codes, and error inspection
 */
import React, { useState, useRef, useEffect } from "react";
import type { MetaFunction } from "@remix-run/react";
import PageLayout from "../components/PageLayout";

export const meta: MetaFunction = () => {
  return [
    { title: "Audio & Speech Test Page | JPTutor AI Yamato Debug Tools" },
    { name: "description", content: "Standalone test environment for Speech-to-Text (STT) and Text-to-Speech (TTS) audio APIs." },
  ];
};

export default function TestAudioPage() {
  // Config & Endpoint state
  const [apiEndpoint, setApiEndpoint] = useState<string>("https://api.jptutoraiyamato.com/chat");
  const [logs, setLogs] = useState<string[]>([]);

  // TTS Test state
  const [ttsText, setTtsText] = useState<string>("こんにちは！こちらは音声再生のテストです。");
  const [ttsSpeed, setTtsSpeed] = useState<number>(1.0);
  const [isTtsLoading, setIsTtsLoading] = useState<boolean>(false);

  // STT Test state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isSttLoading, setIsSttLoading] = useState<boolean>(false);
  const [sttMode, setSttMode] = useState<string>("drill-elaborate-transcribe");
  const [transcribedText, setTranscribedText] = useState<string>("");
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const appendLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${msg}`, ...prev]);
  };

  // Browser Capabilities Check
  useEffect(() => {
    appendLog("=== Audio Debug Environment Initialized ===");
    if (typeof window !== "undefined") {
      appendLog(`User Agent: ${navigator.userAgent}`);
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        appendLog("✅ Navigator MediaDevices API supported.");
      } else {
        appendLog("❌ Navigator MediaDevices API NOT supported!");
      }

      if (typeof MediaRecorder !== "undefined") {
        appendLog("✅ MediaRecorder supported.");
        const codecs = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];
        codecs.forEach((c) => {
          appendLog(`Codec '${c}': ${MediaRecorder.isTypeSupported(c) ? "SUPPORTED" : "unsupported"}`);
        });
      } else {
        appendLog("❌ MediaRecorder NOT supported!");
      }
    }
  }, []);

  // 1. TTS Test Handler
  const handleTestTTS = async () => {
    if (!ttsText.trim()) {
      alert("発声テキストを入力してください。");
      return;
    }
    setIsTtsLoading(true);
    appendLog(`👉 Starting TTS Request to: ${apiEndpoint}`);
    appendLog(`Payload: speakText="${ttsText}", speed=${ttsSpeed}`);

    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          speakText: ttsText.trim(),
          level: "normal",
          learningPace: "normal",
          pace: "normal",
          speed: ttsSpeed,
        }),
      });

      appendLog(`HTTP Response Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const audioBlob = await response.blob();
        appendLog(`✅ Audio Blob received. Size: ${audioBlob.size} bytes, Type: ${audioBlob.type}`);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        await audio.play();
        appendLog("🔊 Audio playback started successfully!");
      } else {
        const errText = await response.text();
        appendLog(`❌ Server Error (${response.status}): ${errText.slice(0, 200)}`);
        appendLog("⚠️ Triggering Web Speech API (Browser Fallback)...");
        triggerWebSpeechFallback(ttsText, ttsSpeed);
      }
    } catch (err: any) {
      appendLog(`❌ Network / Fetch Error: ${err.message || String(err)}`);
      appendLog("⚠️ Triggering Web Speech API (Browser Fallback)...");
      triggerWebSpeechFallback(ttsText, ttsSpeed);
    } finally {
      setIsTtsLoading(false);
    }
  };

  const triggerWebSpeechFallback = (text: string, speed: number) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ja-JP";
      utterance.rate = speed;
      window.speechSynthesis.speak(utterance);
      appendLog("🔊 Fallback WebSpeech utterance queued.");
    } else {
      appendLog("❌ Web Speech API not supported on this browser.");
    }
  };

  // 2. STT Recording Start Handler
  const startRecording = async () => {
    try {
      appendLog("🎙 Requesting microphone permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      appendLog("✅ Microphone access granted.");

      let mimeType = "audio/webm";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) mimeType = "audio/webm;codecs=opus";
        else if (MediaRecorder.isTypeSupported("audio/mp4")) mimeType = "audio/mp4";
      }

      appendLog(`Using MediaRecorder mimeType: ${mimeType}`);
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        appendLog(`⏹ Recording stopped. Audio Blob size: ${blob.size} bytes`);
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);
        await uploadAndTranscribeAudio(blob, mimeType);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      appendLog("🔴 Recording active...");
    } catch (err: any) {
      appendLog(`❌ Microphone Error: ${err.message || String(err)}`);
      alert(`マイクアクセスに失敗しました: ${err.message || String(err)}`);
    }
  };

  // STT Recording Stop Handler
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
    }
  };

  // 3. STT Transcription Upload Handler
  const uploadAndTranscribeAudio = async (audioBlob: Blob, mimeType: string) => {
    setIsSttLoading(true);
    setTranscribedText("");
    appendLog(`👉 Sending STT Request to: ${apiEndpoint}`);
    appendLog(`FormData: mode="${sttMode}", level="normal"`);

    const formData = new FormData();
    formData.append("audio", audioBlob, mimeType.includes("mp4") ? "test.mp4" : "test.webm");
    formData.append("mode", sttMode);
    formData.append("level", "normal");
    formData.append("learningPace", "normal");
    formData.append("pace", "normal");

    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        body: formData,
      });

      appendLog(`STT HTTP Response Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        appendLog(`✅ STT Response JSON: ${JSON.stringify(data)}`);
        setTranscribedText(data.userText || "（文字起こし結果が空でした）");
      } else {
        const errText = await response.text();
        appendLog(`❌ STT Server Error (${response.status}): ${errText.slice(0, 300)}`);
      }
    } catch (err: any) {
      appendLog(`❌ STT Network Error: ${err.message || String(err)}`);
    } finally {
      setIsSttLoading(false);
    }
  };

  return (
    <PageLayout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4">
        <main className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-sm border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                Debug Utility
              </span>
              <span className="text-xs text-slate-500">Audio & Speech API Inspector</span>
            </div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">
              🧪 Audio Test Page (TTS & STT Isolated Test)
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              This page isolates and tests AI voice generation (TTS) and microphone transcription (STT) without complex game hooks.
            </p>
          </div>

          {/* Endpoint Selector */}
          <div className="bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm border-slate-200 dark:border-slate-800 space-y-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              🌐 API Endpoint URL to Test:
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                className="flex-grow p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono"
              />
              <button
                type="button"
                onClick={() => setApiEndpoint("https://api.jptutoraiyamato.com/chat")}
                className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-xs font-bold rounded-xl shrink-0"
              >
                Reset to API Domain
              </button>
              <button
                type="button"
                onClick={() => setApiEndpoint("/api/chat")}
                className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-xs font-bold rounded-xl shrink-0"
              >
                Set Relative (/api/chat)
              </button>
            </div>
          </div>

          {/* Grid Layout for TTS & STT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. TTS Test Section */}
            <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-sm border-sky-200 dark:border-sky-900/50 space-y-4">
              <div className="border-b pb-3 border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-bold text-sky-600 dark:text-sky-400 flex items-center gap-2">
                  <span>🔊</span> 1. AI Voice Output Test (TTS)
                </h2>
                <p className="text-xs text-slate-500">
                  Sends text to API and plays returned MP3/WebM audio stream.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Text to Speak:
                </label>
                <textarea
                  rows={3}
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-500">Speed:</span>
                  <select
                    value={ttsSpeed}
                    onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                    className="p-2 rounded-lg border text-xs bg-slate-50 dark:bg-slate-800"
                  >
                    <option value={0.8}>0.8x (Slow)</option>
                    <option value={1.0}>1.0x (Normal)</option>
                    <option value={1.2}>1.2x (Fast)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleTestTTS}
                  disabled={isTtsLoading}
                  className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl shadow-md text-xs cursor-pointer transition"
                >
                  {isTtsLoading ? "⏳ Speaking..." : "▶️ Test Voice Output"}
                </button>
              </div>
            </div>

            {/* 2. STT Test Section */}
            <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-sm border-emerald-200 dark:border-emerald-900/50 space-y-4">
              <div className="border-b pb-3 border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <span>🎙️</span> 2. Microphone STT Test
                </h2>
                <p className="text-xs text-slate-500">
                  Records your voice, uploads to API, and displays transcribed text.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Transcribe Mode Parameter:
                </label>
                <select
                  value={sttMode}
                  onChange={(e) => setSttMode(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="drill-elaborate-transcribe">drill-elaborate-transcribe (Recommended)</option>
                  <option value="drill-custom-transcribe">drill-custom-transcribe</option>
                  <option value="drill-practice">drill-practice</option>
                  <option value="transcribe">transcribe</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-4 pt-2">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={isSttLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl shadow-md text-xs cursor-pointer transition flex items-center gap-2"
                  >
                    <span>🎙️</span> Start Recording
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-6 py-3 rounded-xl shadow-md text-xs cursor-pointer transition animate-pulse flex items-center gap-2"
                  >
                    <span>⏹</span> Stop & Submit
                  </button>
                )}

                {isSttLoading && (
                  <span className="text-xs font-bold text-emerald-600 animate-pulse">
                    ⏳ Transcribing audio...
                  </span>
                )}
              </div>

              {recordedAudioUrl && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400">Recorded Audio Playback:</span>
                  <audio src={recordedAudioUrl} controls className="w-full h-8" />
                </div>
              )}

              <div className="p-3.5 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-1 min-h-[80px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Transcribed Result (userText):
                </span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {transcribedText ? `"${transcribedText}"` : "(Waiting for recording submission...)"}
                </p>
              </div>
            </div>
          </div>

          {/* 3. Realtime Console Log Window */}
          <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 shadow-lg border border-slate-800 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-bold text-amber-400 flex items-center gap-2">
                <span>🖥</span> Real-time Console Log Inspector ({logs.length} logs)
              </span>
              <button
                type="button"
                onClick={() => setLogs([])}
                className="text-[11px] px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
              >
                Clear Console
              </button>
            </div>

            <div className="h-64 overflow-y-auto space-y-1.5 pr-2 leading-relaxed">
              {logs.length === 0 ? (
                <div className="text-slate-500 italic">Console logs will appear here as you run tests...</div>
              ) : (
                logs.map((log, i) => (
                  <div
                    key={i}
                    className={`${
                      log.includes("❌")
                        ? "text-rose-400"
                        : log.includes("✅") || log.includes("🔊")
                        ? "text-emerald-400"
                        : log.includes("👉") || log.includes("HTTP")
                        ? "text-sky-300"
                        : "text-slate-300"
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </PageLayout>
  );
}
