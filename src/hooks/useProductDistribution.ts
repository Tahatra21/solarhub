import { useState, useEffect } from 'react';

interface StageData {
  id: string;
  stage: string;
  icon_light: string;
  icon_dark: string;
  count: number;
}

interface DashboardStats {
  introduction: number;
  growth: number;
  maturity: number;
  decline: number;
  total: number;
}

interface DashboardResponse {
  stats: DashboardStats;
  stages: StageData[];
}

interface Product {
  id: number;
  name: string;
  stage: string;
  segment: string;
  category: string; // Tambahkan field kategori
  created_at: string;
}

interface ProductModalData {
  stage: string;
  products: Product[];
}

export const useProductDistribution = () => {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalData, setModalData] = useState<ProductModalData | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [chartClickLoading, setChartClickLoading] = useState(false); // Tambahkan loading state untuk klik chart

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/stats');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      if (!text) {
        throw new Error('Empty response from server');
      }
      
      const result = JSON.parse(text);
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.message || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error occurred');
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsByStage = async (stageId: string) => {
    const abortController = new AbortController();
    setChartClickLoading(true); // Set loading saat chart diklik
    setModalLoading(true);
    try {
      const response = await fetch(`/api/dashboard/by-stage?id=${stageId}`, {
        signal: abortController.signal
      });
      
      if (abortController.signal.aborted) {
        return;
      }
      
      const result = await response.json();
      
      if (result.success) {
        setModalData({
          stage: result.stage,
          products: result.products
        });
      } else {
        console.error('Failed to fetch products:', result.error);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Request was cancelled
      }
      console.error('Error fetching products:', error);
    } finally {
      if (!abortController.signal.aborted) {
        setModalLoading(false);
        setChartClickLoading(false); // Reset loading setelah selesai
      }
    }
  };

  const closeModal = () => {
    setModalData(null);
  };

  useEffect(() => {
    const abortController = new AbortController();
    
    const fetchWithAbort = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/dashboard/stats', {
          signal: abortController.signal
        });
        
        if (abortController.signal.aborted) {
          return;
        }
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        if (!text) {
          throw new Error('Empty response from server');
        }
        
        const result = JSON.parse(text);
        
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.message || 'Failed to fetch data');
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return; // Request was cancelled, don't update state
        }
        setError(err instanceof Error ? err.message : 'Network error occurred');
        console.error('Error fetching dashboard stats:', err);
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };
    
    fetchWithAbort();
    
    return () => {
      abortController.abort();
    };
  }, []);

  return {
    data,
    loading,
    error,
    modalData,
    modalLoading,
    chartClickLoading, // Export loading state untuk chart click
    fetchProductsByStage,
    closeModal,
    refetch: fetchData
  };
};