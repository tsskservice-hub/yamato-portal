/**
 * @file app/routes/vce._index.tsx
 * @description VCE 学習ポータルのハブページ（kl_app テーブル・配列直接格納対応版）
 */

import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React from 'react';
import { Link } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/ToolPageWrapper';
import { generateModuleMeta } from '~/utils/seoMeta';
import { supabase } from '~/lib/supabaseClient';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  let portalContent = null;
  let vceHubData = null;
  
  try {
    // 共通ポータル設定の取得
    const { data: portalData } = await supabase
      .from('kl_app')
      .select('content')
      .eq('key', 'PORTAL_CONTENT')
      .single();
    portalContent = portalData?.content || null;

    // Supabase の kl_app から VCE ハブ用のデータ（モジュール配列が直接格納された形式）を取得
    const { data: vceData } = await supabase
      .from('kl_app')
      .select('content')
      .eq('key', 'CONTENT_VCE_HUB') // または対応するキー名
      .maybeSingle();
      
    vceHubData = vceData?.content || null;
  } catch (e) {}

  return json({
    portalContent,
    vceHubData,
    currentPath: url.pathname,
  });
}

export default function VceHubIndex() {
  // ローダー等から取得したデータ（フォールバックとしてデフォルトの配列を用意）
  const defaultModules = [
    {
      id: "vce-speaking",
      name: "VCE Speaking Section",
      category: "Speaking Hub",
      badge: "Active",
      description: "Access EOY oral drills, mock exams, and Section 1 & Section 2 preparation materials.",
      path: "/vce/speaking",
      actionLabel: "Open Speaking Hub",
      isComingSoon: false,
    },
    {
      id: "vce-writing",
      name: "VCE Writing Section",
      category: "Writing Hub",
      badge: "Active",
      description: "Explore 110 structured VCE writing tasks, Genkoyoshi manuscript editors, and AI feedback tools.",
      path: "/vce/writing",
      actionLabel: "Open Writing Hub",
      isComingSoon: false,
    },
    {
      id: "eoy-oral-drill",
      name: "EOY Oral Drill (Direct)",
      category: "Quick Drill",
      badge: "Recommended",
      description: "Jump straight into end-of-year oral exam practice with AI feedback and structured prompts.",
      path: "/vce/speaking/eoy-oral-drill",
      actionLabel: "Start Drill",
      isComingSoon: false,
    }
  ];

  // データが配列として直接格納されている場合はそのまま利用、オブジェクトの場合は modules を抽出
  // const data = useLoaderData<typeof loader>();
  // const rawModules = Array.isArray(data?.vceHubData) ? data.vceHubData : (data?.vceHubData?.modules || defaultModules);
  const rawModules = defaultModules; // 直接配列の形式に対応

  return (
    <ToolPageWrapper 
      breadcrumbTitle="VCE Japanese Hub"
    >
      <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* ヘッダーセクション */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl mb-4">
              VCE Japanese Study Portal
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Comprehensive preparation resources designed specifically for VCE Japanese Second Language and First Language students.
            </p>
          </div>

          {/* モジュールカード一覧（セクション分割なしの配列直接マップ） */}
          <div className="mb-12">
            <div className="mb-6 border-b border-slate-200 pb-3">
              <h2 className="text-2xl font-bold text-slate-900">VCE Assessment & Practice Hubs</h2>
              <p className="text-sm text-slate-500 mt-1">Select a module to begin your VCE preparation</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rawModules.map((module: any) => (
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
                        {module.actionLabel || "Explore"}
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