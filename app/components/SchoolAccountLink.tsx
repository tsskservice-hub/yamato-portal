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
import { GOOGLE_SIGNUP_URL, SCHOOL_SSO_PROVIDERS, type SchoolSsoProvider } from '~/lib/teacher-config';

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
  /** 先生向けに「学校が Google を使っていない場合」の案内（学校のメールで Google アカウントを作る方法）を出す */
  teacherHelp?: boolean;
  className?: string;
};

export function SchoolAccountLink({ verifiedEmails, returnPath, teacherHelp = false, className = '' }: Props) {
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

      {/* 学校が Google を使っていない先生：学校のメールのまま Google アカウントを作れば、同じボタンで確認できる */}
      {teacherHelp && verifiedEmails.length === 0 && providers.some((p) => p.id === 'google') && (
        <details className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
          <summary className="font-semibold text-slate-700 cursor-pointer">My school doesn&apos;t use Google accounts</summary>
          <p className="mt-2">You can create a free Google account with your school email address. It takes about 5 minutes:</p>
          <ol className="list-decimal pl-5 mt-1 space-y-0.5">
            <li>
              Open{' '}
              <a href={GOOGLE_SIGNUP_URL} target="_blank" rel="noopener noreferrer" className="text-indigo-700 font-semibold hover:underline">
                Google&apos;s sign-up page
              </a>{' '}
              (a private browser window is easiest).
            </li>
            <li>When asked for an email address, choose <strong>&quot;Use your existing email&quot;</strong> and enter your school email.</li>
            <li>Enter the code Google sends to your school inbox, then choose a password.</li>
            <li>Come back here and press <strong>&quot;Verify with Google&quot;</strong>, signing in with that account.</li>
          </ol>
          <p className="mt-1">Some schools have rules about using school email for other services, so check with your school if you are unsure.</p>
        </details>
      )}
    </div>
  );
}

export default SchoolAccountLink;
