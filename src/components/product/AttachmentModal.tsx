import React from 'react';
import { Modal } from '../ui/modal';
import { Product, Attachment } from '../../types/product.types';
import { formatFileSize } from '../../utils/formatters';

interface AttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  attachments: Attachment[];
  onAddAttachment: () => void;
  onDeleteAttachment: (id: number) => Promise<boolean>;
}

const AttachmentModal: React.FC<AttachmentModalProps> = ({
  isOpen,
  onClose,
  product,
  attachments,
  onAddAttachment,
  onDeleteAttachment
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-4xl"
    >
      <div className="p-6 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">File Attachment</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{product?.nama_produk}</p>
          </div>
          <button
            onClick={onAddAttachment}
            className="px-4 py-2 bg-cool-sky dark:bg-cool-sky text-white rounded-lg hover:bg-deep-ocean dark:hover:bg-deep-ocean focus:outline-none focus:ring-2 focus:ring-cool-sky dark:focus:ring-cool-sky transition-colors duration-200 flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah File
          </button>
        </div>

        {attachments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="h-5 w-5 text-warm-coral dark:text-warm-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">{attachment.nama_attachment}</h3>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <p><span className="font-medium">Ukuran:</span> {formatFileSize(attachment.ukuran_file)}</p>
                      <p><span className="font-medium">Tipe:</span> {attachment.type}</p>
                      <p><span className="font-medium">Upload:</span> {new Date(attachment.created_at).toLocaleDateString('id-ID')}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    <a
                      href={attachment.url_attachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-cool-sky dark:bg-cool-sky text-white text-xs rounded hover:bg-deep-ocean dark:hover:bg-deep-ocean focus:outline-none focus:ring-2 focus:ring-cool-sky dark:focus:ring-cool-sky transition-colors duration-200 text-center"
                    >
                      Lihat
                    </a>
                    <button
                      onClick={() => onDeleteAttachment(attachment.id)}
                      className="px-3 py-1 bg-warm-coral dark:bg-warm-coral text-white text-xs rounded hover:bg-warm-coral/80 dark:hover:bg-warm-coral/80 focus:outline-none focus:ring-2 focus:ring-warm-coral dark:focus:ring-warm-coral transition-colors duration-200"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Belum ada file</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Tambahkan file attachment untuk produk ini.</p>
            <div className="mt-6">
              <button
                onClick={onAddAttachment}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-cool-sky dark:bg-cool-sky hover:bg-deep-ocean dark:hover:bg-deep-ocean focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cool-sky dark:focus:ring-offset-deep-charcoal"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Tambah File
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AttachmentModal;