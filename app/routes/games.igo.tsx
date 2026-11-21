/**
 * @file games.igo.tsx
 * @description 9x9 Go（HTML ゲームを iframe で表示。ログインと先生のロックは GameAccessGate が確認する）
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

export default function IgoRoute() {
  const layoutRef = useRef<PageLayoutRef>(null);
  return (
    <ToolPageWrapper layoutRef={layoutRef} breadcrumbTitle="9x9 Go">
      <IframeGamePage
        layoutRef={layoutRef}
        name="go"
        title="9x9 Go"
        description="Enjoy a game of Go on a 9x9 board against Yamato-sensei!"
      />
    </ToolPageWrapper>
  );
}
