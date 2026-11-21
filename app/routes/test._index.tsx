/**
 * @file test._index.tsx
 * @description テストのハブページ（/test）
 *   一番上: ブラインドタッチ。その下に 文字・語彙・文 のテスト。
 *   生徒の自習にも、先生の形成的評価・総括的評価（formative / summative assessment）にも使う。
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React from 'react';
import { Link } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';

export async function loader({ request }: LoaderFunctionArgs) {
  return json({ currentPath: new URL(request.url).pathname });
}

export const meta: MetaFunction = () => [
  { title: 'Tests | JP Tutor AI Yamato' },
  {
    name: 'description',
    content: 'Language tests for kana, kanji, vocabulary and sentences: how accurately and how instantly can you answer? Plus a touch typing course.',
  },
];

interface TestItem {
  title: string;
  jp?: string;
  description: string;
  to?: string;
}

interface TestSection {
  id: string;
  title: string;
  jp: string;
  intro: string;
  color: string;
  items: TestItem[];
}

const SECTIONS: TestSection[] = [
  {
    id: 'characters',
    title: 'Characters',
    jp: '文字',
    intro: 'See a character and answer as fast as you can.',
    color: 'border-rose-200 bg-rose-50 text-rose-700',
    items: [
      { title: 'Hiragana', jp: 'ひらがな', description: 'See a hiragana, type its romaji. Column by column, then all.' },
      { title: 'Katakana', jp: 'カタカナ', description: 'See a katakana, type its romaji. Column by column, then all.' },
      {
        title: 'VCE Kanji 200',
        jp: '漢字',
        description: 'See a kanji, type its English meaning. Total time and average seconds per kanji.',
        to: '/test/kanji',
      },
    ],
  },
  {
    id: 'vocabulary',
    title: 'Vocabulary',
    jp: '語彙',
    intro: 'Words by topic, written in hiragana, katakana and kanji.',
    color: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    items: [{ title: 'Vocabulary by topic', jp: 'ことば', description: 'See a word, type its English meaning.' }],
  },
  {
    id: 'sentences',
    title: 'Sentences',
    jp: '文',
    intro: 'Understand Japanese sentences quickly.',
    color: 'border-sky-200 bg-sky-50 text-sky-700',
    items: [
      { title: 'Listening', jp: 'きく', description: 'Short to longer sentences. Answer in English.' },
      { title: 'Reading', jp: 'よむ', description: 'Short sentences. Answer in English.' },
    ],
  },
];

export default function TestHub() {
  return (
    <ToolPageWrapper>
      <div className="min-h-screen bg-slate-50 text-slate-800 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Tests</h1>
            <p className="mt-1 text-slate-600">
              How accurately — and how instantly — can you understand Japanese? Quick, confident answers show real language ability. Students can practise on their own, and teachers
              can use these tests as formative or summative assessment in class.
            </p>
            <p className="mt-2 text-sm">
              <Link to="/progress" className="font-bold text-indigo-600 underline">
                📈 See your results over time in My Progress
              </Link>
            </p>
            <p className="mt-2 text-sm text-amber-800">
              ⌨️ A computer with a keyboard is strongly recommended. Typing on a phone is much slower.
            </p>
          </div>

          {/* 一番上: ブラインドタッチ */}
          <Link
            to="/test/typing"
            className="block rounded-2xl border-2 border-indigo-300 bg-white hover:bg-indigo-50 shadow-sm p-6 transition-colors"
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl" aria-hidden>
                ⌨️
              </span>
              <div>
                <h2 className="text-xl font-black text-slate-900">Touch Typing</h2>
                <p className="text-sm text-slate-600 mt-1">
                  New to typing? Start here. Learn where each finger goes, step by step, then type Japanese in romaji.
                  The time in every test includes typing, so this will lift all your scores — and it helps in every
                  subject.
                </p>
                <span className="inline-block mt-3 text-sm font-bold text-indigo-600">Start learning →</span>
              </div>
            </div>
          </Link>

          <nav aria-label="Test types" className="flex flex-wrap gap-2">
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className={`text-sm font-semibold px-4 py-1.5 rounded-full border ${s.color}`}>
                {s.title} <span className="font-normal">{s.jp}</span>
              </a>
            ))}
          </nav>

          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-20 bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6">
              <h2 className="text-xl font-black text-slate-900">
                {s.title} <span className="text-slate-400 font-bold">{s.jp}</span>
              </h2>
              <p className="text-sm text-slate-600 mt-1">{s.intro}</p>
              <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {s.items.map((item) =>
                  item.to ? (
                    <Link
                      key={item.title}
                      to={item.to}
                      className="block border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                    >
                      <ItemBody item={item} />
                      <span className="inline-block mt-2 text-sm font-bold text-indigo-600">Start →</span>
                    </Link>
                  ) : (
                    <div key={item.title} className="border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50">
                      <ItemBody item={item} />
                      <span className="inline-block mt-2 text-xs font-bold text-slate-400 uppercase tracking-wide">
                        Coming soon
                      </span>
                    </div>
                  ),
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </ToolPageWrapper>
  );
}

function ItemBody({ item }: { item: TestItem }) {
  return (
    <>
      <div className="font-bold text-slate-900">
        {item.title} {item.jp && <span className="text-slate-400 font-semibold">{item.jp}</span>}
      </div>
      <p className="text-sm text-slate-600 mt-1">{item.description}</p>
    </>
  );
}
