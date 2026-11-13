/**
 * @file TutorPreferencesSection.tsx
 * @description AIチューターの呼び名（ニックネーム）とデフォルトの学習ペースを設定・更新する独立モジュール
 */
import React, { useState } from "react";
import { UserCheck, Gauge, School, MapPin } from "lucide-react";
import { nicknameSchema } from "~/validations/profile";
import { supabase } from "~/lib/supabaseClient";
import { SCHOOL_PURPOSE_TEXT, normaliseSchoolInfo } from "~/lib/teacher-config";
import { SchoolPicker, type SchoolValue } from "~/components/SchoolPicker";

export type TutorPreferencesSectionProps = {
  userId: string;
  initialNickname: string;
  initialPace: string;
  initialState?: string | null;
  initialSchoolName?: string | null;
  initialSchoolRefId?: number | null;
  onSaved?: () => void; // 保存成功時にリバデーション等を走らせるためのコールバック
  className?: string;
};

export function TutorPreferencesSection({
  userId,
  initialNickname,
  initialPace,
  initialState = null,
  initialSchoolName = null,
  initialSchoolRefId = null,
  onSaved,
  className = "",
}: TutorPreferencesSectionProps) {
  const [nicknameInput, setNicknameInput] = useState(initialNickname);
  const [paceInput, setPaceInput] = useState(initialPace);
  const [school, setSchool] = useState<SchoolValue>({
    state: initialState ?? "",
    schoolName: initialSchoolName ?? "",
    schoolRefId: initialSchoolRefId ?? null,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setShowSavedIndicator(false);

    // 1. Zodによるクライアントサイド・バリデーション
    const result = nicknameSchema.safeParse(nicknameInput);
    if (!result.success) {
      setSaveError(result.error.errors[0].message);
      return;
    }

    // 州・学校名（任意）。学校名は州（または Outside Australia）を選んだときだけ保存する
    const schoolInfo = normaliseSchoolInfo(school.state, school.schoolName, school.schoolRefId);
    if ("error" in schoolInfo) {
      setSaveError(schoolInfo.error ?? "Invalid school name.");
      return;
    }

    setIsSaving(true);
    try {
      if (!userId) throw new Error("User not authenticated.");

      // 2. Supabaseクライアントで直接プロフィールを更新
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          nickname: result.data,
          learning_pace: paceInput,
          state: schoolInfo.state,
          school_name: schoolInfo.schoolName,
          school_ref_id: schoolInfo.schoolRefId,
        })
        .eq("id", userId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setShowSavedIndicator(true);
      if (onSaved) {
        onSaved(); // 親コンポーネント側でrevalidator.revalidate()などを発火させる
      }
    } catch (err: any) {
      setSaveError("Failed to update profile: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-6 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900 border-b pb-3 flex items-center gap-2">
        <UserCheck className="w-5 h-5 text-blue-600" /> AI Tutor Preferences & Profile
      </h2>

      <form onSubmit={handleUpdateProfile} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Nickname (AI呼びかけ用)
            </label>
            <input
              type="text"
              name="nickname"
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              placeholder="e.g. Kenji"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Yamato will call you by this name. If left blank, you will be called &quot;My Friend&quot;.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-blue-600" /> Default Learning Pace
            </label>
            <select
              name="learningPace"
              value={paceInput}
              onChange={(e) => setPaceInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="steady">Steady (じっくり丁寧・基礎重視)</option>
              <option value="normal">Normal (標準ペース)</option>
              <option value="accelerated">Accelerated (高速・発展重視)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Let Yamato know whether you want to learn at a steady, normal, or accelerated pace.
            </p>
          </div>
        </div>

        {/* 💡 州と学校名（任意）。オーストラリアの州を選ぶと学校名の候補が出る */}
        <div className="border-t border-gray-100 pt-6 space-y-2">
          <SchoolPicker
            value={school}
            onChange={setSchool}
            stateLabel={<span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-blue-600" /> State <span className="text-gray-400 font-normal">(optional)</span></span>}
            schoolLabel={<span className="flex items-center gap-1.5"><School className="w-4 h-4 text-blue-600" /> School Name <span className="text-gray-400 font-normal">(optional)</span></span>}
            labelClassName="block text-sm font-medium text-gray-700 mb-1"
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          />
          <p className="text-xs text-gray-500">
            {SCHOOL_PURPOSE_TEXT.replace(" See our Privacy Policy.", " ")}
            <a href="/legal/privacy" className="text-blue-600 hover:underline">See our Privacy Policy.</a>
          </p>
        </div>

        {saveError && (
          <p className="text-xs text-red-600 font-medium">{saveError}</p>
        )}

        <div className="flex items-center justify-end space-x-3">
          {showSavedIndicator && (
            <span className="text-xs font-semibold text-emerald-600 animate-fade-in flex items-center gap-1">
              ✓ Saved!
            </span>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default TutorPreferencesSection;