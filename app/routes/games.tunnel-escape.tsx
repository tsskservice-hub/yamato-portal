/**
 * @file tunnel-escape.tsx
 * @description ショーシャンクの空に をモチーフにしたひらがな・カタカナトンネル脱出ゲーム（UI は英語）
 * ログインと先生のロックは GameAccessGate が確認する。
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useEffect, useState, useRef } from 'react';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import type { PageLayoutRef } from '~/components/layout/PageLayout';
import { GameAccessGate } from '~/components/games/GameAccessGate';
import { generateModuleMeta } from '~/utils/seoMeta';
import { shuffle } from '~/utils/shuffle';
import { supabase } from '~/lib/supabaseClient';

// ひらがな・カタカナの学習プール（順序問題やランダム四択用）
const CHAR_POOL = [
  { char: 'あ', kana: 'ア', romaji: 'a' },
  { char: 'い', kana: 'イ', romaji: 'i' },
  { char: 'う', kana: 'ウ', romaji: 'u' },
  { char: 'え', kana: 'エ', romaji: 'e' },
  { char: 'お', kana: 'オ', romaji: 'o' },
  { char: 'か', kana: 'カ', romaji: 'ka' },
  { char: 'き', kana: 'キ', romaji: 'ki' },
  { char: 'く', kana: 'ク', romaji: 'ku' },
  { char: 'け', kana: 'ケ', romaji: 'ke' },
  { char: 'こ', kana: 'コ', romaji: 'ko' },
  { char: 'さ', kana: 'サ', romaji: 'sa' },
  { char: 'し', kana: 'シ', romaji: 'shi' },
  { char: 'す', kana: 'ス', romaji: 'su' },
  { char: 'せ', kana: 'セ', romaji: 'se' },
  { char: 'そ', kana: 'ソ', romaji: 'so' },
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

export default function StudentTunnelEscapePage() {
  const layoutRef = useRef<PageLayoutRef>(null);

  return (
    <ToolPageWrapper layoutRef={layoutRef} breadcrumbTitle="Shawshank Tunnel Escape">
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <header className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-800">⛏️ Escape from Shawshank</h1>
            <p className="text-xs text-slate-500 mt-0.5">Dig the tunnel by answering hiragana and katakana multiple-choice questions</p>
          </div>
        </header>

        <GameAccessGate layoutRef={layoutRef}>{() => <GameArena />}</GameAccessGate>
      </div>
    </ToolPageWrapper>
  );
}

interface QuestionData {
  questionText: string;
  targetChar: string;
  options: string[];
  correctAnswer: string;
  typeHint: string;
}

function GameArena() {
  const [progress, setProgress] = useState(0); // 0% (牢獄) から 100% (自由の空へ)
  const [strikeCount, setStrikeCount] = useState(0); // 削った回数
  const [hp, setHp] = useState(3); // ミス許容回数
  const [isGameOver, setIsGameOver] = useState(false);
  const [isCleared, setIsCleared] = useState(false);

  // クイズ状態
  const [currentQuiz, setCurrentQuiz] = useState<QuestionData | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; isCorrect: boolean } | null>(null);

  // 新しい四択問題を作成する関数
  const generateNewQuestion = () => {
    const item = CHAR_POOL[Math.floor(Math.random() * CHAR_POOL.length)];
    const isKana = Math.random() > 0.5;
    const targetSymbol = isKana ? item.kana : item.char;
    const modeType = Math.random();

    let questionText = '';
    let correctAnswer = '';
    let typeHint = '';

    if (modeType < 0.4) {
      // パターン1: 読み方（ローマ字/ひらがな）当て
      questionText = `What is the correct reading of "${targetSymbol}"?`;
      correctAnswer = item.char;
      typeHint = `Romaji: ${item.romaji}`;
    } else if (modeType < 0.7) {
      // パターン2: ひらがな ⇔ カタカナ変換
      if (isKana) {
        questionText = `Which hiragana matches the katakana "${targetSymbol}"?`;
        correctAnswer = item.char;
      } else {
        questionText = `Which katakana matches the hiragana "${targetSymbol}"?`;
        correctAnswer = item.kana;
      }
      typeHint = `Hint: [${item.romaji}]`;
    } else {
      // パターン3: アルファベット(ローマ字)からの逆引き
      questionText = `Which character is "${item.romaji.toUpperCase()}"?`;
      correctAnswer = targetSymbol;
      typeHint = `Character recognition`;
    }

    // 4択の選択肢を作成
    const wrongPool = CHAR_POOL.filter(p => (isKana ? p.kana : p.char) !== targetSymbol);
    const shuffledWrong = shuffle(wrongPool).slice(0, 3);
    const options = shuffle([
      correctAnswer,
      ...shuffledWrong.map(w => (isKana && modeType >= 0.4 ? w.kana : w.char))
    ]);

    setCurrentQuiz({
      questionText,
      targetChar: targetSymbol,
      options,
      correctAnswer,
      typeHint,
    });
    setFeedback(null);
  };

  useEffect(() => {
    generateNewQuestion();
  }, []);

  // 選択肢を選んだときの処理
  const handleAnswerSelect = (selectedOption: string) => {
    if (!currentQuiz || feedback || isGameOver || isCleared) return;

    if (selectedOption === currentQuiz.correctAnswer) {
      // 正解：トンネルを掘り進める！
      setFeedback({ text: '⛏️ Chip… The wall crumbles and the tunnel moves forward!', isCorrect: true });
      setStrikeCount((prev) => prev + 1);

      const nextProgress = Math.min(100, progress + 10);
      setProgress(nextProgress);

      setTimeout(() => {
        if (nextProgress >= 100) {
          setIsCleared(true);
        } else {
          generateNewQuestion();
        }
      }, 1200);
    } else {
      // 不正解：警備員に見つかりそうになる…
      const nextHp = hp - 1;
      setHp(nextHp);
      setFeedback({ text: `❌ Danger of a cave-in! Your hammer slipped… (HP left: ${nextHp})`, isCorrect: false });

      if (nextHp <= 0) {
        setTimeout(() => {
          setIsGameOver(true);
        }, 1200);
      }
    }
  };

  const restartGame = () => {
    setProgress(0);
    setStrikeCount(0);
    setHp(3);
    setIsGameOver(false);
    setIsCleared(false);
    generateNewQuestion();
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center space-y-5 shadow-xl text-white">
      {/* ステータスバー（アンディの脱出状況） */}
      <div className="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700 text-sm">
        <span className="text-red-400 font-bold">❤️ HP: {'❤️'.repeat(hp)}</span>
        <span className="text-amber-400 font-bold">⛏️ Digs: {strikeCount}</span>
        <span className="text-emerald-400 font-bold">Escape: {progress}%</span>
      </div>

      {/* ショーシャンク風ビジュアル：トンネルの進捗状況 */}
      <div className="bg-gradient-to-b from-slate-950 to-stone-900 border border-stone-800 rounded-xl p-5 relative overflow-hidden space-y-3">
        <div className="flex justify-between text-xs text-stone-400 font-mono">
          <span>🔒 Behind the cell poster</span>
          <span>Freedom: the Pacific 🌊</span>
        </div>

        {/* トンネルのプログレスバー＆アンディのピクトグラム表現 */}
        <div className="w-full bg-stone-950 rounded-full h-6 border border-stone-700 relative overflow-hidden">
          <div
            className="bg-amber-600 h-full transition-all duration-500 flex items-center justify-end pr-2 text-xs font-bold text-amber-100 shadow-inner"
            style={{ width: `${progress}%` }}
          >
            {progress > 10 && '⛏️ Andy'}
          </div>
        </div>

        <div className="text-xs text-slate-400 italic">
          {progress < 30 && '"Patience and rock. The prison walls are hard, but if you chip away every day, one day you will break through."'}
          {progress >= 30 && progress < 70 && '"Digging the dark tunnel hidden behind the poster, little by little, with a rock hammer…"'}
          {progress >= 70 && progress < 100 && '"Almost there! I can smell the rain. Just a little further to the pipe!"'}
          {progress >= 100 && '"Free at last! Andy stands in the rain with his arms wide open!"'}
        </div>
      </div>

      {/* ゲームクリア画面 */}
      {isCleared ? (
        <div className="bg-stone-900 border-2 border-emerald-500 rounded-2xl p-8 space-y-4 animate-fade-in">
          <div className="text-4xl">🌊🦅✨</div>
          <h2 className="text-2xl font-black text-emerald-400">You escaped!</h2>
          <p className="text-sm text-stone-300 leading-relaxed">
            You mastered every character and question, dug all the way through the tunnel, and reached freedom!
          </p>
          <button
            onClick={restartGame}
            className="bg-emerald-600 hover:bg-emerald-700 font-bold px-6 py-2.5 rounded-xl text-white text-sm transition cursor-pointer"
          >
            Dig again from the start
          </button>
        </div>
      ) : isGameOver ? (
        /* ゲームオーバー画面 */
        <div className="bg-stone-900 border-2 border-red-500 rounded-2xl p-8 space-y-4">
          <div className="text-4xl">🚨</div>
          <h2 className="text-2xl font-black text-red-500">You were caught…</h2>
          <p className="text-sm text-stone-300">
            Too many mistakes alerted the guards, and you were sent back to your cell. Review the characters and try again!
          </p>
          <button
            onClick={restartGame}
            className="bg-indigo-600 hover:bg-indigo-700 font-bold px-6 py-2.5 rounded-xl text-white text-sm transition cursor-pointer"
          >
            Try again
          </button>
        </div>
      ) : (
        /* 四択クイズエリア */
        currentQuiz && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="space-y-1">
              <span className="text-xs bg-indigo-900/60 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-700">
                {currentQuiz.typeHint}
              </span>
              <h3 className="text-lg font-bold text-slate-100 pt-2">
                {currentQuiz.questionText}
              </h3>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-lg text-sm font-bold ${
                  feedback.isCorrect
                    ? 'bg-emerald-950/80 border border-emerald-600 text-emerald-300'
                    : 'bg-red-950/80 border border-red-600 text-red-300'
                }`}
              >
                {feedback.text}
              </div>
            )}

            {/* 4択ボタン */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {currentQuiz.options.map((option, index) => (
                <button
                  key={index}
                  disabled={Boolean(feedback)}
                  onClick={() => handleAnswerSelect(option)}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-indigo-500 text-white font-bold text-xl py-4 rounded-xl transition shadow-md cursor-pointer disabled:opacity-50"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
