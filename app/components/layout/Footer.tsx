/**
 * @file footer.tsx
 * @description Application Footer with navigation links, bug reporting, and feedback buttons.
 */
import { Link } from "@remix-run/react";

// 1. 不具合報告ボタン用コンポーネント（1つ目のリンクを使用）
type BugReportButtonProps = {
  onClick?: () => void;
  className?: string;
};

function BugReportButton({ className = "" }: BugReportButtonProps) {
  return (
    <a
      href="https://docs.google.com/forms/d/e/1FAIpQLSfdNF18yTlwIrCunrkp-Cw0mspx5mP0iHtK7nPTwEcE95Gtjw/viewform?usp=header"
      target="_blank"
      rel="noopener noreferrer"
      className={`px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 hover:border-amber-300 rounded-lg font-medium text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5 no-underline ${className}`}
    >
      <span>🐛</span>
      <span>Report Bug & Photo</span>
    </a>
  );
}

// 2. フィードバック・提案用コンポーネント（2つ目のリンクを使用）
type QuickFeedbackButtonProps = {
  onClick?: () => void;
  className?: string;
};

function QuickFeedbackButton({ className = "" }: QuickFeedbackButtonProps) {
  return (
    <a
      href="https://docs.google.com/forms/d/e/1FAIpQLSfa4c9elcIiRigoMvFzHOlW1vSeYlUYvvUcV6TkdgS4TNaK7g/viewform?usp=header"
      target="_blank"
      rel="noopener noreferrer"
      className={`px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-800 border border-blue-200 hover:border-blue-300 rounded-lg font-medium text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5 no-underline ${className}`}
    >
      <span>💬</span>
      <span>Quick Feedback</span>
    </a>
  );
}

type FooterProps = {
  onOpenAuth?: (mode: 'signin' | 'signup') => void;
};

export default function Footer({}: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* 1 行目: About Us と法律関係のページ、Contact、My Account
            （My Account はヘッダーから移動。右下常駐のヤマトチャットにかぶらないよう、中央に置く） */}
        <nav
          aria-label="Site information"
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-slate-600 pb-4 mb-4 border-b border-slate-100"
        >
          <Link to="/about" className="hover:text-indigo-600 transition-colors font-medium text-indigo-700">
            About Us
          </Link>
          <Link to="/legal/terms" className="hover:text-indigo-600 transition-colors">
            Terms of Service
          </Link>
          <Link to="/legal/privacy" className="hover:text-indigo-600 transition-colors">
            Privacy Policy
          </Link>
          <Link to="/legal/disclaimer" className="hover:text-indigo-600 transition-colors">
            Disclaimer
          </Link>
          <Link to="/contact" className="hover:text-indigo-600 transition-colors">
            Contact
          </Link>
          <Link
            to="/my-account"
            className="text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all flex items-center border-slate-200 hover:bg-slate-100 text-slate-700 whitespace-nowrap"
          >
            My Account
          </Link>
        </nav>

        {/* 2 行目: 著作権 → 不具合の報告・フィードバック → 音声のクレジット（音読さん）・クレジットのページ
            ElevenLabs・OpenAI はここには書かず、/credits ページで説明する */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-slate-500">
          <span>&copy; {currentYear} JP Tutor AI Yamato. All rights reserved.</span>

          <div className="flex items-center gap-2">
            <BugReportButton />
            <QuickFeedbackButton />
          </div>

          <div className="flex items-center gap-3 text-xs">
            <a
              href="https://ondoku3.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-indigo-600 hover:underline transition-colors"
            >
              Voice By ondoku3.com
            </a>
            <span className="text-slate-300">|</span>
            <Link to="/credits" className="hover:text-indigo-600 hover:underline transition-colors">
              Credits
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}