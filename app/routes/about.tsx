/**
 * @file about.tsx
 * @description About AI Yamato Japanese Hub - Vision, Educator Background, and Platform Features (English-only)
 */
import React from 'react';
import { Link } from '@remix-run/react';
import type { MetaFunction } from "@remix-run/cloudflare";
import { Sparkles, BookOpen, Users, Heart } from 'lucide-react';
import PageLayout from '../components/PageLayout';

export const meta: MetaFunction = () => {
  return [
    { title: "About Us & Vision | AI Yamato Japanese Tutoring" },
    {
      name: "description",
      content: "Discover the educational background, vision, and AI-powered personalized learning features of AI Yamato, created by an experienced VCE Japanese educator.",
    },
  ];
};

export default function AboutPage() {
  return (
    <PageLayout>
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-800 pb-16">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16 px-4 sm:px-6 lg:px-8 shadow-md">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-blue-100 text-xs font-semibold tracking-wider uppercase">
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
        </div>

        {/* Main Content Container */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-12">

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

          {/* Section 2: "Jūnin Toshiro" – Embracing Individuality */}
          <div className="bg-gradient-to-br from-indigo-900 to-blue-900 text-white rounded-3xl p-8 sm:p-10 shadow-lg space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-blue-300">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                "Jūnin Toshiro" (十人十色): Ten People, Ten Colors
              </h2>
            </div>

            <div className="text-blue-100 space-y-4 text-sm sm:text-base leading-relaxed">
              <p>
                In Japanese, there is a wonderful idiom: <em>"Jūnin toshiro"</em>—meaning everyone is unique, and no two individuals are alike. 
              </p>
              <p>
                Whether you missed school and fell behind in your Japanese progress, desperately want to study more advanced Japanese without the local environment to support it, or find the language challenging but are fascinated by Japanese culture as a gateway to learning—your journey is your own. 
              </p>
              <p className="font-semibold text-white">
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
                How AI Yamato Supports You 24/7
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3">
                <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>Persistent AI Companion</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  AI Yamato stays resident at the bottom-right of every learning page, ready to answer your questions and guide your studies 24 hours a day, 365 days a year.
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

          {/* Section 4: A Tribute to Busy Teachers */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-8 sm:p-10 shadow-sm space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto shadow-sm">
              <Heart className="w-6 h-6" />
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

        </div>
      </div>
    </PageLayout>
  );
}