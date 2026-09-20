import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  Calendar,
  Filter,
  Download,
  Printer,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserX,
  UserCheck,
  Building2,
  X,
  Sparkles,
  Timer,
  FileSpreadsheet,
  Layers,
  Zap,
  RotateCcw,
  Check,
  ChevronLeft,
  ChevronRight,
  Home,
  ArrowUpDown,
  Users,
  Sliders,
  BarChart3,
} from 'lucide-react';
import {
  Employee,
  AttendanceRecord,
  AttendanceStatus,
  LeaveRulesSettings,
  UserAccount,
  WorkspaceTab,
} from '../types';
import {
  getAttendanceLogs,
  saveAttendanceLogsBatch,
  saveEmployee,
  openGovDB,
} from '../db/indexedDB';
import { GovernmentEmblem } from './GovernmentEmblem';
import { MovementReportDesigner } from './MovementReportDesigner';
import { AddMovementModal } from './AddMovementModal';
import { AdvancedSearchBar, AdvancedSearchFilterState, SortField, SortDirection } from './AdvancedSearchBar';
import { QuickMovementActionModal } from './QuickMovementActionModal';
import { ReportExportModal } from './ReportExportModal';
import {
  triggerOfficialPrint,
  getArabicDayOfWeek,
  OFFICIAL_DESIGNER_CREDIT,
} from '../utils/reportExportUtils';

interface AttendanceReportsProps {
  employees: Employee[];
  leaveRules: LeaveRulesSettings;
  onEmployeesChanged?: (updated: Employee[]) => void;
  currentUser?: UserAccount | null;
  onBackToDashboard?: () => void;
  onNavigate?: (tab: WorkspaceTab) => void;
}

