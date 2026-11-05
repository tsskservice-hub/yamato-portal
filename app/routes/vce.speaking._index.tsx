/**
 * @file app/routes/vce.speaking._index.tsx
 * @description VCE Speaking セクションのハブページ
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

export default function VceSpeakingIndex() {
  const speakingDrills = [
    {
      id: "eoy-oral-drill",
      name: "EOY Oral Drill & Mock Exam",
      category: "Oral Exam",
      badge: "Active",
      description: "Interactive end-of-year oral exam practice featuring detailed questioning, AI voice guidance, and structured phrase banks.",
      path: "/vce/speaking/eoy-oral-drill",
      actionLabel: "Launch EOY Drill",
      isComingSoon: false,
    },
    {
      id: "detailed-study-discussion",
      name: "Detailed Study Discussion Drill",
      category: "Section 2",
      badge: "Soon",
      description: "Practice defending your detailed study topic, artwork, or text with targeted examiner follow-up questions.",
      path: "#",
      actionLabel: "Coming Soon",
      isComingSoon: true,
    },
    {
      id: "general-conversation-drill",
      name: "General Conversation Practice",
      category: "Section 1",
      badge: "Soon",
      description: "Build fluency and natural pacing for personal world, school life, and future plans discussions.",
      path: "#",
      actionLabel: "Coming Soon",
      isComingSoon: true,
    }
  ];

  return (
    <ToolPageWrapper 
      breadcrumbTitle="VCE Speaking"
    >
      <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* ヘッダーセクション */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl mb-4">
              VCE Speaking Assessment Hub
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Master your VCE Japanese oral examinations through realistic simulated drills, AI dialogue partners, and structured pronunciation practice.
            </p>
          </div>

          {/* カード一覧 */}
          <div className="mb-12">
            <div className="mb-6 border-b border-slate-200 pb-3">
              <h2 className="text-2xl font-bold text-slate-900">Oral Practice Modules</h2>
              <p className="text-sm text-slate-500 mt-1">Select an oral practice drill to begin your session</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {speakingDrills.map((drill) => (
                <div 
                  key={drill.id} 
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      {drill.category && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                          {drill.category}
                        </span>
                      )}
                      {drill.badge && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                          {drill.badge}
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                      {drill.name}
                    </h3>
                    
                    <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                      {drill.description}
                    </p>
                  </div>

                  <div>
                    {drill.isComingSoon ? (
                      <span className="inline-block w-full text-center py-2.5 px-4 bg-slate-100 text-slate-400 font-medium rounded-xl cursor-not-allowed">
                        Coming Soon
                      </span>
                    ) : (
                      <Link
                        to={drill.path}
                        className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors shadow-sm"
                      >
                        {drill.actionLabel}
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