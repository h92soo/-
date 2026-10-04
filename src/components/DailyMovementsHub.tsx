import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserX,
  UserCheck,
  Building2,
  FileText,
  Search,
  Filter,
  Download,
  Printer,
  Trash2,
  Edit3,
  RotateCcw,
  Sparkles,
  Plane,
  HeartPulse,
  ChevronRight,
  ChevronLeft,
  X,
  Save,
  Check,
  Layers,
  ArrowUpDown,
  Home,
  Users,
  BarChart3,
  Briefcase,
  DollarSign,
  Percent,
  ShieldCheck,
  Award,
} from 'lucide-react';
import {
  Employee,
  AttendanceRecord,
  AttendanceStatus,
  LeaveRulesSettings,
  ContractType,
  OrganizationSettings,
  WorkspaceTab,
} from '../types';
import {
  getAttendanceLogs,
  saveAttendanceLogsBatch,
  saveEmployee,
  deleteAttendanceRecord,
} from '../db/indexedDB';
import { getArabicDayOfWeek } from '../utils/reportExportUtils';
import { ReportExportModal } from './ReportExportModal';
import { getContractTypeLabel } from '../utils/contractTypeUtils';
import { EmploymentTypeLabelsSettings } from '../types';
import { showToast, toast } from './ToastNotification';
import { employeeService } from '../services/employeeService';
import { GovernmentEmblem } from './GovernmentEmblem';

interface DailyMovementsHubProps {
  employees: Employee[];
  leaveRules: LeaveRulesSettings;
  organization?: OrganizationSettings;
  employmentLabels?: EmploymentTypeLabelsSettings;
  initialSubTab?: 'registration' | 'five_year_leaves' | 'reports';
  onEmployeesChanged?: (updated: Employee[]) => void;
  onBackToDashboard?: () => void;
  onNavigate?: (tab: WorkspaceTab) => void;
}

type ReportMode = 'daily' | 'weekly' | 'monthly' | 'custom';
type MovementFilter = 'ALL' | 'MOVEMENTS_ONLY' | 'ABSENT_ONLY' | 'LEAVE_ONLY' | 'TIME_ONLY' | 'MISSION_ONLY';

