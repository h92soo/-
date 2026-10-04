import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  X,
  Search,
  CheckCircle2,
  Calendar,
  Building2,
  Briefcase,
  Hash,
  AlertCircle,
  RefreshCw,
  Clock,
  UserCheck,
  Undo2,
  Redo2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Employee } from '../types';
import {
  TrashedEmployeeRecord,
  getTrashedEmployees,
  restoreFromTrash,
  restoreAllFromTrash,
  permanentlyDeleteFromTrash,
  emptyTrash,
  subscribeTrashChanges,
  canUndo,
  canRedo,
  executeUndo,
  executeRedo,
} from '../services/employeeTrashService';
import { saveEmployee, saveEmployeesBatch, deleteEmployeeById, deleteEmployeesBatch } from '../db/indexedDB';
import { toast } from './ToastNotification';
import { PaginationControl } from './PaginationControl';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmployeesRestored: (restored: Employee[]) => void;
  onEmployeesDeletedPermanently?: (deletedIds: string[]) => void;
  allCurrentEmployees: Employee[];
}

export const TrashModal: React.FC<TrashModalProps> = ({
  isOpen,
  onClose,
  onEmployeesRestored,
  onEmployeesDeletedPermanently,
  allCurrentEmployees,
}) => {
  const [trashedList, setTrashedList] = useState<TrashedEmployeeRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrashIds, setSelectedTrashIds] = useState<string[]>([]);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [confirmEmptyAll, setConfirmEmptyAll] = useState(false);
  const [itemToDeletePermanently, setItemToDeletePermanently] = useState<TrashedEmployeeRecord | null>(null);

  const [hasUndo, setHasUndo] = useState(false);
  const [hasRedo, setHasRedo] = useState(false);

  // Sync with service
  const refreshData = () => {
    setTrashedList(getTrashedEmployees());
    setHasUndo(canUndo());
    setHasRedo(canRedo());
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [isOpen]);

  useEffect(() => {
    const unsubscribe = subscribeTrashChanges(() => {
      refreshData();
    });
    return () => unsubscribe();
  }, []);

  // Filter trashed items
  const filteredList = useMemo(() => {
    return trashedList.filter((item) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.employee.fullName.toLowerCase().includes(term) ||
        item.employee.employeeNumber.toLowerCase().includes(term) ||
        item.employee.department.toLowerCase().includes(term) ||
        item.employee.jobTitle.toLowerCase().includes(term)
      );
    });
  }, [trashedList, searchTerm]);

  // Pagination for high performance (20 per page by default)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const paginatedList = useMemo(() => {
    if (pageSize === 0) return filteredList;
    const startIndex = (currentPage - 1) * pageSize;
    return filteredList.slice(startIndex, startIndex + pageSize);
  }, [filteredList, currentPage, pageSize]);

  // Handle single restore
  const handleRestoreSingle = async (trashId: string) => {
    setIsActionLoading(true);
    try {
      const restored = restoreFromTrash(trashId);
      if (!restored) {
        toast.error('لم يتم العثور على سجل الموظف في سلة المهملات.');
        return;
      }

      // Check if employeeNumber already exists in current active roster
      const duplicate = allCurrentEmployees.find(
        (e) => e.employeeNumber === restored.employeeNumber && e.id !== restored.id
      );
      if (duplicate) {
        toast.warning(
          `تنبيه: الرقم الوظيفي (${restored.employeeNumber}) مستخدم حالياً للموظف (${duplicate.fullName}). تم استرجاع السجل مع الاحتفاظ به.`
        );
      }

      // Persist restored employee back to IndexedDB
      await saveEmployee(restored);
      onEmployeesRestored([restored]);
      toast.success(`تمت استعادة الموظف (${restored.fullName}) بنجاح وإعادته لسجل الدائرة.`);
      refreshData();
    } catch (err: any) {
      console.error('Failed to restore employee:', err);
      toast.error(`فشل استرجاع الموظف: ${err?.message || ''}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle restoring selected items
  const handleRestoreSelected = async () => {
    if (selectedTrashIds.length === 0) return;
    setIsActionLoading(true);
    try {
      const restoredList: Employee[] = [];
      for (const tId of selectedTrashIds) {
        const emp = restoreFromTrash(tId);
        if (emp) restoredList.push(emp);
      }

      if (restoredList.length > 0) {
        await saveEmployeesBatch(restoredList);
        onEmployeesRestored(restoredList);
        toast.success(`تمت استعادة (${restoredList.length}) من سجلات الموظفين بنجاح.`);
      }
      setSelectedTrashIds([]);
      refreshData();
    } catch (err: any) {
      console.error('Failed batch restore:', err);
      toast.error('حدث خطأ أثناء استعادة السجلات المحددة.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle restoring all items
  const handleRestoreAll = async () => {
    if (trashedList.length === 0) return;
    setIsActionLoading(true);
    try {
      const restoredList = restoreAllFromTrash();
      if (restoredList.length > 0) {
        await saveEmployeesBatch(restoredList);
        onEmployeesRestored(restoredList);
        toast.success(`تمت استعادة جميع السجلات المحذوفة (${restoredList.length}) بنجاح.`);
      }
      setSelectedTrashIds([]);
      refreshData();
    } catch (err: any) {
      console.error('Failed restore all:', err);
      toast.error('حدث خطأ أثناء استعادة كافة الموظفين.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle permanent delete of single item
  const handleConfirmPermanentDeleteSingle = async () => {
    if (!itemToDeletePermanently) return;
    setIsActionLoading(true);
    try {
      const empId = itemToDeletePermanently.employee.id;
      permanentlyDeleteFromTrash(itemToDeletePermanently.id);
      if (onEmployeesDeletedPermanently) {
        onEmployeesDeletedPermanently([empId]);
      }
      toast.info(`تم الحذف النهائي لسجل الموظف (${itemToDeletePermanently.employee.fullName}) وتطهير سلة المهملات.`);
      setItemToDeletePermanently(null);
      refreshData();
    } catch (err: any) {
      console.error('Permanent delete failed:', err);
      toast.error('فشل الحذف النهائي.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle empty entire trash
  const handleConfirmEmptyTrash = async () => {
    setIsActionLoading(true);
    try {
      const allIds = trashedList.map((r) => r.employee.id);
      emptyTrash();
      if (onEmployeesDeletedPermanently) {
        onEmployeesDeletedPermanently(allIds);
      }
      toast.info('تم إفراغ سلة المهملات بالكامل وحذف كافة السجلات المعلقة نهائياً.');
      setConfirmEmptyAll(false);
      setSelectedTrashIds([]);
      refreshData();
    } catch (err: any) {
      console.error('Empty trash failed:', err);
      toast.error('حدث خطأ أثناء إفراغ سلة المهملات.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Direct Undo from within modal
  const handleUndo = async () => {
    setIsActionLoading(true);
    try {
      const res = executeUndo();
      if (res.action === 'restored' && res.employees.length > 0) {
        await saveEmployeesBatch(res.employees);
        onEmployeesRestored(res.employees);
        toast.success(res.message);
      } else if (res.action === 'deleted' && res.employees.length > 0) {
        await deleteEmployeesBatch(res.employees.map((e) => e.id));
        if (onEmployeesDeletedPermanently) {
          onEmployeesDeletedPermanently(res.employees.map((e) => e.id));
        }
        toast.warning(res.message);
      } else {
        toast.info(res.message);
      }
      refreshData();
    } catch (e) {
      console.error('Undo failed:', e);
      toast.error('تعذر تنفيذ التراجع.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Direct Redo from within modal
  const handleRedo = async () => {
    setIsActionLoading(true);
    try {
      const res = executeRedo();
      if (res.action === 'restored' && res.employees.length > 0) {
        await saveEmployeesBatch(res.employees);
        onEmployeesRestored(res.employees);
        toast.success(res.message);
      } else if (res.action === 'deleted' && res.employees.length > 0) {
        await deleteEmployeesBatch(res.employees.map((e) => e.id));
        if (onEmployeesDeletedPermanently) {
          onEmployeesDeletedPermanently(res.employees.map((e) => e.id));
        }
        toast.warning(res.message);
      } else {
        toast.info(res.message);
      }
      refreshData();
    } catch (e) {
      console.error('Redo failed:', e);
      toast.error('تعذر تنفيذ الإعادة.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedTrashIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedTrashIds.length === filteredList.length) {
      setSelectedTrashIds([]);
    } else {
      setSelectedTrashIds(filteredList.map((x) => x.id));
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isActionLoading) {
          onClose();
        }
      }}
      dir="rtl"
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-transparent border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-xs">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  سلة مهملات الموظفين وسجل التراجع (Trash & Undo)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300/60">
                  {trashedList.length} سجل محذوف مؤقتاً
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                حماية من الحذف الخاطئ: يمكنك استعادة أي موظف أو التراجع خلال جلسة العمل بضغطة زر
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Undo & Redo in Header */}
            <button
              type="button"
              onClick={handleUndo}
              disabled={!hasUndo || isActionLoading}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs flex items-center gap-1 text-xs font-bold"
              title="تراجع عن آخر عملية حذف أو استرجاع (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">تراجع</span>
            </button>

            <button
              type="button"
              onClick={handleRedo}
              disabled={!hasRedo || isActionLoading}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs flex items-center gap-1 text-xs font-bold"
              title="إعادة العملية السابقة (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">إعادة</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Search, Multi-Actions, and Status */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="البحث بالاسم، الرقم الوظيفي، القسم، أو العنوان..."
              className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {selectedTrashIds.length > 0 && (
              <button
                type="button"
                onClick={handleRestoreSelected}
                disabled={isActionLoading}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-60"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة المحدد ({selectedTrashIds.length})</span>
              </button>
            )}

            {trashedList.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleRestoreAll}
                  disabled={isActionLoading}
                  className="px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
                  title="استعادة كافة الموظفين الموجودين في سلة المهملات دفعة واحدة"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>استعادة الكل ({trashedList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmEmptyAll(true)}
                  disabled={isActionLoading}
                  className="px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
                  title="حذف نهائي لا رجعة فيه لكافة السجلات وتطهير السلة"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>إفراغ السلة</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content Area: Table / List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredList.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                <Trash2 className="w-7 h-7 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {searchTerm ? 'لا توجد نتائج مطابقة لبحثك' : 'سلة المهملات فارغة حالياً'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {searchTerm
                    ? 'جرب البحث بكلمات أخرى أو امسح البحث الحالي.'
                    : 'عند حذف أي موظف من سجلات الملاك، سيتم الاحتفاظ به هنا مؤقتاً لتتمكن من استعادته في أي وقت بنقرة واحدة.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Select all bar if items exist */}
              <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedTrashIds.length === filteredList.length && filteredList.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500/40"
                  />
                  <span className="font-semibold">تحديد الكل ({filteredList.length})</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  تم تحديد {selectedTrashIds.length} من {filteredList.length}
                </span>
              </div>

              {/* Items Card List */}
              <div className="grid grid-cols-1 gap-2.5">
                {paginatedList.map((record) => {
                  const emp = record.employee;
                  const isSelected = selectedTrashIds.includes(record.id);
                  const deleteDateStr = new Date(record.deletedAt).toLocaleString('ar-IQ', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  });

                  return (
                    <motion.div
                      key={record.id}
                      layout
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80 shadow-xs'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {/* Left info */}
                      <div className="flex items-start gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(record.id)}
                          className="w-4 h-4 mt-1 rounded text-rose-600 focus:ring-rose-500/40 shrink-0 cursor-pointer"
                        />
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {emp.fullName}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              {emp.employeeNumber}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                emp.contractType === 'permanent'
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}
                            >
                              {emp.contractType === 'permanent' ? 'ملاك دائم' : 'عقد وزاري (315)'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              <span>{emp.department}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Briefcase className="w-3 h-3 text-slate-400" />
                              <span>{emp.jobTitle}</span>
                            </span>
                            <span className="flex items-center gap-1 font-mono text-[11px] text-rose-600/90 dark:text-rose-400/90">
                              <Clock className="w-3 h-3" />
                              <span>حُذف في: {deleteDateStr}</span>
                            </span>
                            {record.reason && (
                              <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.2 rounded">
                                {record.reason}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {/* Instant Restore */}
                        <button
                          type="button"
                          onClick={() => handleRestoreSingle(record.id)}
                          disabled={isActionLoading}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-60"
                          title="استعادة الموظف فوراً وإعادته إلى جدول الموظفين"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>استعادة</span>
                        </button>

                        {/* Permanent Delete */}
                        <button
                          type="button"
                          onClick={() => setItemToDeletePermanently(record)}
                          disabled={isActionLoading}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-60"
                          title="حذف نهائي لا رجعة فيه لهذا القيد"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {filteredList.length > 0 && (
                <PaginationControl
                  currentPage={currentPage}
                  totalItems={filteredList.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[20, 30, 50, 100, 0]}
                  itemLabel="سجلاً محذوفاً"
                />
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              نظام الأمان النشط: السجلات المحذوفة تظل محفوظة مؤقتاً طوال جلسة العمل لضمان عدم ضياع أي بيانات.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 font-semibold cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>

        {/* Confirmation Sub-modal: Permanent Delete Single */}
        {itemToDeletePermanently && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    تأكيد الحذف النهائي
                  </h4>
                  <p className="text-xs text-slate-500">عملية نهائية غير قابلة للاسترجاع</p>
                </div>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                هل أنت متأكد من حذف سجل الموظف{' '}
                <strong className="text-rose-600 font-bold">
                  ({itemToDeletePermanently.employee.fullName})
                </strong>{' '}
                نهائياً من سلة المهملات؟ لن تتمكن من استعادته بعد ذلك مطلقاً.
              </p>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setItemToDeletePermanently(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPermanentDeleteSingle}
                  disabled={isActionLoading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 active:scale-98 transition-all cursor-pointer"
                >
                  نعم، حذف نهائي
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Sub-modal: Empty All Trash */}
        {confirmEmptyAll && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    إفراغ سلة المهملات بالكامل
                  </h4>
                  <p className="text-xs text-slate-500">حذف نهائي لجميع السجلات المعلقة</p>
                </div>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                هل أنت متأكد من رغبتك في إفراغ سلة المهملات وحذف كافة السجلات (
                <strong className="text-rose-600 font-bold">{trashedList.length}</strong> موظف)
                نهائياً؟ لن يمكن استرجاع أي منهم بعد هذه الخطوة.
              </p>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmEmptyAll(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEmptyTrash}
                  disabled={isActionLoading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 active:scale-98 transition-all cursor-pointer"
                >
                  نعم، إفراغ السلة الآن
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
