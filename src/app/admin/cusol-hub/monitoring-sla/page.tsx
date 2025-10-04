"use client";

import React, { useState, useEffect } from "react";
import { AlertIcon, CheckCircleIcon, InfoIcon } from "@/icons";

interface SLAData {
  id: string;
  ticketNumber: string;
  type: "CR" | "JR";
  title: string;
  priority: "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  createdDate: string;
  dueDate: string;
  assignee: string;
  slaStatus: "On Time" | "At Risk" | "Overdue";
  remainingTime: string;
}

const MonitoringSLAPage = () => {
  const [slaData, setSlaData] = useState<SLAData[]>([]);
  const [filterType, setFilterType] = useState<"All" | "CR" | "JR">("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [loading, setLoading] = useState(true);

  // Mock data - replace with actual API call
  useEffect(() => {
    const mockData: SLAData[] = [
      {
        id: "1",
        ticketNumber: "CR-2024-001",
        type: "CR",
        title: "Update User Authentication System",
        priority: "High",
        status: "In Progress",
        createdDate: "2024-01-15",
        dueDate: "2024-01-20",
        assignee: "John Doe",
        slaStatus: "At Risk",
        remainingTime: "2 hours"
      },
      {
        id: "2",
        ticketNumber: "JR-2024-002",
        type: "JR",
        title: "Database Performance Issue",
        priority: "High",
        status: "Open",
        createdDate: "2024-01-16",
        dueDate: "2024-01-18",
        assignee: "Jane Smith",
        slaStatus: "Overdue",
        remainingTime: "Overdue by 1 day"
      },
      {
        id: "3",
        ticketNumber: "CR-2024-003",
        type: "CR",
        title: "Add New Report Feature",
        priority: "Medium",
        status: "Resolved",
        createdDate: "2024-01-10",
        dueDate: "2024-01-25",
        assignee: "Mike Johnson",
        slaStatus: "On Time",
        remainingTime: "Completed"
      }
    ];
    
    setTimeout(() => {
      setSlaData(mockData);
      setLoading(false);
    }, 1000);
  }, []);

  const getSLAStatusColor = (status: string) => {
    switch (status) {
      case "On Time":
        return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900";
      case "At Risk":
        return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900";
      case "Overdue":
        return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900";
      default:
        return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900";
      case "Medium":
        return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900";
      case "Low":
        return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900";
      default:
        return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900";
    }
  };

  const filteredData = slaData.filter(item => {
    const typeMatch = filterType === "All" || item.type === filterType;
    const statusMatch = filterStatus === "All" || item.status === filterStatus;
    return typeMatch && statusMatch;
  });

  const stats = {
    total: slaData.length,
    onTime: slaData.filter(item => item.slaStatus === "On Time").length,
    atRisk: slaData.filter(item => item.slaStatus === "At Risk").length,
    overdue: slaData.filter(item => item.slaStatus === "Overdue").length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading SLA data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Monitoring SLA CR/JR
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor Service Level Agreement untuk Change Request dan Job Request
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Tickets</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <InfoIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">On Time</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.onTime}</p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">At Risk</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.atRisk}</p>
              </div>
              <AlertIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Overdue</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</p>
              </div>
              <AlertIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as "All" | "CR" | "JR")}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="All">All Types</option>
                <option value="CR">Change Request</option>
                <option value="JR">Job Request</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="All">All Status</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* SLA Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Assignee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    SLA Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Remaining Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.type === "CR" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                        }`}>
                          {item.type}
                        </span>
                        <span className="ml-2 text-sm text-gray-900 dark:text-white">{item.ticketNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">{item.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">{item.status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">{item.assignee}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">{item.dueDate}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSLAStatusColor(item.slaStatus)}`}>
                        {item.slaStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">{item.remainingTime}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringSLAPage;