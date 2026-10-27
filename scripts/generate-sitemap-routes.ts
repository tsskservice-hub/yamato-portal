// scripts/generate-sitemap-routes.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routesDir = path.join(__dirname, "../app/routes");

function getRoutes(dir: string, base = ""): string[] {
  let routes: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      routes = routes.concat(getRoutes(fullPath, `${base}/${entry.name}`));
    } else if (entry.isFile()) {
      let name = entry.name.replace(/\.(tsx|ts|jsx|js)$/, "");

      // プレフィックスやサイトマップ自体、ルートファイル、および指定した除外ページをスキップ
      if (
        name.startsWith("_") ||
        name.includes("sitemap") ||
        name === "root" ||
        name === "test-yamato" ||
        name === "test-yamato-note" ||
        name === "image-test"
      ) {
        continue;
      }

      if (name === "_index" || name === "index") {
        routes.push(base === "" ? "" : base);
        continue;
      }

      routes.push(`${base}/${name}`);
    }
  }

  return routes;
}

const routes = getRoutes(routesDir);
const uniqueRoutes = Array.from(new Set(routes)).sort();

const fileContent = `// このファイルは自動生成されます。直接編集しないでください。
export const generatedRoutes: string[] = ${JSON.stringify(uniqueRoutes, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, "../app/routes.generated.ts"), fileContent);
console.log("✅ Sitemap routes generated successfully.");