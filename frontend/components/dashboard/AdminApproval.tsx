"use client";

import React from 'react';

interface OnboardingRecord {
  _id: string;
  currentStep?: number;
  completedSteps?: number[];
  status?: string;
  onboardingData?: {
    villaInfo?: {
      villaName?: string;
    };
    ownerDetails?: {
      ownerFullName?: string;
    };
  };
}

interface AdminApprovalProps {
  onboardingRecords: OnboardingRecord[];
  onViewDetails: (id: string) => void;
  onViewDocuments: (id: string) => void;
  onViewPhotos: (id: string) => void;
  onStepIn: (id: string) => void;
  onRemove: (id: string) => void;
  calculateProgress: (currentStep: number, completedSteps: number[] | undefined) => number;
  getCurrentStage: (currentStep: number | undefined) => string;
  getProgressColor: (progress: number) => string;
  getStatusBadge: (progress: number, status?: string) => React.ReactNode;
}

const AdminApproval: React.FC<AdminApprovalProps> = ({
  onboardingRecords,
  onViewDetails,
  onViewDocuments,
  onViewPhotos,
  onStepIn,
  onRemove,
  calculateProgress,
  getCurrentStage,
  getProgressColor,
  getStatusBadge
}) => {
  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Admin Approval Center</h1>
        <p className="text-slate-600 mt-1">Review and approve villa onboarding applications.</p>
      </header>

      <div className="glass-card-white-teal p-0 overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-slate-800">Pending Approvals</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50/50">
              <tr>
                <th scope="col" className="px-6 py-3">Villa Name</th>
                <th scope="col" className="px-6 py-3">Owner</th>
                <th scope="col" className="px-6 py-3">Current Stage</th>
                <th scope="col" className="px-6 py-3">Progress</th>
                <th scope="col" className="px-6 py-3">Status</th>
                <th scope="col" className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {onboardingRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <p>No onboarding records found.</p>
                  </td>
                </tr>
              ) : (
                onboardingRecords.map((record) => {
                  const progress = calculateProgress(record.currentStep || 1, record.completedSteps);
                  const currentStage = getCurrentStage(record.currentStep);
                  
                  return (
                    <tr key={record._id} className="bg-white/50 border-b border-slate-200/60 hover:bg-slate-50/70">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {record.onboardingData?.villaInfo?.villaName || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        {record.onboardingData?.ownerDetails?.ownerFullName || 'N/A'}
                      </td>
                      <td className="px-6 py-4">{currentStage}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-full bg-slate-200 rounded-full h-2.5 mr-2">
                            <div 
                              className={`h-2.5 rounded-full ${getProgressColor(progress)}`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <span>{Math.round(progress)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(progress, record.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => onViewDetails(record._id)}
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Details
                          </button>
                          <button 
                            onClick={() => onViewDocuments(record._id)}
                            className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            Docs
                          </button>
                          <button 
                            onClick={() => onViewPhotos(record._id)}
                            className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                          >
                            Photos
                          </button>
                          <button 
                            onClick={() => onStepIn(record._id)}
                            className="px-3 py-1 text-xs bg-teal-100 text-teal-700 rounded hover:bg-teal-200"
                          >
                            Step In
                          </button>
                          <button 
                            onClick={() => onRemove(record._id)}
                            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminApproval;
