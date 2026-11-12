/**
 * @file app/routes/vce._index.tsx
 * @description VCE 学習ポータルのハブページ（Speaking & Writing の動的データ統合版）
 */

import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React from 'react';
import { Link } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import { generateModuleMeta } from '~/utils/seoMeta';
import { useVceSpeakingContent } from '~/data/content-vce-speaking';
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

export default function VceHubIndex() {
  const { 
    vceSpeakingData, 
    isLoading: isSpeakingLoading, 
    isError: isSpeakingError, 
    errorMessage: speakingErrorMsg, 
    refetch: refetchSpeaking 
  } = useVceSpeakingContent(supabase);

  const { 
    vceWritingData, 
    isLoading: isWritingLoading, 
    isError: isWritingError, 
    errorMessage: writingErrorMsg, 
    refetch: refetchWriting 
  } = useVceWritingContent(supabase);

  const isLoading = isSpeakingLoading || isWritingLoading;
  const isError = isSpeakingError || isWritingError;
  const errorMessage = speakingErrorMsg || writingErrorMsg;

  const handleRetry = () => {
    refetchSpeaking();
    refetchWriting();
  };

  const speakingModules = (vceSpeakingData as any)?.modules || [];
  const writingModules = (vceWritingData as any)?.modules || [];

  return (
    <ToolPageWrapper 
      breadcrumbTitle="VCE Japanese Hub"
      hasError={isError}
      errorTitle="Failed to Load VCE Content"
      errorMessage={errorMessage || "Could not retrieve VCE modules content from kl_app. Please check your connection and try again."}
      onRetry={handleRetry}
    >
      <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {isLoading && !vceSpeakingData && !vceWritingData ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-4"></div>
              <p className="text-slate-600 font-medium">Loading VCE study portals...</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-12">
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl mb-4">
                  VCE Japanese Study Portal
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                  Comprehensive preparation resources designed specifically for VCE Japanese Second Language and First Language students.
                </p>
              </div>

              {/* Speaking セクション */}
              <div className="mb-12">
                <div className="mb-6 border-b border-slate-200 pb-3">
                  <h2 className="text-2xl font-bold text-slate-900">VCE Speaking Assessment</h2>
                  <p className="text-sm text-slate-500 mt-1">Oral exam preparation, interactive drills, and GPT Realtime practice</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {speakingModules.map((module: any) => {
                    const isAccelerated = module.id === 'eoy-oral-accelerated';
                    return (
                      <div 
                        key={module.id} 
                        className={`bg-white rounded-2xl shadow-sm border p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group ${
                          isAccelerated 
                            ? 'border-violet-300 dark:border-violet-800/80 bg-gradient-to-br from-violet-50/30 to-white' 
                            : 'border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            {module.category && (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                isAccelerated ? 'bg-violet-100 text-violet-700' : 'bg-indigo-50 text-indigo-700'
                              }`}>
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
                              className={`inline-flex items-center justify-center w-full py-2.5 px-4 font-medium rounded-xl transition-colors shadow-sm ${
                                isAccelerated ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              }`}
                            >
                              {module.actionLabel || "Launch"}
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Writing セクション */}
              <div className="mb-12">
                <div className="mb-6 border-b border-slate-200 pb-3">
                  <h2 className="text-2xl font-bold text-slate-900">VCE Writing Examination & Tools</h2>
                  <p className="text-sm text-slate-500 mt-1">Writing tasks, manuscript editors, and AI feedback</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {writingModules.map((module: any) => (
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