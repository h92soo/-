import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  Undo2,
  Redo2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  CalendarRange,
  Home,
  FileText,
  Zap,
  Settings as SettingsIcon,
  Database,
  CloudUpload,
  Eye,
  LayoutGrid,
  LayoutList,
  GraduationCap,
  ArrowRightLeft,
  History,
  ShieldCheck,
  Fingerprint,
  Activity,
  Laptop,
  Network,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Employee,
  ContractType,
  AppearanceSettings,
  LeaveRulesSettings,
  MovementCategory,
  WorkspaceTab,
  EmployeeStatus,
  Department,
  DEFAULT_DEPARTMENTS,
  EDUCATION_DEGREE_OPTIONS,
  UserAccount,
  BiometricDevice,
  BiometricModality,
} from '../types';
import {
  getAllEmployees,
  saveEmployee,
  deleteEmployeeById,
  deleteEmployeesBatch,
  DEFAULT_APPEARANCE_SETTINGS,
  DEFAULT_LEAVE_RULES,
  downloadDatabaseBackupFile,
  getAttendanceLogs,
} from '../db/indexedDB';
import { exportComprehensiveExcel } from '../utils/reportExportUtils';
import { CsvImportModal } from './CsvImportModal';
import { BatchEditModal } from './BatchEditModal';
import { AddMovementModal } from './AddMovementModal';
import { PdfReportPreviewModal } from './PdfReportPreviewModal';
import { QuickMonthlyAttendanceSheet } from './QuickMonthlyAttendanceSheet';
import { EmployeeQuickAttendanceModal } from './EmployeeQuickAttendanceModal';
import { EmployeeLeaveChart } from './EmployeeLeaveChart';
import { showToast, toast } from './ToastNotification';
import { TrashModal } from './TrashModal';
import { MasterEmployeeProfileModal } from './MasterEmployeeProfileModal';
import { EmployeeBadgeModal } from './EmployeeBadgeModal';
import { DepartmentManagerModal, getColorClasses } from './DepartmentManagerModal';
import { EmployeeAuditLogModal } from './EmployeeAuditLogModal';
import { BiometricDeviceModal } from './BiometricDeviceModal';
import { employeeService } from '../services/employeeService';
import { biometricService } from '../services/biometricService';
import { QrCode, UserCheck2 } from 'lucide-react';
import {
  moveToTrash,
  canUndo,
  canRedo,
  executeUndo,
  executeRedo,
  getTrashedEmployees,
  subscribeTrashChanges,
} from '../services/employeeTrashService';
import {
  computeEmployeeSalaryComponents,
  getOfficialBaseSalary,
  formatIQD,
  IRAQI_SALARY_SCALE,
  EDUCATION_ALLOWANCE_PRESETS,
  inferEducationPercent,
  getSuggestedGradeForDegree,
} from '../utils/iraqiSalaryScale';
import { DollarSign } from 'lucide-react';

interface EmployeeManagementProps {
  appearance?: AppearanceSettings;
  leaveRules?: LeaveRulesSettings;
  employmentLabels?: any;
  initialEmployees?: Employee[];
  onEmployeesChanged?: (employees: Employee[]) => void;
  onBackToDashboard?: () => void;
  onNavigate?: (tab: WorkspaceTab) => void;
  currentUser?: UserAccount;
}

