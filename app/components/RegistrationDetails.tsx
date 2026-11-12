/**
 * @file RegistrationDetails.tsx
 * @description アカウントの登録詳細情報（メールアドレス、プラン、クレジット残高、作成日）を表示するモジュール
 */
import React from "react";

export type RegistrationDetailsProps = {
  email: string;
  plan: string;
  credits: number;
  createdAt: string;
  className?: string;
};

export function RegistrationDetails({
  email,
  plan,
  credits,
  createdAt,
  className = "",
}: RegistrationDetailsProps) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-6 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900 border-b pb-3">Registration Details</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
        <div>
          <span className="block text-gray-500">Email Address</span>
          <span className="font-medium text-gray-900">{email || "Loading..."}</span>
        </div>
        <div>
          <span className="block text-gray-500">Current Plan</span>
          <span className="font-medium text-gray-900">{plan}</span>
        </div>
        <div>
          <span className="block text-gray-500">Credit Balance</span>
          <span className="font-medium text-gray-900">{credits} pts</span>
        </div>
        <div>
          <span className="block text-gray-500">Account Created</span>
          <span className="font-medium text-gray-900">{createdAt}</span>
        </div>
      </div>
    </div>
  );
}

export default RegistrationDetails;