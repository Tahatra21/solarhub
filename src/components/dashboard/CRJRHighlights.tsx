"use client";

import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  Users,
  Calendar,
  BarChart3,
  Zap,
  Target
} from 'lucide-react';

interface CRJRStats {
  total: number;
  cr: number;
  jr: number;
  sr: number;
  completed: number;
  in_progress: number;
  planned: number;
  cancelled: number;
  monthly_averages: {
    january: number;
    february: number;
    march: number;
    april: number;
    may: number;
    june: number;
    july: number;
    august: number;
    september: number;
    october: number;
    november: number;
    december: number;
  };
  monthly_data: Array<{
    month: string;
    total: number;
    cr: number;
    jr: number;
    sr: number;
  }>;
}

interface CRJRHighlight {
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

const CRJRHighlights: React.FC = () => {
  const [stats, setStats] = useState<CRJRStats>({
    total: 0,
    cr: 0,
    jr: 0,
    sr: 0,
    completed: 0,
    in_progress: 0,
    planned: 0,
    cancelled: 0,
    monthly_averages: {
      january: 0,
      february: 0,
      march: 0,
      april: 0,
      may: 0,
      june: 0,
      july: 0,
      august: 0,
      september: 0,
      october: 0,
      november: 0,
      december: 0
    },
    monthly_data: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCRJRStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/monitoring/cr-jr/stats');
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
      } else {
        // Fallback to mock data if API fails
        setStats({
          total: 156,
          cr: 89,
          jr: 67,
          sr: 0,
          completed: 98,
          in_progress: 42,
          planned: 16,
          cancelled: 0,
          monthly_averages: {
            january: 0.85,
            february: 0.78,
            march: 0.92,
            april: 0.88,
            may: 0.91,
            june: 0.87,
            july: 0.89,
            august: 0.93,
            september: 0.86,
            october: 0.90,
            november: 0.88,
            december: 0.94
          },
          monthly_data: []
        });
      }
    } catch (err) {
      console.error('Error fetching CR/JR stats:', err);
      // Use mock data as fallback
      setStats({
        total: 156,
        cr: 89,
        jr: 67,
        sr: 0,
        completed: 98,
        in_progress: 42,
        planned: 16,
        cancelled: 0,
        monthly_averages: {
          january: 0.85,
          february: 0.78,
          march: 0.92,
          april: 0.88,
          may: 0.91,
          june: 0.87,
          july: 0.89,
          august: 0.93,
          september: 0.86,
          october: 0.90,
          november: 0.88,
          december: 0.94
        },
        monthly_data: []
      });
      setError('Menggunakan data simulasi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCRJRStats();
  }, []);

  const highlights: CRJRHighlight[] = [
    {
      id: 'total-requests',
      title: 'Total CR/JR',
      value: stats.total,
      subtitle: 'Semua permintaan terdaftar',
      icon: <GitBranch className="w-6 h-6" />,
      color: 'text-sky-500',
      bgGradient: 'bg-gradient-to-br from-sky-50/60 to-sky-100/40 dark:from-sky-900/20 dark:to-sky-800/20',
      trend: {
        value: 12.5,
        isPositive: true
      }
    },
    {
      id: 'change-requests',
      title: 'Change Request',
      value: stats.cr,
      subtitle: `${((stats.cr / stats.total) * 100).toFixed(1)}% dari total`,
      icon: <Zap className="w-6 h-6" />,
      color: 'text-coral-500',
      bgGradient: 'bg-gradient-to-br from-orange-50/50 to-peach-50/40 dark:from-orange-900/20 dark:to-orange-800/20',
      trend: {
        value: 8.3,
        isPositive: true
      }
    },
    {
      id: 'job-requests',
      title: 'Job Request',
      value: stats.jr,
      subtitle: `${((stats.jr / stats.total) * 100).toFixed(1)}% dari total`,
      icon: <Target className="w-6 h-6" />,
      color: 'text-emerald-500',
      bgGradient: 'bg-gradient-to-br from-emerald-50/50 to-mint-50/40 dark:from-emerald-900/20 dark:to-emerald-800/20',
      trend: {
        value: 15.7,
        isPositive: true
      }
    },
    {
      id: 'in-progress',
      title: 'Sedang Dikerjakan',
      value: stats.in_progress,
      subtitle: 'Dalam proses pengembangan',
      icon: <Clock className="w-6 h-6" />,
      color: 'text-amber-500',
      bgGradient: 'bg-gradient-to-br from-warm-honey/50 to-warm-apricot/40 dark:from-warm-honey/20 dark:to-warm-apricot/20',
      trend: {
        value: 5.2,
        isPositive: false
      }
    },
    {
      id: 'completed',
      title: 'Selesai',
      value: stats.completed,
      subtitle: `${((stats.completed / stats.total) * 100).toFixed(1)}% completion rate`,
      icon: <CheckCircle2 className="w-6 h-6" />,
      color: 'text-green-500',
      bgGradient: 'bg-gradient-to-br from-vibrant-mint/50 to-dreamy-mint/40 dark:from-vibrant-mint/20 dark:to-dreamy-mint/20',
      trend: {
        value: 18.9,
        isPositive: true
      }
    },
    {
      id: 'service-requests',
      title: 'Service Request',
      value: stats.sr,
      subtitle: `${((stats.sr / stats.total) * 100).toFixed(1)}% dari total`,
      icon: <AlertCircle className="w-6 h-6" />,
      color: 'text-blue-500',
      bgGradient: 'bg-gradient-to-br from-blue-50/50 to-indigo-50/40 dark:from-blue-900/20 dark:to-indigo-800/20',
      trend: {
        value: 3.2,
        isPositive: true
      }
    },
    {
      id: 'avg-sla',
      title: 'Rata-rata SLA',
      value: `${(stats.monthly_averages.december * 100).toFixed(1)}%`,
      subtitle: 'SLA bulan terakhir',
      icon: <BarChart3 className="w-6 h-6" />,
      color: 'text-purple-500',
      bgGradient: 'bg-gradient-to-br from-soft-mauve/50 to-pastel-lavender/40 dark:from-soft-mauve/20 dark:to-pastel-lavender/20',
      trend: {
        value: 7.4,
        isPositive: true
      }
    },
    {
      id: 'planned',
      title: 'Terencana',
      value: stats.planned,
      subtitle: 'Menunggu persetujuan',
      icon: <Users className="w-6 h-6" />,
      color: 'text-indigo-600',
      bgGradient: 'bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20'
    },
    {
      id: 'cancelled',
      title: 'Dibatalkan',
      value: stats.cancelled,
      subtitle: 'CR/JR yang dibatalkan',
      icon: <Calendar className="w-6 h-6" />,
      color: 'text-red-600',
      bgGradient: 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20',
      trend: {
        value: 2.1,
        isPositive: false
      }
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(9)].map((_, index) => (
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
      {/* Header Section */}
      {error && (
        <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full mb-4 text-center">
          {error}
        </div>
      )}

      {/* Key Performance Indicators */}
      <div className="text-center sm:text-left mb-4">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1">
          Performance Overview
        </h3>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Completion Rate: <span className="font-semibold text-green-600 dark:text-green-400">{((stats.completed / stats.total) * 100).toFixed(1)}%</span> | 
          Avg. SLA: <span className="font-bold">{(stats.monthly_averages.december * 100).toFixed(1)}%</span>
        </p>
      </div>

      {/* Main Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-2 sm:mb-3">
        {highlights.map((highlight) => {
          const getIconColor = (id: string) => {
            switch(id) {
              case 'total-requests': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
              case 'change-requests': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
              case 'job-requests': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
              case 'in-progress': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
              case 'completed': return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30';
              case 'overdue': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
              case 'avg-completion': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30';
              case 'high-priority': return 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30';
              case 'this-month': return 'text-teal-600 bg-teal-100 dark:bg-teal-900/30';
              default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
            }
          };
          
          return (
            <div
              key={highlight.id}
              className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 hover:border-blue-300/60 dark:hover:border-blue-600/60"
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl shadow-sm transition-all duration-300 group-hover:scale-110 ${getIconColor(highlight.id)}`}>
                    <div className="w-4 h-4 sm:w-6 sm:h-6 flex items-center justify-center">
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

export default CRJRHighlights;