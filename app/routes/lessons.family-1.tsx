/**
 * @file app/routes/lessons.family-1.tsx
 * @description Family 1（何人家族ですか）のレッスンページ。
 *   中身は全レッスン共通の EduLessonPage。ほかのレッスン（例：/lessons/family-2）はファイルを作らなくても
 *   lessons.$slug.tsx が同じ EduLessonPage で表示する（このファイルは今までの動きを変えないために残している）。
 *   旧 URL /lessons/obento-unit-4-lesson-1 は lessons.$slug.tsx がここへ転送する。
 */

import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { generateModuleMeta } from "~/utils/seoMeta";
import { supabase } from "~/lib/supabaseClient";
import { EduLessonPage } from "~/components/lessons/EduLessonPage";
import { fetchLessonPageData, type LessonPageData } from "~/lib/lessonPageData";

// このページのレッスン（edu_lessons.slug）
const LESSON_SLUG = "family-1";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  let portalContent = null;
  try {
    const { data: portalData } = await supabase
      .from("portal_settings")
      .select("content")
      .eq("key", "PORTAL_CONTENT")
      .single();
    portalContent = portalData?.content || null;
  } catch (e) {}

  return json({
    portalContent,
    currentPath: url.pathname,
    ...(await fetchLessonPageData(LESSON_SLUG)),
  });
}

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta(data?.portalContent || null, data?.currentPath || "");
};

export default function LessonsFamily1Page() {
  const data = useLoaderData<typeof loader>() as unknown as LessonPageData;
  return <EduLessonPage lessonSlug={LESSON_SLUG} data={data} />;
}
