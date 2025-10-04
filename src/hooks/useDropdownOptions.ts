import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

interface DropdownOption {
  id: number;
  kategori?: string;
  segmen?: string;
  stage?: string;
}

interface LoadingState {
  kategori: boolean;
  segmen: boolean;
  stage: boolean;
}

export const useDropdownOptions = () => {
  const [kategoriOptions, setKategoriOptions] = useState<DropdownOption[]>([]);
  const [segmenOptions, setSegmenOptions] = useState<DropdownOption[]>([]);
  const [stageOptions, setStageOptions] = useState<DropdownOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState<LoadingState>({
    kategori: false,
    segmen: false,
    stage: false
  });

  const fetchDropdownOptions = async () => {
    setLoadingOptions({ kategori: true, segmen: true, stage: true });
    
    try {
      console.log('Fetching dropdown options...');
      
      const [kategoriRes, segmenRes, stageRes] = await Promise.all([
        fetch('/api/produk/kategoris/get'),
        fetch('/api/produk/segmens/get'),
        fetch('/api/produk/stages/get')
      ]);

      console.log('API Response Status:', {
        kategori: kategoriRes.status,
        segmen: segmenRes.status,
        stage: stageRes.status
      });

      if (kategoriRes.ok) {
        const kategoriData = await kategoriRes.json();
        console.log('Kategori data:', kategoriData);
        setKategoriOptions(kategoriData.data || []);
      } else {
        console.error('Kategori API failed:', await kategoriRes.text());
      }

      if (segmenRes.ok) {
        const segmenData = await segmenRes.json();
        console.log('Segmen data:', segmenData);
        setSegmenOptions(segmenData.data || []);
      } else {
        console.error('Segmen API failed:', await segmenRes.text());
      }

      if (stageRes.ok) {
        const stageData = await stageRes.json();
        console.log('Stage data:', stageData);
        setStageOptions(stageData.data || []);
      } else {
        console.error('Stage API failed:', await stageRes.text());
      }
    } catch (error) {
      console.error('Error fetching dropdown options:', error);
      Swal.fire("Gagal", "Gagal memuat opsi dropdown", "error");
    } finally {
      setLoadingOptions({ kategori: false, segmen: false, stage: false });
    }
  };

  useEffect(() => {
    fetchDropdownOptions();
  }, []);

  return {
    kategoriOptions,
    segmenOptions,
    stageOptions,
    loadingOptions
  };
};