"use client";

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Calendar,
  DollarSign,
  Activity
} from 'lucide-react';

interface LicenseStats {
  total: number;
  active: number;
  expiring: number;
  expired: number;
  perpetual: number;
  totalValue: number;
  avgDaysToExpiry: number;
  criticalLicenses: number;
}

interface LicenseHighlight {
  id: string;
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const LicenseHighlights: React.FC = () => {
  const [stats, setStats] = useState<LicenseStats>({
    total: 0,
    active: 0,
    expiring: 0,
    expired: 0,
    perpetual: 0,
    totalValue: 0,
    avgDaysToExpiry: 0,
    criticalLicenses: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLicenseStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/monitoring-license/stats');
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
      } else {
        // Fallback to mock data if API fails
        setStats({
          total: 24,
          active: 18,
          expiring: 4,
          expired: 2,
          perpetual: 12,
          totalValue: 2450000000,
          avgDaysToExpiry: 127,
          criticalLicenses: 6
        });
      }
    } catch (err) {
      console.error('Error fetching license stats:', err);
      // Use mock data as fallback
      setStats({
        total: 24,
        active: 18,
        expiring: 4,
        expired: 2,
        perpetual: 12,
        totalValue: 2450000000,
        avgDaysToExpiry: 127,
        criticalLicenses: 6
      });
      setError('Menggunakan data simulasi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenseStats();
  }, []);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const highlights: LicenseHighlight[] = [
    {
      id: 'total-licenses',
      title: 'Total Lisensi',
      value: stats.total,
      subtitle: 'Semua lisensi terdaftar',
      icon: <Shield className="w-6 h-6" />,
      color: 'text-blue-600',
      bgGradient: 'bg-gradient-to-br from-cool-sky/50 to-pastel-blue/50 dark:from-cool-sky/20 dark:to-pastel-blue/20',
      trend: {
        value: 8.2,
        isPositive: true
      }
    },
    {
      id: 'active-licenses',
      title: 'Lisensi Aktif',
      value: stats.active,
      subtitle: `${((stats.active / stats.total) * 100).toFixed(1)}% dari total`,
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'text-green-600',
      bgGradient: 'bg-gradient-to-br from-vibrant-mint/50 to-dreamy-mint/50 dark:from-vibrant-mint/20 dark:to-dreamy-mint/20',
      trend: {
        value: 5.4,
        isPositive: true
      }
    },
    {
      id: 'expiring-soon',
      title: 'Akan Berakhir',
      value: stats.expiring,
      subtitle: 'Dalam 30 hari ke depan',
      icon: <Clock className="w-6 h-6" />,
      color: 'text-amber-600',
      bgGradient: 'bg-gradient-to-br from-warm-honey/50 to-warm-apricot/50 dark:from-warm-honey/20 dark:to-warm-apricot/20',
      trend: {
        value: 12.3,
        isPositive: false
      }
    },
    {
      id: 'expired-licenses',
      title: 'Sudah Berakhir',
      value: stats.expired,
      subtitle: 'Perlu perpanjangan segera',
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'text-red-600',
      bgGradient: 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20',
      trend: {
        value: 25.0,
        isPositive: false
      }
    },
    {
      id: 'total-value',
      title: 'Nilai Total Investasi',
      value: formatCurrency(stats.totalValue),
      subtitle: 'Investasi lisensi keseluruhan',
      icon: <DollarSign className="w-6 h-6" />,
      color: 'text-purple-600',
      bgGradient: 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20',
      trend: {
        value: 15.7,
        isPositive: true
      }
    },
    {
      id: 'avg-expiry',
      title: 'Rata-rata Hari Tersisa',
      value: stats.avgDaysToExpiry,
      subtitle: 'Hari hingga berakhir',
      icon: <Calendar className="w-6 h-6" />,
      color: 'text-indigo-600',
      bgGradient: 'bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20'
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gray-200 dark:bg-gray-700">
                <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
              </div>
              <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="w-20 h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-purple-900/30 rounded-2xl sm:rounded-3xl shadow-lg border-2 border-blue-200 dark:border-blue-700 p-4 sm:p-6 lg:p-8">
      {/* Header Section with Error Display */}
      {error && (
        <div className="mb-4">
          <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full inline-block">
            {error}
          </div>
        </div>
      )}

      {/* Key Performance Indicators */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="text-center sm:text-left">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1">
                License Health Overview
              </h3>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                <span>Active Rate: <span className="font-semibold text-green-600 dark:text-green-400">{((stats.active / stats.total) * 100).toFixed(1)}%</span></span>
                <span className="hidden sm:inline">•</span>
                <span>Investment: <span className="font-bold text-purple-600 dark:text-purple-400">{formatCurrency(stats.totalValue)}</span></span>
                <span className="hidden sm:inline">•</span>
                <span>Avg. Expiry: <span className="font-bold">{stats.avgDaysToExpiry} hari</span></span>
              </div>
            </div>
          </div>
        </div>

      {/* Main Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-2 sm:mb-3">
        {highlights.map((highlight) => {
          const getIconColor = (id: string) => {
            switch(id) {
              case 'total-licenses': return 'bg-gradient-to-br from-blue-500 to-blue-600';
              case 'active-licenses': return 'bg-gradient-to-br from-green-500 to-emerald-600';
              case 'expiring-soon': return 'bg-gradient-to-br from-amber-500 to-orange-600';
              case 'expired-licenses': return 'bg-gradient-to-br from-red-500 to-red-600';
              case 'total-value': return 'bg-gradient-to-br from-purple-500 to-purple-600';
              case 'avg-expiry': return 'bg-gradient-to-br from-indigo-500 to-indigo-600';
              default: return 'bg-gradient-to-br from-gray-500 to-gray-600';
            }
          };
          
          const getStatusColor = (id: string) => {
            switch(id) {
              case 'expired-licenses': return 'border-red-300 dark:border-red-600 hover:border-red-400 dark:hover:border-red-500';
              case 'expiring-soon': return 'border-amber-300 dark:border-amber-600 hover:border-amber-400 dark:hover:border-amber-500';
              case 'active-licenses': return 'border-green-300 dark:border-green-600 hover:border-green-400 dark:hover:border-green-500';
              default: return 'border-blue-300 dark:border-blue-600 hover:border-blue-400 dark:hover:border-blue-500';
            }
          };
          
          return (
            <div
              key={highlight.id}
              className={`group bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-sm border p-4 sm:p-6 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 ${getStatusColor(highlight.id)}`}
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl shadow-lg transition-all duration-300 group-hover:scale-110 ${getIconColor(highlight.id)}`}>
                    <div className="text-white w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
                      {highlight.icon}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {highlight.trend && (
                    <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                      highlight.trend.isPositive ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                    }`}>
                      <div className="flex items-center space-x-1">
                        <TrendingUp className={`w-3 h-3 ${
                          highlight.trend.isPositive ? '' : 'rotate-180'
                        }`} />
                        <span>{highlight.trend.value}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {highlight.title}
              </h3>
              
              <div className="flex items-baseline space-x-1 sm:space-x-2 mb-2 sm:mb-3">
                <span className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {highlight.value}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {highlight.subtitle}
                </p>
                <div className="w-6 sm:w-8 h-1 rounded-full bg-gradient-to-r from-blue-400 to-purple-400"></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LicenseHighlights;