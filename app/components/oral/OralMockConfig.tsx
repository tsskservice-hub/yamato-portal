import React, { useState } from "react";
import { CREDIT_COSTS } from "~/data/credit-costs";

export type MockExamSection = "section1" | "section2" | "both";
export type MockDifficulty = "steady" | "normal" | "accelerated";

export interface MockExamConfig {
  examSection: MockExamSection;
  /** 試験の前（入室のあいさつ）と後（退室のあいさつ）のやりとりを入れるか */
  includeBeforeAfter: boolean;
  /** 会話の難しさ（試験官のことばのレベルと、質問の例）。easy / medium / hard */
  difficulty: MockDifficulty;
  /**
   * 試験官の話す速さ（倍率。1.0 が普通、1.2 は速い、0.8 は遅い）。
   * 生徒の learning pace（フィードバックの形を決める）とは別の設定
   */
  examinerSpeed: number;
  /** 試験官のことばを画面に文字で出すか（出さないほうが本番に近い） */
  showExaminerText: boolean;
  /** Section 2 の資料（写真 1 枚）。生徒の画面に出し、AI の試験官にも見せる（AI が説明を書き、写真そのものは保存しない） */
  supportMaterialUrl?: string | null;
}

export const MOCK_SECTION_COST: Record<MockExamSection, number> = {
  section1: CREDIT_COSTS.mockSection1,
  section2: CREDIT_COSTS.mockSection2,
  both: CREDIT_COSTS.mockFull,
};

const PACE_LABEL: Record<string, string> = { steady: "Steady", normal: "Normal", accelerated: "Accelerated" };

export interface OralMockConfigProps {
  onStartExam: (config: MockExamConfig) => void;
  /** 生徒の learning pace（フィードバックの形がこれで決まる。My Account で変えられる） */
  learningPace?: string;
  isStarting?: boolean;
  themeColor?: string;
}

