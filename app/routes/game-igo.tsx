import React, { useState, useEffect } from 'react';
import type { MetaFunction } from "@remix-run/react";
import { useNavigate } from "@remix-run/react";
import PageLayout from "../components/PageLayout";
import { createClient } from "@supabase/supabase-js";

export const meta: MetaFunction = () => {
  return [
    { title: "ミニ5路 囲碁 | JPTutor AI Yamato" },
    { name: "description", content: "Enjoy a mini 5x5 Go game directly in your browser." },
  ];
};

// Supabase クライアント初期化用
const SUPABASE_URL = typeof window !== "undefined" ? (window as any).ENV?.SUPABASE_URL || "" : "";
const SUPABASE_ANON_KEY = typeof window !== "undefined" ? (window as any).ENV?.SUPABASE_ANON_KEY || "" : "";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ミニ5路囲碁のゲームコンポーネント
function IgoBoard() {
  const SIZE = 5;
  // 0: 空, 1: 黒, 2: 白
  const [board, setBoard] = useState<number[][]>(
    Array(SIZE).fill(null).map(() => Array(SIZE).fill(0))
  );
  const [turn, setTurn] = useState<number>(1); // 1: 黒の番, 2: 白の番
  const [message, setMessage] = useState<string>('黒の番です');

  const handleIntersectionClick = (row: number, col: number) => {
    if (board[row][col] !== 0) return; // すでに石がある場所は置けない

    const newBoard = board.map((r, rIdx) =>
      r.map((cell, cIdx) => (rIdx === row && cIdx === col ? turn : cell))
    );

    setBoard(newBoard);

    if (turn === 1) {
      setTurn(2);
      setMessage('白の番です');
    } else {
      setTurn(1);
      setMessage('黒の番です');
    }
  };

  const resetGame = () => {
    setBoard(Array(SIZE).fill(null).map(() => Array(SIZE).fill(0)));
    setTurn(1);
    setMessage('黒の番です');
  };

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-xl font-bold mb-2">ミニ5路 囲碁</h2>
      <p className="text-gray-600 mb-4">{message}</p>
      
      {/* 囲碁盤の描画 */}
      <div className="relative bg-[#e6c280] p-6 rounded shadow-lg w-64 h-64 flex items-center justify-center mb-4">
        {/* グリッド線 */}
        <div className="absolute inset-6 grid grid-cols-4 grid-rows-4 pointer-events-none">
          {Array(16).fill(0).map((_, i) => (
            <div key={i} className="border border-amber-900"></div>
          ))}
        </div>

        {/* 交点（クリック判定と石の表示） */}
        <div className="absolute inset-4 grid grid-cols-5 grid-rows-5">
          {board.map((row, rIdx) =>
            row.map((cell, cIdx) => (
              <div
                key={`${rIdx}-${cIdx}`}
                onClick={() => handleIntersectionClick(rIdx, cIdx)}
                className="relative flex items-center justify-center cursor-pointer group"
              >
                {cell === 0 && (
                  <div className="w-3 h-3 rounded-full bg-transparent group-hover:bg-amber-900/30 transition-colors"></div>
                )}
                {cell === 1 && (
                  <div className="w-6 h-6 rounded-full bg-black shadow-md"></div>
                )}
                {cell === 2 && (
                  <div className="w-6 h-6 rounded-full bg-white border border-gray-400 shadow-md"></div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <button
        onClick={resetGame}
        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-medium transition-colors cursor-pointer"
      >
        リセット
      </button>
    </div>
  );
}

export default function IgoRoute() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  const [userCredits, setUserCredits] = useState<number | null>(null);

  // Supabase セッション監視とクレジット情報取得
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
        if (session?.user) {
          if (isMounted) {
            setUser(session.user);
            await fetchUserCredits(session.user.id);
          }
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
          Loading 5x5 Go... ♟️
        </h3>
      </div>
    );
  }

  return (
    <PageLayout>
      <div className="min-h-screen bg-[#f4f1ea] pb-16">
        <main className="max-w-xl mx-auto px-4 pt-8">
          {userCredits !== null && (
            <div className="mb-4 flex justify-end">
              <span className="text-sm bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-bold shadow-xs">
                💎 Credits: {userCredits}
              </span>
            </div>
          )}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <IgoBoard />
          </div>
        </main>
      </div>
    </PageLayout>
  );
}