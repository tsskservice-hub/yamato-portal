// app/routes/sitemap[.]xml.ts
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
// 自動生成されたルート一覧をインポート
import { generatedRoutes } from "../routes.generated";

export async function loader({ request }: LoaderFunctionArgs) {
  const baseUrl = "https://jptutoraiyamato.com";

  // トップページ（""）が自動生成リストに含まれていない場合に備え、安全に結合・確保する処理
  const routes = generatedRoutes.includes("") ? generatedRoutes : ["", ...generatedRoutes];

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (route) => `  <url>
    <loc>${baseUrl}${route}</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${route === "" ? "1.0" : "0.8"}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(xmlContent, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}