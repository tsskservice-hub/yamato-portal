/**
 * @file root.tsx
 * @description アプリケーション大元レイアウト（グローバルローダー・Realtimeクレジット同期・learning_pace & データベース連動 is_teacher 対応・ノーキャッシュ対応版）
 */
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRevalidator,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import React, { useEffect } from "react";
import { createServerSupabaseClient } from "./lib/supabase.server";
import { supabase } from "./lib/supabaseClient";

// Vite の URL インポート機能を使用して Tailwind CSS を確実に読み込む
import stylesheet from "./tailwind.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  // 💡 ヤマトのアイコンをファビコンとして設定
  { rel: "icon", href: "/jptutoraiyamato.png", type: "image/png" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap",
  },
];

// 💡 グローバルローダー：常に最新のユーザー情報と profiles データを取得し、キャッシュを残さないように設定
export async function loader({ request, context }: LoaderFunctionArgs) {
  const { supabase: serverSupabase } = createServerSupabaseClient(request, context);
  const { data: { user } } = await serverSupabase.auth.getUser();

  let nickname = "";
  let credits = 10;
  let plan = "Free Plan";
  let learningPace: "steady" | "normal" | "accelerated" = "normal"; // デフォルト値
  let isTeacher = false; // 💡 初期値

  if (user) {
    // 💡 profiles テーブルから nickname, credits, learning_pace, is_teacher を取得
    const { data: profile, error } = await serverSupabase
      .from("profiles")
      .select("nickname, credits, learning_pace, is_teacher")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && !error) {
      nickname = (profile as any).nickname ?? "";
      credits = (profile as any).credits ?? 10;
      
      // 💡 データベースの is_teacher カラムの値を正しく反映させる
      isTeacher = Boolean((profile as any).is_teacher); 
      
      // データベースの値が有効な形式であれば反映、そうでなければデフォルト
      const dbPace = (profile as any).learning_pace;
      if (dbPace === "steady" || dbPace === "normal" || dbPace === "accelerated") {
        learningPace = dbPace;
      }
    }
  }

  // 💡 常に最新のデータベース状態を反映させるため、キャッシュをさせないヘッダーを付与する
  return json(
    {
      user,
      nickname,
      credits,
      plan,
      learningPace,
      isTeacher, // ★ここでデータベース上の教師判定フラグをルートデータとして全体に共有する
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    }
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const data = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();

  // 🔄 アプリ全体（どのページにいても）で Supabase Realtime を用いて profiles テーブルの変更を監視し、自動同期する
  useEffect(() => {
    if (!data.user?.id) return;

    const channel = supabase
      .channel(`public:global_profiles:${data.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${data.user.id}`,
        },
        () => {
          // データベース上の残高やプロフィールに変動があった場合、自動的にローダーを再実行して全体を同期
          revalidator.revalidate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [data.user?.id, revalidator]);

  return <Outlet />;
}