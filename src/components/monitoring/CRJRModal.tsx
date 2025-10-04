"use client";

import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/button/Button';
import Badge from '@/components/ui/badge/Badge';
import { X, Save, Trash2, Eye, Edit } from 'lucide-react';

interface CRJRData {
  id: number;
  no: string | null;
  jenis: string;
  corp: string | null;
  sub_bidang: string | null;
  nama_aplikasi: string | null;
  judul_change_request: string | null;
  nomor_surat_penugasan: string | null;
  manager_pic: string | null;
  tanggal_surat_sti: string | null;
  tahapan: string | null;
  organisasi: string | null;
  tahun: number | null;
  january: number | null;
  february: number | null;
  march: number | null;
  april: number | null;
  may: number | null;
  june: number | null;
  july: number | null;
  august: number | null;
  september: number | null;
  october: number | null;
  november: number | null;
  december: number | null;
  created_at: string;
  updated_at: string;
}

interface CRJRModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CRJRData | null;
  mode: 'view' | 'edit' | 'delete' | 'create';
  onSave: (data: CRJRData) => void;
  onDelete: (id: number) => void;
  onCreate?: (data: Omit<CRJRData, 'id' | 'created_at' | 'updated_at'>) => void;
  onModeChange?: (mode: 'view' | 'edit' | 'delete' | 'create') => void;
}

