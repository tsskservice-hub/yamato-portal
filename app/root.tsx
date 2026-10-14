/**
 * @file root.tsx
 * @description アプリケーション大元レイアウト（グローバルローダー・ユーザー/プロフィールデータ自動取得対応版）
 */
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { createServerSupabaseClient } from "./lib/supabase.server";

// Vite の URL インポート機能を使用して Tailwind CSS を確実に読み込む
import stylesheet from "./tailwind.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
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

// 💡 グローバルローダー：全ページ共通でユーザー情報とprofilesテーブルのニックネーム・クレジットを自動取得
export async function loader({ request, context }: LoaderFunctionArgs) {
  const { supabase: serverSupabase } = createServerSupabaseClient(request, context);
  const { data: { user } } = await serverSupabase.auth.getUser();

  let nickname = "";
  let credits = 10;
  let plan = "Free Plan";

  if (user) {
    const { data: profile } = await serverSupabase
      .from("profiles")
      .select("nickname, credits, plan")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      nickname = (profile as any).nickname ?? "";
      credits = (profile as any).credits ?? 10;
      plan = (profile as any).plan ?? "Free Plan";
    }
  }

  return json({
    user,
    nickname,
    credits,
    plan,
  });
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
  return <Outlet />;
}