/**
* @file ogre-star-sword.tsx
* @description 生徒用タイピング防衛戦 (手裏剣の垂直直線軌道対応版 / 鬼星の剣)
* @note 元のゲームのコンセプトとルールはそのままに、見た目だけを
* シネマティックで締まったデザインに作り直した差し替え版です。
* このファイルを元のルートファイルと置き換えてそのまま使えます。
* loader / meta / ToolPageWrapper / 解放ロジックは元のままです。
*/
import { json, type LoaderFunctionArgs, type MetaFunction} from '@remix-run/cloudflare';
import React, { useEffect, useRef, useState} from 'react';
import { Link} from '@remix-run/react';
import { ToolPageWrapper} from '~/components/ToolPageWrapper';
import type { PageLayoutRef} from '~/components/PageLayout';
import { generateModuleMeta} from '~/utils/seoMeta';
import { supabase} from '~/lib/supabaseClient';

const ENEMY_POOL = [
{ char: 'あ', romaji: 'a'},
{ char: 'い', romaji: 'i'},
{ char: 'う', romaji: 'u'},
{ char: 'え', romaji: 'e'},
{ char: 'お', romaji: 'o'},
{ char: 'か', romaji: 'ka'},
{ char: 'き', romaji: 'ki'},
{ char: 'く', romaji: 'ku'},
{ char: 'け', romaji: 'ke'},
{ char: 'こ', romaji: 'ko'},
{ char: 'さ', romaji: 'sa'},
{ char: 'し', romaji: 'shi'},
{ char: 'す', romaji: 'su'},
{ char: 'せ', romaji: 'se'},
{ char: 'そ', romaji: 'so'},
{ char: '日', romaji: 'nichi'},
{ char: '本', romaji: 'hon'},
];

interface ActiveEnemy {
id: number;
char: string;
romaji: string;
x: number; // 画面上の横位置 (%) [10% 〜 90%]
y: number; // 迫ってくる距離 (0% = 遠く, 90% = 防衛ライン)
}

interface AttackEffect {
id: number;
startX: number;
startY: number;
targetY: number;
isHit: boolean;
hitX?: number;
}

export async function loader({ request}: LoaderFunctionArgs) {
const url = new URL(request.url);
let portalContent = null;
try {
const { data: portalData} = await supabase
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

export const meta: MetaFunction<typeof loader> = ({ data}: { data: any}) => {
return generateModuleMeta(data?.portalContent || null, data?.currentPath || '');
};

export default function OgreStarSwordPage() {
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
alert('✨ 認証成功！ゲームが一時的に解放されました。');
} else {
alert('❌ パスコードが違います。');
}
};

return (
<ToolPageWrapper layoutRef={layoutRef} breadcrumbTitle="Ogre Star Sword">
<div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
<header className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950 px-6 py-5 shadow-2xl shadow-black/40">
<div
aria-hidden
className="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-indigo-500/30 blur-3xl"
/>
<div
aria-hidden
className="pointer-events-none absolute -bottom-32 left-10 h-48 w-48 rounded-full bg-rose-500/20 blur-3xl"
/>
<div className="relative flex items-start justify-between gap-4">
<div>
<p className="text-[11px] font-bold tracking-[0.25em] text-indigo-300">
OGRE STAR SWORD
</p>
<h1 className="mt-1 bg-gradient-to-r from-amber-200 via-rose-200 to-indigo-200 bg-clip-text text-2xl font-black tracking-tight text-transparent">
鬼星の剣 〜タイピング防衛戦〜
</h1>
<p className="mt-1 text-xs text-slate-400">
VCE Japanese Typing Practice — 夜空を守り抜け。
</p>
</div>
<Link
to="/teacher-dashboard"
className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-bold text-slate-200 backdrop-blur transition hover:bg-white/10 hover:text-white"
>
教師用ダッシュボードへ ↗
</Link>
</div>
</header>

{isAccessible? (
<OgreStarSwordArena />
): (
<div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90 p-8 text-center shadow-2xl shadow-black/40">
<div
aria-hidden
className="pointer-events-none absolute -top-20 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-indigo-500/25 blur-3xl"
/>
<div className="relative space-y-6">
<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 text-3xl shadow-inner">
⚔️
</div>
<div>
<h2 className="text-xl font-black tracking-tight text-white">
このエリアは現在ロックされています
</h2>
<p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
授業の課題を終わらせるか、先生から伝えられたパスコードを入力してください。
早く終わった生徒は先生が個別に解放してくれます。
</p>
</div>
<form onSubmit={handlePasscodeSubmit} className="mx-auto flex max-w-xs gap-2">
<input
type="text"
maxLength={4}
placeholder="4桁コード"
value={inputPasscode}
onChange={(e) => setInputPasscode(e.target.value)}
className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-center font-mono text-lg tracking-[0.3em] text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
/>
<button
type="submit"
className="shrink-0 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-indigo-950/50 transition hover:brightness-110 active:scale-95"
>
解除
</button>
</form>
</div>
</div>
)}
</div>
</ToolPageWrapper>
);
}

