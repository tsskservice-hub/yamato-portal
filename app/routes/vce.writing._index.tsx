/**
 * @file app/routes/vce.writing._index.tsx
 * @description VCE Writing セクションのハブページ
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

export default function VceWritingIndex() {
  const writingModules = [
    {
      id: "writing-tasks-110",
      name: "110 VCE Writing Tasks",
      category: "Writing Practice",
      badge: "Active",
      description: "Access 110 structured writing tasks ordered by style (~shinasai phrasing) across informative, evaluative, persuasive, personal, and imaginative writing.",
      path: "/vce/writing/tasks",
      actionLabel: "Explore Writing Tasks",
      isComingSoon: false,
    },
    {
      id: "genkoyoshi-editor",
      name: "Genkoyoshi Manuscript Editor",
      category: "Tools",
      badge: "Essential",
      description: "Write and edit your Japanese essays using traditional manuscript paper grid alignment with instant character count and layout checks.",
      path: "/vce/writing/genkoyoshi",
      actionLabel: "Open Genkoyoshi",
      isComingSoon: false,
    },
    {
      id: "ai-writing-feedback",
      name: "AI Writing Feedback & Grading",
      category: "AI Evaluation",
      badge: "Active",
      description: "Receive detailed criterion-referenced feedback, grammatical corrections, and vocabulary enhancements for your drafted responses.",
      path: "/vce/writing/feedback",
      actionLabel: "Check Writing",
      isComingSoon: false,
    }
  ];

  return (
    <ToolPageWrapper 
      breadcrumbTitle="VCE Writing"
    >
      <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* ヘッダーセクション */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl mb-4">
              VCE Writing Assessment Hub
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Master VCE Japanese written examinations through structured stylistic practice, manuscript editing tools, and comprehensive AI evaluation.
            </p>
          </div>

          {/* カード一覧 */}
          <div className="mb-12">
            <div className="mb-6 border-b border-slate-200 pb-3">
              <h2 className="text-2xl font-bold text-slate-900">Writing Modules & Tools</h2>
              <p className="text-sm text-slate-500 mt-1">Select a module to sharpen your written expression and kanji accuracy</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {writingModules.map((module) => (
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