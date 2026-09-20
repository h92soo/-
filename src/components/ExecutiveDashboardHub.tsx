import React from 'react';
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
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  UserAccount,
  Employee,
  AppearanceSettings,
  OrganizationSettings,
} from '../types';
import { GovernmentEmblem } from './GovernmentEmblem';
import { WorkspaceTab } from '../App';

interface ExecutiveDashboardHubProps {
  currentUser: UserAccount;
  organization: OrganizationSettings;
  employees: Employee[];
  appearance: AppearanceSettings;
  onNavigate: (tab: WorkspaceTab) => void;
  onToggleLayout: (layout: 'sidebar' | 'dashboard_hub') => void;
  onOpenMovementModal: () => void;
  onLogout: () => void;
  currentTime: string;
}

export function ExecutiveDashboardHub({
  currentUser,
  organization,
  employees,
  appearance,
  onNavigate,
  onToggleLayout,
  onOpenMovementModal,
  onLogout,
  currentTime,
}: ExecutiveDashboardHubProps) {
  const permanentCount = employees.filter((e) => e.contractType === 'permanent').length;
  const contractCount = employees.filter((e) => e.contractType === 'contract').length;

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
      id: 'settings' as WorkspaceTab,
      title: 'الإعدادات المركزية وقواعد الدوام',
      subtitle: 'هوية الدائرة والضوابط والأمان',
      description: 'تخصيص هوية الوزارة والدائرة، الشعار الرسمي، قواعد رصيد الإجازات والزمنيات، نمط العرض، والأمان.',
      icon: Sliders,
      badge: 'محمي برمز المشرف SAsa12589',
      colorGradient: 'from-sky-500 to-blue-700',
      bgHover: 'hover:border-sky-500/60 dark:hover:border-sky-500/60',
      shadowColor: 'shadow-sky-500/10',
      badgeBg: 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border-sky-300/60',
    },
    {
      id: 'backup' as WorkspaceTab,
      title: 'النسخ الاحتياطي ومزامنة السحابة',
      subtitle: 'الأمان وحفظ واسترجاع البيانات',
      description: 'تصدير نسخة احتياطية محلية بصيغة JSON، استرجاع السجلات، وإعداد مزامنة السحابة Google Drive وتخصيص البريد.',
      icon: HardDrive,
      badge: 'Google Drive & JSON',
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
          <div className="flex flex-wrap items-center gap-3">
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
            <span>عقد وزاري (315)</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
            {contractCount}
          </div>
          <span className="text-[10px] text-slate-400">رصيد 30 يوماً سنوياً</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
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
                className={`group p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md ${c.shadowColor} ${c.bgHover} transition-all duration-200 cursor-pointer flex flex-col justify-between text-right hover:-translate-y-1`}
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