export function DailyMovementsHub({
  employees,
  leaveRules,
  organization,
  employmentLabels,
  initialSubTab,
  onEmployeesChanged,
  onBackToDashboard,
  onNavigate,
}: DailyMovementsHubProps) {
  // Navigation sub-tab: 'registration' (تسجيل الحركات الفورية) or 'five_year_leaves' (منح وإدارة إجازة الـ 5 سنوات) or 'reports' (محرك التقارير المتقدم)
  const [activeTab, setActiveTab] = useState<'registration' | 'five_year_leaves' | 'reports'>(
    initialSubTab || 'registration'
  );

  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);

  // 5-Year Leave Management States
  const [selectedEmpIdForFiveYear, setSelectedEmpIdForFiveYear] = useState<string>('');
  const [fiveYearSalaryType, setFiveYearSalaryType] = useState<'full_base_salary' | 'half_base_salary'>('full_base_salary');
  const [fiveYearStartDate, setFiveYearStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [fiveYearEndDate, setFiveYearEndDate] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 5);
    return d.toISOString().slice(0, 10);
  });
  const [fiveYearOrderNumber, setFiveYearOrderNumber] = useState<string>(() => `إج5-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [fiveYearOrderDate, setFiveYearOrderDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [fiveYearPensionPercent, setFiveYearPensionPercent] = useState<number>(10);
  const [fiveYearNotes, setFiveYearNotes] = useState<string>('منح إجازة لمدة خمس (5) سنوات براتب اسمي استناداً لأحكام قانون الخدمة المدنية رقم 24 لسنة 1960 وقانون الموازنة الاتحادية');
  const [isGrantingFiveYear, setIsGrantingFiveYear] = useState<boolean>(false);
  const [printingOrderEmployee, setPrintingOrderEmployee] = useState<Employee | null>(null);

  // Selected date for daily actions
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Report Engine States
  const [reportMode, setReportMode] = useState<ReportMode>('daily');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return new Date().toISOString().slice(0, 7);
  });

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [movementFilter, setMovementFilter] = useState<MovementFilter>('ALL');
  const [contractFilter, setContractFilter] = useState<'ALL' | ContractType>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');

  // Logs / Records
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit movement modal state
  const [editingRecord, setEditingRecord] = useState<{
    employee: Employee;
    record: AttendanceRecord | null;
  } | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editOrderNumber, setEditOrderNumber] = useState('');
  const [editDuration, setEditDuration] = useState<number>(60);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Feedback banner
  const [feedbackMessage, setFeedbackMessage] = useState<{
    text: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Load records from DB
  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const logs = await getAttendanceLogs();
      setRecords(logs);
    } catch (e) {
      console.error('Failed to load attendance logs:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  // Departments list
  const departments = useMemo(() => {
    return Array.from(new Set(employees.map((e) => e.department))).sort();
  }, [employees]);

  // Map of employeeId to record on the selectedDate
  const currentDayRecordsMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    records.forEach((r) => {
      if (r.date === selectedDate) {
        map.set(r.employeeId, r);
      }
    });
    return map;
  }, [records, selectedDate]);

  // Filtered employees for the Daily Registration view
  const filteredEmployeesForDay = useMemo(() => {
    return employees.filter((emp) => {
      // Contract filter
      if (contractFilter !== 'ALL' && emp.contractType !== contractFilter) return false;
      // Department filter
      if (departmentFilter !== 'ALL' && emp.department !== departmentFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchesName = emp.fullName.toLowerCase().includes(term);
        const matchesNumber = emp.employeeNumber.toLowerCase().includes(term);
        if (!matchesName && !matchesNumber) return false;
      }

      // Movement Filter
      const rec = currentDayRecordsMap.get(emp.id);
      const status = rec ? rec.status : 'present';

      if (movementFilter === 'MOVEMENTS_ONLY' && status === 'present') return false;
      if (movementFilter === 'ABSENT_ONLY' && status !== 'absent') return false;
      if (movementFilter === 'LEAVE_ONLY' && status !== 'leave') return false;
      if (movementFilter === 'TIME_ONLY' && status !== 'time_permission') return false;
      if (movementFilter === 'MISSION_ONLY' && status !== 'mission') return false;

      return true;
    });
  }, [employees, contractFilter, departmentFilter, searchTerm, movementFilter, currentDayRecordsMap]);

  // Pagination for Daily Movements Hub (20 per page by default)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, departmentFilter, contractFilter, movementFilter, selectedDate]);

  const totalItems = filteredEmployeesForDay.length;
  const effectivePageSize = pageSize === 0 ? totalItems : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / (effectivePageSize || 1)));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedEmployeesForDay = useMemo(() => {
    if (pageSize === 0) return filteredEmployeesForDay;
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredEmployeesForDay.slice(startIndex, startIndex + pageSize);
  }, [filteredEmployeesForDay, safeCurrentPage, pageSize]);

  // Current day statistics
  const dayStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let regularLeave = 0;
    let sickLeave = 0;
    let mission = 0;
    let time1hr = 0;
    let time2hr = 0;

    employees.forEach((emp) => {
      const rec = currentDayRecordsMap.get(emp.id);
      if (!rec || rec.status === 'present') {
        present++;
      } else if (rec.status === 'absent') {
        absent++;
      } else if (rec.status === 'leave') {
        if (rec.leaveType === 'sick') {
          sickLeave++;
        } else {
          regularLeave++;
        }
      } else if (rec.status === 'mission') {
        mission++;
      } else if (rec.status === 'time_permission') {
        if ((rec.timePermissionMinutes || 60) === 120) {
          time2hr++;
        } else {
          time1hr++;
        }
      }
    });

    return {
      total: employees.length,
      present,
      absent,
      regularLeave,
      sickLeave,
      mission,
      time1hr,
      time2hr,
      totalMovements: absent + regularLeave + sickLeave + mission + time1hr + time2hr,
    };
  }, [employees, currentDayRecordsMap]);

  // Active 5-Year Leave Employees
  const fiveYearEmployees = useMemo(() => {
    return employees.filter(
      (e) => e.status === 'five_year_leave' || (e.fiveYearLeave && e.fiveYearLeave.isActive)
    );
  }, [employees]);

  // Financial and Operational Metrics for 5-Year Leaves
  const fiveYearMetrics = useMemo(() => {
    let totalBase = 0;
    let totalPensionDeduction = 0;
    let totalNetPaid = 0;

    fiveYearEmployees.forEach((emp) => {
      const base = emp.fiveYearLeave?.baseSalaryAtLeave || emp.baseSalary || 500000;
      const isHalf = emp.fiveYearLeave?.salaryType === 'half_base_salary';
      const monthlyAmount = isHalf ? Math.round(base / 2) : base;
      const pensionPct = (emp.fiveYearLeave?.pensionDeductionPercent || 10) / 100;
      const pension = Math.round(base * pensionPct);
      const net = Math.max(0, monthlyAmount - pension);

      totalBase += base;
      totalPensionDeduction += pension;
      totalNetPaid += net;
    });

    return {
      count: fiveYearEmployees.length,
      totalBase,
      totalPensionDeduction,
      totalNetPaid,
    };
  }, [fiveYearEmployees]);

  // Grant 5-Year Official Leave Handler
  const handleGrantFiveYearLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpIdForFiveYear) {
      toast.warning('يرجى اختيار الموظف أولاً لمنح إجازة الـ 5 سنوات');
      return;
    }

    const emp = employees.find((x) => x.id === selectedEmpIdForFiveYear);
    if (!emp) return;

    setIsGrantingFiveYear(true);
    try {
      const baseSalary = emp.baseSalary || 500000;
      const monthlyPaidAmount =
        fiveYearSalaryType === 'full_base_salary' ? baseSalary : Math.round(baseSalary / 2);
      const monthlyPensionDeduction = Math.round(baseSalary * (fiveYearPensionPercent / 100));
      const netMonthlyPaid = Math.max(0, monthlyPaidAmount - monthlyPensionDeduction);

      const fiveYearConfig = {
        isActive: true,
        salaryType: fiveYearSalaryType,
        startDate: fiveYearStartDate,
        endDate: fiveYearEndDate,
        orderNumber: fiveYearOrderNumber.trim(),
        orderDate: fiveYearOrderDate,
        baseSalaryAtLeave: baseSalary,
        monthlyPaidAmount,
        pensionDeductionPercent: fiveYearPensionPercent,
        monthlyPensionDeduction,
        netMonthlyPaid,
        notes: fiveYearNotes.trim(),
      };

      const updatedEmp: Employee = {
        ...emp,
        status: 'five_year_leave',
        fiveYearLeave: fiveYearConfig,
        updatedAt: new Date().toISOString(),
      };

      // 1. Save updated employee
      await saveEmployee(updatedEmp);
      await employeeService.updateEmployee(updatedEmp);

      // 2. Add to career timeline
      await employeeService.addTimelineEvent({
        id: `EVT-5YR-${emp.id}-${Date.now()}`,
        employeeId: emp.id,
        date: fiveYearStartDate,
        title: `منح إجازة 5 سنوات (${
          fiveYearSalaryType === 'full_base_salary' ? 'براتب اسمي كامل' : 'بنصف راتب اسمي'
        })`,
        category: 'five_year_leave',
        description: `تم منح الموظف إجازة خمس (5) سنوات رسمية براتب اسمي بموجب الأمر الإداري ذي العدد (${fiveYearOrderNumber}) الصادر بتاريخ (${fiveYearOrderDate}) واستقطاع توقيفات تقاعدية بنسبة ${fiveYearPensionPercent}%.`,
        orderNumber: fiveYearOrderNumber,
        orderDate: fiveYearOrderDate,
        performedBy: 'مسؤول الموارد البشرية',
        createdAt: new Date().toISOString(),
      });

      // 3. Log attendance movement for the start date
      const attendanceLog: AttendanceRecord = {
        id: `LOG-5YR-${emp.id}-${Date.now().toString().slice(-4)}`,
        employeeId: emp.id,
        employeeName: emp.fullName,
        employeeNumber: emp.employeeNumber,
        department: emp.department,
        contractType: emp.contractType,
        date: fiveYearStartDate,
        endDate: fiveYearEndDate,
        status: 'leave',
        category: 'leave',
        leaveType: fiveYearSalaryType === 'full_base_salary' ? 'five_year_full' : 'five_year_half',
        movementTitle: `إجازة خمس سنوات (${
          fiveYearSalaryType === 'full_base_salary' ? 'اسمي كامل' : 'نصف اسمي'
        })`,
        movementType: 'إجازة 5 سنوات',
        durationDays: 1826,
        orderNumber: fiveYearOrderNumber,
        orderDate: fiveYearOrderDate,
        notes: fiveYearNotes,
        recordedBy: 'قسم الحركات والإجازات',
        createdAt: new Date().toISOString(),
      };
      await saveAttendanceLogsBatch([attendanceLog]);
      setRecords((prev) => [attendanceLog, ...prev]);

      // 4. Update parent
      const updatedList = employees.map((x) => (x.id === updatedEmp.id ? updatedEmp : x));
      if (onEmployeesChanged) {
        onEmployeesChanged(updatedList);
      }

      toast.success(
        `تم منح إجازة الـ 5 سنوات للموظف (${emp.fullName}) وإصدار الأمر الإداري (${fiveYearOrderNumber}) بنجاح!`
      );

      // Reset form
      setSelectedEmpIdForFiveYear('');
      setFiveYearOrderNumber(`إج5-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    } catch (err) {
      console.error('Failed to grant 5-year leave:', err);
      toast.error('حدث خطأ أثناء حفظ إجازة الـ 5 سنوات');
    } finally {
      setIsGrantingFiveYear(false);
    }
  };

  // Interrupt 5-Year Leave (قطع الإجازة والمباشرة)
  const handleInterruptFiveYearLeave = async (emp: Employee) => {
    if (
      !confirm(
        `هل أنت متأكد من قطع إجازة الـ 5 سنوات للموظف (${emp.fullName}) وتثبيت المباشرة بالدوام الرسمي؟`
      )
    ) {
      return;
    }

    try {
      const updatedEmp: Employee = {
        ...emp,
        status: 'active',
        fiveYearLeave: emp.fiveYearLeave
          ? {
              ...emp.fiveYearLeave,
              isActive: false,
              notes: (emp.fiveYearLeave.notes || '') + ' [تم قطع الإجازة والمباشرة بالدوام]',
            }
          : undefined,
        updatedAt: new Date().toISOString(),
      };

      await saveEmployee(updatedEmp);
      await employeeService.updateEmployee(updatedEmp);

      await employeeService.addTimelineEvent({
        id: `EVT-RETURN-${emp.id}-${Date.now()}`,
        employeeId: emp.id,
        date: new Date().toISOString().slice(0, 10),
        title: 'قطع إجازة الـ 5 سنوات ومباشرة بالدوام',
        category: 'department_change',
        description: `انفك الموظف من إجازة الـ 5 سنوات وباشر بمهامه الوظيفية الاعتيادية.`,
        performedBy: 'مسؤول الموارد البشرية',
        createdAt: new Date().toISOString(),
      });

      const updatedList = employees.map((x) => (x.id === updatedEmp.id ? updatedEmp : x));
      if (onEmployeesChanged) {
        onEmployeesChanged(updatedList);
      }

      toast.success(`تم قطع إجازة الـ 5 سنوات وتثبيت مباشرة (${emp.fullName}) بالدوام`);
    } catch (err) {
      console.error('Failed to interrupt leave:', err);
      toast.error('حدث خطأ أثناء قطع الإجازة');
    }
  };

  // 1-Click Fast Movement Handler
  const handleRegisterMovement = async (
    emp: Employee,
    type: 'present' | 'absent' | 'leave_regular' | 'leave_sick' | 'mission' | 'time_1' | 'time_2'
  ) => {
    const existingRec = currentDayRecordsMap.get(emp.id);
    const recId = existingRec?.id || `REC-${emp.id}-${selectedDate}-${Date.now().toString().slice(-4)}`;

    let status: AttendanceStatus = 'present';
    let movementTitle = 'حاضر (دوام رسمي)';
    let movementType = 'حضور';
    let leaveType: AttendanceRecord['leaveType'] = undefined;
    let timeMinutes: number | undefined = undefined;

    switch (type) {
      case 'present':
        status = 'present';
        movementTitle = 'حاضر (دوام اعتيادي)';
        movementType = 'حاضر';
        break;
      case 'absent':
        status = 'absent';
        movementTitle = 'غياب غير مبرر (غ)';
        movementType = 'غياب غير مبرر';
        break;
      case 'leave_regular':
        status = 'leave';
        leaveType = 'annual';
        movementTitle = 'إجازة اعتيادية / مجاز (ج)';
        movementType = 'إجازة اعتيادية';
        break;
      case 'leave_sick':
        status = 'leave';
        leaveType = 'sick';
        movementTitle = 'إجازة مرضية (م)';
        movementType = 'إجازة مرضية';
        break;
      case 'mission':
        status = 'mission';
        movementTitle = 'إيفاد رسمي وحقلي (ف)';
        movementType = 'إيفاد رسمي';
        break;
      case 'time_1':
        status = 'time_permission';
        timeMinutes = 60;
        movementTitle = 'إذن زمني - ساعة واحدة (ز1)';
        movementType = 'إذن زمني 1س';
        break;
      case 'time_2':
        status = 'time_permission';
        timeMinutes = 120;
        movementTitle = 'إذن زمني - ساعتين (ز2)';
        movementType = 'إذن زمني 2س';
        break;
    }

    const updatedRecord: AttendanceRecord = {
      id: recId,
      employeeId: emp.id,
      employeeName: emp.fullName,
      employeeNumber: emp.employeeNumber,
      department: emp.department,
      contractType: emp.contractType,
      date: selectedDate,
      status,
      movementTitle,
      movementType,
      leaveType,
      timePermissionMinutes: timeMinutes,
      notes: existingRec?.notes,
      orderNumber: existingRec?.orderNumber,
      createdAt: existingRec?.createdAt || new Date().toISOString(),
    };

    // Save record to DB
    await saveAttendanceLogsBatch([updatedRecord]);

    // Handle leave balance adjustment (deduct if switching to annual leave, refund if switching from annual leave)
    let updatedEmployees = employees;
    const wasAnnualLeave = existingRec?.status === 'leave' && existingRec.leaveType === 'annual';
    const isNowAnnualLeave = type === 'leave_regular';

    if (isNowAnnualLeave && !wasAnnualLeave) {
      const newUsed = emp.usedBalance + 1;
      const newRemaining = Math.max(0, emp.annualBalanceLimit - newUsed);
      const updatedEmp: Employee = { ...emp, usedBalance: newUsed, remainingBalance: newRemaining };
      await saveEmployee(updatedEmp);
      updatedEmployees = employees.map((e) => (e.id === emp.id ? updatedEmp : e));
      if (onEmployeesChanged) onEmployeesChanged(updatedEmployees);
    } else if (wasAnnualLeave && !isNowAnnualLeave) {
      const newUsed = Math.max(0, emp.usedBalance - 1);
      const newRemaining = Math.min(emp.annualBalanceLimit, emp.remainingBalance + 1);
      const updatedEmp: Employee = { ...emp, usedBalance: newUsed, remainingBalance: newRemaining };
      await saveEmployee(updatedEmp);
      updatedEmployees = employees.map((e) => (e.id === emp.id ? updatedEmp : e));
      if (onEmployeesChanged) onEmployeesChanged(updatedEmployees);
    }

    // In-place records state update for instantaneous response without blocking DB load
    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === recId || (r.employeeId === emp.id && r.date === selectedDate));
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedRecord;
        return copy;
      }
      return [...prev, updatedRecord];
    });

    toast.success(`تم تثبيت [${movementTitle}] للموظف (${emp.fullName}) بنجاح.`);
  };

  // Delete movement and restore to present
  const handleDeleteMovement = async (emp: Employee) => {
    const existingRec = currentDayRecordsMap.get(emp.id);
    if (!existingRec) return;

    await deleteAttendanceRecord(existingRec.id);

    // Refund leave balance if it was annual leave
    if (existingRec.status === 'leave' && existingRec.leaveType === 'annual') {
      const newUsed = Math.max(0, emp.usedBalance - 1);
      const newRemaining = Math.min(emp.annualBalanceLimit, emp.remainingBalance + 1);
      const updatedEmp: Employee = { ...emp, usedBalance: newUsed, remainingBalance: newRemaining };
      await saveEmployee(updatedEmp);
      if (onEmployeesChanged) {
        onEmployeesChanged(employees.map((e) => (e.id === emp.id ? updatedEmp : e)));
      }
    }

    // In-place remove from records state
    setRecords((prev) => prev.filter((r) => r.id !== existingRec.id));
    toast.success(`تم إلغاء الحركة للموظف (${emp.fullName}) وإعادته كـ حاضر.`);
  };

  // Save custom edit
  const handleSaveCustomEdit = async () => {
    if (!editingRecord) return;
    const { employee, record } = editingRecord;
    if (!record) return;

    const updated: AttendanceRecord = {
      ...record,
      notes: editNotes.trim() || undefined,
      orderNumber: editOrderNumber.trim() || undefined,
      timePermissionMinutes: record.status === 'time_permission' ? editDuration : undefined,
    };

    await saveAttendanceLogsBatch([updated]);
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setEditingRecord(null);
    toast.success('تم حفظ تفاصيل وتعديلات الحركة بنجاح.');
  };

  // =========================================================================
  // ADVANCED REPORTS ENGINE COMPUTATIONS
  // =========================================================================
  const reportRecords = useMemo(() => {
    return records.filter((rec) => {
      // Date filter based on reportMode
      if (reportMode === 'daily') {
        if (rec.date !== selectedDate) return false;
      } else if (reportMode === 'weekly') {
        const target = new Date(selectedDate);
        const recDate = new Date(rec.date);
        const diffDays = (recDate.getTime() - target.getTime()) / (1000 * 3600 * 24);
        if (diffDays < 0 || diffDays > 6) return false;
      } else if (reportMode === 'monthly') {
        if (!rec.date.startsWith(selectedMonth)) return false;
      } else if (reportMode === 'custom') {
        if (rec.date < customStartDate || rec.date > customEndDate) return false;
      }

      // Department filter
      if (departmentFilter !== 'ALL' && rec.department !== departmentFilter) return false;

      // Contract filter
      if (contractFilter !== 'ALL' && rec.contractType !== contractFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchesName = (rec.employeeName || '').toLowerCase().includes(term);
        const matchesNumber = (rec.employeeNumber || '').toLowerCase().includes(term);
        if (!matchesName && !matchesNumber) return false;
      }

      // Movement type filter
      if (movementFilter === 'MOVEMENTS_ONLY' && rec.status === 'present') return false;
      if (movementFilter === 'ABSENT_ONLY' && rec.status !== 'absent') return false;
      if (movementFilter === 'LEAVE_ONLY' && rec.status !== 'leave') return false;
      if (movementFilter === 'TIME_ONLY' && rec.status !== 'time_permission') return false;
      if (movementFilter === 'MISSION_ONLY' && rec.status !== 'mission') return false;

      return true;
    });
  }, [
    records,
    reportMode,
    selectedDate,
    selectedMonth,
    customStartDate,
    customEndDate,
    departmentFilter,
    contractFilter,
    searchTerm,
    movementFilter,
  ]);

  // Report statistics summary
  const reportStats = useMemo(() => {
    const total = reportRecords.length;
    const present = reportRecords.filter((r) => r.status === 'present').length;
    const absent = reportRecords.filter((r) => r.status === 'absent').length;
    const regularLeave = reportRecords.filter(
      (r) => r.status === 'leave' && r.leaveType !== 'sick'
    ).length;
    const sickLeave = reportRecords.filter(
      (r) => r.status === 'leave' && r.leaveType === 'sick'
    ).length;
    const mission = reportRecords.filter((r) => r.status === 'mission').length;
    const timePerm = reportRecords.filter((r) => r.status === 'time_permission').length;
    const timeTotalMinutes = reportRecords.reduce(
      (acc, r) => acc + (r.timePermissionMinutes || 0),
      0
    );

    return {
      total,
      present,
      absent,
      regularLeave,
      sickLeave,
      mission,
      timePerm,
      timeTotalHours: Math.round((timeTotalMinutes / 60) * 10) / 10,
    };
  }, [reportRecords]);

  // Trigger browser print for the official report
  const handlePrintOfficialReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 0. Top Navigation & Quick Panel Switching Toolbar */}
      <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2">
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="px-3.5 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center gap-1.5 transition-all border border-indigo-200 dark:border-indigo-800 cursor-pointer shadow-2xs"
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
                  onClick={() => onNavigate('employees')}
                  className="px-2.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                >
                  <Users className="w-3 h-3 text-amber-500" />
                  <span>سجل الموظفين</span>
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
          <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
            الحركات اليومية
          </span>
        </div>
      </div>

      {/* 1. Header Toolbar with Back Button and Quick Sub-Tabs */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3.5">
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shrink-0"
              title="العودة للرئيسية"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
            <Clock className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                مركز تسجيل الحركات اليومية ومحرك التقارير المتقدم
              </h1>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-mono font-bold">
                2026 OFFICIAL
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              تسجيل فوري لحركات (غ، ج، م، ف، ز1، ز2) مع مزامنة لحظية ومحرك تقارير (يومي / أسبوعي / شهري / مخصص)
            </p>
          </div>
        </div>

        {/* Tab switch buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 self-start lg:self-center">
          <button
            type="button"
            id="tab-registration-btn"
            onClick={() => setActiveTab('registration')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'registration'
                ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 text-indigo-500" />
            <span>تسجيل الحركات الفورية</span>
          </button>

          <button
            type="button"
            id="tab-five-year-leaves-btn"
            onClick={() => setActiveTab('five_year_leaves')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'five_year_leaves'
                ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Briefcase className="w-4 h-4 text-purple-500" />
            <span>إجازة الـ 5 سنوات (براتب اسمي)</span>
            {fiveYearEmployees.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono font-bold">
                {fiveYearEmployees.length}
              </span>
            )}
          </button>

          <button
            type="button"
            id="tab-advanced-reports-btn"
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'reports'
                ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-500" />
            <span>محرك التقارير المتقدم</span>
          </button>

          {onNavigate && (
            <button
              type="button"
              id="btn-nav-movement-designer"
              onClick={() => onNavigate('movement_designer')}
              className="px-3 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 text-xs font-bold border border-violet-200 dark:border-violet-800 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="المخطط البياني ومصمم تقارير الحركات وتعديل الورقة يدوياً"
            >
              <BarChart3 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <span>مخطط ومصمم الحركات (حصري 📊)</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification Banner */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all no-print ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
              : feedbackMessage.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800'
              : 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: INSTANT DAILY MOVEMENT REGISTRATION & CRUD                     */}
      {/* ========================================================================= */}
      {activeTab === 'registration' && (
        <div className="space-y-4">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 no-print">
            {/* Total */}
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">إجمالي الكادر</span>
              <span className="text-xl font-black text-slate-900 dark:text-white font-mono">{dayStats.total}</span>
            </div>

            {/* Present */}
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block">حضور رسمي</span>
              <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono">{dayStats.present}</span>
            </div>

            {/* Absent */}
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 shadow-2xs">
              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 block">غياب (غ)</span>
              <span className="text-xl font-black text-rose-700 dark:text-rose-300 font-mono">{dayStats.absent}</span>
            </div>

            {/* Regular Leave */}
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 shadow-2xs">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 block">مجاز اعتيادي (ج)</span>
              <span className="text-xl font-black text-amber-700 dark:text-amber-300 font-mono">{dayStats.regularLeave}</span>
            </div>

            {/* Sick Leave */}
            <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 shadow-2xs">
              <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 block">إجازة مرضية (م)</span>
              <span className="text-xl font-black text-purple-700 dark:text-purple-300 font-mono">{dayStats.sickLeave}</span>
            </div>

            {/* Mission */}
            <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 shadow-2xs">
              <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 block">إيفاد رسمي (ف)</span>
              <span className="text-xl font-black text-teal-700 dark:text-teal-300 font-mono">{dayStats.mission}</span>
            </div>

            {/* Time Permissions */}
            <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 shadow-2xs">
              <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400 block">زمنيات (ز1+ز2)</span>
              <span className="text-xl font-black text-sky-700 dark:text-sky-300 font-mono">
                {dayStats.time1hr + dayStats.time2hr}
              </span>
            </div>
          </div>

          {/* Filter and Date Selection Bar */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3 no-print">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Date Picker */}
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">تاريخ الموقف اليومي:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs font-bold text-slate-900 dark:text-white"
                />
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  ({getArabicDayOfWeek(selectedDate)})
                </span>
              </div>

              {/* Movement Quick Filter Badges */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-400 text-[11px] font-bold ml-1">تصفية الحركات:</span>
                <button
                  type="button"
                  onClick={() => setMovementFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    movementFilter === 'ALL'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  الكل ({employees.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMovementFilter('MOVEMENTS_ONLY')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    movementFilter === 'MOVEMENTS_ONLY'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                  }`}
                >
                  أصحاب الحركات فقط ({dayStats.totalMovements})
                </button>
                <button
                  type="button"
                  onClick={() => setMovementFilter('ABSENT_ONLY')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    movementFilter === 'ABSENT_ONLY'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  غياب (غ)
                </button>
                <button
                  type="button"
                  onClick={() => setMovementFilter('LEAVE_ONLY')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    movementFilter === 'LEAVE_ONLY'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  مجاز (ج/م)
                </button>
                <button
                  type="button"
                  onClick={() => setMovementFilter('TIME_ONLY')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    movementFilter === 'TIME_ONLY'
                      ? 'bg-sky-600 text-white'
                      : 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                  }`}
                >
                  زمنيات (ز1/ز2)
                </button>
              </div>
            </div>

            {/* Sub-Filters: Search & Contract Type */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="بحث سريع بالاسم أو الرقم الوظيفي..."
                  className="w-full pr-8 pl-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Contract filter */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setContractFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    contractFilter === 'ALL'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  كافة الكوادر
                </button>
                <button
                  type="button"
                  onClick={() => setContractFilter('permanent')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    contractFilter === 'permanent'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  {getContractTypeLabel('permanent', employmentLabels)}
                </button>
                <button
                  type="button"
                  onClick={() => setContractFilter('contract')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    contractFilter === 'contract'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  {getContractTypeLabel('contract', employmentLabels)}
                </button>
              </div>

              {/* Department filter */}
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                <option value="ALL">كافة الأقسام والتشكيلات</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* DAILY MOVEMENTS TABLE (STRICT USER MANDATE: ت، الاسم، الصفة الوظيفية)      */}
          {/* ========================================================================= */}
          <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="p-3.5 w-12 text-center">ت</th>
                    <th className="p-3.5">الاسم الكامل للموظف</th>
                    <th className="p-3.5 text-center">الصفة الوظيفية</th>
                    <th className="p-3.5 text-center">الموقف الحالي لليوم</th>
                    <th className="p-3.5 text-center no-print">الإجراءات السريعة الفورية (1-Click)</th>
                    <th className="p-3.5 text-center no-print w-24">إدارة وتعديل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredEmployeesForDay.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                        لا يوجد موظفون يطابقون معايير التصفية والبحث المحددة.
                      </td>
                    </tr>
                  ) : (
                    paginatedEmployeesForDay.map((emp, index) => {
                      const record = currentDayRecordsMap.get(emp.id);
                      const currentStatus = record ? record.status : 'present';
                      const rowSequence = (pageSize === 0 ? 0 : (safeCurrentPage - 1) * pageSize) + index + 1;

                      // Status Badge details
                      let badgeText = 'حاضر (دوام رسمي)';
                      let badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';

                      if (currentStatus === 'absent') {
                        badgeText = 'غياب غير مبرر (غ)';
                        badgeColor = 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
                      } else if (currentStatus === 'leave') {
                        if (record?.leaveType === 'sick') {
                          badgeText = 'إجازة مرضية (م)';
                          badgeColor = 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
                        } else {
                          badgeText = 'إجازة اعتيادية (ج)';
                          badgeColor = 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
                        }
                      } else if (currentStatus === 'mission') {
                        badgeText = 'إيفاد رسمي وحقلي (ف)';
                        badgeColor = 'bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800';
                      } else if (currentStatus === 'time_permission') {
                        const hrs = (record?.timePermissionMinutes || 60) === 120 ? 'ساعتين (ز2)' : 'ساعة واحدة (ز1)';
                        badgeText = `إذن زمني - ${hrs}`;
                        badgeColor = 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800';
                      }

                      return (
                        <tr
                          key={emp.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-700/20 transition-colors"
                        >
                          {/* 1. Sequence Number (ت) */}
                          <td className="p-3.5 text-center font-mono font-bold text-slate-500">
                            {rowSequence}
                          </td>

                          {/* 2. Full Name (الاسم الكامل للموظف) */}
                          <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <span>{emp.fullName}</span>
                              <span className="text-[10px] font-mono text-slate-400">
                                ({emp.employeeNumber})
                              </span>
                            </div>
                            {record?.notes && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                                ملاحظة: {record.notes}
                              </div>
                            )}
                          </td>

                          {/* 3. Job Status / Contract */}
                          <td className="p-3.5 text-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                emp.contractType === 'permanent'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                              }`}
                            >
                              {getContractTypeLabel(emp.contractType, employmentLabels)}
                            </span>
                            {emp.status === 'five_year_leave' && (
                              <div className="text-[10px] font-bold text-purple-700 dark:text-purple-300 mt-1">
                                مجاز 5 سنوات (اسمي)
                              </div>
                            )}
                          </td>

                          {/* Current Status Badge */}
                          <td className="p-3.5 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${badgeColor}`}
                            >
                              {badgeText}
                            </span>
                          </td>

                          {/* 1-Click Fast Movement Buttons */}
                          <td className="p-2 text-center no-print">
                            <div className="flex items-center justify-center gap-1">
                              {/* 1. حاضر */}
                              <button
                                type="button"
                                onClick={() => handleRegisterMovement(emp, 'present')}
                                title="تثبيت كـ حاضر"
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                  currentStatus === 'present'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-700 hover:bg-emerald-100 text-slate-700 dark:text-slate-300 hover:text-emerald-700'
                                }`}
                              >
                                حاضر
                              </button>

                              {/* 2. غياب (غ) */}
                              <button
                                type="button"
                                onClick={() => handleRegisterMovement(emp, 'absent')}
                                title="تسجيل غياب غير مبرر (غ)"
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                  currentStatus === 'absent'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-700 hover:bg-rose-100 text-slate-700 dark:text-slate-300 hover:text-rose-700'
                                }`}
                              >
                                غ (غياب)
                              </button>

                              {/* 3. مجاز اعتيادي (ج) */}
                              <button
                                type="button"
                                onClick={() => handleRegisterMovement(emp, 'leave_regular')}
                                title="إجازة اعتيادية / مجاز (ج) - تستقطع يوماً من الرصيد"
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                  currentStatus === 'leave' && record?.leaveType !== 'sick'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-700 hover:bg-amber-100 text-slate-700 dark:text-slate-300 hover:text-amber-700'
                                }`}
                              >
                                ج (مجاز)
                              </button>

                              {/* 4. مرضي (م) */}
                              <button
                                type="button"
                                onClick={() => handleRegisterMovement(emp, 'leave_sick')}
                                title="إجازة مرضية برسم تقرير طبي (م)"
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                  currentStatus === 'leave' && record?.leaveType === 'sick'
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-700 hover:bg-purple-100 text-slate-700 dark:text-slate-300 hover:text-purple-700'
                                }`}
                              >
                                م (مرضي)
                              </button>

                              {/* 5. إيفاد رسمي (ف) */}
                              <button
                                type="button"
                                onClick={() => handleRegisterMovement(emp, 'mission')}
                                title="إيفاد رسمي أو حقلي (ف)"
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                  currentStatus === 'mission'
                                    ? 'bg-teal-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-700 hover:bg-teal-100 text-slate-700 dark:text-slate-300 hover:text-teal-700'
                                }`}
                              >
                                ف (إيفاد)
                              </button>

                              {/* 6. زمنية ساعة (ز1) */}
                              <button
                                type="button"
                                onClick={() => handleRegisterMovement(emp, 'time_1')}
                                title="إذن زمني - ساعة واحدة (ز1 / H1)"
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                  currentStatus === 'time_permission' && record?.timePermissionMinutes === 60
                                    ? 'bg-sky-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-700 hover:bg-sky-100 text-slate-700 dark:text-slate-300 hover:text-sky-700'
                                }`}
                              >
                                ز1 (1س)
                              </button>

                              {/* 7. زمنية ساعتين (ز2) */}
                              <button
                                type="button"
                                onClick={() => handleRegisterMovement(emp, 'time_2')}
                                title="إذن زمني - ساعتان (ز2 / H2)"
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                  currentStatus === 'time_permission' && record?.timePermissionMinutes === 120
                                    ? 'bg-sky-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-700 hover:bg-sky-100 text-slate-700 dark:text-slate-300 hover:text-sky-700'
                                }`}
                              >
                                ز2 (2س)
                              </button>
                            </div>
                          </td>

                          {/* Action / Delete / Edit */}
                          <td className="p-2 text-center no-print">
                            <div className="flex items-center justify-center gap-1">
                              {/* Edit details */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRecord({ employee: emp, record: record || null });
                                  setEditNotes(record?.notes || '');
                                  setEditOrderNumber(record?.orderNumber || '');
                                  setEditDuration(record?.timePermissionMinutes || 60);
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-indigo-500 hover:text-white text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                                title="تعديل تفاصيل السند أو الملاحظات"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Movement (Reset to present) */}
                              {record && record.status !== 'present' && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMovement(emp)}
                                  className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                                  title="حذف الحركة وإلغاؤها وإعادة الموظف كحاضر"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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

          {/* Pagination Controls Bar */}
          {filteredEmployeesForDay.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs text-xs mt-3 no-print">
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

              {/* Page Size Switcher (25 / 50 / 100 / الكل) */}
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400 hidden md:inline">عدد الموظفين بالصفحة:</span>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
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
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1 cursor-pointer"
                    title="الصفحة السابقة"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">السابق</span>
                  </button>

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
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
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
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1 cursor-pointer"
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
      )}

      {/* ========================================================================= */}
      {/* SECTION: 5-YEAR LEAVE MANAGEMENT (IRAQI CIVIL SERVICE LAW)                */}
      {/* ========================================================================= */}
      {activeTab === 'five_year_leaves' && (
        <div className="space-y-6">
          {/* 1. Header Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white border border-purple-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-400/20 text-purple-200 border border-purple-400/30">
                    ضوابط الخدمة المدنية والموازنة العامة
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-200 border border-amber-400/30">
                    توقيفات تقاعدية 10%
                  </span>
                </div>
                <h2 className="text-xl font-black text-white flex items-center gap-2.5">
                  <Briefcase className="w-6 h-6 text-purple-300" />
                  <span>مركز منح وإدارة إجازة الخمس (5) سنوات براتب اسمي</span>
                </h2>
                <p className="text-xs text-purple-200/80 mt-1 max-w-2xl">
                  منح وتمديد وقطع إجازات الـ 5 سنوات للموظفين على الملاك الدائم براتب اسمي كامل أو نصف راتب اسمي مع احتساب التوقيفات التقاعدية وإصدار الأوامر الإدارية الرسمية.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                  إجمالي المتمتعين: {fiveYearMetrics.count} موظف
                </span>
              </div>
            </div>
          </div>

          {/* 2. Statistical KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">مجازو الـ 5 سنوات حالياً</span>
              <div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400 mt-1">
                {fiveYearMetrics.count} <span className="text-xs font-normal">موظف</span>
              </div>
              <span className="text-[10px] text-slate-400">إجازة رسمية سارية المفعول</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">إجمالي الرواتب الاسمية</span>
              <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1 truncate">
                {fiveYearMetrics.totalBase.toLocaleString('en-US')} <span className="text-xs font-normal">د.ع</span>
              </div>
              <span className="text-[10px] text-slate-400">الرواتب الاسمية للكوادر المجازة</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">توقيفات صندوق التقاعد (10%)</span>
              <div className="text-lg font-black font-mono text-amber-600 dark:text-amber-400 mt-1 truncate">
                {fiveYearMetrics.totalPensionDeduction.toLocaleString('en-US')} <span className="text-xs font-normal">د.ع</span>
              </div>
              <span className="text-[10px] text-amber-600 dark:text-amber-400">مستقطعة لحساب التوقيفات</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">صافي المستحقات المصروفة</span>
              <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 truncate">
                {fiveYearMetrics.totalNetPaid.toLocaleString('en-US')} <span className="text-xs font-normal">د.ع</span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">المبلغ الشهري الصافي المصروف</span>
            </div>
          </div>

          {/* 3. Grant New 5-Year Leave Form */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    استمارة منح إجازة خمس (5) سنوات وإصدار الأمر الإداري
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    حدد الموظف ونوع الاستحقاق المالي لحساب الراتب والتوقيفات وإصدار الأمر الإداري فوراً
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800">
                المدة القانونية: 5 سنوات (1826 يوم)
              </span>
            </div>

            <form onSubmit={handleGrantFiveYearLeave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Employee Selection */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    اختيار الموظف المستحق *
                  </label>
                  <select
                    required
                    value={selectedEmpIdForFiveYear}
                    onChange={(e) => setSelectedEmpIdForFiveYear(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-purple-500/40"
                  >
                    <option value="">-- اختر موظفاً من القائمة --</option>
                    {employees
                      .filter((e) => e.status !== 'five_year_leave' && e.status !== 'retired')
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.fullName} ({emp.employeeNumber}) — {emp.jobTitle} [{emp.department}]
                        </option>
                      ))}
                  </select>
                </div>

                {/* Salary Type Selection */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    نوع الراتب المستحق بالإجازة *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFiveYearSalaryType('full_base_salary')}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                        fiveYearSalaryType === 'full_base_salary'
                          ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-900 dark:text-purple-200 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      راتب اسمي كامل (100%)
                    </button>

                    <button
                      type="button"
                      onClick={() => setFiveYearSalaryType('half_base_salary')}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                        fiveYearSalaryType === 'half_base_salary'
                          ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-900 dark:text-purple-200 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      نصف راتب اسمي (50%)
                    </button>
                  </div>
                </div>

                {/* Pension Deduction Percent */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    نسبة التوقيفات التقاعدية لصندوق التقاعد
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={fiveYearPensionPercent}
                      onChange={(e) => setFiveYearPensionPercent(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-purple-500/40"
                    >
                      <option value={10}>10% (استقطاع قانوني قياسي للموظف)</option>
                      <option value={25}>25% (حصة الموظف + حصة الدائرة التراكمية)</option>
                      <option value={0}>0% (معفى استثنائياً)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Dates and Order Info */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ انفكاك وبدء الإجازة
                  </label>
                  <input
                    type="date"
                    required
                    value={fiveYearStartDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setFiveYearStartDate(newStart);
                      if (newStart) {
                        const d = new Date(newStart);
                        d.setFullYear(d.getFullYear() + 5);
                        setFiveYearEndDate(d.toISOString().slice(0, 10));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ انتهاء الإجازة (تلقائي 5 سنوات)
                  </label>
                  <input
                    type="date"
                    required
                    value={fiveYearEndDate}
                    onChange={(e) => setFiveYearEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    رقم الأمر الإداري الوزاري *
                  </label>
                  <input
                    type="text"
                    required
                    value={fiveYearOrderNumber}
                    onChange={(e) => setFiveYearOrderNumber(e.target.value)}
                    placeholder="إج5-2026-001"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-purple-500/40"
                    dir="ltr"
                    style={{ textAlign: 'right' }}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ صدور الأمر
                  </label>
                  <input
                    type="date"
                    required
                    value={fiveYearOrderDate}
                    onChange={(e) => setFiveYearOrderDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>
              </div>

              {/* Real-time Financial Calculation Card */}
              {(() => {
                const targetEmp = employees.find((x) => x.id === selectedEmpIdForFiveYear);
                const base = targetEmp?.baseSalary || 500000;
                const monthlyPaid = fiveYearSalaryType === 'full_base_salary' ? base : Math.round(base / 2);
                const pensionDeduct = Math.round(base * (fiveYearPensionPercent / 100));
                const netPaid = Math.max(0, monthlyPaid - pensionDeduct);

                return (
                  <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5 text-xs">
                        <DollarSign className="w-4 h-4 text-indigo-600" />
                        <span>الحساب المالي الشهري الدقيق للموظف أثناء الإجازة (وفق سلم الرواتب)</span>
                      </span>
                      {targetEmp && (
                        <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                          {targetEmp.fullName} — الدرجة {targetEmp.civilGrade || 7} / المرحلة {targetEmp.civilStage || 1}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60">
                        <div className="text-[10px] text-slate-500">الراتب الاسمي المعتمد:</div>
                        <div className="font-black font-mono text-slate-900 dark:text-white">
                          {base.toLocaleString('en-US')} د.ع
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60">
                        <div className="text-[10px] text-slate-500">المبلغ الشهري المدفوع:</div>
                        <div className="font-black font-mono text-purple-700 dark:text-purple-300">
                          {monthlyPaid.toLocaleString('en-US')} د.ع
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60">
                        <div className="text-[10px] text-slate-500">استقطاع التقاعد ({fiveYearPensionPercent}%):</div>
                        <div className="font-black font-mono text-amber-600 dark:text-amber-400">
                          -{pensionDeduct.toLocaleString('en-US')} د.ع
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60">
                        <div className="text-[10px] text-slate-500">الصافي الشهري المستلم:</div>
                        <div className="font-black font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                          {netPaid.toLocaleString('en-US')} د.ع
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ملاحظات والسند القانوني
                </label>
                <input
                  type="text"
                  value={fiveYearNotes}
                  onChange={(e) => setFiveYearNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isGrantingFiveYear || !selectedEmpIdForFiveYear}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Briefcase className="w-4 h-4" />
                  <span>{isGrantingFiveYear ? 'جارٍ إصدار الأمر وحفظ القيد...' : 'إقرار ومنح إجازة الـ 5 سنوات وإصدار الأمر ⚡'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* 4. Active 5-Year Leaves Registry Table */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-500" />
                  <span>سجل الموظفين المتمتعين بإجازة الـ 5 سنوات ({fiveYearEmployees.length})</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  متابعة المدد المتبقية، الرواتب المصروفة، وطباعة الأوامر الإدارية أو قطع الإجازة
                </p>
              </div>
            </div>

            {fiveYearEmployees.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Briefcase className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 stroke-1" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                  لا يوجد موظفون متمتعون بإجازة الـ 5 سنوات حالياً
                </p>
                <p className="text-xs">
                  يمكنك اختيار أي موظف من الاستمارة أعلاه لمنحه إجازة خمس سنوات براتب اسمي وفق القانون
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">الموظف</th>
                      <th className="p-3">القسم / العنوان</th>
                      <th className="p-3">نوع الاستحقاق</th>
                      <th className="p-3">الأمر الإداري</th>
                      <th className="p-3">تاريخ البدء والنهاية</th>
                      <th className="p-3">الصافي الشهري</th>
                      <th className="p-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {fiveYearEmployees.map((emp) => {
                      const leave = emp.fiveYearLeave;
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="p-3 font-bold text-slate-900 dark:text-white">
                            <div>{emp.fullName}</div>
                            <div className="text-[10px] font-mono text-slate-400">{emp.employeeNumber}</div>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">
                            <div>{emp.department}</div>
                            <div className="text-[10px] text-slate-400">{emp.jobTitle}</div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                              {leave?.salaryType === 'half_base_salary' ? 'نصف اسمي (50%)' : 'اسمي كامل (100%)'}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                            <div>{leave?.orderNumber || 'أمر رسمي'}</div>
                            <div className="text-[10px] text-slate-400">{leave?.orderDate}</div>
                          </td>
                          <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                            <div>{leave?.startDate}</div>
                            <div className="text-[10px] text-slate-400">إلى {leave?.endDate}</div>
                          </td>
                          <td className="p-3 font-mono font-black text-emerald-600 dark:text-emerald-400">
                            {(leave?.netMonthlyPaid || Math.round((emp.baseSalary || 500000) * 0.9)).toLocaleString('en-US')} د.ع
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPrintingOrderEmployee(emp)}
                                className="px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                title="طباعة الأمر الإداري الرسمي A4"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>طباعة الأمر</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleInterruptFiveYearLeave(emp)}
                                className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                title="قطع الإجازة والمباشرة بالدوام"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>قطع الإجازة</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Printable 5-Year Leave Administrative Order Modal */}
      {printingOrderEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in no-print-bg">
          <div className="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-purple-600" />
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  معاينة الأمر الإداري الرسمي لإجازة الـ 5 سنوات (A4)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الآن (Print)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintingOrderEmployee(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Official Printable Document Container */}
            <div className="p-8 rounded-2xl bg-white text-slate-900 border border-slate-300 shadow-sm space-y-6 text-sm" dir="rtl">
              {/* Official Iraqi Header */}
              <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900">
                <div className="text-right">
                  <div className="font-bold text-base">جمهورية العراق</div>
                  <div className="font-bold text-sm">{organization?.ministryName || 'وزارة التعليم العالي والبحث العلمي'}</div>
                  <div className="text-xs text-slate-700">{organization?.directorateName || 'الدائرة الإدارية والمالية'}</div>
                  <div className="text-xs text-slate-700">قسم الموارد البشرية / شعبة الإجازات</div>
                </div>

                <div className="text-center">
                  <GovernmentEmblem type={organization?.officialEmblem || 'golden_eagle'} className="w-16 h-16 mx-auto" />
                  <div className="text-[10px] font-bold mt-1">شعار الدولة الرسمي</div>
                </div>

                <div className="text-left font-mono text-xs">
                  <div>العدد: {printingOrderEmployee.fiveYearLeave?.orderNumber || 'إج5-2026-001'}</div>
                  <div>التاريخ: {printingOrderEmployee.fiveYearLeave?.orderDate || new Date().toISOString().slice(0, 10)}</div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center space-y-1">
                <h2 className="text-lg font-black underline decoration-2 underline-offset-4">
                  أمر إداري (منح إجازة خمس سنوات)
                </h2>
              </div>

              {/* Preamble */}
              <div className="leading-relaxed text-justify text-xs space-y-2">
                <p>
                  استناداً إلى أحكام المادة (43/مكرر) من قانون الخدمة المدنية رقم (24) لسنة 1960 المعدل، وبموجب الصلاحيات المخولة لنا بموجب القوانين والتعليمات الوزارية النافذة، ولتوفر الشروط القانونية المنصوص عليها،
                </p>
                <p className="font-bold text-center py-2 text-sm">
                  /// قــــــــــــــــــــــــــــــررنـــــــــــــــــــــــــــــــا ///
                </p>
                <p>
                  منح الموظف المذكورة بياناته أدناه إجازة لمدة خمس (5) سنوات{' '}
                  <span className="font-bold">
                    ({printingOrderEmployee.fiveYearLeave?.salaryType === 'half_base_salary' ? 'بنصف راتب اسمي' : 'براتب اسمي كامل'})
                  </span>{' '}
                  مع استقطاع نسبة التوقيفات التقاعدية القانونية البالغة ({printingOrderEmployee.fiveYearLeave?.pensionDeductionPercent || 10}%) شهرياً وإيداعها في صندوق تقاعد موظفي الدولة:
                </p>
              </div>

              {/* Employee Information Table */}
              <table className="w-full text-xs border border-slate-900 text-right">
                <tbody>
                  <tr className="border-b border-slate-900 bg-slate-50">
                    <td className="p-2 font-bold w-1/4 border-l border-slate-900">الاسم الرباعي واللقب:</td>
                    <td className="p-2 font-bold w-1/4 border-l border-slate-900">{printingOrderEmployee.fullName}</td>
                    <td className="p-2 font-bold w-1/4 border-l border-slate-900">الرقم الوظيفي المركزي:</td>
                    <td className="p-2 font-mono w-1/4">{printingOrderEmployee.employeeNumber}</td>
                  </tr>
                  <tr className="border-b border-slate-900">
                    <td className="p-2 font-bold border-l border-slate-900">العنوان الوظيفي:</td>
                    <td className="p-2 border-l border-slate-900">{printingOrderEmployee.jobTitle}</td>
                    <td className="p-2 font-bold border-l border-slate-900">الدرجة والمرحلة:</td>
                    <td className="p-2 font-mono">الدرجة {printingOrderEmployee.civilGrade || 7} / المرحلة {printingOrderEmployee.civilStage || 1}</td>
                  </tr>
                  <tr className="border-b border-slate-900 bg-slate-50">
                    <td className="p-2 font-bold border-l border-slate-900">القسم / التشكيل:</td>
                    <td className="p-2 border-l border-slate-900">{printingOrderEmployee.department}</td>
                    <td className="p-2 font-bold border-l border-slate-900">نوع الملاك:</td>
                    <td className="p-2">{printingOrderEmployee.contractType === 'permanent' ? 'ملاك دائم' : 'عقد وزاري'}</td>
                  </tr>
                  <tr className="border-b border-slate-900">
                    <td className="p-2 font-bold border-l border-slate-900">الراتب الاسمي المعتمد:</td>
                    <td className="p-2 font-mono border-l border-slate-900 font-bold">
                      {(printingOrderEmployee.fiveYearLeave?.baseSalaryAtLeave || printingOrderEmployee.baseSalary || 500000).toLocaleString('en-US')} د.ع
                    </td>
                    <td className="p-2 font-bold border-l border-slate-900">الصافي الشهري المستلم:</td>
                    <td className="p-2 font-mono font-bold">
                      {(printingOrderEmployee.fiveYearLeave?.netMonthlyPaid || Math.round((printingOrderEmployee.baseSalary || 500000) * 0.9)).toLocaleString('en-US')} د.ع
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold border-l border-slate-900">تاريخ بدء الإجازة (الانفكاك):</td>
                    <td className="p-2 font-mono border-l border-slate-900 font-bold">{printingOrderEmployee.fiveYearLeave?.startDate}</td>
                    <td className="p-2 font-bold border-l border-slate-900">تاريخ انتهاء الإجازة:</td>
                    <td className="p-2 font-mono font-bold">{printingOrderEmployee.fiveYearLeave?.endDate}</td>
                  </tr>
                </tbody>
              </table>

              {/* Instructions and Signatures */}
              <div className="pt-4 space-y-8 text-xs">
                <div className="flex justify-between items-end pt-8">
                  <div>
                    <div className="font-bold">نسخة منه إلى:</div>
                    <ul className="text-[10px] list-disc list-inside text-slate-700 mt-1 space-y-0.5">
                      <li>مكتب السيد الوزير / المدير العام المحترم.. للتفضل بالاطلاع.</li>
                      <li>هيئة التقاعد الوطنية / صندوق تقاعد موظفي الدولة.. لإجراء اللازم.</li>
                      <li>قسم الشؤون المالية والرواتب.. لترويج الراتب الاسمي واستقطاع التوقيفات.</li>
                      <li>شعبة الأضابير والتوثيق الإلكتروني.. للحفظ في إضبارة الموظف.</li>
                      <li>الموظف المعني.. للعلم والمباشرة بالإجراءات.</li>
                    </ul>
                  </div>

                  <div className="text-center space-y-1">
                    <div className="font-bold text-sm">المدير العام / رئيس الدائرة</div>
                    <div className="text-xs text-slate-600">عن وزير التعليم العالي والبحث العلمي</div>
                    <div className="pt-8 text-xs font-mono font-bold">التوقيع والختم الرسمي</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {/* Report Engine Control Panel */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 no-print">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Report Mode Selector */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setReportMode('daily')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    reportMode === 'daily'
                      ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  التقرير اليومي
                </button>
                <button
                  type="button"
                  onClick={() => setReportMode('weekly')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    reportMode === 'weekly'
                      ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  التقرير الأسبوعي (7 أيام)
                </button>
                <button
                  type="button"
                  onClick={() => setReportMode('monthly')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    reportMode === 'monthly'
                      ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  التقرير الشهري
                </button>
                <button
                  type="button"
                  onClick={() => setReportMode('custom')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    reportMode === 'custom'
                      ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  تقرير مخصص (نطاق تاريخ)
                </button>
              </div>

              {/* Action Buttons: Print & Export */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>تصدير (Excel / PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintOfficialReport}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة رسمية A4</span>
                </button>
              </div>
            </div>

            {/* Date Pickers based on Mode */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
              {reportMode === 'daily' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">تاريخ التقرير:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs font-bold"
                  />
                  <span className="text-xs font-bold text-indigo-600">
                    ({getArabicDayOfWeek(selectedDate)})
                  </span>
                </div>
              )}

              {reportMode === 'weekly' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">بداية الأسبوع:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs font-bold"
                  />
                  <span className="text-xs text-slate-500">
                    (يستعرض الحركات للأيام الـ 7 التالية تلقائياً)
                  </span>
                </div>
              )}

              {reportMode === 'monthly' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">الشهر المستهدف:</span>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs font-bold"
                  />
                </div>
              )}

              {reportMode === 'custom' && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">من تاريخ:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs font-bold"
                  />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">إلى تاريخ:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs font-bold"
                  />
                </div>
              )}

              {/* Filters */}
              <div className="flex items-center gap-2 mr-auto">
                <select
                  value={movementFilter}
                  onChange={(e) => setMovementFilter(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                >
                  <option value="ALL">كافة الحركات والدوام</option>
                  <option value="MOVEMENTS_ONLY">الحركات فقط (غياب، إجازات، زمنيات)</option>
                  <option value="ABSENT_ONLY">غياب غير مبرر (غ)</option>
                  <option value="LEAVE_ONLY">إجازات اعتيادية ومرضية (ج / م)</option>
                  <option value="TIME_ONLY">أذونات زمنية (ز1 / ز2)</option>
                  <option value="MISSION_ONLY">إيفادات رسمية (ف)</option>
                </select>

                <select
                  value={contractFilter}
                  onChange={(e) => setContractFilter(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                >
                  <option value="ALL">ملاك دائم وعقود</option>
                  <option value="permanent">ملاك دائم فقط</option>
                  <option value="contract">عقود وزارية فقط</option>
                </select>
              </div>
            </div>
          </div>

          {/* Report Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 no-print">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 block">إجمالي السجلات</span>
              <span className="text-xl font-black text-slate-900 dark:text-white font-mono">{reportStats.total}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 shadow-2xs">
              <span className="text-xs font-bold text-rose-700 dark:text-rose-400 block">إجمالي الغياب (غ)</span>
              <span className="text-xl font-black text-rose-700 dark:text-rose-300 font-mono">{reportStats.absent}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 shadow-2xs">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 block">إجازات اعتيادية (ج)</span>
              <span className="text-xl font-black text-amber-700 dark:text-amber-300 font-mono">{reportStats.regularLeave}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 shadow-2xs">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-400 block">إجازات مرضية (م)</span>
              <span className="text-xl font-black text-purple-700 dark:text-purple-300 font-mono">{reportStats.sickLeave}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 shadow-2xs">
              <span className="text-xs font-bold text-sky-700 dark:text-sky-400 block">أذونات زمنية</span>
              <span className="text-xl font-black text-sky-700 dark:text-sky-300 font-mono">{reportStats.timePerm} ({reportStats.timeTotalHours} س)</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 shadow-2xs">
              <span className="text-xs font-bold text-teal-700 dark:text-teal-400 block">إيفادات رسمية (ف)</span>
              <span className="text-xl font-black text-teal-700 dark:text-teal-300 font-mono">{reportStats.mission}</span>
            </div>
          </div>

          {/* Official Report Table (Includes Official Printable Header) */}
          <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs print:border-none print:shadow-none">
            {/* Government Printable Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 text-center space-y-2">
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">جمهورية العراق - حكومة الخدمة والمواطن</div>
              <div className="text-base font-black text-slate-900 dark:text-white">
                {organization?.ministryName || 'وزارة التعليم العالي والبحث العلمي'}
              </div>
              <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                {organization?.directorateName || 'دائرة الشؤون الإدارية والمالية'} - {organization?.departmentName || 'قسم إدارة الموارد البشرية والخدمة المدنية'}
              </div>
              <div className="inline-block mt-2 px-4 py-1 rounded-full bg-slate-100 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200">
                تقرير الموقف الرسمي للحركات والدوام ({reportMode === 'daily' ? `ليوم ${selectedDate}` : reportMode === 'weekly' ? `للأسبوع من ${selectedDate}` : reportMode === 'monthly' ? `لشهر ${selectedMonth}` : `للفترة من ${customStartDate} إلى ${customEndDate}`})
              </div>
            </div>

            {/* Records Table */}
            {/* MANDATE: Only ت، الاسم الكامل للموظف، الصفة الوظيفية، والتفاصيل (No Job Title) */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="p-3 w-12 text-center">ت</th>
                    <th className="p-3">تاريخ الحركة</th>
                    <th className="p-3">اسم الموظف الكامل</th>
                    <th className="p-3 text-center">الصفة الوظيفية</th>
                    <th className="p-3 text-center">نوع الحركة والتصنيف</th>
                    <th className="p-3">تفاصيل الإذن والساعات / السند</th>
                    <th className="p-3">ملاحظات رسمية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {reportRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                        لا توجد حركات مسجلة تطابق محددات التقرير المختارة.
                      </td>
                    </tr>
                  ) : (
                    reportRecords.map((rec, idx) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/20">
                        {/* 1. Sequence Number */}
                        <td className="p-3 text-center font-mono font-bold text-slate-500">
                          {idx + 1}
                        </td>

                        {/* 2. Date */}
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                          {rec.date}
                        </td>

                        {/* 3. Full Name */}
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {rec.employeeName}
                        </td>

                        {/* 4. Contract Type (No Job Title) */}
                        <td className="p-3 text-center">
                          <span
                            className={`text-[11px] font-bold ${
                              rec.contractType === 'permanent'
                                ? 'text-amber-700 dark:text-amber-300'
                                : 'text-blue-700 dark:text-blue-300'
                            }`}
                          >
                            {getContractTypeLabel(rec.contractType, employmentLabels)}
                          </span>
                        </td>

                        {/* 5. Movement Title */}
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                              rec.status === 'absent'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : rec.status === 'leave'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : rec.status === 'time_permission'
                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                                : rec.status === 'mission'
                                ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}
                          >
                            {rec.movementTitle || rec.status}
                          </span>
                        </td>

                        {/* 6. Time Permission or Order details */}
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          {rec.status === 'time_permission' ? (
                            <span className="font-bold text-sky-600">
                              مدة: {(rec.timePermissionMinutes || 60) / 60} ساعة
                            </span>
                          ) : rec.orderNumber ? (
                            <span>سند رقم: {rec.orderNumber}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* 7. Notes */}
                        <td className="p-3 text-slate-500 text-[11px]">
                          {rec.notes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Official Report Signatures & Developer Credit */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-700 dark:text-slate-300">
              <div>
                <span>مسؤول شعبة الحضور والانصراف: </span>
                <span className="underline decoration-dotted">........................</span>
              </div>
              <div>
                <span>مدير الموارد البشرية والخدمة المدنية: </span>
                <span className="underline decoration-dotted">........................</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                تصميم وبرمجة: المهندس حسين عبد المنذر (07711145014)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT MOVEMENT MODAL                                                       */}
      {/* ========================================================================= */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                <span>تعديل تفاصيل حركة الموظف</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 font-bold block mb-1">اسم الموظف:</label>
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 font-bold text-slate-800 dark:text-slate-200">
                  {editingRecord.employee.fullName}
                </div>
              </div>

              <div>
                <label className="text-slate-500 font-bold block mb-1">رقم الأمر الإداري / السند:</label>
                <input
                  type="text"
                  value={editOrderNumber}
                  onChange={(e) => setEditOrderNumber(e.target.value)}
                  placeholder="مثلاً: 1402 في 2026/09/15"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                />
              </div>

              {editingRecord.record?.status === 'time_permission' && (
                <div>
                  <label className="text-slate-500 font-bold block mb-1">مدة الإذن الزمني:</label>
                  <select
                    value={editDuration}
                    onChange={(e) => setEditDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                  >
                    <option value={60}>ساعة واحدة (60 دقيقة - ز1)</option>
                    <option value={120}>ساعتان (120 دقيقة - ز2)</option>
                    <option value={180}>ثلاث ساعات (180 دقيقة)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-slate-500 font-bold block mb-1">ملاحظات وبيان السبب:</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="أدخل ملاحظات إضافية حول الحركة أو المستشفى أو الجهة المقصودة..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveCustomEdit}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Options Modal (Excel .xlsx & PDF) */}
      <ReportExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        records={reportRecords}
        reportScope={reportMode}
        selectedDate={selectedDate}
        selectedMonth={selectedMonth}
        startDate={customStartDate}
        endDate={customEndDate}
        departmentName={departmentFilter === 'ALL' ? 'كافة التشكيلات' : departmentFilter}
        stats={reportStats}
        employmentLabels={employmentLabels}
      />
    </div>
  );
}
