import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Shield,
  ShieldCheck,
  UserPlus,
  Users,
  Clock,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  Check,
  Trash2,
  Edit,
  Save,
  RotateCcw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  LayoutGrid,
  Sun,
  Palette,
  Timer,
  AlertTriangle,
  FileCheck,
  Database,
  Type,
  Cloud,
  Mail,
  Building2,
  Sidebar,
  Home,
  Zap,
  FileText,
} from 'lucide-react';
import {
  LeaveRulesSettings,
  AppearanceSettings,
  SystemUserAccount,
  UserRole,
  UserAccount,
  FontFamilyOption,
  OrganizationSettings,
  WorkspaceTab,
} from '../types';
import { ARABIC_FONTS_CATALOG } from './QuickScreenToolbar';
import {
  DEFAULT_LEAVE_RULES,
  DEFAULT_APPEARANCE_SETTINGS,
  getSystemSetting,
  saveSystemSetting,
  getSystemUsers,
  saveSystemUser,
  deleteSystemUser,
} from '../db/indexedDB';
import { DatabaseBackupManager } from './DatabaseBackupManager';

interface SettingsPanelProps {
  currentUser: UserAccount;
  appearance: AppearanceSettings;
  onAppearanceChange: (newAppearance: AppearanceSettings) => void;
  leaveRules: LeaveRulesSettings;
  onLeaveRulesChange: (newRules: LeaveRulesSettings) => void;
  organization?: OrganizationSettings;
  onOrganizationChange?: (newOrg: OrganizationSettings) => void;
  onRestoreComplete?: () => void;
  onBackToDashboard?: () => void;
  onNavigate?: (tab: WorkspaceTab) => void;
}

const INITIAL_DEFAULT_USERS: SystemUserAccount[] = [
  {
    id: 'USR-001',
    username: 'admin',
    fullName: 'المهندس حسين عبد المنذر',
    jobTitle: 'مشرف النظام المركزي ومطور المنظومة',
    department: 'الإدارة المركزية والدعم الفني',
    role: 'super_admin',
    roleTitleAr: 'مشرف النظام المركزي (Super Admin)',
    avatarColor: 'amber',
    isActive: true,
    passwordHash: 'SAsa12589',
    createdAt: '2026-01-01',
    permissions: {
      canEditAttendance: true,
      canApproveLeaves: true,
      canDeleteRecords: true,
      canGenerateReports: true,
      canAccessMasterSettings: true,
    },
  },
  {
    id: 'USR-002',
    username: 'hr_manager',
    fullName: 'أ. د. كريم فاضل العبيدي',
    jobTitle: 'مدير الموارد البشرية والخدمة المدنية',
    department: 'قسم الموارد البشرية',
    role: 'hr_director',
    roleTitleAr: 'مدير الموارد البشرية (HR Director)',
    avatarColor: 'teal',
    isActive: true,
    passwordHash: 'hr123456',
    createdAt: '2026-01-01',
    permissions: {
      canEditAttendance: true,
      canApproveLeaves: true,
      canDeleteRecords: false,
      canGenerateReports: true,
      canAccessMasterSettings: false,
    },
  },
  {
    id: 'USR-003',
    username: 'officer',
    fullName: 'م. أحمد مهدي الجبوري',
    jobTitle: 'مسؤول شعبة الحضور والانصراف',
    department: 'شعبة الحضور والدوام',
    role: 'attendance_officer',
    roleTitleAr: 'مسؤول الحضور والغياب (Attendance Officer)',
    avatarColor: 'blue',
    isActive: true,
    passwordHash: 'officer123',
    createdAt: '2026-01-01',
    permissions: {
      canEditAttendance: true,
      canApproveLeaves: false,
      canDeleteRecords: false,
      canGenerateReports: true,
      canAccessMasterSettings: false,
    },
  },
  {
    id: 'USR-004',
    username: 'auditor',
    fullName: 'السيدة نادية صادق الشمري',
    jobTitle: 'مدقق مالي وإداري',
    department: 'قسم الرقابة والتدقيق الداخلي',
    role: 'auditor',
    roleTitleAr: 'مدقق داخلي ورقابة (Auditor)',
    avatarColor: 'slate',
    isActive: true,
    passwordHash: 'audit123',
    createdAt: '2026-01-01',
    permissions: {
      canEditAttendance: false,
      canApproveLeaves: false,
      canDeleteRecords: false,
      canGenerateReports: true,
      canAccessMasterSettings: false,
    },
  },
];

