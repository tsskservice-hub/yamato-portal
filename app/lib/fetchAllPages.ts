/**
 * @file fetchAllPages.ts
 * @description Supabase の表を、1 回の上限（既定 1000 行）を超えても全部読む
 *
 * Supabase（PostgREST）は 1 回の問い合わせで返す行数に上限がある。`.limit(1000)` のままだと、
 * 表が大きくなったときに残りが黙って切り捨てられる。ここでは .range() で 1000 行ずつ読み、最後のページまで続ける。
 * ページの境目で行が重複・欠落しないよう、呼ぶ側は必ず一意な列（id など）を最後の並び順に入れること。
 *
 *  const rows = await fetchAllPages((from, to) =>
 *    supabase.from('kl_character').select('...').order('sort_order').order('id').range(from, to)
 *  );
 */
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000,
  maxPages = 50
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; page < maxPages; page++) {
    const from = page * pageSize;
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}
