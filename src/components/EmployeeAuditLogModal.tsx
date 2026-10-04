import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  History,
  ShieldCheck,
  Search,
  X,
  Filter,
  Download,
  Printer,
  Calendar,
  User,
  Building2,
  GraduationCap,
  DollarSign,
  Briefcase,
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Clock,
  Sparkles,
  PlusCircle,
  Eye,
} from 'lucide-react';
import { CareerTimelineEvent, Employee, UserAccount } from '../types';
import { employeeService } from '../services/employeeService';

interface EmployeeAuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmployeeId?: string;
  employees: Employee[];
  currentUser?: UserAccount;
}

type CategoryFilter =
  | 'all'
  | 'department_change'
  | 'education_change'
  | 'salary_change'
  | 'title_change'
  | 'hire'
  | 'allowance'
  | 'promotion'
  | 'status_change';

type DateFilter = 'all' | 'today' | 'last_7_days' | 'last_30_days';

export const EmployeeAuditLogModal: React.FC<EmployeeAuditLogModalProps> = ({
  isOpen,
  onClose,
  initialEmployeeId,
  employees,
  currentUser,
}) => {
  const [logs, setLogs] = useState<CareerTimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(initialEmployeeId || 'all');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [selectedPerformer, setSelectedPerformer] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<DateFilter>('all');
  const [isAddingNote, setIsAddingNote] = useState<boolean>(false);
  const [noteForm, setNoteForm] = useState({
    employeeId: '',
    title: 'ملاحظة تدقيق إداري ورقابي',
    description: '',
    orderNumber: '',
  });

  // Sync initialEmployeeId if provided
  useEffect(() => {
    if (initialEmployeeId) {
      setSelectedEmployeeId(initialEmployeeId);
    } else {
      setSelectedEmployeeId('all');
    }
  }, [initialEmployeeId, isOpen]);

  // Load audit logs from database
  const loadAuditLogs = async () => {
    setIsLoading(true);
    try {
      const data = await employeeService.getAllAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAuditLogs();
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Extract unique performers for the filter dropdown
  const uniquePerformers = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((log) => {
      if (log.performedBy) {
        set.add(log.performedBy.trim());
      }
    });
    return Array.from(set);
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Employee filter
      if (selectedEmployeeId !== 'all' && log.employeeId !== selectedEmployeeId) {
        return false;
      }

      // 2. Category filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'department_change' && log.category !== 'department_change') return false;
        if (selectedCategory === 'education_change' && log.category !== 'education_change') return false;
        if (selectedCategory === 'salary_change' && log.category !== 'salary_change') return false;
        if (selectedCategory === 'title_change' && log.category !== 'title_change') return false;
        if (selectedCategory === 'hire' && log.category !== 'hire') return false;
        if (selectedCategory === 'allowance' && log.category !== 'allowance') return false;
        if (selectedCategory === 'promotion' && log.category !== 'promotion') return false;
        if (selectedCategory === 'status_change' && log.category !== 'status_change') return false;
      }

      // 3. Performer filter
      if (selectedPerformer !== 'all' && log.performedBy?.trim() !== selectedPerformer) {
        return false;
      }

      // 4. Date filter
      if (selectedDateFilter !== 'all') {
        const logTime = new Date(log.createdAt || log.date).getTime();
        const now = Date.now();
        if (selectedDateFilter === 'today') {
          const oneDayAgo = now - 24 * 60 * 60 * 1000;
          if (logTime < oneDayAgo) return false;
        } else if (selectedDateFilter === 'last_7_days') {
          const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
          if (logTime < sevenDaysAgo) return false;
        } else if (selectedDateFilter === 'last_30_days') {
          const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
          if (logTime < thirtyDaysAgo) return false;
        }
      }

      // 5. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchEmpName = log.employeeName?.toLowerCase().includes(q);
        const matchEmpNum = log.employeeNumber?.toLowerCase().includes(q);
        const matchTitle = log.title?.toLowerCase().includes(q);
        const matchDesc = log.description?.toLowerCase().includes(q);
        const matchPerformer = log.performedBy?.toLowerCase().includes(q);
        const matchOld = log.oldValue?.toLowerCase().includes(q);
        const matchNew = log.newValue?.toLowerCase().includes(q);
        const matchOrder = log.orderNumber?.toLowerCase().includes(q);
        if (
          !matchEmpName &&
          !matchEmpNum &&
          !matchTitle &&
          !matchDesc &&
          !matchPerformer &&
          !matchOld &&
          !matchNew &&
          !matchOrder
        ) {
          return false;
        }
      }

      return true;
    });
  }, [logs, selectedEmployeeId, selectedCategory, selectedPerformer, selectedDateFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    let deptCount = 0;
    let eduCount = 0;
    let salaryCount = 0;
    let otherCount = 0;

    logs.forEach((log) => {
      if (log.category === 'department_change') deptCount++;
      else if (log.category === 'education_change') eduCount++;
      else if (log.category === 'salary_change') salaryCount++;
      else otherCount++;
    });

    return {
      total: logs.length,
      deptCount,
      eduCount,
      salaryCount,
      otherCount,
    };
  }, [logs]);

  // Format Iraqi/Arabic date & exact time
  const formatDateTime = (isoStr?: string, dateStr?: string): { datePart: string; timePart: string; fullText: string } => {
    try {
      const d = isoStr ? new Date(isoStr) : dateStr ? new Date(dateStr) : new Date();
      if (isNaN(d.getTime())) return { datePart: dateStr || '—', timePart: '', fullText: dateStr || '—' };

      const datePart = d.toLocaleDateString('ar-IQ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const timePart = d.toLocaleTimeString('ar-IQ', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

      return { datePart, timePart, fullText: `${datePart} - ${timePart}` };
    } catch {
      return { datePart: dateStr || '', timePart: '', fullText: dateStr || '' };
    }
  };

  // Relative time helper
  const getRelativeTime = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const now = Date.now();
      const past = new Date(isoStr).getTime();
      const diffMs = now - past;
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHr = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHr / 24);

      if (diffSec < 60) return 'منذ لحظات';
      if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
      if (diffHr < 24) return `منذ ${diffHr} ساعة`;
      if (diffDay === 1) return 'منذ يوم';
      if (diffDay === 2) return 'منذ يومين';
      if (diffDay < 11) return `منذ ${diffDay} أيام`;
      return `منذ ${diffDay} يوماً`;
    } catch {
      return '';
    }
  };

  // Badge icon & color resolver
  const getCategoryMeta = (cat: CareerTimelineEvent['category']) => {
    switch (cat) {
      case 'department_change':
        return {
          label: 'تغيير القسم الإداري',
          icon: Building2,
          bg: 'bg-blue-50 dark:bg-blue-950/60',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-700 dark:text-blue-300',
          dot: 'bg-blue-500',
        };
      case 'education_change':
        return {
          label: 'تحديث الشهادة والمؤهل',
          icon: GraduationCap,
          bg: 'bg-purple-50 dark:bg-purple-950/60',
          border: 'border-purple-200 dark:border-purple-800',
          text: 'text-purple-700 dark:text-purple-300',
          dot: 'bg-purple-500',
        };
      case 'salary_change':
        return {
          label: 'تعديل الراتب والدرجة',
          icon: DollarSign,
          bg: 'bg-emerald-50 dark:bg-emerald-950/60',
          border: 'border-emerald-200 dark:border-emerald-800',
          text: 'text-emerald-700 dark:text-emerald-300',
          dot: 'bg-emerald-500',
        };
      case 'title_change':
        return {
          label: 'تغيير العنوان الوظيفي',
          icon: Briefcase,
          bg: 'bg-amber-50 dark:bg-amber-950/60',
          border: 'border-amber-200 dark:border-amber-800',
          text: 'text-amber-700 dark:text-amber-300',
          dot: 'bg-amber-500',
        };
      case 'hire':
        return {
          label: 'التعيين والمباشرة',
          icon: CheckCircle2,
          bg: 'bg-teal-50 dark:bg-teal-950/60',
          border: 'border-teal-200 dark:border-teal-800',
          text: 'text-teal-700 dark:text-teal-300',
          dot: 'bg-teal-500',
        };
      case 'allowance':
        return {
          label: 'علاوة سنوية',
          icon: Award,
          bg: 'bg-sky-50 dark:bg-sky-950/60',
          border: 'border-sky-200 dark:border-sky-800',
          text: 'text-sky-700 dark:text-sky-300',
          dot: 'bg-sky-500',
        };
      case 'promotion':
        return {
          label: 'ترفيع وظيفي',
          icon: TrendingUp,
          bg: 'bg-indigo-50 dark:bg-indigo-950/60',
          border: 'border-indigo-200 dark:border-indigo-800',
          text: 'text-indigo-700 dark:text-indigo-300',
          dot: 'bg-indigo-500',
        };
      case 'status_change':
        return {
          label: 'تعديل الحالة / العقد',
          icon: AlertTriangle,
          bg: 'bg-rose-50 dark:bg-rose-950/60',
          border: 'border-rose-200 dark:border-rose-800',
          text: 'text-rose-700 dark:text-rose-300',
          dot: 'bg-rose-500',
        };
      default:
        return {
          label: 'تحديث بيانات إدارية',
          icon: FileText,
          bg: 'bg-slate-100 dark:bg-slate-800',
          border: 'border-slate-200 dark:border-slate-700',
          text: 'text-slate-700 dark:text-slate-300',
          dot: 'bg-slate-400',
        };
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = [
      'المعرف الفريد',
      'اسم الموظف',
      'الرقم الوظيفي',
      'القسم',
      'نوع العملية',
      'عنوان العملية',
      'القيمة السابقة',
      'القيمة الجديدة',
      'المستخدم المسؤول عن التعديل',
      'تاريخ العملية',
      'توقيت التعديل الدقيق (ISO)',
      'رقم الأمر الإداري',
      'تفاصيل التعديل',
    ];

    const rows = filteredLogs.map((log) => [
      `"${log.id || ''}"`,
      `"${(log.employeeName || '').replace(/"/g, '""')}"`,
      `"${(log.employeeNumber || '').replace(/"/g, '""')}"`,
      `"${(log.department || '').replace(/"/g, '""')}"`,
      `"${(getCategoryMeta(log.category).label || '').replace(/"/g, '""')}"`,
      `"${(log.title || '').replace(/"/g, '""')}"`,
      `"${(log.oldValue || '').replace(/"/g, '""')}"`,
      `"${(log.newValue || '').replace(/"/g, '""')}"`,
      `"${(log.performedBy || 'مدير النظام').replace(/"/g, '""')}"`,
      `"${log.date || ''}"`,
      `"${log.createdAt || ''}"`,
      `"${(log.orderNumber || '').replace(/"/g, '""')}"`,
      `"${(log.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `سجل_تتبع_تعديلات_الموظفين_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  // Add manual administrative audit note
  const handleAddManualNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteForm.employeeId || !noteForm.description.trim()) {
      return;
    }

    const targetEmp = employees.find((e) => e.id === noteForm.employeeId);
    if (!targetEmp) return;

    const performer = currentUser?.fullName || currentUser?.username || 'مدير النظام';

    await employeeService.logManualAuditEvent({
      employeeId: targetEmp.id,
      employeeName: targetEmp.fullName,
      employeeNumber: targetEmp.employeeNumber,
      department: targetEmp.department,
      title: noteForm.title || 'ملاحظة تدقيق إداري ورقابي',
      description: noteForm.description.trim(),
      orderNumber: noteForm.orderNumber.trim() || undefined,
      performedBy: performer,
    });

    setNoteForm({
      employeeId: '',
      title: 'ملاحظة تدقيق إداري ورقابي',
      description: '',
      orderNumber: '',
    });
    setIsAddingNote(false);
    loadAuditLogs();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150 print:p-0 print:bg-white"
      dir="rtl"
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-h-none">
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  سجل تتبع التعديلات والعمليات الرقابية (Audit Log)
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800">
                  {stats.total} قيد موثق
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                توثيق رسمي لكافة العمليات الإدارية والمالية على ملفات الموظفين (الأقسام، الشهادات، والرواتب) مع هوية المسؤول وتوقيته
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => setIsAddingNote(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="إضافة ملاحظة أو قيد تدقيق يدوي"
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>إضافة قيد تدقيق</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredLogs.length === 0}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="تصدير السجل إلى Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>تصدير Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={filteredLogs.length === 0}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="طباعة محضر التدقيق الرسمي"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة</span>
            </button>

            <button
              type="button"
              onClick={loadAuditLogs}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="تحديث السجل"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SUMMARY STATS BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-6 py-3 bg-slate-100/60 dark:bg-slate-900/40 border-b border-slate-200/80 dark:border-slate-800 text-xs">
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-medium">إجمالي القيود:</span>
            <span className="font-bold font-mono text-slate-900 dark:text-white text-sm">
              {stats.total}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>نقل الأقسام:</span>
            </span>
            <span className="font-bold font-mono text-blue-700 dark:text-blue-300 text-sm">
              {stats.deptCount}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>تحديث الشهادات:</span>
            </span>
            <span className="font-bold font-mono text-purple-700 dark:text-purple-300 text-sm">
              {stats.eduCount}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              <span>تعديلات الرواتب:</span>
            </span>
            <span className="font-bold font-mono text-emerald-700 dark:text-emerald-300 text-sm">
              {stats.salaryCount}
            </span>
          </div>
        </div>

        {/* PRINT ONLY GOVERNMENT EMBLEM & HEADER */}
        <div className="hidden print:block p-6 border-b-2 border-black text-center space-y-1">
          <h1 className="text-xl font-bold text-black">جمهورية العراق - ديوان الخدمة المدنية</h1>
          <h2 className="text-base font-semibold text-black">
            سجل تتبع التعديلات والعمليات الرقابية الرسمية على ملفات الموظفين (Audit Log)
          </h2>
          <div className="flex justify-between text-xs text-black pt-2 font-mono">
            <span>تاريخ استخراج التقرير: {new Date().toLocaleDateString('ar-IQ')}</span>
            <span>عدد العمليات المضمنة: {filteredLogs.length}</span>
            <span>المستخدم المستخرج: {currentUser?.fullName || 'مدير النظام'}</span>
          </div>
        </div>

        {/* FILTERS & SEARCH ROW */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 print:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* 1. Live Search */}
            <div className="sm:col-span-4 relative">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم، الرقم الوظيفي، أو المستخدم المسؤول..."
                className="w-full pr-9 pl-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-slate-900 dark:text-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 2. Employee Selector */}
            <div className="sm:col-span-3">
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-slate-900 dark:text-white"
              >
                <option value="all">جميع الموظفين ({employees.length})</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.employeeNumber})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Operation Category */}
            <div className="sm:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as CategoryFilter)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-slate-900 dark:text-white"
              >
                <option value="all">كافة أنواع العمليات</option>
                <option value="department_change">🏢 تغيير القسم الإداري</option>
                <option value="education_change">🎓 تحديث الشهادة والمؤهل</option>
                <option value="salary_change">💰 تعديل الراتب والدرجة</option>
                <option value="title_change">💼 تغيير العنوان الوظيفي</option>
                <option value="hire">✅ التعيين والمباشرة</option>
                <option value="allowance">🎖️ العلاوات السنوية</option>
                <option value="promotion">📈 الترقيات الإدارية</option>
                <option value="status_change">⚠️ الحالة ونوع العقد</option>
              </select>
            </div>

            {/* 4. Performer / User */}
            <div className="sm:col-span-2">
              <select
                value={selectedPerformer}
                onChange={(e) => setSelectedPerformer(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-slate-900 dark:text-white"
              >
                <option value="all">كافة المشرفين</option>
                {uniquePerformers.map((performer) => (
                  <option key={performer} value={performer}>
                    {performer}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Date Tabs & Clear filters */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <span className="text-[11px] text-slate-400 px-2 font-medium">الفترة:</span>
              <button
                type="button"
                onClick={() => setSelectedDateFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedDateFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                الكل
              </button>
              <button
                type="button"
                onClick={() => setSelectedDateFilter('today')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedDateFilter === 'today'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                اليوم
              </button>
              <button
                type="button"
                onClick={() => setSelectedDateFilter('last_7_days')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedDateFilter === 'last_7_days'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                آخر 7 أيام
              </button>
              <button
                type="button"
                onClick={() => setSelectedDateFilter('last_30_days')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedDateFilter === 'last_30_days'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                آخر 30 يوماً
              </button>
            </div>

            {(selectedEmployeeId !== 'all' ||
              selectedCategory !== 'all' ||
              selectedPerformer !== 'all' ||
              selectedDateFilter !== 'all' ||
              searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedEmployeeId('all');
                  setSelectedCategory('all');
                  setSelectedPerformer('all');
                  setSelectedDateFilter('all');
                  setSearchQuery('');
                }}
                className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>إعادة ضبط الفلاتر</span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* AUDIT LOG LIST BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 print:p-0">
          {isLoading ? (
            <div className="py-20 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-amber-500 mb-3" />
              <p className="text-xs font-semibold">جارٍ تحميل قيود سجل تتبع التعديلات...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-20 text-center text-slate-400 dark:text-slate-500">
              <ShieldCheck className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                لا توجد عمليات تطابق معايير البحث الحالية
              </p>
              <p className="text-xs text-slate-400 mt-1">
                جرب تغيير خيارات التصفية أو اختيار موظف آخر أو إعادة ضبط الفلاتر
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const meta = getCategoryMeta(log.category);
              const Icon = meta.icon;
              const dt = formatDateTime(log.createdAt, log.date);
              const relative = getRelativeTime(log.createdAt);

              return (
                <div
                  key={log.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs hover:border-amber-500/40 transition-colors space-y-3 print:border-b print:rounded-none print:shadow-none print:p-3"
                >
                  {/* Top Bar: Category badge, Employee info, and exact timestamp */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${meta.bg} ${meta.text} border ${meta.border}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{meta.label}</span>
                      </span>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {log.employeeName || 'موظف غير مسمى'}
                        </span>
                        <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="font-mono text-slate-500 dark:text-slate-400 font-semibold">
                          {log.employeeNumber || 'IQ-GOV'}
                        </span>
                        {log.department && (
                          <>
                            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                            <span className="text-slate-500 dark:text-slate-400">{log.department}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Exact Timestamp */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span title={log.createdAt || log.date}>{dt.fullText}</span>
                      {relative && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 font-sans">
                          {relative}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Operation Title */}
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {log.title}
                  </h3>

                  {/* Visual Diff: Old Value -> New Value */}
                  {(log.oldValue || log.newValue) && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-wrap items-center gap-2.5 text-xs">
                      {log.oldValue && (
                        <div className="flex-1 min-w-[200px] p-2 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/40">
                          <div className="text-[10px] font-semibold text-rose-700 dark:text-rose-400 mb-0.5">
                            القيمة السابقة:
                          </div>
                          <div className="text-slate-800 dark:text-slate-200 font-medium">
                            {log.oldValue}
                          </div>
                        </div>
                      )}

                      {log.oldValue && log.newValue && (
                        <div className="text-slate-400 dark:text-slate-500">
                          <ArrowLeft className="w-4 h-4" />
                        </div>
                      )}

                      {log.newValue && (
                        <div className="flex-1 min-w-[200px] p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40">
                          <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 mb-0.5">
                            القيمة الجديدة المعتمدة:
                          </div>
                          <div className="text-slate-900 dark:text-white font-bold">
                            {log.newValue}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Administrative Description */}
                  {log.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {log.description}
                    </p>
                  )}

                  {/* Footer Meta: Responsible User & Order Reference */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                    {/* RESPONSIBLE USER (اسم المستخدم المسؤول عن التعديل) */}
                    <div className="flex items-center gap-1.5 font-medium">
                      <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                        <User className="w-3 h-3" />
                      </div>
                      <span className="text-slate-500 dark:text-slate-400">المسؤول عن التعديل:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {log.performedBy || 'مدير النظام'}
                      </span>
                    </div>

                    {/* Order Reference */}
                    {log.orderNumber && (
                      <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px] flex items-center gap-1">
                        <span>الأمر الإداري:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          {log.orderNumber}
                        </span>
                        {log.orderDate && <span>بتاريخ ({log.orderDate})</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* PRINT FOOTER */}
        <div className="hidden print:flex justify-between items-center p-6 border-t-2 border-black text-xs text-black">
          <div className="text-center w-48">
            <p className="font-bold">مسؤول شؤون الموظفين</p>
            <p className="mt-8">التوقيع: ___________________</p>
          </div>
          <div className="text-center w-48">
            <p className="font-bold">مدير قسم التدقيق والرقابة</p>
            <p className="mt-8">التوقيع: ___________________</p>
          </div>
          <div className="text-center w-48">
            <p className="font-bold">الختم الرسمي للمؤسسة</p>
            <p className="mt-8">الختم: [                      ]</p>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="text-slate-500 dark:text-slate-400 font-mono">
            عرض {filteredLogs.length} من أصل {logs.length} قيد مسجل في قاعدة البيانات المركزية
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>

      {/* SUB-MODAL: ADD MANUAL AUDIT NOTE */}
      {isAddingNote && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  إضافة قيد تدقيق أو ملاحظة رقابية رسمية
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingNote(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddManualNoteSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  اختر الموظف المعني: <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={noteForm.employeeId}
                  onChange={(e) => setNoteForm({ ...noteForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                >
                  <option value="">-- اضغط لتحديد الموظف --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeNumber}) - {emp.department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  عنوان العملية / الملاحظة:
                </label>
                <input
                  type="text"
                  required
                  value={noteForm.title}
                  onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                  placeholder="مثال: تدقيق مطابقة وثيقة التخرج أو تعديل المخصصات"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الأمر أو المرجع الإداري (اختياري):
                </label>
                <input
                  type="text"
                  value={noteForm.orderNumber}
                  onChange={(e) => setNoteForm({ ...noteForm, orderNumber: e.target.value })}
                  placeholder="مثال: أمر إداري رقابي 77/تدقيق"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  نص الملاحظة والتفاصيل الإدارية: <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={noteForm.description}
                  onChange={(e) => setNoteForm({ ...noteForm, description: e.target.value })}
                  placeholder="اكتب التوصيف الدقيق للإجراء أو التعديل الرقابي..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  سيتم توثيق القيد باسمك الرسمي (<strong>{currentUser?.fullName || 'مدير النظام'}</strong>) مع الطابع الزمني المعتمد فوراً.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingNote(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                >
                  حفظ وتوثيق القيد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
