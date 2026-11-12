/**
 * @file app/routes/legal._index.tsx
 * @description Legal & Privacy Policy ハブページ
 */

import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React from 'react';
import { Link, useLoaderData } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
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

export default function LegalIndex() {
  const legalDocuments = [
    {
      id: "terms-of-service",
      name: "Terms of Service",
      category: "Agreement",
      badge: "Official",
      description: "Read the terms and conditions governing the use of our Japanese learning portal, credit systems, and user accounts.",
      path: "/legal/terms",
      actionLabel: "View Terms",
      isComingSoon: false,
    },
    {
      id: "privacy-policy",
      name: "Privacy Policy",
      category: "Data & Security",
      badge: "Official",
      description: "Learn how we collect, store, and protect your personal information, user data, and learning progress securely.",
      path: "/legal/privacy",
      actionLabel: "View Privacy Policy",
      isComingSoon: false,
    },
    {
      id: "cookie-policy",
      name: "Cookie & Tracking Policy",
      category: "Compliance",
      badge: "Standard",
      description: "Information regarding our use of cookies, local storage, and session authentication tokens.",
      path: "/legal/cookies",
      actionLabel: "View Cookie Policy",
      isComingSoon: false,
    }
  ];

  return (
    <ToolPageWrapper 
      breadcrumbTitle="Legal & Policies"
    >
      <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* ヘッダーセクション */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl mb-4">
              Legal & Compliance Center
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Transparency and data protection guidelines for users and educators utilizing our AI-powered learning platform.
            </p>
          </div>

          {/* カード一覧 */}
          <div className="mb-12">
            <div className="mb-6 border-b border-slate-200 pb-3">
              <h2 className="text-2xl font-bold text-slate-900">Policies and Agreements</h2>
              <p className="text-sm text-slate-500 mt-1">Review our platform policies and terms of service</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {legalDocuments.map((doc) => (
                <div 
                  key={doc.id} 
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      {doc.category && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                          {doc.category}
                        </span>
                      )}
                      {doc.badge && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                          {doc.badge}
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                      {doc.name}
                    </h3>
                    
                    <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                      {doc.description}
                    </p>
                  </div>

                  <div>
                    {doc.isComingSoon ? (
                      <span className="inline-block w-full text-center py-2.5 px-4 bg-slate-100 text-slate-400 font-medium rounded-xl cursor-not-allowed">
                        Coming Soon
                      </span>
                    ) : (
                      <Link
                        to={doc.path}
                        className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors shadow-sm"
                      >
                        {doc.actionLabel}
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