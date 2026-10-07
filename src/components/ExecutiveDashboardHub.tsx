import React, { useState, useEffect } from 'react';
import {
  Users,
  Clock,
  FileSpreadsheet,
  Calendar,
  Sliders,
  HardDrive,
  ShieldCheck,
  Database,
  Sparkles,
  PlusCircle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  Sidebar,
  LayoutGrid,
  Zap,
  Lock,
  Download,
  FileText,
  UserCheck,
  HeartPulse,
  BarChart3,
  Award,
  QrCode,
  Briefcase,
  AlertTriangle,
  TrendingUp,
  PieChart,
  Bell,
  Fingerprint,
  FolderOpen,
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from './ToastNotification';
import {
  UserAccount,
  Employee,
  AppearanceSettings,
  OrganizationSettings,
} from '../types';
import { GovernmentEmblem } from './GovernmentEmblem';
import { WorkspaceTab } from '../App';
import { employeeService } from '../services/employeeService';

interface ExecutiveDashboardHubProps {
  currentUser: UserAccount;
  organization: OrganizationSettings;
  employees: Employee[];
  appearance: AppearanceSettings;
  onNavigate: (tab: WorkspaceTab) => void;
  onNavigateToFiveYearLeave?: () => void;
  onToggleLayout: (layout: 'sidebar' | 'dashboard_hub') => void;
  onOpenMovementModal: () => void;
  onOpenLicense?: () => void;
  onLogout: () => void;
  currentTime: string;
}

export function ExecutiveDashboardHub({
  currentUser,
  organization,
  employees,
  appearance,
  onNavigate,
  onNavigateToFiveYearLeave,
  onToggleLayout,
  onOpenMovementModal,
  onOpenLicense,
  onLogout,
  currentTime,
}: ExecutiveDashboardHubProps) {
  const permanentCount = employees.filter((e) => e.contractType === 'permanent').length;
  const contractCount = employees.filter((e) => e.contractType === 'contract').length;
  const fiveYearLeaveCount = employees.filter((e) => e.status === 'five_year_leave').length;

  const [metrics, setMetrics] = useState({
    dueAllowancesCount: 0,
    dueAllowancesList: [] as Employee[],
    nearRetirementCount: 0,
    nearRetirementList: [] as Employee[],
    depletedLeaveCount: 0,
    depletedLeaveList: [] as Employee[],
    lowLeaveCount: 0,
    lowLeaveList: [] as Employee[],
    unprintedBadgesCount: 0,
  });

  useEffect(() => {
    employeeService.getExecutiveMetrics().then((m) => {
      setMetrics({
        dueAllowancesCount: m.dueAllowancesCount,
        dueAllowancesList: m.dueAllowancesList,
        nearRetirementCount: m.nearRetirementCount,
        nearRetirementList: m.nearRetirementList,
        depletedLeaveCount: m.depletedLeaveCount,
        depletedLeaveList: m.depletedLeaveList,
        lowLeaveCount: m.lowLeaveCount,
        lowLeaveList: m.lowLeaveList,
        unprintedBadgesCount: m.unprintedBadgesCount,
      });

      // Fire in-app Toast notifications on dashboard load once per session
      if (sessionStorage.getItem('notified_operational_alerts') !== 'true') {
        sessionStorage.setItem('notified_operational_alerts', 'true');

        if (m.nearRetirementCount > 0) {
          setTimeout(() => {
            const firstEmp = m.nearRetirementList[0];
            toast.retirementAlert(
              `تنبيه التقاعد القانوني (${m.nearRetirementCount} موظف)`,
              `الموظف (${firstEmp?.fullName || 'كوادر'}) بلغ أو يقترب من السن القانوني للتقاعد (60 سنة) خلال الأشهر القادمة.`,
              () => onNavigate('retirement'),
              'إجراءات التقاعد'
            );
          }, 600);
        }

        if (m.depletedLeaveCount > 0) {
          setTimeout(() => {
            const firstDep = m.depletedLeaveList[0];
            toast.leaveAlert(
              `تنبيه انتهاء رصيد الإجازات (${m.depletedLeaveCount} موظف)`,
              `الموظف (${firstDep?.fullName || 'كوادر'}) استنفد كامل رصيد إجازاته السنوية المتاحة (الرصيد المتبقي: 0 يوم).`,
              () => onNavigate('employees'),
              'متابعة الرصيد'
            );
          }, 1400);
        }
      }
    });
  }, [employees, onNavigate]);

  // Format today's date in Iraqi Arabic
  const todayArabic = new Date().toLocaleDateString('ar-IQ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const cards = [
    {
      id: 'employees' as WorkspaceTab,
      title: 'إدارة شؤون الموظفين',
      subtitle: 'دليل الكوادر والسجلات الإدارية',
      description: 'تسجيل الكوادر، البحث والفلترة المتقدمة، استيراد وتصدير Excel/CSV، والتعديل الجماعي للسجلات.',
      icon: Users,
      badge: `${employees.length} موظف مسجل`,
      colorGradient: 'from-amber-500 to-amber-600',
      bgHover: 'hover:border-amber-500/60 dark:hover:border-amber-500/60',
      shadowColor: 'shadow-amber-500/10',
      badgeBg: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300/60',
    },
    {
      id: 'smart_archive' as WorkspaceTab,
      title: 'مركز الأرشفة الرقمي والإضبارة الذكية',
      subtitle: 'أرشيف الموظفين، السكنر، والتعرف الضوئي (OCR)',
      description: 'أرشفة الوثائق والكتب الرسمية، قراءة وتفريغ الخط اليدوي، السكنر المكتبي والتصوير الحي، وطباعة التعاريف والبطاقات الوظيفية.',
      icon: FolderOpen,
      badge: 'Tesseract.js OCR ⚡',
      colorGradient: 'from-amber-500 via-orange-500 to-amber-600',
      bgHover: 'hover:border-amber-500/60 dark:hover:border-amber-500/60',
      shadowColor: 'shadow-amber-500/15',
      badgeBg: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300/60',
    },
    {
      id: 'daily_movements' as WorkspaceTab,
      title: 'مركز تسجيل الحركات والتقارير الفورية',
      subtitle: 'تسجيل يومي فوري بنقرة واحدة',
      description: 'تسجيل الغياب (غ)، الإجازات (ج/م)، الإيفاد (ف)، والزمنيات الساعية (ز1/ز2) مع تقارير يومية وأسبوعية وشهرية.',
      icon: Clock,
      badge: 'حركات اليوم والتقارير ⚡',
      colorGradient: 'from-indigo-500 to-indigo-700',
      bgHover: 'hover:border-indigo-500/60 dark:hover:border-indigo-500/60',
      shadowColor: 'shadow-indigo-500/10',
      badgeBg: 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border-indigo-300/60',
    },
    {
      id: 'movement_designer' as WorkspaceTab,
      title: 'المخطط البياني ومصمم تقارير الحركات (حصري)',
      subtitle: 'تحليلات بيانية وإحصائية + تعديل الورقة يدوياً',
      description: 'تحديد نوع الحركة والموظفين المنفذين، رسوم بيانية تفاعلية، تعديل الورقة الرسمية والديباجة والتواقيع يدوياً وتصديرها.',
      icon: BarChart3,
      badge: 'مخططات بيانية + مصمم الورقة 📊',
      colorGradient: 'from-violet-600 to-purple-700',
      bgHover: 'hover:border-violet-500/60 dark:hover:border-violet-500/60',
      shadowColor: 'shadow-violet-500/10',
      badgeBg: 'bg-violet-100 dark:bg-violet-950/70 text-violet-800 dark:text-violet-300 border-violet-300/60',
    },
    {
      id: 'analytics' as WorkspaceTab,
      title: 'الرسوم البيانية التفاعلية (Recharts)',
      subtitle: 'تحليلات الأقسام والدرجات وحالة المباشرة',
      description: 'رسوم بيانية تفاعلية متقدمة توضح توزيع الكوادر حسب القسم، الدرجة الوظيفية (1-10)، والمباشرين مقابل المتمتعين بإجازة.',
      icon: TrendingUp,
      badge: 'Recharts تفاعلي 📊',
      colorGradient: 'from-cyan-600 to-blue-700',
      bgHover: 'hover:border-cyan-500/60 dark:hover:border-cyan-500/60',
      shadowColor: 'shadow-cyan-500/10',
      badgeBg: 'bg-cyan-100 dark:bg-cyan-950/70 text-cyan-800 dark:text-cyan-300 border-cyan-300/60',
    },
    {
      id: 'reports' as WorkspaceTab,
      title: 'تقارير الدوام والشيت السنوي',
      subtitle: 'شيت الحضور الشامل واستمارات الطباعة',
      description: 'شيت الحضور السنوي الشامل لكل أيام الأشهر (1..31)، معاينة واستخراج استمارات الطباعة الرسمية A4.',
      icon: FileSpreadsheet,
      badge: 'شيت الدوام الشامل A4',
      colorGradient: 'from-emerald-500 to-emerald-700',
      bgHover: 'hover:border-emerald-500/60 dark:hover:border-emerald-500/60',
      shadowColor: 'shadow-emerald-500/10',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300/60',
    },
    {
      id: 'calendar' as WorkspaceTab,
      title: 'التقويم السنوي والعطل الرسمية',
      subtitle: 'عطل مجلس الوزراء والتعميم',
      description: 'روزنامة العطل الرسمية المعتمدة لجمهورية العراق لسنة 2026، عطل الطوارئ، وتعميم الإجازات على الموظفين.',
      icon: Calendar,
      badge: 'عطل مجلس الوزراء 2026',
      colorGradient: 'from-amber-600 to-amber-700',
      bgHover: 'hover:border-amber-600/60 dark:hover:border-amber-600/60',
      shadowColor: 'shadow-amber-600/10',
      badgeBg: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300/60',
    },
    {
      id: 'biometric_audit' as WorkspaceTab,
      title: 'كشف البصمة الذكي الشامل (يومي / أسبوعي / شهري)',
      subtitle: 'فلترة ذكية، ربط الأقسام، وسجل حركات أجهزة البصمة',
      description: 'كشف حضور وانصراف تفصيلي للموظفين، فلترة حسب القسم والأجهزة والنوع، كشف يومي وأسبوعي وشيت شهري وسجل البصمة اللحظي مع إمكانية التصدير والطباعة الرسمية.',
      icon: Fingerprint,
      badge: 'كشف البصمة المتقدم ⚡',
      colorGradient: 'from-blue-600 via-indigo-600 to-indigo-800',
      bgHover: 'hover:border-indigo-500/60 dark:hover:border-indigo-500/60',
      shadowColor: 'shadow-indigo-500/15',
      badgeBg: 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border-indigo-300/60',
    },
    {
      id: 'barcode_hub' as WorkspaceTab,
      title: 'منظومة الباركود والبطاقات الذكية (Barcode & QR)',
      subtitle: 'مسح الحضور الفوري والبطاقات التعريفية',
      description: 'تسجيل الحضور والانصراف بالمسح الضوئي الفوري، توليد وطباعة بطاقات الهوية الرسمية (Badges)، والتحقق المباشر من الموظف.',
      icon: QrCode,
      badge: 'باركود + قارئ USB ⚡',
      colorGradient: 'from-amber-500 to-amber-700',
      bgHover: 'hover:border-amber-500/60 dark:hover:border-amber-500/60',
      shadowColor: 'shadow-amber-500/10',
      badgeBg: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300/60',
    },
    {
      id: 'allow_promotions' as WorkspaceTab,
      title: 'العلاوات السنوية والترفيعات الوظيفية',
      subtitle: 'استحقاق الدرجات والمراحل والأوامر',
      description: 'جدول استحقاق العلاوات الشهرية، منح وتأجيل العلاوة، شروط واستحقاق الترفيع حسب سنوات الخدمة، وإصدار الأوامر الإدارية تلقائياً.',
      icon: Award,
      badge: 'علاوات وترفيعات 2026',
      colorGradient: 'from-amber-600 to-orange-700',
      bgHover: 'hover:border-orange-500/60 dark:hover:border-orange-500/60',
      shadowColor: 'shadow-orange-500/10',
      badgeBg: 'bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 border-orange-300/60',
    },
    {
      id: 'retirement' as WorkspaceTab,
      title: 'هيئة وشؤون التقاعد ومكافأة نهاية الخدمة',
      subtitle: 'الأسباب الصحية + بطلب الموظف + السن القانوني والضوابط الوزارية',
      description: 'إدارة الإحالة على التقاعد بالأسباب الصحية (اللجان الطبية الرسمية)، بناءً على طلب الموظف، بلوغ السن القانوني، وتعديل الضوابط حسب التغيرات الوزارية.',
      icon: Briefcase,
      badge: 'التقاعد والضوابط الوزارية ⚖️',
      colorGradient: 'from-purple-600 to-indigo-800',
      bgHover: 'hover:border-purple-500/60 dark:hover:border-purple-500/60',
      shadowColor: 'shadow-purple-500/10',
      badgeBg: 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border-purple-300/60',
    },
    {
      id: 'settings' as WorkspaceTab,
      title: 'الإعدادات المركزية وقواعد الدوام',
      subtitle: 'هوية الدائرة والضوابط والأمان',
      description: 'تخصيص هوية الوزارة والدائرة، الشعار الرسمي، قواعد رصيد الإجازات والزمنيات، نمط العرض، والأمان.',
      icon: Sliders,
      badge: 'إعدادات المنظومة',
      colorGradient: 'from-sky-500 to-blue-700',
      bgHover: 'hover:border-sky-500/60 dark:hover:border-sky-500/60',
      shadowColor: 'shadow-sky-500/10',
      badgeBg: 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border-sky-300/60',
    },
    {
      id: 'backup' as WorkspaceTab,
      title: 'النسخ الاحتياطي والأمان',
      subtitle: 'الأمان وحفظ واسترجاع البيانات',
      description: 'حفظ نسخة احتياطية آمنة من قاعدة البيانات، استرجاع السجلات الرسمية عند الحاجة، وتأمين حفظ البيانات.',
      icon: HardDrive,
      badge: 'أمان وحفظ محلي',
      colorGradient: 'from-blue-600 to-indigo-800',
      bgHover: 'hover:border-blue-500/60 dark:hover:border-blue-500/60',
      shadowColor: 'shadow-blue-500/10',
      badgeBg: 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border-blue-300/60',
    },
    {
      id: 'profile' as WorkspaceTab,
      title: 'المستخدمين ومصفوفة الصلاحيات',
      subtitle: 'حسابات النظام والتحكم الإداري',
      description: 'استعراض بيانات المستخدم النشط، مصفوفة الصلاحيات الإدارية المقيدة (RBAC)، وسجلات التدقيق.',
      icon: ShieldCheck,
      badge: currentUser.roleTitleAr,
      colorGradient: 'from-purple-500 to-purple-700',
      bgHover: 'hover:border-purple-500/60 dark:hover:border-purple-500/60',
      shadowColor: 'shadow-purple-500/10',
      badgeBg: 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border-purple-300/60',
    },
    {
      id: 'db_test' as WorkspaceTab,
      title: 'فحص IndexedDB والذاكرة المحلية',
      subtitle: 'أمان البيانات بدون إنترنت',
      description: 'فحص سلامة جداول IndexedDB، عدد القيود المخزنة محلياً، والتأكد من العمل 100% بدون إنترنت.',
      icon: Database,
      badge: '100% محلي Offline',
      colorGradient: 'from-slate-700 to-slate-900',
      bgHover: 'hover:border-slate-500/60 dark:hover:border-slate-500/60',
      shadowColor: 'shadow-slate-500/10',
      badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300/60',
    },
  ];

  return (
    <div className="space-y-6 pb-6">
      {/* 1. Official Government Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 text-white border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Organization Identity & Emblem */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="shrink-0 p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-md">
              <GovernmentEmblem
                type={organization.officialEmblem || 'golden_eagle'}
                className="w-14 h-14 sm:w-16 sm:h-16"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  جمهورية العراق
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  سنة التشغيل: {organization.operatingYear || 2026}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {organization.ministryName}
              </h1>
              <p className="text-sm font-semibold text-slate-300 mt-0.5">
                {organization.directorateName} — {organization.departmentName}
              </p>
            </div>
          </div>

          {/* User Badge & Layout Toggle Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Notifications Toasts Trigger Button */}
            <button
              type="button"
              id="hub-trigger-toasts-btn"
              onClick={() => {
                let triggered = 0;
                if (metrics.nearRetirementCount > 0) {
                  const firstEmp = metrics.nearRetirementList[0];
                  toast.retirementAlert(
                    `تنبيه التقاعد القانوني (${metrics.nearRetirementCount} موظف)`,
                    `الموظف (${firstEmp?.fullName || 'كوادر'}) بلغ أو يقترب من السن القانوني للتقاعد (60 سنة).`,
                    () => onNavigate('retirement'),
                    'إجراءات التقاعد'
                  );
                  triggered++;
                }

                if (metrics.depletedLeaveCount > 0) {
                  const firstDep = metrics.depletedLeaveList[0];
                  toast.leaveAlert(
                    `تنبيه رصيد الإجازات (${metrics.depletedLeaveCount} موظف)`,
                    `الموظف (${firstDep?.fullName || 'كوادر'}) استنفد كامل رصيد إجازاته الاعتيادية السنوية.`,
                    () => onNavigate('employees'),
                    'متابعة الرصيد'
                  );
                  triggered++;
                }

                if (triggered === 0) {
                  toast.info('كافة سجلات الكوادر والتقاعد والإجازات منتظمة ولا توجد تنبيهات عاجلة حالياً.');
                }
              }}
              className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="إظهار تنبيهات النظام الفورية (Toasts)"
            >
              <Bell className="w-4 h-4 text-amber-300" />
              <span>
                إشعارات النظام
                {metrics.nearRetirementCount + metrics.depletedLeaveCount > 0 && (
                  <span className="mr-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-mono">
                    {metrics.nearRetirementCount + metrics.depletedLeaveCount}
                  </span>
                )}
              </span>
            </button>

            {/* License & Activation Trigger */}
            {onOpenLicense && (
              <button
                type="button"
                id="hub-license-btn"
                onClick={onOpenLicense}
                className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="حالة ترخيص النسخة وتفعيل الأكواد"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>الترخيص والتفعيل 🛡️</span>
              </button>
            )}

            {/* Quick Layout Switch to Sidebar */}
            <button
              type="button"
              id="switch-to-sidebar-btn"
              onClick={() => onToggleLayout('sidebar')}
              className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
              title="التبديل إلى نمط القائمة الجانبية (Sidebar)"
            >
              <Sidebar className="w-4 h-4 text-amber-400" />
              <span>نمط القائمة الجانبية</span>
            </button>

            {/* Quick Movement Registration Modal Trigger */}
            <button
              type="button"
              id="hub-quick-movement-btn"
              onClick={onOpenMovementModal}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>تسجيل حركة للموظف ⚡</span>
            </button>

            {/* Quick 5-Year Leave Management Trigger */}
            <button
              type="button"
              id="hub-five-year-leave-btn"
              onClick={() => {
                if (onNavigateToFiveYearLeave) {
                  onNavigateToFiveYearLeave();
                } else {
                  onNavigate('daily_movements');
                }
              }}
              className="px-3.5 py-2 rounded-2xl bg-purple-600/80 hover:bg-purple-600 border border-purple-400/30 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              title="منح وإدارة إجازة 5 سنوات براتب اسمي كامل"
            >
              <Briefcase className="w-4 h-4 text-purple-200" />
              <span>إجازة 5 سنوات 📜</span>
            </button>
          </div>
        </div>

        {/* Live Date, Time, and Status sub-bar */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>{todayArabic}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-slate-200">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>{currentTime || '12:00:00 م'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-semibold text-emerald-300">
              المنظومة تعمل بالكامل محلياً (Offline-First 100%)
            </span>
          </div>
        </div>
      </div>

      {/* 2. Executive Quick Metric Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
            <span>إجمالي الكوادر</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {employees.length}
          </div>
          <span className="text-[10px] text-slate-400">موظف مسجل بالنظام</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
            <span>ملاك دائم</span>
            <UserCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
            {permanentCount}
          </div>
          <span className="text-[10px] text-slate-400">رصيد 36 يوماً سنوياً</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
            <span>عقد وزاري (315)</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
            {contractCount}
          </div>
          <span className="text-[10px] text-slate-400">رصيد 30 يوماً سنوياً</span>
        </div>

        {/* 5-Year Leave Metric Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (onNavigateToFiveYearLeave) {
              onNavigateToFiveYearLeave();
            } else {
              onNavigate('daily_movements');
            }
          }}
          className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/70 shadow-xs hover:border-purple-400 transition-all cursor-pointer"
          title="الانتقال إلى وحدة إجازة الـ 5 سنوات"
        >
          <div className="text-[11px] font-bold text-purple-700 dark:text-purple-300 mb-1 flex items-center justify-between">
            <span>إجازة 5 سنوات</span>
            <Briefcase className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black font-mono text-purple-700 dark:text-purple-300">
            {fiveYearLeaveCount}
          </div>
          <span className="text-[10px] text-purple-600/80 dark:text-purple-400 font-semibold">
            براتب اسمي كامل (انقر للإدارة)
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
            <span>المستخدم الحالي</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
            {currentUser.fullName.split(' ')[0]} {currentUser.fullName.split(' ')[1] || ''}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            {currentUser.roleTitleAr}
          </span>
        </div>
      </div>

      {/* 2.5 Real-Time Operational Alerts Bar (Retirement, Leave, Career & Badges) */}
      {(metrics.dueAllowancesCount > 0 ||
        metrics.nearRetirementCount > 0 ||
        metrics.depletedLeaveCount > 0 ||
        metrics.unprintedBadgesCount > 0 ||
        fiveYearLeaveCount > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 5-Year Leave Active Alert */}
          {fiveYearLeaveCount > 0 && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                if (onNavigateToFiveYearLeave) {
                  onNavigateToFiveYearLeave();
                } else {
                  onNavigate('daily_movements');
                }
              }}
              className="p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer hover:shadow-sm transition-all bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800/80"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-700 dark:text-purple-300">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-purple-900 dark:text-purple-200">
                    {fiveYearLeaveCount} موظف بإجازة 5 سنوات
                  </div>
                  <div className="text-[10px] text-purple-700 dark:text-purple-400">
                    استقطاع 10% تقاعد ومتابعة المدد
                  </div>
                </div>
              </div>
              <span className="text-xs text-purple-600 font-bold hover:underline">
                معاينة ←
              </span>
            </div>
          )}
          {/* 1. Near Retirement Alert */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('retirement')}
            className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer hover:shadow-sm transition-all ${
              metrics.nearRetirementCount > 0
                ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800/80'
                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-700 dark:text-purple-300">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-purple-900 dark:text-purple-200">
                  {metrics.nearRetirementCount} قادمون على التقاعد
                </div>
                <div className="text-[10px] text-purple-700 dark:text-purple-400">
                  بلوغ سن 60 واحتساب المكافأة
                </div>
              </div>
            </div>
            <span className="text-xs text-purple-600 font-bold hover:underline">
              استعراض ←
            </span>
          </div>

          {/* 2. Depleted Leave Balances Alert (انتهاء رصيد الإجازات) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('employees')}
            className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer hover:shadow-sm transition-all ${
              metrics.depletedLeaveCount > 0
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/80'
                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-700 dark:text-rose-300">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-rose-900 dark:text-rose-200">
                  {metrics.depletedLeaveCount} استنفدوا رصيد الإجازات
                </div>
                <div className="text-[10px] text-rose-700 dark:text-rose-400">
                  الرصيد المتبقي صفر (0) يوم
                </div>
              </div>
            </div>
            <span className="text-xs text-rose-600 font-bold hover:underline">
              معاينة ←
            </span>
          </div>

          {/* 3. Due Allowances Alert */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('allow_promotions')}
            className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 flex items-center justify-between cursor-pointer hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-amber-900 dark:text-amber-200">
                  {metrics.dueAllowancesCount} مستحق للعلاوة السنوية
                </div>
                <div className="text-[10px] text-amber-700 dark:text-amber-400">
                  استحقاق الشهر الحالي والقادم
                </div>
              </div>
            </div>
            <span className="text-xs text-amber-600 font-bold hover:underline">
              منح الآن ←
            </span>
          </div>

          {/* 4. Unprinted Badges Alert */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigate('barcode_hub')}
            className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-800/80 flex items-center justify-between cursor-pointer hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-indigo-900 dark:text-indigo-200">
                  {metrics.unprintedBadgesCount} هوية غير مطبوعة
                </div>
                <div className="text-[10px] text-indigo-700 dark:text-indigo-400">
                  جاهزة للطباعة والباركود
                </div>
              </div>
            </div>
            <span className="text-xs text-indigo-600 font-bold hover:underline">
              طباعة ←
            </span>
          </div>
        </div>
      )}

      {/* 3. The 8 Interactive Operation Hub Cards (Main Hub Grid) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-amber-500" />
            <span>بوابة الإدارة والعمليات المركزية:</span>
          </h2>
          <span className="text-xs text-slate-400">
            اختر البوابة المطلوبة للمتابعة والتنفيذ الفوري
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                id={`hub-card-${c.id}`}
                onClick={() => onNavigate(c.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onNavigate(c.id);
                  }
                }}
                className={`group p-5 rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_12px_rgba(15,23,42,0.03)] hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-700 ${c.shadowColor} ${c.bgHover} transition-all duration-200 cursor-pointer flex flex-col justify-between text-right hover:-translate-y-1`}
              >
                <div>
                  {/* Top row with Icon and Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${c.colorGradient} flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105 shrink-0`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>

                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-bold border truncate max-w-[170px] ${c.badgeBg}`}
                    >
                      {c.badge}
                    </span>
                  </div>

                  {/* Title & Subtitle */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {c.title}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    {c.subtitle}
                  </p>

                  {/* Description */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed">
                    {c.description}
                  </p>
                </div>

                {/* Card Footer Link */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  <span>فتح البوابة</span>
                  <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Official Developer Support & Signature Card */}
      <div className="mt-6 p-6 rounded-3xl bg-slate-950 text-slate-100 border border-amber-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-sm font-black text-amber-300">
                المهندس حسين عبد المنذر
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-xs text-slate-300 font-semibold">
                مطور ومنظم المنظومة الحكومية الموحدة
              </span>
            </div>
            <p className="text-xs text-slate-400">
              تم بناء وبرمجة هذا النظام وفقاً لقوانين الخدمة المدنية النافذة وضوابط الأمان المحلي (IndexedDB Offline) في جمهورية العراق.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="tel:07711145014"
              className="px-4 py-2 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold transition-all"
              dir="ltr"
            >
              07711145014
            </a>
            <span className="px-4 py-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
              تليجرام: @h92so
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
