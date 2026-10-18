/**
 * @file root.tsx
 * @description アプリケーション大元レイアウト（グローバルローダー・learning_pace対応 & ノーキャッシュ対応版）
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

// 💡 グローバルローダー：常に最新のユーザー情報と profiles データ（learning_pace含む）を取得し、キャッシュを残さないように設定
export async function loader({ request, context }: LoaderFunctionArgs) {
  const { supabase: serverSupabase } = createServerSupabaseClient(request, context);
  const { data: { user } } = await serverSupabase.auth.getUser();

  let nickname = "";
  let credits = 10;
  let plan = "Free Plan";
  let learningPace: "steady" | "normal" | "accelerated" = "normal"; // デフォルト値

  if (user) {
    // 💡 profiles テーブルから nickname, credits に加えて learning_pace を取得
    const { data: profile, error } = await serverSupabase
      .from("profiles")
      .select("nickname, credits, learning_pace")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && !error) {
      nickname = (profile as any).nickname ?? "";
      credits = (profile as any).credits ?? 10;
      
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
      learningPace, // ★ここでルートデータとして全体に共有する
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
  return <Outlet />;
}