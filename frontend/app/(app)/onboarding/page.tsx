'use client';

import OnboardingWizardEnhanced from '@/components/onboarding/OnboardingWizardEnhanced';
import { OnboardingProvider } from '@/components/onboarding/OnboardingContext';

export default function OnboardingPage() {

  return (
    <div className="min-h-screen">
      <OnboardingProvider>
        <OnboardingWizardEnhanced />
      </OnboardingProvider>
    </div>
  );
}
