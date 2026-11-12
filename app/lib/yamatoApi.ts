/**
 * @file yamatoApi.ts
 * @description AI Yamato API（api.jptutoraiyamato.com）を呼び出すための共通 fetch
 *
 * ログイン中であれば Supabase のアクセストークンを
 * `Authorization: Bearer <token>` として自動で付与する。
 * API 側はこのトークンでユーザーを特定する（body.userId は信用しない）。
 */
import { supabase } from './supabaseClient';

export const YAMATO_API_BASE = "https://api.jptutoraiyamato.com";

/** ログイン中ならアクセストークンを返す（未ログインなら null） */
export async function getAccessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/** fetch と同じ使い方で、Authorization ヘッダーを自動付与して API を呼び出す */
export async function yamatoFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("Authorization")) {
    const token = await getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}
