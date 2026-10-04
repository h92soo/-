import React, { useState, useMemo, useEffect } from 'react';
import {
  DollarSign,
  Search,
  Filter,
  Users,
  Edit2,
  Printer,
  Sliders,
  ShieldCheck,
  Building2,
  TrendingUp,
  Percent,
  Calculator,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { Employee, OrganizationSettings } from '../types';
import {
  computeEmployeeSalaryComponents,
  formatIQD,
  getDepartmentSalarySummaries,
  IRAQI_SALARY_SCALE,
} from '../utils/iraqiSalaryScale';
import { SalaryAllowancesModal } from './SalaryAllowancesModal';
import { PaginationControl } from './PaginationControl';

interface SalariesPayrollViewProps {
  employees: Employee[];
  organization: OrganizationSettings;
  onOpenEmployeeProfile?: (employeeId: string) => void;
  onRefreshData?: () => void;
}

export const SalariesPayrollView: React.FC<SalariesPayrollViewProps> = ({
  employees,
  organization,
  onOpenEmployeeProfile,
  onRefreshData,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [subView, setSubView] = useState<'payroll_table' | 'departments_summary' | 'scale_reference'>('payroll_table');

  // Selected employee for salary edit modal
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isBatchEditModalOpen, setIsBatchEditModalOpen] = useState(false);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

  // Pagination State (Default 20, supports 20, 30, 50, 100, 0)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDepartment, selectedGrade]);

  // Filter active employees
  const activeEmployees = useMemo(() => {
    return employees.filter((e) => e.status !== 'retired');
  }, [employees]);

  // Departments list
  const departments = useMemo(() => {
    return Array.from(new Set(activeEmployees.map((e) => e.department))).filter(Boolean);
  }, [activeEmployees]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return activeEmployees.filter((emp) => {
      if (selectedDepartment !== 'all' && emp.department !== selectedDepartment) return false;
      if (selectedGrade !== 'all' && String(emp.civilGrade || 7) !== selectedGrade) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = emp.fullName.toLowerCase().includes(q);
        const matchNum = emp.employeeNumber.toLowerCase().includes(q);
        const matchTitle = (emp.jobTitle || '').toLowerCase().includes(q);
        if (!matchName && !matchNum && !matchTitle) return false;
      }
      return true;
    });
  }, [activeEmployees, selectedDepartment, selectedGrade, searchQuery]);

  // Compute components once per filtered employee
  const enrichedEmployees = useMemo(() => {
    return filteredEmployees.map((emp) => ({
      emp,
      components: computeEmployeeSalaryComponents(emp),
    }));
  }, [filteredEmployees]);

  // Single-pass totals computation for zero UI freeze
  const { totalBase, totalAllowances, totalTaxesAndPension, totalNet } = useMemo(() => {
    let base = 0;
    let allowances = 0;
    let deductions = 0;
    let net = 0;
    for (const item of enrichedEmployees) {
      base += item.components.baseSalary;
      allowances += item.components.totalAllowances;
      deductions += item.components.totalDeductions;
      net += item.components.netSalary;
    }
    return {
      totalBase: base,
      totalAllowances: allowances,
      totalTaxesAndPension: deductions,
      totalNet: net,
    };
  }, [enrichedEmployees]);

  // Paginated employees for instant 60fps rendering
  const paginatedItems = useMemo(() => {
    if (pageSize === 0) return enrichedEmployees;
    const start = (currentPage - 1) * pageSize;
    return enrichedEmployees.slice(start, start + pageSize);
  }, [enrichedEmployees, currentPage, pageSize]);

  // Department Summaries (Cross-department linking)
  const departmentSummaries = useMemo(() => {
    return getDepartmentSalarySummaries(employees);
  }, [employees]);

  const toggleSelectBatch = (id: string) => {
    setSelectedBatchIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFiltered = () => {
    if (selectedBatchIds.length === filteredEmployees.length) {
      setSelectedBatchIds([]);
    } else {
      setSelectedBatchIds(filteredEmployees.map((e) => e.id));
    }
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setSubView('payroll_table')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
              subView === 'payroll_table'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>سجل الرواتب والمخصصات للموظفين</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('departments_summary')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
              subView === 'departments_summary'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>توزيع الرواتب حسب الأقسام ({departments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('scale_reference')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
              subView === 'scale_reference'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>دليل سلم الرواتب العراقي (قانون 22)</span>
          </button>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          {selectedBatchIds.length > 0 && (
            <button
              type="button"
              onClick={() => setIsBatchEditModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>تعديل جماعي للمحددين ({selectedBatchIds.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة كشف الرواتب</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">إجمالي الرواتب الاسمية</div>
          <div className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-white mt-1">
            {formatIQD(totalBase)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{filteredEmployees.length} موظفاً</div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shadow-xs">
          <div className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">إجمالي المخصصات الممنوحة</div>
          <div className="text-sm sm:text-base font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-1">
            {formatIQD(totalAllowances)}
          </div>
          <div className="text-[10px] text-emerald-600/80 mt-0.5">زوجية، أطفال، شهادة، خطورة</div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 shadow-xs">
          <div className="text-xs text-rose-800 dark:text-rose-300 font-medium">التقاعد والضرائب (اختيارية)</div>
          <div className="text-sm sm:text-base font-bold font-mono text-rose-700 dark:text-rose-300 mt-1">
            {formatIQD(totalTaxesAndPension)}
          </div>
          <div className="text-[10px] text-rose-600/80 mt-0.5">توقيفات تقاعدية 10% + ضريبة الدخل</div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 shadow-xs">
          <div className="text-xs text-amber-900 dark:text-amber-200 font-bold">صافي الرواتب المستحق للصرف</div>
          <div className="text-sm sm:text-base font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
            {formatIQD(totalNet)}
          </div>
          <div className="text-[10px] text-amber-700 mt-0.5">الصافي الفعلي للموظفين</div>
        </div>
      </div>

      {/* VIEW 1: Main Payroll Table */}
      {subView === 'payroll_table' && (
        <div className="space-y-3">
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 no-print">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="بحث بالاسم، الرقم الوظيفي، أو العنوان..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-10 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-amber-500/40"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                <option value="all">كافة الأقسام والتشكيلات ({departments.length})</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                <option value="all">كافة الدرجات (1 - 10)</option>
                {Object.values(IRAQI_SALARY_SCALE).map((g) => (
                  <option key={g.grade} value={String(g.grade)}>
                    {g.gradeNameAr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 w-10 text-center no-print">
                      <input
                        type="checkbox"
                        checked={selectedBatchIds.length === filteredEmployees.length && filteredEmployees.length > 0}
                        onChange={toggleSelectAllFiltered}
                        className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                        title="تحديد الكل"
                      />
                    </th>
                    <th className="p-3">الموظف والوظيفة</th>
                    <th className="p-3">القسم</th>
                    <th className="p-3 text-center">الدرجة / المرحلة</th>
                    <th className="p-3 font-mono">الراتب الاسمي</th>
                    <th className="p-3">الزوجية والأطفال</th>
                    <th className="p-3">مخصصات الشهادة والمهنة</th>
                    <th className="p-3 font-mono text-emerald-600">إجمالي المخصصات</th>
                    <th className="p-3 font-mono text-rose-600">الاستقطاعات والضرائب</th>
                    <th className="p-3 font-mono text-amber-600 font-bold">صافي الراتب</th>
                    <th className="p-3 text-center no-print">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-400">
                        لا يوجد موظفون يطابقون معايير البحث والفلترة.
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map(({ emp, components: c }) => {
                      const isSelected = selectedBatchIds.includes(emp.id);

                      return (
                        <tr
                          key={emp.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                            isSelected ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                          }`}
                        >
                          <td className="p-3 text-center no-print" onClick={() => toggleSelectBatch(emp.id)}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                            />
                          </td>
                          <td className="p-3">
                            <div
                              onClick={() => onOpenEmployeeProfile && onOpenEmployeeProfile(emp.id)}
                              className="font-bold text-slate-900 dark:text-white hover:text-amber-600 cursor-pointer"
                            >
                              {emp.fullName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {emp.jobTitle} • {emp.employeeNumber}
                            </div>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{emp.department}</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                              د {emp.civilGrade || 7} / م {emp.civilStage || 1}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                            {formatIQD(c.baseSalary)}
                          </td>
                          <td className="p-3 text-[11px]">
                            <div className="text-slate-700 dark:text-slate-300">
                              {c.spouseAllowance > 0 ? 'زوجية: 50,000' : 'بدون زوجية'}
                            </div>
                            <div className="text-slate-400">
                              {c.childrenAllowance > 0
                                ? `أطفال (${emp.childrenCount || 0}): ${formatIQD(c.childrenAllowance)}`
                                : 'بدون أطفال'}
                            </div>
                          </td>
                          <td className="p-3 text-[11px]">
                            <div className="text-slate-700 dark:text-slate-300">
                              شهادة ({emp.educationAllowancePercent || 45}%): {formatIQD(c.educationAllowance)}
                            </div>
                            <div className="text-slate-400">
                              خطورة ({emp.hazardAllowancePercent || 20}%): {formatIQD(c.hazardAllowance)}
                            </div>
                          </td>
                          <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatIQD(c.totalAllowances)}
                          </td>
                          <td className="p-3 font-mono text-[11px] text-rose-600 dark:text-rose-400">
                            <div>تقاعد (10%): {formatIQD(c.pensionDeduction)}</div>
                            {emp.isTaxEnabled && (
                              <div className="text-[10px] text-purple-600 dark:text-purple-400">
                                ضريبة ({emp.taxRatePercent || 3}%): {formatIQD(c.taxDeduction)}
                              </div>
                            )}
                          </td>
                          <td className="p-3 font-mono font-black text-amber-600 dark:text-amber-400 text-xs sm:text-sm">
                            {formatIQD(c.netSalary)}
                          </td>
                          <td className="p-3 text-center no-print">
                            <button
                              type="button"
                              onClick={() => setEditingEmployee(emp)}
                              className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 mx-auto"
                              title="تعديل تفاصيل الراتب والمخصصات"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>تعديل</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredEmployees.length > 0 && (
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <PaginationControl
                  currentPage={currentPage}
                  totalItems={filteredEmployees.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[20, 30, 50, 100, 0]}
                  itemLabel="موظفاً"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: Department Summaries (الربط بكل الأقسام للموظف بكل تعديل) */}
      {subView === 'departments_summary' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <div>
                <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  الربط والتوزيع المالي المركزي لجميع أقسام وتشكيلات المؤسسة
                </h4>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                  تنعكس أي علاوة أو ترفيع أو تعديل براتب الموظف فورياً على مجموع موازنة القسم والتوقيفات والضرائب
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {departmentSummaries.map((dept) => (
              <div
                key={dept.department}
                className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[200px]">
                    {dept.department}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono">
                    {dept.employeeCount} موظفاً
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">الرواتب الاسمية:</span>
                    <span className="font-mono font-bold">{formatIQD(dept.totalBaseSalaries)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">إجمالي المخصصات:</span>
                    <span className="font-mono font-bold text-emerald-600">{formatIQD(dept.totalAllowances)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">التوقيفات والضرائب:</span>
                    <span className="font-mono font-bold text-rose-600">{formatIQD(dept.totalDeductions)}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800 font-bold">
                    <span className="text-amber-600">صافي المستحق للقسم:</span>
                    <span className="font-mono text-amber-600 font-black">{formatIQD(dept.totalNetSalaries)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedDepartment(dept.department);
                    setSubView('payroll_table');
                  }}
                  className="w-full py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition-colors cursor-pointer"
                >
                  عرض كشف موظفي هذا القسم
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: Iraqi Salary Scale Reference (دليل قانون 22 لسنة 2008) */}
      {subView === 'scale_reference' && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-600" />
              <span>جدول درجات ومراحل سلم رواتب موظفي الدولة العراقي (قانون رقم 22 لسنة 2008 المعدل)</span>
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              يبين الراتب الاسمي للمرحلة الأولى، مقدار العلاوة السنوية لكل درجة، والحد الأدنى للسنوات المقررة للترفيع الوظيفي
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                <tr>
                  <th className="p-3">الدرجة</th>
                  <th className="p-3">المسمى المعتمد</th>
                  <th className="p-3 font-mono">الراتب الاسمي (المرحلة 1)</th>
                  <th className="p-3 font-mono text-amber-600">مقدار العلاوة السنوية</th>
                  <th className="p-3 font-mono">الراتب الأقصى (المرحلة 11)</th>
                  <th className="p-3 text-center">المدة الأصغرية للترفيع</th>
                  <th className="p-3">أمثلة العناوين الوظيفية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {Object.values(IRAQI_SALARY_SCALE).map((def) => {
                  const maxStageBase = def.stage1Base + 10 * def.annualIncrement;
                  return (
                    <tr key={def.grade} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-bold font-mono">{def.grade}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{def.gradeNameAr}</td>
                      <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatIQD(def.stage1Base)}
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                        +{formatIQD(def.annualIncrement)}
                      </td>
                      <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                        {formatIQD(maxStageBase)}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {def.minYearsForPromotion} سنوات
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 text-[11px]">
                        {def.sampleTitles.join(' • ')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Salary & Allowances Edit Modal (Single) */}
      {editingEmployee && (
        <SalaryAllowancesModal
          isOpen={Boolean(editingEmployee)}
          onClose={() => setEditingEmployee(null)}
          employee={editingEmployee}
          onSaved={() => {
            if (onRefreshData) onRefreshData();
          }}
        />
      )}

      {/* Batch Salary Edit Modal */}
      {isBatchEditModalOpen && (
        <SalaryAllowancesModal
          isOpen={isBatchEditModalOpen}
          onClose={() => setIsBatchEditModalOpen(false)}
          batchEmployeeIds={selectedBatchIds}
          onSaved={() => {
            setSelectedBatchIds([]);
            if (onRefreshData) onRefreshData();
          }}
        />
      )}
    </div>
  );
};
