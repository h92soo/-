import React, { useState, useMemo } from 'react';
import {
  Users,
  Building2,
  Award,
  CheckCircle2,
  Clock,
  PieChart as PieChartIcon,
  BarChart3,
  Filter,
  Download,
  Printer,
  Home,
  UserCheck,
  AlertCircle,
  FileSpreadsheet,
  TrendingUp,
  Layers,
  ChevronDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Employee, OrganizationSettings, UserAccount } from '../types';
import { GovernmentEmblem } from './GovernmentEmblem';

interface InteractiveAnalyticsHubProps {
  employees: Employee[];
  organization: OrganizationSettings;
  currentUser: UserAccount;
  onBackToDashboard: () => void;
  onOpenEmployeeProfile?: (employeeId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981', // emerald-500
  on_leave: '#f59e0b', // amber-500
  suspended: '#ef4444', // red-500
  retired: '#8b5cf6', // purple-500
};

const GRADE_COLORS = [
  '#3b82f6', // 1: Blue
  '#06b6d4', // 2: Cyan
  '#10b981', // 3: Emerald
  '#84cc16', // 4: Lime
  '#eab308', // 5: Yellow
  '#f97316', // 6: Orange
  '#ef4444', // 7: Red
  '#ec4899', // 8: Pink
  '#8b5cf6', // 9: Purple
  '#6366f1', // 10: Indigo
];

export function InteractiveAnalyticsHub({
  employees,
  organization,
  currentUser,
  onBackToDashboard,
  onOpenEmployeeProfile,
}: InteractiveAnalyticsHubProps) {
  // Filters
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedContractType, setSelectedContractType] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [activeChartType, setActiveChartType] = useState<'all' | 'departments' | 'grades' | 'status'>('all');

  // List of all unique departments
  const departmentOptions = useMemo(() => {
    const deps = Array.from(new Set(employees.map((e) => e.department?.trim()).filter(Boolean)));
    return deps.sort();
  }, [employees]);

