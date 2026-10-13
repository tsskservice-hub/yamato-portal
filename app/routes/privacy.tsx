/**
 * @file privacy.tsx
 * @description プライバシーポリシーページ（legal-content.ts 連携版）
 */
import { useState, useEffect } from "react";
import type { MetaFunction } from "@remix-run/node";
import { Link, useNavigate } from "@remix-run/react";
import { KeyRound, ShieldCheck, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { signUpAndRegisterPasskey, signInWithPasskey } from "../lib/passkey";
import PageLayout from "../components/PageLayout";
import { LEGAL_CONTENT } from "../data/legal-content";

export const meta: MetaFunction = () => {
  return [
    { title: `${LEGAL_CONTENT.privacy.title} | AI Yamato Japanese Tutoring` },
    {
      name: "description",
      content: LEGAL_CONTENT.privacy.summary,
    },
  ];
};

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const content = LEGAL_CONTENT.privacy;

  // 💡 Auth & Credits States (PageLayout連携用)
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number>(10);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [emailInput, setEmailInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // 💡 Fetch user credits from Supabase
  const fetchUserCredits = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();
      
      if (data && !error) {
        setCredits((data as any).credits ?? 10);
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    }
  };

  // 💡 Auth and session handling
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserCredits(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserCredits(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleOpenAuthModal = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const handlePasskeyAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      if (authMode === 'signup') {
        if (!emailInput) {
          throw new Error('Please enter your email address for passkey registration.');
        }
        await signUpAndRegisterPasskey(emailInput);
        alert('Passkey registration successful! Welcome to AI Yamato.');
      } else {
        await signInWithPasskey();
        alert('Passkey sign in successful!');
      }
      setIsAuthModalOpen(false);
      setEmailInput('');
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Passkey authentication failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <PageLayout 
      user={user} 
      credits={credits} 
      onOpenAuth={handleOpenAuthModal} 
      onSignOut={handleSignOut}
    >
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
                  <strong>Learning Activity &amp; Content:</strong> We collect data regarding your interactions with the AI tutor, including essay submissions (genkoyoshi drafts), oral practice audio transcripts, vocabulary progress, and quiz results, to provide and improve your personalized learning experience.
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

        </div>
      </div>

      {/* 💡 Passkey Authentication / Registration Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl p-6 sm:p-8 border shadow-2xl relative bg-white border-slate-200 text-slate-900">
            <button 
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-500/15 transition-colors text-slate-400 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-extrabold tracking-tight">
                  {authMode === 'signup' ? 'Create Account with Passkey' : 'Sign In with Passkey'}
                </h3>
                <p className="text-xs text-slate-500">
                  {authMode === 'signup' 
                    ? 'Register securely using biometrics, Touch ID, Face ID, or a security key.' 
                    : 'Authenticate instantly with your registered biometric passkey.'}
                </p>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium">
                  {authError}
                </div>
              )}

              <form onSubmit={handlePasskeyAuth} className="space-y-4">
                {authMode === 'signup' && (
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-semibold text-slate-500">Email Address</label>
                    <input 
                      type="email"
                      required
                      placeholder="your.email@school.vic.edu.au"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900"
                    />
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{authLoading ? 'Verifying Passkey...' : authMode === 'signup' ? 'Register Passkey' : 'Sign In'}</span>
                </button>
              </form>

              <div className="text-center text-xs">
                {authMode === 'signup' ? (
                  <p className="text-slate-500">
                    Already have a passkey?{' '}
                    <button onClick={() => setAuthMode('signin')} className="text-blue-600 font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer">
                      Sign In
                    </button>
                  </p>
                ) : (
                  <p className="text-slate-500">
                    New to AI Yamato?{' '}
                    <button onClick={() => setAuthMode('signup')} className="text-blue-600 font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer">
                      Create Account
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}