const CRJRModal: React.FC<CRJRModalProps> = ({
  isOpen,
  onClose,
  data,
  mode,
  onSave,
  onDelete,
  onCreate,
  onModeChange
}) => {
  const [formData, setFormData] = useState<CRJRData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (data) {
      setFormData({ ...data });
    }
  }, [data]);

  const handleInputChange = (field: keyof CRJRData, value: string | number | null) => {
    if (formData) {
      setFormData({
        ...formData,
        [field]: value
      });
    }
  };

  const handleSave = async () => {
    if (!formData) return;
    
    setLoading(true);
    try {
      if (mode === 'create' && onCreate) {
        const { id, created_at, updated_at, ...createData } = formData;
        await onCreate(createData);
      } else {
        await onSave(formData);
      }
      onClose();
    } catch (error) {
      console.error('Error saving data:', error);
      // Error is now handled in parent component
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!data) return;
    
    setLoading(true);
    try {
      await onDelete(data.id);
      onClose();
    } catch (error) {
      console.error('Error deleting data:', error);
      // Error is now handled in parent component
    } finally {
      setLoading(false);
    }
  };

  const getJenisBadgeColor = (jenis: string | null) => {
    if (!jenis) return 'light';
    switch (jenis) {
      case 'CR': return 'success';
      case 'SR': return 'info';
      case 'JR': return 'warning';
      default: return 'light';
    }
  };

  const getTahapanBadgeColor = (tahapan: string | null) => {
    if (!tahapan) return 'light';
    switch (tahapan) {
      case 'SELESAI/DEPLOY': return 'success';
      case 'REQUREMENT': return 'warning';
      case 'UAT': return 'info';
      case 'DEVELOPMENT': return 'primary';
      case 'CANCEL': return 'error';
      default: return 'light';
    }
  };

  if (!isOpen || !data || !formData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            {mode === 'view' && <Eye className="w-5 h-5 text-blue-600" />}
            {mode === 'edit' && <Save className="w-5 h-5 text-green-600" />}
            {mode === 'create' && <Save className="w-5 h-5 text-blue-600" />}
            {mode === 'delete' && <Trash2 className="w-5 h-5 text-red-600" />}
            <h2 className="text-lg font-semibold text-gray-900">
              {mode === 'view' && 'CR/JR Details'}
              {mode === 'edit' && 'Edit CR/JR'}
              {mode === 'create' && 'Create New CR/JR'}
              {mode === 'delete' && 'Delete CR/JR'}
            </h2>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4">
          {mode === 'delete' ? (
            <div className="text-center py-8">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete CR/JR</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete this CR/JR record? This action cannot be undone.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700">
                  <strong>No:</strong> {data.no || '-'} | 
                  <strong> Jenis:</strong> {data.jenis} | 
                  <strong> Aplikasi:</strong> {data.nama_aplikasi || '-'}
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleDelete} 
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                  Basic Information
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">No</label>
                  <input
                    type="text"
                    value={formData.no || ''}
                    onChange={(e) => handleInputChange('no', e.target.value || null)}
                    disabled={mode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jenis *</label>
                  {mode === 'view' ? (
                    <Badge color={getJenisBadgeColor(formData.jenis)} size="sm">
                      {formData.jenis}
                    </Badge>
                  ) : (
                    <select
                      value={formData.jenis}
                      onChange={(e) => handleInputChange('jenis', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="CR">CR</option>
                      <option value="SR">SR</option>
                      <option value="JR">JR</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Corp</label>
                  {mode === 'view' ? (
                    <p className="text-sm text-gray-900">{formData.corp || '-'}</p>
                  ) : (
                    <select
                      value={formData.corp || ''}
                      onChange={(e) => handleInputChange('corp', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Corp</option>
                      <option value="Holding">Holding</option>
                      <option value="SH/AP">SH/AP</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sub Bidang</label>
                  <input
                    type="text"
                    value={formData.sub_bidang || ''}
                    onChange={(e) => handleInputChange('sub_bidang', e.target.value || null)}
                    disabled={mode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Aplikasi</label>
                  <input
                    type="text"
                    value={formData.nama_aplikasi || ''}
                    onChange={(e) => handleInputChange('nama_aplikasi', e.target.value || null)}
                    disabled={mode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tahapan</label>
                  {mode === 'view' ? (
                    <Badge color={getTahapanBadgeColor(formData.tahapan)} size="sm">
                      {formData.tahapan || '-'}
                    </Badge>
                  ) : (
                    <select
                      value={formData.tahapan || ''}
                      onChange={(e) => handleInputChange('tahapan', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Tahapan</option>
                      <option value="SELESAI/DEPLOY">SELESAI/DEPLOY</option>
                      <option value="REQUREMENT">REQUREMENT</option>
                      <option value="UAT">UAT</option>
                      <option value="DEVELOPMENT">DEVELOPMENT</option>
                      <option value="CANCEL">CANCEL</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                  Additional Information
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Judul Change Request</label>
                  <textarea
                    value={formData.judul_change_request || ''}
                    onChange={(e) => handleInputChange('judul_change_request', e.target.value || null)}
                    disabled={mode === 'view'}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Surat Penugasan</label>
                  <input
                    type="text"
                    value={formData.nomor_surat_penugasan || ''}
                    onChange={(e) => handleInputChange('nomor_surat_penugasan', e.target.value || null)}
                    disabled={mode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Surat STI</label>
                  <input
                    type="date"
                    value={formData.tanggal_surat_sti ? formData.tanggal_surat_sti.split('T')[0] : ''}
                    onChange={(e) => handleInputChange('tanggal_surat_sti', e.target.value || null)}
                    disabled={mode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organisasi</label>
                  <input
                    type="text"
                    value={formData.organisasi || ''}
                    onChange={(e) => handleInputChange('organisasi', e.target.value || null)}
                    disabled={mode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
                  <input
                    type="number"
                    value={formData.tahun || ''}
                    onChange={(e) => handleInputChange('tahun', e.target.value ? parseInt(e.target.value) : null)}
                    disabled={mode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SLA Monthly Data */}
          {mode !== 'delete' && (
            <div className="lg:col-span-3 mt-6">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">
                SLA Monthly Data
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {[
                  { key: 'january', label: 'January' },
                  { key: 'february', label: 'February' },
                  { key: 'march', label: 'March' },
                  { key: 'april', label: 'April' },
                  { key: 'may', label: 'May' },
                  { key: 'june', label: 'June' },
                  { key: 'july', label: 'July' },
                  { key: 'august', label: 'August' },
                  { key: 'september', label: 'September' },
                  { key: 'october', label: 'October' },
                  { key: 'november', label: 'November' },
                  { key: 'december', label: 'December' }
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    {mode === 'view' ? (
                      <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm">
                        {(() => {
                          const value = formData[key as keyof CRJRData];
                          if (value === null || value === undefined) return '-';
                          // Ensure we're working with decimal values (0-1) and convert to percentage
                          const decimalValue = Number(value);
                          return `${(decimalValue * 100).toFixed(1)}%`;
                        })()}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={(() => {
                            const value = formData[key as keyof CRJRData];
                            if (value === null || value === undefined) return '';
                            // Ensure we're working with decimal values (0-1) and convert to percentage
                            const decimalValue = Number(value);
                            return (decimalValue * 100).toFixed(1);
                          })()}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            if (!inputValue || inputValue === '') {
                              handleInputChange(key as keyof CRJRData, null);
                            } else {
                              const percentageValue = parseFloat(inputValue);
                              // Convert percentage to decimal (15% -> 0.15)
                              const decimalValue = percentageValue / 100;
                              handleInputChange(key as keyof CRJRData, decimalValue);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          {mode !== 'delete' && (
            <div className="flex justify-between items-center gap-3 mt-4 pt-4 border-t border-gray-200 bg-gray-50 px-4 py-3 -mx-4 -mb-4">
              <div className="flex gap-2">
                {mode === 'view' && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onModeChange?.('edit')}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onModeChange?.('delete')}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                {mode !== 'view' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onModeChange?.('view')}
                    disabled={loading}
                  >
                    Back to View
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                {mode === 'edit' && (
                  <Button size="sm" onClick={handleSave} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}
                {mode === 'create' && (
                  <Button size="sm" onClick={handleSave} disabled={loading}>
                    {loading ? 'Creating...' : 'Create CR/JR'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CRJRModal;
