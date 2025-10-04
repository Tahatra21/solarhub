"use client";

import React, { useState, useEffect } from "react";
import { PlusIcon, PencilIcon, CheckCircleIcon, CloseIcon, TrashBinIcon } from "@/icons";

interface RunProgramFormData {
  id?: number;
  no_task: number;
  task_name: string;
  type: string;
  bpo: string;
  holding_sh_ap: string;
  potensi_revenue: string;
  pic_team_cusol: string;
  priority: string;
  percent_complete: string;
  surat: string;
  tanggal_surat: string | null;
  perihal_surat: string;
  start_date: string | null;
  end_date: string | null;
  pic_icon: string;
  progress_agst_w1: string;
  next_action_agst_w1: string;
  status_agst_w1: string;
  progress_agst_w2: string;
  next_action_agst_w2: string;
  status_agst_w2: string;
  progress_agst_w3: string;
  next_action_agst_w3: string;
  status_agst_w3: string;
  progress_agst_w4: string;
  next_action_agst_w4: string;
  status_agst_w4: string;
  progress_sept_w1: string;
  next_action_sept_w1: string;
  status_sept_w1: string;
  progress_sept_w2: string;
  next_action_sept_w2: string;
  status_sept_w2: string;
  progress_sept_w3: string;
  next_action_sept_w3: string;
  status_sept_w3: string;
  progress_sept_w4: string;
  next_action_sept_w4: string;
  status_sept_w4: string;
  overall_status: string;
}

interface RunProgramFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RunProgramFormData) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  editData?: RunProgramFormData | null;
  loading?: boolean;
}

const RunProgramForm: React.FC<RunProgramFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  editData,
  loading = false
}) => {
  const [formData, setFormData] = useState<RunProgramFormData>({
    no_task: 0,
    task_name: "",
    type: "",
    bpo: "",
    holding_sh_ap: "",
    potensi_revenue: "",
    pic_team_cusol: "",
    priority: "",
    percent_complete: "0",
    surat: "",
    tanggal_surat: null,
    perihal_surat: "",
    start_date: null,
    end_date: null,
    pic_icon: "",
    progress_agst_w1: "",
    next_action_agst_w1: "",
    status_agst_w1: "",
    progress_agst_w2: "",
    next_action_agst_w2: "",
    status_agst_w2: "",
    progress_agst_w3: "",
    next_action_agst_w3: "",
    status_agst_w3: "",
    progress_agst_w4: "",
    next_action_agst_w4: "",
    status_agst_w4: "",
    progress_sept_w1: "",
    next_action_sept_w1: "",
    status_sept_w1: "",
    progress_sept_w2: "",
    next_action_sept_w2: "",
    status_sept_w2: "",
    progress_sept_w3: "",
    next_action_sept_w3: "",
    status_sept_w3: "",
    progress_sept_w4: "",
    next_action_sept_w4: "",
    status_sept_w4: "",
    overall_status: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or editData changes
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setFormData(editData);
      } else {
        setFormData({
          no_task: 0,
          task_name: "",
          type: "",
          bpo: "",
          holding_sh_ap: "",
          potensi_revenue: "",
          pic_team_cusol: "",
          priority: "",
          percent_complete: "0",
          surat: "",
          tanggal_surat: null,
          perihal_surat: "",
          start_date: null,
          end_date: null,
          pic_icon: "",
          progress_agst_w1: "",
          next_action_agst_w1: "",
          status_agst_w1: "",
          progress_agst_w2: "",
          next_action_agst_w2: "",
          status_agst_w2: "",
          progress_agst_w3: "",
          next_action_agst_w3: "",
          status_agst_w3: "",
          progress_agst_w4: "",
          next_action_agst_w4: "",
          status_agst_w4: "",
          progress_sept_w1: "",
          next_action_sept_w1: "",
          status_sept_w1: "",
          progress_sept_w2: "",
          next_action_sept_w2: "",
          status_sept_w2: "",
          progress_sept_w3: "",
          next_action_sept_w3: "",
          status_sept_w3: "",
          progress_sept_w4: "",
          next_action_sept_w4: "",
          status_sept_w4: "",
          overall_status: ""
        });
      }
      setErrors({});
    }
  }, [isOpen, editData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (parseFloat(value) || 0).toString() : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.task_name.trim()) {
      newErrors.task_name = 'Task name is required';
    }
    if (!formData.type.trim()) {
      newErrors.type = 'Type is required';
    }
    if (!formData.bpo.trim()) {
      newErrors.bpo = 'BPO is required';
    }
    if (!formData.priority.trim()) {
      newErrors.priority = 'Priority is required';
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
    
    if (window.confirm('Are you sure you want to delete this program?')) {
      try {
        await onDelete(editData.id);
        onClose();
      } catch (error) {
        console.error('Error deleting program:', error);
      }
    }
  };

  if (!isOpen) {
    console.log('RunProgramForm: isOpen is false, not rendering');
    return null;
  }
  
  console.log('RunProgramForm: Rendering form with editData:', editData);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {editData ? 'Edit' : 'Add'} Run Program
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
            {/* Basic Information */}
            <div className="lg:col-span-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Basic Information</h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                No Task *
              </label>
              <input
                type="number"
                name="no_task"
                value={formData.no_task}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                required
              />
              {errors.no_task && <p className="text-red-500 text-xs mt-1">{errors.no_task}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Task Name *
              </label>
              <input
                type="text"
                name="task_name"
                value={formData.task_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                required
              />
              {errors.task_name && <p className="text-red-500 text-xs mt-1">{errors.task_name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                required
              >
                <option value="">Select Type</option>
                <option value="Development">Development</option>
                <option value="Enhancement">Enhancement</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Support">Support</option>
              </select>
              {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                BPO *
              </label>
              <select
                name="bpo"
                value={formData.bpo}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                required
              >
                <option value="">Select BPO</option>
                <option value="IT">IT</option>
                <option value="Finance">Finance</option>
                <option value="HR">HR</option>
                <option value="Operations">Operations</option>
              </select>
              {errors.bpo && <p className="text-red-500 text-xs mt-1">{errors.bpo}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority *
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                required
              >
                <option value="">Select Priority</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
              {errors.priority && <p className="text-red-500 text-xs mt-1">{errors.priority}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                PIC Team Cusol
              </label>
              <input
                type="text"
                name="pic_team_cusol"
                value={formData.pic_team_cusol}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Progress (%)
              </label>
              <input
                type="number"
                name="percent_complete"
                value={formData.percent_complete}
                onChange={handleInputChange}
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Potential Revenue
              </label>
              <input
                type="number"
                name="potensi_revenue"
                value={formData.potensi_revenue}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date || ""}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date || ""}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Overall Status
              </label>
              <select
                name="overall_status"
                value={formData.overall_status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              >
                <option value="">Select Status</option>
                <option value="ON TRACK">On Track</option>
                <option value="LAGGING">Lagging</option>
                <option value="COMPLETED">Completed</option>
                <option value="AT RISK">At Risk</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            {editData && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                disabled={loading}
              >
                <TrashBinIcon className="w-4 h-4 mr-2" />
                Delete
              </button>
            )}
            
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              disabled={loading}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {editData ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  {editData ? <PencilIcon className="w-4 h-4 mr-2" /> : <PlusIcon className="w-4 h-4 mr-2" />}
                  {editData ? 'Update' : 'Create'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RunProgramForm;
