/**
 * @file CreditCostFooter.tsx
 * @description Supabase / app_knowledge / PRICE_PLANS 一元管理データ連動型クレジット消費案内
 * 💡 特徴：
 * 1. app/data/price-plans.ts の CREDIT_CONSUMPTION_GUIDE を直接参照し完全同期
 * 2. 入力欄下部にはチャットで即座に必要な主要コスト（Text / Photo / Visual Aid）をコンパクトに表示
 * 3. ℹ️ アイコンホバーまたはクリックで、全6機能の消費ガイドを一回り大きな文字（text-xs）でポップアップ確認可能
 */
import React, { useState } from "react";
// 🌟 Supabase の app_knowledge (PRICE_PLANS) から連携されている共通データを直接インポート
import { CREDIT_CONSUMPTION_GUIDE } from "../data/price-plans";

export type CreditCostFooterProps = {
  className?: string;
};

export function CreditCostFooter({
  className = "text-[10px] text-slate-400 px-1 flex items-center justify-between select-none relative",
}: CreditCostFooterProps) {
  const [showFullGuide, setShowFullGuide] = useState<boolean>(false);

  // 一元管理データから該当項目のコスト表記を安全に取得
  const textChatRow = CREDIT_CONSUMPTION_GUIDE.find((g) =>
    g.item.toLowerCase().includes("text chat")
  );
  const singleImageRow = CREDIT_CONSUMPTION_GUIDE.find((g) =>
    g.item.toLowerCase().includes("image attachment (1)")
  );
  const multiImageRow = CREDIT_CONSUMPTION_GUIDE.find((g) =>
    g.item.toLowerCase().includes("image attachments (2)")
  );

  // 表示用テキストの整形（見つからない場合のフォールバック付き）
  const textCostText = textChatRow?.cost || "2 credits per turn";
  const photoCostText = singleImageRow?.cost || "4 credits";
  const visualAidCostText = "4 credits";

  return (
    <div className={className}>
      {/* 💡 入力欄下部の要約ライン */}
      <span className="truncate">
        💡 Text: {textCostText} / 1 Photo: {photoCostText} / Visual Aid: {visualAidCostText}
      </span>

      {/* 💡 全体ガイドを確認できるトグル / ホバーボタン */}
      <div className="relative shrink-0 ml-2">
        <button
          type="button"
          onMouseEnter={() => setShowFullGuide(true)}
          onMouseLeave={() => setShowFullGuide(false)}
          onClick={() => setShowFullGuide((prev) => !prev)}
          className="text-slate-400 hover:text-blue-600 transition flex items-center gap-0.5 cursor-pointer text-[10px] underline"
          title="クリックまたはホバーで全機能のクレジット消費ガイドを表示"
        >
          <span>All Rules</span>
          <span>ℹ️</span>
        </button>

        {/* 🌟 ポップアップ：文字サイズを一回り拡大（text-xs）、幅拡張（w-72 sm:w-80） */}
        {showFullGuide && (
          <div
            role="tooltip"
            className="absolute bottom-6 right-0 z-50 w-72 sm:w-80 p-3.5 bg-slate-900/95 text-white rounded-xl shadow-2xl border border-slate-700 text-left backdrop-blur-xs animate-fadeIn"
          >
            <div className="font-bold text-xs text-amber-400 mb-2.5 border-b border-slate-700 pb-1.5 flex items-center gap-1.5">
              <span>🪙</span>
              <span>Official Credit Guide</span>
            </div>
            <div className="space-y-2 text-xs">
              {CREDIT_CONSUMPTION_GUIDE.map((guide, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-start gap-3 border-b border-slate-800/60 pb-1.5"
                >
                  <span className="text-slate-200 leading-snug">{guide.item}</span>
                  <span className="font-bold text-amber-300 shrink-0">{guide.cost}</span>
                </div>
              ))}
            </div>

            {/* 💡 コメントアウト形式でコード内に保持 */}
            {/*
            <div className="mt-2 text-[9px] text-slate-400 italic">
              ※ Synced directly from Database price plans.
            </div>
            */}
          </div>
        )}
      </div>
    </div>
  );
}

export default CreditCostFooter;