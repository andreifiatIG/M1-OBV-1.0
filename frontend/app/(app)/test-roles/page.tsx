"use client";

import React, { useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { Shield, User, Settings, RefreshCw, AlertCircle } from 'lucide-react';

export default function TestRolesPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const makeRequest = async (endpoint: string, method: string = 'GET') => {
    setLoading(true);
    setMessage('');
    try {
      const token = await getToken();
      
      if (!token) {
        setMessage('❌ No authentication token available');
        return;
      }
      
      const response = await fetch(`http://localhost:4001${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage(`✅ Success: ${data.message || 'Request completed'}`);
        // Refresh user data after 2 seconds
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMessage(`❌ Error: ${data.error || 'Request failed'}`);
      }
    } catch (error) {
      setMessage(`❌ Request failed: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentRole = () => {
    return user?.publicMetadata?.role || user?.unsafeMetadata?.role || 'owner';
  };

  const isAdmin = () => {
    const role = getCurrentRole();
    return role === 'admin' || role === 'administrator';
  };

  const isManager = () => {
    const role = getCurrentRole();
    return role === 'manager' || isAdmin();
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="glass-card-white-teal p-8 rounded-2xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-red-700 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Role Assignment Center</h1>
              <p className="text-gray-600">Assign admin/manager roles for testing purposes</p>
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-800">Development Tool</h3>
                <p className="text-amber-700 text-sm">This page is for development purposes only. Use it to assign yourself admin privileges to access admin features.</p>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {message && (
            <div className="mb-6 p-4 bg-slate-50 rounded-lg border">
              <p className="text-gray-900">{message}</p>
            </div>
          )}

          {/* Current User Info */}
          <div className="glass-card-white-teal p-6 rounded-xl mb-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Current User Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Name:</p>
                <p className="text-gray-900">{user?.firstName} {user?.lastName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Email:</p>
                <p className="text-gray-900 text-sm">{user?.emailAddresses[0]?.emailAddress}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Current Role:</p>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                    isAdmin() ? 'bg-red-100 text-red-700' : 
                    isManager() ? 'bg-blue-100 text-blue-700' : 
                    'bg-green-100 text-green-700'
                  }`}>
                    {isAdmin() ? <Shield className="w-3 h-3" /> : 
                     isManager() ? <Settings className="w-3 h-3" /> : 
                     <User className="w-3 h-3" />}
                    {getCurrentRole().toUpperCase()}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Access Level:</p>
                <p className="text-gray-900">
                  {isAdmin() ? '🔴 Full Admin Access' : 
                   isManager() ? '🔵 Manager Access' : 
                   '🟢 Owner Access Only'}
                </p>
              </div>
            </div>
          </div>

          {/* Role Assignment Buttons */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Role Assignment</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => makeRequest('/api/users/make-admin', 'POST')}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 disabled:opacity-50 disabled:transform-none shadow-lg"
              >
                <Shield className="w-5 h-5" />
                {loading ? 'Processing...' : 'Make Me Admin'}
              </button>
              
              <button
                onClick={() => makeRequest('/api/users/make-manager', 'POST')}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:transform-none shadow-lg"
              >
                <Settings className="w-5 h-5" />
                {loading ? 'Processing...' : 'Make Me Manager'}
              </button>
              
              <button
                onClick={() => makeRequest('/api/users/make-owner', 'POST')}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50 disabled:transform-none shadow-lg"
              >
                <User className="w-5 h-5" />
                {loading ? 'Processing...' : 'Reset to Owner'}
              </button>
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              <p><strong>Admin:</strong> Full access to all features, user management, and approvals</p>
              <p><strong>Manager:</strong> Access to admin features but limited user management</p>
              <p><strong>Owner:</strong> Access to own villas and onboarding only</p>
            </div>
          </div>

          {/* Quick Access Links */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Quick Access</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => window.location.href = '/my-villas'}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors border border-teal-200"
              >
                My Villas
              </button>
              
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
              >
                Dashboard
              </button>
              
              <button
                onClick={() => window.location.href = '/admin/users'}
                disabled={!isManager()}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors border ${
                  isManager() 
                    ? 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                }`}
              >
                Users {!isManager() && '🔒'}
              </button>
              
              <button
                onClick={() => window.location.href = '/admin/approvals'}
                disabled={!isManager()}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors border ${
                  isManager() 
                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border-amber-200'
                }`}
              >
                Approvals {!isManager() && '🔒'}
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl font-semibold hover:from-teal-700 hover:to-teal-800 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50 shadow-lg"
            >
              Go to Homepage
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}