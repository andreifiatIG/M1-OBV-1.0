'use client';

import { useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useEffect, Suspense } from 'react';
import OnboardingWizardUnified from '@/components/onboarding/OnboardingWizardUnified';

function OnboardingContent() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const newSession = searchParams.get('new') === 'true';
  const villaId = searchParams.get('villaId');

  // Properly handle villa ID from URL parameter
  useEffect(() => {
    if (villaId && typeof window !== 'undefined') {
      // Set both localStorage keys for compatibility
      localStorage.setItem('currentVillaId', villaId);

      // Also set user-specific key if user is available
      if (user?.id) {
        localStorage.setItem(`onboarding_villa_${user.id}`, villaId);
      }
    }
  }, [villaId, user?.id]);

  return (
    <OnboardingWizardUnified forceNewSession={newSession} />
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OnboardingContent />
    </Suspense>
  );
}
