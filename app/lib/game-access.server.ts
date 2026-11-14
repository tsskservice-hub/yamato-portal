/**
 * @file game-access.server.ts
 * @description ゲームを遊べるかどうかの判定（サーバー専用）
 *
 * - ゲームはログインが必要（ログアウトしてロックを回避できないように）
 * - クラスに入っている生徒は、先生がクラスのゲームをロックしていて、かつ個別にロック解除されていなければ遊べない
 * - クラスに入っていない人（個人の学習者・先生）は、ログインしていれば遊べる
 *
 * iframe のゲーム（/game-frame/:name）はブラウザから Authorization ヘッダーを付けられないため、
 * 遊べると判定したときに「チケット」（短い有効期限つきの署名）を渡し、iframe の URL に付けてもらう。
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getDerivedSecret } from '~/lib/supabase.server';

export type GameAccess =
  | { status: 'allowed' }
  | { status: 'login' }
  | { status: 'locked'; className: string };

/** チケットの有効期限。iframe を読み込む間だけ使うので短くてよい */
const TICKET_TTL_MS = 10 * 60_000;

/** Authorization: Bearer <access token> からログイン中のユーザー ID を返す。なければ null */
export async function getUserIdFromBearer(request: Request, admin: SupabaseClient): Promise<string | null> {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

/**
 * ログイン中のユーザーがゲームを遊べるか。
 * DB の読み込みに失敗したときは「遊べる」にする（ロックは授業に集中するための機能で、安全のための機能ではないため。
 * また 21_class_game_locks.sql を実行する前でもゲームが止まらないように）
 */
export async function getGameAccessForUser(admin: SupabaseClient, userId: string): Promise<GameAccess> {
  const { data: memberships, error: memberError } = await admin
    .from('edu_class_members')
    .select('class_id')
    .eq('user_id', userId)
    .eq('role', 'student');
  if (memberError) {
    console.error('[game-access] members query failed:', memberError.message);
    return { status: 'allowed' };
  }
  const classIds = (memberships ?? []).map((m: any) => m.class_id as string).filter(Boolean);
  if (classIds.length === 0) return { status: 'allowed' };

  const { data: lockedClasses, error: classError } = await admin
    .from('edu_classes')
    .select('id, name')
    .in('id', classIds)
    .eq('games_locked', true);
  if (classError) {
    console.error('[game-access] classes query failed:', classError.message);
    return { status: 'allowed' };
  }
  if (!lockedClasses?.length) return { status: 'allowed' };

  const { data: unlocks, error: unlockError } = await admin
    .from('edu_class_game_unlocks')
    .select('class_id')
    .eq('user_id', userId)
    .in('class_id', lockedClasses.map((c: any) => c.id as string));
  if (unlockError) {
    console.error('[game-access] unlocks query failed:', unlockError.message);
    return { status: 'allowed' };
  }
  const unlocked = new Set((unlocks ?? []).map((u: any) => u.class_id as string));
  const lockedBy = lockedClasses.find((c: any) => !unlocked.has(c.id as string));
  return lockedBy ? { status: 'locked', className: lockedBy.name as string } : { status: 'allowed' };
}

// ---------- iframe 用のチケット（userId.期限.署名） ----------

const encoder = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer) {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array | null {
  try {
    const s = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(s, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function ticketKey(context: any) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(getDerivedSecret(context, 'game-frame-ticket')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function createGameTicket(context: any, userId: string) {
  const payload = `${userId}.${Date.now() + TICKET_TTL_MS}`;
  const sig = await crypto.subtle.sign('HMAC', await ticketKey(context), encoder.encode(payload));
  return `${payload}.${toBase64Url(sig)}`;
}

/** 正しく署名され、期限内のチケットならユーザー ID を返す。そうでなければ null */
export async function verifyGameTicket(context: any, ticket: string | null): Promise<string | null> {
  if (!ticket) return null;
  const parts = ticket.split('.');
  if (parts.length !== 3) return null;
  const [userId, expRaw, sigText] = parts;
  const exp = Number(expRaw);
  if (!userId || !Number.isFinite(exp) || exp < Date.now()) return null;
  const sig = fromBase64Url(sigText);
  if (!sig) return null;
  const ok = await crypto.subtle.verify('HMAC', await ticketKey(context), sig, encoder.encode(`${userId}.${expRaw}`));
  return ok ? userId : null;
}
