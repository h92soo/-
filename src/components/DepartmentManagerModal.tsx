import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Users,
  Search,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  Phone,
  Mail,
  FileText,
  Sparkles,
  ShieldAlert,
  ChevronDown,
  RefreshCw,
  FolderPlus,
  BadgeAlert,
  Palette,
} from 'lucide-react';
import { Department, Employee, DEFAULT_DEPARTMENTS } from '../types';
import { employeeService } from '../services/employeeService';
import { showToast, toast } from './ToastNotification';

interface DepartmentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onDepartmentChanged?: () => void;
  onSelectDepartmentFilter?: (deptName: string) => void;
}

const COLOR_OPTIONS: { id: string; label: string; bg: string; text: string; border: string; ring: string }[] = [
  { id: 'indigo', label: 'نيلي ملكي', bg: 'bg-indigo-100 dark:bg-indigo-950/60', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-300 dark:border-indigo-800', ring: 'ring-indigo-500' },
  { id: 'amber', label: 'ذهبي / كهرماني', bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-800', ring: 'ring-amber-500' },
  { id: 'emerald', label: 'زمردي / أخضر', bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-800', ring: 'ring-emerald-500' },
  { id: 'blue', label: 'أزرق تقني', bg: 'bg-blue-100 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-800', ring: 'ring-blue-500' },
  { id: 'purple', label: 'بنفسجي إداري', bg: 'bg-purple-100 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-800', ring: 'ring-purple-500' },
  { id: 'rose', label: 'وردي / رقابي', bg: 'bg-rose-100 dark:bg-rose-950/60', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-300 dark:border-rose-800', ring: 'ring-rose-500' },
  { id: 'cyan', label: 'سماوي / علاقات', bg: 'bg-cyan-100 dark:bg-cyan-950/60', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-300 dark:border-cyan-800', ring: 'ring-cyan-500' },
  { id: 'orange', label: 'برتقالي / لوجستي', bg: 'bg-orange-100 dark:bg-orange-950/60', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-800', ring: 'ring-orange-500' },
  { id: 'slate', label: 'رمادي رسمي', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-700', ring: 'ring-slate-500' },
];

export function getColorClasses(colorName?: string) {
  const matched = COLOR_OPTIONS.find((c) => c.id === colorName);
  return matched || COLOR_OPTIONS[0];
}

export const DepartmentManagerModal: React.FC<DepartmentManagerModalProps> = ({
  isOpen,
  onClose,
  employees,
  onDepartmentChanged,
  onSelectDepartmentFilter,
}) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Mode: 'list' | 'add' | 'edit' | 'transfer'
  const [viewMode, setViewMode] = useState<'list' | 'add' | 'edit' | 'transfer'>('list');
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formManagerName, setFormManagerName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formColor, setFormColor] = useState('indigo');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete State
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);
  const [transferTargetDeptName, setTransferTargetDeptName] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk Transfer State
  const [transferFromDept, setTransferFromDept] = useState('');
  const [transferToDept, setTransferToDept] = useState('');
  const [transferReason, setTransferReason] = useState('إعادة هيكلة وتوزيع الملاكات الرسمية');
  const [isTransferring, setIsTransferring] = useState(false);

  // Load departments reactively
  const loadDepartments = async () => {
    setLoading(true);
    try {
      const depts = await employeeService.getDepartments();
      setDepartments(depts);
    } catch (err) {
      console.error('Failed to load departments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDepartments();
      const unsub = employeeService.subscribeDepartments((newDepts) => {
        setDepartments(newDepts);
      });
      return () => unsub();
    }
  }, [isOpen]);

  // Compute counts per department
  const employeeCountByDept = useMemo(() => {
    const map: Record<string, number> = {};
    employees.forEach((emp) => {
      const d = emp.department?.trim();
      if (d) {
        map[d] = (map[d] || 0) + 1;
      }
    });
    return map;
  }, [employees]);

  // Filtered departments
  const filteredDepartments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.code && d.code.toLowerCase().includes(q)) ||
        (d.managerName && d.managerName.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q))
    );
  }, [departments, searchQuery]);

  // Reset Form
  const resetForm = () => {
    setFormName('');
    setFormCode('');
    setFormManagerName('');
    setFormPhone('');
    setFormEmail('');
    setFormColor('indigo');
    setFormDescription('');
    setFormError(null);
    setEditingDept(null);
    setViewMode('list');
  };

  // Open Edit Form
  const handleStartEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormName(dept.name);
    setFormCode(dept.code || '');
    setFormManagerName(dept.managerName || '');
    setFormPhone(dept.phone || '');
    setFormEmail(dept.email || '');
    setFormColor(dept.color || 'indigo');
    setFormDescription(dept.description || '');
    setFormError(null);
    setViewMode('edit');
  };

  // Open Add Form
  const handleStartAdd = () => {
    resetForm();
    setViewMode('add');
  };

  // Submit Add or Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) {
      setFormError('يرجى إدخال اسم القسم أو التشكيل الإداري');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (viewMode === 'add') {
        const created = await employeeService.addDepartment({
          name: cleanName,
          code: formCode.trim() || cleanName.slice(0, 3).toUpperCase(),
          managerName: formManagerName.trim() || undefined,
          phone: formPhone.trim() || undefined,
          email: formEmail.trim() || undefined,
          color: formColor,
          description: formDescription.trim() || undefined,
        });
        showToast(`تم إنشاء القسم (${created.name}) بنجاح`, 'success');
      } else if (viewMode === 'edit' && editingDept) {
        const res = await employeeService.updateDepartment(editingDept.id, {
          name: cleanName,
          code: formCode.trim() || cleanName.slice(0, 3).toUpperCase(),
          managerName: formManagerName.trim() || undefined,
          phone: formPhone.trim() || undefined,
          email: formEmail.trim() || undefined,
          color: formColor,
          description: formDescription.trim() || undefined,
        });

        if (res.affectedEmployeesCount > 0) {
          showToast(
            `تم تحديث القسم (${res.department.name}) ومزامنة (${res.affectedEmployeesCount}) موظف تلقائياً في السجل!`,
            'success'
          );
        } else {
          showToast(`تم تحديث بيانات القسم (${res.department.name}) بنجاح`, 'success');
        }
      }

      await loadDepartments();
      resetForm();
      if (onDepartmentChanged) onDepartmentChanged();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ القسم';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Delete Confirmation
  const handleStartDelete = (dept: Department) => {
    setDeletingDept(dept);
    // Find default alternative transfer department
    const other = departments.find((d) => d.id !== dept.id);
    setTransferTargetDeptName(other ? other.name : '');
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingDept) return;
    setIsDeleting(true);

    try {
      const count = employeeCountByDept[deletingDept.name] || 0;
      if (count > 0 && !transferTargetDeptName) {
        showToast('يرجى اختيار قسم بديل لنقل الموظفين إليه قبل الحذف', 'error');
        setIsDeleting(false);
        return;
      }

      const res = await employeeService.deleteDepartment(
        deletingDept.id,
        count > 0 ? transferTargetDeptName : undefined
      );

      if (res.affectedEmployeesCount > 0) {
        showToast(
          `تم حذف القسم ونقل (${res.affectedEmployeesCount}) موظف بنجاح إلى (${transferTargetDeptName})`,
          'success'
        );
      } else {
        showToast(`تم حذف القسم (${deletingDept.name}) بنجاح`, 'success');
      }

      setDeletingDept(null);
      await loadDepartments();
      if (onDepartmentChanged) onDepartmentChanged();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر حذف القسم';
      showToast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Bulk Transfer of Employees
  const handleBulkTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferFromDept || !transferToDept) {
      showToast('يرجى اختيار القسم المصدر والقسم الوجهة', 'error');
      return;
    }
    if (transferFromDept === transferToDept) {
      showToast('لا يمكن النقل إلى نفس القسم الحالي', 'warning');
      return;
    }

    const empsInSource = employees.filter((e) => e.department?.trim() === transferFromDept.trim());
    if (empsInSource.length === 0) {
      showToast(`لا يوجد موظفون مسجلون في القسم المصدر (${transferFromDept})`, 'warning');
      return;
    }

    setIsTransferring(true);
    try {
      const ids = empsInSource.map((e) => e.id);
      const res = await employeeService.transferEmployeesToDepartment(ids, transferToDept, transferReason);
      showToast(
        `تم نقل (${res.updatedCount}) موظف بنجاح من (${transferFromDept}) إلى (${transferToDept})`,
        'success'
      );
      if (onDepartmentChanged) onDepartmentChanged();
      setViewMode('list');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل نقل الموظفين';
      showToast(msg, 'error');
    } finally {
      setIsTransferring(false);
    }
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in no-print overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <Building2 className="w-6 h-6 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">
                  إدارة الأقسام والتشكيلات الإدارية
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 text-white border border-white/20">
                  {departments.length} أقسام وتشكيلات
                </span>
              </div>
              <p className="text-xs text-amber-100/90 font-medium mt-0.5">
                إضافة وحذف وتعديل الأقسام مع التحديث التلقائي لكافة الموظفين والمزامنة مع سجل الخدمة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub Header & Navigation Bar */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setViewMode('list');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>قائمة الأقسام ({departments.length})</span>
            </button>

            <button
              type="button"
              onClick={handleStartAdd}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'add'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة قسم جديد</span>
            </button>

            <button
              type="button"
              onClick={() => {
                resetForm();
                setViewMode('transfer');
                if (departments.length >= 2) {
                  setTransferFromDept(departments[0].name);
                  setTransferToDept(departments[1].name);
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'transfer'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 hover:bg-blue-100'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>نقل الموظفين بين الأقسام</span>
            </button>
          </div>

          {viewMode === 'list' && (
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في الأقسام والمدراء والرموز..."
                className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* VIEW MODE: LIST */}
          {viewMode === 'list' && (
            <div className="space-y-4">
              {/* Quick Summary Pill Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
                  <div className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">إجمالي الأقسام</div>
                  <div className="text-xl font-black text-amber-900 dark:text-amber-100 mt-0.5">{departments.length}</div>
                </div>
                <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60">
                  <div className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold">الموظفون الموزعون</div>
                  <div className="text-xl font-black text-indigo-900 dark:text-indigo-100 mt-0.5">
                    {Object.values(employeeCountByDept).reduce((a: number, b: number) => a + (Number(b) || 0), 0)}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">أكبر قسم كادراً</div>
                  <div className="text-xs font-bold text-emerald-900 dark:text-emerald-100 mt-1 truncate">
                    {(() => {
                      let maxDept = 'لا يوجد';
                      let maxVal = 0;
                      for (const [dept, cnt] of Object.entries(employeeCountByDept)) {
                        const countVal = Number(cnt) || 0;
                        if (countVal > maxVal) {
                          maxVal = countVal;
                          maxDept = `${dept} (${countVal})`;
                        }
                      }
                      return maxDept;
                    })()}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">المزامنة الشاملة</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>متصلة بكل السجل</span>
                  </div>
                </div>
              </div>

              {/* Departments Grid */}
              {loading ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
                  <span className="text-xs">جاري تحميل وتحديث الأقسام والتشكيلات...</span>
                </div>
              ) : filteredDepartments.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    لا توجد أقسام مطابقة لنتائج البحث
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    يمكنك إضافة قسم جديد الآن أو تعديل عبارة البحث
                  </p>
                  <button
                    type="button"
                    onClick={handleStartAdd}
                    className="mt-3 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة قسم جديد</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredDepartments.map((dept) => {
                    const empCount = employeeCountByDept[dept.name] || 0;
                    const colorStyle = getColorClasses(dept.color);

                    return (
                      <div
                        key={dept.id}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700/60 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                      >
                        <div>
                          {/* Top Row: Name, Code & Count */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5">
                              <span
                                className={`px-2 py-1 rounded-lg text-xs font-black uppercase shrink-0 border ${colorStyle.bg} ${colorStyle.text} ${colorStyle.border}`}
                              >
                                {dept.code || 'DEP'}
                              </span>
                              <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                  {dept.name}
                                </h3>
                                {dept.description && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                    {dept.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Employee Count Pill */}
                            <button
                              type="button"
                              onClick={() => {
                                if (onSelectDepartmentFilter) {
                                  onSelectDepartmentFilter(dept.name);
                                  onClose();
                                }
                              }}
                              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-amber-950/60 text-slate-700 hover:text-amber-800 dark:text-slate-300 dark:hover:text-amber-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                              title="تصفية سجل الموظفين حسب هذا القسم"
                            >
                              <Users className="w-3.5 h-3.5 text-amber-600" />
                              <span>{empCount} موظف</span>
                            </button>
                          </div>

                          {/* Manager Info & Contact */}
                          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                            {dept.managerName && (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400 font-semibold">رئيس القسم:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {dept.managerName}
                                </span>
                              </div>
                            )}
                            {dept.phone && (
                              <div className="flex items-center gap-1 font-mono text-[11px]">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{dept.phone}</span>
                              </div>
                            )}
                            {dept.email && (
                              <div className="flex items-center gap-1 font-mono text-[11px]">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span className="truncate max-w-[150px]">{dept.email}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Actions Footer */}
                        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (onSelectDepartmentFilter) {
                                onSelectDepartmentFilter(dept.name);
                                onClose();
                              }
                            }}
                            className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>استعراض موظفي القسم</span>
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(dept)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                              title="تعديل بيانات القسم"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartDelete(dept)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="حذف القسم"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW MODE: ADD or EDIT */}
          {(viewMode === 'add' || viewMode === 'edit') && (
            <form onSubmit={handleSubmitForm} className="space-y-4 max-w-2xl mx-auto">
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>
                    {viewMode === 'add' ? 'إضافة تشكيل أو قسم إداري جديد' : `تعديل بيانات (${editingDept?.name})`}
                  </span>
                </div>
                {viewMode === 'edit' && (
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1">
                    * ملاحظة هامة: في حال تعديل اسم القسم، سيقوم النظام تلقائياً بتحديث سجلات كافة الموظفين التابعين له
                    بشكل فوري وحفظ السجل الزمني.
                  </p>
                )}
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Department Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اسم القسم أو التشكيل الإداري <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="مثال: قسم الشؤون الهندسية والمشاريع"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>

                {/* Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الرمز الكودي المختصر
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="ENG"
                    maxLength={6}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-black uppercase text-center focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
              </div>

              {/* Manager Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اسم مدير القسم أو رئيس التشكيل
                  </label>
                  <input
                    type="text"
                    value={formManagerName}
                    onChange={(e) => setFormManagerName(e.target.value)}
                    placeholder="مثال: المهندس حيدر جاسم الموسوي"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم الهاتف أو البدالة
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="مثال: 07801234567 أو داخلي 104"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
              </div>

              {/* Email & Color Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    البريد الإلكتروني الرسمي للقسم
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="dept.engineering@ministry.gov.iq"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-amber-600" />
                    <span>لون التمييز البصري للقسم</span>
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setFormColor(c.id)}
                        className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                          c.bg
                        } ${c.border} ${formColor === c.id ? `ring-2 ${c.ring} scale-110 shadow-xs` : 'opacity-80 hover:opacity-100'}`}
                        title={c.label}
                      >
                        {formColor === c.id && <CheckCircle2 className={`w-3.5 h-3.5 ${c.text}`} />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description & Tasks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  توصيف القسم والمهام الإدارية
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="نبذة عن اختصاصات القسم وشعبه الإدارية..."
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري الحفظ والمزامنة...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{viewMode === 'add' ? 'إنشاء القسم وتعميمه' : 'حفظ التعديلات وتحديث الموظفين'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* VIEW MODE: BULK TRANSFER */}
          {viewMode === 'transfer' && (
            <form onSubmit={handleBulkTransfer} className="space-y-4 max-w-2xl mx-auto">
              <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/70">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200">
                  <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                  <span>نقل جماعي لكافة موظفي قسم إلى قسم آخر (إعادة الهيكلة)</span>
                </div>
                <p className="text-[11px] text-blue-800 dark:text-blue-300 mt-1">
                  تتيح هذه الأداة نقل موظفي أي قسم بالكامل إلى قسم بديل مع تسجيل الحركة رسمياً في السجل التاريخي لكل موظف.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Source Department */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    القسم المصدر (المراد نقل كوادره)
                  </label>
                  <select
                    value={transferFromDept}
                    onChange={(e) => setTransferFromDept(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  >
                    <option value="">-- اختر القسم المصدر --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name} ({employeeCountByDept[d.name] || 0} موظف)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Department */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    القسم البديل (الوجهة الجديدة)
                  </label>
                  <select
                    value={transferToDept}
                    onChange={(e) => setTransferToDept(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  >
                    <option value="">-- اختر القسم الوجهة --</option>
                    {departments
                      .filter((d) => d.name !== transferFromDept)
                      .map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name} ({employeeCountByDept[d.name] || 0} موظف)
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  أمر النقل أو الملاحظات الرسمية
                </label>
                <input
                  type="text"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="مثال: أمر إداري ذي العدد 1234 في 2026/01/15"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              {transferFromDept && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                  <span className="text-slate-500">عدد الموظفين المتأثرين بالنقل:</span>{' '}
                  <span className="font-black text-amber-600 dark:text-amber-400">
                    {employeeCountByDept[transferFromDept] || 0} موظف
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  رجوع للقائمة
                </button>
                <button
                  type="submit"
                  disabled={isTransferring || !transferFromDept || !transferToDept}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isTransferring ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري النقل والتحديث...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>تنفيذ نقل الكادر فوراً</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* DELETE CONFIRMATION DIALOG MODAL (OVERLAY) */}
        {deletingDept && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900/80 rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    تأكيد حذف القسم ({deletingDept.name})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    الرمز: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{deletingDept.code || '-'}</span>
                  </p>
                </div>
              </div>

              {/* Check if department has employees */}
              {(employeeCountByDept[deletingDept.name] || 0) > 0 ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                    <p className="font-bold flex items-center gap-1.5">
                      <BadgeAlert className="w-4 h-4 text-amber-600" />
                      <span>
                        يوجد حالياً ({employeeCountByDept[deletingDept.name]}) موظف مسجلين في هذا القسم!
                      </span>
                    </p>
                    <p className="mt-1 text-[11px]">
                      للحفاظ على سلامة البيانات الوظيفية، يرجى اختيار القسم البديل لنقل هؤلاء الموظفين إليه تلقائياً قبل الحذف:
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      القسم البديل لنقل الموظفين إليه <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={transferTargetDeptName}
                      onChange={(e) => setTransferTargetDeptName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    >
                      <option value="">-- اختر القسم البديل --</option>
                      {departments
                        .filter((d) => d.id !== deletingDept.id)
                        .map((d) => (
                          <option key={d.id} value={d.name}>
                            {d.name} ({employeeCountByDept[d.name] || 0} موظف حالياً)
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  هذا القسم فارغ ولا يحتوي على أي موظفين حالياً. هل أنت متأكد من حذفه نهائياً من دليل المنظومة؟
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeletingDept(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={
                    isDeleting ||
                    ((employeeCountByDept[deletingDept.name] || 0) > 0 && !transferTargetDeptName)
                  }
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري الحذف والنقل...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>تأكيد الحذف</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>الربط النشط: كافة التعديلات تنعكس فورياً على بطاقات وسجلات الموظفين</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-xs font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
