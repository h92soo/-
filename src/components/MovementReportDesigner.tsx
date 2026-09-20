import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  FileSpreadsheet,
  Printer,
  Edit3,
  CheckCircle2,
  Filter,
  Users,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Download,
  Search,
  CheckSquare,
  Square,
  Home,
  Zap,
  Clock,
  Briefcase,
  AlertCircle,
  FileText,
  Building2,
  ShieldCheck,
  PlusCircle,
  Trash2,
  Eye,
  Sliders,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import * as XLSX from 'xlsx';
import {
  Employee,
  AttendanceRecord,
  AttendanceStatus,
  MovementCategory,
  OrganizationSettings,
  UserAccount,
  WorkspaceTab,
} from '../types';
import { getAttendanceLogs } from '../db/indexedDB';
import { GovernmentEmblem } from './GovernmentEmblem';
import { getArabicDayOfWeek } from '../utils/reportExportUtils';

interface MovementReportDesignerProps {
  employees: Employee[];
  organization?: OrganizationSettings;
  currentUser?: UserAccount | null;
  onBackToDashboard?: () => void;
  onNavigate?: (tab: WorkspaceTab) => void;
}

// Preset Movement Types
export type MovementFilterKey =
  | 'ALL'
  | 'absent'
  | 'leave_annual'
  | 'leave_sick'
  | 'leave_maternity'
  | 'leave_special'
  | 'time_permission'
  | 'mission'
  | 'present'
  | 'duty';

interface SignatoryConfig {
  roleTitle: string;
  name: string;
}

interface CustomReportRow {
  id: string;
  employeeId?: string;
  seq: number;
  employeeNumber: string;
  fullName: string;
  department: string;
  jobTitle: string;
  contractType: string;
  movementTypeLabel: string;
  dateStr: string;
  durationLabel: string;
  orderNumber: string;
  notes: string;
  isCustomManual?: boolean;
}

