import { yamatoFetch } from '~/lib/yamatoApi';
/**
 * @file prices.tsx
 * @description 料金プランページ（Supabase PRICE_PLANS 100%動的連動・PageLayoutデータエラーガード完全対応版）
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { Link, useRouteLoaderData } from '@remix-run/react';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import PageLayout, { type PageLayoutRef } from '~/components/layout/PageLayout';
import { generateModuleMeta } from '~/utils/seoMeta';
import { supabase } from '~/lib/supabaseClient';
import { 
  ShieldCheck, 
  Check, 
  Coins, 
  Flame, 
  ChevronDown, 
  ChevronUp, 
  SlidersHorizontal 
} from 'lucide-react';
import { fetchPricePlansData, PricePlansKnowledge } from '~/data/price-plans';
import { PlanUsageComparison } from '~/components/PlanUsageComparison';
import ScrollTopButton from '~/components/layout/ScrollTopButton';
import { SubscriptionPlans, SectionHeading } from '~/components/billing/SubscriptionPlans';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  let portalContent = null;
  try {
    const { data: portalData } = await supabase
      .from('portal_settings')
      .select('content')
      .eq('key', 'PORTAL_CONTENT')
      .single();
    portalContent = portalData?.content || null;
  } catch (e) {}

  return json({
    portalContent,
    currentPath: url.pathname,
  });
}

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta(data?.portalContent || null, data?.currentPath || '');
};

export default function Prices() {
  const [priceData, setPriceData] = useState<PricePlansKnowledge | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const layoutRef = useRef<PageLayoutRef>(null);

  // root.tsx からユーザー情報を取得
  const rootData = useRouteLoaderData("root") as {
    user?: any;
    credits?: number;
    nickname?: string;
  } | undefined;

  const user = rootData?.user ?? null;
  const credits = rootData?.credits ?? 0;
  const nickname = rootData?.nickname ?? "";

  // Supabase より PRICE_PLANS データをフェッチ
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await fetchPricePlansData(supabase);
      if (result && result.pricePlans) {
        setPriceData(result);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error("Failed to load price plans from Supabase:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCheckout = async (priceId: string) => {
    // サーバーのクッキーが切れていても、ブラウザがログインしていれば買える（支払いの処理はブラウザの情報を使う）
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      layoutRef.current?.openAuthModal('signin');
      return;
    }

    try {
      setLoadingPriceId(priceId);
      // 🔐 購入者はログイン情報（アクセストークン）でサーバー側が特定する
      const res = await yamatoFetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      const data = (await res.json()) as any;
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

  const pricePlans = priceData?.pricePlans;

  return (
    <ToolPageWrapper
      layoutRef={layoutRef}
      hasError={!loading && error}
      errorTitle="Unable to Load Data"
      errorMessage="Failed to load PRICE_PLANS from Supabase (kl_app)."
      onRetry={loadData}
    >
      {priceData && pricePlans && (
        <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
          <main className="flex-grow">
            {/* ページタイトル & ヘッダー */}
            <section className="pt-14 pb-8 px-4 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-xs sm:text-sm font-medium mb-4 shadow-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>Transparent & Flexible Pricing</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
                Plans & Credit Packs
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
                Start for free, choose a subscription or a pass for full access, and top up if you need more AI credits.
              </p>

              {/* クレジット消費ガイド */}
              {priceData.creditConsumptionGuide && (
                <div className="max-w-xl mx-auto mt-6 p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm text-xs text-left">
                  <div className="flex items-center justify-center space-x-2 font-bold mb-3 text-slate-800 dark:text-slate-200">
                    <Coins className="w-4 h-4 text-amber-500" />
                    <span>Credit Consumption Guide</span>
                  </div>
                  <div className="space-y-2 text-slate-500 dark:text-slate-400">
                    {priceData.creditConsumptionGuide.map((row, idx) => (
                      <div key={idx} className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                        <span>{row.item}</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{row.cost}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* サブスク・シーズンプラン・AI 体験（SQL 51・Stripe の Lookup key） */}
            <SubscriptionPlans
              signedIn={Boolean(user)}
              onSignIn={() => layoutRef.current?.openAuthModal('signin')}
              freePlan={pricePlans.free}
            />

            {/* 3. 追加クレジット（プランを使っている人だけが買える。サーバーも確かめる） */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 space-y-6">
              <SectionHeading
                title="Top-up credits"
                subtitle="For heavy users who need more AI credits than their plan includes. Available to members with a subscription or a pass. Credits can be used for 1 year."
              />
              {priceData.campaignNotice && (
                <div className="text-center space-y-4 max-w-3xl mx-auto mb-12">
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/30 flex items-center justify-center space-x-2 text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 shadow-sm">
                    <Flame className="w-4 h-4 text-orange-500 shrink-0 animate-bounce" />
                    <span>{priceData.campaignNotice.rawText || priceData.campaignNotice.description}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left items-stretch">
                {/* Starter Pack */}
                {pricePlans.starter && (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
                    <div className="space-y-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{pricePlans.starter.name}</span>
                      <p className="text-xs text-slate-500" lang="ja">ちょっと = a little</p>
                      <div>
                        <span className="text-4xl font-black text-slate-900 dark:text-white">{pricePlans.starter.price}</span>
                        <span className="text-xs text-slate-500 ml-1">{pricePlans.starter.period}</span>
                      </div>
                      {pricePlans.starter.badge && (
                        <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold leading-normal">
                          {pricePlans.starter.badge}
                        </div>
                      )}
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{pricePlans.starter.description}</p>
                    </div>
                    <div className="mt-6 space-y-3">
                      <button
                        type="button"
                        onClick={() => handleCheckout(pricePlans.starter!.id)}
                        disabled={loadingPriceId === pricePlans.starter.id}
                        className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white text-center shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <span>{loadingPriceId === pricePlans.starter.id ? 'Processing...' : (pricePlans.starter.ctaText || 'Buy Top Up Chotto')}</span>
                      </button>
                      <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                        By purchasing, you agree to our <Link to="/legal/terms" className="underline hover:text-slate-600">Terms</Link> & <Link to="/legal/disclaimer" className="underline hover:text-slate-600">Disclaimer</Link>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Standard Pack */}
                {pricePlans.standard && (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
                    <div className="space-y-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{pricePlans.standard.name}</span>
                      <p className="text-xs text-slate-500" lang="ja">いっぱい = lots</p>
                      <div>
                        <span className="text-4xl font-black text-slate-900 dark:text-white">{pricePlans.standard.price}</span>
                        <span className="text-xs text-slate-500 ml-1">{pricePlans.standard.period}</span>
                      </div>
                      {pricePlans.standard.badge && (
                        <div className="inline-block px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 text-xs font-bold leading-normal">
                          {pricePlans.standard.badge}
                        </div>
                      )}
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{pricePlans.standard.description}</p>
                    </div>
                    <div className="mt-6 space-y-3">
                      <button
                        type="button"
                        onClick={() => handleCheckout(pricePlans.standard!.id)}
                        disabled={loadingPriceId === pricePlans.standard.id}
                        className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white text-center shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <span>{loadingPriceId === pricePlans.standard.id ? 'Processing...' : (pricePlans.standard.ctaText || 'Buy Top Up Ippai')}</span>
                      </button>
                      <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                        By purchasing, you agree to our <Link to="/legal/terms" className="underline hover:text-slate-600">Terms</Link> & <Link to="/legal/disclaimer" className="underline hover:text-slate-600">Disclaimer</Link>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Pro Intensivist */}
                {pricePlans.pro && (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
                    <div className="space-y-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-600">{pricePlans.pro.name}</span>
                      <p className="text-xs text-slate-500" lang="ja">めっちゃ = super (casual)</p>
                      <div>
                        <span className="text-4xl font-black text-slate-900 dark:text-white">{pricePlans.pro.price}</span>
                        <span className="text-xs text-slate-500 ml-1">{pricePlans.pro.period}</span>
                      </div>
                      {pricePlans.pro.badge && (
                        <div className="inline-block px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 text-xs font-bold leading-normal">
                          {pricePlans.pro.badge}
                        </div>
                      )}
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{pricePlans.pro.description}</p>
                    </div>
                    <div className="mt-6 space-y-3">
                      <button
                        type="button"
                        onClick={() => handleCheckout(pricePlans.pro!.id)}
                        disabled={loadingPriceId === pricePlans.pro.id}
                        className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-center shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <span>{loadingPriceId === pricePlans.pro.id ? 'Processing...' : (pricePlans.pro.ctaText || 'Buy Top Up Meccha')}</span>
                      </button>
                      <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                        By purchasing, you agree to our <Link to="/legal/terms" className="underline hover:text-slate-600">Terms</Link> & <Link to="/legal/disclaimer" className="underline hover:text-slate-600">Disclaimer</Link>.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* それぞれのパックで、何をどのぐらい使えるかの比較（使い方の型を選べる） */}
              <div className="mt-12">
                <PlanUsageComparison plans={pricePlans} />
              </div>
            </section>
          </main>
          {/* 右下の「上へ戻る」ボタン（FAQ と同じ） */}
          <ScrollTopButton floatingClass="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white border border-blue-400 shadow-xl" />
        </div>
      )}
    </ToolPageWrapper>
  );
}
