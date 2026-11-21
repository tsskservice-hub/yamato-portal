/**
 * @file test.kanji_.answers.tsx
 * @description VCE 漢字テストで正解になる英語の一覧（/test/kanji/answers）
 *   テストの前に、見たい人だけが見る（漢字は分かっているのに、答え方の違いで不正解になるのを防ぐ）。
 *   正解は テストと同じ acceptedAnswers()（kl_character.meaning ＋ EXTRA_ANSWERS）から作る。
 *   ファイル名の "kanji_" は、/test/kanji のページの中に入れず、別のページにするため（Remix の決まり）。
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import { supabase } from '~/lib/supabaseClient';
import { acceptedAnswers, KANJI_GROUP_ORDER } from '~/lib/kanji-meaning-check';

export async function loader({ request }: LoaderFunctionArgs) {
  return json({ currentPath: new URL(request.url).pathname });
}

export const meta: MetaFunction = () => [
  { title: 'VCE Kanji Test – Accepted Answers | JP Tutor AI Yamato' },
  { name: 'description', content: 'The 200 VCE kanji and the English answers accepted in the kanji test.' },
];

type Row = { character: string; meaning: string | null; category: string | null };

export default function KanjiAnswersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('kl_character')
          .select('character, meaning, category')
          .eq('char_type', 'kanji')
          .order('sort_order', { ascending: true });
        if (error) throw error;
        setRows((data || []) as Row[]);
      } catch (e: any) {
        setError(e?.message || 'Could not load the kanji list.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      const g = r.category || 'Miscellaneous';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(r);
    }
    const rank = (g: string) => {
      const i = KANJI_GROUP_ORDER.indexOf(g);
      return i === -1 ? KANJI_GROUP_ORDER.length : i;
    };
    return [...map.entries()].sort((a, b) => rank(a[0]) - rank(b[0]));
  }, [rows]);

  return (
    <ToolPageWrapper>
      <div className="min-h-screen bg-slate-50 text-slate-800 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <Link to="/test/kanji" className="text-sm text-indigo-600 hover:underline">
              ← Back to the kanji test
            </Link>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">VCE Kanji Test – Accepted Answers</h1>
            <p className="mt-1 text-sm text-slate-600">
              Any one of the English answers for a kanji is correct. Check them before the test if you like.
            </p>
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 space-y-1">
            <p>
              <b>These do not matter:</b> upper or lower case, spaces at the start or end, "to", "the", "a" or "an" at the start
              ("to eat" = "eat"), hyphens, and British or American spelling (colour = color).
            </p>
            <p>Numbers can be typed as digits (一 = one or 1, 万 = ten thousand or 10000).</p>
            <p>
              Think a different answer should be accepted? Tell your teacher or contact us — we add good answers to the list.
            </p>
          </div>

          {groups.length > 0 && (
            <nav aria-label="Kanji groups" className="flex flex-wrap gap-1.5">
              {groups.map(([g, list]) => (
                <a key={g} href={`#g-${encodeURIComponent(g)}`} className="text-xs bg-white border border-slate-200 hover:bg-indigo-50 rounded-lg px-2.5 py-1">
                  {g} <span className="text-slate-400">({list.length})</span>
                </a>
              ))}
            </nav>
          )}

          {loading && <p className="text-slate-500">Loading kanji…</p>}
          {error && <p className="text-rose-600">{error}</p>}

          {groups.map(([g, list]) => (
            <section key={g} id={`g-${encodeURIComponent(g)}`} className="scroll-mt-20 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5">
              <h2 className="font-black text-slate-900 mb-2">{g}</h2>
              <div className="divide-y divide-slate-100">
                {list.map((r) => (
                  <div key={r.character} className="flex items-center gap-4 py-2">
                    <span className="text-3xl w-12 text-center shrink-0 text-slate-900">{r.character}</span>
                    <span className="text-sm text-slate-700">{acceptedAnswers(r.character, r.meaning).join(' / ')}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {groups.length > 0 && (
            <div className="text-center">
              <Link to="/test/kanji" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-6 py-3">
                Start the kanji test →
              </Link>
            </div>
          )}
        </div>
      </div>
    </ToolPageWrapper>
  );
}
