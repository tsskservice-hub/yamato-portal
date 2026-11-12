/**
 * @file app/routes/vce.writing._index.tsx
 * @description VCE Writing セクションのハブページ（kl_app テーブル・CONTENT_VCE_WRITING 対応版）
 */

import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React from 'react';
import { Link } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import { generateModuleMeta } from '~/utils/seoMeta';
import { useVceWritingContent } from '~/data/content-vce-writing';
import { supabase } from '~/lib/supabaseClient';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  let portalContent = null;
  
  try {
    const { data: portalData } = await supabase
      .from('kl_app')
      .select('content')
      .eq('key', 'PORTAL_CONTENT')
      .single();
    portalContent = portalData?.content || null;
  } catch (e) {}

  return json({
    portalContent,
    currentPath: url.pathname,
  });
}

export default function VceWritingIndex() {
  const { vceWritingData, isLoading, isError, errorMessage, refetch } = useVceWritingContent(supabase);

  // vceWritingData.modules から直接モジュール配列を取得
  const modules = vceWritingData?.modules || [];

  return (
    <ToolPageWrapper 
      breadcrumbTitle="VCE Writing"
      hasError={isError}
      errorTitle="Failed to Load Writing Content"
      errorMessage={errorMessage || "Could not retrieve VCE writing modules content from kl_app. Please check your connection and try again."}
      onRetry={refetch}
    >
      <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* ローディング中の表示 */}
          {isLoading && !vceWritingData ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-4"></div>
              <p className="text-slate-600 font-medium">Loading VCE writing modules...</p>
            </div>
          ) : (
            <>
              {/* ヘッダーセクション */}
              <div className="text-center mb-12">
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl mb-4">
                  VCE Writing Assessment Hub
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                  Master VCE Japanese written examinations through structured stylistic practice, manuscript editing tools, and comprehensive AI evaluation.
                </p>
              </div>

              {/* モジュールカード一覧 */}
              <div className="mb-12">
                <div className="mb-6 border-b border-slate-200 pb-3">
                  <h2 className="text-2xl font-bold text-slate-900">Writing Modules & Tools</h2>
                  <p className="text-sm text-slate-500 mt-1">Select a module to sharpen your written expression and kanji accuracy</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {modules.map((module: any) => (
                    <div 
                      key={module.id} 
                      className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          {module.category && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                              {module.category}
                            </span>
                          )}
                          {module.isComingSoon ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                              Coming Soon
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                              Active
                            </span>
                          )}
                        </div>
                        
                        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                          {module.name}
                        </h3>
                        
                        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                          {module.description}
                        </p>
                      </div>

                      <div>
                        {module.isComingSoon ? (
                          <span className="inline-block w-full text-center py-2.5 px-4 bg-slate-100 text-slate-400 font-medium rounded-xl cursor-not-allowed">
                            Coming Soon
                          </span>
                        ) : (
                          <Link
                            to={module.path}
                            className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors shadow-sm"
                          >
                            {module.actionLabel || "Explore"}
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageWrapper>
  );
}

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta((data as any)?.portalContent || null, (data as any)?.currentPath || "");
};