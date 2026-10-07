import React, { useMemo } from 'react';
import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

export interface PaginationControlProps {
  currentPage: number;
  totalItems: number;
  pageSize: number; // 0 represents "all"
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[]; // default [10, 20, 50, 100, 0]
  itemLabel?: string; // default "موظفاً"
  className?: string;
}

export const PaginationControl: React.FC<PaginationControlProps> = React.memo(({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100, 0],
  itemLabel = 'موظفاً',
  className = '',
}) => {
  const effectivePageSize = pageSize === 0 ? totalItems : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / (effectivePageSize || 1)));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : pageSize === 0 ? 1 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = totalItems === 0 ? 0 : pageSize === 0 ? totalItems : Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate numbered pages with ellipsis
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    const windowStart = Math.max(2, safeCurrentPage - 1);
    const windowEnd = Math.min(totalPages - 1, safeCurrentPage + 1);

    pages.push(1);
    if (windowStart > 2) {
      pages.push('...');
    }
    for (let i = windowStart; i <= windowEnd; i++) {
      pages.push(i);
    }
    if (windowEnd < totalPages - 1) {
      pages.push('...');
    }
    pages.push(totalPages);
    return pages;
  }, [totalPages, safeCurrentPage]);

  if (totalItems === 0) return null;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-xs no-print select-none ${className}`}
      dir="rtl"
    >
      {/* 1. Range & Total Count Summary */}
      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
        <span>عرض</span>
        <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
          {startItem}
        </span>
        <span>-</span>
        <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
          {endItem}
        </span>
        <span>من أصل</span>
        <span className="font-bold text-amber-600 dark:text-amber-400 font-mono px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
          {totalItems}
        </span>
        <span>{itemLabel}</span>
      </div>

      {/* 2. Page Size Switcher (20 / 30 / 50 / 100 / الكل) */}
      <div className="flex items-center gap-2">
        <span className="text-slate-500 dark:text-slate-400 hidden md:inline text-[11px]">
          عرض بالصفحة:
        </span>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80">
          {pageSizeOptions.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => {
                soundEffects.playButtonClick();
                onPageSizeChange(size);
                onPageChange(1);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                pageSize === size
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={size === 0 ? 'عرض كافة السجلات بدون تقسيم' : `عرض ${size} سجلاً في الصفحة`}
            >
              {size === 0 ? 'الكل' : size}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Pagination Navigation Controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First Page */}
          <button
            type="button"
            onClick={() => {
              soundEffects.playButtonClick();
              onPageChange(1);
            }}
            disabled={safeCurrentPage <= 1}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="الصفحة الأولى"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>

          {/* Previous Page */}
          <button
            type="button"
            onClick={() => {
              soundEffects.playButtonClick();
              onPageChange(Math.max(1, safeCurrentPage - 1));
            }}
            disabled={safeCurrentPage <= 1}
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1 cursor-pointer"
            title="الصفحة السابقة"
          >
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">السابق</span>
          </button>

          {/* Numbered Page Buttons with Ellipsis */}
          <div className="flex items-center gap-1 mx-0.5">
            {pageNumbers.map((p, idx) =>
              p === '...' ? (
                <span key={`dots-${idx}`} className="px-1 text-slate-400 font-mono text-xs">
                  ...
                </span>
              ) : (
                <button
                  key={`page-${p}`}
                  type="button"
                  onClick={() => {
                    soundEffects.playButtonClick();
                    onPageChange(p as number);
                  }}
                  className={`min-w-7 h-7 px-1.5 rounded-lg font-bold font-mono text-xs transition-colors cursor-pointer ${
                    safeCurrentPage === p
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {p}
                </button>
              )
            )}
          </div>

          {/* Next Page */}
          <button
            type="button"
            onClick={() => {
              soundEffects.playButtonClick();
              onPageChange(Math.min(totalPages, safeCurrentPage + 1));
            }}
            disabled={safeCurrentPage >= totalPages}
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1 cursor-pointer"
            title="الصفحة التالية"
          >
            <span className="hidden sm:inline text-[11px]">التالي</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Last Page */}
          <button
            type="button"
            onClick={() => {
              soundEffects.playButtonClick();
              onPageChange(totalPages);
            }}
            disabled={safeCurrentPage >= totalPages}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="الصفحة الأخيرة"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
});

PaginationControl.displayName = 'PaginationControl';
