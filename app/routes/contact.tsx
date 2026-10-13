/**
 * @file contact.tsx
 * @description お問い合わせページ（legal-content.ts 連携版）
 */
import { useState, useEffect } from "react";
import type { MetaFunction, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useActionData, useNavigation } from "@remix-run/react";
import { KeyRound, ShieldCheck, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { signUpAndRegisterPasskey, signInWithPasskey } from "../lib/passkey";
import PageLayout from "../components/PageLayout";
import { LEGAL_CONTENT } from "../data/legal-content";

export const meta: MetaFunction = () => {
  return [
    { title: `${LEGAL_CONTENT.contact.title} | AI Yamato Japanese Tutoring` },
    {
      name: "description",
      content: LEGAL_CONTENT.contact.summary,
    },
  ];
};

// 型定義を明示
type ActionData = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const name = formData.get("name");
  const email = formData.get("email");
  const message = formData.get("message");

  if (!name || !email || !message) {
    return json<ActionData>({ success: false, error: "Please fill in all required fields." }, { status: 400 });
  }

  // TODO: メール送信サービス（ResendやSendGridなど）やデータベース保存の処理をここに記述
  
  return json<ActionData>({ success: true, message: "Thank you! Your message has been sent successfully. We will get back to you soon." });
}

export default function Contact() {
  const actionData = useActionData<typeof action>() as ActionData | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const content = LEGAL_CONTENT.contact;

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
        <div className="max-w-3xl mx-auto bg-white shadow-sm rounded-2xl p-8 sm:p-12 border border-slate-200">
          
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
          <p className="text-sm sm:text-base text-slate-600 mb-8">
            {content.summary}
          </p>

          {actionData?.success && actionData.message && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm">
              {actionData.message}
            </div>
          )}

          {actionData?.success === false && actionData.error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm">
              {actionData.error}
            </div>
          )}

          <form method="post" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                  Your Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  placeholder="e.g., Jane Doe"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 text-sm"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  placeholder="e.g., jane@example.com"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="inquiryType" className="block text-sm font-medium text-slate-700 mb-1">
                Inquiry Type
              </label>
              <select
                id="inquiryType"
                name="inquiryType"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 text-sm bg-white"
              >
                {content.inquiryTypes.map((type, idx) => (
                  <option key={idx} value={type.toLowerCase().split(' ')[0]}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">
                Message <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                required
                placeholder="How can we help you with your Japanese studies or platform usage?"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 text-sm"
              ></textarea>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors text-sm shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </button>
            </div>
          </form>

          <div className="mt-12 pt-8 border-t border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Direct Contact Information</h2>
            <p className="text-sm text-slate-600 mb-4">
              If you need immediate assistance or prefer sending an email directly, you can reach our team at:
            </p>
            <p className="text-sm font-medium text-indigo-600">
              {content.directEmail}
            </p>
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