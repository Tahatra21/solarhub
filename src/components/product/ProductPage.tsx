"use client"

import React, { useEffect, useRef } from 'react';
import { useProducts } from '../../hooks/useProducts';
import { useProductFilters } from '../../hooks/useProductFilters';
import { useProductModals } from '../../hooks/useProductModals';
import { useAttachments } from '../../hooks/useAttachments';
import ProductHeader from './ProductHeader';
import ProductFilters from './ProductFilters';
import ProductGrid from './ProductGrid';
import ProductPagination from './ProductPagination';
import AddProductModal from './AddProductModal';
import EditProductModal from './EditProductModal';
import AttachmentModal from './AttachmentModal';
import AddAttachmentModal from './AddAttachmentModal';
import ImportModal from './ImportModal';
import Swal from 'sweetalert2';

const ProductPage: React.FC = () => {
  const {
    products,
    loading,
    pagination,
    fetchProducts,
    deleteProduct
  } = useProducts();

  const {
    filters,
    kategoriOptions,
    segmenOptions,
    stageOptions,
    loadingOptions,
    fetchDropdownOptions,
    handleFilterChange,
    clearFilters
  } = useProductFilters();

  const {
    showAddModal,
    showEditModal,
    showViewAttachmentsModal,
    showAddAttachmentModal,
    showImportModal,
    selectedProduct,
    formLoading,
    setShowImportModal,
    setFormLoading,
    openAddModal,
    openEditModal,
    openViewAttachmentsModal,
    openAddAttachmentModal,  // Tambahkan ini
    closeAllModals
  } = useProductModals();

  const {
    selectedAttachments,
    fetchAttachments,
    handleSubmitAttachment,
    handleDeleteAttachment
  } = useAttachments();

  // PERBAIKAN: Gunakan ref untuk mencegah infinite loop
  const isInitialMount = useRef(true);
  const prevFilters = useRef(filters);

  // Load initial data
  useEffect(() => {
    fetchDropdownOptions();
  }, [fetchDropdownOptions]);

  // PERBAIKAN: Fetch products hanya saat filters berubah atau initial load
  useEffect(() => {
    if (isInitialMount.current) {
      fetchProducts(filters, 1);
      isInitialMount.current = false;
    } else {
      // Cek apakah filters benar-benar berubah
      const filtersChanged = JSON.stringify(prevFilters.current) !== JSON.stringify(filters);
      if (filtersChanged) {
        fetchProducts(filters, 1); // Reset ke halaman 1 saat filter berubah
        prevFilters.current = filters;
      }
    }
  }, [filters, fetchProducts]);

  // Handlers
  const handlePageChange = (page: number) => {
    fetchProducts(filters, page);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEdit = (product: any) => {
    openEditModal(product);
  };

  const handleDelete = async (id: number) => {
    const success = await deleteProduct(id);
    if (success) {
      fetchProducts(filters, pagination.currentPage);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleViewAttachments = (product: any) => {
    openViewAttachmentsModal(product);
    fetchAttachments(product.id);
  };

  const handleFormSuccess = () => {
    closeAllModals();
    fetchProducts(filters, pagination.currentPage);
  };

  const handleAddSubmit = async (formData: FormData) => {
    try {
      setFormLoading(true);
      const response = await fetch('/api/produk', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to add product');

      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Produk berhasil ditambahkan.',
        timer: 1500,
        showConfirmButton: false,
          customClass: {
            container: 'swal2-container-custom-z-index'
          }
      });

      handleFormSuccess();
    } catch (error) {
      console.error('Error adding product:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Gagal menambahkan produk',
        customClass: {
          container: 'swal2-container-custom-z-index'
        }
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSubmit = async (formData: FormData) => {
    if (!selectedProduct) return;

    try {
      setFormLoading(true);
      const response = await fetch(`/api/produk/${selectedProduct.id}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to update product');

      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Produk berhasil diperbarui.',
        timer: 1500,
        showConfirmButton: false,
        customClass: {
          container: 'swal2-container-custom-z-index'
        }
      });

      handleFormSuccess();
    } catch (error) {
      console.error('Error updating product:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Gagal memperbarui produk',
        customClass: {
          container: 'swal2-container-custom-z-index'
        }
      });
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Combined Header and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Header Section */}
        <div className="p-6 pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manajemen Produk</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Kelola semua produk dalam siklus hidup pengembangan. Total: {pagination.totalItems} produk
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Add Product Button */}
              <button
                onClick={openAddModal}
                className="group relative p-3 hover:bg-blue-100/60 dark:hover:bg-blue-900/20 border border-transparent hover:border-blue-300/60 dark:hover:border-blue-600/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:focus:ring-blue-400/40 transition-all duration-300 transform hover:scale-105 active:scale-95 backdrop-blur-sm overflow-hidden"
                title="Add New Product"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/0 via-blue-400/10 to-blue-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-blue-300/10 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                
                <svg className="h-5 w-5 relative z-10 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
                  Add Product
                </div>
              </button>
              
              {/* Import Button */}
              <button
                onClick={() => setShowImportModal(true)}
                className="group relative p-3 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/20 border border-transparent hover:border-emerald-300/60 dark:hover:border-emerald-600/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-emerald-400/40 transition-all duration-300 transform hover:scale-105 active:scale-95 backdrop-blur-sm overflow-hidden"
                title="Import Products"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/0 via-emerald-400/10 to-emerald-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-emerald-300/10 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 delay-100"></div>
                
                <svg className="h-5 w-5 relative z-10 text-gray-500 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
                  Import Data
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700 mx-6"></div>

        {/* Filters Section */}
        <div className="p-6 pt-4">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Cari produk..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kategori</label>
              <select
                value={filters.kategori}
                onChange={(e) => handleFilterChange('kategori', e.target.value)}
                disabled={loadingOptions}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Semua Kategori</option>
                {kategoriOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.kategori}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Segmen</label>
              <select
                value={filters.segmen}
                onChange={(e) => handleFilterChange('segmen', e.target.value)}
                disabled={loadingOptions}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Semua Segmen</option>
                {segmenOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.segmen}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Stage</label>
              <select
                value={filters.stage}
                onChange={(e) => handleFilterChange('stage', e.target.value)}
                disabled={loadingOptions}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Semua Stage</option>
                {stageOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.stage}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="group relative w-full px-4 py-2.5 hover:bg-gray-100/60 dark:hover:bg-gray-800/40 border border-transparent hover:border-gray-300/50 dark:hover:border-gray-600/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500/30 dark:focus:ring-gray-400/40 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm overflow-hidden flex items-center justify-center gap-2"
                title="Clear all filters"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-gray-400/0 via-gray-400/8 to-gray-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 dark:via-gray-300/8 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                
                <svg className="h-4 w-4 relative z-10 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                
                <span className="relative z-10 text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">
                  Reset Filter
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <ProductGrid
        products={products}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onViewAttachments={handleViewAttachments}
        onAddProduct={openAddModal}
      />

      {/* Pagination */}
      <ProductPagination
        pagination={pagination}
        onPageChange={handlePageChange}
      />

      {/* Modals */}
      <AddProductModal
        isOpen={showAddModal}
        onClose={closeAllModals}
        onSubmit={handleAddSubmit}
        onSuccess={handleFormSuccess}
        isLoading={formLoading}
      />

      <EditProductModal
        isOpen={showEditModal}
        onClose={closeAllModals}
        product={selectedProduct}
        onSubmit={handleEditSubmit}
        onSuccess={handleFormSuccess}
        isLoading={formLoading}
      />

      <AttachmentModal
        isOpen={showViewAttachmentsModal}
        onClose={closeAllModals}
        product={selectedProduct}
        attachments={selectedAttachments}
        onAddAttachment={() => {
          closeAllModals();
          if (selectedProduct) {
            openAddAttachmentModal(selectedProduct);
          }
        }}
        onDeleteAttachment={handleDeleteAttachment}
      />

      <AddAttachmentModal
        isOpen={showAddAttachmentModal}
        onClose={closeAllModals}
        product={selectedProduct}
        onSubmit={handleSubmitAttachment}
      />

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          setShowImportModal(false);
          fetchProducts(filters, pagination.currentPage);
        }}
      />
    </div>
  );
};

export default ProductPage;