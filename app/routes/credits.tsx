/**
 * @file credits.tsx
 * @description クレジット（/credits）。サイトで使っている AI の声・AI サービス・写真や絵の出どころ
 * 中身は app/data/credits.ts（新しいサービスを使い始めたら、そこに足す）
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import React, { useRef } from "react";
import { generateModuleMeta } from "~/utils/seoMeta";
import { ToolPageWrapper } from "~/components/layout/ToolPageWrapper";
import { type PageLayoutRef } from "~/components/layout/PageLayout";
import { VOICE_SERVICES, AI_SERVICES, PICTURE_SOURCES, type CreditItem } from "~/data/credits";

export async function loader({ request }: LoaderFunctionArgs) {
  return json({ currentPath: new URL(request.url).pathname });
}

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta(null, data?.currentPath || "/credits");
};

function CreditList({ items }: { items: CreditItem[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.name + item.usedFor[0]} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <p className="font-bold text-slate-900">
            {item.link ? (
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-indigo-700 hover:underline">
                {item.name}
              </a>
            ) : (
              item.name
            )}
          </p>
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-600 space-y-0.5">
            {item.usedFor.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

export default function CreditsPage() {
  const layoutRef = useRef<PageLayoutRef>(null);
  return (
    <ToolPageWrapper layoutRef={layoutRef}>
      <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto bg-white shadow-sm rounded-2xl p-6 sm:p-10 border border-slate-200 space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Credits</h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              AI Yamato uses services and materials from other providers. Thank you to all of them.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-900">🔊 AI Voices</h2>
            <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-slate-700">
              <strong>All the voices you hear on this site are AI-generated.</strong> They are not recordings of real
              people.
            </p>
            <CreditList items={VOICE_SERVICES} />
            <p className="text-xs text-slate-500">
              If an audio file cannot be played, your device&apos;s built-in voice may read the text instead.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-900">🤖 AI Services</h2>
            <CreditList items={AI_SERVICES} />
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-900">🖼️ Photos and Pictures</h2>
            <CreditList items={PICTURE_SOURCES} />
          </section>
        </div>
      </div>
    </ToolPageWrapper>
  );
}