function OgreStarSwordArena() {
const [score, setScore] = useState(0);
const [defeatCount, setDefeatCount] = useState(0);
const [hp, setHp] = useState(5);
const [enemies, setEnemies] = useState<ActiveEnemy[]>([]);
const [attacks, setAttacks] = useState<AttackEffect[]>([]);
const [playerX, setPlayerX] = useState(50);
const [inputVal, setInputVal] = useState('');
const [isGameOver, setIsGameOver] = useState(false);
const [speedMultiplier, setSpeedMultiplier] = useState(1.0);

// 1. 15秒ごとにスピード加速
useEffect(() => {
if (isGameOver) return;
const speedTimer = setInterval(() => {
setSpeedMultiplier((prev) => prev + 0.3);
}, 15000);

return () => clearInterval(speedTimer);
}, [isGameOver]);

// 2. 一定間隔で新しい鬼を出現
useEffect(() => {
if (isGameOver) return;

const spawnInterval = setInterval(() => {
const template = ENEMY_POOL[Math.floor(Math.random() * ENEMY_POOL.length)];
const newEnemy: ActiveEnemy = {
id: Date.now() + Math.random(),
char: template.char,
romaji: template.romaji,
x: Math.floor(Math.random() * 80) + 10,
y: 0,
};
setEnemies((prev) => [...prev, newEnemy]);
}, 2500);

return () => clearInterval(spawnInterval);
}, [isGameOver]);

// 3. 鬼を移動
useEffect(() => {
if (isGameOver) return;

const moveInterval = setInterval(() => {
setEnemies((prev) => {
const nextEnemies: ActiveEnemy[] = [];
let lostHp = 0;

prev.forEach((enemy) => {
const nextY = enemy.y + 0.8 * speedMultiplier;
if (nextY >= 90) {
lostHp += 1;
} else {
nextEnemies.push({...enemy, y: nextY});
}
});

if (lostHp > 0) {
setHp((h) => {
const updated = h - lostHp;
if (updated <= 0) setIsGameOver(true);
return Math.max(0, updated);
});
}

return nextEnemies;
});
}, 100);

return () => clearInterval(moveInterval);
}, [isGameOver, speedMultiplier]);

// 4. 左右矢印キーでプレイヤー移動
const handleKeyDown = (e: React.KeyboardEvent) => {
if (isGameOver) return;
if (e.key === 'ArrowLeft') {
setPlayerX((prev) => Math.max(10, prev - 6));
} else if (e.key === 'ArrowRight') {
setPlayerX((prev) => Math.min(90, prev + 6));
}
};

// 音声ファイルの再生ヘルパー関数
const playVoiceCount = (count: number) => {
try {
const audio = new Audio(`/audio/hit-${count}.mp3`);
audio.volume = 0.8;
audio.play().catch(() => {});
} catch (e) {}
};

// 5. ローマ字入力時の判定（垂直直線軌道対応）
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
if (isGameOver) return;
const val = e.target.value.toLowerCase();
setInputVal(val);

const matchedEnemy = enemies.find((enemy) => enemy.romaji === val);

if (matchedEnemy) {
// 誤差±5%以内（真下・真正面）のときのみヒットとする
const isAligned = Math.abs(playerX - matchedEnemy.x) <= 5;

if (isAligned) {
// 真上にまっすぐ伸びる軌道（鬼の高さまで）
const newAttack: AttackEffect = {
id: Date.now() + Math.random(),
startX: playerX,
startY: 90,
targetY: matchedEnemy.y,
isHit: true,
hitX: matchedEnemy.x,
};
setAttacks((prev) => [...prev, newAttack]);

setTimeout(() => {
setEnemies((prev) => prev.filter((enemy) => enemy.id!== matchedEnemy.id));
setAttacks((prev) => prev.filter((a) => a.id!== newAttack.id));
}, 200);

const newCount = defeatCount + 1;
setScore((s) => s + 100);
setDefeatCount(newCount);
setInputVal('');

playVoiceCount(newCount);
} else {
// 位置がズレている場合：忍者から真上へまっすぐ抜ける赤い軌道
const missedAttack: AttackEffect = {
id: Date.now() + Math.random(),
startX: playerX,
startY: 90,
targetY: 5, // 画面最上部までまっすぐ抜ける
isHit: false,
};
setAttacks((prev) => [...prev, missedAttack]);

setTimeout(() => {
setAttacks((prev) => prev.filter((a) => a.id!== missedAttack.id));
}, 300);

setInputVal('');
}
}
};

