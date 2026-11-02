/**
 * @file seoMeta.ts
 * @description Supabaseの PORTAL_CONTENT データ構造に基づき、各ページのメタタグを動的生成するヘルパー
 */

// ポータルコンテンツの型定義（必要に応じて調整してください）
interface ModuleItem {
  id: string;
  name: string;
  path: string;
  description: string;
}

interface PortalContent {
  modulesSection: {
    section1: { modules: ModuleItem[] };
    section2: { modules: ModuleItem[] };
  };
}

/**
 * 指定されたパス（例: "/kanji-grammar-checker"）に対応するモジュール情報を
 * PORTAL_CONTENT から探し出し、Remix用のメタタグ配列を返します。
 * 見つからない場合はデフォルト値を返します。
 */
export function generateModuleMeta(portalContent: PortalContent | null, currentPath: string) {
  // デフォルト値
  let title = "AI Yamato Japanese Hub | VCE & Japanese Learning Portal";
  let description = "Experience precision AI-driven Japanese tutoring backed by decades of expert classroom teaching.";
  let keywords = "Japanese learning, VCE Japanese, Japanese tutor, AI tutor, Genkoyoshi";

  if (portalContent && portalContent.modulesSection) {
    const allModules = [
      ...(portalContent.modulesSection.section1?.modules || []),
      ...(portalContent.modulesSection.section2?.modules || []),
    ];

    const matchedModule = allModules.find((m) => m.path === currentPath);

    if (matchedModule) {
      title = `${matchedModule.name} | AI Yamato Portal`;
      description = matchedModule.description;
      keywords = `VCE Japanese, ${matchedModule.name}, Japanese learning portal, AI Yamato`;
    }
  }

  return [
    { title },
    { name: "description", content: description },
    { name: "keywords", content: keywords },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}