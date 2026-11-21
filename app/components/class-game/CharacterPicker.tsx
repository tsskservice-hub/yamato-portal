/**
 * @file CharacterPicker.tsx
 * @description クラスのライブゲームで出題する文字を、先生が選ぶ（生徒の学習ペースに合わせるため）
 *
 * ・文字は Supabase の kl_character から読む（ほかのゲームと同じ）
 * ・ひらがな・カタカナの清音は行ごと（あ行・か行…）、それ以外は category ごとにまとめて、まとめて選べる
 * ・選んだ文字はこのブラウザに覚えておき、次のゲームでも同じ選び方から始められる
 * ・選んだ文字が本当に出題できるかは、サーバーがもう一度確かめる
 */
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '~/lib/supabaseClient';
import { fetchAllPages } from '~/lib/fetchAllPages';

export type QuestionSetKey = 'hiragana' | 'katakana' | 'kanji';
type Row = { character: string | null; romaji: string | null; category: string | null; char_type: string | null };
type Group = { id: string; label: string; chars: string[] };

/** 4 つの選択肢を作るので、最低 4 文字 */
export const MIN_CHARACTERS = 4;

const KANA_CATEGORY_LABEL: Record<string, string> = {
  濁音: 'Dakuten',
  半濁音: 'Handakuten',
  拗音: 'Combinations',
};

const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** 清音を行に分けるための鍵（Romaji の最初の音から） */
function seionRow(romaji: string): string {
  const r = romaji.toLowerCase();
  if (r === 'n') return 'w';
  const c = r[0] ?? '';
  if ('aiueo'.includes(c)) return 'a';
  if (c === 'c') return 't';
  if (c === 'f') return 'h';
  return c;
}

function buildGroups(rows: Row[], set: QuestionSetKey): Group[] {
  const groups: Group[] = [];
  const byId = new Map<string, Group>();
  const seen = new Set<string>();
  for (const r of rows) {
    if (r.char_type !== set) continue;
    const ch = clean(r.character);
    if (!ch || seen.has(ch)) continue;
    seen.add(ch);
    const category = clean(r.category);
    let id: string;
    let label: string;
    if (set === 'kanji') {
      id = category || 'Other';
      label = id;
    } else if (!category || category === '清音') {
      id = `row-${seionRow(clean(r.romaji))}`;
      label = '';
    } else {
      id = category;
      label = KANA_CATEGORY_LABEL[category] ?? category;
    }
    let g = byId.get(id);
    if (!g) {
      g = { id, label, chars: [] };
      byId.set(id, g);
      groups.push(g);
    }
    g.chars.push(ch);
  }
  // 清音の行は、最初の文字で名前をつける（あ row、か row …）
  for (const g of groups) if (!g.label) g.label = `${g.chars[0]} row`;
  return groups;
}

const storageKey = (set: QuestionSetKey) => `classGame.characters.${set}`;

function readSaved(set: QuestionSetKey): string[] | null {
  try {
    const raw = window.localStorage.getItem(storageKey(set));
    const v = raw ? JSON.parse(raw) : null;
    return Array.isArray(v) && v.every((x) => typeof x === 'string') ? v : null;
  } catch {
    return null;
  }
}

function save(set: QuestionSetKey, chars: string[]) {
  try {
    window.localStorage.setItem(storageKey(set), JSON.stringify(chars));
  } catch {
    // 覚えられなくても選ぶことはできる
  }
}

export function CharacterPicker({
  set,
  onChange,
}: {
  set: QuestionSetKey;
  /** 選んだ文字。null は「まだ読み込み中・読み込めなかった」 */
  onChange: (chars: string[] | null) => void;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchAllPages<Row>((from, to) =>
          supabase
            .from('kl_character')
            .select('character, romaji, category, char_type')
            .in('char_type', ['hiragana', 'katakana', 'kanji'])
            .order('sort_order', { ascending: true, nullsFirst: false })
            .order('id', { ascending: true })
            .range(from, to) as unknown as PromiseLike<{ data: Row[] | null; error: { message: string } | null }>
        );
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setLoadError('Could not load the characters. Please reload the page.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(() => (rows ? buildGroups(rows, set) : []), [rows, set]);

  // 文字の種類を切り替えたら、前に選んだものを呼び戻す（なければ最初のまとまりだけ）
  useEffect(() => {
    if (!rows) return;
    const all = new Set(groups.flatMap((g) => g.chars));
    const saved = (readSaved(set) ?? []).filter((c) => all.has(c));
    const initial = saved.length ? saved : (groups[0]?.chars ?? []);
    setSelected(new Set(initial));
  }, [rows, set]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!rows) return onChange(null);
    // 画面の並び順で渡す
    onChange(groups.flatMap((g) => g.chars).filter((c) => selected.has(c)));
  }, [rows, selected, groups]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (next: Set<string>) => {
    setSelected(next);
    save(set, [...next]);
  };
  const toggle = (ch: string) => {
    const next = new Set(selected);
    if (next.has(ch)) next.delete(ch);
    else next.add(ch);
    update(next);
  };
  const toggleGroup = (g: Group) => {
    const next = new Set(selected);
    const allOn = g.chars.every((c) => next.has(c));
    for (const c of g.chars) {
      if (allOn) next.delete(c);
      else next.add(c);
    }
    update(next);
  };

  if (loadError) return <p className="text-sm text-rose-600 mt-3">{loadError}</p>;
  if (!rows) return <p className="text-sm text-slate-500 mt-3">Loading characters…</p>;

  const total = groups.reduce((n, g) => n + g.chars.length, 0);
  return (
    <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`text-sm font-bold ${selected.size < MIN_CHARACTERS ? 'text-rose-600' : 'text-slate-700 dark:text-slate-200'}`}>
          {selected.size} of {total} chosen
          {selected.size < MIN_CHARACTERS && ` — choose at least ${MIN_CHARACTERS}`}
        </p>
        <div className="flex gap-3 text-xs font-bold">
          <button type="button" onClick={() => update(new Set(groups.flatMap((g) => g.chars)))} className="text-indigo-600 underline cursor-pointer">
            Select all
          </button>
          <button type="button" onClick={() => update(new Set())} className="text-indigo-600 underline cursor-pointer">
            Clear
          </button>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
        {groups.map((g) => {
          const on = g.chars.filter((c) => selected.has(c)).length;
          return (
            <div key={g.id}>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer mb-1">
                <input type="checkbox" checked={on === g.chars.length} onChange={() => toggleGroup(g)} />
                <span>{g.label}</span>
                <span className="font-normal text-slate-400">
                  {on}/{g.chars.length}
                </span>
              </label>
              <div className="flex flex-wrap gap-1">
                {g.chars.map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    lang="ja"
                    aria-pressed={selected.has(ch)}
                    onClick={() => toggle(ch)}
                    className={`min-w-9 h-9 px-1.5 rounded-lg border text-base font-bold cursor-pointer transition ${
                      selected.has(ch)
                        ? 'border-indigo-500 bg-indigo-500 text-white'
                        : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        Questions and wrong choices come only from the characters you choose. Your choice is remembered on this device.
      </p>
    </div>
  );
}
