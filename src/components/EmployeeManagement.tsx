import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Calendar,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  Filter,
  X,
  Plus,
  RefreshCw,
  Sparkles,
  FileSpreadsheet,
  AlertCircle,
  HardDrive,
  BadgeCheck,
  UploadCloud,
  Download,
  Layers,
  CheckSquare,
  Square,
  AlertTriangle,
  SlidersHorizontal,
  ArrowUpDown,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  CalendarRange,
  Home,
  FileText,
  Zap,
  Settings as SettingsIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Employee, ContractType, AppearanceSettings, LeaveRulesSettings, MovementCategory, WorkspaceTab } from '../types';
import {
  getAllEmployees,
  saveEmployee,
  deleteEmployeeById,
  deleteEmployeesBatch,
  SAMPLE_TEST_EMPLOYEE,
  DEFAULT_APPEARANCE_SETTINGS,
  DEFAULT_LEAVE_RULES,
} from '../db/indexedDB';
import { CsvImportModal } from './CsvImportModal';
import { BatchEditModal } from './BatchEditModal';
import { AddMovementModal } from './AddMovementModal';

interface EmployeeManagementProps {
  appearance?: AppearanceSettings;
  leaveRules?: LeaveRulesSettings;
  onEmployeesChanged?: (employees: Employee[]) => void;
  onBackToDashboard?: () => void;
  onNavigate?: (tab: WorkspaceTab) => void;
}

