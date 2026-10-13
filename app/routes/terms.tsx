/**
 * @file terms.tsx
 * @description 利用規約ページ（legal-content.ts 連携版）
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
    { title: `${LEGAL_CONTENT.terms.title} | AI Yamato Japanese Tutoring` },
    {
      name: "description",
      content: LEGAL_CONTENT.terms.summary,
    },
  ];
};

export default function TermsOfService() {
  const navigate = useNavigate();
  const content = LEGAL_CONTENT.terms;

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