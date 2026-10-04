import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Laptop,
  Calendar,
  Clock,
  LogOut,
  KeyRound,
  FileText,
  Check,
  Info,
  Server,
  ArrowRight,
  Users,
  Sliders,
  Database,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Layers,
  HardDrive,
  LayoutDashboard,
  Building2,
  ExternalLink,
  Zap,
  Sidebar,
  LayoutGrid,
  Home,
  ArrowLeft,
  BarChart3,
  Monitor,
  Award,
  QrCode,
  Briefcase,
  TrendingUp,
  Bell,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GovernmentEmblem } from './components/GovernmentEmblem';
import { ThemeToggle } from './components/ThemeToggle';
import { WindowTrafficLights } from './components/WindowTrafficLights';
import { IndexedDBTester } from './components/IndexedDBTester';
import { EmployeeManagement } from './components/EmployeeManagement';
import { DailyMovementsHub } from './components/DailyMovementsHub';
import { ExecutiveDashboardHub } from './components/ExecutiveDashboardHub';
import { AttendanceReports } from './components/AttendanceReports';
import { MovementReportDesigner } from './components/MovementReportDesigner';
import { SettingsPanel } from './components/SettingsPanel';
import { DatabaseBackupManager } from './components/DatabaseBackupManager';
import { QuickScreenToolbar } from './components/QuickScreenToolbar';
import { AddMovementModal } from './components/AddMovementModal';
import { AnnualCalendarHolidays } from './components/AnnualCalendarHolidays';
import { DesktopExportModal } from './components/DesktopExportModal';
import { ToastContainer, toast } from './components/ToastNotification';
import { TrashModal } from './components/TrashModal';
import { BarcodeAttendanceHub } from './components/BarcodeAttendanceHub';
import { AllowancesPromotionsHub } from './components/AllowancesPromotionsHub';
import { RetirementHub } from './components/RetirementHub';
import { InteractiveAnalyticsHub } from './components/InteractiveAnalyticsHub';
import { MasterEmployeeProfileModal } from './components/MasterEmployeeProfileModal';
import { LicenseActivationModal } from './components/LicenseActivationModal';
import { LicenseGeneratorModal } from './components/LicenseGeneratorModal';
import { LicenseLockScreen } from './components/LicenseLockScreen';
import { licenseService } from './services/licenseService';
import { employeeService } from './services/employeeService';
import { getTrashedEmployees, subscribeTrashChanges } from './services/employeeTrashService';
import {
  performAutoBackup,
  getAutoBackupSettings,
  getStoredAutoBackups,
  AutoBackupRecord,
} from './services/autoBackupService';
import {
  UserAccount,
  Employee,
  AppearanceSettings,
  LeaveRulesSettings,
  OrganizationSettings,
  EmploymentTypeLabelsSettings,
  DEFAULT_EMPLOYMENT_TYPE_LABELS,
  LicenseStatus,
} from './types';
import {
  DEFAULT_APPEARANCE_SETTINGS,
  DEFAULT_LEAVE_RULES,
  getSystemSetting,
  saveSystemSetting,
  getAllEmployees,
  getSystemUsers,
} from './db/indexedDB';

// Pre-configured government accounts for instant demonstration
const PRESET_ACCOUNTS: (UserAccount & { passwordHint: string })[] = [
  {
    username: 'admin',
    passwordHint: 'SAsa12589',
    fullName: 'المهندس المشرف العام',
    jobTitle: 'مدير النظام المركزي وشؤون الموظفين',
    department: 'شعبة تكنولوجيا المعلومات والموارد البشرية',
    role: 'super_admin',
    roleTitleAr: 'مدير النظام (صلاحيات كاملة)',
    avatarColor: 'from-amber-500 to-amber-700',
    permissions: {
      canEditAttendance: true,
      canApproveLeaves: true,
      canDeleteRecords: true,
      canGenerateReports: true,
      canAccessMasterSettings: true,
    },
  },
  {
    username: 'hr_director',
    passwordHint: 'HrAdmin2026',
    fullName: 'أ. علي عبد الرحمن الحيدري',
    jobTitle: 'مدير قسم الموارد البشرية والخدمة المدنية',
    department: 'قسم إدارة الموارد البشرية',
    role: 'hr_director',
    roleTitleAr: 'مسؤول شؤون الموظفين',
    avatarColor: 'from-emerald-500 to-teal-700',
    permissions: {
      canEditAttendance: true,
      canApproveLeaves: true,
      canDeleteRecords: false,
      canGenerateReports: true,
      canAccessMasterSettings: false,
    },
  },
  {
    username: 'clerk_ali',
    passwordHint: 'Clerk2026',
    fullName: 'أحمد جاسم الشمري',
    jobTitle: 'معاون ملاحظ إداري - مدخل بيانات الدوام',
    department: 'شعبة الحضور والإجازات',
    role: 'attendance_officer',
    roleTitleAr: 'مدخل بيانات الحضور',
    avatarColor: 'from-blue-500 to-indigo-700',
    permissions: {
      canEditAttendance: true,
      canApproveLeaves: false,
      canDeleteRecords: false,
      canGenerateReports: true,
      canAccessMasterSettings: false,
    },
  },
];

export type WorkspaceTab =
  | 'dashboard'
  | 'employees'
  | 'daily_movements'
  | 'reports'
  | 'calendar'
  | 'settings'
  | 'profile'
  | 'db_test'
  | 'backup'
  | 'movement_designer'
  | 'barcode_hub'
  | 'allow_promotions'
  | 'retirement'
  | 'analytics';

const DEFAULT_ORGANIZATION: OrganizationSettings = {
  ministryName: 'وزارة التعليم العالي والبحث العلمي',
  directorateName: 'دائرة الشؤون الإدارية والمالية',
  departmentName: 'قسم إدارة الموارد البشرية والخدمة المدنية',
  officialEmblem: 'golden_eagle' as any,
  operatingYear: 2026,
};

