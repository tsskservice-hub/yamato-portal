/**
 * @file app/components/Breadcrumbs.tsx
 * @description サイト共通のパンくずリストコンポーネント（パスの自動整形対応）
 */

import React from "react";
import { Link } from "@remix-run/react";
import { Home, ChevronRight } from "lucide-react";

interface BreadcrumbsProps {
  pathname: string;
  breadcrumbTitle?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ pathname, breadcrumbTitle }) => {
  if (pathname === "/") return null;

  const paths = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; path: string }[] = [];

  let currentPath = "";
  paths.forEach((segment, index) => {
    currentPath += `/${segment}`;

    let label = segment.replace(/-/g, " ");
    label = label.charAt(0).toUpperCase() + label.slice(1);

    // 特殊なページのラベル調整
    if (segment === "eoy-writing") label = "EOY Writing Practice";
    if (segment === "kanji-grammar-checker") label = "Kanji & Grammar Checker";
    if (segment === "dashboard") label = "Dashboard";

    // レッスンのパス（例：family-1）は共通の整形で "Family 1" になる

    // ページ側から明示的なタイトルが渡されている場合は一番最後のラベルを上書き
    if (index === paths.length - 1 && breadcrumbTitle) {
      label = breadcrumbTitle;
    }

    crumbs.push({ label, path: currentPath });
  });

  return (
    <nav aria-label="Breadcrumb" className="w-full border-b px-4 py-2.5 text-xs sm:text-sm font-medium bg-slate-50 border-slate-200 text-slate-600">
      <div className="max-w-4xl mx-auto flex items-center space-x-2 overflow-x-auto whitespace-nowrap">
        <Link to="/" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <div key={crumb.path} className="flex items-center space-x-2">
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {isLast ? (
                <span className="font-bold text-slate-800">
                  {crumb.label}
                </span>
              ) : (
                <Link to={crumb.path} className="hover:text-blue-600 transition-colors">
                  {crumb.label}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
};