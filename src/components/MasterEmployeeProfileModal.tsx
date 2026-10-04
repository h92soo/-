import React, { useState, useEffect } from 'react';
import {
  User,
  Calendar,
  Briefcase,
  Building2,
  Clock,
  Award,
  ShieldAlert,
  FileText,
  TrendingUp,
  HeartPulse,
  Printer,
  Edit2,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  History,
  Phone,
  CreditCard,
  X,
  PlusCircle,
  ExternalLink,
  DollarSign,
  Percent,
  GraduationCap,
  Fingerprint,
  Activity,
  Network,
  Laptop,
} from 'lucide-react';
import {
  Employee,
  CareerTimelineEvent,
  AttendanceRecord,
  AllowanceRecord,
  PromotionRecord,
  OrganizationSettings,
  LeaveRulesSettings,
} from '../types';
import { employeeService } from '../services/employeeService';
import { getAttendanceLogsByEmployee, getSystemSetting } from '../db/indexedDB';
import { BarcodeVisual, QrVisual } from './BarcodeVisual';
import { EmployeeBadgeModal } from './EmployeeBadgeModal';
import { SalaryAllowancesModal } from './SalaryAllowancesModal';
import { computeEmployeeSalaryComponents, formatIQD } from '../utils/iraqiSalaryScale';
import { toast } from './ToastNotification';

interface MasterEmployeeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string | null;
  organization: OrganizationSettings;
  leaveRules: LeaveRulesSettings;
  onEditEmployee?: (employee: Employee) => void;
  onOpenMovementModal?: (employeeId: string, category?: any) => void;
  onGrantAllowance?: (employee: Employee) => void;
  onPromoteEmployee?: (employee: Employee) => void;
  onRetireEmployee?: (employee: Employee) => void;
  onOpenAuditLog?: (employeeId: string) => void;
}

type ProfileTab =
  | 'overview'
  | 'timeline'
  | 'attendance'
  | 'allowances_promotions'
  | 'barcode_badge'
  | 'retirement';

