"use client";

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, DollarSign, Plus, X } from 'lucide-react';

interface PayoutDate {
  day: number;
  enabled: boolean;
  id: string;
}

interface PayoutDateConfiguratorProps {
  value?: PayoutDate[];
  onChange?: (payoutDates: PayoutDate[]) => void;
  className?: string;
  maxDates?: number;
}

export const PayoutDateConfigurator: React.FC<PayoutDateConfiguratorProps> = ({
  value = [],
  onChange,
  className = '',
  maxDates = 2
}) => {
  const [payoutDates, setPayoutDates] = useState<PayoutDate[]>(() => {
    // Initialize with default dates if empty
    if (value.length === 0) {
      return [
        { day: 15, enabled: true, id: '1' },
        { day: 30, enabled: true, id: '2' }
      ];
    }
    return value;
  });

  useEffect(() => {
    onChange?.(payoutDates);
  }, [payoutDates, onChange]);

  const addPayoutDate = () => {
    if (payoutDates.length >= maxDates) return;
    
    // Find next available day (avoid duplicates)
    const usedDays = payoutDates.map(pd => pd.day);
    let newDay = 1;
    while (usedDays.includes(newDay) && newDay <= 31) {
      newDay++;
    }

    const newDate: PayoutDate = {
      day: newDay,
      enabled: true,
      id: Date.now().toString()
    };

    setPayoutDates(prev => [...prev, newDate]);
  };

  const removePayoutDate = (id: string) => {
    if (payoutDates.length <= 1) return; // Keep at least one
    setPayoutDates(prev => prev.filter(pd => pd.id !== id));
  };

  const updatePayoutDate = (id: string, updates: Partial<PayoutDate>) => {
    setPayoutDates(prev => prev.map(pd => 
      pd.id === id ? { ...pd, ...updates } : pd
    ));
  };

  const getDayWithSuffix = (day: number) => {
    if (day >= 11 && day <= 13) return `${day}th`;
    switch (day % 10) {
      case 1: return `${day}st`;
      case 2: return `${day}nd`;
      case 3: return `${day}rd`;
      default: return `${day}th`;
    }
  };

  const getNextPayoutDates = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();

    const nextDates: Date[] = [];

    payoutDates
      .filter(pd => pd.enabled)
      .forEach(pd => {
        // Current month
        if (pd.day > currentDay) {
          nextDates.push(new Date(currentYear, currentMonth, pd.day));
        }
        
        // Next month
        const nextMonth = currentMonth + 1;
        const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
        const adjustedMonth = nextMonth > 11 ? 0 : nextMonth;
        
        // Handle end of month (e.g., day 31 in February)
        const daysInMonth = new Date(nextYear, adjustedMonth + 1, 0).getDate();
        const actualDay = Math.min(pd.day, daysInMonth);
        
        nextDates.push(new Date(nextYear, adjustedMonth, actualDay));
      });

    return nextDates.sort((a, b) => a.getTime() - b.getTime()).slice(0, 4);
  };

  const nextPayoutDates = getNextPayoutDates();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-green-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Monthly Payout Schedule
        </h3>
      </div>

      <p className="text-sm text-gray-600">
        Configure up to {maxDates} payout dates per month. Payouts will be processed on these dates.
      </p>

      {/* Payout Dates Configuration */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Payout Dates
        </h4>

        <div className="space-y-3">
          {payoutDates.map((payoutDate, index) => (
            <div
              key={payoutDate.id}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg"
            >
              {/* Enable/Disable Toggle */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={payoutDate.enabled}
                  onChange={(e) => updatePayoutDate(payoutDate.id, { enabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>

              {/* Day Selector */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payout #{index + 1}
                </label>
                <select
                  value={payoutDate.day}
                  onChange={(e) => updatePayoutDate(payoutDate.id, { day: parseInt(e.target.value) })}
                  disabled={!payoutDate.enabled}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>
                      {getDayWithSuffix(day)} of the month
                    </option>
                  ))}
                </select>
              </div>

              {/* Remove Button */}
              {payoutDates.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePayoutDate(payoutDate.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Remove this payout date"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add New Date Button */}
        {payoutDates.length < maxDates && (
          <button
            type="button"
            onClick={addPayoutDate}
            className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Payout Date
          </button>
        )}
      </div>

      {/* Preview of Next Payout Dates */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4" />
          Upcoming Payouts
        </h4>
        
        {nextPayoutDates.length > 0 ? (
          <div className="space-y-2">
            {nextPayoutDates.map((date, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-blue-800">
                <Calendar className="w-3 h-3" />
                <span>{date.toLocaleDateString('en-US', { 
                  weekday: 'short',
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-blue-800">
            No active payout dates configured
          </p>
        )}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>
            • <strong>{payoutDates.filter(pd => pd.enabled).length}</strong> active payout dates per month
          </li>
          <li>
            • Payouts will be processed on the{' '}
            {payoutDates
              .filter(pd => pd.enabled)
              .map(pd => getDayWithSuffix(pd.day))
              .join(' and ')}{' '}
            of each month
          </li>
          <li>
            • If a payout date falls on a weekend or holiday, it will be processed on the next business day
          </li>
        </ul>
      </div>
    </div>
  );
};

export default PayoutDateConfigurator;