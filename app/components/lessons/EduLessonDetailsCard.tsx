/**
 * @file app/components/lessons/EduLessonDetailsCard.tsx
 * @description 「このレッスンで学ぶこと」の目次・一覧カード（全レッスン共通）
 *   上に目次（項目と数）、その下に項目ごとの一覧を出す：
 *     💬 Key Expressions … 会話で使う文・フレーズ（edu_lessons.key_expressions）
 *     🛠️ Grammar         … 文法のポイント（edu_lessons.target_grammar）
 *     📝 Vocabulary      … 語彙（kl_vocabulary。全部の一覧と音声は右の語彙カード）
 *     🎎 Culture         … 文化タスクのテーマ（app/data/culture-tasks.ts）
 *   中身が無い項目は出さない。最後に対応する教科書を小さく添える。
 */

import React from "react";
import { EduFlexibleDataRenderer } from "./EduFlexibleDataRenderer";
import { formatTextbookRef, TEXTBOOK_DISCLAIMER, type TextbookRef } from "~/lib/lessonTextbooks";
import type { CultureTask } from "~/data/culture-tasks";

interface EduLessonDetailsCardProps {
  lesson: any;
  /** このレッスンが対応する教科書・ユニット（edu_lesson_textbook_units） */
  textbookRefs?: TextbookRef[];
  /** このレッスンの語彙（kl_vocabulary） */
  vocabulary?: any[];
  /** このレッスンの文化タスク */
  cultureTask?: CultureTask | null;
}

/** JSON の文字列でも配列でも受け取れるようにする */
function parseList(value: unknown): any[] | null {
  let v = value;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return null;
    }
  }
  return Array.isArray(v) ? v : null;
}

const isExpression = (x: any) => x && typeof x === "object" && ("jp" in x || "en" in x);
const isGrammar = (x: any) => x && typeof x === "object" && ("grammar" in x || "explanation" in x);

/** 項目の見出し（目次からのジャンプ先） */
const SectionTitle: React.FC<{ id: string; emoji: string; title: string; subtitle: string; count?: number }> = ({
  id,
  emoji,
  title,
  subtitle,
  count,
}) => (
  <div id={id} className="flex items-center gap-3 scroll-mt-24">
    <span className="text-2xl" aria-hidden="true">
      {emoji}
    </span>
    <div className="min-w-0">
      <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight">
        {title}
        {typeof count === "number" && <span className="ml-2 text-sm font-bold text-slate-400">({count})</span>}
      </h3>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
  </div>
);

