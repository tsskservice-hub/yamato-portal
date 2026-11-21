/**
 * @file test.lookalike_.answers.tsx
 * @description 似ている文字のテストで正解になる答えの一覧（/test/lookalike/answers）
 *   テストの前に、見たい人だけが見る。正解はテストと同じもの（かな: KANA_ROMAJI、漢字: acceptedAnswers）。
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useEffect, useState } from 'react';
import { Link } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import { supabase } from '~/lib/supabaseClient';
import { acceptedAnswers } from '~/lib/kanji-meaning-check';
import { KANA_ROMAJI, LOOKALIKE_LABELS, LOOKALIKE_SETS, lookalikeChars, type LookalikeType } from '~/data/lookalike-sets';

export async function loader({ request }: LoaderFunctionArgs) {
  return json({ currentPath: new URL(request.url).pathname });
}

export const meta: MetaFunction = () => [
  { title: 'Look-alike Characters – Accepted Answers | JP Tutor AI Yamato' },
  { name: 'description', content: 'The look-alike hiragana, katakana and kanji, with the answers accepted in the test.' },
];

const TYPES: LookalikeType[] = ['hiragana', 'katakana', 'kanji'];

export default function LookalikeAnswersPage() {
  const [kanji, setKanji] = useState<Map<string, string[]>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('kl_character')
          .select('character, meaning')
          .eq('char_type', 'kanji')
          .in('character', lookalikeChars('kanji'));
        if (error) throw error;
        setKanji(new Map((data || []).map((r: any) => [String(r.character), acceptedAnswers(r.character, r.meaning)])));
      } catch (e: any) {
        setError(e?.message || 'Could not load the kanji answers.');
      }
    })();
  }, []);

  const answer = (type: LookalikeType, c: string) =>
    type === 'kanji' ? (kanji.get(c) ?? []).join(' / ') || '…' : KANA_ROMAJI[c] ?? '';

  return (
    <ToolPageWrapper>
      <div className="min-h-screen bg-slate-50 text-slate-800 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <Link to="/test/lookalike" className="text-sm text-indigo-600 hover:underline">
              ← Back to the look-alike test
            </Link>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">Look-alike Characters – Accepted Answers</h1>
            <p className="mt-1 text-sm text-slate-600">Check them before the test if you like.</p>
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 space-y-1">
            <p>
              <b>Kana:</b> only one romaji is correct — <b>shi, chi, tsu, fu, ji, wo, n</b> (not si, ti, tu, hu, zi). Upper or lower case does not matter.
            </p>
            <p>
              <b>Kanji:</b> any one of the English answers is correct. Upper or lower case, "to", "the", "a" or "an" at the start, and British or American
              spelling do not matter.
            </p>
            <p>Think a different answer should be accepted? Tell your teacher or contact us.</p>
          </div>

          <nav aria-label="Character types" className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <a key={t} href={`#${t}`} className="text-sm bg-white border border-slate-200 hover:bg-indigo-50 rounded-lg px-3 py-1">
                {LOOKALIKE_LABELS[t].title} {LOOKALIKE_LABELS[t].jp}
              </a>
            ))}
          </nav>

          {TYPES.map((t) => (
            <section key={t} id={t} className="scroll-mt-20 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="font-black text-slate-900">
                  {LOOKALIKE_LABELS[t].title} <span className="text-slate-400">{LOOKALIKE_LABELS[t].jp}</span>
                </h2>
                <Link to={`/test/lookalike?type=${t}`} className="text-sm font-bold text-indigo-600 underline">
                  Start →
                </Link>
              </div>
              {t === 'kanji' && error && <p className="text-rose-600 text-sm">{error}</p>}
              <div className="grid sm:grid-cols-2 gap-3">
                {LOOKALIKE_SETS[t].map((set, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {set.chars.map((c) => (
                      <div key={c} className="flex items-center gap-3 px-3 py-1.5">
                        <span className="text-3xl w-10 text-center shrink-0 text-slate-900">{c}</span>
                        <span className="text-sm text-slate-700">{answer(t, c)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </ToolPageWrapper>
  );
}
