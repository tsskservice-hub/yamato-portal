/**
 * @file credit-costs.ts
 * @description 画面に出すクレジット数を 1 か所にまとめたもの（公開している料金表 Credit Consumption Guide と同じ数字）
 *
 * 料金を変えるときは、次の 3 か所を一緒に変える:
 *   1. ここ（画面の表示と、送る前の残高チェック）
 *   2. api/src/credit-rules.ts の SERVER_CREDIT_COSTS（サーバーが実際に引く数）
 *   3. Supabase kl_app の PRICE_PLANS（公開している料金表）
 */
export const CREDIT_COSTS = {
  textChat: 2,
  imageAttachment: 4,
  multiImageAttachment: 6,
  oralDrill: 4,
  oralElaborate: 8,
  mockSection1: 15,
  mockSection2: 15,
  mockFull: 25,
  /** EOY Oral Superb（Realtime の自由会話）5 分 / 10 分 */
  realtime5: 25,
  realtime10: 50,
  /** 漢字AI検索: 1 日 20 回まで無料、それを超えたら 1 回このクレジット数 */
  kanjiLookup: 1,
  kanjiLookupFreePerDay: 20,
} as const;
