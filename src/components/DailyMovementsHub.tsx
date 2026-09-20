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

interface DailyMovementsHubProps {
  employees: Employee[];
  leaveRules: LeaveRulesSettings;
  organization?: OrganizationSettings;
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
  onEmployeesChanged,
  onBackToDashboard,
  onNavigate,
}: DailyMovementsHubProps) {
  // Navigation sub-tab: 'registration' (تسجيل الحركات الفورية) or 'reports' (محرك التقارير المتقدم)
  const [activeTab, setActiveTab] = useState<'registration' | 'reports'>('registration');

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
  }, [employees]);

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

    await loadRecords();
    showFeedback(`تم تثبيت [${movementTitle}] للموظف (${emp.fullName}) بنجاح.`);
  };

  // Delete movement and restore to present
  const handleDeleteMovement = async (emp: Employee) => {
    const existingRec = currentDayRecordsMap.get(emp.id);
    if (!existingRec) return;

    if (confirm(`هل أنت متأكد من إلغاء الحركة المسجلة للموظف (${emp.fullName}) وإعادته كـ حاضر؟`)) {
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

      await loadRecords();
      showFeedback(`تم إلغاء الحركة للموظف (${emp.fullName}) وإعادته كـ حاضر.`);
    }
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
    await loadRecords();
    setEditingRecord(null);
    showFeedback('تم حفظ تفاصيل وتعديلات الحركة بنجاح.');
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
                  ملاك دائم
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
                  عقد وزاري (315)
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
                    filteredEmployeesForDay.map((emp, index) => {
                      const record = currentDayRecordsMap.get(emp.id);
                      const currentStatus = record ? record.status : 'present';

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
                            {index + 1}
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

                          {/* 3. Job Status / Contract (الصفة الوظيفية: ملاك دائم أو عقد وزاري) */}
                          <td className="p-3.5 text-center">
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: ADVANCED REPORTS ENGINE (DAILY / WEEKLY / MONTHLY / CUSTOM)    */}
      {/* ========================================================================= */}
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
                          {rec.contractType === 'permanent' ? (
                            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                              ملاك دائم
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300">
                              عقد وزاري (315)
                            </span>
                          )}
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
      />
    </div>
  );
}
