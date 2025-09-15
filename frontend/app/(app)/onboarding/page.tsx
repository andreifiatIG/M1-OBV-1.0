'use client';

import { useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useEffect } from 'react';
import OnboardingWizardUnified from '@/components/onboarding/OnboardingWizardUnified';
import { OnboardingProvider } from '@/components/onboarding/OnboardingContext';

export default function OnboardingPage() {
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
    <OnboardingProvider>
      <OnboardingWizardUnified forceNewSession={newSession} />
    </OnboardingProvider>
  );
}