const restartGame = () => {
setScore(0);
setDefeatCount(0);
setHp(5);
setEnemies([]);
setAttacks([]);
setPlayerX(50);
setInputVal('');
setSpeedMultiplier(1.0);
setIsGameOver(false);
};

const getJapaneseCount = (num: number) => {
const words = ['零人', '一人', '二人', '三人', '四人', '五人', '六人', '七人', '八人', '九人', '十人'];
return num <= 10? words[num]: `${num}人`;
};

return (
<div
className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0b1020] p-5 text-white shadow-2xl shadow-black/50 sm:p-6"
tabIndex={0}
onKeyDown={handleKeyDown}
>
<div
aria-hidden
className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-indigo-500/20 to-transparent"
/>

{/* ステータスバー */}
<div className="relative grid grid-cols-3 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
<div>
<p className="text-[10px] font-bold tracking-widest text-slate-400">HP</p>
<div className="mt-1.5 flex gap-1.5" aria-label={`HP ${hp} / 5`}>
{Array.from({ length: 5}).map((_, i) => (
<span
key={i}
className={`h-2.5 w-6 rounded-full transition ${
i < hp
? 'bg-gradient-to-r from-rose-400 to-rose-500 shadow shadow-rose-500/40'
: 'bg-white/10'
}`}
/>
))}
</div>
</div>
<div className="text-center">
<p className="text-[10px] font-bold tracking-widest text-slate-400">討伐</p>
<p className="mt-0.5 text-base font-black text-indigo-200">
{getJapaneseCount(defeatCount)}
</p>
</div>
<div className="text-right">
<p className="text-[10px] font-bold tracking-widest text-slate-400">SCORE</p>
<p className="mt-0.5 text-base font-black tabular-nums text-emerald-300">
{score.toLocaleString()} pt
</p>
</div>
</div>

