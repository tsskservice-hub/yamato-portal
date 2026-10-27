/**
 * @file disclaimer.tsx
 * @description 免責事項ページ（Supabase LEGAL_CONTENTS 100%動的連動・DataErrorState版）
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
    { title: "Disclaimer | AI Yamato Japanese Tutoring" },
    {
      name: "description",
      content: "Educational use limitations, AI output disclaimers, custom practice prompts, and service availability for AI Yamato.",
    },
  ];
};

export default function Disclaimer() {
  const rootData = useRouteLoaderData("root") as {
    user?: any;
    credits?: number;
    nickname?: string;
  } | undefined;

  const [doc, setDoc] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"global" | "vce">("global");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const legalData = await fetchLegalContentData(supabase);
      if (legalData?.disclaimer) {
        setDoc(legalData.disclaimer);
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
      breadcrumbTitle={doc?.title || "Disclaimer"}
    >
      <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-2xl p-8 sm:p-12 border border-slate-200">
          
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-slate-500 font-medium text-sm">Loading Disclaimer...</p>
            </div>
          ) : error || !doc ? (
            <DataErrorState
              title="Disclaimer Unavailable"
              message="Failed to load Disclaimer from the database. Please check your network connection and try again."
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
                {doc.sections.map((section, idx) => {
                  const isExamSection =
                    section.heading?.includes("No Guarantee of Exam Results") ||
                    Boolean(section.globalContent && section.vceContent);

                  return (
                    <section key={idx}>
                      {section.heading && (
                        <h2 className="text-xl font-semibold text-slate-900 mb-3">
                          {section.heading}
                        </h2>
                      )}

                      {isExamSection ? (
                        <>
                          <div className="flex space-x-2 border-b border-slate-200 mb-4 pb-2">
                            <button
                              type="button"
                              onClick={() => setActiveTab("global")}
                              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                                activeTab === "global"
                                  ? "bg-indigo-600 text-white shadow-sm"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              Global Learners
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTab("vce")}
                              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                                activeTab === "vce"
                                  ? "bg-indigo-600 text-white shadow-sm"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              VCE Learners (Victoria, Australia)
                            </button>
                          </div>

                          {activeTab === "global" ? (
                            <p>{section.globalContent}</p>
                          ) : (
                            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                              <p>{section.vceContent}</p>
                              {section.vceNote && (
                                <p className="text-slate-500 text-xs">* {section.vceNote}</p>
                              )}
                            </div>
                          )}
                        </>
                      ) : section.listItems && section.listItems.length > 0 ? (
                        <>
                          {section.content && <p className="mb-2">{section.content}</p>}
                          <ul className="list-disc pl-5 space-y-2 mt-2">
                            {section.listItems.map((item, itemIdx) => (
                              <li key={itemIdx}>
                                {item.strong && <strong>{item.strong}: </strong>}
                                {item.text}
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : section.isContactLink ? (
                        <p>
                          If you have any questions concerning this Disclaimer, please feel free to reach out via our{" "}
                          <Link to="/contact" className="text-indigo-600 underline hover:text-indigo-500 font-medium">
                            Contact page
                          </Link>
                          .
                        </p>
                      ) : (
                        <p>{section.content}</p>
                      )}
                    </section>
                  );
                })}
              </div>
            </>
          )}

        </div>
      </div>
    </PageLayout>
  );
}