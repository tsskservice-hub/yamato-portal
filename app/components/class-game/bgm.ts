/**
 * @file bgm.ts
 * @description 金貨バトルの BGM（先生の画面＝プロジェクターだけで流す。生徒の端末では流さない）
 *
 * 曲は OpenTracks（旧 DOVA-SYNDROME）など、ライセンスで「音源ファイルをそのまま聞ける・保存できる状態」での
 * 公開が禁止されているものを使う（音源利用ライセンス 禁止事項 8）。そのため：
 *  ・元の曲ファイルはサイトに置かない（public の外。リポジトリにも入れない）
 *  ・scripts/pack-bgm.py で、音声ファイルとしては開けない形（.bin）に変えてから public/live-game/bgm/ に置く
 *  ・ブラウザでは .bin を読み込み、元に戻してから Web Audio で鳴らす（<audio> のダウンロードボタンも出ない）
 *
 * 曲を足すときは、pack-bgm.py を実行して、下の BGM_TRACKS に 1 行足す。
 * id は半角英小文字・数字・ハイフンだけ（サーバーはこの形だけを確かめて覚える）。
 */
import { useEffect, useRef } from 'react';

export type BgmTrack = { id: string; title: string; file: string };

export const BGM_TRACKS: BgmTrack[] = [
  // 曲名はひとまずファイル名のまま（あとで英語の曲名に変える）
  ...Array.from({ length: 11 }, (_, i) => ({ id: `bgm${i + 1}`, title: `bgm${i + 1}`, file: `/live-game/bgm/bgm${i + 1}.bin` })),
];

export const bgmTrack = (id: string | null | undefined) => BGM_TRACKS.find((t) => t.id === id) ?? null;

/** BGM の音量（0〜1）。先生が画面で変えられる */
export const BGM_DEFAULT_VOLUME = 0.35;

/** scripts/pack-bgm.py と同じ鍵（変えるときは両方） */
const PACK_KEY = new TextEncoder().encode('yamato-live-game-bgm');
const PACK_MAGIC = 'YLGB1';

type Ctx = AudioContext;
let sharedCtx: Ctx | null = null;
function audioContext(): Ctx | null {
  if (typeof window === 'undefined') return null;
  if (!sharedCtx) {
    const C = window.AudioContext || (window as any).webkitAudioContext;
    if (!C) return null;
    sharedCtx = new C();
    // ブラウザが音を止めているときは、次に画面を押したときに鳴らせるようにする
    const resume = () => sharedCtx?.state === 'suspended' && sharedCtx.resume().catch(() => undefined);
    window.addEventListener('pointerdown', resume);
  }
  return sharedCtx;
}

const decoded = new Map<string, Promise<AudioBuffer | null>>();

/** .bin を読み込んで元の音に戻す（同じ曲は 1 回だけ） */
function loadTrack(track: BgmTrack): Promise<AudioBuffer | null> {
  let p = decoded.get(track.file);
  if (!p) {
    p = (async () => {
      const ctx = audioContext();
      if (!ctx) return null;
      try {
        const res = await fetch(track.file);
        if (!res.ok) return null;
        const bytes = new Uint8Array(await res.arrayBuffer());
        const magic = new TextDecoder().decode(bytes.subarray(0, PACK_MAGIC.length));
        if (magic !== PACK_MAGIC) return null;
        const body = bytes.slice(PACK_MAGIC.length);
        for (let i = 0; i < body.length; i++) body[i] ^= PACK_KEY[i % PACK_KEY.length];
        return await ctx.decodeAudioData(body.buffer);
      } catch {
        return null;
      }
    })();
    decoded.set(track.file, p);
  }
  return p;
}

/** 1 曲をくり返し鳴らす係。止める・続きから鳴らす・音量を変える */
class LoopPlayer {
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private startedAt = 0;
  private offset = 0;
  constructor(private buffer: AudioBuffer, private ctx: Ctx, volume: number) {
    this.gain = ctx.createGain();
    this.gain.gain.value = volume;
    this.gain.connect(ctx.destination);
  }
  play() {
    if (this.source || !this.gain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => undefined);
    const s = this.ctx.createBufferSource();
    s.buffer = this.buffer;
    s.loop = true;
    s.connect(this.gain);
    s.start(0, this.offset % this.buffer.duration);
    this.startedAt = this.ctx.currentTime - this.offset;
    this.source = s;
  }
  pause() {
    if (!this.source) return;
    this.offset = (this.ctx.currentTime - this.startedAt) % this.buffer.duration;
    try {
      this.source.stop();
    } catch {
      // すでに止まっている
    }
    this.source.disconnect();
    this.source = null;
  }
  setVolume(v: number) {
    if (this.gain) this.gain.gain.value = v;
  }
  dispose() {
    this.pause();
    this.gain?.disconnect();
    this.gain = null;
  }
}

/**
 * playing が true のあいだ、曲をくり返し流す。false で一時停止（ヤマトの問題の最中など）、true で続きから。
 * 曲が鳴らせない（ブラウザが止めた・ファイルがない）ときは、何もしない。
 */
export function useBgm(trackId: string | null | undefined, playing: boolean, volume: number) {
  const player = useRef<LoopPlayer | null>(null);
  const want = useRef({ playing, volume });
  want.current = { playing, volume };
  const track = bgmTrack(trackId);

  useEffect(() => {
    if (!track) return;
    let cancelled = false;
    loadTrack(track).then((buffer) => {
      const ctx = audioContext();
      if (cancelled || !buffer || !ctx) return;
      const p = new LoopPlayer(buffer, ctx, clamp(want.current.volume));
      player.current = p;
      if (want.current.playing) p.play();
    });
    return () => {
      cancelled = true;
      player.current?.dispose();
      player.current = null;
    };
  }, [track?.file]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    player.current?.setVolume(clamp(volume));
  }, [volume]);

  useEffect(() => {
    if (playing) player.current?.play();
    else player.current?.pause();
  }, [playing]);
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/** ゲームを作る画面の試聴用：同時に 1 曲だけ、最初の 30 秒まで流す */
let preview: { player: LoopPlayer; timer: ReturnType<typeof setTimeout> } | null = null;
let previewToken = 0;
export function previewBgm(track: BgmTrack | null, onEnd: () => void) {
  previewToken += 1;
  const token = previewToken;
  if (preview) {
    clearTimeout(preview.timer);
    preview.player.dispose();
    preview = null;
  }
  if (!track) return;
  const ctx = audioContext();
  if (!ctx) return onEnd();
  if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
  loadTrack(track).then((buffer) => {
    if (token !== previewToken) return;
    if (!buffer) return onEnd();
    const player = new LoopPlayer(buffer, ctx, BGM_DEFAULT_VOLUME);
    player.play();
    const timer = setTimeout(() => {
      if (token !== previewToken) return;
      player.dispose();
      preview = null;
      onEnd();
    }, 30_000);
    preview = { player, timer };
  });
}
