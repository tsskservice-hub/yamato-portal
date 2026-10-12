import { useState } from "react";
import { Form, useNavigation, useActionData } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";

// Loader: 必要に応じてすでにログイン済みの場合はマイページやトップへリダイレクト
export async function loader({ request }: LoaderFunctionArgs) {
  // const { supabase } = createServerSupabaseClient(request);
  // const { data: { user } } = await supabase.auth.getUser();
  // if (user) return redirect("/settings/account");

  return json({});
}

// Action: ログイン処理（メールリンク、パスワード、またはパスキー認証などのフック）
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email");

  if (!email) {
    return json({ error: "Please enter your email address." }, { status: 400 });
  }

  // ここにSupabaseのサインイン処理（例: supabase.auth.signInWithOtp 等）が入ります
  
  // 仮の成功時リダイレクト
  return redirect("/settings/account");
}

export default function LoginRoute() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md border border-slate-200">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-slate-900">
            Sign in to AI Yamato
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Access your account, settings, and VCE Japanese tools.
          </p>
        </div>

        <Form method="post" className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email address
            </label>
            <div className="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="your.email@example.com"
                className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            {actionData && 'error' in actionData && actionData.error && (
              <p className="text-xs text-red-600 mt-1">{actionData.error as string}</p>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition disabled:opacity-50"
            >
              {isSubmitting ? "Signing in..." : "Continue with Email"}
            </button>
          </div>
        </Form>

        <div className="text-center pt-4 border-t border-slate-100">
          <a href="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            &larr; Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}