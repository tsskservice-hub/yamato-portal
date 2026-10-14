import { useState, useEffect } from "react";
import { Link, useNavigate } from "@remix-run/react";
import { supabase } from "../lib/supabaseClient";

type FooterProps = {
  onOpenAuth?: (mode: 'signin' | 'signup') => void;
};

export default function Footer({ onOpenAuth }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // マウント時にSupabaseのセッション状態をチェック
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session?.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleMyAccountClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoggedIn) {
      // ログイン済みの場合はアカウント設定画面へ移動
      navigate("/my-account");
    } else {
      // 未ログインの場合は、パスキー認証モーダルを開く
      if (onOpenAuth) {
        onOpenAuth('signin');
      }
    }
  };

  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Copyright & Brand */}
          <div className="text-sm text-slate-500 text-center md:text-left">
            &copy; {currentYear} AI Yamato. All rights reserved. Designed for VCE Japanese learners.
          </div>

          {/* Legal and Support Links */}
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
            <button
              onClick={handleMyAccountClick}
              className="hover:text-indigo-600 transition-colors bg-transparent border-none p-0 cursor-pointer text-sm font-normal text-slate-600"
            >
              My Account
            </button>
          </div>

        </div>
      </div>
    </footer>
  );
}