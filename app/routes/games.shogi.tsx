/**
 * @file games.shogi.tsx
 * @description Shogi（HTML ゲームを iframe で表示。ログインと先生のロックは GameAccessGate が確認する）
 */
import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import React, { useRef } from 'react';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import type { PageLayoutRef } from '~/components/layout/PageLayout';
import { IframeGamePage } from '~/components/games/IframeGamePage';
import { generateModuleMeta } from '~/utils/seoMeta';
import { loadGamePage } from '~/lib/game-page.server';

export const loader = ({ request }: LoaderFunctionArgs) => loadGamePage(request);

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) =>
  generateModuleMeta(data?.portalContent || null, data?.currentPath || '');

export default function ShogiRoute() {
  const layoutRef = useRef<PageLayoutRef>(null);
  return (
    <ToolPageWrapper layoutRef={layoutRef} breadcrumbTitle="Shogi">
      <IframeGamePage
        layoutRef={layoutRef}
        name="shogi"
        title="Shogi"
        description="Enjoy a tactical game of Shogi (Japanese chess) against the computer!"
      />
    </ToolPageWrapper>
  );
}
