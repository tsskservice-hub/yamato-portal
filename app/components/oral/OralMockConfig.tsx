import React, { useState } from "react";

export interface MockExamConfig {
  studentName: string;
  // 試験官の話す速さ（倍率。1.0 が普通、1.2 は速い、0.8 は遅い）。
  // 生徒の learning pace（steady / normal / accelerated）と紛らわしくないよう数字にしている。この模擬試験だけに使う
  examinerSpeed: number;
  examSection: "section1" | "section2" | "both";
  supportMaterialUrl?: string | null;
  supportMaterialFile?: File | null;
}

export interface OralMockConfigProps {
  onStartExam: (config: MockExamConfig) => void;
  defaultStudentName?: string;
  themeColor?: string;
}

export const OralMockConfig: React.FC<OralMockConfigProps> = ({
  onStartExam,
  defaultStudentName = "VCE Student",
  themeColor = "#ef4444",
}) => {
  const [studentName, setStudentName] = useState(defaultStudentName);
  // 💡 試験官の話す速さ。生徒の learning pace とは関係させない（毎回、本番と同じ 1.0 から始まり、保存もしない）
  const [examinerSpeed, setExaminerSpeed] = useState<number>(1.0);
  const [examSection, setExamSection] = useState<"section1" | "section2" | "both">("both");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStart = () => {
    onStartExam({
      studentName,
      examinerSpeed,
      examSection,
      supportMaterialUrl: imagePreview,
      supportMaterialFile: selectedFile,
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 border-b border-slate-100 dark:border-slate-800 pb-4">
        <span className="text-3xl">🎙️</span>
        <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">
          VCE Oral Exam Simulator Setup
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Configure your simulated 15-minute VCE Japanese Oral Examination.
        </p>
      </div>

      {/* Student Name */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
          Student Name / Nickname (名前)
        </label>
        <input
          type="text"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          placeholder="Enter your name"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium focus:outline-hidden focus:ring-2"
          style={{ focusRingColor: themeColor }}
        />
      </div>

      {/* Exam Section Selection */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
          Target Examination Section
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "both", label: "Full Exam (15分)", desc: "Sec 1 & Sec 2 Both" },
            { id: "section1", label: "Section 1 Only", desc: "General Conversation (約7分)" },
            { id: "section2", label: "Section 2 Only", desc: "Detailed Study (約8分)" },
          ].map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setExamSection(sec.id as any)}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                examSection === sec.id
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent shadow-md"
                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-400"
              }`}
            >
              <span className="font-bold text-xs">{sec.label}</span>
              <span className="text-[10px] opacity-70 mt-1">{sec.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Examiner Speed（生徒の learning pace とは別の設定） */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
          Examiner Speed (試験官の話す速さ)
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 0.8, label: "0.8×", desc: "Slower than the real exam" },
            { id: 1.0, label: "1.0×", desc: "Same speed as the real VCE exam" },
            { id: 1.2, label: "1.2×", desc: "Faster than the real exam" },
          ].map((pace) => (
            <button
              key={pace.id}
              type="button"
              onClick={() => setExaminerSpeed(pace.id)}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                examinerSpeed === pace.id
                  ? "border-2 shadow-sm bg-slate-50 dark:bg-slate-800"
                  : "border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100"
              }`}
              style={{
                borderColor: examinerSpeed === pace.id ? themeColor : undefined,
              }}
            >
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                {pace.label}
              </span>
              <span className="text-[10px] text-slate-500 mt-1">{pace.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Section 2 Support Material (Photo) */}
      {(examSection === "section2" || examSection === "both") && (
        <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Detailed Study Support Material (写真/資料添付)</span>
            <span className="text-[10px] font-normal text-slate-400">Optional</span>
          </label>
          <div className="flex items-center gap-4">
            <label className="px-4 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              📷 Select Image
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
            {imagePreview && (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shadow-xs">
                <img src={imagePreview} alt="Support Material" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setSelectedFile(null);
                  }}
                  className="absolute top-0 right-0 bg-red-600 text-white w-4 h-4 text-[10px] flex items-center justify-center rounded-bl"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Start Button */}
      <button
        type="button"
        onClick={handleStart}
        className="w-full py-3.5 rounded-2xl font-bold text-white text-sm shadow-lg transition transform active:scale-98 cursor-pointer flex items-center justify-center space-x-2"
        style={{ backgroundColor: themeColor }}
      >
        <span>開始 (Start Exam Simulation)</span>
        <span>→</span>
      </button>
    </div>
  );
};

export default OralMockConfig;
