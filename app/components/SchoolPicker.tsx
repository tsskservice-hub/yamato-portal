/**
 * @file SchoolPicker.tsx
 * @description 州（または Outside Australia）と学校名の入力欄
 *  - オーストラリアの州を選ぶと、学校一覧（ref_au_schools）からその州の学校を候補に出す
 *  - 候補を選ぶと学校 ID も保存される（表記ゆれを防ぐ）。一覧にない学校は自由記述のまま保存できる
 *  - 学校一覧が空のあいだは、ただの自由記述欄として動く
 */
import React, { useEffect, useId, useRef, useState } from 'react';
import { supabase } from '~/lib/supabaseClient';
import { AU_STATES, OUTSIDE_AU, SCHOOL_NAME_MAX, isAuState } from '~/lib/teacher-config';

export type SchoolValue = { state: string; schoolName: string; schoolRefId: number | null };

type SchoolRow = { id: number; name: string; suburb: string | null; postcode: string | null };

type Props = {
  value: SchoolValue;
  onChange: (value: SchoolValue) => void;
  /** ラベル・入力欄のクラス（画面ごとの見た目に合わせる） */
  labelClassName?: string;
  inputClassName?: string;
  stateLabel?: React.ReactNode;
  schoolLabel?: React.ReactNode;
  className?: string;
};

/** ilike に渡すため、% と _ とカンマ・括弧を取り除く */
function cleanQuery(q: string) {
  return q.replace(/[%_,()\\]/g, ' ').trim().replace(/\s+/g, ' ');
}

export function SchoolPicker({
  value,
  onChange,
  labelClassName = 'block text-sm font-medium text-gray-700 mb-1',
  inputClassName = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none',
  stateLabel = 'State',
  schoolLabel = 'School name',
  className = 'grid grid-cols-1 md:grid-cols-2 gap-4',
}: Props) {
  const baseId = useId();
  const listId = `${baseId}-schools`;
  const [results, setResults] = useState<SchoolRow[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canSearch = isAuState(value.state);
  const query = cleanQuery(value.schoolName);

  // 入力が止まってから 200ms 後に、その州の学校を検索する
  useEffect(() => {
    if (!canSearch || query.length < 2 || value.schoolRefId) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data, error } = await supabase
        .from('ref_au_schools')
        .select('id, name, suburb, postcode')
        .eq('state', value.state)
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(8);
      if (cancelled) return;
      if (error) {
        setResults([]);
        return;
      }
      setResults((data ?? []) as SchoolRow[]);
      setActive(-1);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [canSearch, query, value.state, value.schoolRefId]);

  const choose = (row: SchoolRow) => {
    onChange({ ...value, schoolName: row.name, schoolRefId: row.id });
    setOpen(false);
    setResults([]);
  };

  const showList = open && results.length > 0;

  return (
    <div className={className}>
      <div>
        <label htmlFor={`${baseId}-state`} className={labelClassName}>{stateLabel}</label>
        <select
          id={`${baseId}-state`}
          value={value.state}
          onChange={(e) => onChange({ state: e.target.value, schoolName: e.target.value ? value.schoolName : '', schoolRefId: null })}
          className={inputClassName}
        >
          <option value="">Prefer not to say</option>
          {AU_STATES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
          <option value={OUTSIDE_AU}>Outside Australia</option>
        </select>
      </div>

      <div className="relative">
        <label htmlFor={`${baseId}-school`} className={labelClassName}>{schoolLabel}</label>
        <input
          id={`${baseId}-school`}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          value={value.schoolName}
          maxLength={SCHOOL_NAME_MAX}
          disabled={!value.state}
          placeholder={!value.state ? 'Choose your state first' : canSearch ? 'Start typing your school name' : 'Your school name'}
          onChange={(e) => {
            // 文字を変えたら「一覧から選んだ学校」ではなくなる
            onChange({ ...value, schoolName: e.target.value, schoolRefId: null });
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={(e) => {
            if (!showList) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter' && active >= 0) {
              e.preventDefault();
              choose(results[active]);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          className={`${inputClassName} disabled:bg-gray-100 disabled:text-gray-400`}
        />
        {value.schoolRefId && (
          <span className="absolute right-2 top-[2.1rem] text-[10px] font-bold text-emerald-600 pointer-events-none">✓ listed</span>
        )}

        {showList && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 w-full max-h-64 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg text-left"
            onMouseDown={() => blurTimer.current && clearTimeout(blurTimer.current)}
          >
            {results.map((row, i) => (
              <li
                key={row.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(row);
                }}
                className={`px-3 py-2 cursor-pointer text-sm ${i === active ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <span className="text-slate-900">{row.name}</span>
                {(row.suburb || row.postcode) && (
                  <span className="block text-[11px] text-gray-500">{[row.suburb, row.postcode].filter(Boolean).join(' ')}</span>
                )}
              </li>
            ))}
            <li className="px-3 py-1.5 text-[10px] text-gray-400 border-t border-gray-100">
              Not listed? Just keep typing your school name.
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}

export default SchoolPicker;
