/**
 * @file api.teacher-vocab.ts
 * @description 教師ダッシュボードの語彙クイズ作成用：1 つのレッスンの単語（kl_vocabulary）を返す
 *   GET /api/teacher-vocab?lessonId=...   承認済みの教師だけ
 */
import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { requireTeacher } from '~/lib/teacher.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { admin } = await requireTeacher(request, context);
  const lessonId = new URL(request.url).searchParams.get('lessonId') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(lessonId)) return json({ words: [] });

  const { data, error } = await admin
    .from('kl_vocabulary')
    .select('id, jp_text, jp_kana, english_text')
    .eq('lesson_id', lessonId)
    .order('order_index', { ascending: true })
    .limit(200);
  if (error) {
    console.error('[api.teacher-vocab] failed:', error.message);
    return json({ words: [] }, { status: 500 });
  }

  return json({
    words: (data ?? [])
      .filter((v: any) => v.jp_text && v.english_text)
      .map((v: any) => ({
        id: String(v.id),
        jp: String(v.jp_text),
        kana: v.jp_kana && v.jp_kana !== v.jp_text ? String(v.jp_kana) : null,
        english: String(v.english_text),
      })),
  });
}
