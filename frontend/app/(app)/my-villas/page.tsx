"use client";

import React, { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { ClientApiClient } from '@/lib/api-client';
import { createDataSyncManager } from '@/lib/data-sync';
import { 
  Plus, 
  Home, 
  Trash2, 
  Edit, 
  Eye, 
  CheckCircle, 
  Clock, 
  XCircle,
  AlertCircle,
  RefreshCw,
  FileText,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

interface VillaSession {
  id: string;
  villaName: string;
  villaCode: string;
  status: string;
  currentStep: number;
  totalSteps: number;
  completedSteps: number;
  progressPercentage: number;
  createdAt: string;
  updatedAt: string;
  location?: string;
  propertyType?: string;
}

export default function MyVillasPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [villas, setVillas] = useState<VillaSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (user?.id) {
      loadVillas();
    }
  }, [user]);

  const loadVillas = async () => {
    setIsLoading(true);
    
    // Debug authentication state
    console.log('🔍 Loading villas for user:', user?.id);
    console.log('🔍 User signed in:', !!user);
    
    try {
      // Get authentication token
      console.log('🔐 Getting authentication token...');
      const token = await getToken();
      console.log('🔑 Token retrieved:', token ? 'Yes' : 'No');
      
      if (!token) {
        console.error('❌ No authentication token available');
        toast.error('Authentication required. Please sign in.');
        return;
      }
      
      // Create authenticated API client
      const authenticatedApi = new ClientApiClient();
      authenticatedApi.setToken(token);
      console.log('✅ Token set, making API request...');
      
      const response = await authenticatedApi.getVillas();
      console.log('📡 API Response:', response);
      
      if (response.success && response.data) {
        // Transform villas to include onboarding progress using sync manager
        const syncManager = createDataSyncManager(authenticatedApi);
        
        const villasWithProgress = await Promise.all(
          response.data.map(async (villa: any) => {
            try {
              console.log('🔄 Syncing progress for villa:', villa.id);
              const progressData = await syncManager.syncOnboardingProgress(villa.id);
              
              if (progressData) {
                return {
                  ...villa,
                  currentStep: progressData.currentStep,
                  totalSteps: progressData.totalSteps,
                  completedSteps: progressData.completedSteps.length,
                  progressPercentage: progressData.progressPercentage,
                  lastUpdatedAt: progressData.lastUpdatedAt,
                };
              } else {
                // Fallback to direct API call if sync fails
                const progressResponse = await authenticatedApi.getOnboardingProgress(villa.id);
                return {
                  ...villa,
                  currentStep: progressResponse.data?.currentStep || 1,
                  totalSteps: 10,
                  completedSteps: progressResponse.data?.completedStepsCount || 0,
                  progressPercentage: progressResponse.data?.completionPercentage || 0,
                };
              }
            } catch (error) {
              console.warn('Failed to sync progress for villa:', villa.id, error);
              return {
                ...villa,
                currentStep: 1,
                totalSteps: 10,
                completedSteps: 0,
                progressPercentage: 0,
              };
            }
          })
        );
        setVillas(villasWithProgress);
      }
    } catch (error) {
      console.error('💥 Error loading villas:', error);
      
      // Check if it's an authentication error
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        console.error('🚨 Network/CORS error - check if backend is running on port 4001');
        toast.error('Unable to connect to server. Please check your connection.');
      } else {
        toast.error('Failed to load your villas');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const createNewVilla = async () => {
    try {
      // Clear any existing onboarding state for this user
      if (user?.id) {
        localStorage.removeItem(`onboarding_villa_${user.id}`);
        localStorage.removeItem(`onboarding_step_${user.id}`);
        localStorage.removeItem(`onboarding_data_${user.id}`);
      }
      
      // Navigate to onboarding wizard - it will create the villa automatically
      router.push('/onboarding');
      toast.success('Starting fresh onboarding session...');
    } catch (error) {
      console.error('Error starting onboarding session:', error);
      toast.error('Failed to start onboarding session');
    }
  };

  const continueOnboarding = async (villaId: string, currentStep: number) => {
    try {
      if (user?.id) {
        // Store the villa ID and step for continuing
        localStorage.setItem(`onboarding_villa_${user.id}`, villaId);
        localStorage.setItem(`onboarding_step_${user.id}`, currentStep.toString());
      }
      
      // Navigate to onboarding wizard
      router.push('/onboarding');
      toast.success('Resuming onboarding session...');
    } catch (error) {
      console.error('Error continuing onboarding:', error);
      toast.error('Failed to continue onboarding');
    }
  };

  const deleteVilla = async (villaId: string) => {
    if (!confirm('Are you sure you want to delete this villa? This action cannot be undone.')) {
      return;
    }

    try {
      // Get authentication token
      const token = await getToken();
      if (!token) {
        toast.error('Authentication required. Please sign in.');
        return;
      }
      
      // Create authenticated API client
      const authenticatedApi = new ClientApiClient();
      authenticatedApi.setToken(token);
      
      const response = await authenticatedApi.request(`/api/villas/${villaId}`, {
        method: 'DELETE',
      });
      
      if (response.success) {
        toast.success('Villa deleted successfully');
        loadVillas();
      }
    } catch (error) {
      console.error('Error deleting villa:', error);
      toast.error('Failed to delete villa');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { color: 'bg-gray-100 text-gray-700', icon: FileText },
      IN_PROGRESS: { color: 'bg-blue-100 text-blue-700', icon: Clock },
      PENDING_REVIEW: { color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
      APPROVED: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      ACTIVE: { color: 'bg-teal-100 text-teal-700', icon: CheckCircle },
      REJECTED: { color: 'bg-red-100 text-red-700', icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getProgressColor = (percentage: number) => {
    if (percentage < 30) return 'bg-red-500';
    if (percentage < 60) return 'bg-yellow-500';
    if (percentage < 90) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const filteredVillas = villas.filter(villa => {
    const matchesSearch = villa.villaName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          villa.villaCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          villa.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || villa.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="glass-card-white-teal p-6 rounded-2xl mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Villa Onboarding Sessions</h1>
              <p className="text-gray-600 mt-1">Manage your villa properties and track onboarding progress</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={loadVillas}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#009990] to-[#007a6b] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#009990] focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              <button
                onClick={createNewVilla}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500/80 to-teal-600/80 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50 border border-teal-400/30"
              >
                <Plus className="w-4 h-4" />
                Start Onboarding
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
                <p className="text-3xl font-bold text-slate-800">{villas.length}</p>
              </div>
              <Home className="w-8 h-8 text-teal-600 opacity-75" />
            </div>
          </div>

          <div className="glass-card-white-teal p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">In Progress</p>
                <p className="text-3xl font-bold text-blue-600">
                  {villas.filter(v => v.status === 'IN_PROGRESS' || v.status === 'DRAFT').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-600 opacity-75" />
            </div>
          </div>

          <div className="glass-card-white-teal p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {villas.filter(v => v.status === 'PENDING_REVIEW').length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-600 opacity-75" />
            </div>
          </div>

          <div className="glass-card-white-teal p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Active</p>
                <p className="text-3xl font-bold text-green-600">
                  {villas.filter(v => v.status === 'ACTIVE').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-75" />
            </div>
          </div>
        </div>

        {/* Search and Filters Bar */}
        <div className="glass-card-white-teal p-6 rounded-2xl mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search villas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-3 w-full border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white shadow-sm transition-all duration-200"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white shadow-sm transition-all duration-200 min-w-[150px]"
            >
              <option value="all">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="ACTIVE">Active</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* Villas Table */}
        <div className="glass-card-white-teal rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading your villas...</p>
            </div>
          ) : filteredVillas.length === 0 ? (
            <div className="p-12 text-center">
              <Home className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No villas found</h3>
              <p className="text-slate-600">Use the "Start Onboarding" button in the header to create your first villa</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Villa Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredVillas.map((villa) => (
                    <tr key={villa.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-800">{villa.villaName}</p>
                          <p className="text-sm text-slate-500">{villa.villaCode || 'No code yet'}</p>
                          {villa.location && (
                            <p className="text-xs text-slate-400 mt-1">{villa.location}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(villa.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-32">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-slate-700">
                              Step {villa.currentStep}/{villa.totalSteps}
                            </span>
                            <span className="text-xs text-slate-500">
                              ({Math.round(villa.progressPercentage)}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${getProgressColor(villa.progressPercentage)}`}
                              style={{ width: `${villa.progressPercentage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600">
                          {new Date(villa.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(villa.createdAt).toLocaleTimeString()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {(villa.status === 'DRAFT' || villa.status === 'IN_PROGRESS' || villa.status === 'REJECTED') && (
                            <button
                              onClick={() => continueOnboarding(villa.id, villa.currentStep)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Continue Onboarding"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => router.push(`/villa-management/${villa.id}/profile`)}
                            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {villa.status === 'DRAFT' && (
                            <button
                              onClick={() => deleteVilla(villa.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Villa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}