import { useState, useEffect } from "react";
import { Form, useNavigation, useActionData, useNavigate } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { createServerSupabaseClient } from "../lib/supabase.server";
import { supabase } from "../lib/supabaseClient";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { supabase: serverSupabase } = createServerSupabaseClient(request, context);
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (user) {
    return redirect("/settings/account");
  }
  return json({});
}

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "").trim();

  if (!email) {
    return json({ error: "Please enter your email address." }, { status: 400 });
  }

  const { supabase: serverSupabase, headers } = createServerSupabaseClient(request, context);

  const { error } = await serverSupabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${new URL(request.url).origin}/settings/account`,
    },
  });

  if (error) {
    return json({ error: "Failed to send login link: " + error.message }, { status: 500 });
  }

  return json({ success: true, message: "Check your email for the login link!" }, { headers });
}

export default function AuthEmailRoute() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    const handleAuthRedirect = async () => {
      const hash = window.location.hash;
      const search = window.location.search;

      if ((hash && hash.includes("access_token")) || search.includes("code=")) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate("/settings/account", { replace: true });
        }
      }
    };

    handleAuthRedirect();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md border border-slate-200">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-slate-900">
            Email Sign-In (Backup)
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Use this fallback method if your passkey is unavailable.
          </p>
        </div>

        {actionData && 'success' in actionData && actionData.success ? (
          <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-md text-sm text-center">
            {actionData.message}
          </div>
        ) : (
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
                {isSubmitting ? "Sending link..." : "Continue with Email"}
              </button>
            </div>
          </Form>
        )}

        <div className="text-center pt-4 border-t border-slate-100">
          <a href="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            &larr; Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}