export function AttendanceReports({
  employees,
  leaveRules,
  onEmployeesChanged,
  currentUser,
  onBackToDashboard,
  onNavigate,
}: AttendanceReportsProps) {
  // Main Sub-Tab: 'movements' (Daily Movements), 'monthly' (Monthly Sheets), 'archive' (Archive & Reports), 'designer' (Exclusive Movement Report Designer & Charts)
  const [activeSubTab, setActiveSubTab] = useState<'movements' | 'monthly' | 'archive' | 'designer'>('movements');

  // Dates
  const [selectedDate, setSelectedDate] = useState('2026-09-15');
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [customStartDate, setCustomStartDate] = useState('2026-09-01');
  const [customEndDate, setCustomEndDate] = useState('2026-09-30');
  const [archiveReportType, setArchiveReportType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');

  // Records state
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [quickActionModalOpen, setQuickActionModalOpen] = useState(false);
  const [selectedEmployeeForQuick, setSelectedEmployeeForQuick] = useState<Employee | null>(null);
  const [selectedRecordForQuick, setSelectedRecordForQuick] = useState<AttendanceRecord | null>(null);

  // Print Mode State
  const [isPrintPreview, setIsPrintPreview] = useState(false);

  // Advanced Search Filter State (Unified)
  const [filters, setFilters] = useState<AdvancedSearchFilterState>({
    searchTerm: '',
    selectedContractType: 'ALL',
    selectedDepartment: 'ALL',
    selectedStatus: 'ALL',
    selectedDate: '2026-09-15',
    sortField: 'seq',
    sortDirection: 'asc',
  });

  // Departments list from employees
  const departments = useMemo(() => {
    const set = new Set(employees.map((e) => e.department));
    return Array.from(set).sort();
  }, [employees]);

  // Load records from IndexedDB
  const loadRecords = async () => {
    setIsLoading(true);
    try {
      let logs = await getAttendanceLogs();

      // Seed initial demo logs if empty
      if (logs.length === 0 && employees.length > 0) {
        const seedLogs: AttendanceRecord[] = [
          {
            id: 'REC-101',
            employeeId: employees[0]?.id || 'EMP-01',
            employeeName: employees[0]?.fullName || 'كرار حيدر الموسوي',
            employeeNumber: employees[0]?.employeeNumber || 'IQ-98214',
            department: employees[0]?.department || 'قسم الشؤون الهندسية',
            contractType: employees[0]?.contractType || 'permanent',
            date: '2026-09-15',
            status: 'present',
            notes: 'حضور مبكر رسمي',
          },
          {
            id: 'REC-102',
            employeeId: employees[1]?.id || 'EMP-02',
            employeeName: employees[1]?.fullName || 'د. زينب التميمي',
            employeeNumber: employees[1]?.employeeNumber || 'IQ-98215',
            department: employees[1]?.department || 'قسم الشؤون القانونية',
            contractType: employees[1]?.contractType || 'permanent',
            date: '2026-09-15',
            status: 'leave',
            leaveType: 'annual',
            notes: 'إجازة اعتيادية برصيد موافق عليه',
          },
          {
            id: 'REC-103',
            employeeId: employees[2]?.id || 'EMP-03',
            employeeName: employees[2]?.fullName || 'أحمد مهدي الجبوري',
            employeeNumber: employees[2]?.employeeNumber || 'IQ-98216',
            department: employees[2]?.department || 'قسم الموارد البشرية',
            contractType: employees[2]?.contractType || 'contract',
            date: '2026-09-15',
            status: 'time_permission',
            timePermissionMinutes: 120,
            notes: 'زمنية رسمية لمراجعة دائرة التقاعد',
          },
          {
            id: 'REC-104',
            employeeId: employees[3]?.id || 'EMP-04',
            employeeName: employees[3]?.fullName || 'مروة قاسم الساعدي',
            employeeNumber: employees[3]?.employeeNumber || 'IQ-98217',
            department: employees[3]?.department || 'شعبة تكنولوجيا المعلومات',
            contractType: employees[3]?.contractType || 'contract',
            date: '2026-09-15',
            status: 'absent',
            notes: 'غياب بدون إشعار مسبق',
          },
        ];

        await saveAttendanceLogsBatch(seedLogs);
        logs = seedLogs;
      }

      setRecords(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [employees]);

  // Helper: map employeeId to record on target date
  const employeeRecordsForSelectedDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    records.forEach((r) => {
      if (r.date === selectedDate) {
        map.set(r.employeeId, r);
      }
    });
    return map;
  }, [records, selectedDate]);

  // Department employee counts
  const departmentCounts = useMemo(() => {
    const countsMap: Record<string, number> = {};
    employees.forEach((emp) => {
      countsMap[emp.department] = (countsMap[emp.department] || 0) + 1;
    });
    return countsMap;
  }, [employees]);

  // Live status counts on selectedDate (taking active department filter into account)
  const statusCountsForSelectedDate = useMemo(() => {
    let present = 0;
    let absent = 0;
    let leave = 0;
    let timePerm = 0;
    let mission = 0;

    employees.forEach((emp) => {
      if (filters.selectedDepartment !== 'ALL' && emp.department !== filters.selectedDepartment) {
        return;
      }
      if (filters.selectedContractType !== 'ALL' && emp.contractType !== filters.selectedContractType) {
        return;
      }
      const rec = employeeRecordsForSelectedDate.get(emp.id);
      const st = rec ? rec.status : 'present';
      if (st === 'absent') absent++;
      else if (st === 'leave') leave++;
      else if (st === 'time_permission') timePerm++;
      else if (st === 'mission') mission++;
      else present++;
    });

    return {
      total: employees.length,
      present,
      absent,
      leave,
      timePerm,
      mission,
    };
  }, [employees, employeeRecordsForSelectedDate, filters.selectedDepartment, filters.selectedContractType]);

  // Helper: filter employees based on active unified search filters
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // 1. Contract type
      if (filters.selectedContractType !== 'ALL' && emp.contractType !== filters.selectedContractType) {
        return false;
      }
      // 2. Department
      if (filters.selectedDepartment !== 'ALL' && emp.department !== filters.selectedDepartment) {
        return false;
      }
      // 3. Search term (Name, code, job title, phone)
      if (filters.searchTerm.trim() !== '') {
        const term = filters.searchTerm.trim().toLowerCase();
        const matchesName = emp.fullName.toLowerCase().includes(term);
        const matchesNumber = emp.employeeNumber.toLowerCase().includes(term);
        const matchesTitle = emp.jobTitle.toLowerCase().includes(term);
        const matchesPhone = (emp.phone || '').toLowerCase().includes(term);
        if (!matchesName && !matchesNumber && !matchesTitle && !matchesPhone) {
          return false;
        }
      }
      // 4. Status filter on selectedDate
      if (filters.selectedStatus !== 'ALL') {
        const rec = employeeRecordsForSelectedDate.get(emp.id);
        const currentStatus = rec ? rec.status : 'present';
        if (currentStatus !== filters.selectedStatus) {
          return false;
        }
      }
      return true;
    });
  }, [employees, filters, employeeRecordsForSelectedDate]);

  // Sorted employees list according to sortField and sortDirection
  const sortedEmployees = useMemo(() => {
    const list = [...filteredEmployees];
    const field = filters.sortField || 'seq';
    const direction = filters.sortDirection || 'asc';

    list.sort((a, b) => {
      let comparison = 0;
      if (field === 'name') {
        comparison = a.fullName.localeCompare(b.fullName, 'ar');
      } else if (field === 'employeeNumber') {
        comparison = a.employeeNumber.localeCompare(b.employeeNumber, 'en', { numeric: true });
      } else if (field === 'department') {
        comparison = a.department.localeCompare(b.department, 'ar');
      } else if (field === 'contractType') {
        comparison = a.contractType.localeCompare(b.contractType);
      } else if (field === 'status') {
        const getStatusRank = (empId: string) => {
          const rec = employeeRecordsForSelectedDate.get(empId);
          const st = rec ? rec.status : 'present';
          switch (st) {
            case 'absent': return 1; // Show absent first
            case 'leave': return 2;
            case 'time_permission': return 3;
            case 'mission': return 4;
            case 'official_holiday': return 5;
            case 'present': return 6;
            default: return 7;
          }
        };
        comparison = getStatusRank(a.id) - getStatusRank(b.id);
      } else {
        const idxA = employees.findIndex((e) => e.id === a.id);
        const idxB = employees.findIndex((e) => e.id === b.id);
        comparison = idxA - idxB;
      }

      return direction === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [filteredEmployees, filters.sortField, filters.sortDirection, employeeRecordsForSelectedDate, employees]);

  // Counts for search bar
  const searchCounts = useMemo(() => {
    const total = employees.length;
    const permanent = employees.filter((e) => e.contractType === 'permanent').length;
    const contract = employees.filter((e) => e.contractType === 'contract').length;
    const filtered = sortedEmployees.length;
    return { total, permanent, contract, filtered };
  }, [employees, sortedEmployees]);

  // Filtered attendance records for archive/reports view
  const filteredArchiveRecords = useMemo(() => {
    return records.filter((rec) => {
      // Period
      if (archiveReportType === 'daily') {
        if (rec.date !== selectedDate) return false;
      } else if (archiveReportType === 'monthly') {
        if (!rec.date.startsWith(selectedMonth)) return false;
      } else if (archiveReportType === 'weekly') {
        const start = new Date(selectedDate);
        const cur = new Date(rec.date);
        const diff = (cur.getTime() - start.getTime()) / (1000 * 3600 * 24);
        if (diff < 0 || diff > 6) return false;
      } else if (archiveReportType === 'custom') {
        if (rec.date < customStartDate || rec.date > customEndDate) return false;
      }

      // Department
      if (filters.selectedDepartment !== 'ALL' && rec.department !== filters.selectedDepartment) {
        return false;
      }

      // Contract
      if (filters.selectedContractType !== 'ALL' && rec.contractType !== filters.selectedContractType) {
        return false;
      }

      // Status
      if (filters.selectedStatus !== 'ALL' && rec.status !== filters.selectedStatus) {
        return false;
      }

      // Search term
      if (filters.searchTerm.trim() !== '') {
        const term = filters.searchTerm.trim().toLowerCase();
        const matchesName = (rec.employeeName || '').toLowerCase().includes(term);
        const matchesNumber = (rec.employeeNumber || '').toLowerCase().includes(term);
        if (!matchesName && !matchesNumber) return false;
      }

      return true;
    });
  }, [records, archiveReportType, selectedDate, selectedMonth, customStartDate, customEndDate, filters]);

  // Stats calculation
  const archiveStats = useMemo(() => {
    const present = filteredArchiveRecords.filter((r) => r.status === 'present').length;
    const absent = filteredArchiveRecords.filter((r) => r.status === 'absent').length;
    const leave = filteredArchiveRecords.filter((r) => r.status === 'leave').length;
    const timePerm = filteredArchiveRecords.filter((r) => r.status === 'time_permission').length;
    const totalTimeHours = Math.round(
      filteredArchiveRecords.reduce((acc, curr) => acc + (curr.timePermissionMinutes || 0), 0) / 60
    );

    return {
      total: filteredArchiveRecords.length,
      present,
      absent,
      leave,
      timePerm,
      totalTimeHours,
    };
  }, [filteredArchiveRecords]);

  // One-click direct action handler for employee
  const handleQuickAction = async (
    emp: Employee,
    action: 'present' | 'leave' | 'absent' | 'time_60' | 'time_120'
  ) => {
    const currentRec = employeeRecordsForSelectedDate.get(emp.id);
    let newStatus: AttendanceStatus = 'present';
    let timeMinutes: number | undefined = undefined;
    let leaveType: string | undefined = undefined;
    let movementTitle = 'حاضر (دوام رسمي)';

    if (action === 'present') {
      newStatus = 'present';
      movementTitle = 'حاضر (دوام رسمي)';
    } else if (action === 'leave') {
      newStatus = 'leave';
      leaveType = 'annual';
      movementTitle = 'إجازة اعتيادية';
    } else if (action === 'absent') {
      newStatus = 'absent';
      movementTitle = 'غياب غير مبرر';
    } else if (action === 'time_60') {
      newStatus = 'time_permission';
      timeMinutes = 60;
      movementTitle = 'إذن زمنية (ساعة واحدة)';
    } else if (action === 'time_120') {
      newStatus = 'time_permission';
      timeMinutes = 120;
      movementTitle = 'إذن زمنية (ساعتان)';
    }

    const recId = currentRec?.id || `REC-${emp.id}-${selectedDate}-${Date.now().toString().slice(-4)}`;
    const newRecord: AttendanceRecord = {
      id: recId,
      employeeId: emp.id,
      employeeName: emp.fullName,
      employeeNumber: emp.employeeNumber,
      department: emp.department,
      contractType: emp.contractType,
      date: selectedDate,
      status: newStatus,
      leaveType: leaveType as any,
      timePermissionMinutes: timeMinutes,
      movementTitle,
      notes: currentRec?.notes || (action === 'present' ? 'حضور دوام معتمد' : undefined),
    };

    // Save record to IndexedDB
    await saveAttendanceLogsBatch([newRecord]);

    // Handle employee balance change if switched to/from annual leave
    let updatedEmpList = employees;
    if (action === 'leave' && currentRec?.status !== 'leave') {
      const newUsed = emp.usedBalance + 1;
      const newRemaining = Math.max(0, emp.annualBalanceLimit - newUsed);
      const updated: Employee = { ...emp, usedBalance: newUsed, remainingBalance: newRemaining };
      await saveEmployee(updated);
      updatedEmpList = employees.map((e) => (e.id === emp.id ? updated : e));
      if (onEmployeesChanged) onEmployeesChanged(updatedEmpList);
    } else if (currentRec?.status === 'leave' && currentRec.leaveType === 'annual' && action !== 'leave') {
      const newUsed = Math.max(0, emp.usedBalance - 1);
      const newRemaining = Math.min(emp.annualBalanceLimit, emp.remainingBalance + 1);
      const updated: Employee = { ...emp, usedBalance: newUsed, remainingBalance: newRemaining };
      await saveEmployee(updated);
      updatedEmpList = employees.map((e) => (e.id === emp.id ? updated : e));
      if (onEmployeesChanged) onEmployeesChanged(updatedEmpList);
    }

    // Refresh records
    await loadRecords();
  };

  // Open Quick Customization Modal
  const openCustomizationModal = (emp: Employee) => {
    setSelectedEmployeeForQuick(emp);
    setSelectedRecordForQuick(employeeRecordsForSelectedDate.get(emp.id) || null);
    setQuickActionModalOpen(true);
  };

  // Days in month helper for Monthly Sheets
  const daysInSelectedMonth = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10) || 2026;
    const month = parseInt(monthStr, 10) || 9;
    const date = new Date(year, month, 0);
    const count = date.getDate();
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [selectedMonth]);

  // Monthly Records Map: `${empId}_${day}` -> AttendanceRecord
  const monthlyRecordsMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    records.forEach((r) => {
      if (r.date.startsWith(selectedMonth)) {
        const day = parseInt(r.date.split('-')[2], 10);
        map.set(`${r.employeeId}_${day}`, r);
      }
    });
    return map;
  }, [records, selectedMonth]);

  // Handle instant dropdown change on any day from 1 to 31
  const handleMonthlyDayChange = async (emp: Employee, day: number, value: string) => {
    const dayStr = String(day).padStart(2, '0');
    const targetDate = `${selectedMonth}-${dayStr}`;
    const currentRec = monthlyRecordsMap.get(`${emp.id}_${day}`);

    let status: AttendanceStatus = 'present';
    let leaveType: AttendanceRecord['leaveType'] = undefined;
    let timeMinutes: number | undefined = undefined;
    let movementTitle = 'حاضر (دوام رسمي)';

    if (value === 'absent') {
      status = 'absent';
      movementTitle = 'غياب غير مبرر (غ)';
    } else if (value === 'leave') {
      status = 'leave';
      leaveType = 'annual';
      movementTitle = 'إجازة اعتيادية (ج)';
    } else if (value === 'sick') {
      status = 'leave';
      leaveType = 'sick';
      movementTitle = 'إجازة مرضية (م)';
    } else if (value === 'maternity_21') {
      status = 'leave';
      leaveType = 'maternity_pre_21';
      movementTitle = 'إجازة حمل قبل الوضع (21 يوماً)';
    } else if (value === 'maternity_51') {
      status = 'leave';
      leaveType = 'maternity_post_51';
      movementTitle = 'إجازة وضع بعد الولادة (51 يوماً)';
    } else if (value === 'maternity_72') {
      status = 'leave';
      leaveType = 'maternity_full_72';
      movementTitle = 'إجازة وضع كاملة (72 يوماً = 21+51)';
    } else if (value === 'maternity_year') {
      status = 'leave';
      leaveType = 'maternity_care_year';
      movementTitle = 'إجازة أمومة ورعاية طفل (سنة)';
    } else if (value === 'mission') {
      status = 'mission';
      movementTitle = 'إيفاد رسمي وحقلي (ف)';
    } else if (value === 'time_1') {
      status = 'time_permission';
      timeMinutes = 60;
      movementTitle = 'إذن زمني 1س (ز1)';
    } else if (value === 'time_2') {
      status = 'time_permission';
      timeMinutes = 120;
      movementTitle = 'إذن زمني 2س (ز2)';
    }

    const recId = currentRec?.id || `REC-${emp.id}-${targetDate}-${Date.now().toString().slice(-4)}`;
    const newRecord: AttendanceRecord = {
      id: recId,
      employeeId: emp.id,
      employeeName: emp.fullName,
      employeeNumber: emp.employeeNumber,
      department: emp.department,
      contractType: emp.contractType,
      date: targetDate,
      status,
      leaveType,
      timePermissionMinutes: timeMinutes,
      movementTitle,
      notes: currentRec?.notes,
    };

    await saveAttendanceLogsBatch([newRecord]);

    // Update balances if switching to/from annual leave
    const wasAnnual = currentRec?.status === 'leave' && currentRec.leaveType === 'annual';
    const isNowAnnual = value === 'leave';
    let updatedEmpList = employees;

    if (isNowAnnual && !wasAnnual) {
      const newUsed = emp.usedBalance + 1;
      const newRemaining = Math.max(0, emp.annualBalanceLimit - newUsed);
      const updated: Employee = { ...emp, usedBalance: newUsed, remainingBalance: newRemaining };
      await saveEmployee(updated);
      updatedEmpList = employees.map((e) => (e.id === emp.id ? updated : e));
      if (onEmployeesChanged) onEmployeesChanged(updatedEmpList);
    } else if (wasAnnual && !isNowAnnual) {
      const newUsed = Math.max(0, emp.usedBalance - 1);
      const newRemaining = Math.min(emp.annualBalanceLimit, emp.remainingBalance + 1);
      const updated: Employee = { ...emp, usedBalance: newUsed, remainingBalance: newRemaining };
      await saveEmployee(updated);
      updatedEmpList = employees.map((e) => (e.id === emp.id ? updated : e));
      if (onEmployeesChanged) onEmployeesChanged(updatedEmpList);
    }

    await loadRecords();
  };

  // Sort field toggle handler
  const handleToggleSort = (field: SortField) => {
    if (filters.sortField === field) {
      setFilters((prev) => ({
        ...prev,
        sortDirection: prev.sortDirection === 'asc' ? 'desc' : 'asc',
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        sortField: field,
        sortDirection: 'asc',
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Toolbar (Back to Home & Boards Navigation) - no-print */}
      <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
        {/* Back to Home Button */}
        <div className="flex items-center gap-2">
          {onBackToDashboard ? (
            <button
              type="button"
              id="reports-back-home-btn"
              onClick={onBackToDashboard}
              className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-amber-500/25 transition-all cursor-pointer"
              title="الرجوع إلى لوحة التحكم الرئيسية"
            >
              <Home className="w-4 h-4" />
              <span>الرجوع للشاشة الرئيسية</span>
            </button>
          ) : (
            <button
              type="button"
              id="reports-back-home-btn-fallback"
              onClick={() => onNavigate && onNavigate('dashboard')}
              className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-amber-500/25 transition-all cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>الرجوع للشاشة الرئيسية</span>
            </button>
          )}

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block mx-1" />

          {/* Boards Quick Navigation Switcher */}
          {onNavigate && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 hidden md:inline ml-1">
                التنقل بين اللوحات:
              </span>
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="لوحة التحكم الرئيسية"
              >
                <Home className="w-3.5 h-3.5 text-amber-500" />
                <span>الرئيسية</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('employees')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="شؤون الموظفين والكوادر"
              >
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                <span>الموظفون</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('daily_movements')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="تسجيل الحركات اليومية السريعة"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>الحركات الفورية</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('calendar')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="التقويم السنوي والعطل الرسمية"
              >
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>التقويم والعطل</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('settings')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="قواعد الدوام والإعدادات"
              >
                <Sliders className="w-3.5 h-3.5 text-purple-500" />
                <span>الإعدادات</span>
              </button>
            </div>
          )}
        </div>

        {/* Current Active Location Tag */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            📊 لوحة تقارير الدوام والمواقف
          </span>
        </div>
      </div>

      {/* 1. Header Bar & Module Sub-Tabs (no-print) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                منظومة تقارير وموقف الدوام والحركات الرسمية
              </h1>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                2026
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              متابعة يومية لحظية، شيتات تفصيلية، تصدير إكسل معتمد وطباعة A4 رسمية
            </p>
          </div>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 self-start lg:self-center">
          {/* 1. Daily Movements Table */}
          <button
            type="button"
            id="subtab-daily-movements-btn"
            onClick={() => setActiveSubTab('movements')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'movements'
                ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>جدول الحركات والإجراءات المباشرة</span>
          </button>

          {/* 2. Monthly Sheets */}
          <button
            type="button"
            id="subtab-monthly-sheets-btn"
            onClick={() => setActiveSubTab('monthly')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'monthly'
                ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span>الشيتات الشهرية (MonthlySheets)</span>
          </button>

          {/* 3. Archive & Reports */}
          <button
            type="button"
            id="subtab-archive-reports-btn"
            onClick={() => setActiveSubTab('archive')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'archive'
                ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-500" />
            <span>تقارير الموقف والأرشيف</span>
          </button>

          {/* 4. Movement Report Designer & Statistical Charts */}
          <button
            type="button"
            id="subtab-movement-designer-btn"
            onClick={() => setActiveSubTab('designer')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'designer'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-violet-400" />
            <span>مخطط ومصمم الحركات (حصري 📊)</span>
          </button>
        </div>
      </div>

      {/* 2. Global Unified Advanced Search Bar (Applicable to all views) */}
      <div className="no-print">
        <AdvancedSearchBar
          idPrefix="reports-adv-search"
          filters={filters}
          onFilterChange={(updated) => {
            if (updated.selectedDate && updated.selectedDate !== selectedDate) {
              setSelectedDate(updated.selectedDate);
            }
            setFilters((prev) => ({ ...prev, ...updated }));
          }}
          onResetFilters={() =>
            setFilters({
              searchTerm: '',
              selectedContractType: 'ALL',
              selectedDepartment: 'ALL',
              selectedStatus: 'ALL',
              selectedDate,
              sortField: 'seq',
              sortDirection: 'asc',
            })
          }
          departments={departments}
          departmentCounts={departmentCounts}
          counts={searchCounts}
          statusCounts={statusCountsForSelectedDate}
          showDateFilter={true}
          selectedDate={selectedDate}
          onDateChange={(date) => {
            setSelectedDate(date);
            setFilters((prev) => ({ ...prev, selectedDate: date }));
          }}
          showSortControls={true}
          placeholder="بحث سريع بالاسم، الكود الوظيفي، التسلسل، أو العنوان الوظيفي..."
          showStatusFilter={true}
        />
      </div>

      {/* Prominent High-Visibility Alert Banner for Specific Movement Type Filter (e.g. Absent Only) */}
      {filters.selectedStatus === 'absent' && (
        <div className="p-4 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-900 shadow-xs flex flex-wrap items-center justify-between gap-3 text-rose-900 dark:text-rose-100 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-600/20">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-2">
                <span>تصفية نشطة: يتم حالياً حصر وعرض الموظفين الغائبين فقط</span>
                <span className="font-mono px-2.5 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 text-[11px] font-bold">
                  تاريخ: {selectedDate} ({getArabicDayOfWeek(selectedDate)})
                </span>
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                إجمالي الغائبين المسجلين في هذا التاريخ:{' '}
                <strong className="font-mono text-xs text-rose-900 dark:text-rose-100">
                  {statusCountsForSelectedDate.absent}
                </strong>{' '}
                موظف
                {filters.selectedDepartment !== 'ALL'
                  ? ` في تشكيل (${filters.selectedDepartment})`
                  : ' في كافة الأقسام والتشكيلات'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                triggerOfficialPrint({
                  reportScope: 'daily',
                  selectedDate,
                  selectedMonth,
                  departmentName: filters.selectedDepartment,
                })
              }
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة كشف الغائبين الرسمي A4</span>
            </button>
            <button
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, selectedStatus: 'ALL' }))}
              className="px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 text-xs font-semibold cursor-pointer transition-all"
            >
              إلغاء الفلتر وعرض الجميع
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: Daily Movements and Direct Actions Table (DailyMovementsAndReports) */}
      {/* ========================================================================= */}
      {activeSubTab === 'movements' && (
        <div className="space-y-4">
          {/* Action Toolbar for Daily Movements */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Calendar className="w-4 h-4 text-amber-500" />
                <span>تاريخ الموقف اليومي:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setFilters((prev) => ({ ...prev, selectedDate: e.target.value }));
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs font-bold text-slate-800 dark:text-slate-200"
                />
                <span className="text-amber-600 dark:text-amber-400 font-bold mr-1">
                  ({getArabicDayOfWeek(selectedDate)})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="export-excel-modal-btn"
                onClick={() => setIsExportModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تصدير Excel أو طباعة PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>تسجيل حركة موسعة</span>
              </button>
            </div>
          </div>

          {/* Daily Movements Table */}
          {/* MANDATE: Display strictly based on: Seq #, Full Name, Contract Type (No Job Title) */}
          <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    {/* Seq */}
                    <th className="p-3.5 w-14 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleSort('seq')}
                        className="inline-flex items-center gap-1 hover:text-amber-600 cursor-pointer"
                      >
                        <span>ت</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        {filters.sortField === 'seq' && (
                          <span className="text-[10px] text-amber-500 font-mono">
                            {filters.sortDirection === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </button>
                    </th>

                    {/* Employee Number */}
                    <th className="p-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggleSort('employeeNumber')}
                        className="inline-flex items-center gap-1 hover:text-amber-600 cursor-pointer"
                      >
                        <span>الرقم الوظيفي</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        {filters.sortField === 'employeeNumber' && (
                          <span className="text-[10px] text-amber-500 font-mono">
                            {filters.sortDirection === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </button>
                    </th>

                    {/* Full Name */}
                    <th className="p-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggleSort('name')}
                        className="inline-flex items-center gap-1 hover:text-amber-600 cursor-pointer"
                      >
                        <span>اسم الموظف الرباعي واللقب</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        {filters.sortField === 'name' && (
                          <span className="text-[10px] text-amber-500 font-mono">
                            {filters.sortDirection === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </button>
                    </th>

                    {/* Contract Type */}
                    <th className="p-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggleSort('contractType')}
                        className="inline-flex items-center gap-1 hover:text-amber-600 cursor-pointer"
                      >
                        <span>الصفة الوظيفية (نوع الملاك)</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        {filters.sortField === 'contractType' && (
                          <span className="text-[10px] text-amber-500 font-mono">
                            {filters.sortDirection === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </button>
                    </th>

                    {/* Department */}
                    <th className="p-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggleSort('department')}
                        className="inline-flex items-center gap-1 hover:text-amber-600 cursor-pointer"
                      >
                        <span>القسم والتشكيل</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        {filters.sortField === 'department' && (
                          <span className="text-[10px] text-amber-500 font-mono">
                            {filters.sortDirection === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </button>
                    </th>

                    {/* Status on selected date */}
                    <th className="p-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggleSort('status')}
                        className="inline-flex items-center gap-1 hover:text-amber-600 cursor-pointer"
                      >
                        <span>الموقف الحالي لليوم</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        {filters.sortField === 'status' && (
                          <span className="text-[10px] text-amber-500 font-mono">
                            {filters.sortDirection === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </button>
                    </th>

                    <th className="p-3.5 text-center no-print">الإجراءات المباشرة بنقرة واحدة</th>
                    <th className="p-3.5 text-center no-print">تخصيص إداري</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {sortedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center">
                        {filters.selectedStatus === 'absent' ? (
                          <div className="flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                              <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                              لا يوجد أي موظف مسجل كغائب في تاريخ {selectedDate}
                            </p>
                            <p className="text-xs text-slate-500">
                              جميع الكوادر حاضرون أو بإجازات وتراخيص رسمية (نسبة الانضباط 100%).
                            </p>
                            <button
                              type="button"
                              onClick={() => setFilters((prev) => ({ ...prev, selectedStatus: 'ALL' }))}
                              className="mt-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-xs font-semibold cursor-pointer"
                            >
                              عرض كافة الكوادر
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
                            <Filter className="w-8 h-8 text-slate-400" />
                            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                              لا يوجد موظفون يطابقون معايير الفلترة المحددة.
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                setFilters({
                                  searchTerm: '',
                                  selectedContractType: 'ALL',
                                  selectedDepartment: 'ALL',
                                  selectedStatus: 'ALL',
                                  selectedDate,
                                  sortField: 'seq',
                                  sortDirection: 'asc',
                                })
                              }
                              className="mt-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold cursor-pointer"
                            >
                              إعادة ضبط الفلاتر
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    sortedEmployees.map((emp, index) => {
                      const record = employeeRecordsForSelectedDate.get(emp.id);
                      const currentStatus: AttendanceStatus = record ? record.status : 'present';

                      return (
                        <tr
                          key={emp.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-700/20 transition-colors"
                        >
                          {/* Sequence Number */}
                          <td className="p-3.5 text-center font-mono font-bold text-slate-500">
                            {index + 1}
                          </td>

                          {/* Employee Number */}
                          <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                            {emp.employeeNumber}
                          </td>

                          {/* Employee Full Name */}
                          <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <span>{emp.fullName}</span>
                              {emp.remainingBalance <= 5 && (
                                <span
                                  className="w-2 h-2 rounded-full bg-rose-500"
                                  title={`رصيد الإجازات منخفض: ${emp.remainingBalance} يوم`}
                                />
                              )}
                            </div>
                          </td>

                          {/* Employment / Contract Type (No Job Title) */}
                          <td className="p-3.5">
                            {emp.contractType === 'permanent' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                ملاك دائم
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                                عقد وزاري (قرار 315)
                              </span>
                            )}
                          </td>

                          {/* Department */}
                          <td className="p-3.5 text-slate-600 dark:text-slate-300">
                            {emp.department}
                          </td>

                          {/* Current Status Badge */}
                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                                currentStatus === 'present'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                  : currentStatus === 'leave'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                  : currentStatus === 'absent'
                                  ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                                  : currentStatus === 'time_permission'
                                  ? 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                                  : 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                              }`}
                            >
                              {record?.movementTitle ||
                                (currentStatus === 'present'
                                  ? 'حاضر (دوام رسمي)'
                                  : currentStatus === 'leave'
                                  ? 'إجازة اعتيادية'
                                  : currentStatus === 'absent'
                                  ? 'غياب غير مبرر'
                                  : currentStatus === 'time_permission'
                                  ? `إذن زمنية (${(record?.timePermissionMinutes || 60) / 60} س)`
                                  : 'إيفاد')}
                            </span>
                          </td>

                          {/* 1-Click Direct Actions */}
                          <td className="p-2 text-center no-print">
                            <div className="flex items-center justify-center gap-1">
                              {/* 1. Present */}
                              <button
                                type="button"
                                onClick={() => handleQuickAction(emp, 'present')}
                                title="تثبيت كـ حاضر"
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                  currentStatus === 'present'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-950 hover:text-emerald-700'
                                }`}
                              >
                                حاضر
                              </button>

                              {/* 2. Leave */}
                              <button
                                type="button"
                                onClick={() => handleQuickAction(emp, 'leave')}
                                title="إجازة اعتيادية (تستقطع يوماً)"
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                  currentStatus === 'leave'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-950 hover:text-amber-700'
                                }`}
                              >
                                إجازة
                              </button>

                              {/* 3. Absent */}
                              <button
                                type="button"
                                onClick={() => handleQuickAction(emp, 'absent')}
                                title="تسجيل غياب غير مبرر"
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                  currentStatus === 'absent'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-100 dark:hover:bg-rose-950 hover:text-rose-700'
                                }`}
                              >
                                غياب
                              </button>

                              {/* 4. Time 1 hr */}
                              <button
                                type="button"
                                onClick={() => handleQuickAction(emp, 'time_60')}
                                title="إذن زمنية ساعة واحدة (60 دقيقة)"
                                className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                  currentStatus === 'time_permission' && record?.timePermissionMinutes === 60
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-blue-950 hover:text-blue-700'
                                }`}
                              >
                                زمنية 1س
                              </button>

                              {/* 5. Time 2 hrs */}
                              <button
                                type="button"
                                onClick={() => handleQuickAction(emp, 'time_120')}
                                title="إذن زمنية ساعتان (120 دقيقة)"
                                className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                  currentStatus === 'time_permission' && record?.timePermissionMinutes === 120
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-blue-950 hover:text-blue-700'
                                }`}
                              >
                                زمنية 2س
                              </button>
                            </div>
                          </td>

                          {/* Quick Customization Button */}
                          <td className="p-2 text-center no-print">
                            <button
                              type="button"
                              onClick={() => openCustomizationModal(emp)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-white text-slate-700 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1 mx-auto transition-colors cursor-pointer"
                              title="تعديل الموقف وإدخال رقم السند أو وقت الخروج"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-500 hover:text-white" />
                              <span>تعديل الموقف ⚡</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: Monthly Sheets View (MonthlySheets) */}
      {/* ========================================================================= */}
      {activeSubTab === 'monthly' && (
        <div className="space-y-4">
          {/* Month picker & actions */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                الشهر المستهدف للكشف:
              </span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs font-bold text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تصدير الشيت الشهري Excel</span>
              </button>
            </div>
          </div>

          {/* Monthly Matrix Grid */}
          <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="p-2.5 w-10 text-center">ت</th>
                    <th className="p-2.5 min-w-[160px]">اسم الموظف الكامل</th>
                    <th className="p-2.5 min-w-[110px] text-center">الصفة الوظيفية</th>
                    {daysInSelectedMonth.map((day) => (
                      <th
                        key={day}
                        className="p-1 text-center min-w-[36px] font-mono text-[11px] border-l border-slate-200 dark:border-slate-700"
                        title={`اليوم ${day} من الشهر`}
                      >
                        {day}
                      </th>
                    ))}
                    <th className="p-2.5 text-center min-w-[50px] text-emerald-600 font-mono">حضور</th>
                    <th className="p-2.5 text-center min-w-[50px] text-amber-600 font-mono">إجازة</th>
                    <th className="p-2.5 text-center min-w-[50px] text-rose-600 font-mono">غياب</th>
                    <th className="p-2.5 text-center min-w-[50px] text-blue-600 font-mono">زمنية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredEmployees.map((emp, idx) => {
                    let countPresent = 0;
                    let countLeave = 0;
                    let countAbsent = 0;
                    let countTime = 0;

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/20">
                        {/* 1. Sequence Number (ت) */}
                        <td className="p-2 text-center font-mono font-bold text-slate-500">
                          {idx + 1}
                        </td>

                        {/* 2. Full Name (اسم الموظف الكامل) */}
                        <td className="p-2 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {emp.fullName}
                        </td>

                        {/* 3. Job Status (الصفة الوظيفية) */}
                        <td className="p-2 text-center whitespace-nowrap">
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                              emp.contractType === 'permanent'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {emp.contractType === 'permanent' ? 'ملاك دائم' : 'عقد وزاري'}
                          </span>
                        </td>

                        {/* 1..31 Days with Interactive Dropdown Selectors */}
                        {daysInSelectedMonth.map((day) => {
                          const rec = monthlyRecordsMap.get(`${emp.id}_${day}`);
                          let currentVal = 'present';
                          let cellBg = 'bg-white dark:bg-slate-800';
                          let textClass = 'text-emerald-700 dark:text-emerald-300';

                          if (rec) {
                            if (rec.status === 'absent') {
                              currentVal = 'absent';
                              cellBg = 'bg-rose-50 dark:bg-rose-950/40';
                              textClass = 'text-rose-700 dark:text-rose-300 font-bold';
                              countAbsent++;
                            } else if (rec.status === 'leave') {
                              if (rec.leaveType === 'sick') {
                                currentVal = 'sick';
                                cellBg = 'bg-purple-50 dark:bg-purple-950/40';
                                textClass = 'text-purple-700 dark:text-purple-300 font-bold';
                              } else if (rec.leaveType === 'maternity_pre_21') {
                                currentVal = 'maternity_21';
                                cellBg = 'bg-pink-50 dark:bg-pink-950/40';
                                textClass = 'text-pink-700 dark:text-pink-300 font-bold';
                              } else if (rec.leaveType === 'maternity_post_51') {
                                currentVal = 'maternity_51';
                                cellBg = 'bg-pink-50 dark:bg-pink-950/40';
                                textClass = 'text-pink-700 dark:text-pink-300 font-bold';
                              } else if (rec.leaveType === 'maternity_full_72') {
                                currentVal = 'maternity_72';
                                cellBg = 'bg-pink-50 dark:bg-pink-950/40';
                                textClass = 'text-pink-700 dark:text-pink-300 font-bold';
                              } else if (rec.leaveType === 'maternity_care_year') {
                                currentVal = 'maternity_year';
                                cellBg = 'bg-pink-50 dark:bg-pink-950/40';
                                textClass = 'text-pink-700 dark:text-pink-300 font-bold';
                              } else {
                                currentVal = 'leave';
                                cellBg = 'bg-amber-50 dark:bg-amber-950/40';
                                textClass = 'text-amber-700 dark:text-amber-300 font-bold';
                              }
                              countLeave++;
                            } else if (rec.status === 'mission') {
                              currentVal = 'mission';
                              cellBg = 'bg-teal-50 dark:bg-teal-950/40';
                              textClass = 'text-teal-700 dark:text-teal-300 font-bold';
                              countPresent++;
                            } else if (rec.status === 'time_permission') {
                              currentVal = (rec.timePermissionMinutes || 60) === 120 ? 'time_2' : 'time_1';
                              cellBg = 'bg-blue-50 dark:bg-blue-950/40';
                              textClass = 'text-blue-700 dark:text-blue-300 font-bold';
                              countTime++;
                              countPresent++;
                            } else {
                              countPresent++;
                            }
                          } else {
                            countPresent++;
                          }

                          return (
                            <td
                              key={day}
                              className={`p-0.5 text-center border-l border-slate-100 dark:border-slate-800 ${cellBg}`}
                            >
                              <select
                                value={currentVal}
                                onChange={(e) => handleMonthlyDayChange(emp, day, e.target.value)}
                                className={`w-full py-1 text-center font-bold font-mono text-[11px] rounded bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer ${textClass}`}
                                title={`تغيير موقف اليوم ${day} للموظف (${emp.fullName})`}
                              >
                                <option value="present" className="text-slate-900 bg-white">✓</option>
                                <option value="absent" className="text-rose-700 bg-white">غ</option>
                                <option value="leave" className="text-amber-700 bg-white">ج</option>
                                <option value="sick" className="text-purple-700 bg-white">م</option>
                                <option value="maternity_21" className="text-pink-700 bg-white">ح21</option>
                                <option value="maternity_51" className="text-pink-700 bg-white">و51</option>
                                <option value="maternity_72" className="text-pink-700 bg-white">أم72</option>
                                <option value="maternity_year" className="text-pink-700 bg-white">أم365</option>
                                <option value="mission" className="text-teal-700 bg-white">ف</option>
                                <option value="time_1" className="text-blue-700 bg-white">ز1</option>
                                <option value="time_2" className="text-blue-700 bg-white">ز2</option>
                              </select>
                            </td>
                          );
                        })}

                        {/* Cumulative Columns */}
                        <td className="p-2 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {countPresent}
                        </td>
                        <td className="p-2 text-center font-mono font-bold text-amber-600 dark:text-amber-400">
                          {countLeave}
                        </td>
                        <td className="p-2 text-center font-mono font-bold text-rose-600 dark:text-rose-400">
                          {countAbsent}
                        </td>
                        <td className="p-2 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                          {countTime}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: Archive & Official Reports (ArchiveAndReports) */}
      {/* ========================================================================= */}
      {activeSubTab === 'archive' && (
        <div className="space-y-6">
          {/* Archive Controls Toolbar */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex flex-wrap items-center gap-3">
              {/* Period Selector */}
              <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setArchiveReportType('daily')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    archiveReportType === 'daily'
                      ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  تقرير يومي
                </button>
                <button
                  type="button"
                  onClick={() => setArchiveReportType('weekly')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    archiveReportType === 'weekly'
                      ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  أسبوعي (7 أيام)
                </button>
                <button
                  type="button"
                  onClick={() => setArchiveReportType('monthly')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    archiveReportType === 'monthly'
                      ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  شهري
                </button>
                <button
                  type="button"
                  onClick={() => setArchiveReportType('custom')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    archiveReportType === 'custom'
                      ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  محدد (من - إلى)
                </button>
              </div>

              {/* Date / Month / Range Picker */}
              <div className="flex items-center gap-2 text-xs">
                {archiveReportType === 'monthly' ? (
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs"
                  />
                ) : archiveReportType === 'custom' ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-500">من:</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs font-bold"
                    />
                    <span className="text-[11px] font-semibold text-slate-500">إلى:</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs font-bold"
                    />
                  </div>
                ) : (
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs"
                  />
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPrintPreview(!isPrintPreview)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span>{isPrintPreview ? 'إغلاق المعاينة' : 'معاينة الطباعة الرسمية A4'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تصدير Excel (.xlsx) / PDF</span>
              </button>
            </div>
          </div>

          {/* KPI Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium">حالات الحضور</span>
                <UserCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {archiveStats.present}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium">حالات الغياب</span>
                <UserX className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
                {archiveStats.absent}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium">الإجازات الرسمية</span>
                <Calendar className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                {archiveStats.leave}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium">الزمنيات (ساعات)</span>
                <Clock className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
                {archiveStats.timePerm}{' '}
                <span className="text-xs text-slate-400 font-normal">
                  ({archiveStats.totalTimeHours} س)
                </span>
              </div>
            </div>
          </div>

          {/* Official Printable View (A4 Paper View) */}
          <div
            id="official-print-document"
            className={`p-8 rounded-3xl bg-white text-slate-900 border-2 border-slate-300 shadow-xl space-y-6 ${
              !isPrintPreview ? 'hidden print:block' : 'block'
            }`}
          >
            {/* Iraqi Ministerial Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 text-center">
              <div className="text-right text-xs font-bold leading-relaxed">
                <div>جمهورية العراق</div>
                <div>وزارة الموارد المائية</div>
                <div>المديرية العامة لتشغيل وصيانة حوض نهر دجلة</div>
                <div>شعبة إدارة الموارد البشرية والخدمة المدنية</div>
                <div>السنة المالية 2026</div>
              </div>

              <div className="flex flex-col items-center">
                <GovernmentEmblem size={55} />
                <div className="text-xs font-bold font-mono mt-1">REPUBLIC OF IRAQ</div>
              </div>

              <div className="text-left text-xs font-bold leading-relaxed font-mono">
                <div>
                  التاريخ:{' '}
                  {archiveReportType === 'custom'
                    ? `${customStartDate} إلى ${customEndDate}`
                    : selectedDate}
                </div>
                <div>
                  اليوم:{' '}
                  {archiveReportType === 'custom'
                    ? 'فترة مخصصة'
                    : getArabicDayOfWeek(selectedDate)}
                </div>
                <div>نطاق التقرير: {archiveReportType.toUpperCase()}</div>
                <div>العدد: و/م/2026/{Math.floor(Math.random() * 800 + 100)}</div>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center">
              <h2 className="text-base font-bold underline decoration-2">
                تقرير موقف الدوام والغياب والإجازات والزمنيات الرسمية
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                الفترة:{' '}
                {archiveReportType === 'monthly'
                  ? `شهر ${selectedMonth}`
                  : archiveReportType === 'custom'
                  ? `من ${customStartDate} إلى ${customEndDate}`
                  : `${selectedDate} (${getArabicDayOfWeek(selectedDate)})`}{' '}
                — التشكيل:{' '}
                {filters.selectedDepartment === 'ALL'
                  ? 'كافة الأقسام والتشكيلات الإدارية'
                  : filters.selectedDepartment}
              </p>
            </div>

            {/* Table for print (Columns: Seq, Employee Number, Full Name, Contract Type, Department, Status, Notes) */}
            <div className="border border-slate-400 rounded-lg overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 border-b border-slate-400 text-slate-800 font-bold">
                  <tr>
                    <th className="p-2 border-l border-slate-300 w-10 text-center">ت</th>
                    <th className="p-2 border-l border-slate-300">الرقم الوظيفي</th>
                    <th className="p-2 border-l border-slate-300">الاسم الرباعي واللقب</th>
                    <th className="p-2 border-l border-slate-300">نوع الملاك والتوظيف</th>
                    <th className="p-2 border-l border-slate-300">القسم / التشكيل</th>
                    <th className="p-2 border-l border-slate-300">الموقف الإداري</th>
                    <th className="p-2">رقم السند الإداري / الملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {filteredArchiveRecords.map((r, idx) => (
                    <tr key={r.id} className="print-break-inside-avoid">
                      <td className="p-2 border-l border-slate-300 font-mono text-center font-bold">
                        {idx + 1}
                      </td>
                      <td className="p-2 border-l border-slate-300 font-mono font-bold">
                        {r.employeeNumber}
                      </td>
                      <td className="p-2 border-l border-slate-300 font-bold">
                        {r.employeeName || (r as any).fullName}
                      </td>
                      <td className="p-2 border-l border-slate-300">
                        {r.contractType === 'permanent' ? 'ملاك دائم' : 'عقد وزاري (قرار 315)'}
                      </td>
                      <td className="p-2 border-l border-slate-300">{r.department}</td>
                      <td className="p-2 border-l border-slate-300 font-bold">
                        {r.status === 'present' && <span className="text-emerald-700">حاضر (دوام رسمي)</span>}
                        {r.status === 'absent' && <span className="text-rose-700">غياب غير مبرر</span>}
                        {r.status === 'leave' && (
                          <span className="text-amber-700">
                            إجازة رسمية ({r.leaveType || 'اعتيادية'})
                          </span>
                        )}
                        {r.status === 'time_permission' && (
                          <span className="text-blue-700">
                            إذن زمنية ({(r.timePermissionMinutes || 60) / 60} س)
                          </span>
                        )}
                        {r.status === 'mission' && <span className="text-purple-700">إيفاد رسمي</span>}
                        {r.status === 'official_holiday' && (
                          <span className="text-amber-900 font-bold">
                            عطلة رسمية ({r.movementTitle || 'مجلس الوزراء'})
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-slate-600">
                        {[r.orderNumber ? `أمر: ${r.orderNumber}` : '', r.notes || ''].filter(Boolean).join(' - ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Statistical Summary Box in Print */}
            <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold grid grid-cols-4 gap-2 text-center print-break-inside-avoid">
              <div>إجمالي الكوادر: <span className="font-bold font-mono">{filteredArchiveRecords.length}</span></div>
              <div>الحضور الفعلي: <span className="font-bold font-mono text-emerald-700">{archiveStats.present}</span></div>
              <div>الغياب غير المبرر: <span className="font-bold font-mono text-rose-700">{archiveStats.absent}</span></div>
              <div>المجازين والزمنيات: <span className="font-bold font-mono text-blue-700">{archiveStats.leave + archiveStats.timePerm}</span></div>
            </div>

            {/* Triple Official Signatures */}
            <div className="grid grid-cols-3 gap-6 pt-6 text-center text-xs font-bold print-break-inside-avoid">
              <div>
                <p>منظم التقرير (مسؤول البصمة والحركات)</p>
                <div className="h-16 flex items-end justify-center text-slate-400 font-normal">
                  (التوقيع والختم)
                </div>
              </div>
              <div>
                <p>مسؤول شعبة إدارة الموارد البشرية</p>
                <div className="h-16 flex items-end justify-center text-slate-400 font-normal">
                  (التوقيع والختم)
                </div>
              </div>
              <div>
                <p>مصادقة السيد مدير الدائرة</p>
                <div className="h-16 flex items-end justify-center text-slate-400 font-normal">
                  (التوقيع والختم)
                </div>
              </div>
            </div>

            {/* Developer and System Attribution Footer */}
            <div className="pt-6 border-t border-slate-300 text-center text-[10px] text-slate-500 font-mono print-break-inside-avoid">
              {OFFICIAL_DESIGNER_CREDIT}
            </div>

            {/* Print Trigger Button */}
            <div className="flex justify-end pt-2 no-print">
              <button
                type="button"
                onClick={() =>
                  triggerOfficialPrint({
                    reportScope: archiveReportType,
                    selectedDate,
                    selectedMonth,
                    startDate: customStartDate,
                    endDate: customEndDate,
                    departmentName: filters.selectedDepartment,
                  })
                }
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-2 hover:bg-slate-800 shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>إرسال إلى الطابعة وحفظ A4 PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: Exclusive Movement Report Designer & Statistical Charts */}
      {/* ========================================================================= */}
      {activeSubTab === 'designer' && (
        <MovementReportDesigner
          employees={employees}
          currentUser={currentUser}
          onBackToDashboard={onBackToDashboard}
          onNavigate={onNavigate}
        />
      )}

      {/* Quick Customization Modal */}
      <QuickMovementActionModal
        isOpen={quickActionModalOpen}
        onClose={() => setQuickActionModalOpen(false)}
        employee={selectedEmployeeForQuick}
        currentRecord={selectedRecordForQuick}
        targetDate={selectedDate}
        currentUser={currentUser}
        onSuccess={async (updatedRec, updatedEmp) => {
          await loadRecords();
          if (updatedEmp && onEmployeesChanged) {
            onEmployeesChanged(
              employees.map((e) => (e.id === updatedEmp.id ? updatedEmp : e))
            );
          }
        }}
      />

      {/* Export Options Modal (Excel .xlsx & PDF) */}
      <ReportExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        records={filteredArchiveRecords}
        reportScope={activeSubTab === 'monthly' ? 'monthly' : archiveReportType}
        selectedDate={selectedDate}
        selectedMonth={selectedMonth}
        startDate={customStartDate}
        endDate={customEndDate}
        departmentName={filters.selectedDepartment === 'ALL' ? 'كافة التشكيلات' : filters.selectedDepartment}
        stats={archiveStats}
      />

      {/* Detailed Log Modal */}
      <AddMovementModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        employees={employees}
        defaultEmployeeId={employees[0]?.id || ''}
        currentUser={currentUser}
        onRecordSaved={(newRec, updatedEmp) => {
          loadRecords();
          if (updatedEmp && onEmployeesChanged) {
            onEmployeesChanged(
              employees.map((e) => (e.id === updatedEmp.id ? updatedEmp : e))
            );
          }
        }}
      />
    </div>
  );
}
