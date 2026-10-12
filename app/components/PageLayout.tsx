import React from "react";
import Header from "./header";
import Footer from "./Footer";

type PageLayoutProps = {
  children: React.ReactNode;
  user?: any;
  credits?: number;
  onOpenAuth?: (mode: 'signin' | 'signup') => void;
  onSignOut?: () => void;
};

export default function PageLayout({ 
  children, 
  user, 
  credits, 
  onOpenAuth, 
  onSignOut 
}: PageLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        user={user} 
        credits={credits} 
        onOpenAuth={onOpenAuth} 
        onSignOut={onSignOut} 
      />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
}