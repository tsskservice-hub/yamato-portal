/**
 * @file OralSentenceInputGroup.tsx
 * @description Elaborate用の1文ごとに分割された回答入力欄グループコンポーネント
 */
import React from "react";
import { Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { validateSentence } from "../utils/oralValidation";

export interface OralSentenceInputGroupProps {
  questionId: string;
  sentences: string[]; // 例: ["1文目", "2文目", "3文目"]
  onChangeSentences: (updatedSentences: string[]) => void;
  onBlurSave?: (combinedText: string) => void;
}

export const OralSentenceInputGroup: React.FC<OralSentenceInputGroupProps> = ({
  questionId,
  sentences = ["", "", ""],
  onChangeSentences,
  onBlurSave,
}) => {
  // テキスト変更ハンドラー
  const handleTextChange = (index: number, value: string) => {
    const updated = [...sentences];
    updated[index] = value;
    onChangeSentences(updated);
  };

  // 入力枠追加（4文目以降〜）
  const handleAddBox = () => {
    const updated = [...sentences, ""];
    onChangeSentences(updated);
  };

  // 入力枠削除
  const handleRemoveBox = (index: number) => {
    if (sentences.length <= 1) return; // 最低1枠は保持
    const updated = sentences.filter((_, i) => i !== index);
    onChangeSentences(updated);

    // 削除後に保存処理を実行
    if (onBlurSave) {
      onBlurSave(updated.filter((s) => s.trim()).join("。"));
    }
  };

  // フォーカスアウト時の自動保存通知（全文を句点で結合）
  const handleBlur = () => {
    if (onBlurSave) {
      const combined = sentences.filter((s) => s.trim()).join("。");
      onBlurSave(combined);
    }
  };

  return (
    <div className="space-y-4">
      {sentences.map((sentenceText, index) => {
        const validation = validateSentence(sentenceText);

        // 各文のガイダンスプレースホルダー
        let placeholderText = "";
        if (index === 0) {
          placeholderText =
            "【1文目】質問に対する主張や結論を書こう（Drillからインポート可）";
        } else if (index === 1) {
          placeholderText =
            "【2文目】1文目を補足する文章を書こう（理由、状況、過去との違いなど）";
        } else if (index === 2) {
          placeholderText =
            "【3文目】さらに詳しく伝える文章を書こう（具体例、感想、これからのことなど）";
        } else {
          placeholderText = `【${index + 1}文目】追加の文章を書こう`;
        }

        return (
          <div
            key={`${questionId}-s-${index}`}
            className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 focus-within:border-indigo-400 focus-within:bg-white transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs">
                  {index + 1}
                </span>
                <span>文目</span>
              </label>

              {/* 削除ボタン（枠が複数ある場合のみ表示） */}
              {sentences.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveBox(index)}
                  className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-md hover:bg-slate-100"
                  title="この文の枠を削除"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {/* 入力エリア */}
            <textarea
              value={sentenceText}
              onChange={(e) => handleTextChange(index, e.target.value)}
              onBlur={handleBlur}
              placeholder={placeholderText}
              rows={2}
              className="w-full p-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
            />

            {/* リアルタイムバリデーション表示 */}
            <div className="mt-2 flex items-center justify-between text-xs">
              <div>
                {sentenceText.trim() === "" ? (
                  <span className="text-slate-400">・ 未入力</span>
                ) : validation.isValid ? (
                  <span className="text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 size={14} /> 有効な1文 ({sentenceText.trim().length}文字)
                  </span>
                ) : (
                  <span className="text-rose-600 font-medium flex items-center gap-1">
                    <AlertCircle size={14} /> {validation.reason}
                  </span>
                )}
              </div>

              <span className="text-slate-400 text-[11px]">
                10文字以上・日本語のみ
              </span>
            </div>
          </div>
        );
      })}

      {/* ＋ 文を追加するボタン */}
      <button
        type="button"
        onClick={handleAddBox}
        className="w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-indigo-600 font-medium text-sm rounded-xl flex items-center justify-center gap-2 transition-all"
      >
        <Plus size={18} />
        <span>さらに文を追加する（4文目〜）</span>
      </button>
    </div>
  );
};

export default OralSentenceInputGroup;