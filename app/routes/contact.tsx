/**
 * @file contact.tsx
 * @description お問い合わせページ（Supabase LEGAL_CONTENTS 100%動的連動・DataErrorState版）
 */
import { useState, useEffect, useCallback } from "react";
import type { MetaFunction, ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Link, useActionData, useNavigation, useRouteLoaderData } from "@remix-run/react";
import PageLayout from "../components/PageLayout";
import DataErrorState from "../components/DataErrorState";
import { fetchLegalContentData, LegalDocument } from "../data/legal-content";
import { supabase } from "../lib/supabaseClient";

export const meta: MetaFunction = () => {
  return [
    { title: "Contact Us | AI Yamato Japanese Tutoring" },
    {
      name: "description",
      content: "Contact the AI Yamato team for support, technical help, feedback, and school classroom licensing.",
    },
  ];
};

type ActionData = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const name = formData.get("name");
  const email = formData.get("email");
  const message = formData.get("message");

  if (!name || !email || !message) {
    return json<ActionData>(
      { success: false, error: "Please fill in all required fields." },
      { status: 400 }
    );
  }

  return json<ActionData>({
    success: true,
    message: "Thank you! Your message has been sent successfully. We will get back to you soon.",
  });
}

export default function Contact() {
  const actionData = useActionData<typeof action>() as ActionData | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const rootData = useRouteLoaderData("root") as {
    user?: any;
    credits?: number;
    nickname?: string;
  } | undefined;

  const [doc, setDoc] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const legalData = await fetchLegalContentData(supabase);
      if (legalData?.contact) {
        setDoc(legalData.contact);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <PageLayout
      user={rootData?.user}
      credits={rootData?.credits}
      nickname={rootData?.nickname}
      breadcrumbTitle={doc?.title || "Contact Us"}
    >
      <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto bg-white shadow-sm rounded-2xl p-8 sm:p-12 border border-slate-200">
          
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-slate-500 font-medium text-sm">Loading Contact Page...</p>
            </div>
          ) : error || !doc ? (
            <DataErrorState
              title="Contact Page Unavailable"
              message="Failed to load contact information from the database. Please check your network connection and try again."
              onRetry={loadData}
            />
          ) : (
            <>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
                {doc.title}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 mb-8 leading-relaxed">
                {doc.summary}
              </p>

              {actionData?.success && actionData.message && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium">
                  ✓ {actionData.message}
                </div>
              )}

              {actionData?.success === false && actionData.error && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-medium">
                  ⚠️ {actionData.error}
                </div>
              )}

              <form method="post" className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                    Your Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    defaultValue={rootData?.nickname || ""}
                    placeholder="e.g. Alex Smith"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    defaultValue={rootData?.user?.email || ""}
                    placeholder="your.email@example.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                {doc.inquiryTypes && doc.inquiryTypes.length > 0 && (
                  <div>
                    <label htmlFor="inquiryType" className="block text-sm font-medium text-slate-700 mb-1">
                      Inquiry Type
                    </label>
                    <select
                      id="inquiryType"
                      name="inquiryType"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                    >
                      {doc.inquiryTypes.map((type, idx) => (
                        <option key={idx} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">
                    Message <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    required
                    placeholder="How can we help you?"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all text-sm cursor-pointer"
                >
                  {isSubmitting ? "Sending Message..." : "Send Message"}
                </button>
              </form>

              {doc.directEmail && (
                <div className="mt-12 pt-8 border-t border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-900 mb-2">
                    Direct Contact Information
                  </h2>
                  <p className="text-sm text-slate-600 mb-2">
                    If you prefer sending an email directly, you can reach our team at:
                  </p>
                  <a
                    href={`mailto:${doc.directEmail}`}
                    className="text-sm font-bold text-indigo-600 hover:text-indigo-500 hover:underline"
                  >
                    {doc.directEmail}
                  </a>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </PageLayout>
  );
}