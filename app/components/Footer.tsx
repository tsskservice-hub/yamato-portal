import { Link } from "@remix-run/react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Copyright & Brand */}
          <div className="text-sm text-slate-500 text-center md:text-left">
            &copy; {currentYear} AI Yamato. All rights reserved. Designed for VCE Japanese learners.
          </div>

          {/* Legal and Support Links (右下常駐AIとかぶらないよう右側にマージンを追加して左に寄せる) */}
          <div className="flex flex-wrap justify-center md:justify-end gap-6 text-sm text-slate-600 mr-0 md:mr-28">
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