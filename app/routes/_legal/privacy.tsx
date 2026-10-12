import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "Privacy Policy | AI Yamato Japanese Tutoring" },
    {
      name: "description",
      content: "Privacy Policy for AI Yamato - detailing how we handle user data, Supabase database storage, Stripe payments, and Passkey security.",
    },
  ];
};

export default function PrivacyPolicy() {
  return (
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
          Privacy Policy
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          Last updated: October 12, 2026
        </p>

        <div className="space-y-8 text-sm sm:text-base leading-relaxed text-slate-700">
          
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              1. Introduction
            </h2>
            <p>
              AI Yamato (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our web application, website, and Japanese language tutoring services (collectively, the &quot;Service&quot;). Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              2. Information We Collect
            </h2>
            <p>We may collect information about you in a variety of ways, including:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>
                <strong>Account &amp; Authentication Data:</strong> When you register or sign in using WebAuthn Passkeys, we store public key credentials and identifiers associated with your account in our secure database (Supabase). If provided, we may also store your email address for account recovery and important service updates.
              </li>
              <li>
                <strong>Learning Activity &amp; Content:</strong> We collect data regarding your interactions with the AI tutor, including essay submissions (原稿用紙 drafts), oral practice audio transcripts, vocabulary progress, and quiz results, to provide and improve your personalized learning experience.
              </li>
              <li>
                <strong>Payment &amp; Transaction Information:</strong> When you purchase credit packs or subscriptions, payment processing is handled securely by third-party payment gateways (such as Stripe). We do not store your complete credit card numbers or sensitive financial details on our servers; we receive tokenized transaction data and billing status.
              </li>
              <li>
                <strong>Usage &amp; Device Data:</strong> We automatically collect certain information when you access the Service, such as your IP address, browser type, operating system, access times, and pages viewed, to ensure system security and performance.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              3. How We Use Your Information
            </h2>
            <p>Having accurate information permits us to provide you with a smooth, efficient, and customized experience. Specifically, we use information collected to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Create and manage your account via secure Passkey authentication.</li>
              <li>Deliver AI-powered essay corrections, Japanese grammar checks, oral feedback, and curriculum-aligned tutoring.</li>
              <li>Track and manage your credit balance, daily login bonuses, and purchase history.</li>
              <li>Monitor and analyze usage patterns and trends to improve platform functionality, reliability, and security.</li>
              <li>Respond to customer support requests and communicate service-related announcements.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              4. Data Storage and Security (Supabase &amp; Cloudflare)
            </h2>
            <p>
              We implement robust technical and organizational security measures to protect your personal information. Our backend database and authentication infrastructure are hosted securely using Supabase, featuring encrypted connections and Row Level Security (RLS) policies. Our web application is hosted on Cloudflare infrastructure, ensuring high availability and protection against web threats. However, no electronic transmission over the internet or storage technology can be guaranteed 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              5. Disclosure of Your Information
            </h2>
            <p>
              We do not sell, trade, or rent your personal identification information to others. We may share information only in the following limited circumstances:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>
                <strong>Service Providers:</strong> With trusted third-party vendors who assist us in operating our website, conducting our business, or serving our users (e.g., Stripe for payment processing, AI model providers for language generation), provided those parties agree to keep this information confidential.
              </li>
              <li>
                <strong>Legal Obligations:</strong> When we believe release is appropriate to comply with the law, enforce our site policies, or protect ours or others&apos; rights, property, or safety.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              6. Your Privacy Rights &amp; Choices
            </h2>
            <p>
              You may at any time review or update your account information or request the deletion of your account and associated learning data by contacting us. If you are accessing the platform via an educational institution (School License), certain data governance policies may be coordinated directly with your school administrator.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              7. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time in order to reflect, for example, changes to our practices or for other operational, legal, or regulatory reasons. We will notify you of any changes by updating the &quot;Last updated&quot; date at the top of this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              8. Contact Us
            </h2>
            <p>
              If you have questions or comments about this Privacy Policy, please contact us through our <Link to="/contact" className="text-indigo-600 underline hover:text-indigo-500">Contact page</Link>.
            </p>
          </section>

        </div>

        {/* Footer navigation */}
        <div className="mt-12 pt-6 border-t border-slate-200 flex flex-wrap gap-4 text-sm text-slate-500 justify-between items-center">
          <div>
            &copy; {new Date().getFullYear()} AI Yamato. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <Link to="/terms" className="hover:text-slate-900">Terms of Service</Link>
            <Link to="/disclaimer" className="hover:text-slate-900">Disclaimer</Link>
            <Link to="/contact" className="hover:text-slate-900">Contact</Link>
          </div>
        </div>

      </div>
    </div>
  );
}