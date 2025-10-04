import React, { useState } from 'react';
import { Product } from '../../types/product.types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getStageBadgeColor, getSegmentBadgeColor } from '../../utils/productHelpers';
import ProductDetailModal from './ProductDetailModal';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
  onViewAttachments: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onEdit,
  onDelete,
  onViewAttachments
}) => {
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleViewDetails = () => {
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
  };

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col hover:-translate-y-1">
      {/* Product Header with Stage Badge */}
      <div className="relative p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 pr-3">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-2 leading-tight mb-2">
              {product.nama_produk}
            </h3>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStageBadgeColor(product.stage || '')}`}>
                {product.stage}
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getSegmentBadgeColor(product.segmen || '')}`}>
                {product.segmen}
              </span>
            </div>
          </div>
        </div>

        {/* Product Info - Pastel Colors */}
        <div className="grid grid-cols-1 gap-3 mb-6">
          <div className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full mr-3"></div>
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Kategori</span>
            </div>
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">{product.kategori}</span>
          </div>
          
          <div className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full mr-3"></div>
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Customer</span>
            </div>
            <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 truncate max-w-[150px]" title={product.customer}>
              {product.customer}
            </span>
          </div>
        </div>

        {/* Price and Launch Date - Soft Pastel Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 p-4 rounded-xl border border-rose-100 dark:border-rose-800/30">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-gradient-to-r from-rose-400 to-pink-400 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <span className="text-xs font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wide">Harga</span>
            </div>
            <p className="text-lg font-bold text-rose-900 dark:text-rose-100">{formatCurrency(product.harga)}</p>
          </div>
          
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 p-4 rounded-xl border border-violet-100 dark:border-violet-800/30">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-gradient-to-r from-violet-400 to-purple-400 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wide">Launch</span>
            </div>
            <p className="text-sm font-bold text-violet-900 dark:text-violet-100">{formatDate(product.tanggal_launch)}</p>
          </div>
        </div>

        {/* Description */}
        {product.deskripsi && (
          <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl border border-amber-100 dark:border-amber-800/30">
            <p className="text-sm text-amber-800 dark:text-amber-200 line-clamp-3 leading-relaxed">{product.deskripsi}</p>
          </div>
        )}

        {/* Attachment Count */}
        <div className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20 rounded-xl border border-slate-100 dark:border-slate-800/30 mb-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-slate-400 to-gray-400 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </div>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Attachments</span>
          </div>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{product.attachments?.length || 0}</span>
        </div>
      </div>

      {/* Action Buttons - Soft Pastel Design */}
      <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20 border-t border-slate-100 dark:border-slate-700/50 mt-auto">
        <div className="flex items-center justify-between">
          <button
            onClick={handleViewDetails}
            className="flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Details
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(product)}
              className="p-2.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-all duration-200"
              title="Edit Product"
            >
              <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            
            <button
              onClick={() => onDelete(product.id)}
              className="p-2.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-all duration-200"
              title="Delete Product"
            >
              <svg className="h-5 w-5 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        product={product}
      />
    </div>
  );
};

export default ProductCard;