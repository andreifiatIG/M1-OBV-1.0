"use client";

import React from 'react';
import { useAuthenticatedApi } from '@/lib/useAuthenticatedApi';
import { Loader2, Home, User, FileText, CreditCard, Globe, Upload, Users, Grid3X3, Camera, CheckCircle, Activity, Shield, Database } from 'lucide-react';

// Import the new comprehensive sections
import VillaInformationSection from '@/components/villa-profile/sections/VillaInformationSection';
import OwnerDetailsSection from '@/components/villa-profile/sections/OwnerDetailsSection';
import ContractualDetailsSection from '@/components/villa-profile/sections/ContractualDetailsSection';
import BankDetailsSection from '@/components/villa-profile/sections/BankDetailsSection';
import OTACredentialsSection from '@/components/villa-profile/sections/OTACredentialsSection';
import DocumentsSection from '@/components/villa-profile/sections/DocumentsSection';
import StaffConfigurationSection from '@/components/villa-profile/sections/StaffConfigurationSection';
import FacilitiesSection from '@/components/villa-profile/sections/FacilitiesSection';
import PhotosSection from '@/components/villa-profile/sections/PhotosSection';
import ReviewSection from '@/components/villa-profile/sections/ReviewSection';

interface VillaProfilePageProps {
  params: Promise<{
    villaId: string;
  }>;
}

// Navigation sections with proper structure
const navigationSections = [
  {
    id: 'villa-information',
    title: 'Villa Information',
    icon: Home,
    categories: ['Basic Information', 'Property Details', 'Area Information', 'Location & Maps', 'External Links'],
    fieldCount: 29
  },
  {
    id: 'owner-details',
    title: 'Owner Details',
    icon: User,
    categories: ['Owner Type', 'Company Information', 'Owner Information', 'Property Manager'],
    fieldCount: 18
  },
  {
    id: 'contractual-details',
    title: 'Contractual Details',
    icon: FileText,
    categories: ['Contract Dates', 'Monthly Payout Schedule', 'Registration Numbers', 'Financial Terms'],
    fieldCount: 12
  },
  {
    id: 'bank-details',
    title: 'Bank Details',
    icon: CreditCard,
    categories: ['Account Information', 'Bank Location', 'Security Acknowledgment'],
    fieldCount: 7
  },
  {
    id: 'ota-credentials',
    title: 'OTA Platform Credentials',
    icon: Globe,
    categories: ['Booking.com', 'Airbnb', 'TripAdvisor', 'Expedia', 'VRBO', 'Agoda', 'Hotels.com'],
    fieldCount: 28
  },
  {
    id: 'documents',
    title: 'Documents Upload',
    icon: Upload,
    categories: ['Contracts', 'Insurance', 'Inventory', 'Utilities', 'Emergency Contacts', 'House Rules', 'Staff Contracts', 'Maintenance'],
    fieldCount: 0
  },
  {
    id: 'staff-configuration',
    title: 'Staff Configuration',
    icon: Users,
    categories: ['Villa Manager', 'Housekeeping', 'Chef', 'Security', 'Pool Maintenance', 'Gardener', 'Driver', 'Concierge', 'Maintenance'],
    fieldCount: 225
  },
  {
    id: 'facilities',
    title: 'Facilities Checklist',
    icon: Grid3X3,
    categories: ['Basic Property', 'Occupancy & Sleeping', 'Bathrooms', 'Kitchen & Dining', 'Service & Staff', 'Living Spaces', 'Outdoor', 'Entertainment', 'Technology', 'Wellness & Spa', 'Accessibility', 'Safety & Security', 'Child-Friendly'],
    fieldCount: 306
  },
  {
    id: 'photos',
    title: 'Photos & Videos',
    icon: Camera,
    categories: ['Logo', 'Floor Plan', 'Exterior', 'Interior Living', 'Bedrooms', 'Bathrooms', 'Kitchen', 'Dining', 'Pool & Outdoor', 'Garden', 'Amenities', 'Views', 'Staff Areas', 'Utility Areas', 'Videos', 'Drone Shots', 'Entertainment'],
    fieldCount: 0
  },
  {
    id: 'review',
    title: 'Review & Submit',
    icon: CheckCircle,
    categories: ['Final Validation', 'Submission Status'],
    fieldCount: 0
  }
];

