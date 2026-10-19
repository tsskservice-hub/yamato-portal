/**
 * @file disclaimer.tsx
 * @description 免責事項ページ（legal-content.ts完全データ駆動・動的マッピング版）
 */
import { useState } from "react";
import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import PageLayout from "../components/PageLayout";
import { LEGAL_CONTENT } from "../data/legal-content";

export const meta: MetaFunction = () => {
  return [
    { title: `${LEGAL_CONTENT.disclaimer.title} | AI Yamato Japanese Tutoring` },
    {
      name: "description",
      content: LEGAL_CONTENT.disclaimer.summary,
    },
  ];
};

export default function Disclaimer() {
  const content = LEGAL_CONTENT.disclaimer;

  // 💡 VCE/Global タブ切り替え用ステート
  const [activeTab, setActiveTab] = useState<'global' | 'vce'>('global');

  return (
    <PageLayout>
      <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-2xl p-8 sm:p-12 border border-slate-200">
          
          {/* Navigation back */}
          <div className="mb-8">
            <Link
              to="/"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              &larr; Back to Home
            </Link>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
            {content.title}
          </h1>
          <p className="text-sm text-slate-500 mb-8">
            Last updated: {content.lastUpdated}
          </p>

          <div className="space-y-8 text-sm sm:text-base leading-relaxed text-slate-700">
            
            {content.sections.map((section, idx) => {
              // セクション2（試験結果の保証について）の場合はタブ切り替えUIを挿入
              const isExamSection = section.heading.includes("No Guarantee of Exam Results");

              return (
                <section key={idx}>
                  <h2 className="text-xl font-semibold text-slate-900 mb-3">
                    {section.heading}
                  </h2>

                  {isExamSection ? (
                    <>
                      {/* タブ切り替えUI */}
                      <div className="flex space-x-2 border-b border-slate-200 mb-4 pb-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab('global')}
                          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                            activeTab === 'global'
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-250'
                          }`}
                        >
                          Global Learners
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('vce')}
                          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                            activeTab === 'vce'
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-250'
                          }`}
                        >
                          VCE Learners (Victoria, Australia)
                        </button>
                      </div>

                      {/* タブコンテンツの切り替え */}
                      {activeTab === 'global' ? (
                        <p>{section.globalContent}</p>
                      ) : (
                        <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                          <p>{section.vceContent}</p>
                          <p className="text-slate-500 text-xs">* {section.vceNote}</p>
                        </div>
                      )}
                    </>
                  ) : section.listItems ? (
                    <>
                      <p>{section.content}</p>
                      <ul className="list-disc pl-5 space-y-2 mt-2">
                        {section.listItems.map((item, itemIdx) => (
                          <li key={itemIdx}>
                            <strong>{item.strong}:</strong> {item.text}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : section.isContactLink ? (
                    <p>
                      If you have any questions concerning this Disclaimer, please feel free to reach out via our{" "}
                      <Link to="/contact" className="text-indigo-600 underline hover:text-indigo-500">
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

        </div>
      </div>
    </PageLayout>
  );
}