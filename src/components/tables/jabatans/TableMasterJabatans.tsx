"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useModal } from "../../../hooks/useModal";
import { Modal } from "../../ui/modal";
import Button from "@/components/ui/button/Button";
import EditJabatansForm from "../../jabatan/EditJabatansForm";
import AddJabatansForm from "../../jabatan/AddJabatansForm";
import { Pencil, Trash, Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { useUser } from "@/context/UsersContext";
import Swal from 'sweetalert2';

interface Props {
  currentPage: number;
  onTotalChange: (totalPages: number) => void;
}

type Jabatan = {
  id: number;
  jabatan: string;
  created_at?: string;
  updated_at?: string;
};

export default function TableMasterJabatans({ currentPage, onTotalChange }: Props) {
  const [editingJabatan, setEditingJabatan] = useState<Jabatan | null>(null);
  const { isOpen, openModal, closeModal } = useModal();
  const [jabatans, setJabatans] = useState<Jabatan[]>([]);
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<keyof Jabatan | "">("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
 
  const searchInputRef = useRef<HTMLInputElement>(null);
  const currentRole = user?.role;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 1000);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchJabatans = useCallback(async () => {
    setLoading(true);
    
    try {
      const res = await fetch(
        `/api/jabatans/master?page=${currentPage}&search=${debouncedSearchQuery}&sortBy=${sortBy}&sortOrder=${sortOrder}`
      );
      const data = await res.json();
      setJabatans(data.jabatans);
      onTotalChange(Math.ceil(data.total / data.perPage));
    } catch (error) {
      console.error("Error fetching jabatans:", error);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearchQuery, sortBy, sortOrder]);

  const handleSort = (field: keyof Jabatan) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  useEffect(() => {
    fetchJabatans();
  }, [fetchJabatans]);

  const handleDelete = async (jabatanName: string, id: number) => {
    const result = await Swal.fire({
      title: 'Yakin ingin menghapus?',
      text: `Jabatan dengan nama: ${jabatanName} akan dihapus permanen`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch("/api/jabatans/delete", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ id })
        });

        const data = await res.json();

        if (data.success) {          
          Swal.fire('Berhasil!', 'Jabatan berhasil dihapus.', 'success').then(() => {
            fetchJabatans();
          });
        } else {
          Swal.fire('Gagal', data.message, 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Terjadi kesalahan pada server.', 'error');
        console.log(err);
      }
    }
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleEdit = (jabatan: Jabatan) => {
    setEditingJabatan(jabatan);
    openModal();
  };

  const handleCloseEdit = () => {
    setEditingJabatan(null);
    closeModal();
  };

  const handleEditSuccess = () => {
    fetchJabatans();
    handleCloseEdit();
  };

  const handleAddJabatan = () => {
    setEditingJabatan(null);
    openModal();
  };

  const getSortIcon = (field: keyof Jabatan) => {
    if (sortBy !== field) return <ChevronUp className="h-4 w-4 text-soft-stone" />;
    return sortOrder === "asc" ? 
      <ChevronUp className="h-4 w-4 text-warm-apricot" /> :
              <ChevronDown className="h-4 w-4 text-warm-apricot" />;
  };

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-warm-cream dark:bg-deep-charcoal rounded w-8"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-warm-cream dark:bg-deep-charcoal rounded w-32"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-warm-cream dark:bg-deep-charcoal rounded w-24"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <div className="flex justify-center gap-2">
          <div className="h-8 w-8 bg-warm-cream dark:bg-deep-charcoal rounded"></div>
          <div className="h-8 w-8 bg-warm-cream dark:bg-deep-charcoal rounded"></div>
        </div>
      </td>
    </tr>
  );

  if (loading) { 
    return (
      <div className="space-y-6">
        <div className="bg-pure-white dark:bg-deep-charcoal rounded-xl shadow-sm border border-warm-cream dark:border-soft-stone p-6">
          <div className="flex justify-between items-center">
            <div className="w-64 h-12 bg-warm-cream dark:bg-soft-stone rounded-lg animate-pulse"></div>
        <div className="w-32 h-12 bg-warm-cream dark:bg-soft-stone rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-pure-white dark:bg-deep-charcoal rounded-xl shadow-sm border border-warm-cream dark:border-soft-stone p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-soft-stone" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cari jabatan..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="block w-full pl-10 pr-10 py-3 border border-warm-cream dark:border-soft-stone rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                         placeholder-gray-500 dark:placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-warm-apricot focus:border-warm-apricot
                         transition-colors duration-200"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-soft-stone hover:text-warm-taupe dark:hover:text-warm-cream transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
          
          {currentRole === 'Admin' && (
            <Button
              onClick={handleAddJabatan}
              className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 
                       text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl 
                       transform hover:scale-105 transition-all duration-200 whitespace-nowrap"
            >
              + Add Jabatan
            </Button>
          )}
        </div>
        
        {debouncedSearchQuery !== searchQuery && (
          <div className="mt-4 text-sm text-soft-stone dark:text-soft-stone">
            Mencari &quot;{searchQuery}&quot;...
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="bg-pure-white dark:bg-deep-charcoal rounded-xl shadow-sm border border-warm-cream dark:border-soft-stone overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-warm-cream dark:bg-deep-charcoal">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-soft-stone dark:text-warm-cream uppercase tracking-wider">
                  No
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-semibold text-soft-stone dark:text-warm-cream uppercase tracking-wider 
                           cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                  onClick={() => handleSort('jabatan')}
                >
                  <div className="flex items-center justify-between">
                    <span>Jabatan</span>
                    <span className="ml-2 group-hover:text-warm-apricot transition-colors">{getSortIcon('jabatan')}</span>
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-xs font-semibold text-soft-stone dark:text-warm-cream uppercase tracking-wider 
                           cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center justify-between">
                    <span>Created At</span>
                    <span className="ml-2 group-hover:text-warm-apricot transition-colors">{getSortIcon('created_at')}</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-soft-stone dark:text-warm-cream uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-pure-white dark:bg-deep-charcoal divide-y divide-warm-cream dark:divide-soft-stone">
            {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <SkeletonRow key={idx} />
                ))
              ) : jabatans.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-16 h-16 bg-warm-cream dark:bg-deep-charcoal rounded-full flex items-center justify-center">
              <Search className="h-8 w-8 text-soft-stone" />
                    </div>
                    <p className="text-soft-stone dark:text-soft-stone font-medium">
                      {debouncedSearchQuery ? 
                        `Tidak ada jabatan yang ditemukan untuk "${debouncedSearchQuery}"` : 
                        "Tidak ada data jabatan"
                      }
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              jabatans.map((jabatan, idx) => (
                <tr key={jabatan.id} className="hover:bg-warm-cream dark:hover:bg-deep-charcoal transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-deep-charcoal dark:text-pure-white">
                    {(currentPage - 1) * 10 + idx + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-deep-charcoal dark:text-pure-white font-medium">
                    {jabatan.jabatan}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-soft-stone dark:text-soft-stone">
                    {jabatan.created_at
                      ? new Date(jabatan.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "-"
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {currentRole === 'Admin' ? (
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(jabatan)}
                          className="group relative p-3 hover:bg-warm-apricot/10 dark:hover:bg-warm-apricot/20 border border-transparent hover:border-warm-apricot/30 dark:hover:border-warm-apricot/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-warm-apricot/30 transition-all duration-200 transform hover:scale-105 active:scale-95"
                          title="Edit Jabatan"
                        >
                          <Pencil className="h-4 w-4 text-soft-stone dark:text-soft-stone group-hover:text-warm-apricot dark:group-hover:text-warm-apricot transition-colors duration-200" />
                        </button>
                        <button
                          onClick={() => handleDelete(jabatan.jabatan, jabatan.id)}
                          className="group relative p-3 hover:bg-red-100/60 dark:hover:bg-red-900/20 border border-transparent hover:border-red-300/60 dark:hover:border-red-600/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-all duration-200 transform hover:scale-105 active:scale-95"
                          title="Delete Jabatan"
                        >
                          <Trash className="h-4 w-4 text-soft-stone dark:text-soft-stone group-hover:text-warm-coral dark:group-hover:text-warm-coral transition-colors duration-200" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-soft-stone text-sm italic">Tidak ada aksi</span>
                    )}
                  </td>
                </tr>
              ))
            )}
            </tbody>
          </table>
        </div>
      </div>
      
      {isOpen && (
        <Modal 
          isOpen={isOpen} 
          onClose={closeModal} 
          className="max-w-md p-6 bg-pure-white dark:bg-deep-charcoal rounded-xl shadow-2xl"
        >
          {editingJabatan ? (
            <EditJabatansForm 
              jabatan={editingJabatan} 
              onSuccess={handleEditSuccess} 
              onCancel={handleCloseEdit} 
            />
          ) : (            
            <AddJabatansForm 
              onSuccess={() => {
                fetchJabatans();
                closeModal();
              }} 
              onCancel={closeModal} 
            />
          )}
        </Modal>
      )}
    </div>
  );
}