/**
 * @file DashboardJumpNav.tsx
 * @description 教師ダッシュボードの上にある、ページ内のジャンプボタン
 *   上段: 日々よく使うもの（ページの上のほうにある）／下段: たまに使う設定（ページの下のほうにある）
 */
import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { Link } from '@remix-run/react';
import type { DashboardData } from '~/components/teacher/TeacherDashboardSections';

type Jump = { id: string; label: string; show?: boolean };

export function DashboardJumpNav({ data }: { data: DashboardData }) {
  const hasClasswork = data.assignmentsAvailable || data.homework.some((hw) => hw.kind === 'classwork');

  const daily: Jump[] = [
    { id: 'td-assign', label: 'Set Homework / Classwork' },
    { id: 'td-homework', label: 'Homework' },
    { id: 'td-classwork', label: 'Classwork', show: hasClasswork },
    { id: 'td-completion', label: 'Completion' },
    { id: 'td-quizzes', label: 'Vocabulary Quizzes', show: data.assignmentsAvailable },
    { id: 'td-handwriting', label: 'Handwritten Writing' },
    { id: 'td-students', label: `Students (${data.students.length})` },
  ];
  const settings: Jump[] = [
    { id: 'td-class-code', label: 'Class Code' },
    { id: 'td-invites', label: 'Personal Invite Codes' },
    { id: 'td-games', label: 'Games' },
    { id: 'td-school-hours', label: 'School Hours' },
    { id: 'td-vocab-length', label: 'Vocabulary Drill Length' },
  ];

  const row = (title: string, items: Jump[], style: string) => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:w-20 shrink-0">{title}</span>
      <div className="flex flex-wrap gap-1.5">
        {items.filter((j) => j.show !== false).map((j) => (
          <a key={j.id} href={`#${j.id}`} className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${style}`}>
            {j.label}
          </a>
        ))}
      </div>
    </div>
  );

  return (
    <nav aria-label="Jump to a section" className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 space-y-2">
      {/* テストのページ（形成的・総括的評価に使える）へのリンク */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:w-20 shrink-0">Tests</span>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/test"
            className="text-xs font-bold px-3 py-1.5 rounded-full border bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 transition-colors"
          >
            📝 Tests: typing, kana, kanji, vocabulary, sentences →
          </Link>
          <span className="text-[11px] text-slate-400">For formative or summative assessment in class</span>
        </div>
      </div>
      {row('Daily', daily, 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100')}
      {row('Settings', settings, 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}
    </nav>
  );
}

/** 右下の「上へ戻る」ボタン。少し下までスクロールしたときだけ出る */
export function BackToTopButton() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 flex items-center justify-center cursor-pointer"
      aria-label="Back to top"
      title="Back to top"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}

export default DashboardJumpNav;
