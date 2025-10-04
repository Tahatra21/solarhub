import React, { useState, useEffect } from 'react';
import { 
  RefreshCw,
  AlertCircle,
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Users,
  FileText,
  Clock,
  CheckCircle,
  Zap,
  Shield,
  ArrowRight,
  Plus,
  Eye
} from 'lucide-react';
import Image from 'next/image';
import { useNavigateWithLoading } from '@/hooks/useNavigateWithLoading';
import LicenseHighlights from './LicenseHighlights';
import CRJRHighlights from './CRJRHighlights';
import MonitoringRunInsights from './MonitoringRunInsights';
import ProductLifecycleSummary from '@/components/dashboard/ProductLifecycleSummary';
import DashboardNavigation from '@/components/dashboard/DashboardNavigation';

interface StageData {
  id: number;
  stage: string;
  count: number;
  icon_light?: string;
  icon_dark?: string;
}

interface DashboardStats {
  total: number;
  stages: StageData[];
}


const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    stages: []
  });
  // State untuk data sederhana
  const [crjrTotal, setCrjrTotal] = useState(0);
  const [licenseTotal, setLicenseTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { navigateTo } = useNavigateWithLoading();

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch dashboard stats dan data sederhana
      const [statsResponse, crjrResponse, licenseResponse] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/dashboard/crjr-stats'),
        fetch('/api/dashboard/license-stats')
      ]);
      
      // Process dashboard stats
      const statsResult = await statsResponse.json();
      if (statsResult.success) {
        setStats({
          total: statsResult.data.stats.total,
          stages: statsResult.data.stages
        });
      }
      
      // Process CR/JR total only
      const crjrResult = await crjrResponse.json();
      console.log('🔍 CR/JR API Response:', crjrResult);
      if (crjrResult.success) {
        console.log('✅ Setting CR/JR total:', crjrResult.data.total);
        setCrjrTotal(crjrResult.data.total || 0);
      }
      
      // Process license total only
      const licenseResult = await licenseResponse.json();
      console.log('🔍 License API Response:', licenseResult);
      if (licenseResult.success) {
        console.log('✅ Setting License total:', licenseResult.data.total);
        setLicenseTotal(licenseResult.data.total || 0);
      }
      
    } catch (err) {
      console.error('❌ Error fetching dashboard stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      // Set default values on error
      setStats({ total: 0, stages: [] });
      setCrjrTotal(0);
      setLicenseTotal(0);
    } finally {
      setLoading(false);
    }
  }; 

  // Tambahkan function untuk handle stage click
  const handleStageClick = (id: number) => {
    const stageSlug = id;
    console.log(stageSlug)
    navigateTo(`/admin/dashboard/${stageSlug}`);
  };
  
  const handleTotalProductsClick = () => {
    navigateTo('/admin/dashboard/all');
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const handleRetry = () => {
    fetchDashboardStats();
  };

  // Warna pastel corporate yang harmonis dan modern
  const getStageColors = (index: number) => {
    const colors = [
      {
        // Soft Coral - Introduction Stage
        bg: 'bg-gradient-to-br from-[#FFF5F5] via-[#FED7D7] to-[#FBB6CE]',
        darkBg: 'dark:from-[#2D1B1B] dark:via-[#3C1F1F] dark:to-[#4A2C2A]',
        text: 'text-rose-700 dark:text-rose-300',
        accent: 'bg-rose-100 dark:bg-rose-900/30'
      },
      {
        // Soft Mint - Growth Stage  
        bg: 'bg-gradient-to-br from-[#F0FDF4] via-[#DCFCE7] to-[#BBF7D0]',
        darkBg: 'dark:from-[#1B2E1F] dark:via-[#1F3A24] dark:to-[#22543D]',
        text: 'text-emerald-700 dark:text-emerald-300',
        accent: 'bg-emerald-100 dark:bg-emerald-900/30'
      },
      {
        // Soft Lavender - Maturity Stage
        bg: 'bg-gradient-to-br from-[#F8FAFC] via-[#E2E8F0] to-[#CBD5E1]',
        darkBg: 'dark:from-[#1E293B] dark:via-[#334155] dark:to-[#475569]',
        text: 'text-slate-700 dark:text-slate-300',
        accent: 'bg-slate-100 dark:bg-slate-900/30'
      },
      {
        // Soft Peach - Decline Stage
        bg: 'bg-gradient-to-br from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A]',
        darkBg: 'dark:from-[#2A2817] dark:via-[#3F3B1F] dark:to-[#4D4016]',
        text: 'text-amber-700 dark:text-amber-300',
        accent: 'bg-amber-100 dark:bg-amber-900/30'
      }
    ];
    return colors[index % colors.length];
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-cream-soft/30 via-light-ivory/25 to-warm-pearl/20 dark:from-muted-slate dark:via-muted-blue-gray/30 dark:to-muted-periwinkle/20">
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
        {/* Header Skeleton */}
          <div className="bg-neutral-cream-soft/80 dark:bg-muted-slate/80 backdrop-blur-sm rounded-3xl shadow-sm border border-neutral-beige-light/60 dark:border-muted-periwinkle/60 p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="w-16 h-16 bg-soft-cream dark:bg-muted-taupe rounded-2xl animate-pulse"></div>
                <div className="space-y-3">
                  <div className="h-8 bg-soft-cream dark:bg-muted-taupe rounded w-80 animate-pulse"></div>
                  <div className="h-5 bg-soft-cream dark:bg-muted-taupe rounded w-64 animate-pulse"></div>
                </div>
              </div>
              <div className="h-12 bg-soft-cream dark:bg-muted-taupe rounded-2xl w-32 animate-pulse"></div>
            </div>
          </div>
        
          {/* Stage Cards Skeleton - Improved */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, index) => {
              // Simulasi warna pastel corporate untuk setiap card dengan Extended Palette
              const colors = [
                'bg-gradient-to-b from-warm-apricot to-coral-peach dark:from-muted-terracotta/40 dark:to-coral-medium/40',
                'bg-gradient-to-b from-dreamy-mint to-soft-green dark:from-vibrant-mint/40 dark:to-pastel-mint/40', 
                'bg-gradient-to-b from-cool-sky to-cool-powder dark:from-pastel-blue/40 dark:to-dreamy-blue/40',
                'bg-gradient-to-b from-soft-rose to-warm-coral dark:from-pastel-coral/40 dark:to-coral-soft/40'
              ];
              
              return (
                <div key={`skeleton-${index}`} className={`rounded-2xl p-6 shadow-sm animate-pulse bg-slate-100 dark:bg-slate-700/30 h-32 border border-slate-200 dark:border-slate-600`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 rounded-xl bg-slate-200 dark:bg-slate-600">
                      <div className="w-5 h-5 bg-slate-300 dark:bg-slate-500 rounded"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-8 bg-slate-200 dark:bg-slate-600 rounded w-12"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-20"></div>
                  </div>
                </div>
              );
            })}
          </div>
        
          {/* Total Products Skeleton - Improved */}
          <div className="bg-slate-100 dark:bg-slate-700/30 rounded-2xl p-8 shadow-sm animate-pulse border border-slate-200 dark:border-slate-600">
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <div className="h-10 bg-slate-200 dark:bg-slate-600 rounded w-16"></div>
                <div className="h-5 bg-slate-200 dark:bg-slate-600 rounded w-32"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-24"></div>
              </div>
              <div className="p-4 bg-slate-200 dark:bg-slate-600 rounded-2xl">
                <div className="w-12 h-12 bg-slate-300 dark:bg-slate-500 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-stone-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-rose-800 dark:text-rose-200 mb-3">
              Failed to Load Dashboard Data
            </h4>
            <p className="text-sm text-rose-600 dark:text-rose-300 mb-6">{error}</p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors shadow-sm"
            >
              <RefreshCw className="w-5 h-5 mr-3" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
              <p className="text-gray-600">Welcome back! Here's what's happening with your products today.</p>
            </div>
            <button
              onClick={handleRetry}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Products */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            
            {/* Simple description */}
            <div className="text-sm text-gray-600">
              Total products in the system across all segments
            </div>
            
            <button 
              onClick={handleTotalProductsClick}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 flex items-center"
            >
              View all products <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>


          {/* Total CR/JR */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Total CR/JR</p>
                <p className="text-2xl font-bold text-gray-900">{crjrTotal}</p>
                <p className="text-xs text-gray-400">Debug: {crjrTotal}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Zap className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            
            {/* Simple description */}
            <div className="text-sm text-gray-600">
              Total Change Requests and Job Requests in the system
            </div>
            
            <button 
              onClick={() => navigateTo('/admin/cusol-hub/monitoring-crjr')}
              className="mt-4 text-sm text-orange-600 hover:text-orange-700 flex items-center"
            >
              View CR/JR <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          {/* Total License */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Total License</p>
                <p className="text-2xl font-bold text-gray-900">{licenseTotal}</p>
                <p className="text-xs text-gray-400">Debug: {licenseTotal}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            
            {/* Simple description */}
            <div className="text-sm text-gray-600">
              Total software licenses managed in the system
            </div>
            
            <button 
              onClick={() => navigateTo('/admin/cusol-hub/monitoring-license')}
              className="mt-4 text-sm text-purple-600 hover:text-purple-700 flex items-center"
            >
              View licenses <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>

        {/* Product Lifecycle Summary - Full Width */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Product Lifecycle Summary</h3>
                <p className="text-sm text-gray-600">Overview of products across different stages</p>
              </div>
              <button 
                onClick={() => navigateTo('/admin/product')}
                className="inline-flex items-center px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Product
              </button>
            </div>
          </div>
          <div className="p-6">
            <ProductLifecycleSummary
              stats={stats}
              onStageClick={handleStageClick}
              onTotalProductsClick={handleTotalProductsClick}
              onNavigateToLifecycle={() => navigateTo('/admin/lifecycle')}
              onNavigateToProducts={() => navigateTo('/admin/products')}
            />
          </div>
        </div>

        {/* Monitoring Run Insights */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Monitoring Run Insights</h3>
                <p className="text-sm text-gray-600">Program insights & performance</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <MonitoringRunInsights />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;