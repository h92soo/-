import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Fingerprint,
  ScanFace,
  CreditCard,
  Hand,
  Search,
  Filter,
  Calendar,
  Clock,
  Download,
  Printer,
  RefreshCw,
  Upload,
  CheckCircle2,
  AlertTriangle,
  UserX,
  FileSpreadsheet,
  Building2,
  ShieldCheck,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileText,
  Activity,
  Layers,
  Sparkles,
  HelpCircle,
  Volume2,
  VolumeX,
  ArrowRight,
  Plus,
  Trash2,
  Edit,
  Eye,
  Info,
  Table,
  LayoutGrid,
  List,
  Laptop,
  Network,
  Edit2,
  Wifi,
  Radio,
  Signal,
  AlertOctagon,
} from 'lucide-react';
import {
  Employee,
  BiometricDevice,
  BiometricPunchRecord,
  BiometricDetectionResult,
  Department,
  OrganizationSettings,
  UserAccount,
  DEFAULT_DEPARTMENTS,
  WorkspaceTab,
} from '../types';
import { biometricService } from '../services/biometricService';
import { toast } from './ToastNotification';
import { soundEffects } from '../utils/soundEffects';
import { PaginationControl } from './PaginationControl';
import { BiometricDeviceModal } from './BiometricDeviceModal';
import { BiometricPingModal } from './BiometricPingModal';
import { BiometricBackgroundJobBanner } from './BiometricBackgroundJobBanner';

interface BiometricAuditHubProps {
  employees: Employee[];
  departments?: Department[];
  organization: OrganizationSettings;
  currentUser?: UserAccount;
  onNavigate?: (tab: WorkspaceTab) => void;
  onBackToDashboard?: () => void;
  onEmployeesChanged?: (employees: Employee[]) => void;
}

type ViewPeriodMode = 'daily' | 'weekly' | 'monthly' | 'raw_logs';