{/* ゲームフィールド */}
<div className="relative mt-4 h-[420px] overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.25),transparent_55%),linear-gradient(to_bottom,#0f172a,#020617)]">
{isGameOver? (
<div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-sm">
<p className="text-[11px] font-bold tracking-[0.3em] text-slate-400">BATTLE ENDED</p>
<h2 className="bg-gradient-to-r from-rose-300 to-amber-200 bg-clip-text text-3xl font-black text-transparent">
ゲームオーバー
</h2>
<p className="text-sm text-slate-300">
討伐数: {getJapaneseCount(defeatCount)}（{score} pt）
</p>
<button
onClick={restartGame}
className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-7 py-3 text-sm font-black shadow-lg shadow-indigo-950/60 transition hover:brightness-110 active:scale-95"
>
もう一度挑戦する
</button>
</div>
): (
<>
<div className="relative z-10 flex items-center justify-between px-4 pt-3 text-[11px] font-bold tracking-wider text-slate-400">
<span>鬼星の領域 ・ Lv.{speedMultiplier.toFixed(1)}</span>
<span className="text-indigo-300">← → で真下に合わせて撃て</span>
</div>

{/* 手裏剣の垂直直線軌道（SVG描画レイヤー） */}
<svg className="pointer-events-none absolute inset-0 z-10 h-full w-full">
<defs>
<filter id="attackGlow" x="-50%" y="-50%" width="200%" height="200%">
<feGaussianBlur stdDeviation="3" result="blur" />
<feMerge>
<feMergeNode in="blur" />
<feMergeNode in="SourceGraphic" />
</feMerge>
</filter>
</defs>
{attacks.map((atk) => (
<line
key={atk.id}
x1={`${atk.startX}%`}
y1={`${atk.startY}%`}
x2={`${atk.startX}%`}
y2={`${atk.targetY}%`}
stroke={atk.isHit? '#a5b4fc': '#f87171'}
strokeWidth="3"
strokeDasharray="6,6"
filter="url(#attackGlow)"
className="animate-pulse"
/>
))}
</svg>

{/* 迫ってくる鬼たち */}
<div className="pointer-events-none absolute inset-0">
{enemies.map((enemy) => {
const isExactAligned = Math.abs(playerX - enemy.x) <= 5;
return (
<div
key={enemy.id}
className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-all duration-100"
style={{ left: `${enemy.x}%`, top: `${enemy.y}%`}}
>
<span
className="text-4xl drop-shadow-[0_6px_16px_rgba(244,63,94,0.45)]"
style={{ filter: 'drop-shadow(0 0 12px rgba(248,113,113,0.35))'}}
>
👹
</span>
<div
className={`mt-1 rounded-lg border px-2.5 py-0.5 text-sm font-black shadow-lg backdrop-blur transition ${
isExactAligned
? 'scale-110 border-amber-300/80 bg-amber-400/90 text-slate-950 shadow-amber-500/30'
: 'border-white/15 bg-slate-950/80 text-white'
}`}
>
{enemy.char}
</div>
</div>
);
})}

{/* 当たった瞬間の手裏剣エフェクト */}
{attacks
.filter((a) => a.isHit)
.map((atk) => (
<div
key={`shuriken-${atk.id}`}
className="absolute z-20 -translate-x-1/2 -translate-y-1/2 animate-spin text-2xl"
style={{ left: `${atk.hitX}%`, top: `${atk.targetY}%`}}
>
✨
</div>
))}
</div>

{/* 防衛ライン上のプレイヤー（忍者） */}
<div
className="absolute bottom-10 z-20 flex -translate-x-1/2 flex-col items-center transition-all duration-75"
style={{ left: `${playerX}%`}}
>
<span className="mb-1 rounded-full border border-indigo-300/30 bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-200 backdrop-blur">
あなた
</span>
<span className="text-4xl drop-shadow-[0_0_16px_rgba(129,140,248,0.55)]">🥷</span>
</div>

{/* 防衛ライン */}
<div className="absolute inset-x-4 bottom-4 z-10">
<div className="h-px bg-gradient-to-r from-transparent via-indigo-400/80 to-transparent" />
<p className="mt-2 text-center text-[11px] font-bold tracking-[0.25em] text-indigo-300/80">
防衛ライン
</p>
</div>
</>
)}
</div>

{/* キー入力欄 */}
<div className="relative mx-auto mt-5 max-w-xs space-y-3">
<input
type="text"
autoFocus
disabled={isGameOver}
value={inputVal}
onChange={handleInputChange}
placeholder="矢印キーで移動 ＆ ローマ字入力"
className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 text-center font-mono text-lg text-white shadow-inner placeholder:text-slate-500 focus:border-amber-300/70 focus:outline-none focus:ring-2 focus:ring-amber-300/20"
/>
<div className="flex justify-center gap-2">
<button
onClick={() => setPlayerX((prev) => Math.max(10, prev - 10))}
className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10 active:scale-95"
>
◀ 左へ移動
</button>
<button
onClick={() => setPlayerX((prev) => Math.min(90, prev + 10))}
className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10 active:scale-95"
>
右へ移動 ▶
</button>
</div>
</div>
</div>
);
}
