/**
 * @file credit-errors.ts
 * @description AI の機能でクレジットが使えなかったとき（サーバーが 402 を返したとき）の案内文
 *
 * サーバー（api の credit-handler.ts）が返す error の種類:
 *   AI_TRIAL_REQUIRED … AI 体験・プランをまだ買っていない（新しく登録したフリーの人。SQL 51）
 *   ZERO_CREDITS / PARTIAL_SHORTAGE … クレジットが足りない
 * チャット（HTML で表示）と、ふつうの文の両方の形を返す。
 */

/** クレジットが使えなかったことを表すエラー（catch で見分けて、案内文をそのまま出す） */
export class CreditError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'CreditError';
  }
}

export function creditErrorText(code?: string): string {
  if (code === 'AI_TRIAL_REQUIRED') {
    return 'To use the AI features, start with the AI Trial (A$1 for 100 credits) or choose a plan on the Plans page (/prices). After that, your daily quiz credits can be used for AI too.';
  }
  return 'You don’t have enough credits for this. Please choose a plan, or top up if you already have one, on the Plans page (/prices).';
}

/**
 * チャット用（料金ページへのリンクつき）。チャットの吹き出しは HTML として表示する（safeHtml を通す）ので HTML で書く
 */
const PLANS_LINK = '<a href="/prices" style="color:#4f46e5;font-weight:700;text-decoration:underline">👉 See plans</a>';
export function creditErrorChatHtml(code?: string): string {
  if (code === 'AI_TRIAL_REQUIRED') {
    return `🔓 <b>AI Trial or plan needed</b>

To use the AI features, start with the <b>AI Trial (A$1 for 100 credits)</b> or choose a plan.

${PLANS_LINK}

After that, your daily quiz credits can be used for AI too.`;
  }
  return `🌟 <b>Not enough credits</b>

You don’t have enough credits for this. Please choose a plan, or top up if you already have one. New to the AI features? Try the <b>AI Trial (A$1 for 100 credits)</b>.

${PLANS_LINK}`;
}

/** 402 ならその内容から CreditError を作る（402 でなければ null）。本文は読み切らないよう、複製から読む */
export async function creditErrorFromResponse(res: Response): Promise<CreditError | null> {
  if (res.status !== 402) return null;
  const data = (await res.clone().json().catch(() => ({}))) as { error?: string };
  return new CreditError(data.error || 'ZERO_CREDITS', creditErrorText(data.error));
}
