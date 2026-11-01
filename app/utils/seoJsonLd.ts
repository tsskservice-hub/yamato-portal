/**
 * @file seoJsonLd.ts
 * @description パスやデータに応じて組織用・アプリ用の構造化データを自動切替するヘルパー
 */

export function generatePageJsonLd(currentPath: string, portalContent?: any) {
  const baseUrl = "https://jptutoraiyamato.com";

  // ① ホームページ（"/"）の場合は「教育組織（EducationalOrganization）」を返す
  if (currentPath === "/" || currentPath === "") {
    return {
      "@context": "https://schema.org",
      "@type": "EducationalOrganization",
      "name": "AI Yamato Japanese Hub",
      "url": baseUrl,
      "logo": `${baseUrl}/jptutoraiyamato.png`,
      "description": "Precision AI-driven Japanese tutoring and VCE Japanese examination preparation portal.",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Victoria",
        "addressCountry": "AU"
      }
    };
  }

  // ② 各学習ツールページの場合は、Supabaseのデータから該当モジュールを探して「ソフトウェア（SoftwareApplication）」を返す
  let appName = "Japanese Learning Tool";
  let appDescription = "Precision AI-driven Japanese learning module.";

  if (portalContent && portalContent.modulesSection) {
    const allModules = [
      ...(portalContent.modulesSection.section1?.modules || []),
      ...(portalContent.modulesSection.section2?.modules || []),
    ];
    const matched = allModules.find((m) => m.path === currentPath);
    if (matched) {
      appName = matched.name;
      appDescription = matched.description;
    }
  }

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": `${appName} | AI Yamato Portal`,
    "operatingSystem": "All",
    "applicationCategory": "EducationalApplication",
    "description": appDescription,
    "url": `${baseUrl}${currentPath}`,
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "AUD"
    }
  };
}