export function SettingsPanel({
  currentUser,
  appearance,
  onAppearanceChange,
  leaveRules,
  onLeaveRulesChange,
  organization,
  onOrganizationChange,
  onRestoreComplete,
  onBackToDashboard,
  onNavigate,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'org_identity' | 'leave_rules' | 'users_rbac' | 'appearance' | 'backup_restore'>('org_identity');

  // Master password lock for ultra-safe administrative operations (SAsa12589)
  const [isMasterUnlocked, setIsMasterUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('admin_master_unlocked') === 'true';
  });
  const [masterPasswordInput, setMasterPasswordInput] = useState('');
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Organization identity form state
  const [orgForm, setOrgForm] = useState<OrganizationSettings>(() => {
    return organization || {
      ministryName: 'وزارة التعليم العالي والبحث العلمي',
      directorateName: 'دائرة الشؤون الإدارية والمالية',
      departmentName: 'قسم إدارة الموارد البشرية والخدمة المدنية',
      officialEmblem: 'golden_eagle',
      operatingYear: 2026,
    };
  });
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [orgSaveSuccess, setOrgSaveSuccess] = useState(false);

  const handleSaveOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingOrg(true);
    try {
      await saveSystemSetting('organization_settings', orgForm);
      if (onOrganizationChange) {
        onOrganizationChange(orgForm);
      }
      setOrgSaveSuccess(true);
      setTimeout(() => setOrgSaveSuccess(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingOrg(false);
    }
  };

  const handleUnlockMaster = (e: React.FormEvent) => {
    e.preventDefault();
    if (masterPasswordInput.trim() === 'SAsa12589') {
      setIsMasterUnlocked(true);
      sessionStorage.setItem('admin_master_unlocked', 'true');
      setPasswordError('');
    } else {
      setPasswordError('كلمة المرور غير صحيحة! يرجى إدخال رمز المرور الإداري المعتمد: SAsa12589');
    }
  };

  // Rules form state
  const [rulesForm, setRulesForm] = useState<LeaveRulesSettings>(leaveRules);
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [rulesSaveSuccess, setRulesSaveSuccess] = useState(false);

  // Central Cloud Backup Email state
  const [cloudBackupEmail, setCloudBackupEmail] = useState<string>(() => {
    return localStorage.getItem('gov_backup_cloud_email') || 'husainabd292@gmail.com';
  });
  const [cloudEmailSuccess, setCloudEmailSuccess] = useState(false);
  const [cloudEmailError, setCloudEmailError] = useState('');

  const handleSaveCentralCloudEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cloudBackupEmail.trim())) {
      setCloudEmailError('يرجى إدخال عنوان بريد إلكتروني صحيح ومعتمد لمزامنة Google Drive.');
      return;
    }
    setCloudEmailError('');
    const sanitized = cloudBackupEmail.trim().toLowerCase();
    setCloudBackupEmail(sanitized);
    localStorage.setItem('gov_backup_cloud_email', sanitized);
    try {
      await saveSystemSetting('cloud_backup_email', sanitized);
    } catch (err) {
      console.error(err);
    }
    setCloudEmailSuccess(true);
    setTimeout(() => setCloudEmailSuccess(false), 4000);
  };

  // Users state
  const [users, setUsers] = useState<SystemUserAccount[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // New user form
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDepartment, setNewDepartment] = useState('قسم الموارد البشرية');
  const [newJobTitle, setNewJobTitle] = useState('موظف إداري');
  const [newRole, setNewRole] = useState<UserRole>('attendance_officer');
  const [newPermEditAttendance, setNewPermEditAttendance] = useState(true);
  const [newPermApproveLeaves, setNewPermApproveLeaves] = useState(false);
  const [newPermDeleteRecords, setNewPermDeleteRecords] = useState(false);
  const [newPermGenerateReports, setNewPermGenerateReports] = useState(true);
  const [newPermMasterSettings, setNewPermMasterSettings] = useState(false);
  const [userFormError, setUserFormError] = useState('');

  // Load users from IndexedDB
  useEffect(() => {
    async function loadData() {
      setIsLoadingUsers(true);
      try {
        const storedUsers = await getSystemUsers();
        if (storedUsers && storedUsers.length > 0) {
          setUsers(storedUsers);
        } else {
          // Initialize with default users
          for (const u of INITIAL_DEFAULT_USERS) {
            await saveSystemUser(u);
          }
          setUsers(INITIAL_DEFAULT_USERS);
        }
      } catch (e) {
        setUsers(INITIAL_DEFAULT_USERS);
      } finally {
        setIsLoadingUsers(false);
      }
    }
    loadData();
  }, []);

  // Save rules
  const handleSaveLeaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRules(true);
    try {
      await saveSystemSetting('leave_rules', rulesForm);
      onLeaveRulesChange(rulesForm);
      setRulesSaveSuccess(true);
      setTimeout(() => setRulesSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingRules(false);
    }
  };

  // Reset rules to default
  const handleResetLeaveRules = () => {
    setRulesForm(DEFAULT_LEAVE_RULES);
  };

  // Save or Add user
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError('');

    if (!newFullName.trim() || !newUsername.trim() || (!editingUserId && !newPassword)) {
      setUserFormError('يرجى ملء جميع الحقول الإلزامية.');
      return;
    }

    // Check username collision
    const existing = users.find((u) => u.username.toLowerCase() === newUsername.toLowerCase().trim() && u.id !== editingUserId);
    if (existing) {
      setUserFormError('اسم المستخدم موجود مسبقاً، يرجى اختيار اسم مستخدم فريد.');
      return;
    }

    const roleTitles: Record<UserRole, string> = {
      super_admin: 'مشرف النظام المركزي (Super Admin)',
      hr_director: 'مدير الموارد البشرية (HR Director)',
      attendance_officer: 'مسؤول الحضور والغياب (Attendance Officer)',
      auditor: 'مدقق داخلي ورقابة (Auditor)',
    };

    const targetUser: SystemUserAccount = {
      id: editingUserId || `USR-${Date.now()}`,
      username: newUsername.trim(),
      fullName: newFullName.trim(),
      department: newDepartment.trim(),
      jobTitle: newJobTitle.trim(),
      role: newRole,
      roleTitleAr: roleTitles[newRole] || 'موظف مصرح',
      avatarColor: newRole === 'super_admin' ? 'amber' : newRole === 'hr_director' ? 'teal' : 'blue',
      isActive: true,
      passwordHash: newPassword || (editingUserId ? users.find((u) => u.id === editingUserId)?.passwordHash || '123456' : '123456'),
      createdAt: editingUserId ? (users.find((u) => u.id === editingUserId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      permissions: {
        canEditAttendance: newPermEditAttendance,
        canApproveLeaves: newPermApproveLeaves,
        canDeleteRecords: newPermDeleteRecords,
        canGenerateReports: newPermGenerateReports,
        canAccessMasterSettings: newPermMasterSettings,
      },
    };

    try {
      await saveSystemUser(targetUser);
      if (editingUserId) {
        setUsers((prev) => prev.map((u) => (u.id === editingUserId ? targetUser : u)));
      } else {
        setUsers((prev) => [...prev, targetUser]);
      }
      setIsAddUserModalOpen(false);
      resetUserForm();
    } catch (err: unknown) {
      setUserFormError(err instanceof Error ? err.message : 'فشل حفظ المستخدم');
    }
  };

  const resetUserForm = () => {
    setEditingUserId(null);
    setNewFullName('');
    setNewUsername('');
    setNewPassword('');
    setNewDepartment('قسم الموارد البشرية');
    setNewJobTitle('موظف إداري');
    setNewRole('attendance_officer');
    setNewPermEditAttendance(true);
    setNewPermApproveLeaves(false);
    setNewPermDeleteRecords(false);
    setNewPermGenerateReports(true);
    setNewPermMasterSettings(false);
    setUserFormError('');
  };

  const handleEditUserClick = (u: SystemUserAccount) => {
    setEditingUserId(u.id);
    setNewFullName(u.fullName);
    setNewUsername(u.username);
    setNewPassword('');
    setNewDepartment(u.department);
    setNewJobTitle(u.jobTitle);
    setNewRole(u.role);
    setNewPermEditAttendance(u.permissions.canEditAttendance);
    setNewPermApproveLeaves(u.permissions.canApproveLeaves);
    setNewPermDeleteRecords(u.permissions.canDeleteRecords);
    setNewPermGenerateReports(u.permissions.canGenerateReports);
    setNewPermMasterSettings(u.permissions.canAccessMasterSettings);
    setIsAddUserModalOpen(true);
  };

  const handleToggleUserActive = async (u: SystemUserAccount) => {
    if (u.username === 'admin') return; // Cannot disable root super_admin
    const updated = { ...u, isActive: !u.isActive };
    await saveSystemUser(updated);
    setUsers((prev) => prev.map((item) => (item.id === u.id ? updated : item)));
  };

  const handleDeleteUserClick = async (id: string, username: string) => {
    if (username === 'admin') {
      alert('لا يمكن حذف حساب مشرف النظام المركزي الافتراضي.');
      return;
    }
    if (confirm(`هل أنت متأكد من رغبتك بحذف المستخدم (${username}) نهائياً؟`)) {
      await deleteSystemUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
  };

  // Appearance toggle helpers
  const handleToggleAppearance = async (key: keyof AppearanceSettings, value: any) => {
    const updated = { ...appearance, [key]: value };
    onAppearanceChange(updated);
    await saveSystemSetting('appearance_settings', updated);
  };

  // Master password lock screen (SAsa12589)
  if (!isMasterUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
            <span>لوحة الإعدادات الإدارية العليا</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-mono font-bold">
              محمية بكلمة المرور
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            واجهة إعدادات النظام الديناميكية محمية برمز المرور الإداري المعتمد لضمان سلامة تخصيص هوية الوزارة وقواعد الأرصدة.
          </p>
        </div>

        <form onSubmit={handleUnlockMaster} className="space-y-4 text-right">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              كلمة المرور المركزية (SAsa12589):
            </label>
            <div className="relative">
              <input
                type={showMasterPassword ? 'text' : 'password'}
                value={masterPasswordInput}
                onChange={(e) => setMasterPasswordInput(e.target.value)}
                placeholder="أدخل رمز المرور المركزي..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 text-center"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowMasterPassword(!showMasterPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showMasterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordError && (
              <p className="text-[11px] text-rose-500 font-bold mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{passwordError}</span>
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            {onBackToDashboard && (
              <button
                type="button"
                onClick={onBackToDashboard}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                العودة للرئيسية
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-md shadow-amber-600/20 cursor-pointer"
            >
              فك قفل الإعدادات
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 0. Top Navigation & Quick Panel Switching Toolbar */}
      <div className="p-3 sm:p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2">
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="px-3.5 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all border border-amber-200 dark:border-amber-800 cursor-pointer shadow-2xs"
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
          <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            الإعدادات والصلاحيات
          </span>
        </div>
      </div>

      {/* Top Banner */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                لوحة الإعدادات والصلاحيات المركزية
              </h1>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono font-bold">
                2026 OFFICIAL
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              تخصيص هوية الوزارة والشعار، قواعد الأرصدة والزمنيات، المستخدمين ومصفوفة RBAC، والتحكم بمظهر الواجهة
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('org_identity')}
            className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'org_identity'
                ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-500" />
            <span>هوية الوزارة والشعار</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leave_rules')}
            className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'leave_rules'
                ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4 text-amber-500" />
            <span>قواعد الأرصدة والزمنيات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users_rbac')}
            className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'users_rbac'
                ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-500" />
            <span>المستخدمين والصلاحيات ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'appearance'
                ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Palette className="w-4 h-4 text-blue-500" />
            <span>التحكم بالمظهر والعرض</span>
          </button>

          <button
            type="button"
            id="tab-backup-restore-btn"
            onClick={() => setActiveTab('backup_restore')}
            className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'backup_restore'
                ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Database className="w-4 h-4 text-indigo-500" />
            <span>النسخ الاحتياطي والأمان</span>
          </button>
        </div>
      </div>

      {/* Tab 0: Organization & Emblem Customization */}
      {activeTab === 'org_identity' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                <span>تخصيص هوية الوزارة والدائرة والشعار الرسمي لتناسب أي عميل أو دائرة</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                تعديل الترويسة والأسماء الرسمية التي تظهر في الواجهة الرئيسية وبطاقات الحركات والتقارير والطباعة
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold self-start sm:self-auto">
              تخصيص ديناميكي فوري
            </span>
          </div>

          <form onSubmit={handleSaveOrganization} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  اسم الوزارة أو الجهة العليا:
                </label>
                <input
                  type="text"
                  value={orgForm.ministryName}
                  onChange={(e) => setOrgForm({ ...orgForm, ministryName: e.target.value })}
                  placeholder="مثال: جمهورية العراق - وزارة التعليم العالي والبحث العلمي"
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  اسم التشكيل / الدائرة أو الشركة:
                </label>
                <input
                  type="text"
                  value={orgForm.directorateName}
                  onChange={(e) => setOrgForm({ ...orgForm, directorateName: e.target.value })}
                  placeholder="مثال: دائرة الشؤون الإدارية والمالية"
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  اسم القسم أو الشعبة الإدارية:
                </label>
                <input
                  type="text"
                  value={orgForm.departmentName}
                  onChange={(e) => setOrgForm({ ...orgForm, departmentName: e.target.value })}
                  placeholder="مثال: قسم إدارة الموارد البشرية والخدمة المدنية"
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  الشعار الرسمي المعتمد:
                </label>
                <select
                  value={orgForm.officialEmblem}
                  onChange={(e) => setOrgForm({ ...orgForm, officialEmblem: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="golden_eagle">شعار النسر الجمهوري العراقي (ذهبي ملكي)</option>
                  <option value="dark_eagle">شعار النسر الجمهوري (كلاسيكي داكن)</option>
                  <option value="shield_eagle">شعار درع النسر الجمهوري مع العلم العراقي</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              {orgSaveSuccess ? (
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم حفظ وتحديث بيانات وهوية الوزارة والدائرة بنجاح في عموم النظام!</span>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400">
                  يتم حفظ التغييرات فوراً وتحديث كافة الترويسات والتقارير الرسمية
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingOrg}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-amber-600/20 transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>حفظ هوية الوزارة والشعار</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 1: Leave & Absence & Time-Off Rules */}
      {activeTab === 'leave_rules' && (
        <div className="space-y-6">
          {/* Central Cloud Backup Email Card in System Settings */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-50/80 via-white to-sky-50/80 dark:from-slate-800 dark:via-slate-800/90 dark:to-indigo-950/40 border border-indigo-200 dark:border-indigo-900 shadow-xs">
            <form onSubmit={handleSaveCentralCloudEmail} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>البريد الإلكتروني المعتمد للنسخ الاحتياطي السحابي (Google Drive Sync)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-300 dark:border-indigo-800">
                      إعداد مركزي
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    البريد المخصص لاستلام وحفظ النسخ الاحتياطية المشفرة تلقائياً في حساب Google Drive
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    id="central-cloud-email-input"
                    value={cloudBackupEmail}
                    onChange={(e) => setCloudBackupEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="pr-8 pl-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[240px]"
                    dir="ltr"
                    required
                  />
                </div>
                <button
                  type="submit"
                  id="save-central-cloud-email-btn"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>حفظ الإيميل</span>
                </button>
              </div>
            </form>

            {cloudEmailError && (
              <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-2">
                {cloudEmailError}
              </div>
            )}
            {cloudEmailSuccess && (
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>تم حفظ وتثبيت بريد النسخ الاحتياطي في الذاكرة الدائمة للنظام بنجاح.</span>
              </div>
            )}
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                <span>ضوابط الإجازات الاعتيادية والغياب والزمنيات (وفق القوانين الحكومية)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                يتم تطبيق هذه القواعد آلياً على احتساب الأرصدة وساعات الزمنية وتنبيهات الاستهلاك
              </p>
            </div>

            <button
              type="button"
              onClick={handleResetLeaveRules}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة المعايير الافتراضية</span>
            </button>
          </div>

          <form onSubmit={handleSaveLeaveRules} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Permanent Staff Card */}
              <div className="p-5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                    <span>ضوابط موظفي الملاك الدائم</span>
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold">
                    قانون الخدمة المدنية رقم 24
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      الرصيد السنوي الكامل (يوماً):
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={rulesForm.permanentAnnualBalance}
                      onChange={(e) =>
                        setRulesForm({ ...rulesForm, permanentAnnualBalance: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      required
                    />
                    <span className="text-[10px] text-slate-400">الافتراضي المعتمد: 36 يوماً سنوياً</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      الاستحقاق الشهري (يوماً لكل شهر خدمة):
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={rulesForm.permanentMonthlyRate}
                      onChange={(e) =>
                        setRulesForm({ ...rulesForm, permanentMonthlyRate: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      required
                    />
                    <span className="text-[10px] text-slate-400">الافتراضي: 3 أيام شهرياً</span>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rulesForm.permanentAccumulative}
                        onChange={(e) =>
                          setRulesForm({ ...rulesForm, permanentAccumulative: e.target.checked })
                        }
                        className="rounded text-amber-500 focus:ring-amber-400"
                      />
                      <span>الإجازة تراكمية (تدور للأعوام القادمة حتى 180 يوماً)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Contract Staff Card (Resolution 315) */}
              <div className="p-5 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span>ضوابط العقود الوزارية والأجور</span>
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-800 dark:text-blue-300 font-bold">
                    قرار مجلس الوزراء رقم 315
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      الرصيد السنوي الكامل (يوماً):
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={rulesForm.contractAnnualBalance}
                      onChange={(e) =>
                        setRulesForm({ ...rulesForm, contractAnnualBalance: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      required
                    />
                    <span className="text-[10px] text-slate-400">الافتراضي: 30 يوماً في السنة</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      الاستحقاق الشهري (يوماً لكل شهر خدمة):
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={rulesForm.contractMonthlyRate}
                      onChange={(e) =>
                        setRulesForm({ ...rulesForm, contractMonthlyRate: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      required
                    />
                    <span className="text-[10px] text-slate-400">الافتراضي: 4 أيام شهرياً</span>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rulesForm.contractAccumulative}
                        onChange={(e) =>
                          setRulesForm({ ...rulesForm, contractAccumulative: e.target.checked })
                        }
                        className="rounded text-blue-500 focus:ring-blue-400"
                      />
                      <span>الإجازة تراكمية للعقود (غير مفعل وفق التعليمات الوزارية)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Time-off Permissions & Early Warning */}
            <div className="p-5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 space-y-4">
              <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <Timer className="w-4 h-4 text-emerald-600" />
                <span>تنظيم الزمنيات (الإذن الساعي) والإنذار المبكر للأرصدة</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    الحد الأقصى لساعات الزمنية شهرياً:
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={rulesForm.maxTimePermissionsHoursMonthly}
                      onChange={(e) =>
                        setRulesForm({
                          ...rulesForm,
                          maxTimePermissionsHoursMonthly: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      required
                    />
                    <span className="absolute left-3 top-2 text-xs text-slate-400">ساعة / شهر</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    احتساب يوم إجازة كامل عند تجميع:
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="4"
                      max="14"
                      value={rulesForm.timePermissionHoursToLeaveDay}
                      onChange={(e) =>
                        setRulesForm({
                          ...rulesForm,
                          timePermissionHoursToLeaveDay: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      required
                    />
                    <span className="absolute left-3 top-2 text-xs text-slate-400">ساعات زمنية</span>
                  </div>
                  <span className="text-[10px] text-slate-400">تخصم آلياً من الرصيد الاعتيادي للموظف</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    عتبة الإنذار المبكر لنفاد الرصيد:
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="15"
                      value={rulesForm.earlyWarningThresholdDays}
                      onChange={(e) =>
                        setRulesForm({
                          ...rulesForm,
                          earlyWarningThresholdDays: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      required
                    />
                    <span className="absolute left-3 top-2 text-xs text-slate-400">أيام</span>
                  </div>
                  <span className="text-[10px] text-slate-400">إظهار تنبيه ملون عند وصول الرصيد لأقل من ذلك</span>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-2">
              {rulesSaveSuccess && (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم حفظ وتحديث قواعد الإجازات والزمنيات في IndexedDB بنجاح!</span>
                </div>
              )}
              <div className="mr-auto">
                <button
                  type="submit"
                  disabled={isSavingRules}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                >
                  {isSavingRules ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>جارٍ الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>حفظ القواعد وتطبيقها فورياً</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      )}

      {/* Tab 2: Users & RBAC */}
      {activeTab === 'users_rbac' && (
        <div className="space-y-6">
          {/* Header Action */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span>إدارة مستخدمي المنظومة ومصفوفة الصلاحيات (RBAC Access Matrix)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                إنشاء حسابات جديدة، تعيين كلمات المرور، ومنح أو حجب الصلاحيات التفصيلية
              </p>
            </div>

            <button
              type="button"
              id="add-new-user-btn"
              onClick={() => {
                resetUserForm();
                setIsAddUserModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة مستخدم جديد</span>
            </button>
          </div>

          {/* Users List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {users.map((u) => (
              <div
                key={u.id}
                className={`p-5 rounded-2xl border transition-all ${
                  u.isActive
                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700/60 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      {u.fullName.slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {u.fullName}
                        </h3>
                        {u.isActive ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" title="حساب مفعل" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-rose-500" title="حساب معطل" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        @{u.username} • {u.jobTitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEditUserClick(u)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                      title="تعديل الصلاحيات والمستخدم"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {u.username !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUserClick(u.id, u.username)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="حذف الحساب"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-3 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">القسم:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {u.department}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">الدور الإداري:</span>
                    <span className="font-semibold text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px]">
                      {u.roleTitleAr}
                    </span>
                  </div>

                  {/* Permissions Chips */}
                  <div className="pt-2">
                    <span className="text-slate-400 block mb-1.5 text-[11px] font-semibold">
                      الصلاحيات الممنوحة:
                    </span>
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <span
                        className={`px-2 py-0.5 rounded-lg font-semibold ${
                          u.permissions.canEditAttendance
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 line-through'
                        }`}
                      >
                        تعديل الحضور
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-lg font-semibold ${
                          u.permissions.canApproveLeaves
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 line-through'
                        }`}
                      >
                        اعتماد الإجازات
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-lg font-semibold ${
                          u.permissions.canDeleteRecords
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 line-through'
                        }`}
                      >
                        حذف السجلات
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-lg font-semibold ${
                          u.permissions.canGenerateReports
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 line-through'
                        }`}
                      >
                        استخراج التقارير
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-lg font-semibold ${
                          u.permissions.canAccessMasterSettings
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 line-through'
                        }`}
                      >
                        الإعدادات المركزية
                      </span>
                    </div>
                  </div>

                  {/* Toggle Active Button */}
                  {u.username !== 'admin' && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleToggleUserActive(u)}
                        className={`text-[11px] font-semibold px-3 py-1 rounded-lg transition-colors ${
                          u.isActive
                            ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                            : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                        }`}
                      >
                        {u.isActive ? 'تعطيل الحساب مؤقتاً' : 'تفعيل الحساب'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Appearance Controls */}
      {activeTab === 'appearance' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
          <div className="pb-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-blue-500" />
              <span>التحكم بالمظهر والعرض ونمط التنقل في شاشات التطبيق</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              تخصيص نمط عرض الواجهة (لوحة تحكم بالأزرار أم قائمة جانبية)، منظومة الإنذار المبكر، والخطوط
            </p>
          </div>

          {/* 1. Flexible Navigation Mode Toggle Switch */}
          <div className="p-5 rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-amber-600" />
                  <span>مفتاح التبديل المرن لنمط عرض الواجهة (Navigation Mode)</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  اختر نمط عرض النظام: لوحة التحكم المركزية بالأزرار الملونة أو القائمة الجانبية المستمرة (Sidebar)
                </div>
              </div>
              <span className="text-[10px] px-3 py-1 rounded-full font-bold bg-amber-600 text-white shadow-xs self-start sm:self-auto">
                النمط النشط: {appearance.navigationLayout === 'sidebar' ? 'القائمة الجانبية (Sidebar)' : 'لوحة التحكم المركزية'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleToggleAppearance('navigationLayout', 'dashboard_hub')}
                className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
                  appearance.navigationLayout !== 'sidebar'
                    ? 'bg-white dark:bg-slate-800 border-amber-500 ring-2 ring-amber-500/30 shadow-md'
                    : 'bg-white/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-amber-500" />
                    لوحة التحكم المركزية بالأزرار الملونة
                  </span>
                  {appearance.navigationLayout !== 'sidebar' && (
                    <span className="text-amber-600 font-bold text-xs">✓ مفعل حالياً</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  واجهة عصرية تضم بطاقات إحصائية رئيسية وشبكة أزرار مربعة ملونة كبيرة للوصول المباشر إلى الأقسام مع شاشات مستقلة كاملة وزر العودة.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleToggleAppearance('navigationLayout', 'sidebar')}
                className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
                  appearance.navigationLayout === 'sidebar'
                    ? 'bg-white dark:bg-slate-800 border-indigo-500 ring-2 ring-indigo-500/30 shadow-md'
                    : 'bg-white/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                    <Sidebar className="w-4 h-4 text-indigo-500" />
                    القائمة الجانبية المستمرة (Sidebar)
                  </span>
                  {appearance.navigationLayout === 'sidebar' && (
                    <span className="text-indigo-600 font-bold text-xs">✓ مفعل حالياً</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  شريط جانبي داكن ثابت على اليمين يعرض الشعار والاسم مع تبديل سلس وسريع بين مختلف وحدات العمل دون مغادرة الشاشة.
                </p>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Early Warning Badges */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>منظومة الإنذار المبكر للأرصدة المنخفضة</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  إبراز شارة تحذيرية وتنبيهات ملونة للموظفين الذين شارف رصيد إجازاتهم على النفاد (أقل من 5 أيام)
                </div>
              </div>
              <input
                type="checkbox"
                checked={appearance.showEarlyWarningBadges}
                onChange={(e) => handleToggleAppearance('showEarlyWarningBadges', e.target.checked)}
                className="w-5 h-5 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
              />
            </div>
            {/* Show/Hide Stats Cards */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  إظهار بطاقات الإحصائيات العلوية
                </div>
                <div className="text-[11px] text-slate-500">
                  عرض بطاقات إجمالي الموظفين والملاك والعقود ورصيد الإجازات أعلى جدول الموظفين
                </div>
              </div>
              <input
                type="checkbox"
                checked={appearance.showStatsCards}
                onChange={(e) => handleToggleAppearance('showStatsCards', e.target.checked)}
                className="w-5 h-5 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
              />
            </div>

            {/* Compact Table View */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  نمط الجدول المضغوط (Compact Mode)
                </div>
                <div className="text-[11px] text-slate-500">
                  تقليل الهوامش الرأسية للجدول لعرض عدد أكبر من سجلات الموظفين دون تمرير
                </div>
              </div>
              <input
                type="checkbox"
                checked={appearance.compactTable}
                onChange={(e) => handleToggleAppearance('compactTable', e.target.checked)}
                className="w-5 h-5 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
              />
            </div>

            {/* Early Warning Badges */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  منظومة الإنذار المبكر للأرصدة المنخفضة
                </div>
                <div className="text-[11px] text-slate-500">
                  إبراز إشارة ضوئية ملونة بجانب الموظفين الذين شارف رصيد إجازاتهم على النفاد
                </div>
              </div>
              <input
                type="checkbox"
                checked={appearance.showEarlyWarningBadges}
                onChange={(e) => handleToggleAppearance('showEarlyWarningBadges', e.target.checked)}
                className="w-5 h-5 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
              />
            </div>

            {/* Digital Clock in Header */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  إظهار الساعة الرقمية الحكومية
                </div>
                <div className="text-[11px] text-slate-500">
                  عرض توقيت بغداد وتاريخ اليوم بالثواني في الشريط العلوي لتسهيل إثبات أوقات الدوام
                </div>
              </div>
              <input
                type="checkbox"
                checked={appearance.showDigitalClock}
                onChange={(e) => handleToggleAppearance('showDigitalClock', e.target.checked)}
                className="w-5 h-5 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Font Size Selector */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
            <label className="text-xs font-bold text-slate-900 dark:text-white block">
              حجم الخط العام في واجهة التطبيق:
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['compact', 'normal', 'large'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleToggleAppearance('fontSize', size)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    appearance.fontSize === size
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {size === 'compact' ? 'مضغوط (أصغر)' : size === 'normal' ? 'قياسي (معتدل)' : 'كبير (واضح جداً)'}
                </button>
              ))}
            </div>
          </div>

          {/* Dedicated Font Family Selection (تحسين الواجهة وأنواع الخطوط) */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Type className="w-4 h-4 text-amber-500" />
                  <span>نوع الخط العربي المعتمد لكافة شاشات وتقارير النظام:</span>
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  اختر الخط الأنسب لطبيعة العمل المكتبي، يتم التطبيق وحفظ التفضيل محلياً فوراً
                </p>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/60">
                الخط الحالي: {appearance.fontFamily || 'Readex Pro'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {ARABIC_FONTS_CATALOG.map((font) => {
                const isSelected = (appearance.fontFamily || 'Readex Pro') === font.id;
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => handleToggleAppearance('fontFamily', font.id)}
                    className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelected
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${font.cssClass} text-slate-900 dark:text-white`}>
                        {font.nameAr}
                      </span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${
                          isSelected
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {font.badge}
                      </span>
                    </div>

                    {/* Preview sentence */}
                    <p className={`text-xs text-slate-600 dark:text-slate-300 ${font.cssClass} line-clamp-1`}>
                      {font.sample}
                    </p>

                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60">
                      <span>نموذج: 0123456789</span>
                      {isSelected ? (
                        <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                          ✓ مفعل حالياً
                        </span>
                      ) : (
                        <span className="text-slate-400 hover:text-amber-500">انقر للتفعيل</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Database Backup & Recovery */}
      {activeTab === 'backup_restore' && (
        <DatabaseBackupManager
          currentUser={currentUser}
          onRestoreComplete={onRestoreComplete}
        />
      )}

      {/* Add / Edit User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {editingUserId ? 'تعديل مستخدم ومصفوفة الصلاحيات' : 'إضافة مستخدم نظام جديد'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    تخصيص بيانات الدخول وتحديد الصلاحيات بدقة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 overflow-y-auto space-y-4 flex-1">
              {userFormError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                  {userFormError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  الاسم الرباعي واللقب للموظف:
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="مثال: حسين عبد المنذر"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    اسم المستخدم (Login):
                  </label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="hussein_it"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    كلمة المرور:
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={editingUserId ? 'اتركها فارغة للإبقاء على الحالية' : 'كلمة المرور'}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required={!editingUserId}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    القسم الإداري:
                  </label>
                  <input
                    type="text"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    العنوان الوظيفي:
                  </label>
                  <input
                    type="text"
                    value={newJobTitle}
                    onChange={(e) => setNewJobTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  الدور الإداري المخصص (Role):
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="attendance_officer">مسؤول الحضور والغياب (Attendance Officer)</option>
                  <option value="hr_director">مدير الموارد البشرية (HR Director)</option>
                  <option value="auditor">مدقق داخلي ورقابة (Auditor)</option>
                  <option value="super_admin">مشرف النظام المركزي (Super Admin)</option>
                </select>
              </div>

              {/* Specific Permissions Checkboxes */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="text-xs font-bold text-slate-900 dark:text-white mb-2">
                  تحديد الصلاحيات الممنوحة لهذا المستخدم بدقة:
                </div>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPermEditAttendance}
                    onChange={(e) => setNewPermEditAttendance(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <span>صلاحية تسجيل وتعديل حركات الحضور والغياب والزمنيات</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPermApproveLeaves}
                    onChange={(e) => setNewPermApproveLeaves(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <span>صلاحية منح واعتماد طلبات الإجازات الاعتيادية والمرضية</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPermDeleteRecords}
                    onChange={(e) => setNewPermDeleteRecords(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <span>صلاحية حذف وتعديل سجلات الموظفين الحساسة</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPermGenerateReports}
                    onChange={(e) => setNewPermGenerateReports(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <span>صلاحية استخراج وتصدير وطباعة التقارير الرسمية</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPermMasterSettings}
                    onChange={(e) => setNewPermMasterSettings(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <span className="text-amber-700 dark:text-amber-300 font-bold">
                    صلاحية الدخول للإعدادات المركزية وقواعد الدوام
                  </span>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  {editingUserId ? 'حفظ التعديلات' : 'إنشاء المستخدم'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