// Initial sample Iraqi governmental employees if database is fresh
const INITIAL_DEMO_EMPLOYEES: Employee[] = [

  SAMPLE_TEST_EMPLOYEE,
  {
    id: 'EMP-2026-002',
    employeeNumber: 'IQ-GOV-98215',
    fullName: 'د. زينب عبد الحسين التميمي',
    department: 'قسم الشؤون القانونية والإدارية',
    division: 'شعبة العقود والمناقصات',
    jobTitle: 'مشاور قانوني أقدم / مدير قسم',
    contractType: 'permanent',
    hireDate: '2015-09-01',
    annualBalanceLimit: 36,
    usedBalance: 6,
    remainingBalance: 30,
    monthlyRate: 3,
    isAccumulative: true,
    phone: '07709876543',
    notes: 'ملاك دائم - إشراف وتدقيق قانوني مركزي',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'EMP-2026-003',
    employeeNumber: 'IQ-GOV-98216',
    fullName: 'أحمد مهدي صالح الجبوري',
    department: 'قسم الموارد البشرية والخدمة المدنية',
    division: 'شعبة الحضور والإجازات',
    jobTitle: 'ملاحظ فني - مدخل بيانات',
    contractType: 'contract',
    hireDate: '2023-01-10',
    annualBalanceLimit: 30,
    usedBalance: 8,
    remainingBalance: 22,
    monthlyRate: 4,
    isAccumulative: false,
    phone: '07812345678',
    notes: 'عقد وزاري وفق قرار 315 - غير تراكمي',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'EMP-2026-004',
    employeeNumber: 'IQ-GOV-98217',
    fullName: 'مروة قاسم كاظم الساعدي',
    department: 'شعبة تكنولوجيا المعلومات والحاسبة',
    division: 'وحدة البرمجة وتطوير الأنظمة',
    jobTitle: 'معاون مبرمج / مهندس برمجيات',
    contractType: 'contract',
    hireDate: '2024-02-15',
    annualBalanceLimit: 30,
    usedBalance: 2,
    remainingBalance: 28,
    monthlyRate: 4,
    isAccumulative: false,
    phone: '07733445566',
    notes: 'عقد وزاري - مسؤولة دعم منظومة الحضور',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

interface EmployeeFormData {
  id?: string;
  employeeNumber: string;
  fullName: string;
  department: string;
  division: string;
  jobTitle: string;
  contractType: ContractType;
  hireDate: string;
  annualBalanceLimit: number;
  usedBalance: number;
  monthlyRate: number;
  isAccumulative: boolean;
  phone: string;
  notes: string;
}

const DEFAULT_FORM_DATA: EmployeeFormData = {
  employeeNumber: '',
  fullName: '',
  department: 'قسم الموارد البشرية',
  division: 'شعبة شؤون الموظفين',
  jobTitle: 'معاون ملاحظ إداري',
  contractType: 'permanent',
  hireDate: new Date().toISOString().split('T')[0],
  annualBalanceLimit: 36,
  usedBalance: 0,
  monthlyRate: 3,
  isAccumulative: true,
  phone: '',
  notes: '',
};

export const EmployeeManagement: React.FC<EmployeeManagementProps> = ({
  appearance = DEFAULT_APPEARANCE_SETTINGS,
  leaveRules = DEFAULT_LEAVE_RULES,
  onEmployeesChanged,
  onBackToDashboard,
  onNavigate,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Advanced Multi-filter Search state
  const [searchTerm, setSearchTerm] = useState<string>(''); // Name, employee number, job title, phone
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [hireDateSearch, setHireDateSearch] = useState<string>(''); // Live text matching hire date (e.g. 2024, 2023-01)
  const [hireDateFrom, setHireDateFrom] = useState<string>(''); // Date range start
  const [hireDateTo, setHireDateTo] = useState<string>(''); // Date range end
  const [selectedContractType, setSelectedContractType] = useState<string>('all');
  const [selectedBalanceStatus, setSelectedBalanceStatus] = useState<string>('all'); // all, low, sufficient, zero
  const [sortBy, setSortBy] = useState<'name_asc' | 'hireDate_desc' | 'hireDate_asc' | 'balance_desc' | 'balance_asc'>('name_asc');
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState<boolean>(false);
  const [movementInitialCategory, setMovementInitialCategory] = useState<MovementCategory>('attendance');

  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(DEFAULT_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Batch & Import State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isBatchEditModalOpen, setIsBatchEditModalOpen] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedMovementEmployeeId, setSelectedMovementEmployeeId] = useState<string | undefined>(undefined);

  // Fetch employees from IndexedDB
  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      let data = await getAllEmployees();
      if (data.length === 0) {
        // Auto-seed demo government records if first run
        for (const emp of INITIAL_DEMO_EMPLOYEES) {
          await saveEmployee(emp);
        }
        data = await getAllEmployees();
      }
      setEmployees(data);
      onEmployeesChanged?.(data);
    } catch (err: any) {
      console.error('Failed to load employees:', err);
      setErrorMessage('تعذر تحميل بيانات الموظفين من IndexedDB');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  // Multi-selection handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredEmployees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEmployees.map((e) => e.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Batch delete confirm
  const handleConfirmBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBatchDeleting(true);
    try {
      await deleteEmployeesBatch(selectedIds);
      await loadEmployees();
      setSelectedIds([]);
      setShowBatchDeleteConfirm(false);
      setSuccessMessage(`تم حذف (${selectedIds.length}) من سجلات الموظفين المحددة بنجاح.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage('فشل في حذف مجموعة الموظفين المحددة');
    } finally {
      setIsBatchDeleting(false);
    }
  };

  // Export current list to CSV
  const handleExportCSV = (exportSelectedOnly = false) => {
    const listToExport = exportSelectedOnly
      ? employees.filter((e) => selectedIds.includes(e.id))
      : filteredEmployees;

    if (listToExport.length === 0) return;

    const headers =
      'الرقم الوظيفي,الاسم الكامل,القسم,الشعبة,العنوان الوظيفي,نوع التوظيف,تاريخ المباشرة,الحد السنوي,المستخدم,المتبقي,الهاتف\n';
    const rows = listToExport
      .map((e) =>
        `"${e.employeeNumber}","${e.fullName}","${e.department}","${e.division || ''}","${
          e.jobTitle
        }","${e.contractType === 'permanent' ? 'ملاك دائم' : 'عقد وزاري'}","${e.hireDate}","${
          e.annualBalanceLimit
        }","${e.usedBalance}","${e.remainingBalance}","${e.phone || ''}"`
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `قائمة_الموظفين_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Department options and counts
  const departmentStats = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach((emp) => {
      if (emp.department) {
        counts[emp.department] = (counts[emp.department] || 0) + 1;
      }
    });
    return counts;
  }, [employees]);

  const departmentOptions = useMemo(() => {
    return Object.keys(departmentStats).sort();
  }, [departmentStats]);

  // Multi-filtered & Sorted employees list supporting name, department, hire date in real-time
  const filteredEmployees = useMemo(() => {
    const result = employees.filter((emp) => {
      // 1. Real-time Name, Employee Number, Job Title, Phone filter
      const term = searchTerm.trim().toLowerCase();
      const matchSearch =
        term === '' ||
        emp.fullName.toLowerCase().includes(term) ||
        emp.employeeNumber.toLowerCase().includes(term) ||
        emp.jobTitle.toLowerCase().includes(term) ||
        (emp.phone && emp.phone.includes(term));

      // 2. Real-time Department filter
      const matchDept =
        selectedDepartment === 'all' || emp.department === selectedDepartment;

      // 3. Real-time Hire Date text match (e.g. "2024", "2023-01", etc.)
      const hireTerm = hireDateSearch.trim();
      const matchHireText =
        hireTerm === '' ||
        (emp.hireDate && emp.hireDate.toLowerCase().includes(hireTerm.toLowerCase()));

      // 4. Hire Date Range (From / To)
      let matchHireRange = true;
      if (hireDateFrom && emp.hireDate) {
        if (emp.hireDate < hireDateFrom) matchHireRange = false;
      }
      if (hireDateTo && emp.hireDate) {
        if (emp.hireDate > hireDateTo) matchHireRange = false;
      }

      // 5. Contract type filter
      const matchContract =
        selectedContractType === 'all' || emp.contractType === selectedContractType;

      // 6. Balance status filter
      let matchBalance = true;
      if (selectedBalanceStatus === 'low') {
        matchBalance = (emp.remainingBalance || 0) <= 5 && (emp.remainingBalance || 0) > 0;
      } else if (selectedBalanceStatus === 'sufficient') {
        matchBalance = (emp.remainingBalance || 0) > 15;
      } else if (selectedBalanceStatus === 'zero') {
        matchBalance = (emp.remainingBalance || 0) <= 0;
      }

      return (
        matchSearch &&
        matchDept &&
        matchHireText &&
        matchHireRange &&
        matchContract &&
        matchBalance
      );
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'name_asc') {
        return a.fullName.localeCompare(b.fullName, 'ar');
      }
      if (sortBy === 'hireDate_desc') {
        return (b.hireDate || '').localeCompare(a.hireDate || '');
      }
      if (sortBy === 'hireDate_asc') {
        return (a.hireDate || '').localeCompare(b.hireDate || '');
      }
      if (sortBy === 'balance_desc') {
        return (b.remainingBalance || 0) - (a.remainingBalance || 0);
      }
      if (sortBy === 'balance_asc') {
        return (a.remainingBalance || 0) - (b.remainingBalance || 0);
      }
      return 0;
    });

    return result;
  }, [
    employees,
    searchTerm,
    selectedDepartment,
    hireDateSearch,
    hireDateFrom,
    hireDateTo,
    selectedContractType,
    selectedBalanceStatus,
    sortBy,
  ]);

  // Check if any filter is actively applied
  const isAnyFilterActive = useMemo(() => {
    return (
      searchTerm.trim() !== '' ||
      selectedDepartment !== 'all' ||
      hireDateSearch.trim() !== '' ||
      hireDateFrom !== '' ||
      hireDateTo !== '' ||
      selectedContractType !== 'all' ||
      selectedBalanceStatus !== 'all' ||
      sortBy !== 'name_asc'
    );
  }, [
    searchTerm,
    selectedDepartment,
    hireDateSearch,
    hireDateFrom,
    hireDateTo,
    selectedContractType,
    selectedBalanceStatus,
    sortBy,
  ]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedDepartment('all');
    setHireDateSearch('');
    setHireDateFrom('');
    setHireDateTo('');
    setSelectedContractType('all');
    setSelectedBalanceStatus('all');
    setSortBy('name_asc');
  };

  // Statistics counters
  const stats = useMemo(() => {
    const total = employees.length;
    const permanent = employees.filter((e) => e.contractType === 'permanent').length;
    const contracts = employees.filter((e) => e.contractType === 'contract').length;
    const totalRemainingBalances = employees.reduce(
      (sum, e) => sum + (e.remainingBalance || 0),
      0
    );
    return {
      total,
      permanent,
      contracts,
      avgBalance: total > 0 ? Math.round(totalRemainingBalances / total) : 0,
    };
  }, [employees]);

  // Handle contract type change in form (auto set rules for permanent 36/3 vs contract 30/4)
  const handleContractTypeChange = (type: ContractType) => {
    if (type === 'permanent') {
      setFormData((prev) => ({
        ...prev,
        contractType: type,
        annualBalanceLimit: 36,
        monthlyRate: 3,
        isAccumulative: true,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        contractType: type,
        annualBalanceLimit: 30,
        monthlyRate: 4,
        isAccumulative: false,
      }));
    }
  };

  // Open modal for adding
  const handleOpenAddModal = () => {
    setEditingEmployee(null);
    const newEmpNumber = `IQ-GOV-${Math.floor(10000 + Math.random() * 90000)}`;
    setFormData({
      ...DEFAULT_FORM_DATA,
      employeeNumber: newEmpNumber,
    });
    setErrorMessage(null);
    setShowModal(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      id: emp.id,
      employeeNumber: emp.employeeNumber,
      fullName: emp.fullName,
      department: emp.department,
      division: emp.division || '',
      jobTitle: emp.jobTitle,
      contractType: emp.contractType,
      hireDate: emp.hireDate,
      annualBalanceLimit: emp.annualBalanceLimit,
      usedBalance: emp.usedBalance,
      monthlyRate: emp.monthlyRate,
      isAccumulative: emp.isAccumulative,
      phone: emp.phone || '',
      notes: emp.notes || '',
    });
    setErrorMessage(null);
    setShowModal(true);
  };

  // Submit form (Save to IndexedDB)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.employeeNumber.trim()) {
      setErrorMessage('يرجى كتابة الاسم الكامل والرقم الوظيفي.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const remainingBalance = Math.max(
        0,
        Number(formData.annualBalanceLimit) - Number(formData.usedBalance)
      );

      const employeeRecord: Employee = {
        id: editingEmployee ? editingEmployee.id : `EMP-2026-${Date.now()}`,
        employeeNumber: formData.employeeNumber.trim(),
        fullName: formData.fullName.trim(),
        department: formData.department.trim(),
        division: formData.division.trim(),
        jobTitle: formData.jobTitle.trim(),
        contractType: formData.contractType,
        hireDate: formData.hireDate,
        annualBalanceLimit: Number(formData.annualBalanceLimit),
        usedBalance: Number(formData.usedBalance),
        remainingBalance,
        monthlyRate: Number(formData.monthlyRate),
        isAccumulative: Boolean(formData.isAccumulative),
        phone: formData.phone.trim(),
        notes: formData.notes.trim(),
        createdAt: editingEmployee ? editingEmployee.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveEmployee(employeeRecord);

      await loadEmployees();
      setShowModal(false);
      setSuccessMessage(
        editingEmployee
          ? `تم تحديث بيانات الموظف (${employeeRecord.fullName}) بنجاح في IndexedDB!`
          : `تمت إضافة الموظف الجديد (${employeeRecord.fullName}) وحفظه في IndexedDB بنجاح!`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Error saving employee:', err);
      setErrorMessage(`حدث خطأ أثناء الحفظ في قاعدة البيانات: ${err?.message || ''}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete employee
  const handleDeleteEmployee = async (id: string) => {
    try {
      await deleteEmployeeById(id);
      await loadEmployees();
      setDeleteConfirmId(null);
      setSuccessMessage('تم حذف سجل الموظف من قاعدة البيانات المحلية بنجاح.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage('فشل حذف الموظف من IndexedDB');
    }
  };

  return (
    <div className="w-full space-y-5 text-slate-800 dark:text-slate-100">
      {/* 0. Top Navigation & Quick Panel Switching Toolbar */}
      <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2">
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="px-3.5 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all border border-amber-200 dark:border-amber-800 cursor-pointer shadow-2xs"
              title="الرجوع إلى لوحة التحكم الرئيسية"
            >
              <Home className="w-4 h-4" />
              <span>الرئيسية</span>
            </button>
          )}

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">التنقل السريع:</span>
            {onNavigate && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onNavigate('daily_movements')}
                  className="px-2.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 text-indigo-500" />
                  <span>الحركات اليومية</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('reports')}
                  className="px-2.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                >
                  <FileText className="w-3 h-3 text-emerald-500" />
                  <span>تقارير الدوام</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('calendar')}
                  className="px-2.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                >
                  <Calendar className="w-3 h-3 text-amber-500" />
                  <span>التقويم والعطل</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            سجل الموظفين والملاك
          </span>
        </div>
      </div>

      {/* 1. Header Toolbar & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              <span>سجل الموظفين والملاك الإداري</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 font-mono">
              <HardDrive className="w-3 h-3" />
              IndexedDB متصل
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            إدارة الملاك الدائم والعقود الوزارية وحفظ البيانات محلياً وبشكل دائم على حاسوب الدائرة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh DB */}
          <button
            type="button"
            onClick={loadEmployees}
            className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="إعادة مزامنة السجلات من IndexedDB"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Import CSV */}
          <button
            type="button"
            onClick={() => setIsCsvModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="استيراد بيانات الموظفين من ملف CSV / Excel"
          >
            <UploadCloud className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>استيراد CSV</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={() => handleExportCSV(false)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="تصدير السجلات إلى ملف CSV متوافق مع Excel"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>تصدير CSV</span>
          </button>

          {/* Add Leave Directly */}
          <button
            type="button"
            id="open-add-leave-header-btn"
            onClick={() => {
              setSelectedMovementEmployeeId(employees[0]?.id || undefined);
              setMovementInitialCategory('leave');
              setIsMovementModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer"
            title="تسجيل إجازة رسمية لموظف والبحث في أنواع الإجازات"
          >
            <Calendar className="w-4 h-4" />
            <span>إضافة إجازة</span>
          </button>

          {/* Register Movement */}
          <button
            type="button"
            id="open-add-movement-header-btn"
            onClick={() => {
              setSelectedMovementEmployeeId(employees[0]?.id || undefined);
              setMovementInitialCategory('attendance');
              setIsMovementModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-600/20 active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer"
            title="تسجيل حركة دوام أو إجازة أو إيفاد رسمي للموظفين"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة حركة موظف</span>
          </button>

          {/* Add Employee */}
          <button
            type="button"
            id="open-add-employee-modal-btn"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-semibold shadow-md shadow-amber-600/20 active:scale-98 transition-all flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة موظف جديد</span>
          </button>
        </div>
      </div>

      {/* 2. Success Alert */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center justify-between gap-3 shadow-xs"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Metrics Cards (Apple-inspired macOS widgets - toggled by appearance.showStatsCards) */}
      {appearance.showStatsCards && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-medium">إجمالي الموظفين</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {stats.total}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">سجل مخزن محلياً</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
              <span className="text-xs font-medium">الملاك الدائم</span>
              <BadgeCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {stats.permanent}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
              36 يوماً (تراكمي 3/شهر)
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
              <span className="text-xs font-medium">العقود الوزارية</span>
              <Briefcase className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {stats.contracts}
            </div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
              30 يوماً (غير تراكمي 4/شهر)
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
              <span className="text-xs font-medium">متوسط رصيد الإجازات</span>
              <Calendar className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {stats.avgBalance} <span className="text-xs font-normal text-slate-500">يوماً</span>
            </div>
            <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
              متاح للاستهلاك في 2026
            </div>
          </div>
        </div>
      )}

      {/* 4. Advanced Multi-Filter Search Bar */}
      <div className="p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        {/* Header of Advanced Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white text-xs block">
                شريط البحث المتقدم والفلترة المتعددة
              </span>
              <span className="text-[11px] text-slate-400">
                فلترة فورية لحظية أثناء الكتابة حسب الاسم، القسم، وتاريخ المباشرة
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Results counter badge */}
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-bold">
              مطابقة: {filteredEmployees.length} / {employees.length} موظف
            </span>

            {/* Reset filters button if active */}
            {isAnyFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="إلغاء كافة الفلاتر والعودة للوضع الافتراضي"
              >
                <RotateCcw className="w-3 h-3" />
                <span>إلغاء الفلاتر</span>
              </button>
            )}

            {/* Toggle extended filters drawer */}
            <button
              type="button"
              onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer border ${
                isAdvancedFiltersOpen
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>خيارات إضافية</span>
              {isAdvancedFiltersOpen ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        {/* Quick Employment Type Filter Pills (الكل / ملاك دائم / عقد وزاري) with Live Counts */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 ml-1">
              نوع التوظيف:
            </span>
            <button
              type="button"
              id="emp-filter-all-btn"
              onClick={() => setSelectedContractType('all')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedContractType === 'all'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>الكل</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-black/10 dark:bg-white/20">
                {employees.length}
              </span>
            </button>
            <button
              type="button"
              id="emp-filter-permanent-btn"
              onClick={() => setSelectedContractType('permanent')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedContractType === 'permanent'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>ملاك دائم</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                {stats.permanent}
              </span>
            </button>
            <button
              type="button"
              id="emp-filter-contract-btn"
              onClick={() => setSelectedContractType('contract')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedContractType === 'contract'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>عقد وزاري (قرار 315)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                {stats.contracts}
              </span>
            </button>
          </div>
        </div>

        {/* Primary Real-Time Filter Controls (Name, Department, Hire Date) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* 1. Real-Time Name / ID / Phone / Job Title Search */}
          <div className="md:col-span-5 relative">
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              البحث بالاسم، الرقم الوظيفي، أو المنصب:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="اكتب اسم الموظف أو الرقم الوظيفي لحظياً..."
                className="w-full pr-9 pl-8 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Real-Time Department Filter */}
          <div className="md:col-span-4">
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              القسم أو التشكيل الإداري:
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full pr-9 pl-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                <option value="all">كافة الأقسام والتشكيلات ({employees.length})</option>
                {departmentOptions.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept} ({departmentStats[dept] || 0} موظف)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Real-Time Hire Date Search (Instant matching as typed) */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              تاريخ المباشرة (لحظي أثناء الكتابة):
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-amber-600 dark:text-amber-400 pointer-events-none" />
              <input
                type="text"
                value={hireDateSearch}
                onChange={(e) => setHireDateSearch(e.target.value)}
                placeholder="سنة أو تاريخ: 2024، 2023..."
                className="w-full pr-9 pl-8 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
              {hireDateSearch && (
                <button
                  type="button"
                  onClick={() => setHireDateSearch('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Expandable Advanced Controls (Hire Date Range, Contract, Balance, Sorting) */}
        <AnimatePresence>
          {isAdvancedFiltersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-3 overflow-hidden text-xs"
            >
              {/* Quick Year Presets for Hire Date */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                  سنوات المباشرة السريعة:
                </span>
                {['الكل', '2026', '2025', '2024', '2023', '2022', '2021', '2020'].map((yr) => {
                  const isActive = yr === 'الكل' ? hireDateSearch === '' : hireDateSearch === yr;
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => {
                        if (yr === 'الكل') setHireDateSearch('');
                        else setHireDateSearch(yr);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition-colors cursor-pointer border ${
                        isActive
                          ? 'bg-amber-500 text-white border-amber-600 font-bold shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-amber-300'
                      }`}
                    >
                      {yr}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Hire Date Range: From */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    تاريخ المباشرة (من):
                  </label>
                  <input
                    type="date"
                    value={hireDateFrom}
                    onChange={(e) => setHireDateFrom(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                {/* Hire Date Range: To */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    تاريخ المباشرة (إلى):
                  </label>
                  <input
                    type="date"
                    value={hireDateTo}
                    onChange={(e) => setHireDateTo(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                {/* Contract Type */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    نوع الملاك والتوظيف:
                  </label>
                  <select
                    value={selectedContractType}
                    onChange={(e) => setSelectedContractType(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="all">كافة أنواع التوظيف</option>
                    <option value="permanent">ملاك دائم (36 يوماً - تراكمي)</option>
                    <option value="contract">عقد وزاري (30 يوماً)</option>
                  </select>
                </div>

                {/* Balance & Sorting */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    ترتيب عرض النتائج:
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="name_asc">الاسم أبجدياً (أ - ي)</option>
                    <option value="hireDate_desc">تاريخ المباشرة (الأحدث أولاً)</option>
                    <option value="hireDate_asc">تاريخ المباشرة (الأقدم أولاً)</option>
                    <option value="balance_desc">رصيد الإجازات (الأعلى أولاً)</option>
                    <option value="balance_asc">رصيد الإجازات (الأقل أولاً)</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Filter Chips / Pills */}
        {isAnyFilterActive && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
            <span className="text-slate-400 font-semibold">الفلاتر النشطة:</span>

            {searchTerm && (
              <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                <span>الاسم: "{searchTerm}"</span>
                <button type="button" onClick={() => setSearchTerm('')}>
                  <X className="w-3 h-3 hover:text-amber-950" />
                </button>
              </span>
            )}

            {selectedDepartment !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                <span>القسم: {selectedDepartment}</span>
                <button type="button" onClick={() => setSelectedDepartment('all')}>
                  <X className="w-3 h-3 hover:text-blue-950" />
                </button>
              </span>
            )}

            {hireDateSearch && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 font-mono">
                <span>المباشرة: {hireDateSearch}</span>
                <button type="button" onClick={() => setHireDateSearch('')}>
                  <X className="w-3 h-3 hover:text-emerald-950" />
                </button>
              </span>
            )}

            {hireDateFrom && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1 font-mono">
                <span>من: {hireDateFrom}</span>
                <button type="button" onClick={() => setHireDateFrom('')}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {hireDateTo && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1 font-mono">
                <span>إلى: {hireDateTo}</span>
                <button type="button" onClick={() => setHireDateTo('')}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedContractType !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                <span>الملاك: {selectedContractType === 'permanent' ? 'دائم' : 'عقد'}</span>
                <button type="button" onClick={() => setSelectedContractType('all')}>
                  <X className="w-3 h-3 hover:text-indigo-950" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* 4.5 Bulk Action Bar (Visible when employees are selected) */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex flex-wrap items-center justify-between gap-3 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                تم تحديد ({selectedIds.length}) من الموظفين
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Batch Edit */}
              <button
                type="button"
                onClick={() => setIsBatchEditModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>تعديل جماعي للمحدد</span>
              </button>

              {/* Batch Export */}
              <button
                type="button"
                onClick={() => handleExportCSV(true)}
                className="px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>تصدير المحدد CSV</span>
              </button>

              {/* Batch Delete */}
              <button
                type="button"
                onClick={() => setShowBatchDeleteConfirm(true)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف جماعي ({selectedIds.length})</span>
              </button>

              {/* Deselect All */}
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1.5 rounded-xl text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                إلغاء التحديد
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Employees Table / Card View */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold">
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredEmployees.length > 0 &&
                      selectedIds.length === filteredEmployees.length
                    }
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    title="تحديد الكل"
                  />
                </th>
                <th className={appearance.compactTable ? 'p-2' : 'p-3.5'}>ت (الرقم الوظيفي)</th>
                <th className={appearance.compactTable ? 'p-2' : 'p-3.5'}>الاسم الكامل للموظف</th>
                <th className={appearance.compactTable ? 'p-2' : 'p-3.5'}>القسم والشعبة</th>
                <th className={appearance.compactTable ? 'p-2' : 'p-3.5'}>الصفة الوظيفية</th>
                <th className={appearance.compactTable ? 'p-2' : 'p-3.5'}>رصيد الإجازات (2026)</th>
                <th className={appearance.compactTable ? 'p-2' : 'p-3.5'}>تاريخ المباشرة</th>
                <th className={`${appearance.compactTable ? 'p-2' : 'p-3.5'} text-center`}>الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                      <span>جاري استرجاع السجلات من IndexedDB...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">
                        لا توجد سجلات موظفين تطابق البحث الحالي.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenAddModal}
                        className="text-xs text-amber-600 hover:underline font-semibold"
                      >
                        + اضغط هنا لإضافة موظف جديد
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSelected = selectedIds.includes(emp.id);
                  const isLowBalance =
                    appearance.showEarlyWarningBadges &&
                    emp.remainingBalance <= leaveRules.earlyWarningThresholdDays;

                  return (
                    <tr
                      key={emp.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-amber-50/60 dark:bg-amber-950/30'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(emp.id)}
                          className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                      </td>

                      {/* Employee Number */}
                      <td
                        className={`${
                          appearance.compactTable ? 'p-2' : 'p-3.5'
                        } font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap`}
                      >
                        {emp.employeeNumber}
                      </td>

                      {/* Full Name & Phone */}
                      <td
                        className={`${
                          appearance.compactTable ? 'p-2' : 'p-3.5'
                        } whitespace-nowrap`}
                      >
                        <div className="font-bold text-slate-900 dark:text-white">
                          {emp.fullName}
                        </div>
                        {emp.phone && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3" />
                            <span dir="ltr">{emp.phone}</span>
                          </div>
                        )}
                      </td>

                      {/* Department & Division */}
                      <td className={appearance.compactTable ? 'p-2' : 'p-3.5'}>
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {emp.department}
                        </div>
                        {emp.division && (
                          <div className="text-[11px] text-slate-400">{emp.division}</div>
                        )}
                      </td>

                      {/* Contract Type Badge */}
                      <td
                        className={`${
                          appearance.compactTable ? 'p-2' : 'p-3.5'
                        } whitespace-nowrap`}
                      >
                        {emp.contractType === 'permanent' ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            ملاك دائم (تراكمي)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            عقد وزاري (غير تراكمي)
                          </span>
                        )}
                      </td>

                      {/* Balance */}
                      <td
                        className={`${
                          appearance.compactTable ? 'p-2' : 'p-3.5'
                        } whitespace-nowrap`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-sm text-slate-900 dark:text-white font-mono">
                            {emp.remainingBalance}
                            <span className="text-slate-400 text-xs font-normal">
                              /{emp.annualBalanceLimit} يوماً
                            </span>
                          </div>

                          {isLowBalance && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              تحذير رصيد
                            </span>
                          )}
                        </div>
                        <div className="w-24 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              emp.remainingBalance / emp.annualBalanceLimit > 0.5
                                ? 'bg-emerald-500'
                                : emp.remainingBalance / emp.annualBalanceLimit > 0.2
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(0, (emp.remainingBalance / emp.annualBalanceLimit) * 100)
                              )}%`,
                            }}
                          />
                        </div>
                      </td>

                      {/* Hire Date */}
                      <td
                        className={`${
                          appearance.compactTable ? 'p-2' : 'p-3.5'
                        } font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap`}
                      >
                        {emp.hireDate}
                      </td>

                      {/* Actions */}
                      <td
                        className={`${
                          appearance.compactTable ? 'p-2' : 'p-3.5'
                        } text-center whitespace-nowrap`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Add Leave directly for this specific employee */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMovementEmployeeId(emp.id);
                              setMovementInitialCategory('leave');
                              setIsMovementModalOpen(true);
                            }}
                            className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                            title={`تسجيل إجازة للموظف ${emp.fullName}`}
                          >
                            <Calendar className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>إجازة</span>
                          </button>

                          {/* Add Movement for this specific employee */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMovementEmployeeId(emp.id);
                              setMovementInitialCategory('attendance');
                              setIsMovementModalOpen(true);
                            }}
                            className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                            title={`تسجيل حركة أو إجازة للموظف ${emp.fullName}`}
                          >
                            <Plus className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span>حركة</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(emp)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                            title="تعديل بيانات الموظف"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {deleteConfirmId === emp.id ? (
                            <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950 p-1 rounded-lg border border-rose-200 dark:border-rose-900">
                              <button
                                type="button"
                                onClick={() => handleDeleteEmployee(emp.id)}
                                className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold"
                              >
                                تأكيد
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-1 text-slate-400 text-[10px]"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(emp.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="حذف سجل الموظف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Add / Edit Modal Window (macOS Frosted Modal) */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    {editingEmployee ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {editingEmployee ? 'تعديل بيانات الموظف' : 'تسجيل موظف جديد في المنظومة'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      سيتم حفظ السجل تلقائياً في قاعدة البيانات المحلية (IndexedDB)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Error */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Form Content */}
              <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
                {/* Contract Type Selection Tabs */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    نوع الملاك والتوظيف الحكومي
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleContractTypeChange('permanent')}
                      className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                        formData.contractType === 'permanent'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>ملاك دائم (تراكمي)</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-900/60">
                          36 يوماً
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        استحقاق 3 أيام شهرياً مع ميزة التراكم السنوي
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleContractTypeChange('contract')}
                      className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                        formData.contractType === 'contract'
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>عقد وزاري (قرار 315)</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60">
                          30 يوماً
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        استحقاق 4 أيام شهرياً (غير تراكمي)
                      </div>
                    </button>
                  </div>
                </div>

                {/* Name & Employee Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      الاسم الرباعي واللقب *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="مثال: حيدر جاسم كاظم الموسوي"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      الرقم الإداري / الوظيفي *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.employeeNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, employeeNumber: e.target.value })
                      }
                      placeholder="IQ-GOV-00000"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                      dir="ltr"
                      style={{ textAlign: 'right' }}
                    />
                  </div>
                </div>

                {/* Department & Division */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      القسم أو التشكيل
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="مثال: قسم الشؤون الهندسية والمشاريع"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      الشعبة أو الوحدة
                    </label>
                    <input
                      type="text"
                      value={formData.division}
                      onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                      placeholder="مثال: شعبة الصيانة والتشغيل"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Job Title & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      العنوان الوظيفي الرسمي
                    </label>
                    <input
                      type="text"
                      value={formData.jobTitle}
                      onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                      placeholder="مثال: رئيس مهندسين أقدم"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      رقم هاتف الاتصال
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="07XXXXXXXXX"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                      dir="ltr"
                      style={{ textAlign: 'right' }}
                    />
                  </div>
                </div>

                {/* Hire Date & Balances */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      تاريخ المباشرة الأولى
                    </label>
                    <input
                      type="date"
                      value={formData.hireDate}
                      onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      الرصيد السنوي (أيام)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={formData.annualBalanceLimit}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          annualBalanceLimit: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      المستهلك حتى الآن (أيام)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={formData.annualBalanceLimit}
                      value={formData.usedBalance}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          usedBalance: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ملاحظات وسجل إداري إضافي
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="أي توجيهات أو أوامر إدارية خاصة بالموظف..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/40 focus:outline-none resize-none"
                  />
                </div>

                {/* Modal Buttons */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    id="save-employee-submit-btn"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold shadow-md shadow-amber-600/20 active:scale-98 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري الحفظ في IndexedDB...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {editingEmployee ? 'حفظ التعديلات' : 'حفظ الموظف في IndexedDB'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        existingEmployees={employees}
        onImportSuccess={(importedCount) => {
          loadEmployees();
          setSuccessMessage(`تم استيراد ومعالجة (${importedCount}) سجل موظف بنجاح في IndexedDB.`);
          setTimeout(() => setSuccessMessage(null), 4000);
        }}
      />

      {/* 8. Batch Edit Modal */}
      <BatchEditModal
        isOpen={isBatchEditModalOpen}
        onClose={() => setIsBatchEditModalOpen(false)}
        selectedIds={selectedIds}
        employees={employees}
        onBatchUpdated={(updatedCount) => {
          loadEmployees();
          setSelectedIds([]);
          setSuccessMessage(`تم تحديث بيانات (${updatedCount}) موظف بنجاح في IndexedDB.`);
          setTimeout(() => setSuccessMessage(null), 4000);
        }}
      />

      {/* 9. Batch Delete Confirmation Modal */}
      <AnimatePresence>
        {showBatchDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    تأكيد الحذف الجماعي
                  </h3>
                  <p className="text-xs text-slate-500">عملية غير قابلة للتراجع</p>
                </div>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف{' '}
                <strong className="text-rose-600 font-bold">({selectedIds.length})</strong> من
                سجلات الموظفين نهائياً من قاعدة بيانات IndexedDB المحلية على هذا الحاسوب؟
              </p>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBatchDeleteConfirm(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBatchDelete}
                  disabled={isBatchDeleting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isBatchDeleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري الحذف...</span>
                    </>
                  ) : (
                    <span>نعم، احذف المحدد الآن</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Supercharged Movement Modal with many options */}
      <AddMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        employees={employees}
        defaultEmployeeId={selectedMovementEmployeeId}
        defaultCategory={movementInitialCategory}
        onRecordSaved={(newRec, updatedEmp) => {
          if (updatedEmp) {
            setEmployees((prev) =>
              prev.map((e) => (e.id === updatedEmp.id ? updatedEmp : e))
            );
            if (onEmployeesChanged) {
              onEmployeesChanged(
                employees.map((e) => (e.id === updatedEmp.id ? updatedEmp : e))
              );
            }
            setSuccessMessage(
              `تم تسجيل الحركة بنجاح (${newRec.movementTitle || newRec.status}) وتحديث رصيد الموظف إلى ${updatedEmp.remainingBalance} يوماً`
            );
          } else {
            setSuccessMessage(`تم تسجيل الحركة بنجاح (${newRec.movementTitle || newRec.status})`);
          }
        }}
      />
    </div>
  );
};
