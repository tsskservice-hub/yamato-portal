/**
 * @file ChestPicturesModal.tsx
 * @description 金貨バトルの宝箱に出てくる絵の説明（ゲームが終わったあと、先生と生徒の画面から開く）
 *
 * 絵は public/live-game/items。宝箱の画面（StudentView）も CHEST_PICTURES をここから使う。
 * 金貨の増減は api/src/live-game/content.ts の CHEST_ITEMS と合わせること。
 */
import React, { useEffect } from 'react';

export const CHEST_PICTURES: Record<string, string> = {
  kozuchi: '/live-game/items/uchidenokozuchi.webp',
  urashima: '/live-game/items/urashima-turtle.webp',
  manekineko: '/live-game/items/maneki-neko-shop.webp',
  oni: '/live-game/items/oni-stealing-gold.webp',
  tengu: '/live-game/items/tengu-stealing-gold.webp',
  kitsune: '/live-game/items/fox-digested.webp',
};

type Entry = { id: keyof typeof CHEST_PICTURES; nameJa: string; name: string; coins: number; about: string };

const ENTRIES: Entry[] = [
  {
    id: 'kozuchi',
    nameJa: '打ち出の小づち',
    name: 'Uchide no Kozuchi — the magic mallet',
    coins: 10,
    about:
      'A small magic hammer from Japanese folk tales. Shake it and make a wish, and treasure appears. In the story of Issun-bōshi, the tiny boy uses it to grow to full size.',
  },
  {
    id: 'urashima',
    nameJa: '竜宮城',
    name: 'Ryūgū-jō — the Dragon Palace',
    coins: 6,
    about:
      'In the tale of Urashima Tarō, a fisherman saves a turtle, and it carries him to the Dragon Palace under the sea. He is welcomed with a feast — but when he returns home, many years have passed.',
  },
  {
    id: 'manekineko',
    nameJa: '招き猫',
    name: 'Maneki-neko — the beckoning cat',
    coins: 3,
    about:
      'A lucky cat with one paw raised, often seen at the entrance of shops and restaurants. It is said to invite customers and good fortune inside.',
  },
  {
    id: 'oni',
    nameJa: '鬼',
    name: 'Oni — the ogre',
    coins: -10,
    about:
      'A strong, scary creature with horns, often red or blue, carrying an iron club. On Setsubun in February, people throw beans and shout “Oni wa soto! Fuku wa uchi!” (Ogres out! Good luck in!).',
  },
  {
    id: 'tengu',
    nameJa: '天狗',
    name: 'Tengu — the mountain spirit',
    coins: -6,
    about:
      'A spirit of the mountains, usually shown with a red face, a very long nose and wings. In stories, tengu are proud and like to play tricks, but they can also be skilled teachers of martial arts.',
  },
  {
    id: 'kitsune',
    nameJa: '狐',
    name: 'Kitsune — the fox',
    coins: -3,
    about:
      'In Japanese stories, foxes are clever and can change shape to trick people. Fox statues also guard Inari shrines, where they act as messengers of the god of rice.',
  },
];

export function ChestPicturesLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-sm font-bold text-indigo-600 underline cursor-pointer">
      📖 About the pictures in the treasure chests
    </button>
  );
}

export function ChestPicturesModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="chest-pictures-title"
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 id="chest-pictures-title" className="text-lg font-black text-slate-900 dark:text-white">
            What was in the treasure chests?
          </h2>
          <button type="button" onClick={onClose} className="text-sm font-bold text-slate-500 hover:text-slate-800 cursor-pointer">
            ✕ Close
          </button>
        </div>
        <div className="overflow-y-auto p-5 space-y-5">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Every picture comes from Japanese folk tales and traditions. Lucky ones add coins; tricksters take them away.
          </p>
          {ENTRIES.map((e) => (
            <div key={e.id} className="grid gap-3 sm:grid-cols-[180px_1fr] items-start">
              <img src={CHEST_PICTURES[e.id]} alt={e.name} loading="lazy" className="w-full aspect-[3/2] object-cover rounded-xl" />
              <div>
                <p className="text-xl font-black text-slate-900 dark:text-white" lang="ja">
                  {e.nameJa}
                </p>
                <p className="font-bold text-indigo-600">{e.name}</p>
                <p className={`text-sm font-black ${e.coins > 0 ? 'text-amber-500' : 'text-rose-500'}`}>
                  🪙 {e.coins > 0 ? `+${e.coins}` : `−${-e.coins}`} coins
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{e.about}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
