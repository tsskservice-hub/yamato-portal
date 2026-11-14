/**
 * @file games.prefecture-puzzle.tsx
 * @description Japan Prefecture Puzzle（HTML ゲームを iframe で表示。ログインと先生のロックは GameAccessGate が確認する）
 */
import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import React, { useRef } from 'react';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import type { PageLayoutRef } from '~/components/layout/PageLayout';
import { IframeGamePage } from '~/components/games/IframeGamePage';
import type { GameVariant } from '~/components/games/GameFrame';
import { generateModuleMeta } from '~/utils/seoMeta';
import { loadGamePage } from '~/lib/game-page.server';

export const loader = ({ request }: LoaderFunctionArgs) => loadGamePage(request);

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) =>
  generateModuleMeta(data?.portalContent || null, data?.currentPath || '');

// 都道府県パズルの Easy / Hard（同じ HTML を ?version= で切り替える。両方読み込んだままなので進み具合が残る）
const VARIANTS: GameVariant[] = [
  { key: 'easy', label: 'Easy', params: { version: 'easy' } },
  { key: 'hard', label: 'Hard', params: { version: 'hard' } },
];

export default function PrefecturePuzzleRoute() {
  const layoutRef = useRef<PageLayoutRef>(null);
  return (
    <ToolPageWrapper layoutRef={layoutRef} breadcrumbTitle="Japan Prefecture Puzzle">
      <IframeGamePage
        layoutRef={layoutRef}
        name="prefecture-puzzle"
        title="Japan Prefecture Puzzle"
        description="Test your geography skills by fitting all the prefectures of Japan into their correct places!"
        variants={VARIANTS}
      />
    </ToolPageWrapper>
  );
}
