'use client';

import { useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useEffect, Suspense, useState } from 'react';
import OnboardingWizardUnified from '@/components/onboarding/OnboardingWizardUnified';
import sessionManager from '@/lib/onboardingSessionManager';

function OnboardingContent() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const newSession = searchParams.get('new') === 'true';
  const urlVillaId = searchParams.get('villaId');
  const [isInitialized, setIsInitialized] = useState(false);

  // ⚡ FIXED: Use centralized session manager instead of direct localStorage manipulation
  useEffect(() => {
    let mounted = true;

    const initializeSession = async () => {
      if (!mounted) return;

      try {
        console.log('🔄 [SESSION] Initializing from URL params', {
          urlVillaId,
          newSession,
          userId: user?.id?.substring(0, 8)
        });

        // Initialize session manager with proper priority handling
        const session = await sessionManager.initialize({
          urlVillaId: urlVillaId || undefined,
          userId: user?.id,
          forceNewSession: newSession,
          // Don't validate here - let the wizard handle validation
        });

        if (mounted) {
          setIsInitialized(true);

          if (session) {
            console.log('✅ [SESSION] Initialization successful', {
              villaId: session.villaId,
              source: session.source
            });
          } else {
            console.log('⚠️ [SESSION] No session found - wizard will handle creation');
          }
        }
      } catch (error) {
        console.error('❌ [SESSION] Initialization failed', error);
        if (mounted) {
          setIsInitialized(true); // Still allow wizard to load
        }
      }
    };

    // Only initialize when we have user info (or if no user required)
    if (user !== undefined) {  // user is loaded (could be null for logged out)
      initializeSession();
    }

    return () => {
      mounted = false;
    };
  }, [urlVillaId, newSession, user?.id]);

  // Show loading while session manager initializes
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#009990] mx-auto mb-4"></div>
          <p className="text-slate-600">Initializing session...</p>
        </div>
      </div>
    );
  }

  return (
    <OnboardingWizardUnified
      forceNewSession={newSession}
      urlVillaId={urlVillaId || undefined}
    />
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OnboardingContent />
    </Suspense>
  );
}
