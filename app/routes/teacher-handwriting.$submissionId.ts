/**
 * @file teacher-handwriting.$submissionId.ts
 * @description 教師が自分のクラスの生徒の手書き画像を見る（非公開バケットの署名付き URL へ転送）
 *
 * 画像は非公開バケット writing-submissions にある。ここで「その生徒が、この先生のクラスにいるか」を確認してから、
 * 5 分だけ有効な署名付き URL を作って転送する。
 */
import { redirect, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { requireTeacher } from '~/lib/teacher.server';

const IMAGE_BUCKET = 'writing-submissions';
const SIGNED_URL_SECONDS = 300;

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const { user, admin } = await requireTeacher(request, context);
  const notFound = () => new Response('Image not found or no longer kept.', { status: 404 });

  const { data: submission } = await admin
    .from('edu_writing_submissions')
    .select('user_id, image_path, image_deleted_at, image_delete_after')
    .eq('id', params.submissionId ?? '')
    .maybeSingle();
  if (!submission?.image_path || submission.image_deleted_at) return notFound();
  if (submission.image_delete_after && new Date(submission.image_delete_after).getTime() < Date.now()) return notFound();

  // この生徒が、この先生のクラスのどれかにいるか
  const { data: classes } = await admin.from('edu_classes').select('id').eq('teacher_id', user.id);
  const classIds = (classes ?? []).map((c: any) => c.id);
  if (classIds.length === 0) return notFound();

  const { data: member } = await admin
    .from('edu_class_members')
    .select('class_id')
    .eq('user_id', submission.user_id)
    .eq('role', 'student')
    .in('class_id', classIds)
    .limit(1)
    .maybeSingle();
  if (!member) return notFound();

  const { data: signed, error } = await admin.storage
    .from(IMAGE_BUCKET)
    .createSignedUrl(submission.image_path, SIGNED_URL_SECONDS);
  if (error || !signed?.signedUrl) return notFound();

  return redirect(signed.signedUrl, { headers: { 'Cache-Control': 'no-store' } });
}
