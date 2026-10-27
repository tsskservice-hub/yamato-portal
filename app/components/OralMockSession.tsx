import React, { useState, useEffect, useRef } from "react";
import OralExaminerAvatar from "./OralExaminerAvatar";
import useOralAudioRecorder from "./OralAudioRecorder";
import { MockExamConfig } from "./OralMockConfig";

export interface ExamMessage {
  id: string;
  sender: "examiner" | "student";
  text: string;
  timestamp: string;
  section?: "section1" | "section2";
}

export interface ExamResultData {
  config: MockExamConfig;
  messages: ExamMessage[];
  totalDurationSeconds: number;
  fillerCount: number;
  overallScore: number;
}

export interface OralMockSessionProps {
  config: MockExamConfig;
  onExamComplete: (result: ExamResultData) => void;
  onCancel: () => void;
  themeColor?: string;
}

export const OralMockSession: React.FC<OralMockSessionProps> = ({
  config,
  onExamComplete,
  onCancel,
  themeColor = "#ef4444",
}) => {
  const [messages, setMessages] = useState<ExamMessage[]>([
    {
      id: "msg-1",
      sender: "examiner",
      text: `こんにちは、${config.studentName}さん。VCE日本語口頭試験を始めます。準備はいいですか？`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      section: "section1",
    },
  ]);

  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(true);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [textInput, setTextInput] = useState<string>("");
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const recorder = useOralAudioRecorder({
    silenceThresholdMs: 1400,
    onSilenceDetected: () => {
      // Auto trigger send when student stops speaking
    },
  });

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Exam timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Simulate AI Speaking completion
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAiSpeaking(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleSendStudentAnswer = (answerText: string) => {
    if (!answerText.trim()) return;

    const newMsg: ExamMessage = {
      id: `student-${Date.now()}`,
      sender: "student",
      text: answerText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setTextInput("");
    setIsAiThinking(true);

    // Count fillers
    recorder.countFillers(answerText);

    // Simulate AI Examiner Response
    setTimeout(() => {
      setIsAiThinking(false);
      setIsAiSpeaking(true);

      const examinerResponse: ExamMessage = {
        id: `examiner-${Date.now()}`,
        sender: "examiner",
        text: "なるほど、素晴らしいですね。では、次についての考えを聞かせてください。",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, examinerResponse]);

      setTimeout(() => {
        setIsAiSpeaking(false);
      }, 3000);
    }, 1500);
  };

  const handleFinishExam = () => {
    onExamComplete({
      config,
      messages,
      totalDurationSeconds: elapsedSeconds,
      fillerCount: recorder.fillerCount,
      overallScore: 8, // Out of 10
    });
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[80vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
      {/* Top Header Bar */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <div>
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
              VCE Oral Exam Simulation
            </h4>
            <span className="text-[10px] text-slate-400">
              Candidate: {config.studentName} ({config.learningPace.toUpperCase()})
            </span>
          </div>
        </div>

        {/* Timer & Finish Controls */}
        <div className="flex items-center space-x-4">
          <div className="px-3 py-1 bg-slate-200 dark:bg-slate-800 rounded-lg text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
            ⏱️ {formatTime(elapsedSeconds)} / 15:00
          </div>
          <button
            type="button"
            onClick={handleFinishExam}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
          >
            終了 & 評価 (Finish)
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
        {/* Left Column: Examiner Avatar & Visual State */}
        <div className="p-6 bg-slate-50/50 dark:bg-slate-950/50 border-r border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center space-y-6">
          <OralExaminerAvatar
            isSpeaking={isAiSpeaking}
            isListening={recorder.isRecording}
            isThinking={isAiThinking}
            examinerName="Yamato Sensei"
            themeColor={themeColor}
            size="lg"
          />

          {/* Student Support Material Thumbnail */}
          {config.supportMaterialUrl && (
            <div className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-1">
              <span className="text-[10px] font-bold text-slate-400">Support Material</span>
              <img
                src={config.supportMaterialUrl}
                alt="Support Material"
                className="w-full h-24 object-cover rounded-xl"
              />
            </div>
          )}
        </div>

        {/* Right Column: Interactive Chat Log & Controls */}
        <div className="lg:col-span-2 flex flex-col h-full bg-white dark:bg-slate-900">
          {/* Messages Scroll Area */}
          <div ref={chatContainerRef} className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "student" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                    msg.sender === "student"
                      ? "bg-slate-900 text-white rounded-br-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-xs border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}
          </div>

          {/* Student Input / Mic Bar */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center gap-2">
            <button
              type="button"
              onClick={recorder.isRecording ? recorder.stopRecording : recorder.startRecording}
              className={`p-3 rounded-2xl font-bold text-xs flex items-center justify-center transition cursor-pointer shadow-md ${
                recorder.isRecording
                  ? "bg-red-600 text-white animate-pulse"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300"
              }`}
              title={recorder.isRecording ? "Stop Microphone" : "Start Microphone"}
            >
              🎙️ {recorder.isRecording ? "Listening..." : "Mic"}
            </button>

            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendStudentAnswer(textInput)}
              placeholder="Type your answer or speak using microphone..."
              className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-hidden"
            />

            <button
              type="button"
              onClick={() => handleSendStudentAnswer(textInput)}
              className="px-5 py-2.5 rounded-2xl font-bold text-white text-xs shadow-md cursor-pointer transition hover:opacity-90"
              style={{ backgroundColor: themeColor }}
            >
              回答 (Send)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OralMockSession;