// Initial sample Iraqi governmental employees if database is fresh
const INITIAL_DEMO_EMPLOYEES: Employee[] = [

  {
    id: 'EMP-2026-001',
    employeeNumber: 'IQ-GOV-98214',
    fullName: 'كرار حيدر جاسم الموسوي',
    department: 'قسم الشؤون الهندسية والمشاريع',
    division: 'شعبة الصيانة والتشغيل',
    jobTitle: 'مهندس أقدم / رئيس مهندسين معاون',
    contractType: 'permanent',
    hireDate: '2018-03-15',
    annualBalanceLimit: 36,
    usedBalance: 4,
    remainingBalance: 32,
    monthlyRate: 3,
    isAccumulative: true,
    phone: '07801234567',
    notes: 'الموظف من الملاك الدائم - سجل دائمي رسمي مجدول لعام 2026',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
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
  birthDate?: string;
  gender?: 'male' | 'female';
  nationalId?: string;
  nationalStatisticalNumber?: string;
  pensionFileNumber?: string;
  specialization?: string;
  confirmationDate?: string;
  status?: EmployeeStatus;
  annualBalanceLimit: number;
  usedBalance: number;
  monthlyRate: number;
  isAccumulative: boolean;
  phone: string;
  notes: string;
  civilGrade?: number;
  civilStage?: number;
  baseSalary?: number;
  maritalStatus?: 'single' | 'married' | 'widowed' | 'divorced';
  hasSpouseAllowance?: boolean;
  childrenCount?: number;
  educationDegree?: string;
  educationAllowancePercent?: number;
  hazardAllowancePercent?: number;
  positionAllowancePercent?: number;
  isTaxEnabled?: boolean;
  taxRatePercent?: number;
  biometricEnrollmentId?: string;
  biometricDeviceIp?: string;
  biometricModality?: BiometricModality;
}

const DEFAULT_FORM_DATA: EmployeeFormData = {
  employeeNumber: '',
  fullName: '',
  department: 'قسم الموارد البشرية',
  division: 'شعبة شؤون الموظفين',
  jobTitle: 'معاون ملاحظ إداري',
  contractType: 'permanent',
  hireDate: new Date().toISOString().split('T')[0],
  birthDate: '1990-01-01',
  gender: 'male',
  nationalId: '',
  nationalStatisticalNumber: '',
  pensionFileNumber: '',
  specialization: 'إدارة عامة وقانون',
  confirmationDate: '',
  status: 'active',
  annualBalanceLimit: 36,
  usedBalance: 0,
  monthlyRate: 3,
  isAccumulative: true,
  phone: '',
  notes: '',
  civilGrade: 7,
  civilStage: 1,
  baseSalary: 296000,
  maritalStatus: 'married',
  hasSpouseAllowance: true,
  childrenCount: 2,
  educationDegree: 'بكالوريوس',
  educationAllowancePercent: 45,
  hazardAllowancePercent: 20,
  positionAllowancePercent: 0,
  isTaxEnabled: false,
  taxRatePercent: 3,
  biometricEnrollmentId: '',
  biometricDeviceIp: '',
  biometricModality: 'multi_biometric',
};

export const EmployeeManagement: React.FC<EmployeeManagementProps> = ({
  appearance = DEFAULT_APPEARANCE_SETTINGS,
  leaveRules = DEFAULT_LEAVE_RULES,
  employmentLabels,
  initialEmployees,
  onEmployeesChanged,
  onBackToDashboard,
  onNavigate,
  currentUser,
}) => {
  const [employees, setEmployees] = useState<Employee[]>(() =>
    initialEmployees && initialEmployees.length > 0 ? initialEmployees : []
  );
  const [isLoading, setIsLoading] = useState<boolean>(() =>
    !initialEmployees || initialEmployees.length === 0
  );

  // Sync with initialEmployees if updated by parent
  useEffect(() => {
    if (initialEmployees && initialEmployees.length > 0) {
      setEmployees(initialEmployees);
      setIsLoading(false);
    }
  }, [initialEmployees]);
  
  // Advanced Multi-filter Search state
  const [searchTerm, setSearchTerm] = useState<string>(''); // Name, employee number, job title, phone
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedEducationDegree, setSelectedEducationDegree] = useState<string>('all'); // دكتوراه، ماجستير، بكالوريوس، يقرأ ويكتب، يقرأ فقط...
  const [hireDateSearch, setHireDateSearch] = useState<string>(''); // Live text matching hire date (e.g. 2024, 2023-01)
  const [hireDateFrom, setHireDateFrom] = useState<string>(''); // Date range start
  const [hireDateTo, setHireDateTo] = useState<string>(''); // Date range end
  const [selectedContractType, setSelectedContractType] = useState<string>('all');
  const [selectedBalanceStatus, setSelectedBalanceStatus] = useState<string>('all'); // all, low, sufficient, zero
  const [sortBy, setSortBy] = useState<'name_asc' | 'hireDate_desc' | 'hireDate_asc' | 'balance_desc' | 'balance_asc'>('name_asc');
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState<boolean>(false);
  const [movementInitialCategory, setMovementInitialCategory] = useState<MovementCategory>('attendance');

  // Department Management & Bulk Transfer State
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState<boolean>(false);
  const [registeredDepartments, setRegisteredDepartments] = useState<Department[]>([]);
  const [isBatchTransferModalOpen, setIsBatchTransferModalOpen] = useState<boolean>(false);
  const [batchTransferTargetDept, setBatchTransferTargetDept] = useState<string>('');
  const [isBatchTransferring, setIsBatchTransferring] = useState<boolean>(false);
  const [isCustomDeptInput, setIsCustomDeptInput] = useState<boolean>(false);

  // Subscribe to departments real-time changes
  useEffect(() => {
    employeeService.getDepartments().then(setRegisteredDepartments).catch(() => {});
    const unsub = employeeService.subscribeDepartments((depts) => {
      setRegisteredDepartments(depts);
    });
    return () => unsub();
  }, []);

  // Pagination State for high performance (20 items per page by default)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Reset pagination to page 1 whenever any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedDepartment,
    selectedEducationDegree,
    hireDateSearch,
    hireDateFrom,
    hireDateTo,
    selectedContractType,
    selectedBalanceStatus,
    sortBy,
  ]);

  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(DEFAULT_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Auto-Save on any field change state
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);
  const autoSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [isEmployeePdfPreviewOpen, setIsEmployeePdfPreviewOpen] = useState<boolean>(false);

  // Batch & Import State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isBatchEditModalOpen, setIsBatchEditModalOpen] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedMovementEmployeeId, setSelectedMovementEmployeeId] = useState<string | undefined>(undefined);
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [profileModalEmployeeId, setProfileModalEmployeeId] = useState<string | null>(null);
  const [badgeModalEmployee, setBadgeModalEmployee] = useState<Employee | null>(null);
  const [showSyncBackupModal, setShowSyncBackupModal] = useState(false);

  // Trash Bin & Undo/Redo State
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [trashedCount, setTrashedCount] = useState<number>(() => getTrashedEmployees().length);
  const [canUndoState, setCanUndoState] = useState<boolean>(() => canUndo());
  const [canRedoState, setCanRedoState] = useState<boolean>(() => canRedo());

  // Listen to trash and undo/redo changes reactively
  useEffect(() => {
    const unsub = subscribeTrashChanges(() => {
      setTrashedCount(getTrashedEmployees().length);
      setCanUndoState(canUndo());
      setCanRedoState(canRedo());
    });
    return () => unsub();
  }, []);

  // Quick Monthly Attendance Sheet View & Modal states
  const [activeViewMode, setActiveViewMode] = useState<'roster' | 'monthly_sheet'>('roster');
  const [quickAttendanceEmployee, setQuickAttendanceEmployee] = useState<Employee | null>(null);

  // Employee view layout: cards vs table (both featuring recharts leave balance charts)
  const [employeeCardViewLayout, setEmployeeCardViewLayout] = useState<'cards' | 'table'>('cards');

  // Audit Log (سجل تتبع التعديلات والعمليات الرقابية) Modal State
  const [isAuditLogModalOpen, setIsAuditLogModalOpen] = useState<boolean>(false);
  const [auditLogEmployeeId, setAuditLogEmployeeId] = useState<string | undefined>(undefined);

  const handleOpenAuditLog = (employeeId?: string) => {
    setAuditLogEmployeeId(employeeId);
    setIsAuditLogModalOpen(true);
  };

  // Biometric Devices and ping test in Employee Form
  const [biometricDevicesList, setBiometricDevicesList] = useState<BiometricDevice[]>([]);
  const [isBiometricDeviceModalOpen, setIsBiometricDeviceModalOpen] = useState<boolean>(false);
  const [isPingingDevice, setIsPingingDevice] = useState<boolean>(false);
  const [pingResultText, setPingResultText] = useState<string | null>(null);

  useEffect(() => {
    biometricService.getDevices().then(setBiometricDevicesList);
    const unsub = biometricService.subscribe((devs) => {
      setBiometricDevicesList(devs);
    });
    return unsub;
  }, []);

  const handlePingFormDevice = async () => {
    const targetIp = formData.biometricDeviceIp || biometricDevicesList[0]?.ipAddress || '192.168.1.201';
    setIsPingingDevice(true);
    setPingResultText(null);
    try {
      const matchedDev = biometricDevicesList.find((d) => d.ipAddress === targetIp) || {
        id: `dev-${Date.now()}`,
        name: 'جهاز بصمة مخصص',
        ipAddress: targetIp,
        port: 4370,
        brand: 'zkteco' as const,
        deviceType: formData.biometricModality || 'multi_biometric',
        connectionType: targetIp.includes('USB') ? ('usb_direct' as const) : ('tcp_ip' as const),
        status: 'online' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const res = await biometricService.pingDevice(matchedDev);
      if (res.success) {
        setPingResultText(`✅ متصل (${res.latencyMs}ms) - بدون أي فقدان حزم`);
        toast.success(`فحص البينغ ناجح للجهاز (${targetIp}) - الاستجابة: ${res.latencyMs}ms`);
      } else {
        setPingResultText(`❌ خطأ: ${res.details}`);
        toast.error(`فشل الاتصال بالآي بي (${targetIp})`);
      }
    } catch {
      setPingResultText('❌ تعذر فحص البينغ');
    } finally {
      setIsPingingDevice(false);
    }
  };

  // Safely notify parent App outside of React render phase / updater functions
  const notifyEmployeesChanged = (updatedList: Employee[]) => {
    if (onEmployeesChanged) {
      setTimeout(() => {
        onEmployeesChanged(updatedList);
      }, 0);
    }
  };

  // Export full department database JSON backup
  const handleQuickBackup = async () => {
    setIsExportingBackup(true);
    try {
      const { filename, fileSizeKb } = await downloadDatabaseBackupFile('مدير شؤون الموظفين');
      setSuccessMessage(`تم تصدير نسخة احتياطية مشفرة محلياً (${filename}) بحجم ${fileSizeKb} KB بنجاح.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Failed to export backup:', err);
      setErrorMessage('تعذر إنشاء النسخة الاحتياطية لقاعدة البيانات المحلية');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsExportingBackup(false);
    }
  };

  // Fetch employees from IndexedDB
  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const data = await getAllEmployees();
      // Offline-First & Department Independence:
      // We only auto-seed if the database has NEVER been initialized yet (check localStorage key).
      // If a user deleted all employees or has an empty department database, we respect their empty state!
      const isFirstInitDone = localStorage.getItem('gov_db_employees_initialized');
      if (data.length === 0 && !isFirstInitDone) {
        for (const emp of INITIAL_DEMO_EMPLOYEES) {
          await saveEmployee(emp);
        }
        localStorage.setItem('gov_db_employees_initialized', 'true');
        const reloaded = await getAllEmployees();
        setEmployees(reloaded);
        notifyEmployeesChanged(reloaded);
      } else {
        if (!isFirstInitDone) {
          localStorage.setItem('gov_db_employees_initialized', 'true');
        }
        setEmployees(data);
        notifyEmployeesChanged(data);
      }
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

  // Batch delete confirm: Move to Trash first with full Undo/Redo support
  const handleConfirmBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    const idsToDelete = [...selectedIds];
    setIsBatchDeleting(true);

    const targets = employees.filter((emp) => idsToDelete.includes(emp.id));
    if (targets.length === 0) {
      setIsBatchDeleting(false);
      return;
    }

    // 1. Optimistic UI update: Remove records instantly from State & notify parent app
    const updated = employees.filter((emp) => !idsToDelete.includes(emp.id));
    setEmployees(updated);
    notifyEmployeesChanged(updated);
    setSelectedIds([]);
    setShowBatchDeleteConfirm(false);

    try {
      // 2. Add to Trash Bin and record in Undo Stack
      moveToTrash(targets, 'مدير النظام', `حذف جماعي لـ (${targets.length}) موظف`);

      // 3. Delete from active IndexedDB table
      await deleteEmployeesBatch(idsToDelete);
      // Mark initialization flag so empty state is respected
      localStorage.setItem('gov_db_employees_initialized', 'true');

      toast.info(
        `تم نقل (${targets.length}) من سجلات الموظفين إلى سلة المهملات. يمكنك التراجع في أي وقت.`,
        {
          actionText: 'تراجع الآن',
          onAction: () => handleGlobalUndo(),
          durationMs: 7000,
        }
      );
      setSuccessMessage(`تم نقل (${targets.length}) موظف إلى سلة المهملات المؤقتة مع إمكانية الاستعادة.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Batch delete failed:', err);
      setErrorMessage('فشل في حذف مجموعة الموظفين من IndexedDB، جاري إعادة المزامنة...');
      await loadEmployees();
    } finally {
      setIsBatchDeleting(false);
    }
  };

  // Global Quick Undo execution from toolbar/toast
  const handleGlobalUndo = async () => {
    try {
      const res = executeUndo();
      if (res.action === 'restored' && res.employees.length > 0) {
        // Re-save restored employees into IndexedDB
        for (const emp of res.employees) {
          await saveEmployee(emp);
        }
        await loadEmployees();
        toast.success(res.message);
      } else if (res.action === 'deleted' && res.employees.length > 0) {
        // Re-delete from IndexedDB
        await deleteEmployeesBatch(res.employees.map((e) => e.id));
        await loadEmployees();
        toast.warning(res.message);
      } else {
        toast.info(res.message);
      }
    } catch (e: any) {
      console.error('Undo failed:', e);
      toast.error('حدث خطأ أثناء التراجع عن العملية.');
    }
  };

  // Global Quick Redo execution from toolbar
  const handleGlobalRedo = async () => {
    try {
      const res = executeRedo();
      if (res.action === 'restored' && res.employees.length > 0) {
        for (const emp of res.employees) {
          await saveEmployee(emp);
        }
        await loadEmployees();
        toast.success(res.message);
      } else if (res.action === 'deleted' && res.employees.length > 0) {
        await deleteEmployeesBatch(res.employees.map((e) => e.id));
        await loadEmployees();
        toast.warning(res.message);
      } else {
        toast.info(res.message);
      }
    } catch (e: any) {
      console.error('Redo failed:', e);
      toast.error('حدث خطأ أثناء إعادة العملية.');
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

  // Export comprehensive Excel workbook (.xlsx) containing ALL employees, movements, and statistical KPI sheet
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const handleExportComprehensiveExcel = async (exportSelectedOnly = false) => {
    setIsExportingExcel(true);
    try {
      const listToExport = exportSelectedOnly
        ? employees.filter((e) => selectedIds.includes(e.id))
        : employees;

      if (listToExport.length === 0) {
        setErrorMessage('لا توجد سجلات موظفين متاحة للتصدير.');
        setTimeout(() => setErrorMessage(null), 3000);
        return;
      }

      // Fetch all attendance & movements logs from IndexedDB
      const logs = await getAttendanceLogs();

      // Filter movements to correspond to the exported employees if selected only
      const targetEmpIds = new Set(listToExport.map((e) => e.id));
      const relevantLogs = exportSelectedOnly
        ? logs.filter((l) => targetEmpIds.has(l.employeeId))
        : logs;

      const filename = exportComprehensiveExcel(listToExport, relevantLogs, {
        departmentName: selectedDepartment !== 'all' ? selectedDepartment : 'كافة الأقسام والتشكيلات',
      });

      setSuccessMessage(`تم تصدير سجل الموظفين والحركات بنجاح إلى ملف Excel: ${filename}`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Error exporting to Excel:', err);
      setErrorMessage(`حدث خطأ أثناء تصدير ملف Excel: ${err?.message || ''}`);
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsExportingExcel(false);
    }
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
    const names = new Set<string>();
    registeredDepartments.forEach((d) => {
      if (d.name?.trim()) names.add(d.name.trim());
    });
    employees.forEach((e) => {
      if (e.department?.trim()) names.add(e.department.trim());
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [registeredDepartments, employees]);

  // Education Degree options and counts
  const educationStats = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach((emp) => {
      const deg = emp.educationDegree?.trim() || 'بكالوريوس';
      counts[deg] = (counts[deg] || 0) + 1;
    });
    return counts;
  }, [employees]);

  // Multi-filtered & Sorted employees list supporting name, department, education degree, hire date in real-time
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

      // 3. Real-time Education Degree / Certificate filter
      const empDeg = emp.educationDegree?.trim() || 'بكالوريوس';
      const matchDegree =
        selectedEducationDegree === 'all' || empDeg === selectedEducationDegree;

      // 4. Real-time Hire Date text match (e.g. "2024", "2023-01", etc.)
      const hireTerm = hireDateSearch.trim();
      const matchHireText =
        hireTerm === '' ||
        (emp.hireDate && emp.hireDate.toLowerCase().includes(hireTerm.toLowerCase()));

      // 5. Hire Date Range (From / To)
      let matchHireRange = true;
      if (hireDateFrom && emp.hireDate) {
        if (emp.hireDate < hireDateFrom) matchHireRange = false;
      }
      if (hireDateTo && emp.hireDate) {
        if (emp.hireDate > hireDateTo) matchHireRange = false;
      }

      // 6. Contract type filter
      const matchContract =
        selectedContractType === 'all' || emp.contractType === selectedContractType;

      // 7. Balance status filter
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
        matchDegree &&
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
    selectedEducationDegree,
    hireDateSearch,
    hireDateFrom,
    hireDateTo,
    selectedContractType,
    selectedBalanceStatus,
    sortBy,
  ]);

  // Pagination computations for 400+ employees performance
  const totalItems = filteredEmployees.length;
  const effectivePageSize = pageSize === 0 ? totalItems : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / (effectivePageSize || 1)));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedEmployees = useMemo(() => {
    if (pageSize === 0) return filteredEmployees;
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredEmployees.slice(startIndex, startIndex + pageSize);
  }, [filteredEmployees, safeCurrentPage, pageSize]);

  // Check if any filter is actively applied
  const isAnyFilterActive = useMemo(() => {
    return (
      searchTerm.trim() !== '' ||
      selectedDepartment !== 'all' ||
      selectedEducationDegree !== 'all' ||
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
    selectedEducationDegree,
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
    setSelectedEducationDegree('all');
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

  // Automatic real-time persistence to IndexedDB on field changes
  const performAutoSaveEmployee = async (updatedData: EmployeeFormData, targetEmp: Employee) => {
    if (!updatedData.fullName.trim() || !updatedData.employeeNumber.trim()) return;

    setAutoSaveStatus('saving');
    try {
      const remainingBalance = Math.max(
        0,
        Number(updatedData.annualBalanceLimit) - Number(updatedData.usedBalance)
      );

      const computedSalary = computeEmployeeSalaryComponents({
        ...targetEmp,
        civilGrade: updatedData.civilGrade ?? targetEmp.civilGrade ?? 7,
        civilStage: updatedData.civilStage ?? targetEmp.civilStage ?? 1,
        baseSalary: updatedData.baseSalary,
        maritalStatus: updatedData.maritalStatus,
        hasSpouseAllowance: updatedData.hasSpouseAllowance,
        childrenCount: updatedData.childrenCount,
        educationDegree: updatedData.educationDegree,
        educationAllowancePercent: updatedData.educationAllowancePercent,
        hazardAllowancePercent: updatedData.hazardAllowancePercent,
        positionAllowancePercent: updatedData.positionAllowancePercent,
        isTaxEnabled: updatedData.isTaxEnabled,
        taxRatePercent: updatedData.taxRatePercent,
      });

      const updatedRecord: Employee = {
        ...targetEmp,
        employeeNumber: updatedData.employeeNumber.trim(),
        fullName: updatedData.fullName.trim(),
        department: updatedData.department.trim(),
        division: updatedData.division.trim(),
        jobTitle: updatedData.jobTitle.trim(),
        contractType: updatedData.contractType,
        hireDate: updatedData.hireDate,
        birthDate: updatedData.birthDate || targetEmp.birthDate,
        gender: updatedData.gender || targetEmp.gender || 'male',
        nationalId: updatedData.nationalId?.trim() || targetEmp.nationalId,
        nationalStatisticalNumber: updatedData.nationalStatisticalNumber?.trim() || targetEmp.nationalStatisticalNumber,
        pensionFileNumber: updatedData.pensionFileNumber?.trim() || targetEmp.pensionFileNumber,
        specialization: updatedData.specialization?.trim() || targetEmp.specialization,
        confirmationDate: updatedData.confirmationDate || targetEmp.confirmationDate,
        status: updatedData.status || targetEmp.status || 'active',
        annualBalanceLimit: Number(updatedData.annualBalanceLimit),
        usedBalance: Number(updatedData.usedBalance),
        remainingBalance,
        monthlyRate: Number(updatedData.monthlyRate),
        isAccumulative: Boolean(updatedData.isAccumulative),
        phone: updatedData.phone.trim(),
        notes: updatedData.notes.trim(),
        civilGrade: updatedData.civilGrade ?? 7,
        civilStage: updatedData.civilStage ?? 1,
        baseSalary: computedSalary.baseSalary,
        spouseAllowance: computedSalary.spouseAllowance,
        childrenAllowance: computedSalary.childrenAllowance,
        educationDegree: updatedData.educationDegree,
        educationAllowancePercent: updatedData.educationAllowancePercent,
        educationAllowance: computedSalary.educationAllowance,
        hazardAllowancePercent: updatedData.hazardAllowancePercent,
        hazardAllowance: computedSalary.hazardAllowance,
        positionAllowancePercent: updatedData.positionAllowancePercent,
        positionAllowance: computedSalary.positionAllowance,
        totalAllowances: computedSalary.totalAllowances,
        totalSalary: computedSalary.grossSalary,
        pensionDeduction: computedSalary.pensionDeduction,
        isPensionDeducted: true,
        isTaxEnabled: Boolean(updatedData.isTaxEnabled),
        taxRatePercent: updatedData.taxRatePercent ?? 3,
        taxDeduction: computedSalary.taxDeduction,
        totalDeductions: computedSalary.totalDeductions,
        netSalary: computedSalary.netSalary,
        updatedAt: new Date().toISOString(),
      };

      const performer = currentUser?.fullName || currentUser?.username || 'مدير النظام';
      await employeeService.save(updatedRecord, performer);

      // Optimistic in-memory update so UI stays in instant sync
      setEmployees((prev) => {
        const next = prev.map((e) => (e.id === updatedRecord.id ? updatedRecord : e));
        notifyEmployeesChanged(next);
        return next;
      });

      setAutoSaveStatus('saved');
      setLastAutoSaveTime(new Date().toLocaleTimeString('ar-IQ'));
    } catch (err) {
      console.error('Auto save error:', err);
      setAutoSaveStatus('error');
    }
  };

  const handleFormFieldChange = (field: keyof EmployeeFormData, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (editingEmployee) {
        setAutoSaveStatus('saving');
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
        autoSaveTimeoutRef.current = setTimeout(() => {
          performAutoSaveEmployee(updated, editingEmployee);
        }, 500);
      }
      return updated;
    });
  };

  const handleFieldBlur = () => {
    if (editingEmployee && autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      performAutoSaveEmployee(formData, editingEmployee);
    }
  };

  // Handle contract type change in form (auto set rules for permanent 36/3 vs contract 30/4)
  const handleContractTypeChange = (type: ContractType) => {
    let updated: EmployeeFormData;
    if (type === 'permanent') {
      updated = {
        ...formData,
        contractType: type,
        annualBalanceLimit: 36,
        monthlyRate: 3,
        isAccumulative: true,
      };
    } else {
      updated = {
        ...formData,
        contractType: type,
        annualBalanceLimit: 30,
        monthlyRate: 4,
        isAccumulative: false,
      };
    }
    setFormData(updated);
    if (editingEmployee) {
      performAutoSaveEmployee(updated, editingEmployee);
    }
  };

  // Open modal for adding
  const handleOpenAddModal = () => {
    setEditingEmployee(null);
    setAutoSaveStatus('idle');
    setLastAutoSaveTime(null);
    const newEmpNumber = `IQ-GOV-${Math.floor(10000 + Math.random() * 90000)}`;
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setFormData({
      ...DEFAULT_FORM_DATA,
      employeeNumber: newEmpNumber,
      biometricEnrollmentId: randomPin,
      biometricDeviceIp: biometricDevicesList[0]?.ipAddress || '192.168.1.201',
      biometricModality: 'multi_biometric',
    });
    setErrorMessage(null);
    setShowModal(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setAutoSaveStatus('idle');
    setLastAutoSaveTime(null);
    setFormData({
      id: emp.id,
      employeeNumber: emp.employeeNumber,
      fullName: emp.fullName,
      department: emp.department,
      division: emp.division || '',
      jobTitle: emp.jobTitle,
      contractType: emp.contractType,
      hireDate: emp.hireDate,
      birthDate: emp.birthDate || '1990-01-01',
      gender: emp.gender || 'male',
      nationalId: emp.nationalId || '',
      nationalStatisticalNumber: emp.nationalStatisticalNumber || '',
      pensionFileNumber: emp.pensionFileNumber || '',
      specialization: emp.specialization || '',
      confirmationDate: emp.confirmationDate || '',
      status: emp.status || 'active',
      annualBalanceLimit: emp.annualBalanceLimit,
      usedBalance: emp.usedBalance,
      monthlyRate: emp.monthlyRate,
      isAccumulative: emp.isAccumulative,
      phone: emp.phone || '',
      notes: emp.notes || '',
      civilGrade: emp.civilGrade ?? 7,
      civilStage: emp.civilStage ?? 1,
      baseSalary: emp.baseSalary ?? getOfficialBaseSalary(emp.civilGrade || 7, emp.civilStage || 1),
      maritalStatus: emp.maritalStatus || 'married',
      hasSpouseAllowance: emp.hasSpouseAllowance ?? true,
      childrenCount: emp.childrenCount ?? 2,
      educationDegree: emp.educationDegree || 'بكالوريوس',
      educationAllowancePercent: emp.educationAllowancePercent ?? 45,
      hazardAllowancePercent: emp.hazardAllowancePercent ?? 20,
      positionAllowancePercent: emp.positionAllowancePercent ?? 0,
      isTaxEnabled: Boolean(emp.isTaxEnabled),
      taxRatePercent: emp.taxRatePercent ?? 3,
      biometricEnrollmentId: emp.biometricEnrollmentId || emp.employeeNumber.replace(/\D/g, '').slice(-4) || '1042',
      biometricDeviceIp: emp.biometricDeviceIp || (biometricDevicesList[0]?.ipAddress || '192.168.1.201'),
      biometricModality: emp.biometricModality || 'multi_biometric',
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

      const computedSalary = computeEmployeeSalaryComponents({
        civilGrade: formData.civilGrade ?? 7,
        civilStage: formData.civilStage ?? 1,
        baseSalary: formData.baseSalary,
        maritalStatus: formData.maritalStatus,
        hasSpouseAllowance: formData.hasSpouseAllowance,
        childrenCount: formData.childrenCount,
        educationDegree: formData.educationDegree,
        educationAllowancePercent: formData.educationAllowancePercent,
        hazardAllowancePercent: formData.hazardAllowancePercent,
        positionAllowancePercent: formData.positionAllowancePercent,
        isTaxEnabled: formData.isTaxEnabled,
        taxRatePercent: formData.taxRatePercent,
      });

      const employeeRecord: Employee = {
        id: editingEmployee ? editingEmployee.id : `EMP-2026-${Date.now()}`,
        employeeNumber: formData.employeeNumber.trim(),
        fullName: formData.fullName.trim(),
        department: formData.department.trim(),
        division: formData.division.trim(),
        jobTitle: formData.jobTitle.trim(),
        contractType: formData.contractType,
        hireDate: formData.hireDate,
        birthDate: formData.birthDate || '1990-01-01',
        gender: formData.gender || 'male',
        nationalId: formData.nationalId?.trim() || '',
        nationalStatisticalNumber: formData.nationalStatisticalNumber?.trim() || '',
        pensionFileNumber: formData.pensionFileNumber?.trim() || '',
        specialization: formData.specialization?.trim() || '',
        confirmationDate: formData.confirmationDate || '',
        status: formData.status || 'active',
        annualBalanceLimit: Number(formData.annualBalanceLimit),
        usedBalance: Number(formData.usedBalance),
        remainingBalance,
        monthlyRate: Number(formData.monthlyRate),
        isAccumulative: Boolean(formData.isAccumulative),
        phone: formData.phone.trim(),
        notes: formData.notes.trim(),
        civilGrade: formData.civilGrade ?? 7,
        civilStage: formData.civilStage ?? 1,
        baseSalary: computedSalary.baseSalary,
        spouseAllowance: computedSalary.spouseAllowance,
        childrenAllowance: computedSalary.childrenAllowance,
        educationDegree: formData.educationDegree,
        educationAllowancePercent: formData.educationAllowancePercent,
        educationAllowance: computedSalary.educationAllowance,
        hazardAllowancePercent: formData.hazardAllowancePercent,
        hazardAllowance: computedSalary.hazardAllowance,
        positionAllowancePercent: formData.positionAllowancePercent,
        positionAllowance: computedSalary.positionAllowance,
        totalAllowances: computedSalary.totalAllowances,
        totalSalary: computedSalary.grossSalary,
        pensionDeduction: computedSalary.pensionDeduction,
        isPensionDeducted: true,
        isTaxEnabled: Boolean(formData.isTaxEnabled),
        taxRatePercent: formData.taxRatePercent ?? 3,
        taxDeduction: computedSalary.taxDeduction,
        totalDeductions: computedSalary.totalDeductions,
        netSalary: computedSalary.netSalary,
        biometricEnrollmentId:
          formData.biometricEnrollmentId?.trim() ||
          editingEmployee?.biometricEnrollmentId ||
          formData.employeeNumber.trim(),
        biometricDeviceIp:
          formData.biometricDeviceIp?.trim() || editingEmployee?.biometricDeviceIp,
        biometricModality:
          (formData.biometricModality as BiometricModality) ||
          editingEmployee?.biometricModality ||
          'multi_biometric',
        createdAt: editingEmployee ? editingEmployee.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const performer = currentUser?.fullName || currentUser?.username || 'مدير النظام';
      await employeeService.save(employeeRecord, performer);

      // Instant optimistic state update: avoids blocking the main thread with full database re-fetching
      setEmployees((prev) => {
        const exists = prev.some((e) => e.id === employeeRecord.id);
        const updated = exists
          ? prev.map((e) => (e.id === employeeRecord.id ? employeeRecord : e))
          : [employeeRecord, ...prev];
        notifyEmployeesChanged(updated);
        return updated;
      });

      setShowModal(false);
      toast.success(
        editingEmployee
          ? `تم تحديث بيانات الموظف (${employeeRecord.fullName}) بنجاح!`
          : `تمت إضافة الموظف الجديد (${employeeRecord.fullName}) بنجاح!`
      );
    } catch (err: any) {
      console.error('Error saving employee:', err);
      toast.error(`حدث خطأ أثناء الحفظ في قاعدة البيانات: ${err?.message || ''}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete employee: Move to Trash first with full Undo/Redo audit support
  const handleDeleteEmployee = async (id: string) => {
    // 1. Capture target employee in case rollback is needed
    const targetEmployee = employees.find((e) => e.id === id);
    if (!targetEmployee) return;

    // 2. Optimistic UI update: Remove immediately from State and notify parent App
    const updated = employees.filter((e) => e.id !== id);
    setEmployees(updated);
    notifyEmployeesChanged(updated);
    setDeleteConfirmId(null);
    setSelectedIds((prev) => prev.filter((item) => item !== id));

    try {
      // 3. Move to Trash Bin and push into Undo Stack
      moveToTrash([targetEmployee], 'مدير النظام', 'حذف فردي لسجل الموظف');

      // 4. Remove from active IndexedDB table
      await deleteEmployeeById(id);
      // Mark initialization flag so empty state is respected and never auto-seeded
      localStorage.setItem('gov_db_employees_initialized', 'true');

      // 5. Toast with instant Undo action button
      toast.info(
        `تم نقل الموظف (${targetEmployee.fullName}) إلى سلة المهملات. يمكنك التراجع الآن.`,
        {
          actionText: 'تراجع الآن',
          onAction: () => handleGlobalUndo(),
          durationMs: 6000,
        }
      );
      setSuccessMessage(`تم نقل سجل الموظف (${targetEmployee.fullName}) إلى سلة المهملات.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to delete employee from IndexedDB:', err);
      // 6. Rollback in case of storage failure
      const rolledBack = [...employees, targetEmployee];
      setEmployees(rolledBack);
      notifyEmployeesChanged(rolledBack);
      setErrorMessage('فشل نقل الموظف إلى السلة وتمت استعادة السجل.');
      setTimeout(() => setErrorMessage(null), 4000);
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

        <div className="flex items-center gap-1.5 self-end sm:self-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            id="switch-view-roster-tab"
            onClick={() => setActiveViewMode('roster')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeViewMode === 'roster'
                ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 shadow-2xs border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>سجل الموظفين والملاك</span>
          </button>
          <button
            type="button"
            id="switch-view-monthly-sheet-tab"
            onClick={() => setActiveViewMode('monthly_sheet')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeViewMode === 'monthly_sheet'
                ? 'bg-emerald-600 text-white shadow-2xs shadow-emerald-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>شيت الحضور السريع (1-31)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
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

          {/* Quick Undo Action */}
          <button
            type="button"
            id="quick-undo-btn"
            onClick={handleGlobalUndo}
            disabled={!canUndoState}
            className={`p-2.5 rounded-xl border transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              canUndoState
                ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 shadow-2xs'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
            }`}
            title={canUndoState ? 'تراجع عن آخر عملية حذف (Ctrl+Z)' : 'لا توجد عمليات حذف للتراجع عنها'}
          >
            <Undo2 className="w-4 h-4" />
          </button>

          {/* Quick Redo Action */}
          <button
            type="button"
            id="quick-redo-btn"
            onClick={handleGlobalRedo}
            disabled={!canRedoState}
            className={`p-2.5 rounded-xl border transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              canRedoState
                ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 shadow-2xs'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
            }`}
            title={canRedoState ? 'إعادة تطبيق العملية الملغاة (Ctrl+Y)' : 'لا توجد عمليات لإعادتها'}
          >
            <Redo2 className="w-4 h-4" />
          </button>

          {/* Trash Bin (سلة المهملات) Trigger Button */}
          <button
            type="button"
            id="open-employee-trash-btn"
            onClick={() => setIsTrashModalOpen(true)}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
              trashedCount > 0
                ? 'border-rose-300 dark:border-rose-800 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
            title="سلة مهملات الموظفين: استعادة السجلات المحذوفة أو حذفها نهائياً مع سجل التراجع الكامل"
          >
            <Trash2 className={`w-4 h-4 ${trashedCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`} />
            <span>سلة المهملات</span>
            {trashedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold animate-pulse">
                {trashedCount}
              </span>
            )}
          </button>

          {/* Import Excel / CSV */}
          <button
            type="button"
            id="open-excel-import-btn"
            onClick={() => setIsCsvModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="استيراد بيانات الموظفين من ملف Excel (.xlsx, .xls) أو ملف CSV"
          >
            <UploadCloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>استيراد Excel / CSV</span>
          </button>

          {/* Backup & Sync Modal Button */}
          <button
            type="button"
            onClick={() => setShowSyncBackupModal(true)}
            className="px-3.5 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="النسخ الاحتياطي السحابي والمحلي لقاعدة بيانات الدائرة"
          >
            <CloudUpload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>النسخ والربط السحابي</span>
          </button>

          {/* Quick JSON Backup */}
          <button
            type="button"
            onClick={handleQuickBackup}
            disabled={isExportingBackup}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
            title="تصدير نسخة احتياطية فورية JSON لقاعدة بيانات الدائرة على الحاسوب"
          >
            <Database className={`w-4 h-4 text-amber-600 dark:text-amber-400 ${isExportingBackup ? 'animate-pulse' : ''}`} />
            <span>{isExportingBackup ? 'جاري التصدير...' : 'نسخة JSON'}</span>
          </button>

          {/* Export Comprehensive Excel (.xlsx) */}
          <button
            type="button"
            id="export-comprehensive-excel-btn"
            onClick={() => handleExportComprehensiveExcel(false)}
            disabled={isExportingExcel}
            className="px-3.5 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700/80 bg-emerald-50/90 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
            title="تصدير جميع سجلات الموظفين والملاك والحركات الحالية إلى ملف Excel (.xlsx) مع تنسيق تلقائي للعناوين والبيانات"
          >
            <FileSpreadsheet className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 ${isExportingExcel ? 'animate-bounce' : ''}`} />
            <span>{isExportingExcel ? 'جاري التصدير...' : 'تصدير الشامل Excel (.xlsx)'}</span>
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

          {/* Official PDF Preview & Export */}
          <button
            type="button"
            id="open-employee-pdf-preview-btn"
            onClick={() => setIsEmployeePdfPreviewOpen(true)}
            className="px-3.5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="معاينة وحفظ كشف سجل الموظفين والملاك بصيغة PDF الرسمية A4 أوفلاين"
          >
            <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>معاينة وتصدير PDF</span>
          </button>

          {/* Switch / Open 1-31 Sheet */}
          <button
            type="button"
            id="toggle-1-31-sheet-header-btn"
            onClick={() => setActiveViewMode(activeViewMode === 'monthly_sheet' ? 'roster' : 'monthly_sheet')}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
              activeViewMode === 'monthly_sheet'
                ? 'border-emerald-500 bg-emerald-600 text-white shadow-emerald-600/30'
                : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/90 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
            }`}
            title="فتح شيت الحضور اليومي السريع والمصغر (1 - 31) بنظام الجداول الحكومية"
          >
            <Calendar className="w-4 h-4" />
            <span>{activeViewMode === 'monthly_sheet' ? 'عرض السجل الإداري' : 'شيت الحضور (1-31)'}</span>
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

          {/* Department Management Hub Button */}
          <button
            type="button"
            id="open-departments-manager-btn"
            onClick={() => setIsDepartmentModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50/90 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="إدارة وتعديل وحذف الأقسام والتشكيلات الإدارية ونقل الملاكات"
          >
            <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>إدارة الأقسام</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-200/80 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100 font-mono">
              {registeredDepartments.length || departmentOptions.length}
            </span>
          </button>

          {/* Audit Log / سجل تتبع التعديلات والعمليات الرقابية */}
          <button
            type="button"
            id="open-audit-log-btn"
            onClick={() => handleOpenAuditLog(undefined)}
            className="px-3.5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/90 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="سجل تتبع التعديلات والعمليات الرقابية الرسمية على ملفات الموظفين (Audit Log)"
          >
            <History className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>سجل التعديلات (Audit Log)</span>
          </button>

          {/* Biometric Devices & Plug-and-Play Hub / أجهزة البصمة والربط الآلي */}
          {onNavigate && (
            <button
              type="button"
              id="open-biometric-hub-btn"
              onClick={() => onNavigate('barcode_hub')}
              className="px-3.5 py-2.5 rounded-xl border border-sky-300 dark:border-sky-700 bg-sky-50/90 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-800 dark:text-sky-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="منظومة أجهزة البصمة وإعدادات الآي بي وفحص البينغ والربط المباشر مع شؤون الموظفين والإجازات"
            >
              <Fingerprint className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>أجهزة البصمة</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-200/80 dark:bg-sky-900 text-sky-900 dark:text-sky-100 font-mono">
                {biometricDevicesList.length || 4}
              </span>
            </button>
          )}

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

      {/* View Mode Switching: Quick Monthly Attendance Sheet vs Standard Roster */}
      {activeViewMode === 'monthly_sheet' ? (
        <div className="animate-in fade-in duration-200">
          <QuickMonthlyAttendanceSheet
            employees={employees}
            onEmployeesUpdated={(updated) => {
              setEmployees(updated);
              notifyEmployeesChanged(updated);
            }}
          />
        </div>
      ) : (
        <>
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

        {/* Primary Real-Time Filter Controls (Name, Department, Education Degree, Hire Date) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* 1. Real-Time Name / ID / Phone / Job Title Search */}
          <div className="md:col-span-4 relative">
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
          <div className="md:col-span-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                القسم أو التشكيل الإداري:
              </label>
              <button
                type="button"
                onClick={() => setIsDepartmentModalOpen(true)}
                className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-bold cursor-pointer"
              >
                + إدارة الأقسام
              </button>
            </div>
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

          {/* 3. Real-Time Education Degree Filter (يقرأ ويكتب، يقرأ فقط، دكتوراه، بكالوريوس...) */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              التحصيل الدراسي والشهادة:
            </label>
            <div className="relative">
              <GraduationCap className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedEducationDegree}
                onChange={(e) => setSelectedEducationDegree(e.target.value)}
                className="w-full pr-9 pl-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                <option value="all">كافة المؤهلات والشهادات ({employees.length})</option>
                {EDUCATION_DEGREE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.value} ({educationStats[opt.value] || 0} موظف) {opt.allowancePercent > 0 ? `[${opt.allowancePercent}%]` : '[بدون مخصصات]'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Real-Time Hire Date Search (Instant matching as typed) */}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              تاريخ المباشرة:
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-amber-600 dark:text-amber-400 pointer-events-none" />
              <input
                type="text"
                value={hireDateSearch}
                onChange={(e) => setHireDateSearch(e.target.value)}
                placeholder="سنة: 2024..."
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

            {selectedEducationDegree !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                <span>الشهادة: {selectedEducationDegree}</span>
                <button type="button" onClick={() => setSelectedEducationDegree('all')}>
                  <X className="w-3 h-3 hover:text-purple-950" />
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

              {/* Batch Transfer Department */}
              <button
                type="button"
                onClick={() => {
                  if (departmentOptions.length > 0) {
                    setBatchTransferTargetDept(departmentOptions[0]);
                  }
                  setIsBatchTransferModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer hover:bg-indigo-100"
                title="نقل الموظفين المحددين إلى قسم آخر دفعة واحدة"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>نقل للقسم ({selectedIds.length})</span>
              </button>

              {/* Batch Export Excel */}
              <button
                type="button"
                onClick={() => handleExportComprehensiveExcel(true)}
                disabled={isExportingExcel}
                className="px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
                title="تصدير بيانات الموظفين المحددين وحركاتهم إلى مصنف Excel منسق تلقائياً (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>تصدير المحدد Excel ({selectedIds.length})</span>
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

              {/* Batch PDF */}
              <button
                type="button"
                onClick={() => setIsEmployeePdfPreviewOpen(true)}
                className="px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                <span>معاينة PDF للمحدد ({selectedIds.length})</span>
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

      {/* 5. Employees View Mode Toolbar & Content */}
      <div className="space-y-3">
        {/* Layout Mode Switcher Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              سجلات الموظفين ({filteredEmployees.length})
            </span>
            {selectedIds.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                تم تحديد {selectedIds.length} موظف
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
            <button
              type="button"
              id="employee-view-mode-cards-btn"
              onClick={() => setEmployeeCardViewLayout('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                employeeCardViewLayout === 'cards'
                  ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="عرض بطاقات الموظفين مع الرسوم البيانية الدائرية لرصيد الإجازات (Recharts)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>بطاقات الموظفين (رسوم بيانية)</span>
            </button>
            <button
              type="button"
              id="employee-view-mode-table-btn"
              onClick={() => setEmployeeCardViewLayout('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                employeeCardViewLayout === 'table'
                  ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="عرض جدول السجلات والملاك"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>جدول البيانات</span>
            </button>
          </div>
        </div>

        {employeeCardViewLayout === 'cards' ? (
          /* Cards Grid View with Recharts Mini Charts */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                    </div>
                  </div>
                  <div className="h-24 bg-slate-100 dark:bg-slate-800/50 rounded-xl" />
                </div>
              ))
            ) : filteredEmployees.length === 0 ? (
              <div className="col-span-full p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">
                  لا توجد سجلات موظفين تطابق البحث الحالي.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="mt-2 text-xs text-amber-600 hover:underline font-semibold"
                >
                  + اضغط هنا لإضافة موظف جديد
                </button>
              </div>
            ) : (
              paginatedEmployees.map((emp) => {
                const isSelected = selectedIds.includes(emp.id);
                const isLowBalance =
                  appearance.showEarlyWarningBadges &&
                  emp.remainingBalance <= leaveRules.earlyWarningThresholdDays;

                return (
                  <div
                    key={emp.id}
                    className={`p-4.5 rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-150 shadow-xs hover:shadow-md flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-400 dark:border-amber-600 ring-2 ring-amber-400/20 bg-amber-50/20 dark:bg-amber-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Card Top: Checkbox, Avatar, Name, Job title, Contract badge */}
                      <div className="flex items-start justify-between gap-2.5 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Selection Checkbox */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(emp.id)}
                            className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0 mt-0.5"
                          />

                          {/* Avatar / Monogram */}
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/15 to-amber-600/25 border border-amber-300/40 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-sm shrink-0">
                            {emp.fullName.trim().charAt(0) || 'م'}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                {emp.fullName}
                              </h3>
                              {isLowBalance && (
                                <span className="shrink-0 p-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400" title="تحذير: رصيد الإجازات منخفض">
                                  <AlertTriangle className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                              <span className="font-mono">{emp.employeeNumber}</span>
                              <span>•</span>
                              <span className="truncate">{emp.jobTitle || 'موظف'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Contract & Status Badges */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {emp.status === 'five_year_leave' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 animate-pulse">
                              مجاز 5 سنوات (اسمي)
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              emp.contractType === 'permanent'
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {emp.contractType === 'permanent' ? 'ملاك دائم' : 'عقد وزاري'}
                          </span>
                        </div>
                      </div>

                      {/* Department, Division & Qualification Tags */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[11px]">
                        {/* Department Badge with dynamic color */}
                        {(() => {
                          const matchedDept = registeredDepartments.find((d) => d.name === emp.department);
                          const colorStyle = getColorClasses(matchedDept?.color);
                          return (
                            <span className={`px-2 py-0.5 rounded-lg border font-medium flex items-center gap-1 ${colorStyle.bg} ${colorStyle.text} ${colorStyle.border}`}>
                              <Building2 className="w-3 h-3" />
                              <span>{emp.department}</span>
                            </span>
                          );
                        })()}

                        {/* Education Degree Badge */}
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold flex items-center gap-1">
                          <GraduationCap className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span>{emp.educationDegree || 'بكالوريوس'}</span>
                          {(emp.educationAllowancePercent ?? 0) > 0 ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                              ({emp.educationAllowancePercent}%)
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">
                              (0%)
                            </span>
                          )}
                        </span>

                        {emp.division && (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px]">
                            {emp.division}
                          </span>
                        )}
                        {emp.phone && (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-[10px] font-mono flex items-center gap-1" dir="ltr">
                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                            <span>{emp.phone}</span>
                          </span>
                        )}
                      </div>

                      {/* Visual Recharts Mini Chart for Leave Balance */}
                      <div className="mb-3">
                        <EmployeeLeaveChart
                          remainingBalance={emp.remainingBalance}
                          usedBalance={Math.max(0, (emp.annualBalanceLimit || 36) - emp.remainingBalance)}
                          annualBalanceLimit={emp.annualBalanceLimit || 36}
                          isLowBalance={isLowBalance}
                          variant="card"
                        />
                      </div>

                      {/* Metadata bar: Hire date */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>تاريخ المباشرة:</span>
                        </span>
                        <span className="font-mono text-slate-600 dark:text-slate-300">{emp.hireDate}</span>
                      </div>

                      {/* Biometric Integration status badge */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pb-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-800">
                        <span className="flex items-center gap-1 text-sky-700 dark:text-sky-300 font-mono">
                          <Fingerprint className="w-3 h-3 text-sky-500" />
                          <span>معرف البصمة: <strong>{emp.biometricEnrollmentId || emp.employeeNumber.replace(/\D/g, '').slice(-4) || '1042'}</strong></span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
                          {emp.biometricDeviceIp || '192.168.1.201'}
                        </span>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="flex items-center justify-between gap-1.5 pt-1">
                      <div className="flex items-center gap-1">
                        {/* Master Unified Profile Modal */}
                        <button
                          type="button"
                          onClick={() => setProfileModalEmployeeId(emp.id)}
                          className="px-2 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                          title={`فتح الملف الموحد الشامل للموظف ${emp.fullName}`}
                        >
                          <UserCheck2 className="w-3 h-3" />
                          <span>الملف الموحد</span>
                        </button>

                        {/* Print Badge */}
                        <button
                          type="button"
                          onClick={() => setBadgeModalEmployee(emp)}
                          className="p-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                          title="طباعة بطاقة الهوية الرسمية والباركود"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>

                        {/* 1-31 Quick Attendance Sheet */}
                        <button
                          type="button"
                          onClick={() => setQuickAttendanceEmployee(emp)}
                          className="px-2 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                          title={`فتح شيت الحضور اليومي والمصغر (1-31) للموظف ${emp.fullName}`}
                        >
                          <Calendar className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span>شيت 1-31</span>
                        </button>

                        {/* Add Leave */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMovementEmployeeId(emp.id);
                            setMovementInitialCategory('leave');
                            setIsMovementModalOpen(true);
                          }}
                          className="px-2 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                          title={`تسجيل إجازة للموظف ${emp.fullName}`}
                        >
                          <Calendar className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>إجازة</span>
                        </button>

                        {/* Add Movement */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMovementEmployeeId(emp.id);
                            setMovementInitialCategory('attendance');
                            setIsMovementModalOpen(true);
                          }}
                          className="px-2 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                          title={`تسجيل حركة للموظف ${emp.fullName}`}
                        >
                          <Plus className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          <span>حركة</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Audit Log for this employee */}
                        <button
                          type="button"
                          onClick={() => handleOpenAuditLog(emp.id)}
                          className="p-1.5 rounded-xl text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                          title="سجل تتبع التعديلات والعمليات لهذا الموظف (Audit Log)"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(emp)}
                          className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="تعديل بيانات الموظف"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {deleteConfirmId === emp.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteEmployee(emp.id)}
                              className="px-2 py-0.5 bg-rose-600 text-white rounded-lg text-[10px] font-bold cursor-pointer hover:bg-rose-700"
                            >
                              تأكيد
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-1 text-slate-400 text-[10px] hover:text-slate-600 cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(emp.id)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="حذف سجل الموظف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Table View */
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
                <th className={appearance.compactTable ? 'p-2' : 'p-3.5'}>القسم والتشكيل</th>
                <th className={appearance.compactTable ? 'p-2' : 'p-3.5'}>الشهادة والمؤهل</th>
                <th className={appearance.compactTable ? 'p-2' : 'p-3.5'}>الصفة الوظيفية</th>
                <th className={appearance.compactTable ? 'p-2' : 'p-3.5'}>رصيد الإجازات (2026)</th>
                <th className={appearance.compactTable ? 'p-2' : 'p-3.5'}>تاريخ المباشرة</th>
                <th className={`${appearance.compactTable ? 'p-2' : 'p-3.5'} text-center`}>الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                      <span>جاري استرجاع السجلات من IndexedDB...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400">
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
                paginatedEmployees.map((emp) => {
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
                        <button
                          type="button"
                          onClick={() => setProfileModalEmployeeId(emp.id)}
                          className="font-bold text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 hover:underline cursor-pointer text-right flex items-center gap-1.5"
                          title="عرض الملف الموحد الشامل للموظف"
                        >
                          <span>{emp.fullName}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-mono">
                            ملف موحد
                          </span>
                        </button>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {emp.phone && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                              <Phone className="w-2.5 h-2.5" />
                              <span dir="ltr">{emp.phone}</span>
                            </span>
                          )}
                          <span className="inline-flex items-center gap-0.5 text-[9px] text-sky-700 dark:text-sky-300 font-mono px-1 py-0.2 rounded bg-sky-50 dark:bg-sky-950/40 border border-sky-200/50">
                            <Fingerprint className="w-2.5 h-2.5" />
                            <span>PIN: {emp.biometricEnrollmentId || emp.employeeNumber.replace(/\D/g, '').slice(-4) || '1042'}</span>
                          </span>
                        </div>
                      </td>

                      {/* Department & Division with Color Styling */}
                      <td className={appearance.compactTable ? 'p-2' : 'p-3.5'}>
                        {(() => {
                          const matchedDept = registeredDepartments.find((d) => d.name === emp.department);
                          const colorStyle = getColorClasses(matchedDept?.color);
                          return (
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`px-2 py-0.5 rounded-lg border font-semibold text-[11px] inline-flex items-center gap-1 ${colorStyle.bg} ${colorStyle.text} ${colorStyle.border}`}>
                                <Building2 className="w-3 h-3" />
                                <span>{emp.department}</span>
                              </span>
                              {emp.division && (
                                <div className="text-[10px] text-slate-400 font-medium">{emp.division}</div>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Education Qualification & Allowance */}
                      <td className={appearance.compactTable ? 'p-2' : 'p-3.5'}>
                        <div className="flex flex-col gap-0.5 items-start">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-[11px] inline-flex items-center gap-1">
                            <GraduationCap className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>{emp.educationDegree || 'بكالوريوس'}</span>
                          </span>
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                            {(emp.educationAllowancePercent ?? 0) > 0 ? `${emp.educationAllowancePercent}% مخصصات` : 'بدون مخصصات (0%)'}
                          </span>
                        </div>
                      </td>

                      {/* Contract Type Badge */}
                      <td
                        className={`${
                          appearance.compactTable ? 'p-2' : 'p-3.5'
                        } whitespace-nowrap`}
                      >
                        <div className="flex flex-col gap-1 items-start">
                          {emp.status === 'five_year_leave' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 animate-pulse">
                              مجاز 5 سنوات (اسمي)
                            </span>
                          )}
                          {emp.contractType === 'permanent' ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              ملاك دائم (تراكمي)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              عقد وزاري (غير تراكمي)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Balance */}
                      <td
                        className={`${
                          appearance.compactTable ? 'p-2' : 'p-3.5'
                        } whitespace-nowrap`}
                      >
                        <div className="flex items-center gap-2.5">
                          <EmployeeLeaveChart
                            variant="mini"
                            remainingBalance={emp.remainingBalance}
                            usedBalance={Math.max(0, (emp.annualBalanceLimit || 36) - emp.remainingBalance)}
                            annualBalanceLimit={emp.annualBalanceLimit || 36}
                            isLowBalance={isLowBalance}
                          />
                          <div>
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
                            <div className="w-20 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mt-1 overflow-hidden">
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
                          </div>
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
                          {/* Quick Monthly Attendance Sheet (1-31) for this employee */}
                          <button
                            type="button"
                            onClick={() => setProfileModalEmployeeId(emp.id)}
                            className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                            title={`فتح ملف الموظف الموحد الشامل (السجل، العلاوات، التقاعد، الباركود)`}
                          >
                            <UserCheck2 className="w-3 h-3" />
                            <span>الملف الموحد</span>
                          </button>

                          {/* Badge print button */}
                          <button
                            type="button"
                            onClick={() => setBadgeModalEmployee(emp)}
                            className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                            title={`عرض وطباعة بطاقة الهوية والباركود للموظف ${emp.fullName}`}
                          >
                            <QrCode className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                            <span>الهوية</span>
                          </button>

                          {/* Quick Monthly Attendance Sheet (1-31) for this employee */}
                          <button
                            type="button"
                            onClick={() => setQuickAttendanceEmployee(emp)}
                            className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                            title={`فتح شيت الحضور اليومي والمصغر (1-31) للموظف ${emp.fullName}`}
                          >
                            <Calendar className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>شيت 1-31</span>
                          </button>

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
                            onClick={() => handleOpenAuditLog(emp.id)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                            title="سجل تتبع التعديلات والعمليات لهذا الموظف (Audit Log)"
                          >
                            <History className="w-4 h-4" />
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
        )}

        {/* 5.5. Ultra-Fast Responsive Pagination Controls Bar */}
        {filteredEmployees.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-xs mt-3 no-print">
            {/* Range & Count Summary */}
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <span>عرض</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                {pageSize === 0 ? 1 : (safeCurrentPage - 1) * pageSize + 1}
              </span>
              <span>-</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                {pageSize === 0 ? totalItems : Math.min(safeCurrentPage * pageSize, totalItems)}
              </span>
              <span>من أصل</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 font-mono px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
                {totalItems}
              </span>
              <span>موظفاً</span>
            </div>

            {/* Page Size Switcher (20 / 30 / 50 / 100 / الكل) */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 hidden md:inline">عدد الموظفين بالصفحة:</span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80">
                {[20, 30, 50, 100, 0].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setPageSize(size);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                      pageSize === size
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {size === 0 ? 'الكل' : size}
                  </button>
                ))}
              </div>
            </div>

            {/* Pagination Navigation Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5" dir="rtl">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1 cursor-pointer"
                  title="الصفحة السابقة"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">السابق</span>
                </button>

                {/* Numbered Page Buttons with Smart Ellipsis */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      if (totalPages <= 7) return true;
                      if (p === 1 || p === totalPages) return true;
                      return Math.abs(p - safeCurrentPage) <= 1;
                    })
                    .reduce<(number | string)[]>((acc, p, idx, arr) => {
                      if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) {
                        acc.push('...');
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, idx) =>
                      p === '...' ? (
                        <span key={`dots-${idx}`} className="px-1 text-slate-400 font-mono">
                          ...
                        </span>
                      ) : (
                        <button
                          key={`page-${p}`}
                          type="button"
                          onClick={() => setCurrentPage(p as number)}
                          className={`w-7 h-7 rounded-xl font-bold font-mono text-xs transition-colors cursor-pointer ${
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

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1 cursor-pointer"
                  title="الصفحة التالية"
                >
                  <span className="hidden sm:inline">التالي</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      </>
      )}

      {/* 6. Add / Edit Modal Window (macOS Frosted Modal) */}
      {showModal && typeof document !== 'undefined' && createPortal(
        <div
          id="employee-form-modal-backdrop"
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) {
              setShowModal(false);
            }
          }}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] my-auto overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    {editingEmployee ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {editingEmployee ? 'تعديل بيانات الموظف' : 'تسجيل موظف جديد في المنظومة'}
                      </h3>
                      {editingEmployee && (
                        <div className="flex items-center gap-1">
                          {autoSaveStatus === 'saving' && (
                            <span className="flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold animate-pulse">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>حفظ تلقائي...</span>
                            </span>
                          )}
                          {autoSaveStatus === 'saved' && (
                            <span className="flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>تم الحفظ تلقائياً ({lastAutoSaveTime})</span>
                            </span>
                          )}
                          {autoSaveStatus === 'idle' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                              ⚡ الحفظ التلقائي مفعّل فورياً
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {editingEmployee
                        ? 'تُحفظ أي تعديلات على الحقول تلقائياً في قاعدة البيانات (IndexedDB) بمجرد الكتابة.'
                        : 'سيتم حفظ السجل تلقائياً في قاعدة البيانات المحلية (IndexedDB)'}
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
                      onChange={(e) => handleFormFieldChange('fullName', e.target.value)}
                      onBlur={handleFieldBlur}
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
                      onChange={(e) => handleFormFieldChange('employeeNumber', e.target.value)}
                      onBlur={handleFieldBlur}
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300">
                        القسم أو التشكيل *
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsCustomDeptInput(!isCustomDeptInput)}
                          className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-bold cursor-pointer"
                        >
                          {isCustomDeptInput ? 'اختيار من القائمة' : '+ كتابة قسم يدوي'}
                        </button>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <button
                          type="button"
                          onClick={() => setIsDepartmentModalOpen(true)}
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
                        >
                          إدارة الأقسام
                        </button>
                      </div>
                    </div>

                    {isCustomDeptInput ? (
                      <input
                        type="text"
                        required
                        value={formData.department}
                        onChange={(e) => handleFormFieldChange('department', e.target.value)}
                        onBlur={handleFieldBlur}
                        placeholder="أدخل اسم القسم أو التشكيل يدوياً..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                      />
                    ) : (
                      <select
                        required
                        value={formData.department}
                        onChange={(e) => handleFormFieldChange('department', e.target.value)}
                        onBlur={handleFieldBlur}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                      >
                        {departmentOptions.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                        {formData.department && !departmentOptions.includes(formData.department) && (
                          <option value={formData.department}>{formData.department}</option>
                        )}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      الشعبة أو الوحدة
                    </label>
                    <input
                      type="text"
                      value={formData.division}
                      onChange={(e) => handleFormFieldChange('division', e.target.value)}
                      onBlur={handleFieldBlur}
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
                      onChange={(e) => handleFormFieldChange('jobTitle', e.target.value)}
                      onBlur={handleFieldBlur}
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
                      onChange={(e) => handleFormFieldChange('phone', e.target.value)}
                      onBlur={handleFieldBlur}
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
                      onChange={(e) => handleFormFieldChange('hireDate', e.target.value)}
                      onBlur={handleFieldBlur}
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
                        handleFormFieldChange('annualBalanceLimit', Number(e.target.value))
                      }
                      onBlur={handleFieldBlur}
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
                        handleFormFieldChange('usedBalance', Number(e.target.value))
                      }
                      onBlur={handleFieldBlur}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Central Statistics, National ID & Civil Record */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-amber-500" />
                      البيانات الإحصائية والهوية الوطنية والتقاعدية
                    </span>
                    <span className="text-[10px] text-slate-400">التوثيق الإداري المركزي الموحد</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        الرقم الإحصائي المركزي
                      </label>
                      <input
                        type="text"
                        value={formData.nationalStatisticalNumber || ''}
                        onChange={(e) => handleFormFieldChange('nationalStatisticalNumber', e.target.value)}
                        onBlur={handleFieldBlur}
                        placeholder="STAT-XXXXXXXX"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                        dir="ltr"
                        style={{ textAlign: 'right' }}
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        رقم البطاقة الوطنية الموحدة
                      </label>
                      <input
                        type="text"
                        value={formData.nationalId || ''}
                        onChange={(e) => handleFormFieldChange('nationalId', e.target.value)}
                        onBlur={handleFieldBlur}
                        placeholder="1990XXXXXXXX"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                        dir="ltr"
                        style={{ textAlign: 'right' }}
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        رقم السجل / الإضبارة التقاعدية
                      </label>
                      <input
                        type="text"
                        value={formData.pensionFileNumber || ''}
                        onChange={(e) => handleFormFieldChange('pensionFileNumber', e.target.value)}
                        onBlur={handleFieldBlur}
                        placeholder="PEN-XXXXX"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                        dir="ltr"
                        style={{ textAlign: 'right' }}
                      />
                    </div>
                  </div>

                  {/* Birth Date, Gender, Current Age & Retirement Countdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        تاريخ الميلاد (السن القانوني)
                      </label>
                      <input
                        type="date"
                        value={formData.birthDate || '1990-01-01'}
                        onChange={(e) => handleFormFieldChange('birthDate', e.target.value)}
                        onBlur={handleFieldBlur}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        الجنس
                      </label>
                      <select
                        value={formData.gender || 'male'}
                        onChange={(e) => handleFormFieldChange('gender', e.target.value as 'male' | 'female')}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-amber-500/40"
                      >
                        <option value="male">ذكر</option>
                        <option value="female">أنثى (مستحقة لإجازات الأمومة والوضع)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        الحالة الوظيفية بالنظام
                      </label>
                      <select
                        value={formData.status || 'active'}
                        onChange={(e) => handleFormFieldChange('status', e.target.value as EmployeeStatus)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-amber-500/40"
                      >
                        <option value="active">ملاك مستمر / مباشر (نشط)</option>
                        <option value="five_year_leave">مجاز 5 سنوات (براتب اسمي)</option>
                        <option value="on_leave">متمتع بإجازة اعتيادية/مرضية</option>
                        <option value="retired">محال إلى التقاعد</option>
                        <option value="suspended">موقوف عن العمل / سحب يد</option>
                      </select>
                    </div>

                    {/* Age and Retirement Info Badge */}
                    <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex flex-col justify-center text-[11px]">
                      {(() => {
                        if (!formData.birthDate) return <span className="text-slate-400">حدد تاريخ الميلاد</span>;
                        const bDate = new Date(formData.birthDate);
                        const now = new Date();
                        const ageYears = now.getFullYear() - bDate.getFullYear();
                        const retireYear = bDate.getFullYear() + 60;
                        const yearsLeft = Math.max(0, 60 - ageYears);
                        return (
                          <>
                            <div className="flex items-center justify-between text-purple-900 dark:text-purple-200 font-bold">
                              <span>العمر التقديري:</span>
                              <span className="font-mono">{ageYears} سنة</span>
                            </div>
                            <div className="flex items-center justify-between text-purple-700 dark:text-purple-300 text-[10px] mt-0.5">
                              <span>التقاعد (سن 60):</span>
                              <span className="font-mono">{retireYear} ({yearsLeft === 0 ? 'مستحق حالياً' : `متبقي ${yearsLeft} سنة`})</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Academic Degree, Specialization & Confirmation Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-semibold text-slate-700 dark:text-slate-300">
                          التحصيل الدراسي والشهادة
                        </label>
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 font-mono">
                          {formData.educationAllowancePercent ?? 0}% مخصصات
                        </span>
                      </div>
                      <select
                        value={formData.educationDegree || 'بكالوريوس'}
                        onChange={(e) => {
                          const deg = e.target.value;
                          handleFormFieldChange('educationDegree', deg);
                          const opt = EDUCATION_DEGREE_OPTIONS.find((o) => o.value === deg);
                          const pct = opt ? opt.allowancePercent : inferEducationPercent(deg);
                          handleFormFieldChange('educationAllowancePercent', pct);
                          // Auto suggest initial civil grade if newly adding employee
                          if (!editingEmployee && opt) {
                            handleFormFieldChange('civilGrade', opt.initialCivilGrade);
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-amber-500/40"
                      >
                        {EDUCATION_DEGREE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        التخصص الأكاديمي أو المهني
                      </label>
                      <input
                        type="text"
                        value={formData.specialization || ''}
                        onChange={(e) => handleFormFieldChange('specialization', e.target.value)}
                        onBlur={handleFieldBlur}
                        placeholder="مثال: هندسة تقنيات الحاسوب / إدارة أعمال"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        تاريخ التثبيت على الملاك
                      </label>
                      <input
                        type="date"
                        value={formData.confirmationDate || ''}
                        onChange={(e) => handleFormFieldChange('confirmationDate', e.target.value)}
                        onBlur={handleFieldBlur}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500/40 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Iraqi Civil Service Salary & Allowances Section */}
                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-amber-200 dark:border-amber-800/60">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-amber-600" />
                      الدرجة والمرحلة وسلم الرواتب والمخصصات (قانون 22 لسنة 2008)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const g = formData.civilGrade ?? 7;
                        const s = formData.civilStage ?? 1;
                        const scaleBase = getOfficialBaseSalary(g, s);
                        handleFormFieldChange('baseSalary', scaleBase);
                      }}
                      className="text-[11px] text-amber-700 dark:text-amber-300 font-bold hover:underline cursor-pointer"
                    >
                      استرجاع الراتب الاسمي من السلم الرسمي
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        الدرجة الوظيفية (1 - 10)
                      </label>
                      <select
                        value={formData.civilGrade ?? 7}
                        onChange={(e) => {
                          const g = Number(e.target.value);
                          handleFormFieldChange('civilGrade', g);
                          handleFormFieldChange('baseSalary', getOfficialBaseSalary(g, formData.civilStage ?? 1));
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold font-mono focus:ring-2 focus:ring-amber-500/40"
                      >
                        {Object.values(IRAQI_SALARY_SCALE).map((def) => (
                          <option key={def.grade} value={def.grade}>
                            {def.gradeNameAr} (الدرجة {def.grade})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        المرحلة (1 - 11)
                      </label>
                      <select
                        value={formData.civilStage ?? 1}
                        onChange={(e) => {
                          const s = Number(e.target.value);
                          handleFormFieldChange('civilStage', s);
                          handleFormFieldChange('baseSalary', getOfficialBaseSalary(formData.civilGrade ?? 7, s));
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold font-mono focus:ring-2 focus:ring-amber-500/40"
                      >
                        {Array.from({ length: 11 }, (_, i) => i + 1).map((s) => (
                          <option key={s} value={s}>
                            المرحلة {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        الراتب الاسمي (دينار)
                      </label>
                      <input
                        type="number"
                        step={1000}
                        value={formData.baseSalary ?? 296000}
                        onChange={(e) => handleFormFieldChange('baseSalary', Number(e.target.value))}
                        onBlur={handleFieldBlur}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold font-mono text-amber-600 focus:ring-2 focus:ring-amber-500/40"
                      />
                    </div>
                  </div>

                  {/* Marital, Children, Hazard, and Optional Tax */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        مخصصات الزوجية (50,000 د.ع)
                      </label>
                      <div className="flex items-center gap-2 pt-1.5">
                        <input
                          type="checkbox"
                          id="formHasSpouseCheck"
                          checked={formData.hasSpouseAllowance ?? true}
                          onChange={(e) => handleFormFieldChange('hasSpouseAllowance', e.target.checked)}
                          className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                        />
                        <label htmlFor="formHasSpouseCheck" className="text-slate-700 dark:text-slate-300 font-bold cursor-pointer">
                          {(formData.hasSpouseAllowance ?? true) ? 'مستحق (50,000)' : 'غير مستحق'}
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        عدد الأطفال (0 - 4)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={4}
                        value={formData.childrenCount ?? 2}
                        onChange={(e) => handleFormFieldChange('childrenCount', Number(e.target.value))}
                        onBlur={handleFieldBlur}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        مخصصات الخطورة (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={5}
                        value={formData.hazardAllowancePercent ?? 20}
                        onChange={(e) => handleFormFieldChange('hazardAllowancePercent', Number(e.target.value))}
                        onBlur={handleFieldBlur}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        ضريبة الدخل (اختياري)
                      </label>
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="formTaxCheck"
                          checked={Boolean(formData.isTaxEnabled)}
                          onChange={(e) => handleFormFieldChange('isTaxEnabled', e.target.checked)}
                          className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                        />
                        <label htmlFor="formTaxCheck" className="text-slate-700 dark:text-slate-300 font-bold cursor-pointer">
                          {formData.isTaxEnabled ? 'مفعلة (3%)' : 'معفى'}
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Real-time salary calculation badge */}
                  {(() => {
                    const c = computeEmployeeSalaryComponents({
                      civilGrade: formData.civilGrade ?? 7,
                      civilStage: formData.civilStage ?? 1,
                      baseSalary: formData.baseSalary,
                      hasSpouseAllowance: formData.hasSpouseAllowance ?? true,
                      childrenCount: formData.childrenCount ?? 2,
                      educationDegree: formData.educationDegree,
                      educationAllowancePercent: formData.educationAllowancePercent ?? 45,
                      hazardAllowancePercent: formData.hazardAllowancePercent ?? 20,
                      isTaxEnabled: formData.isTaxEnabled,
                      taxRatePercent: formData.taxRatePercent ?? 3,
                    });
                    return (
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-[11px] flex flex-wrap items-center justify-between gap-2">
                        <span>الاسمي: <strong>{formatIQD(c.baseSalary)}</strong></span>
                        <span className="text-emerald-600">+ مخصصات: <strong>{formatIQD(c.totalAllowances)}</strong></span>
                        <span className="text-rose-600">- استقطاعات: <strong>{formatIQD(c.totalDeductions)}</strong></span>
                        <span className="font-black text-amber-600">= الصافي: <strong>{formatIQD(c.netSalary)}</strong></span>
                      </div>
                    );
                  })()}
                </div>

                {/* Biometric Integration & IP Settings / إعدادات والتعرف على أجهزة البصمة */}
                <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/60 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-sky-200 dark:border-sky-800/60">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                      <Fingerprint className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      التعرف على أجهزة البصمة وإعدادات الآي بي والربط المباشر
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsBiometricDeviceModalOpen(true)}
                        className="text-[11px] text-sky-700 dark:text-sky-300 font-bold hover:underline cursor-pointer flex items-center gap-1"
                        title="إضافة جهاز بصمة جديد أو تعديل الآي بي والمنفذ"
                      >
                        <Network className="w-3.5 h-3.5" />
                        <span>إدارة عناوين الآي بي</span>
                      </button>
                      {onNavigate && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowModal(false);
                            onNavigate('barcode_hub');
                          }}
                          className="text-[11px] text-indigo-700 dark:text-indigo-300 font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Laptop className="w-3.5 h-3.5" />
                          <span>شاشة البصمة والتقارير</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* 1. Device PIN / User ID */}
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                        معرف البصمة بالجهاز (Device PIN / User ID)
                      </label>
                      <input
                        type="text"
                        value={formData.biometricEnrollmentId || ''}
                        onChange={(e) => handleFormFieldChange('biometricEnrollmentId', e.target.value)}
                        onBlur={handleFieldBlur}
                        placeholder="مثال: 1042 أو الرقم الوظيفي"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-sky-500/40 focus:outline-none"
                        dir="ltr"
                        style={{ textAlign: 'right' }}
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        الرقم المسجل للموظف في ذاكرة جهاز البصمة
                      </span>
                    </div>

                    {/* 2. Device Selection & IP Address */}
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                        عنوان الآي بي / جهاز البصمة المرتبط
                      </label>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={formData.biometricDeviceIp || (biometricDevicesList[0]?.ipAddress || '192.168.1.201')}
                          onChange={(e) => handleFormFieldChange('biometricDeviceIp', e.target.value)}
                          className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-sky-500/40"
                          dir="ltr"
                        >
                          {biometricDevicesList.map((d) => (
                            <option key={d.id} value={d.ipAddress}>
                              {d.name.length > 25 ? d.name.slice(0, 25) + '...' : d.name} ({d.ipAddress})
                            </option>
                          ))}
                          <option value="192.168.1.201">192.168.1.201 (جهاز البوابة الرئيسي)</option>
                          <option value="192.168.1.202">192.168.1.202 (جهاز قسم الهندسة)</option>
                          <option value="192.168.1.203">192.168.1.203 (جهاز الموارد البشرية)</option>
                          <option value="127.0.0.1 (USB-DIRECT)">127.0.0.1 (كابل USB مباشر بالحاسبة)</option>
                        </select>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        آي بي الجهاز في الشبكة أو اتصال USB
                      </span>
                    </div>

                    {/* 3. Biometric Modality */}
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                        نوع البصمة المعتمدة للموظف
                      </label>
                      <select
                        value={formData.biometricModality || 'multi_biometric'}
                        onChange={(e) => handleFormFieldChange('biometricModality', e.target.value as BiometricModality)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-sky-500/40"
                      >
                        <option value="multi_biometric">🌟 متعدد حيوي شامل (وجه + إصبع + كف)</option>
                        <option value="fingerprint">👆 بصمة الإصبع (Optical / Capacitive)</option>
                        <option value="face">👤 بصمة الوجه (AI Facial Recognition)</option>
                        <option value="iris_palm">✋ بصمة الكف وقزحية العين (Palm/Iris)</option>
                        <option value="rfid_card">💳 بطاقة الدوام الذكية (RFID / Mifare)</option>
                      </select>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        يدعم جميع خوارزميات وأنواع البصمة الحيوية
                      </span>
                    </div>
                  </div>

                  {/* Quick Ping Test Bar */}
                  <div className="pt-2 border-t border-sky-100 dark:border-sky-800/40 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePingFormDevice}
                        disabled={isPingingDevice}
                        className="px-3 py-1.5 rounded-xl font-bold bg-sky-600 hover:bg-sky-700 text-white text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Activity className={`w-3.5 h-3.5 ${isPingingDevice ? 'animate-spin' : ''}`} />
                        <span>{isPingingDevice ? 'جارٍ فحص البينغ...' : 'فحص البينغ والاتصال بالجهاز (Ping Test)'}</span>
                      </button>

                      {pingResultText && (
                        <span className="text-[11px] font-mono font-medium px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-800">
                          {pingResultText}
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>مربوط آلياً مع حركات الحضور والإجازات والإحصائيات</span>
                    </div>
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
                    onChange={(e) => handleFormFieldChange('notes', e.target.value)}
                    onBlur={handleFieldBlur}
                    placeholder="أي توجيهات أو أوامر إدارية خاصة بالموظف..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/40 focus:outline-none resize-none"
                  />
                </div>

                {/* Modal Buttons */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2.5">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {editingEmployee ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        حفظ فوري تلقائي في IndexedDB عند تعديل أي حقل
                      </span>
                    ) : (
                      <span>حفظ آمن في IndexedDB على هذا الجهاز أوفلاين</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      {editingEmployee ? 'إغلاق' : 'إلغاء'}
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
                            {editingEmployee ? 'حفظ فوري وإغلاق' : 'حفظ الموظف في IndexedDB'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

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
      {showBatchDeleteConfirm && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isBatchDeleting) {
              setShowBatchDeleteConfirm(false);
            }
          }}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  نقل المحدد إلى سلة المهملات
                </h3>
                <p className="text-xs text-slate-500">قابلة للتراجع والاسترجاع في أي وقت</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف{' '}
              <strong className="text-rose-600 font-bold">({selectedIds.length})</strong> من
              سجلات الموظفين ونقلهم إلى سلة المهملات (Trash Bin)؟ ستتمكن من استرجاعهم فوراً بضغطة زر.
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
                    <span>جاري النقل للسلة...</span>
                  </>
                ) : (
                  <span>نقل المحدد إلى سلة المهملات</span>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Supercharged Movement Modal with many options */}
      <AddMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        employees={employees}
        defaultEmployeeId={selectedMovementEmployeeId}
        defaultCategory={movementInitialCategory}
        onRecordSaved={(newRec, updatedEmp) => {
          if (updatedEmp) {
            const updated = employees.map((e) => (e.id === updatedEmp.id ? updatedEmp : e));
            setEmployees(updated);
            notifyEmployeesChanged(updated);
            toast.success(
              `تم تسجيل ${newRec.movementTitle || 'الحركة'} وتحديث رصيد الموظف (${updatedEmp.fullName}) إلى ${updatedEmp.remainingBalance} يوماً`
            );
          } else {
            toast.success(`تم تسجيل ${newRec.movementTitle || 'الحركة'} بنجاح للموظف (${newRec.employeeName || ''})`);
          }
        }}
      />

      {/* 10. Offline-First & Department Independence Backup / Sync On-Demand Modal */}
      {showSyncBackupModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSyncBackupModal(false);
            }
          }}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                    <CloudUpload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      استقلالية الدائرة والنسخ الاحتياطي السحابي (Offline-First)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      قاعدة بيانات محلية مستقلة 100% مع خيارات المزامنة عند الطلب فقط
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSyncBackupModal(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Offline-First Architecture Banner */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
                  <HardDrive className="w-4 h-4 text-emerald-600" />
                  <span>معمارية النظام: محلي ومستقل بالكامل (No External Dependency)</span>
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 leading-relaxed">
                  تعمل المنظومة على حاسوب الدائرة مباشرة دون أي اتصال إلزامي بالإنترنت أو بخوادم خارجية. يتم تخزين وحذف السجلات فورياً في متصفحك عبر تقنية IndexedDB المشفرة محلياً دون أي استرجاع تلقائي أو مزامنة إجبارية.
                </p>
              </div>

              {/* On-Demand Export & Sync Options */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  خيارات التصدير والنسخ الاحتياطي عند الطلب:
                </h4>

                {/* Option 1: Direct JSON Export */}
                <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700/60 transition-colors flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        تصدير ملف نسخة احتياطية محلية (JSON)
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        يشمل كافة سجلات الموظفين، الحركات، الإجازات، وإعدادات الدائرة.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSyncBackupModal(false);
                      handleQuickBackup();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs shrink-0 cursor-pointer"
                  >
                    تصدير الآن
                  </button>
                </div>

                {/* Option 2: Cloud Sync / Google Drive Ready */}
                <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-colors flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      <CloudUpload className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        المزامنة مع السحابة / Google Drive (عند الطلب فقط)
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        بنية جاهزة لرفع النسخة الاحتياطية بأمان أو مزامنة التغييرات حسب رغبة المشرف.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      // Generate and download the JSON backup file then provide instructions
                      handleQuickBackup();
                      setSuccessMessage('تم توليد النسخة الاحتياطية المشفرة بنجاح، يمكنك الآن رفع الملف مباشرة إلى حساب Google Drive أو التخزين السحابي المعتمد في دائرتكم.');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs shrink-0 cursor-pointer"
                  >
                    مزامنة ورفع
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setShowSyncBackupModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Official PDF Document Preview & Offline Export Modal */}
      {isEmployeePdfPreviewOpen && (
        <PdfReportPreviewModal
          isOpen={isEmployeePdfPreviewOpen}
          onClose={() => setIsEmployeePdfPreviewOpen(false)}
          title={selectedIds.length > 0 ? `كشف بيانات الموظفين المحددين (${selectedIds.length})` : 'سجل كشف موظفي الدائرة والملاك'}
          subtitle={`جمهورية العراق - دائرة الموارد البشرية | إجمالي السجلات: ${
            selectedIds.length > 0 ? selectedIds.length : filteredEmployees.length
          }`}
          appearance={appearance}
          records={(selectedIds.length > 0 
            ? employees.filter(e => selectedIds.includes(e.id))
            : filteredEmployees
          ).map(e => ({
            id: e.id,
            employeeNumber: e.employeeNumber,
            employeeName: e.fullName,
            department: e.department,
            category: e.contractType === 'permanent' ? 'leave' : 'mission',
            type: e.contractType === 'permanent' ? 'ملاك دائم' : 'عقد وزاري 315',
            startDate: e.hireDate,
            endDate: e.hireDate,
            daysCount: e.remainingBalance || 0,
            status: 'approved',
            orderNumber: e.phone || '-',
            notes: e.jobTitle || e.notes || '-',
          }))}
          columns={[
            { header: 'ت', key: 'id' },
            { header: 'الرقم الوظيفي', key: 'employeeNumber' },
            { header: 'الاسم الكامل', key: 'employeeName' },
            { header: 'القسم / التشكيل', key: 'department' },
            { header: 'العنوان الوظيفي', key: 'notes' },
            { header: 'نوع الملاك', key: 'type' },
            { header: 'تاريخ المباشرة', key: 'startDate' },
            { header: 'الرصيد المتبقي', key: 'daysCount' },
            { header: 'الهاتف', key: 'orderNumber' },
          ]}
          summaryStats={[
            { label: 'إجمالي الموظفين', value: selectedIds.length > 0 ? selectedIds.length : filteredEmployees.length },
            { 
              label: 'ملاك دائم', 
              value: (selectedIds.length > 0 
                ? employees.filter(e => selectedIds.includes(e.id)) 
                : filteredEmployees
              ).filter(e => e.contractType === 'permanent').length 
            },
            { 
              label: 'عقود وزارية (315)', 
              value: (selectedIds.length > 0 
                ? employees.filter(e => selectedIds.includes(e.id)) 
                : filteredEmployees
              ).filter(e => e.contractType === 'contract').length 
            },
            { 
              label: 'مجموع الأرصدة المتبقية', 
              value: (selectedIds.length > 0 
                ? employees.filter(e => selectedIds.includes(e.id)) 
                : filteredEmployees
              ).reduce((acc, curr) => acc + (curr.remainingBalance || 0), 0) + ' يوماً'
            },
          ]}
        />
      )}

      {/* 11. Quick Employee Monthly 1-31 Attendance Modal */}
      <EmployeeQuickAttendanceModal
        isOpen={Boolean(quickAttendanceEmployee)}
        onClose={() => setQuickAttendanceEmployee(null)}
        employee={quickAttendanceEmployee}
        allEmployees={employees}
        onEmployeesUpdated={(updated) => {
          setEmployees(updated);
          notifyEmployeesChanged(updated);
        }}
      />

      {/* 12. Employee Trash Bin & Undo/Redo Recovery System Modal */}
      <TrashModal
        isOpen={isTrashModalOpen}
        onClose={() => setIsTrashModalOpen(false)}
        allCurrentEmployees={employees}
        onEmployeesRestored={(restored) => {
          setEmployees((prev) => {
            const restoredIds = new Set(restored.map((r) => r.id));
            const filtered = prev.filter((p) => !restoredIds.has(p.id));
            const combined = [...restored, ...filtered];
            notifyEmployeesChanged(combined);
            return combined;
          });
          setSuccessMessage(`تمت استعادة (${restored.length}) من سجلات الموظفين بنجاح إلى قاعدة البيانات المحلية.`);
          setTimeout(() => setSuccessMessage(null), 4000);
        }}
        onEmployeesDeletedPermanently={(deletedIds) => {
          setSelectedIds((prev) => prev.filter((id) => !deletedIds.includes(id)));
        }}
      />

      {/* 13. Master Unified Employee Profile Modal */}
      {profileModalEmployeeId && (
        <MasterEmployeeProfileModal
          isOpen={Boolean(profileModalEmployeeId)}
          onClose={() => setProfileModalEmployeeId(null)}
          employeeId={profileModalEmployeeId}
          organization={{
            ministryName: 'وزارة التعليم العالي والبحث العلمي',
            directorateName: 'دائرة الشؤون الإدارية والمالية',
            departmentName: 'قسم إدارة الموارد البشرية والخدمة المدنية',
            officialEmblem: 'gold',
            operatingYear: 2026,
          }}
          leaveRules={leaveRules}
          onEditEmployee={(emp) => {
            setProfileModalEmployeeId(null);
            handleOpenEditModal(emp);
          }}
          onOpenMovementModal={(empId, cat) => {
            setProfileModalEmployeeId(null);
            setSelectedMovementEmployeeId(empId);
            setMovementInitialCategory(cat || 'attendance');
            setIsMovementModalOpen(true);
          }}
          onGrantAllowance={() => {
            setProfileModalEmployeeId(null);
            if (onNavigate) onNavigate('allow_promotions');
          }}
          onPromoteEmployee={() => {
            setProfileModalEmployeeId(null);
            if (onNavigate) onNavigate('allow_promotions');
          }}
          onRetireEmployee={() => {
            setProfileModalEmployeeId(null);
            if (onNavigate) onNavigate('retirement');
          }}
          onOpenAuditLog={(empId) => {
            setProfileModalEmployeeId(null);
            handleOpenAuditLog(empId);
          }}
        />
      )}

      {/* 14. Printable Badge Modal */}
      {badgeModalEmployee && (
        <EmployeeBadgeModal
          isOpen={Boolean(badgeModalEmployee)}
          onClose={() => setBadgeModalEmployee(null)}
          employee={badgeModalEmployee}
          organization={{
            ministryName: 'وزارة التعليم العالي والبحث العلمي',
            directorateName: 'دائرة الشؤون الإدارية والمالية',
            departmentName: 'قسم إدارة الموارد البشرية والخدمة المدنية',
            officialEmblem: 'gold',
            operatingYear: 2026,
          }}
          onBadgePrinted={(updated) => {
            setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
          }}
        />
      )}

      {/* 15. Comprehensive Department & Administrative Formations Hub Modal */}
      <DepartmentManagerModal
        isOpen={isDepartmentModalOpen}
        onClose={() => setIsDepartmentModalOpen(false)}
        employees={employees}
        onDepartmentChanged={async () => {
          const fresh = await getAllEmployees();
          setEmployees(fresh);
          notifyEmployeesChanged(fresh);
          const depts = await employeeService.getDepartments();
          setRegisteredDepartments(depts);
        }}
        onSelectDepartmentFilter={(deptName) => {
          setSelectedDepartment(deptName);
        }}
      />

      {/* 16. Fast Batch Department Reassignment Modal for Selected Employees */}
      {isBatchTransferModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in no-print">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    نقل الموظفين المحددين لقسم آخر
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    تم تحديد ({selectedIds.length}) من الموظفين لإعادة التوزيع
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchTransferModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  القسم المراد النقل إليه:
                </label>
                <select
                  value={batchTransferTargetDept}
                  onChange={(e) => setBatchTransferTargetDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                >
                  {departmentOptions.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept} ({departmentStats[dept] || 0} موظف حالياً)
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 text-xs">
                سيتم تحديث قسم ({selectedIds.length}) موظف ونقلهم إلى قسم (<span className="font-bold">{batchTransferTargetDept}</span>) مع تدوين ذلك في السجل الزمني الوظيفي.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsBatchTransferModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isBatchTransferring || !batchTransferTargetDept}
                onClick={async () => {
                  if (!batchTransferTargetDept) return;
                  setIsBatchTransferring(true);
                  try {
                    const performer = currentUser?.fullName || currentUser?.username || 'مدير النظام';
                    const res = await employeeService.transferEmployeesToDepartment(
                      selectedIds,
                      batchTransferTargetDept,
                      'نقل إداري جماعي بموجب أمر الدائرة',
                      performer
                    );
                    showToast(
                      `تم نقل (${res.updatedCount}) موظف بنجاح إلى (${batchTransferTargetDept})`,
                      'success'
                    );
                    const fresh = await getAllEmployees();
                    setEmployees(fresh);
                    notifyEmployeesChanged(fresh);
                    setSelectedIds([]);
                    setIsBatchTransferModalOpen(false);
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'تعذر نقل الموظفين';
                    showToast(msg, 'error');
                  } finally {
                    setIsBatchTransferring(false);
                  }
                }}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isBatchTransferring ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري النقل...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تأكيد النقل الآن</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 17. Comprehensive Audit Log Modal (سجل تتبع التعديلات والعمليات الرقابية) */}
      <EmployeeAuditLogModal
        isOpen={isAuditLogModalOpen}
        onClose={() => setIsAuditLogModalOpen(false)}
        initialEmployeeId={auditLogEmployeeId}
        employees={employees}
        currentUser={currentUser}
      />

      {/* 18. Biometric Device Settings Modal (إعدادات وتغيير آي بي أجهزة البصمة) */}
      <BiometricDeviceModal
        isOpen={isBiometricDeviceModalOpen}
        onClose={() => setIsBiometricDeviceModalOpen(false)}
        departments={registeredDepartments}
        onDeviceSaved={(savedDev) => {
          setBiometricDevicesList((prev) => {
            const idx = prev.findIndex((d) => d.id === savedDev.id);
            if (idx >= 0) {
              const cp = [...prev];
              cp[idx] = savedDev;
              return cp;
            }
            return [savedDev, ...prev];
          });
          toast.success(`تم حفظ إعدادات جهاز البصمة (${savedDev.name}) بنجاح!`);
        }}
      />
    </div>
  );
};