  // Filtered employees based on selections
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (selectedDepartment !== 'all' && emp.department !== selectedDepartment) {
        return false;
      }
      if (selectedContractType !== 'all' && emp.contractType !== selectedContractType) {
        return false;
      }
      if (selectedGender !== 'all' && emp.gender !== selectedGender) {
        return false;
      }
      return true;
    });
  }, [employees, selectedDepartment, selectedContractType, selectedGender]);

  // Key KPI metrics
  const totalCount = filteredEmployees.length;
  const activeCount = filteredEmployees.filter((e) => (e.status || 'active') === 'active').length;
  const onLeaveCount = filteredEmployees.filter((e) => e.status === 'on_leave').length;
  const suspendedCount = filteredEmployees.filter((e) => e.status === 'suspended').length;
  const retiredCount = filteredEmployees.filter((e) => e.status === 'retired').length;

  const activePercent = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;
  const onLeavePercent = totalCount > 0 ? Math.round((onLeaveCount / totalCount) * 100) : 0;

  // 1. Data for Distribution by Department (حسب القسم)
  const departmentData = useMemo(() => {
    const map: Record<string, { name: string; total: number; active: number; onLeave: number }> = {};

    filteredEmployees.forEach((emp) => {
      const dep = emp.department?.trim() || 'غير محدد';
      if (!map[dep]) {
        map[dep] = { name: dep, total: 0, active: 0, onLeave: 0 };
      }
      map[dep].total += 1;
      if ((emp.status || 'active') === 'active') {
        map[dep].active += 1;
      } else if (emp.status === 'on_leave') {
        map[dep].onLeave += 1;
      }
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredEmployees]);

  // 2. Data for Distribution by Job Grade (حسب الدرجة الوظيفية 1 إلى 10)
  const gradeData = useMemo(() => {
    const map: Record<string, { gradeName: string; gradeNum: number; count: number; permanent: number; contract: number }> = {};

    // Initialize Iraqi grades 1 to 10
    for (let i = 1; i <= 10; i++) {
      map[`grade_${i}`] = {
        gradeName: `الدرجة ${i}`,
        gradeNum: i,
        count: 0,
        permanent: 0,
        contract: 0,
      };
    }
    map['grade_other'] = {
      gradeName: 'غير محدد',
      gradeNum: 99,
      count: 0,
      permanent: 0,
      contract: 0,
    };

    filteredEmployees.forEach((emp) => {
      const g = emp.civilGrade;
      const key = g && g >= 1 && g <= 10 ? `grade_${g}` : 'grade_other';
      map[key].count += 1;
      if (emp.contractType === 'permanent') {
        map[key].permanent += 1;
      } else {
        map[key].contract += 1;
      }
    });

    // Return only grades that have employees or grades 1..10
    return Object.values(map).filter((item) => item.gradeNum <= 10 || item.count > 0);
  }, [filteredEmployees]);

  // 3. Data for Current Status Distribution (الحالة الحالية: مباشر / متمتع بإجازة)
  const statusPieData = useMemo(() => {
    return [
      { name: 'مباشر بالخدمة', value: activeCount, color: STATUS_COLORS.active, statusKey: 'active' },
      { name: 'متمتع بإجازة', value: onLeaveCount, color: STATUS_COLORS.on_leave, statusKey: 'on_leave' },
      ...(suspendedCount > 0
        ? [{ name: 'مكفوف اليد / موقوف', value: suspendedCount, color: STATUS_COLORS.suspended, statusKey: 'suspended' }]
        : []),
      ...(retiredCount > 0
        ? [{ name: 'متقاعد / منفك', value: retiredCount, color: STATUS_COLORS.retired, statusKey: 'retired' }]
        : []),
    ];
  }, [activeCount, onLeaveCount, suspendedCount, retiredCount]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 print:p-0">
      {/* Top Header & Navigation Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3.5">
          <GovernmentEmblem
            size="md"
            appearance={{}}
            organization={organization}
            className="w-12 h-12 shrink-0 drop-shadow-sm"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                Recharts Analytics Engine 📊
              </span>
              <span className="text-xs text-slate-400">لوحة التحكم المركزية</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              الرسوم البيانية التفاعلية للموظفين
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              إحصائيات تفاعلية دقيقة لتوزيع الكوادر حسب القسم والدرجة الوظيفية وحالة المباشرة والإجازة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer shadow-2xs"
            title="طباعة التقرير الإحصائي"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>طباعة الإحصائيات</span>
          </button>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
            title="الرجوع إلى لوحة التحكم الرئيسية"
          >
            <Home className="w-4 h-4" />
            <span>الرجوع للشاشة الرئيسية</span>
          </button>
        </div>
      </div>

      {/* Interactive Filters Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 no-print">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Filter className="w-4 h-4 text-amber-500" />
            <span>تصفية وتخصيص التحليلات التفاعلية:</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span>عدد النتائج المطابقة:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 font-mono text-xs">
              {totalCount} موظف
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Department Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              القسم أو التشكيل الإداري:
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full text-xs p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="all">🏢 كافة الأقسام ({employees.length} موظف)</option>
              {departmentOptions.map((dep) => {
                const depCount = employees.filter((e) => e.department === dep).length;
                return (
                  <option key={dep} value={dep}>
                    {dep} ({depCount} موظف)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Contract Type Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              نوع التوظيف والارتباط:
            </label>
            <select
              value={selectedContractType}
              onChange={(e) => setSelectedContractType(e.target.value)}
              className="w-full text-xs p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="all">📋 كافة أنواع العقود والملاك</option>
              <option value="permanent">ملاك دائم (موظفو الدولة)</option>
              <option value="contract">عقد وزاري / مؤقت</option>
            </select>
          </div>

          {/* Gender Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              الجنس:
            </label>
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="w-full text-xs p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="all">👥 الكل (ذكور وإناث)</option>
              <option value="male">ذكور فقط</option>
              <option value="female">إناث فقط</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Workforce */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">إجمالي الكادر المحدد</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
              {totalCount}
            </div>
            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
              {departmentOptions.length} أقسام مسجلة
            </div>
          </div>
        </div>

        {/* Active on Duty */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">مباشر بالعمل (فعلي)</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {activeCount}
            </div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">
              {activePercent}% من المجموع
            </div>
          </div>
        </div>

        {/* On Leave */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">متمتع بإجازة</div>
            <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {onLeaveCount}
            </div>
            <div className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
              {onLeavePercent}% نسبة الإجازات
            </div>
          </div>
        </div>

        {/* Suspended & Other */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">متوسط الدرجة الوظيفية</div>
            <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
              {gradeData.length > 0
                ? (
                    gradeData
                      .filter((g) => g.gradeNum <= 10)
                      .reduce((acc, curr) => acc + curr.gradeNum * curr.count, 0) /
                    Math.max(1, totalCount)
                  ).toFixed(1)
                : '-'}
            </div>
            <div className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold">
              سلم الدرجات (1-10)
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Distribution by Department (حسب القسم) */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                    1. توزيع الموظفين حسب القسم والتشكيل الإداري
                  </h3>
                  <p className="text-xs text-slate-400">
                    مقارنة الكادر الإجمالي مع توزيع المباشرين والمتمتعين بإجازة لكل قسم
                  </p>
                </div>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300">
                {departmentData.length} تشكيلات
              </span>
            </div>

            {/* Recharts BarChart */}
            <div className="h-80 w-full pt-2" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={departmentData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '12px',
                      border: '1px solid #334155',
                      color: '#fff',
                      fontSize: '12px',
                      textAlign: 'right',
                      direction: 'rtl',
                    }}
                    formatter={(value: any, name: any) => [
                      `${value} موظف`,
                      name === 'active' ? 'مباشر بالعمل' : name === 'onLeave' ? 'متمتع بإجازة' : 'الإجمالي',
                    ]}
                    labelFormatter={(label) => `القسم: ${label}`}
                  />
                  <Legend
                    verticalAlign="top"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
                    formatter={(val) =>
                      val === 'active'
                        ? 'مباشر بالخدمة'
                        : val === 'onLeave'
                        ? 'متمتع بإجازة'
                        : 'إجمالي القسم'
                    }
                  />
                  <Bar
                    dataKey="active"
                    name="active"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={45}
                  />
                  <Bar
                    dataKey="onLeave"
                    name="onLeave"
                    fill="#f59e0b"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={45}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>🟢 الأخضر: مباشر بالعمل</span>
            <span>🟠 البرتقالي: متمتع بإجازة</span>
          </div>
        </div>

        {/* Chart 3: Current Status Distribution (حالتهم الحالية: مباشر/متمتع بإجازة) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <PieChartIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  2. الحالة الحالية (مباشر / متمتع بإجازة)
                </h3>
                <p className="text-xs text-slate-400">النسبة المئوية لحالة الدوام والانفكاك</p>
              </div>
            </div>

            {/* Recharts PieChart */}
            <div className="h-64 w-full flex items-center justify-center" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '12px',
                      border: '1px solid #334155',
                      color: '#fff',
                      fontSize: '12px',
                      textAlign: 'right',
                      direction: 'rtl',
                    }}
                    formatter={(val: any) => [
                      `${val} موظف (${totalCount > 0 ? Math.round((Number(val) / totalCount) * 100) : 0}%)`,
                      'العدد',
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend / Status breakdown list */}
            <div className="space-y-2 mt-2">
              {statusPieData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {item.value}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({totalCount > 0 ? Math.round((item.value / totalCount) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chart 2: Distribution by Civil Grade (الدرجة الوظيفية 1 إلى 10) */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                3. توزيع الموظفين حسب الدرجة الوظيفية (سلم الدرجات من 1 إلى 10)
              </h3>
              <p className="text-xs text-slate-400">
                إحصائية الدرجات الوظيفية المعتمدة في قانون الخدمة المدنية ومقارنة الملاك الدائم مع العقود
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-3 py-1 rounded-full">
            قانون رواتب موظفي الدولة 2026
          </span>
        </div>

        {/* Recharts BarChart for Grades */}
        <div className="h-80 w-full pt-2" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={gradeData}
              margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis
                dataKey="gradeName"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
              />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  color: '#fff',
                  fontSize: '12px',
                  textAlign: 'right',
                  direction: 'rtl',
                }}
                formatter={(val: any, name: any) => [
                  `${val} موظف`,
                  name === 'permanent' ? 'ملاك دائم' : name === 'contract' ? 'عقد' : 'العدد الإجمالي',
                ]}
                labelFormatter={(label) => `${label}`}
              />
              <Legend
                verticalAlign="top"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
                formatter={(val) => (val === 'permanent' ? 'ملاك دائم' : 'عقد')}
              />
              <Bar
                dataKey="permanent"
                name="permanent"
                fill="#8b5cf6"
                radius={[6, 6, 0, 0]}
                maxBarSize={45}
              />
              <Bar
                dataKey="contract"
                name="contract"
                fill="#38bdf8"
                radius={[6, 6, 0, 0]}
                maxBarSize={45}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Grade Cards Quick Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          {gradeData.map((g, idx) => (
            <div
              key={g.gradeName}
              className="p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
            >
              <div className="text-[10px] text-slate-400 font-bold truncate">{g.gradeName}</div>
              <div className="text-base font-black text-slate-800 dark:text-slate-100 font-mono">
                {g.count}
              </div>
              <div className="text-[9px] text-purple-600 dark:text-purple-400">
                {totalCount > 0 ? Math.round((g.count / totalCount) * 100) : 0}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Drill-down Interactive Table of Matching Employees */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
              قائمة الكوادر المطابقة للفلترة الحالية ({filteredEmployees.length} موظف)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            انقر على أي موظف لمعاينة ملفه الشخصي وإصدار حركاته
          </span>
        </div>

        <div className="overflow-x-auto max-h-96 rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 sticky top-0">
              <tr>
                <th className="p-3 font-bold">الرقم الوظيفي</th>
                <th className="p-3 font-bold">الاسم الرباعي واللقب</th>
                <th className="p-3 font-bold">القسم والتشكيل</th>
                <th className="p-3 font-bold">الدرجة الوظيفية</th>
                <th className="p-3 font-bold">نوع التوظيف</th>
                <th className="p-3 font-bold">الحالة الحالية</th>
                <th className="p-3 font-bold text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEmployees.slice(0, 50).map((emp) => {
                const isLeave = emp.status === 'on_leave';
                return (
                  <tr
                    key={emp.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {emp.employeeNumber}
                    </td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      {emp.fullName}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">
                      {emp.department}
                    </td>
                    <td className="p-3 font-semibold text-purple-700 dark:text-purple-300">
                      {emp.civilGrade ? `الدرجة ${emp.civilGrade}` : 'غير محدد'}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      {emp.contractType === 'permanent' ? 'ملاك دائم' : 'عقد وزاري'}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isLeave
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isLeave ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        />
                        {isLeave ? 'متمتع بإجازة' : 'مباشر بالخدمة'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {onOpenEmployeeProfile && (
                        <button
                          type="button"
                          onClick={() => onOpenEmployeeProfile(emp.id)}
                          className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[11px] transition-colors"
                        >
                          الملف الكامل
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredEmployees.length > 50 && (
          <div className="text-center text-xs text-slate-400 pt-1">
            يتم عرض أول 50 موظفاً من أصل {filteredEmployees.length} موظفاً مطابقاً
          </div>
        )}
      </div>
    </div>
  );
}
