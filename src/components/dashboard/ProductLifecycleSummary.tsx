import React from 'react';
import { TrendingUp, ArrowRight, BarChart3, PieChart, Activity, Zap, Target, CheckCircle2, AlertCircle } from 'lucide-react';
import Image from 'next/image';

interface StageData {
  id: number;
  stage: string;
  count: number;
  icon_light?: string;
  icon_dark?: string;
}

interface ProductLifecycleSummaryProps {
  stats: {
    total: number;
    stages: StageData[];
  };
  onStageClick: (id: number) => void;
  onTotalProductsClick: () => void;
  onNavigateToLifecycle: () => void;
  onNavigateToProducts: () => void;
}

const ProductLifecycleSummary: React.FC<ProductLifecycleSummaryProps> = ({
  stats,
  onStageClick,
  onTotalProductsClick,
  onNavigateToLifecycle,
  onNavigateToProducts
}) => {
  // Warna yang sama dengan Product Catalog untuk konsistensi
  const getStageColors = (stageName: string) => {
    const colorMap: Record<string, any> = {
      'Introduction': {
        bg: 'bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20',
        text: 'text-blue-800 dark:text-blue-200',
        border: 'border-blue-300 dark:border-blue-700',
        accent: 'text-blue-600 dark:text-blue-400'
      },
      'Growth': {
        bg: 'bg-gradient-to-r from-emerald-100 to-emerald-200 dark:from-emerald-900/20 dark:to-emerald-800/20',
        text: 'text-emerald-800 dark:text-emerald-200',
        border: 'border-emerald-300 dark:border-emerald-700',
        accent: 'text-emerald-600 dark:text-emerald-400'
      },
      'Maturity': {
        bg: 'bg-gradient-to-r from-amber-100 to-amber-200 dark:from-amber-900/20 dark:to-amber-800/20',
        text: 'text-amber-800 dark:text-amber-200',
        border: 'border-amber-300 dark:border-amber-700',
        accent: 'text-amber-600 dark:text-amber-400'
      },
      'Decline': {
        bg: 'bg-gradient-to-r from-rose-100 to-rose-200 dark:from-rose-900/20 dark:to-rose-800/20',
        text: 'text-rose-800 dark:text-rose-200',
        border: 'border-rose-300 dark:border-rose-700',
        accent: 'text-rose-600 dark:text-rose-400'
      }
    };
    
    return colorMap[stageName] || {
      bg: 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-900/20 dark:to-gray-800/20',
      text: 'text-gray-800 dark:text-gray-200',
      border: 'border-gray-300 dark:border-gray-700',
      accent: 'text-gray-600 dark:text-gray-400'
    };
  };

  // Calculate percentage for each stage
  const getStagePercentage = (count: number) => {
    return stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : '0';
  };



  return (
    <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-900/30 dark:via-indigo-900/30 dark:to-blue-900/30 rounded-2xl sm:rounded-3xl shadow-lg border-2 border-purple-200 dark:border-purple-700 p-4 sm:p-6 lg:p-8">
      {/* Header Section */}
      <div className="text-center sm:text-left mb-4">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1">
          Product Lifecycle Summary
        </h3>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Total Products: <span className="font-semibold text-purple-600 dark:text-purple-400">{stats.total.toLocaleString()}</span> | 
          Active Stages: <span className="font-bold">4 tahap</span>
        </p>
      </div>

      {/* Main Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-2 sm:mb-3">
        {stats.stages.map((stage, index) => {
          const colors = getStageColors(stage.stage);
          const percentage = getStagePercentage(stage.count);
          
          const getIconGradient = (stageName: string) => {
            const gradients: Record<string, string> = {
              'Introduction': 'bg-gradient-to-br from-blue-500 to-blue-600',
              'Growth': 'bg-gradient-to-br from-emerald-500 to-emerald-600', 
              'Maturity': 'bg-gradient-to-br from-amber-500 to-amber-600',
              'Decline': 'bg-gradient-to-br from-rose-500 to-rose-600'
            };
            return gradients[stageName] || 'bg-gradient-to-br from-gray-500 to-gray-600';
          };
          
          return (
            <div
              key={stage.id}
              onClick={() => onStageClick(stage.id)}
              className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-sm border border-white/50 dark:border-gray-700/50 p-4 sm:p-6 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 hover:border-purple-300 dark:hover:border-purple-600"
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl shadow-lg transition-all duration-300 group-hover:scale-110 ${getIconGradient(stage.stage)}`}>
                    <div className="text-white w-4 h-4 sm:w-6 sm:h-6 flex items-center justify-center">
                      {stage.icon_light && stage.icon_dark ? (
                        <React.Fragment key={`icon-${stage.id}`}>
                          <Image
                            key={`light-${stage.id}`}
                            src={`/images/product/stage/${stage.icon_light}`}
                            alt={stage.stage}
                            width={20}
                            height={20}
                            className="block dark:hidden w-5 h-5"
                          />
                          <Image
                            key={`dark-${stage.id}`}
                            src={`/images/product/stage/${stage.icon_dark}`}
                            alt={stage.stage}
                            width={20}
                            height={20}
                            className="hidden dark:block w-5 h-5"
                          />
                        </React.Fragment>
                      ) : (
                        <div className="w-5 h-5 bg-white/20 rounded"></div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium px-2 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                    {percentage}%
                  </div>
                </div>
              </div>
              
              <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                {stage.stage}
              </h3>
              
              <div className="flex items-baseline space-x-1 sm:space-x-2 mb-2 sm:mb-3">
                <span className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  {stage.count}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  produk dalam tahap ini
                </p>
                <div className="w-6 sm:w-8 h-1 rounded-full bg-gradient-to-r from-purple-400 to-indigo-400"></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProductLifecycleSummary;