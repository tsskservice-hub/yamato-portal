/**
 * @file terms.tsx
 * @description 利用規約ページ（Supabase LEGAL_CONTENTS 連動・DataErrorState フォールバック版）
 */
import { useState, useEffect, useCallback } from "react";
import type { MetaFunction } from "@remix-run/cloudflare";
import { Link, useRouteLoaderData } from "@remix-run/react";
import PageLayout from "../components/PageLayout";
import DataErrorState from "../components/DataErrorState";
import { fetchLegalContentData, LegalDocument } from "../data/legal-content";
import { supabase } from "../lib/supabaseClient";

export const meta: MetaFunction = () => {
  return [
    { title: "Terms of Service | AI Yamato Japanese Tutoring" },
    { name: "description", content: "Terms of Service for AI Yamato Japanese Tutoring Platform." },
  ];
};

export default function TermsOfService() {
  const rootData = useRouteLoaderData("root") as {
    user?: any;
    credits?: number;
    nickname?: string;
  } | undefined;

  const [doc, setDoc] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const legalData = await fetchLegalContentData(supabase);
      if (legalData?.terms) {
        setDoc(legalData.terms);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <PageLayout
      user={rootData?.user}
      credits={rootData?.credits}
      nickname={rootData?.nickname}
      breadcrumbTitle={doc?.title || "Terms of Service"}
    >
      <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-2xl p-8 sm:p-12 border border-slate-200">
          
          <div className="mb-8">
            <Link
              to="/"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              &larr; Back to Home
            </Link>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-slate-500 font-medium text-sm">Loading Terms of Service...</p>
            </div>
          ) : error || !doc ? (
            <DataErrorState
              title="Terms of Service Unavailable"
              message="Failed to load Terms of Service from Supabase. Please check your network connection and try again."
              onRetry={loadData}
            />
          ) : (
            <>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
                {doc.title}
              </h1>
              <p className="text-sm text-slate-500 mb-8">
                Last updated: {doc.lastUpdated}
              </p>

              <div className="space-y-8 text-sm sm:text-base leading-relaxed text-slate-700">
                {doc.sections.map((section, idx) => (
                  <section key={idx}>
                    {section.heading && (
                      <h2 className="text-xl font-semibold text-slate-900 mb-3">
                        {section.heading}
                      </h2>
                    )}
                    {section.content && <p className="mb-2">{section.content}</p>}

                    {section.listItems && section.listItems.length > 0 && (
                      <ul className="list-disc pl-5 space-y-2 mt-2">
                        {section.listItems.map((item, itemIdx) => (
                          <li key={itemIdx}>
                            {item.strong && <strong>{item.strong}: </strong>}
                            {item.text}
                          </li>
                        ))}
                      </ul>
                    )}

                    {section.isContactLink && (
                      <p>
                        If you have any questions about these Terms of Service, please reach out to us via our{" "}
                        <Link to="/contact" className="text-indigo-600 underline hover:text-indigo-500 font-medium">
                          Contact page
                        </Link>
                        .
                      </p>
                    )}
                  </section>
                ))}
              </div>
            </>
          )}

        </div>
      </div>
    </PageLayout>
  );
}