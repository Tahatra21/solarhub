import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Target,
  DollarSign,
  BarChart3,
  ArrowRight
} from 'lucide-react';
import { useNavigateWithLoading } from '@/hooks/useNavigateWithLoading';

interface MonitoringStats {
  totalPrograms: number;
  avgCompletion: number;
  totalRevenue: number;
  atRiskPrograms: number;
  onTrackPrograms: number;
  completedPrograms: number;
  laggingPrograms: number;
}

interface RecentProgram {
  id: number;
  task_name: string;
  percent_complete: number;
  overall_status: string;
  priority: string;
  pic_team_cusol: string;
}

const MonitoringRunInsights = () => {
  const { navigateTo } = useNavigateWithLoading();
  const [stats, setStats] = useState<MonitoringStats>({
    totalPrograms: 0,
    avgCompletion: 0,
    totalRevenue: 0,
    atRiskPrograms: 0,
    onTrackPrograms: 0,
    completedPrograms: 0,
    laggingPrograms: 0
  });
  const [recentPrograms, setRecentPrograms] = useState<RecentProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🚀 MonitoringRunInsights component mounted, fetching data...');
    fetchMonitoringInsights();
  }, []);

  const fetchMonitoringInsights = async () => {
    try {
      setLoading(true);
      
      // Fetch statistics
      const statsResponse = await fetch('/api/monitoring-run-program/statistics');
      if (statsResponse.ok) {
        const statsResult = await statsResponse.json();
        console.log('📊 Monitoring stats result:', statsResult);
        
        if (statsResult.success && statsResult.data) {
          const data = statsResult.data;
          
          // Process status data
          const statusCounts = {
            completed: 0,
            onTrack: 0,
            lagging: 0
          };
          
          data.byStatus?.forEach((status: any) => {
            const statusName = status.overall_status?.toLowerCase();
            if (statusName === 'completed') {
              statusCounts.completed = parseInt(status.count);
            } else if (statusName === 'on track') {
              statusCounts.onTrack = parseInt(status.count);
            } else if (statusName === 'lagging') {
              statusCounts.lagging = parseInt(status.count);
            }
          });
          
          // Calculate at risk programs (lagging + high priority)
          const atRiskPrograms = statusCounts.lagging;
          
          const newStats = {
            totalPrograms: data.total || 0,
            avgCompletion: parseFloat(data.avgCompletion) || 0,
            totalRevenue: data.totalRevenue || 0,
            atRiskPrograms: atRiskPrograms,
            onTrackPrograms: statusCounts.onTrack,
            completedPrograms: statusCounts.completed,
            laggingPrograms: statusCounts.lagging
          };
          
          console.log('📊 Setting stats:', newStats);
          setStats(newStats);
        }
      }

      // Fetch recent programs (top 5)
      const programsResponse = await fetch('/api/monitoring-run-program?page=1&limit=5');
      if (programsResponse.ok) {
        const programsData = await programsResponse.json();
        console.log('📋 Recent programs result:', programsData);
        setRecentPrograms(programsData.data || []);
      }
    } catch (error) {
      console.error('Error fetching monitoring insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-100';
      case 'ON TRACK': return 'text-blue-600 bg-blue-100';
      case 'LAGGING': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-red-600 bg-red-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'LOW': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Monitoring Run Inisiatif
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Program insights & performance
            </p>
          </div>
        </div>
        <button 
          onClick={fetchMonitoringInsights}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <TrendingUp className="w-4 h-4" />
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Programs */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                Total Programs
              </p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                {stats.totalPrograms || 0}
              </p>
            </div>
            <Target className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        {/* Average Completion */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
                Avg Progress
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
                {(stats.avgCompletion || 0).toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg p-4 border border-amber-200 dark:border-amber-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                Revenue Potential
              </p>
              <p className="text-lg font-bold text-amber-900 dark:text-amber-100 mt-1">
                {formatCurrency(stats.totalRevenue || 0)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-amber-500" />
          </div>
        </div>

        {/* At Risk Programs */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg p-4 border border-red-200 dark:border-red-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">
                At Risk
              </p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100 mt-1">
                {stats.atRiskPrograms || 0}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Status Distribution</h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{stats.completedPrograms || 0}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Clock className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">On Track</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{stats.onTrackPrograms || 0}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Lagging</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{stats.laggingPrograms || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Programs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Recent Programs</h4>
          <button 
            onClick={() => navigateTo('/admin/cusol-hub/monitoring-run-program')}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center space-x-1 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        
        <div className="space-y-3">
          {recentPrograms.length > 0 ? (
            recentPrograms.map((program) => (
              <div key={program.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {program.task_name}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(program.overall_status)}`}>
                      {program.overall_status}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(program.priority)}`}>
                      {program.priority}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-3 ml-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {program.percent_complete || 0}%
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {program.pic_team_cusol || 'N/A'}
                    </p>
                  </div>
                  <div className="w-12 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(program.percent_complete || 0, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No programs found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonitoringRunInsights;
