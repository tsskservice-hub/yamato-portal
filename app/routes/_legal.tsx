// app/routes/_legal.tsx
import { Outlet } from "@remix-run/react";

export default function LegalLayout() {
  return (
    <div>
      {/* 必要に応じて共通のヘッダーやラッパーをここに記述できます */}
      <Outlet />
    </div>
  );
}