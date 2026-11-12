/**
 * @file teacher.server.ts
 * @description 教師ダッシュボード・クラス・宿題のサーバー専用ヘルパー
 *
 * edu_classes / edu_homework はブラウザから読み書きできない（RLS・権限なし）。
 * ここで「ログイン中の人が誰か」「教師か」「そのクラスの担任か」を確認してから、管理者キーで操作する。
 */
import { redirect } from '@remix-run/cloudflare';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminSupabaseClient, createServerSupabaseClient } from '~/lib/supabase.server';
import { emailDomain, isFreeEmailDomain } from '~/lib/teacher-config';

/** ログイン中のユーザー（Cookie のセッション）を返す。未ログインなら null */
export async function getSessionUser(request: Request, context: any) {
  const { supabase, headers } = createServerSupabaseClient(request, context);
  const { data: { user } } = await supabase.auth.getUser();
  return { user, headers };
}

/** 承認済みの教師（is_teacher = true）でなければトップへ戻す。教師なら user と管理者クライアントを返す */
export async function requireTeacher(request: Request, context: any) {
  const result = await getTeacherOrApplicant(request, context);
  if (!result.profile.is_teacher) throw redirect('/', { headers: result.headers });
  return result;
}

/**
 * 承認済みの教師、または審査中（teacher_status = 'pending'）の申請者を返す。どちらでもなければトップへ戻す
 * 教師ダッシュボードの表示（審査中の案内を出すため）だけで使う。操作（action）には requireTeacher を使うこと
 */
export async function getTeacherOrApplicant(request: Request, context: any) {
  const { user, headers } = await getSessionUser(request, context);
  if (!user) throw redirect('/', { headers });

  const admin = createAdminSupabaseClient(context);
  const { data: profile } = await admin
    .from('profiles')
    .select('is_teacher, teacher_status, nickname, school_name, state')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || (!profile.is_teacher && profile.teacher_status !== 'pending')) throw redirect('/', { headers });
  return { user, profile, admin, headers };
}

/** そのクラスがこの教師のものなら行を返す。違えば null */
export async function getOwnedClass(admin: SupabaseClient, teacherId: string, classId: unknown) {
  if (typeof classId !== 'string' || !classId) return null;
  const { data } = await admin
    .from('edu_classes')
    .select('id, name, join_code, created_at')
    .eq('id', classId)
    .eq('teacher_id', teacherId)
    .maybeSingle();
  return data;
}

// 見間違えやすい文字（0/O, 1/I/L）を除いた参加コード
const JOIN_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateJoinCode(length = 6) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => JOIN_CODE_ALPHABET[b % JOIN_CODE_ALPHABET.length]).join('');
}

export function normaliseJoinCode(raw: unknown) {
  return typeof raw === 'string' ? raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
}

/** 生徒が入っているクラス（1人1クラス）を返す */
export async function getStudentClass(admin: SupabaseClient, userId: string) {
  const { data: member } = await admin
    .from('edu_class_members')
    .select('class_id')
    .eq('user_id', userId)
    .eq('role', 'student')
    .limit(1)
    .maybeSingle();
  if (!member?.class_id) return null;

  const { data: cls } = await admin
    .from('edu_classes')
    .select('id, name, teacher_id')
    .eq('id', member.class_id)
    .maybeSingle();
  if (!cls) return null;

  const { data: teacher } = await admin
    .from('profiles')
    .select('nickname, school_name')
    .eq('id', cls.teacher_id)
    .maybeSingle();

  return {
    id: cls.id as string,
    name: cls.name as string,
    teacherName: (teacher?.nickname as string | null) ?? null,
    schoolName: (teacher?.school_name as string | null) ?? null,
  };
}

// ---------- 学校アカウント（Google / Microsoft）での確認 ----------

export type VerifiedSchoolEmail = { provider: string; email: string; domain: string };

/**
 * 本人が紐付けた Google / Microsoft アカウントのうち、メールアドレスが確認済みで、個人向けの無料メールではないもの。
 * 登録時のメールアドレス（auth.users.email）は確認していないので使わない
 */
export async function getVerifiedSchoolEmails(admin: SupabaseClient, userId: string): Promise<VerifiedSchoolEmail[]> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user) return [];
  const list: VerifiedSchoolEmail[] = [];
  for (const identity of data.user.identities ?? []) {
    if (identity.provider !== 'google' && identity.provider !== 'azure') continue;
    const info = (identity.identity_data ?? {}) as Record<string, unknown>;
    const email = typeof info.email === 'string' ? info.email.toLowerCase() : '';
    const verified = info.email_verified === true || info.email_verified === 'true';
    const domain = emailDomain(email);
    if (email && verified && domain && !isFreeEmailDomain(domain)) {
      list.push({ provider: identity.provider, email, domain });
    }
  }
  return list;
}
