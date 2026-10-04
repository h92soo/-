import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  QrCode,
  Scan,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Printer,
  Search,
  Volume2,
  VolumeX,
  History,
  ShieldCheck,
  User,
  ArrowRight,
  ExternalLink,
  Fingerprint,
  ScanFace,
  Network,
  Activity,
  Laptop,
  Plus,
  Edit2,
  Trash2,
  Download,
  Filter,
  RefreshCw,
  Zap,
  Building2,
  FileSpreadsheet,
  FileText,
  Radio,
  Eye,
  Calendar,
} from 'lucide-react';
import {
  Employee,
  BarcodeScanLog,
  OrganizationSettings,
  BiometricDevice,
  BiometricPunchRecord,
  UserAccount,
  LeaveRulesSettings,
  Department,
} from '../types';
import { employeeService } from '../services/employeeService';
import { biometricService } from '../services/biometricService';
import { soundEffects } from '../utils/soundEffects';
import { BarcodeVisual, QrVisual } from './BarcodeVisual';
import { EmployeeBadgeModal } from './EmployeeBadgeModal';
import { BiometricDeviceModal } from './BiometricDeviceModal';
import { BiometricPingModal } from './BiometricPingModal';
import { saveAttendanceLogsBatch } from '../db/indexedDB';
import { toast } from './ToastNotification';
import { PaginationControl } from './PaginationControl';

interface BarcodeAttendanceHubProps {
  organization: OrganizationSettings;
  onOpenEmployeeProfile?: (employeeId: string) => void;
  onBackToDashboard?: () => void;
  employees?: Employee[];
  currentUser?: UserAccount;
  leaveRules?: LeaveRulesSettings;
}

type ActiveHubTab = 'devices' | 'biometric_logs' | 'biometric_stats' | 'barcode_scanner';

