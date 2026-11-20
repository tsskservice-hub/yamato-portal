/**
 * @file app/data/world/places.ts
 * @description 会話練習の空間（Yamato Town）の場所の一覧（画面の絵・メニュー・話し方のヒント）
 *
 * ・1 つの場所 = 1 つのデータ。画面（components/world）は共通で、ここを足すだけで新しい場所ができる（/world/<id>）
 * ・AI の役割・使う言葉は、改ざんされないようサーバー（api/src/world/places.ts）が持つ。ここは見た目と生徒向けのヒントだけ
 * ・座標は、場面の幅・高さに対する %（0〜100）
 */

export type WorldThing = {
  /** 絵文字か、文字 */
  icon: string;
  x: number;
  y: number;
  /** 大きさ（rem） */
  size?: number;
  label?: string;
};

export type WorldNpc = {
  id: string;
  icon: string;
  name: string;
  nameJa: string;
  /** 立っている場所 */
  x: number;
  y: number;
  /** 話しかけるとき、生徒が立つ場所（ここに近づくと話せる） */
  talkX: number;
  talkY: number;
};

export type WorldPlace = {
  id: string;
  title: string;
  titleJa: string;
  emoji: string;
  description: string;
  /** 床の色など（CSS の background） */
  floor: string;
  /** 動けない場所（カウンターなど）。% の四角 */
  walls: { x1: number; y1: number; x2: number; y2: number; color: string; label?: string }[];
  things: WorldThing[];
  npc: WorldNpc;
  /** 生徒が最初に立つ場所 */
  start: { x: number; y: number };
  /** 会話の長さ（分）とクレジット（credit-costs.ts の worldTalk3 と同じ） */
  minutes: number;
  /** 会話の画面に出すメニュー */
  menu: { section: string; items: { ja: string; reading?: string; en: string; price: string }[] }[];
  /** 話し方のヒント（生徒が言うこと） */
  phrases: { ja: string; en: string }[];
  /** 会話の目標 */
  goals: string[];
};

export const WORLD_PLACES: WorldPlace[] = [
  {
    id: 'burger-shop',
    title: 'Yamato Burger',
    titleJa: 'ヤマトバーガー',
    emoji: '🍔',
    description: 'Order a meal from the clerk at a Japanese burger shop.',
    floor:
      'repeating-conic-gradient(#fde68a 0% 25%, #fef3c7 0% 50%) 0 0 / 48px 48px',
    walls: [{ x1: 18, y1: 18, x2: 82, y2: 30, color: '#b45309', label: 'カウンター' }],
    things: [
      { icon: '📋', x: 50, y: 6, size: 1.6, label: 'メニュー' },
      { icon: '🍟', x: 26, y: 10, size: 1.8 },
      { icon: '🥤', x: 74, y: 10, size: 1.8 },
      { icon: '🍔', x: 62, y: 10, size: 1.8 },
      { icon: '🪑', x: 15, y: 62, size: 2 },
      { icon: '🍽️', x: 22, y: 62, size: 1.6 },
      { icon: '🪑', x: 29, y: 62, size: 2 },
      { icon: '🪑', x: 71, y: 62, size: 2 },
      { icon: '🍽️', x: 78, y: 62, size: 1.6 },
      { icon: '🪑', x: 85, y: 62, size: 2 },
      { icon: '🪴', x: 6, y: 40, size: 2.2 },
      { icon: '🪴', x: 94, y: 40, size: 2.2 },
      { icon: '🚪', x: 50, y: 94, size: 2.4, label: 'いりぐち' },
    ],
    npc: { id: 'clerk', icon: '🧑‍🍳', name: 'Clerk', nameJa: 'てんいん', x: 50, y: 14, talkX: 50, talkY: 38 },
    start: { x: 50, y: 84 },
    minutes: 3,
    menu: [
      {
        section: 'バーガー Burgers',
        items: [
          { ja: 'ハンバーガー', en: 'Hamburger', price: '300えん' },
          { ja: 'チーズバーガー', en: 'Cheeseburger', price: '350えん' },
          { ja: 'チキンバーガー', en: 'Chicken burger', price: '400えん' },
        ],
      },
      {
        section: 'サイド Sides',
        items: [{ ja: 'ポテト', en: 'Fries (S / M / L)', price: '200 / 250 / 300えん' }],
      },
      {
        section: 'のみもの Drinks',
        items: [
          { ja: 'オレンジジュース・コーラ・おちゃ', en: 'Orange juice, cola, green tea (S / M / L)', price: '150 / 200 / 250えん' },
        ],
      },
      {
        section: 'セット Meal set',
        items: [{ ja: 'セット', en: 'Burger + fries (M) + drink (M)', price: 'バーガー ＋ 300えん' }],
      },
    ],
    phrases: [
      { ja: '〇〇を ください。', en: 'I’d like …, please.' },
      { ja: '〇〇を ひとつ おねがいします。', en: 'One …, please.' },
      { ja: 'セットで おねがいします。', en: 'As a meal set, please.' },
      { ja: 'Mサイズで おねがいします。', en: 'Medium size, please.' },
      { ja: 'ここで たべます。／ もちかえりで おねがいします。', en: 'To eat here. / To take away, please.' },
      { ja: 'いくらですか。', en: 'How much is it?' },
      { ja: '〇〇えんで おねがいします。', en: 'Here is … yen.' },
      { ja: 'もう いちど おねがいします。', en: 'Once more, please.' },
    ],
    goals: ['Order a burger', 'Choose a set, a size and a drink', 'Say if you will eat here or take away', 'Pay and say thank you'],
  },
];

export const findWorldPlace = (id: string | undefined) => WORLD_PLACES.find((p) => p.id === id) ?? null;
