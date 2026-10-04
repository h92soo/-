import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  TrendingUp,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Printer,
  Calendar,
  User,
  PlusCircle,
  ExternalLink,
  ChevronLeft,
  X,
  History,
  Building2,
  DollarSign,
  Sliders,
  Calculator,
} from 'lucide-react';
import {
  Employee,
  AllowanceRecord,
  PromotionRecord,
  OrganizationSettings,
  CareerSystemSettings,
  UnifiedAdministrativeOrder,
} from '../types';
import { employeeService } from '../services/employeeService';
import { toast } from './ToastNotification';
import { BatchAllowanceModal } from './BatchAllowanceModal';
import { BatchPromotionModal } from './BatchPromotionModal';
import { SalariesPayrollView } from './SalariesPayrollView';
import { PaginationControl } from './PaginationControl';

interface AllowancesPromotionsHubProps {
  organization: OrganizationSettings;
  onOpenEmployeeProfile?: (employeeId: string) => void;
  onBackToDashboard?: () => void;
}

export const AllowancesPromotionsHub: React.FC<AllowancesPromotionsHubProps> = ({
  organization,
  onOpenEmployeeProfile,
  onBackToDashboard,
}) => {
  const [activeTab, setActiveTab] = useState<
    'due_allowances' | 'all_allowances' | 'due_promotions' | 'promotions_history' | 'salaries_payroll'
  >('due_allowances');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allowanceRecords, setAllowanceRecords] = useState<AllowanceRecord[]>([]);
  const [promotionRecords, setPromotionRecords] = useState<PromotionRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Batch Modals State
  const [isBatchAllowanceOpen, setIsBatchAllowanceOpen] = useState(false);
  const [isBatchPromotionOpen, setIsBatchPromotionOpen] = useState(false);
  const [unifiedOrderPreview, setUnifiedOrderPreview] = useState<UnifiedAdministrativeOrder | null>(null);

  // Grant Allowance Modal State
  const [grantModalEmployee, setGrantModalEmployee] = useState<Employee | null>(null);
  const [allowanceOrderNum, setAllowanceOrderNum] = useState('');
  const [allowanceOrderDate, setAllowanceOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [allowanceEffectiveDate, setAllowanceEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [allowanceNotes, setAllowanceNotes] = useState('');

  // Suspend Allowance Modal State
  const [suspendModalEmployee, setSuspendModalEmployee] = useState<Employee | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendReviewDate, setSuspendReviewDate] = useState('2026-06-30');

  // Promote Employee Modal State
  const [promoteModalEmployee, setPromoteModalEmployee] = useState<Employee | null>(null);
  const [promoteNewGrade, setPromoteNewGrade] = useState<number>(6);
  const [promoteNewTitle, setPromoteNewTitle] = useState('');
  const [promoteOrderNum, setPromoteOrderNum] = useState('');
  const [promoteOrderDate, setPromoteOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [promoteEffectiveDate, setPromoteEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [promoteNotes, setPromoteNotes] = useState('');

  // Printable Administrative Order Preview Modal
  const [previewOrder, setPreviewOrder] = useState<{
    type: 'allowance' | 'promotion';
    title: string;
    employeeName: string;
    employeeNumber: string;
    department: string;
    orderNumber: string;
    orderDate: string;
    details: string;
  } | null>(null);

  // Load data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allEmps, allowances, promotions] = await Promise.all([
        employeeService.getAll(),
        employeeService.getAllAllowances(),
        employeeService.getAllPromotions(),
      ]);
      setEmployees(allEmps);
      setAllowanceRecords(allowances);
      setPromotionRecords(promotions);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = employeeService.subscribe(() => {
      loadData();
    });
    return unsub;
  }, []);

  // Pagination states for each sub-tab (supports 20, 30, 50, 100, 0)
  const [dueAllowancesPage, setDueAllowancesPage] = useState<number>(1);
  const [dueAllowancesPageSize, setDueAllowancesPageSize] = useState<number>(20);

  const [duePromotionsPage, setDuePromotionsPage] = useState<number>(1);
  const [duePromotionsPageSize, setDuePromotionsPageSize] = useState<number>(20);

  const [allowanceRecordsPage, setAllowanceRecordsPage] = useState<number>(1);
  const [allowanceRecordsPageSize, setAllowanceRecordsPageSize] = useState<number>(20);

  const [promotionRecordsPage, setPromotionRecordsPage] = useState<number>(1);
  const [promotionRecordsPageSize, setPromotionRecordsPageSize] = useState<number>(20);

  // Filter Due Allowances (This month or next month or already past due)
  const dueAllowances = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    return employees.filter((e) => {
      if (e.status === 'retired') return false;
      if (e.isAllowanceSuspended) return false;
      if (!e.nextAllowanceDueDate) return true;
      const due = new Date(e.nextAllowanceDueDate);
      const diffMonths = (due.getFullYear() - currentYear) * 12 + (due.getMonth() + 1 - currentMonth);
      return diffMonths <= 1;
    });
  }, [employees]);

  // Paginated due allowances
  const paginatedDueAllowances = useMemo(() => {
    if (dueAllowancesPageSize === 0) return dueAllowances;
    const start = (dueAllowancesPage - 1) * dueAllowancesPageSize;
    return dueAllowances.slice(start, start + dueAllowancesPageSize);
  }, [dueAllowances, dueAllowancesPage, dueAllowancesPageSize]);

  // Filter Due Promotions (Employees who spent 4 or 5+ years in current grade)
  const duePromotions = useMemo(() => {
    return employees.filter((e) => {
      if (e.status === 'retired') return false;
      const grade = e.civilGrade || 7;
      const yearsInGrade = e.yearsInCurrentGrade ?? 4;
      const minRequiredYears = grade <= 2 ? 5 : 4;
      return yearsInGrade >= minRequiredYears && grade > 1;
    });
  }, [employees]);

  // Paginated due promotions
  const paginatedDuePromotions = useMemo(() => {
    if (duePromotionsPageSize === 0) return duePromotions;
    const start = (duePromotionsPage - 1) * duePromotionsPageSize;
    return duePromotions.slice(start, start + duePromotionsPageSize);
  }, [duePromotions, duePromotionsPage, duePromotionsPageSize]);

  // Paginated allowance history records
  const paginatedAllowanceRecords = useMemo(() => {
    if (allowanceRecordsPageSize === 0) return allowanceRecords;
    const start = (allowanceRecordsPage - 1) * allowanceRecordsPageSize;
    return allowanceRecords.slice(start, start + allowanceRecordsPageSize);
  }, [allowanceRecords, allowanceRecordsPage, allowanceRecordsPageSize]);

  // Paginated promotion history records
  const paginatedPromotionRecords = useMemo(() => {
    if (promotionRecordsPageSize === 0) return promotionRecords;
    const start = (promotionRecordsPage - 1) * promotionRecordsPageSize;
    return promotionRecords.slice(start, start + promotionRecordsPageSize);
  }, [promotionRecords, promotionRecordsPage, promotionRecordsPageSize]);

  // Handle execute grant allowance
  const handleExecuteGrantAllowance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantModalEmployee) return;

    try {
      const { employee, record } = await employeeService.grantAllowance(grantModalEmployee.id, {
        orderNumber: allowanceOrderNum || `أ.إ-${Math.floor(1000 + Math.random() * 9000)}`,
        orderDate: allowanceOrderDate,
        effectiveDate: allowanceEffectiveDate,
        notes: allowanceNotes,
        grantedBy: 'مدير الموارد البشرية',
      });

      toast.success(`تم منح العلاوة السنوية بنجاح للموظف (${employee.fullName}) وانتقاله للمرحلة (${employee.civilStage}).`);
      
      // Prompt order preview
      setPreviewOrder({
        type: 'allowance',
        title: 'أمر إداري: منح علاوة سنوية',
        employeeName: employee.fullName,
        employeeNumber: employee.employeeNumber,
        department: employee.department,
        orderNumber: record.orderNumber,
        orderDate: record.orderDate,
        details: `استناداً إلى أحكام قانون الخدمة المدنية النافذ وقرارات مجلس الوزراء المعتمدة، وبناءً على ثبوت استحقاق الموظف المذكور أنفاً وتوفر الشروط القانونية لحصوله على العلاوة السنوية، تقرر منح الموظف (${employee.fullName}) علاوته السنوية وانتقاله من المرحلة (${record.previousStage}) إلى المرحلة (${record.newStage}) من الدرجة (${record.grade}) الوظيفية اعتباراً من تاريخ ${record.effectiveDate}.`,
      });

      setGrantModalEmployee(null);
      setAllowanceNotes('');
      await loadData();
    } catch (err) {
      toast.error('فشل منح العلاوة');
    }
  };

  // Handle execute suspend allowance
  const handleExecuteSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendModalEmployee) return;

    try {
      await employeeService.suspendAllowance(
        suspendModalEmployee.id,
        suspendReason || 'تأجيل إداري بسبب وجود عقوبة لفت نظر أو إنذار',
        suspendReviewDate,
        'مدير النظام'
      );
      toast.info(`تم تأجيل استحقاق العلاوة للموظف (${suspendModalEmployee.fullName}) بنجاح.`);
      setSuspendModalEmployee(null);
      setSuspendReason('');
      await loadData();
    } catch (err) {
      toast.error('فشل تأجيل العلاوة');
    }
  };

  // Handle execute promotion
  const handleExecutePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoteModalEmployee) return;

    try {
      const { employee, record } = await employeeService.promoteEmployee(promoteModalEmployee.id, {
        newGrade: Number(promoteNewGrade),
        newTitle: promoteNewTitle || promoteModalEmployee.jobTitle,
        orderNumber: promoteOrderNum || `تر-2026-${Math.floor(100 + Math.random() * 900)}`,
        orderDate: promoteOrderDate,
        effectiveDate: promoteEffectiveDate,
        notes: promoteNotes,
        promotedBy: 'المدير العام',
      });

      toast.success(`تم إصدار أمر الترفيع للموظف (${employee.fullName}) إلى الدرجة (${employee.civilGrade}) بنجاح.`);

      setPreviewOrder({
        type: 'promotion',
        title: 'أمر إداري: ترفيع وظيفي',
        employeeName: employee.fullName,
        employeeNumber: employee.employeeNumber,
        department: employee.department,
        orderNumber: record.orderNumber,
        orderDate: record.orderDate,
        details: `استناداً إلى أحكام قانون رواتب موظفي الدولة والقطاع العام وضوابط الترفيع المعتمدة، وبناءً على إكمال المدة القانونية المقررة في الدرجة الوظيفية وحصوله على تقييم أداء بدرجة (جيد جداً)، تقرر ترفيع الموظف (${employee.fullName}) من الدرجة (${record.previousGrade}) بعنوان (${record.previousTitle}) إلى الدرجة (${record.newGrade}) بعنوان (${record.newTitle}) اعتباراً من تاريخ ${record.effectiveDate}.`,
      });

      setPromoteModalEmployee(null);
      setPromoteNotes('');
      await loadData();
    } catch (err) {
      toast.error('فشل ترفيع الموظف');
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* 1. Official Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-amber-950/60 to-slate-900 text-white border border-slate-800 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white tracking-tight">
                وحدة العلاوات السنوية والترفيعات الوظيفية
              </h1>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                2026 OFFICIAL
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              جدول الاستحقاق السنوي، أوامر المنح والترفيع المؤتمتة، السجل الزمني، وإدارة الحجز والتأجيل
            </p>
          </div>
        </div>

        {onBackToDashboard && (
          <button
            type="button"
            onClick={onBackToDashboard}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 self-start md:self-auto"
          >
            <span>لوحة التحكم الرئيسية</span>
          </button>
        )}
      </div>

      {/* 2. Metric Counters Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-1 flex items-center justify-between">
            <span>المستحقون للعلاوة (هذا الشهر)</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {dueAllowances.length}
          </div>
          <span className="text-[10px] text-slate-400">تنبيه آلي مبرمج</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mb-1 flex items-center justify-between">
            <span>المستحقون للترفيع الوظيفي</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {duePromotions.length}
          </div>
          <span className="text-[10px] text-slate-400">أكملوا مدة الدرجة القانونية</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center justify-between">
            <span>إجمالي العلاوات الممنوحة</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {allowanceRecords.length}
          </div>
          <span className="text-[10px] text-slate-400">أمر إداري مؤرشف</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mb-1 flex items-center justify-between">
            <span>إجمالي الترفيعات الصادرة</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {promotionRecords.length}
          </div>
          <span className="text-[10px] text-slate-400">أمر وزاري صادر</span>
        </div>
      </div>

      {/* 3. Main Workspace Navigation Tabs */}
      <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('due_allowances')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'due_allowances'
              ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4 text-amber-500" />
          <span>المستحقون للعلاوة السنوية ({dueAllowances.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('due_promotions')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'due_promotions'
              ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-indigo-500" />
          <span>المستحقون للترفيع الوظيفي ({duePromotions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all_allowances')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'all_allowances'
              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4 text-emerald-500" />
          <span>سجل وأوامر العلاوات الممنوحة ({allowanceRecords.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('promotions_history')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'promotions_history'
              ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-blue-500" />
          <span>سجل وأوامر الترفيعات ({promotionRecords.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('salaries_payroll')}
          className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'salaries_payroll'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25'
              : 'text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>سجل وسلم الرواتب والمخصصات والضرائب</span>
        </button>
      </div>

      {/* 4. Tab Views Content */}
      <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
        {/* Search Filter Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم، الرقم الوظيفي، أو القسم..."
              className="w-full px-3.5 py-2 pr-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="text-xs text-slate-500 font-semibold">
            النظام الحكومي الموحد — تشغيل 2026
          </div>
        </div>

        {/* VIEW 1: DUE ALLOWANCES */}
        {activeTab === 'due_allowances' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  قائمة الموظفين المستحقين للعلاوة السنوية ({dueAllowances.length})
                </h3>
                <p className="text-xs text-slate-500">
                  يتم احتساب الاستحقاق تلقائياً بناءً على تاريخ آخر علاوة مضافاً إليه سنة كاملة (12 شهراً)
                </p>
              </div>

              {dueAllowances.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsBatchAllowanceOpen(true)}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <Award className="w-4 h-4" />
                  <span>منح العلاوات السنوية جماعياً للمستحقين ({dueAllowances.length})</span>
                </button>
              )}
            </div>

            {dueAllowances.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-semibold">تم منح جميع العلاوات المستحقة؛ لا توجد علاوات متأخرة حالياً.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                        <th className="p-3">الرقم الوظيفي</th>
                        <th className="p-3">اسم الموظف</th>
                        <th className="p-3">القسم والوظيفة</th>
                        <th className="p-3">الدرجة والمرحلة الحالية</th>
                        <th className="p-3">تاريخ آخر علاوة</th>
                        <th className="p-3">تاريخ الاستحقاق</th>
                        <th className="p-3 text-center">الإجراءات والقرار</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {paginatedDueAllowances.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/50">
                          <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                            {emp.employeeNumber}
                          </td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">
                            <button
                              type="button"
                              onClick={() => onOpenEmployeeProfile && onOpenEmployeeProfile(emp.id)}
                              className="hover:underline hover:text-amber-600 cursor-pointer text-right"
                            >
                              {emp.fullName}
                            </button>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">
                            <div>{emp.department}</div>
                            <div className="text-[10px] text-slate-400">{emp.jobTitle}</div>
                          </td>
                          <td className="p-3 font-mono">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200">
                              درجة {emp.civilGrade || 7} / مرحلة {emp.civilStage || 1}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-500">
                            {emp.lastAllowanceDate || emp.hireDate}
                          </td>
                          <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                            {emp.nextAllowanceDueDate || '2026-12-31'}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Grant Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setGrantModalEmployee(emp);
                                  setAllowanceOrderNum(`أ.إ-${Math.floor(1000 + Math.random() * 9000)}`);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Award className="w-3.5 h-3.5" />
                                <span>منح العلاوة</span>
                              </button>

                              {/* Suspend / Defer Button */}
                              <button
                                type="button"
                                onClick={() => setSuspendModalEmployee(emp)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 dark:bg-slate-700 dark:hover:bg-rose-950 text-xs font-bold transition-colors cursor-pointer"
                                title="حجز أو تأجيل العلاوة لعقوبة"
                              >
                                تأجيل / حجز
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {dueAllowances.length > 0 && (
                  <PaginationControl
                    currentPage={dueAllowancesPage}
                    totalItems={dueAllowances.length}
                    pageSize={dueAllowancesPageSize}
                    onPageChange={setDueAllowancesPage}
                    onPageSizeChange={setDueAllowancesPageSize}
                    pageSizeOptions={[20, 30, 50, 100, 0]}
                    itemLabel="مستحقاً للعلاوة"
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* VIEW 2: DUE PROMOTIONS */}
        {activeTab === 'due_promotions' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  الموظفون المستحقون للترفيع الوظيفي ({duePromotions.length})
                </h3>
                <p className="text-xs text-slate-500">
                  شرط الاستحقاق: إكمال 4 إلى 5 سنوات خدمة فعلية في الدرجة الحالية + توفر المؤهل العلمي
                </p>
              </div>

              {duePromotions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsBatchPromotionOpen(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>إصدار ترفيعات جماعية للمستحقين ({duePromotions.length})</span>
                </button>
              )}
            </div>

            {duePromotions.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 text-indigo-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-semibold">لا يوجد موظفون مستحقون للترفيع في الوقت الحالي.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                        <th className="p-3">الرقم الوظيفي</th>
                        <th className="p-3">اسم الموظف</th>
                        <th className="p-3">الدرجة الحالية</th>
                        <th className="p-3">العنوان الحالي</th>
                        <th className="p-3">سنوات الخدمة في الدرجة</th>
                        <th className="p-3">التحصيل الدراسي</th>
                        <th className="p-3 text-center">إصدار الترفيع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {paginatedDuePromotions.map((emp) => {
                        const nextGrade = Math.max(1, (emp.civilGrade || 7) - 1);
                        return (
                          <tr key={emp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/50">
                            <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                              {emp.employeeNumber}
                            </td>
                            <td className="p-3 font-bold text-slate-900 dark:text-white">
                              <button
                                type="button"
                                onClick={() => onOpenEmployeeProfile && onOpenEmployeeProfile(emp.id)}
                                className="hover:underline hover:text-indigo-600 cursor-pointer text-right"
                              >
                                {emp.fullName}
                              </button>
                            </td>
                            <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              الدرجة {emp.civilGrade || 7}
                            </td>
                            <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                              {emp.jobTitle}
                            </td>
                            <td className="p-3 font-mono font-bold">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                                {emp.yearsInCurrentGrade ?? 4} سنوات
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-300">
                              {emp.educationDegree || 'بكالوريوس'}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setPromoteModalEmployee(emp);
                                  setPromoteNewGrade(nextGrade);
                                  setPromoteNewTitle(`رئيس ${emp.jobTitle} / أقدم`);
                                  setPromoteOrderNum(`تر-2026-${Math.floor(100 + Math.random() * 900)}`);
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1 mx-auto cursor-pointer"
                              >
                                <TrendingUp className="w-3.5 h-3.5" />
                                <span>إصدار ترفيع للدرجة {nextGrade}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {duePromotions.length > 0 && (
                  <PaginationControl
                    currentPage={duePromotionsPage}
                    totalItems={duePromotions.length}
                    pageSize={duePromotionsPageSize}
                    onPageChange={setDuePromotionsPage}
                    onPageSizeChange={setDuePromotionsPageSize}
                    pageSizeOptions={[20, 30, 50, 100, 0]}
                    itemLabel="مستحقاً للترفيع"
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* VIEW 3: ALL ALLOWANCES HISTORY */}
        {activeTab === 'all_allowances' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              سجل العلاوات السنوية الممنوحة والمؤرشفة في النظام
            </h3>

            {allowanceRecords.length === 0 ? (
              <div className="py-10 text-center text-slate-400">لا توجد علاوات مؤرشفة بعد.</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                        <th className="p-3">رقم الأمر الإداري</th>
                        <th className="p-3">تاريخ الأمر</th>
                        <th className="p-3">اسم الموظف</th>
                        <th className="p-3">القسم</th>
                        <th className="p-3">تفاصيل العلاوة</th>
                        <th className="p-3">تاريخ النفاذ</th>
                        <th className="p-3">المسؤول المانح</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {paginatedAllowanceRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/50">
                          <td className="p-3 font-mono font-bold text-amber-600">{r.orderNumber}</td>
                          <td className="p-3 font-mono text-slate-500">{r.orderDate}</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{r.employeeName}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">{r.department}</td>
                          <td className="p-3 font-mono">
                            انتقال من م.{r.previousStage} إلى م.{r.newStage} (د.{r.grade})
                          </td>
                          <td className="p-3 font-mono text-slate-600 dark:text-slate-300">{r.effectiveDate}</td>
                          <td className="p-3 text-slate-500">{r.grantedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {allowanceRecords.length > 0 && (
                  <PaginationControl
                    currentPage={allowanceRecordsPage}
                    totalItems={allowanceRecords.length}
                    pageSize={allowanceRecordsPageSize}
                    onPageChange={setAllowanceRecordsPage}
                    onPageSizeChange={setAllowanceRecordsPageSize}
                    pageSizeOptions={[20, 30, 50, 100, 0]}
                    itemLabel="سجلاً"
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* VIEW 4: PROMOTIONS HISTORY */}
        {activeTab === 'promotions_history' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              سجل الترفيعات الوظيفية الصادرة
            </h3>

            {promotionRecords.length === 0 ? (
              <div className="py-10 text-center text-slate-400">لا توجد أوامر ترفيع سابقة مسجلة.</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                        <th className="p-3">رقم الأمر الإداري</th>
                        <th className="p-3">تاريخ الأمر</th>
                        <th className="p-3">اسم الموظف</th>
                        <th className="p-3">الترقية الصادرة</th>
                        <th className="p-3">العنوان الجديد</th>
                        <th className="p-3">تاريخ النفاذ</th>
                        <th className="p-3">المصادقة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {paginatedPromotionRecords.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/50">
                          <td className="p-3 font-mono font-bold text-indigo-600">{p.orderNumber}</td>
                          <td className="p-3 font-mono text-slate-500">{p.orderDate}</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{p.employeeName}</td>
                          <td className="p-3 font-mono font-bold">
                            من درجة {p.previousGrade} إلى درجة {p.newGrade}
                          </td>
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{p.newTitle}</td>
                          <td className="p-3 font-mono text-slate-600 dark:text-slate-300">{p.effectiveDate}</td>
                          <td className="p-3 text-slate-500">{p.promotedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {promotionRecords.length > 0 && (
                  <PaginationControl
                    currentPage={promotionRecordsPage}
                    totalItems={promotionRecords.length}
                    pageSize={promotionRecordsPageSize}
                    onPageChange={setPromotionRecordsPage}
                    onPageSizeChange={setPromotionRecordsPageSize}
                    pageSizeOptions={[20, 30, 50, 100, 0]}
                    itemLabel="سجلاً"
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* VIEW 5: MASTER SALARIES & PAYROLL */}
        {activeTab === 'salaries_payroll' && (
          <SalariesPayrollView
            employees={employees}
            organization={organization}
            onOpenEmployeeProfile={onOpenEmployeeProfile}
            onRefreshData={loadData}
          />
        )}
      </div>

      {/* MODAL 1: GRANT ALLOWANCE FORM */}
      {grantModalEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>منح العلاوة السنوية وإصدار الأمر الإداري</span>
              </h3>
              <button
                type="button"
                onClick={() => setGrantModalEmployee(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs">
              <div className="font-bold text-amber-900 dark:text-amber-200">{grantModalEmployee.fullName}</div>
              <div className="text-amber-700 dark:text-amber-400 mt-0.5">
                الانتقال من المرحلة ({grantModalEmployee.civilStage || 1}) إلى المرحلة ({(grantModalEmployee.civilStage || 1) + 1}) — الدرجة ({grantModalEmployee.civilGrade || 7})
              </div>
            </div>

            <form onSubmit={handleExecuteGrantAllowance} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الأمر الإداري:
                </label>
                <input
                  type="text"
                  required
                  value={allowanceOrderNum}
                  onChange={(e) => setAllowanceOrderNum(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ صدور الأمر:
                  </label>
                  <input
                    type="date"
                    required
                    value={allowanceOrderDate}
                    onChange={(e) => setAllowanceOrderDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ النفاذ المالي:
                  </label>
                  <input
                    type="date"
                    required
                    value={allowanceEffectiveDate}
                    onChange={(e) => setAllowanceEffectiveDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ملاحظات أو مبررات القرار:
                </label>
                <textarea
                  rows={2}
                  value={allowanceNotes}
                  onChange={(e) => setAllowanceNotes(e.target.value)}
                  placeholder="استناداً لتقييم الأداء السنوي وإكمال المدة القانونية..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGrantModalEmployee(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md shadow-amber-600/20"
                >
                  تأكيد ومنح العلاوة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SUSPEND ALLOWANCE */}
      {suspendModalEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>حجز أو تأجيل العلاوة السنوية</span>
              </h3>
              <button
                type="button"
                onClick={() => setSuspendModalEmployee(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteSuspend} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  سبب الحجز أو التأجيل (مثلاً: عقوبة إنذار أو لفت نظر):
                </label>
                <textarea
                  rows={2}
                  required
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="اكتب السند القانوني أو سبب تأجيل العلاوة..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تاريخ إعادة النظر المقترح:
                </label>
                <input
                  type="date"
                  required
                  value={suspendReviewDate}
                  onChange={(e) => setSuspendReviewDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSuspendModalEmployee(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  تأكيد حجز العلاوة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PROMOTE EMPLOYEE */}
      {promoteModalEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                <span>إصدار أمر ترفيع وظيفي</span>
              </h3>
              <button
                type="button"
                onClick={() => setPromoteModalEmployee(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-xs">
              <div className="font-bold text-indigo-900 dark:text-indigo-200">{promoteModalEmployee.fullName}</div>
              <div className="text-indigo-700 dark:text-indigo-400 mt-0.5">
                الدرجة الحالية: {promoteModalEmployee.civilGrade || 7} — العنوان الحالي: {promoteModalEmployee.jobTitle}
              </div>
            </div>

            <form onSubmit={handleExecutePromotion} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الدرجة الجديدة:
                  </label>
                  <select
                    value={promoteNewGrade}
                    onChange={(e) => setPromoteNewGrade(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((g) => (
                      <option key={g} value={g}>
                        الدرجة {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    العنوان الوظيفي الجديد:
                  </label>
                  <input
                    type="text"
                    required
                    value={promoteNewTitle}
                    onChange={(e) => setPromoteNewTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الأمر الإداري / الوزاري:
                </label>
                <input
                  type="text"
                  required
                  value={promoteOrderNum}
                  onChange={(e) => setPromoteOrderNum(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ الأمر:
                  </label>
                  <input
                    type="date"
                    required
                    value={promoteOrderDate}
                    onChange={(e) => setPromoteOrderDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ النفاذ:
                  </label>
                  <input
                    type="date"
                    required
                    value={promoteEffectiveDate}
                    onChange={(e) => setPromoteEffectiveDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPromoteModalEmployee(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20"
                >
                  تأكيد وإصدار الترفيع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE ADMINISTRATIVE ORDER MODAL */}
      {previewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in no-print-bg">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 no-print">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                <span>معاينة الأمر الإداري الرسمي (جاهز للطباعة والتوثيق)</span>
              </h3>
              <button
                type="button"
                onClick={() => setPreviewOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Official Order Paper A4 Style */}
            <div className="p-8 rounded-2xl bg-white text-slate-900 border border-slate-300 shadow-inner space-y-6">
              {/* Header */}
              <div className="text-center border-b border-slate-300 pb-4 space-y-1">
                <div className="font-bold text-sm">{organization.ministryName || 'جمهورية العراق'}</div>
                <div className="text-xs font-semibold text-slate-600">{organization.directorateName || 'دائرة الموارد البشرية والخدمة المدنية'}</div>
                <div className="text-xs font-mono pt-2 flex justify-between px-4 text-slate-500">
                  <span>العدد: {previewOrder.orderNumber}</span>
                  <span>التاريخ: {previewOrder.orderDate}</span>
                </div>
              </div>

              {/* Order Title */}
              <div className="text-center font-black text-base text-slate-900 underline underline-offset-8">
                {previewOrder.title}
              </div>

              {/* Order Text */}
              <p className="text-xs leading-loose text-justify text-slate-800 font-medium">
                {previewOrder.details}
              </p>

              {/* Signature Block */}
              <div className="pt-8 flex justify-end text-center text-xs pl-8">
                <div>
                  <div className="font-bold">المدير العام / مسؤول الموارد البشرية</div>
                  <div className="font-semibold text-slate-600 mt-0.5">{organization.directorateName}</div>
                  <div className="mt-8 text-slate-400 font-mono">الختم والتوقيع الرسمي</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 no-print">
              <button
                type="button"
                onClick={() => setPreviewOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الأمر الإداري الرسمي</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* BATCH ALLOWANCE MODAL */}
      {isBatchAllowanceOpen && (
        <BatchAllowanceModal
          isOpen={isBatchAllowanceOpen}
          onClose={() => setIsBatchAllowanceOpen(false)}
          dueEmployees={dueAllowances}
          organizationName={organization.ministryName}
          onCompleted={(order) => {
            setUnifiedOrderPreview(order);
            loadData();
          }}
        />
      )}

      {/* BATCH PROMOTION MODAL */}
      {isBatchPromotionOpen && (
        <BatchPromotionModal
          isOpen={isBatchPromotionOpen}
          onClose={() => setIsBatchPromotionOpen(false)}
          dueEmployees={duePromotions}
          organizationName={organization.ministryName}
          onCompleted={(order) => {
            setUnifiedOrderPreview(order);
            loadData();
          }}
        />
      )}

      {/* UNIFIED BATCH ADMINISTRATIVE ORDER PREVIEW (A4 PRINTABLE) */}
      {unifiedOrderPreview && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in no-print-bg overflow-y-auto">
          <div className="w-full max-w-4xl my-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 no-print">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                <span>أمر إداري جماعي رسمي موحد (جاهز للطباعة والتعميم المالي)</span>
              </h3>
              <button
                type="button"
                onClick={() => setUnifiedOrderPreview(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Official Order Paper A4 Style */}
            <div className="p-8 rounded-2xl bg-white text-slate-900 border border-slate-300 shadow-sm space-y-5 text-right" dir="rtl">
              {/* Header */}
              <div className="text-center border-b-2 border-slate-800 pb-4 space-y-1">
                <div className="font-black text-base">{unifiedOrderPreview.ministryName || 'جمهورية العراق'}</div>
                <div className="text-xs font-bold text-slate-700">{unifiedOrderPreview.directorateName}</div>
                <div className="text-xs font-semibold text-slate-600">{unifiedOrderPreview.departmentName}</div>
                <div className="text-xs font-mono pt-2 flex justify-between px-2 text-slate-600 border-t border-slate-200 mt-2">
                  <span>العدد: <strong>{unifiedOrderPreview.orderNumber}</strong></span>
                  <span>التاريخ: <strong>{unifiedOrderPreview.orderDate}</strong></span>
                </div>
              </div>

              {/* Title */}
              <div className="text-center font-black text-lg text-slate-950 underline underline-offset-8 py-2">
                {unifiedOrderPreview.title}
              </div>

              {/* Preamble */}
              <p className="text-xs leading-relaxed text-justify text-slate-800 font-medium">
                {unifiedOrderPreview.preamble}
              </p>

              {/* Decision */}
              <p className="text-xs leading-relaxed text-justify text-slate-900 font-bold">
                {unifiedOrderPreview.decisionText}
              </p>

              {/* Candidate Table */}
              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-900 font-black border-b border-slate-800">
                    <tr>
                      <th className="p-2 w-8 text-center border-l border-slate-800">ت</th>
                      <th className="p-2 border-l border-slate-800">الاسم الرباعي واللقب</th>
                      <th className="p-2 border-l border-slate-800">الرقم الوظيفي</th>
                      <th className="p-2 border-l border-slate-800">القسم / التشكيل</th>
                      <th className="p-2 border-l border-slate-800">الوضع السابق</th>
                      <th className="p-2 border-l border-slate-800">الوضع الجديد</th>
                      <th className="p-2 font-mono">الراتب الاسمي الجديد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {unifiedOrderPreview.items.map((row) => (
                      <tr key={row.seq} className="hover:bg-slate-50">
                        <td className="p-2 text-center border-l border-slate-300 font-bold">{row.seq}</td>
                        <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{row.employeeName}</td>
                        <td className="p-2 border-l border-slate-300 font-mono text-[11px]">{row.employeeNumber}</td>
                        <td className="p-2 border-l border-slate-300">{row.department}</td>
                        <td className="p-2 border-l border-slate-300 text-slate-700">{row.col1}</td>
                        <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{row.col2} {row.col4 ? `(${row.col4})` : ''}</td>
                        <td className="p-2 font-mono font-bold text-slate-900">{row.col3 || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signature Block */}
              <div className="pt-8 flex justify-between items-end text-xs">
                <div className="space-y-1 text-[11px] text-slate-600">
                  <div className="font-bold underline">نسخة منه إلى:</div>
                  {unifiedOrderPreview.copiesTo.map((c, i) => (
                    <div key={i}>• {c}</div>
                  ))}
                </div>

                <div className="text-center pl-6">
                  <div className="font-black text-sm">{unifiedOrderPreview.signatoryName}</div>
                  <div className="font-bold text-slate-700 mt-0.5">{unifiedOrderPreview.signatoryTitle}</div>
                  <div className="mt-6 text-slate-400 font-mono text-[10px] border border-dashed border-slate-400 p-2 rounded">
                    [الختم والتوقيع الإداري الرسمي]
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 no-print">
              <button
                type="button"
                onClick={() => setUnifiedOrderPreview(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الأمر الإداري الجماعي الرسمي</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
