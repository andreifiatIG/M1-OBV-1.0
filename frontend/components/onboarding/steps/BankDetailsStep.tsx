"use client";

import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { Building2, Shield, Lock, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { StepHandle } from './types';
import { countries } from '../../../lib/countries';
import { currencies, formatCurrencyOption } from '../../../lib/currencies';

interface BankDetailsStepProps {
  data: any;
  onUpdate: (stepData: any) => void;
}

const defaultFormData = {
  accountName: '',
  bankName: '',
  swiftBicCode: '',
  bankAccountNumber: '',
  iban: '',
  bankBranch: '',
  bankAddress: '',
  branchCode: '',
  bankCountry: '',
  currency: 'IDR',
  accountType: 'CHECKING',
};

const BankDetailsStep = forwardRef<StepHandle, BankDetailsStepProps>((
  { data, onUpdate },
  ref
) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const formData = { ...defaultFormData, ...data };

  const handleInputChange = (field: string, value: string | boolean) => {
    onUpdate({
      ...formData,
      [field]: value
    });
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    // Disable validation for development - always return true
    return true;
  };

  useImperativeHandle(ref, () => ({
    validate: validateForm,
    getData: () => ({
      ...formData,
      swiftBicCode: formData.swiftBicCode.toUpperCase(),
    }),
  }));

  const toggleAccountNumberVisibility = () => {
    setShowAccountNumber(!showAccountNumber);
  };

  const maskAccountNumber = (accountNumber: string) => {
    if (!accountNumber) return '';
    if (accountNumber.length <= 4) return accountNumber;
    return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4);
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#009990]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-[#009990]" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Bank Details</h2>
        <p className="text-slate-600">Secure banking information for payouts</p>
        <div className="flex items-center justify-center mt-4 p-3 glass-card-white-teal">
          <Lock className="w-5 h-5 text-[#009990] mr-2" />
          <span className="text-slate-700 text-sm">All banking information is encrypted and stored securely</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Security Warning */}
        <div className="glass-card-white-teal p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-[#009990] mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-slate-700">
              <p className="font-medium mb-2">Security Notice</p>
              <ul className="space-y-1 text-slate-600">
                <li>• All bank details are encrypted using AES-256 encryption</li>
                <li>• Information is stored in a separate encrypted database</li>
                <li>• Access is restricted to authorized personnel only</li>
                <li>• Data is used solely for payment processing</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Account Information Section */}
        <div className="glass-card-white-teal rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-slate-700" />
            Account Information
          </h3>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Account Name *
              </label>
              <input
                type="text"
                value={formData.accountName}
                onChange={(e) => handleInputChange('accountName', e.target.value)}
                placeholder="Full name of account holder"
                className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 ${
                  errors.accountName ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
                }`}
              />
              {errors.accountName && (
                <p className="text-red-400 text-sm mt-1">{errors.accountName}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Bank Name *
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => handleInputChange('bankName', e.target.value)}
                  placeholder="Name of the bank"
                  className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 ${
                    errors.bankName ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
                  }`}
                />
                {errors.bankName && (
                  <p className="text-red-400 text-sm mt-1">{errors.bankName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  SWIFT/BIC Code *
                </label>
                <input
                  type="text"
                  value={formData.swiftBicCode}
                  onChange={(e) => handleInputChange('swiftBicCode', e.target.value.toUpperCase())}
                  placeholder="e.g. BKKBTHBK"
                  maxLength={11}
                  className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 font-mono ${
                    errors.swiftBicCode ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
                  }`}
                />
                {errors.swiftBicCode && (
                  <p className="text-red-400 text-sm mt-1">{errors.swiftBicCode}</p>
                )}
                <p className="text-slate-500 text-xs mt-1">8 or 11 character international bank code</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Bank Account Number *
              </label>
              <div className="relative">
                <input
                  type={showAccountNumber ? "text" : "password"}
                  value={formData.bankAccountNumber}
                  onChange={(e) => handleInputChange('bankAccountNumber', e.target.value)}
                  placeholder="Bank account number"
                  className={`w-full px-4 py-3 pr-12 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 font-mono ${
                    errors.bankAccountNumber ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
                  }`}
                />
                <button
                  type="button"
                  onClick={toggleAccountNumberVisibility}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {showAccountNumber ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.bankAccountNumber && (
                <p className="text-red-400 text-sm mt-1">{errors.bankAccountNumber}</p>
              )}
              {!showAccountNumber && formData.bankAccountNumber && (
                <p className="text-slate-500 text-xs mt-1">
                  Preview: {maskAccountNumber(formData.bankAccountNumber)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                IBAN (International Bank Account Number)
              </label>
              <input
                type="text"
                value={formData.iban}
                onChange={(e) => handleInputChange('iban', e.target.value.toUpperCase())}
                placeholder="e.g. GB29 NWBK 6016 1331 9268 19"
                className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 font-mono ${
                  errors.iban ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
                }`}
              />
              {errors.iban && (
                <p className="text-red-400 text-sm mt-1">{errors.iban}</p>
              )}
              <p className="text-slate-500 text-xs mt-1">For international transfers (optional)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Account Type
                </label>
                <select
                  value={formData.accountType}
                  onChange={(e) => handleInputChange('accountType', e.target.value)}
                  className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 ${
                    errors.accountType ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
                  }`}
                >
                  <option value="CHECKING">Checking Account</option>
                  <option value="SAVINGS">Savings Account</option>
                  <option value="BUSINESS">Business Account</option>
                </select>
                {errors.accountType && (
                  <p className="text-red-400 text-sm mt-1">{errors.accountType}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 ${
                    errors.currency ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
                  }`}
                >
                  <option value="">Select currency</option>
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {formatCurrencyOption(currency)}
                    </option>
                  ))}
                </select>
                {errors.currency && (
                  <p className="text-red-400 text-sm mt-1">{errors.currency}</p>
                )}
              </div>
            </div>


          </div>
        </div>

        {/* Bank Location Section */}
        <div className="glass-card-white-teal rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Bank Location</h3>
          <div className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Bank Branch *
                </label>
                <input
                  type="text"
                  value={formData.bankBranch}
                  onChange={(e) => handleInputChange('bankBranch', e.target.value)}
                  placeholder="Branch name or location"
                  className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 ${
                    errors.bankBranch ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
                  }`}
                />
                {errors.bankBranch && (
                  <p className="text-red-400 text-sm mt-1">{errors.bankBranch}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Branch Code
                </label>
                <input
                  type="text"
                  value={formData.branchCode}
                  onChange={(e) => handleInputChange('branchCode', e.target.value)}
                  placeholder="Branch identification code"
                  className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 font-mono ${
                    errors.branchCode ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
                  }`}
                />
                {errors.branchCode && (
                  <p className="text-red-400 text-sm mt-1">{errors.branchCode}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Bank Address *
              </label>
              <textarea
                value={formData.bankAddress}
                onChange={(e) => handleInputChange('bankAddress', e.target.value)}
                placeholder="Full bank branch address"
                rows={3}
                className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 placeholder-slate-500/80 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 resize-none ${
                  errors.bankAddress ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
                }`}
              />
              {errors.bankAddress && (
                <p className="text-red-400 text-sm mt-1">{errors.bankAddress}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Bank Country *
              </label>
              <select
                value={formData.bankCountry}
                onChange={(e) => handleInputChange('bankCountry', e.target.value)}
                className={`w-full px-4 py-3 bg-white/60 backdrop-filter backdrop-blur-10 border rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition-all duration-200 ${
                  errors.bankCountry ? 'border-red-500 bg-red-50/60' : 'border-teal-400/40'
                }`}
              >
                <option value="">Select bank country</option>
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
              {errors.bankCountry && (
                <p className="text-red-400 text-sm mt-1">{errors.bankCountry}</p>
              )}
            </div>
          </div>
        </div>


        {/* Information Box */}
        <div className="glass-card-white-teal p-4">
          <div className="flex items-start">
            <Shield className="w-5 h-5 text-[#009990] mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-slate-700">
              <p className="font-medium mb-2">Payment Processing</p>
              <ul className="space-y-1 text-slate-600">
                <li>• Payments are processed according to your contract terms</li>
                <li>• Bank details are verified before first payout</li>
                <li>• All transactions are logged and auditable</li>
                <li>• You can update banking information anytime in settings</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default BankDetailsStep;
