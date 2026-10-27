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
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
          
          {/* Copyright, ボタン類、法的リンクをすべて左側にまとめて配置 */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-sm text-slate-500">
            <span>&copy; {currentYear} AI Yamato. All rights reserved.</span>
            
            <div className="flex items-center gap-2">
              <BugReportButton />
              <QuickFeedbackButton />
            </div>

            {/* 法律関係のリンクおよび About ページへのリンクを配置 */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-slate-600">
              <Link
                to="/about"
                className="hover:text-indigo-600 transition-colors font-medium text-indigo-700"
              >
                About Us
              </Link>
              <Link
                to="/terms"
                className="hover:text-indigo-600 transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                to="/privacy"
                className="hover:text-indigo-600 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                to="/disclaimer"
                className="hover:text-indigo-600 transition-colors"
              >
                Disclaimer
              </Link>
              <Link
                to="/contact"
                className="hover:text-indigo-600 transition-colors"
              >
                Contact
              </Link>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}