/**
 * @file SchoolAccountLink.tsx
 * @description 学校の Google / Microsoft アカウントを、今のアカウントに紐付けて学校メールを確認するボタン
 *
 * - 学校のメールには確認メールが届かないことがあるため、メールは送らずに Google / Microsoft のサインインでドメインを確認する
 * - 紐付けは supabase.auth.linkIdentity（Supabase の Auth 設定で「Manual linking」を有効にしておく必要がある）
 * - 使えるサインイン方法は VITE_SCHOOL_SSO_PROVIDERS（例: "google,azure"）で決める。空ならボタンを出さない
 */
import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '~/lib/supabaseClient';
import { SCHOOL_SSO_PROVIDERS, type SchoolSsoProvider } from '~/lib/teacher-config';

function enabledProviders() {
  const raw = String((import.meta as any).env?.VITE_SCHOOL_SSO_PROVIDERS ?? '');
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return SCHOOL_SSO_PROVIDERS.filter((p) => ids.includes(p.id));
}

type Props = {
  /** 確認済みの学校メール（サーバーで identities から取り出したもの） */
  verifiedEmails: Array<{ email: string }>;
  /** 紐付けのあと戻ってくるページ（例: /my-account） */
  returnPath: string;
  className?: string;
};

export function SchoolAccountLink({ verifiedEmails, returnPath, className = '' }: Props) {
  const providers = enabledProviders();
  const [busy, setBusy] = useState<SchoolSsoProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const link = async (provider: SchoolSsoProvider) => {
    setBusy(provider);
    setError(null);
    const { error: linkError } = await supabase.auth.linkIdentity({
      provider,
      options: {
        redirectTo: `${window.location.origin}${returnPath}`,
        // Microsoft はメールアドレスを受け取るために email スコープが必要
        ...(provider === 'azure' ? { scopes: 'email' } : {}),
      },
    });
    if (linkError) {
      setBusy(null);
      setError(
        /already/i.test(linkError.message)
          ? 'This school account is already linked to another AI Yamato account.'
          : 'Could not start school account sign-in. Please try again later.'
      );
    }
    // 成功するとそのまま Google / Microsoft のページへ移動する
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {verifiedEmails.length > 0 && (
        <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
          <ShieldCheck className="w-4 h-4" /> Verified school account: {verifiedEmails.map((e) => e.email).join(', ')}
        </p>
      )}

      {providers.length === 0 ? (
        <p className="text-xs text-slate-500">School account sign-in is not available yet. Please check back soon.</p>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          {providers.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={busy !== null}
              onClick={() => link(p.id)}
              className="px-4 py-2 text-sm font-semibold rounded-md border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              {busy === p.id ? 'Opening…' : `${verifiedEmails.length > 0 ? 'Link another' : 'Verify with'} ${p.label}`}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}

export default SchoolAccountLink;
