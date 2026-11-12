/**
 * @file api.teacher-register.ts
 * @description 新規登録モーダルの「先生用アカウント」から呼ばれ、ログイン中の本人の先生アカウント申請を受け付ける
 *
 * - is_teacher / teacher_status はブラウザから更新できない（02・10 の SQL）。ここでアクセストークンで本人を確認し、管理者キーで更新する
 * - 生徒が無料機能ほしさに「先生です」を選ぶのを防ぐため、申請は teacher_status = 'pending' にするだけ。
 *   is_teacher = true（教師ダッシュボードが使える状態）にするのは、管理者が手動で承認したとき（11_teacher_approval.sql）
 * - 新規登録はメールアドレスの確認をしていないので、学校ドメインのメールでも自動承認はしない
 */
import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createAdminSupabaseClient } from '~/lib/supabase.server';
import { normaliseSchoolInfo } from '~/lib/teacher-config';

export async function loader() {
  return json({ error: 'Method not allowed.' }, { status: 405 });
}

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, { status: 405 });
  }

  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return json({ error: 'Please sign in first.' }, { status: 401 });
  }

  const admin = createAdminSupabaseClient(context);
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) {
    return json({ error: 'Please sign in first.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const info = normaliseSchoolInfo(body.state, body.schoolName, body.schoolRefId);
  if ('error' in info) {
    return json({ error: info.error }, { status: 400 });
  }

  const { data: current } = await admin
    .from('profiles')
    .select('is_teacher, teacher_status')
    .eq('id', user.id)
    .maybeSingle();

  // 学校 ID は一覧に実在するものだけ保存する
  let schoolRefId = info.schoolRefId;
  if (schoolRefId) {
    const { data: school } = await admin.from('ref_au_schools').select('id').eq('id', schoolRefId).eq('state', info.state).maybeSingle();
    if (!school) schoolRefId = null;
  }

  const update: Record<string, unknown> = {};
  if (info.state) update.state = info.state;
  if (info.schoolName) {
    update.school_name = info.schoolName;
    update.school_ref_id = schoolRefId;
  }
  // 承認済み・却下済みの人の状態は変えない（却下された人が申請し直して pending に戻すのを防ぐ）
  if (!current?.is_teacher && !current?.teacher_status) {
    update.teacher_status = 'pending';
    update.teacher_requested_at = new Date().toISOString();
  }

  if (Object.keys(update).length > 0) {
    const { error } = await admin.from('profiles').update(update).eq('id', user.id);
    if (error) {
      console.error('[teacher-register] profile update failed:', error.message);
      return json({ error: 'Could not send your teacher account request. Please try again.' }, { status: 500 });
    }
  }

  return json({ success: true, status: current?.is_teacher ? 'approved' : (current?.teacher_status ?? 'pending') });
}
