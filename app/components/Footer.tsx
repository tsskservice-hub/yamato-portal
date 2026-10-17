import { Link } from "@remix-run/react";

// 1. 不具合報告ボタン用コンポーネント
type BugReportButtonProps = {
  onClick?: () => void;
  className?: string;
};

function BugReportButton({ onClick, className = "" }: BugReportButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 hover:border-amber-300 rounded-lg font-medium text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5 ${className}`}
    >
      <span>🐛</span>
      <span>Report Bug</span>
    </button>
  );
}

// 2. フィードバック・提案用コンポーネント
type QuickFeedbackButtonProps = {
  onClick?: () => void;
  className?: string;
};

function QuickFeedbackButton({ onClick, className = "" }: QuickFeedbackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-800 border border-blue-200 hover:border-blue-300 rounded-lg font-medium text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5 ${className}`}
    >
      <span>💬</span>
      <span>Feedback</span>
    </button>
  );
}

type FooterProps = {
  onOpenAuth?: (mode: 'signin' | 'signup') => void;
  onOpenBugReport?: () => void;
  onOpenFeedback?: () => void;
};

export default function Footer({ onOpenBugReport, onOpenFeedback }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Copyright & 2つのボタン（法的リンクの左側） */}
          <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-slate-500 text-center md:text-left">
            <span>&copy; {currentYear} AI Yamato. All rights reserved.</span>
            
            <div className="flex items-center gap-2">
              <BugReportButton onClick={onOpenBugReport} />
              <QuickFeedbackButton onClick={onOpenFeedback} />
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
            <Link
              to="/my-account"
              className="hover:text-indigo-600 transition-colors"
            >
              My Account
            </Link>
          </div>

        </div>
      </div>
    </footer>
  );
}