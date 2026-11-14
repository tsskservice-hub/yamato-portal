/**
 * @file app/lib/lessonPageData.ts
 * @description レッスンページ（例：/lessons/family-1）の表示に必要なデータを読み込む（全レッスン共通）
 *   - edu_lessons に行があれば、そのレッスンのページが表示できる（ページのファイルを足す必要はない）
 *   - スピーキングは会話データ（edu_lesson_dialogues.lesson_key = slug）があるレッスンだけ出す
 */

import { supabase } from "~/lib/supabaseClient";
import { slugCandidates } from "~/data/lesson-slugs";
import { fetchTextbookRefs, type TextbookRef } from "~/lib/lessonTextbooks";

export interface LessonPageData {
  lesson: any | null;
  topic: any | null;
  vocabulary: any[];
  textbookRefs: TextbookRef[];
  /** スピーキングの会話データがあるか */
  hasSpeaking: boolean;
  loadError: string | null;
}

export async function fetchLessonPageData(slug: string): Promise<LessonPageData> {
  const data: LessonPageData = {
    lesson: null,
    topic: null,
    vocabulary: [],
    textbookRefs: [],
    hasSpeaking: false,
    loadError: null,
  };

  try {
    // 新しい slug（family-1）と、データベース切り替え前の古い slug のどちらでも見つける
    const { data: lessons } = await supabase
      .from("edu_lessons")
      .select("*")
      .in("slug", slugCandidates(slug))
      .limit(1);
    const lesson = lessons?.[0] || null;
    data.lesson = lesson;

    if (lesson) {
      const [topicRes, vocabRes, refs, dialogueRes] = await Promise.all([
        lesson.topic_id
          ? supabase.from("edu_topics").select("*").eq("id", lesson.topic_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("kl_vocabulary")
          .select("*")
          .eq("lesson_id", lesson.id)
          .order("order_index", { ascending: true }),
        fetchTextbookRefs([String(lesson.id)]),
        supabase
          .from("edu_lesson_dialogues")
          .select("lesson_key")
          .in("lesson_key", slugCandidates(String(lesson.slug)))
          .limit(1),
      ]);
      data.topic = (topicRes as any).data || null;
      data.vocabulary = vocabRes.data || [];
      data.textbookRefs = refs[String(lesson.id)] ?? [];
      data.hasSpeaking = (dialogueRes.data?.length ?? 0) > 0;
    }
  } catch (err) {
    console.warn(`⚠️ [Loader] Failed to fetch lesson ${slug} from Supabase:`, err);
    data.loadError = `Supabase error: ${(err as any)?.message || String(err)}`;
  }

  if (!data.lesson && !data.loadError) data.loadError = `Lesson ${slug} not found in edu_lessons.`;
  return data;
}
