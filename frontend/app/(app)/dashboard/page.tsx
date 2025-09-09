"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { 
  Home, 
  Building, 
  Users, 
  FileText, 
  UserCheck,
  RefreshCw,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Activity,
  TrendingUp
} from 'lucide-react';
import { ClientApiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import VillaManagement from '@/components/dashboard/VillaManagement';
import OwnerManagement from '@/components/dashboard/OwnerManagement';
import StaffManagement from '@/components/dashboard/StaffManagement';
import DocumentManagement from '@/components/dashboard/DocumentManagement';

// Tab configuration
const TABS = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'villas', label: 'Villas', icon: Building },
  { id: 'owners', label: 'Owners', icon: Users },
  { id: 'staff', label: 'Staff', icon: UserCheck },
  { id: 'documents', label: 'Documents', icon: FileText },
];

// Dashboard data interfaces
interface DashboardStats {
  totalVillas: number;
  activeVillas: number;
  pendingOnboarding: number;
  staffCount: number;
  totalDocuments: number;
  totalOwners: number;
  onboardingInProgress: number;
  onboardingCompleted: number;
  averageCompletionTime: number;
  mostSkippedFields: Array<{ fieldName: string; skipCount: number }>;
}

interface OnboardingProgressSummary {
  villaId: string;
  villaName: string;
  currentStep: number;
  totalSteps: number;
  stepsCompleted: number;
  stepsSkipped: number;
  fieldsCompleted: number;
  fieldsSkipped: number;
  totalFields: number;
  progressPercentage: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PENDING_REVIEW';
  estimatedTimeRemaining?: number;
  lastActivityAt: string;
  startedAt?: string;
  completedAt?: string;
}

interface DashboardOnboardingData {
  sessionsInProgress: OnboardingProgressSummary[];
  recentlyCompleted: OnboardingProgressSummary[];
  pendingReview: OnboardingProgressSummary[];
  totalSessions: number;
  averageCompletionTime: number;
  commonSkippedFields: Array<{
    fieldName: string;
    stepNumber: number;
    skipCount: number;
    skipReasons: Array<{ reason: string; count: number }>;
  }>;
  completionStats: {
    last7Days: number;
    last30Days: number;
    totalCompleted: number;
  };
}

interface ManagementDashboard {
  villaManagement: {
    totalVillas: number;
    activeVillas: number;
    pendingApproval: number;
    archivedVillas: number;
    onboardingProgress: any[];
  };
  staffManagement: {
    totalStaff: number;
    activeStaff: number;
    staffByDepartment: any[];
    recentHires: any[];
  };
  documentManagement: {
    totalDocuments: number;
    recentUploads: any[];
    pendingDocuments: any[];
  };
  onboardingDashboard: DashboardOnboardingData;
}

// Step names for better context
const STEP_NAMES = {
  1: 'Villa Information',
  2: 'Owner Details',
  3: 'Contractual Details',
  4: 'Bank Details', 
  5: 'OTA Credentials',
  6: 'Documents',
  7: 'Staff',
  8: 'Facilities',
  9: 'Photos',
  10: 'Review & Submit'
};

