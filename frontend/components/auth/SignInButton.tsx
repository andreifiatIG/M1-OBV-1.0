"use client";

import { SignInButton as ClerkSignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import type { PropsWithChildren } from "react";

export default function SignInButton() {
  const SignedInClient = SignedIn as unknown as React.ComponentType<PropsWithChildren>;
  const SignedOutClient = SignedOut as unknown as React.ComponentType<PropsWithChildren>;

  return (
    <div className="flex items-center gap-4">
      <SignedOutClient>
        <ClerkSignInButton mode="modal">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
            Sign In
          </button>
        </ClerkSignInButton>
      </SignedOutClient>
      <SignedInClient>
        <UserButton afterSignOutUrl="/" />
      </SignedInClient>
    </div>
  );
}
