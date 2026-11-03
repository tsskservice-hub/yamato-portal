/**
 * @file ToolPageWrapper.tsx
 * @description すべてのツールページで共通のSEOメタタグ、JSON-LD構造化データ、共通レイアウト（PageLayout）、およびエラーハンドリング（DataErrorState）を自動統合するラッパーコンポーネント
 */
import React, { type RefObject } from 'react';
import { useLoaderData } from '@remix-run/react';
import PageLayout, { type PageLayoutRef } from './PageLayout';
import { DataErrorState } from './DataErrorState';
import { generatePageJsonLd } from '../utils/seoJsonLd';

export type ToolPageWrapperProps = {
  /** ツールページのメインコンテンツ */
  children: React.ReactNode;
  /** PageLayout の ref（認証モーダルの手動オープン等に使用） */
  layoutRef?:
    | RefObject<PageLayoutRef | null>
    | React.MutableRefObject<PageLayoutRef | null>
    | RefObject<PageLayoutRef>;
  /** パンくずリストの末尾タイトル */
  breadcrumbTitle?: string;
  /** 認証必須ページかどうかのフラグ */
  requireAuth?: boolean;
  /** データ取得・処理時のエラー発生フラグ */
  hasError?: boolean;
  /** エラー表示タイトル (DataErrorState) */
  errorTitle?: string;
  /** エラーメッセージの本文/詳細 (DataErrorState) */
  errorMessage?: string;
  /** 再試行ボタン押下時のコールバック関数 */
  onRetry?: () => void;
};

export function ToolPageWrapper({
  children,
  layoutRef,
  breadcrumbTitle,
  requireAuth,
  hasError = false,
  errorTitle,
  errorMessage,
  onRetry,
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
    >
      {/* 検索エンジン用の構造化データ（JSON-LD）を自動埋め込み */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
      />

      {/* エラー判定: エラー発生時は DataErrorState、正常時は children を描画 */}
      {hasError ? (
        <DataErrorState
          title={errorTitle}
          message={errorMessage}
          errorMessage={errorMessage}
          onRetry={onRetry}
        />
      ) : (
        children
      )}
    </PageLayout>
  );
}

export default ToolPageWrapper;