/**
 * @file about.tsx
 * @description About AI Yamato Japanese Hub - Vision, Educator Background, and Platform Features (English-only)
 */
import React, { useRef } from 'react';
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { useLoaderData, Link } from '@remix-run/react';
import { Sparkles, BookOpen, Users, Heart, Cpu } from 'lucide-react';
import { createServerSupabaseClient } from '~/lib/supabase.server';
import { generateModuleMeta } from '~/utils/seoMeta';
import { ToolPageWrapper } from '~/components/ToolPageWrapper';
import { type PageLayoutRef } from '~/components/PageLayout';
import ScrollTopButton from '~/components/ScrollTopButton';

// ① Supabase から PORTAL_CONTENT をサーバー側で取得
export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const { supabase } = createServerSupabaseClient(request, context);

  let portalContent = null;
  try {
    const { data: portalData } = await supabase
      .from('portal_settings')
      .select('content')
      .eq('key', 'PORTAL_CONTENT')
      .single();
    portalContent = portalData?.content || null;
  } catch (e) {
    console.error("Loader error fetching portal content:", e);
  }

  return json({
    portalContent,
    currentPath: url.pathname,
  });
}

// ② 共通SEOヘルパーでメタタグ（title, description）を自動生成
export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta(data?.portalContent || null, data?.currentPath || "");
};

// ③ ページコンポーネント（ToolPageWrapper で囲む）
export default function AboutPage() {
  const layoutRef = useRef<PageLayoutRef>(null);
  const { portalContent, currentPath } = useLoaderData<typeof loader>();

  return (
    <ToolPageWrapper layoutRef={layoutRef}>
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-8 sm:p-12 rounded-3xl shadow-md space-y-4 text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-blue-100 text-xs font-semibold tracking-wider uppercase mx-auto">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Our Vision & Story</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Bridging the Gap in Language Education with AI
          </h1>
          <p className="text-blue-100 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Rooted in decades of real-world secondary school teaching experience in Australia, AI Yamato brings true personalisation and differentiation to every Japanese learner.
          </p>
        </div>

        {/* Section 1: The Educator's Reflection */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              The Realities of the Classroom & The Birth of AI Yamato
            </h2>
          </div>
          
          <div className="prose prose-slate max-w-none text-slate-700 space-y-4 text-sm sm:text-base leading-relaxed">
            <p>
              During my decades as a full-time Japanese language teacher in Victorian secondary schools in Australia, I constantly heard two buzzwords: <strong>personalising</strong> and <strong>differentiation</strong>. There is no doubt that educators strive to achieve them. But how many schools and classrooms in the real world truly attain this ideal?
            </p>
            <p>
              Due to institutional constraints, teacher workloads, diverse student backgrounds, and daily unforeseen hurdles, student learning in a traditional classroom setting is not always optimal. I firmly believe that the evolution of artificial intelligence offers a powerful key to solving this enduring challenge.
            </p>
          </div>
        </div>

        {/* Section 2: "Jūnin Toiro" – Embracing Individuality */}
        <div className="bg-gradient-to-br from-pink-50 to-rose-100 border border-pink-200 rounded-3xl p-8 sm:p-10 shadow-sm space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/10 flex items-center justify-center text-pink-600">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              "Jūnin Toiro" (十人十色): Ten People, Ten Colors
            </h2>
          </div>

          <div className="text-slate-700 space-y-4 text-sm sm:text-base leading-relaxed">
            <p>
              In Japanese, there is a wonderful idiom: <em>"Jūnin Toiro"</em>—meaning everyone is unique, and no two individuals are alike. 
            </p>
            <p>
              Whether you missed school and fell behind in your Japanese progress, desperately want to study more advanced Japanese without the local environment to support it, or find the language challenging but are fascinated by Japanese culture as a gateway to learning—your journey is your own. 
            </p>
            <p className="font-semibold text-slate-900">
              Our mission is to provide every single learner with personalised, differentiated support tailored precisely to your own learning pace and personal interests.
            </p>
          </div>
        </div>

        {/* Section 3: Platform Features & How AI Yamato Works */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm space-y-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              How AI Yamato Supports You
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>Persistent AI Companion</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                AI Yamato stays resident at the bottom-right of every learning page, ready to support your studies around the clock (subject to regular scheduled maintenance).
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>3-Tier Learning Pace</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Choose from three distinct learning paces (Steady, Normal, Accelerated) so the AI adapts its explanations and feedback directly to your comfort level.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>Visual AI Generation</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Beyond text chat, you can choose the AI image generation feature to receive visual explanations that make complex concepts intuitive and engaging.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>Credits & Daily Rewards</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Platform access uses a flexible credit system. Credits can be purchased or earned through welcome bonuses and daily interactive quizzes.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Robust Technology & Secure Infrastructure */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
              <Cpu className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Robust Technology & Secure Infrastructure
            </h2>
          </div>
          
          <div className="prose prose-slate max-w-none text-slate-700 space-y-4 text-sm sm:text-base leading-relaxed">
            <p>
              To provide a seamless, secure, and high-performance learning environment, AI Yamato is built on a modern and trusted technology stack:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li><strong>Supabase:</strong> Powers our secure database and passwordless passkey authentication.</li>
              <li><strong>Cloudflare & GitHub:</strong> Ensure reliable global site deployment and high-speed delivery.</li>
              <li><strong>Stripe:</strong> Delivers secure and seamless payment processing for credit packs.</li>
              <li><strong>Google Cloud, OpenAI & ElevenLabs:</strong> Provide state-of-the-art artificial intelligence models for intelligent tutoring, natural interactions, and voice synthesis.</li>
            </ul>
          </div>
        </div>

        {/* Section 5: A Tribute to Dedicated Teachers */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-8 sm:p-10 shadow-sm space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center mx-auto shadow-sm">
            <Heart className="w-6 h-6 fill-pink-500 text-pink-600 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-blue-900">
            A Message for Dedicated Teachers
          </h2>
          <p className="text-sm sm:text-base text-blue-800 max-w-2xl mx-auto leading-relaxed">
            Finally, to all teachers currently working under immense pressure and heavy workloads: I sincerely hope this platform serves as a helpful assistant in your teaching journey. May it ultimately afford you more precious moments to connect directly with your students inside the classroom.
          </p>
          <div className="pt-4">
            <Link 
              to="/" 
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md transition-all space-x-2"
            >
              <span>Explore Portal Dashboard</span>
            </Link>
          </div>
        </div>

        {/* 💡 スクロールトップボタン配置 */}
        <ScrollTopButton floatingClass="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white border border-blue-400 shadow-xl" />
      </div>
    </ToolPageWrapper>
  );
}
