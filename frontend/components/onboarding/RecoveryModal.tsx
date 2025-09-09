"use client";

import React, { useState } from 'react';
import { AlertCircle, RotateCcw, X, Clock, Database, HardDrive } from 'lucide-react';
import { BackupData } from './OnboardingBackupService';
import { formatDistanceToNow } from 'date-fns';

interface RecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  backupData: BackupData;
  onRecover: () => void;
  onDiscard: () => void;
}

const RecoveryModal: React.FC<RecoveryModalProps> = ({
  isOpen,
  onClose,
  backupData,
  onRecover,
  onDiscard,
}) => {
  const [isRecovering, setIsRecovering] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  if (!isOpen) return null;

  const handleRecover = async () => {
    setIsRecovering(true);
    try {
      await onRecover();
    } finally {
      setIsRecovering(false);
    }
  };

  const getStepProgress = () => {
    const completedSteps = Object.keys(backupData.stepData).length;
    const totalSteps = 10;
    return { completed: completedSteps, total: totalSteps };
  };

  const getBackupAge = () => {
    try {
      return formatDistanceToNow(new Date(backupData.lastSaved), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  const progress = getStepProgress();
  const progressPercent = Math.round((progress.completed / progress.total) * 100);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Restore Previous Session?
              </h2>
              <p className="text-sm text-gray-500">
                We found unsaved progress
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning */}
          <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-800">
                Unsaved Progress Detected
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Your previous onboarding session was interrupted. You can restore your progress or start fresh.
              </p>
            </div>
          </div>

          {/* Progress Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">Progress Summary</span>
              <span className="text-sm text-gray-600">{progressPercent}% Complete</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Step {backupData.currentStep} of 10</span>
              <span>{progress.completed} steps completed</span>
            </div>
          </div>

          {/* Backup Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Last saved</span>
              </div>
              <span className="font-medium text-gray-900">{getBackupAge()}</span>
            </div>
            
            {backupData.villaId && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Villa ID</span>
                </div>
                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                  {backupData.villaId}
                </span>
              </div>
            )}
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <HardDrive className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Session ID</span>
              </div>
              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                {backupData.sessionId.slice(-8)}
              </span>
            </div>
          </div>

          {/* Details Toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full text-sm text-gray-600 hover:text-gray-800 py-2 transition-colors"
          >
            {showDetails ? 'Hide' : 'Show'} Technical Details
          </button>

          {showDetails && (
            <div className="bg-gray-100 rounded-lg p-3 text-xs font-mono space-y-1">
              <div><span className="text-gray-600">Version:</span> {backupData.version}</div>
              <div><span className="text-gray-600">Session:</span> {backupData.sessionId}</div>
              <div><span className="text-gray-600">Timestamp:</span> {backupData.lastSaved}</div>
              <div><span className="text-gray-600">Steps Data:</span> {Object.keys(backupData.stepData).join(', ') || 'None'}</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onDiscard}
            disabled={isRecovering}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Start Fresh
          </button>
          <button
            onClick={handleRecover}
            disabled={isRecovering}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {isRecovering ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Restoring...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>Restore Progress</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecoveryModal;