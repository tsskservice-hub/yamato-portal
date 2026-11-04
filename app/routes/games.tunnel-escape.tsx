/**
 * @file tunnel-escape.tsx
 * @description ショーシャンクの空に をモチーフにしたひらがな・カタカナトンネル脱出ゲーム
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useEffect, useState, useRef } from 'react';
import { Link } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/ToolPageWrapper';
import type { PageLayoutRef } from '~/components/PageLayout';
import { generateModuleMeta } from '~/utils/seoMeta';
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
  const [isGlobalUnlocked, setIsGlobalUnlocked] = useState(false);
  const [isIndividualUnlocked, setIsIndividualUnlocked] = useState(false);
  const [isCodeUnlocked, setIsCodeUnlocked] = useState(false);
  const [inputPasscode, setInputPasscode] = useState('');

  const isAccessible = isGlobalUnlocked || isIndividualUnlocked || isCodeUnlocked;

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPasscode === '1111') {
      setIsCodeUnlocked(true);
      alert('✨ 認証成功！脱出トンネルが一時的に解放されました。');
    } else {
      alert('❌ パスコードが違います。');
    }
  };

  return (
    <ToolPageWrapper layoutRef={layoutRef} breadcrumbTitle="Shawshank Tunnel Escape">
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <header className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-800">⛏️ ショーシャンクからの脱出</h1>
            <p className="text-xs text-slate-500 mt-0.5">ひらがな・カタカナ記憶＆四択トンネル掘削ゲーム</p>
          </div>
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
      questionText = `この文字「 ${targetSymbol} 」の正しい読みはどれ？`;
      correctAnswer = item.char;
      typeHint = `ローマ字: ${item.romaji}`;
    } else if (modeType < 0.7) {
      // パターン2: ひらがな ⇔ カタカナ変換
      if (isKana) {
        questionText = `カタカナ「 ${targetSymbol} 」のひらがなはどれ？`;
        correctAnswer = item.char;
      } else {
        questionText = `ひらがな「 ${targetSymbol} 」のカタカナはどれ？`;
        correctAnswer = item.kana;
      }
      typeHint = `ヒント: [${item.romaji}]`;
    } else {
      // パターン3: アルファベット(ローマ字)からの逆引き
      questionText = `ローマ字「 ${item.romaji.toUpperCase()} 」に対応する文字はどれ？`;
      correctAnswer = targetSymbol;
      typeHint = `文字認識トレーニング`;
    }

    // 4択の選択肢を作成
    const wrongPool = CHAR_POOL.filter(p => (isKana ? p.kana : p.char) !== targetSymbol);
    const shuffledWrong = [...wrongPool].sort(() => 0.5 - Math.random()).slice(0, 3);
    const options = [
      correctAnswer,
      ...shuffledWrong.map(w => (isKana && modeType >= 0.4 ? w.kana : w.char))
    ].sort(() => 0.5 - Math.random());

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
      setFeedback({ text: '⛏️ コツ…！壁が崩れ、トンネルが少し進んだ！', isCorrect: true });
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
      setFeedback({ text: `❌ 崩落の危険！ハンマーが滑った… (残りHP: ${nextHp})`, isCorrect: false });

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
        <span className="text-red-400 font-bold">❤️ 警戒度HP: {'❤️'.repeat(hp)}</span>
        <span className="text-amber-400 font-bold">⛏️ 掘削: {strikeCount}回</span>
        <span className="text-emerald-400 font-bold">脱出進捗: {progress}%</span>
      </div>

      {/* ショーシャンク風ビジュアル：トンネルの進捗状況 */}
      <div className="bg-gradient-to-b from-slate-950 to-stone-900 border border-stone-800 rounded-xl p-5 relative overflow-hidden space-y-3">
        <div className="flex justify-between text-xs text-stone-400 font-mono">
          <span>🔒 独房のポスター裏</span>
          <span>自由の空・太平洋 🌊</span>
        </div>

        {/* トンネルのプログレスバー＆アンディのピクトグラム表現 */}
        <div className="w-full bg-stone-950 rounded-full h-6 border border-stone-700 relative overflow-hidden">
          <div
            className="bg-amber-600 h-full transition-all duration-500 flex items-center justify-end pr-2 text-xs font-bold text-amber-100 shadow-inner"
            style={{ width: `${progress}%` }}
          >
            {progress > 10 && '⛏️ アンディ'}
          </div>
        </div>

        <div className="text-xs text-slate-400 italic">
          {progress < 30 && "「根気と岩盤。ショーシャンクの壁は硬いが、毎日削ればいつか必ず穴が開く。」"}
          {progress >= 30 && progress < 70 && "「ポスターの裏に隠された暗いトンネルを、ロックハンマーで少しずつ掘り進めている…」"}
          {progress >= 70 && progress < 100 && "「もうすぐだ！雨の匂いがする。出口のパイプまであともう一息！」"}
          {progress >= 100 && "「ついに自由だ！雨に打たれながら両手を広げるアンディの解放感！」"}
        </div>
      </div>

      {/* ゲームクリア画面 */}
      {isCleared ? (
        <div className="bg-stone-900 border-2 border-emerald-500 rounded-2xl p-8 space-y-4 animate-fade-in">
          <div className="text-4xl">🌊🦅✨</div>
          <h2 className="text-2xl font-black text-emerald-400">脱出成功！</h2>
          <p className="text-sm text-stone-300 leading-relaxed">
            見事にすべての文字と四択を正確にマスターし、長いトンネルを突き抜けて自由の空へたどり着きました！
          </p>
          <button
            onClick={restartGame}
            className="bg-emerald-600 hover:bg-emerald-700 font-bold px-6 py-2.5 rounded-xl text-white text-sm transition cursor-pointer"
          >
            もう一度最初から掘り直す
          </button>
        </div>
      ) : isGameOver ? (
        /* ゲームオーバー画面 */
        <div className="bg-stone-900 border-2 border-red-500 rounded-2xl p-8 space-y-4">
          <div className="text-4xl">🚨</div>
          <h2 className="text-2xl font-black text-red-500">見つかってしまった…</h2>
          <p className="text-sm text-stone-300">
            連続ミスにより看守に気づかれ、独房行きになってしまいました。もう一度記憶を整理して挑戦しよう！
          </p>
          <button
            onClick={restartGame}
            className="bg-indigo-600 hover:bg-indigo-700 font-bold px-6 py-2.5 rounded-xl text-white text-sm transition cursor-pointer"
          >
            リトライする
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