import { useState, useMemo } from 'react';

interface UsePaginationProps<T> {
  data: T[];
  itemsPerPage?: number;
}

export const usePagination = <T>({ data, itemsPerPage = 10 }: UsePaginationProps<T>) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [currentItemsPerPage, setCurrentItemsPerPage] = useState(itemsPerPage);

  const totalPages = Math.ceil(data.length / currentItemsPerPage);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * currentItemsPerPage;
    const endIndex = startIndex + currentItemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, currentItemsPerPage]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const resetPage = () => {
    setCurrentPage(1);
  };

  const changeItemsPerPage = (newItemsPerPage: number) => {
    setCurrentItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset ke halaman pertama
  };

  return {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    goToPrevPage,
    goToNextPage,
    resetPage,
    itemsPerPage: currentItemsPerPage,
    changeItemsPerPage
  };
};