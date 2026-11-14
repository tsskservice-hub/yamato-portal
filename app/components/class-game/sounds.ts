/**
 * @file sounds.ts
 * @description クラスのライブゲームで鳴らす録音（public/live-game/sounds）
 *
 * ・前もって読み込んでおき、鳴らす瞬間に待たせない
 * ・iPhone などは、画面を一度タップしたあとでないと音が出せないので、最初のタップで準備する
 * ・録音が鳴らせないときは、ブラウザの日本語読み上げにする（それも無ければ音なし）
 */
type Sound = { url: string; speak: string; rate: number; pitch: number; audio: HTMLAudioElement | null };

const SOUNDS: Record<'janken' | 'mondai', Sound> = {
  janken: { url: '/live-game/sounds/jankenpon.mp3', speak: 'じゃんけんぽん！', rate: 1.15, pitch: 1, audio: null },
  mondai: { url: '/live-game/sounds/here-is-question.mp3', speak: '問題です', rate: 0.9, pitch: 0.8, audio: null },
};

let unlockHooked = false;

/** 録音を前もって読み込む（何度呼んでもよい） */
export function preloadGameSounds() {
  if (typeof window === 'undefined') return;
  try {
    for (const s of Object.values(SOUNDS)) {
      if (s.audio) continue;
      s.audio = new Audio(s.url);
      s.audio.preload = 'auto';
      s.audio.load();
    }
    if (unlockHooked) return;
    unlockHooked = true;
    const unlock = () => {
      for (const s of Object.values(SOUNDS)) {
        const a = s.audio;
        // 鳴っている最中の音は触らない
        if (!a || !a.paused) continue;
        a.muted = true;
        a.play()
          .then(() => {
            a.pause();
            a.currentTime = 0;
            a.muted = false;
          })
          .catch(() => {
            a.muted = false;
          });
      }
    };
    window.addEventListener('pointerdown', unlock, { once: true });
  } catch {
    // 音が出せなくてもゲームは続ける
  }
}

function speak(s: Sound) {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(s.speak);
    u.lang = 'ja-JP';
    u.rate = s.rate;
    u.pitch = s.pitch;
    const ja = window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('ja'));
    if (ja) u.voice = ja;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    // 音が出せなくてもゲームは続ける
  }
}

export function playGameSound(name: keyof typeof SOUNDS) {
  preloadGameSounds();
  const s = SOUNDS[name];
  if (s.audio) {
    try {
      s.audio.muted = false;
      s.audio.currentTime = 0;
      s.audio.play().catch(() => speak(s));
      return;
    } catch {
      // 読み上げにする
    }
  }
  speak(s);
}
