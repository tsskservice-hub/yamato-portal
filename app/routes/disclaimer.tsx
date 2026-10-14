/**
 * @file disclaimer.tsx
 * @description 免責事項ページ（legal-content.ts 連携版・rootルートデータ連携対応版）
 */
import { useState, useEffect } from "react";
import type { MetaFunction } from "@remix-run/node";
import { Link, useNavigate, useRouteLoaderData } from "@remix-run/react";
import { KeyRound, ShieldCheck, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { signUpAndRegisterPasskey, signInWithPasskey } from "../lib/passkey";
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
  const navigate = useNavigate();
  const content = LEGAL_CONTENT.disclaimer;

  // 💡 root.tsx からグローバルデータを安全に取得
  const rootData = useRouteLoaderData("root") as {
    user?: any;
    credits?: number;
    nickname?: string;
  } | undefined;

  // 💡 rootData から初期値を安全に連動
  const [user, setUser] = useState<any>(rootData?.user ?? null);
  const [credits, setCredits] = useState<number>(rootData?.credits ?? 10);
  const [nickname, setNickname] = useState<string>(rootData?.nickname ?? "");

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [emailInput, setEmailInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // 💡 rootData が更新された場合にステートを同期
  useEffect(() => {
    if (rootData) {
      if (rootData.user !== undefined) setUser(rootData.user);
      if (rootData.credits !== undefined) setCredits(rootData.credits);
      if (rootData.nickname !== undefined) setNickname(rootData.nickname);
    }
  }, [rootData]);

  // 💡 Fetch user credits & profile from Supabase
  const fetchUserData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits, nickname')
        .eq('id', userId)
        .single();
      
      if (data && !error) {
        setCredits((data as any).credits ?? 10);
        if ((data as any).nickname) {
          setNickname((data as any).nickname);
        }
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
        fetchUserData(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setNickname("");
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
      nickname={nickname}
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
                1. General Educational Purpose
              </h2>
              <p>
                The AI Yamato platform, including all AI-powered writing assistants, oral practice modules, grammar checkers, vocabulary drills, audio generation, and visual diagrams (collectively, the &quot;Service&quot;), is designed exclusively as an educational learning aid. The Service is intended to support secondary school students—including VCE Japanese learners in Victoria, Australia—in practicing and improving their Japanese language skills.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">
                2. No Guarantee of Exam Results or VCE Scores
              </h2>
              <p>
                While we strive to align our curriculum and tutoring logic with Victorian Curriculum standards and VCE assessment frameworks (such as detailed study and general conversation practice), <strong>AI Yamato does not guarantee 100% specific academic results, study scores, ATAR contributions, or exam outcomes</strong>. Student performance depends on individual effort, classroom instruction, formal school assessments, and various external factors beyond our control.
              </p>
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
                  <strong>User Responsibility:</strong> Users and students are solely responsible for verifying the accuracy, appropriateness, and academic integrity of any feedback, corrections, or content generated by the AI before submitting work to schools or teachers.
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