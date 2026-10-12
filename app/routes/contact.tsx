import type { MetaFunction, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useActionData, useNavigation } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "Contact Us | AI Yamato Japanese Tutoring" },
    {
      name: "description",
      content: "Contact AI Yamato support team for assistance, feedback, or School License inquiries for VCE Japanese tutoring.",
    },
  ];
};

// 型定義を明示
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
    return json<ActionData>({ success: false, error: "Please fill in all required fields." }, { status: 400 });
  }

  // TODO: メール送信サービス（ResendやSendGridなど）やデータベース保存の処理をここに記述
  
  return json<ActionData>({ success: true, message: "Thank you! Your message has been sent successfully. We will get back to you soon." });
}

export default function Contact() {
  const actionData = useActionData<typeof action>() as ActionData | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-sm rounded-2xl p-8 sm:p-12 border border-slate-200">
        
        {/* Navigation back */}
        <div className="mb-8">
          <Link
            to="/"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
          >
            &larr; Back to Home
          </Link>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
          Contact Us
        </h1>
        <p className="text-sm sm:text-base text-slate-600 mb-8">
          Have questions about AI Yamato, need technical support, or interested in a School License for your classroom? Fill out the form below or reach out directly.
        </p>

        {actionData?.success && actionData.message && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm">
            {actionData.message}
          </div>
        )}

        {actionData?.success === false && actionData.error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm">
            {actionData.error}
          </div>
        )}

        <form method="post" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                Your Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                placeholder="e.g., Jane Doe"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 text-sm"
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
                placeholder="e.g., jane@example.com"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="inquiryType" className="block text-sm font-medium text-slate-700 mb-1">
              Inquiry Type
            </label>
            <select
              id="inquiryType"
              name="inquiryType"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 text-sm bg-white"
            >
              <option value="general">General Support / Question</option>
              <option value="technical">Technical Issue (Passkey, Credits, Payments)</option>
              <option value="school">School License / Teacher Inquiry</option>
              <option value="feedback">Feedback & Suggestions</option>
            </select>
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">
              Message <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              rows={5}
              required
              placeholder="How can we help you with your Japanese studies or platform usage?"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 text-sm"
            ></textarea>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors text-sm shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? "Sending..." : "Send Message"}
            </button>
          </div>
        </form>

        <div className="mt-12 pt-8 border-t border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Direct Contact Information</h2>
          <p className="text-sm text-slate-600 mb-4">
            If you need immediate assistance or prefer sending an email directly, you can reach our team at:
          </p>
          <p className="text-sm font-medium text-indigo-600">
            support@jptutoraiyamato.com
          </p>
        </div>

        {/* Footer navigation */}
        <div className="mt-12 pt-6 border-t border-slate-200 flex flex-wrap gap-4 text-sm text-slate-500 justify-between items-center">
          <div>
            &copy; {new Date().getFullYear()} AI Yamato. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <Link to="/terms" className="hover:text-slate-900">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-slate-900">Privacy Policy</Link>
            <Link to="/disclaimer" className="hover:text-slate-900">Disclaimer</Link>
          </div>
        </div>

      </div>
    </div>
  );
}