export const BarcodeAttendanceHub: React.FC<BarcodeAttendanceHubProps> = ({
  organization,
  onOpenEmployeeProfile,
  onBackToDashboard,
  employees: propEmployees,
  currentUser,
  leaveRules,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveHubTab>('devices');

  // Biometric Devices state
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState<boolean>(true);
  const [deviceModalOpen, setDeviceModalOpen] = useState<boolean>(false);
  const [editingDevice, setEditingDevice] = useState<BiometricDevice | null>(null);
  const [pingModalDevice, setPingModalDevice] = useState<BiometricDevice | null>(null);
  const [isDetectingUsb, setIsDetectingUsb] = useState<boolean>(false);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [syncingDeviceId, setSyncingDeviceId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Instant Sync & Audit Report Modal State (Plug & Play reports)
  const [lastSyncResult, setLastSyncResult] = useState<{
    device: BiometricDevice;
    importedCount: number;
    matchedEmployeesCount: number;
    summary: {
      onTimeCount: number;
      lateCount: number;
      leaveAuthorizedCount: number;
    };
    newPunches: BiometricPunchRecord[];
  } | null>(null);
  const [showSyncReportModal, setShowSyncReportModal] = useState<boolean>(false);

  // Biometric Punch Logs state
  const [biometricLogs, setBiometricLogs] = useState<BiometricPunchRecord[]>([]);
  const [selectedDeviceFilter, setSelectedDeviceFilter] = useState<string>('all');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [logDateFilter, setLogDateFilter] = useState<'all' | 'today' | 'last_7_days'>('all');

  // Logs Pagination
  const [logPage, setLogPage] = useState<number>(1);
  const [logPageSize, setLogPageSize] = useState<number>(15);

  // Barcode Scanning & Badges state (Original features preserved & enhanced)
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanType, setScanType] = useState<'attendance_checkin' | 'attendance_checkout' | 'search_profile'>('attendance_checkin');
  const [lastScannedEmployee, setLastScannedEmployee] = useState<Employee | null>(null);
  const [lastScanResult, setLastScanResult] = useState<{
    status: 'success' | 'late' | 'unknown' | 'suspended';
    message: string;
    timestamp: string;
  } | null>(null);

  const [scanLogs, setScanLogs] = useState<BarcodeScanLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>(propEmployees || []);
  const [selectedBadgeEmployee, setSelectedBadgeEmployee] = useState<Employee | null>(null);
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'unprinted'>('all');
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState('');
  const [badgesPage, setBadgesPage] = useState<number>(1);
  const [badgesPageSize, setBadgesPageSize] = useState<number>(20);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Load initial devices and logs
  const loadInitialData = async () => {
    setIsLoadingDevices(true);
    try {
      const [allEmps, bLogs, devList, deptList] = await Promise.all([
        employeeService.getAll(),
        employeeService.getBarcodeLogs(25),
        biometricService.getDevices(),
        employeeService.getDepartments(),
      ]);
      setEmployees(allEmps);
      setScanLogs(bLogs);
      setDevices(devList);
      setDepartments(deptList);

      const pLogs = await biometricService.getBiometricLogs();
      setBiometricLogs(pLogs);
    } catch (err) {
      console.error('Failed to load initial biometric data:', err);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    const unsub = biometricService.subscribe((devs) => {
      setDevices(devs);
    });
    return () => unsub();
  }, []);

  // Update employees if prop changes
  useEffect(() => {
    if (propEmployees && propEmployees.length > 0) {
      setEmployees(propEmployees);
    }
  }, [propEmployees]);

  // Focus barcode input when on scanner tab
  useEffect(() => {
    if (activeTab === 'barcode_scanner' && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [activeTab]);

  // Handle Barcode Scan Execution
  const handleProcessBarcode = async (codeToProcess?: string) => {
    const code = (codeToProcess || barcodeInput).trim();
    if (!code) return;

    setBarcodeInput('');
    setIsScanning(true);

    try {
      const emp = await employeeService.getByBarcodeOrNumber(code);
      const now = new Date();
      const timeStr = now.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      if (!emp) {
        if (soundEnabled) soundEffects.playError();
        setLastScannedEmployee(null);
        setLastScanResult({
          status: 'unknown',
          message: `الرمز (${code}) غير مسجل في قاعدة بيانات المنظومة! يرجى التأكد من البطاقة.`,
          timestamp: timeStr,
        });
        return;
      }

      setLastScannedEmployee(emp);

      // Check Suspension
      if (emp.status === 'suspended') {
        if (soundEnabled) soundEffects.playError();
        setLastScanResult({
          status: 'suspended',
          message: `تنبيه: الموظف (${emp.fullName}) حالته موقوفة إدارياً ولا يمكن تسجيل دوامه حالياً.`,
          timestamp: timeStr,
        });
        return;
      }

      // Late calculation
      const isLate = scanType === 'attendance_checkin' && (currentHour > 8 || (currentHour === 8 && currentMinute > 30));

      if (isLate) {
        if (soundEnabled) soundEffects.playWarning();
        setLastScanResult({
          status: 'late',
          message: `تم تسجيل الحضور مع تنبيه: تأخير صباحي (${currentHour}:${currentMinute.toString().padStart(2, '0')}).`,
          timestamp: timeStr,
        });
      } else {
        if (soundEnabled) soundEffects.playSuccess();
        setLastScanResult({
          status: 'success',
          message:
            scanType === 'attendance_checkin'
              ? `تم تسجيل حضور الموظف (${emp.fullName}) بنجاح وفي الوقت المحدد!`
              : scanType === 'attendance_checkout'
              ? `تم تسجيل انصراف الموظف (${emp.fullName}) بنجاح!`
              : `تم العثور على إضبارة الموظف (${emp.fullName}) بنجاح.`,
          timestamp: timeStr,
        });
      }

      // Log Attendance
      const newLog: BarcodeScanLog = {
        id: `SCAN-${Date.now()}`,
        barcode: code,
        employeeId: emp.id,
        employeeName: emp.fullName,
        employeeNumber: emp.employeeNumber,
        department: emp.department,
        scanType,
        status: isLate ? 'late' : 'success',
        statusMessage: isLate ? 'تأخير صباحي' : 'حضور نظامي',
        soundType: isLate ? 'late' : 'success',
        scanTime: now.toISOString(),
      };

      await employeeService.addBarcodeLog(newLog);
      setScanLogs((prev) => [newLog, ...prev.slice(0, 24)]);
    } catch {
      toast.error('خطأ في معالجة الباركود');
    } finally {
      setIsScanning(false);
    }
  };

  // Connect to PC & Fetch Logs from a Device
  const handleConnectAndSyncDevice = async (device: BiometricDevice) => {
    setSyncingDeviceId(device.id);
    try {
      const result = await biometricService.connectAndSyncDevice(device, employees);
      const freshLogs = await biometricService.getBiometricLogs();
      setBiometricLogs(freshLogs);

      setLastSyncResult({
        device,
        importedCount: result.importedCount,
        matchedEmployeesCount: result.matchedEmployeesCount,
        summary: result.summary,
        newPunches: result.newPunches,
      });
      setShowSyncReportModal(true);

      toast.success(
        `تم ربط الجهاز (${device.name}) بالحاسبة بنجاح! تم سحب وتحديث (${result.importedCount}) بصمة حضور ومطابقتها مع شؤون الموظفين.`
      );
    } catch {
      toast.error(`تعذر الاتصال بالجهاز (${device.name})`);
    } finally {
      setSyncingDeviceId(null);
    }
  };

  // Sync All Devices
  const handleSyncAllDevices = async () => {
    setIsSyncingAll(true);
    let totalImported = 0;
    try {
      for (const dev of devices) {
        if (dev.status === 'online') {
          const res = await biometricService.connectAndSyncDevice(dev, employees);
          totalImported += res.importedCount;
        }
      }
      const freshLogs = await biometricService.getBiometricLogs();
      setBiometricLogs(freshLogs);
      toast.success(`تم سحب وتحديث (${totalImported}) حركة حضور من كافة أجهزة البصمة المربوطة بنجاح!`);
    } catch {
      toast.error('حدث خطأ أثناء المزامنة الشاملة');
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Detect USB Plug & Play Devices and immediately fetch comprehensive reports
  const handleDetectUsbDevices = async () => {
    setIsDetectingUsb(true);
    try {
      const res = await biometricService.autoDetectDevices(devices);
      toast.success(res.message);
      const reloaded = await biometricService.getDevices();
      setDevices(reloaded);
      const usbOrFirst = reloaded.find((d) => d.connectionType === 'usb_direct') || reloaded[0];
      if (usbOrFirst) {
        await handleConnectAndSyncDevice(usbOrFirst);
      }
    } catch {
      toast.error('لم يتم العثور على أجهزة بصمة متصلة عبر USB');
    } finally {
      setIsDetectingUsb(false);
    }
  };

  // Ping All Devices
  const handlePingAll = async () => {
    toast.info('جارٍ فحص البينغ واستجابة كافة أجهزة البصمة المسجلة...');
    for (const dev of devices) {
      await biometricService.pingDevice(dev);
    }
    const fresh = await biometricService.getDevices();
    setDevices(fresh);
    toast.success('اكتمل فحص البينغ لجميع الأجهزة وتحديث زمن الاستجابة.');
  };

  // Delete Device
  const handleDeleteDevice = async (deviceId: string, deviceName: string) => {
    if (confirm(`هل أنت متأكد من حذف جهاز البصمة (${deviceName})؟`)) {
      await biometricService.deleteDevice(deviceId);
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
      toast.success(`تم حذف الجهاز (${deviceName}) من المنظومة.`);
    }
  };

  // Filtered Biometric Punch Logs
  const filteredBiometricLogs = useMemo(() => {
    return biometricLogs.filter((log) => {
      // Device
      if (selectedDeviceFilter !== 'all' && log.deviceId !== selectedDeviceFilter) return false;
      // Department
      if (selectedDeptFilter !== 'all' && log.department !== selectedDeptFilter) return false;
      // Status
      if (selectedStatusFilter !== 'all') {
        if (selectedStatusFilter === 'on_time' && log.status !== 'on_time') return false;
        if (selectedStatusFilter === 'late' && log.status !== 'late') return false;
        if (selectedStatusFilter === 'leave_authorized' && log.status !== 'leave_authorized') return false;
      }
      // Verification Modality
      if (selectedTypeFilter !== 'all' && log.verificationType !== selectedTypeFilter) return false;
      // Date
      if (logDateFilter !== 'all') {
        const todayStr = new Date().toISOString().slice(0, 10);
        if (logDateFilter === 'today' && log.date !== todayStr) return false;
        if (logDateFilter === 'last_7_days') {
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
          if (log.date < sevenDaysAgo) return false;
        }
      }
      // Search
      if (logSearchQuery.trim()) {
        const q = logSearchQuery.toLowerCase().trim();
        const mName = log.employeeName?.toLowerCase().includes(q);
        const mNum = log.employeeNumber?.toLowerCase().includes(q);
        const mDev = log.deviceName?.toLowerCase().includes(q);
        const mIp = log.deviceIp?.toLowerCase().includes(q);
        if (!mName && !mNum && !mDev && !mIp) return false;
      }
      return true;
    });
  }, [
    biometricLogs,
    selectedDeviceFilter,
    selectedDeptFilter,
    selectedStatusFilter,
    selectedTypeFilter,
    logDateFilter,
    logSearchQuery,
  ]);

  // Paginated Biometric Logs
  const paginatedBiometricLogs = useMemo(() => {
    if (logPageSize === 0) return filteredBiometricLogs;
    const start = (logPage - 1) * logPageSize;
    return filteredBiometricLogs.slice(start, start + logPageSize);
  }, [filteredBiometricLogs, logPage, logPageSize]);

  // Export Biometric Logs to CSV
  const handleExportLogsCSV = () => {
    if (filteredBiometricLogs.length === 0) return;

    const headers = [
      'المعرف',
      'اسم الموظف',
      'الرقم الوظيفي',
      'القسم الإداري',
      'اسم جهاز البصمة',
      'عنوان الآي بي',
      'نوع البصمة',
      'نوع الحركة',
      'التاريخ',
      'الوقت',
      'الحالة',
      'دقائق التأخير',
      'الإجازة المرتبطة',
      'ملاحظات إدارية',
    ];

    const rows = filteredBiometricLogs.map((l) => [
      `"${l.id}"`,
      `"${l.employeeName}"`,
      `"${l.employeeNumber}"`,
      `"${l.department}"`,
      `"${l.deviceName}"`,
      `"${l.deviceIp || ''}"`,
      `"${l.verificationType}"`,
      `"${l.punchType === 'check_in' ? 'حضور' : 'انصراف'}"`,
      `"${l.date}"`,
      `"${l.time}"`,
      `"${l.status === 'on_time' ? 'في الوقت' : l.status === 'late' ? 'تأخير' : 'مجاز رسمياً'}"`,
      `"${l.lateMinutes || 0}"`,
      `"${l.associatedLeave || ''}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `تقرير_حركات_أجهزة_البصمة_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Biometric Statistics Calculations
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayLogs = biometricLogs.filter((l) => l.date === todayStr);

    let onTimeCount = 0;
    let lateCount = 0;
    let leaveCount = 0;
    let faceCount = 0;
    let fingerCount = 0;
    let otherModalityCount = 0;

    biometricLogs.forEach((l) => {
      if (l.status === 'on_time') onTimeCount++;
      else if (l.status === 'late') lateCount++;
      else if (l.status === 'leave_authorized') leaveCount++;

      if (l.verificationType === 'face') faceCount++;
      else if (l.verificationType === 'fingerprint') fingerCount++;
      else otherModalityCount++;
    });

    const onlineDevices = devices.filter((d) => d.status === 'online').length;
    const totalPunches = biometricLogs.length;
    const punctualityRate = totalPunches > 0 ? Math.round((onTimeCount / totalPunches) * 100) : 95;

    return {
      todayCount: todayLogs.length,
      totalPunches,
      onlineDevices,
      totalDevices: devices.length,
      onTimeCount,
      lateCount,
      leaveCount,
      faceCount,
      fingerCount,
      otherModalityCount,
      punctualityRate,
    };
  }, [biometricLogs, devices]);

  // Filtered employees for barcode badges
  const filteredEmployeesForBadges = useMemo(() => {
    return employees.filter((emp) => {
      if (searchEmployeeQuery.trim()) {
        const q = searchEmployeeQuery.toLowerCase().trim();
        const mName = emp.fullName.toLowerCase().includes(q);
        const mNum = emp.employeeNumber.toLowerCase().includes(q);
        const mDept = emp.department.toLowerCase().includes(q);
        if (!mName && !mNum && !mDept) return false;
      }
      return true;
    });
  }, [employees, searchEmployeeQuery]);

  const paginatedEmployeesForBadges = useMemo(() => {
    if (badgesPageSize === 0) return filteredEmployeesForBadges;
    const start = (badgesPage - 1) * badgesPageSize;
    return filteredEmployeesForBadges.slice(start, start + badgesPageSize);
  }, [filteredEmployeesForBadges, badgesPage, badgesPageSize]);

  return (
    <div className="space-y-5" dir="rtl">
      {/* 1. TOP HEADER & MAIN NAVIGATION */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
            <Fingerprint className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 dark:text-white">
                منظومة أجهزة البصمة الذكية والربط المباشر
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono">
                {stats.onlineDevices} / {stats.totalDevices} متصل
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              إدارة أجهزة البصمة وتغيير الآي بي وفحص البينغ والربط الشامل بشؤون الموظفين والإجازات وسحب التقارير
            </p>
          </div>
        </div>

        {/* Global Controls & Dashboard Link */}
        <div className="flex flex-wrap items-center gap-2">
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>الرئيسية</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSyncAllDevices}
            disabled={isSyncingAll}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="سحب كل سجلات الحركات من أجهزة البصمة المربوطة فورياً"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
            <span>{isSyncingAll ? 'جارٍ السحب والمزامنة...' : 'سحب السجلات من كافة الأجهزة'}</span>
          </button>
        </div>
      </div>

      {/* 2. PRIMARY TAB SELECTOR */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl no-print text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('devices')}
          className={`flex-1 min-w-[170px] py-2.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'devices'
              ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Network className="w-4 h-4" />
          <span>أجهزة البصمة والآي بي ({devices.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('biometric_logs')}
          className={`flex-1 min-w-[170px] py-2.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'biometric_logs'
              ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>جدول حركات البصمة والتقارير ({biometricLogs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('biometric_stats')}
          className={`flex-1 min-w-[170px] py-2.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'biometric_stats'
              ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>إحصائيات الانضباط والإجازات</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('barcode_scanner')}
          className={`flex-1 min-w-[170px] py-2.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'barcode_scanner'
              ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>الماسح اليدوي والبطاقات</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: BIOMETRIC DEVICES & IP MANAGEMENT (USER'S MAIN CORE) */}
      {/* ======================================================== */}
      {activeTab === 'devices' && (
        <div className="space-y-4">
          {/* ACTION TOOLBAR */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingDevice(null);
                  setDeviceModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة جهاز بصمة جديد</span>
              </button>

              <button
                type="button"
                onClick={handleDetectUsbDevices}
                disabled={isDetectingUsb}
                className="px-3.5 py-2 rounded-xl font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="كشف أجهزة البصمة المربوطة بالحاسبة عبر كابل USB مباشرة (Plug & Play)"
              >
                <Laptop className={`w-4 h-4 ${isDetectingUsb ? 'animate-bounce' : ''}`} />
                <span>{isDetectingUsb ? 'جارٍ فحص منافذ USB...' : 'كشف أجهزة USB المربوطة بالحاسبة'}</span>
              </button>

              <button
                type="button"
                onClick={handlePingAll}
                className="px-3.5 py-2 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="فحص بينغ لجميع الأجهزة وتحديث حالة الاستجابة"
              >
                <Activity className="w-3.5 h-3.5 text-indigo-500" />
                <span>فحص البينغ لكافة الأجهزة</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
              <span>إجمالي الأجهزة: {devices.length}</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-600 font-bold">{stats.onlineDevices} متصل بنجاح</span>
            </div>
          </div>

          {/* DEVICE CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {devices.map((device) => {
              const isSyncingThis = syncingDeviceId === device.id;
              return (
                <div
                  key={device.id}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs hover:shadow-xs transition-shadow space-y-3.5"
                >
                  {/* Card Header: Device Name, Brand, Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        {device.deviceType === 'face' ? (
                          <ScanFace className="w-6 h-6" />
                        ) : device.deviceType === 'fingerprint' ? (
                          <Fingerprint className="w-6 h-6" />
                        ) : device.connectionType === 'usb_direct' ? (
                          <Laptop className="w-6 h-6" />
                        ) : (
                          <Network className="w-6 h-6" />
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {device.name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="font-semibold">{device.model}</span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize">{device.brand}</span>
                        </div>
                      </div>
                    </div>

                    {/* Online Status Pill */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-mono font-bold">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          device.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                        }`}
                      />
                      <span className={device.status === 'online' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600'}>
                        {device.status === 'online' ? 'متصل Online' : 'غير متصل'}
                      </span>
                    </div>
                  </div>

                  {/* Device Network & Location Details */}
                  <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">عنوان الآي بي والمنفذ:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-xs" dir="ltr">
                          {device.ipAddress}:{device.port}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDevice(device);
                            setDeviceModalOpen(true);
                          }}
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-sans cursor-pointer"
                          title="تعديل عنوان الآي بي"
                        >
                          تعديل
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">طريقة التوصيل:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {device.connectionType === 'usb_direct'
                          ? 'كابل USB مباشر بالحاسبة'
                          : device.connectionType === 'wifi'
                          ? 'شبكة لاسلكية (Wi-Fi)'
                          : 'شبكة سلكية LAN (TCP/IP)'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">القسم المرتبط:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">
                        {device.departmentName || 'عام لكافة الأقسام'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">موقع التثبيت:</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {device.location || 'غير محدد'}
                      </span>
                    </div>
                  </div>

                  {/* Latency & Sync Meta */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-indigo-500" />
                      <span>
                        البينغ:{' '}
                        <strong className="text-indigo-600 dark:text-indigo-400">
                          {device.lastPingLatencyMs ? `${device.lastPingLatencyMs} ms` : '—'}
                        </strong>
                      </span>
                    </div>

                    <div>
                      <span>السجلات: {device.logCount || 0}</span>
                      <span className="mx-1">·</span>
                      <span>المستخدمين: {device.userCount || 0}</span>
                    </div>
                  </div>

                  {/* CARD ACTIONS: PING, CONNECT & SYNC, EDIT, DELETE */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      {/* PING TEST BUTTON */}
                      <button
                        type="button"
                        onClick={() => setPingModalDevice(device)}
                        className="px-3 py-1.5 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                        title="فحص البينغ واستجابة الجهاز بالملي ثانية"
                      >
                        <Activity className="w-3.5 h-3.5 text-indigo-500" />
                        <span>فحص البينغ</span>
                      </button>

                      {/* CONNECT & FETCH LOGS BUTTON */}
                      <button
                        type="button"
                        onClick={() => handleConnectAndSyncDevice(device)}
                        disabled={isSyncingThis}
                        className="px-3 py-1.5 rounded-xl font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="ربط الجهاز مع الحاسبة وسحب تقارير البصمة وتحديث الإحصائيات فوراً"
                      >
                        <Zap className={`w-3.5 h-3.5 ${isSyncingThis ? 'animate-spin' : ''}`} />
                        <span>{isSyncingThis ? 'جارٍ السحب...' : 'ربط وسحب السجلات'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDevice(device);
                          setDeviceModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        title="تعديل الجهاز"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDevice(device.id, device.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="حذف الجهاز"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: BIOMETRIC ATTENDANCE LOGS & REPORTS TABLE */}
      {/* ======================================================== */}
      {activeTab === 'biometric_logs' && (
        <div className="space-y-4">
          {/* SEARCH & FILTER BAR */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3 no-print text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              {/* Search */}
              <div className="sm:col-span-4 relative">
                <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  placeholder="بحث بالاسم، الرقم الوظيفي، أو الجهاز..."
                  className="w-full pr-9 pl-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-xs"
                />
              </div>

              {/* Device filter */}
              <div className="sm:col-span-3">
                <select
                  value={selectedDeviceFilter}
                  onChange={(e) => setSelectedDeviceFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none"
                >
                  <option value="all">كافة أجهزة البصمة ({devices.length})</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.ipAddress})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status filter (On Time, Late, Leave Authorized) */}
              <div className="sm:col-span-3">
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none"
                >
                  <option value="all">كافة حالات الدوام</option>
                  <option value="on_time">✅ في الوقت الرسمي</option>
                  <option value="late">⚠️ متأخرون صباحياً</option>
                  <option value="leave_authorized">🏖️ مجازون رسمياً (مطابق مع الإجازات)</option>
                </select>
              </div>

              {/* Modality filter */}
              <div className="sm:col-span-2">
                <select
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none"
                >
                  <option value="all">كل أنواع البصمة</option>
                  <option value="face">بصمة وجه</option>
                  <option value="fingerprint">بصمة إصبع</option>
                  <option value="palm">بصمة كف</option>
                  <option value="card">بطاقة ذكية</option>
                </select>
              </div>
            </div>

            {/* Quick Actions & Export Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setLogDateFilter('all')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    logDateFilter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  كافة التواريخ
                </button>
                <button
                  type="button"
                  onClick={() => setLogDateFilter('today')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    logDateFilter === 'today' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  حركات اليوم فقط
                </button>
                <button
                  type="button"
                  onClick={() => setLogDateFilter('last_7_days')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    logDateFilter === 'last_7_days' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  آخر 7 أيام
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportLogsCSV}
                  disabled={filteredBiometricLogs.length === 0}
                  className="px-3.5 py-1.5 rounded-xl font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>تصدير Excel / CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={filteredBiometricLogs.length === 0}
                  className="px-3.5 py-1.5 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة التقرير</span>
                </button>
              </div>
            </div>
          </div>

          {/* PRINT HEADER ONLY */}
          <div className="hidden print:block p-6 border-b-2 border-black text-center space-y-1">
            <h1 className="text-xl font-bold text-black">{organization.ministryName}</h1>
            <h2 className="text-base font-semibold text-black">
              تقرير سجل حركات أجهزة البصمة الحيوية المعتمدة لعام {organization.operatingYear}
            </h2>
            <div className="flex justify-between text-xs text-black pt-2 font-mono">
              <span>تاريخ التقرير: {new Date().toLocaleDateString('ar-IQ')}</span>
              <span>عدد الحركات المضمنة: {filteredBiometricLogs.length}</span>
            </div>
          </div>

          {/* LOGS TABLE */}
          <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden print:border-none print:shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="p-3.5">نوع البصمة</th>
                    <th className="p-3.5">اسم الموظف والرقم</th>
                    <th className="p-3.5">القسم الإداري</th>
                    <th className="p-3.5">جهاز البصمة والآي بي</th>
                    <th className="p-3.5">التاريخ والوقت</th>
                    <th className="p-3.5">الحركة</th>
                    <th className="p-3.5">الحالة وشؤون الموظفين (الإجازات)</th>
                    <th className="p-3.5">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {paginatedBiometricLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400">
                        لا توجد حركات بصمة مسجلة تطابق الفلاتر المحددة.
                      </td>
                    </tr>
                  ) : (
                    paginatedBiometricLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition-colors"
                      >
                        {/* Biometric Type Icon */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5">
                            {log.verificationType === 'face' ? (
                              <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center gap-1 text-[11px] font-bold">
                                <ScanFace className="w-3.5 h-3.5" />
                                <span>وجه</span>
                              </span>
                            ) : log.verificationType === 'palm' ? (
                              <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center gap-1 text-[11px] font-bold">
                                <Radio className="w-3.5 h-3.5" />
                                <span>كف</span>
                              </span>
                            ) : log.verificationType === 'card' ? (
                              <span className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center gap-1 text-[11px] font-bold">
                                <QrCode className="w-3.5 h-3.5" />
                                <span>بطاقة</span>
                              </span>
                            ) : (
                              <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center gap-1 text-[11px] font-bold">
                                <Fingerprint className="w-3.5 h-3.5" />
                                <span>إصبع</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Employee Name & ID */}
                        <td className="p-3.5">
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {log.employeeName}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {log.employeeNumber}
                            </span>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">
                          {log.department}
                        </td>

                        {/* Device & IP */}
                        <td className="p-3.5">
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">
                              {log.deviceName}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400" dir="ltr">
                              {log.deviceIp}
                            </span>
                          </div>
                        </td>

                        {/* Date & Time */}
                        <td className="p-3.5 font-mono">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">
                              {log.time}
                            </span>
                            <span className="text-[10px] text-slate-400">{log.date}</span>
                          </div>
                        </td>

                        {/* Punch Type (In / Out) */}
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              log.punchType === 'check_in'
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {log.punchType === 'check_in' ? 'حضور (دخول)' : 'انصراف (خروج)'}
                          </span>
                        </td>

                        {/* Status & HR Integration (Leaves & Late) */}
                        <td className="p-3.5">
                          {log.status === 'leave_authorized' ? (
                            <div className="flex items-center gap-1 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2 py-1 rounded-lg border border-purple-200 dark:border-purple-800">
                              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                              <span className="font-bold">
                                مجاز رسمياً ({log.associatedLeave || 'إجازة معتمدة'})
                              </span>
                            </div>
                          ) : log.status === 'late' ? (
                            <div className="flex items-center gap-1 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-800">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span className="font-bold">
                                تأخير صباحي ({log.lateMinutes || 0} دقيقة)
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span className="font-bold">في الوقت المحدد</span>
                            </div>
                          )}
                        </td>

                        {/* Notes */}
                        <td className="p-3.5 text-slate-500 dark:text-slate-400 text-[11px]">
                          {log.notes || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Control */}
            {filteredBiometricLogs.length > 0 && (
              <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 no-print">
                <PaginationControl
                  currentPage={logPage}
                  totalItems={filteredBiometricLogs.length}
                  pageSize={logPageSize}
                  onPageChange={setLogPage}
                  onPageSizeChange={setLogPageSize}
                  pageSizeOptions={[15, 30, 50, 100, 0]}
                  itemLabel="حركة بصمة"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: BIOMETRIC ANALYTICS & HR STATS */}
      {/* ======================================================== */}
      {activeTab === 'biometric_stats' && (
        <div className="space-y-4">
          {/* KPI CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-xs text-slate-500 block mb-1">إجمالي الحركات اليوم:</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                  {stats.todayCount}
                </span>
                <span className="text-[10px] text-emerald-600 font-bold">حركة حديثة</span>
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-xs text-slate-500 block mb-1">نسبة الانضباط بالوقت:</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                  {stats.punctualityRate}%
                </span>
                <span className="text-[10px] text-slate-400">التزام نظامي</span>
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-xs text-slate-500 block mb-1">المطابق مع الإجازات الرسمية:</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
                  {stats.leaveCount}
                </span>
                <span className="text-[10px] text-purple-600">مجازون رسمياً</span>
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-xs text-slate-500 block mb-1">حالات التأخير الصباحي:</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
                  {stats.lateCount}
                </span>
                <span className="text-[10px] text-rose-600">تجاوزوا وقت البداية</span>
              </div>
            </div>
          </div>

          {/* DISTRIBUTION & DEVICE BREAKDOWN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Modality breakdown */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-indigo-500" />
                <span>توزيع البصمات بحسب نوع التحقق الحيوي</span>
              </h3>

              <div className="space-y-2.5 pt-2">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600 dark:text-slate-400">بصمة الإصبع الحيوية</span>
                    <span className="font-bold font-mono">{stats.fingerCount} بصمة</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{ width: `${stats.totalPunches ? (stats.fingerCount / stats.totalPunches) * 100 : 50}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600 dark:text-slate-400">التعرف على الوجه بالذكاء الاصطناعي (Face AI)</span>
                    <span className="font-bold font-mono">{stats.faceCount} بصمة</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full"
                      style={{ width: `${stats.totalPunches ? (stats.faceCount / stats.totalPunches) * 100 : 35}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600 dark:text-slate-400">بصمة الكف والبطاقات الذكية</span>
                    <span className="font-bold font-mono">{stats.otherModalityCount} حركة</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${stats.totalPunches ? (stats.otherModalityCount / stats.totalPunches) * 100 : 15}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Active devices overview */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Network className="w-4 h-4 text-emerald-500" />
                <span>حالة شبكة أجهزة البصمة والربط مع الأقسام</span>
              </h3>

              <div className="space-y-2 pt-1 divide-y divide-slate-100 dark:divide-slate-750">
                {devices.map((d) => (
                  <div key={d.id} className="pt-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                        {d.name}
                      </span>
                      <span className="text-[10px] text-slate-400">{d.location}</span>
                    </div>

                    <div className="text-left font-mono">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          d.status === 'online'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {d.status === 'online' ? `${d.lastPingLatencyMs || 10} ms` : 'Offline'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: BARCODE SCANNER & BADGE PRINTING (PRESERVED) */}
      {/* ======================================================== */}
      {activeTab === 'barcode_scanner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Live Scanner Box */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Scan className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    الماسح الضوئي للباركود والبطاقات
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                  title={soundEnabled ? 'كتم الصوت' : 'تفعيل المؤثرات الصوتية'}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>

              {/* Scan Type Switcher */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setScanType('attendance_checkin')}
                  className={`py-2 rounded-lg transition-colors cursor-pointer ${
                    scanType === 'attendance_checkin'
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  حضور (دخول)
                </button>
                <button
                  type="button"
                  onClick={() => setScanType('attendance_checkout')}
                  className={`py-2 rounded-lg transition-colors cursor-pointer ${
                    scanType === 'attendance_checkout'
                      ? 'bg-amber-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  انصراف (خروج)
                </button>
                <button
                  type="button"
                  onClick={() => setScanType('search_profile')}
                  className={`py-2 rounded-lg transition-colors cursor-pointer ${
                    scanType === 'search_profile'
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  استعلام
                </button>
              </div>

              {/* Input for Hardware Barcode Scanners */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleProcessBarcode();
                }}
                className="space-y-2"
              >
                <div className="relative">
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="امسح الباركود بجهاز المسح أو اكتب الرقم..."
                    className="w-full pr-4 pl-12 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-indigo-500/40 focus:border-indigo-600 focus:outline-none text-center font-mono text-sm font-bold text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="absolute left-2 top-2 p-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 text-center">
                  يدعم قارئ الباركود اليدوي USB والـ Laser تلقائياً
                </p>
              </form>

              {/* Last Scan Result Card */}
              {lastScanResult && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                    lastScanResult.status === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : lastScanResult.status === 'late'
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      {lastScanResult.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      )}
                      <span>نتيجة المسح:</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">{lastScanResult.timestamp}</span>
                  </div>
                  <p>{lastScanResult.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Employee Badge Generator & Print List */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Printer className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    طباعة هويات وبطاقات الموظفين الذكية
                  </h3>
                </div>

                <div className="relative w-48">
                  <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchEmployeeQuery}
                    onChange={(e) => setSearchEmployeeQuery(e.target.value)}
                    placeholder="بحث في الموظفين..."
                    className="w-full pr-8 pl-2 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Employee Cards to Print */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pr-1">
                {paginatedEmployeesForBadges.map((emp) => (
                  <div
                    key={emp.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block text-xs">
                        {emp.fullName}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 block">{emp.employeeNumber}</span>
                      <span className="text-[10px] text-slate-500">{emp.department}</span>
                    </div>

                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedBadgeEmployee(emp)}
                        className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3 h-3" />
                        <span>طباعة الهوية</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleProcessBarcode(emp.employeeNumber)}
                        className="px-2.5 py-1 rounded-xl text-[10px] font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors"
                      >
                        تجربة المسح
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Badges Pagination */}
              {filteredEmployeesForBadges.length > 0 && (
                <div className="pt-2">
                  <PaginationControl
                    currentPage={badgesPage}
                    totalItems={filteredEmployeesForBadges.length}
                    pageSize={badgesPageSize}
                    onPageChange={setBadgesPage}
                    onPageSizeChange={setBadgesPageSize}
                    pageSizeOptions={[20, 30, 50, 0]}
                    itemLabel="موظفاً"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALS */}
      {/* ======================================================== */}

      {/* 1. Add / Edit Biometric Device Modal */}
      <BiometricDeviceModal
        isOpen={deviceModalOpen}
        onClose={() => {
          setDeviceModalOpen(false);
          setEditingDevice(null);
        }}
        deviceToEdit={editingDevice}
        departments={departments}
        onDeviceSaved={(saved) => {
          setDevices((prev) => {
            const idx = prev.findIndex((d) => d.id === saved.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = saved;
              return next;
            }
            return [...prev, saved];
          });
        }}
      />

      {/* 2. Ping Diagnostic Modal */}
      <BiometricPingModal
        isOpen={Boolean(pingModalDevice)}
        onClose={() => setPingModalDevice(null)}
        device={pingModalDevice}
        onPingCompleted={(updated) => {
          setDevices((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        }}
      />

      {/* 3. Printable Badge Modal */}
      {selectedBadgeEmployee && (
        <EmployeeBadgeModal
          isOpen={Boolean(selectedBadgeEmployee)}
          onClose={() => setSelectedBadgeEmployee(null)}
          employee={selectedBadgeEmployee}
          organization={organization}
          onBadgePrinted={(updated) => {
            setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
          }}
        />
      )}

      {/* 4. Instant Plug & Play Biometric Sync & Audit Report Modal (مجرد أن يضع الجهاز مع الحاسبة ويربط يجيب لك كل التقارير والإحصائيات) */}
      {showSyncReportModal && lastSyncResult && typeof document !== 'undefined' && createPortal(
        <div
          id="biometric-sync-report-backdrop"
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSyncReportModal(false);
            }
          }}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] my-auto overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      تقرير الربط والمزامنة الفوري لجهاز البصمة
                    </h3>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold">
                      تم الربط بنجاح (Plug & Play)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    تم الاتصال بالجهاز وسحب كافة السجلات وتحديث شؤون الموظفين والإحصائيات ومطابقة الإجازات تلقائياً
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSyncReportModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Device Info & Specs Bar */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">اسم الجهاز والطراز:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                  {lastSyncResult.device.name}
                </span>
                <span className="text-[10px] text-slate-500">{lastSyncResult.device.model} ({lastSyncResult.device.brand})</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">طريقة التوصيل والآي بي:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs" dir="ltr">
                  {lastSyncResult.device.ipAddress}:{lastSyncResult.device.port}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold block">
                  {lastSyncResult.device.connectionType === 'usb_direct' ? 'كابل USB مباشر بالحاسبة' : 'شبكة سلكية TCP/IP'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">استجابة البينغ (Ping):</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                  {lastSyncResult.device.lastPingLatencyMs || 2} ms
                </span>
                <span className="text-[10px] text-emerald-600 block">بدون أي فقدان حزم (0% loss)</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">توقيت المزامنة والربط:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px] block">
                  {new Date().toLocaleTimeString('ar-IQ')}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{new Date().toISOString().slice(0, 10)}</span>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60">
                <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300">السجلات المستلمة</span>
                <div className="text-2xl font-black font-mono text-indigo-700 dark:text-indigo-400 mt-1">
                  {lastSyncResult.importedCount}
                </div>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400">حركة حضور مسجلة</span>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
                <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300">حضور في الوقت الرسمي</span>
                <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1">
                  {lastSyncResult.summary.onTimeCount}
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">التزام نظامي كامل</span>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
                <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300">التأخير الصباحي</span>
                <div className="text-2xl font-black font-mono text-amber-700 dark:text-amber-400 mt-1">
                  {lastSyncResult.summary.lateCount}
                </div>
                <span className="text-[10px] text-amber-600 dark:text-amber-400">تجاوزوا وقت البداية الرسمي</span>
              </div>

              <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60">
                <span className="text-[11px] font-bold text-purple-900 dark:text-purple-300">مطابقة مع الإجازات</span>
                <div className="text-2xl font-black font-mono text-purple-700 dark:text-purple-400 mt-1">
                  {lastSyncResult.summary.leaveAuthorizedCount}
                </div>
                <span className="text-[10px] text-purple-600 dark:text-purple-400">إجازة رسمية معتمدة من HR</span>
              </div>
            </div>

            {/* Pulled Logs Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span>سجلات الحركات المسحوبة من الجهاز ({lastSyncResult.newPunches.length}):</span>
                <span className="text-[11px] text-slate-400 font-normal">تم التوثيق والمطابقة اللحظية مع ملفات الموظفين</span>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 font-bold sticky top-0 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-2.5">الموظف والرقم الوظيفي</th>
                      <th className="p-2.5">القسم</th>
                      <th className="p-2.5">وقت البصمة</th>
                      <th className="p-2.5">نوع البصمة</th>
                      <th className="p-2.5">الحالة والمطابقة</th>
                      <th className="p-2.5">ملاحظات النظام الآلي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {lastSyncResult.newPunches.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="p-2.5">
                          <div className="font-bold text-slate-900 dark:text-white">{p.employeeName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{p.employeeNumber}</div>
                        </td>
                        <td className="p-2.5 text-slate-700 dark:text-slate-300 text-[11px]">{p.department}</td>
                        <td className="p-2.5 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                          {p.time}
                        </td>
                        <td className="p-2.5 text-[11px]">
                          {p.verificationType === 'face' ? '👤 وجه' : p.verificationType === 'palm' ? '✋ كف' : p.verificationType === 'card' ? '💳 بطاقة' : '👆 إصبع'}
                        </td>
                        <td className="p-2.5">
                          {p.status === 'on_time' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                              حضور في الوقت
                            </span>
                          ) : p.status === 'late' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                              تأخير ({p.lateMinutes} د)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                              مجاز رسمياً
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-[10px] text-slate-500 dark:text-slate-400">
                          {p.notes || 'توثيق آلي'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة التقرير الفوري</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportLogsCSV}
                  className="px-3.5 py-2 rounded-xl font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>تصدير إلى Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowSyncReportModal(false);
                    setActiveTab('biometric_logs');
                  }}
                  className="px-3.5 py-2 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <span>عرض في جدول الحركات والتقارير</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowSyncReportModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
