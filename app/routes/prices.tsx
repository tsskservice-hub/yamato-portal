import { useState, useEffect } from "react";
import { Link, useNavigate } from "@remix-run/react";
import { Sparkles, ArrowRight, ShieldCheck, Check, ShoppingBag, GraduationCap, Mic, Coins, Flame, ChevronDown, ChevronUp, SlidersHorizontal, KeyRound, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { signUpAndRegisterPasskey, signInWithPasskey } from "../lib/passkey";
import PageLayout from "../components/PageLayout";
import { PRICE_PLANS, CREDIT_CONSUMPTION_GUIDE } from "../data/price-plans";

export default function Prices() {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(true);
  const [isSpecsOpen, setIsSpecsOpen] = useState(false);
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);

  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number>(10);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [emailInput, setEmailInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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

  useEffect(() => {
    document.title = "Pricing & Plans - JP Tutor AI Yamato";
    
    const savedTheme = localStorage.getItem("theme");
    const isDarkModeActive = savedTheme === "dark" || (!savedTheme && document.documentElement.classList.contains("dark"));
    
    setIsDark(isDarkModeActive);
    if (isDarkModeActive) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

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

  const handleCheckout = async (priceId: string) => {
    if (!user) {
      handleOpenAuthModal('signin');
      return;
    }

    try {
      setLoadingPriceId(priceId);
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: priceId,
          userId: user.id,
        }),
      });

      const data = await res.json() as any;
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to create checkout session.');
      }
    } catch (err: any) {
      console.error(err);
      alert('An error occurred during checkout.');
    } finally {
      setLoadingPriceId(null);
    }
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
      <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
        <main className="flex-grow">
          <section className="pt-14 pb-8 px-4 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-xs sm:text-sm font-medium mb-4 shadow-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Transparent & Flexible Pricing</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
              Plans & Credit Packs
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Start for free with daily credits, or top up with prepaid charge packs for intensive study.
            </p>

            <div className="max-w-xl mx-auto mt-6 p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm text-xs text-left">
              <div className="flex items-center justify-center space-x-2 font-bold mb-3 text-slate-800 dark:text-slate-200">
                <Coins className="w-4 h-4 text-amber-500" />
                <span>Credit Consumption Guide</span>
              </div>
              <div className="space-y-2 text-slate-500 dark:text-slate-400">
                {CREDIT_CONSUMPTION_GUIDE.map((row: { item: string; cost: string }, idx: number) => (
                  <div key={idx} className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    <span>{row.item}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{row.cost}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
            <div className="text-center space-y-4 max-w-3xl mx-auto mb-12">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/30 flex items-center justify-center space-x-2 text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 shadow-sm">
                <Flame className="w-4 h-4 text-orange-500 shrink-0 animate-bounce" />
                <span>Limited-Time Campaign (Until October 29): Paid packs include bonus credits useable until October 29! Standard base credits are unexpired.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left items-stretch">
              
              {/* Free Plan */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
                <div className="space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{PRICE_PLANS.free.name}</span>
                  <div>
                    <span className="text-4xl font-black text-slate-900 dark:text-white">{PRICE_PLANS.free.price}</span>
                    <span className="text-xs text-slate-500 ml-1">{PRICE_PLANS.free.period}</span>
                  </div>
                  <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold">
                    {PRICE_PLANS.free.badge}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{PRICE_PLANS.free.description}</p>
                  <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    {PRICE_PLANS.free.features.map((feat: string, idx: number) => (
                      <li key={idx} className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /><span>{feat}</span></li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6 space-y-3">
                  <Link
                    to={PRICE_PLANS.free.ctaLink || "/"}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-center transition-all block"
                  >
                    {PRICE_PLANS.free.ctaText}
                  </Link>
                </div>
              </div>

              {/* Starter Pack */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
                <div className="space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{PRICE_PLANS.starter.name}</span>
                  <div>
                    <span className="text-4xl font-black text-slate-900 dark:text-white">{PRICE_PLANS.starter.price}</span>
                    <span className="text-xs text-slate-500 ml-1">{PRICE_PLANS.starter.period}</span>
                  </div>
                  <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold leading-normal">
                    {PRICE_PLANS.starter.badge}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{PRICE_PLANS.starter.description}</p>
                  <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    {PRICE_PLANS.starter.features.map((feat: string, idx: number) => (
                      <li key={idx} className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /><span>{feat}</span></li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => handleCheckout(PRICE_PLANS.starter.id)}
                    disabled={loadingPriceId === PRICE_PLANS.starter.id}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white text-center shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>{loadingPriceId === PRICE_PLANS.starter.id ? 'Processing...' : 'Buy Starter Pack'}</span>
                  </button>
                  <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                    By purchasing, you agree to our <Link to="/terms" className="underline hover:text-slate-600">Terms</Link> & <Link to="/disclaimer" className="underline hover:text-slate-600">Disclaimer</Link>.
                  </p>
                </div>
              </div>

              {/* Standard Pack */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-blue-600 flex flex-col justify-between shadow-xl relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-full shadow-sm">
                  Most Popular
                </div>
                <div className="space-y-4 pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{PRICE_PLANS.standard.name}</span>
                  <div>
                    <span className="text-4xl font-black text-slate-900 dark:text-white">{PRICE_PLANS.standard.price}</span>
                    <span className="text-xs text-slate-500 ml-1">{PRICE_PLANS.standard.period}</span>
                  </div>
                  <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold leading-normal">
                    {PRICE_PLANS.standard.badge}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{PRICE_PLANS.standard.description}</p>
                  <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    {PRICE_PLANS.standard.features.map((feat: string, idx: number) => (
                      <li key={idx} className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /><span>{feat}</span></li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => handleCheckout(PRICE_PLANS.standard.id)}
                    disabled={loadingPriceId === PRICE_PLANS.standard.id}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white text-center shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>{loadingPriceId === PRICE_PLANS.standard.id ? 'Processing...' : 'Buy Standard Pack'}</span>
                  </button>
                  <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                    By purchasing, you agree to our <Link to="/terms" className="underline hover:text-slate-600">Terms</Link> & <Link to="/disclaimer" className="underline hover:text-slate-600">Disclaimer</Link>.
                  </p>
                </div>
              </div>

              {/* Pro Intensivist */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
                <div className="space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-600">{PRICE_PLANS.pro.name}</span>
                  <div>
                    <span className="text-4xl font-black text-slate-900 dark:text-white">{PRICE_PLANS.pro.price}</span>
                    <span className="text-xs text-slate-500 ml-1">{PRICE_PLANS.pro.period}</span>
                  </div>
                  <div className="inline-block px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 text-xs font-bold leading-normal">
                    {PRICE_PLANS.pro.badge}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{PRICE_PLANS.pro.description}</p>
                  <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    {PRICE_PLANS.pro.features.map((feat: string, idx: number) => (
                      <li key={idx} className="flex items-center space-x-2"><Check className="w-3.5 h-3.5 text-purple-600 shrink-0" /><span>{feat}</span></li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => handleCheckout(PRICE_PLANS.pro.id)}
                    disabled={loadingPriceId === PRICE_PLANS.pro.id}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-center shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>{loadingPriceId === PRICE_PLANS.pro.id ? 'Processing...' : 'Buy Pro Pack'}</span>
                  </button>
                  <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                    By purchasing, you agree to our <Link to="/terms" className="underline hover:text-slate-600">Terms</Link> & <Link to="/disclaimer" className="underline hover:text-slate-600">Disclaimer</Link>.
                  </p>
                </div>
              </div>

            </div>

            {/* 詳細スペック表のトグル */}
            <div className="mt-10">
              <button
                onClick={() => setIsSpecsOpen(!isSpecsOpen)}
                className="w-full py-4 px-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                  <span>View Detailed Plan Specs & Study Volume Estimates</span>
                </div>
                {isSpecsOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </button>

              {isSpecsOpen && (
                <div className="mt-4 space-y-4">
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Plan Specifications & Learning Volume Breakdown</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">All tiers grant full access to all AI Yamato features; differences lie solely in credit allocation and volume.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left items-stretch">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                      <div className="font-bold text-slate-700 dark:text-slate-300 text-sm pb-2 border-b border-slate-100 dark:border-slate-800">Free Plan</div>
                      <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                        <li><strong className="text-slate-900 dark:text-white">Daily Earnings:</strong> 4 Credits (Promo until Oct 29)</li>
                        <li><strong className="text-slate-900 dark:text-white">Credit Expiry:</strong> 7 days</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                      <div className="font-bold text-blue-600 text-sm pb-2 border-b border-slate-100 dark:border-slate-800">Starter Pack ($10)</div>
                      <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                        <li><strong className="text-slate-900 dark:text-white">Total Credits:</strong> 2,000</li>
                        <li><strong className="text-slate-900 dark:text-white">Bonus Expiry:</strong> Oct 29</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-blue-600 shadow-xl space-y-4 relative">
                      <div className="font-bold text-blue-600 text-sm pb-2 border-b border-slate-100 dark:border-slate-800">Standard ($25)</div>
                      <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                        <li><strong className="text-slate-900 dark:text-white">Total Credits:</strong> 5,600</li>
                        <li><strong className="text-slate-900 dark:text-white">Bonus Expiry:</strong> Oct 29</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                      <div className="font-bold text-purple-600 text-sm pb-2 border-b border-slate-100 dark:border-slate-800">Pro Intensivist ($50)</div>
                      <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                        <li><strong className="text-slate-900 dark:text-white">Total Credits:</strong> 12,000</li>
                        <li><strong className="text-slate-900 dark:text-white">Bonus Expiry:</strong> Oct 29</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>

        {isAuthModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl p-6 sm:p-8 border shadow-2xl relative bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
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
                </div>
                {authError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium">
                    {authError}
                  </div>
                )}
                <form onSubmit={handlePasskeyAuth} className="space-y-4">
                  {authMode === 'signup' && (
                    <div className="space-y-1.5 text-left">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Email Address</label>
                      <input 
                        type="email"
                        required
                        placeholder="your.email@school.vic.edu.au"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  )}
                  <button 
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 cursor-pointer"
                  >
                    <span>{authLoading ? 'Verifying...' : authMode === 'signup' ? 'Register Passkey' : 'Sign In'}</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}