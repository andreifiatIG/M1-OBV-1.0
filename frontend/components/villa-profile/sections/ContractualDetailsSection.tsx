"use client";

import React, { useState } from 'react';
import { clientApi } from '@/lib/api-client';
import { FileText, Calendar, DollarSign, Hash, Edit2, Save, X, Percent } from 'lucide-react';

interface ContractualDetailsSectionProps {
  contractualDetails: any;
  villaId: string | null;
}

export default function ContractualDetailsSection({ contractualDetails, villaId }: ContractualDetailsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    // Contract Dates (2 fields)
    contractSignatureDate: contractualDetails?.contractSignatureDate || '',
    contractRenewalDate: contractualDetails?.contractRenewalDate || '',
    
    // Monthly Payout Schedule (3 fields)
    legacyPayoutDate: contractualDetails?.legacyPayoutDate || '',
    payoutDay1: contractualDetails?.payoutDay1 || '',
    payoutDay2: contractualDetails?.payoutDay2 || '',
    
    // Registration Numbers (2 fields)
    vatNumber: contractualDetails?.vatNumber || '',
    dbdNumber: contractualDetails?.dbdNumber || '',
    
    // Financial Terms (5 fields)
    serviceChargePercentage: contractualDetails?.serviceChargePercentage || 0,
    paymentTerms: contractualDetails?.paymentTerms || '',
    vatTerms: contractualDetails?.vatTerms || '',
    penaltyClause: contractualDetails?.penaltyClause || '',
    terminationClause: contractualDetails?.terminationClause || ''
  });

  const handleSave = async () => {
    if (!villaId) return;
    
    try {
      const response = await clientApi.updateContractualDetails(villaId, formData);
      if (response.success) {
        setIsEditing(false);
        window.location.reload();
      } else {
        console.error('Failed to update contractual details:', response.error);
      }
    } catch (error) {
      console.error('Failed to update contractual details:', error);
    }
  };

  const handleCancel = () => {
    setFormData({
      contractSignatureDate: contractualDetails?.contractSignatureDate || '',
      contractRenewalDate: contractualDetails?.contractRenewalDate || '',
      legacyPayoutDate: contractualDetails?.legacyPayoutDate || '',
      payoutDay1: contractualDetails?.payoutDay1 || '',
      payoutDay2: contractualDetails?.payoutDay2 || '',
      vatNumber: contractualDetails?.vatNumber || '',
      dbdNumber: contractualDetails?.dbdNumber || '',
      serviceChargePercentage: contractualDetails?.serviceChargePercentage || 0,
      paymentTerms: contractualDetails?.paymentTerms || '',
      vatTerms: contractualDetails?.vatTerms || '',
      penaltyClause: contractualDetails?.penaltyClause || '',
      terminationClause: contractualDetails?.terminationClause || ''
    });
    setIsEditing(false);
  };

  return (
    <div className="glass-card-white-teal rounded-2xl">
      {/* Section Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <FileText className="w-6 h-6 text-teal-600" />
          <div>
            <h2 className="text-xl font-medium text-gray-900">Contractual Details</h2>
            <p className="text-sm text-gray-600">Contract dates, payout schedule, and financial terms</p>
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
        <div className="space-y-8">
          {/* Contract Dates */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Calendar className="w-5 h-5 text-gray-600 mr-2" />
              Contract Dates
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Contract Signature Date</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={formData.contractSignatureDate}
                    onChange={(e) => setFormData({ ...formData, contractSignatureDate: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900">
                    {contractualDetails?.contractSignatureDate 
                      ? new Date(contractualDetails.contractSignatureDate).toLocaleDateString() 
                      : 'Not provided'
                    }
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Contract Renewal Date</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={formData.contractRenewalDate}
                    onChange={(e) => setFormData({ ...formData, contractRenewalDate: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900">
                    {contractualDetails?.contractRenewalDate 
                      ? new Date(contractualDetails.contractRenewalDate).toLocaleDateString() 
                      : 'Not provided'
                    }
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Monthly Payout Schedule */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <DollarSign className="w-5 h-5 text-gray-600 mr-2" />
              Monthly Payout Schedule
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Legacy Payout Date</label>
                {isEditing ? (
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.legacyPayoutDate}
                    onChange={(e) => setFormData({ ...formData, legacyPayoutDate: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                    placeholder="Day of month (1-31)"
                  />
                ) : (
                  <p className="text-gray-900">
                    {contractualDetails?.legacyPayoutDate 
                      ? `${contractualDetails.legacyPayoutDate} of each month`
                      : 'Not provided'
                    }
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Payout Day 1</label>
                {isEditing ? (
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.payoutDay1}
                    onChange={(e) => setFormData({ ...formData, payoutDay1: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                    placeholder="Day of month (1-31)"
                  />
                ) : (
                  <p className="text-gray-900">
                    {contractualDetails?.payoutDay1 
                      ? `${contractualDetails.payoutDay1} of each month`
                      : 'Not provided'
                    }
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Payout Day 2</label>
                {isEditing ? (
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.payoutDay2}
                    onChange={(e) => setFormData({ ...formData, payoutDay2: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                    placeholder="Day of month (1-31)"
                  />
                ) : (
                  <p className="text-gray-900">
                    {contractualDetails?.payoutDay2 
                      ? `${contractualDetails.payoutDay2} of each month`
                      : 'Not provided'
                    }
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Registration Numbers */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Hash className="w-5 h-5 text-gray-600 mr-2" />
              Registration Numbers
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">VAT Number</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.vatNumber}
                    onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900">{contractualDetails?.vatNumber || 'Not provided'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">DBD Number</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.dbdNumber}
                    onChange={(e) => setFormData({ ...formData, dbdNumber: e.target.value })}
                    className="form-input-white-teal w-full px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900">{contractualDetails?.dbdNumber || 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Financial Terms */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Percent className="w-5 h-5 text-gray-600 mr-2" />
              Financial Terms
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Service Charge %</label>
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.serviceChargePercentage}
                      onChange={(e) => setFormData({ ...formData, serviceChargePercentage: parseFloat(e.target.value) || 0 })}
                      className="form-input-white-teal w-full px-3 py-2"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {contractualDetails?.serviceChargePercentage 
                        ? `${contractualDetails.serviceChargePercentage}%`
                        : 'Not provided'
                      }
                    </p>
                  )}
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Payment Terms</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                      className="form-input-white-teal w-full px-3 py-2"
                      placeholder="e.g., Net 30, Monthly, Bi-weekly"
                    />
                  ) : (
                    <p className="text-gray-900">{contractualDetails?.paymentTerms || 'Not provided'}</p>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">VAT Terms</label>
                {isEditing ? (
                  <textarea
                    value={formData.vatTerms}
                    onChange={(e) => setFormData({ ...formData, vatTerms: e.target.value })}
                    rows={3}
                    className="form-input-white-teal w-full px-3 py-2"
                    placeholder="Describe VAT terms and conditions"
                  />
                ) : (
                  <p className="text-gray-900">{contractualDetails?.vatTerms || 'Not provided'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Penalty Clause</label>
                {isEditing ? (
                  <textarea
                    value={formData.penaltyClause}
                    onChange={(e) => setFormData({ ...formData, penaltyClause: e.target.value })}
                    rows={3}
                    className="form-input-white-teal w-full px-3 py-2"
                    placeholder="Describe penalty terms and conditions"
                  />
                ) : (
                  <p className="text-gray-900">{contractualDetails?.penaltyClause || 'Not provided'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Termination Clause</label>
                {isEditing ? (
                  <textarea
                    value={formData.terminationClause}
                    onChange={(e) => setFormData({ ...formData, terminationClause: e.target.value })}
                    rows={3}
                    className="form-input-white-teal w-full px-3 py-2"
                    placeholder="Describe contract termination terms"
                  />
                ) : (
                  <p className="text-gray-900">{contractualDetails?.terminationClause || 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}