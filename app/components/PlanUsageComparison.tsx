/**
 * @file PlanUsageComparison.tsx
 * @description 料金ページ：それぞれのパックのクレジットで、何をどのぐらい使って学習できるかを比べる表
 *
 *  - 使い方の型（初期表示は「全部 20% ずつ」）を選ぶと、各パックのクレジットをその割合で分けたときの回数を出す
 *  - クレジット数はパックの実データ（Supabase PRICE_PLANS）、1 回あたりの消費は credit-costs.ts から計算する
 *    （料金を変えても、この表は自動で合う）
 *  - 無料プランは AI 機能を使えない（A$1 の AI トライアルが必要）ので、表には出さない（memory: subscription-plan）
 */
import React, { useState } from 'react';
import { Calculator } from 'lucide-react';
import { CREDIT_COSTS } from '~/data/credit-costs';
import type { PricePlansData } from '~/data/price-plans';

type ActivityKey = 'text' | 'image' | 'drill' | 'elaborate' | 'mock';

const ACTIVITIES: Array<{ key: ActivityKey; name: string; unit: string; cost: number }> = [
  { key: 'text', name: 'Text chat with AI Yamato', unit: 'turns', cost: CREDIT_COSTS.textChat },
  { key: 'image', name: 'Text chat with 1 photo', unit: 'turns', cost: CREDIT_COSTS.imageAttachment },
  { key: 'drill', name: 'EOY Oral Drill', unit: 'questions', cost: CREDIT_COSTS.oralDrill },
  { key: 'elaborate', name: 'EOY Oral Elaborate', unit: 'questions', cost: CREDIT_COSTS.oralElaborate },
  { key: 'mock', name: 'Full Mock exam (approx. 15 min)', unit: 'mocks', cost: CREDIT_COSTS.mockFull },
];

/** 使い方の型（それぞれの活動に使うクレジットの割合 %） */
const STYLES: Array<{ key: string; label: string; description: string; share: Record<ActivityKey, number> }> = [
  {
    key: 'balanced',
    label: 'Balanced',
    description: 'Credits split evenly: 20% on each of the five activities.',
    share: { text: 20, image: 20, drill: 20, elaborate: 20, mock: 20 },
  },
  {
    key: 'oral',
    label: 'VCE oral exam prep',
    description: 'Mostly speaking practice for the oral exam: 30% Drill, 30% Elaborate, 20% Full Mock, 10% each for chat.',
    share: { text: 10, image: 10, drill: 30, elaborate: 30, mock: 20 },
  },
  {
    key: 'chat',
    label: 'Everyday learning',
    description: 'Mostly asking AI Yamato questions: 50% text chat, 30% chat with photos, 10% each for Drill and Elaborate.',
    share: { text: 50, image: 30, drill: 10, elaborate: 10, mock: 0 },
  },
];

type Column = { key: string; name: string; price: string; credits: number; note: string; highlight?: boolean };

function columnsFrom(plans: PricePlansData): Column[] {
  const cols: Column[] = [];
  for (const key of ['starter', 'standard', 'pro'] as const) {
    const p = plans[key];
    if (!p) continue;
    const credits = (p.regularCredits ?? 0) + (p.bonusCredits ?? 0);
    const centsPerCredit = credits > 0 ? (p.priceAUD * 100) / credits : 0;
    cols.push({
      key,
      name: p.name.replace(/\b\w+/g, (w) => w[0] + w.slice(1).toLowerCase()),
      price: p.price,
      credits,
      note: centsPerCredit ? `${centsPerCredit.toFixed(2)}¢ per credit` : '',
      highlight: key === 'standard',
    });
  }
  return cols;
}

export function PlanUsageComparison({ plans }: { plans: PricePlansData }) {
  const [styleKey, setStyleKey] = useState(STYLES[0].key);
  const style = STYLES.find((s) => s.key === styleKey) ?? STYLES[0];
  const columns = columnsFrom(plans);
  if (columns.length === 0) return null;

  const timesFor = (credits: number, a: (typeof ACTIVITIES)[number]) =>
    Math.floor((credits * style.share[a.key]) / 100 / a.cost);

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-sm space-y-1">
        <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center justify-center gap-2">
          <Calculator className="w-4 h-4 text-blue-600" /> What can you do with each pack?
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Every pack can use the same AI Yamato features, as long as you have enough credits. Choose a study style to compare.
        </p>
      </div>

      {/* 使い方の型 */}
      <div className="flex flex-wrap justify-center gap-2" role="tablist" aria-label="Study style">
        {STYLES.map((s) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={styleKey === s.key}
            onClick={() => setStyleKey(s.key)}
            className={`px-4 py-2 rounded-full text-xs font-bold border cursor-pointer transition-colors ${
              styleKey === s.key
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-center text-slate-500 dark:text-slate-400">{style.description}</p>

      {/* 比較表 */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="text-left font-semibold text-slate-600 dark:text-slate-300 p-3 min-w-[12rem]">Activity (credits each)</th>
              {columns.map((c) => (
                <th key={c.key} className={`p-3 text-center min-w-[8rem] ${c.highlight ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}>
                  <div className="font-bold text-slate-900 dark:text-white">{c.name}</div>
                  <div className="text-xs font-semibold text-slate-500">{c.price} · {c.credits.toLocaleString('en-AU')} credits</div>
                  <div className="text-[10px] font-normal text-slate-400">{c.note}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ACTIVITIES.map((a) => (
              <tr key={a.key} className={`border-b border-slate-100 dark:border-slate-800 ${style.share[a.key] === 0 ? 'opacity-40' : ''}`}>
                <td className="p-3 text-slate-700 dark:text-slate-300">
                  <div className="font-semibold">{a.name}</div>
                  <div className="text-xs text-slate-500">{a.cost} credits each · {style.share[a.key]}% of credits</div>
                </td>
                {columns.map((c) => {
                  const n = timesFor(c.credits, a);
                  return (
                    <td key={c.key} className={`p-3 text-center ${c.highlight ? 'bg-blue-50/60 dark:bg-blue-950/20' : ''}`}>
                      <span className="text-lg font-black text-slate-900 dark:text-white">{n.toLocaleString('en-AU')}</span>
                      <span className="block text-[11px] text-slate-500">{a.unit}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 max-w-3xl mx-auto">
        Estimates only, rounded down. Each number shows how many times you could use that activity with its share of the pack&apos;s credits.
        Other features (Mock Sections 1 and 2, EOY Oral Superb,
        chats with 2–4 photos, Kanji AI Lookup) use credits as shown in the Credit Consumption Guide above.
      </p>
    </div>
  );
}

export default PlanUsageComparison;