export const MasterEmployeeProfileModal: React.FC<MasterEmployeeProfileModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  organization,
  leaveRules,
  onEditEmployee,
  onOpenMovementModal,
  onGrantAllowance,
  onPromoteEmployee,
  onRetireEmployee,
  onOpenAuditLog,
}) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [timeline, setTimeline] = useState<CareerTimelineEvent[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [allowanceList, setAllowanceList] = useState<AllowanceRecord[]>([]);
  const [promotionList, setPromotionList] = useState<PromotionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);

  // Load employee data on open
  useEffect(() => {
    if (!isOpen || !employeeId) {
      setEmployee(null);
      return;
    }

    let isMounted = true;
    const loadAll = async () => {
      setIsLoading(true);
      try {
        const emp = await employeeService.getById(employeeId);
        if (!emp || !isMounted) return;
        setEmployee(emp);

        const [tEvents, logs, allowances, promotions] = await Promise.all([
          employeeService.getEmployeeTimeline(emp.id),
          getAttendanceLogsByEmployee(emp.id),
          employeeService.getAllAllowances(),
          employeeService.getAllPromotions(),
        ]);

        if (isMounted) {
          setTimeline(tEvents);
          setAttendanceLogs(logs);
          setAllowanceList(allowances.filter((a) => a.employeeId === emp.id));
          setPromotionList(promotions.filter((p) => p.employeeId === emp.id));
        }
      } catch (err) {
        console.error('Failed to load employee details:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadAll();

    // Subscribe to real-time changes
    const unsub = employeeService.subscribe((all, target) => {
      if (target && target.id === employeeId) {
        setEmployee(target);
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [isOpen, employeeId]);

  if (!isOpen || !employee) return null;

  // Calculate stats
  const usedDays = employee.usedBalance || 0;
  const remainingDays = employee.remainingBalance || 0;
  const totalBalance = employee.annualBalanceLimit || 36;
  const balancePercentage = Math.min(100, Math.round((remainingDays / totalBalance) * 100));

  // Service duration calculation
  const hireYear = employee.hireDate ? new Date(employee.hireDate).getFullYear() : 2020;
  const serviceYears = Math.max(0, 2026 - hireYear);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in no-print-bg">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header Card */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 text-white relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar Frame */}
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                  {employee.fullName.charAt(0)}
                </div>
                {employee.status === 'retired' ? (
                  <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-purple-600 text-white shadow-xs">
                    متقاعد
                  </span>
                ) : (
                  <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-emerald-500 text-white border-2 border-slate-900">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-amber-300 border border-white/10">
                    الرقم الموحد: {employee.employeeNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {employee.contractType === 'permanent' ? 'ملاك دائم' : 'عقد وزاري'}
                  </span>
                  {employee.civilGrade && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                      الدرجة {employee.civilGrade} / المرحلة {employee.civilStage || 1}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-black text-white tracking-tight">
                  {employee.fullName}
                </h2>
                <p className="text-xs text-slate-300 font-semibold mt-0.5">
                  {employee.jobTitle} — {employee.department} {employee.division ? `(${employee.division})` : ''}
                </p>
              </div>
            </div>

            {/* Quick Actions & Close */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => setIsBadgeModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="عرض وطباعة بطاقة الهوية الرسمية والباركود"
              >
                <QrCode className="w-4 h-4" />
                <span>بطاقة الهوية / الباركود</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="mt-5 pt-3 border-t border-slate-800 flex items-center gap-1 overflow-x-auto text-xs font-semibold scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>البيانات الشخصية والوظيفية</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'timeline'
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>السجل الزمني الكامل (Timeline)</span>
              <span className="text-[10px] px-1.5 rounded-full bg-white/20">
                {timeline.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('attendance')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'attendance'
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>الدوام والأرصدة والإجازات</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('allowances_promotions')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'allowances_promotions'
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>العلاوات والترفيعات</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('barcode_badge')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'barcode_badge'
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>الباركود والتحقق</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('retirement')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'retirement'
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>ملف التقاعد</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">سنوات الخدمة</span>
                  <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                    {serviceYears} <span className="text-xs font-normal">سنوات</span>
                  </div>
                  <span className="text-[10px] text-slate-400">منذ {employee.hireDate}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
                  <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">الدرجة والمرحلة</span>
                  <div className="text-xl font-black font-mono text-amber-700 dark:text-amber-400 mt-1">
                    د.{employee.civilGrade || 7} / م.{employee.civilStage || 1}
                  </div>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">العلاوة: {employee.nextAllowanceDueDate || '—'}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">رصيد الإجازات المتبقي</span>
                  <div className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1">
                    {remainingDays} <span className="text-xs font-normal">/{totalBalance} يوم</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400">مستهلك: {usedDays} يوم</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
                  <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300">التحصيل الدراسي</span>
                  <div className="text-base font-bold text-blue-900 dark:text-blue-200 mt-1 truncate">
                    {employee.educationDegree || 'بكالوريوس'}
                  </div>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400">مؤهل رسمي معتمد</span>
                </div>
              </div>

              {/* Detailed Personal & Job Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Personal Information Box */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                    <User className="w-4 h-4 text-amber-500" />
                    <span>البيانات الشخصية والاتصال</span>
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                      <span className="text-slate-500">الاسم الرباعي واللقب:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{employee.fullName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                      <span className="text-slate-500">الرقم الإحصائي المركزي:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                        {employee.nationalStatisticalNumber || 'STAT-غير مسجل'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                      <span className="text-slate-500">البطاقة الوطنية الموحدة:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200" dir="ltr">
                        {employee.nationalId || 'غير مسجل'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                      <span className="text-slate-500">رقم الهاتف:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                        {employee.phone || 'غير مسجل'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                      <span className="text-slate-500">تاريخ الميلاد:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        {employee.birthDate || 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                      <span className="text-slate-500">الجنس:</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {employee.gender === 'female' ? 'أنثى' : 'ذكر'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">الحالة الوظيفية:</span>
                      <span className={`font-bold ${
                        employee.status === 'five_year_leave'
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : employee.status === 'retired'
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {employee.status === 'five_year_leave'
                          ? 'مجاز 5 سنوات (براتب اسمي)'
                          : employee.status === 'retired'
                          ? 'متقاعد رسمياً'
                          : 'مستمر بالخدمة (فعال)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Civil Service & Job Info Box */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                    <Briefcase className="w-4 h-4 text-indigo-500" />
                    <span>البيانات الوظيفية والملاك والتقاعد</span>
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                      <span className="text-slate-500">الرقم الوظيفي الموحد:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{employee.employeeNumber}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                      <span className="text-slate-500">السجل / الإضبارة التقاعدية:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200" dir="ltr">
                        {employee.pensionFileNumber || 'PEN-غير مسجل'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                      <span className="text-slate-500">القسم / التشكيل:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{employee.department}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                      <span className="text-slate-500">الشعبة / الوحدة:</span>
                      <span className="text-slate-800 dark:text-slate-200">{employee.division || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                      <span className="text-slate-500">التخصص المهني:</span>
                      <span className="text-slate-800 dark:text-slate-200">{employee.specialization || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                      <span className="text-slate-500">تاريخ المباشرة الأولى:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{employee.hireDate}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                      <span className="text-slate-500">تاريخ التثبيت:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{employee.confirmationDate || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">نوع التوظيف:</span>
                      <span className="font-bold text-amber-700 dark:text-amber-400">
                        {employee.contractType === 'permanent' ? 'ملاك دائم (تراكمي)' : 'عقد وزاري (315)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Biometric Integration Card / الربط مع منظومة وأجهزة البصمة */}
              <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-sky-200 dark:border-sky-800/60">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">
                        بيانات الربط مع أجهزة البصمة والدوام الذكي
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        معرف البصمة، عنوان الآي بي للجهاز المرتبط، ونوع البصمة الحيوية
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300 font-mono">
                    متصل مع المنظومة
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900/50">
                    <span className="text-[10px] text-slate-400 block mb-0.5">معرف البصمة (Device PIN):</span>
                    <span className="font-mono font-black text-sky-700 dark:text-sky-300 text-sm" dir="ltr">
                      {employee.biometricEnrollmentId || employee.employeeNumber.replace(/\D/g, '').slice(-4) || '1042'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900/50">
                    <span className="text-[10px] text-slate-400 block mb-0.5">عنوان الآي بي للجهاز:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs" dir="ltr">
                      {employee.biometricDeviceIp || '192.168.1.201'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900/50">
                    <span className="text-[10px] text-slate-400 block mb-0.5">نوع البصمة المعتمدة:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {employee.biometricModality === 'face'
                        ? 'بصمة وجه (AI Face)'
                        : employee.biometricModality === 'fingerprint'
                        ? 'بصمة إصبع'
                        : employee.biometricModality === 'iris_palm'
                        ? 'بصمة كف وعين'
                        : employee.biometricModality === 'rfid_card'
                        ? 'بطاقة ذكية RFID'
                        : 'متعدد حيوي شامل'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-sky-100 dark:border-sky-900/50">
                    <span className="text-[10px] text-slate-400 block mb-0.5">مطابقة الإجازات:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>مربوط آلياً بالرصيد</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Special 5-Year Leave Active Banner if applicable */}
              {(employee.status === 'five_year_leave' || (employee.fiveYearLeave && employee.fiveYearLeave.isActive)) && (
                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-200 dark:border-indigo-800">
                    <span className="font-bold text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-indigo-600" />
                      <span>الموظف متمتع حالياً بإجازة خمس (5) سنوات براتب اسمي وفق القانون العراقي</span>
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`هل أنت متأكد من قطع إجازة الـ 5 سنوات للموظف (${employee.fullName}) وتثبيت المباشرة بالدوام؟`)) {
                          const updated = {
                            ...employee,
                            status: 'active' as const,
                            fiveYearLeave: employee.fiveYearLeave ? {
                              ...employee.fiveYearLeave,
                              isActive: false,
                              notes: (employee.fiveYearLeave.notes || '') + ' - تم قطع الإجازة والمباشرة بالدوام',
                            } : undefined,
                          };
                          await employeeService.updateEmployee(updated);
                          setEmployee(updated);
                          toast.success('تم قطع إجازة الـ 5 سنوات وتثبيت مباشرة الموظف بنجاح');
                        }
                      }}
                      className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                    >
                      قطع الإجازة والمباشرة
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60">
                      <div className="text-[10px] text-slate-500">نوع الراتب المصروف:</div>
                      <div className="font-black text-indigo-900 dark:text-indigo-200">
                        {employee.fiveYearLeave?.salaryType === 'half_base_salary' ? 'نصف راتب اسمي (50%)' : 'راتب اسمي كامل (100%)'}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60">
                      <div className="text-[10px] text-slate-500">المدة والتاريخ:</div>
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        {employee.fiveYearLeave?.startDate} ← {employee.fiveYearLeave?.endDate}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60">
                      <div className="text-[10px] text-slate-500">السند والأمر الإداري:</div>
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        {employee.fiveYearLeave?.orderNumber || 'أمر وزاري'} بتاريخ {employee.fiveYearLeave?.orderDate || '—'}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60">
                      <div className="text-[10px] text-slate-500">الصافي الشهري المستلم:</div>
                      <div className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                        {(employee.fiveYearLeave?.netMonthlyPaid || Math.round((employee.baseSalary || 500000) * 0.9)).toLocaleString('en-US')} د.ع
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Salary & Allowances Summary Box */}
              {(() => {
                const c = computeEmployeeSalaryComponents(employee);
                return (
                  <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-200/80 dark:border-amber-800/80">
                      <span className="font-bold text-xs text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-amber-600" />
                        <span>بيانات الراتب والمخصصات الحكومية والضرائب (قانون 22 لسنة 2008)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsSalaryModalOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>تعديل الراتب والمخصصات</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="text-[10px] text-slate-500">الدرجة والمرحلة</div>
                        <div className="font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                          الدرجة {employee.civilGrade || 7} / المرحلة {employee.civilStage || 1}
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="text-[10px] text-slate-500">الراتب الاسمي</div>
                        <div className="font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                          {formatIQD(c.baseSalary)}
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="text-[10px] text-slate-500">مجموع المخصصات</div>
                        <div className="font-bold font-mono text-emerald-600 mt-0.5">
                          +{formatIQD(c.totalAllowances)}
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="text-[10px] text-slate-500">صافي الراتب المستحق</div>
                        <div className="font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                          {formatIQD(c.netSalary)}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-3 pt-1">
                      <span>• زوجية: <strong>{c.spouseAllowance > 0 ? 'مستحق (50,000 د.ع)' : 'غير مشمول'}</strong></span>
                      <span>• أطفال ({employee.childrenCount || 0}): <strong>{formatIQD(c.childrenAllowance)}</strong></span>
                      <span>• شهادة ({employee.educationAllowancePercent || 45}%): <strong>{formatIQD(c.educationAllowance)}</strong></span>
                      <span>• تقاعد (10%): <strong>{formatIQD(c.pensionDeduction)}</strong></span>
                      {employee.isTaxEnabled && (
                        <span>• ضريبة الدخل ({employee.taxRatePercent || 3}%): <strong>{formatIQD(c.taxDeduction)}</strong></span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {onEditEmployee && (
                    <button
                      type="button"
                      onClick={() => onEditEmployee(employee)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                      <span>تعديل بيانات الموظف</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsSalaryModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>تعديل الراتب والمخصصات</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {onGrantAllowance && employee.status !== 'retired' && (
                    <button
                      type="button"
                      onClick={() => onGrantAllowance(employee)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
                    >
                      منح علاوة سنوية
                    </button>
                  )}
                  {onPromoteEmployee && employee.status !== 'retired' && (
                    <button
                      type="button"
                      onClick={() => onPromoteEmployee(employee)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer"
                    >
                      إصدار ترفيع
                    </button>
                  )}
                  {onRetireEmployee && employee.status !== 'retired' && (
                    <button
                      type="button"
                      onClick={() => onRetireEmployee(employee)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 hover:bg-purple-100 transition-colors cursor-pointer"
                    >
                      إحالة على التقاعد
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-amber-500" />
                    <span>السجل الزمني وتتبع التعديلات (Audit Log)</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    توثيق رسمي لكافة العمليات والتعديلات المنفذة على ملف الموظف مع هوية المسؤول وتوقيته
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {timeline.length} حدث مسجل
                  </span>
                  {onOpenAuditLog && (
                    <button
                      type="button"
                      onClick={() => onOpenAuditLog(employee.id)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>فتح سجل التعديلات الكامل</span>
                    </button>
                  )}
                </div>
              </div>

              {timeline.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <History className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-xs font-semibold">لا توجد أحداث مسجلة بعد في السجل الزمني للموظف.</p>
                </div>
              ) : (
                <div className="relative border-r-2 border-slate-200 dark:border-slate-700 pr-5 space-y-6 mr-3">
                  {timeline.map((evt) => {
                    const getIcon = () => {
                      switch (evt.category) {
                        case 'hire':
                          return <Briefcase className="w-4 h-4 text-emerald-500" />;
                        case 'department_change':
                          return <Building2 className="w-4 h-4 text-blue-500" />;
                        case 'education_change':
                          return <GraduationCap className="w-4 h-4 text-purple-500" />;
                        case 'salary_change':
                          return <DollarSign className="w-4 h-4 text-emerald-500" />;
                        case 'allowance':
                          return <Award className="w-4 h-4 text-amber-500" />;
                        case 'promotion':
                          return <TrendingUp className="w-4 h-4 text-indigo-500" />;
                        case 'penalty':
                          return <ShieldAlert className="w-4 h-4 text-rose-500" />;
                        case 'retirement':
                          return <User className="w-4 h-4 text-purple-500" />;
                        default:
                          return <FileText className="w-4 h-4 text-blue-500" />;
                      }
                    };

                    const formattedTime = evt.createdAt
                      ? new Date(evt.createdAt).toLocaleTimeString('ar-IQ', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true,
                        })
                      : '';

                    return (
                      <div key={evt.id} className="relative group">
                        {/* Timeline Node Dot */}
                        <div className="absolute -right-[27px] top-1 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-amber-500 flex items-center justify-center shadow-xs" />

                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs hover:shadow-xs transition-shadow space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {getIcon()}
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                {evt.title}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              <span>{evt.date}</span>
                              {formattedTime && (
                                <span className="text-slate-400 dark:text-slate-500">
                                  ({formattedTime})
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Visual Diff: Old Value -> New Value */}
                          {(evt.oldValue || evt.newValue) && (
                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-wrap items-center gap-2 text-xs">
                              {evt.oldValue && (
                                <div className="flex-1 min-w-[140px] p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50">
                                  <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-semibold">
                                    السابق:
                                  </span>
                                  <span className="text-slate-800 dark:text-slate-200 text-xs font-medium">
                                    {evt.oldValue}
                                  </span>
                                </div>
                              )}
                              {evt.newValue && (
                                <div className="flex-1 min-w-[140px] p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50">
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold">
                                    المعتمد الجديد:
                                  </span>
                                  <span className="text-slate-900 dark:text-white text-xs font-bold">
                                    {evt.newValue}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {evt.description}
                          </p>

                          {(evt.orderNumber || evt.performedBy) && (
                            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                              {evt.performedBy && (
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3 text-amber-500" />
                                  <span>المسؤول عن التعديل:</span>
                                  <strong className="text-slate-800 dark:text-slate-200">
                                    {evt.performedBy}
                                  </strong>
                                </div>
                              )}
                              {evt.orderNumber && (
                                <span className="font-mono">
                                  الأمر: {evt.orderNumber} {evt.orderDate ? `(${evt.orderDate})` : ''}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ATTENDANCE & LEAVES */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    <span>سجل الحركات والإجازات والدوام لعام 2026</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    رصيد سنوي: {totalBalance} يوم | المستهلك: {usedDays} يوم | المتبقي: {remainingDays} يوم
                  </p>
                </div>
                {onOpenMovementModal && (
                  <button
                    type="button"
                    onClick={() => onOpenMovementModal(employee.id, 'attendance')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>تسجيل حركة جديدة</span>
                  </button>
                )}
              </div>

              {attendanceLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Calendar className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-xs font-semibold">لا توجد حركات حضور مسجلة لهذا الموظف خلال عام 2026.</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <th className="p-3">التاريخ</th>
                        <th className="p-3">نوع الحركة</th>
                        <th className="p-3">الحالة والتوقيت</th>
                        <th className="p-3">الأمر / الاستمارة</th>
                        <th className="p-3">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {attendanceLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                          <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {log.date}
                          </td>
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                            {log.movementTitle || log.movementType || log.status}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {log.durationDays ? `${log.durationDays} يوم` : log.timePermissionMinutes ? `${log.timePermissionMinutes} دقيقة` : log.status}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-500">
                            {log.orderNumber || '—'}
                          </td>
                          <td className="p-3 text-[11px] text-slate-500 truncate max-w-xs">
                            {log.notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ALLOWANCES & PROMOTIONS */}
          {activeTab === 'allowances_promotions' && (
            <div className="space-y-6">
              {/* Allowance Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span>سجل العلاوات السنوية الممنوحة</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      الاستحقاق القادم: <span className="font-mono font-bold text-amber-600">{employee.nextAllowanceDueDate || '2026-12-31'}</span>
                    </p>
                  </div>
                  {onGrantAllowance && employee.status !== 'retired' && (
                    <button
                      type="button"
                      onClick={() => onGrantAllowance(employee)}
                      className="px-3 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-300 dark:border-amber-800 cursor-pointer"
                    >
                      + منح علاوة
                    </button>
                  )}
                </div>

                {allowanceList.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">لا توجد علاوات ممنوحة مسجلة بعد في النظام لهذا الموظف.</p>
                ) : (
                  <div className="space-y-2">
                    {allowanceList.map((alw) => (
                      <div key={alw.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            انتقال من المرحلة {alw.previousStage} إلى المرحلة {alw.newStage} (الدرجة {alw.grade})
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            الأمر الإداري: {alw.orderNumber} بتاريخ {alw.orderDate} — النفاذ: {alw.effectiveDate}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300">
                          ممنوحة
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Promotions Section */}
              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-indigo-500" />
                      <span>سجل الترفيعات الوظيفية</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      سنوات الخدمة في الدرجة الحالية: {employee.yearsInCurrentGrade || 0} سنوات
                    </p>
                  </div>
                  {onPromoteEmployee && employee.status !== 'retired' && (
                    <button
                      type="button"
                      onClick={() => onPromoteEmployee(employee)}
                      className="px-3 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-300 dark:border-indigo-800 cursor-pointer"
                    >
                      + ترفيع وظيفي
                    </button>
                  )}
                </div>

                {promotionList.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">لا توجد ترفيعات سابقة مسجلة لهذا الموظف.</p>
                ) : (
                  <div className="space-y-2">
                    {promotionList.map((prm) => (
                      <div key={prm.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            ترفيع من الدرجة {prm.previousGrade} ({prm.previousTitle}) إلى الدرجة {prm.newGrade} ({prm.newTitle})
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            الأمر الإداري: {prm.orderNumber} بتاريخ {prm.orderDate} — النفاذ: {prm.effectiveDate}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300">
                          ترفيع رسمي
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: BARCODE & BADGE */}
          {activeTab === 'barcode_badge' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-amber-500" />
                    <span>رمز الباركود والـ QR الموحد للموظف</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md">
                    يُستخدم هذا الكود للتعريف الموحد بالموظف، تسجيل الحضور الفوري عبر القارئ، وتأكيد الهوية عند صرف المستحقات واستلام الكتب الرسمية.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsBadgeModalOpen(true)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-md shadow-amber-600/20 cursor-pointer flex items-center gap-1.5"
                    >
                      <Printer className="w-4 h-4" />
                      <span>معاينة وطباعة بطاقة الهوية (Badge)</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <QrVisual value={employee.barcodeValue || employee.employeeNumber} size={90} />
                  <BarcodeVisual value={employee.barcodeValue || employee.employeeNumber} width={180} height={45} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: RETIREMENT */}
          {activeTab === 'retirement' && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-purple-600" />
                    <span>حالة التقاعد والخدمة الوظيفية</span>
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    employee.status === 'retired'
                      ? 'bg-purple-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}>
                    {employee.status === 'retired' ? 'متقاعد رسمياً' : 'مستمر بالخدمة'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div>
                    <span className="text-slate-500">السن التقاعدي القانوني:</span>
                    <div className="font-bold text-slate-800 dark:text-slate-200 font-mono mt-0.5">60 سنة</div>
                  </div>
                  <div>
                    <span className="text-slate-500">تاريخ الميلاد المعتمد:</span>
                    <div className="font-bold text-slate-800 dark:text-slate-200 font-mono mt-0.5">
                      {employee.birthDate || 'غير محدد'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">سنوات الخدمة الفعلية:</span>
                    <div className="font-bold text-slate-800 dark:text-slate-200 font-mono mt-0.5">
                      {serviceYears} سنة
                    </div>
                  </div>
                </div>

                {employee.status === 'retired' ? (
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 text-xs space-y-1">
                    <div className="font-bold text-purple-900 dark:text-purple-300">
                      بيانات الإحالة على التقاعد الرسمية:
                    </div>
                    <div>تاريخ الإحالة: <span className="font-mono">{employee.retirementDate || '—'}</span></div>
                    <div>رقم الأمر الإداري: <span className="font-mono">{employee.retirementOrderNumber || '—'}</span></div>
                    <div>ملاحظات: {employee.retirementNotes || 'لا توجد'}</div>
                  </div>
                ) : (
                  <div className="pt-2 flex justify-end">
                    {onRetireEmployee && (
                      <button
                        type="button"
                        onClick={() => onRetireEmployee(employee)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-600/20 transition-all cursor-pointer"
                      >
                        إحالة الموظف على التقاعد رسمياً
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 font-mono">
            المعرف الموحد: {employee.id} — محدث في {new Date(employee.updatedAt).toLocaleDateString('ar-IQ')}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            إغلاق الملف
          </button>
        </div>
      </div>

      {/* Embedded Badge Printable Modal */}
      {isBadgeModalOpen && (
        <EmployeeBadgeModal
          isOpen={isBadgeModalOpen}
          onClose={() => setIsBadgeModalOpen(false)}
          employee={employee}
          organization={organization}
        />
      )}

      {/* Salary & Allowances Edit Modal */}
      {isSalaryModalOpen && (
        <SalaryAllowancesModal
          isOpen={isSalaryModalOpen}
          onClose={() => setIsSalaryModalOpen(false)}
          employee={employee}
          onSaved={async () => {
            const updated = await employeeService.getById(employee.id);
            if (updated) setEmployee(updated);
          }}
        />
      )}
    </div>
  );
};
