import React from 'react';
import { Product } from '../../types/product.types';
import { getStageBadgeColor, getSegmentBadgeColor } from '../../utils/productHelpers';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product
}) => {
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-2xl transition-all">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Product Details</h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-4">
            {/* Nama Produk */}
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Nama Produk</label>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{product.nama_produk}</p>
            </div>

            {/* Segment */}
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Segment</label>
              <div className="mt-1">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSegmentBadgeColor(product.segmen || '')}`}>
                  {product.segmen}
                </span>
              </div>
            </div>

            {/* Stage */}
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Stage</label>
              <div className="mt-1">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getStageBadgeColor(product.stage || '')}`}>
                  {product.stage}
                </span>
              </div>
            </div>

            {/* Lampiran File */}
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Lampiran File</label>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                {product.attachments?.length || 0} file
              </p>
            </div>

            {/* Deskripsi */}
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Deskripsi</label>
              <p className="text-gray-900 dark:text-white mt-1 leading-relaxed">
                {product.deskripsi || 'Tidak ada deskripsi tersedia untuk produk ini.'}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
