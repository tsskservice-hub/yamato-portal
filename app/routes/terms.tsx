import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import PageLayout from "../components/PageLayout";

export const meta: MetaFunction = () => {
  return [
    { title: "Terms of Service | AI Yamato Japanese Tutoring" },
    {
      name: "description",
      content: "Terms of Service for AI Yamato - AI Japanese Tutoring Platform.",
    },
  ];
};

export default function TermsOfService() {
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
            Terms of Service
          </h1>
          <p className="text-sm text-slate-500 mb-8">
            Last updated: October 12, 2026
          </p>

          <div className="space-y-8 text-sm sm:text-base leading-relaxed text-slate-700">
            
            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">
                1. Acceptance of Terms
              </h2>
              <p>
                Welcome to AI Yamato (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). By accessing or using our website, web application, and related Japanese language learning services (collectively, the &quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">
                2. Description of Service
              </h2>
              <p>
                AI Yamato is an AI-powered educational platform designed to assist learners of all ages and backgrounds—including students and working professionals worldwide—with Japanese language writing, oral practice, grammar checking, and vocabulary acquisition. The Service operates on a credit-based system and offers various user tiers, including free access and paid credit packs or subscriptions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">
                3. User Accounts and Passkey Authentication
              </h2>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>
                  <strong>Passkey Sign-In:</strong> Our Service utilizes WebAuthn Passkeys for secure authentication. You are responsible for maintaining the security of your device and passkey credentials.
                </li>
                <li>
                  <strong>Account Responsibility:</strong> You are fully responsible for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
                </li>
                <li>
                  <strong>Age Requirements:</strong> Users under the age of majority should use the Service with the supervision and consent of a parent, guardian, or educational institution (School License).
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">
                4. Credits, Payments, and Refunds
              </h2>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>
                  <strong>Credit System:</strong> Certain features of the Service require credits. Credits may be obtained via daily login rewards, promotional grants, or purchasing credit packs through our payment processors (e.g., Stripe).
                </li>
                <li>
                  <strong>Expiration and Validity:</strong> Promotional or bonus credits may carry specific validity periods (e.g., as specified during campaign terms) and will expire if unused.
                </li>
                <li>
                  <strong>Refund Policy:</strong> All purchases of digital credits and plans are final, except where required by applicable local consumer protection laws in the user&apos;s jurisdiction.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">
                5. Acceptable Use Policy
              </h2>
              <p>You agree not to misuse the Service. Specifically, you agree that you will not:</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>Use the Service for any unlawful purpose or in violation of any local, state, or international laws.</li>
                <li>Attempt to reverse engineer, decompile, hack, or compromise the security of our infrastructure, database (Supabase), or AI models.</li>
                <li>Bypass or manipulate credit tracking systems, rate limits, or daily login mechanisms.</li>
                <li>Upload malicious code, automated scraping bots, or harmful content into the platform.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">
                6. Intellectual Property
              </h2>
              <p>
                All software, user interfaces, curriculum mappings, original prompts, visual assets, and text content provided through AI Yamato are the intellectual property of AI Yamato and its licensors. You are granted a limited, non-exclusive, non-transferable license to use the Service for personal educational purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">
                7. Limitation of Liability and Disclaimer
              </h2>
              <p>
                The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis. AI Yamato is an educational learning aid and does not guarantee specific academic results, language proficiency test scores, or exam outcomes. For complete details regarding limitations, please review our separate <Link to="/disclaimer" className="text-indigo-600 underline hover:text-indigo-500">Disclaimer</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">
                8. Changes to Terms
              </h2>
              <p>
                We reserve the right to modify these Terms at any time. When we make changes, we will update the &quot;Last updated&quot; date at the top of this page. Your continued use of the Service after any changes constitutes your acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">
                9. Contact Information
              </h2>
              <p>
                If you have any questions about these Terms of Service, please reach out to us via our <Link to="/contact" className="text-indigo-600 underline hover:text-indigo-500">Contact page</Link>.
              </p>
            </section>

          </div>

        </div>
      </div>
    </PageLayout>
  );
}