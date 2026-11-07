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

// Character Data Sets by Stage
const KANA_DATA_SETS = {
  1: [ // Beginner: A-row, Ka-row
    { kana: 'あ', romaji: 'a', correct: true },
    { kana: 'い', romaji: 'i', correct: true },
    { kana: 'う', romaji: 'u', correct: true },
    { kana: 'え', romaji: 'e', correct: true },
    { kana: 'お', romaji: 'o', correct: true },
    { kana: 'か', romaji: 'ka', correct: true },
    { kana: 'き', romaji: 'ki', correct: true },
    { kana: 'あ', romaji: 'o', correct: false }, // Trick
    { kana: 'い', romaji: 'a', correct: false }
  ],
  2: [ // Intermediate: Sa-row, Ta-row, Na-row
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
  3: [ // Advanced: Ha-row, Ma-row, Ra-row, Dakuten
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

const TYPING_WORDS = [
  { word: 'yamato', hint: 'やまと (Yamato)' },
  { word: 'nihon', hint: 'にほん (Japan)' },
  { word: 'arigatou', hint: 'ありがとう (Thank you)' },
  { word: 'sakura', hint: 'さくら (Cherry blossom)' },
  { word: 'kore ga', hint: 'これがいちばん (This is the best)' }
];

interface RingNode {
  x: number;
  y: number;
  radius: number;
  vx: number;
  floorIndex: number; // 0: 最下段, 1: 2段目, 2: 3段目, 3: 4段目(最上段の下)
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
      alert('✨ Authentication successful! The game has been temporarily unlocked.');
    } else {
      alert('❌ Incorrect passcode.');
    }
  };

  return (
    <ToolPageWrapper layoutRef={layoutRef} breadcrumbTitle="Rolling Character">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <header className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <h1 className="text-xl font-bold text-slate-800">🏔️ Rolling Kana ~Climb the Mountain with AI Yamato!~</h1>
          <p className="text-xs text-slate-500 mt-0.5">Japanese Character Learning Retro Arcade Game</p>
        </header>

        {isAccessible ? (
          <RollingCharacterArena />
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-6 shadow-sm">
            <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner">
              🔒
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">This area is currently locked</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Complete the lessons or enter the passcode provided by your teacher.
              </p>
            </div>

            <form onSubmit={handlePasscodeSubmit} className="flex gap-2 max-w-xs mx-auto">
              <input
                type="text"
                maxLength={4}
                placeholder="4-digit code"
                value={inputPasscode}
                onChange={(e) => setInputPasscode(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-center text-lg font-mono tracking-widest w-full text-slate-900 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 font-bold px-4 py-2 rounded-lg text-white text-sm cursor-pointer shadow-sm transition"
              >
                Unlock
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

  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'TYPING' | 'GAMEOVER' | 'VICTORY'>('START');
  const [score, setScore] = useState(0);
  const [stage, setStage] = useState(1);
  const [lives, setLives] = useState(3);
  const [yamatoSpeech, setYamatoSpeech] = useState('Welcome! Climb to the top treasure chest and type the secret word to win!');
  
  // Typing Challenge State
  const [targetWordObj, setTargetWordObj] = useState(TYPING_WORDS[0]);
  const [typedIndex, setTypedIndex] = useState(0);

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

    let audioCtx: AudioContext | null = null;
    const initAudio = () => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };

    const playSound = (type: 'jump' | 'correct' | 'damage' | 'victory' | 'type') => {
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
        } else if (type === 'correct' || type === 'type') {
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

    const keys = { left: false, right: false, up: false, down: false, space: false };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current === 'TYPING') {
        e.preventDefault();
        const expectedChar = targetWordObj.word[typedIndex];
        if (e.key.toLowerCase() === expectedChar.toLowerCase()) {
          playSound('type');
          const nextIdx = typedIndex + 1;
          setTypedIndex(nextIdx);
          if (nextIdx >= targetWordObj.word.length) {
            setGameState('VICTORY');
            playSound('victory');
            setYamatoSpeech('Fantastic! You opened the treasure chest and completed the typing challenge!');
          }
        }
        return;
      }

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

    // 各段の定義
    const platforms = [
      { x1: 50, y1: 520, x2: 750, y2: 500, direction: 1, isGoal: false },  // 最下段（右向き）
      { x1: 50, y1: 410, x2: 750, y2: 430, direction: -1, isGoal: false }, // 2段目（左向き）
      { x1: 50, y1: 300, x2: 750, y2: 280, direction: 1, isGoal: false },  // 3段目（右向き）
      { x1: 50, y1: 190, x2: 750, y2: 210, direction: -1, isGoal: false }, // 4段目（1段目・左向き）
      { x1: 250, y1: 90, x2: 550, y2: 90, direction: 0, isGoal: true }     // 最上段（フラットなゴールエリア）
    ];

    const ladders = [
      { x: 680, y: 410, h: 110 },
      { x: 120, y: 300, h: 110 },
      { x: 680, y: 190, h: 110 },
      { x: 400, y: 90, h: 100 }
    ];

    let player = {
      x: 100,
      y: 480,
      w: 24,
      h: 36,
      vx: 0,
      vy: 0,
      speed: 3.5,
      jumpPower: -10.5,
      gravity: 0.5,
      isGrounded: false,
      isOnLadder: false,
      facing: 1
    };

    let rings: RingNode[] = [];
    let spawnTimer = 0;
    let invincibilityTimer = 0;
    let spacePressedLastFrame = false;

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
      setTypedIndex(0);
      const randomWord = TYPING_WORDS[Math.floor(Math.random() * TYPING_WORDS.length)];
      setTargetWordObj(randomWord);
      setGameState('PLAYING');
      setYamatoSpeech(`Stage ${st} Start! Climb to the top and open the treasure chest!`);
    };

    let animationFrameId: number;

    const update = () => {
      if (gameStateRef.current !== 'PLAYING') return;

      if (invincibilityTimer > 0) invincibilityTimer--;

      // Ladder detection
      let touchingLadder = false;
      for (let l of ladders) {
        if (player.x + player.w/2 >= l.x - 12 && player.x + player.w/2 <= l.x + 12 &&
            player.y + player.h >= l.y && player.y <= l.y + l.h) {
          touchingLadder = true;
          break;
        }
      }
      player.isOnLadder = touchingLadder;

      // Movement
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

      // Platform collisions for player
      player.isGrounded = false;
      for (let p of platforms) {
        if (p.isGoal) {
          if (player.x + player.w > p.x1 && player.x < p.x2 && player.y + player.h >= p.y1 - 6 && player.y + player.h <= p.y1 + 14 && player.vy >= 0) {
            player.y = p.y1 - player.h;
            player.vy = 0;
            player.isGrounded = true;
          }
        } else {
          let minX = Math.min(p.x1, p.x2);
          let maxX = Math.max(p.x1, p.x2);
          if (player.x + player.w > minX && player.x < maxX) {
            let t = (player.x + player.w/2 - p.x1) / (p.x2 - p.x1);
            let surfaceY = p.y1 + t * (p.y2 - p.y1);
            if (player.vy >= 0 && player.y + player.h >= surfaceY - 6 && player.y + player.h <= surfaceY + 14) {
              player.y = surfaceY - player.h;
              player.vy = 0;
              player.isGrounded = true;
            }
          }
        }
      }

      // Goal detection
      let goalP = platforms[4];
      if (player.y + player.h <= goalP.y1 + 10 &&
          player.x >= goalP.x1 + 40 && player.x + player.w <= goalP.x2 - 40) {
        setGameState('TYPING');
        setTypedIndex(0);
        playSound('victory');
        setYamatoSpeech(`Treasure chest opened! Type "${targetWordObj.hint}" correctly to win!`);
        return;
      }

      // Spawn rings at 2段目の右側 (floorIndex = 1 の右端)
      spawnTimer++;
      let currentStage = stageRef.current;
      let spawnInterval = Math.max(90 - (currentStage * 15), 50);
      if (spawnTimer >= spawnInterval) {
        spawnTimer = 0;
        const dataset = KANA_DATA_SETS[currentStage as keyof typeof KANA_DATA_SETS] || KANA_DATA_SETS[1];
        const data = dataset[Math.floor(Math.random() * dataset.length)];
        
        rings.push({
          x: 720,
          y: platforms[1].y2 - 25,
          radius: 22,
          vx: -2.0,
          floorIndex: 1,
          rotation: 0,
          vRot: -0.1,
          data: data
        });
      }

      // Ring physics and floor-to-floor continuation
      for (let i = rings.length - 1; i >= 0; i--) {
        let r = rings[i];
        let p = platforms[r.floorIndex];

        r.x += r.vx;
        r.rotation += r.vRot;

        let surfaceY = p.y1;
        if (!p.isGoal) {
          let t = (r.x - p.x1) / (p.x2 - p.x1);
          surfaceY = p.y1 + t * (p.y2 - p.y1);
        }
        r.y = surfaceY - r.radius;

        let minX = 50;
        let maxX = 750;

        // 画面外へ達したら次の下の段へスライドイン（directionがundefinedの場合は1をフォールバック）
        if (r.x > maxX && r.vx > 0) {
          if (r.floorIndex > 0) {
            r.floorIndex--;
            let nextP = platforms[r.floorIndex];
            r.x = nextP.x1 + 10;
            const nextDir = nextP.direction ?? 1;
            r.vx = nextDir > 0 ? 2.0 : -2.0;
          } else {
            rings.splice(i, 1);
            continue;
          }
        } else if (r.x < minX && r.vx < 0) {
          if (r.floorIndex > 0) {
            r.floorIndex--;
            let nextP = platforms[r.floorIndex];
            r.x = nextP.x2 - 10;
            const nextDir = nextP.direction ?? 1;
            r.vx = nextDir > 0 ? 2.0 : -2.0;
          } else {
            rings.splice(i, 1);
            continue;
          }
        }

        if (r.y > 620 || r.y < 0) {
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
            setYamatoSpeech(`Correct! "${r.data.kana}" is "${r.data.romaji}"! (+100pt)`);
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
              setYamatoSpeech(`Oops! Incorrect. "${r.data.kana}" does not match that Romaji!`);
            }
          }
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background
      ctx.fillStyle = '#222233';
      ctx.fillRect(50, 50, 700, 500);

      // Draw Slanted Platforms
      platforms.forEach((p) => {
        ctx.strokeStyle = p.isGoal ? '#cc9900' : '#d9534f';
        ctx.lineWidth = 16;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x1, p.y1);
        ctx.lineTo(p.x2, p.y2);
        ctx.stroke();

        ctx.fillStyle = '#fff';
        for (let t = 0.1; t < 0.9; t += 0.2) {
          let rx = p.x1 + t * (p.x2 - p.x1);
          let ry = p.y1 + t * (p.y2 - p.y1);
          ctx.fillRect(rx - 2, ry - 2, 4, 4);
        }
      });

      // Ladders
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

      // Treasure Chest on Top Platform
      let gp = platforms[4];
      ctx.fillStyle = '#854d0e';
      ctx.fillRect((gp.x1 + gp.x2)/2 - 20, gp.y1 - 28, 40, 24);
      ctx.fillStyle = '#facc15';
      ctx.fillRect((gp.x1 + gp.x2)/2 - 6, gp.y1 - 20, 12, 10);

      // Rings
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
        ctx.arc(0, 0, r.radius - 7, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.strokeStyle = '#ff7700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-(r.radius - 7), 0);
        ctx.lineTo(r.radius - 7, 0);
        ctx.moveTo(0, -(r.radius - 7));
        ctx.lineTo(0, r.radius - 7);
        ctx.stroke();

        ctx.restore();

        ctx.fillStyle = '#111122';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(r.data.kana, r.x, r.y + 1);

        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(r.data.romaji, r.x, r.y - r.radius - 8);
      });

      // Player
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
        <span className="text-indigo-600 font-bold">Stage: {stage} / 3</span>
        <span className="text-emerald-600 font-bold">Score: {score} pt</span>
      </div>

      {/* Game Field */}
      <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl h-[600px] relative overflow-hidden flex items-center justify-center p-2 shadow-inner">
        <canvas ref={canvasRef} width={800} height={600} className="block bg-gradient-to-b from-[#0f0f1a] to-[#232336] rounded-lg shadow-lg" />

        {/* Start Screen */}
        {gameState === 'START' && (
          <div className="absolute inset-0 bg-[#0a0a0f]/95 flex flex-col items-center justify-center space-y-4 z-30 p-6 text-center">
            <h1 className="text-3xl font-black text-[#ffcc00]">Rolling Kana</h1>
            <p className="text-sm text-[#ccc] max-w-md leading-relaxed">
              ~ Climb the Character Mountain with AI Yamato! ~<br /><br />
              Rings roll smoothly across wide slopes and drop down to lower floors!<br />
              Reach the treasure chest at the top flat goal and type the secret word to win!<br />
              Climb the ladders (↑ key) to reach the top!
            </p>
            <button
              onClick={() => (window as any).__startRollingGame(1)}
              className="bg-[#ff5500] hover:bg-[#ff7733] text-white font-bold px-8 py-3 rounded-xl text-lg shadow-lg cursor-pointer transition"
            >
              Start Game
            </button>
            <div className="text-xs text-[#888] pt-2 border-t border-slate-700 w-full max-w-xs">
              [← / →] Move ｜ [↑ / ↓] Ladder ｜ [SPACE] Jump
            </div>
          </div>
        )}

        {/* Typing Challenge Screen */}
        {gameState === 'TYPING' && (
          <div className="absolute inset-0 bg-[#0a0a0f]/95 flex flex-col items-center justify-center space-y-4 z-30 p-6 text-center">
            <h2 className="text-2xl font-black text-[#ffcc00]">🎁 Treasure Chest Opened!</h2>
            <p className="text-sm text-[#ccc]">Type the following word correctly to complete your climb:</p>
            <div className="text-lg font-bold text-[#38bdf8]">{targetWordObj.hint}</div>
            <div className="text-3xl font-mono tracking-widest bg-slate-800 border border-slate-700 px-6 py-3 rounded-xl">
              <span className="text-emerald-400">{targetWordObj.word.slice(0, typedIndex)}</span>
              <span className="text-white underline">{targetWordObj.word.slice(typedIndex)}</span>
            </div>
            <div className="text-xs text-[#888]">Type using your keyboard!</div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 bg-[#0a0a0f]/95 flex flex-col items-center justify-center space-y-4 z-30 p-6 text-center">
            <h2 className="text-3xl font-black text-red-500">GAME OVER</h2>
            <p className="text-sm text-[#ccc]">Score: {score} pts. Try again!</p>
            <button
              onClick={() => (window as any).__startRollingGame(1)}
              className="bg-[#ff5500] hover:bg-[#ff7733] text-white font-bold px-8 py-3 rounded-xl text-base shadow-lg cursor-pointer transition"
            >
              Play Again
            </button>
          </div>
        )}

        {/* Victory Screen */}
        {gameState === 'VICTORY' && (
          <div className="absolute inset-0 bg-[#0a0a0f]/95 flex flex-col items-center justify-center space-y-4 z-30 p-6 text-center">
            <h2 className="text-3xl font-black text-[#ffcc00]">CONGRATULATIONS!</h2>
            <p className="text-sm text-[#ccc]">
              {stage < 3 ? `Stage ${stage} Cleared! Excellent typing & climbing!` : `All Stages Completed! Master of Japanese Kana! (Final Score: ${score} pts)`}
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
              {stage < 3 ? 'Proceed to Next Stage' : 'Play Again from Beginning'}
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