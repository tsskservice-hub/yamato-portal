// app/routes/sitemap[.]xml.ts
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";

export async function loader({ request }: LoaderFunctionArgs) {
  const baseUrl = "https://jptutoraiyamato.com";

  // プロジェクトの app/routes/ に存在する実際のページ一覧
  const routes = [
    "",                // _index.tsx (トップページ)
    "/contact",        // contact.tsx
    "/disclaimer",     // disclaimer.tsx
    "/eoy-oral-drill", // eoy-oral-drill.tsx
    "/eoy-oral-elaborate", // eoy-oral-elaborate.tsx
    "/eoy-oral-mock",  // eoy-oral-mock.tsx
    "/eoy-writing",    // eoy-writing.tsx
    "/game-igo",       // game-igo.tsx
    "/genkoyoshi-editor", // genkoyoshi-editor.tsx
    "/oral-exam-questions", // oral-exam-questions.tsx
    "/prices",         // prices.tsx
    "/privacy",        // privacy.tsx
    "/settings.account", // settings.account.tsx
    "/terms",          // terms.tsx
  ];

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