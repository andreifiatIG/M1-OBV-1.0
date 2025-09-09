"use client";

import { useRouter } from 'next/navigation';
import { Home, Plus } from 'lucide-react';

export default function GlobalNavigation() {
  const router = useRouter();

  const createNewOnboardingSession = async () => {
    // Create a fresh onboarding session and redirect to /onboarding
    try {
      // Clear any existing onboarding state
      localStorage.removeItem('onboarding-progress');
      localStorage.removeItem('onboarding-villa-id');
      localStorage.removeItem('onboarding-current-step');
      
      // Navigate to onboarding wizard
      router.push('/onboarding');
    } catch (error) {
      console.error('Error starting new onboarding session:', error);
      // Still navigate to onboarding even if cleanup fails
      router.push('/onboarding');
    }
  };

  return (
    <div className="flex items-center gap-2 mr-4">
      <button
        onClick={() => router.push('/my-villas')}
        className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-slate-700 hover:text-slate-900 hover:bg-white/20 rounded-lg transition-all duration-200 text-sm"
      >
        <Home className="w-4 h-4" />
        My Villas
      </button>
      
      <button
        onClick={createNewOnboardingSession}
        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-teal-500/80 to-teal-600/80 backdrop-blur-md border border-teal-400/30 text-white hover:from-teal-600/90 hover:to-teal-700/90 rounded-lg transition-all duration-200 text-sm transform hover:scale-105"
      >
        <Plus className="w-4 h-4" />
        Start Onboarding
      </button>
    </div>
  );
}