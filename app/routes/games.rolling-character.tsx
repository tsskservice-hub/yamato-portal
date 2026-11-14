/**
 * @file games.rolling-character.tsx
 * @description Rolling Kana 〜AI Yamato & Character Mountain Climbing〜 (Retro Arcade Learning Game)
 * Shortened version: same game, same data, same screens and rules.
 * Framework repair: the useLive helper and Overlay component added in the
 * first shortening pass are removed again; ref sync and the four screens
 * are written out exactly as in the supplied original file.
 * Main savings: kana tables as [kana, romaji] pairs (ring pools are derived
 * from them instead of duplicated), one sound table, one key handler,
 * and the duplicated ring drop-down logic merged into a single function.
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useEffect, useRef, useState } from 'react';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import type { PageLayoutRef } from '~/components/layout/PageLayout';
import { GameAccessGate } from '~/components/games/GameAccessGate';
import { generateModuleMeta } from '~/utils/seoMeta';
import { shuffle } from '~/utils/shuffle';
import { supabase } from '~/lib/supabaseClient';

// ---- Character data (one source of truth) ----
// Each stage: 10 [kana, romaji] pairs. Used both for the treasure-chest
// password (3 random kana) and, below, for the rolling rings.
type Kana = [string, string];
const STAGES: Kana[][] = [
  [['あ', 'a'], ['い', 'i'], ['う', 'u'], ['え', 'e'], ['お', 'o'], ['か', 'ka'], ['き', 'ki'], ['く', 'ku'], ['け', 'ke'], ['こ', 'ko']],
  [['さ', 'sa'], ['し', 'shi'], ['す', 'su'], ['せ', 'se'], ['そ', 'so'], ['た', 'ta'], ['ち', 'chi'], ['つ', 'tsu'], ['な', 'na'], ['に', 'ni']],
  [['は', 'ha'], ['ひ', 'hi'], ['ふ', 'fu'], ['ま', 'ma'], ['み', 'mi'], ['ら', 'ra'], ['り', 'ri'], ['が', 'ga'], ['ざ', 'za'], ['だ', 'da']],
];

// Rolling rings: which stage entries are shown as correct pairs, plus the
// wrong (mismatched) pairs. This reproduces the original ring pools exactly:
// stage 1: あ〜き correct + あ/o, い/a, う/e wrong; stage 2: さ・し・す・た・ち・な・に
// correct + し/su, た/na, な/shi wrong; stage 3: は・ひ・ま・ら・が・ざ correct
// + は/ma, ら/ta, が/da wrong.
const RING_OK = [[0, 1, 2, 3, 4, 5, 6], [0, 1, 2, 5, 6, 8, 9], [0, 1, 3, 5, 7, 8]];
const RING_BAD: Kana[][] = [
  [['あ', 'o'], ['い', 'a'], ['う', 'e']],
  [['し', 'su'], ['た', 'na'], ['な', 'shi']],
  [['は', 'ma'], ['ら', 'ta'], ['が', 'da']],
];
type RingData = [string, string, boolean];
const RINGS_DATA: RingData[][] = STAGES.map((s, i) => [
  ...RING_OK[i].map((j) => [...s[j], true] as RingData),
  ...RING_BAD[i].map(([k, r]) => [k, r, false] as RingData),
]);

interface RingNode {
  x: number; y: number; radius: number; vx: number;
  floorIndex: number; // 0: bottom, 1: 2nd, 2: 3rd, 3: top
  rotation: number; vRot: number; data: RingData;
}

export async function loader({ request }: LoaderFunctionArgs) {
  let portalContent = null;
  try {
    const { data } = await supabase.from('portal_settings').select('content').eq('key', 'PORTAL_CONTENT').single();
    portalContent = data?.content || null;
  } catch {}
  return json({ portalContent, currentPath: new URL(request.url).pathname });
}

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) =>
  generateModuleMeta(data?.portalContent || null, data?.currentPath || '');

export default function RollingCharacterPage() {
  const layoutRef = useRef<PageLayoutRef>(null);

  return (
    <ToolPageWrapper layoutRef={layoutRef} breadcrumbTitle="Rolling Character">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <header className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <h1 className="text-xl font-bold text-slate-800">🏔️ Rolling Kana ~Climb the Mountain with AI Yamato!~</h1>
          <p className="text-xs text-slate-500 mt-0.5">Japanese Character Learning Retro Arcade Game</p>
        </header>

        <GameAccessGate layoutRef={layoutRef}>{() => <RollingCharacterArena />}</GameAccessGate>
      </div>
    </ToolPageWrapper>
  );
}

// [waveform, pitch sequence, duration (s), volume]
type Sound = 'jump' | 'correct' | 'damage' | 'victory' | 'type';
const SOUNDS: Record<Sound, [OscillatorType, number[], number, number]> = {
  jump: ['square', [150, 350], 0.15, 0.1],
  correct: ['triangle', [440, 880], 0.25, 0.15],
  type: ['triangle', [440, 880], 0.25, 0.15],
  damage: ['sawtooth', [120, 60], 0.2, 0.2],
  victory: ['sine', [523.25, 659.25, 783.99], 0.6, 0.15],
};

// Platforms: [x1, y1, x2, y2, isGoal]. Ladders: [x, y, height].
const PLATS = [[50, 620, 750, 612, 0], [50, 490, 750, 498, 0], [50, 360, 750, 352, 0], [50, 230, 750, 238, 0], [250, 100, 550, 100, 1]];
const LADDERS = [[680, 490, 130], [120, 360, 130], [680, 230, 130], [400, 100, 130]];
const KEYMAP: Record<string, string> = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', Space: 'space',
};
function RollingCharacterArena() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'TYPING' | 'GAMEOVER' | 'VICTORY'>('START');
  const [score, setScore] = useState(0);
  const [stage, setStage] = useState(1);
  const [lives, setLives] = useState(3);
  const [yamatoSpeech, setYamatoSpeech] = useState('Welcome! Climb to the top treasure chest and input the 3 kana passwords to win!');
  const [targetKanaList, setTargetKanaList] = useState<Kana[]>([]);
  const [inputAnswers, setInputAnswers] = useState<string[]>(['', '', '']);

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const stageRef = useRef(stage);
  stageRef.current = stage;
  const playSoundRef = useRef<((type: Sound) => void) | null>(null);

  const generateRandomKanaProblem = (st: number) =>
    shuffle(STAGES[st - 1] || STAGES[0]).slice(0, 3);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let audioCtx: AudioContext | null = null;
    const playSound = (type: Sound) => {
      if (!audioCtx) return;
      try {
        const [oscType, freqs, dur, vol] = SOUNDS[type];
        const osc = audioCtx.createOscillator(), gain = audioCtx.createGain(), now = audioCtx.currentTime;
        osc.type = oscType;
        osc.connect(gain); gain.connect(audioCtx.destination);
        freqs.forEach((f, i) => osc.frequency.setValueAtTime(f, now + i * 0.15));
        gain.gain.setValueAtTime(vol, now);
        gain.gain.linearRampToValueAtTime(0.01, now + dur);
        osc.start(now); osc.stop(now + dur);
      } catch {}
    };
    playSoundRef.current = playSound;

    const keys: Record<string, boolean> = { left: false, right: false, up: false, down: false, space: false };
    const clearKeys = () => {
      keys.left = keys.right = keys.up = keys.down = keys.space = false;
    };
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      const k = KEYMAP[e.code] || (e.key === ' ' ? 'space' : undefined);
      if (!k) return;
      // Key releases must always clear the key, even while the treasure-
      // chest typing screen is up. Ignoring a keyup leaves that key stuck,
      // so the player keeps climbing (or walking) on their own afterwards.
      // Only key presses are ignored while typing.
      if (down && gameStateRef.current === 'TYPING') return;
      e.preventDefault();
      keys[k] = down;
    };
    const handleKeyDown = onKey(true), handleKeyUp = onKey(false);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    // Releasing a key while the window is not focused never fires keyup,
    // so clear every key on blur as well.
    window.addEventListener('blur', clearKeys);

    const player = {
      x: 100, y: 598, w: 24, h: 18, vx: 0, vy: 0, speed: 3.5,
      jumpPower: -9.5, gravity: 0.5, isGrounded: false, isOnLadder: false, facing: 1,
    };
    let rings: RingNode[] = [];
    let spawnTimer = 0, invincibilityTimer = 0, spacePressedLastFrame = false;

    (window as any).__startRollingGame = (st = 1) => {
      if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setStage(st);
      if (st === 1) setScore(0);
      setLives(3);
      rings = []; spawnTimer = 0;
      Object.assign(player, { x: 100, y: 598, vx: 0, vy: 0 });
      setTargetKanaList(generateRandomKanaProblem(st));
      setInputAnswers(['', '', '']);
      setGameState('PLAYING');
      setYamatoSpeech(`Stage ${st} Start! Climb to the top and input the 3 kana passwords!`);
    };

    let animationFrameId: number;
    const update = () => {
      if (gameStateRef.current !== 'PLAYING') return;
      if (invincibilityTimer > 0) invincibilityTimer--;

      const prevBottom = player.y + player.h;
      const spacePressedNow = keys.space;
      const wantingToJump = spacePressedNow && !spacePressedLastFrame && player.isGrounded;
      const touchedLadder = LADDERS.find(([x, y, h]) =>
        player.x + player.w / 2 >= x - 12 && player.x + player.w / 2 <= x + 12 &&
        player.y + player.h >= y && player.y <= y + h);
      // A ladder only takes over the vertical speed when the player is
      // already on it or presses up/down to grab it. Otherwise a jump
      // or a fall that merely passes the ladder's x-range would be
      // cancelled mid-air and the player would hang on the ladder.
      const wasOnLadder = player.isOnLadder;
      player.isOnLadder = !wantingToJump && !!touchedLadder &&
        (wasOnLadder || keys.up || keys.down);
      // The surface of the floor at the top of the touched ladder.
      // Floors are sloped, so this is the ladder's top y plus the slope
      // at the ladder's x, not the raw top y.
      const ladderTop = touchedLadder ? touchedLadder[1] : null;
      const ladderTopSurface = (() => {
        if (!touchedLadder || ladderTop === null) return null;
        const topPlat = PLATS.find(([, y1]) => Math.abs(y1 - ladderTop) <= 8);
        if (!topPlat) return ladderTop;
        return topPlat[1] + ((touchedLadder[0] - 50) / 700) * (topPlat[3] - topPlat[1]);
      })();
      // Standing on the floor at the top of a ladder: there is nowhere
      // further up to climb, so holding up must not start another climb.
      const atLadderTop = player.isOnLadder && player.isGrounded && ladderTopSurface !== null &&
        Math.abs(player.y + player.h - ladderTopSurface) <= 4;

      player.vx = 0;
      if (keys.left) { player.vx = -player.speed; player.facing = -1; }
      if (keys.right) { player.vx = player.speed; player.facing = 1; }
      if (player.isOnLadder) {
        if (atLadderTop && keys.up && !keys.down) {
          player.vy = 0;
        } else {
          player.vy = keys.up ? -player.speed * 0.8 : keys.down ? player.speed * 0.8 : 0;
          if (keys.up || keys.down) player.isGrounded = false;
        }
      }

      if (wantingToJump && !player.isOnLadder) {
        player.vy = player.jumpPower; player.isGrounded = false; playSound('jump');
      }
      spacePressedLastFrame = spacePressedNow;
      // On a ladder the player hangs in place unless climbing or
      // descending; gravity must not pull them down a little each frame
      // and then snap them back onto the floor.
      if (!player.isOnLadder) player.vy += player.gravity;
      player.x += player.vx; player.y += player.vy;
      player.x = Math.max(30, Math.min(750, player.x));

      // Platform collisions
      player.isGrounded = false;
      for (const [x1, y1, x2, y2, isGoal] of PLATS) {
        if (isGoal) {
          if (player.x + player.w > x1 && player.x < x2 && player.y + player.h >= y1 - 4 && player.y + player.h <= y1 + 10 && player.vy >= 0) {
            player.y = y1 - player.h; player.vy = 0; player.isGrounded = true;
          }
        } else {
          const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
          if (player.x + player.w > minX && player.x < maxX) {
            const t = (player.x + player.w / 2 - x1) / (x2 - x1);
            const surfaceY = y1 + t * (y2 - y1);
            // Climbing a ladder onto a floor: the feet crossed the surface
            // from below, so snap onto it instead of climbing past it.
            // Only the floor at the top of the ladder being climbed counts:
            // without this, the snap also fires for the floor the player is
            // already standing on (its surface is a fraction of a pixel
            // below the previous foot position on a slope), cancelling the
            // climb as soon as it starts.
            if (player.isOnLadder && player.vy < 0 && prevBottom > surfaceY && player.y + player.h <= surfaceY + 4 &&
              ladderTopSurface !== null && Math.abs(surfaceY - ladderTopSurface) <= 4) {
              player.y = surfaceY - player.h; player.vy = 0; player.isGrounded = true;
            } else if (player.vy < 0 && player.y <= surfaceY + 16 && player.y >= surfaceY && player.y + player.h > surfaceY) {
              player.y = surfaceY; player.vy = 0;
            } else if (player.vy >= 0 && prevBottom <= surfaceY + 4 && player.y + player.h >= surfaceY - 4 && player.y + player.h <= surfaceY + 12 &&
              !(keys.down && player.isOnLadder && ladderTopSurface !== null && Math.abs(surfaceY - ladderTopSurface) <= 4)) {
              // Land only when falling onto the floor from above. While
              // descending a ladder, the floor at the top of that ladder
              // is ignored, so the player can drop through it — but the
              // floor at the bottom of the ladder still catches them.
              player.y = surfaceY - player.h; player.vy = 0; player.isGrounded = true;
            }
          }
        }
      }

      // Reached the treasure chest -> typing challenge
      const [gx1, gy, gx2] = [PLATS[4][0], PLATS[4][1], PLATS[4][2]];
      if (player.y + player.h <= gy + 10 && player.x >= gx1 + 40 && player.x + player.w <= gx2 - 40) {
        setGameState('TYPING');
        setInputAnswers(['', '', '']);
        playSound('victory');
        setYamatoSpeech('Treasure chest reached! Input the correct romaji for each kana below!');
        return;
      }

      // Spawn a ring every ~2 seconds (120 frames) from the top floor, left side
      if (++spawnTimer >= 120) {
        spawnTimer = 0;
        const pool = RINGS_DATA[stageRef.current - 1] || RINGS_DATA[0];
        rings.push({
          x: 60, y: PLATS[3][1] - 25, radius: 22, vx: 2.0, floorIndex: 3,
          rotation: 0, vRot: 0.1, data: pool[Math.floor(Math.random() * pool.length)],
        });
      }

      // Rings roll along a floor, then zigzag down to the next floor
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        const [x1, y1, x2, y2] = PLATS[r.floorIndex];
        r.x += r.vx; r.rotation += r.vRot;
        r.y = y1 + ((r.x - x1) / (x2 - x1)) * (y2 - y1) - r.radius;

        const atEdge = (r.vx > 0 && r.x > 750) || (r.vx < 0 && r.x < 50);
        if (atEdge) {
          if (r.floorIndex > 0) {
            r.floorIndex--;
            // Floors 2 and 0 are entered from the right, the others from the left
            const fromRight = r.floorIndex === 2 || r.floorIndex === 0;
            r.x = fromRight ? 740 : 60; r.vx = fromRight ? -2.0 : 2.0; r.vRot = fromRight ? -0.1 : 0.1;
          } else { rings.splice(i, 1); continue; }
        }
        if (r.y > 720 || r.y < 0) { rings.splice(i, 1); continue; }

        const dist = Math.hypot(player.x + player.w / 2 - r.x, player.y + player.h / 2 - r.y);
        if (dist < r.radius + 14) {
          if (r.data[2]) {
            setScore((s) => s + 100);
            playSound('correct');
            setYamatoSpeech(`Correct! "${r.data[0]}" is "${r.data[1]}"! (+100pt)`);
            rings.splice(i, 1);
          } else if (invincibilityTimer === 0) {
            setLives((l) => {
              if (l - 1 <= 0) setGameState('GAMEOVER');
              return l - 1;
            });
            invincibilityTimer = 60;
            playSound('damage');
            setYamatoSpeech(`Oops! Incorrect. "${r.data[0]}" does not match that Romaji!`);
          }
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#222233';
      ctx.fillRect(50, 50, 700, 600);

      PLATS.forEach(([x1, y1, x2, y2, isGoal]) => {
        ctx.strokeStyle = isGoal ? '#cc9900' : '#d9534f';
        ctx.lineWidth = 16; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.fillStyle = '#fff';
        for (let t = 0.1; t < 0.9; t += 0.2) ctx.fillRect(x1 + t * (x2 - x1) - 2, y1 + t * (y2 - y1) - 2, 4, 4);
      });

      LADDERS.forEach(([x, y, h]) => {
        ctx.fillStyle = '#3399ff';
        ctx.fillRect(x - 12, y, 4, h); ctx.fillRect(x + 8, y, 4, h);
        for (let hy = y + 6; hy < y + h; hy += 16) ctx.fillRect(x - 12, hy, 24, 3);
      });

      const cx = (PLATS[4][0] + PLATS[4][2]) / 2, cy = PLATS[4][1];
      ctx.fillStyle = '#854d0e'; ctx.fillRect(cx - 20, cy - 28, 40, 24);
      ctx.fillStyle = '#facc15'; ctx.fillRect(cx - 6, cy - 20, 12, 10);

      rings.forEach((r) => {
        ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rotation);
        ctx.beginPath(); ctx.arc(0, 0, r.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ff7700'; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, r.radius - 7, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.strokeStyle = '#ff7700'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-(r.radius - 7), 0); ctx.lineTo(r.radius - 7, 0);
        ctx.moveTo(0, -(r.radius - 7)); ctx.lineTo(0, r.radius - 7);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#111122'; ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(r.data[0], r.x, r.y + 1);
        ctx.fillStyle = '#ffff00'; ctx.font = 'bold 18px monospace';
        ctx.fillText(r.data[1], r.x, r.y - r.radius - 10);
      });

      if (invincibilityTimer % 4 < 2) {
        ctx.fillStyle = '#00ffcc';
        ctx.fillRect(player.x, player.y, player.w, player.h);
        ctx.fillStyle = '#111';
        ctx.fillRect(player.facing === 1 ? player.x + 15 : player.x + 5, player.y + 5, 4, 3);
      }
    };

    const loop = () => { update(); draw(); animationFrameId = requestAnimationFrame(loop); };
    animationFrameId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearKeys);
    };
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allCorrect = targetKanaList.every(([, romaji], i) =>
      inputAnswers[i].trim().toLowerCase() === romaji.toLowerCase());
    if (allCorrect) {
      playSoundRef.current?.('victory');
      setGameState('VICTORY');
      setYamatoSpeech('Fantastic! All romaji answers are correct! You opened the treasure chest!');
    } else {
      playSoundRef.current?.('damage');
      setGameState('PLAYING');
      setInputAnswers(['', '', '']);
      setYamatoSpeech('Incorrect romaji! Back to the start!');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-6 shadow-xl text-slate-800">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl h-[700px] relative overflow-hidden flex items-center justify-center p-2 shadow-inner">
        {/* Status bar inside the game frame, at the top */}
        <div className="absolute top-2 left-2 right-2 z-20 flex flex-wrap justify-between items-center bg-black/50 rounded-lg px-4 py-2 text-sm gap-2">
          <span className="text-red-400 font-bold">❤️ HP: {'❤️'.repeat(lives)}</span>
          <span className="text-indigo-300 font-bold">Stage: {stage} / 3</span>
          <span className="text-emerald-300 font-bold">Score: {score} pt</span>
        </div>
        <canvas ref={canvasRef} width={800} height={700} className="block bg-gradient-to-b from-[#0f0f1a] to-[#232336] rounded-lg shadow-lg" />

        {gameState === 'START' && (
          <div className="absolute inset-0 bg-[#0a0a0f]/95 flex flex-col items-center justify-center space-y-4 z-30 p-6 text-center">
            <h1 className="text-3xl font-black text-[#ffcc00]">Rolling Kana</h1>
            <p className="text-sm text-[#ccc] max-w-md leading-relaxed">
              ~ Climb the Character Mountain with AI Yamato! ~<br /><br />
              Rings roll from the top-left every 2 seconds, zigzagging down to the bottom.<br />
              Open the treasure chest at the top by inputting the correct romaji for 3 random kana!<br />
              [← / →] Move ｜ [↑ / ↓] Ladders (Climb & Descend) ｜ [SPACE] Jump
            </p>
            <button onClick={() => (window as any).__startRollingGame(1)} className="bg-[#ff5500] hover:bg-[#ff7733] text-white font-bold px-8 py-3 rounded-xl text-lg shadow-lg cursor-pointer transition">Start Game</button>
            <div className="text-xs text-[#888] pt-2 border-t border-slate-700 w-full max-w-xs">[← / →] Move ｜ [↑ / ↓] Ladders ｜ [SPACE] Jump</div>
          </div>
        )}

        {gameState === 'TYPING' && (
          <div className="absolute inset-0 bg-[#0a0a0f]/95 flex flex-col items-center justify-center space-y-5 z-30 p-6 text-center">
            <h2 className="text-2xl font-black text-[#ffcc00]">🎁 You reached the treasure chest!</h2>
            <p className="text-sm text-[#ccc]">Type the romaji for each kana in the box under it.</p>
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div className="flex justify-center gap-6">
                {targetKanaList.map(([kana], idx) => (
                  <div key={idx} className="flex flex-col items-center bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-inner">
                    <span className="text-4xl font-bold text-white mb-3">{kana}</span>
                    <input
                      type="text" maxLength={4} autoFocus={idx === 0} value={inputAnswers[idx]}
                      onChange={(e) => { const a = [...inputAnswers]; a[idx] = e.target.value; setInputAnswers(a); }}
                      placeholder="romaji"
                      className="bg-slate-900 border-2 border-[#ffcc00] rounded-lg px-3 py-2 text-center text-xl font-mono tracking-widest text-white focus:outline-none focus:border-emerald-400 w-24"
                    />
                  </div>
                ))}
              </div>
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-3 rounded-xl text-base shadow-lg cursor-pointer transition">Check answers &amp; open the chest! (Enter)</button>
            </form>
            <div className="text-xs text-[#ff5555]">Careful: if even one answer is wrong, you go back to the start!</div>
          </div>
        )}

        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 bg-[#0a0a0f]/95 flex flex-col items-center justify-center space-y-4 z-30 p-6 text-center">
            <h2 className="text-3xl font-black text-red-500">GAME OVER</h2>
            <p className="text-sm text-[#ccc]">Score: {score} pts. Try again!</p>
            <button onClick={() => (window as any).__startRollingGame(1)} className="bg-[#ff5500] hover:bg-[#ff7733] text-white font-bold px-8 py-3 rounded-xl text-base shadow-lg cursor-pointer transition">Play Again</button>
          </div>
        )}

        {gameState === 'VICTORY' && (
          <div className="absolute inset-0 bg-[#0a0a0f]/95 flex flex-col items-center justify-center space-y-4 z-30 p-6 text-center">
            <h2 className="text-3xl font-black text-[#ffcc00]">CONGRATULATIONS!</h2>
            <p className="text-sm text-[#ccc]">
              {stage < 3 ? `Stage ${stage} Cleared! Excellent kana typing & climbing!` : `All Stages Completed! Master of Japanese Kana! (Final Score: ${score} pts)`}
            </p>
            <button
              onClick={() => (window as any).__startRollingGame(stage < 3 ? stage + 1 : 1)}
              className="bg-[#ff5500] hover:bg-[#ff7733] text-white font-bold px-8 py-3 rounded-xl text-base shadow-lg cursor-pointer transition"
            >
              {stage < 3 ? 'Proceed to Next Stage' : 'Play Again from Beginning'}
            </button>
          </div>
        )}
      </div>

      <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 flex items-center gap-4 text-left shadow-inner">
        <div className="w-10 h-10 bg-[#ffcc00] text-slate-900 font-bold flex items-center justify-center rounded-full shrink-0 border-2 border-white shadow">Yamato</div>
        <div className="text-xs text-slate-700 font-medium leading-relaxed">{yamatoSpeech}</div>
      </div>
    </div>
  );
}
