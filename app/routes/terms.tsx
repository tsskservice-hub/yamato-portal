/**
 * @file terms.tsx
 * @description 利用規約ページ（Supabase LEGAL_CONTENTS 100%動的連動・PageLayout 統合型データエラーガード対応版）
 */

import { useState, useEffect, useCallback } from "react";
import type { MetaFunction } from "@remix-run/cloudflare";
import { Link, useRouteLoaderData } from "@remix-run/react";
import PageLayout from "../components/PageLayout";
import { fetchLegalContentData, LegalDocument } from "../data/legal-content";
import { supabase } from "../lib/supabaseClient";

export const meta: MetaFunction = () => {
  return [
    { title: "Terms of Service | AI Yamato Japanese Tutoring" },
    {
      name: "description",
      content: "Terms of Service governing educational use of AI Yamato Japanese tutoring platform, passkey authentication, and user responsibilities.",
    },
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
      isLoading={loading}
      error={error || (!loading && !doc)}
      errorMessage="Failed to load Terms of Service from the database."
      onRetry={loadData}
    >
      {doc && (
        <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-2xl p-8 sm:p-12 border border-slate-200">
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
          </div>
        </div>
      )}
    </PageLayout>
  );
}
