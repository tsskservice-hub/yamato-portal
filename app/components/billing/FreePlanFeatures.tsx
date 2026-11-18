/**
 * @file FreePlanFeatures.tsx
 * @description フリープランで使えるもの。Free のカードにはボタンだけを置き、押すとモーダルで一覧（チェック印・各ページへのリンク）を出す
 *   料金ページとトップページの Free のカードで使う。「Start for free と言っても AI が使えないなら意味がない」と
 *   思われないよう、AI なしで使えるものをはっきり見せる（2026-11-18 に決定）。
 *   一覧をカードに直接並べると、Basic・Plus のカードと高さがそろわないので、モーダルにした。
 */
import React, { useEffect, useState } from 'react';
import { Link } from '@remix-run/react';
import { Check, X } from 'lucide-react';

/** トップページから一覧のリンクで出かけたことを覚える印（戻ってきたら Free のカードの位置に戻すため。PricingSection が読む） */
export const LP_RETURN_KEY = 'lp-return-to-free-plan';
const rememberReturn = () => {
  try {
    if (window.location.pathname === '/') window.sessionStorage.setItem(LP_RETURN_KEY, String(Date.now()));
  } catch {
    // 覚えられなくても、リンクは開く
  }
};

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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 underline hover:text-indigo-800 cursor-pointer"
      >
        <Check className="w-4 h-4 text-emerald-600" aria-hidden="true" />
        See what you can use for free
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="free-plan-title"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 text-left"
          onClick={() => setOpen(false)}
        >
          <div
            className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6 space-y-4 ${
              dark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="free-plan-title" className="text-lg font-black">
                  What you can use on the Free plan
                </h3>
                <p className="text-sm text-slate-500 mt-1">These need no AI and no credits. Tap a name to open the page.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ul className="space-y-2.5">
              {FREE_FEATURES.map((f) => (
                <li key={f.label} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
                  <span className="text-slate-600 dark:text-slate-300">
                    <Link to={f.to} onClick={rememberReturn} className="font-bold text-indigo-600 underline hover:text-indigo-800">
                      {f.label}
                    </Link>
                    {f.note ? ` — ${f.note}` : ''}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500">
              The AI features (AI Yamato chat, oral practice with AI feedback, writing feedback and more) need the AI Trial or a plan.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
