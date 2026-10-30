import React, { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Download,
  Lightbulb,
  X,
  Save,
  RefreshCw,
  Sparkles,
} from "lucide-react";

// 切り出したモーダルコンポーネントのインポート
import ElaborateHintModal from "../components/ElaborateHintModal";

// ==========================================
// 型定義
// ==========================================
export interface Question {
  id: string;
  title: string;
  category?: string;
  promptText: string;
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

export interface EOYOralElaborateProps {
  questions?: Question[];
  userId?: string;
  onSave?: (answersMap: { [questionId: string]: string[] }) => Promise<void>;
  fetchDrillAnswers?: () => Promise<{ [questionId: string]: string }>;
}

// サンプル問題（Props未指定時のフォールバック）
const DEFAULT_QUESTIONS: Question[] = [
  {
    id: "q1",
    title: "質問 1",
    category: "学校生活",
    promptText: "あなたが学校で一番楽しいと感じる時間はいつですか？",
  },
  {
    id: "q2",
    title: "質問 2",
    category: "将来・夢",
    promptText: "将来挑戦してみたいことや、やってみたい仕事は何ですか？",
  },
  {
    id: "q3",
    title: "質問 3",
    category: "趣味・特技",
    promptText: "最近夢中になっていることや、休日の過ごし方を教えてください。",
  },
];

// ==========================================
// 有効な1文の判定ロジック
// ==========================================
export const validateSentence = (text: string): ValidationResult => {
  const trimmed = text.trim();

  if (!trimmed) {
    return { isValid: false, reason: "未入力です" };
  }

  // 1. 英語・アルファベットの検知（厳禁）
  if (/[a-zA-Zａ-ｚＡ-Ｚ]/.test(trimmed)) {
    return {
      isValid: false,
      reason: "英語は使用できません。日本語で入力してください。",
    };
  }

  // 2. 文字数チェック（10文字以上）
  if (trimmed.length < 10) {
    return {
      isValid: false,
      reason: `10文字以上必要です（現在 ${trimmed.length} 文字）`,
    };
  }

  // 3. NGワード（一言・単一の応答）の除外
  const forbiddenShorts = [
    "はい",
    "いいえ",
    "はい。",
    "いいえ。",
    "そうですね",
    "たしかに",
    "わかりません",
    "わかりません。",
    "ないです",
    "ありません",
    "そうです",
  ];
  if (forbiddenShorts.includes(trimmed)) {
    return {
      isValid: false,
      reason: "「はい」「いいえ」などの一言ではなく、文章で入力してください。",
    };
  }

  return { isValid: true };
};

// ==========================================
// メインコンポーネント
// ==========================================
export const EOYOralElaborate: React.FC<EOYOralElaborateProps> = ({
  questions = DEFAULT_QUESTIONS,
  userId,
  onSave,
  fetchDrillAnswers,
}) => {
  // 各問題ごとの文章配列ステート: { [questionId]: ["1文目", "2文目", "3文目", ...] }
  const [sentencesMap, setSentencesMap] = useState<{ [qId: string]: string[] }>(() => {
    const initial: { [qId: string]: string[] } = {};
    questions.forEach((q) => {
      initial[q.id] = ["", "", ""]; // 初期状態は3つの空入力欄
    });
    return initial;
  });

  const [isHintModalOpen, setIsHintModalOpen] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // ------------------------------------------
  // Drill解答のインポート処理
  // ------------------------------------------
  const handleImportFromDrill = async (targetQuestionId?: string) => {
    setIsImporting(true);
    setStatusMessage(null);

    try {
      let drillAnswers: { [qId: string]: string } = {};

      if (fetchDrillAnswers) {
        drillAnswers = await fetchDrillAnswers();
      } else {
        // デモ用ダミーデータ（Supabase未連携時）
        drillAnswers = {
          q1: "私は昼休みに友達と公園でサッカーをすることが一番楽しいです。",
          q2: "将来は海外と日本を繋ぐ国際的なエンジニアになりたいと考えています。",
        };
      }

      setSentencesMap((prev) => {
        const next = { ...prev };
        const qIdsToUpdate = targetQuestionId ? [targetQuestionId] : questions.map((q) => q.id);
        let importedCount = 0;

        qIdsToUpdate.forEach((qId) => {
          const drillAns = drillAnswers[qId];
          if (drillAns && drillAns.trim()) {
            const currentSentences = [...(next[qId] || ["", "", ""])];
            // 1文目にDrillの解答を挿入（2文目・3文目以降はそのまま維持）
            currentSentences[0] = drillAns.trim();
            next[qId] = currentSentences;
            importedCount++;
          }
        });

        if (importedCount > 0) {
          setStatusMessage(`Drillからの解答を ${importedCount} 件の1文目に反映しました！`);
        } else {
          setStatusMessage("インポートできるDrillの解答が見つかりませんでした。直接入力で始められます。");
        }

        return next;
      });
    } catch (err) {
      console.error(err);
      setStatusMessage("Drill解答の読み込み中にエラーが発生しました。");
    } finally {
      setIsImporting(false);
    }
  };

  // ------------------------------------------
  // 入力欄の操作ハンドラー
  // ------------------------------------------
  const handleSentenceChange = (qId: string, index: number, value: string) => {
    setSentencesMap((prev) => {
      const list = [...(prev[qId] || ["", "", ""])];
      list[index] = value;
      return { ...prev, [qId]: list };
    });
  };

  const handleAddSentenceBox = (qId: string) => {
    setSentencesMap((prev) => {
      const list = [...(prev[qId] || ["", "", ""])];
      list.push("");
      return { ...prev, [qId]: list };
    });
  };

  const handleRemoveSentenceBox = (qId: string, index: number) => {
    setSentencesMap((prev) => {
      const list = [...(prev[qId] || ["", "", ""])];
      if (list.length <= 1) return prev; // 最低1枠は保持
      list.splice(index, 1);
      return { ...prev, [qId]: list };
    });
  };

  // ------------------------------------------
  // 保存処理
  // ------------------------------------------
  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(sentencesMap);
      }
      setStatusMessage("すべての解答を保存しました！");
    } catch (err) {
      console.error(err);
      setStatusMessage("保存中にエラーが発生しました。");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 bg-slate-50 min-h-screen text-slate-800">
      {/* ------------------------------------------ */}
      {/* ヘッダーエリア                             */}
      {/* ------------------------------------------ */}
      <header className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full mb-2">
              <Sparkles size={14} />
              Elaborate モード（深掘り学習）
            </div>
            <h1 className="text-2xl font-bold text-slate-900">解答を深掘りして表現を広げよう</h1>
            <p className="text-sm text-slate-600 mt-1">
              各質問に対して<strong className="text-indigo-600 font-semibold">【有効な文を3文以上】</strong>作成しましょう。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* 深掘りのヒントモーダルを開くボタン */}
            <button
              onClick={() => setIsHintModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-medium text-sm rounded-xl border border-amber-200 transition-colors shadow-sm"
            >
              <Lightbulb size={18} className="text-amber-600" />
              <span>深掘り（Elaborate）のヒント</span>
            </button>

            {/* Drillから全問インポートボタン */}
            <button
              onClick={() => handleImportFromDrill()}
              disabled={isImporting}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              <Download size={18} />
              <span>{isImporting ? "読み込み中..." : "Drillから全問インポート"}</span>
            </button>
          </div>
        </div>

        {/* ステータスメッセージ表示 */}
        {statusMessage && (
          <div className="mt-4 p-3 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-xl text-sm flex items-center justify-between">
            <span>{statusMessage}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-indigo-500 hover:text-indigo-700 p-1"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </header>

      {/* ------------------------------------------ */}
      {/* 問題リスト                                  */}
      {/* ------------------------------------------ */}
      <div className="space-y-8">
        {questions.map((q, qIndex) => {
          const sentences = sentencesMap[q.id] || ["", "", ""];

          // 各文の判定
          const validations = sentences.map((s) => validateSentence(s));
          const validCount = validations.filter((v) => v.isValid).length;
          const isQuestionComplete = validCount >= 3;

          return (
            <div
              key={q.id}
              className={`bg-white rounded-2xl p-6 shadow-sm border transition-all ${
                isQuestionComplete
                  ? "border-emerald-300 ring-2 ring-emerald-500/10"
                  : "border-slate-200"
              }`}
            >
              {/* 問題ヘッダー情報 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md">
                      {q.category || `Q${qIndex + 1}`}
                    </span>
                    <h2 className="text-lg font-bold text-slate-900">{q.title}</h2>
                  </div>
                  <p className="text-base text-slate-700 mt-2 font-medium">{q.promptText}</p>
                </div>

                <div className="flex items-center gap-3">
                  {/* 個別問題のDrill反映ボタン */}
                  <button
                    onClick={() => handleImportFromDrill(q.id)}
                    className="text-xs flex items-center gap-1.5 px-3 py-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 font-medium rounded-lg transition-colors"
                    title="この問題の1文目にDrillの解答をインポートします"
                  >
                    <RefreshCw size={14} />
                    <span>Drill反映</span>
                  </button>

                  {/* 達成状態バッジ */}
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                      isQuestionComplete
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {isQuestionComplete ? (
                      <>
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        <span>目標達成 (有効な文: {validCount} / 3)</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={16} className="text-amber-600" />
                        <span>有効な文: {validCount} / 3 （あと{Math.max(0, 3 - validCount)}文）</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ------------------------------------------ */}
              {/* 1文ごとの入力欄群                          */}
              {/* ------------------------------------------ */}
              <div className="space-y-4">
                {sentences.map((sentenceText, sIndex) => {
                  const validation = validations[sIndex];

                  // 各文のガイドプレースホルダー
                  let placeholderText = "";
                  if (sIndex === 0) {
                    placeholderText = "【1文目】質問に対する主張や結論を書こう（Drillからインポート可）";
                  } else if (sIndex === 1) {
                    placeholderText = "【2文目】1文目を補足する文章を書こう（理由、状況、過去との違いなど）";
                  } else if (sIndex === 2) {
                    placeholderText = "【3文目】さらに詳しく伝える文章を書こう（具体例、感想、これからのことなど）";
                  } else {
                    placeholderText = `【${sIndex + 1}文目】追加の文章を書こう`;
                  }

                  return (
                    <div
                      key={sIndex}
                      className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 focus-within:border-indigo-400 focus-within:bg-white transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs">
                            {sIndex + 1}
                          </span>
                          <span>文目</span>
                        </label>

                        {/* 削除ボタン（複数枠がある場合のみ表示） */}
                        {sentences.length > 1 && (
                          <button
                            onClick={() => handleRemoveSentenceBox(q.id, sIndex)}
                            className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                            title="この文の枠を削除"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      {/* 入力エリア */}
                      <textarea
                        value={sentenceText}
                        onChange={(e) => handleSentenceChange(q.id, sIndex, e.target.value)}
                        placeholder={placeholderText}
                        rows={2}
                        className="w-full p-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                      />

                      {/* バリデーションリアルタイム表示 */}
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
              </div>

              {/* 追加ボタン */}
              <div className="mt-4">
                <button
                  onClick={() => handleAddSentenceBox(q.id)}
                  className="w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-indigo-600 font-medium text-sm rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <Plus size={18} />
                  <span>さらに文を追加する（4文目〜）</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ページ下部のアクションボタン */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base rounded-2xl shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
        >
          <Save size={20} />
          <span>{isSaving ? "保存中..." : "すべての解答を保存する"}</span>
        </button>
      </div>

      {/* 切り出したモーダルコンポーネント */}
      <ElaborateHintModal
        isOpen={isHintModalOpen}
        onClose={() => setIsHintModalOpen(false)}
      />
    </div>
  );
};

export default EOYOralElaborate;