/**
 * @file DeleteAccountModal.tsx
 * @description アカウント削除セクションおよび確認用モーダルを管理する独立モジュールコンポーネント
 */
import React, { useState } from "react";
import { useFetcher } from "@remix-run/react";

export type DeleteAccountModalProps = {
  className?: string;
};

export function DeleteAccountModal({ className = "" }: DeleteAccountModalProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const fetcher = useFetcher<{ success?: boolean; error?: string }>();

  return (
    <div className={`bg-white border border-red-200 rounded-lg shadow-sm p-6 space-y-4 ${className}`}>
      <div className="border-b border-red-100 pb-4">
        <h2 className="text-lg font-semibold text-red-600">Delete Account</h2>
        <p className="text-sm text-gray-600 mt-1">
          Deleting your account will permanently erase all saved data, learning history, purchased credits, and personal information. This action cannot be undone.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition cursor-pointer"
        >
          Delete Account
        </button>
      </div>

      {/* 削除確認モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-6">
            <h3 className="text-xl font-bold text-gray-900">Are you sure you want to delete your account?</h3>
            <p className="text-sm text-gray-600">
              To confirm, please type <span className="font-semibold text-gray-900">「DELETE」</span> in the field below.
            </p>

            <fetcher.Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="delete-account" />
              <input
                type="text"
                name="confirmText"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Type 'DELETE'"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-slate-900"
                required
              />
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={confirmInput !== "DELETE"}
                  className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                >
                  Permanently Delete
                </button>
              </div>
            </fetcher.Form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeleteAccountModal;