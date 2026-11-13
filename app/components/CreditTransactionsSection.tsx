/**
 * @file CreditTransactionsSection.tsx
 * @description ユーザーのクレジット増減履歴（獲得・消費）を一覧表示する独立モジュールコンポーネント
 */
import React from "react";
import { History, ArrowUpRight, ArrowDownRight } from "lucide-react";

export type CreditTransaction = {
  id: string | number;
  amount: number;
  feature_used?: string;
  description?: string;
  created_at: string;
  expires_at?: string;
  /** この増減のあとの残高（Supabase の関数が記録。07_credit_balance_history.sql） */
  balance_after?: number | null;
};

export type CreditTransactionsSectionProps = {
  transactions: CreditTransaction[];
  isLoading: boolean;
  className?: string;
};

export function CreditTransactionsSection({
  transactions,
  isLoading,
  className = "",
}: CreditTransactionsSectionProps) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900 border-b pb-3 flex items-center gap-2">
        <History className="w-5 h-5 text-blue-600" /> Credit Transactions History
      </h2>
      <p className="text-xs text-gray-500">
        A complete record of all credits earned (such as daily quizzes or top-ups) and credits consumed across AI features.
      </p>

      {isLoading ? (
        <div className="text-center py-8 text-sm text-gray-500 italic bg-gray-50 rounded-lg animate-pulse">
          Loading transactions history...
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-500 italic bg-gray-50 rounded-lg">
          No credit transactions recorded yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
                <th className="py-2.5 px-3 font-semibold">Date / Time</th>
                <th className="py-2.5 px-3 font-semibold">Feature / Type</th>
                <th className="py-2.5 px-3 font-semibold">Description</th>
                <th className="py-2.5 px-3 font-semibold text-right">Amount</th>
                <th className="py-2.5 px-3 font-semibold text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((tx) => {
                const isPositive = tx.amount > 0;
                const formattedDate = new Date(tx.created_at).toLocaleString("en-AU", {
                  dateStyle: "medium",
                  timeStyle: "short",
                });

                return (
                  <tr key={tx.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                      {formattedDate}
                    </td>
                    <td className="py-3 px-3 font-medium text-gray-900 whitespace-nowrap">
                      {tx.feature_used || "general"}
                    </td>
                    <td className="py-3 px-3 text-gray-600 max-w-xs truncate" title={tx.description || ""}>
                      {tx.description || "-"}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-full font-bold ${
                          isPositive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                        {isPositive ? `+${tx.amount}` : tx.amount} pts
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap font-semibold text-gray-900 tabular-nums">
                      {typeof tx.balance_after === "number" ? `${tx.balance_after} pts` : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default CreditTransactionsSection;