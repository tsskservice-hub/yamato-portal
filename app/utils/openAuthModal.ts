/**
 * @file openAuthModal.ts
 * @description どの部品からでも、サインイン／サインアップの画面（PageLayout の認証モーダル）を開くための合図
 *
 * 使い方: requestAuthModal("signin") / requestAuthModal("signup")
 * ・PageLayout が "open-auth-modal" を受け取って、その場でモーダルを開く（ページは移動しない。入力中の答えも消えない）
 * ・PageLayout が無いページでは、トップページの /#auth に移動する（PageLayout が #auth を見て、モーダルを開く）
 */
export const OPEN_AUTH_EVENT = "open-auth-modal";

export type AuthModalMode = "signin" | "signup";

export interface OpenAuthDetail {
  mode: AuthModalMode;
  /** 受け取った PageLayout が true にする（true ならページを移動しない） */
  handled: boolean;
}

export function requestAuthModal(mode: AuthModalMode = "signin"): void {
  if (typeof window === "undefined") return;
  const detail: OpenAuthDetail = { mode, handled: false };
  window.dispatchEvent(new CustomEvent<OpenAuthDetail>(OPEN_AUTH_EVENT, { detail }));
  if (detail.handled) return;
  window.location.href = mode === "signup" ? "/#auth-signup" : "/#auth";
}
