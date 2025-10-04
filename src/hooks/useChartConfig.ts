import { useState, useEffect } from 'react';
import { ChartEvent, ActiveElement } from 'chart.js';

interface UseChartConfigProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  onChartClick: (stageId: string) => void;
}

// Simple chart config hook for basic theme configuration
export const useBasicChartConfig = () => {
  const [isDark, setIsDark] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Since we're permanently on light theme, always set isDark to false
    setIsDark(false);
  }, []);

  // Return chart configuration for light theme only
  const chartConfig = {
    backgroundColor: '#ffffff',
    textColor: '#374151',
    gridColor: '#e5e7eb',
    // ... other light theme configurations
  };

  return { isDark: false, chartConfig, isClient };
};

// Advanced chart config hook for interactive charts
export const useChartConfig = ({ data, onChartClick }: UseChartConfigProps) => {
  // Since we're permanently on light theme, remove dynamic theme detection
  const isDark = false;

  const handleChartClick = (event: ChartEvent, elements: ActiveElement[]) => {
    if (elements.length > 0 && data?.stages) {
      const elementIndex = elements[0].index;
      const stageId = data.stages[elementIndex]?.id;
      if (stageId) {
        onChartClick(stageId);
      }
    }
  };

  // Always use light theme colors
  const defaultColors = ['#60A5FA', '#34D399', '#FBBF24', '#F87171'];

  const chartData = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    labels: data?.stages?.map((stage: any) => stage.stage) || [],
    datasets: [
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: data?.stages?.map((stage: any) => stage.count) || [],
        backgroundColor: defaultColors,
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverBorderWidth: 4,
        hoverBorderColor: '#D1D5DB',
        hoverBackgroundColor: defaultColors.map(color => color + 'DD') // Tambahkan transparansi saat hover
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: handleChartClick,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
          color: '#374151', // Always light theme color
          font: {
            size: 12,
            weight: '500'
          }
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#FFFFFF',
        titleColor: '#111827',
        bodyColor: '#374151',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: true,
        usePointStyle: true,
        pointStyle: 'circle',
        position: 'nearest' as const,
        intersect: true, // Ubah ke true untuk Doughnut chart
        mode: 'point' as const, // Ubah ke 'point' untuk Doughnut chart
        animation: {
          duration: 200
        },
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${label}: ${value} produk (${percentage}%)`;
          }
        }
      }
    },
    cutout: '60%',
    elements: {
      arc: {
        borderWidth: 2,
        hoverBorderWidth: 4,
        borderAlign: 'inner' as const
      }
    },
    interaction: {
      intersect: true, // Ubah ke true untuk deteksi hover yang lebih baik
      mode: 'point' as const // Ubah ke 'point' untuk Doughnut chart
    }
  };

  return {
    chartData,
    chartOptions,
    isDark: false // Always false since we're on permanent light theme
  };
};