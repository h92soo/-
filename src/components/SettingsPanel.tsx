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
  Briefcase,
  Award,
  QrCode,
  Key,
} from 'lucide-react';
import { licenseService } from '../services/licenseService';
import {
  LeaveRulesSettings,
  AppearanceSettings,
  SystemUserAccount,
  UserRole,
  UserAccount,
  FontFamilyOption,
  OrganizationSettings,
  WorkspaceTab,
  EmploymentTypeLabelsSettings,
  DEFAULT_EMPLOYMENT_TYPE_LABELS,
  CareerSystemSettings,
  DEFAULT_CAREER_SETTINGS,
  LicenseStatus,
  SystemFeatureConfig,
  DEFAULT_SYSTEM_FEATURE_CONFIG,
} from '../types';
import { employeeService } from '../services/employeeService';
import { ARABIC_FONTS_CATALOG } from './QuickScreenToolbar';
import {
  DEFAULT_LEAVE_RULES,
  DEFAULT_APPEARANCE_SETTINGS,
  getSystemSetting,
  saveSystemSetting,
  getSystemUsers,
  saveSystemUser,
  deleteSystemUser,
  saveEmploymentTypeLabels,
  getEmploymentTypeLabels,
} from '../db/indexedDB';
import { DatabaseBackupManager } from './DatabaseBackupManager';
import { toast } from './ToastNotification';

interface SettingsPanelProps {
  currentUser: UserAccount;
  appearance: AppearanceSettings;
  onAppearanceChange: (newAppearance: AppearanceSettings) => void;
  leaveRules: LeaveRulesSettings;
  onLeaveRulesChange: (newRules: LeaveRulesSettings) => void;
  organization?: OrganizationSettings;
  onOrganizationChange?: (newOrg: OrganizationSettings) => void;
  employmentLabels?: EmploymentTypeLabelsSettings;
  onEmploymentLabelsChange?: (newLabels: EmploymentTypeLabelsSettings) => void;
  onRestoreComplete?: () => void;
  onBackToDashboard?: () => void;
  onNavigate?: (tab: WorkspaceTab) => void;
  onOpenLicense?: () => void;
  onOpenLicenseGenerator?: () => void;
}

