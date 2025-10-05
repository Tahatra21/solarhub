"use client";

import React from 'react';
import { Settings, Database, Shield, Bell, Users, FileText } from 'lucide-react';

const SystemSettingsPage = () => {
  const settingsCategories = [
    {
      title: "Database Configuration",
      description: "Manage database connections and settings",
      icon: Database,
      color: "bg-blue-500",
      items: [
        "Connection Settings",
        "Backup Configuration", 
        "Performance Tuning",
        "Security Policies"
      ]
    },
    {
      title: "Security Settings",
      description: "Configure security policies and access controls",
      icon: Shield,
      color: "bg-red-500",
      items: [
        "Password Policies",
        "Session Management",
        "Access Control Lists",
        "Security Headers"
      ]
    },
    {
      title: "Notification Settings",
      description: "Manage system notifications and alerts",
      icon: Bell,
      color: "bg-yellow-500",
      items: [
        "Email Notifications",
        "System Alerts",
        "License Expiry Warnings",
        "User Activity Logs"
      ]
    },
    {
      title: "User Management",
      description: "Configure user-related settings",
      icon: Users,
      color: "bg-green-500",
      items: [
        "Default Roles",
        "User Registration",
        "Account Policies",
        "Profile Settings"
      ]
    },
    {
      title: "System Information",
      description: "View system status and information",
      icon: FileText,
      color: "bg-purple-500",
      items: [
        "System Version",
        "Database Status",
        "Performance Metrics",
        "Log Files"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Settings className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                System Settings
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Configure system-wide settings and preferences
              </p>
            </div>
          </div>
        </div>

        {/* Settings Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingsCategories.map((category, index) => {
            const IconComponent = category.icon;
            return (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center mb-4">
                  <div className={`p-3 rounded-lg ${category.color} mr-4`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {category.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {category.description}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {category.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <div className="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                      {item}
                    </div>
                  ))}
                </div>
                
                <button className="w-full mt-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors">
                  Configure
                </button>
              </div>
            );
          })}
        </div>

        {/* System Status */}
        <div className="mt-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            System Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                  Online
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  System Status
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  99.9%
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Uptime
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                  2.1s
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Response Time
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
                  15
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Active Users
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettingsPage;
