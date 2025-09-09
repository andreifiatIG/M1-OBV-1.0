"use client";

import React, { useState } from 'react';
import { clientApi } from '@/lib/api-client';
import { CreditCard, Building2, Shield, Edit2, Save, X, MapPin, CheckCircle } from 'lucide-react';

interface BankDetailsSectionProps {
  bankDetails: any;
  villaId: string | null;
}

export default function BankDetailsSection({ bankDetails, villaId }: BankDetailsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    // Account Information (3 fields)
    accountName: bankDetails?.accountName || '',
    bankName: bankDetails?.bankName || '',
    swiftBicCode: bankDetails?.swiftBicCode || '',
    
    // Sensitive Information (1 field - masked)
    maskedAccountNumber: bankDetails?.maskedAccountNumber || '',
    
    // Bank Location (2 fields)
    bankBranch: bankDetails?.bankBranch || '',
    bankAddress: bankDetails?.bankAddress || '',
    
    // Security Acknowledgment (1 field)
    securityAcknowledgment: bankDetails?.securityAcknowledgment || false
  });

  const handleSave = async () => {
    if (!villaId) return;
    
    try {
      const response = await clientApi.updateBankDetails(villaId, formData);
      if (response.success) {
        setIsEditing(false);
        window.location.reload();
      } else {
        console.error('Failed to update bank details:', response.error);
      }
    } catch (error) {
      console.error('Failed to update bank details:', error);
    }
  };

  const handleCancel = () => {
    setFormData({
      accountName: bankDetails?.accountName || '',
      bankName: bankDetails?.bankName || '',
      swiftBicCode: bankDetails?.swiftBicCode || '',
      maskedAccountNumber: bankDetails?.maskedAccountNumber || '',
      bankBranch: bankDetails?.bankBranch || '',
      bankAddress: bankDetails?.bankAddress || '',
      securityAcknowledgment: bankDetails?.securityAcknowledgment || false
    });
    setIsEditing(false);
  };

  const maskAccountNumber = (accountNumber: string) => {
    if (!accountNumber || accountNumber.length < 4) return accountNumber;
    const visibleDigits = accountNumber.slice(-4);
    const maskedPart = '*'.repeat(Math.max(0, accountNumber.length - 4));
    return maskedPart + visibleDigits;
  };

  return (
    <div className="glass-card-white-teal rounded-2xl">
      {/* Section Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <CreditCard className="w-6 h-6 text-teal-600" />
          <div>
            <h2 className="text-xl font-medium text-gray-900">Bank Details</h2>
            <p className="text-sm text-gray-600">Secure banking information for payouts</p>
          </div>
        </div>
        
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#009990] to-[#007a6b] text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#009990] focus:ring-opacity-50"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="p-6">
        {/* Security Notice */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-amber-900 mb-1">Security Information</h4>
              <p className="text-sm text-amber-700">
                All banking information is encrypted and stored securely. Account numbers are masked for security purposes.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Account Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <CreditCard className="w-5 h-5 text-gray-600 mr-2" />
              Account Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Account Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Account holder name"
                  />
                ) : (
                  <p className="text-gray-900">{bankDetails?.accountName || 'Not provided'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Bank Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Name of the bank"
                  />
                ) : (
                  <p className="text-gray-900">{bankDetails?.bankName || 'Not provided'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">SWIFT/BIC Code</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.swiftBicCode}
                    onChange={(e) => setFormData({ ...formData, swiftBicCode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="International bank code"
                  />
                ) : (
                  <p className="text-gray-900">{bankDetails?.swiftBicCode || 'Not provided'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Account Number</label>
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={formData.maskedAccountNumber}
                      onChange={(e) => setFormData({ ...formData, maskedAccountNumber: e.target.value })}
                      className="form-input-white-teal w-full px-3 py-2"
                      placeholder="Bank account number"
                    />
                    <p className="text-xs text-slate-500">
                      Account numbers are automatically masked for security
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-900 font-mono">
                    {bankDetails?.maskedAccountNumber 
                      ? maskAccountNumber(bankDetails.maskedAccountNumber)
                      : 'Not provided'
                    }
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Bank Location */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Building2 className="w-5 h-5 text-gray-600 mr-2" />
              Bank Location
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Bank Branch</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.bankBranch}
                    onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Branch name or code"
                  />
                ) : (
                  <p className="text-gray-900">{bankDetails?.bankBranch || 'Not provided'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Bank Address</label>
                {isEditing ? (
                  <textarea
                    value={formData.bankAddress}
                    onChange={(e) => setFormData({ ...formData, bankAddress: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Complete bank address"
                  />
                ) : (
                  <p className="text-gray-900 flex items-start">
                    <MapPin className="w-4 h-4 text-slate-500 mr-2 mt-0.5" />
                    {bankDetails?.bankAddress || 'Not provided'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Security Acknowledgment */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Shield className="w-5 h-5 text-gray-600 mr-2" />
              Security Acknowledgment
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                {isEditing ? (
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="securityAcknowledgment"
                      checked={formData.securityAcknowledgment}
                      onChange={(e) => setFormData({ ...formData, securityAcknowledgment: e.target.checked })}
                      className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                    />
                    <label htmlFor="securityAcknowledgment" className="text-sm text-slate-700">
                      I acknowledge that this banking information is accurate and authorize M1 Villa Management 
                      to use these details for processing payments and payouts.
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    {bankDetails?.securityAcknowledgment ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-slate-700">
                          Security acknowledgment confirmed
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-5 h-5 border-2 border-slate-300 rounded"></div>
                        <span className="text-sm text-slate-500">
                          Security acknowledgment pending
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              {bankDetails?.securityAcknowledgment && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">
                    Security acknowledgment completed on{' '}
                    {bankDetails.updatedAt 
                      ? new Date(bankDetails.updatedAt).toLocaleDateString()
                      : 'Unknown date'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}