import { useState } from "react";

export interface CustomQuestionItem {
  id: string;
  question_text: string;
  answer_text?: string;
  category?: string;
}

export function useSupabaseUserAnswers(supabaseClient: any, userId?: string) {
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [customQuestionsRaw, setCustomQuestionsRaw] = useState<CustomQuestionItem[]>([]);

  const fetchCustomQuestions = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabaseClient
        .from("user_custom_questions")
        .select("id, question_text, answer_text, category")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setCustomQuestionsRaw(data);
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
      const { data, error } = await supabaseClient
        .from("user_drill_answers")
        .select("question_id, answer_text")
        .eq("user_id", userId);

      if (!error && data) {
        const updated = { ...initialMap };
        data.forEach((row: { question_id: string; answer_text: string }) => {
          if (row.question_id) {
            updated[row.question_id] = row.answer_text;
          }
        });
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
          .update({ answer_text: text, updated_at: new Date().toISOString() })
          .eq("id", id);
      } else {
        await supabaseClient
          .from("user_drill_answers")
          .upsert(
            { user_id: userId, question_id: id, answer_text: text, updated_at: new Date().toISOString() },
            { onConflict: "user_id, question_id" }
          );
      }
    } catch (err) {
      console.error("❌ 解答自動保存エラー:", err);
    }
  };

  const addCustomQuestion = async (questionText: string, answerText: string, category: string) => {
    if (!userId) {
      alert("カスタム設問を保存するにはログインが必要です。");
      return false;
    }
    try {
      const { data, error } = await supabaseClient
        .from("user_custom_questions")
        .upsert(
          {
            user_id: userId,
            question_text: questionText.trim(),
            answer_text: answerText.trim(),
            category: category.trim() || "General",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,question_text" }
        )
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

  return {
    answers,
    setAnswers,
    customQuestionsRaw,
    fetchCustomQuestions,
    loadSavedAnswers,
    handleAnswerChange,
    handleAnswerBlur,
    addCustomQuestion,
    deleteCustomQuestion,
  };
}
