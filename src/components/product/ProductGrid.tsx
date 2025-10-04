import React from 'react';
import { Product } from '../../types/product.types';
import ProductCard from './ProductCard';
import ProductCardSkeleton from './ProductCardSkeleton';

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
  onViewAttachments: (product: Product) => void;
  onAddProduct: () => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  loading,
  onEdit,
  onDelete,
  onViewAttachments,
  onAddProduct
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-8">
        {[...Array(9)].map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="col-span-full">
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-muted-periwinkle dark:text-muted-taupe" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-4 4m0 0l-4-4m4 4V3" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-muted-blue-gray dark:text-neutral-cream-soft">Tidak ada produk</h3>
          <p className="mt-1 text-sm text-muted-periwinkle dark:text-muted-taupe">Mulai dengan menambahkan produk baru.</p>
          <div className="mt-6">
            <button
              onClick={onAddProduct}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-cool-sky dark:bg-cool-periwinkle hover:bg-cool-powder dark:hover:bg-cool-sky focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cool-sky dark:focus:ring-offset-muted-slate"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Produk
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-8">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewAttachments={onViewAttachments}
        />
      ))}
    </div>
  );
};

export default ProductGrid;