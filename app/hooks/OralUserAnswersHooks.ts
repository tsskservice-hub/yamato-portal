/**
 * @file OralUserAnswersHooks.ts
 * @description Supabase hooks for managing user drill answers, elaborate answers, and custom QA bank.
 */
import { useState } from "react";

export interface CustomQuestionItem {
  id: string;
  question_text: string;
  answer_text?: string;
  elaborate_text?: string;
  category?: string;
}

export function useSupabaseUserAnswers(
  supabaseClient: any,
  userId?: string,
  mode: "drill" | "elaborate" = "drill"
) {
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [customQuestionsRaw, setCustomQuestionsRaw] = useState<CustomQuestionItem[]>([]);

  // ターゲットとなるカラム名を決定
  const textColumn = mode === "elaborate" ? "elaborate_text" : "answer_text";

  const fetchCustomQuestions = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabaseClient
        .from("user_custom_questions")
        .select("id, question_text, answer_text, elaborate_text, category")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        // カスタム質問においても、elaborateモードかつelaborate_textが空ならanswer_textをフォールバックとして採用
        const mappedData = data.map((q: any) => {
          if (mode === "elaborate" && !q.elaborate_text && q.answer_text) {
            return { ...q, elaborate_text: q.answer_text };
          }
          return q;
        });
        setCustomQuestionsRaw(mappedData);
      }
    } catch (err) {
      console.error("Failed to fetch custom questions:", err);
    }
  };

  const loadSavedAnswers = async (initialMap: { [key: string]: string }) => {
    if (!userId) {
      setAnswers(initialMap);
      return;
    }
    try {
      // elaborate モードの場合は、両方のカラムを取得してフォールバック判定できるようにする
      const selectFields =
        mode === "elaborate"
          ? "question_id, answer_text, elaborate_text"
          : "question_id, answer_text";

      const { data, error } = await supabaseClient
        .from("user_drill_answers")
        .select(selectFields)
        .eq("user_id", userId);

      if (!error && data) {
        const updated = { ...initialMap };
        data.forEach(
          (row: { question_id: string; answer_text?: string; elaborate_text?: string }) => {
            if (row.question_id) {
              if (mode === "elaborate") {
                // elaborate モード：elaborate_text があればそれを優先、なければ answer_text（Drillの答え）を継承、どちらもなければ initialMap
                const effectiveText = row.elaborate_text || row.answer_text;
                if (effectiveText) {
                  updated[row.question_id] = effectiveText;
                }
              } else {
                // drill モード
                if (row.answer_text) {
                  updated[row.question_id] = row.answer_text;
                }
              }
            }
          }
        );
        setAnswers(updated);
      } else {
        setAnswers(initialMap);
      }
    } catch (err) {
      console.error("Failed to load saved answers:", err);
      setAnswers(initialMap);
    }
  };

  const handleAnswerChange = (id: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [id]: text }));
  };

  const handleAnswerBlur = async (id: string, text: string, isCustom?: boolean) => {
    if (!userId) return;
    try {
      if (isCustom) {
        await supabaseClient
          .from("user_custom_questions")
          .update({ [textColumn]: text, updated_at: new Date().toISOString() })
          .eq("id", id);
      } else {
        // user_drill_answers テーブルに対して upsert を実行
        // ※ 既存レコードのもう一方のカラム（drillならelaborate、elaborateならdrill）を上書きしないよう、upsertDataを動的に構築
        const upsertData: any = {
          user_id: userId,
          question_id: id,
          [textColumn]: text,
          updated_at: new Date().toISOString(),
        };

        await supabaseClient
          .from("user_drill_answers")
          .upsert(upsertData, { onConflict: "user_id, question_id" });
      }
    } catch (err) {
      console.error("❌ 解答自動保存エラー:", err);
    }
  };

  const addCustomQuestion = async (
    questionText: string,
    answerText: string,
    category: string
  ) => {
    if (!userId) {
      alert("カスタム設問を保存するにはログインが必要です。");
      return false;
    }
    try {
      // モードに応じて保存する初期テキストを割り振る
      const payload: any = {
        user_id: userId,
        question_text: questionText.trim(),
        category: category.trim() || "General",
        updated_at: new Date().toISOString(),
      };

      if (mode === "elaborate") {
        payload.elaborate_text = answerText.trim();
        payload.answer_text = answerText.trim(); // 両方に初期値として入れると安全
      } else {
        payload.answer_text = answerText.trim();
      }

      const { data, error } = await supabaseClient
        .from("user_custom_questions")
        .upsert(payload, { onConflict: "user_id,question_text" })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setCustomQuestionsRaw((prev) => [...prev, data]);
        return true;
      }
      return false;
    } catch (err) {
      alert("カスタム設問の保存に失敗しました。");
      return false;
    }
  };

  const deleteCustomQuestion = async (id: string) => {
    if (!confirm("この設問を削除してもよろしいですか？")) return;
    try {
      await supabaseClient.from("user_custom_questions").delete().eq("id", id);
      setCustomQuestionsRaw((prev) => prev.filter((q) => String(q.id) !== id));
    } catch (err) {
      console.error("Delete custom question error:", err);
    }
  };

  // =========================================================
  // 💡 【新規追加】機能1: Drillの解答を取得する関数
  // =========================================================
  const fetchDrillAnswers = async (): Promise<{ [key: string]: string }> => {
    if (!userId) return {};
    try {
      const { data, error } = await supabaseClient
        .from("user_drill_answers")
        .select("question_id, answer_text")
        .eq("user_id", userId);

      if (error || !data) {
        console.error("Failed to fetch drill answers:", error);
        return {};
      }

      const drillMap: { [key: string]: string } = {};
      data.forEach((row: { question_id: string; answer_text?: string }) => {
        if (row.question_id && row.answer_text) {
          drillMap[row.question_id] = row.answer_text;
        }
      });
      return drillMap;
    } catch (err) {
      console.error("Error in fetchDrillAnswers:", err);
      return {};
    }
  };

  // =========================================================
  // 💡 【新規追加】機能1: Drillの解答をステート(answers)にインポートする関数
  // =========================================================
  const importDrillAnswers = async (targetQuestionId?: string): Promise<boolean> => {
    const drillMap = await fetchDrillAnswers();
    if (Object.keys(drillMap).length === 0) return false;

    setAnswers((prev) => {
      const next = { ...prev };
      if (targetQuestionId) {
        if (drillMap[targetQuestionId]) {
          next[targetQuestionId] = drillMap[targetQuestionId];
        }
      } else {
        Object.keys(drillMap).forEach((qId) => {
          if (drillMap[qId]) {
            next[qId] = drillMap[qId];
          }
        });
      }
      return next;
    });
    return true;
  };

  return {
    // --- 既存のプロパティ（完全互換） ---
    answers,
    setAnswers,
    customQuestionsRaw,
    fetchCustomQuestions,
    loadSavedAnswers,
    handleAnswerChange,
    handleAnswerBlur,
    addCustomQuestion,
    deleteCustomQuestion,

    // --- 【機能1用追加プロパティ】 ---
    fetchDrillAnswers,
    importDrillAnswers,
  };
}