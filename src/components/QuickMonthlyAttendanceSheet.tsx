import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Zap,
  Info,
  SlidersHorizontal,
  X,
  Clock,
  Printer,
  ChevronDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Employee, AttendanceRecord, ContractType } from '../types';
import { getAttendanceLogs, saveAttendanceLogsBatch, saveEmployee } from '../db/indexedDB';
import { PaginationControl } from './PaginationControl';

export interface QuickMonthlyAttendanceSheetProps {
  employees: Employee[];
  onEmployeesUpdated?: (updatedEmployees: Employee[]) => void;
  initialMonth?: string; // YYYY-MM (e.g. '2026-09')
  initialContractFilter?: 'all' | 'contract' | 'permanent';
  onClose?: () => void;
  isModal?: boolean;
  focusedEmployeeId?: string;
}

// Attendance Day Status Codes matching Iraqi Government Excel template
export type DayStatusCode =
  | 'ح' // حضور
  | 'غ' // غياب
  | 'ع' // عطلة رسمية
  | 'ج1' // إجازة اعتيادية
  | 'ج2' // إجازة مرضية
  | 'ز1' // زمنية ساعة
  | 'ز2' // زمنية ساعتين
  | 'ف' // إيفاد أو مهمة رسمية
  | '-'; // عطلة أسبوعية / غير محدد

export interface StatusConfig {
  code: DayStatusCode;
  label: string;
  badgeBg: string;
  badgeText: string;
  borderCol: string;
  statusType: 'present' | 'absent' | 'leave' | 'time_permission' | 'official_holiday' | 'mission' | 'none';
  timeMinutes: number;
}

export const STATUS_CONFIGS: Record<DayStatusCode, StatusConfig> = {
  'ح': {
    code: 'ح',
    label: 'حضور فعلي ملتزم',
    badgeBg: 'bg-emerald-500/15 dark:bg-emerald-500/25',
    badgeText: 'text-emerald-700 dark:text-emerald-300 font-bold',
    borderCol: 'border-emerald-300 dark:border-emerald-800',
    statusType: 'present',
    timeMinutes: 0,
  },
  'غ': {
    code: 'غ',
    label: 'غياب غير مبرر',
    badgeBg: 'bg-rose-500/15 dark:bg-rose-500/25',
    badgeText: 'text-rose-700 dark:text-rose-300 font-bold',
    borderCol: 'border-rose-300 dark:border-rose-800',
    statusType: 'absent',
    timeMinutes: 0,
  },
  'ع': {
    code: 'ع',
    label: 'عطلة رسمية معتمدة',
    badgeBg: 'bg-slate-200 dark:bg-slate-700',
    badgeText: 'text-slate-700 dark:text-slate-300 font-semibold',
    borderCol: 'border-slate-300 dark:border-slate-600',
    statusType: 'official_holiday',
    timeMinutes: 0,
  },
  'ج1': {
    code: 'ج1',
    label: 'إجازة اعتيادية (ج1)',
    badgeBg: 'bg-amber-500/15 dark:bg-amber-500/25',
    badgeText: 'text-amber-800 dark:text-amber-300 font-bold',
    borderCol: 'border-amber-300 dark:border-amber-700',
    statusType: 'leave',
    timeMinutes: 0,
  },
  'ج2': {
    code: 'ج2',
    label: 'إجازة مرضية (ج2)',
    badgeBg: 'bg-orange-500/15 dark:bg-orange-500/25',
    badgeText: 'text-orange-800 dark:text-orange-300 font-bold',
    borderCol: 'border-orange-300 dark:border-orange-700',
    statusType: 'leave',
    timeMinutes: 0,
  },
  'ز1': {
    code: 'ز1',
    label: 'زمنية (ساعة واحدة)',
    badgeBg: 'bg-sky-500/15 dark:bg-sky-500/25',
    badgeText: 'text-sky-700 dark:text-sky-300 font-bold',
    borderCol: 'border-sky-300 dark:border-sky-700',
    statusType: 'time_permission',
    timeMinutes: 60,
  },
  'ز2': {
    code: 'ز2',
    label: 'زمنية (ساعتان)',
    badgeBg: 'bg-blue-500/15 dark:bg-blue-500/25',
    badgeText: 'text-blue-700 dark:text-blue-300 font-bold',
    borderCol: 'border-blue-300 dark:border-blue-700',
    statusType: 'time_permission',
    timeMinutes: 120,
  },
  'ف': {
    code: 'ف',
    label: 'إيفاد / مهمة رسمية',
    badgeBg: 'bg-purple-500/15 dark:bg-purple-500/25',
    badgeText: 'text-purple-700 dark:text-purple-300 font-bold',
    borderCol: 'border-purple-300 dark:border-purple-700',
    statusType: 'mission',
    timeMinutes: 0,
  },
  '-': {
    code: '-',
    label: 'فارغ / عطلة جمعة وسبت',
    badgeBg: 'bg-transparent',
    badgeText: 'text-slate-400 dark:text-slate-500 font-normal',
    borderCol: 'border-transparent',
    statusType: 'none',
    timeMinutes: 0,
  },
};

