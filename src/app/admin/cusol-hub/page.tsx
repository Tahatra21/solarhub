"use client";

import React from "react";
import { BoxCubeIcon } from "@/icons";

const CusolHubPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <BoxCubeIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Cusol HUB
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Pusat manajemen dan integrasi sistem Cusol
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Dashboard Cusol
              </h3>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Akses ke dashboard utama sistem Cusol untuk monitoring dan analisis.
            </p>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
              Buka Dashboard
            </button>
          </div>

          {/* Card 2 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Integrasi API
              </h3>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Kelola integrasi API dan konfigurasi koneksi dengan sistem eksternal.
            </p>
            <button className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
              Kelola API
            </button>
          </div>

          {/* Card 3 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Konfigurasi
              </h3>
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Pengaturan dan konfigurasi sistem Cusol HUB.
            </p>
            <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
              Pengaturan
            </button>
          </div>
        </div>

        {/* Statistics Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Statistik Sistem
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  24
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Sistem Aktif
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                  98.5%
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Uptime
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
                  156
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  API Calls/min
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                  12
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Integrasi Aktif
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CusolHubPage;