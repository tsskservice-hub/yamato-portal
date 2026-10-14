import { supabase } from "./supabaseClient";

/**
 * 新規登録フロー：アカウント作成 ➔ パスキー登録 ➔ アカウント設定画面へリダイレクト
 */
export async function signUpAndRegisterPasskey(email: string): Promise<boolean> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    throw new Error("Please enter your email address.");
  }

  // 1. 一時パスワードを用いたSupabase Authでのアカウント作成
  const tempPassword = Math.random().toString(36).slice(-8) + "Aa1!";
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: trimmedEmail,
    password: tempPassword,
  });

  if (signUpError) throw signUpError;

  if (!signUpData.session || !signUpData.user) {
    throw new Error(
      "Account created successfully, but auth session failed to initialize. Please sign in again."
    );
  }

  // 💡 profiles テーブルにユーザーの ID, email と学習ペースの初期値を保存する
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: signUpData.user.id,
      email: trimmedEmail,
      learning_pace: 'normal', // 初期値として normal を設定
    });

  if (profileError) {
    console.error("Failed to save profile:", profileError);
    throw new Error("Failed to save user profile to database.");
  }

  // 2. ブラウザの生体認証（Passkey）登録プロンプトの呼び出し
  const { error: registerError } = await supabase.auth.registerPasskey();
  if (registerError) throw registerError;

  return true;
}

/**
 * パスキーログインフロー：生体認証によるインスタントログイン
 */
export async function signInWithPasskey(): Promise<boolean> {
  const { error } = await supabase.auth.signInWithPasskey();
  if (error) throw error;

  return true;
}