export const OralMockConfig: React.FC<OralMockConfigProps> = ({
  onStartExam,
  learningPace = "normal",
  isStarting = false,
  themeColor = "#ef4444",
}) => {
  const [examSection, setExamSection] = useState<MockExamSection>("both");
  const [includeBeforeAfter, setIncludeBeforeAfter] = useState(true);
  const [difficulty, setDifficulty] = useState<MockDifficulty>("normal");
  // 試験官の話す速さ。毎回、本番と同じ 1.0 から始まり、保存もしない
  const [examinerSpeed, setExaminerSpeed] = useState<number>(1.0);
  const [showExaminerText, setShowExaminerText] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const optionClass = (active: boolean) =>
    `p-3 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
      active ? "bg-slate-50 dark:bg-slate-800 shadow-sm" : "border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100"
    }`;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 border-b border-slate-100 dark:border-slate-800 pb-4">
        <span className="text-3xl">🎙️</span>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">VCE Oral Mock Exam</h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Talk with the AI examiner just like the real exam. There is <strong>no feedback during the exam</strong> — you
          get one full feedback report after you finish.
        </p>
      </div>

      {/* Section */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300">1. Which part of the exam?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: "section1", label: "Section 1 only", desc: "General conversation (about 7 min)" },
            { id: "section2", label: "Section 2 only", desc: "Detailed study discussion (about 8 min)" },
            { id: "both", label: "Section 1 + 2", desc: "The full exam in one go (about 15 min)" },
          ].map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setExamSection(sec.id as MockExamSection)}
              className={optionClass(examSection === sec.id)}
              style={{ borderColor: examSection === sec.id ? themeColor : undefined }}
            >
              <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{sec.label}</span>
              <span className="text-[11px] text-slate-500 mt-1">{sec.desc}</span>
              <span className="text-[11px] font-bold mt-1" style={{ color: themeColor }}>
                🪙 {MOCK_SECTION_COST[sec.id as MockExamSection]} credits
              </span>
            </button>
          ))}
        </div>
        <label className="flex items-start gap-2 pt-1 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeBeforeAfter}
            onChange={(e) => setIncludeBeforeAfter(e.target.checked)}
            className="mt-0.5 cursor-pointer"
          />
          <span>
            <strong>Include entering and leaving the room</strong> — greetings and your name / student number before
            the exam, and the closing words after it.
          </span>
        </label>
      </div>

      {/* Difficulty */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300">2. ⚡ Conversation Difficulty</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "steady", label: "easy", desc: "Short, simple questions" },
            { id: "normal", label: "medium", desc: "Everyday questions" },
            { id: "accelerated", label: "hard", desc: "Deeper questions" },
          ].map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDifficulty(d.id as MockDifficulty)}
              className={optionClass(difficulty === d.id)}
              style={{ borderColor: difficulty === d.id ? themeColor : undefined }}
            >
              <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{d.label}</span>
              <span className="text-[11px] text-slate-500 mt-1">{d.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Examiner Speed */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300">3. Examiner Speed</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 0.8, label: "0.8×", desc: "Slower than the real exam" },
            { id: 1.0, label: "1.0×", desc: "Same as the real exam" },
            { id: 1.2, label: "1.2×", desc: "Faster than the real exam" },
          ].map((pace) => (
            <button
              key={pace.id}
              type="button"
              onClick={() => setExaminerSpeed(pace.id)}
              className={optionClass(examinerSpeed === pace.id)}
              style={{ borderColor: examinerSpeed === pace.id ? themeColor : undefined }}
            >
              <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{pace.label}</span>
              <span className="text-[11px] text-slate-500 mt-1">{pace.desc}</span>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 pt-1 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showExaminerText}
            onChange={(e) => setShowExaminerText(e.target.checked)}
            className="cursor-pointer"
          />
          Show the examiner&apos;s words on screen (turn this off to practise listening, like the real exam)
        </label>
      </div>

      {/* Section 2 Support Material (Photo) */}
      {(examSection === "section2" || examSection === "both") && (
        <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
          <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Section 2 support material (1 photo)</span>
            <span className="text-[10px] font-normal text-slate-400">Optional</span>
          </h2>
          <p className="text-[11px] text-slate-500">
            In the real exam you may bring one photo related to your detailed study and use it in the discussion. The
            AI examiner looks at your photo and may ask you about it in Section 2.
          </p>
          <div className="flex items-center gap-4">
            <label className="px-4 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              📷 Select Image
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
            {imagePreview && (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shadow-xs">
                <img src={imagePreview} alt="Support material" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImagePreview(null)}
                  className="absolute top-0 right-0 bg-red-600 text-white w-4 h-4 text-[10px] flex items-center justify-center rounded-bl"
                  aria-label="Remove image"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
        <p className="font-bold text-slate-800 dark:text-slate-100">How it works</p>
        <p>・Press the <strong>spacebar</strong> to start and stop recording your answer.</p>
        <p>・Check the words, then press <strong>Enter</strong> to send, or <strong>Space</strong> to record again.</p>
        <p>・To hear the question again, say 「すみません。もういちどおねがいします。」</p>
        <p>
          ・Your feedback report follows your Learning Pace (<strong>{PACE_LABEL[learningPace] || "Normal"}</strong>). You
          can change it in My Account.
        </p>
        <p>・Credits are used once, when the exam starts.</p>
        <p>・Feedback is based on the text of what you said (speech-to-text). Pronunciation, intonation, rhythm and tempo are not assessed.</p>
      </div>

      {/* Start Button */}
      <button
        type="button"
        disabled={isStarting}
        onClick={() =>
          onStartExam({
            examSection,
            includeBeforeAfter,
            difficulty,
            examinerSpeed,
            showExaminerText,
            supportMaterialUrl: imagePreview,
          })
        }
        className="w-full py-3.5 rounded-2xl font-bold text-white text-sm shadow-lg transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
        style={{ backgroundColor: themeColor }}
      >
        {isStarting ? "Starting…" : `🚀 Start the Mock Exam (${MOCK_SECTION_COST[examSection]} credits)`}
      </button>
    </div>
  );
};

export default OralMockConfig;