export const QuickMonthlyAttendanceSheet: React.FC<QuickMonthlyAttendanceSheetProps> = ({
  employees,
  onEmployeesUpdated,
  initialMonth = '2026-09',
  initialContractFilter = 'all',
  onClose,
  isModal = false,
  focusedEmployeeId,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const [contractFilter, setContractFilter] = useState<'all' | 'contract' | 'permanent'>(initialContractFilter);
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [searchEmployee, setSearchEmployee] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [savingNotice, setSavingNotice] = useState<string | null>(null);

  // Active cell popover picker state
  const [activeCell, setActiveCell] = useState<{
    empId: string;
    day: number;
    anchorRect?: DOMRect;
  } | null>(null);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActiveCell(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute year, month index, and number of days in selected month (1 to 28..31)
  const { year, monthNum, daysInMonth, monthLabelAr } = useMemo(() => {
    const [yStr, mStr] = selectedMonth.split('-');
    const y = parseInt(yStr, 10) || 2026;
    const m = parseInt(mStr, 10) || 9;
    // Days in month (day 0 of next month)
    const days = new Date(y, m, 0).getDate();

    const dateObj = new Date(y, m - 1, 1);
    const label = dateObj.toLocaleDateString('ar-IQ', { month: 'long', year: 'numeric' });

    return { year: y, monthNum: m, daysInMonth: days, monthLabelAr: label };
  }, [selectedMonth]);

  // Generate array of days [1, 2, ..., daysInMonth]
  const daysList = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  // Helper to check day of week for a given day (0=Sunday ... 5=Friday, 6=Saturday)
  const getDayInfo = (day: number) => {
    const d = new Date(year, monthNum - 1, day);
    const dayOfWeek = d.getDay();
    const isFriday = dayOfWeek === 5;
    const isSaturday = dayOfWeek === 6;
    const isWeekend = isFriday || isSaturday;
    const dayNames = ['أح', 'اث', 'ثل', 'أر', 'خم', 'جم', 'سب'];
    return {
      dayName: dayNames[dayOfWeek],
      isWeekend,
      dateString: `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    };
  };

  // Load attendance logs for the entire selected month
  const loadMonthAttendance = async () => {
    setIsLoading(true);
    try {
      const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      const logs = await getAttendanceLogs(startDate, endDate);
      setAttendanceRecords(logs);
    } catch (err) {
      console.error('Failed to load attendance logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMonthAttendance();
  }, [selectedMonth, daysInMonth]);

  // Map of [employeeId_date] -> AttendanceRecord
  const recordsMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach((rec) => {
      map.set(`${rec.employeeId}_${rec.date}`, rec);
    });
    return map;
  }, [attendanceRecords]);

  // Helper to convert AttendanceRecord into DayStatusCode
  const getStatusCodeForRecord = (rec?: AttendanceRecord, isWeekend = false): DayStatusCode => {
    if (!rec) {
      return isWeekend ? '-' : 'ح'; // default to present on weekdays if initialized, or '-' on weekend
    }
    if (rec.status === 'present') return 'ح';
    if (rec.status === 'absent') return 'غ';
    if (rec.status === 'official_holiday') return 'ع';
    if (rec.status === 'mission') return 'ف';
    if (rec.status === 'time_permission') {
      return (rec.timePermissionMinutes || 0) >= 120 ? 'ز2' : 'ز1';
    }
    if (rec.status === 'leave') {
      return rec.leaveType === 'sick' ? 'ج2' : 'ج1';
    }
    return '-';
  };

  // Filtered employees according to user selections
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (focusedEmployeeId && emp.id !== focusedEmployeeId) return false;
      if (contractFilter !== 'all' && emp.contractType !== contractFilter) return false;
      if (departmentFilter !== 'all' && emp.department !== departmentFilter) return false;
      if (searchEmployee.trim()) {
        const query = searchEmployee.trim().toLowerCase();
        const matchName = emp.fullName.toLowerCase().includes(query);
        const matchNum = (emp.employeeNumber || '').toLowerCase().includes(query);
        const matchJob = (emp.jobTitle || '').toLowerCase().includes(query);
        if (!matchName && !matchNum && !matchJob) return false;
      }
      return true;
    });
  }, [employees, focusedEmployeeId, contractFilter, departmentFilter, searchEmployee]);

  // Pagination for high performance (20 per page by default)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [contractFilter, departmentFilter, searchEmployee, focusedEmployeeId, selectedMonth]);

  // Paginated employees for current page
  const paginatedEmployees = useMemo(() => {
    if (pageSize === 0) return filteredEmployees;
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  // Unique departments for filter dropdown
  const departmentList = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [employees]);

  // Calculate live statistics per employee for this month
  const employeeMonthlyStats = useMemo(() => {
    const statsMap = new Map<
      string,
      {
        presentDays: number;
        perm1Hours: number;
        perm2Hours: number;
        totalTimeHours: number;
        absentDays: number;
        annualLeaves: number; // ج1
        sickLeaves: number; // ج2
        totalLeaves: number; // ج1 + ج2
        missions: number;
        officialHolidays: number;
        complianceRate: number;
      }
    >();

    filteredEmployees.forEach((emp) => {
      let presentDays = 0;
      let perm1Count = 0;
      let perm2Count = 0;
      let absentDays = 0;
      let annualLeaves = 0;
      let sickLeaves = 0;
      let missions = 0;
      let holidays = 0;

      daysList.forEach((day) => {
        const { dateString, isWeekend } = getDayInfo(day);
        const rec = recordsMap.get(`${emp.id}_${dateString}`);
        const code = getStatusCodeForRecord(rec, isWeekend);

        if (code === 'ح') presentDays++;
        else if (code === 'غ') absentDays++;
        else if (code === 'ز1') {
          perm1Count++;
          presentDays++; // Counted as attended with time permission
        } else if (code === 'ز2') {
          perm2Count++;
          presentDays++; // Counted as attended with time permission
        } else if (code === 'ج1') annualLeaves++;
        else if (code === 'ج2') sickLeaves++;
        else if (code === 'ف') {
          missions++;
          presentDays++;
        } else if (code === 'ع') holidays++;
      });

      const totalTimeHours = perm1Count * 1 + perm2Count * 2;
      const totalLeaves = annualLeaves + sickLeaves;
      const denominator = presentDays + absentDays;
      const complianceRate = denominator > 0 ? Math.round((presentDays / denominator) * 100) : 100;

      statsMap.set(emp.id, {
        presentDays,
        perm1Hours: perm1Count,
        perm2Hours: perm2Count,
        totalTimeHours,
        absentDays,
        annualLeaves,
        sickLeaves,
        totalLeaves,
        missions,
        officialHolidays: holidays,
        complianceRate,
      });
    });

    return statsMap;
  }, [filteredEmployees, daysList, recordsMap, year, monthNum]);

  // Change single cell status directly and persist to IndexedDB
  const handleSetDayStatus = async (emp: Employee, day: number, code: DayStatusCode) => {
    const { dateString } = getDayInfo(day);
    const config = STATUS_CONFIGS[code];

    const existingRec = recordsMap.get(`${emp.id}_${dateString}`);
    const recordId = existingRec?.id || `REC-${emp.id}-${dateString}`;

    const newRecord: AttendanceRecord = {
      id: recordId,
      employeeId: emp.id,
      employeeName: emp.fullName,
      employeeNumber: emp.employeeNumber,
      department: emp.department,
      contractType: emp.contractType,
      date: dateString,
      status: config.statusType === 'none' ? 'present' : config.statusType,
      movementType: config.label,
      movementTitle: config.label,
      timePermissionMinutes: config.timeMinutes,
      timePermissionType: config.timeMinutes === 60 ? 'morning' : config.timeMinutes === 120 ? 'noon' : undefined,
      leaveType: code === 'ج2' ? 'sick' : code === 'ج1' ? 'annual' : undefined,
      deductFromAnnualBalance: code === 'ج1',
      notes: `تم التحديث عبر شيت الحضور السريع (${code} - ${config.label})`,
      createdAt: existingRec?.createdAt || new Date().toISOString(),
    };

    // Optimistic UI update
    setAttendanceRecords((prev) => {
      const filtered = prev.filter((r) => r.id !== recordId);
      return [...filtered, newRecord];
    });

    // Deduct/Recalculate employee balance if changing to or from annual leave (ج1)
    if (code === 'ج1' && existingRec?.leaveType !== 'annual') {
      const newUsed = (emp.usedBalance || 0) + 1;
      const newRem = Math.max(0, (emp.annualBalanceLimit || 36) - newUsed);
      const updatedEmp: Employee = {
        ...emp,
        usedBalance: newUsed,
        remainingBalance: newRem,
        updatedAt: new Date().toISOString(),
      };
      await saveEmployee(updatedEmp);
      if (onEmployeesUpdated) {
        onEmployeesUpdated(employees.map((e) => (e.id === emp.id ? updatedEmp : e)));
      }
    } else if (existingRec?.leaveType === 'annual' && code !== 'ج1') {
      const newUsed = Math.max(0, (emp.usedBalance || 0) - 1);
      const newRem = Math.min(emp.annualBalanceLimit || 36, (emp.annualBalanceLimit || 36) - newUsed);
      const updatedEmp: Employee = {
        ...emp,
        usedBalance: newUsed,
        remainingBalance: newRem,
        updatedAt: new Date().toISOString(),
      };
      await saveEmployee(updatedEmp);
      if (onEmployeesUpdated) {
        onEmployeesUpdated(employees.map((e) => (e.id === emp.id ? updatedEmp : e)));
      }
    }

    // Persist to IndexedDB
    try {
      await saveAttendanceLogsBatch([newRecord]);
      setSavingNotice(`تم حفظ حالة اليوم (${day}) للموظف: ${emp.fullName}`);
      setTimeout(() => setSavingNotice(null), 2000);
    } catch (err) {
      console.error('Failed to save day status:', err);
    }

    setActiveCell(null);
  };

  // Bulk Quick Action: Set all official working days to Present (ح)
  const handleBulkFillWorkingDaysPresent = async () => {
    if (!filteredEmployees.length) return;
    const confirm = window.confirm(
      `هل ترغب في تعيين كافة أيام الدوام الرسمي في شهر (${monthLabelAr}) كـ (حضور ح) لكافة الموظفين المحددين؟`
    );
    if (!confirm) return;

    setIsLoading(true);
    try {
      const batchRecords: AttendanceRecord[] = [];

      filteredEmployees.forEach((emp) => {
        daysList.forEach((day) => {
          const { dateString, isWeekend } = getDayInfo(day);
          const existing = recordsMap.get(`${emp.id}_${dateString}`);
          if (!existing) {
            batchRecords.push({
              id: `REC-${emp.id}-${dateString}`,
              employeeId: emp.id,
              employeeName: emp.fullName,
              employeeNumber: emp.employeeNumber,
              department: emp.department,
              contractType: emp.contractType,
              date: dateString,
              status: isWeekend ? 'official_holiday' : 'present',
              movementType: isWeekend ? 'عطلة نهاية الأسبوع' : 'حضور اعتيادي',
              movementTitle: isWeekend ? 'عطلة نهاية الأسبوع' : 'حضور اعتيادي',
              timePermissionMinutes: 0,
              createdAt: new Date().toISOString(),
            });
          }
        });
      });

      if (batchRecords.length > 0) {
        await saveAttendanceLogsBatch(batchRecords);
        setAttendanceRecords((prev) => [...prev, ...batchRecords]);
        setSavingNotice(`تم ملء (${batchRecords.length}) حركة دوام بنجاح.`);
        setTimeout(() => setSavingNotice(null), 3000);
      }
    } catch (err: any) {
      alert('حدث خطأ أثناء ملء الحضور: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Export this exact 1-31 monthly matrix to Excel (.xlsx)
  const handleExportMatrixExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const aoa: any[][] = [];

      // Ministry Header matching screenshot
      aoa.push(['جمهورية العراق - وزارة الموارد المائية']);
      aoa.push([
        `متابعة الحضور والزمنيات والإجازات والغياب - ${
          contractFilter === 'contract'
            ? 'كادر العقود'
            : contractFilter === 'permanent'
            ? 'كادر الملاك الدائم'
            : 'كافة الكوادر'
        }`,
      ]);
      aoa.push([`السنة: ${year} | الشهر: ${monthLabelAr}`]);
      aoa.push([]);

      // Table Header Row 1: Columns
      const headers = [
        'ت',
        'الاسم الكامل للموظف',
        'الصفة',
        ...daysList.map((d) => String(d)),
        'أيام الدوام الفعلي',
        'زمنية (ساعة)',
        'زمنية (ساعتين)',
        'مجموع ساعات الزمنية',
        'أيام الغياب',
        'إجازة اعتيادية (ج1)',
        'إجازة مرضية (ج2)',
        'مجموع الإجازات',
        'نسبة الالتزام %',
        'رصيد الإجازات المتبقي',
      ];
      aoa.push(headers);

      // Rows
      filteredEmployees.forEach((emp, idx) => {
        const stats = employeeMonthlyStats.get(emp.id) || {
          presentDays: 0,
          perm1Hours: 0,
          perm2Hours: 0,
          totalTimeHours: 0,
          absentDays: 0,
          annualLeaves: 0,
          sickLeaves: 0,
          totalLeaves: 0,
          complianceRate: 100,
        };

        const dayCodes = daysList.map((day) => {
          const { dateString, isWeekend } = getDayInfo(day);
          const rec = recordsMap.get(`${emp.id}_${dateString}`);
          return getStatusCodeForRecord(rec, isWeekend);
        });

        const contractLabel =
          emp.contractType === 'permanent'
            ? 'ملاك'
            : emp.contractType === 'contract'
            ? 'عقد'
            : 'أخرى';

        aoa.push([
          idx + 1,
          emp.fullName,
          contractLabel,
          ...dayCodes,
          stats.presentDays,
          stats.perm1Hours,
          stats.perm2Hours,
          stats.totalTimeHours,
          stats.absentDays,
          stats.annualLeaves,
          stats.sickLeaves,
          stats.totalLeaves,
          `${stats.complianceRate}%`,
          emp.remainingBalance || 0,
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!views'] = [{ RTL: true }];

      // Column widths
      const colWidths = [
        { wch: 4 }, // ت
        { wch: 26 }, // الاسم
        { wch: 10 }, // الصفة
        ...daysList.map(() => ({ wch: 4.5 })), // Days
        { wch: 16 }, // دوام فعلي
        { wch: 12 }, // ز1
        { wch: 12 }, // ز2
        { wch: 16 }, // مجموع زمنيات
        { wch: 12 }, // غياب
        { wch: 16 }, // ج1
        { wch: 16 }, // ج2
        { wch: 14 }, // مجموع الإجازات
        { wch: 14 }, // نسبة الالتزام
        { wch: 16 }, // رصيد الإجازات
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, `حضور_${selectedMonth}`);
      const filename = `شيت_الحضور_الشهري_1_31_${selectedMonth}.xlsx`;
      XLSX.writeFile(wb, filename);

      setSavingNotice(`تم تصدير ملف الشيت بنجاح: ${filename}`);
      setTimeout(() => setSavingNotice(null), 3000);
    } catch (err: any) {
      alert('تعذر تصدير الملف: ' + err.message);
    }
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setSelectedMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    setSelectedMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <div
      className={`w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden text-slate-800 dark:text-slate-100 ${
        isModal ? 'max-h-[92vh] flex flex-col' : ''
      }`}
    >
      {/* 1. macOS Style Header Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
              <span>شيت متابعة الحضور والزمنيات والإجازات والغياب (1 - 31)</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                {monthLabelAr}
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            سجل الحضور اليومي السريع والمصغر بنظام الجداول الحكومية المعتمدة مع الحساب اللحظي الفوري
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Navigation */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-2xl border border-slate-700">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="الشهر السابق"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-white px-2 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="الشهر التالي"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Auto-Fill */}
          <button
            type="button"
            onClick={handleBulkFillWorkingDaysPresent}
            className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="ملء أيام الدوام الرسمي تلقائياً بصفة حضور لكافة الموظفين"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>ملء الحضور (ح)</span>
          </button>

          {/* Export Matrix to Excel (.xlsx) */}
          <button
            type="button"
            id="export-monthly-matrix-excel-btn"
            onClick={handleExportMatrixExcel}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-emerald-600/30"
            title="تصدير هذا الشيت مباشرة إلى ملف Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>تصدير الشيت (.xlsx)</span>
          </button>

          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Sub-filters & Quick Status Legend */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Category & Department Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Contract Filter (كما في الصورة: كادر العقود / كادر الملاك) */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-200 dark:bg-slate-700">
            <button
              type="button"
              onClick={() => setContractFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                contractFilter === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              الجميع ({employees.length})
            </button>
            <button
              type="button"
              onClick={() => setContractFilter('contract')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                contractFilter === 'contract'
                  ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              كادر العقود ({employees.filter((e) => e.contractType === 'contract').length})
            </button>
            <button
              type="button"
              onClick={() => setContractFilter('permanent')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                contractFilter === 'permanent'
                  ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              كادر الملاك ({employees.filter((e) => e.contractType === 'permanent').length})
            </button>
          </div>

          {/* Department dropdown */}
          {departmentList.length > 1 && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="all">كافة الأقسام والتشكيلات</option>
              {departmentList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}

          {/* Search box */}
          <input
            type="text"
            placeholder="بحث عن موظف بالاسم أو الرقم..."
            value={searchEmployee}
            onChange={(e) => setSearchEmployee(e.target.value)}
            className="px-3 py-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none w-48"
          />
        </div>

        {/* Status Codes Legend */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="font-semibold text-slate-400 ml-1">دليل الرموز:</span>
          {(['ح', 'غ', 'ع', 'ج1', 'ج2', 'ز1', 'ز2', 'ف'] as DayStatusCode[]).map((code) => {
            const cfg = STATUS_CONFIGS[code];
            return (
              <span
                key={code}
                className={`px-1.5 py-0.5 rounded-md border ${cfg.badgeBg} ${cfg.badgeText} ${cfg.borderCol} flex items-center gap-1`}
                title={cfg.label}
              >
                <span className="font-bold">{code}</span>
                <span className="text-[10px] opacity-85 hidden xl:inline">{cfg.label.split(' ')[0]}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Notification Toast */}
      {savingNotice && (
        <div className="bg-emerald-500/10 border-y border-emerald-500/20 px-4 py-1.5 text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{savingNotice}</span>
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">حفظ تلقائي محلي</span>
        </div>
      )}

      {/* 3. The Interactive 1-31 Spreadsheet Matrix */}
      <div className="relative overflow-x-auto overflow-y-auto max-h-[68vh] select-none">
        <table className="w-full border-collapse text-right text-xs">
          {/* Header */}
          <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 shadow-xs border-b border-slate-300 dark:border-slate-700">
            <tr>
              {/* Frozen Left Columns: Index, Full Name, Contract */}
              <th className="sticky right-0 z-30 bg-slate-200 dark:bg-slate-800 px-2.5 py-2 font-bold text-slate-700 dark:text-slate-200 border-l border-b border-slate-300 dark:border-slate-700 w-10 text-center">
                ت
              </th>
              <th className="sticky right-10 z-30 bg-slate-200 dark:bg-slate-800 px-3 py-2 font-bold text-slate-800 dark:text-slate-100 border-l border-b border-slate-300 dark:border-slate-700 min-w-[180px]">
                الاسم الكامل للموظف
              </th>
              <th className="sticky right-[220px] z-30 bg-slate-200 dark:bg-slate-800 px-2.5 py-2 font-bold text-slate-700 dark:text-slate-200 border-l border-b border-slate-300 dark:border-slate-700 w-20 text-center">
                الصفة
              </th>

              {/* Days Columns (1 to 31) */}
              {daysList.map((day) => {
                const { dayName, isWeekend } = getDayInfo(day);
                return (
                  <th
                    key={day}
                    className={`px-1 py-1 text-center font-bold border-l border-b border-slate-300 dark:border-slate-700 min-w-[34px] ${
                      isWeekend
                        ? 'bg-slate-200/80 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="text-[10px] font-mono leading-tight">{day}</div>
                    <div className="text-[9px] font-normal opacity-70 leading-tight">{dayName}</div>
                  </th>
                );
              })}

              {/* Summary Columns matching exact screenshot */}
              <th className="px-2.5 py-2 text-center font-bold bg-teal-600/10 text-teal-800 dark:text-teal-300 border-l border-b border-slate-300 dark:border-slate-700 min-w-[90px]">
                دوام فعلي
              </th>
              <th className="px-2 py-2 text-center font-bold bg-sky-600/10 text-sky-800 dark:text-sky-300 border-l border-b border-slate-300 dark:border-slate-700 min-w-[65px]">
                زمنية (ساعة)
              </th>
              <th className="px-2 py-2 text-center font-bold bg-blue-600/10 text-blue-800 dark:text-blue-300 border-l border-b border-slate-300 dark:border-slate-700 min-w-[70px]">
                زمنية (ساعتين)
              </th>
              <th className="px-2 py-2 text-center font-bold bg-indigo-600/10 text-indigo-800 dark:text-indigo-300 border-l border-b border-slate-300 dark:border-slate-700 min-w-[85px]">
                مجموع ساعات الزمنية
              </th>
              <th className="px-2 py-2 text-center font-bold bg-rose-600/10 text-rose-800 dark:text-rose-300 border-l border-b border-slate-300 dark:border-slate-700 min-w-[70px]">
                أيام الغياب
              </th>
              <th className="px-2 py-2 text-center font-bold bg-amber-600/10 text-amber-800 dark:text-amber-300 border-l border-b border-slate-300 dark:border-slate-700 min-w-[85px]">
                إجازة اعتيادية (ج1)
              </th>
              <th className="px-2 py-2 text-center font-bold bg-orange-600/10 text-orange-800 dark:text-orange-300 border-l border-b border-slate-300 dark:border-slate-700 min-w-[85px]">
                إجازة مرضية (ج2)
              </th>
              <th className="px-2 py-2 text-center font-bold bg-amber-600/15 text-amber-900 dark:text-amber-200 border-l border-b border-slate-300 dark:border-slate-700 min-w-[80px]">
                مجموع الإجازات
              </th>
              <th className="px-2.5 py-2 text-center font-bold bg-emerald-600/15 text-emerald-900 dark:text-emerald-200 border-l border-b border-slate-300 dark:border-slate-700 min-w-[85px]">
                نسبة الالتزام %
              </th>
              <th className="px-2 py-2 text-center font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border-b border-slate-300 dark:border-slate-700 min-w-[85px]">
                رصيد الإجازات
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={daysList.length + 13} className="text-center py-12 text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
                    <span>جاري تحميل بيانات حركات الشهر وتحديث الإحصائيات...</span>
                  </div>
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={daysList.length + 13} className="text-center py-12 text-slate-400">
                  لا توجد سجلات موظفين مطابقة للتصفية الحالية.
                </td>
              </tr>
            ) : (
              paginatedEmployees.map((emp, idx) => {
                const stats = employeeMonthlyStats.get(emp.id) || {
                  presentDays: 0,
                  perm1Hours: 0,
                  perm2Hours: 0,
                  totalTimeHours: 0,
                  absentDays: 0,
                  annualLeaves: 0,
                  sickLeaves: 0,
                  totalLeaves: 0,
                  complianceRate: 100,
                };

                const isFocused = focusedEmployeeId === emp.id;

                return (
                  <tr
                    key={emp.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                      isFocused ? 'bg-amber-500/10' : ''
                    }`}
                  >
                    {/* Index */}
                    <td className="sticky right-0 z-10 bg-inherit px-2.5 py-1.5 text-center text-xs text-slate-500 border-l border-slate-200 dark:border-slate-800 font-mono">
                      {(pageSize === 0 ? 0 : (currentPage - 1) * pageSize) + idx + 1}
                    </td>

                    {/* Employee Full Name */}
                    <td className="sticky right-10 z-10 bg-inherit px-3 py-1.5 border-l border-slate-200 dark:border-slate-800">
                      <div className="font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                        {emp.fullName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{emp.employeeNumber || '—'}</div>
                    </td>

                    {/* Contract Type */}
                    <td className="sticky right-[220px] z-10 bg-inherit px-2 py-1.5 text-center border-l border-slate-200 dark:border-slate-800">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          emp.contractType === 'permanent'
                            ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            : 'bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800'
                        }`}
                      >
                        {emp.contractType === 'permanent' ? 'ملاك' : 'عقد'}
                      </span>
                    </td>

                    {/* Day Cells 1 to 31 */}
                    {daysList.map((day) => {
                      const { dateString, isWeekend } = getDayInfo(day);
                      const rec = recordsMap.get(`${emp.id}_${dateString}`);
                      const code = getStatusCodeForRecord(rec, isWeekend);
                      const cfg = STATUS_CONFIGS[code];

                      return (
                        <td
                          key={day}
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setActiveCell({ empId: emp.id, day, anchorRect: rect });
                          }}
                          className={`p-0.5 text-center border-l border-slate-200 dark:border-slate-800 cursor-pointer hover:ring-2 hover:ring-emerald-500/50 transition-all ${
                            isWeekend ? 'bg-slate-100/50 dark:bg-slate-800/30' : ''
                          }`}
                          title={`اليوم ${day}: ${cfg.label} (انقر للتغيير)`}
                        >
                          <div
                            className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center font-bold text-[11px] transition-transform active:scale-90 ${cfg.badgeBg} ${cfg.badgeText} border ${cfg.borderCol}`}
                          >
                            {code}
                          </div>
                        </td>
                      );
                    })}

                    {/* Computed Summary Columns */}
                    <td className="px-2 py-1.5 text-center font-bold text-teal-700 dark:text-teal-300 bg-teal-500/5 border-l border-slate-200 dark:border-slate-800">
                      {stats.presentDays}
                    </td>
                    <td className="px-2 py-1.5 text-center font-mono text-sky-700 dark:text-sky-300 bg-sky-500/5 border-l border-slate-200 dark:border-slate-800">
                      {stats.perm1Hours}
                    </td>
                    <td className="px-2 py-1.5 text-center font-mono text-blue-700 dark:text-blue-300 bg-blue-500/5 border-l border-slate-200 dark:border-slate-800">
                      {stats.perm2Hours}
                    </td>
                    <td className="px-2 py-1.5 text-center font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/5 border-l border-slate-200 dark:border-slate-800">
                      {stats.totalTimeHours} س
                    </td>
                    <td
                      className={`px-2 py-1.5 text-center font-bold border-l border-slate-200 dark:border-slate-800 ${
                        stats.absentDays > 0
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                          : 'text-slate-400 bg-rose-500/5'
                      }`}
                    >
                      {stats.absentDays}
                    </td>
                    <td className="px-2 py-1.5 text-center font-mono text-amber-700 dark:text-amber-300 bg-amber-500/5 border-l border-slate-200 dark:border-slate-800">
                      {stats.annualLeaves}
                    </td>
                    <td className="px-2 py-1.5 text-center font-mono text-orange-700 dark:text-orange-300 bg-orange-500/5 border-l border-slate-200 dark:border-slate-800">
                      {stats.sickLeaves}
                    </td>
                    <td className="px-2 py-1.5 text-center font-bold text-amber-800 dark:text-amber-300 bg-amber-500/10 border-l border-slate-200 dark:border-slate-800">
                      {stats.totalLeaves}
                    </td>
                    <td className="px-2.5 py-1.5 text-center border-l border-slate-200 dark:border-slate-800 bg-emerald-500/10">
                      <span
                        className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs ${
                          stats.complianceRate >= 90
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : stats.complianceRate >= 75
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {stats.complianceRate}%
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      {emp.remainingBalance ?? 0} ي
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. macOS Floating Fast-Status Picker Popover */}
      {activeCell && (
        <div
          ref={popoverRef}
          className="fixed z-50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-2.5 w-64 animate-in fade-in zoom-in-95 duration-100"
          style={{
            top: activeCell.anchorRect
              ? Math.min(window.innerHeight - 280, activeCell.anchorRect.bottom + 6)
              : '50%',
            left: activeCell.anchorRect
              ? Math.max(10, Math.min(window.innerWidth - 270, activeCell.anchorRect.left - 100))
              : '50%',
          }}
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5 mb-2 text-xs">
            <span className="font-bold text-slate-800 dark:text-white">
              تحديد حالة اليوم ({activeCell.day})
            </span>
            <button
              type="button"
              onClick={() => setActiveCell(null)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Rapid Status Selector Grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {(['ح', 'غ', 'ع', 'ج1', 'ج2', 'ز1', 'ز2', 'ف', '-'] as DayStatusCode[]).map((code) => {
              const cfg = STATUS_CONFIGS[code];
              const targetEmp = employees.find((e) => e.id === activeCell.empId);
              if (!targetEmp) return null;

              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleSetDayStatus(targetEmp, activeCell.day, code)}
                  className={`p-1.5 rounded-xl border text-right transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] ${cfg.badgeBg} ${cfg.borderCol}`}
                >
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${cfg.badgeText} bg-white/80 dark:bg-slate-900/80`}
                  >
                    {code}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {cfg.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4.5. Pagination Controls */}
      {filteredEmployees.length > 0 && (
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <PaginationControl
            currentPage={currentPage}
            totalItems={filteredEmployees.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[20, 30, 50, 100, 0]}
            itemLabel="موظفاً بالشيت"
          />
        </div>
      )}

      {/* 5. Footer Summary / Credits */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-4">
          <span>إجمالي الموظفين بالشيت: {filteredEmployees.length}</span>
          <span>أيام الشهر المتاحة للتسجيل: {daysInMonth} يوماً</span>
        </div>
        <div className="text-slate-400 text-[11px]">
          تصميم وبرمجة: المهندس حسين عبد المنذر - نظام شؤون الموظفين الحكومي 2026
        </div>
      </div>
    </div>
  );
};
