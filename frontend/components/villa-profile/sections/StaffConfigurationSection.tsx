"use client";

import React, { useState } from 'react';
import { clientApi } from '@/lib/api-client';
import { Users, User, Phone, Mail, DollarSign, Car, Shield, Plus, Edit2, Save, X, Trash2, ChevronLeft, ChevronRight, Download, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';

interface StaffConfigurationSectionProps {
  staff: any[];
  villaId: string | null;
}

const staffPositions = [
  {
    id: 'villa_manager',
    name: 'Villa Manager',
    description: 'Overall villa operations and guest coordination',
    icon: User,
    color: 'bg-blue-600'
  },
  {
    id: 'housekeeping',
    name: 'Housekeeping',
    description: 'Cleaning and maintenance of villa interiors',
    icon: Users,
    color: 'bg-purple-600'
  },
  {
    id: 'chef',
    name: 'Chef',
    description: 'Meal preparation and kitchen management',
    icon: User,
    color: 'bg-orange-600'
  },
  {
    id: 'security',
    name: 'Security',
    description: 'Property security and safety',
    icon: Shield,
    color: 'bg-red-600'
  },
  {
    id: 'pool_maintenance',
    name: 'Pool Maintenance',
    description: 'Swimming pool cleaning and maintenance',
    icon: User,
    color: 'bg-blue-500'
  },
  {
    id: 'gardener',
    name: 'Gardener',
    description: 'Landscaping and garden maintenance',
    icon: User,
    color: 'bg-green-600'
  },
  {
    id: 'driver',
    name: 'Driver',
    description: 'Transportation services for guests',
    icon: Car,
    color: 'bg-gray-600'
  },
  {
    id: 'concierge',
    name: 'Concierge',
    description: 'Guest services and local coordination',
    icon: User,
    color: 'bg-teal-600'
  },
  {
    id: 'maintenance',
    name: 'Maintenance Technician',
    description: 'Technical repairs and maintenance',
    icon: User,
    color: 'bg-yellow-600'
  }
];

export default function StaffConfigurationSection({ staff, villaId }: StaffConfigurationSectionProps) {
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [newStaffForm, setNewStaffForm] = useState({
    fullName: '',
    nickname: '',
    position: '',
    idCard: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    maritalStatus: false,
    emergencyContacts: [{ name: '', phone: '', relationship: '' }],
    baseSalary: '',
    startDate: '',
    durationOfWork: '',
    numberOfDaySalary: '',
    serviceCharge: '',
    foodAllowance: false,
    transportation: '',
    healthInsurance: false,
    workInsurance: false,
    totalIncome: '',
    totalNetIncome: '',
    otherDeduct: ''
  });

  const getStaffByPosition = (position: string) => {
    return staff?.filter(s => s.position === position) || [];
  };

  const getPaginatedStaff = (staffList: any[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return staffList.slice(startIndex, endIndex);
  };

  const getTotalPages = (staffList: any[]) => {
    return Math.ceil(staffList.length / itemsPerPage);
  };

  const handleAddStaff = async () => {
    if (!villaId) return;
    
    try {
      const response = await clientApi.addStaffMember(villaId, newStaffForm);
      if (response.success) {
        setIsAddingStaff(false);
        setNewStaffForm({
          fullName: '',
          nickname: '',
          position: '',
          idCard: '',
          dateOfBirth: '',
          email: '',
          phone: '',
          maritalStatus: false,
          emergencyContacts: [{ name: '', phone: '', relationship: '' }],
          baseSalary: '',
          startDate: '',
          durationOfWork: '',
          numberOfDaySalary: '',
          serviceCharge: '',
          foodAllowance: false,
          transportation: '',
          healthInsurance: false,
          workInsurance: false,
          totalIncome: '',
          totalNetIncome: '',
          otherDeduct: ''
        });
        window.location.reload();
      } else {
        console.error('Failed to add staff member:', response.error);
      }
    } catch (error) {
      console.error('Failed to add staff member:', error);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!villaId || !confirm('Are you sure you want to remove this staff member?')) return;
    
    try {
      const response = await clientApi.deleteStaffMember(villaId, staffId);
      if (response.success) {
        window.location.reload();
      } else {
        console.error('Failed to delete staff member:', response.error);
      }
    } catch (error) {
      console.error('Failed to delete staff member:', error);
    }
  };

  const generateStaffSummaryPDF = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    const margin = 20;
    let yPosition = 20;

    // Title
    pdf.setFontSize(20);
    pdf.setTextColor(0, 153, 144); // Teal color
    pdf.text('Staff Summary Report', margin, yPosition);
    yPosition += 10;

    // Date
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, yPosition);
    yPosition += 15;

    // Summary Stats
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Overview', margin, yPosition);
    yPosition += 8;

    pdf.setFontSize(10);
    const totalStaff = staff?.length || 0;
    const staffByPosition = staffPositions.map(pos => ({
      position: pos.name,
      count: getStaffByPosition(pos.id).length
    }));

    pdf.text(`Total Staff Members: ${totalStaff}`, margin, yPosition);
    yPosition += 5;
    pdf.text(`Available Positions: ${staffPositions.length}`, margin, yPosition);
    yPosition += 5;
    pdf.text(`Filled Positions: ${staffByPosition.filter(s => s.count > 0).length}`, margin, yPosition);
    yPosition += 15;

    // Staff by Position
    pdf.setFontSize(14);
    pdf.text('Staff by Position', margin, yPosition);
    yPosition += 10;

    staffPositions.forEach((position) => {
      const positionStaff = getStaffByPosition(position.id);
      
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${position.name} (${positionStaff.length} staff)`, margin, yPosition);
      yPosition += 5;

      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(position.description, margin + 5, yPosition);
      yPosition += 8;

      if (positionStaff.length > 0) {
        positionStaff.forEach((staffMember) => {
          if (yPosition > 260) {
            pdf.addPage();
            yPosition = 20;
          }
          
          pdf.setFontSize(10);
          pdf.setTextColor(0, 0, 0);
          pdf.text(`• ${staffMember.fullName || 'Unnamed Staff'}`, margin + 10, yPosition);
          yPosition += 4;
          
          if (staffMember.email) {
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`  Email: ${staffMember.email}`, margin + 15, yPosition);
            yPosition += 3;
          }
          
          if (staffMember.phone) {
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`  Phone: ${staffMember.phone}`, margin + 15, yPosition);
            yPosition += 3;
          }
          
          if (staffMember.startDate) {
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`  Start Date: ${new Date(staffMember.startDate).toLocaleDateString()}`, margin + 15, yPosition);
            yPosition += 3;
          }
          yPosition += 2;
        });
      } else {
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text('• No staff assigned', margin + 10, yPosition);
        yPosition += 4;
      }
      yPosition += 5;
    });

    // Footer
    const finalY = pdf.internal.pageSize.height - 15;
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Generated by M1 Villa Management System', margin, finalY);

    // Save the PDF
    const fileName = `villa-staff-summary-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  };

  return (
    <div className="glass-card-white-teal rounded-2xl">
      {/* Section Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <Users className="w-6 h-6 text-teal-600" />
          <div>
            <h2 className="text-xl font-medium text-gray-900">Staff Configuration</h2>
            <p className="text-sm text-gray-600">Villa staff management and coordination</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={generateStaffSummaryPDF}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
          <button
            onClick={() => setIsAddingStaff(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#009990] to-[#007a6b] text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#009990] focus:ring-opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add Staff
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Staff Positions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {staffPositions.map((position) => {
            const Icon = position.icon;
            const positionStaff = getStaffByPosition(position.id);
            
            return (
              <div 
                key={position.id} 
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedPosition === position.id 
                    ? 'border-teal-300 bg-teal-50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => {
                  setSelectedPosition(selectedPosition === position.id ? null : position.id);
                  setCurrentPage(1); // Reset pagination when changing position
                }}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`w-8 h-8 ${position.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900">{position.name}</h3>
                    <p className="text-xs text-gray-600">{positionStaff.length} staff</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">{position.description}</p>
              </div>
            );
          })}
        </div>

        {/* Staff Details for Selected Position */}
        {selectedPosition && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {staffPositions.find(p => p.id === selectedPosition)?.name} Staff
              {getStaffByPosition(selectedPosition).length > itemsPerPage && (
                <span className="ml-2 text-sm text-slate-500">
                  (Showing {((currentPage - 1) * itemsPerPage) + 1}-
                  {Math.min(currentPage * itemsPerPage, getStaffByPosition(selectedPosition).length)} of {getStaffByPosition(selectedPosition).length})
                </span>
              )}
            </h3>
            
            <div className="space-y-4">
              {getPaginatedStaff(getStaffByPosition(selectedPosition)).map((member) => (
                <div key={member.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-base font-medium text-gray-900">{member.fullName}</h4>
                      <p className="text-sm text-gray-600">{member.contractType?.replace('_', ' ').toUpperCase()}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingStaff(editingStaff === member.id ? null : member.id)}
                        className="p-2 text-slate-400 hover:text-gray-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(member.id)}
                        className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span>{member.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{member.phone}</span>
                    </div>
                    {member.salary && (
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-slate-400" />
                        <span>{member.salary} / {member.salaryType}</span>
                      </div>
                    )}
                  </div>
                  
                  {member.workSchedule && (
                    <div className="mt-2 text-sm text-gray-600">
                      <strong>Schedule:</strong> {member.workSchedule}
                    </div>
                  )}
                  
                  {member.languages && (
                    <div className="mt-1 text-sm text-gray-600">
                      <strong>Languages:</strong> {member.languages}
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-4 mt-3">
                    {member.hasTransportation && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        <Car className="w-3 h-3 mr-1" />
                        Transportation
                      </span>
                    )}
                    {member.hasInsurance && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <Shield className="w-3 h-3 mr-1" />
                        Insured
                      </span>
                    )}
                  </div>
                </div>
              ))}
              
              {getStaffByPosition(selectedPosition).length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No staff members in this position</p>
                  <button
                    onClick={() => {
                      setNewStaffForm({ ...newStaffForm, position: selectedPosition });
                      setIsAddingStaff(true);
                    }}
                    className="mt-2 text-sm text-teal-600 hover:text-teal-700"
                  >
                    Add first staff member
                  </button>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {getStaffByPosition(selectedPosition).length > itemsPerPage && (
              <div className="flex items-center justify-center space-x-2 mt-6">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: getTotalPages(getStaffByPosition(selectedPosition)) }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-teal-600 text-white'
                          : 'border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(getTotalPages(getStaffByPosition(selectedPosition)), prev + 1))}
                  disabled={currentPage === getTotalPages(getStaffByPosition(selectedPosition))}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Add Staff Form */}
        {isAddingStaff && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h3 className="text-lg font-medium text-gray-900">Add Staff Member</h3>
                <button
                  onClick={() => setIsAddingStaff(false)}
                  className="text-slate-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Position</label>
                    <select
                      value={newStaffForm.position}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, position: e.target.value })}
                      className="form-input-white-teal w-full px-3 py-2"
                    >
                      <option value="">Select position</option>
                      {staffPositions.map(position => (
                        <option key={position.id} value={position.id}>{position.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={newStaffForm.fullName}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, fullName: e.target.value })}
                      className="form-input-white-teal w-full px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={newStaffForm.email}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                      className="form-input-white-teal w-full px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={newStaffForm.phone}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, phone: e.target.value })}
                      className="form-input-white-teal w-full px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Emergency Contact Name</label>
                    <input
                      type="text"
                      value={newStaffForm.emergencyContacts[0]?.name || ''}
                      onChange={(e) => {
                        const updatedContacts = [...newStaffForm.emergencyContacts];
                        updatedContacts[0] = { ...updatedContacts[0], name: e.target.value };
                        setNewStaffForm({ ...newStaffForm, emergencyContacts: updatedContacts });
                      }}
                      className="form-input-white-teal w-full px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Emergency Phone</label>
                    <input
                      type="tel"
                      value={newStaffForm.emergencyContacts[0]?.phone || ''}
                      onChange={(e) => {
                        const updatedContacts = [...newStaffForm.emergencyContacts];
                        updatedContacts[0] = { ...updatedContacts[0], phone: e.target.value };
                        setNewStaffForm({ ...newStaffForm, emergencyContacts: updatedContacts });
                      }}
                      className="form-input-white-teal w-full px-3 py-2"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newStaffForm.healthInsurance}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, healthInsurance: e.target.checked })}
                      className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                    />
                    <span className="ml-2 text-sm text-slate-700">Health Insurance</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newStaffForm.workInsurance}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, workInsurance: e.target.checked })}
                      className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                    />
                    <span className="ml-2 text-sm text-slate-700">Work Insurance</span>
                  </label>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-200">
                <button
                  onClick={() => setIsAddingStaff(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStaff}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                >
                  Add Staff Member
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Staff Summary */}
        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Staff Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{staff?.length || 0}</div>
              <div className="text-xs text-gray-600">Total Staff</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {staffPositions.filter(p => getStaffByPosition(p.id).length > 0).length}
              </div>
              <div className="text-xs text-gray-600">Active Positions</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {staff?.filter(s => s.hasInsurance).length || 0}
              </div>
              <div className="text-xs text-gray-600">Insured</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {staff?.filter(s => s.hasTransportation).length || 0}
              </div>
              <div className="text-xs text-gray-600">With Transport</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}