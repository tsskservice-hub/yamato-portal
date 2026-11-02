/**
 * @file ToolPageWrapper.tsx
 * @description すべてのツールページで共通のSEOメタタグ、JSON-LD構造化データ、レイアウトを自動統合するラッパーコンポーネント
 */
import React, { type RefObject } from 'react';
import { useLoaderData } from '@remix-run/react';
import PageLayout, { type PageLayoutRef } from './PageLayout';
import { generatePageJsonLd } from '../utils/seoJsonLd';

type ToolPageWrapperProps = {
  children: React.ReactNode;
  // 💡 型エラー解消のため、null許容型も含めた柔軟なRefの型定義に修正
  layoutRef?: RefObject<PageLayoutRef | null> | React.MutableRefObject<PageLayoutRef | null> | RefObject<PageLayoutRef>;
  breadcrumbTitle?: string;
  requireAuth?: boolean;
  isDarkMode?: boolean;
};

export function ToolPageWrapper({
  children,
  layoutRef,
  breadcrumbTitle,
  requireAuth,
  isDarkMode = false
}: ToolPageWrapperProps) {
  // Remix の loader から共通で portalContent と currentPath を受け取る
  const loaderData = useLoaderData<any>() || {};
  const { portalContent, currentPath } = loaderData;

  // 構造化データ（JSON-LD）を現在のパスとSupabaseデータに基づいて自動生成
  const jsonLdData = generatePageJsonLd(currentPath || "", portalContent);

  return (
    <PageLayout 
      ref={layoutRef as any} 
      breadcrumbTitle={breadcrumbTitle}
      requireAuth={requireAuth}
      isDarkMode={isDarkMode}
    >
      {/* 検索エンジン用の構造化データ（JSON-LD）を自動埋め込み */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
      />

      {/* 各ツールの本体コンテンツ */}
      {children}
    </PageLayout>
  );
}