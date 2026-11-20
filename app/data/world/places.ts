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
  /** 会話の画面の、右の情報パネルの見出し（メニュー・時刻表・フロア案内など） */
  infoTitle: string;
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
  /** 会話の画面に出す情報（メニュー・時刻表など）。price の欄は ねだん・時刻・階など */
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
    infoTitle: '📋 メニュー Menu',
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
  {
    id: 'bus-stop',
    title: 'Bus stop',
    titleJa: 'バスてい',
    emoji: '🚏',
    description: 'Ask a person waiting at the bus stop which bus to take, when it comes and how much it costs.',
    infoTitle: '🚌 じこくひょう Timetable',
    floor: 'linear-gradient(#bbf7d0 0 14%, #e2e8f0 14% 64%, #94a3b8 64% 66%, #475569 66% 100%)',
    walls: [{ x1: 0, y1: 68, x2: 100, y2: 100, color: '#475569', label: 'どうろ' }],
    things: [
      { icon: '🏠', x: 12, y: 6, size: 2 },
      { icon: '🏪', x: 80, y: 6, size: 2 },
      { icon: '🌳', x: 5, y: 30, size: 2.4 },
      { icon: '🌳', x: 95, y: 30, size: 2.4 },
      { icon: '🚏', x: 34, y: 24, size: 2.4, label: 'バスてい' },
      { icon: '📋', x: 24, y: 24, size: 1.6, label: 'じこくひょう' },
      { icon: '🪑', x: 62, y: 24, size: 2 },
      { icon: '🚌', x: 78, y: 82, size: 2.6 },
    ],
    npc: { id: 'waiting', icon: '👵', name: 'Person waiting', nameJa: 'まっている人', x: 50, y: 24, talkX: 50, talkY: 42 },
    start: { x: 15, y: 56 },
    minutes: 3,
    menu: [
      {
        section: 'バス Buses',
        items: [
          { ja: '1ばん えき いき', en: 'No. 1 to the station (15 min)', price: '10:05 / 10:35' },
          { ja: '2ばん としょかん いき', en: 'No. 2 to the library (10 min)', price: '10:15 / 10:45' },
          { ja: '3ばん こうえん いき', en: 'No. 3 to the park (20 min)', price: '10:20 / 10:50' },
        ],
      },
      {
        section: 'ねだん Fare',
        items: [
          { ja: 'おとな', en: 'Adult', price: '200えん' },
          { ja: 'こども', en: 'Child', price: '100えん' },
        ],
      },
      { section: 'いま Now', items: [{ ja: 'いまの じかん', en: 'The time now', price: '10:00' }] },
    ],
    phrases: [
      { ja: 'すみません。', en: 'Excuse me.' },
      { ja: '〇〇に いきたいです。', en: 'I want to go to …' },
      { ja: '〇〇いきの バスは なんばんですか。', en: 'Which number is the bus to …?' },
      { ja: 'つぎの バスは なんじですか。', en: 'What time is the next bus?' },
      { ja: 'どのぐらい かかりますか。', en: 'How long does it take?' },
      { ja: 'いくらですか。', en: 'How much is it?' },
      { ja: 'ありがとうございます。', en: 'Thank you.' },
    ],
    goals: ['Say excuse me / greet the person', 'Ask which bus goes where you want to go', 'Ask when the next bus comes', 'Ask how much it costs', 'Say thank you'],
  },
  {
    id: 'supermarket',
    title: 'Yamato Mart',
    titleJa: 'スーパー',
    emoji: '🛒',
    description: 'Find things on the shelves, then buy them from the clerk at the checkout.',
    infoTitle: '🛒 うりば Price list',
    floor: 'repeating-linear-gradient(90deg, #f8fafc 0 46px, #e2e8f0 46px 48px)',
    walls: [
      { x1: 8, y1: 12, x2: 30, y2: 18, color: '#16a34a', label: '1 やさい・くだもの' },
      { x1: 39, y1: 12, x2: 61, y2: 18, color: '#2563eb', label: '2 のみもの' },
      { x1: 70, y1: 12, x2: 92, y2: 18, color: '#d97706', label: '3 パン・おかし' },
      { x1: 58, y1: 64, x2: 88, y2: 70, color: '#64748b', label: 'レジ' },
    ],
    things: [
      { icon: '🍎', x: 13, y: 7, size: 1.6 },
      { icon: '🍌', x: 19, y: 7, size: 1.6 },
      { icon: '🍅', x: 25, y: 7, size: 1.6 },
      { icon: '🥛', x: 44, y: 7, size: 1.6 },
      { icon: '🍵', x: 50, y: 7, size: 1.6 },
      { icon: '🧃', x: 56, y: 7, size: 1.6 },
      { icon: '🍞', x: 75, y: 7, size: 1.6 },
      { icon: '🍙', x: 81, y: 7, size: 1.6 },
      { icon: '🍫', x: 87, y: 7, size: 1.6 },
      { icon: '🛒', x: 24, y: 52, size: 2.2 },
      { icon: '🧺', x: 36, y: 80, size: 2 },
      { icon: '🚪', x: 14, y: 94, size: 2.4, label: 'いりぐち' },
    ],
    npc: { id: 'clerk', icon: '🧑‍💼', name: 'Clerk', nameJa: 'てんいん', x: 73, y: 80, talkX: 73, talkY: 56 },
    start: { x: 14, y: 84 },
    minutes: 3,
    menu: [
      {
        section: '1 やさい・くだもの Fruit & veg',
        items: [
          { ja: 'りんご', en: 'Apple', price: '100えん' },
          { ja: 'バナナ', en: 'Bananas', price: '150えん' },
          { ja: 'トマト', en: 'Tomato', price: '80えん' },
        ],
      },
      {
        section: '2 のみもの Drinks',
        items: [
          { ja: 'ぎゅうにゅう', en: 'Milk', price: '180えん' },
          { ja: 'おちゃ', en: 'Green tea', price: '130えん' },
          { ja: 'ジュース', en: 'Juice', price: '150えん' },
        ],
      },
      {
        section: '3 パン・おかし Bread & snacks',
        items: [
          { ja: 'パン', en: 'Bread', price: '200えん' },
          { ja: 'おにぎり', en: 'Rice ball', price: '120えん' },
          { ja: 'チョコレート', en: 'Chocolate', price: '100えん' },
        ],
      },
      { section: 'レジ Checkout', items: [{ ja: 'ふくろ', en: 'Plastic bag', price: '5えん' }] },
    ],
    phrases: [
      { ja: '〇〇は どこですか。', en: 'Where is …?' },
      { ja: 'これは いくらですか。', en: 'How much is this?' },
      { ja: '〇〇を ふたつ ください。', en: 'Two …, please.' },
      { ja: 'ふくろは いりません。', en: "I don't need a bag." },
      { ja: 'ふくろを おねがいします。', en: 'A bag, please.' },
      { ja: 'ぜんぶで いくらですか。', en: 'How much is it altogether?' },
      { ja: '〇〇えんで おねがいします。', en: 'Here is … yen.' },
    ],
    goals: ['Ask where something is', 'Buy two or more things and say how many', 'Answer if you need a bag', 'Pay and say thank you'],
  },
  {
    id: 'station',
    title: 'Yamato Station',
    titleJa: 'えき',
    emoji: '🚉',
    description: 'Ask the station staff about trains and buy a ticket.',
    infoTitle: '🚆 うんちん・じこくひょう Fares & trains',
    floor: 'repeating-conic-gradient(#e5e7eb 0% 25%, #f3f4f6 0% 50%) 0 0 / 40px 40px',
    walls: [{ x1: 30, y1: 16, x2: 70, y2: 24, color: '#0f766e', label: 'きっぷうりば' }],
    things: [
      { icon: '🕒', x: 18, y: 6, size: 1.8 },
      { icon: '📋', x: 14, y: 26, size: 1.8, label: 'じこくひょう' },
      { icon: '🎫', x: 84, y: 26, size: 1.8, label: 'きっぷ' },
      { icon: '🚆', x: 88, y: 6, size: 2.2 },
      { icon: '🪑', x: 12, y: 62, size: 2 },
      { icon: '🪑', x: 20, y: 62, size: 2 },
      { icon: '🚪', x: 90, y: 62, size: 2.2, label: 'かいさつ' },
      { icon: '🚪', x: 50, y: 94, size: 2.4, label: 'いりぐち' },
    ],
    npc: { id: 'staff', icon: '🧑‍✈️', name: 'Station staff', nameJa: 'えきいん', x: 50, y: 10, talkX: 50, talkY: 36 },
    start: { x: 50, y: 84 },
    minutes: 3,
    menu: [
      {
        section: 'いきさき Destinations (one-way)',
        items: [
          { ja: 'とうきょう', en: 'Tokyo · platform 1', price: '400えん' },
          { ja: 'よこはま', en: 'Yokohama · platform 2', price: '300えん' },
          { ja: 'しんじゅく', en: 'Shinjuku · platform 3', price: '250えん' },
        ],
      },
      {
        section: 'つぎの でんしゃ Next trains',
        items: [
          { ja: 'とうきょう いき', en: 'To Tokyo', price: '11:10' },
          { ja: 'よこはま いき', en: 'To Yokohama', price: '11:15' },
          { ja: 'しんじゅく いき', en: 'To Shinjuku', price: '11:20' },
        ],
      },
      {
        section: 'きっぷ Tickets',
        items: [
          { ja: 'おうふく', en: 'Return', price: 'x2' },
          { ja: 'こども', en: 'Child', price: '½' },
          { ja: 'いまの じかん', en: 'The time now', price: '11:00' },
        ],
      },
    ],
    phrases: [
      { ja: '〇〇まで おねがいします。', en: 'To …, please.' },
      { ja: '〇〇いきは なんばんせんですか。', en: 'Which platform is the train to …?' },
      { ja: 'つぎの でんしゃは なんじですか。', en: 'What time is the next train?' },
      { ja: 'かたみちで おねがいします。', en: 'One-way, please.' },
      { ja: 'おうふくで おねがいします。', en: 'Return, please.' },
      { ja: 'いくらですか。', en: 'How much is it?' },
      { ja: 'ありがとうございます。', en: 'Thank you.' },
    ],
    goals: ['Say where you want to go', 'Ask which platform the train leaves from', 'Ask the time of the next train', 'Buy a one-way or return ticket and pay', 'Say thank you'],
  },
  {
    id: 'department-store',
    title: 'Yamato Department Store',
    titleJa: 'デパート',
    emoji: '🏬',
    description: 'Ask the receptionist at the information desk which floor to go to.',
    infoTitle: '🏬 フロアあんない Floor guide',
    floor: 'repeating-linear-gradient(45deg, #fdf2f8 0 20px, #fce7f3 20px 40px)',
    walls: [{ x1: 36, y1: 20, x2: 64, y2: 27, color: '#be185d', label: 'インフォメーション' }],
    things: [
      { icon: '🚻', x: 8, y: 16, size: 2, label: 'トイレ' },
      { icon: '🛗', x: 92, y: 16, size: 2.2, label: 'エレベーター' },
      { icon: '👟', x: 16, y: 58, size: 2 },
      { icon: '👜', x: 26, y: 70, size: 2 },
      { icon: '👞', x: 80, y: 58, size: 2 },
      { icon: '🎒', x: 72, y: 70, size: 2 },
      { icon: '🪴', x: 6, y: 86, size: 2.2 },
      { icon: '🪴', x: 94, y: 86, size: 2.2 },
      { icon: '🚪', x: 50, y: 94, size: 2.4, label: 'いりぐち' },
    ],
    npc: { id: 'reception', icon: '💁', name: 'Receptionist', nameJa: 'うけつけ', x: 50, y: 13, talkX: 50, talkY: 40 },
    start: { x: 50, y: 84 },
    minutes: 3,
    menu: [
      {
        section: 'フロア Floors',
        items: [
          { ja: 'レストラン', en: 'Restaurants', price: '6かい' },
          { ja: 'でんきせいひん', en: 'Electronics', price: '5かい' },
          { ja: 'おもちゃ・ほん', en: 'Toys & books', price: '4かい' },
          { ja: 'おとこの ひとの ふく', en: "Men's clothes", price: '3かい' },
          { ja: 'おんなの ひとの ふく', en: "Women's clothes", price: '2かい' },
          { ja: 'くつ・かばん', en: 'Shoes & bags (you are here)', price: '1かい' },
          { ja: 'たべもの', en: 'Food', price: 'ちか1かい' },
        ],
      },
      { section: 'じかん Opening hours', items: [{ ja: 'あいている じかん', en: 'Open', price: '10:00〜20:00' }] },
    ],
    phrases: [
      { ja: 'すみません、〇〇は なんがいですか。', en: 'Excuse me, which floor is …?' },
      { ja: '〇〇は どこで かえますか。', en: 'Where can I buy …?' },
      { ja: 'エレベーターは どこですか。', en: 'Where is the lift?' },
      { ja: 'トイレは どこですか。', en: 'Where are the toilets?' },
      { ja: 'なんじまでですか。', en: 'Until what time are you open?' },
      { ja: 'ありがとうございます。', en: 'Thank you.' },
    ],
    goals: ['Ask on which floor you can buy something', 'Ask where the lift or the toilets are', 'Ask what time the store closes', 'Say thank you'],
  },
];

/** これから作る場所（一覧に「Coming soon」で出す。Speaking Tasks と Yamato Town の両方で使う） */
export const WORLD_PLACES_COMING_SOON = [
  { emoji: '🏪', title: 'Convenience store', titleJa: 'コンビニ' },
  { emoji: '🏫', title: 'School', titleJa: 'がっこう' },
  { emoji: '☕', title: 'Café', titleJa: 'カフェ' },
];

export const findWorldPlace = (id: string | undefined) => WORLD_PLACES.find((p) => p.id === id) ?? null;
