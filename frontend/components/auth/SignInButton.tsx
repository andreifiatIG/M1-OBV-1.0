"use client";

import { SignInButton as ClerkSignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function SignInButton() {
  return (
    <div className="flex items-center gap-4">
      <SignedOut>
        <ClerkSignInButton mode="modal">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
            Sign In
          </button>
        </ClerkSignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  );
}
