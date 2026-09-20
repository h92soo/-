import React, { useState, useEffect } from 'react';
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
  UserCheck,
  Check,
  Info,
  Server,
  ArrowRight,
  Sparkles,
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
import {
  UserAccount,
  Employee,
  AppearanceSettings,
  LeaveRulesSettings,
  OrganizationSettings,
} from './types';
import {
  DEFAULT_APPEARANCE_SETTINGS,
  DEFAULT_LEAVE_RULES,
  getSystemSetting,
  saveSystemSetting,
  getAllEmployees,
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
  | 'movement_designer';

const DEFAULT_ORGANIZATION: OrganizationSettings = {
  ministryName: 'وزارة التعليم العالي والبحث العلمي',
  directorateName: 'دائرة الشؤون الإدارية والمالية',
  departmentName: 'قسم إدارة الموارد البشرية والخدمة المدنية',
  officialEmblem: 'golden_eagle' as any,
  operatingYear: 2026,
};

export default function App() {
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('SAsa12589');
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
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(false);
  const [isGlobalMovementModalOpen, setIsGlobalMovementModalOpen] = useState<boolean>(false);

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

  // Handle preset quick select
  const handleSelectPreset = (acc: typeof PRESET_ACCOUNTS[0]) => {
    setUsername(acc.username);
    setPassword(acc.passwordHint);
    setErrorMessage(null);
  };

  // Submit Login Handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password.trim()) {
      setErrorMessage('يرجى إدخال اسم المستخدم وكلمة المرور للمتابعة.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      // Check credentials against presets or master password SAsa12589
      const matched = PRESET_ACCOUNTS.find(
        (acc) =>
          acc.username.toLowerCase() === username.trim().toLowerCase() &&
          acc.passwordHint === password.trim()
      );

      // Also allow admin with master password
      if (
        (username.trim().toLowerCase() === 'admin' && password.trim() === 'SAsa12589') ||
        matched
      ) {
        const activeUser = matched || PRESET_ACCOUNTS[0];
        setLoggedInUser(activeUser);
        setIsLoading(false);
      } else {
        setIsLoading(false);
        setErrorMessage(
          'اسم المستخدم أو كلمة المرور غير صحيحة. يرجى التحقق أو اختيار حساب من الحسابات الجاهزة أدناه.'
        );
      }
    }, 600);
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setPassword('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-amber-500 selection:text-white relative overflow-x-hidden">
      {/* Subtle Apple-style Background Ambient Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-emerald-500/10 dark:bg-emerald-600/10 blur-[130px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-amber-500/10 dark:bg-amber-600/10 blur-[130px]" />
        <div className="absolute top-[40%] left-[30%] w-[450px] h-[450px] rounded-full bg-blue-500/5 dark:bg-blue-600/5 blur-[120px]" />
      </div>

      {/* 1. Desktop Window Frame Header (macOS System Bar) */}
      <header className="relative z-10 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-4 py-2.5 flex items-center justify-between shadow-xs">
        {/* Right side in RTL: Window Traffic Controls & System State */}
        <div className="flex items-center gap-4">
          <WindowTrafficLights
            onClose={() => alert('إغلاق نافذة النظام (جاهز لبيئة Electron)')}
            onMinimize={() => alert('تم تصغير النافذة')}
            onMaximize={() => alert('تم تفعيل وضع ملء الشاشة')}
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

        {/* Left side in RTL: Theme Switcher and Desktop status */}
        <div className="flex items-center gap-3">
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
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="أدخل اسم المستخدم (مثال: admin)"
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
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
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

                {/* Quick Demo Credentials Bar (حسابات تجريبية سريعة) */}
                <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-800">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                    <span>حسابات سريعة للمعاينة واختبار الصلاحيات (RBAC):</span>
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {PRESET_ACCOUNTS.map((acc) => {
                      const isSelected = username === acc.username;
                      return (
                        <button
                          key={acc.username}
                          type="button"
                          onClick={() => handleSelectPreset(acc)}
                          className={`p-2 rounded-xl text-[11px] text-right transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400/80 text-amber-900 dark:text-amber-200 shadow-xs'
                              : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="font-semibold truncate">{acc.roleTitleAr.split(' ')[0]} {acc.roleTitleAr.split(' ')[1] || ''}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-mono">
                            {acc.username}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Direct Launch Button to Employee Management */}
                  <button
                    type="button"
                    id="quick-demo-admin-login-btn"
                    onClick={() => {
                      setLoggedInUser(PRESET_ACCOUNTS[0]);
                      setActiveWorkspaceTab('employees');
                    }}
                    className="w-full mt-2.5 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-800/70 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>دخول فوري كمدير النظام لمعاينة سجل الموظفين (IndexedDB)</span>
                  </button>
                </div>

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
              </div>

              {/* IndexedDB Local Persistence Tester Card */}
              <div className="mt-4">
                <IndexedDBTester compact />
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
              <div className="relative rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col min-h-[780px]">
                
                {/* 1. Desktop Window Frame Header (macOS title bar with traffic lights & breadcrumb) */}
                <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/70 flex flex-wrap items-center justify-between gap-3 select-none">
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
                        {activeWorkspaceTab === 'calendar' && 'التقويم السنوي والعطل الرسمية والمناسبات (رئاسة الوزراء)'}
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
                      onToggleLayout={(layout) =>
                        handleAppearanceChange({ ...appearance, navigationLayout: layout })
                      }
                      onOpenMovementModal={() => setIsGlobalMovementModalOpen(true)}
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
                              onEmployeesChanged={setEmployeesList}
                              onBackToDashboard={() => setActiveWorkspaceTab('dashboard')}
                              onNavigate={(tab) => setActiveWorkspaceTab(tab)}
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
                              onRestoreComplete={handleReloadAllData}
                              onBackToDashboard={() => setActiveWorkspaceTab('dashboard')}
                              onNavigate={(tab) => setActiveWorkspaceTab(tab)}
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
                          <IndexedDBTester />
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
                  }
                }}
              />
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
      <AnimatePresence>
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-2xl"
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
                className="w-full mt-4 py-2 px-4 rounded-xl text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-opacity"
              >
                إغلاق النافذة
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
