'client'; // または 'use client' (環境に合わせて調整)
import React, { useState } from 'react';

const MOCK_CHARACTERS = [
  { id: 1, char: 'あ', romaji: 'a', type: 'hiragana' },
  { id: 2, char: 'い', romaji: 'i', type: 'hiragana' },
  { id: 3, char: 'か', romaji: 'ka', type: 'hiragana' },
  { id: 4, char: 'さ', romaji: 'sa', type: 'hiragana' },
  { id: 5, char: '日', romaji: 'nichi', type: 'kanji' },
  { id: 6, char: '本', romaji: 'hon', type: 'kanji' },
];

export default function StudentTowerDefensePage() {
  // ※本来はSupabaseから「現在のログイン生徒のデータ」と「クラスのロック状態」をリアルタイムで取得します
  const [isGlobalUnlocked, setIsGlobalUnlocked] = useState(false);
  const [isIndividualUnlocked, setIsIndividualUnlocked] = useState(false); // 先生が個別に解除したフラグ
  const [isCodeUnlocked, setIsCodeUnlocked] = useState(false);
  const [inputPasscode, setInputPasscode] = useState('');

  const isAccessible = isGlobalUnlocked || isIndividualUnlocked || isCodeUnlocked;

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPasscode === '8842') { // 先生が指定したパスコード
      setIsCodeUnlocked(true);
      alert('✨ 認証成功！ゲームが一時的に解放されました。');
    } else {
      alert('❌ パスコードが違います。');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      <div className="max-w-xl mx-auto space-y-6">
        <header className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex justify-between items-center">
          <h1 className="text-lg font-bold text-red-400">🇯🇵 AI Yamato タイピング防衛戦</h1>
          <a href="/teacher/dashboard" className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded text-slate-300">
            教師用ダッシュボードへ ↗
          </a>
        </header>

        {isAccessible ? (
          <GameArena />
        ) : (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center space-y-6 shadow-xl">
            <div className="w-16 h-16 bg-slate-700/60 rounded-full flex items-center justify-center mx-auto text-3xl">
              🔒
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">このエリアは現在ロックされています</h2>
              <p className="text-sm text-slate-400">
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
                className="bg-slate-900 border border-slate-600 rounded px-4 py-2 text-center text-lg font-mono tracking-widest w-full text-slate-100 focus:outline-none focus:border-red-500"
              />
              <button type="submit" className="bg-red-600 hover:bg-red-500 font-semibold px-4 py-2 rounded text-white text-sm">
                解除
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
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
    <div className="bg-slate-800 border border-emerald-500/40 rounded-2xl p-6 text-center space-y-6 shadow-2xl">
      <div className="flex justify-between items-center bg-slate-900/60 p-3 rounded-xl border border-slate-700 text-sm">
        <span className="text-emerald-400 font-semibold">🟢 ステータス: プレイ可能</span>
        <span className="font-bold text-amber-400">SCORE: {score} pt</span>
      </div>

      <div className="bg-slate-950 border border-slate-700 rounded-xl p-8 relative">
        <div className="w-24 h-24 bg-red-600/20 border-2 border-red-500/60 rounded-2xl mx-auto flex flex-col items-center justify-center mb-6 animate-pulse">
          <span className="text-4xl font-black text-white">{currentItem.char}</span>
        </div>

        <form onSubmit={handleSubmit} className="max-w-xs mx-auto flex gap-2">
          <input
            type="text"
            autoFocus
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={`ローマ字 ("${currentItem.romaji}")`}
            className="bg-slate-800 border border-slate-600 rounded px-4 py-2 text-center text-lg font-mono text-slate-100 w-full focus:outline-none focus:border-emerald-500"
          />
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 font-bold px-4 py-2 rounded text-white text-sm">
            攻撃
          </button>
        </form>
      </div>
    </div>
  );
}