"use client";

import React, { useState, useEffect } from "react";
import { PlusIcon, PencilIcon, CheckCircleIcon, CloseIcon, TrashBinIcon } from "@/icons";

interface LicenseFormData {
  id?: number;
  nama: string;
  comp: string;
  bpo: string;
  jenis: string;
  period: string;
  qty: number;
  symbol: string;
  unit_price: number;
  total_price: number;
  selling_price: number;
  cont_serv_month: number;
  cont_period: string;
  start_date: string;
  end_date: string;
  met_puch: string;
}

interface LicenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LicenseFormData) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  editData?: LicenseFormData | null;
  loading?: boolean;
}

const LicenseForm: React.FC<LicenseFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  editData,
  loading = false
}) => {
  const [formData, setFormData] = useState<LicenseFormData>({
    nama: "",
    comp: "",
    bpo: "",
    jenis: "",
    period: "",
    qty: 0,
    symbol: "",
    unit_price: 0,
    total_price: 0,
    selling_price: 0,
    cont_serv_month: 0,
    cont_period: "",
    start_date: "",
    end_date: "",
    met_puch: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or editData changes
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setFormData(editData);
      } else {
        setFormData({
          nama: "",
          comp: "",
          bpo: "",
          jenis: "",
          period: "",
          qty: 0,
          symbol: "",
          unit_price: 0,
          total_price: 0,
          selling_price: 0,
          cont_serv_month: 0,
          cont_period: "",
          start_date: "",
          end_date: "",
          met_puch: ""
        });
      }
      setErrors({});
    }
  }, [isOpen, editData]);

  // Auto calculate totals when values change
  useEffect(() => {
    const qty = Number(formData.qty) || 0;
    const unitPrice = Number(formData.unit_price) || 0;
    const sellingPrice = Number(formData.selling_price) || 0;
    
    const totalPrice = qty * unitPrice;
    
    setFormData(prev => ({ 
      ...prev, 
      total_price: totalPrice
    }));
  }, [formData.qty, formData.unit_price, formData.selling_price]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nama.trim()) {
      newErrors.nama = 'Nama wajib diisi';
    }

    if (!formData.comp.trim()) {
      newErrors.comp = 'Company wajib diisi';
    }

    if (!formData.bpo.trim()) {
      newErrors.bpo = 'BPO wajib diisi';
    }

    if (!formData.jenis.trim()) {
      newErrors.jenis = 'Jenis wajib diisi';
    }

    if (!formData.period.trim()) {
      newErrors.period = 'Period wajib diisi';
    }

    if (formData.qty <= 0) {
      newErrors.qty = 'Quantity harus lebih dari 0';
    }

    if ((formData.unit_price || 0) <= 0) {
      newErrors.unit_price = 'Unit price harus lebih dari 0';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date wajib diisi';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'End date wajib diisi';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleDelete = async () => {
    if (!editData?.id || !onDelete) return;
    
    if (!confirm('Apakah Anda yakin ingin menghapus lisensi ini?')) {
      return;
    }

    try {
      await onDelete(editData.id);
      onClose();
    } catch (error) {
      console.error('Error deleting license:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {editData ? 'Edit' : 'Tambah'} Monitoring Lisensi
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={loading}
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* ID - Auto Generated */}
            {editData && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ID (Auto Generated)
                </label>
                <input
                  type="number"
                  value={formData.id || 0}
                  className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-gray-600 dark:border-gray-600 dark:text-white border-gray-300"
                  disabled
                />
              </div>
            )}

            {/* Nama */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nama *
              </label>
              <input
                type="text"
                name="nama"
                value={formData.nama}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.nama ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
                placeholder="Contoh: Oracle Crystal Ball"
              />
              {errors.nama && <p className="text-red-500 text-xs mt-1">{errors.nama}</p>}
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Company *
              </label>
              <input
                type="text"
                name="comp"
                value={formData.comp}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.comp ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
                placeholder="Contoh: STI"
              />
              {errors.comp && <p className="text-red-500 text-xs mt-1">{errors.comp}</p>}
            </div>

            {/* BPO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                BPO *
              </label>
              <input
                type="text"
                name="bpo"
                value={formData.bpo}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.bpo ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
                placeholder="Contoh: BPO001"
              />
              {errors.bpo && <p className="text-red-500 text-xs mt-1">{errors.bpo}</p>}
            </div>

            {/* Jenis */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Jenis *
              </label>
              <select
                name="jenis"
                value={formData.jenis}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.jenis ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              >
                <option value="">Pilih Jenis</option>
                <option value="Perpetual License">Perpetual License</option>
                <option value="Perpetual License + ATS Yearly">Perpetual License + ATS Yearly</option>
                <option value="Subscription License">Subscription License</option>
                <option value="Trial License">Trial License</option>
                <option value="Educational License">Educational License</option>
              </select>
              {errors.jenis && <p className="text-red-500 text-xs mt-1">{errors.jenis}</p>}
            </div>

            {/* Period */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Period *
              </label>
              <input
                type="text"
                name="period"
                value={formData.period}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.period ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
                placeholder="Contoh: 1 Year"
              />
              {errors.period && <p className="text-red-500 text-xs mt-1">{errors.period}</p>}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                name="qty"
                value={formData.qty}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.qty ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
                min="1"
              />
              {errors.qty && <p className="text-red-500 text-xs mt-1">{errors.qty}</p>}
            </div>

            {/* Symbol */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Symbol
              </label>
              <input
                type="text"
                name="symbol"
                value={formData.symbol}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white border-gray-300"
                disabled={loading}
                placeholder="Contoh: USD, IDR"
              />
            </div>

            {/* Unit Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Unit Price *
              </label>
              <input
                type="number"
                name="unit_price"
                value={formData.unit_price || 0}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  errors.unit_price ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
                min="0"
                step="0.01"
              />
              {errors.unit_price && <p className="text-red-500 text-xs mt-1">{errors.unit_price}</p>}
            </div>

            {/* Total Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Total Price
              </label>
              <input
                type="number"
                name="total_price"
                value={formData.total_price || 0}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white border-gray-300"
                disabled={loading}
                min="0"
                step="0.01"
              />
            </div>

            {/* Selling Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Selling Price
              </label>
              <input
                type="number"
                name="selling_price"
                value={formData.selling_price || 0}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white border-gray-300"
                disabled={loading}
                min="0"
                step="0.01"
              />
            </div>





            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white border-gray-300"
                disabled={loading}
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white border-gray-300"
                disabled={loading}
              />
            </div>

            {/* Contract Service Month */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contract Service Month
              </label>
              <input
                type="number"
                name="cont_serv_month"
                value={formData.cont_serv_month}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white border-gray-300"
                disabled={loading}
                min="0"
                placeholder="Masukkan jumlah bulan"
              />
            </div>

            {/* Contract Period */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contract Period
              </label>
              <input
                type="text"
                name="cont_period"
                value={formData.cont_period}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white border-gray-300"
                disabled={loading}
                placeholder="Contoh: 1 Year, 6 Months, etc."
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div>
              {editData && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  disabled={loading}
                >
                  <TrashBinIcon className="w-4 h-4" />
                  Hapus
                </button>
              )}
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                disabled={loading}
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-4 h-4" />
                    {editData ? 'Update' : 'Simpan'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LicenseForm;