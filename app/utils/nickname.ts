/**
 * @file app/utils/nickname.ts
 * @description ユーザーのニックネームを安全に解決し、挨拶文などをパーソナライズするユーティリティモジュール
 */

/**
 * 渡されたニックネームが有効か判定し、未設定・空欄の場合はデフォルト名（my friend等）を返します。
 * @param userNickname ユーザーのニックネーム文字列
 * @param defaultName デフォルトの呼びかけ名（デフォルト: "my friend"）
 */
export function resolveDisplayName(userNickname?: string | null, defaultName: string = "my friend"): string {
  if (!userNickname) return defaultName;
  const trimmed = userNickname.trim();
  return trimmed !== "" ? trimmed : defaultName;
}

/**
 * 挨拶文などの文字列に含まれる "my friend" を、ユーザーのニックネームにパーソナライズして置換します。
 * @param greeting 元の挨拶文
 * @param userNickname ユーザーのニックネーム文字列
 * @param defaultName 置換対象が見つからない場合のデフォルト名
 */
export function personaliseGreeting(
  greeting: string, 
  userNickname?: string | null, 
  defaultName: string = "my friend"
): string {
  if (!greeting) return "";
  const displayName = resolveDisplayName(userNickname, defaultName);
  // 大文字小文字を問わず "my friend" にマッチさせて置換
  return greeting.replace(/my friend/gi, displayName);
}