// Field display names
const FIELD_DISPLAY_NAMES: Record<string, string> = {
  'contractEndDate': 'Contract End Date',
  'renewalTerms': 'Renewal Terms',
  'bookingUsername': 'Booking.com Username',
  'bookingPassword': 'Booking.com Password',
  'ownerSecondaryPhone': 'Owner Secondary Phone',
  'villaCompanyName': 'Company Name',
  'ownerPhone': 'Owner Phone',
  'companyInformation': 'Company Information Section'
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState<ManagementDashboard | null>(null);
  const [onboardingData, setOnboardingData] = useState<DashboardOnboardingData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const router = useRouter();
  const { getToken, isLoaded } = useAuth();
  const { user } = useUser();

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getToken();
      console.log('Dashboard auth token:', token ? 'present' : 'missing');
      
      if (!token) {
        setError('Please sign in to access the dashboard');
        setLoading(false);
        return;
      }

      const apiClient = new ClientApiClient();
      apiClient.setToken(token);
      
      // Test API connectivity first
      console.log('Testing API connectivity...');
      try {
        const testResponse = await apiClient.request('/api/dashboard/test');
        console.log('Test endpoint response:', testResponse);
      } catch (testError) {
        console.error('Test endpoint failed:', testError);
      }
      
      // Load all dashboard data in parallel
      console.log('Loading dashboard data in parallel...');
      const managementRequest = apiClient.request('/api/dashboard/management');
      const onboardingRequest = apiClient.request('/api/dashboard/onboarding-overview');
      const statsRequest = apiClient.getDashboardStats();
      
      const [managementResponse, onboardingResponse, statsResponse] = await Promise.allSettled([
        managementRequest,
        onboardingRequest,
        statsRequest
      ]);
      
      // Handle management data
      if (managementResponse.status === 'fulfilled') {
        const mgmtResult = managementResponse.value;
        if (mgmtResult.success && mgmtResult.data) {
          setDashboardData(mgmtResult.data);
          console.log('Management data loaded successfully');
        } else {
          console.warn('Management data not available:', mgmtResult.error || 'Unknown error');
        }
      } else {
        console.error('Management request failed:', managementResponse.reason);
      }
      
      // Handle onboarding data
      if (onboardingResponse.status === 'fulfilled') {
        const onboardingResult = onboardingResponse.value;
        if (onboardingResult.success && onboardingResult.data) {
          setOnboardingData(onboardingResult.data);
          console.log('Onboarding data loaded successfully');
        } else {
          console.warn('Onboarding data not available:', onboardingResult.error || 'Unknown error');
        }
      } else {
        console.error('Onboarding request failed:', onboardingResponse.reason);
      }
      
      // Handle stats data
      if (statsResponse.status === 'fulfilled') {
        const statsResult = statsResponse.value;
        if (statsResult.success && statsResult.data) {
          setStats(statsResult.data);
          console.log('Stats data loaded successfully');
        } else {
          console.warn('Stats data not available:', statsResult.error || 'Unknown error');
        }
      } else {
        console.error('Stats request failed:', statsResponse.reason);
      }
      
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded) {
      loadDashboardData();
    }
  }, [isLoaded]);

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  // Navigate to onboarding session
  const handleJumpIn = (villaId: string, currentStep: number) => {
    // Store villa ID and step in localStorage for the current user
    if (user?.id) {
      localStorage.setItem(`onboarding_villa_${user.id}`, villaId);
      localStorage.setItem(`onboarding_step_${user.id}`, currentStep.toString());
    }
    router.push('/onboarding');
  };

  // View villa details
  const handleViewDetails = (villaId: string) => {
    router.push(`/villa-management/${villaId}/profile`);
  };

  // SkippedItemsDisplay component
  const SkippedItemsDisplay: React.FC<{ session: OnboardingProgressSummary }> = ({ session }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const totalSkippedItems = session.stepsSkipped + session.fieldsSkipped;
    
    if (totalSkippedItems === 0) {
      return <span className="text-sm text-green-600 flex items-center gap-1">
        <CheckCircle className="w-4 h-4" />
        Complete
      </span>;
    }

    return (
      <div className="relative">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 hover:bg-amber-50 rounded-lg p-1 transition-colors"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-amber-600 font-medium">
            {totalSkippedItems} item{totalSkippedItems > 1 ? 's' : ''}
          </span>
          <svg 
            className={`w-3 h-3 text-amber-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isExpanded && (
          <div className="absolute left-0 top-full mt-2 z-10 bg-white border border-amber-200 rounded-lg shadow-lg p-4 w-80">
            <div className="space-y-3">
              <h4 className="font-medium text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Skipped Items Details
              </h4>
              
              <div className="text-sm text-slate-600">
                <p>Steps skipped: {session.stepsSkipped}</p>
                <p>Fields skipped: {session.fieldsSkipped}</p>
                <p>Total fields: {session.totalFields}</p>
              </div>
              
              <div className="pt-2 border-t border-amber-200">
                <p className="text-xs text-slate-500">
                  These items can be completed later through the villa profile page.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Get status badge style
  const getStatusBadge = (status: OnboardingProgressSummary['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PENDING_REVIEW':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'NOT_STARTED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get status icon
  const getStatusIcon = (status: OnboardingProgressSummary['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4" />;
      case 'IN_PROGRESS':
        return <Activity className="w-4 h-4" />;
      case 'PENDING_REVIEW':
        return <Clock className="w-4 h-4" />;
      case 'NOT_STARTED':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Get all onboarding sessions
  const getAllSessions = () => {
    if (!onboardingData) return [];
    return [
      ...onboardingData.sessionsInProgress,
      ...onboardingData.recentlyCompleted,
      ...onboardingData.pendingReview
    ];
  };

  const allSessions = getAllSessions();

  // Calculate summary stats from real data
  const summaryStats = {
    total: onboardingData?.totalSessions || 0,
    completed: onboardingData?.completionStats.totalCompleted || 0,
    inProgress: onboardingData?.sessionsInProgress.length || 0,
    pendingReview: onboardingData?.pendingReview.length || 0,
    avgProgress: allSessions.length > 0 
      ? Math.round(allSessions.reduce((acc, s) => acc + s.progressPercentage, 0) / allSessions.length)
      : 0,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card-white-teal p-8 rounded-2xl">
          <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card-white-teal p-8 rounded-2xl max-w-md">
          <AlertTriangle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 text-center mb-2">Dashboard Error</h2>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setError(null);
                loadDashboardData();
              }}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-[#009990] to-[#007a6b] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#009990] focus:ring-opacity-50"
            >
              Retry
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition-all duration-300"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="glass-card-white-teal p-6 rounded-2xl mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Villa Management Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {user?.firstName || 'User'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Admin Controls - Show for admin/manager users */}
              {(user?.publicMetadata?.role === 'admin' || 
                user?.publicMetadata?.role === 'manager' || 
                user?.unsafeMetadata?.role === 'admin' || 
                user?.unsafeMetadata?.role === 'manager') && (
                <>
                  <button
                    onClick={() => router.push('/admin/approvals')}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors border border-purple-200"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Pending Approvals
                  </button>
                  <button
                    onClick={() => router.push('/admin/users')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors border border-green-200"
                  >
                    <Users className="w-4 h-4" />
                    User Management
                  </button>
                </>
              )}
              
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#009990] to-[#007a6b] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#009990] focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>


        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card-white-teal p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Total Villas</p>
                <p className="text-3xl font-bold text-slate-800">{stats?.totalVillas || dashboardData?.villaManagement?.totalVillas || 0}</p>
              </div>
              <Building className="w-8 h-8 text-teal-600 opacity-75" />
            </div>
          </div>
          
          <div className="glass-card-white-teal p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Completed</p>
                <p className="text-3xl font-bold text-slate-800">{summaryStats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-75" />
            </div>
          </div>
          
          <div className="glass-card-white-teal p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">In Progress</p>
                <p className="text-3xl font-bold text-slate-800">{summaryStats.inProgress}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600 opacity-75" />
            </div>
          </div>
          
          <div className="glass-card-white-teal p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Active Villas</p>
                <p className="text-3xl font-bold text-slate-800">{stats?.activeVillas || dashboardData?.villaManagement.activeVillas || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600 opacity-75" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="glass-card-white-teal p-4 rounded-2xl mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-300
                    ${activeTab === tab.id
                      ? 'bg-gradient-to-r from-[#009990] to-[#007a6b] text-white shadow-lg'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200 hover:border-slate-300'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="glass-card-white-teal p-6 rounded-2xl">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Dashboard Overview
              </h2>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Total Villas */}
                <div className="glass-card-white-teal p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Total Villas</p>
                      <p className="text-2xl font-bold text-slate-800">{stats?.totalVillas || 0}</p>
                    </div>
                    <Building className="w-8 h-8 text-teal-600" />
                  </div>
                </div>

                {/* Active Sessions */}
                <div className="glass-card-white-teal p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Onboarding Sessions</p>
                      <p className="text-2xl font-bold text-blue-800">
                        {summaryStats.total}
                      </p>
                    </div>
                    <Activity className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                {/* Completed Sessions */}
                <div className="glass-card-white-teal p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Completed</p>
                      <p className="text-2xl font-bold text-green-800">
                        {summaryStats.completed}
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </div>

                {/* Staff Count */}
                <div className="glass-card-white-teal p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Total Staff</p>
                      <p className="text-2xl font-bold text-purple-800">
                        {stats?.staffCount || 0}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Skip Details Summary */}
              {onboardingData?.commonSkippedFields && onboardingData.commonSkippedFields.length > 0 && (
                <div className="glass-card-white-teal p-4 rounded-xl border-l-4 border-amber-400">
                  <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Most Commonly Skipped Fields
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {onboardingData.commonSkippedFields.slice(0, 4).map((field, index) => (
                      <div key={index}>
                        <p className="font-medium text-slate-700 mb-1">{FIELD_DISPLAY_NAMES[field.fieldName] || field.fieldName}:</p>
                        <p className="text-amber-700 font-semibold">
                          {field.skipCount} times (Step {field.stepNumber})
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h3 className="text-lg font-semibold text-gray-900">
                Onboarding Sessions
              </h3>

              {/* Sessions Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-teal-100">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Villa Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Progress</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Skipped Items</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Last Activity</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSessions.map((session) => {
                      return (
                        <tr key={session.villaId} className="border-b border-gray-100 hover:bg-teal-50/30">
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-medium text-gray-900">{session.villaName}</p>
                              <p className="text-sm text-gray-500">{session.villaId}</p>
                            </div>
                          </td>
                          
                          <td className="py-4 px-4">
                            <div className="w-32">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${session.progressPercentage}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium text-gray-900">{session.progressPercentage}%</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Step {session.currentStep}/{session.totalSteps}
                              </p>
                            </div>
                          </td>
                          
                          <td className="py-4 px-4">
                            <span className={`
                              inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border
                              ${getStatusBadge(session.status)}
                            `}>
                              {getStatusIcon(session.status)}
                              {session.status.replace('_', ' ')}
                            </span>
                          </td>
                          
                          <td className="py-4 px-4">
                            <SkippedItemsDisplay session={session} />
                          </td>
                          
                          <td className="py-4 px-4">
                            <p className="text-sm text-gray-600">
                              {new Date(session.lastActivityAt).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(session.lastActivityAt).toLocaleTimeString()}
                            </p>
                          </td>
                          
                          <td className="py-4 px-4">
                            <div className="flex gap-2">
                              {session.status !== 'COMPLETED' && (
                                <button
                                  onClick={() => handleJumpIn(session.villaId, session.currentStep)}
                                  className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-[#009990] to-[#007a6b] text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#009990] focus:ring-opacity-50"
                                >
                                  <ArrowRight className="w-3 h-3" />
                                  Continue
                                </button>
                              )}
                              <button
                                onClick={() => handleViewDetails(session.villaId)}
                                className="flex items-center gap-1 px-4 py-2 border border-slate-300 rounded-xl text-slate-600 text-sm hover:bg-slate-50 transition-all duration-300"
                              >
                                <Eye className="w-3 h-3" />
                                View
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {allSessions.length === 0 && (
                <div className="text-center py-12">
                  <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No onboarding sessions found</p>
                  <button
                    onClick={() => {
                      // Clear any existing onboarding state
                      if (user?.id) {
                        localStorage.removeItem(`onboarding_villa_${user.id}`);
                        localStorage.removeItem(`onboarding_step_${user.id}`);
                        localStorage.removeItem(`onboarding_data_${user.id}`);
                      }
                      router.push('/onboarding');
                    }}
                    className="mt-4 px-6 py-3 bg-gradient-to-r from-[#009990] to-[#007a6b] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#009990] focus:ring-opacity-50"
                  >
                    Start New Onboarding
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'villas' && (
            <VillaManagement />
          )}

          {activeTab === 'owners' && (
            <OwnerManagement />
          )}

          {activeTab === 'staff' && (
            <StaffManagement />
          )}

          {activeTab === 'documents' && (
            <DocumentManagement />
          )}
        </div>
      </div>
    </div>
  );
}