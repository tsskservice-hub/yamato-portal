/**
 * @file api.test-attempts.ts
 * @description 認識テスト（/test）の結果を保存する窓口（SQL 62 の test_attempts）
 *
 *   POST /api/test-attempts
 *     { testKey: 'kanji-vce200', scope: 'all' | 'Numbers, Time', items: [{ c: '山', typed: 'mountain', ms: 2100, passed?: true, left?: true }] }
 *
 * ・ログイン中の本人の分だけ。ブラウザの「正解」は信用せず、ここで kl_character の意味と照らして答え合わせし直す
 * ・答えた時間はブラウザで測ったもの（試作。本番ではサーバーが 1 問ずつ出す形にする予定）
 */
import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createAdminSupabaseClient } from '~/lib/supabase.server';
import { getSessionUser } from '~/lib/teacher.server';
import { acceptedAnswers, isCorrectMeaning } from '~/lib/kanji-meaning-check';

const MAX_ITEMS = 300;
const MAX_MS = 600_000;

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
  const { user, headers } = await getSessionUser(request, context);
  if (!user) return json({ error: 'Please sign in to save your results.' }, { status: 401, headers });

  const body: any = await request.json().catch(() => ({}));
  const testKey = String(body?.testKey ?? '');
  if (testKey !== 'kanji-vce200') return json({ error: 'Unknown test.' }, { status: 400, headers });

  const scope = String(body?.scope ?? 'all').slice(0, 300) || 'all';
  const raw: any[] = Array.isArray(body?.items) ? body.items.slice(0, MAX_ITEMS) : [];
  const items = raw
    .map((i) => ({
      c: typeof i?.c === 'string' ? i.c.slice(0, 4) : '',
      typed: typeof i?.typed === 'string' ? i.typed.slice(0, 100) : '',
      ms: Math.round(Number(i?.ms)),
      passed: Boolean(i?.passed),
      left: Boolean(i?.left),
    }))
    .filter((i) => i.c && Number.isFinite(i.ms) && i.ms >= 0)
    .map((i) => ({ ...i, ms: Math.min(i.ms, MAX_MS) }));
  if (items.length === 0) return json({ error: 'No answers to save.' }, { status: 400, headers });

  const admin = createAdminSupabaseClient(context);
  const chars = [...new Set(items.map((i) => i.c))];
  const { data: rows, error: readError } = await admin
    .from('kl_character')
    .select('character, meaning')
    .eq('char_type', 'kanji')
    .in('character', chars);
  if (readError) return json({ error: 'Could not check your answers. Please try again.' }, { status: 503, headers });
  const meaning = new Map((rows ?? []).map((r: any) => [String(r.character), r.meaning as string | null]));

  const details = items
    .filter((i) => meaning.has(i.c))
    .map((i) => ({
      c: i.c,
      ms: i.ms,
      ok: !i.passed && !i.left && isCorrectMeaning(i.typed, acceptedAnswers(i.c, meaning.get(i.c))),
    }));
  if (details.length === 0) return json({ error: 'No answers to save.' }, { status: 400, headers });

  const totalMs = details.reduce((n, d) => n + d.ms, 0);
  const { error } = await admin.from('test_attempts').insert({
    user_id: user.id,
    test_key: testKey,
    scope,
    item_count: details.length,
    correct_count: details.filter((d) => d.ok).length,
    total_ms: Math.min(totalMs, 36_000_000),
    avg_ms: Math.round(totalMs / details.length),
    details,
  });
  if (error) {
    console.error('[test-attempts] insert failed:', error.message);
    return json({ error: 'Your results could not be saved this time.' }, { status: 503, headers });
  }
  return json({ ok: true, correct: details.filter((d) => d.ok).length, total: details.length }, { headers });
}