export const EduLessonDetailsCard: React.FC<EduLessonDetailsCardProps> = ({
  lesson,
  textbookRefs = [],
  vocabulary = [],
  cultureTask = null,
}) => {
  const expressionsRaw = parseList(lesson?.key_expressions);
  const grammarRaw = parseList(lesson?.target_grammar);
  const expressions = expressionsRaw?.every(isExpression) ? expressionsRaw : null;
  const grammar = grammarRaw?.every(isGrammar) ? grammarRaw : null;
  // 形が決まっていないデータは、今までどおりそのまま表示する
  const hasExpressions = Boolean(lesson?.key_expressions) && (expressions ? expressions.length > 0 : true);
  const hasGrammar = Boolean(lesson?.target_grammar) && (grammar ? grammar.length > 0 : true);
  const hasVocabulary = vocabulary.length > 0;
  const hasCulture = Boolean(cultureTask);

  const toc = [
    hasExpressions && { id: "learn-expressions", emoji: "💬", label: "Key Expressions", count: expressions?.length },
    hasGrammar && { id: "learn-grammar", emoji: "🛠️", label: "Grammar", count: grammar?.length },
    hasVocabulary && { id: "learn-vocabulary", emoji: "📝", label: "Vocabulary", count: vocabulary.length },
    hasCulture && { id: "learn-culture", emoji: "🎎", label: "Culture", count: undefined },
  ].filter(Boolean) as { id: string; emoji: string; label: string; count?: number }[];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <span className="text-2xl" aria-hidden="true">📖</span>
          <span>What You'll Learn</span>
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          The language and culture in this lesson. You will use all of it in the six tasks.
        </p>
      </div>

      {!lesson ? (
        <p className="text-sm text-slate-500 italic">No lesson data found in database.</p>
      ) : toc.length === 0 ? (
        <p className="text-sm text-slate-500 italic">The learning content for this lesson is coming soon.</p>
      ) : (
        <>
          {/* 目次 */}
          <nav aria-label="Lesson contents" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {toc.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="flex flex-col items-center gap-1 rounded-2xl border border-orange-100 dark:border-orange-900/50 bg-orange-50/70 dark:bg-orange-950/30 px-3 py-3 text-center hover:border-orange-300 dark:hover:border-orange-700 transition"
              >
                <span className="text-xl" aria-hidden="true">{item.emoji}</span>
                <span className="text-xs sm:text-sm font-black text-orange-800 dark:text-orange-300 leading-tight">{item.label}</span>
                {typeof item.count === "number" && (
                  <span className="text-[11px] font-bold text-orange-600/80 dark:text-orange-400/80">{item.count} items</span>
                )}
              </a>
            ))}
          </nav>

          <div className="space-y-7">
            {/* 💬 キー表現：会話で使う文・フレーズ */}
            {hasExpressions && (
              <section className="space-y-3">
                <SectionTitle
                  id="learn-expressions"
                  emoji="💬"
                  title="Key Expressions"
                  subtitle="Sentences and phrases you will say and hear"
                  count={expressions?.length}
                />
                {expressions ? (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    {expressions.map((ex, i) => (
                      <li key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-4 px-4 py-3 bg-white dark:bg-slate-900">
                        <div className="min-w-0">
                          <p className="text-lg font-bold text-slate-900 dark:text-slate-100 break-words">{ex.jp}</p>
                          {ex.romaji && <p className="text-xs text-slate-400 dark:text-slate-500">{ex.romaji}</p>}
                        </div>
                        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 sm:self-center break-words">{ex.en}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EduFlexibleDataRenderer data={lesson.key_expressions} />
                )}
              </section>
            )}

            {/* 🛠️ 文法 */}
            {hasGrammar && (
              <section className="space-y-3">
                <SectionTitle id="learn-grammar" emoji="🛠️" title="Grammar" subtitle="Patterns to build your sentences" count={grammar?.length} />
                {grammar ? (
                  <ul className="space-y-2.5">
                    {grammar.map((g, i) => (
                      <li key={i} className="rounded-2xl border-l-4 border-orange-400 bg-orange-50/60 dark:bg-orange-950/20 px-4 py-3 space-y-1">
                        {g.grammar && <p className="text-base sm:text-lg font-black text-orange-900 dark:text-orange-200 break-words">{g.grammar}</p>}
                        {g.explanation && <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">{g.explanation}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EduFlexibleDataRenderer data={lesson.target_grammar} />
                )}
              </section>
            )}

            {/* 📝 語彙：一覧だけ。音声と練習は語彙カード */}
            {hasVocabulary && (
              <section className="space-y-3">
                <SectionTitle
                  id="learn-vocabulary"
                  emoji="📝"
                  title="Vocabulary"
                  subtitle="Words for this lesson – listen and practise in the Vocabulary card"
                  count={vocabulary.length}
                />
                <ul className="flex flex-wrap gap-2">
                  {vocabulary.map((v, i) => (
                    <li
                      key={v.id ?? i}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5"
                    >
                      <span className="text-base font-bold text-slate-900 dark:text-slate-100">{v.jp_text}</span>
                      {v.english_text && (
                        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{v.english_text}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* 🎎 文化 */}
            {cultureTask && (
              <section className="space-y-3">
                <SectionTitle id="learn-culture" emoji="🎎" title="Culture" subtitle="A picture story about life in Japan (Task 6)" />
                <div className="rounded-2xl border border-rose-100 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20 px-4 py-3 space-y-1">
                  <p className="text-base sm:text-lg font-black text-rose-900 dark:text-rose-200">{cultureTask.title}</p>
                  {cultureTask.summary && (
                    <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">{cultureTask.summary}</p>
                  )}
                </div>
              </section>
            )}
          </div>
        </>
      )}

      {/* 対応する教科書・ユニット（目次の補足として小さく） */}
      {lesson && textbookRefs.length > 0 && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Textbook:</span>
            {textbookRefs.map((ref, i) => (
              <span
                key={i}
                title={ref.note ?? undefined}
                className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 px-3 py-1 rounded-full border border-orange-200 dark:border-orange-900"
              >
                📚 {formatTextbookRef(ref)}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">{TEXTBOOK_DISCLAIMER}</p>
        </div>
      )}
    </div>
  );
};
