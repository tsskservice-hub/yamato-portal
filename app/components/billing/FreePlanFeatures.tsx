/**
 * @file FreePlanFeatures.tsx
 * @description フリープランで使えるもの（チェック印つきの一覧。それぞれのページへのリンクつき）
 *   料金ページとトップページの Free のカードで使う。「Start for free と言っても AI が使えないなら意味がない」と
 *   思われないよう、AI なしで使えるものをはっきり見せる（2026-11-18 に決定）。
 */
import React from 'react';
import { Link } from '@remix-run/react';
import { Check } from 'lucide-react';

const FREE_FEATURES: { label: string; note?: string; to: string }[] = [
  { label: 'Genkoyoshi Editor', note: 'write on Japanese manuscript paper', to: '/vce/writing/genkoyoshi-editor-vce' },
  {
    label: 'VCE Kanji & Grammar Checker',
    note: 'type in your own sentences (reading handwriting with AI uses credits)',
    to: '/vce/writing/kanji-grammar-checker',
  },
  { label: 'Oral Exam Questions', note: 'questions that may come up in the oral exam', to: '/vce/speaking/oral-exam-questions' },
  { label: 'Textbook lessons', note: 'the first lesson of each textbook', to: '/lessons' },
  { label: 'All reference pages', note: 'kanji, grammar, vocabulary, text types and writing styles', to: '/reference' },
  { label: 'Character-learning games', to: '/games' },
  { label: 'Japanese culture games', to: '/games' },
];

export function FreePlanFeatures({ dark = false }: { dark?: boolean }) {
  return (
    <div className="space-y-2">
      <p className={`text-xs font-bold ${dark ? 'text-slate-300' : 'text-slate-700 dark:text-slate-200'}`}>Free to use, no AI needed:</p>
      <ul className="space-y-1.5">
        {FREE_FEATURES.map((f) => (
          <li key={f.label} className="flex items-start gap-2 text-sm">
            <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
            <span className={dark ? 'text-slate-300' : 'text-slate-600 dark:text-slate-300'}>
              <Link to={f.to} className="font-bold text-indigo-600 underline hover:text-indigo-800">
                {f.label}
              </Link>
              {f.note ? ` — ${f.note}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
