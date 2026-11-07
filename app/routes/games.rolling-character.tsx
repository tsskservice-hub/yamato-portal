/**
 * @file games.rolling-character.tsx
 * @description Rolling Kana 〜AI Yamato & Character Mountain Climbing〜 (Retro Arcade Learning Game)
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useEffect, useRef, useState } from 'react';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import type { PageLayoutRef } from '~/components/layout/PageLayout';
import { generateModuleMeta } from '~/utils/seoMeta';
import { supabase } from '~/lib/supabaseClient';

// 文字データ（ステージ別）
const KANA_DATA_SETS = {
  1: [ // 初級：あ行、か行
    { kana: 'あ', romaji: 'a', correct: true },
    { kana: 'い', romaji: 'i', correct: true },
    { kana: 'う', romaji: 'u', correct: true },
    { kana: 'え', romaji: 'e', correct: true },
    { kana: 'お', romaji: 'o', correct: true },
    { kana: 'か', romaji: 'ka', correct: true },
    { kana: 'き', romaji: 'ki', correct: true },
    { kana: 'あ', romaji: 'o', correct: false }, // 引っかけ
    { kana: 'い', romaji: 'a', correct: false }
  ],
  2: [ // 中級：さ行、た行、な行
    { kana: 'さ', romaji: 'sa', correct: true },
    { kana: 'し', romaji: 'shi', correct: true },
    { kana: 'す', romaji: 'su', correct: true },
    { kana: 'た', romaji: 'ta', correct: true },
    { kana: 'ち', romaji: 'chi', correct: true },
    { kana: 'な', romaji: 'na', correct: true },
    { kana: 'に', romaji: 'ni', correct: true },
    { kana: 'し', romaji: 'su', correct: false },
    { kana: 'た', romaji: 'na', correct: false }
  ],
  3: [ // 上級：は行、ま行、ら行、濁音など
    { kana: 'は', romaji: 'ha', correct: true },
    { kana: 'ひ', romaji: 'hi', correct: true },
    { kana: 'ま', romaji: 'ma', correct: true },
    { kana: 'ら', romaji: 'ra', correct: true },
    { kana: 'が', romaji: 'ga', correct: true },
    { kana: 'ざ', romaji: 'za', correct: true },
    { kana: 'は', romaji: 'ma', correct: false },
    { kana: 'ら', romaji: 'ta', correct: false }
  ]
};

interface RingNode {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  dir: number;
  rotation: number;
  vRot: number;
  data: { kana: string; romaji: string; correct: boolean };
}

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

export default function RollingCharacterPage() {
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
      alert('✨ 認証に成功しました！ゲームが一時的にロック解除されました。');
    } else {
      alert('❌ パスコードが違います。');
    }
  };

  return (
    <ToolPageWrapper layoutRef={layoutRef} breadcrumbTitle="Rolling Character">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <header className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <h1 className="text-xl font-bold text-slate-800">🏔️ ローリング・カナ 〜AIヤマトと文字の山を登れ！〜</h1>
          <p className="text-xs text-slate-500 mt-0.5">日本語文字学習アクション・レトロアーケード風ゲーム</p>
        </header>

        {isAccessible ? (
          <RollingCharacterArena />
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-6 shadow-sm">
            <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner">
              🔒
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">このエリアは現在ロックされています</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                課題を完了するか、先生から提供されたパスコードを入力してください。
              </p>
            </div>

            <form onSubmit={handlePasscodeSubmit} className="flex gap-2 max-w-xs mx-auto">
              <input
                type="text"
                maxLength={4}
                placeholder="4桁のコード"
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

function RollingCharacterArena() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'>('START');
  const [score, setScore] = useState(0);
  const [stage, setStage] = useState(1);
  const [lives, setLives] = useState(3);
  const [yamatoSpeech, setYamatoSpeech] = useState('ようこそ！ハシゴを登って最上階のゴールを目指そう！正しいローマ字の輪を獲得してね！');

  // ゲームループ用のRef（再レンダリングをまたいで最新値を保持）
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const stageRef = useRef(stage);
  stageRef.current = stage;

  const scoreRef = useRef(score);
  scoreRef.current = score;

  const livesRef = useRef(lives);
  livesRef.current = lives;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 音声合成 (Web Audio API)
    let audioCtx: AudioContext | null = null;
    const initAudio = () => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };

    const playSound = (type: 'jump' | 'correct' | 'damage' | 'victory') => {
      if (!audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        const now = audioCtx.currentTime;

        if (type === 'jump') {
          osc.type = 'square';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(350, now + 0.15);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
        } else if (type === 'correct') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.setValueAtTime(880, now + 0.1);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
          osc.start(now);
          osc.stop(now + 0.25);
        } else if (type === 'damage') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(120, now);
          osc.frequency.linearRampToValueAtTime(60, now + 0.2);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
        } else if (type === 'victory') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, now);
          osc.frequency.setValueAtTime(659.25, now + 0.15);
          osc.frequency.setValueAtTime(783.99, now + 0.3);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
          osc.start(now);
          osc.stop(now + 0.6);
        }
      } catch (e) {}
    };

    // キー入力管理
    const keys = { left: false, right: false, up: false, down: false, space: false };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'w', 'a', 's', 'd'].includes(e.code) || e.key === ' ') {
        e.preventDefault();
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = true;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = true;
      if (e.code === 'Space' || e.key === ' ') keys.space = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = false;
      if (e.code === 'Space' || e.key === ' ') keys.space = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // ステージ構造
    const platforms = [
      { x: 50, y: 520, w: 700, h: 16 },
      { x: 100, y: 410, w: 600, h: 16 },
      { x: 50, y: 300, w: 700, h: 16 },
      { x: 100, y: 190, w: 600, h: 16 },
      { x: 250, y: 90, w: 300, h: 16 }
    ];

    const ladders = [
      { x: 650, y: 410, h: 110 },
      { x: 150, y: 300, h: 110 },
      { x: 650, y: 190, h: 110 },
      { x: 380, y: 90, h: 100 }
    ];

    let player = {
      x: 100,
      y: 480,
      w: 24,
      h: 36,
      vx: 0,
      vy: 0,
      speed: 3.5,
      jumpPower: -9.5,
      gravity: 0.45,
      isGrounded: false,
      isOnLadder: false,
      facing: 1
    };

    let rings: RingNode[] = [];
    let spawnTimer = 0;
    let invincibilityTimer = 0;
    let spacePressedLastFrame = false;

    // 外部からのゲームスタート用メソッドをWindowに紐づけまたはクロージャーで制御
    (window as any).__startRollingGame = (st = 1) => {
      initAudio();
      setStage(st);
      if (st === 1) setScore(0);
      setLives(3);
      rings = [];
      spawnTimer = 0;
      player.x = 100;
      player.y = 480;
      player.vx = 0;
      player.vy = 0;
      setGameState('PLAYING');
      setYamatoSpeech(`ステージ ${st} スタート！最上階のゴールを目指して登ろう！`);
    };

    let animationFrameId: number;

    const update = () => {
      if (gameStateRef.current !== 'PLAYING') return;

      if (invincibilityTimer > 0) invincibilityTimer--;

      // ハシゴ判定
      let touchingLadder = false;
      for (let l of ladders) {
        if (player.x + player.w/2 >= l.x - 12 && player.x + player.w/2 <= l.x + 12 &&
            player.y + player.h >= l.y && player.y <= l.y + l.h) {
          touchingLadder = true;
          break;
        }
      }
      player.isOnLadder = touchingLadder;

      // 移動
      player.vx = 0;
      if (keys.left) { player.vx = -player.speed; player.facing = -1; }
      if (keys.right) { player.vx = player.speed; player.facing = 1; }

      if (player.isOnLadder) {
        if (keys.up) { player.vy = -player.speed * 0.8; player.isGrounded = false; }
        else if (keys.down) { player.vy = player.speed * 0.8; player.isGrounded = false; }
        else { if (!player.isGrounded) player.vy = 0; }
      }

      let spacePressedNow = keys.space;
      if (spacePressedNow && !spacePressedLastFrame && player.isGrounded && !player.isOnLadder) {
        player.vy = player.jumpPower;
        player.isGrounded = false;
        playSound('jump');
      }
      spacePressedLastFrame = spacePressedNow;

      if (!player.isOnLadder || player.isGrounded) {
        player.vy += player.gravity;
      }

      player.x += player.vx;
      player.y += player.vy;

      if (player.x < 30) player.x = 30;
      if (player.x > 750) player.x = 750;

      // 足場との衝突
      player.isGrounded = false;
      for (let p of platforms) {
        if (player.vy >= 0 &&
            player.x + player.w > p.x && player.x < p.x + p.w &&
            player.y + player.h >= p.y && player.y + player.h <= p.y + p.h + 10) {
          player.y = p.y - player.h;
          player.vy = 0;
          player.isGrounded = true;
        }
      }

      // ゴール判定
      let goalP = platforms[4];
      if (player.y + player.h <= goalP.y + 10 &&
          player.x >= goalP.x && player.x + player.w <= goalP.x + goalP.w) {
        setGameState('VICTORY');
        playSound('victory');
        return;
      }

      // 輪の生成
      spawnTimer++;
      let currentStage = stageRef.current;
      let spawnInterval = Math.max(90 - (currentStage * 15), 50);
      if (spawnTimer >= spawnInterval) {
        spawnTimer = 0;
        const dataset = KANA_DATA_SETS[currentStage as keyof typeof KANA_DATA_SETS] || KANA_DATA_SETS[1];
        const data = dataset[Math.floor(Math.random() * dataset.length)];
        const startP = platforms[3];
        const startX = Math.random() > 0.5 ? startP.x + 30 : startP.x + startP.w - 30;
        const dir = startX < 400 ? 1 : -1;

        rings.push({
          x: startX,
          y: startP.y - 22,
          radius: 22,
          vx: dir * (2 + currentStage * 0.4),
          vy: 2,
          dir: dir,
          rotation: 0,
          vRot: dir * 0.08,
          data: data
        });
      }

      // 輪の更新と判定
      for (let i = rings.length - 1; i >= 0; i--) {
        let r = rings[i];
        r.x += r.vx;
        r.y += r.vy;
        r.rotation += r.vRot;

        for (let p of platforms) {
          if (r.x > p.x && r.x < p.x + p.w && Math.abs((r.y + r.radius) - p.y) < 6 && r.vy >= 0) {
            r.vy = 0;
            r.y = p.y - r.radius;
            if (r.dir === 1 && r.x >= p.x + p.w - 30) r.dir = -1;
            if (r.dir === -1 && r.x <= p.x + 30) r.dir = 1;
            r.vx = r.dir * (2 + currentStage * 0.5);
          }
        }

        if (r.y > 620 || r.x < -50 || r.x > 850) {
          rings.splice(i, 1);
          continue;
        }

        let distX = Math.abs(player.x + player.w/2 - r.x);
        let distY = Math.abs(player.y + player.h/2 - r.y);
        let hitDist = Math.sqrt(distX * distX + distY * distY);

        if (hitDist < r.radius + 14) {
          if (r.data.correct) {
            setScore((s) => {
              const newS = s + 100;
              scoreRef.current = newS;
              return newS;
            });
            playSound('correct');
            setYamatoSpeech(`正解！「${r.data.kana}」は「${r.data.romaji}」だね！ (+100pt)`);
            rings.splice(i, 1);
          } else {
            if (invincibilityTimer === 0) {
              setLives((l) => {
                const newL = l - 1;
                livesRef.current = newL;
                if (newL <= 0) {
                  setGameState('GAMEOVER');
                }
                return newL;
              });
              invincibilityTimer = 60;
              playSound('damage');
              setYamatoSpeech(`惜しい！それは間違い。「${r.data.kana}」のローマ字は違うよ！`);
            }
          }
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 背景
      ctx.fillStyle = '#222233';
      ctx.fillRect(50, 50, 700, 500);

      // プラットフォーム
      platforms.forEach((p, idx) => {
        ctx.fillStyle = idx === 4 ? '#cc9900' : '#d9534f';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = '#fff';
        for (let rx = p.x + 15; rx < p.x + p.w - 10; rx += 40) {
          ctx.fillRect(rx, p.y + 4, 4, 4);
        }
      });

      // ハシゴ
      ladders.forEach(l => {
        ctx.fillStyle = '#3399ff';
        let rw = 24;
        let sx = l.x - rw / 2;
        ctx.fillRect(sx, l.y, 4, l.h);
        ctx.fillRect(sx + rw - 4, l.y, 4, l.h);
        for (let hy = l.y + 6; hy < l.y + l.h; hy += 16) {
          ctx.fillRect(sx, hy, rw, 3);
        }
      });

      // ゴールアイコン
      let gp = platforms[4];
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.arc(gp.x + gp.w/2, gp.y - 20, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#111';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('AI', gp.x + gp.w/2, gp.y - 16);

      // 輪の描画
      rings.forEach(r => {
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(r.rotation);

        ctx.beginPath();
        ctx.arc(0, 0, r.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ff7700';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, r.radius - 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.save();
        ctx.rotate(-r.rotation);
        ctx.fillStyle = '#111122';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(r.data.kana, 0, 1);
        ctx.restore();

        ctx.restore();

        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(r.data.romaji, r.x, r.y - r.radius - 8);
      });

      // プレイヤー描画
      if (invincibilityTimer % 4 < 2) {
        ctx.fillStyle = '#00ffcc';
        ctx.fillRect(player.x, player.y, player.w, player.h);
        ctx.fillStyle = '#111';
        let eyeX = player.facing === 1 ? player.x + 15 : player.x + 5;
        ctx.fillRect(eyeX, player.y + 8, 4, 4);
      }
    };

    const loop = () => {
      update();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-6 shadow-xl text-slate-800">
      {/* Status Bar */}
      <div className="flex flex-wrap justify-between items-center bg-slate-100 p-4 rounded-xl border border-slate-200 text-sm shadow-inner gap-2">
        <span className="text-red-500 font-bold">❤️ HP: {'❤️'.repeat(lives)}</span>
        <span className="text-indigo-600 font-bold">ステージ: {stage} / 3</span>
        <span className="text-emerald-600 font-bold">スコア: {score} pt</span>
      </div>

      {/* Game Field */}
      <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl h-[600px] relative overflow-hidden flex items-center justify-center p-2 shadow-inner">
        <canvas ref={canvasRef} width={800} height={600} className="block bg-gradient-to-b from-[#0f0f1a] to-[#232336] rounded-lg shadow-lg" />

        {/* Start Screen */}
        {gameState === 'START' && (
          <div className="absolute inset-0 bg-[#0a0a0f]/95 flex flex-col items-center justify-center space-y-4 z-30 p-6 text-center">
            <h1 className="text-3xl font-black text-[#ffcc00]">ローリング・カナ</h1>
            <p className="text-sm text-[#ccc] max-w-md leading-relaxed">
              〜 AIヤマトと文字の山を登れ！ 〜<br /><br />
              上から転がってくる文字の輪をチェックしよう！<br />
              仮名とローマ字が**一致していれば獲得（ポイント）**、**違っていれば接触するとライフ減少**！<br />
              ハシゴ（↑キー）を登って最上階のAIヤマトの元へ急げ！
            </p>
            <button
              onClick={() => (window as any).__startRollingGame(1)}
              className="bg-[#ff5500] hover:bg-[#ff7733] text-white font-bold px-8 py-3 rounded-xl text-lg shadow-lg cursor-pointer transition"
            >
              ゲームスタート
            </button>
            <div className="text-xs text-[#888] pt-2 border-t border-slate-700 w-full max-w-xs">
              [← / →] 移動 ｜ [↑ / ↓] ハシゴ ｜ [SPACE] ジャンプ
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 bg-[#0a0a0f]/95 flex flex-col items-center justify-center space-y-4 z-30 p-6 text-center">
            <h2 className="text-3xl font-black text-red-500">GAME OVER</h2>
            <p className="text-sm text-[#ccc]">スコア: {score}点。しっかり文字とローマ字を確認しながら再挑戦しよう！</p>
            <button
              onClick={() => (window as any).__startRollingGame(1)}
              className="bg-[#ff5500] hover:bg-[#ff7733] text-white font-bold px-8 py-3 rounded-xl text-base shadow-lg cursor-pointer transition"
            >
              もう一度プレイ
            </button>
          </div>
        )}

        {/* Victory Screen */}
        {gameState === 'VICTORY' && (
          <div className="absolute inset-0 bg-[#0a0a0f]/95 flex flex-col items-center justify-center space-y-4 z-30 p-6 text-center">
            <h2 className="text-3xl font-black text-[#ffcc00]">STAGE CLEAR!</h2>
            <p className="text-sm text-[#ccc]">
              {stage < 3 ? `ステージ ${stage} クリア！おめでとう！` : `全ステージ完全クリア！おめでとう！ (最終スコア: ${score}点)`}
            </p>
            <button
              onClick={() => {
                if (stage < 3) {
                  (window as any).__startRollingGame(stage + 1);
                } else {
                  (window as any).__startRollingGame(1);
                }
              }}
              className="bg-[#ff5500] hover:bg-[#ff7733] text-white font-bold px-8 py-3 rounded-xl text-base shadow-lg cursor-pointer transition"
            >
              {stage < 3 ? '次のステージへ進む' : '最初からもう一度遊ぶ'}
            </button>
          </div>
        )}
      </div>

      {/* AI Dialogue Box */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 flex items-center gap-4 text-left shadow-inner">
        <div className="w-10 h-10 bg-[#ffcc00] text-slate-900 font-bold flex items-center justify-center rounded-full shrink-0 border-2 border-white shadow">
          Yamato
        </div>
        <div className="text-xs text-slate-700 font-medium leading-relaxed">
          {yamatoSpeech}
        </div>
      </div>
    </div>
  );
}