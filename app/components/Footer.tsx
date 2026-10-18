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
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Copyright & 2つのボタン（法的リンクの左側） */}
          <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-slate-500 text-center md:text-left">
            <span>&copy; {currentYear} AI Yamato. All rights reserved.</span>
            
            <div className="flex items-center gap-2">
              <BugReportButton />
              <QuickFeedbackButton />
            </div>
          </div>

          {/* Legal and Support Links */}
          <div className="flex flex-wrap justify-center md:justify-end gap-6 text-sm text-slate-600 mr-0 md:mr-4">
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
    </footer>
  );
}