import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize = 50,
  onPageChange,
  itemLabel = 'items'
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  if (totalItems === 0) {
    return null;
  }

  const startItem = (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const delta = 1; // Number of pages to show around current page

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (safeCurrentPage > delta + 2) {
        pages.push('...');
      }

      const start = Math.max(2, safeCurrentPage - delta);
      const end = Math.min(totalPages - 1, safeCurrentPage + delta);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (safeCurrentPage < totalPages - (delta + 1)) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-white rounded-b-2xl gap-3 flex-wrap select-none">
      <div className="text-xs text-slate-500 flex items-center gap-1.5">
        Showing <strong className="text-slate-900 font-semibold">{startItem}</strong>–<strong className="text-slate-900 font-semibold">{endItem}</strong> of <strong className="text-slate-900 font-semibold">{totalItems}</strong> {itemLabel}
        <span className="text-slate-400">
          (Page {safeCurrentPage} of {totalPages})
        </span>
      </div>

      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          className="inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-medium hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          disabled={safeCurrentPage === 1}
          onClick={() => onPageChange(1)}
          title="First Page"
          aria-label="First Page"
        >
          <ChevronsLeft size={15} />
        </button>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-1 min-w-8 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-medium hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          disabled={safeCurrentPage === 1}
          onClick={() => onPageChange(safeCurrentPage - 1)}
          title="Previous Page"
          aria-label="Previous Page"
        >
          <ChevronLeft size={15} />
          <span className="hidden sm:inline">Prev</span>
        </button>

        <div className="inline-flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="px-1 text-slate-400 text-xs">
                  …
                </span>
              );
            }
            const pageNum = Number(p);
            const isActive = pageNum === safeCurrentPage;
            return (
              <button
                key={pageNum}
                type="button"
                className={`min-w-8 h-8 px-2 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#E68A00] text-white font-bold shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                onClick={() => onPageChange(pageNum)}
                aria-current={isActive ? 'page' : undefined}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-1 min-w-8 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-medium hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          disabled={safeCurrentPage === totalPages}
          onClick={() => onPageChange(safeCurrentPage + 1)}
          title="Next Page"
          aria-label="Next Page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={15} />
        </button>

        <button
          type="button"
          className="inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-medium hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          disabled={safeCurrentPage === totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Last Page"
          aria-label="Last Page"
        >
          <ChevronsRight size={15} />
        </button>
      </div>
    </div>
  );
};
