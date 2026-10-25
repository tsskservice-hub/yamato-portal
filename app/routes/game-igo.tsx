/**
 * @file game-igo.tsx
 * @description ミニ5路 囲碁対局ページ（SVG碁盤・指導碁/フリー対局完全対応版）
 */
import React, { useState, useEffect, useRef } from 'react';
import type { MetaFunction } from "@remix-run/react";
import { useNavigate } from "@remix-run/react";
import PageLayout from "../components/PageLayout";
import { supabase } from "../lib/supabaseClient";
import { Loader2, RotateCcw, Swords, GraduationCap } from "lucide-react";

// AI頭脳とフリー対局用コメントのインポート
import { calculateAiMove } from "../lib/igoAlgorithm";
import { getRandomComment } from "../data/igoFreeComments";

export const meta: MetaFunction = () => {
  return [
    { title: "ミニ5路 囲碁 | JPTutor AI Yamato" },
    { name: "description", content: "Enjoy 5x5 Go teaching games and free matches with AI Yamato-sensei." },
  ];
};

// ミニ5路囲碁のゲームコンポーネント
function IgoBoard({ userId, credits }: { userId: string | null; credits: number | null }) {
  const SIZE = 5;
  // 0: 空, 1: 黒 (ユーザー), 2: 白 (AIやまと)
  const [board, setBoard] = useState<number[][]>(
    Array(SIZE).fill(null).map(() => Array(SIZE).fill(0))
  );
  const [turn, setTurn] = useState<number>(1); // 1: ユーザーの番, 2: AIの番
  const [message, setMessage] = useState<string>('あなたの番です（黒・先手）。碁盤の交点をクリックしてください。');
  
  // モード切替ステート: 'teaching'（指導碁） または 'free'（フリー対局）
  const [gameMode, setGameMode] = useState<'teaching' | 'free'>('teaching');

  // AI思考中・コメント表示用のステート
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [chatLog, setChatLog] = useState<Array<{ sender: 'user' | 'yamato'; text: string }>>([
    { sender: 'yamato', text: "こんにちは！やまと先生です。今日はどのモードで対局しますか？（指導碁でじっくり学ぶか、フリー対局で腕試しをしましょう！）" }
  ]);

  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatLog, isAiThinking]);

  const handleIntersectionClick = async (row: number, col: number) => {
    // ユーザーの番以外、すでに石がある場所、またはAI思考中なら何もしない
    if (turn !== 1 || board[row][col] !== 0 || isAiThinking) return;

    // 1. ユーザーの石を配置
    const newBoard = board.map((r, rIdx) =>
      r.map((cell, cIdx) => (rIdx === row && cIdx === col ? 1 : cell))
    );

    setBoard(newBoard);
    setTurn(2);
    setMessage('やまと先生が考えています...');
    setIsAiThinking(true);

    const moveStr = `(${row + 1}, ${col + 1})`;
    const updatedChat = [...chatLog, { sender: 'user' as const, text: `(${row + 1}, ${col + 1}) に黒石を置きました。` }];
    setChatLog(updatedChat);

    try {
      let aiComment = "";
      const aiMove = calculateAiMove(newBoard, 2);

      if (aiMove) {
        const [aiRow, aiCol] = aiMove;
        newBoard[aiRow][aiCol] = 2; // 白石配置

        if (gameMode === 'teaching') {
          // 🥋 【指導碁モード】サーバーAPI（LLM）を呼び出して詳細な指導コメントを取得
          const response = await fetch('/api/igo-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userMove: moveStr,
              aiMove: `(${aiRow + 1}, ${aiCol + 1})`,
              boardState: JSON.stringify(newBoard),
              userId: userId
            })
          });

          if (response.ok) {
            const data = await response.json() as any;
            aiComment = data.commentary || "お見事な一手ですね。布石の形を意識していきましょう！";
          } else {
            aiComment = "良い着眼点ですね。周囲の石のつながりに注意してみましょう。";
          }
        } else {
          // ⚔️ 【フリー対局モード】高速アルゴリズム ＋ igoFreeComments からランダムコメントを取得
          const commentObj = getRandomComment('afterMove');
          aiComment = `[白: (${aiRow + 1}, ${aiCol + 1})] ${commentObj.jp} (${commentObj.en})`;
        }
      } else {
        aiComment = "盤面が埋まりました！終局です。お疲れ様でした。";
      }

      setBoard([...newBoard]);
      setChatLog([...updatedChat, { sender: 'yamato', text: aiComment }]);
      setTurn(1);
      setMessage('あなたの番です（黒）。');
    } catch (err) {
      console.error("AI move error:", err);
      setChatLog([...updatedChat, { sender: 'yamato', text: "やまと先生：集中力が素晴らしいですね。次の手をどうぞ！" }]);
      setTurn(1);
      setMessage('あなたの番です（黒）。');
    } finally {
      setIsAiThinking(false);
    }
  };

  const resetGame = () => {
    setBoard(Array(SIZE).fill(null).map(() => Array(SIZE).fill(0)));
    setTurn(1);
    setMessage('ゲームがリセットされました。あなたの番です（黒）。');
    setChatLog([{ sender: 'yamato', text: `新しい対局（${gameMode === 'teaching' ? '指導碁モード' : 'フリー対局モード'}）を開始します！最初の1手をどうぞ。` }]);
  };

  return (
    <div className="space-y-6">
      {/* モード切り替えタブ */}
      <div className="flex justify-center space-x-3 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl max-w-md mx-auto">
        <button
          onClick={() => { setGameMode('teaching'); resetGame(); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
            gameMode === 'teaching'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>指導碁モード (Teaching)</span>
        </button>
        <button
          onClick={() => { setGameMode('free'); resetGame(); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
            gameMode === 'free'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Swords className="w-4 h-4" />
          <span>AIフリー対局 (Free Match)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* SVG碁盤セクション */}
        <div className="flex flex-col items-center">
          <div className="flex items-center space-x-2 mb-2">
            <h2 className="text-xl font-bold">ミニ5路 囲碁（5x5 Go Board）</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold">
              {gameMode === 'teaching' ? '🥋 指導対局' : '⚔️ 真剣勝負'}
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 font-medium text-center">{message}</p>
          
          {/* 絶対にズレないSVG碁盤 */}
          <div className="relative bg-[#e6c280] p-6 rounded-2xl shadow-xl w-72 h-72 flex items-center justify-center mb-6 border-4 border-amber-800/40">
            <svg viewBox="0 0 100 100" className="w-full h-full cursor-pointer">
              {/* 碁盤の罫線（0, 25, 50, 75, 100 の正確な位置） */}
              {[0, 25, 50, 75, 100].map((pos) => (
                <React.Fragment key={pos}>
                  <line x1={pos} y1="0" x2={pos} y2="100" stroke="#78350f" strokeWidth="1.5" />
                  <line x1="0" y1={pos} x2="100" y2={pos} stroke="#78350f" strokeWidth="1.5" />
                </React.Fragment>
              ))}

              {/* 星（天元 [2,2] => 50, 50） */}
              <circle cx="50" cy="50" r="2.5" fill="#78350f" />

              {/* 交点ごとのクリック判定エリアと石の描画 */}
              {board.map((row, rIdx) =>
                row.map((cell, cIdx) => {
                  const cx = cIdx * 25;
                  const cy = rIdx * 25;
                  return (
                    <g key={`${rIdx}-${cIdx}`} onClick={() => handleIntersectionClick(rIdx, cIdx)}>
                      {/* クリックしやすい広めの透明ヒットエリア */}
                      <circle cx={cx} cy={cy} r="10" fill="transparent" className="hover:fill-amber-950/20 transition-colors" />

                      {/* 空きマスのホバーガイド */}
                      {cell === 0 && (
                        <circle cx={cx} cy={cy} r="3" fill="transparent" className="hover:fill-amber-950/40" />
                      )}

                      {/* 黒石（プレイヤー） */}
                      {cell === 1 && (
                        <circle cx={cx} cy={cy} r="10" fill="#000000" className="shadow-md" />
                      )}

                      {/* 白石（やまと先生） */}
                      {cell === 2 && (
                        <circle cx={cx} cy={cy} r="10" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" className="shadow-md" />
                      )}
                    </g>
                  );
                })
              )}
            </svg>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={resetGame}
              className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold transition-all shadow-sm flex items-center space-x-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>リセット (Reset)</span>
            </button>
          </div>
        </div>

        {/* チャットセクション */}
        <div className="flex flex-col h-[420px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center space-x-2 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xl">🥋</span>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">やまと先生 (Igo Yamato-sensei)</h3>
              <p className="text-[11px] text-slate-500">
                {gameMode === 'teaching' ? 'ソクラテス式・指導碁コーチング中' : 'AIフリー対局・対局実況中'}
              </p>
            </div>
          </div>

          <div ref={chatScrollRef} className="flex-grow overflow-y-auto space-y-3 pr-2 scroll-smooth">
            {chatLog.map((chat, idx) => (
              <div key={idx} className={`flex ${chat.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed shadow-xs ${
                  chat.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-xs'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-xs'
                }`}>
                  {chat.text}
                </div>
              </div>
            ))}

            {isAiThinking && (
              <div className="flex justify-start">
                <div className="p-3 rounded-2xl rounded-bl-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 flex items-center space-x-2 text-xs shadow-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="italic">やまと先生が検討しています...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IgoRoute() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  const [userCredits, setUserCredits] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchUserCredits(userId: string) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("credits")
          .eq("id", userId)
          .single();
        if (!error && data && isMounted) {
          setUserCredits(data.credits);
        }
      } catch (err) {
        console.error("Error fetching user credits:", err);
      }
    }

    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          setUser(session.user);
          await fetchUserCredits(session.user.id);
        }
      } catch (err) {
        console.error("Session check error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchUserCredits(session.user.id);
      } else {
        setUser(null);
        setUserCredits(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#f4f1ea] font-sans">
        <h3 className="text-xl font-semibold text-slate-700 animate-pulse">
          Loading 5x5 Go Board... ♟️
        </h3>
      </div>
    );
  }

  return (
    <PageLayout>
      <div className="min-h-screen bg-[#f4f1ea] dark:bg-slate-950 pb-16">
        <main className="max-w-4xl mx-auto px-4 pt-8">
          {userCredits !== null && (
            <div className="mb-4 flex justify-end">
              <span className="text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 px-3 py-1.5 rounded-full font-bold shadow-xs flex items-center space-x-1.5">
                <span>💎 Credits:</span>
                <span>{userCredits}</span>
              </span>
            </div>
          )}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800">
            <IgoBoard userId={user?.id} credits={userCredits} />
          </div>
        </main>
      </div>
    </PageLayout>
  );
}