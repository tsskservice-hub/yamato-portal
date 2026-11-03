/**
 * @file tower-defense.tsx
 * @description 生徒用タイピング防衛戦 (ToolPageWrapper 統合型・PageLayoutラップ対応版)
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useRef, useState } from 'react';
import { Link } from '@remix-run/react';
import { ToolPageWrapper } from '../components/ToolPageWrapper';
import type { PageLayoutRef } from '../components/PageLayout';
import { generateModuleMeta } from '../utils/seoMeta';
import { supabase } from '../lib/supabaseClient';

const MOCK_CHARACTERS = [
  { id: 1, char: 'あ', romaji: 'a', type: 'hiragana' },
  { id: 2, char: 'い', romaji: 'i', type: 'hiragana' },
  { id: 3, char: 'か', romaji: 'ka', type: 'hiragana' },
  { id: 4, char: 'さ', romaji: 'sa', type: 'hiragana' },
  { id: 5, char: '日', romaji: 'nichi', type: 'kanji' },
  { id: 6, char: '本', romaji: 'hon', type: 'kanji' },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  let portalContent = null;
  try {
    const { data: portalData } = await supabase
      .from('portal_settings')
      .select('content')
      .eq('key', 'PORTAL_CONTENT')
      .single();
    portalContent = portalData?.content || null;
  } catch (e) {}

  return json({
    portalContent,
    currentPath: url.pathname,
  });
}

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta(data?.portalContent || null, data?.currentPath || '');
};

export default function StudentTowerDefensePage() {
  const layoutRef = useRef<PageLayoutRef>(null);
  const [isGlobalUnlocked, setIsGlobalUnlocked] = useState(false);
  const [isIndividualUnlocked, setIsIndividualUnlocked] = useState(false);
  const [isCodeUnlocked, setIsCodeUnlocked] = useState(false);
  const [inputPasscode, setInputPasscode] = useState('');

  const isAccessible = isGlobalUnlocked || isIndividualUnlocked || isCodeUnlocked;

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPasscode === '8842') {
      setIsCodeUnlocked(true);
      alert('✨ 認証成功！ゲームが一時的に解放されました。');
    } else {
      alert('❌ パスコードが違います。');
    }
  };

  return (
    <ToolPageWrapper layoutRef={layoutRef} breadcrumbTitle="Typing Tower Defense">
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <header className="bg-white border border-slate-200 p-5 rounded-xl flex justify-between items-center shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-800">🇯🇵 AI Yamato タイピング防衛戦</h1>
            <p className="text-xs text-slate-500 mt-0.5">VCE Japanese Typing Practice</p>
          </div>
          <Link
            to="/teacher/dashboard"
            className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3.5 py-2 rounded-lg border border-indigo-200 transition no-underline inline-flex items-center"
          >
            教師用ダッシュボードへ ↗
          </Link>
        </header>

        {isAccessible ? (
          <GameArena />
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-6 shadow-sm">
            <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner">
              🔒
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">このエリアは現在ロックされています</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                授業の課題を終わらせるか、先生から伝えられたパスコードを入力してください。早く終わった生徒は先生が個別に解放してくれます！
              </p>
            </div>

            <form onSubmit={handlePasscodeSubmit} className="flex gap-2 max-w-xs mx-auto">
              <input
                type="text"
                maxLength={4}
                placeholder="4桁コード"
                value={inputPasscode}
                onChange={(e) => setInputPasscode(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-center text-lg font-mono tracking-widest w-full text-slate-900 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 font-bold px-4 py-2 rounded-lg text-white text-sm cursor-pointer shadow-sm transition"
              >
                解除
              </button>
            </form>
          </div>
        )}
      </div>
    </ToolPageWrapper>
  );
}

function GameArena() {
  const [score, setScore] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const currentItem = MOCK_CHARACTERS[currentIndex];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim().toLowerCase() === currentItem.romaji) {
      setScore(score + 100);
      setInputVal('');
      setCurrentIndex(Math.floor(Math.random() * MOCK_CHARACTERS.length));
    } else {
      setInputVal('');
    }
  };

  return (
    <div className="bg-white border border-emerald-200 rounded-2xl p-6 text-center space-y-6 shadow-sm">
      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm">
        <span className="text-emerald-700 font-bold">🟢 ステータス: プレイ可能</span>
        <span className="font-bold text-amber-600">SCORE: {score} pt</span>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 relative">
        <div className="w-24 h-24 bg-red-50 border-2 border-red-200 rounded-2xl mx-auto flex flex-col items-center justify-center mb-6 shadow-xs animate-pulse">
          <span className="text-4xl font-black text-red-600">{currentItem.char}</span>
        </div>

        <form onSubmit={handleSubmit} className="max-w-xs mx-auto flex gap-2">
          <input
            type="text"
            autoFocus
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={`ローマ字 ("${currentItem.romaji}")`}
            className="bg-white border border-slate-300 rounded-lg px-4 py-2 text-center text-lg font-mono text-slate-900 w-full focus:outline-none focus:border-emerald-500 shadow-2xs"
          />
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 font-bold px-4 py-2 rounded-lg text-white text-sm cursor-pointer shadow-sm transition"
          >
            攻撃
          </button>
        </form>
      </div>
    </div>
  );
}