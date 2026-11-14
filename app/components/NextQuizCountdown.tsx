/**
 * @file NextQuizCountdown.tsx
 * @description 「Next quiz in 三時間二十分」の表示。時間の部分だけ日本語（漢数字）にして、簡単な日本語に触れる機会にする。
 *   マウスを乗せると英語（3 h 20 min）が出る。30 秒ごとに更新し、0 になったら onReached を呼ぶ。
 */
import React, { useEffect, useState } from 'react';
import { formatEnglishDuration, formatKanjiDuration } from '~/lib/dailyQuiz';

type Props = {
  /** 次のクイズを解ける時刻（ミリ秒） */
  nextAt: number;
  onReached?: () => void;
  className?: string;
};

export function NextQuizCountdown({ nextAt, onReached, className = '' }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [nextAt]);

  const secondsLeft = Math.max(0, Math.round((nextAt - now) / 1000));

  useEffect(() => {
    if (secondsLeft <= 0) onReached?.();
  }, [secondsLeft, onReached]);

  if (secondsLeft <= 0) return null;

  return (
    <span className={className}>
      Next quiz in{' '}
      <span lang="ja" className="font-bold" title={formatEnglishDuration(secondsLeft)}>
        {formatKanjiDuration(secondsLeft)}
      </span>
    </span>
  );
}

export default NextQuizCountdown;
