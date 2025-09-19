"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { useEffect } from "react";

const ClientClerkProvider = ClerkProvider as unknown as any;

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  return (
    <ClientClerkProvider
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: "#0D9488",
        },
      }}
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/onboarding"
    >
      {children}
    </ClientClerkProvider>
  );
}
