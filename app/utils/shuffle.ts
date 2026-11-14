/**
 * @file shuffle.ts
 * @description 偏りのないシャッフル（Fisher–Yates）。元の配列は変えずに新しい配列を返す
 *
 * `arr.sort(() => 0.5 - Math.random())` は並びが偏るので使わないこと。
 */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