export const MovementReportDesigner: React.FC<MovementReportDesignerProps> = ({
  employees,
  organization,
  currentUser,
  onBackToDashboard,
  onNavigate,
}) => {
  // 1. Data State
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 2. Selection & Filter State
  const [selectedMovementType, setSelectedMovementType] = useState<MovementFilterKey>('ALL');
  const [dateScope, setDateScope] = useState<'today' | 'custom_range' | 'month' | 'year' | 'all'>('custom_range');
  const [selectedDate, setSelectedDate] = useState('2026-09-15');
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState('2026-09-30');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [contractFilter, setContractFilter] = useState('ALL');
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');

  // Selected Employee IDs for inclusion in report (Set of employee IDs)
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());

  // 3. UI Mode State
  const [activeViewMode, setActiveViewMode] = useState<'analytics' | 'paper_preview' | 'manual_edit'>('analytics');
  const [includeChartInPrint, setIncludeChartInPrint] = useState(true);
  const [chartType, setChartType] = useState<'bar_dept' | 'pie_types' | 'timeline' | 'top_emp'>('bar_dept');

  // 4. Manual Paper Customization State
  const [paperSettings, setPaperSettings] = useState({
    ministryName: organization?.ministryName || 'وزارة التعليم العالي والبحث العلمي',
    directorateName: organization?.directorateName || 'دائرة الشؤون الإدارية والمالية',
    departmentName: organization?.departmentName || 'قسم إدارة الموارد البشرية - شعبة الأفراد والملاك',
    referenceNumber: 'و/م/2026/1429',
    documentDateHijri: '1448 هـ',
    documentDateMiladi: new Date().toLocaleDateString('ar-IQ'),
    reportTitle: 'موقف وحركات دوام الكوادر المعتمد',
    preamble:
      'إلى / السيد المدير العام المحترم ... نرفق طياً الموقف التفصيلي لحركات الموظفين المرفقة أسماؤهم وتفاصيل أوامرهم الإدارية للتفضل بالاطلاع والمصادقة...',
    concludingNotes:
      'ملاحظة: تم تدقيق وتثبيت البيانات أعلاه وفق السجلات الإلكترونية لقاعدة بيانات الدوام المعتمدة لعام 2026.',
    showPreamble: true,
    showEmblem: true,
    showSignatures: true,
    showStatsBox: true,
  });

  // Signatories
  const [signatories, setSignatories] = useState<SignatoryConfig[]>([
    { roleTitle: 'منظم الموقف', name: currentUser?.fullName || 'أحمد جاسم الشمري' },
    { roleTitle: 'مسؤول وحدة الدوام والغيابات', name: 'كرار حيدر الموسوي' },
    { roleTitle: 'مدير قسم إدارة الموارد البشرية', name: 'د. زينب التميمي' },
    { roleTitle: 'المصادقة / معاون المدير العام', name: 'أ. د. عبد الرحمن العبيدي' },
  ]);

  // Column Visibility Toggles
  const [visibleColumns, setVisibleColumns] = useState({
    seq: true,
    employeeNumber: true,
    fullName: true,
    department: true,
    jobTitle: true,
    movementType: true,
    date: true,
    duration: true,
    orderNumber: true,
    notes: true,
  });

  // Custom rows added manually or modified notes map
  const [manualRows, setManualRows] = useState<CustomReportRow[]>([]);
  const [excludedRecordIds, setExcludedRecordIds] = useState<Set<string>>(new Set());
  const [editedNotesMap, setEditedNotesMap] = useState<Record<string, string>>({});

  // 5. Load Records from IndexedDB
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const logs = await getAttendanceLogs();
      setRecords(logs);
    } catch (e) {
      console.error('Failed to load logs in designer', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filtered records matching date scope, movement type, department, contract
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Date Scope
      if (dateScope === 'today') {
        if (rec.date !== selectedDate) return false;
      } else if (dateScope === 'custom_range') {
        if (rec.date < startDate || rec.date > endDate) return false;
      } else if (dateScope === 'month') {
        if (!rec.date.startsWith(selectedMonth)) return false;
      } else if (dateScope === 'year') {
        if (!rec.date.startsWith(`${selectedYear}-`)) return false;
      }

      // Department
      if (departmentFilter !== 'ALL' && rec.department !== departmentFilter) {
        return false;
      }

      // Contract Type
      if (contractFilter !== 'ALL' && rec.contractType !== contractFilter) {
        return false;
      }

      // Movement Type
      if (selectedMovementType !== 'ALL') {
        if (selectedMovementType === 'absent' && rec.status !== 'absent') return false;
        if (selectedMovementType === 'leave_annual' && !(rec.status === 'leave' && rec.leaveType === 'annual')) return false;
        if (selectedMovementType === 'leave_sick' && !(rec.status === 'leave' && rec.leaveType === 'sick')) return false;
        if (
          selectedMovementType === 'leave_maternity' &&
          !(
            rec.status === 'leave' &&
            (rec.leaveType?.startsWith('maternity') ||
              rec.movementType?.includes('maternity') ||
              (rec.movementTitle &&
                (rec.movementTitle.includes('حمل') ||
                  rec.movementTitle.includes('وضع') ||
                  rec.movementTitle.includes('أمومة') ||
                  rec.movementTitle.includes('ولادة'))))
          )
        ) {
          return false;
        }
        if (
          selectedMovementType === 'leave_special' &&
          !(
            rec.status === 'leave' &&
            rec.leaveType !== 'annual' &&
            rec.leaveType !== 'sick' &&
            !rec.leaveType?.startsWith('maternity')
          )
        ) {
          return false;
        }
        if (selectedMovementType === 'time_permission' && rec.status !== 'time_permission') return false;
        if (selectedMovementType === 'mission' && rec.status !== 'mission') return false;
        if (selectedMovementType === 'present' && rec.status !== 'present') return false;
        if (selectedMovementType === 'duty' && rec.status !== 'duty') return false;
      }

      return true;
    });
  }, [records, dateScope, selectedDate, startDate, endDate, selectedMonth, selectedYear, departmentFilter, contractFilter, selectedMovementType]);

  // Distinct employees who performed the filtered movements
  const movementEmployees = useMemo(() => {
    const map = new Map<string, { employee: Employee; count: number; totalMinutes: number; totalDays: number }>();

    filteredRecords.forEach((rec) => {
      const emp = employees.find((e) => e.id === rec.employeeId) || {
        id: rec.employeeId,
        fullName: rec.employeeName,
        employeeNumber: rec.employeeNumber,
        department: rec.department,
        contractType: rec.contractType,
        jobTitle: 'موظف',
        annualBalanceLimit: 36,
        usedBalance: 0,
        remainingBalance: 36,
        monthlyRate: 3,
        isAccumulative: true,
        hireDate: '2020-01-01',
        createdAt: '',
        updatedAt: '',
      };

      const existing = map.get(emp.id) || { employee: emp, count: 0, totalMinutes: 0, totalDays: 0 };
      existing.count += 1;
      existing.totalMinutes += rec.timePermissionMinutes || 0;
      existing.totalDays += rec.durationDays || 1;
      map.set(emp.id, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [filteredRecords, employees]);

  // Sync selectedEmployeeIds when filteredRecords changes: default select all
  useEffect(() => {
    const allIds = new Set(movementEmployees.map((m) => m.employee.id));
    setSelectedEmployeeIds(allIds);
  }, [movementEmployees]);

  // Toggle individual employee selection
  const handleToggleEmployee = (id: string) => {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllEmployees = () => {
    setSelectedEmployeeIds(new Set(movementEmployees.map((m) => m.employee.id)));
  };

  const handleDeselectAllEmployees = () => {
    setSelectedEmployeeIds(new Set());
  };

  // Records selected for the final Report/Sheet (filtered by selectedEmployeeIds)
  const reportRecords = useMemo(() => {
    return filteredRecords.filter((rec) => {
      if (!selectedEmployeeIds.has(rec.employeeId)) return false;
      if (excludedRecordIds.has(rec.id)) return false;
      return true;
    });
  }, [filteredRecords, selectedEmployeeIds, excludedRecordIds]);

  // Format Movement Label Helper
  const getMovementLabel = (rec: AttendanceRecord): string => {
    if (rec.movementTitle) return rec.movementTitle;
    if (rec.status === 'absent') return 'غياب بدون إذن (غ)';
    if (rec.status === 'leave') {
      if (rec.leaveType === 'sick') return 'إجازة مرضية (م)';
      if (rec.leaveType === 'annual') return 'إجازة اعتيادية (ج)';
      if (rec.leaveType === 'maternity_pre_21') return 'إجازة حمل قبل الوضع (21 يوماً - براتب تام)';
      if (rec.leaveType === 'maternity_post_51') return 'إجازة وضع بعد الولادة (51 يوماً - براتب تام)';
      if (rec.leaveType === 'maternity_full_72') return 'إجازة ولادة تامة (72 يوماً = 21+51)';
      if (rec.leaveType === 'maternity_care_year') return 'إجازة أمومة ورعاية طفل (سنة)';
      if (rec.leaveType === 'maternity') return 'إجازة أمومة وولادة (أم)';
      if (rec.leaveType === 'hajj') return 'إجازة حج (حج)';
      return 'إجازة رسمية';
    }
    if (rec.status === 'time_permission') {
      const hrs = (rec.timePermissionMinutes || 60) / 60;
      return `إذن زمني ${hrs} ساعة (ز)`;
    }
    if (rec.status === 'mission') return 'إيفاد رسمي ومهمة حقلية (ف)';
    if (rec.status === 'duty') return 'خفارة / تكليف رسمي';
    return 'حاضر (دوام)';
  };

  // Convert reportRecords to unified CustomReportRows + manualRows
  const tableRows = useMemo<CustomReportRow[]>(() => {
    const list: CustomReportRow[] = reportRecords.map((rec, idx) => {
      const emp = employees.find((e) => e.id === rec.employeeId);
      const note = editedNotesMap[rec.id] !== undefined ? editedNotesMap[rec.id] : rec.notes || '—';
      const durationStr =
        rec.status === 'time_permission'
          ? `${Math.round((rec.timePermissionMinutes || 60) / 60)} ساعة`
          : rec.durationDays
          ? `${rec.durationDays} يوم`
          : 'يوم واحد';

      return {
        id: rec.id,
        employeeId: rec.employeeId,
        seq: idx + 1,
        employeeNumber: rec.employeeNumber || emp?.employeeNumber || '—',
        fullName: rec.employeeName || emp?.fullName || '—',
        department: rec.department || emp?.department || '—',
        jobTitle: emp?.jobTitle || 'موظف',
        contractType: rec.contractType === 'permanent' ? 'ملاك دائم' : 'عقد وزاري',
        movementTypeLabel: getMovementLabel(rec),
        dateStr: rec.date,
        durationLabel: durationStr,
        orderNumber: rec.orderNumber || '—',
        notes: note,
        isCustomManual: false,
      };
    });

    // Add manual custom rows
    manualRows.forEach((mr, mIdx) => {
      list.push({
        ...mr,
        seq: list.length + 1,
      });
    });

    return list;
  }, [reportRecords, employees, editedNotesMap, manualRows]);

  // Statistics for Charts & Overview
  const analyticsStats = useMemo(() => {
    const totalCount = reportRecords.length;
    let absent = 0;
    let annualLeave = 0;
    let sickLeave = 0;
    let specialLeave = 0;
    let timePerm = 0;
    let mission = 0;
    let present = 0;
    let duty = 0;
    let totalTimeMinutes = 0;

    // By Department
    const deptMap: Record<string, number> = {};

    // By Date (Timeline)
    const dateMap: Record<string, number> = {};

    reportRecords.forEach((r) => {
      if (r.status === 'absent') absent++;
      else if (r.status === 'leave') {
        if (r.leaveType === 'annual') annualLeave++;
        else if (r.leaveType === 'sick') sickLeave++;
        else specialLeave++;
      } else if (r.status === 'time_permission') {
        timePerm++;
        totalTimeMinutes += r.timePermissionMinutes || 60;
      } else if (r.status === 'mission') mission++;
      else if (r.status === 'duty') duty++;
      else present++;

      deptMap[r.department] = (deptMap[r.department] || 0) + 1;
      dateMap[r.date] = (dateMap[r.date] || 0) + 1;
    });

    // Department Chart Data
    const deptChartData = Object.entries(deptMap)
      .map(([name, count]) => ({
        name: name.replace('قسم ', '').replace('شعبة ', ''),
        fullName: name,
        حركات: count,
      }))
      .sort((a, b) => b.حركات - a.حركات);

    // Types Chart Data
    const typesChartData = [
      { name: 'غياب (غ)', value: absent, color: '#ef4444' },
      { name: 'إجازة اعتيادية (ج)', value: annualLeave, color: '#f59e0b' },
      { name: 'إجازة مرضية (م)', value: sickLeave, color: '#ec4899' },
      { name: 'إجازات خاصة', value: specialLeave, color: '#a855f7' },
      { name: 'زمنيات (ز)', value: timePerm, color: '#6366f1' },
      { name: 'إيفاد رسمي (ف)', value: mission, color: '#3b82f6' },
      { name: 'حضور رسمي', value: present, color: '#10b981' },
      { name: 'خفارات وتكليف', value: duty, color: '#14b8a6' },
    ].filter((item) => item.value > 0);

    // Timeline Chart Data
    const timelineData = Object.entries(dateMap)
      .map(([date, count]) => ({
        date: date.slice(5),
        fullDate: date,
        حركات: count,
      }))
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate));

    // Top Employees Chart Data
    const topEmployeesData = movementEmployees
      .slice(0, 7)
      .map((m) => ({
        name: m.employee.fullName.split(' ').slice(0, 2).join(' '),
        fullName: m.employee.fullName,
        حركات: m.count,
      }));

    return {
      totalCount,
      absent,
      annualLeave,
      sickLeave,
      specialLeave,
      timePerm,
      mission,
      present,
      duty,
      totalHours: Math.round(totalTimeMinutes / 60),
      employeesImpactedCount: selectedEmployeeIds.size,
      deptChartData,
      typesChartData,
      timelineData,
      topEmployeesData,
    };
  }, [reportRecords, movementEmployees, selectedEmployeeIds]);

  // Handle Export to Excel
  const handleExportToExcel = () => {
    const wb = XLSX.utils.book_new();

    const headers = [
      ['جمهورية العراق'],
      [paperSettings.ministryName],
      [paperSettings.directorateName],
      [paperSettings.departmentName],
      [`العدد: ${paperSettings.referenceNumber}`, '', '', `التاريخ: ${paperSettings.documentDateMiladi}`],
      [''],
      [paperSettings.reportTitle],
      [`النطاق الزمني: ${dateScope === 'custom_range' ? `من ${startDate} إلى ${endDate}` : selectedDate}`],
      [''],
    ];

    const tableHeader = [
      'ت',
      'الرقم الوظيفي',
      'اسم الموظف الرباعي',
      'القسم / التشكيل',
      'العنوان الوظيفي',
      'نوع الحركة المعتمدة',
      'التاريخ',
      'المدة / الساعات',
      'رقم الأمر الإداري',
      'الملاحظات الرسمية',
    ];

    const dataRows = tableRows.map((r, i) => [
      i + 1,
      r.employeeNumber,
      r.fullName,
      r.department,
      r.jobTitle,
      r.movementTypeLabel,
      r.dateStr,
      r.durationLabel,
      r.orderNumber,
      r.notes,
    ]);

    const statsRows = [
      [''],
      ['إحصائيات الموقف:'],
      ['إجمالي الحركات', analyticsStats.totalCount],
      ['عدد الموظفين المنفذين', analyticsStats.employeesImpactedCount],
      ['الغيابات', analyticsStats.absent],
      ['الإجازات الاعتيادية', analyticsStats.annualLeave],
      ['الإجازات المرضية', analyticsStats.sickLeave],
      ['الزمنيات الساعية', analyticsStats.timePerm],
      ['ساعات الزمنيات', `${analyticsStats.totalHours} ساعة`],
      ['الإيفادات الرسمية', analyticsStats.mission],
      [''],
      ['التواقيع والاعتماد:'],
      signatories.map((s) => `${s.roleTitle}: ${s.name}`),
    ];

    const ws = XLSX.utils.aoa_to_sheet([...headers, tableHeader, ...dataRows, ...statsRows]);

    // Right-to-left flag for Arabic Excel
    ws['!views'] = [{ rightToLeft: true }];

    XLSX.utils.book_append_sheet(wb, ws, 'تقرير_الحركات_المخصص');
    const filename = `تقرير_${paperSettings.reportTitle.replace(/\s+/g, '_')}_${startDate}_${endDate}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Handle Print Action
  const handlePrint = () => {
    window.print();
  };

  // Add Manual Row to Table
  const handleAddManualRow = () => {
    const newRow: CustomReportRow = {
      id: `MANUAL-${Date.now()}`,
      seq: tableRows.length + 1,
      employeeNumber: 'IQ-MANUAL',
      fullName: 'اسم موظف يدوي (انقر للتعديل)',
      department: departmentFilter !== 'ALL' ? departmentFilter : 'قسم الشؤون الإدارية',
      jobTitle: 'عنوان وظيفي',
      contractType: 'ملاك دائم',
      movementTypeLabel: selectedMovementType !== 'ALL' ? selectedMovementType : 'إجازة اعتيادية (ج)',
      dateStr: selectedDate,
      durationLabel: 'يوم واحد',
      orderNumber: 'أمر إداري يدوي',
      notes: 'تمت الإضافة والتعديل يدوياً',
      isCustomManual: true,
    };
    setManualRows((prev) => [...prev, newRow]);
  };

  return (
    <div className="space-y-6">
      {/* 0. Top Navigation & Header Bar */}
      <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2">
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="px-3.5 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all border border-amber-200 dark:border-amber-800 cursor-pointer shadow-2xs"
              title="الرجوع للشاشة الرئيسية"
            >
              <Home className="w-4 h-4" />
              <span>الرئيسية</span>
            </button>
          )}

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

          {onNavigate && (
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => onNavigate('daily_movements')}
                className="px-2.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-semibold cursor-pointer flex items-center gap-1"
              >
                <Zap className="w-3 h-3 text-indigo-500" />
                <span>الحركات الفورية</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('reports')}
                className="px-2.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-semibold cursor-pointer flex items-center gap-1"
              >
                <FileText className="w-3 h-3 text-emerald-500" />
                <span>تقارير الدوام</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('employees')}
                className="px-2.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-semibold cursor-pointer flex items-center gap-1"
              >
                <Users className="w-3 h-3 text-amber-500" />
                <span>الموظفون</span>
              </button>
            </div>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs self-start sm:self-center">
          <button
            type="button"
            onClick={() => setActiveViewMode('analytics')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeViewMode === 'analytics'
                ? 'bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-violet-500" />
            <span>المخططات والتحليلات</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveViewMode('paper_preview')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeViewMode === 'paper_preview'
                ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Eye className="w-4 h-4 text-emerald-500" />
            <span>معاينة الورقة الرسمية A4</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveViewMode('manual_edit')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeViewMode === 'manual_edit'
                ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-4 h-4 text-blue-500" />
            <span>تعديل الورقة يدوياً</span>
          </button>
        </div>
      </div>

      {/* 1. Header Banner & Title */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight">
                المخطط البياني ومصمم تقارير الحركات الحصري
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950">
                حصري وإحصائي 📊
              </span>
            </div>
            <p className="text-xs text-white/80 mt-1 max-w-2xl leading-relaxed">
              تحديد نوع الحركة والموظفين المنفذين لها، استعراض المخططات البيانية الإحصائية التفاعلية، وتصميم وتعديل الورقة الرسمية يدوياً مع إمكانية التصدير والطباعة A4 المعتمدة.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            type="button"
            onClick={handleExportToExcel}
            className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-2 transition-all border border-white/20 cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>تصدير Excel (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4 text-emerald-600" />
            <span>طباعة الورقة A4</span>
          </button>
        </div>
      </div>

      {/* 2. Primary Filter & Movement Selector Hub */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 no-print">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-violet-500" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              اختيار وتخصيص نوع الحركة والنطاق الزمني
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 px-2.5 py-1 rounded-xl border border-violet-200 dark:border-violet-800">
            {tableRows.length} حركة مطابقة في التقرير
          </span>
        </div>

        {/* Movement Type Badges */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            نوع الحركة المطلوبة للتقرير والمخطط:
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ALL' as MovementFilterKey, label: 'كافة الحركات', color: 'slate' },
              { id: 'absent' as MovementFilterKey, label: 'الغياب (غ)', color: 'red' },
              { id: 'leave_annual' as MovementFilterKey, label: 'إجازة اعتيادية (ج)', color: 'amber' },
              { id: 'leave_sick' as MovementFilterKey, label: 'إجازة مرضية (م)', color: 'pink' },
              { id: 'leave_maternity' as MovementFilterKey, label: 'إجازات الحامل والوضع والأمومة (21 / 51 / 72 / 365 يوم)', color: 'rose' },
              { id: 'leave_special' as MovementFilterKey, label: 'إجازات خاصة (حج/وفاة/أخرى)', color: 'purple' },
              { id: 'time_permission' as MovementFilterKey, label: 'الزمنيات الساعية (ز)', color: 'indigo' },
              { id: 'mission' as MovementFilterKey, label: 'الإيفادات والمهام الرسمية (ف)', color: 'blue' },
              { id: 'present' as MovementFilterKey, label: 'الحضور الرسمي', color: 'emerald' },
              { id: 'duty' as MovementFilterKey, label: 'الخفارات والتفرغ', color: 'teal' },
            ].map((t) => {
              const active = selectedMovementType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedMovementType(t.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    active
                      ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-violet-300'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Scope Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Scope Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              النطاق الزمني:
            </label>
            <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs">
              {[
                { id: 'today' as const, label: 'يوم' },
                { id: 'custom_range' as const, label: 'محدد' },
                { id: 'month' as const, label: 'شهري' },
                { id: 'year' as const, label: 'سنوي' },
                { id: 'all' as const, label: 'الكل' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setDateScope(s.id)}
                  className={`py-1 rounded-lg font-bold text-center cursor-pointer transition-all ${
                    dateScope === s.id
                      ? 'bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Picker depending on scope */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              {dateScope === 'year' ? 'السنة المطلوبة (مفتوحة لكافة السنوات):' : 'التاريخ المحدد:'}
            </label>
            {dateScope === 'today' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs font-bold text-slate-800 dark:text-slate-200"
              />
            )}
            {dateScope === 'month' && (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs font-bold text-slate-800 dark:text-slate-200"
              />
            )}
            {dateScope === 'year' && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedYear((y) => y - 1)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                  title="السنة السابقة"
                >
                  -1
                </button>
                <input
                  type="number"
                  min="1980"
                  max="2100"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10) || 2026)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs font-black text-center text-slate-800 dark:text-slate-200"
                  placeholder="أدخل أي سنة مثلاً 2025 أو 2026 أو 2027"
                />
                <button
                  type="button"
                  onClick={() => setSelectedYear((y) => y + 1)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                  title="السنة التالية"
                >
                  +1
                </button>
              </div>
            )}
            {dateScope === 'custom_range' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-1/2 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs font-bold text-slate-800 dark:text-slate-200"
                  title="من تاريخ"
                />
                <span className="text-xs text-slate-400">إلى</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-1/2 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs font-bold text-slate-800 dark:text-slate-200"
                  title="إلى تاريخ"
                />
              </div>
            )}
            {dateScope === 'all' && (
              <div className="py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 font-semibold">
                كامل الأرشيف المتاح لكافة السنوات
              </div>
            )}
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              التشكيل / القسم:
            </label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">كافة التشكيلات والأقسام</option>
              {Array.from(new Set(employees.map((e) => e.department)))
                .sort()
                .map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* 2.1 Interactive Employee Selector for the Chosen Movement ("الموظفين الذين قاموا بها") */}
        <div className="p-4 rounded-2xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                الموظفون الذين قاموا بهذه الحركة ({movementEmployees.length} موظف):
              </span>
              <span className="text-[11px] font-mono font-bold text-violet-700 dark:text-violet-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-violet-200 dark:border-violet-800">
                تم تحديد {selectedEmployeeIds.size} من أصل {movementEmployees.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllEmployees}
                className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-300 text-[11px] font-bold border border-violet-200 dark:border-violet-800 hover:bg-violet-100 cursor-pointer shadow-2xs"
              >
                تحديد الكل
              </button>
              <button
                type="button"
                onClick={handleDeselectAllEmployees}
                className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs"
              >
                إلغاء التحديد
              </button>
            </div>
          </div>

          {/* Quick Search within Movement Employees */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="البحث بالاسم أو الرقم الوظيفي لتصفية الموظفين..."
              value={employeeSearchTerm}
              onChange={(e) => setEmployeeSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-1.5 rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Employee Chips Grid */}
          <div className="max-h-44 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
            {movementEmployees.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-500">
                لا توجد حركات مسجلة مطابقة للمعايير المحددة أعلاه.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {movementEmployees
                  .filter((m) =>
                    employeeSearchTerm
                      ? m.employee.fullName.includes(employeeSearchTerm) ||
                        m.employee.employeeNumber.includes(employeeSearchTerm)
                      : true
                  )
                  .map((m) => {
                    const isSelected = selectedEmployeeIds.has(m.employee.id);
                    return (
                      <div
                        key={m.employee.id}
                        onClick={() => handleToggleEmployee(m.employee.id)}
                        className={`p-2 rounded-xl border text-xs cursor-pointer flex items-center justify-between gap-2 transition-all select-none ${
                          isSelected
                            ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                            : 'bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-violet-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-white shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <div className="truncate">
                            <div className="font-bold truncate">{m.employee.fullName}</div>
                            <div
                              className={`text-[10px] truncate ${
                                isSelected ? 'text-violet-100' : 'text-slate-400'
                              }`}
                            >
                              {m.employee.department}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {m.count} حركة
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. VIEW 1: EXCLUSIVE STATISTICAL CHARTS & ANALYTICS ("مخطط بياني حصري وإحصائي") */}
      {activeViewMode === 'analytics' && (
        <motion.div
          key="analytics-view"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6 no-print"
        >
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">إجمالي الحركات</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {analyticsStats.totalCount}
              </div>
              <span className="text-[10px] text-slate-400">مسجلة في النطاق</span>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">الموظفون المنفذون</span>
              <div className="text-2xl font-black text-violet-600 dark:text-violet-400 mt-1">
                {analyticsStats.employeesImpactedCount}
              </div>
              <span className="text-[10px] text-slate-400">موظف محدد بالتقرير</span>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">غياب (غ)</span>
              <div className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">
                {analyticsStats.absent}
              </div>
              <span className="text-[10px] text-slate-400">حالة انقطاع</span>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">إجازات اعتيادية (ج)</span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {analyticsStats.annualLeave}
              </div>
              <span className="text-[10px] text-slate-400">مخصومة من الرصيد</span>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">زمنيات ساعية (ز)</span>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {analyticsStats.timePerm}
              </div>
              <span className="text-[10px] text-indigo-500 font-bold">{analyticsStats.totalHours} ساعة إجمالاً</span>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">إيفادات رسمية (ف)</span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {analyticsStats.mission}
              </div>
              <span className="text-[10px] text-slate-400">مهام حقلية ورسمية</span>
            </div>
          </div>

          {/* Chart Controls & Interactive Visuals */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-violet-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  المخطط الإحصائي التفاعلي لحركات الموظفين
                </h3>
              </div>

              {/* Chart Switcher Buttons */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs">
                <button
                  type="button"
                  onClick={() => setChartType('bar_dept')}
                  className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-all ${
                    chartType === 'bar_dept'
                      ? 'bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  حسب الأقسام
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('pie_types')}
                  className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-all ${
                    chartType === 'pie_types'
                      ? 'bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  النسب المئوية
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('timeline')}
                  className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-all ${
                    chartType === 'timeline'
                      ? 'bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  المسار الزمني
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('top_emp')}
                  className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-all ${
                    chartType === 'top_emp'
                      ? 'bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  أعلى الموظفين
                </button>
              </div>
            </div>

            {/* Render Active Chart */}
            <div className="h-80 w-full pt-4">
              {tableRows.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 font-bold">
                  لا توجد بيانات كافية لرسم المخطط البياني في هذه الفترة المحددة.
                </div>
              ) : chartType === 'bar_dept' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsStats.deptChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any) => [`${val} حركة`, 'العدد']}
                      labelFormatter={(label: any) => `القسم: ${label}`}
                    />
                    <Bar dataKey="حركات" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : chartType === 'pie_types' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analyticsStats.typesChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={45}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {analyticsStats.typesChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => [`${val} حركة`, 'العدد']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : chartType === 'timeline' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsStats.timelineData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorMovements" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any) => [`${val} حركة`, 'حركات اليوم']}
                      labelFormatter={(label: any) => `التاريخ: ${label}`}
                    />
                    <Area type="monotone" dataKey="حركات" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorMovements)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analyticsStats.topEmployeesData}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 40, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip
                      formatter={(val: any) => [`${val} حركة`, 'العدد']}
                      labelFormatter={(label: any) => `الموظف: ${label}`}
                    />
                    <Bar dataKey="حركات" fill="#6366f1" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Action Bar inside Analytics */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs">
              <span className="text-slate-500">
                يمكنك الانتقال فورياً إلى <b>معاينة الورقة الرسمية</b> أو <b>تعديل الورقة يدوياً</b> قبل استخراجها.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveViewMode('paper_preview')}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer transition-colors"
                >
                  عرض وتصميم الورقة الرسمية
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 4. VIEW 2: MANUAL SHEET EDITOR & CUSTOMIZER ("ممكن تعديل الورقة يدوياً وأنت صمم أيضاً") */}
      {activeViewMode === 'manual_edit' && (
        <motion.div
          key="manual-edit-view"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6 no-print"
        >
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  أدوات التحرير والتعديل اليدوي على الورقة الرسمية
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveViewMode('paper_preview')}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 cursor-pointer"
              >
                معاينة النتيجة فوراً
              </button>
            </div>

            {/* 1. Header Information Edit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم الوزارة / الهيئة:
                </label>
                <input
                  type="text"
                  value={paperSettings.ministryName}
                  onChange={(e) => setPaperSettings((p) => ({ ...p, ministryName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم التشكيل / الدائرة:
                </label>
                <input
                  type="text"
                  value={paperSettings.directorateName}
                  onChange={(e) => setPaperSettings((p) => ({ ...p, directorateName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  القسم / الشعبة المعنية:
                </label>
                <input
                  type="text"
                  value={paperSettings.departmentName}
                  onChange={(e) => setPaperSettings((p) => ({ ...p, departmentName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  عنوان التقرير والموضوع:
                </label>
                <input
                  type="text"
                  value={paperSettings.reportTitle}
                  onChange={(e) => setPaperSettings((p) => ({ ...p, reportTitle: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم العدد الإداري (الصادر):
                </label>
                <input
                  type="text"
                  value={paperSettings.referenceNumber}
                  onChange={(e) => setPaperSettings((p) => ({ ...p, referenceNumber: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تاريخ الوثيقة المعتمد:
                </label>
                <input
                  type="text"
                  value={paperSettings.documentDateMiladi}
                  onChange={(e) => setPaperSettings((p) => ({ ...p, documentDateMiladi: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* 2. Preamble & Concluding Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    الديباجة الإدارية (مقدمة التقرير):
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paperSettings.showPreamble}
                      onChange={(e) => setPaperSettings((p) => ({ ...p, showPreamble: e.target.checked }))}
                    />
                    <span>إظهار في الورقة</span>
                  </label>
                </div>
                <textarea
                  rows={3}
                  value={paperSettings.preamble}
                  onChange={(e) => setPaperSettings((p) => ({ ...p, preamble: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الملاحظات الختامية والهوامش:
                </label>
                <textarea
                  rows={3}
                  value={paperSettings.concludingNotes}
                  onChange={(e) => setPaperSettings((p) => ({ ...p, concludingNotes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs leading-relaxed"
                />
              </div>
            </div>

            {/* 3. Column Visibility Management */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                الأعمدة الظاهرة في جدول الورقة:
              </label>
              <div className="flex flex-wrap gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-xs">
                {[
                  { key: 'seq', label: 'التسلسل (ت)' },
                  { key: 'employeeNumber', label: 'الرقم الوظيفي' },
                  { key: 'fullName', label: 'اسم الموظف' },
                  { key: 'department', label: 'القسم / التشكيل' },
                  { key: 'jobTitle', label: 'العنوان الوظيفي' },
                  { key: 'movementType', label: 'نوع الحركة' },
                  { key: 'date', label: 'التاريخ' },
                  { key: 'duration', label: 'المدة / الساعات' },
                  { key: 'orderNumber', label: 'رقم الأمر' },
                  { key: 'notes', label: 'الملاحظات' },
                ].map((col) => (
                  <label key={col.key} className="flex items-center gap-1.5 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={(visibleColumns as any)[col.key]}
                      onChange={(e) =>
                        setVisibleColumns((prev) => ({
                          ...prev,
                          [col.key]: e.target.checked,
                        }))
                      }
                      className="rounded text-violet-600"
                    />
                    <span>{col.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 4. Signatories Management */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  التواقيع والاعتمادات الرسمية (تعديل الأسماء والعناوين):
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paperSettings.showSignatures}
                    onChange={(e) => setPaperSettings((p) => ({ ...p, showSignatures: e.target.checked }))}
                  />
                  <span>إظهار التواقيع في الورقة</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {signatories.map((sig, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400">الصفة الوظيفية #{idx + 1}:</span>
                      <input
                        type="text"
                        value={sig.roleTitle}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSignatories((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, roleTitle: val } : s))
                          );
                        }}
                        className="w-full px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400">الاسم الثلاثي واللقب:</span>
                      <input
                        type="text"
                        value={sig.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSignatories((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, name: val } : s))
                          );
                        }}
                        className="w-full px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Custom Row Management */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <button
                type="button"
                onClick={handleAddManualRow}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>إضافة سطر يدوي مباشر إلى الورقة</span>
              </button>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeChartInPrint}
                    onChange={(e) => setIncludeChartInPrint(e.target.checked)}
                  />
                  <span>تضمين المخطط البياني المصغر أعلى الورقة الرسمية</span>
                </label>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 5. THE OFFICIAL GOVERNMENTAL PAPER / SHEET (A4 Printable Layout) */}
      <div className={`${activeViewMode === 'analytics' ? 'hidden' : 'block'}`}>
        {/* Helper Toolbar above Sheet */}
        <div className="flex items-center justify-between py-2 px-1 text-xs text-slate-500 no-print">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              معاينة الورقة الرسمية (قياس A4):
            </span>
            <span className="text-[11px] text-slate-400">
              (يمكنك النقر على نصوص الورقة والملاحظات للتعديل الفوري)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold flex items-center gap-1.5 hover:opacity-90 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة مباشرة</span>
            </button>
          </div>
        </div>

        {/* Paper Container */}
        <div
          id="official-printable-movement-sheet"
          className="official-movement-sheet w-full max-w-5xl mx-auto bg-white text-black p-8 sm:p-12 shadow-2xl rounded-2xl border border-slate-300 print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:max-w-none"
          style={{ minHeight: '1050px' }}
        >
          {/* Paper Header: Official Emblem & Ministry Typography */}
          <div className="border-b-2 border-black pb-4 mb-5">
            <div className="flex items-center justify-between text-center">
              {/* Right Side: Republic & Ministry */}
              <div className="text-right text-xs font-bold leading-relaxed space-y-0.5">
                <div className="text-sm font-black">جمهورية العراق</div>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    setPaperSettings((p) => ({ ...p, ministryName: e.currentTarget.textContent || '' }))
                  }
                  className="outline-hidden hover:bg-yellow-50 focus:bg-yellow-100 px-1 rounded transition-colors"
                >
                  {paperSettings.ministryName}
                </div>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    setPaperSettings((p) => ({ ...p, directorateName: e.currentTarget.textContent || '' }))
                  }
                  className="outline-hidden hover:bg-yellow-50 focus:bg-yellow-100 px-1 rounded transition-colors"
                >
                  {paperSettings.directorateName}
                </div>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    setPaperSettings((p) => ({ ...p, departmentName: e.currentTarget.textContent || '' }))
                  }
                  className="text-[11px] font-normal outline-hidden hover:bg-yellow-50 focus:bg-yellow-100 px-1 rounded transition-colors"
                >
                  {paperSettings.departmentName}
                </div>
              </div>

              {/* Center: Official Golden/Dark Emblem */}
              <div className="flex flex-col items-center justify-center">
                <GovernmentEmblem
                  variant={organization?.officialEmblem || 'gold'}
                  size={68}
                  showText={false}
                />
                <span className="text-[10px] font-bold tracking-widest mt-1">REPUBLIC OF IRAQ</span>
              </div>

              {/* Left Side: Document Number & Date */}
              <div className="text-left text-xs font-bold leading-relaxed font-mono space-y-0.5">
                <div>
                  العدد:{' '}
                  <span
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) =>
                      setPaperSettings((p) => ({ ...p, referenceNumber: e.currentTarget.textContent || '' }))
                    }
                    className="outline-hidden hover:bg-yellow-50 focus:bg-yellow-100 px-1 rounded"
                  >
                    {paperSettings.referenceNumber}
                  </span>
                </div>
                <div>
                  التاريخ:{' '}
                  <span
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) =>
                      setPaperSettings((p) => ({ ...p, documentDateMiladi: e.currentTarget.textContent || '' }))
                    }
                    className="outline-hidden hover:bg-yellow-50 focus:bg-yellow-100 px-1 rounded"
                  >
                    {paperSettings.documentDateMiladi}
                  </span>
                </div>
                <div>
                  الموافق:{' '}
                  <span
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) =>
                      setPaperSettings((p) => ({ ...p, documentDateHijri: e.currentTarget.textContent || '' }))
                    }
                    className="outline-hidden hover:bg-yellow-50 focus:bg-yellow-100 px-1 rounded"
                  >
                    {paperSettings.documentDateHijri}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-sans">
                  نظام الأفراد وإدارة المواقف 2026
                </div>
              </div>
            </div>
          </div>

          {/* Document Subject Title */}
          <div className="text-center my-4">
            <h2
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) =>
                setPaperSettings((p) => ({ ...p, reportTitle: e.currentTarget.textContent || '' }))
              }
              className="text-base sm:text-lg font-black underline underline-offset-8 decoration-2 outline-hidden hover:bg-yellow-50 focus:bg-yellow-100 px-2 py-1 rounded inline-block"
            >
              {paperSettings.reportTitle}
            </h2>
            <div className="text-xs font-bold text-slate-700 mt-1">
              الفترة:{' '}
              {dateScope === 'custom_range'
                ? `من ${startDate} إلى ${endDate}`
                : dateScope === 'month'
                ? `شهر ${selectedMonth}`
                : dateScope === 'today'
                ? `${selectedDate} (${getArabicDayOfWeek(selectedDate)})`
                : 'الأرشيف الشامل'}{' '}
              — التشكيل:{' '}
              {departmentFilter === 'ALL' ? 'كافة التشكيلات والأقسام' : departmentFilter}
            </div>
          </div>

          {/* Optional Preamble */}
          {paperSettings.showPreamble && (
            <div className="my-3 text-xs leading-relaxed text-slate-800 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
              <div
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) =>
                  setPaperSettings((p) => ({ ...p, preamble: e.currentTarget.textContent || '' }))
                }
                className="outline-hidden hover:bg-yellow-50 focus:bg-yellow-100 px-1 rounded"
              >
                {paperSettings.preamble}
              </div>
            </div>
          )}

          {/* Optional Embedded Mini Chart in the Official Paper */}
          {includeChartInPrint && analyticsStats.deptChartData.length > 0 && (
            <div className="my-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                <span>📊 التوزيع الإحصائي لحركات الموقف حسب الأقسام:</span>
                <span className="font-mono">إجمالي الحركات: {analyticsStats.totalCount}</span>
              </div>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsStats.deptChartData.slice(0, 8)} margin={{ top: 5, right: 5, left: 5, bottom: 15 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#000' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#000' }} />
                    <Bar dataKey="حركات" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Official Movement Table */}
          <div className="overflow-x-auto my-4">
            <table className="w-full text-center border-collapse border border-black text-xs">
              <thead>
                <tr className="bg-slate-200 text-black font-black border-b border-black">
                  {visibleColumns.seq && <th className="border border-black p-2 w-10">ت</th>}
                  {visibleColumns.employeeNumber && <th className="border border-black p-2 w-24">الرقم الوظيفي</th>}
                  {visibleColumns.fullName && <th className="border border-black p-2 text-right pr-3">اسم الموظف الرباعي واللقب</th>}
                  {visibleColumns.department && <th className="border border-black p-2">القسم / التشكيل</th>}
                  {visibleColumns.jobTitle && <th className="border border-black p-2">العنوان الوظيفي</th>}
                  {visibleColumns.movementType && <th className="border border-black p-2">نوع الحركة</th>}
                  {visibleColumns.date && <th className="border border-black p-2 w-24">التاريخ</th>}
                  {visibleColumns.duration && <th className="border border-black p-2 w-20">المدة / الساعات</th>}
                  {visibleColumns.orderNumber && <th className="border border-black p-2">رقم وتاريخ الأمر</th>}
                  {visibleColumns.notes && <th className="border border-black p-2 text-right pr-2">الملاحظات الإدارية</th>}
                  <th className="border border-black p-2 w-8 no-print">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="border border-black p-6 text-center text-slate-500 font-bold">
                      لا توجد سجلات مطابقة للشروط المحددة حالياً.
                    </td>
                  </tr>
                ) : (
                  tableRows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`border-b border-black hover:bg-slate-50 transition-colors ${
                        idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                      }`}
                    >
                      {visibleColumns.seq && (
                        <td className="border border-black p-1.5 font-mono font-bold">{idx + 1}</td>
                      )}
                      {visibleColumns.employeeNumber && (
                        <td className="border border-black p-1.5 font-mono">{row.employeeNumber}</td>
                      )}
                      {visibleColumns.fullName && (
                        <td className="border border-black p-1.5 text-right font-bold pr-2">
                          <span
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => {
                              const newName = e.currentTarget.textContent || '';
                              if (row.isCustomManual) {
                                setManualRows((prev) =>
                                  prev.map((r) => (r.id === row.id ? { ...r, fullName: newName } : r))
                                );
                              }
                            }}
                            className="outline-hidden hover:bg-yellow-50 focus:bg-yellow-100 px-1 rounded"
                          >
                            {row.fullName}
                          </span>
                        </td>
                      )}
                      {visibleColumns.department && (
                        <td className="border border-black p-1.5">{row.department}</td>
                      )}
                      {visibleColumns.jobTitle && (
                        <td className="border border-black p-1.5 text-slate-700">{row.jobTitle}</td>
                      )}
                      {visibleColumns.movementType && (
                        <td className="border border-black p-1.5 font-bold">
                          <span
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => {
                              const newLabel = e.currentTarget.textContent || '';
                              if (row.isCustomManual) {
                                setManualRows((prev) =>
                                  prev.map((r) => (r.id === row.id ? { ...r, movementTypeLabel: newLabel } : r))
                                );
                              }
                            }}
                            className="outline-hidden hover:bg-yellow-50 focus:bg-yellow-100 px-1 rounded"
                          >
                            {row.movementTypeLabel}
                          </span>
                        </td>
                      )}
                      {visibleColumns.date && (
                        <td className="border border-black p-1.5 font-mono">{row.dateStr}</td>
                      )}
                      {visibleColumns.duration && (
                        <td className="border border-black p-1.5 font-bold">{row.durationLabel}</td>
                      )}
                      {visibleColumns.orderNumber && (
                        <td className="border border-black p-1.5 text-[11px] font-mono">
                          <span
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => {
                              const newOrder = e.currentTarget.textContent || '';
                              if (row.isCustomManual) {
                                setManualRows((prev) =>
                                  prev.map((r) => (r.id === row.id ? { ...r, orderNumber: newOrder } : r))
                                );
                              }
                            }}
                            className="outline-hidden hover:bg-yellow-50 focus:bg-yellow-100 px-1 rounded"
                          >
                            {row.orderNumber}
                          </span>
                        </td>
                      )}
                      {visibleColumns.notes && (
                        <td className="border border-black p-1.5 text-right text-[11px] pr-2">
                          <span
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => {
                              const newNote = e.currentTarget.textContent || '';
                              setEditedNotesMap((prev) => ({ ...prev, [row.id]: newNote }));
                            }}
                            className="outline-hidden hover:bg-yellow-50 focus:bg-yellow-100 px-1 rounded"
                            title="انقر لتعديل الملاحظة يدوياً"
                          >
                            {row.notes}
                          </span>
                        </td>
                      )}
                      <td className="border border-black p-1 no-print">
                        <button
                          type="button"
                          onClick={() => {
                            if (row.isCustomManual) {
                              setManualRows((prev) => prev.filter((r) => r.id !== row.id));
                            } else {
                              setExcludedRecordIds((prev) => new Set(prev).add(row.id));
                            }
                          }}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                          title="استبعاد هذا السطر من التقرير"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Statistical Summary Box inside Sheet */}
          {paperSettings.showStatsBox && (
            <div className="my-4 p-3 bg-slate-100 rounded-xl border border-black/30 text-xs">
              <div className="font-bold mb-1">ملخص الموقف العددي والإحصائي:</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>• إجمالي الحركات المعتمدة: <b>{analyticsStats.totalCount}</b></div>
                <div>• عدد الموظفين المنفذين: <b>{analyticsStats.employeesImpactedCount}</b></div>
                <div>• الغياب غير المأذون: <b>{analyticsStats.absent}</b></div>
                <div>• الإجازات الاعتيادية: <b>{analyticsStats.annualLeave}</b></div>
                <div>• الإجازات المرضية: <b>{analyticsStats.sickLeave}</b></div>
                <div>• الأذونات الساعية: <b>{analyticsStats.timePerm} ({analyticsStats.totalHours} س)</b></div>
                <div>• الإيفادات الرسمية: <b>{analyticsStats.mission}</b></div>
                <div>• الخفارات والتكليف: <b>{analyticsStats.duty}</b></div>
              </div>
            </div>
          )}

          {/* Concluding Notes */}
          <div className="my-4 text-xs leading-relaxed text-slate-700">
            <div
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) =>
                setPaperSettings((p) => ({ ...p, concludingNotes: e.currentTarget.textContent || '' }))
              }
              className="outline-hidden hover:bg-yellow-50 focus:bg-yellow-100 px-1 rounded"
            >
              {paperSettings.concludingNotes}
            </div>
          </div>

          {/* Signatures & Seal Section */}
          {paperSettings.showSignatures && (
            <div className="mt-12 pt-6 border-t border-black/20">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center text-xs">
                {signatories.map((sig, sIdx) => (
                  <div key={sIdx} className="space-y-6">
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const newTitle = e.currentTarget.textContent || '';
                        setSignatories((prev) =>
                          prev.map((s, i) => (i === sIdx ? { ...s, roleTitle: newTitle } : s))
                        );
                      }}
                      className="font-bold outline-hidden hover:bg-yellow-50 focus:bg-yellow-100 px-1 rounded"
                    >
                      {sig.roleTitle}
                    </div>

                    <div className="h-10 border-b border-dotted border-black/40 flex items-center justify-center text-[10px] text-slate-400">
                      [ التوقيع والختم الرسمي ]
                    </div>

                    <div
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const newName = e.currentTarget.textContent || '';
                        setSignatories((prev) =>
                          prev.map((s, i) => (i === sIdx ? { ...s, name: newName } : s))
                        );
                      }}
                      className="font-bold text-slate-900 outline-hidden hover:bg-yellow-50 focus:bg-yellow-100 px-1 rounded"
                    >
                      {sig.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