export default function VillaProfilePage({ params }: VillaProfilePageProps) {
  const { apiClient, isLoaded, isSignedIn } = useAuthenticatedApi();
  const [villaId, setVillaId] = React.useState<string | null>(null);
  const [villaProfile, setVillaProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeSection, setActiveSection] = React.useState('villa-information');

  // Handle async params and load villa profile
  React.useEffect(() => {
    const loadVillaProfile = async () => {
      if (!isLoaded || !isSignedIn) {
        return;
      }

      try {
        const resolvedParams = await params;
        const { villaId: id } = resolvedParams;
        
        if (!id) {
          setError('Villa ID is required');
          setLoading(false);
          return;
        }
        
        setVillaId(id);
        console.log('🏠 Loading villa profile for ID:', id);
        
        // Load villa profile data from API using authenticated client
        const response = await apiClient.getVillaProfile(id);
        
        if (response.success && response.data) {
          console.log('✅ Villa profile loaded:', response.data.villa.villaName);
          setVillaProfile(response.data);
          setError(null); // Clear any previous errors
        } else {
          const errorMessage = response.error || 'Failed to load villa profile';
          console.error('❌ Villa profile load failed:', errorMessage);
          setError(errorMessage);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load villa profile';
        console.error('💥 Villa profile load error:', err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    loadVillaProfile();
  }, [params, isLoaded, isSignedIn, apiClient]);

  // Smooth scroll to section
  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Intersection Observer to update active section
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.3 }
    );

    navigationSections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [villaProfile]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-700 flex items-center space-x-3">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
          <span className="text-lg">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-700">Please sign in to view villa details.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-700 flex items-center space-x-3">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
          <span className="text-lg">Loading villa profile...</span>
        </div>
      </div>
    );
  }

  if (error || !villaProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-4">
            <div className="text-red-600 text-lg font-medium mb-2">
              {error ? 'Error Loading Villa Profile' : 'Villa Not Found'}
            </div>
            <div className="text-red-500 text-sm">
              {error || 'The requested villa could not be found.'}
            </div>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { villa } = villaProfile;
  const totalFields = navigationSections.reduce((sum, section) => sum + section.fieldCount, 0);

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="glass-card-white-teal p-6 rounded-2xl">
          <div className="text-center">
            <h1 className="text-4xl font-light text-gray-900 mb-2">
              {villa.villaName || 'Villa Profile'}
            </h1>
            <p className="text-gray-600 text-lg">Complete villa information and management details</p>
            
            {/* Summary Stats */}
            <div className="flex justify-center items-center space-x-8 mt-6 text-sm">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-teal-600" />
                <span className="text-gray-600">{totalFields}+ Data Points</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-teal-600" />
                <span className="text-gray-600">Encrypted Database</span>
              </div>
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-teal-600" />
                <span className="text-gray-600">SharePoint Integration</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-8">
          {/* Table of Contents Sidebar */}
          <div className="w-80 flex-shrink-0">
            <div className="sticky top-6">
              <div className="glass-card-white-teal p-6 rounded-2xl">
                <h2 className="text-lg font-medium text-gray-900 mb-6">Table of Contents</h2>
                
                <nav className="space-y-2">
                  {navigationSections.map((section, index) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;
                    
                    return (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={`w-full text-left flex items-start space-x-3 p-3 rounded-lg transition-all duration-200 ${
                          isActive 
                            ? 'bg-teal-50 text-teal-700 border-l-3 border-teal-600' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <Icon className={`w-4 h-4 mt-0.5 ${
                          isActive ? 'text-teal-600' : 'text-slate-400'
                        }`} />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${
                              isActive ? 'text-teal-900' : 'text-slate-700'
                            }`}>
                              {index + 1}. {section.title}
                            </span>
                            {section.fieldCount > 0 && (
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                isActive 
                                  ? 'bg-teal-100 text-teal-700' 
                                  : 'bg-slate-100 text-slate-500'
                              }`}>
                                {section.fieldCount}
                              </span>
                            )}
                          </div>
                          
                          <div className="text-xs text-slate-500 mt-1">
                            {section.categories.slice(0, 2).join(', ')}
                            {section.categories.length > 2 && ` +${section.categories.length - 2} more`}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 space-y-6">
            {/* Stage 1: Villa Information */}
            <section id="villa-information" className="scroll-mt-6">
              <VillaInformationSection villa={villa} villaId={villaId} />
            </section>

            {/* Stage 2: Owner Details */}
            <section id="owner-details" className="scroll-mt-6">
              <OwnerDetailsSection 
                ownerDetails={villaProfile.ownerDetails} 
                villaId={villaId} 
              />
            </section>

            {/* Stage 3: Contractual Details */}
            <section id="contractual-details" className="scroll-mt-6">
              <ContractualDetailsSection 
                contractualDetails={villaProfile.contractualDetails} 
                villaId={villaId} 
              />
            </section>

            {/* Stage 4: Bank Details */}
            <section id="bank-details" className="scroll-mt-6">
              <BankDetailsSection 
                bankDetails={villaProfile.bankDetails} 
                villaId={villaId} 
              />
            </section>

            {/* Stage 5: OTA Credentials */}
            <section id="ota-credentials" className="scroll-mt-6">
              <OTACredentialsSection 
                otaDetails={villaProfile.otaCredentials || []} 
                villaId={villaId} 
              />
            </section>

            {/* Stage 6: Documents */}
            <section id="documents" className="scroll-mt-6">
              <DocumentsSection 
                documents={villaProfile.documents || []} 
                villaId={villaId} 
              />
            </section>

            {/* Stage 7: Staff Configuration */}
            <section id="staff-configuration" className="scroll-mt-6">
              <StaffConfigurationSection 
                staff={villaProfile.staff || []} 
                villaId={villaId} 
              />
            </section>

            {/* Stage 8: Facilities */}
            <section id="facilities" className="scroll-mt-6">
              <FacilitiesSection 
                facilities={villaProfile.facilities || []} 
                villaId={villaId} 
              />
            </section>

            {/* Stage 9: Photos */}
            <section id="photos" className="scroll-mt-6">
              <PhotosSection 
                photos={villaProfile.photos || []} 
                villaId={villaId} 
              />
            </section>

            {/* Stage 10: Review */}
            <section id="review" className="scroll-mt-6">
              <ReviewSection 
                villaProfile={villaProfile} 
                villaId={villaId} 
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 