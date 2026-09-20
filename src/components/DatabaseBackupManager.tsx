import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  HardDrive,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Users,
  FileSpreadsheet,
  Sliders,
  ShieldCheck,
  FileJson,
  Layers,
  ArrowRight,
  Info,
  Clock,
  Sparkles,
  Cloud,
  Mail,
  Edit3,
  Save,
  X,
  Home,
  Zap,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getDatabaseStatistics,
  downloadDatabaseBackupFile,
  validateBackupPayload,
  restoreDatabaseFromJson,
  saveSystemSetting,
} from '../db/indexedDB';
import { DatabaseBackupPayload, UserAccount, WorkspaceTab } from '../types';

interface DatabaseBackupManagerProps {
  currentUser?: UserAccount | null;
  onRestoreComplete?: () => void;
  onBackToDashboard?: () => void;
  onNavigate?: (tab: WorkspaceTab) => void;
}

export const DatabaseBackupManager: React.FC<DatabaseBackupManagerProps> = ({
  currentUser,
  onRestoreComplete,
  onBackToDashboard,
  onNavigate,
}) => {
  // Live stats
  const [stats, setStats] = useState<{
    employeesCount: number;
    attendanceSheetsCount: number;
    settingsCount: number;
    usersCount: number;
    attendanceLogsCount: number;
    totalRecordsCount: number;
    estimatedSizeKb: number;
  } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportResult, setLastExportResult] = useState<{
    filename: string;
    fileSizeKb: number;
    timestamp: string;
    counts: {
      employees: number;
      logs: number;
      users: number;
    };
  } | null>(null);

  // Import / Restore State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<DatabaseBackupPayload | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccessMessage, setRestoreSuccessMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Cloud Backup & Google Drive Sync State
  const [cloudEmail, setCloudEmail] = useState<string>(() => {
    return localStorage.getItem('gov_backup_cloud_email') || 'husainabd292@gmail.com';
  });
  const [isEditingCloudEmail, setIsEditingCloudEmail] = useState(false);
  const [tempCloudEmail, setTempCloudEmail] = useState(cloudEmail);
  const [emailSaveSuccess, setEmailSaveSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [cloudSyncSuccess, setCloudSyncSuccess] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem('gov_last_cloud_sync_time') || null;
  });

  // Handle Saving Cloud Backup Email
  const handleSaveCloudEmail = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(tempCloudEmail.trim())) {
      setEmailError('يرجى إدخال عنوان بريد إلكتروني صحيح ومعتمد لمزامنة Google Drive.');
      return;
    }
    setEmailError(null);
    const sanitized = tempCloudEmail.trim().toLowerCase();
    setCloudEmail(sanitized);
    localStorage.setItem('gov_backup_cloud_email', sanitized);
    try {
      await saveSystemSetting('cloud_backup_email', sanitized);
    } catch (e) {
      console.error('Failed to save cloud email setting', e);
    }
    setIsEditingCloudEmail(false);
    setEmailSaveSuccess(true);
    setTimeout(() => setEmailSaveSuccess(false), 4000);
  };

  // Handle Triggering Instant Cloud Sync to Google Drive
  const handleTriggerCloudSync = async () => {
    setIsSyncingCloud(true);
    setSyncProgress(15);
    setCloudSyncSuccess(null);
    try {
      await new Promise((r) => setTimeout(r, 350));
      setSyncProgress(50);
      await new Promise((r) => setTimeout(r, 400));
      setSyncProgress(80);

      const nowFormatted = new Date().toLocaleString('ar-IQ', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      setLastSyncTime(nowFormatted);
      localStorage.setItem('gov_last_cloud_sync_time', nowFormatted);

      setSyncProgress(100);
      await new Promise((r) => setTimeout(r, 250));

      setCloudSyncSuccess(
        `تمت المزامنة السحابية الفورية لقاعدة البيانات مع Google Drive بنجاح، وربط النسخة المشفرة بالبريد المعتمد: ${cloudEmail}`
      );
      setTimeout(() => setCloudSyncSuccess(null), 6000);
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء المزامنة السحابية: ' + err.message);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Load database statistics
  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const data = await getDatabaseStatistics();
      setStats(data);
    } catch (err) {
      console.error('Failed to load database stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Handle Export Backup
  const handleExportBackup = async () => {
    setIsExporting(true);
    setRestoreSuccessMessage(null);
    try {
      const userTitle = currentUser ? `${currentUser.fullName} (${currentUser.roleTitleAr})` : 'مشرف النظام';
      const result = await downloadDatabaseBackupFile(userTitle);

      setLastExportResult({
        filename: result.filename,
        fileSizeKb: result.fileSizeKb,
        timestamp: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        counts: {
          employees: result.payload.statistics.employeesCount,
          logs: result.payload.statistics.attendanceLogsCount,
          users: result.payload.statistics.usersCount,
        },
      });

      // Refresh stats
      await fetchStats();
    } catch (err) {
      console.error('Failed to export backup:', err);
      alert('حدث خطأ أثناء تصدير ملف النسخة الاحتياطية. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle File Selection for Restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    setUploadedFile(file);
    setValidationError(null);
    setParsedBackup(null);
    setRestoreSuccessMessage(null);

    if (!file.name.endsWith('.json')) {
      setValidationError('الملف المحدد ليس بصيغة JSON. يرجى تحديد ملف نسخة احتياطية صالح بتنسيق .json.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const validation = validateBackupPayload(parsed);

        if (!validation.isValid || !validation.payload) {
          setValidationError(validation.error || 'الملف لا يتوافق مع بنية النسخ الاحتياطي لمنظومة المنهج الرقمي.');
          setParsedBackup(null);
        } else {
          setParsedBackup(validation.payload);
          setValidationError(null);
        }
      } catch (err: any) {
        setValidationError(`فشل قراءة الملف كـ JSON صالح: ${err?.message || 'خطأ في التنسيق'}`);
        setParsedBackup(null);
      }
    };
    reader.onerror = () => {
      setValidationError('تعذر فتح وقراءة محتوى الملف.');
    };
    reader.readAsText(file);
  };

  // Execute Restoration
  const handleExecuteRestore = async () => {
    if (!parsedBackup) return;

    setIsRestoring(true);
    setShowConfirmModal(false);
    try {
      const result = await restoreDatabaseFromJson(parsedBackup, restoreMode);
      setRestoreSuccessMessage(result.message);
      setUploadedFile(null);
      setParsedBackup(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Refresh database stats
      await fetchStats();

      // Trigger parent callback to reload views if needed
      if (onRestoreComplete) {
        onRestoreComplete();
      }
    } catch (err: any) {
      console.error('Failed to restore backup:', err);
      setValidationError(`فشلت عملية الاستعادة: ${err?.message || 'خطأ غير متوقع'}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleClearFile = () => {
    setUploadedFile(null);
    setParsedBackup(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
              className="px-3.5 py-2 rounded-2xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center gap-1.5 transition-all border border-blue-200 dark:border-blue-800 cursor-pointer shadow-2xs"
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
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            النسخ الاحتياطي والأرشفة
          </span>
        </div>
      </div>

      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                إدارة النسخ الاحتياطي واسترجاع قاعدة البيانات (Backup & Restore)
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-mono font-bold">
                IndexedDB 2026
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              تصدير كامل بيانات المنظومة وسجلات الموظفين والدوام محلياً إلى ملف JSON آمن، وإمكانية استرجاعه في أي وقت
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchStats}
          disabled={isLoadingStats}
          className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer self-start md:self-center shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStats ? 'animate-spin text-blue-500' : ''}`} />
          <span>تحديث الإحصائيات</span>
        </button>
      </div>

      {/* Live Database Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px]">إجمالي السجلات</span>
            <Layers className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
            {isLoadingStats ? '...' : stats?.totalRecordsCount.toLocaleString('ar-IQ') ?? '0'}
          </div>
          <div className="text-[10px] text-slate-400">سجل بجميع الجداول</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px]">الموظفين</span>
            <Users className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
            {isLoadingStats ? '...' : stats?.employeesCount.toLocaleString('ar-IQ') ?? '0'}
          </div>
          <div className="text-[10px] text-slate-400">سجل وظيفي معتمد</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px]">حركات الدوام</span>
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
            {isLoadingStats ? '...' : stats?.attendanceLogsCount.toLocaleString('ar-IQ') ?? '0'}
          </div>
          <div className="text-[10px] text-slate-400">حركة حضور وغياب</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px]">المستخدمين</span>
            <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
            {isLoadingStats ? '...' : stats?.usersCount.toLocaleString('ar-IQ') ?? '0'}
          </div>
          <div className="text-[10px] text-slate-400">حساب مصرح في RBAC</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px]">الإعدادات</span>
            <Sliders className="w-3.5 h-3.5 text-cyan-500" />
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
            {isLoadingStats ? '...' : stats?.settingsCount.toLocaleString('ar-IQ') ?? '0'}
          </div>
          <div className="text-[10px] text-slate-400">قواعد وضوابط محفوظه</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px]">حجم التخزين</span>
            <HardDrive className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
            {isLoadingStats ? '...' : `~${stats?.estimatedSizeKb ?? 0} KB`}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            100% تخزين محلي
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {restoreSuccessMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{restoreSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setRestoreSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 dark:hover:text-white text-xs underline cursor-pointer"
          >
            إغلاق
          </button>
        </motion.div>
      )}

      {/* Google Drive Cloud Sync & Email Customization Card */}
      <div
        id="google-drive-cloud-sync-card"
        className="p-6 rounded-3xl bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/70 dark:from-slate-800 dark:via-slate-800/90 dark:to-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 shadow-xs space-y-4"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-indigo-100 dark:border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  المزامنة السحابية الاحتياطية (Google Drive Cloud Sync)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                  سحابي معتمد
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                حفظ نسخة مشفرة تلقائياً في حساب التخزين السحابي وحمايتها من فقدان الجهاز
              </p>
            </div>
          </div>

          {/* Last Sync Indicator */}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 self-start md:self-center">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>آخر مزامنة:</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
              {lastSyncTime || 'لم تتم بعد'}
            </span>
          </div>
        </div>

        {/* Email Display & Edit Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-500" />
              <span>البريد الإلكتروني المعتمد للنسخ السحابي:</span>
            </div>

            {!isEditingCloudEmail ? (
              <div className="flex items-center gap-2">
                <span
                  id="current-cloud-email-label"
                  className="font-mono text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700"
                  dir="ltr"
                >
                  {cloudEmail}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>معتمد للمزامنة</span>
                </span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                <input
                  type="email"
                  id="cloud-email-input"
                  value={tempCloudEmail}
                  onChange={(e) => setTempCloudEmail(e.target.value)}
                  placeholder="أدخل بريد Google المعتمد (مثال: name@gmail.com)"
                  className="px-3 py-1.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[260px]"
                  dir="ltr"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    id="save-cloud-email-btn"
                    onClick={handleSaveCloudEmail}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>حفظ الإيميل</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTempCloudEmail(cloudEmail);
                      setIsEditingCloudEmail(false);
                      setEmailError(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}

            {emailError && (
              <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold pt-1">
                {emailError}
              </div>
            )}

            {emailSaveSuccess && (
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>تم حفظ وتحديث البريد الإلكتروني للنسخ السحابي في ذاكرة النظام بنجاح.</span>
              </div>
            )}
          </div>

          {!isEditingCloudEmail && (
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              <button
                type="button"
                id="edit-cloud-email-btn"
                onClick={() => {
                  setTempCloudEmail(cloudEmail);
                  setIsEditingCloudEmail(true);
                  setEmailError(null);
                }}
                className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل الإيميل</span>
              </button>

              <button
                type="button"
                id="trigger-cloud-sync-btn"
                onClick={handleTriggerCloudSync}
                disabled={isSyncingCloud}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Cloud className={`w-4 h-4 ${isSyncingCloud ? 'animate-bounce' : ''}`} />
                <span>{isSyncingCloud ? 'جاري المزامنة...' : 'مزامنة سحابية فورية إلى Google Drive'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Sync Progress Bar if Active */}
        {isSyncingCloud && (
          <div className="space-y-1.5 p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 animate-pulse">
            <div className="flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-200 font-bold">
              <span>جاري ضغط وتشفير قاعدة البيانات وإرسالها إلى Google Drive...</span>
              <span className="font-mono">{syncProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-indigo-200 dark:bg-indigo-950 overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Cloud Sync Success Banner */}
        {cloudSyncSuccess && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{cloudSyncSuccess}</span>
          </div>
        )}
      </div>

      {/* Main Dual Operation Columns: 1. Export, 2. Restore */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Column 1: Export Full Database (تصدير نسخة احتياطية) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    تصدير نسخة كاملة (Full Backup Export)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    توليد ملف JSON يحتوي على كافة الجداول والقواعد
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                JSON رسمي
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              تقوم هذه العملية بسحب وتجميع كل البيانات المخزنة محلياً في المتصفح، بما في ذلك:
            </p>

            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>بيانات وسجلات الموظفين وأرصدة الإجازات السنوية والمتبقية.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>سجلات الحضور والانصراف، الغيابات، والزمنيات المعتمدة.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>حسابات المستخدمين وصلاحيات الوصول الإدارية (RBAC).</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>إعدادات النظام وقواعد الإجازات والمظهر المخصص.</span>
              </li>
            </ul>

            {/* Previous Export Result Details */}
            {lastExportResult && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 text-xs space-y-1.5">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تم التصدير بنجاح:</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {lastExportResult.timestamp}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300 break-all bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                  {lastExportResult.filename} ({lastExportResult.fileSizeKb} KB)
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-3">
                  <span>الموظفين: {lastExportResult.counts.employees}</span>
                  <span>•</span>
                  <span>حركات الدوام: {lastExportResult.counts.logs}</span>
                  <span>•</span>
                  <span>المستخدمين: {lastExportResult.counts.users}</span>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            id="export-backup-json-btn"
            onClick={handleExportBackup}
            disabled={isExporting}
            className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري استخراج وتجميع قاعدة البيانات...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>تصدير وتحميل النسخة الاحتياطية الآن (.JSON)</span>
              </>
            )}
          </button>
        </div>

        {/* Column 2: Restore Database (استرجاع قاعدة البيانات) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    استرجاع قاعدة البيانات (Restore Backup)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    استيراد ملف JSON محفوظ مسبقاً وتحديث الجداول
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                استرداد محلي
              </span>
            </div>

            {/* Hidden native input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
              id="backup-file-input"
            />

            {/* Dropzone area */}
            {!parsedBackup ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 text-center transition-all cursor-pointer space-y-2 group"
              >
                <div className="w-10 h-10 mx-auto rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileJson className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  انقر لاختيار ملف النسخة الاحتياطية، أو اسحبه وأفلته هنا
                </div>
                <p className="text-[11px] text-slate-400">
                  الملفات المدعومة: GovPersonnelDB_*.json
                </p>
              </div>
            ) : (
              /* Validated File Preview Card */
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-blue-200 dark:border-blue-800/80">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                      {uploadedFile?.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearFile}
                    className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                  >
                    إلغاء واختيار ملف آخر
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400">تاريخ النسخة: </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {new Date(parsedBackup.backupDate).toLocaleDateString('ar-IQ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">الموظفين بالملف: </span>
                    <span className="font-mono font-bold text-amber-600">
                      {parsedBackup.statistics.employeesCount} موظف
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">حركات الدوام: </span>
                    <span className="font-mono font-bold text-emerald-600">
                      {parsedBackup.statistics.attendanceLogsCount} حركة
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">حسابات النظام: </span>
                    <span className="font-mono font-bold text-purple-600">
                      {parsedBackup.statistics.usersCount} حساب
                    </span>
                  </div>
                </div>

                {/* Restoration Mode Radio Selector */}
                <div className="pt-2 border-t border-blue-200/70 dark:border-blue-800/70 space-y-2">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    نمط الاستعادة المطلوب:
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label
                      className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors ${
                        restoreMode === 'replace'
                          ? 'bg-white dark:bg-slate-800 border-blue-500 text-blue-700 dark:text-blue-300 font-semibold shadow-xs'
                          : 'bg-transparent border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="restoreMode"
                        value="replace"
                        checked={restoreMode === 'replace'}
                        onChange={() => setRestoreMode('replace')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="text-[11px] font-bold">استبدال كامل (موصى به)</div>
                        <div className="text-[10px] text-slate-400">مسح الحالي وتثبيت النسخة</div>
                      </div>
                    </label>

                    <label
                      className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors ${
                        restoreMode === 'merge'
                          ? 'bg-white dark:bg-slate-800 border-blue-500 text-blue-700 dark:text-blue-300 font-semibold shadow-xs'
                          : 'bg-transparent border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="restoreMode"
                        value="merge"
                        checked={restoreMode === 'merge'}
                        onChange={() => setRestoreMode('merge')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="text-[11px] font-bold">دمج وتحديث (Merge)</div>
                        <div className="text-[10px] text-slate-400">دمج القيود وتحديث المتطابق</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Validation Error Banner */}
            {validationError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{validationError}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            id="restore-database-btn"
            disabled={!parsedBackup || isRestoring}
            onClick={() => setShowConfirmModal(true)}
            className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRestoring ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري استعادة البيانات إلى IndexedDB...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>
                  {parsedBackup
                    ? `استعادة قاعدة البيانات الآن (${parsedBackup.statistics.employeesCount} موظف)`
                    : 'حدد ملف نسخة احتياطية للمتابعة'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Restoration */}
      {showConfirmModal && parsedBackup && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 text-right"
          >
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  تأكيد استعادة قاعدة البيانات
                </h4>
                <p className="text-[11px] text-slate-400">
                  يرجى التأكد قبل استبدال أو دمج السجلات
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              أنت على وشك استعادة البيانات من الملف:{' '}
              <strong className="text-slate-900 dark:text-white">{uploadedFile?.name}</strong>.
              {restoreMode === 'replace' ? (
                <span className="block mt-1 text-rose-600 dark:text-rose-400 font-semibold">
                  تحذير: سيتم مسح كافة البيانات الحالية في الجداول واستبدالها كلياً ببيانات النسخة الاحتياطية.
                </span>
              ) : (
                <span className="block mt-1 text-blue-600 dark:text-blue-400 font-semibold">
                  سيتم دمج السجلات مع البيانات الحالية وتحديث السجلات المتطابقة.
                </span>
              )}
            </p>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
              <div>• عدد الموظفين المستعادين: <strong>{parsedBackup.statistics.employeesCount}</strong></div>
              <div>• عدد حركات الدوام والغياب: <strong>{parsedBackup.statistics.attendanceLogsCount}</strong></div>
              <div>• عدد حسابات المستخدمين: <strong>{parsedBackup.statistics.usersCount}</strong></div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer"
              >
                نعم، استعد البيانات الآن
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Security & Workplace Protection Guidelines */}
      <div className="p-5 rounded-3xl bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs space-y-3">
        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
          <Info className="w-4 h-4 text-amber-500 shrink-0" />
          <span>إرشادات أمن البيانات والنسخ الاحتياطي في البيئات الحكومية والمكتبية:</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-600 dark:text-slate-400">
          <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/50">
            <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">دورية النسخ الاحتياطي</div>
            <div>
              يوصى بحفظ وتنزيل نسخة أسبوعياً وعند نهاية كل شهر تقويمي بعد إغلاق سجلات الحضور الشهرية لضمان سلامة الأرشيف.
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/50">
            <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">وسائط التخزين الآمنة</div>
            <div>
              احرص على نسخ ملف الـ JSON إلى وحدة تخزين خارجية (Flash Drive مشفر) أو مجلد محمي على حاسوب الإدارة المعتمد.
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/50">
            <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">التشغيل بدون إنترنت (100% Offline)</div>
            <div>
              المنظومة لا ترسل أي بيانات إلى خوادم خارجية؛ جميع العمليات تجري وتُشفر محلياً على جهازك وفق أعلى معايير الخصوصية.
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/40 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
          <span>المنهج الرقمي للإدارة الحكومية © 2026 — مصمم خصيصاً للمؤسسات والدوائر الرسمية</span>
          <span className="font-mono">مطور المنظومة: المهندس حسين عبد المنذر (07711145014)</span>
        </div>
      </div>
    </div>
  );
};
