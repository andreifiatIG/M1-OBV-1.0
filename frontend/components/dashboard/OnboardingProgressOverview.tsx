"use client";

import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  TrendingUp,
  Eye,
  SkipForward,
  Activity,
  Calendar,
  ArrowRight,
  FileText
} from 'lucide-react';
import { clientApi } from '@/lib/api-client';

// Types from backend
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
  lastActivityAt: Date;
  startedAt?: Date;
  completedAt?: Date;
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

const OnboardingProgressOverview: React.FC = () => {
  const [data, setData] = useState<DashboardOnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'active' | 'completed' | 'analytics'>('overview');

  useEffect(() => {
    fetchOnboardingData();
  }, []);

  const fetchOnboardingData = async () => {
    try {
      setLoading(true);
      const response = await clientApi.request('/api/dashboard/onboarding-overview');
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch onboarding data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: OnboardingProgressSummary['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600 bg-green-100';
      case 'IN_PROGRESS':
        return 'text-blue-600 bg-blue-100';
      case 'PENDING_REVIEW':
        return 'text-amber-600 bg-amber-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: OnboardingProgressSummary['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4" />;
      case 'IN_PROGRESS':
        return <Activity className="w-4 h-4" />;
      case 'PENDING_REVIEW':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Failed to load onboarding data</h3>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={fetchOnboardingData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Onboarding Progress</h2>
          <p className="text-slate-600">Track villa onboarding completion and analytics</p>
        </div>
        <button
          onClick={fetchOnboardingData}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
        >
          <Activity className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Active Sessions</p>
              <p className="text-2xl font-bold text-slate-900">{data.sessionsInProgress.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-slate-600">
            <TrendingUp className="w-4 h-4 mr-1" />
            In progress villas
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Completed (7d)</p>
              <p className="text-2xl font-bold text-slate-900">{data.completionStats.last7Days}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-slate-600">
            <Calendar className="w-4 h-4 mr-1" />
            Last 7 days
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Avg. Time</p>
              <p className="text-2xl font-bold text-slate-900">
                {Math.floor(data.averageCompletionTime / 60)}h {data.averageCompletionTime % 60}m
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-slate-600">
            <Activity className="w-4 h-4 mr-1" />
            To completion
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Pending Review</p>
              <p className="text-2xl font-bold text-slate-900">{data.pendingReview.length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-slate-600">
            <Eye className="w-4 h-4 mr-1" />
            Awaiting review
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'active', label: `Active (${data.sessionsInProgress.length})` },
              { id: 'completed', label: `Completed (${data.recentlyCompleted.length})` },
              { id: 'analytics', label: 'Analytics' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {[...data.sessionsInProgress, ...data.recentlyCompleted]
                      .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime())
                      .slice(0, 5)
                      .map((session) => (
                        <div key={session.villaId} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${getStatusColor(session.status)}`}>
                              {getStatusIcon(session.status)}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{session.villaName}</p>
                              <p className="text-sm text-slate-600">
                                Step {session.currentStep} of {session.totalSteps} • {session.progressPercentage}% complete
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-600">{formatTimeAgo(session.lastActivityAt)}</p>
                            <div className="w-16 bg-slate-200 rounded-full h-2 mt-1">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${session.progressPercentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Most Skipped Fields</h3>
                  <div className="space-y-3">
                    {data.commonSkippedFields.slice(0, 5).map((field, index) => (
                      <div key={`${field.fieldName}-${field.stepNumber}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                            <SkipForward className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{field.fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</p>
                            <p className="text-sm text-slate-600">Step {field.stepNumber}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-slate-900">{field.skipCount}</p>
                          <p className="text-sm text-slate-600">times skipped</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'active' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Active Onboarding Sessions</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {data.sessionsInProgress.map((session) => (
                  <div key={session.villaId} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-slate-900">{session.villaName}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                        {session.status.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Progress</span>
                        <span className="font-medium">{session.progressPercentage}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${session.progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Current Step</p>
                        <p className="font-medium">{session.currentStep} of {session.totalSteps}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Fields Completed</p>
                        <p className="font-medium">{session.fieldsCompleted} / {session.totalFields}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Last Activity</p>
                        <p className="font-medium">{formatTimeAgo(session.lastActivityAt)}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Est. Remaining</p>
                        <p className="font-medium">
                          {session.estimatedTimeRemaining ? `${session.estimatedTimeRemaining}m` : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {session.fieldsSkipped > 0 && (
                      <div className="mt-3 p-2 bg-amber-50 rounded border border-amber-200">
                        <p className="text-sm text-amber-700">
                          <SkipForward className="w-4 h-4 inline mr-1" />
                          {session.fieldsSkipped} fields skipped
                        </p>
                      </div>
                    )}

                    <div className="mt-4 flex justify-end">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
                        View Details <ArrowRight className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {data.sessionsInProgress.length === 0 && (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No active onboarding sessions</h3>
                  <p className="text-slate-600">All villas have completed their onboarding process.</p>
                </div>
              )}
            </div>
          )}

          {selectedTab === 'completed' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Recently Completed</h3>
              <div className="space-y-3">
                {data.recentlyCompleted.map((session) => (
                  <div key={session.villaId} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{session.villaName}</h4>
                        <p className="text-sm text-slate-600">
                          Completed {session.completedAt ? formatTimeAgo(session.completedAt) : 'recently'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900">100%</p>
                      <p className="text-sm text-slate-600">{session.totalSteps} steps</p>
                    </div>
                  </div>
                ))}
              </div>

              {data.recentlyCompleted.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No recent completions</h3>
                  <p className="text-slate-600">No villas have completed onboarding recently.</p>
                </div>
              )}
            </div>
          )}

          {selectedTab === 'analytics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800">Onboarding Analytics</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 mb-2">Completion Rate</h4>
                  <div className="text-2xl font-bold text-green-600">
                    {data.totalSessions > 0 
                      ? Math.round((data.completionStats.totalCompleted / data.totalSessions) * 100)
                      : 0}%
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    {data.completionStats.totalCompleted} of {data.totalSessions} total
                  </p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 mb-2">This Month</h4>
                  <div className="text-2xl font-bold text-blue-600">
                    {data.completionStats.last30Days}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    Completed in last 30 days
                  </p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 mb-2">Average Duration</h4>
                  <div className="text-2xl font-bold text-amber-600">
                    {Math.floor(data.averageCompletionTime / 60)}h {data.averageCompletionTime % 60}m
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    Time to completion
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-4">Skip Analysis</h4>
                <div className="space-y-3">
                  {data.commonSkippedFields.slice(0, 8).map((field, index) => (
                    <div key={`${field.fieldName}-${field.stepNumber}`} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-mono text-slate-500">#{index + 1}</span>
                        <div>
                          <p className="font-medium text-slate-900">
                            {field.fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </p>
                          <p className="text-sm text-slate-600">Step {field.stepNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-slate-900">{field.skipCount} times</p>
                        <div className="flex space-x-1 mt-1">
                          {field.skipReasons.slice(0, 3).map((reason) => (
                            <span
                              key={reason.reason}
                              className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded"
                            >
                              {reason.reason.replace('_', ' ').toLowerCase()}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingProgressOverview;