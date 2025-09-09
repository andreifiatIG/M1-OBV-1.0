"use client";

import React, { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { Shield, Settings, Bell, Users, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PendingApproval {
  id: string;
  villaName: string;
  ownerName: string;
  submittedAt: string;
  status: string;
}

const AdminButton = () => {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user has admin role
  useEffect(() => {
    if (user) {
      // Check user metadata for admin role
      const role = user.publicMetadata?.role || user.unsafeMetadata?.role;
      setIsAdmin(role === 'admin' || role === 'administrator' || role === 'manager');
    }
  }, [user]);

  // Load pending approvals for admin users
  useEffect(() => {
    if (isAdmin) {
      loadPendingApprovals();
    }
  }, [isAdmin]);

  const loadPendingApprovals = async () => {
    try {
      // Mock data for now - replace with actual API call
      const mockPendingApprovals: PendingApproval[] = [
        {
          id: '1',
          villaName: 'Sunset Paradise Villa',
          ownerName: 'John Smith',
          submittedAt: '2024-01-20T10:30:00Z',
          status: 'PENDING_REVIEW'
        },
        {
          id: '2', 
          villaName: 'Ocean Breeze Estate',
          ownerName: 'Sarah Johnson',
          submittedAt: '2024-01-19T15:45:00Z',
          status: 'PENDING_REVIEW'
        }
      ];
      setPendingApprovals(mockPendingApprovals);
    } catch (error) {
      console.error('Error loading pending approvals:', error);
    }
  };

  const handleAdminDashboard = () => {
    router.push('/dashboard?tab=admin');
    setIsDropdownOpen(false);
  };

  const handleApprovalCenter = () => {
    router.push('/admin/approvals');
    setIsDropdownOpen(false);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Less than 1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  // Don't render if not signed in or not admin
  if (!isSignedIn || !isAdmin) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="relative flex items-center justify-center w-10 h-10 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50"
        title="Admin Panel"
      >
        <Shield className="w-5 h-5" />
        {/* Notification badge for pending approvals */}
        {pendingApprovals.length > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {pendingApprovals.length > 9 ? '9+' : pendingApprovals.length}
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <h3 className="font-semibold">Admin Panel</h3>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-3 border-b border-gray-100">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleAdminDashboard}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                Dashboard
              </button>
              <button
                onClick={handleApprovalCenter}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approvals
              </button>
            </div>
          </div>

          {/* Pending Approvals Section */}
          <div className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-amber-600" />
              <h4 className="text-sm font-semibold text-gray-900">
                Pending Approvals ({pendingApprovals.length})
              </h4>
            </div>

            {pendingApprovals.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No pending approvals</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {pendingApprovals.map((approval) => (
                  <div
                    key={approval.id}
                    className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
                    onClick={() => {
                      router.push(`/villa-profile/${approval.id}`);
                      setIsDropdownOpen(false);
                    }}
                  >
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {approval.villaName}
                      </p>
                      <p className="text-xs text-gray-600">
                        by {approval.ownerName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimeAgo(approval.submittedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-gray-100 p-3">
            <button
              onClick={handleApprovalCenter}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white text-sm font-semibold rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all duration-200"
            >
              <CheckCircle2 className="w-4 h-4" />
              View All Approvals
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminButton;