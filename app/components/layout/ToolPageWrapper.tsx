/**
 * @file ToolPageWrapper.tsx
 * @description すべてのツールページで共通のSEOメタタグ、JSON-LD構造化データ、共通レイアウト（PageLayout）、および英語表記に統一されたエラーハンドリング（DataErrorState）を自動統合するラッパーコンポーネント (v3)
 */
import React, { type RefObject } from 'react';
import { useLoaderData } from '@remix-run/react';
import PageLayout, { type PageLayoutRef } from './PageLayout';
import { DataErrorState } from '../DataErrorState';
import { generatePageJsonLd } from '../../utils/seoJsonLd';

/**
 * 日本語のエラータイトルやシステム文字列を標準的な英語表記へ変換・フォーマットする関数
 */
export function formatEnglishErrorTitle(title?: string, message?: string): string {
  const combined = `${title || ''} ${message || ''}`.toLowerCase();

  // 認証・アクセス権限関連
  if (combined.includes('認証') || combined.includes('ログイン') || combined.includes('unauthorized') || combined.includes('401')) {
    return 'Authentication Error';
  }
  if (combined.includes('権限') || combined.includes('アクセス') || combined.includes('forbidden') || combined.includes('403')) {
    return 'Access Denied';
  }

  // ネットワーク・通信関連
  if (combined.includes('通信') || combined.includes('ネットワーク') || combined.includes('network') || combined.includes('fetch')) {
    return 'Connection Error';
  }

  // リソース未検出
  if (combined.includes('見つかりません') || combined.includes('存在しません') || combined.includes('not found') || combined.includes('404')) {
    return 'Data Not Found';
  }

  // サーバーエラー
  if (combined.includes('サーバー') || combined.includes('障害') || combined.includes('server') || combined.includes('500')) {
    return 'Server Error';
  }

  // title が明示的に渡されており、すでに半角英数字・記号のみの場合はそのまま採用
  if (title && /^[a-zA-Z0-9\s.,!?'"():;\-_/\\]+$/.test(title.trim())) {
    return title.trim();
  }

  // デフォルト英語タイトル
  return 'An Error Occurred';
}

/**
 * 日本語のエラーメッセージやシステムエラー文字列を標準的な英語表記へ変換・フォーマットする関数
 */
export function formatEnglishErrorMessage(message?: string): string {
  if (!message) {
    return 'An unexpected error occurred. Please try again later.';
  }

  const msg = message.trim();
  const lower = msg.toLowerCase();

  // 認証・セッション関連エラー
  if (lower.includes('認証') || lower.includes('ログイン') || lower.includes('unauthorized') || lower.includes('401')) {
    return 'Authentication required. Please log in to continue.';
  }
  if (lower.includes('権限') || lower.includes('アクセス') || lower.includes('forbidden') || lower.includes('403')) {
    return 'You do not have permission to access this resource.';
  }

  // ネットワーク・通信エラー
  if (lower.includes('通信') || lower.includes('ネットワーク') || lower.includes('network') || lower.includes('fetch failed')) {
    return 'Network error. Please check your internet connection and try again.';
  }

  // リソース未検出 (404)
  if (lower.includes('見つかりません') || lower.includes('存在しません') || lower.includes('not found') || lower.includes('404')) {
    return 'The requested resource or data could not be found.';
  }

  // サーバー内部エラー (500)
  if (lower.includes('サーバー') || lower.includes('障害') || lower.includes('server error') || lower.includes('500')) {
    return 'Internal server error. Please try again after a few moments.';
  }

  // すでに英語のみで構成されている場合はそのまま出力
  if (/^[a-zA-Z0-9\s.,!?'"():;\-_/\\]+$/.test(msg)) {
    return msg;
  }

  // 日本語メッセージが含まれている場合は、標準的な英語文言を返しつつ詳細メッセージとして整形
  return 'An error occurred while processing your request. Please try again.';
}

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
  /** エラー表示タイトル（自動的に適切な英語タイトルに統一されます） */
  errorTitle?: string;
  /** エラーメッセージの本文/詳細（自動的に英語に統一されます） */
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
  const jsonLdData = generatePageJsonLd(currentPath || '', portalContent);

  // エラータイトルとメッセージを統一された英語表記に整形
  const formattedErrorTitle = formatEnglishErrorTitle(errorTitle, errorMessage);
  const formattedErrorMessage = formatEnglishErrorMessage(errorMessage);

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

      {/* エラー判定: エラー発生時は英語表記に統一された DataErrorState、正常時は children を描画 */}
      {hasError ? (
        <DataErrorState
          title={formattedErrorTitle}
          message={formattedErrorMessage}
          errorMessage={formattedErrorMessage}
          onRetry={onRetry}
        />
      ) : (
        children
      )}
    </PageLayout>
  );
}

export default ToolPageWrapper;