const INITIAL_DEFAULT_USERS: SystemUserAccount[] = [
  {
    id: 'USR-001',
    username: 'admin',
    fullName: 'مسؤول استخدام النظام',
    jobTitle: 'مشغل المنظومة ومسؤول إدارة الدوام والموظفين',
    department: 'دائرة الموارد المائية - قسم إدارة الموارد البشرية',
    role: 'hr_director',
    roleTitleAr: 'مسؤول استخدام النظام (شؤون الموظفين والدوام)',
    avatarColor: 'amber',
    isActive: true,
    passwordHash: 'admin',
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
  employmentLabels,
  onEmploymentLabelsChange,
  onRestoreComplete,
  onBackToDashboard,
  onNavigate,
  onOpenLicense,
  onOpenLicenseGenerator,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<
    | 'org_identity'
    | 'employment_labels'
    | 'leave_rules'
    | 'career_rules'
    | 'users_rbac'
    | 'system_features'
    | 'appearance'
    | 'backup_restore'
    | 'commercial_license'
  >('org_identity');

  const [panelLicenseStatus, setPanelLicenseStatus] = useState<LicenseStatus | null>(null);
  const [systemFeatures, setSystemFeatures] = useState<SystemFeatureConfig>(DEFAULT_SYSTEM_FEATURE_CONFIG);

  useEffect(() => {
    licenseService.getStatus().then(setPanelLicenseStatus);
    const unsub = licenseService.subscribe(setPanelLicenseStatus);
    getSystemSetting<SystemFeatureConfig>('system_features_config', DEFAULT_SYSTEM_FEATURE_CONFIG).then(setSystemFeatures);
    return () => unsub();
  }, []);

  // Master password lock for ultra-safe administrative operations (SAsa12589)
  const [isMasterUnlocked, setIsMasterUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('admin_master_unlocked') === 'true';
  });
  const [masterPasswordInput, setMasterPasswordInput] = useState('');
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Career, Allowances, Promotion, Retirement Settings form state
  const [careerSettingsForm, setCareerSettingsForm] = useState<CareerSystemSettings>(DEFAULT_CAREER_SETTINGS);
  const [isSavingCareer, setIsSavingCareer] = useState(false);
  const [careerSaveSuccess, setCareerSaveSuccess] = useState(false);

  useEffect(() => {
    employeeService.getCareerSettings().then((cs) => {
      setCareerSettingsForm(cs);
    });
  }, []);

  const handleSaveCareerSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCareer(true);
    try {
      await employeeService.saveCareerSettings(careerSettingsForm);
      setCareerSaveSuccess(true);
      toast.success('تم حفظ وتطبيق ضوابط العلاوات والترفيع والسن القانوني للتقاعد بنجاح.');
      setTimeout(() => setCareerSaveSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      toast.error('فشل حفظ ضوابط العلاوات والتقاعد.');
    } finally {
      setIsSavingCareer(false);
    }
  };

  // Employment Type Labels form state
  const [labelsForm, setLabelsForm] = useState<EmploymentTypeLabelsSettings>(() => {
    return employmentLabels || DEFAULT_EMPLOYMENT_TYPE_LABELS;
  });
  const [isSavingLabels, setIsSavingLabels] = useState(false);
  const [labelsSaveSuccess, setLabelsSaveSuccess] = useState(false);

  useEffect(() => {
    if (employmentLabels) {
      setLabelsForm(employmentLabels);
    }
  }, [employmentLabels]);

  const handleSaveLabels = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingLabels(true);
    try {
      const updated: EmploymentTypeLabelsSettings = {
        permanent: labelsForm.permanent.trim() || DEFAULT_EMPLOYMENT_TYPE_LABELS.permanent,
        contract: labelsForm.contract.trim() || DEFAULT_EMPLOYMENT_TYPE_LABELS.contract,
        temporary: labelsForm.temporary?.trim() || DEFAULT_EMPLOYMENT_TYPE_LABELS.temporary || 'أجر يومي / مؤقت',
        daily: labelsForm.daily?.trim() || DEFAULT_EMPLOYMENT_TYPE_LABELS.daily || 'أجور يومية',
      };
      await saveEmploymentTypeLabels(updated);
      if (onEmploymentLabelsChange) {
        onEmploymentLabelsChange(updated);
      }
      setLabelsForm(updated);
      setLabelsSaveSuccess(true);
      toast.success('تم حفظ وتطبيق التسميات الوظيفية المخصصة في النظام بنجاح.');
      setTimeout(() => setLabelsSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save employment labels:', err);
      toast.error('حدث خطأ أثناء حفظ التسميات الوظيفية.');
    } finally {
      setIsSavingLabels(false);
    }
  };

  const handleApplyPreset = (preset: { permanent: string; contract: string; temporary: string; daily: string }) => {
    setLabelsForm({
      permanent: preset.permanent,
      contract: preset.contract,
      temporary: preset.temporary,
      daily: preset.daily,
    });
    toast.info('تم تطبيق النموذج المسبق، اضغط على زر الحفظ لتثبيته.');
  };

  const handleResetDefaultLabels = async () => {
    setIsSavingLabels(true);
    try {
      await saveEmploymentTypeLabels(DEFAULT_EMPLOYMENT_TYPE_LABELS);
      if (onEmploymentLabelsChange) {
        onEmploymentLabelsChange(DEFAULT_EMPLOYMENT_TYPE_LABELS);
      }
      setLabelsForm(DEFAULT_EMPLOYMENT_TYPE_LABELS);
      setLabelsSaveSuccess(true);
      toast.success('تمت استعادة التسميات الوظيفية الافتراضية بنجاح.');
      setTimeout(() => setLabelsSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to reset employment labels:', err);
      toast.error('حدث خطأ أثناء استعادة التسميات الافتراضية.');
    } finally {
      setIsSavingLabels(false);
    }
  };

  // Organization identity form state
  const [orgForm, setOrgForm] = useState<OrganizationSettings>(() => {
    return organization || {
      ministryName: 'جمهورية العراق - وزارة الموارد المائية',
      directorateName: 'دائرة الموارد المائية',
      departmentName: 'قسم الشؤون الإدارية والمالية - شعبة الموارد البشرية',
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
      toast.success('تم حفظ وتحديث بيانات وهوية المؤسسة بنجاح.');
      setTimeout(() => setOrgSaveSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      toast.error('فشل حفظ بيانات المؤسسة.');
    } finally {
      setIsSavingOrg(false);
    }
  };

  const handleUnlockMaster = (e: React.FormEvent) => {
    e.preventDefault();
    if (masterPasswordInput.trim() === 'admin' || masterPasswordInput.trim() === 'SAsa12589') {
      setIsMasterUnlocked(true);
      sessionStorage.setItem('admin_master_unlocked', 'true');
      setPasswordError('');
      toast.success('تم فك قفل الإعدادات بنجاح');
    } else {
      setPasswordError('كلمة المرور غير صحيحة! يرجى إدخال كلمة مرور النظام المعتمدة.');
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
    toast.success('تم تثبيت بريد النسخ الاحتياطي السحابي بنجاح.');
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
  const [newPermUpdateSystemSettings, setNewPermUpdateSystemSettings] = useState(false);
  const [newPermToggleFeatures, setNewPermToggleFeatures] = useState(false);
  const [newPermGrantFiveYearLeave, setNewPermGrantFiveYearLeave] = useState(false);
  const [newPermEditSalaries, setNewPermEditSalaries] = useState(false);
  const [newPermManageCareerRules, setNewPermManageCareerRules] = useState(false);
  const [newPermExportDatabase, setNewPermExportDatabase] = useState(false);
  const [newPermManageSystemUsers, setNewPermManageSystemUsers] = useState(false);
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
      toast.success('تم حفظ وتطبيق قواعد الإجازات والزمنيات بنجاح.');
      setTimeout(() => setRulesSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء حفظ القواعد.');
    } finally {
      setIsSavingRules(false);
    }
  };

  // Reset rules to default
  const handleResetLeaveRules = () => {
    setRulesForm(DEFAULT_LEAVE_RULES);
    toast.info('تمت استعادة معايير الإجازات الافتراضية، اضغط حفظ لتطبيقها.');
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
        canUpdateSystemSettings: newPermUpdateSystemSettings,
        canToggleFeatures: newPermToggleFeatures,
        canGrantFiveYearLeave: newPermGrantFiveYearLeave,
        canEditSalaries: newPermEditSalaries,
        canManageCareerRules: newPermManageCareerRules,
        canExportDatabase: newPermExportDatabase,
        canManageSystemUsers: newPermManageSystemUsers,
      },
    };

    try {
      await saveSystemUser(targetUser);
      if (editingUserId) {
        setUsers((prev) => prev.map((u) => (u.id === editingUserId ? targetUser : u)));
        toast.success(`تم تحديث بيانات المستخدم (${targetUser.fullName}) بنجاح.`);
      } else {
        setUsers((prev) => [...prev, targetUser]);
        toast.success(`تم إضافة المستخدم الجديد (${targetUser.fullName}) بنجاح.`);
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
    setNewPermUpdateSystemSettings(false);
    setNewPermToggleFeatures(false);
    setNewPermGrantFiveYearLeave(false);
    setNewPermEditSalaries(false);
    setNewPermManageCareerRules(false);
    setNewPermExportDatabase(false);
    setNewPermManageSystemUsers(false);
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
    setNewPermEditAttendance(Boolean(u.permissions.canEditAttendance));
    setNewPermApproveLeaves(Boolean(u.permissions.canApproveLeaves));
    setNewPermDeleteRecords(Boolean(u.permissions.canDeleteRecords));
    setNewPermGenerateReports(Boolean(u.permissions.canGenerateReports));
    setNewPermMasterSettings(Boolean(u.permissions.canAccessMasterSettings));
    setNewPermUpdateSystemSettings(Boolean(u.permissions.canUpdateSystemSettings));
    setNewPermToggleFeatures(Boolean(u.permissions.canToggleFeatures));
    setNewPermGrantFiveYearLeave(Boolean(u.permissions.canGrantFiveYearLeave));
    setNewPermEditSalaries(Boolean(u.permissions.canEditSalaries));
    setNewPermManageCareerRules(Boolean(u.permissions.canManageCareerRules));
    setNewPermExportDatabase(Boolean(u.permissions.canExportDatabase));
    setNewPermManageSystemUsers(Boolean(u.permissions.canManageSystemUsers));
    setIsAddUserModalOpen(true);
  };

  const handleToggleUserActive = async (u: SystemUserAccount) => {
    if (u.username === 'admin') return; // Cannot disable root super_admin
    const updated = { ...u, isActive: !u.isActive };
    await saveSystemUser(updated);
    setUsers((prev) => prev.map((item) => (item.id === u.id ? updated : item)));
    toast.info(`تم ${updated.isActive ? 'تفعيل' : 'تعطيل'} حساب (${u.fullName})`);
  };

  const handleDeleteUserClick = async (id: string, username: string) => {
    if (username === 'admin') {
      toast.error('لا يمكن حذف حساب مشرف النظام المركزي الافتراضي.');
      return;
    }
    if (confirm(`هل أنت متأكد من رغبتك بحذف المستخدم (${username}) نهائياً؟`)) {
      await deleteSystemUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast.success(`تم حذف المستخدم (${username}) بنجاح.`);
    }
  };

  // Feature toggle helper with role and permissions validation
  const handleToggleFeature = async (featureKey: keyof SystemFeatureConfig) => {
    const hasPermission =
      currentUser.role === 'super_admin' ||
      Boolean(currentUser.permissions?.canToggleFeatures) ||
      Boolean(currentUser.permissions?.canUpdateSystemSettings);

    if (!hasPermission) {
      toast.error('عذراً، يتطلب تعديل وتغيير ميزات النظام صلاحية (تفعيل وتعطيل الميزات) من المشرف العام.');
      return;
    }

    const updated: SystemFeatureConfig = {
      ...systemFeatures,
      [featureKey]: !systemFeatures[featureKey],
    };
    setSystemFeatures(updated);
    try {
      await saveSystemSetting('system_features_config', updated);
      toast.success(
        `تم ${updated[featureKey] ? 'تفعيل وتشغيل' : 'إيقاف وتعطيل'} الميزة بنجاح.`
      );
    } catch {
      toast.error('حدث خطأ أثناء حفظ حالة الميزة في الذاكرة المحلية.');
    }
  };

  // Appearance toggle helpers
  const handleToggleAppearance = async (key: keyof AppearanceSettings, value: any) => {
    const updated = { ...appearance, [key]: value };
    onAppearanceChange(updated);
    await saveSystemSetting('appearance_settings', updated);
    toast.success('تم تطبيق إعدادات المظهر والخط بنجاح.');
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
            <span>لوحة إعدادات المنظومة</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
              محمية بكلمة المرور
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            واجهة إعدادات المنظومة محمية بكلمة المرور لضمان سلامة ضبط هوية الدائرة وقواعد الدوام.
          </p>
        </div>

        <form onSubmit={handleUnlockMaster} className="space-y-4 text-right">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              كلمة مرور النظام:
            </label>
            <div className="relative">
              <input
                type={showMasterPassword ? 'text' : 'password'}
                value={masterPasswordInput}
                onChange={(e) => setMasterPasswordInput(e.target.value)}
                placeholder="أدخل كلمة مرور النظام..."
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
                <button
                  type="button"
                  onClick={() => onNavigate('barcode_hub')}
                  className="px-2.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                >
                  <QrCode className="w-3 h-3 text-indigo-500" />
                  <span>الباركود</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('allow_promotions')}
                  className="px-2.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                >
                  <Award className="w-3 h-3 text-amber-500" />
                  <span>العلاوات والترفيعات</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('retirement')}
                  className="px-2.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                >
                  <Briefcase className="w-3 h-3 text-purple-500" />
                  <span>التقاعد</span>
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
                إعدادات منظومة الموارد المائية
              </h1>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                دائرة الموارد المائية
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              تخصيص هوية الدائرة والشعار الرسمي، قواعد الدوام والأرصدة، مستخدمو النظام، وحفظ البيانات
            </p>
          </div>
        </div>
      </div>

      {/* Categorized Settings Navigation Tabs */}
      <div className="p-3 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-1 flex items-center justify-between">
          <span>أقسام وميزات المنظومة:</span>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">اختر القسم للتعديل المباشر</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {/* Section 1: Official Identity */}
          <button
            type="button"
            onClick={() => setActiveTab('org_identity')}
            className={`p-2.5 rounded-2xl text-right transition-all cursor-pointer flex flex-col gap-1 border ${
              activeTab === 'org_identity'
                ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20'
                : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Building2 className={`w-4 h-4 ${activeTab === 'org_identity' ? 'text-white' : 'text-amber-500'}`} />
              <span className="text-xs font-bold">هوية الدائرة والشعار</span>
            </div>
            <span className={`text-[10px] ${activeTab === 'org_identity' ? 'text-amber-100' : 'text-slate-400'}`}>
              الوزارة والدائرة والترويسة
            </span>
          </button>

          {/* Section 2: Employment Types */}
          <button
            type="button"
            id="tab-employment-labels-btn"
            onClick={() => setActiveTab('employment_labels')}
            className={`p-2.5 rounded-2xl text-right transition-all cursor-pointer flex flex-col gap-1 border ${
              activeTab === 'employment_labels'
                ? 'bg-violet-600 text-white border-violet-700 shadow-md shadow-violet-600/20'
                : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-violet-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Briefcase className={`w-4 h-4 ${activeTab === 'employment_labels' ? 'text-white' : 'text-violet-500'}`} />
              <span className="text-xs font-bold">المسميات وصيغ التعاقد</span>
            </div>
            <span className={`text-[10px] ${activeTab === 'employment_labels' ? 'text-violet-100' : 'text-slate-400'}`}>
              ملاك، عقود 315، وأجور
            </span>
          </button>

          {/* Section 3: Leave & Attendance Rules */}
          <button
            type="button"
            onClick={() => setActiveTab('leave_rules')}
            className={`p-2.5 rounded-2xl text-right transition-all cursor-pointer flex flex-col gap-1 border ${
              activeTab === 'leave_rules'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-600/20'
                : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className={`w-4 h-4 ${activeTab === 'leave_rules' ? 'text-white' : 'text-emerald-500'}`} />
              <span className="text-xs font-bold">قواعد الأرصدة والدوام</span>
            </div>
            <span className={`text-[10px] ${activeTab === 'leave_rules' ? 'text-emerald-100' : 'text-slate-400'}`}>
              الزمنيات، الإجازات، والغياب
            </span>
          </button>

          {/* Section 4: Promotions & Retirement */}
          <button
            type="button"
            onClick={() => setActiveTab('career_rules')}
            className={`p-2.5 rounded-2xl text-right transition-all cursor-pointer flex flex-col gap-1 border ${
              activeTab === 'career_rules'
                ? 'bg-amber-600 text-white border-amber-700 shadow-md shadow-amber-600/20'
                : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Award className={`w-4 h-4 ${activeTab === 'career_rules' ? 'text-white' : 'text-amber-500'}`} />
              <span className="text-xs font-bold">العلاوات والتقاعد</span>
            </div>
            <span className={`text-[10px] ${activeTab === 'career_rules' ? 'text-amber-100' : 'text-slate-400'}`}>
              السن القانوني 60 والترقيات
            </span>
          </button>

          {/* Section 5: Users & Operational Responsibilities */}
          <button
            type="button"
            onClick={() => setActiveTab('users_rbac')}
            className={`p-2.5 rounded-2xl text-right transition-all cursor-pointer flex flex-col gap-1 border ${
              activeTab === 'users_rbac'
                ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-600/20'
                : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield className={`w-4 h-4 ${activeTab === 'users_rbac' ? 'text-white' : 'text-blue-500'}`} />
              <span className="text-xs font-bold">المستخدمين ومسؤوليات العمل</span>
            </div>
            <span className={`text-[10px] ${activeTab === 'users_rbac' ? 'text-blue-100' : 'text-slate-400'}`}>
              حسابات الموظفين والمهام ({users.length})
            </span>
          </button>

          {/* Section 6: System Features */}
          <button
            type="button"
            id="tab-system-features-btn"
            onClick={() => setActiveTab('system_features')}
            className={`p-2.5 rounded-2xl text-right transition-all cursor-pointer flex flex-col gap-1 border ${
              activeTab === 'system_features'
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/20'
                : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sliders className={`w-4 h-4 ${activeTab === 'system_features' ? 'text-white' : 'text-indigo-500'}`} />
              <span className="text-xs font-bold">ميزات ووحدات المنظومة</span>
            </div>
            <span className={`text-[10px] ${activeTab === 'system_features' ? 'text-indigo-100' : 'text-slate-400'}`}>
              تفعيل وتعطيل الميزات الميدانية
            </span>
          </button>

          {/* Section 7: Appearance */}
          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`p-2.5 rounded-2xl text-right transition-all cursor-pointer flex flex-col gap-1 border ${
              activeTab === 'appearance'
                ? 'bg-sky-600 text-white border-sky-700 shadow-md shadow-sky-600/20'
                : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-sky-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Palette className={`w-4 h-4 ${activeTab === 'appearance' ? 'text-white' : 'text-sky-500'}`} />
              <span className="text-xs font-bold">المظهر والعرض المكتبي</span>
            </div>
            <span className={`text-[10px] ${activeTab === 'appearance' ? 'text-sky-100' : 'text-slate-400'}`}>
              الخطوط، الألوان، وحجم النص
            </span>
          </button>

          {/* Section 8: Backup & Security */}
          <button
            type="button"
            id="tab-backup-restore-btn"
            onClick={() => setActiveTab('backup_restore')}
            className={`p-2.5 rounded-2xl text-right transition-all cursor-pointer flex flex-col gap-1 border ${
              activeTab === 'backup_restore'
                ? 'bg-teal-600 text-white border-teal-700 shadow-md shadow-teal-600/20'
                : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Database className={`w-4 h-4 ${activeTab === 'backup_restore' ? 'text-white' : 'text-teal-500'}`} />
              <span className="text-xs font-bold">النسخ الاحتياطي والأمان</span>
            </div>
            <span className={`text-[10px] ${activeTab === 'backup_restore' ? 'text-teal-100' : 'text-slate-400'}`}>
              حفظ واستعادة قاعدة البيانات
            </span>
          </button>

          {/* Section 9: Commercial License & Trial */}
          <button
            type="button"
            id="tab-commercial-license-btn"
            onClick={() => setActiveTab('commercial_license')}
            className={`p-2.5 rounded-2xl text-right transition-all cursor-pointer flex flex-col gap-1 border sm:col-span-2 lg:col-span-2 ${
              activeTab === 'commercial_license'
                ? 'bg-amber-600 text-white border-amber-700 shadow-md shadow-amber-600/20'
                : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Key className={`w-4 h-4 ${activeTab === 'commercial_license' ? 'text-white' : 'text-amber-500'}`} />
              <span className="text-xs font-bold">ترخيص المنظومة والفترة التجريبية</span>
            </div>
            <span className={`text-[10px] ${activeTab === 'commercial_license' ? 'text-amber-100' : 'text-slate-400'}`}>
              حالة التفعيل وترخيص دائرة الموارد المائية
            </span>
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
                  placeholder="مثال: جمهورية العراق - وزارة الموارد المائية"
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
                  placeholder="مثال: دائرة الموارد المائية"
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
                  placeholder="مثال: قسم الشؤون الإدارية والمالية - شعبة الموارد البشرية"
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

      {/* Tab 1.5: Custom Employment & Contract Type Labels */}
      {activeTab === 'employment_labels' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-white shadow-md shadow-violet-600/20">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>تخصيص مسميات نوع الملاك والتوظيف الحكومي</span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 font-bold border border-violet-200 dark:border-violet-800">
                      INDEXED-DB PERSISTED
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    تعديل المسميات الرسمية لصفوف التوظيف (ملاك دائم، عقود وزارية، أجور يومية) لتنعكس فورياً في كشوفات الموظفين والتقارير وشيتات الإكسل
                  </p>
                </div>
              </div>

              {/* Fast Presets */}
              <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-center">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 ml-1">قوالب سريعة:</span>
                <button
                  type="button"
                  onClick={() =>
                    handleApplyPreset({
                      permanent: 'ملاك دائم',
                      contract: 'عقد وزاري (قرار 315)',
                      temporary: 'أجر يومي / مؤقت',
                      daily: 'أجور يومية',
                    })
                  }
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  الوزارات الاتحادية
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleApplyPreset({
                      permanent: 'موظف ملاك دائم',
                      contract: 'متعاقد وفق القرار 315',
                      temporary: 'موظف مؤقت',
                      daily: 'أجر يومي',
                    })
                  }
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  الخدمة المدنية
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleApplyPreset({
                      permanent: 'ملاك دائم',
                      contract: 'عقود تنمية الأقاليم',
                      temporary: 'أجر يومي بلدي',
                      daily: 'وقتي',
                    })
                  }
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  الدوائر البلدية والذاتية
                </button>
              </div>
            </div>

            {/* Custom Input Fields Form */}
            <form onSubmit={handleSaveLabels} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Permanent Staff */}
                <div className="p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span>المسمى المعتمد للملاك الدائم:</span>
                    </label>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono font-bold">
                      permanent
                    </span>
                  </div>
                  <input
                    type="text"
                    value={labelsForm.permanent}
                    onChange={(e) => setLabelsForm({ ...labelsForm, permanent: e.target.value })}
                    placeholder="مثال: ملاك دائم، كادر دائم، موظف ملاك دائم..."
                    className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-amber-300 dark:border-amber-700/60 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/30 outline-hidden"
                    required
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    هذا المسمى سيظهر في كشف الموظفين، بطاقة الموظف، تقارير الحركات، وخانات تصدير الإكسل.
                  </p>
                </div>

                {/* 2. Ministerial Contract (315) */}
                <div className="p-4 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <span>المسمى المعتمد للعقود الوزارية (قرار 315):</span>
                    </label>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-mono font-bold">
                      contract
                    </span>
                  </div>
                  <input
                    type="text"
                    value={labelsForm.contract}
                    onChange={(e) => setLabelsForm({ ...labelsForm, contract: e.target.value })}
                    placeholder="مثال: عقد وزاري (قرار 315)، متعاقد 315، عقد تشغيلي..."
                    className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-blue-300 dark:border-blue-700/60 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 outline-hidden"
                    required
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    يحدد صراحة صفة موظفي العقود لتطابق الضوابط الرسمية لقرارات مجلس الوزراء العراقي.
                  </p>
                </div>

                {/* 3. Temporary / Daily Wages */}
                <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>المسمى المعتمد للأجور المؤقتة:</span>
                    </label>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                      temporary
                    </span>
                  </div>
                  <input
                    type="text"
                    value={labelsForm.temporary || ''}
                    onChange={(e) => setLabelsForm({ ...labelsForm, temporary: e.target.value })}
                    placeholder="مثال: أجر يومي / مؤقت، كادر مؤقت..."
                    className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-emerald-300 dark:border-emerald-700/60 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 outline-hidden"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    يستخدم للملاكات المؤقتة أو عقود المشاريع الموسمية.
                  </p>
                </div>

                {/* 4. Daily Wages */}
                <div className="p-4 rounded-2xl bg-slate-500/5 dark:bg-slate-500/10 border border-slate-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                      <span>المسمى المعتمد للأجور اليومية:</span>
                    </label>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold">
                      daily
                    </span>
                  </div>
                  <input
                    type="text"
                    value={labelsForm.daily || ''}
                    onChange={(e) => setLabelsForm({ ...labelsForm, daily: e.target.value })}
                    placeholder="مثال: أجور يومية، عمال أجور يومية..."
                    className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700/60 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-500/30 outline-hidden"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    يستخدم لعمال الخدمة والصيانة بنظام الأجر اليومي المستمر.
                  </p>
                </div>
              </div>

              {/* Live Interactive Preview */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-violet-500" />
                    <span>معاينة حية ومباشرة لكيفية ظهور المسميات في كشوفات وتقارير النظام:</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">Live Preview</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="text-[11px] text-slate-500">شارة الملاك الدائم:</div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      <span>{labelsForm.permanent || DEFAULT_EMPLOYMENT_TYPE_LABELS.permanent}</span>
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="text-[11px] text-slate-500">شارة العقود الوزارية:</div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      <span>{labelsForm.contract || DEFAULT_EMPLOYMENT_TYPE_LABELS.contract}</span>
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="text-[11px] text-slate-500">شارة الأجور المؤقتة:</div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>{labelsForm.temporary || DEFAULT_EMPLOYMENT_TYPE_LABELS.temporary}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons & Feedback */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetDefaultLabels}
                    disabled={isSavingLabels}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>استعادة المسميات الافتراضية</span>
                  </button>

                  {labelsSaveSuccess && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تم حفظ المسميات بنجاح في IndexedDB وتحديث المنظومة فورياً!</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSavingLabels}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-violet-600/20 transition-all cursor-pointer"
                >
                  {isSavingLabels ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>جارٍ الحفظ في IndexedDB...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>حفظ المسميات وتطبيقها على كافة الكشوفات</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
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

      {/* Tab: Career, Allowances, Promotion & Retirement Rules */}
      {activeTab === 'career_rules' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <span>ضوابط استحقاق العلاوات السنوية، الترفيعات الوظيفية والتقاعد القانوني</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                تحديد معايير الحساب الآلي لمدد الاستحقاق، سنوات الخدمة في كل درجة وظيفية، والسن القانوني للإحالة على التقاعد وفق القوانين العراقية
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 self-start sm:self-center">
              قانون الخدمة والتقاعد 2026
            </span>
          </div>

          <form onSubmit={handleSaveCareerSettings} className="space-y-6">
            {/* Section 1: Annual Allowance & Retirement Age Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Allowance Cycle */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="text-xs font-bold text-slate-900 dark:text-white block">
                  دورة استحقاق العلاوة السنوية (بالأشهر):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={careerSettingsForm.allowanceIntervalMonths}
                    onChange={(e) =>
                      setCareerSettingsForm({
                        ...careerSettingsForm,
                        allowanceIntervalMonths: Math.max(1, parseInt(e.target.value) || 12),
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                  <span className="absolute left-3 top-2 text-xs text-slate-400">شهراً (افتراضياً 12)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  المدة المحتسبة تلقائياً بين تاريخ آخر علاوة وتاريخ استحقاق العلاوة القادمة.
                </p>
              </div>

              {/* Statutory Retirement Age */}
              <div className="p-4 rounded-2xl bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 space-y-2">
                <label className="text-xs font-bold text-purple-900 dark:text-purple-200 block">
                  السن القانوني للإحالة على التقاعد (بالسنوات):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="45"
                    max="75"
                    value={careerSettingsForm.retirementAgeYears}
                    onChange={(e) =>
                      setCareerSettingsForm({
                        ...careerSettingsForm,
                        retirementAgeYears: Math.max(45, parseInt(e.target.value) || 60),
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                  <span className="absolute left-3 top-2 text-xs text-purple-600 dark:text-purple-300">سنة (افتراضياً 60)</span>
                </div>
                <p className="text-[11px] text-purple-700 dark:text-purple-300">
                  السن النظامي لإحالة الموظف تلقائياً على التقاعد (قانون التقاعد الموحد العراقي رقم 9 لسنة 2014 المعدل).
                </p>
              </div>

              {/* Pre-Retirement Warning Advance Period */}
              <div className="p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-2">
                <label className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                  مدة التنبيه المسبق قبل بلوغ سن التقاعد:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={careerSettingsForm.retirementWarningMonths}
                    onChange={(e) =>
                      setCareerSettingsForm({
                        ...careerSettingsForm,
                        retirementWarningMonths: Math.max(1, parseInt(e.target.value) || 6),
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                  <span className="absolute left-3 top-2 text-xs text-amber-600 dark:text-amber-300">أشهر (افتراضياً 6)</span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  فترة إظهار شارة التنبيه في مركز الإشعارات ولوحة التحكم لإعداد ملف الإحالة والخدمة التقاعدية.
                </p>
              </div>
            </div>

            {/* Section 2: Promotion Criteria (Years in Grade) */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-amber-500" />
                    <span>جدول مدد الإقامة الصغرى المشروطة للترفيع لكل درجة وظيفية</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    عدد سنوات الخدمة المقضية في الدرجة الحالية للترقية إلى الدرجة الأعلى التالية
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((grade) => {
                  const req = careerSettingsForm.promotionRequirementsPerGrade[grade] || { minYears: 4 };
                  return (
                    <div
                      key={grade}
                      className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          الدرجة {grade}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {grade === 1 ? 'الدرجة العليا' : `إلى الدرجة ${grade - 1}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="15"
                          value={req.minYears}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value) || 4);
                            setCareerSettingsForm({
                              ...careerSettingsForm,
                              promotionRequirementsPerGrade: {
                                ...careerSettingsForm.promotionRequirementsPerGrade,
                                [grade]: {
                                  ...req,
                                  minYears: val,
                                },
                              },
                            });
                          }}
                          className="w-full px-2 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-center"
                        />
                        <span className="text-[11px] text-slate-500 shrink-0">سنوات</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              {careerSaveSuccess && (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم حفظ وتحديث ضوابط الاستحقاق والتقاعد بنجاح!</span>
                </div>
              )}
              <div className="mr-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCareerSettingsForm(DEFAULT_CAREER_SETTINGS);
                    toast.info('تمت استعادة القيم القانونية المعيارية الافتراضية.');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  استعادة الافتراضي
                </button>
                <button
                  type="submit"
                  disabled={isSavingCareer}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                >
                  {isSavingCareer ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>جارٍ الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>حفظ القواعد وتطبيقها في كل الوحدات</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
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
                          u.permissions.canGrantFiveYearLeave
                            ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 line-through'
                        }`}
                      >
                        إجازة 5 سنوات
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-lg font-semibold ${
                          u.permissions.canUpdateSystemSettings
                            ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 line-through'
                        }`}
                      >
                        تحديث النظام
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-lg font-semibold ${
                          u.permissions.canToggleFeatures
                            ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 line-through'
                        }`}
                      >
                        ميزات المنظومة
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-lg font-semibold ${
                          u.permissions.canEditSalaries
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 line-through'
                        }`}
                      >
                        تعديل الرواتب
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-lg font-semibold ${
                          u.permissions.canManageCareerRules
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 line-through'
                        }`}
                      >
                        العلاوات والتقاعد
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
                      <span
                        className={`px-2 py-0.5 rounded-lg font-semibold ${
                          u.permissions.canManageSystemUsers
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 line-through'
                        }`}
                      >
                        إدارة المستخدمين
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

      {/* Tab: System Features Configuration (صلاحيات وميزات وتحديثات النظام) */}
      {activeTab === 'system_features' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white border border-indigo-900/60 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    إدارة ميزات النظام المركزية
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    مصفوفة التحكم الفوري (Live Toggles)
                  </span>
                </div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-400" />
                  <span>التحكم بميزات ووحدات المنظومة وصلاحيات التحديث</span>
                </h2>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  تتيح هذه اللوحة للإدارة المركزية تفعيل أو إيقاف أي وحدة أو ميزة في النظام فوراً، كإجازة الـ 5 سنوات، منظومة التقاعد، الباركود، والعلاوات. التغييرات تُحفظ فورياً وتُطبّق على سائر وحدات العمل.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    if (
                      currentUser.role !== 'super_admin' &&
                      !currentUser.permissions?.canToggleFeatures &&
                      !currentUser.permissions?.canUpdateSystemSettings
                    ) {
                      toast.error('عذراً، يتطلب تعديل ميزات النظام صلاحية المشرف العام.');
                      return;
                    }
                    const allEnabled: SystemFeatureConfig = {
                      enableFiveYearLeave: true,
                      enableRetirementHub: true,
                      enableBarcodeHub: true,
                      enableAllowancesPromotions: true,
                      enableAnalyticsHub: true,
                      enableSalariesCalculation: true,
                      enableAutoBackup: true,
                      enableMovementDesigner: true,
                    };
                    setSystemFeatures(allEnabled);
                    await saveSystemSetting('system_features_config', allEnabled);
                    toast.success('تم تفعيل كافة ميزات ووحدات المنظومة بنجاح.');
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>تفعيل الكل</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (
                      currentUser.role !== 'super_admin' &&
                      !currentUser.permissions?.canToggleFeatures &&
                      !currentUser.permissions?.canUpdateSystemSettings
                    ) {
                      toast.error('عذراً، يتطلب تعديل ميزات النظام صلاحية المشرف العام.');
                      return;
                    }
                    setSystemFeatures(DEFAULT_SYSTEM_FEATURE_CONFIG);
                    await saveSystemSetting('system_features_config', DEFAULT_SYSTEM_FEATURE_CONFIG);
                    toast.info('تمت استعادة التهيئة الافتراضية للميزات.');
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>استعادة الافتراضي</span>
                </button>
              </div>
            </div>

            {/* Permission Alert Indicator */}
            {currentUser.role !== 'super_admin' &&
              !currentUser.permissions?.canToggleFeatures &&
              !currentUser.permissions?.canUpdateSystemSettings && (
                <div className="mt-4 p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    تنبيه: أنت تتصفح هذه اللوحة بوضع العرض فقط. يتطلب تعديل أو تبديل حالة الميزات حساب مشرف النظام (Super Admin) أو منحك صلاحية (تفعيل وتعطيل الميزات) في مصفوفة الصلاحيات.
                  </span>
                </div>
              )}
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Five Year Leave Feature */}
            <div
              className={`p-5 rounded-3xl border transition-all ${
                systemFeatures.enableFiveYearLeave
                  ? 'bg-white dark:bg-slate-800 border-purple-300 dark:border-purple-800 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                      systemFeatures.enableFiveYearLeave
                        ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>إجازة الـ 5 سنوات (براتب اسمي كامل)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                        مادة الخدمة المدنية
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      قانون الخدمة المدنية رقم 24 وقوانين الموازنة الاتحادية
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="toggle-five-year-leave-feature"
                  onClick={() => handleToggleFeature('enableFiveYearLeave')}
                  className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    systemFeatures.enableFiveYearLeave ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                  title={systemFeatures.enableFiveYearLeave ? 'تعطيل الميزة' : 'تفعيل الميزة'}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      systemFeatures.enableFiveYearLeave ? '-translate-x-6' : '-translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                تفعيل تبويب إجازة الخمس سنوات في الحركات اليومية، واحتساب التوقيفات التقاعدية (10%)، ومنح الموظف إجازة 5 سنوات براتب اسمي كامل، وإصدار الأمر الإداري وقرار المباشرة أو قطع الإجازة.
              </p>

              <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-100 dark:border-slate-700/60 font-medium">
                <span className="text-slate-400">حالة الميزة في التطبيق:</span>
                <span
                  className={`font-bold ${
                    systemFeatures.enableFiveYearLeave
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-slate-400'
                  }`}
                >
                  {systemFeatures.enableFiveYearLeave ? '✓ مفعّلة ومتاحة في الحركات' : '✗ معطلة مؤقتاً'}
                </span>
              </div>
            </div>

            {/* 2. Retirement Hub Feature */}
            <div
              className={`p-5 rounded-3xl border transition-all ${
                systemFeatures.enableRetirementHub
                  ? 'bg-white dark:bg-slate-800 border-indigo-300 dark:border-indigo-800 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                      systemFeatures.enableRetirementHub
                        ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>هيئة وشؤون التقاعد (السن القانوني 60)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        التقاعد الموحد 9
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      قانون التقاعد الموحد رقم 9 لسنة 2014 المعدل
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="toggle-retirement-hub-feature"
                  onClick={() => handleToggleFeature('enableRetirementHub')}
                  className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    systemFeatures.enableRetirementHub ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      systemFeatures.enableRetirementHub ? '-translate-x-6' : '-translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                حساب بلوغ الموظفين لسن الستين (60 سنة) بدقة من تاريخ الميلاد، التنبيهات المبكرة قبل 6 أشهر، إحالة الموظف بضغطة زر وتوليد استمارة الانفكاك والتقاعد الرسمية.
              </p>

              <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-100 dark:border-slate-700/60 font-medium">
                <span className="text-slate-400">حالة الميزة في التطبيق:</span>
                <span
                  className={`font-bold ${
                    systemFeatures.enableRetirementHub
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-400'
                  }`}
                >
                  {systemFeatures.enableRetirementHub ? '✓ مفعّلة ونشطة' : '✗ معطلة مؤقتاً'}
                </span>
              </div>
            </div>

            {/* 3. Barcode & Badges Feature */}
            <div
              className={`p-5 rounded-3xl border transition-all ${
                systemFeatures.enableBarcodeHub
                  ? 'bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-800 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                      systemFeatures.enableBarcodeHub
                        ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>الباركود والبطاقات الذكية (Barcode & QR)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                        قارئ USB + هويات
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      مسح الحضور المباشر وطباعة بطاقات الهوية الرسمية
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="toggle-barcode-hub-feature"
                  onClick={() => handleToggleFeature('enableBarcodeHub')}
                  className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    systemFeatures.enableBarcodeHub ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      systemFeatures.enableBarcodeHub ? '-translate-x-6' : '-translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                تسجيل الحضور والانصراف بمسح الباركود، والتحقق الفوري من هوية الموظف، وتوليد وتصدير بطاقات الهوية الصدرية (Badges) مع شعار الدائرة الرسمي.
              </p>

              <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-100 dark:border-slate-700/60 font-medium">
                <span className="text-slate-400">حالة الميزة في التطبيق:</span>
                <span
                  className={`font-bold ${
                    systemFeatures.enableBarcodeHub
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-400'
                  }`}
                >
                  {systemFeatures.enableBarcodeHub ? '✓ مفعّلة ونشطة' : '✗ معطلة مؤقتاً'}
                </span>
              </div>
            </div>

            {/* 4. Allowances & Promotions Feature */}
            <div
              className={`p-5 rounded-3xl border transition-all ${
                systemFeatures.enableAllowancesPromotions
                  ? 'bg-white dark:bg-slate-800 border-orange-300 dark:border-orange-800 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                      systemFeatures.enableAllowancesPromotions
                        ? 'bg-orange-100 dark:bg-orange-950/70 text-orange-700 dark:text-orange-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>العلاوات والترفيعات الوظيفية الآلية</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300">
                        قانون الرواتب 22
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      قانون رواتب موظفي الدولة والقطاع العام رقم 22 لسنة 2008
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="toggle-allowances-promotions-feature"
                  onClick={() => handleToggleFeature('enableAllowancesPromotions')}
                  className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    systemFeatures.enableAllowancesPromotions ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      systemFeatures.enableAllowancesPromotions ? '-translate-x-6' : '-translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                احتساب استحقاق العلاوات الشهرية، ترفيع الدرجات من العاشرة إلى الأولى بحسب مدد الخدمة المقررة، وإصدار أوامر الترفيع والعلاوة الإدارية الموحدة.
              </p>

              <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-100 dark:border-slate-700/60 font-medium">
                <span className="text-slate-400">حالة الميزة في التطبيق:</span>
                <span
                  className={`font-bold ${
                    systemFeatures.enableAllowancesPromotions
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-slate-400'
                  }`}
                >
                  {systemFeatures.enableAllowancesPromotions ? '✓ مفعّلة ونشطة' : '✗ معطلة مؤقتاً'}
                </span>
              </div>
            </div>

            {/* 5. Analytics Hub Feature */}
            <div
              className={`p-5 rounded-3xl border transition-all ${
                systemFeatures.enableAnalyticsHub
                  ? 'bg-white dark:bg-slate-800 border-cyan-300 dark:border-cyan-800 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                      systemFeatures.enableAnalyticsHub
                        ? 'bg-cyan-100 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>الرسوم البيانية التفاعلية ومؤشرات الأداء</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300">
                        Recharts تفاعلي
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      مخططات توزيع الكوادر، نسب الدوام والغياب، والإحصاء الحي
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="toggle-analytics-hub-feature"
                  onClick={() => handleToggleFeature('enableAnalyticsHub')}
                  className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    systemFeatures.enableAnalyticsHub ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      systemFeatures.enableAnalyticsHub ? '-translate-x-6' : '-translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                لوحة إحصائية مرئية لتحليل نسب الحضور والغياب، مقارنة الأقسام، واستعراض نسب الموظفين الحاصلين على إجازة 5 سنوات أو إجازات اعتيادية.
              </p>

              <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-100 dark:border-slate-700/60 font-medium">
                <span className="text-slate-400">حالة الميزة في التطبيق:</span>
                <span
                  className={`font-bold ${
                    systemFeatures.enableAnalyticsHub
                      ? 'text-cyan-600 dark:text-cyan-400'
                      : 'text-slate-400'
                  }`}
                >
                  {systemFeatures.enableAnalyticsHub ? '✓ مفعّلة ونشطة' : '✗ معطلة مؤقتاً'}
                </span>
              </div>
            </div>

            {/* 6. Salaries Calculation Feature */}
            <div
              className={`p-5 rounded-3xl border transition-all ${
                systemFeatures.enableSalariesCalculation
                  ? 'bg-white dark:bg-slate-800 border-emerald-300 dark:border-emerald-800 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                      systemFeatures.enableSalariesCalculation
                        ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>الحسابات الذكية لسلم الرواتب والمخصصات</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        دينار عراقي IQD
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      احتساب الراتب الاسمي والشهادة والزوجية واستقطاع التقاعد 10%
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="toggle-salaries-calculation-feature"
                  onClick={() => handleToggleFeature('enableSalariesCalculation')}
                  className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    systemFeatures.enableSalariesCalculation ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      systemFeatures.enableSalariesCalculation ? '-translate-x-6' : '-translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                الاحتساب الآلي لمرتبات الموظفين والمخصصات الحكومية والخصومات الرسمية لفاقدي الرصيد ومجازي الخمس سنوات.
              </p>

              <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-100 dark:border-slate-700/60 font-medium">
                <span className="text-slate-400">حالة الميزة في التطبيق:</span>
                <span
                  className={`font-bold ${
                    systemFeatures.enableSalariesCalculation
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400'
                  }`}
                >
                  {systemFeatures.enableSalariesCalculation ? '✓ مفعّلة ونشطة' : '✗ معطلة مؤقتاً'}
                </span>
              </div>
            </div>

            {/* 7. Auto Backup Feature */}
            <div
              className={`p-5 rounded-3xl border transition-all ${
                systemFeatures.enableAutoBackup
                  ? 'bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-800 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                      systemFeatures.enableAutoBackup
                        ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>النسخ الاحتياطي التلقائي والأرشفة الشاملة</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        IndexedDB محلي
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      تأمين قاعدة البيانات محلياً وتصدير ملفات JSON المشفرة
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="toggle-auto-backup-feature"
                  onClick={() => handleToggleFeature('enableAutoBackup')}
                  className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    systemFeatures.enableAutoBackup ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      systemFeatures.enableAutoBackup ? '-translate-x-6' : '-translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                حفظ نسخ أمان تلقائية لبيانات الموظفين وسجلات الحركات والغياب لضمان عدم فقدان أي معلومة حتى عند إغلاق المتصفح.
              </p>

              <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-100 dark:border-slate-700/60 font-medium">
                <span className="text-slate-400">حالة الميزة في التطبيق:</span>
                <span
                  className={`font-bold ${
                    systemFeatures.enableAutoBackup
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-400'
                  }`}
                >
                  {systemFeatures.enableAutoBackup ? '✓ مفعّلة ونشطة' : '✗ معطلة مؤقتاً'}
                </span>
              </div>
            </div>

            {/* 8. Movement Designer Feature */}
            <div
              className={`p-5 rounded-3xl border transition-all ${
                systemFeatures.enableMovementDesigner
                  ? 'bg-white dark:bg-slate-800 border-teal-300 dark:border-teal-800 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                      systemFeatures.enableMovementDesigner
                        ? 'bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>مصمم استمارات الحركات والأوامر الإدارية</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                        طباعة A4 رسمية
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      توليد استمارات الإجازات والأوامر الوزارية المعتمدة
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="toggle-movement-designer-feature"
                  onClick={() => handleToggleFeature('enableMovementDesigner')}
                  className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    systemFeatures.enableMovementDesigner ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      systemFeatures.enableMovementDesigner ? '-translate-x-6' : '-translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                تخصيص وطباعة نماذج الإجازات الرسمية واستمارات التكليف بمهمة أو الانفكاك وتوليد الكتب الإدارية الجاهزة للطباعة.
              </p>

              <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-100 dark:border-slate-700/60 font-medium">
                <span className="text-slate-400">حالة الميزة في التطبيق:</span>
                <span
                  className={`font-bold ${
                    systemFeatures.enableMovementDesigner
                      ? 'text-teal-600 dark:text-teal-400'
                      : 'text-slate-400'
                  }`}
                >
                  {systemFeatures.enableMovementDesigner ? '✓ مفعّلة ونشطة' : '✗ معطلة مؤقتاً'}
                </span>
              </div>
            </div>
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

      {/* Tab 5: Commercial License & Seller Hub */}
      {activeTab === 'commercial_license' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" />
                <span>الترخيص التجاري، الأيام التجريبية، ومولّد أكواد البيع للمطور</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                إدارة تراخيص المنظومة للبيع للدوائر والمؤسسات، توليد السيريالات المشفرة، وتحديد الأيام التجريبية
              </p>
            </div>

            <div className="flex items-center gap-2">
              {onOpenLicense && (
                <button
                  type="button"
                  onClick={onOpenLicense}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>نافذة التفعيل</span>
                </button>
              )}
              {onOpenLicenseGenerator && (
                <button
                  type="button"
                  onClick={onOpenLicenseGenerator}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-950 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                >
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>مولّد أكواد البيع (المالك)</span>
                </button>
              )}
            </div>
          </div>

          {/* 1. Current License Status Card */}
          <div
            className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              panelLicenseStatus?.isLifetime
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : panelLicenseStatus?.isTrial
                ? panelLicenseStatus.isExpired
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  panelLicenseStatus?.isLifetime
                    ? 'bg-emerald-500/20 text-emerald-600'
                    : panelLicenseStatus?.isTrial
                    ? panelLicenseStatus.isExpired
                      ? 'bg-rose-500/20 text-rose-600'
                      : 'bg-amber-500/20 text-amber-600'
                    : 'bg-blue-500/20 text-blue-600'
                }`}
              >
                {panelLicenseStatus?.isLifetime ? (
                  <Sparkles className="w-6 h-6" />
                ) : (
                  <ShieldCheck className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="text-xs font-semibold opacity-75">حالة ترخيص النسخة الحالية:</div>
                <div className="text-base font-black">
                  {panelLicenseStatus?.isLifetime
                    ? 'مرخص رسمي دائم مدى الحياة (Lifetime License)'
                    : panelLicenseStatus?.isTrial
                    ? panelLicenseStatus.isExpired
                      ? 'انتهت الفترة التجريبية (مطلوب كود تفعيل للبيع)'
                      : `فترة تجريبية مجانية (متبقي ${panelLicenseStatus.trialDaysRemaining} يوماً من أصل ${panelLicenseStatus.trialDaysTotal} يوم)`
                    : `اشتراك سنوي ساري المفعول (متبقي ${panelLicenseStatus?.daysRemaining} يوماً)`}
                </div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  معرّف الجهاز (Machine ID): <span className="font-mono font-bold">{panelLicenseStatus?.deviceId}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenLicense && (
                <button
                  type="button"
                  onClick={onOpenLicense}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold shadow-xs hover:bg-slate-50 cursor-pointer"
                >
                  إدخال كود التفعيل
                </button>
              )}
              {onOpenLicenseGenerator && (
                <button
                  type="button"
                  onClick={onOpenLicenseGenerator}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  فتح مولّد المفاتيح ⚡
                </button>
              )}
            </div>
          </div>

          {/* 2. Commercial Features Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
                <Clock className="w-4 h-4" />
                <span>1. الأيام التجريبية القابلة للتخصيص</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                يمكن للمطور تحديد مدة التجربة الافتراضية (مثلاً 7، 15، 30، 60 يوماً). يبدأ العد التنازلي من أول يوم تشغيل، وعند الانتهاء يقفل النظام شاشته تلقائياً ويطلب كود التفعيل دون فقدان أي بيانات.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                <Key className="w-4 h-4" />
                <span>2. أكواد التفعيل المشفرة للبيع</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                توليد سيريالات مشفرة بنمط <code className="font-mono text-[10px] bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">MANHAJ-PLAN-DEV-SEED-SIG</code> تحتوي على بصمة رقمية تمنع التخمين أو التزوير، وتعمل بالكامل 100% بدون إنترنت (Offline).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>3. تقييد الجهاز وحماية الملكية</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                إمكانية ربط كود البيع بحاسوب الزبون فقط عبر معرّف الجهاز (Machine ID)، مما يمنع الزبون من نسخ البرنامج واستخدامه على حواسيب أخرى دون شراء تراخيص إضافية.
              </p>
            </div>
          </div>
        </div>
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
                    checked={newPermGrantFiveYearLeave}
                    onChange={(e) => setNewPermGrantFiveYearLeave(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                  <span className="font-bold text-purple-700 dark:text-purple-300">
                    صلاحية منح وإقرار وتعديل إجازة الخمس (5) سنوات براتب اسمي
                  </span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPermUpdateSystemSettings}
                    onChange={(e) => setNewPermUpdateSystemSettings(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span className="font-bold text-indigo-700 dark:text-indigo-300">
                    صلاحية تحديث وتغيير إعدادات المنظومة وهوية الوزارة والمؤسسة
                  </span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPermToggleFeatures}
                    onChange={(e) => setNewPermToggleFeatures(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span className="font-bold text-indigo-700 dark:text-indigo-300">
                    صلاحية تفعيل وتعطيل ميزات ووحدات النظام (Feature Flags & Modules)
                  </span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPermEditSalaries}
                    onChange={(e) => setNewPermEditSalaries(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <span>صلاحية تعديل سلم الرواتب والمخصصات والاستقطاعات</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPermManageCareerRules}
                    onChange={(e) => setNewPermManageCareerRules(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <span>صلاحية إقرار العلاوات السنوية والترفيع والتقاعد القانوني</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPermDeleteRecords}
                    onChange={(e) => setNewPermDeleteRecords(e.target.checked)}
                    className="rounded text-rose-500"
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
                    checked={newPermExportDatabase}
                    onChange={(e) => setNewPermExportDatabase(e.target.checked)}
                    className="rounded text-indigo-500"
                  />
                  <span>صلاحية تصدير ونسخ قاعدة البيانات ومزامنتها</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPermManageSystemUsers}
                    onChange={(e) => setNewPermManageSystemUsers(e.target.checked)}
                    className="rounded text-emerald-500"
                  />
                  <span>صلاحية إدارة المستخدمين وتعديل الصلاحيات</span>
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
