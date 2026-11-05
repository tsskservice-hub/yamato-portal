/**
 * @file app/routes/reference._index.tsx
 * @description Reference セクションのハブページ（Text Types & Writing Styles 統合版）
 */

import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React from 'react';
import { Link, useLoaderData } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/ToolPageWrapper';
import { generateModuleMeta } from '~/utils/seoMeta';
import { supabase } from '~/lib/supabaseClient';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  let portalContent = null;
  
  try {
    const { data: portalData } = await supabase
      .from('portal_settings')
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

export default function ReferenceIndex() {
  const referenceModules = [
    {
      id: "text-types",
      name: "Text Types",
      category: "Framework",
      badge: "Essential",
      description: "Explore structural guidelines, formats, and conventions for various Japanese text types required in assessments and writing exams.",
      path: "/reference/text-types",
      actionLabel: "View Text Types",
      isComingSoon: false,
    },
    {
      id: "writing-styles",
      name: "Writing Styles",
      category: "Framework",
      badge: "Essential",
      description: "Master the five core writing styles (informative, evaluative, persuasive, personal, and imaginative) with stylistic examples and phrasing guides.",
      path: "/reference/writing-styles",
      actionLabel: "View Writing Styles",
      isComingSoon: false,
    }
  ];

  return (
    <ToolPageWrapper 
      breadcrumbTitle="Reference Guide"
    >
      <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* ヘッダーセクション */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl mb-4">
              Reference & Style Guides
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Comprehensive reference materials for Japanese text types, structural formats, and stylistic writing conventions.
            </p>
          </div>

          {/* カード一覧 */}
          <div className="mb-12">
            <div className="mb-6 border-b border-slate-200 pb-3">
              <h2 className="text-2xl font-bold text-slate-900">Reference Categories</h2>
              <p className="text-sm text-slate-500 mt-1">Select a guide to review structural rules and formatting requirements</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {referenceModules.map((module) => (
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
                      {module.badge && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                          {module.badge}
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
                        {module.actionLabel}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ToolPageWrapper>
  );
}

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta((data as any)?.portalContent || null, (data as any)?.currentPath || "");
};