export const BiometricAuditHub: React.FC<BiometricAuditHubProps> = ({
  employees,
  departments = DEFAULT_DEPARTMENTS,
  organization,
  currentUser,
  onNavigate,
  onBackToDashboard,
  onEmployeesChanged,
}) => {
  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<ViewPeriodMode>('daily');

  // Dates
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return new Date().toISOString().slice(0, 7); // YYYY-MM
  });

  // Filters
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedModalityFilter, setSelectedModalityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data States
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [allPunchLogs, setAllPunchLogs] = useState<BiometricPunchRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isGeneratingDemo, setIsGeneratingDemo] = useState<boolean>(false);

  // Table Presentation Mode (وضع عرض سجل الجداول)
  // standard: جدول شامل ومفصل مع كافة البيانات
  // compact: عرض مضغوط عالي الكثافة وسريع جداً
  // cards: بطاقات تفاعلية أنيقة
  const [tableLayoutMode, setTableLayoutMode] = useState<'standard' | 'compact' | 'cards'>('standard');

  // Pagination states (10, 20, 50, 100, 0=الكل) - لمعالجة تجمد الشاشة وتسريع الاستعراض
  const [dailyPage, setDailyPage] = useState<number>(1);
  const [dailyPageSize, setDailyPageSize] = useState<number>(20);

  const [weeklyPage, setWeeklyPage] = useState<number>(1);
  const [weeklyPageSize, setWeeklyPageSize] = useState<number>(20);

  const [monthlyPage, setMonthlyPage] = useState<number>(1);
  const [monthlyPageSize, setMonthlyPageSize] = useState<number>(20);

  const [rawPage, setRawPage] = useState<number>(1);
  const [rawPageSize, setRawPageSize] = useState<number>(20);

  // Selected employee punch details modal (عرض سجل الحركات الكامل للموظف)
  const [selectedEmpPunches, setSelectedEmpPunches] = useState<{
    employee: Employee;
    date: string;
    punches: BiometricPunchRecord[];
  } | null>(null);

  // Sound effects state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => soundEffects.isEnabled());

  // Print modal / state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isUsbImportOpen, setIsUsbImportOpen] = useState<boolean>(false);
  const [usbFileText, setUsbFileText] = useState<string>('');
  const [usbFileName, setUsbFileName] = useState<string>('');
  const [isImportingUsb, setIsImportingUsb] = useState<boolean>(false);

  // Manual Punch modal
  const [manualPunchEmployee, setManualPunchEmployee] = useState<Employee | null>(null);
  const [manualPunchType, setManualPunchType] = useState<'check_in' | 'check_out'>('check_in');
  const [manualPunchTime, setManualPunchTime] = useState<string>('08:15');
  const [manualPunchNote, setManualPunchNote] = useState<string>('');
  const [isSavingManualPunch, setIsSavingManualPunch] = useState<boolean>(false);

  // Real Device Detection & Hardware Management States
  const [isDetectingDevices, setIsDetectingDevices] = useState<boolean>(false);
  const [deviceDetectionModalOpen, setDeviceDetectionModalOpen] = useState<boolean>(false);
  const [detectionReport, setDetectionReport] = useState<BiometricDetectionResult | null>(null);
  const [editingDevice, setEditingDevice] = useState<BiometricDevice | null>(null);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState<boolean>(false);
  const [pingModalDevice, setPingModalDevice] = useState<BiometricDevice | null>(null);

  // Load Initial Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [devList, logList] = await Promise.all([
        biometricService.getDevices(),
        biometricService.getBiometricLogs(),
      ]);
      setDevices(devList);
      setAllPunchLogs(logList);
    } catch (err) {
      console.error(err);
      toast.error('فشل تحميل سجلات البصمة والأجهزة.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubSound = soundEffects.subscribe(setSoundEnabled);
    const unsubDevices = biometricService.subscribe((devs) => {
      setDevices(devs);
    });
    return () => {
      unsubSound();
      unsubDevices();
    };
  }, []);

  const handleToggleSound = () => {
    const next = soundEffects.toggle();
    setSoundEnabled(next);
    toast.info(next ? 'تم تفعيل أصوات الأزرار في النظام 🔊' : 'تم كتم أصوات الأزرار 🔇');
  };

  // Real Biometric Device Detection (كشف أجهزة البصمة الحقيقي)
  const handleDetectBiometricDevices = async () => {
    soundEffects.playButtonClick();
    setIsDetectingDevices(true);
    toast.info('جارٍ الكشف الحقيقي عن أجهزة البصمة عبر الشبكة وUSB...');
    try {
      const res = await biometricService.autoDetectDevices(devices);
      setDetectionReport(res);
      setDeviceDetectionModalOpen(true);
      await loadData();

      if (res.hasConnected) {
        soundEffects.playDeviceConnectedSound();
        toast.success(
          `✅ تم الربط بنجاح! تم تأكيد اتصال (${res.connectedCount}) من أصل (${res.totalScanned}) أجهزة بصمة.`
        );
      } else {
        soundEffects.playDeviceDisconnectedSound();
        toast.error(
          `⚠️ تنبيه: عدم ربط أجهزة البصمة! تعذر الوصول إلى (${res.disconnectedCount}) أجهزة. الأجهزة غير موصولة بالشبكة أو كابل الـ USB غير متصل.`
        );
      }
    } catch (err: any) {
      soundEffects.playDeviceDisconnectedSound();
      toast.error(`⚠️ تنبيه: فشل الكشف عن أجهزة البصمة: ${err?.message || 'تعذر الاتصال'}`);
    } finally {
      setIsDetectingDevices(false);
    }
  };

  // Delete Device with permanent save
  const handleDeleteDevice = async (deviceId: string, deviceName: string) => {
    soundEffects.playButtonClick();
    if (confirm(`هل أنت متأكد من حذف جهاز البصمة (${deviceName}) نهائياً من المنظومة؟`)) {
      await biometricService.deleteDevice(deviceId);
      await loadData();
      soundEffects.playSuccess();
      toast.success(`تم حذف الجهاز (${deviceName}) من المنظومة وحفظ التغييرات.`);
    }
  };

  // Sync from all devices
  const handleSyncDevices = async () => {
    soundEffects.playButtonClick();
    setIsSyncing(true);
    try {
      const result: any = await biometricService.syncAllDevices(employees);
      await loadData();
      if (result.successfulDevices === 0) {
        toast.warning(
          result.warning ||
            '⚠️ تنبيه: عدم ربط أي جهاز بصمة! تعذر استكمال المزامنة لأن الأجهزة غير متصلة بالشبكة.'
        );
      } else {
        soundEffects.playDeviceConnectedSound();
        toast.success(
          `✅ تم الربط والمزامنة بنجاح: تم سحب ${result.totalImported} حركة بصمة من ${result.successfulDevices} أجهزة متصلة ومطابقتها مع الأقسام.`
        );
      }
    } catch (err: any) {
      toast.warning(
        err?.message ||
          '⚠️ تنبيه: عدم ربط أجهزة البصمة! تعذر استكمال المزامنة لأن الأجهزة غير متصلة بالشبكة.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // Generate Demo Audit Logs for chosen date
  const handleGenerateDemoAudit = async () => {
    soundEffects.playButtonClick();
    setIsGeneratingDemo(true);
    try {
      const generated = await biometricService.generateComprehensiveAuditLogs(
        employees,
        selectedDate,
        selectedDepartment === 'all' ? undefined : selectedDepartment
      );
      await loadData();
      soundEffects.playSuccess();
      toast.success(`تم إنشاء وتحديث ${generated.length} حركة بصمة ذكية لجميع أقسام الموارد المائية.`);
    } catch (err) {
      console.error(err);
      soundEffects.playError();
      toast.error('فشل توليد كشف البصمة.');
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  // Available department list
  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    departments.forEach((d) => set.add(d.name));
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [departments, employees]);

  // Filtered employees list based on department & search query
  const targetEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (selectedDepartment !== 'all' && emp.department !== selectedDepartment) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = emp.fullName.toLowerCase().includes(q);
        const matchesNum = emp.employeeNumber.toLowerCase().includes(q);
        const matchesEnroll = emp.biometricEnrollmentId?.toLowerCase().includes(q);
        const matchesDept = emp.department?.toLowerCase().includes(q);
        if (!matchesName && !matchesNum && !matchesEnroll && !matchesDept) {
          return false;
        }
      }
      return true;
    });
  }, [employees, selectedDepartment, searchQuery]);

  // Index punches by employeeId and date
  const punchesByEmpAndDate = useMemo(() => {
    const map = new Map<string, BiometricPunchRecord[]>();
    allPunchLogs.forEach((p) => {
      const key = `${p.employeeId}__${p.date}`;
      const existing = map.get(key) || [];
      existing.push(p);
      map.set(key, existing);
    });
    return map;
  }, [allPunchLogs]);

  // Calculate Daily Audit Records
  const dailyAuditRows = useMemo(() => {
    return targetEmployees.map((emp) => {
      const key = `${emp.id}__${selectedDate}`;
      const dayPunches = punchesByEmpAndDate.get(key) || [];

      // Sort by time
      dayPunches.sort((a, b) => a.time.localeCompare(b.time));

      const checkInPunch = dayPunches.find((p) => p.punchType === 'check_in') || dayPunches[0];
      const checkOutPunch = dayPunches.find(
        (p) => p.punchType === 'check_out' && p.id !== checkInPunch?.id
      ) || (dayPunches.length > 1 ? dayPunches[dayPunches.length - 1] : undefined);

      let status: 'on_time' | 'late' | 'leave_authorized' | 'absent' | 'early_leave' = 'absent';
      let lateMinutes = 0;
      let associatedLeave: string | undefined = undefined;

      if (checkInPunch) {
        status = checkInPunch.status as any;
        lateMinutes = checkInPunch.lateMinutes || 0;
        associatedLeave = checkInPunch.associatedLeave;
      }

      // Filter by device if device filter is set
      const matchesDevice =
        selectedDeviceId === 'all' ||
        checkInPunch?.deviceId === selectedDeviceId ||
        checkOutPunch?.deviceId === selectedDeviceId;

      // Filter by modality if set
      const matchesModality =
        selectedModalityFilter === 'all' ||
        checkInPunch?.verificationType === selectedModalityFilter ||
        checkOutPunch?.verificationType === selectedModalityFilter;

      // Filter by status if set
      const matchesStatus =
        selectedStatusFilter === 'all' ||
        (selectedStatusFilter === 'on_time' && status === 'on_time') ||
        (selectedStatusFilter === 'late' && status === 'late') ||
        (selectedStatusFilter === 'leave_authorized' && status === 'leave_authorized') ||
        (selectedStatusFilter === 'absent' && status === 'absent');

      return {
        employee: emp,
        hasPunched: Boolean(checkInPunch),
        checkInPunch,
        checkOutPunch,
        allPunches: dayPunches,
        status,
        lateMinutes,
        associatedLeave,
        matchesFilters: matchesDevice && matchesModality && matchesStatus,
      };
    });
  }, [
    targetEmployees,
    selectedDate,
    punchesByEmpAndDate,
    selectedDeviceId,
    selectedModalityFilter,
    selectedStatusFilter,
  ]);

  const visibleDailyRows = useMemo(() => {
    return dailyAuditRows.filter((r) => r.matchesFilters);
  }, [dailyAuditRows]);

  // Key Daily Metrics
  const dailyMetrics = useMemo(() => {
    const total = targetEmployees.length;
    const present = dailyAuditRows.filter((r) => r.hasPunched).length;
    const onTime = dailyAuditRows.filter((r) => r.status === 'on_time').length;
    const late = dailyAuditRows.filter((r) => r.status === 'late').length;
    const leave = dailyAuditRows.filter((r) => r.status === 'leave_authorized').length;
    const absent = dailyAuditRows.filter((r) => r.status === 'absent').length;
    const totalLateMinutes = dailyAuditRows.reduce((sum, r) => sum + r.lateMinutes, 0);
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

    return {
      total,
      present,
      onTime,
      late,
      leave,
      absent,
      totalLateMinutes,
      attendanceRate,
    };
  }, [targetEmployees, dailyAuditRows]);

  // Compute Weekly Days for the selected date
  const weeklyDays = useMemo(() => {
    const curr = new Date(selectedDate);
    const dayOfWeek = curr.getDay(); // 0 is Sunday
    // In Iraq, standard workweek starts Sunday (day 0) and ends Thursday (day 4)
    const sunday = new Date(curr);
    sunday.setDate(curr.getDate() - dayOfWeek);

    const days: { dateStr: string; dayName: string; isSelected: boolean }[] = [];
    const dayNamesAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

    for (let i = 0; i < 5; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const str = d.toISOString().slice(0, 10);
      days.push({
        dateStr: str,
        dayName: dayNamesAr[i],
        isSelected: str === selectedDate,
      });
    }
    return days;
  }, [selectedDate]);

  // Compute Weekly Audit Rows
  const weeklyAuditRows = useMemo(() => {
    return targetEmployees.map((emp) => {
      let daysPresentCount = 0;
      let totalLateMins = 0;
      let totalLeaveCount = 0;

      const dayDetails = weeklyDays.map((wd) => {
        const key = `${emp.id}__${wd.dateStr}`;
        const dayPunches = punchesByEmpAndDate.get(key) || [];
        const checkIn = dayPunches.find((p) => p.punchType === 'check_in') || dayPunches[0];

        if (checkIn) {
          if (checkIn.status === 'leave_authorized') {
            totalLeaveCount++;
          } else {
            daysPresentCount++;
            if (checkIn.status === 'late') {
              totalLateMins += checkIn.lateMinutes || 0;
            }
          }
        }

        return {
          dateStr: wd.dateStr,
          dayName: wd.dayName,
          checkIn,
          punchesCount: dayPunches.length,
          status: checkIn ? checkIn.status : 'absent',
          lateMinutes: checkIn?.lateMinutes || 0,
        };
      });

      const totalWorkDays = 5;
      const weeklyScorePercent = Math.round(((daysPresentCount + totalLeaveCount) / totalWorkDays) * 100);

      return {
        employee: emp,
        dayDetails,
        daysPresentCount,
        totalLateMins,
        totalLeaveCount,
        weeklyScorePercent,
      };
    });
  }, [targetEmployees, weeklyDays, punchesByEmpAndDate]);

  // Compute Monthly Audit Rows
  const monthlyAuditRows = useMemo(() => {
    return targetEmployees.map((emp) => {
      // Find all punches for this employee in selected month
      const empMonthPunches = allPunchLogs.filter(
        (p) => p.employeeId === emp.id && p.date.startsWith(selectedMonth)
      );

      // Group punches by date
      const datesAttendedSet = new Set<string>();
      let onTimeDays = 0;
      let lateDays = 0;
      let totalLateMins = 0;
      let leaveDays = 0;

      empMonthPunches.forEach((p) => {
        if (p.punchType === 'check_in' || !datesAttendedSet.has(p.date)) {
          datesAttendedSet.add(p.date);
          if (p.status === 'on_time') onTimeDays++;
          else if (p.status === 'late') {
            lateDays++;
            totalLateMins += p.lateMinutes || 0;
          } else if (p.status === 'leave_authorized') {
            leaveDays++;
          }
        }
      });

      const totalActualPunchedDays = datesAttendedSet.size;
      const expectedWorkDays = 22; // approx 22 working days per month in Iraq
      const attendancePercent = Math.min(100, Math.round(((totalActualPunchedDays + leaveDays) / expectedWorkDays) * 100));

      return {
        employee: emp,
        totalActualPunchedDays,
        onTimeDays,
        lateDays,
        totalLateMins,
        leaveDays,
        attendancePercent,
        punchesCount: empMonthPunches.length,
      };
    });
  }, [targetEmployees, allPunchLogs, selectedMonth]);

  // Filtered Raw Punches Log
  const filteredRawLogs = useMemo(() => {
    return allPunchLogs.filter((p) => {
      if (selectedDate && p.date !== selectedDate) {
        return false;
      }
      if (selectedDepartment !== 'all' && p.department !== selectedDepartment) {
        return false;
      }
      if (selectedDeviceId !== 'all' && p.deviceId !== selectedDeviceId) {
        return false;
      }
      if (selectedModalityFilter !== 'all' && p.verificationType !== selectedModalityFilter) {
        return false;
      }
      if (selectedStatusFilter !== 'all' && p.status !== selectedStatusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = p.employeeName.toLowerCase().includes(q);
        const matchesNum = p.employeeNumber.toLowerCase().includes(q);
        const matchesDevice = p.deviceName.toLowerCase().includes(q);
        if (!matchesName && !matchesNum && !matchesDevice) {
          return false;
        }
      }
      return true;
    });
  }, [
    allPunchLogs,
    selectedDate,
    selectedDepartment,
    selectedDeviceId,
    selectedModalityFilter,
    selectedStatusFilter,
    searchQuery,
  ]);

  // Reset pagination to page 1 whenever any filter criteria changes
  useEffect(() => {
    setDailyPage(1);
    setWeeklyPage(1);
    setMonthlyPage(1);
    setRawPage(1);
  }, [
    selectedDate,
    selectedMonth,
    selectedDepartment,
    selectedDeviceId,
    selectedStatusFilter,
    selectedModalityFilter,
    searchQuery,
  ]);

  // Sliced paginated arrays to guarantee zero screen freeze and instantaneous rendering
  const paginatedDailyRows = useMemo(() => {
    if (dailyPageSize === 0) return visibleDailyRows;
    const start = (dailyPage - 1) * dailyPageSize;
    return visibleDailyRows.slice(start, start + dailyPageSize);
  }, [visibleDailyRows, dailyPage, dailyPageSize]);

  const paginatedWeeklyRows = useMemo(() => {
    if (weeklyPageSize === 0) return weeklyAuditRows;
    const start = (weeklyPage - 1) * weeklyPageSize;
    return weeklyAuditRows.slice(start, start + weeklyPageSize);
  }, [weeklyAuditRows, weeklyPage, weeklyPageSize]);

  const paginatedMonthlyRows = useMemo(() => {
    if (monthlyPageSize === 0) return monthlyAuditRows;
    const start = (monthlyPage - 1) * monthlyPageSize;
    return monthlyAuditRows.slice(start, start + monthlyPageSize);
  }, [monthlyAuditRows, monthlyPage, monthlyPageSize]);

  const paginatedRawLogs = useMemo(() => {
    if (rawPageSize === 0) return filteredRawLogs;
    const start = (rawPage - 1) * rawPageSize;
    return filteredRawLogs.slice(start, start + rawPageSize);
  }, [filteredRawLogs, rawPage, rawPageSize]);

  // Handle Manual Punch Submission
  const handleSaveManualPunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPunchEmployee) return;
    setIsSavingManualPunch(true);
    soundEffects.playButtonClick();

    try {
      const primaryDevice = devices[0] || {
        id: 'DEV-MANUAL',
        name: 'كشف البصمة الإداري المباشر',
        ipAddress: '127.0.0.1',
        deviceType: 'multi_biometric',
        port: 4370,
      };

      const [hour, min] = manualPunchTime.split(':').map(Number);
      let status: BiometricPunchRecord['status'] = 'on_time';
      let lateMinutes = 0;

      if (manualPunchType === 'check_in' && (hour > 8 || (hour === 8 && min > 30))) {
        status = 'late';
        lateMinutes = hour === 8 ? min - 30 : (hour - 8) * 60 + (min - 30);
      }

      const punchId = `PUNCH-MANUAL-${manualPunchEmployee.id}-${selectedDate}-${manualPunchType}`;
      const newPunch: BiometricPunchRecord = {
        id: punchId,
        deviceId: primaryDevice.id,
        deviceName: `${primaryDevice.name} (توثيق يدوي رسمي)`,
        deviceIp: primaryDevice.ipAddress,
        deviceType: 'multi_biometric',
        employeeId: manualPunchEmployee.id,
        employeeNumber: manualPunchEmployee.employeeNumber,
        employeeName: manualPunchEmployee.fullName,
        department: manualPunchEmployee.department,
        timestamp: `${selectedDate}T${manualPunchTime}:00.000Z`,
        date: selectedDate,
        time: `${manualPunchTime}:00`,
        punchType: manualPunchType,
        verificationType: 'fingerprint',
        status,
        lateMinutes: lateMinutes > 0 ? lateMinutes : undefined,
        isProcessedInMovements: true,
        notes: manualPunchNote.trim() || 'تم التوثيق يدوياً من خلال كشف البصمة الإداري المباشر',
      };

      await biometricService.saveBiometricLogs([newPunch]);
      await loadData();
      soundEffects.playSuccess();
      toast.success(`تم تسجيل وتوثيق حركة البصمة للموظف (${manualPunchEmployee.fullName}) بنجاح.`);
      setManualPunchEmployee(null);
      setManualPunchNote('');
    } catch (err) {
      console.error(err);
      soundEffects.playError();
      toast.error('فشل حفظ حركة البصمة.');
    } finally {
      setIsSavingManualPunch(false);
    }
  };

  // Handle USB Flash File Upload
  const handleUsbFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUsbFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setUsbFileText(content || '');
    };
    reader.readAsText(file);
  };

  const handleProcessUsbImport = async () => {
    if (!usbFileText.trim()) {
      toast.warning('يرجى اختيار ملف سجلات البصمة أو لصق محتواه للمتابعة.');
      return;
    }
    soundEffects.playButtonClick();
    setIsImportingUsb(true);
    try {
      const result = await biometricService.importPunchLogsFromFile(
        usbFileText,
        usbFileName || 'attlog.dat',
        devices[0]?.id || 'DEV-USB-IMPORT',
        employees
      );
      await loadData();
      soundEffects.playSuccess();
      toast.success(
        `تم استيراد ${result.importedCount} حركة بصمة بنجاح! المطابقين: ${result.matchedCount}، غير معروفين: ${result.unmatchedCount}`
      );
      setIsUsbImportOpen(false);
      setUsbFileText('');
      setUsbFileName('');
    } catch (err: any) {
      console.error(err);
      soundEffects.playError();
      toast.error(err?.message || 'فشل استيراد ملف البصمة.');
    } finally {
      setIsImportingUsb(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    soundEffects.playButtonClick();
    try {
      let csvContent = '\uFEFF'; // UTF-8 BOM
      csvContent += 'الرقم الوظيفي,اسم الموظف,القسم,التاريخ,وقت الحضور,وقت الانصراف,حالة الدوام,دقائق التأخير,جهاز البصمة,ملاحظات\n';

      dailyAuditRows.forEach((r) => {
        const emp = r.employee;
        const timeIn = r.checkInPunch?.time || '—';
        const timeOut = r.checkOutPunch?.time || '—';
        const statusAr =
          r.status === 'on_time'
            ? 'في الوقت المحدد'
            : r.status === 'late'
            ? `متأخر (${r.lateMinutes} دقيقة)`
            : r.status === 'leave_authorized'
            ? 'مجاز رسمياً'
            : 'لم يسجل بصمة';
        const deviceName = r.checkInPunch?.deviceName || '—';
        const notes = r.checkInPunch?.notes || '';

        csvContent += `"${emp.employeeNumber}","${emp.fullName}","${emp.department}","${selectedDate}","${timeIn}","${timeOut}","${statusAr}","${r.lateMinutes}","${deviceName}","${notes}"\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `كشف_البصمة_الموارد_المائية_${selectedDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      soundEffects.playSuccess();
      toast.success('تم تصدير كشف البصمة بصيغة CSV بنجاح.');
    } catch {
      soundEffects.playError();
      toast.error('تعذر تصدير الملف.');
    }
  };

  return (
    <div className="space-y-6 select-none" dir="rtl">
      {/* 1. TOP HEADER & ACTION CONTROLS */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        {/* Title & Ministry Emblem */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 shrink-0">
            <Fingerprint className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                كشف البصمة وسجل الحضور الذكي
              </h1>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800/60">
                دائرة الموارد المائية
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              متابعة حضور وانصراف الكوادر الميدانية والإدارية، فحص التأخيرات، والربط المباشر بأجهزة البصمة
            </p>
          </div>
        </div>

        {/* Global Sound FX Toggle & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sound Toggle Button */}
          <button
            type="button"
            id="toggle-system-audio-fx-btn"
            onClick={handleToggleSound}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              soundEnabled
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200'
            }`}
            title={soundEnabled ? 'أصوات الأزرار مفعلة (انقر لكتم الأصوات)' : 'أصوات الأزرار مكتومة (انقر لتفعيل الأصوات)'}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">أصوات الأزرار: مفعلة</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">أصوات الأزرار: مكتومة</span>
              </>
            )}
          </button>

          {/* Background Job Compact Status Banner in Header */}
          <BiometricBackgroundJobBanner compact className="hidden xl:flex" />

          {/* Real Device Detection Button (كشف أجهزة البصمة الحقيقي) */}
          <button
            type="button"
            onClick={handleDetectBiometricDevices}
            disabled={isDetectingDevices}
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs transition-all shadow-md shadow-cyan-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            title="كشف أجهزة البصمة الحقيقي وفحص الاتصال الشبكي والـ USB"
          >
            <Activity className={`w-3.5 h-3.5 ${isDetectingDevices ? 'animate-spin' : ''}`} />
            <span>{isDetectingDevices ? 'جارٍ الكشف الحقيقي...' : 'كشف أجهزة البصمة'}</span>
          </button>

          {/* Manage Devices Button (أجهزة البصمة والآي بي والربط بالأقسام) */}
          <button
            type="button"
            onClick={() => {
              soundEffects.playButtonClick();
              setDeviceDetectionModalOpen(true);
            }}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-300 dark:border-slate-700"
            title="عرض حالة أجهزة البصمة وتغيير الآي بي وفحص البينغ والربط بالأقسام"
          >
            <Network className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">أجهزة البصمة ({devices.length})</span>
          </button>

          {/* Device Sync Button */}
          <button
            type="button"
            onClick={handleSyncDevices}
            disabled={isSyncing}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            title="سحب حركات البصمة فوراً من كافة الأجهزة المتصلة بالشبكة"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'جارٍ السحب...' : 'سحب من الأجهزة'}</span>
          </button>

          {/* Flash USB Import Button */}
          <button
            type="button"
            onClick={() => {
              soundEffects.playButtonClick();
              setIsUsbImportOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="استيراد ملف البصمة من فلاش ميموري (attlog.dat)"
          >
            <Upload className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden md:inline">استيراد من فلاش USB</span>
          </button>

          {/* Demo Audit Generator Button */}
          <button
            type="button"
            onClick={handleGenerateDemoAudit}
            disabled={isGeneratingDemo}
            className="px-3 py-2 rounded-xl bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/60 text-violet-800 dark:text-violet-300 border border-violet-200 dark:border-violet-800 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            title="توليد كشف بصمة تجريبي لجميع موظفي الموارد المائية لاختبار المنظومة"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            <span className="hidden lg:inline">توليد كشف تجريبي</span>
          </button>

          {/* Print Official A4 Button */}
          <button
            type="button"
            onClick={() => {
              soundEffects.playButtonClick();
              setIsPrintModalOpen(true);
            }}
            className="px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="طباعة الكشف الرسمي A4 مع ترويسة دائرة الموارد المائية"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة A4</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="تصدير كشف البصمة بصيغة ملف Excel / CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden xl:inline">تصدير CSV</span>
          </button>

          {/* Back to Dashboard */}
          {onBackToDashboard && (
            <button
              type="button"
              onClick={() => {
                soundEffects.playButtonClick();
                onBackToDashboard();
              }}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="الرجوع للرئيسية"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. STATS SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 no-print">
        {/* Total Target Staff */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold">الكوادر في الكشف</span>
            <Building2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
            {dailyMetrics.total}
          </div>
          <div className="text-[10px] text-slate-400">
            {selectedDepartment === 'all' ? 'كافة أقسام الموارد المائية' : selectedDepartment}
          </div>
        </div>

        {/* Present by Biometric */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
            <span className="text-[11px] font-bold">الحضور بالبصمة</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-800 dark:text-emerald-300 font-mono">
            {dailyMetrics.present}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            نسبة الحضور: {dailyMetrics.attendanceRate}%
          </div>
        </div>

        {/* On Time */}
        <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-blue-700 dark:text-blue-400">
            <span className="text-[11px] font-bold">في الوقت الرسمي</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-blue-800 dark:text-blue-300 font-mono">
            {dailyMetrics.onTime}
          </div>
          <div className="text-[10px] text-blue-600 dark:text-blue-400">
            قبل 08:30 صباحاً
          </div>
        </div>

        {/* Late Punches */}
        <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
            <span className="text-[11px] font-bold">تأخيرات صباحية</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-800 dark:text-amber-300 font-mono">
            {dailyMetrics.late}
          </div>
          <div className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold font-mono">
            إجمالي: {dailyMetrics.totalLateMinutes} دقيقة
          </div>
        </div>

        {/* Missing Punch / Absent */}
        <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
            <span className="text-[11px] font-bold">لم يبصم / غياب</span>
            <UserX className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-bold text-rose-800 dark:text-rose-300 font-mono">
            {dailyMetrics.absent}
          </div>
          <div className="text-[10px] text-rose-600 dark:text-rose-400">
            يحتاج توثيق أو إجازة
          </div>
        </div>

        {/* Biometric Devices */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
            <span className="text-[11px] font-bold">أجهزة البصمة</span>
            <Activity className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-slate-800 dark:text-slate-200 font-mono">
            {devices.filter((d) => d.status === 'online').length} / {devices.length}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            متصلة بالشبكة
          </div>
        </div>
      </div>

      {/* 3. SMART MULTI-FILTER BAR */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3 no-print">
        {/* Row 1: View Period Tabs (Daily, Weekly, Monthly, Raw Logs) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-700">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 text-xs">
            <button
              type="button"
              onClick={() => {
                soundEffects.playTabClick();
                setViewMode('daily');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'daily'
                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>كشف يومي تفصيلي</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEffects.playTabClick();
                setViewMode('weekly');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'weekly'
                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-violet-600" />
              <span>كشف أسبوعي مجمع</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEffects.playTabClick();
                setViewMode('monthly');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'monthly'
                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>شيت شهري تراكمي</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEffects.playTabClick();
                setViewMode('raw_logs');
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'raw_logs'
                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-amber-600" />
              <span>سجل الحركات المباشر ({allPunchLogs.length})</span>
            </button>
          </div>

          {/* Quick Date Presets & Date Picker */}
          <div className="flex items-center gap-2 text-xs">
            {viewMode === 'monthly' ? (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-500">اختر الشهر:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    soundEffects.playButtonClick();
                    setSelectedMonth(e.target.value);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs font-bold"
                />
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playButtonClick();
                    setSelectedDate(new Date().toISOString().slice(0, 10));
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    selectedDate === new Date().toISOString().slice(0, 10)
                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  اليوم
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playButtonClick();
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    setSelectedDate(yesterday.toISOString().slice(0, 10));
                  }}
                  className="px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold"
                >
                  أمس
                </button>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      soundEffects.playButtonClick();
                      setSelectedDate(e.target.value);
                    }}
                    className="px-3 py-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs font-bold"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Deep Filters (Department, Device, Status, Modality, Search) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
          {/* 1. Department Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              القسم / التشكيل:
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => {
                soundEffects.playButtonClick();
                setSelectedDepartment(e.target.value);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">كافة أقسام الموارد المائية ({departmentOptions.length})</option>
              {departmentOptions.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Device Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              جهاز البصمة:
            </label>
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                soundEffects.playButtonClick();
                setSelectedDeviceId(e.target.value);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">كافة أجهزة البصمة ({devices.length})</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.ipAddress})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              حالة التواجد:
            </label>
            <select
              value={selectedStatusFilter}
              onChange={(e) => {
                soundEffects.playButtonClick();
                setSelectedStatusFilter(e.target.value);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">كافة الحالات</option>
              <option value="on_time">✅ في الوقت الرسمي</option>
              <option value="late">⚠️ تأخير صباحي</option>
              <option value="leave_authorized">🏖️ مجاز رسمياً</option>
              <option value="absent">❌ لم يبصم / غياب</option>
            </select>
          </div>

          {/* 4. Modality Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              نوع البصمة / التحقق:
            </label>
            <select
              value={selectedModalityFilter}
              onChange={(e) => {
                soundEffects.playButtonClick();
                setSelectedModalityFilter(e.target.value);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">كافة طرق البصمة</option>
              <option value="face">بصمة وجه (Face ID)</option>
              <option value="fingerprint">بصمة إصبع</option>
              <option value="card">بطاقة ذكية RFID</option>
              <option value="palm">بصمة كف (Palm)</option>
            </select>
          </div>

          {/* 5. Search Field */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              بحث سريع:
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="اسم الموظف أو الرقم..."
                className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        {/* Row 3: Department Fast Navigation Pills (ربط سريع وسلس بكل الأقسام) */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[10px] font-bold text-slate-400 shrink-0 ml-1">الأقسام السريعة:</span>
          <button
            type="button"
            onClick={() => {
              soundEffects.playButtonClick();
              setSelectedDepartment('all');
            }}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
              selectedDepartment === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            كافة الأقسام ({employees.length})
          </button>
          {departmentOptions.map((dept) => {
            const count = employees.filter((e) => e.department === dept).length;
            const isSelected = selectedDepartment === dept;
            return (
              <button
                key={dept}
                type="button"
                onClick={() => {
                  soundEffects.playButtonClick();
                  setSelectedDepartment(dept);
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{dept}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. ACTIVE VIEW CONTENT WITH TABLE PRESENTATION MODES & HIGH-PERFORMANCE PAGINATION */}
      <div className="space-y-4">
        {/* ROW 4: TABLE PRESENTATION MODE (وضع عرض سجل الجداول) & FAST PAGE SIZE PRESETS */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs text-xs no-print">
          {/* Table Presentation Modes (وضع العرض) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-700 dark:text-slate-200 ml-1 flex items-center gap-1.5">
              <Table className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>وضع عرض سجل الجداول:</span>
            </span>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  soundEffects.playButtonClick();
                  setTableLayoutMode('standard');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 cursor-pointer ${
                  tableLayoutMode === 'standard'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="عرض الجدول الإداري الكامل بجميع الحقول والتفاصيل الرسمية"
              >
                <Table className="w-3.5 h-3.5" />
                <span>جدول تفصيلي</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEffects.playButtonClick();
                  setTableLayoutMode('compact');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 cursor-pointer ${
                  tableLayoutMode === 'compact'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="عرض مضغوط عالي الكثافة وفائق السرعة لتدقيق أعداد كبيرة دون أي بطء"
              >
                <List className="w-3.5 h-3.5" />
                <span>سجل مضغوط سريع</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEffects.playButtonClick();
                  setTableLayoutMode('cards');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 cursor-pointer ${
                  tableLayoutMode === 'cards'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="عرض البطاقات التفاعلية مع شارات الحضور والتأخير"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>بطاقات تفاعلية</span>
              </button>
            </div>
          </div>

          {/* Quick Page Size Switcher (10 / 20 / 50 / 100 / الكل) */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
              عرض بالصفحة:
            </span>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              {[10, 20, 50, 100, 0].map((size) => {
                const currentSize =
                  viewMode === 'daily'
                    ? dailyPageSize
                    : viewMode === 'weekly'
                    ? weeklyPageSize
                    : viewMode === 'monthly'
                    ? monthlyPageSize
                    : rawPageSize;
                const isSelected = currentSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      soundEffects.playButtonClick();
                      if (viewMode === 'daily') {
                        setDailyPageSize(size);
                        setDailyPage(1);
                      } else if (viewMode === 'weekly') {
                        setWeeklyPageSize(size);
                        setWeeklyPage(1);
                      } else if (viewMode === 'monthly') {
                        setMonthlyPageSize(size);
                        setMonthlyPage(1);
                      } else {
                        setRawPageSize(size);
                        setRawPage(1);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title={size === 0 ? 'عرض كافة السجلات دفعة واحدة' : `عرض ${size} سجلات في الصفحة لمنع تجمد الشاشة`}
                  >
                    {size === 0 ? 'الكل' : size}
                  </button>
                );
              })}
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 hidden sm:inline">
              ⚡ خفيف وسلس (بدون تعليق)
            </span>
          </div>
        </div>

        {/* VIEW 1: DAILY AUDIT */}
        {viewMode === 'daily' && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-white">
                    كشف البصمة اليومي لتاريخ ({selectedDate})
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    (إجمالي المطابقين: {visibleDailyRows.length} موظفاً)
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  <span>وقت الدوام: 08:30 ص إلى 02:30 م</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                    الصفحة {dailyPage} من {Math.max(1, Math.ceil(visibleDailyRows.length / (dailyPageSize || visibleDailyRows.length || 1)))}
                  </span>
                </div>
              </div>

              {/* CARDS PRESENTATION MODE */}
              {tableLayoutMode === 'cards' ? (
                <div className="p-4">
                  {visibleDailyRows.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 max-w-xs mx-auto space-y-2">
                      <Fingerprint className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                      <p className="font-bold text-xs">لا توجد حركات بصمة مطابقة للشروط المحددة.</p>
                      <button
                        type="button"
                        onClick={handleGenerateDemoAudit}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold text-xs transition-colors"
                      >
                        توليد كشف بصمة تجريبي لليوم
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                      {paginatedDailyRows.map((row, idx) => {
                        const emp = row.employee;
                        const checkIn = row.checkInPunch;
                        const checkOut = row.checkOutPunch;
                        const globalIdx = (dailyPage - 1) * (dailyPageSize || visibleDailyRows.length) + idx + 1;

                        return (
                          <div
                            key={emp.id}
                            className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all flex flex-col justify-between gap-3 shadow-2xs group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                                  {globalIdx}
                                </span>
                                <div>
                                  <h4 className="font-bold text-slate-900 dark:text-white text-xs group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {emp.fullName}
                                  </h4>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    #{emp.employeeNumber} • {emp.department}
                                  </div>
                                </div>
                              </div>
                              {/* Status Badge */}
                              <div>
                                {row.status === 'on_time' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    حاضر
                                  </span>
                                )}
                                {row.status === 'late' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                    +{row.lateMinutes} د
                                  </span>
                                )}
                                {row.status === 'leave_authorized' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                    إجازة
                                  </span>
                                )}
                                {row.status === 'absent' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                    لم يبصم
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Punch timings */}
                            <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                              <div>
                                <div className="text-[10px] text-slate-400 font-bold">حضور:</div>
                                <div className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                                  {checkIn ? checkIn.time : '—'}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] text-slate-400 font-bold">انصراف:</div>
                                <div className="font-mono font-bold text-blue-700 dark:text-blue-300">
                                  {checkOut ? checkOut.time : '—'}
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-800 text-[10px]">
                              <button
                                type="button"
                                onClick={() => {
                                  soundEffects.playButtonClick();
                                  setSelectedEmpPunches({
                                    employee: emp,
                                    date: selectedDate,
                                    punches: row.allPunches,
                                  });
                                }}
                                className="flex-1 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-300 font-bold transition-colors cursor-pointer text-center"
                              >
                                سجل الحركات ({row.allPunches.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  soundEffects.playButtonClick();
                                  setManualPunchEmployee(emp);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer"
                                title="توثيق حركة بصمة يدوية"
                              >
                                توثيق
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : tableLayoutMode === 'compact' ? (
                /* COMPACT HIGH-SPEED TABLE MODE */
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-400 font-bold">
                        <th className="py-2 px-2.5 w-10 text-center">#</th>
                        <th className="py-2 px-2.5">الموظف</th>
                        <th className="py-2 px-2.5">القسم</th>
                        <th className="py-2 px-2.5 text-center font-mono">حضور</th>
                        <th className="py-2 px-2.5 text-center font-mono">انصراف</th>
                        <th className="py-2 px-2.5 text-center">الحالة</th>
                        <th className="py-2 px-2.5 text-center font-mono">التأخير</th>
                        <th className="py-2 px-2.5">الجهاز</th>
                        <th className="py-2 px-2.5 text-center no-print w-24">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                      {visibleDailyRows.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-6 text-center text-slate-500 font-bold">
                            لا توجد سجلات مطابقة للفلتر.
                          </td>
                        </tr>
                      ) : (
                        paginatedDailyRows.map((row, idx) => {
                          const emp = row.employee;
                          const checkIn = row.checkInPunch;
                          const checkOut = row.checkOutPunch;
                          const globalIdx = (dailyPage - 1) * (dailyPageSize || visibleDailyRows.length) + idx + 1;

                          return (
                            <tr
                              key={emp.id}
                              className="hover:bg-indigo-50/40 dark:hover:bg-slate-700/30 transition-colors"
                            >
                              <td className="py-1.5 px-2.5 text-center text-slate-400 font-mono text-[10px]">
                                {globalIdx}
                              </td>
                              <td className="py-1.5 px-2.5">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {emp.fullName}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono mr-1.5">
                                  (#{emp.employeeNumber})
                                </span>
                              </td>
                              <td className="py-1.5 px-2.5 text-slate-600 dark:text-slate-300 text-[10px]">
                                {emp.department}
                              </td>
                              <td className="py-1.5 px-2.5 text-center font-mono font-bold text-emerald-700 dark:text-emerald-300">
                                {checkIn ? checkIn.time : '—'}
                              </td>
                              <td className="py-1.5 px-2.5 text-center font-mono font-bold text-blue-700 dark:text-blue-300">
                                {checkOut ? checkOut.time : '—'}
                              </td>
                              <td className="py-1.5 px-2.5 text-center">
                                {row.status === 'on_time' && (
                                  <span className="px-2 py-0.2 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    حاضر
                                  </span>
                                )}
                                {row.status === 'late' && (
                                  <span className="px-2 py-0.2 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                    تأخير
                                  </span>
                                )}
                                {row.status === 'leave_authorized' && (
                                  <span className="px-2 py-0.2 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                    إجازة
                                  </span>
                                )}
                                {row.status === 'absent' && (
                                  <span className="px-2 py-0.2 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                    غائب
                                  </span>
                                )}
                              </td>
                              <td className="py-1.5 px-2.5 text-center font-mono font-bold text-amber-600">
                                {row.lateMinutes > 0 ? `${row.lateMinutes}د` : '0'}
                              </td>
                              <td className="py-1.5 px-2.5 text-[10px] text-slate-500 truncate max-w-[120px]">
                                {checkIn?.deviceName || '—'}
                              </td>
                              <td className="py-1.5 px-2.5 text-center no-print">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      soundEffects.playButtonClick();
                                      setSelectedEmpPunches({
                                        employee: emp,
                                        date: selectedDate,
                                        punches: row.allPunches,
                                      });
                                    }}
                                    className="px-1.5 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-bold cursor-pointer"
                                    title="عرض سجل حركات الموظف"
                                  >
                                    سجل
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      soundEffects.playButtonClick();
                                      setManualPunchEmployee(emp);
                                    }}
                                    className="px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-bold cursor-pointer"
                                    title="توثيق يدوي"
                                  >
                                    يدوي
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* STANDARD DETAILED TABLE MODE */
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-bold">
                        <th className="p-3 w-12 text-center">#</th>
                        <th className="p-3">اسم الموظف الرباعي</th>
                        <th className="p-3">الرقم الوظيفي</th>
                        <th className="p-3">القسم / التشكيل</th>
                        <th className="p-3 text-center">الحضور (Check-in)</th>
                        <th className="p-3 text-center">الانصراف (Check-out)</th>
                        <th className="p-3 text-center">حالة البصمة</th>
                        <th className="p-3 text-center">التأخير (دقيقة)</th>
                        <th className="p-3">الجهاز المستعمل</th>
                        <th className="p-3 text-center no-print">سجل وإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                      {visibleDailyRows.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-slate-500">
                            <div className="max-w-xs mx-auto space-y-2">
                              <Fingerprint className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                              <p className="font-bold text-xs">لا توجد حركات بصمة مطابقة للشروط المحددة.</p>
                              <button
                                type="button"
                                onClick={handleGenerateDemoAudit}
                                className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold text-xs transition-colors cursor-pointer"
                              >
                                توليد كشف بصمة تجريبي لليوم
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedDailyRows.map((row, idx) => {
                          const emp = row.employee;
                          const checkIn = row.checkInPunch;
                          const checkOut = row.checkOutPunch;
                          const globalIdx = (dailyPage - 1) * (dailyPageSize || visibleDailyRows.length) + idx + 1;

                          return (
                            <tr
                              key={emp.id}
                              className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                            >
                              <td className="p-3 text-center text-slate-400 font-mono text-[11px]">
                                {globalIdx}
                              </td>

                              {/* Employee Name */}
                              <td className="p-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundEffects.playButtonClick();
                                    setSelectedEmpPunches({
                                      employee: emp,
                                      date: selectedDate,
                                      punches: row.allPunches,
                                    });
                                  }}
                                  className="text-right hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-slate-900 dark:text-white transition-colors cursor-pointer"
                                  title="انقر لعرض سجل حركات الموظف الكامل"
                                >
                                  {emp.fullName}
                                </button>
                                <div className="text-[10px] text-slate-500">{emp.jobTitle}</div>
                              </td>

                              {/* Employee Number & Biometric ID */}
                              <td className="p-3 font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                                <div>{emp.employeeNumber}</div>
                                {emp.biometricEnrollmentId && (
                                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400">
                                    PIN: #{emp.biometricEnrollmentId}
                                  </span>
                                )}
                              </td>

                              {/* Department */}
                              <td className="p-3 text-slate-600 dark:text-slate-400 text-[11px]">
                                {emp.department}
                              </td>

                              {/* Check In */}
                              <td className="p-3 text-center font-mono">
                                {checkIn ? (
                                  <span className="px-2 py-0.5 rounded-md font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                                    {checkIn.time}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600">—</span>
                                )}
                              </td>

                              {/* Check Out */}
                              <td className="p-3 text-center font-mono">
                                {checkOut ? (
                                  <span className="px-2 py-0.5 rounded-md font-bold text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800">
                                    {checkOut.time}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600">—</span>
                                )}
                              </td>

                              {/* Status */}
                              <td className="p-3 text-center">
                                {row.status === 'on_time' && (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    ✅ في الوقت
                                  </span>
                                )}
                                {row.status === 'late' && (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                    ⚠️ متأخر صباحياً
                                  </span>
                                )}
                                {row.status === 'leave_authorized' && (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                    🏖️ مجاز رسمياً
                                  </span>
                                )}
                                {row.status === 'absent' && (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                    ❌ لم يسجل بصمة
                                  </span>
                                )}
                              </td>

                              {/* Late Minutes */}
                              <td className="p-3 text-center font-mono">
                                {row.lateMinutes > 0 ? (
                                  <span className="font-bold text-amber-600 dark:text-amber-400">
                                    {row.lateMinutes} د
                                  </span>
                                ) : (
                                  <span className="text-slate-400">0</span>
                                )}
                              </td>

                              {/* Device Used */}
                              <td className="p-3 text-[11px] text-slate-600 dark:text-slate-300">
                                {checkIn ? (
                                  <div className="flex items-center gap-1.5">
                                    {checkIn.verificationType === 'face' ? (
                                      <ScanFace className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                    ) : checkIn.verificationType === 'card' ? (
                                      <CreditCard className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                    ) : (
                                      <Fingerprint className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    )}
                                    <span className="truncate max-w-[140px]">{checkIn.deviceName}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">لا توجد بصمة</span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="p-3 text-center no-print">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      soundEffects.playButtonClick();
                                      setSelectedEmpPunches({
                                        employee: emp,
                                        date: selectedDate,
                                        punches: row.allPunches,
                                      });
                                    }}
                                    className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-bold transition-colors cursor-pointer"
                                    title="عرض سجل حركات الموظف الكامل"
                                  >
                                    السجل
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      soundEffects.playButtonClick();
                                      setManualPunchEmployee(emp);
                                    }}
                                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 text-[10px] font-bold transition-colors cursor-pointer"
                                    title="تسجيل حركة بصمة يدوية للموظف"
                                  >
                                    توثيق يدوي
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Control for Daily */}
              {visibleDailyRows.length > 0 && (
                <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 no-print">
                  <PaginationControl
                    currentPage={dailyPage}
                    totalItems={visibleDailyRows.length}
                    pageSize={dailyPageSize}
                    onPageChange={setDailyPage}
                    onPageSizeChange={setDailyPageSize}
                    pageSizeOptions={[10, 20, 50, 100, 0]}
                    itemLabel="موظفاً"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: WEEKLY AUDIT */}
        {viewMode === 'weekly' && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-violet-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-white">
                    الكشف الأسبوعي لأيام الدوام الرسمي (الأحد — الخميس)
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span>الأسبوع: {weeklyDays[0]?.dateStr} إلى {weeklyDays[4]?.dateStr}</span>
                  <span className="font-mono text-violet-600 dark:text-violet-400 font-bold">
                    الصفحة {weeklyPage} من {Math.max(1, Math.ceil(weeklyAuditRows.length / (weeklyPageSize || weeklyAuditRows.length || 1)))}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-bold">
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3">الموظف</th>
                      <th className="p-3">القسم</th>
                      {weeklyDays.map((wd) => (
                        <th key={wd.dateStr} className="p-3 text-center">
                          <div>{wd.dayName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{wd.dateStr.slice(5)}</div>
                        </th>
                      ))}
                      <th className="p-3 text-center">أيام الحضور</th>
                      <th className="p-3 text-center">مجموع التأخير</th>
                      <th className="p-3 text-center">الالتزام</th>
                      <th className="p-3 text-center no-print">السجل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                    {weeklyAuditRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-6 text-center text-slate-500 font-bold">
                          لا توجد بيانات موظفين مطابقة.
                        </td>
                      </tr>
                    ) : (
                      paginatedWeeklyRows.map((r, idx) => {
                        const globalIdx = (weeklyPage - 1) * (weeklyPageSize || weeklyAuditRows.length) + idx + 1;
                        return (
                          <tr key={r.employee.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                            <td className="p-3 text-center text-slate-400 font-mono text-[11px]">{globalIdx}</td>
                            <td className="p-3">
                              <div className="font-bold text-slate-900 dark:text-white">{r.employee.fullName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{r.employee.employeeNumber}</div>
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400 text-[11px]">{r.employee.department}</td>

                            {/* Day 1 to 5 status chips */}
                            {r.dayDetails.map((dd) => (
                              <td key={dd.dateStr} className="p-2 text-center">
                                {dd.status === 'on_time' && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono">
                                    {dd.checkIn?.time.slice(0, 5)}
                                  </span>
                                )}
                                {dd.status === 'late' && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-mono">
                                    {dd.checkIn?.time.slice(0, 5)} (+{dd.lateMinutes}د)
                                  </span>
                                )}
                                {dd.status === 'leave_authorized' && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                    إجازة
                                  </span>
                                )}
                                {dd.status === 'absent' && (
                                  <span className="text-rose-400 text-[11px] font-bold">غائب</span>
                                )}
                              </td>
                            ))}

                            {/* Weekly summary */}
                            <td className="p-3 text-center font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                              {r.daysPresentCount} / 5
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-amber-600">
                              {r.totalLateMins > 0 ? `${r.totalLateMins} د` : '—'}
                            </td>
                            <td className="p-3 text-center font-mono font-bold">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] ${
                                  r.weeklyScorePercent >= 90
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : r.weeklyScorePercent >= 70
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}
                              >
                                {r.weeklyScorePercent}%
                              </span>
                            </td>
                            <td className="p-3 text-center no-print">
                              <button
                                type="button"
                                onClick={() => {
                                  soundEffects.playButtonClick();
                                  const empPunches = allPunchLogs.filter((p) => p.employeeId === r.employee.id);
                                  setSelectedEmpPunches({
                                    employee: r.employee,
                                    date: `الأسبوع الحالي (${weeklyDays[0]?.dateStr})`,
                                    punches: empPunches,
                                  });
                                }}
                                className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-bold transition-colors cursor-pointer"
                              >
                                السجل
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Control for Weekly */}
              {weeklyAuditRows.length > 0 && (
                <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 no-print">
                  <PaginationControl
                    currentPage={weeklyPage}
                    totalItems={weeklyAuditRows.length}
                    pageSize={weeklyPageSize}
                    onPageChange={setWeeklyPage}
                    onPageSizeChange={setWeeklyPageSize}
                    pageSizeOptions={[10, 20, 50, 100, 0]}
                    itemLabel="موظفاً"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: MONTHLY AUDIT */}
        {viewMode === 'monthly' && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800 dark:text-white">
                    شيت البصمة الشهري التراكمي ({selectedMonth})
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 font-semibold">
                  <span>حساب الأيام الفعلية والإجازات والتأخير</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    الصفحة {monthlyPage} من {Math.max(1, Math.ceil(monthlyAuditRows.length / (monthlyPageSize || monthlyAuditRows.length || 1)))}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-bold">
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3">اسم الموظف</th>
                      <th className="p-3">الرقم الوظيفي</th>
                      <th className="p-3">القسم</th>
                      <th className="p-3 text-center">أيام الحضور الفعلية</th>
                      <th className="p-3 text-center">في الوقت الرسمي</th>
                      <th className="p-3 text-center">أيام التأخير</th>
                      <th className="p-3 text-center">إجمالي دقائق التأخير</th>
                      <th className="p-3 text-center">الإجازات المطابقة</th>
                      <th className="p-3 text-center">نسبة الالتزام</th>
                      <th className="p-3 text-center no-print">السجل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                    {monthlyAuditRows.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-6 text-center text-slate-500 font-bold">
                          لا توجد بيانات موظفين مطابقة.
                        </td>
                      </tr>
                    ) : (
                      paginatedMonthlyRows.map((r, idx) => {
                        const globalIdx = (monthlyPage - 1) * (monthlyPageSize || monthlyAuditRows.length) + idx + 1;
                        return (
                          <tr key={r.employee.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                            <td className="p-3 text-center text-slate-400 font-mono text-[11px]">{globalIdx}</td>
                            <td className="p-3 font-bold text-slate-900 dark:text-white">{r.employee.fullName}</td>
                            <td className="p-3 font-mono text-slate-500 text-[11px]">{r.employee.employeeNumber}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-400 text-[11px]">{r.employee.department}</td>
                            <td className="p-3 text-center font-mono font-bold text-indigo-700 dark:text-indigo-300">
                              {r.totalActualPunchedDays} يوم
                            </td>
                            <td className="p-3 text-center font-mono text-emerald-600 font-bold">{r.onTimeDays}</td>
                            <td className="p-3 text-center font-mono text-amber-600 font-bold">{r.lateDays}</td>
                            <td className="p-3 text-center font-mono font-bold text-amber-700 dark:text-amber-400">
                              {r.totalLateMins > 0 ? `${r.totalLateMins} د` : '—'}
                            </td>
                            <td className="p-3 text-center font-mono text-purple-600 font-bold">{r.leaveDays}</td>
                            <td className="p-3 text-center font-mono font-bold">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] ${
                                  r.attendancePercent >= 90
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : r.attendancePercent >= 75
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}
                              >
                                {r.attendancePercent}%
                              </span>
                            </td>
                            <td className="p-3 text-center no-print">
                              <button
                                type="button"
                                onClick={() => {
                                  soundEffects.playButtonClick();
                                  const empMonthPunches = allPunchLogs.filter(
                                    (p) => p.employeeId === r.employee.id && p.date.startsWith(selectedMonth)
                                  );
                                  setSelectedEmpPunches({
                                    employee: r.employee,
                                    date: `شهر (${selectedMonth})`,
                                    punches: empMonthPunches,
                                  });
                                }}
                                className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-bold transition-colors cursor-pointer"
                              >
                                السجل ({r.punchesCount})
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Control for Monthly */}
              {monthlyAuditRows.length > 0 && (
                <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 no-print">
                  <PaginationControl
                    currentPage={monthlyPage}
                    totalItems={monthlyAuditRows.length}
                    pageSize={monthlyPageSize}
                    onPageChange={setMonthlyPage}
                    onPageSizeChange={setMonthlyPageSize}
                    pageSizeOptions={[10, 20, 50, 100, 0]}
                    itemLabel="موظفاً"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 4: RAW LOGS AUDIT */}
        {viewMode === 'raw_logs' && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-white">
                    السجل التفصيلي لحركات البصمة المسحوبة من الأجهزة
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    (إجمالي الحركات: {filteredRawLogs.length} حركة)
                  </span>
                </div>
                <div className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-bold">
                  الصفحة {rawPage} من {Math.max(1, Math.ceil(filteredRawLogs.length / (rawPageSize || filteredRawLogs.length || 1)))}
                </div>
              </div>

              {/* Compact vs Standard for Raw Logs */}
              <div className="overflow-x-auto">
                <table className={`w-full text-right ${tableLayoutMode === 'compact' ? 'text-[11px]' : 'text-xs'}`}>
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-bold">
                      <th className="p-2.5 w-12 text-center">#</th>
                      <th className="p-2.5">اسم الموظف</th>
                      <th className="p-2.5">الرقم الوظيفي</th>
                      <th className="p-2.5">القسم</th>
                      <th className="p-2.5 text-center">التاريخ والوقت</th>
                      <th className="p-2.5 text-center">نوع الحركة</th>
                      <th className="p-2.5 text-center">طريقة البصمة</th>
                      <th className="p-2.5">جهاز البصمة</th>
                      <th className="p-2.5">ملاحظات التحقق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                    {filteredRawLogs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-6 text-center text-slate-500">
                          لا توجد حركات بصمة مسجلة مطابقة للفلتر.
                        </td>
                      </tr>
                    ) : (
                      paginatedRawLogs.map((p, idx) => {
                        const globalIdx = (rawPage - 1) * (rawPageSize || filteredRawLogs.length) + idx + 1;
                        return (
                          <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                            <td className="p-2.5 text-center text-slate-400 font-mono text-[11px]">{globalIdx}</td>
                            <td className="p-2.5 font-bold text-slate-900 dark:text-white">{p.employeeName}</td>
                            <td className="p-2.5 font-mono text-slate-500 text-[11px]">{p.employeeNumber}</td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-400 text-[11px]">{p.department}</td>
                            <td className="p-2.5 text-center font-mono">
                              <span className="text-slate-900 dark:text-white font-bold">{p.date}</span>{' '}
                              <span className="text-indigo-600 font-bold">{p.time}</span>
                            </td>
                            <td className="p-2.5 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  p.punchType === 'check_in'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                }`}
                              >
                                {p.punchType === 'check_in' ? 'حضور صباحي' : 'انصراف مسائي'}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <span className="text-[11px] text-slate-700 dark:text-slate-300">
                                {p.verificationType === 'face'
                                  ? 'بصمة وجه'
                                  : p.verificationType === 'card'
                                  ? 'بطاقة ذكية'
                                  : 'بصمة إصبع'}
                              </span>
                            </td>
                            <td className="p-2.5 text-[11px] text-slate-600 dark:text-slate-400">
                              {p.deviceName}
                            </td>
                            <td className="p-2.5 text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                              {p.notes || '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Control for Raw Logs */}
              {filteredRawLogs.length > 0 && (
                <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 no-print">
                  <PaginationControl
                    currentPage={rawPage}
                    totalItems={filteredRawLogs.length}
                    pageSize={rawPageSize}
                    onPageChange={setRawPage}
                    onPageSizeChange={setRawPageSize}
                    pageSizeOptions={[10, 20, 50, 100, 0]}
                    itemLabel="حركة بصمة"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: EMPLOYEE COMPLETE PUNCH TIMELINE (سجل حركات البصمة الكامل للموظف) */}
      {selectedEmpPunches && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
          dir="rtl"
        >
          <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-2xl my-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    سجل حركات البصمة للموظف: {selectedEmpPunches.employee.fullName}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {selectedEmpPunches.employee.jobTitle} • {selectedEmpPunches.employee.department} • الرقم: {selectedEmpPunches.employee.employeeNumber}
                    {selectedEmpPunches.employee.biometricEnrollmentId && ` • PIN: #${selectedEmpPunches.employee.biometricEnrollmentId}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEffects.playButtonClick();
                  setSelectedEmpPunches(null);
                }}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Punches Timeline */}
            <div className="max-h-[60vh] overflow-y-auto space-y-2.5 pr-1">
              {selectedEmpPunches.punches.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                  <Fingerprint className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="font-bold text-xs">لا توجد حركات بصمة مسجلة لهذا الموظف في ({selectedEmpPunches.date}).</p>
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playButtonClick();
                      setManualPunchEmployee(selectedEmpPunches.employee);
                      setSelectedEmpPunches(null);
                    }}
                    className="mt-3 px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs cursor-pointer"
                  >
                    تسجيل بصمة يدوية الآن
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center justify-between">
                    <span>حركات البصمة الموثقة في المنظومة ({selectedEmpPunches.punches.length} حركة):</span>
                    <span className="font-mono">{selectedEmpPunches.date}</span>
                  </div>
                  {selectedEmpPunches.punches.map((p, pIdx) => (
                    <div
                      key={p.id || pIdx}
                      className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                            p.punchType === 'check_in'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          }`}
                        >
                          {p.punchType === 'check_in' ? 'ح' : 'ص'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{p.punchType === 'check_in' ? 'حضور صباحي (Check-in)' : 'انصراف مسائي (Check-out)'}</span>
                            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-black text-sm">
                              {p.time}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>جهاز: {p.deviceName}</span>
                            <span>•</span>
                            <span>IP: {p.deviceIp || '192.168.1.x'}</span>
                            <span>•</span>
                            <span>
                              طريقة التحقق:{' '}
                              {p.verificationType === 'face'
                                ? 'بصمة وجه Face ID'
                                : p.verificationType === 'card'
                                ? 'بطاقة ذكية'
                                : 'بصمة إصبع'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-left">
                        {p.status === 'late' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200">
                            متأخر (+{p.lateMinutes} د)
                          </span>
                        )}
                        {p.status === 'on_time' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                            في الوقت الرسمي
                          </span>
                        )}
                        {p.status === 'leave_authorized' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                            إجازة رسمية
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  soundEffects.playButtonClick();
                  setManualPunchEmployee(selectedEmpPunches.employee);
                  setSelectedEmpPunches(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-xs font-bold transition-colors cursor-pointer"
              >
                + إضافة حركة بصمة يدوية
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEffects.playButtonClick();
                  setSelectedEmpPunches(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: USB FLASH FILE IMPORT */}
      {isUsbImportOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
          dir="rtl"
        >
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-2xl my-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    استيراد حركات البصمة من فلاش ميموري (USB Flash)
                  </h3>
                  <p className="text-[11px] text-slate-500">يدعم ملفات ZKTeco (attlog.dat) و CSV و Excel</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUsbImportOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  اختر ملف البصمة من القرص:
                </label>
                <input
                  type="file"
                  accept=".dat,.csv,.txt,.log"
                  onChange={handleUsbFileSelected}
                  className="w-full text-xs text-slate-500 file:mr-0 file:ml-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  أو الصق أسطر السجل مباشرة:
                </label>
                <textarea
                  rows={6}
                  value={usbFileText}
                  onChange={(e) => setUsbFileText(e.target.value)}
                  placeholder="مثال: 101	2026-10-06 08:15:30	1	1	0..."
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-[11px] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsUsbImportOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleProcessUsbImport}
                disabled={isImportingUsb}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isImportingUsb ? 'جارٍ التحليل...' : 'بدء الاستيراد والمطابقة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: MANUAL PUNCH ENTRY */}
      {manualPunchEmployee && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
          dir="rtl"
        >
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-2xl my-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  توثيق حركة بصمة يدوية للموظف
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setManualPunchEmployee(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveManualPunch} className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60">
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  {manualPunchEmployee.fullName}
                </div>
                <div className="text-[11px] text-slate-500">
                  {manualPunchEmployee.employeeNumber} • {manualPunchEmployee.department}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  نوع الحركة:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualPunchType('check_in')}
                    className={`py-2 rounded-xl font-bold border text-xs transition-colors cursor-pointer ${
                      manualPunchType === 'check_in'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    حضور صباحي
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualPunchType('check_out')}
                    className={`py-2 rounded-xl font-bold border text-xs transition-colors cursor-pointer ${
                      manualPunchType === 'check_out'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    انصراف مسائي
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  التوقيت (ساعة : دقيقة):
                </label>
                <input
                  type="time"
                  value={manualPunchTime}
                  onChange={(e) => setManualPunchTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  سبب التوثيق اليدوي / ملاحظة إدارية:
                </label>
                <input
                  type="text"
                  value={manualPunchNote}
                  onChange={(e) => setManualPunchNote(e.target.value)}
                  placeholder="مثال: نسيان الباج / بصمة طارئة بموافقة مدير القسم..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setManualPunchEmployee(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingManualPunch}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSavingManualPunch ? 'جارٍ الحفظ...' : 'تأكيد وحفظ البصمة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. OFFICIAL A4 PRINT MODAL */}
      {isPrintModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs overflow-y-auto"
          dir="rtl"
        >
          <div className="relative w-full max-w-4xl rounded-3xl bg-white p-6 sm:p-8 text-slate-900 shadow-2xl my-auto space-y-6">
            <div className="flex items-center justify-between no-print border-b pb-3">
              <span className="font-bold text-sm text-indigo-800">معاينة كشف البصمة الرسمي A4</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة فورية</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* A4 Printable Sheet */}
            <div className="space-y-4 text-xs font-sans">
              {/* Header */}
              <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm">جمهورية العراق</div>
                  <div className="font-bold text-xs">{organization.ministryName}</div>
                  <div className="font-extrabold text-sm text-indigo-900">{organization.directorateName}</div>
                  <div className="text-[11px] text-slate-600">
                    {selectedDepartment === 'all' ? 'كافة الأقسام والشعب الهندسية' : selectedDepartment}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-black">كشف البصمة وحضور الكوادر</div>
                  <div className="text-xs font-semibold text-slate-700">
                    تاريخ الكشف: <span className="font-mono font-bold">{selectedDate}</span>
                  </div>
                </div>

                <div className="text-left font-mono text-[11px] text-slate-600">
                  <div>سنة التشغيل: 2026</div>
                  <div>وقت الطباعة: {new Date().toLocaleTimeString('ar-IQ')}</div>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-4 gap-2 text-center bg-slate-100 p-2.5 rounded-xl font-bold text-xs">
                <div>إجمالي الكادر: {dailyMetrics.total}</div>
                <div className="text-emerald-700">حاضرون بالبصمة: {dailyMetrics.present}</div>
                <div className="text-amber-700">متأخرون: {dailyMetrics.late} ({dailyMetrics.totalLateMinutes} دقيقة)</div>
                <div className="text-rose-700">لم يبصم: {dailyMetrics.absent}</div>
              </div>

              {/* Table */}
              <table className="w-full text-right border-collapse border border-slate-300 text-[11px]">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-300">
                    <th className="p-2 border border-slate-300 text-center w-8">ت</th>
                    <th className="p-2 border border-slate-300">اسم الموظف</th>
                    <th className="p-2 border border-slate-300">الرقم الوظيفي</th>
                    <th className="p-2 border border-slate-300">القسم</th>
                    <th className="p-2 border border-slate-300 text-center">وقت الحضور</th>
                    <th className="p-2 border border-slate-300 text-center">وقت الانصراف</th>
                    <th className="p-2 border border-slate-300 text-center">الحالة</th>
                    <th className="p-2 border border-slate-300 text-center">التأخير</th>
                    <th className="p-2 border border-slate-300">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleDailyRows.map((r, i) => (
                    <tr key={r.employee.id} className="border-b border-slate-200">
                      <td className="p-1.5 border border-slate-300 text-center font-mono">{i + 1}</td>
                      <td className="p-1.5 border border-slate-300 font-bold">{r.employee.fullName}</td>
                      <td className="p-1.5 border border-slate-300 font-mono">{r.employee.employeeNumber}</td>
                      <td className="p-1.5 border border-slate-300">{r.employee.department}</td>
                      <td className="p-1.5 border border-slate-300 text-center font-mono">
                        {r.checkInPunch?.time || '—'}
                      </td>
                      <td className="p-1.5 border border-slate-300 text-center font-mono">
                        {r.checkOutPunch?.time || '—'}
                      </td>
                      <td className="p-1.5 border border-slate-300 text-center font-bold">
                        {r.status === 'on_time'
                          ? 'حاضر'
                          : r.status === 'late'
                          ? 'متأخر'
                          : r.status === 'leave_authorized'
                          ? 'إجازة'
                          : 'لم يبصم'}
                      </td>
                      <td className="p-1.5 border border-slate-300 text-center font-mono">
                        {r.lateMinutes > 0 ? `${r.lateMinutes} د` : '—'}
                      </td>
                      <td className="p-1.5 border border-slate-300 text-[10px]">{r.checkInPunch?.notes || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures */}
              <div className="pt-8 grid grid-cols-3 gap-6 text-center font-bold text-xs">
                <div>
                  <div>مسؤول شعبة البصمة والدوام</div>
                  <div className="mt-8">التوقيع: ..........................</div>
                </div>
                <div>
                  <div>مدقق الحركات الإدارية</div>
                  <div className="mt-8">التوقيع: ..........................</div>
                </div>
                <div>
                  <div>مدير قسم الموارد البشرية</div>
                  <div className="mt-8">التوقيع: ..........................</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. REAL DEVICE DETECTION & HARDWARE MANAGEMENT MODAL */}
      {deviceDetectionModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
          dir="rtl"
        >
          <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/20 shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      منظومة كشف ومطابقة أجهزة البصمة الحقيقية
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 font-bold border border-cyan-200 dark:border-cyan-800">
                      فحص حقيقي للشبكة والـ USB
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    التحقق المباشر من اتصال أجهزة البصمة عبر TCP/IP وUSB، تغيير الآي بي، والربط بأقسام الدائرة
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDeviceDetectionModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
              {/* Summary Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5 font-semibold">
                      إجمالي الأجهزة المسجلة
                    </span>
                    <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                      {devices.length}
                    </span>
                  </div>
                  <Network className="w-6 h-6 text-indigo-500" />
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block mb-0.5 font-semibold">
                      الأجهزة المربوطة بنجاح
                    </span>
                    <span className="text-xl font-bold font-mono text-emerald-800 dark:text-emerald-300">
                      {devices.filter((d) => d.status === 'online').length}
                    </span>
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-rose-700 dark:text-rose-400 block mb-0.5 font-semibold">
                      تنبيه: أجهزة غير مربوطة
                    </span>
                    <span className="text-xl font-bold font-mono text-rose-800 dark:text-rose-300">
                      {devices.filter((d) => d.status !== 'online').length}
                    </span>
                  </div>
                  <AlertOctagon className="w-6 h-6 text-rose-600" />
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDetectBiometricDevices}
                    disabled={isDetectingDevices}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    <Activity className={`w-3.5 h-3.5 ${isDetectingDevices ? 'animate-spin' : ''}`} />
                    <span>{isDetectingDevices ? 'جارٍ الكشف الحقيقي...' : 'إعادة الكشف الشامل الحقيقي'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingDevice(null);
                      setIsDeviceModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة جهاز بصمة جديد</span>
                  </button>
                </div>

                {detectionReport && (
                  <div
                    className={`text-[11px] px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 ${
                      detectionReport.hasConnected
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}
                  >
                    <span>{detectionReport.message}</span>
                  </div>
                )}
              </div>

              {/* BACKGROUND JOB MONITORING PANEL */}
              <BiometricBackgroundJobBanner />

              {/* Devices Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {devices.map((device) => {
                  const isOnline = device.status === 'online';
                  return (
                    <div
                      key={device.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 ${
                        isOnline
                          ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-300 dark:border-emerald-800/80 shadow-2xs'
                          : 'bg-rose-50/20 dark:bg-rose-950/10 border-rose-300 dark:border-rose-900/60 shadow-2xs'
                      }`}
                    >
                      {/* Device Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              isOnline
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {device.deviceType === 'face' ? (
                              <ScanFace className="w-5 h-5" />
                            ) : device.connectionType === 'usb_direct' ? (
                              <Laptop className="w-5 h-5" />
                            ) : (
                              <Fingerprint className="w-5 h-5" />
                            )}
                          </div>

                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                              {device.name}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <span className="font-semibold">{device.model || 'Standard'}</span>
                              <span>·</span>
                              <span className="capitalize">{device.brand}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold font-mono flex items-center gap-1.5 ${
                            isOnline
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                            }`}
                          />
                          <span>
                            {isOnline
                              ? `متصل (${device.lastPingLatencyMs || 2}ms)`
                              : '⚠️ تنبيه: غير مربوط'}
                          </span>
                        </div>
                      </div>

                      {/* Device Network & Department Details */}
                      <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">العنوان والمنفذ:</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                            {device.ipAddress}:{device.port}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">طريقة التوصيل:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {device.connectionType === 'usb_direct'
                              ? 'كابل USB مباشر بالحاسبة'
                              : device.connectionType === 'wifi'
                              ? 'شبكة لاسلكية Wi-Fi'
                              : 'شبكة سلكية LAN (TCP/IP)'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">القسم المرتبط:</span>
                          <span className="font-semibold text-indigo-700 dark:text-indigo-400">
                            {device.departmentName || 'المدخل العام والمصاعد'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">موقع التثبيت:</span>
                          <span className="text-slate-700 dark:text-slate-300">
                            {device.location || 'الاستقبال المركزي'}
                          </span>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPingModalDevice(device)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-[11px] text-slate-800 dark:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                            title="فحص البينغ واستجابة الجهاز بالملي ثانية"
                          >
                            <Activity className="w-3 h-3 text-indigo-500" />
                            <span>فحص البينغ</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingDevice(device);
                              setIsDeviceModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 font-bold text-[11px] text-indigo-700 dark:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer"
                            title="تعديل عنوان الآي بي والقسم"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>تعديل</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteDevice(device.id, device.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="حذف الجهاز نهائياً"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                يتم حفظ كافة التغييرات وحالات الأجهزة تلقائياً في قاعدة البيانات وتحديث سجل الأقسام
              </span>
              <button
                type="button"
                onClick={() => setDeviceDetectionModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. BIOMETRIC DEVICE EDIT / CREATE MODAL */}
      {isDeviceModalOpen && (
        <BiometricDeviceModal
          isOpen={isDeviceModalOpen}
          onClose={() => setIsDeviceModalOpen(false)}
          deviceToEdit={editingDevice}
          departments={departments || []}
          onDeviceSaved={async () => {
            await loadData();
            soundEffects.playSuccess();
          }}
        />
      )}

      {/* 10. REAL PING DIAGNOSTIC MODAL */}
      {pingModalDevice && (
        <BiometricPingModal
          isOpen={Boolean(pingModalDevice)}
          onClose={() => setPingModalDevice(null)}
          device={pingModalDevice}
          onPingCompleted={async () => {
            await loadData();
          }}
        />
      )}
    </div>
  );
};
