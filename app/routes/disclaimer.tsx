/**
 * @file disclaimer.tsx
 * @description 免責事項ページ（legal-content.ts 連携版・PageLayout完全連動・グローバル/VCEタブ対応）
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

  // 💡 セクション2のタブ切り替え用ステート ('global' | 'vce')
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
            
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">
                1. General Educational Purpose
              </h2>
              <p>
                The AI Yamato platform, including all AI-powered writing assistants, oral practice modules, grammar checkers, vocabulary drills, audio generation, and visual diagrams (collectively, the &quot;Service&quot;), is designed exclusively as an educational learning aid. The Service is intended to support a global community of learners—including middle school students, high school students, and adult learners worldwide—in practicing and improving their Japanese language skills.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">
                2. No Guarantee of Exam Results or Academic Scores
              </h2>
              
              {/* 💡 タブ切り替えUI（Global / VCE Learners） */}
              <div className="flex space-x-2 border-b border-slate-200 mb-4 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('global')}
                  className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'global'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  VCE Learners (Victoria, Australia)
                </button>
              </div>

              {/* 💡 タブに応じたコンテンツ切り替え */}
              {activeTab === 'global' ? (
                <p>
                  While we strive to provide high-quality tutoring logic, standard curricula alignment, and comprehensive practice tools, <strong>AI Yamato does not guarantee 100% specific academic results, language proficiency test scores (such as JLPT or school exams), or certification outcomes</strong>. Learner performance depends heavily on individual effort, consistency, external instruction, and various personal factors beyond our control.
                </p>
              ) : (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                  <p>
                    While we strive to align our curriculum and tutoring logic with Victorian Curriculum standards and VCE assessment frameworks (such as detailed study and general conversation practice), <strong>AI Yamato does not guarantee specific VCE study scores, ATAR contributions, or exam outcomes</strong>.
                  </p>
                  <p className="text-slate-500 text-xs">
                    * For VCE students in Victoria, Australia, ultimate academic results depend on formal school assessments, independent study habits, and official Victorian Curriculum and Assessment Authority (VCAA) guidelines.
                  </p>
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">
                3. AI-Generated Content and Accuracy
              </h2>
              <p>
                The Service utilizes advanced artificial intelligence models (such as LLMs) to generate feedback, translations, essay corrections, and conversational responses. 
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>
                  <strong>Potential for Inaccuracies:</strong> AI models can occasionally produce errors, misinterpretations, or unnatural phrasing. 
                </li>
                <li>
                  <strong>User Responsibility:</strong> Users, students, and adult learners are solely responsible for verifying the accuracy, appropriateness, and academic integrity of any feedback, corrections, or content generated by the AI before submitting work to schools, teachers, or professional institutions.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">
                4. Service Availability and Technical Interruption
              </h2>
              <p>
                We endeavor to maintain high availability of the Service through robust cloud infrastructure (Cloudflare and Supabase). However, we do not warrant that the Service will be uninterrupted, timely, secure, or error-free. We shall not be held liable for any temporary service disruptions, maintenance downtime, third-party API outages, or data loss beyond our reasonable control.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">
                5. Credits, Campaigns, and Promotional Terms
              </h2>
              <p>
                Any promotional campaigns, daily login bonuses, or complimentary credit grants are subject to specific terms and validity periods (e.g., expiration dates specified during campaign periods). Unused promotional credits will automatically expire upon the conclusion of the stated validity term. We reserve the right to modify or terminate credit promotion rules at any time without prior notice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">
                6. External Links and Third-Party Services
              </h2>
              <p>
                The Service may contain links to external websites, payment gateways (e.g., Stripe), or resources not operated by us. We assume no responsibility or liability for the content, privacy policies, or practices of any third-party websites or services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">
                7. Contact Information
              </h2>
              <p>
                If you have any questions concerning this Disclaimer, please feel free to reach out via our <Link to="/contact" className="text-indigo-600 underline hover:text-indigo-500">Contact page</Link>.
              </p>
            </section>

          </div>

        </div>
      </div>
    </PageLayout>
  );
}