export default function App() {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<UserAccount | null>(null);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTab>('dashboard');
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Global settings & shared employee list
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);
  const [leaveRules, setLeaveRules] = useState<LeaveRulesSettings>(DEFAULT_LEAVE_RULES);
  const [appearance, setAppearance] = useState<AppearanceSettings>(DEFAULT_APPEARANCE_SETTINGS);
  const [organization, setOrganization] = useState<OrganizationSettings>(DEFAULT_ORGANIZATION);
  const [employmentLabels, setEmploymentLabels] = useState<EmploymentTypeLabelsSettings>(DEFAULT_EMPLOYMENT_TYPE_LABELS);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(false);
  const [isGlobalMovementModalOpen, setIsGlobalMovementModalOpen] = useState<boolean>(false);
  const [showDesktopExportModal, setShowDesktopExportModal] = useState<boolean>(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState<boolean>(false);
  const [trashedCount, setTrashedCount] = useState<number>(() => getTrashedEmployees().length);
  const [selectedProfileEmployeeId, setSelectedProfileEmployeeId] = useState<string | null>(null);
  const [dailyMovementsSubTab, setDailyMovementsSubTab] = useState<'registration' | 'five_year_leaves' | 'reports'>('registration');

  // Subscribe to trash bin changes globally
  useEffect(() => {
    const unsub = subscribeTrashChanges(() => {
      setTrashedCount(getTrashedEmployees().length);
    });
    return () => unsub();
  }, []);

  // Central Employee Service Subscription (Single Source of Truth)
  useEffect(() => {
    const unsub = employeeService.subscribe((allEmps) => {
      setEmployeesList(allEmps);
    });
    return () => unsub();
  }, []);

  // Operational Alerts state (Retirement & Exhausted Leave)
  const [operationalAlerts, setOperationalAlerts] = useState<{
    nearRetirementCount: number;
    nearRetirementList: Employee[];
    depletedLeaveCount: number;
    depletedLeaveList: Employee[];
  }>({
    nearRetirementCount: 0,
    nearRetirementList: [],
    depletedLeaveCount: 0,
    depletedLeaveList: [],
  });

  // Commercial Licensing & Trial Management State
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [isActivationModalOpen, setIsActivationModalOpen] = useState<boolean>(false);
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsub = licenseService.subscribe((st) => {
      setLicenseStatus(st);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    employeeService.getExecutiveMetrics().then((m) => {
      setOperationalAlerts({
        nearRetirementCount: m.nearRetirementCount,
        nearRetirementList: m.nearRetirementList,
        depletedLeaveCount: m.depletedLeaveCount,
        depletedLeaveList: m.depletedLeaveList,
      });
    });
  }, [employeesList]);

  // Apply active Arabic font family globally to document
  useEffect(() => {
    const font = appearance?.fontFamily || 'Readex Pro';
    document.documentElement.style.setProperty(
      '--font-active',
      `'${font}', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
    );
  }, [appearance?.fontFamily]);

  // Sync dark theme state
  useEffect(() => {
    setIsDarkTheme(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleDarkMode = () => {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('gov_app_theme', 'light');
      setIsDarkTheme(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('gov_app_theme', 'dark');
      setIsDarkTheme(true);
    }
  };

  // Reload all stored data from IndexedDB (e.g. after backup restoration)
  const handleReloadAllData = async () => {
    try {
      const savedRules = await getSystemSetting<LeaveRulesSettings>('leave_rules', DEFAULT_LEAVE_RULES);
      if (savedRules) setLeaveRules(savedRules);

      const savedApp = await getSystemSetting<AppearanceSettings>('appearance', DEFAULT_APPEARANCE_SETTINGS);
      if (savedApp) setAppearance(savedApp);

      const savedOrg = await getSystemSetting<OrganizationSettings>('organization_settings', DEFAULT_ORGANIZATION);
      if (savedOrg) setOrganization(savedOrg);

      const savedLabels = await getSystemSetting<EmploymentTypeLabelsSettings>('employment_type_labels', DEFAULT_EMPLOYMENT_TYPE_LABELS);
      if (savedLabels) setEmploymentLabels(savedLabels);

      const emps = await getAllEmployees();
      setEmployeesList(emps);
    } catch (err) {
      console.error('Failed to reload app data:', err);
    }
  };

  // Initialize saved settings & employee cache
  useEffect(() => {
    const initAppData = async () => {
      try {
        const savedRules = await getSystemSetting<LeaveRulesSettings>('leave_rules', DEFAULT_LEAVE_RULES);
        if (savedRules) setLeaveRules(savedRules);

        const savedApp = await getSystemSetting<AppearanceSettings>('appearance', DEFAULT_APPEARANCE_SETTINGS);
        if (savedApp) setAppearance(savedApp);

        const savedOrg = await getSystemSetting<OrganizationSettings>('organization_settings', DEFAULT_ORGANIZATION);
        if (savedOrg) setOrganization(savedOrg);

        const savedLabels = await getSystemSetting<EmploymentTypeLabelsSettings>('employment_type_labels', DEFAULT_EMPLOYMENT_TYPE_LABELS);
        if (savedLabels) setEmploymentLabels(savedLabels);

        const emps = await getAllEmployees();
        setEmployeesList(emps);
      } catch (err) {
        console.error('Failed to initialize app settings:', err);
      }
    };
    initAppData();
  }, []);

  // Update Leave Rules
  const handleLeaveRulesChange = async (newRules: LeaveRulesSettings) => {
    setLeaveRules(newRules);
    await saveSystemSetting('leave_rules', newRules);
  };

  // Update Appearance Settings
  const handleAppearanceChange = async (newApp: AppearanceSettings) => {
    setAppearance(newApp);
    await saveSystemSetting('appearance', newApp);
  };

  // Update Organization Settings
  const handleOrganizationChange = async (newOrg: OrganizationSettings) => {
    setOrganization(newOrg);
    await saveSystemSetting('organization_settings', newOrg);
  };

  // Update Employment Type Labels Settings
  const handleEmploymentLabelsChange = async (newLabels: EmploymentTypeLabelsSettings) => {
    setEmploymentLabels(newLabels);
    await saveSystemSetting('employment_type_labels', newLabels);
  };

  // Live Digital Clock for Iraqi Official Time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('ar-IQ', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Submit Login Handler (يدوياً)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setErrorMessage('يرجى إدخال اسم المستخدم وكلمة المرور للمتابعة.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. فحص المستخدمين المعرّفين في قاعدة بيانات النظام المحلية IndexedDB
      const dbUsers = await getSystemUsers().catch(() => []);
      const matchedDbUser = dbUsers.find(
        (u) =>
          u.username.toLowerCase() === trimmedUser.toLowerCase() &&
          u.passwordHash === trimmedPass &&
          u.isActive !== false
      );

      // 2. فحص الحسابات الافتراضية
      const matchedPreset = PRESET_ACCOUNTS.find(
        (acc) =>
          acc.username.toLowerCase() === trimmedUser.toLowerCase() &&
          acc.passwordHint === trimmedPass
      );

      // 3. المشرف الرئيسي (Admin)
      const isMasterAdmin =
        trimmedUser.toLowerCase() === 'admin' && trimmedPass === 'SAsa12589';

      setTimeout(() => {
        if (matchedDbUser) {
          setLoggedInUser({
            username: matchedDbUser.username,
            fullName: matchedDbUser.fullName,
            jobTitle: matchedDbUser.jobTitle,
            department: matchedDbUser.department,
            role: matchedDbUser.role as any,
            roleTitleAr: matchedDbUser.roleTitleAr,
            avatarColor: 'from-amber-500 to-amber-700',
            permissions: matchedDbUser.permissions,
          });
          setIsLoading(false);
        } else if (isMasterAdmin || matchedPreset) {
          const activeUser = matchedPreset || PRESET_ACCOUNTS[0];
          setLoggedInUser(activeUser);
          setIsLoading(false);
        } else {
          setIsLoading(false);
          setErrorMessage(
            'اسم المستخدم أو كلمة المرور غير صحيحة. يرجى التأكد من صحة البيانات والمحاولة مجدداً.'
          );
        }
      }, 350);
    } catch {
      setIsLoading(false);
      setErrorMessage('حدث خطأ أثناء تسجيل الدخول. يرجى إعادة المحاولة.');
    }
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setUsername('');
    setPassword('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-[#0a0f1d] text-slate-900 dark:text-slate-100 selection:bg-amber-500/20 selection:text-amber-900 dark:selection:text-amber-200 relative overflow-x-hidden">
      {/* Subtle Apple & Government Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[650px] h-[650px] rounded-full bg-emerald-500/5 dark:bg-emerald-600/10 blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[650px] h-[650px] rounded-full bg-amber-500/5 dark:bg-amber-600/10 blur-[140px]" />
        <div className="absolute top-[35%] left-[25%] w-[500px] h-[500px] rounded-full bg-indigo-500/5 dark:bg-indigo-600/5 blur-[140px]" />
      </div>

      {/* 1. Desktop Window Frame Header (macOS System Bar) */}
      <header className="relative z-10 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-4 py-2.5 flex items-center justify-between shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
        {/* Right side in RTL: Window Traffic Controls & System State */}
        <div className="flex items-center gap-4">
          <WindowTrafficLights
            onClose={() => toast.info('إغلاق نافذة النظام (جاهز لبيئة Electron)')}
            onMinimize={() => toast.info('تم تصغير النافذة')}
            onMaximize={() => toast.info('تم تفعيل وضع ملء الشاشة')}
          />
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">جمهورية العراق - المنظومة الإدارية الموحدة</span>
            <span className="sm:hidden font-semibold">المنهج الرقمي</span>
          </div>
        </div>

        {/* Center: Operational Year Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200/70 dark:bg-slate-800/70 border border-slate-300/60 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-medium">
          <Calendar className="w-3.5 h-3.5 text-amber-500" />
          <span>سنة التشغيل الإدارية: 2026</span>
          <span className="text-slate-400 dark:text-slate-500">|</span>
          <Clock className="w-3.5 h-3.5 text-emerald-500" />
          <span className="font-mono">{currentTime || '12:00:00 م'}</span>
        </div>

        {/* Left side in RTL: Theme Switcher, License Status and Desktop status */}
        <div className="flex items-center gap-2.5">
          {licenseStatus && (
            <button
              type="button"
              id="top-system-license-btn"
              onClick={() => setIsActivationModalOpen(true)}
              className={`px-2.5 py-1 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                licenseStatus.isLifetime
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                  : licenseStatus.isTrial
                  ? licenseStatus.isExpired
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 animate-pulse'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                  : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
              }`}
              title="حالة ترخيص وتفعيل البرنامج"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {licenseStatus.isLifetime
                  ? 'مرخص دائم مدى الحياة'
                  : licenseStatus.isTrial
                  ? licenseStatus.isExpired
                    ? 'انتهت التجربة (تفعيل)'
                    : `تجريبي: ${licenseStatus.trialDaysRemaining} يوم`
                  : `مرخص (${licenseStatus.daysRemaining} يوم)`}
              </span>
            </button>
          )}

          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Laptop className="w-3.5 h-3.5 text-slate-500" />
            <span>نظام مكتبي محلي</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* 2. Main Content View Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <AnimatePresence mode="wait">
          {!loggedInUser ? (
            /* Login Card Interface */
            <motion.div
              key="login-card"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="w-full max-w-md"
            >
              {/* Apple-styled Frosted Squircle Container */}
              <div className="relative rounded-3xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xl shadow-slate-900/5 dark:shadow-black/40 overflow-hidden p-6 sm:p-8">
                {/* Decorative Top Accent Bar */}
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-emerald-600 to-amber-500" />

                {/* Official Crest & Title Section */}
                <div className="flex flex-col items-center text-center mb-6">
                  <GovernmentEmblem size="md" className="mb-3" />
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 mb-1.5">
                    <ShieldCheck className="w-3 h-3" />
                    بوابة الدخول الحكومية الآمنة
                  </span>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    المنهج الرقمي للإدارة الحكومية
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    نظام إدارة شؤون الموظفين والحضور والغياب للدوائر والمؤسسات
                  </p>
                </div>

                {/* Error Alert Box */}
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{errorMessage}</p>
                  </motion.div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Username Field */}
                  <div>
                    <label
                      htmlFor="username"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      اسم المستخدم أو الرقم الوظيفي
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="username"
                        type="text"
                        required
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="أدخل اسم المستخدم أو الرقم الوظيفي"
                        className="w-full pr-10 pl-4 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                        dir="ltr"
                        style={{ textAlign: 'right' }}
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="password"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                      >
                        كلمة المرور
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowHelpModal(true)}
                        className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <HelpCircle className="w-3 h-3" />
                        نسيت كلمة المرور؟
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="أدخل كلمة المرور"
                        className="w-full pr-10 pl-10 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all font-mono"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        id="toggle-password-visibility-btn"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me Option */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-800"
                      />
                      <span>تذكر الحساب على هذا الحاسوب المكتبي</span>
                    </label>
                  </div>

                  {/* Primary Login Button (Apple-styled Vibrant Action) */}
                  <button
                    type="submit"
                    id="submit-login-btn"
                    disabled={isLoading}
                    className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:scale-[0.99] transition-all duration-150 shadow-lg shadow-amber-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>جاري التحقق من الصلاحيات...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>تسجيل الدخول للنظام الأمني</span>
                        <ArrowRight className="w-4 h-4 mr-1 rotate-180" />
                      </>
                    )}
                  </button>
                </form>

                {/* Offline-First Security Notice */}
                <div className="mt-5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Server className="w-3 h-3 text-emerald-500" />
                    <span>قاعدة بيانات محلية غير معتمدة على سحابة خارجية</span>
                  </span>
                  <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                    100% Offline
                  </span>
                </div>

                {/* Desktop App Installer / Exe Launcher trigger on login screen */}
                <button
                  type="button"
                  onClick={() => setShowDesktopExportModal(true)}
                  className="w-full mt-3 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Monitor className="w-3.5 h-3.5 text-amber-500" />
                  <span>تثبيت أو تشغيل كتطبيق سطح مكتب Windows (exe.)</span>
                </button>
              </div>

              {/* IndexedDB Local Persistence Tester Card */}
              <div className="mt-4">
                <IndexedDBTester compact onEmployeeDataChanged={handleReloadAllData} />
              </div>
            </motion.div>
          ) : (
            /* Logged-in Desktop Workspace with Right Sidebar Navigation (Apple macOS Style) */
            <motion.div
              key="workspace-window"
              initial={{ opacity: 0, scale: 0.99, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.99, y: -10 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-7xl mx-auto"
            >
              {/* Desktop Window Container with Frosted Glass & Border */}
              <div className="relative rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_12px_40px_rgba(15,23,42,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col min-h-[780px]">
                
                {/* 1. Desktop Window Frame Header (macOS title bar with traffic lights & breadcrumb) */}
                <div className="px-5 py-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/70 flex flex-wrap items-center justify-between gap-3 select-none">
                  {/* Traffic Lights & App Title */}
                  <div className="flex items-center gap-3">
                    <WindowTrafficLights
                      onClose={handleLogout}
                      onMinimize={() => {}}
                      onMaximize={() => {}}
                    />
                    <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold text-xs">
                        ع
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        المنهج الرقمي للإدارة الحكومية
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        /
                      </span>
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {activeWorkspaceTab === 'dashboard' && 'لوحة التحكم والعمليات المركزية'}
                        {activeWorkspaceTab === 'employees' && 'إدارة شؤون الموظفين'}
                        {activeWorkspaceTab === 'daily_movements' && 'مركز الحركات اليومية الفورية والتقارير'}
                        {activeWorkspaceTab === 'reports' && 'تقارير الدوام والشيت السنوي'}
                        {activeWorkspaceTab === 'movement_designer' && 'المخطط البياني ومصمم تقارير الحركات'}
                        {activeWorkspaceTab === 'analytics' && 'الرسوم البيانية التفاعلية للموظفين (Recharts)'}
                        {activeWorkspaceTab === 'calendar' && 'التقويم السنوي والعطل الرسمية والمناسبات (رئاسة الوزراء)'}
                        {activeWorkspaceTab === 'barcode_hub' && 'منظومة أجهزة البصمة الذكية والبطاقات الموحدة'}
                        {activeWorkspaceTab === 'allow_promotions' && 'العلاوات السنوية والترفيعات الوظيفية'}
                        {activeWorkspaceTab === 'retirement' && 'هيئة وشؤون التقاعد (السن القانوني 60)'}
                        {activeWorkspaceTab === 'settings' && 'لوحة الإعدادات وقواعد الدوام والصلاحيات'}
                        {activeWorkspaceTab === 'profile' && 'بيانات المستخدم النشط ومصفوفة الصلاحيات'}
                        {activeWorkspaceTab === 'db_test' && 'فحص قاعدة بيانات IndexedDB المحلية'}
                        {activeWorkspaceTab === 'backup' && 'النسخ الاحتياطي والأمان ومزامنة السحابة'}
                      </span>
                    </div>
                  </div>

                  {/* System Status Indicators */}
                  <div className="flex items-center gap-3 text-xs">
                    {appearance.showDigitalClock && (
                      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200/60 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>{currentTime || '12:00:00 م'}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>100% محلي Offline</span>
                    </div>

                    {/* Operational Alerts Toast Trigger */}
                    <button
                      type="button"
                      id="header-notifications-toast-btn"
                      onClick={() => {
                        let triggered = 0;
                        if (operationalAlerts.nearRetirementCount > 0) {
                          const firstEmp = operationalAlerts.nearRetirementList[0];
                          toast.retirementAlert(
                            `تنبيه التقاعد القانوني (${operationalAlerts.nearRetirementCount} موظف)`,
                            `الموظف (${firstEmp?.fullName || 'كوادر'}) بلغ أو يقترب من السن القانوني للتقاعد (60 سنة).`,
                            () => setActiveWorkspaceTab('retirement'),
                            'إجراءات التقاعد'
                          );
                          triggered++;
                        }
                        if (operationalAlerts.depletedLeaveCount > 0) {
                          const firstDep = operationalAlerts.depletedLeaveList[0];
                          toast.leaveAlert(
                            `تنبيه انتهاء رصيد الإجازات (${operationalAlerts.depletedLeaveCount} موظف)`,
                            `الموظف (${firstDep?.fullName || 'كوادر'}) استنفد كامل رصيد إجازاته السنوية المتاحة (الرصيد المتبقي: 0 يوم).`,
                            () => setActiveWorkspaceTab('employees'),
                            'متابعة الرصيد'
                          );
                          triggered++;
                        }
                        if (triggered === 0) {
                          toast.info('كافة سجلات الكوادر والتقاعد والإجازات منتظمة ولا توجد تنبيهات عاجلة.');
                        }
                      }}
                      className="px-2.5 py-1 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs"
                      title="تنبيهات النظام الفورية (التقاعد والإجازات)"
                    >
                      <Bell className="w-3.5 h-3.5 text-amber-500" />
                      <span className="hidden sm:inline">الإشعارات</span>
                      {operationalAlerts.nearRetirementCount + operationalAlerts.depletedLeaveCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-mono leading-none">
                          {operationalAlerts.nearRetirementCount + operationalAlerts.depletedLeaveCount}
                        </span>
                      )}
                    </button>

                    {/* Commercial License Status Button */}
                    {licenseStatus && (
                      <button
                        type="button"
                        id="workspace-license-status-btn"
                        onClick={() => setIsActivationModalOpen(true)}
                        className={`px-2.5 py-1 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                          licenseStatus.isLifetime
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                            : licenseStatus.isTrial
                            ? licenseStatus.isExpired
                              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 animate-pulse'
                              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                            : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
                        }`}
                        title="حالة ترخيص وتفعيل البرنامج"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">
                          {licenseStatus.isLifetime
                            ? 'مرخص دائم مدى الحياة'
                            : licenseStatus.isTrial
                            ? licenseStatus.isExpired
                              ? 'انتهت التجربة (تفعيل)'
                              : `تجريبي (${licenseStatus.trialDaysRemaining} يوم)`
                            : `مرخص (${licenseStatus.daysRemaining} يوم)`}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      id="desktop-app-export-btn"
                      onClick={() => setShowDesktopExportModal(true)}
                      className="px-2.5 py-1 rounded-xl border border-amber-300/80 dark:border-amber-700/80 bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs"
                      title="تشغيل أو تثبيت كتطبيق سطح مكتب Windows (.exe)"
                    >
                      <Monitor className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="hidden sm:inline">تطبيق سطح المكتب (exe)</span>
                    </button>

                    <button
                      type="button"
                      id="header-logout-btn"
                      onClick={handleLogout}
                      className="px-3 py-1 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                      title="قفل الشاشة وتسجيل الخروج"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">خروج</span>
                    </button>
                  </div>
                </div>

                {/* Trial Expiry Warning Banner (Shown when trial has <= 3 days left) */}
                {licenseStatus?.isTrial && licenseStatus.trialDaysRemaining <= 3 && !licenseStatus.isExpired && (
                  <div className="bg-amber-500/15 border-b border-amber-500/30 px-5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
                      <span>
                        تنبيه: أوشكت الفترة التجريبية على الانتهاء (المتبقي: {licenseStatus.trialDaysRemaining} {licenseStatus.trialDaysRemaining === 1 ? 'يوم واحد' : 'أيام'}). يرجى شراء كود التفعيل لضمان استمرار عمل المنظومة دون توقف.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsActivationModalOpen(true)}
                      className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
                    >
                      تفعيل وشراء الآن ⚡
                    </button>
                  </div>
                )}

                {/* 2. Desktop Body: Conditional Hub Layout or Slate-950 Sidebar + Viewport */}
                {appearance.navigationLayout === 'dashboard_hub' && activeWorkspaceTab === 'dashboard' ? (
                  /* Full-width Executive Dashboard Hub */
                  <div className="flex-1 bg-slate-50/50 dark:bg-slate-900/50 overflow-y-auto">
                    <ExecutiveDashboardHub
                      currentUser={loggedInUser}
                      organization={organization}
                      employees={employeesList}
                      appearance={appearance}
                      onNavigate={(tab) => setActiveWorkspaceTab(tab)}
                      onNavigateToFiveYearLeave={() => {
                        setDailyMovementsSubTab('five_year_leaves');
                        setActiveWorkspaceTab('daily_movements');
                      }}
                      onToggleLayout={(layout) =>
                        handleAppearanceChange({ ...appearance, navigationLayout: layout })
                      }
                      onOpenMovementModal={() => setIsGlobalMovementModalOpen(true)}
                      onOpenLicense={() => setIsActivationModalOpen(true)}
                      onLogout={handleLogout}
                      currentTime={currentTime}
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-slate-200 dark:divide-slate-800">
                    {/* Right Sidebar (Slate-950) */}
                    {appearance.navigationLayout === 'sidebar' && (
                      <aside className="w-full lg:w-72 shrink-0 bg-slate-950 text-slate-100 p-4 flex flex-col justify-between border-b lg:border-b-0 lg:border-l border-slate-800 shadow-xl">
                        <div className="space-y-4">
                          {/* Directorate & Ministry Card */}
                          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xs space-y-3">
                            <div className="flex items-center gap-3">
                              <GovernmentEmblem
                                className="w-10 h-10 shrink-0 drop-shadow-md"
                                emblemUrl={organization.emblemUrl}
                              />
                              <div className="overflow-hidden">
                                <div className="font-bold text-xs text-white truncate">
                                  {organization.ministryName || 'جمهورية العراق'}
                                </div>
                                <div className="text-[11px] text-amber-400 font-semibold truncate">
                                  {organization.directorateName || 'دائرة الموارد البشرية'}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {organization.departmentName || 'قسم شؤون الموظفين'}
                                </div>
                              </div>
                            </div>

                            {/* Logged in User Bar */}
                            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-7 h-7 rounded-lg bg-gradient-to-br ${loggedInUser.avatarColor} flex items-center justify-center text-white font-bold text-xs shrink-0`}
                                >
                                  {loggedInUser.fullName.charAt(0)}
                                </div>
                                <div className="truncate">
                                  <div className="font-bold text-[11px] text-slate-200 truncate">
                                    {loggedInUser.fullName}
                                  </div>
                                  <div className="text-[10px] text-amber-400">
                                    {loggedInUser.roleTitleAr}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Toggle to Dashboard Hub Button */}
                            <button
                              type="button"
                              onClick={() =>
                                handleAppearanceChange({
                                  ...appearance,
                                  navigationLayout: 'dashboard_hub',
                                })
                              }
                              className="w-full py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-700/60"
                              title="تغيير نمط العرض إلى لوحة التحكم بالأزرار (Hub)"
                            >
                              <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                              <span>التبديل إلى لوحة التحكم (Hub)</span>
                            </button>
                          </div>

                          {/* Navigation Section Title */}
                          <div className="px-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            قائمة الخيارات والخدمات
                          </div>

                          {/* Horizontal Options List (RTL Desktop Side Menu) */}
                          <nav className="space-y-1" aria-label="شريط خيارات سطح المكتب">
                            {/* 0. Central Dashboard */}
                            <button
                              type="button"
                              id="nav-dashboard-btn"
                              onClick={() => setActiveWorkspaceTab('dashboard')}
                              className={`w-full text-right p-2.5 rounded-2xl transition-all cursor-pointer flex items-center justify-between group ${
                                activeWorkspaceTab === 'dashboard'
                                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 font-semibold'
                                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                    activeWorkspaceTab === 'dashboard'
                                      ? 'bg-white/20 text-white'
                                      : 'bg-amber-500/20 text-amber-400 group-hover:bg-amber-500/30'
                                  }`}
                                >
                                  <LayoutDashboard className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold">لوحة التحكم المركزية</div>
                                  <div
                                    className={`text-[10px] ${
                                      activeWorkspaceTab === 'dashboard'
                                        ? 'text-amber-100'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    المؤشرات، العمليات والروابط
                                  </div>
                                </div>
                              </div>
                            </button>

                            {/* 1. Employees */}
                            <button
                              type="button"
                              id="nav-employees-btn"
                              onClick={() => setActiveWorkspaceTab('employees')}
                              className={`w-full text-right p-2.5 rounded-2xl transition-all cursor-pointer flex items-center justify-between group ${
                                activeWorkspaceTab === 'employees'
                                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 font-semibold'
                                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                    activeWorkspaceTab === 'employees'
                                      ? 'bg-white/20 text-white'
                                      : 'bg-amber-500/20 text-amber-400 group-hover:bg-amber-500/30'
                                  }`}
                                >
                                  <Users className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold">إدارة شؤون الموظفين</div>
                                  <div
                                    className={`text-[10px] ${
                                      activeWorkspaceTab === 'employees'
                                        ? 'text-amber-100'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    دليل الكوادر، والبحث المتقدم
                                  </div>
                                </div>
                              </div>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                                  activeWorkspaceTab === 'employees'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {employeesList.length > 0 ? employeesList.length : '—'}
                              </span>
                            </button>

                            {/* 2. Daily Movements Hub */}
                            <button
                              type="button"
                              id="nav-daily-movements-btn"
                              onClick={() => setActiveWorkspaceTab('daily_movements')}
                              className={`w-full text-right p-2.5 rounded-2xl transition-all cursor-pointer flex items-center justify-between group ${
                                activeWorkspaceTab === 'daily_movements'
                                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-semibold'
                                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                    activeWorkspaceTab === 'daily_movements'
                                      ? 'bg-white/20 text-white'
                                      : 'bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/30'
                                  }`}
                                >
                                  <Zap className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold">الحركات اليومية والتقارير</div>
                                  <div
                                    className={`text-[10px] ${
                                      activeWorkspaceTab === 'daily_movements'
                                        ? 'text-indigo-100'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    تسجيل فوري (غ، ج، م، ف، ز)
                                  </div>
                                </div>
                              </div>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  activeWorkspaceTab === 'daily_movements'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-indigo-950 text-indigo-300 border border-indigo-800/60'
                                }`}
                              >
                                فوري ⚡
                              </span>
                            </button>

                            {/* 3. Attendance & Leave Reports */}
                            <button
                              type="button"
                              id="nav-reports-btn"
                              onClick={() => setActiveWorkspaceTab('reports')}
                              className={`w-full text-right p-2.5 rounded-2xl transition-all cursor-pointer flex items-center justify-between group ${
                                activeWorkspaceTab === 'reports'
                                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-semibold'
                                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                    activeWorkspaceTab === 'reports'
                                      ? 'bg-white/20 text-white'
                                      : 'bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30'
                                  }`}
                                >
                                  <FileSpreadsheet className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold">الشيت السنوي والتقارير</div>
                                  <div
                                    className={`text-[10px] ${
                                      activeWorkspaceTab === 'reports'
                                        ? 'text-emerald-100'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    شيت الحضور الشامل وطباعة A4
                                  </div>
                                </div>
                              </div>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  activeWorkspaceTab === 'reports'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                                }`}
                              >
                                رسمي
                              </span>
                            </button>

                            {/* 3.5. Movement Report Designer & Charts */}
                            <button
                              type="button"
                              id="nav-movement-designer-btn"
                              onClick={() => setActiveWorkspaceTab('movement_designer')}
                              className={`w-full text-right p-2.5 rounded-2xl transition-all cursor-pointer flex items-center justify-between group ${
                                activeWorkspaceTab === 'movement_designer'
                                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/25 font-semibold'
                                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                    activeWorkspaceTab === 'movement_designer'
                                      ? 'bg-white/20 text-white'
                                      : 'bg-violet-500/20 text-violet-400 group-hover:bg-violet-500/30'
                                  }`}
                                >
                                  <BarChart3 className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold">مخطط ومصمم الحركات</div>
                                  <div
                                    className={`text-[10px] ${
                                      activeWorkspaceTab === 'movement_designer'
                                        ? 'text-violet-100'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    إحصائيات بيانية + تعديل الورقة
                                  </div>
                                </div>
                              </div>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  activeWorkspaceTab === 'movement_designer'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-violet-950 text-violet-300 border border-violet-800/60'
                                }`}
                              >
                                حصري 📊
                              </span>
                            </button>

                            {/* 3.6. Interactive Analytics & Recharts */}
                            <button
                              type="button"
                              id="nav-analytics-btn"
                              onClick={() => setActiveWorkspaceTab('analytics')}
                              className={`w-full text-right p-2.5 rounded-2xl transition-all cursor-pointer flex items-center justify-between group ${
                                activeWorkspaceTab === 'analytics'
                                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/25 font-semibold'
                                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                    activeWorkspaceTab === 'analytics'
                                      ? 'bg-white/20 text-white'
                                      : 'bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/30'
                                  }`}
                                >
                                  <TrendingUp className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold">الرسوم البيانية التفاعلية</div>
                                  <div
                                    className={`text-[10px] ${
                                      activeWorkspaceTab === 'analytics'
                                        ? 'text-cyan-100'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    تحليلات الأقسام والدرجات
                                  </div>
                                </div>
                              </div>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  activeWorkspaceTab === 'analytics'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                                }`}
                              >
                                Recharts 📈
                              </span>
                            </button>

                            {/* 4. Annual Calendar & Holidays (Cabinet of Iraq 2026) */}
                            <button
                              type="button"
                              id="nav-calendar-btn"
                              onClick={() => setActiveWorkspaceTab('calendar')}
                              className={`w-full text-right p-2.5 rounded-2xl transition-all cursor-pointer flex items-center justify-between group ${
                                activeWorkspaceTab === 'calendar'
                                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 font-semibold'
                                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                    activeWorkspaceTab === 'calendar'
                                      ? 'bg-white/20 text-white'
                                      : 'bg-amber-500/20 text-amber-400 group-hover:bg-amber-500/30'
                                  }`}
                                >
                                  <Calendar className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold">التقويم السنوي والعطل</div>
                                  <div
                                    className={`text-[10px] ${
                                      activeWorkspaceTab === 'calendar'
                                        ? 'text-amber-100'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    عطل مجلس الوزراء والتعميم
                                  </div>
                                </div>
                              </div>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  activeWorkspaceTab === 'calendar'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                                }`}
                              >
                                2026
                              </span>
                            </button>

                            {/* 4.1. Barcode & Smart Cards Hub */}
                            <button
                              type="button"
                              id="nav-barcode-btn"
                              onClick={() => setActiveWorkspaceTab('barcode_hub')}
                              aria-describedby="nav-barcode-tooltip"
                              className={`w-full text-right p-2.5 rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-between group relative ${
                                activeWorkspaceTab === 'barcode_hub'
                                  ? 'bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 font-semibold ring-1 ring-indigo-400/40'
                                  : 'text-slate-300 hover:text-white hover:bg-slate-900/90 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-950/60 border border-transparent hover:-translate-y-0.5 active:translate-y-0'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`relative w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 overflow-hidden ${
                                    activeWorkspaceTab === 'barcode_hub'
                                      ? 'bg-white/20 text-white shadow-xs ring-1 ring-white/30'
                                      : 'bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:scale-110 group-hover:ring-2 group-hover:ring-indigo-400/60 group-hover:shadow-[0_0_16px_rgba(99,102,241,0.65)]'
                                  }`}
                                >
                                  {/* Scanner laser sweep beam on hover */}
                                  <span className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-300 to-transparent top-0 opacity-0 group-hover:opacity-100 group-hover:translate-y-8 transition-all duration-700 ease-in-out pointer-events-none" />
                                  {/* Live beacon dot */}
                                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-400 opacity-0 group-hover:opacity-100 group-hover:animate-ping pointer-events-none" />
                                  <QrCode className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold transition-colors duration-200 group-hover:text-white">
                                    أجهزة البصمة والبطاقات الذكية
                                  </div>
                                  <div
                                    className={`text-[10px] transition-colors duration-200 ${
                                      activeWorkspaceTab === 'barcode_hub'
                                        ? 'text-indigo-100'
                                        : 'text-slate-400 group-hover:text-indigo-300'
                                    }`}
                                  >
                                    إدارة أجهزة البصمة والآي بي والتقارير
                                  </div>
                                </div>
                              </div>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-all duration-200 flex items-center gap-1 ${
                                  activeWorkspaceTab === 'barcode_hub'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-indigo-950 text-indigo-300 border border-indigo-800/60 group-hover:bg-indigo-500 group-hover:text-white group-hover:border-indigo-400 group-hover:scale-105 group-hover:shadow-sm'
                                }`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-opacity" />
                                QR ⚡
                              </span>

                              {/* Custom Interactive Tooltip (تلميح مخصص لعمليات المسح الفوري) */}
                              <div
                                id="nav-barcode-tooltip"
                                role="tooltip"
                                className="absolute bottom-full right-0 left-0 mb-2.5 p-3 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white border border-indigo-500/50 shadow-2xl shadow-indigo-950/80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-out transform translate-y-1 group-hover:translate-y-0 pointer-events-none z-50 text-right"
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-1.5 text-indigo-300 font-bold text-[11px]">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                                    </span>
                                    <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>المسح الفوري المباشر</span>
                                  </div>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-semibold">
                                    SCAN ⚡
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-300 leading-relaxed font-normal">
                                  هذا الزر مخصص لـ <strong className="text-white font-semibold">عمليات المسح الفوري</strong> عبر كاميرا الحاسوب أو قارئ الباركود، لتسجيل الحضور اللحظي وطباعة الباجات الذكية.
                                </p>
                                {/* Tooltip pointer triangle */}
                                <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-slate-900 border-b border-l border-indigo-500/50 rotate-[-45deg]" />
                              </div>
                            </button>

                            {/* 4.2. Annual Allowances & Promotions */}
                            <button
                              type="button"
                              id="nav-allowances-btn"
                              onClick={() => setActiveWorkspaceTab('allow_promotions')}
                              className={`w-full text-right p-2.5 rounded-2xl transition-all cursor-pointer flex items-center justify-between group ${
                                activeWorkspaceTab === 'allow_promotions'
                                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25 font-semibold'
                                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                    activeWorkspaceTab === 'allow_promotions'
                                      ? 'bg-white/20 text-white'
                                      : 'bg-amber-500/20 text-amber-400 group-hover:bg-amber-500/30'
                                  }`}
                                >
                                  <Award className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold">العلاوات والترفيعات</div>
                                  <div
                                    className={`text-[10px] ${
                                      activeWorkspaceTab === 'allow_promotions'
                                        ? 'text-amber-100'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    استحقاق الدرجات والأوامر
                                  </div>
                                </div>
                              </div>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  activeWorkspaceTab === 'allow_promotions'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                                }`}
                              >
                                ترفيع
                              </span>
                            </button>

                            {/* 4.3. Retirement Hub */}
                            <button
                              type="button"
                              id="nav-retirement-btn"
                              onClick={() => setActiveWorkspaceTab('retirement')}
                              className={`w-full text-right p-2.5 rounded-2xl transition-all cursor-pointer flex items-center justify-between group ${
                                activeWorkspaceTab === 'retirement'
                                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 font-semibold'
                                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                    activeWorkspaceTab === 'retirement'
                                      ? 'bg-white/20 text-white'
                                      : 'bg-purple-500/20 text-purple-400 group-hover:bg-purple-500/30'
                                  }`}
                                >
                                  <Briefcase className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold">هيئة وشؤون التقاعد</div>
                                  <div
                                    className={`text-[10px] ${
                                      activeWorkspaceTab === 'retirement'
                                        ? 'text-purple-100'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    السن القانوني 60 وأرشفة الخدمة
                                  </div>
                                </div>
                              </div>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  activeWorkspaceTab === 'retirement'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-purple-950 text-purple-300 border border-purple-800/60'
                                }`}
                              >
                                سن 60
                              </span>
                            </button>

                            {/* 5. Settings & Leave Rules & RBAC */}
                            <button
                              type="button"
                              id="nav-settings-btn"
                              onClick={() => setActiveWorkspaceTab('settings')}
                              className={`w-full text-right p-2.5 rounded-2xl transition-all cursor-pointer flex items-center justify-between group ${
                                activeWorkspaceTab === 'settings'
                                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-semibold'
                                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                    activeWorkspaceTab === 'settings'
                                      ? 'bg-white/20 text-white'
                                      : 'bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/30'
                                  }`}
                                >
                                  <Sliders className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold">الإعدادات وقواعد الدوام</div>
                                  <div
                                    className={`text-[10px] ${
                                      activeWorkspaceTab === 'settings'
                                        ? 'text-indigo-100'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    الهوية، الرصيد، والمظهر
                                  </div>
                                </div>
                              </div>
                            </button>

                            {/* 6. Active Profile & RBAC Matrix */}
                            <button
                              type="button"
                              id="nav-profile-btn"
                              onClick={() => setActiveWorkspaceTab('profile')}
                              className={`w-full text-right p-2.5 rounded-2xl transition-all cursor-pointer flex items-center justify-between group ${
                                activeWorkspaceTab === 'profile'
                                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 font-semibold'
                                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                    activeWorkspaceTab === 'profile'
                                      ? 'bg-white/20 text-white'
                                      : 'bg-purple-500/20 text-purple-400 group-hover:bg-purple-500/30'
                                  }`}
                                >
                                  <ShieldCheck className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold">المستخدم والصلاحيات</div>
                                  <div
                                    className={`text-[10px] ${
                                      activeWorkspaceTab === 'profile'
                                        ? 'text-purple-100'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    بطاقة الحساب ومصفوفة RBAC
                                  </div>
                                </div>
                              </div>
                            </button>

                            {/* 7. IndexedDB Storage Tester */}
                            <button
                              type="button"
                              id="nav-dbtest-btn"
                              onClick={() => setActiveWorkspaceTab('db_test')}
                              className={`w-full text-right p-2.5 rounded-2xl transition-all cursor-pointer flex items-center justify-between group ${
                                activeWorkspaceTab === 'db_test'
                                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-semibold'
                                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                    activeWorkspaceTab === 'db_test'
                                      ? 'bg-white/20 text-white'
                                      : 'bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30'
                                  }`}
                                >
                                  <Database className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold">فحص IndexedDB</div>
                                  <div
                                    className={`text-[10px] ${
                                      activeWorkspaceTab === 'db_test'
                                        ? 'text-blue-100'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    فحص التخزين المحلي بدون إنترنت
                                  </div>
                                </div>
                              </div>
                            </button>

                            {/* 8. Database Backup & Restore */}
                            <button
                              type="button"
                              id="nav-backup-btn"
                              onClick={() => setActiveWorkspaceTab('backup')}
                              className={`w-full text-right p-2.5 rounded-2xl transition-all cursor-pointer flex items-center justify-between group ${
                                activeWorkspaceTab === 'backup'
                                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-semibold'
                                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                    activeWorkspaceTab === 'backup'
                                      ? 'bg-white/20 text-white'
                                      : 'bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30'
                                  }`}
                                >
                                  <HardDrive className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold">النسخ ومزامنة السحابة</div>
                                  <div
                                    className={`text-[10px] ${
                                      activeWorkspaceTab === 'backup'
                                        ? 'text-blue-100'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    تصدير JSON ومزامنة Drive
                                  </div>
                                </div>
                              </div>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  activeWorkspaceTab === 'backup'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-blue-950 text-blue-300 border border-blue-800/60'
                                }`}
                              >
                                أمان
                              </span>
                            </button>
                          </nav>
                        </div>

                        {/* Developer Credit Footer Card in Sidebar */}
                        <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2">
                          <div className="p-3 rounded-2xl bg-slate-900 border border-amber-500/30 text-right shadow-xs">
                            <div className="text-[11px] font-bold text-amber-400">
                              المهندس حسين عبد المنذر
                            </div>
                            <div className="text-[10px] text-slate-400">
                              مطور ومنظم المنظومة الحكومية
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[10px] font-mono">
                              <a
                                href="tel:07711145014"
                                className="text-amber-400 hover:underline"
                                dir="ltr"
                              >
                                07711145014
                              </a>
                              <span className="text-emerald-400">@h92so</span>
                            </div>
                          </div>

                          <div className="text-[10px] text-center text-slate-500">
                            المنهج الرقمي للإدارة الحكومية © 2026
                          </div>
                        </div>
                      </aside>
                    )}

                    {/* Left Main Viewport */}
                    <main className="flex-1 p-4 sm:p-6 bg-slate-50/30 dark:bg-slate-900/30 overflow-y-auto space-y-4">
                      {/* Top banner when in Dashboard Hub mode and on a sub-view */}
                      {appearance.navigationLayout === 'dashboard_hub' && (
                        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => setActiveWorkspaceTab('dashboard')}
                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-bold shadow-md shadow-amber-600/20 active:scale-98 transition-all flex items-center gap-2 cursor-pointer"
                          >
                            <ArrowRight className="w-4 h-4" />
                            <span>العودة إلى لوحة التحكم المركزية (Hub)</span>
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleAppearanceChange({
                                  ...appearance,
                                  navigationLayout: 'sidebar',
                                })
                              }
                              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            >
                              <Sidebar className="w-3.5 h-3.5 text-amber-500" />
                              <span>تثبيت القائمة الجانبية (Sidebar)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setIsGlobalMovementModalOpen(true)}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span>تسجيل حركة فورية</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Quick Screen Options & Font Switcher Toolbar */}
                      <QuickScreenToolbar
                        appearance={appearance}
                        onAppearanceChange={handleAppearanceChange}
                        isDarkMode={isDarkTheme}
                        onToggleDarkMode={toggleDarkMode}
                        onOpenMovementModal={() => setIsGlobalMovementModalOpen(true)}
                        onOpenCalendar={() => setActiveWorkspaceTab('calendar')}
                        onOpenTrash={() => setIsTrashModalOpen(true)}
                        trashedCount={trashedCount}
                      />

                      <AnimatePresence mode="wait">
                        {/* Tab 0: Central Dashboard */}
                        {activeWorkspaceTab === 'dashboard' && (
                          <motion.div
                            key="tab-dashboard"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.18 }}
                          >
                            <ExecutiveDashboardHub
                              currentUser={loggedInUser}
                              organization={organization}
                              employees={employeesList}
                              appearance={appearance}
                              onNavigate={(tab) => setActiveWorkspaceTab(tab)}
                              onNavigateToFiveYearLeave={() => {
                                setDailyMovementsSubTab('five_year_leaves');
                                setActiveWorkspaceTab('daily_movements');
                              }}
                              onToggleLayout={(layout) =>
                                handleAppearanceChange({ ...appearance, navigationLayout: layout })
                              }
                              onOpenMovementModal={() => setIsGlobalMovementModalOpen(true)}
                              onLogout={handleLogout}
                              currentTime={currentTime}
                            />
                          </motion.div>
                        )}

                        {/* Tab 1: Employee Management */}
                        {activeWorkspaceTab === 'employees' && (
                          <motion.div
                            key="tab-employees"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.18 }}
                          >
                            <EmployeeManagement
                              appearance={appearance}
                              leaveRules={leaveRules}
                              employmentLabels={employmentLabels}
                              initialEmployees={employeesList}
                              onEmployeesChanged={setEmployeesList}
                              onBackToDashboard={() => setActiveWorkspaceTab('dashboard')}
                              onNavigate={(tab) => setActiveWorkspaceTab(tab)}
                              currentUser={loggedInUser}
                            />
                          </motion.div>
                        )}

                        {/* Tab 2: Daily Movements Hub */}
                        {activeWorkspaceTab === 'daily_movements' && (
                          <motion.div
                            key="tab-daily-movements"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.18 }}
                          >
                            <DailyMovementsHub
                              employees={employeesList}
                              leaveRules={leaveRules}
                              organization={organization}
                              employmentLabels={employmentLabels}
                              initialSubTab={dailyMovementsSubTab}
                              onEmployeesChanged={setEmployeesList}
                              onBackToDashboard={() => setActiveWorkspaceTab('dashboard')}
                              onNavigate={(tab) => setActiveWorkspaceTab(tab)}
                            />
                          </motion.div>
                        )}

                        {/* Tab 3: Attendance & Leave Reports */}
                        {activeWorkspaceTab === 'reports' && (
                          <motion.div
                            key="tab-reports"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.18 }}
                          >
                            <AttendanceReports
                              employees={employeesList}
                              leaveRules={leaveRules}
                              employmentLabels={employmentLabels}
                              onEmployeesChanged={setEmployeesList}
                              currentUser={loggedInUser}
                              onBackToDashboard={() => setActiveWorkspaceTab('dashboard')}
                              onNavigate={(tab) => setActiveWorkspaceTab(tab)}
                            />
                          </motion.div>
                        )}

                        {/* Tab 3.5: Movement Report Designer & Statistical Charts (Exclusive) */}
                        {activeWorkspaceTab === 'movement_designer' && (
                          <motion.div
                            key="tab-movement-designer"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.18 }}
                          >
                            <MovementReportDesigner
                              employees={employeesList}
                              currentUser={loggedInUser}
                              employmentLabels={employmentLabels}
                              onBackToDashboard={() => setActiveWorkspaceTab('dashboard')}
                              onNavigate={(tab) => setActiveWorkspaceTab(tab)}
                            />
                          </motion.div>
                        )}

                        {/* Tab 4: Annual Calendar & Official Holidays (Iraq 2026) */}
                        {activeWorkspaceTab === 'calendar' && (
                          <motion.div
                            key="tab-calendar"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.18 }}
                          >
                            <AnnualCalendarHolidays
                              employees={employeesList}
                              currentUser={loggedInUser}
                              onHolidayCirculated={handleReloadAllData}
                              onBackToDashboard={() => setActiveWorkspaceTab('dashboard')}
                              onNavigate={(tab) => setActiveWorkspaceTab(tab)}
                            />
                          </motion.div>
                        )}

                        {/* Tab 5: Settings Panel (Rules, RBAC, Appearance, Org, Master Lock) */}
                        {activeWorkspaceTab === 'settings' && (
                          <motion.div
                            key="tab-settings"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.18 }}
                          >
                            <SettingsPanel
                              currentUser={loggedInUser}
                              appearance={appearance}
                              onAppearanceChange={handleAppearanceChange}
                              leaveRules={leaveRules}
                              onLeaveRulesChange={handleLeaveRulesChange}
                              organization={organization}
                              onOrganizationChange={handleOrganizationChange}
                              employmentLabels={employmentLabels}
                              onEmploymentLabelsChange={handleEmploymentLabelsChange}
                              onRestoreComplete={handleReloadAllData}
                              onBackToDashboard={() => setActiveWorkspaceTab('dashboard')}
                              onNavigate={(tab) => setActiveWorkspaceTab(tab)}
                              onOpenLicense={() => setIsActivationModalOpen(true)}
                              onOpenLicenseGenerator={() => setIsGeneratorModalOpen(true)}
                            />
                          </motion.div>
                        )}

                        {/* Tab: Barcode & Smart Badges Hub */}
                        {activeWorkspaceTab === 'barcode_hub' && (
                          <motion.div
                            key="tab-barcode-hub"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.18 }}
                            className="max-w-6xl mx-auto"
                          >
                            <BarcodeAttendanceHub
                              organization={organization}
                              onOpenEmployeeProfile={(empId) => setSelectedProfileEmployeeId(empId)}
                              onBackToDashboard={() => setActiveWorkspaceTab('dashboard')}
                              employees={employeesList}
                              currentUser={loggedInUser}
                              leaveRules={leaveRules}
                            />
                          </motion.div>
                        )}

                        {/* Tab: Annual Allowances & Promotions Hub */}
                        {activeWorkspaceTab === 'allow_promotions' && (
                          <motion.div
                            key="tab-allowances-promotions"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.18 }}
                            className="max-w-6xl mx-auto"
                          >
                            <AllowancesPromotionsHub
                              organization={organization}
                              onOpenEmployeeProfile={(empId) => setSelectedProfileEmployeeId(empId)}
                              onBackToDashboard={() => setActiveWorkspaceTab('dashboard')}
                            />
                          </motion.div>
                        )}

                        {/* Tab: Retirement & Pension Affairs Hub */}
                        {activeWorkspaceTab === 'retirement' && (
                          <motion.div
                            key="tab-retirement"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.18 }}
                            className="max-w-6xl mx-auto"
                          >
                            <RetirementHub
                              organization={organization}
                              onOpenEmployeeProfile={(empId) => setSelectedProfileEmployeeId(empId)}
                              onBackToDashboard={() => setActiveWorkspaceTab('dashboard')}
                            />
                          </motion.div>
                        )}

                        {/* Tab: Interactive Analytics Hub (Recharts) */}
                        {activeWorkspaceTab === 'analytics' && (
                          <motion.div
                            key="tab-analytics"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.18 }}
                            className="max-w-6xl mx-auto"
                          >
                            <InteractiveAnalyticsHub
                              employees={employeesList}
                              organization={organization}
                              currentUser={loggedInUser}
                              onBackToDashboard={() => setActiveWorkspaceTab('dashboard')}
                              onOpenEmployeeProfile={(empId) => setSelectedProfileEmployeeId(empId)}
                            />
                          </motion.div>
                        )}

                      {/* Tab 4: Current User Profile & RBAC Info */}
                      {activeWorkspaceTab === 'profile' && (
                        <motion.div
                          key="tab-profile"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.18 }}
                          className="max-w-3xl mx-auto space-y-5"
                        >
                          {/* Navigation Bar */}
                          <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between gap-3 no-print">
                            <button
                              type="button"
                              onClick={() => setActiveWorkspaceTab('dashboard')}
                              className="px-3.5 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all border border-amber-200 dark:border-amber-800 cursor-pointer shadow-2xs"
                              title="الرجوع إلى لوحة التحكم الرئيسية"
                            >
                              <Home className="w-4 h-4" />
                              <span>الرجوع للشاشة الرئيسية</span>
                            </button>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                              الملف الشخصي والصلاحيات
                            </span>
                          </div>

                          {/* Identity Card */}
                          <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <div className="flex items-center gap-3.5">
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${loggedInUser.avatarColor} flex items-center justify-center text-white font-bold text-xl shadow-md shadow-amber-500/20`}>
                                  <User className="w-7 h-7" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {loggedInUser.fullName}
                                  </h3>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {loggedInUser.jobTitle}
                                  </p>
                                </div>
                              </div>
                              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                {loggedInUser.roleTitleAr}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-200 dark:border-slate-700 text-xs">
                              <div>
                                <span className="text-slate-400">القسم والتشكيل الإداري: </span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {loggedInUser.department}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400">اسم المستخدم (المعرف الرسمي): </span>
                                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                                  {loggedInUser.username}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Permissions Matrix */}
                          <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-emerald-500" />
                              <span>صلاحيات الوصول الإدارية المقيدة (RBAC Matrix):</span>
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                              <div
                                className={`p-3 rounded-2xl border flex items-center gap-2.5 ${
                                  loggedInUser.permissions.canEditAttendance
                                    ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold'
                                    : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 line-through'
                                }`}
                              >
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span>تسجيل وتعديل الحضور والغياب اليومي</span>
                              </div>

                              <div
                                className={`p-3 rounded-2xl border flex items-center gap-2.5 ${
                                  loggedInUser.permissions.canApproveLeaves
                                    ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold'
                                    : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 line-through'
                                }`}
                              >
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span>منح واعتماد الإجازات الرسمية والزمنيات</span>
                              </div>

                              <div
                                className={`p-3 rounded-2xl border flex items-center gap-2.5 ${
                                  loggedInUser.permissions.canDeleteRecords
                                    ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold'
                                    : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 line-through'
                                }`}
                              >
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span>حذف وتعديل القيود الحساسة جماعياً</span>
                              </div>

                              <div
                                className={`p-3 rounded-2xl border flex items-center gap-2.5 ${
                                  loggedInUser.permissions.canGenerateReports
                                    ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold'
                                    : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 line-through'
                                }`}
                              >
                                <FileText className="w-4 h-4 shrink-0" />
                                <span>طباعة واستخراج التقارير الرسمية A4</span>
                              </div>

                              <div
                                className={`p-3 rounded-2xl border flex items-center gap-2.5 sm:col-span-2 ${
                                  loggedInUser.permissions.canAccessMasterSettings
                                    ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold'
                                    : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 line-through'
                                }`}
                              >
                                <KeyRound className="w-4 h-4 shrink-0" />
                                <span>إعدادات النظام المركزية وإدارة المستخدمين والصلاحيات</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Tab 5: IndexedDB Offline Tester */}
                      {activeWorkspaceTab === 'db_test' && (
                        <motion.div
                          key="tab-dbtest"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.18 }}
                          className="max-w-3xl mx-auto space-y-4"
                        >
                          <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between gap-3 no-print">
                            <button
                              type="button"
                              onClick={() => setActiveWorkspaceTab('dashboard')}
                              className="px-3.5 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all border border-amber-200 dark:border-amber-800 cursor-pointer shadow-2xs"
                              title="الرجوع إلى لوحة التحكم الرئيسية"
                            >
                              <Home className="w-4 h-4" />
                              <span>الرجوع للشاشة الرئيسية</span>
                            </button>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                              فاحص قاعدة البيانات المحلية
                            </span>
                          </div>
                          <IndexedDBTester onEmployeeDataChanged={handleReloadAllData} />
                        </motion.div>
                      )}

                      {/* Tab 6: Full Database Backup & Restore */}
                      {activeWorkspaceTab === 'backup' && (
                        <motion.div
                          key="tab-backup"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.18 }}
                          className="max-w-5xl mx-auto"
                        >
                          <DatabaseBackupManager
                            currentUser={loggedInUser}
                            onRestoreComplete={handleReloadAllData}
                            onBackToDashboard={() => setActiveWorkspaceTab('dashboard')}
                            onNavigate={(tab) => setActiveWorkspaceTab(tab)}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </main>
                </div>
              )}
              </div>

              {/* Global Add Movement Modal accessible from QuickScreenToolbar and anywhere in the workspace */}
              <AddMovementModal
                isOpen={isGlobalMovementModalOpen}
                onClose={() => setIsGlobalMovementModalOpen(false)}
                employees={employeesList}
                currentUser={loggedInUser}
                onRecordSaved={(newRec, updatedEmp) => {
                  if (updatedEmp) {
                    setEmployeesList((prev) =>
                      prev.map((e) => (e.id === updatedEmp.id ? updatedEmp : e))
                    );
                    toast.success(
                      `تم تسجيل ${newRec.movementTitle || 'الحركة'} وتحديث رصيد (${updatedEmp.fullName}) إلى ${updatedEmp.remainingBalance} يوماً`
                    );
                  } else {
                    toast.success(`تم تسجيل ${newRec.movementTitle || 'الحركة'} بنجاح للموظف (${newRec.employeeName || ''})`);
                  }
                }}
              />

              {/* Master Unified Employee Profile Modal (Single Source of Truth) */}
              {selectedProfileEmployeeId && (
                <MasterEmployeeProfileModal
                  isOpen={Boolean(selectedProfileEmployeeId)}
                  onClose={() => setSelectedProfileEmployeeId(null)}
                  employeeId={selectedProfileEmployeeId}
                  organization={organization}
                  leaveRules={leaveRules}
                  onOpenMovementModal={(empId, cat) => {
                    setIsGlobalMovementModalOpen(true);
                  }}
                  onGrantAllowance={(emp) => {
                    setActiveWorkspaceTab('allow_promotions');
                    setSelectedProfileEmployeeId(null);
                  }}
                  onPromoteEmployee={(emp) => {
                    setActiveWorkspaceTab('allow_promotions');
                    setSelectedProfileEmployeeId(null);
                  }}
                  onRetireEmployee={(emp) => {
                    setActiveWorkspaceTab('retirement');
                    setSelectedProfileEmployeeId(null);
                  }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 3. Official System Footer (Developer Credits & Support as explicitly specified) */}
      <footer className="relative z-10 w-full border-t border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-right">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              المبرمج والمطور: المهندس حسين عبد المنذر
            </span>
            <span className="text-slate-400">|</span>
            <a
              href="tel:07711145014"
              className="text-amber-600 dark:text-amber-400 hover:underline font-mono"
              dir="ltr"
            >
              07711145014
            </a>
            <span className="text-slate-400">|</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono">
              تليجرام: @h92so
            </span>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            المنهج الرقمي للإدارة الحكومية © 2026 — مصمم خصيصاً للدوائر والمؤسسات الحكومية
          </div>
        </div>
      </footer>

      {/* Help & Forgot Password Modal */}
      {showHelpModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowHelpModal(false);
            }
          }}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-150 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Info className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                المساعدة واستعادة كلمة المرور
              </h3>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2.5 leading-relaxed">
              <p>
                وفقاً للضوابط الأمنية المعمول بها في أنظمة سطح المكتب الحكومية، يتم تعيين وتصفير
                كلمات المرور مركزياً من خلال المشرف العام للمنظومة أو مسؤول تكنولوجيا المعلومات.
              </p>
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  الدعم الفني والبرمجي:
                </div>
                <div>المهندس: حسين عبد المنذر</div>
                <div>الهاتف: <span className="font-mono">07711145014</span></div>
                <div>التليجرام: <span className="font-mono">@h92so</span></div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full mt-4 py-2 px-4 rounded-xl text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-opacity cursor-pointer"
            >
              إغلاق النافذة
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Desktop App (.exe) Modal */}
      <DesktopExportModal
        isOpen={showDesktopExportModal}
        onClose={() => setShowDesktopExportModal(false)}
      />

      {/* Global Trash Bin Modal */}
      <TrashModal
        isOpen={isTrashModalOpen}
        onClose={() => setIsTrashModalOpen(false)}
        allCurrentEmployees={employeesList}
        onEmployeesRestored={(restored) => {
          setEmployeesList((prev) => {
            const restoredIds = new Set(restored.map((r) => r.id));
            const filtered = prev.filter((p) => !restoredIds.has(p.id));
            return [...restored, ...filtered];
          });
          toast.success(`تمت استعادة (${restored.length}) من الموظفين بنجاح`);
        }}
        onEmployeesDeletedPermanently={(deletedIds) => {
          setEmployeesList((prev) => prev.filter((e) => !deletedIds.includes(e.id)));
        }}
      />

      {/* Global Master Unified Employee Profile Modal */}
      {selectedProfileEmployeeId && (
        <MasterEmployeeProfileModal
          isOpen={Boolean(selectedProfileEmployeeId)}
          onClose={() => setSelectedProfileEmployeeId(null)}
          employeeId={selectedProfileEmployeeId}
          organization={organization}
          leaveRules={leaveRules}
          onEditEmployee={() => {
            setSelectedProfileEmployeeId(null);
            setActiveWorkspaceTab('employees');
          }}
          onOpenMovementModal={(_empId, _cat) => {
            setSelectedProfileEmployeeId(null);
            setIsGlobalMovementModalOpen(true);
          }}
          onGrantAllowance={() => {
            setSelectedProfileEmployeeId(null);
            setActiveWorkspaceTab('allow_promotions');
          }}
          onPromoteEmployee={() => {
            setSelectedProfileEmployeeId(null);
            setActiveWorkspaceTab('allow_promotions');
          }}
          onRetireEmployee={() => {
            setSelectedProfileEmployeeId(null);
            setActiveWorkspaceTab('retirement');
          }}
        />
      )}

      {/* Commercial License Lock Screen if trial expired and no active license */}
      {licenseStatus && !licenseStatus.isLicensed && licenseStatus.isExpired && (
        <LicenseLockScreen
          status={licenseStatus}
          organization={organization}
          onOpenGenerator={() => setIsGeneratorModalOpen(true)}
          onActivated={() => {
            licenseService.getStatus().then(setLicenseStatus);
          }}
        />
      )}

      {/* Commercial License Details & Activation Modal */}
      <LicenseActivationModal
        isOpen={isActivationModalOpen}
        onClose={() => setIsActivationModalOpen(false)}
        status={licenseStatus}
        organization={organization}
        onOpenGenerator={() => {
          setIsActivationModalOpen(false);
          setIsGeneratorModalOpen(true);
        }}
        onActivated={() => {
          licenseService.getStatus().then(setLicenseStatus);
        }}
      />

      {/* Seller & Master Key Generator Modal */}
      <LicenseGeneratorModal
        isOpen={isGeneratorModalOpen}
        onClose={() => setIsGeneratorModalOpen(false)}
        organization={organization}
        onLicenseChanged={() => {
          licenseService.getStatus().then(setLicenseStatus);
        }}
      />

      {/* Global Toast Notification System */}
      <ToastContainer />
    </div>
  );
}
