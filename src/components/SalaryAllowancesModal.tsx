import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Calculator,
  Percent,
  CheckCircle2,
  X,
  RotateCcw,
  Sparkles,
  Users,
  ShieldAlert,
} from 'lucide-react';
import { Employee } from '../types';
import {
  computeEmployeeSalaryComponents,
  getOfficialBaseSalary,
  formatIQD,
  IRAQI_SALARY_SCALE,
  EDUCATION_ALLOWANCE_PRESETS,
  STANDARD_SPOUSE_ALLOWANCE,
  STANDARD_CHILD_ALLOWANCE,
} from '../utils/iraqiSalaryScale';
import { employeeService } from '../services/employeeService';
import { toast } from './ToastNotification';

interface SalaryAllowancesModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: Employee | null;
  batchEmployeeIds?: string[];
  onSaved?: () => void;
}

export const SalaryAllowancesModal: React.FC<SalaryAllowancesModalProps> = ({
  isOpen,
  onClose,
  employee,
  batchEmployeeIds = [],
  onSaved,
}) => {
  const isBatch = Boolean(batchEmployeeIds.length > 0 && !employee);

  // Form states
  const [civilGrade, setCivilGrade] = useState<number>(employee?.civilGrade || 7);
  const [civilStage, setCivilStage] = useState<number>(employee?.civilStage || 1);
  const [baseSalary, setBaseSalary] = useState<number>(employee?.baseSalary || 296000);
  const [maritalStatus, setMaritalStatus] = useState<'single' | 'married' | 'widowed' | 'divorced'>(
    employee?.maritalStatus || 'married'
  );
  const [hasSpouseAllowance, setHasSpouseAllowance] = useState<boolean>(
    employee?.hasSpouseAllowance ?? true
  );
  const [spouseAllowance, setSpouseAllowance] = useState<number>(
    employee?.spouseAllowance ?? STANDARD_SPOUSE_ALLOWANCE
  );
  const [childrenCount, setChildrenCount] = useState<number>(employee?.childrenCount ?? 2);
  const [childrenAllowance, setChildrenAllowance] = useState<number>(
    employee?.childrenAllowance ?? 20000
  );
  const [educationDegree, setEducationDegree] = useState<string>(
    employee?.educationDegree || 'بكالوريوس'
  );
  const [educationAllowancePercent, setEducationAllowancePercent] = useState<number>(
    employee?.educationAllowancePercent ?? 45
  );
  const [hazardAllowancePercent, setHazardAllowancePercent] = useState<number>(
    employee?.hazardAllowancePercent ?? 20
  );
  const [positionAllowancePercent, setPositionAllowancePercent] = useState<number>(
    employee?.positionAllowancePercent ?? 0
  );
  const [transportAllowance, setTransportAllowance] = useState<number>(
    employee?.transportAllowance ?? 30000
  );
  const [otherAllowances, setOtherAllowances] = useState<number>(
    employee?.otherAllowances ?? 0
  );
  const [isPensionDeducted, setIsPensionDeducted] = useState<boolean>(
    employee?.isPensionDeducted !== false
  );
  const [isTaxEnabled, setIsTaxEnabled] = useState<boolean>(
    Boolean(employee?.isTaxEnabled)
  );
  const [taxRatePercent, setTaxRatePercent] = useState<number>(
    employee?.taxRatePercent ?? 3
  );
  const [otherDeductions, setOtherDeductions] = useState<number>(
    employee?.otherDeductions ?? 0
  );
  const [isSaving, setIsSaving] = useState(false);

  // Re-sync with employee when modal opens
  useEffect(() => {
    if (employee) {
      setCivilGrade(employee.civilGrade || 7);
      setCivilStage(employee.civilStage || 1);
      setBaseSalary(employee.baseSalary || getOfficialBaseSalary(employee.civilGrade || 7, employee.civilStage || 1));
      setMaritalStatus(employee.maritalStatus || 'married');
      setHasSpouseAllowance(employee.hasSpouseAllowance ?? true);
      setSpouseAllowance(employee.spouseAllowance ?? STANDARD_SPOUSE_ALLOWANCE);
      setChildrenCount(employee.childrenCount ?? 2);
      setChildrenAllowance(employee.childrenAllowance ?? (employee.childrenCount ? employee.childrenCount * 10000 : 20000));
      setEducationDegree(employee.educationDegree || 'بكالوريوس');
      setEducationAllowancePercent(employee.educationAllowancePercent ?? 45);
      setHazardAllowancePercent(employee.hazardAllowancePercent ?? 20);
      setPositionAllowancePercent(employee.positionAllowancePercent ?? 0);
      setTransportAllowance(employee.transportAllowance ?? 30000);
      setOtherAllowances(employee.otherAllowances ?? 0);
      setIsPensionDeducted(employee.isPensionDeducted !== false);
      setIsTaxEnabled(Boolean(employee.isTaxEnabled));
      setTaxRatePercent(employee.taxRatePercent ?? 3);
      setOtherDeductions(employee.otherDeductions ?? 0);
    }
  }, [employee]);

  if (!isOpen) return null;

  // Real-time calculation preview
  const livePreview = computeEmployeeSalaryComponents({
    civilGrade,
    civilStage,
    baseSalary,
    maritalStatus,
    hasSpouseAllowance,
    spouseAllowance,
    childrenCount,
    childrenAllowance,
    educationDegree,
    educationAllowancePercent,
    positionAllowancePercent,
    hazardAllowancePercent,
    transportAllowance,
    otherAllowances,
    isPensionDeducted,
    isTaxEnabled,
    taxRatePercent,
    otherDeductions,
  });

  // Reset base salary from official Iraqi scale
  const handleResetToOfficialScale = () => {
    const scaleBase = getOfficialBaseSalary(civilGrade, civilStage);
    setBaseSalary(scaleBase);
    toast.info(`تم استرجاع الراتب الاسمي الرسمي (${formatIQD(scaleBase)}) للدرجة (${civilGrade}) المرحلة (${civilStage})`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (isBatch && batchEmployeeIds.length > 0) {
        // Batch update
        const count = await employeeService.updateBatchSalariesAndAllowances(
          batchEmployeeIds,
          {
            hazardAllowancePercent,
            positionAllowancePercent,
            transportAllowance,
            isPensionDeducted,
            isTaxEnabled,
            taxRatePercent,
          },
          'مسؤول الرواتب والموارد البشرية'
        );
        toast.success(`تم التعديل الجماعي للرواتب والمخصصات لعدد (${count}) موظفاً بنجاح وتم الربط بجميع الأقسام.`);
      } else if (employee) {
        // Single employee update
        await employeeService.updateEmployeeSalaryDetails(
          employee.id,
          {
            civilGrade,
            civilStage,
            baseSalary,
            maritalStatus,
            hasSpouseAllowance,
            spouseAllowance,
            childrenCount,
            childrenAllowance,
            educationDegree,
            educationAllowancePercent,
            positionAllowancePercent,
            hazardAllowancePercent,
            transportAllowance,
            otherAllowances,
            isPensionDeducted,
            isTaxEnabled,
            taxRatePercent,
            otherDeductions,
          },
          'مسؤول الرواتب'
        );
        toast.success(`تم تعديل بيانات الراتب والمخصصات للموظف (${employee.fullName}) وتحديث السجل الزمني والربط بالأقسام.`);
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      toast.error(`حدث خطأ أثناء حفظ الرواتب: ${err?.message || 'خطأ غير معروف'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-3xl my-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center font-bold text-white shadow-inner">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {isBatch
                  ? `تعديل الرواتب والمخصصات والضرائب الجماعي (${batchEmployeeIds.length} موظف)`
                  : `تعديل الراتب الاسمي والمخصصات والضرائب: ${employee?.fullName}`}
              </h3>
              <p className="text-xs text-amber-100">
                وفق قانون الخدمة المدنية رقم 24 وقانون رواتب الدولة رقم 22 لسنة 2008 المعدل
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Salary Summary Banner */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center shrink-0">
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-[10px] text-slate-500 font-medium">الراتب الاسمي</div>
            <div className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5">
              {formatIQD(livePreview.baseSalary)}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shadow-xs">
            <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">+ مجموع المخصصات</div>
            <div className="text-xs sm:text-sm font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-0.5">
              {formatIQD(livePreview.totalAllowances)}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 shadow-xs">
            <div className="text-[10px] text-rose-700 dark:text-rose-300 font-medium">- التقاعد والضرائب</div>
            <div className="text-xs sm:text-sm font-bold font-mono text-rose-700 dark:text-rose-300 mt-0.5">
              {formatIQD(livePreview.totalDeductions)}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 shadow-xs">
            <div className="text-[10px] text-amber-800 dark:text-amber-200 font-bold">= صافي الراتب المستحق</div>
            <div className="text-xs sm:text-sm font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
              {formatIQD(livePreview.netSalary)}
            </div>
          </div>
        </div>

        {/* Modal Form Scroll Area */}
        <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto text-xs">
          {/* Section 1: Grade, Stage, and Base Salary (only for single employee or scale sync) */}
          {!isBatch && (
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-amber-600" />
                  الدرجة والمرحلة والراتب الاسمي
                </span>
                <button
                  type="button"
                  onClick={handleResetToOfficialScale}
                  className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 text-[11px] font-bold flex items-center gap-1 hover:bg-amber-200 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>ضبط تلقائي من سلم الرواتب</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    الدرجة الوظيفية (1 - 10)
                  </label>
                  <select
                    value={civilGrade}
                    onChange={(e) => {
                      const g = Number(e.target.value);
                      setCivilGrade(g);
                      setBaseSalary(getOfficialBaseSalary(g, civilStage));
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold font-mono focus:ring-2 focus:ring-amber-500/40"
                  >
                    {Object.values(IRAQI_SALARY_SCALE).map((def) => (
                      <option key={def.grade} value={def.grade}>
                        {def.gradeNameAr} (الدرجة {def.grade})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    المرحلة (1 - 11)
                  </label>
                  <select
                    value={civilStage}
                    onChange={(e) => {
                      const s = Number(e.target.value);
                      setCivilStage(s);
                      setBaseSalary(getOfficialBaseSalary(civilGrade, s));
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold font-mono focus:ring-2 focus:ring-amber-500/40"
                  >
                    {Array.from({ length: 11 }, (_, i) => i + 1).map((s) => (
                      <option key={s} value={s}>
                        المرحلة {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    الراتب الاسمي (دينار عراقي) *
                  </label>
                  <input
                    type="number"
                    step={1000}
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold font-mono text-amber-600 dark:text-amber-400 focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Social & Family Allowances (الزوجية والأطفال وفق القانون العراقي) */}
          {!isBatch && (
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-slate-700">
                <Users className="w-4 h-4 text-emerald-600" />
                المخصصات الاجتماعية (الزوجية والأطفال)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    الحالة الاجتماعية
                  </label>
                  <select
                    value={maritalStatus}
                    onChange={(e) => {
                      const st = e.target.value as any;
                      setMaritalStatus(st);
                      if (st === 'married') {
                        setHasSpouseAllowance(true);
                      } else {
                        setHasSpouseAllowance(false);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-medium"
                  >
                    <option value="married">متزوج / متزوجة</option>
                    <option value="single">أعزب / عزباء</option>
                    <option value="widowed">أرمل / أرملة</option>
                    <option value="divorced">مطلق / مطلقة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    مخصصات الزوجية (50,000 د.ع)
                  </label>
                  <div className="flex items-center gap-2 pt-1.5">
                    <input
                      type="checkbox"
                      id="hasSpouseAllowanceCheck"
                      checked={hasSpouseAllowance}
                      onChange={(e) => setHasSpouseAllowance(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                    />
                    <label htmlFor="hasSpouseAllowanceCheck" className="cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                      {hasSpouseAllowance ? 'مستحق لمخصصات الزوجية' : 'غير مستحق / لا تصرف'}
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    عدد الأطفال المشمولين (10,000 د.ع لكل طفل، حد أقصى 4)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={4}
                    value={childrenCount}
                    onChange={(e) => {
                      const count = Math.min(4, Math.max(0, Number(e.target.value)));
                      setChildrenCount(count);
                      setChildrenAllowance(count * STANDARD_CHILD_ALLOWANCE);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Educational, Position, Hazard & Transport Allowances */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-slate-700">
              <Percent className="w-4 h-4 text-indigo-600" />
              مخصصات الشهادة، المنصب، والخطورة، والنقل
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {!isBatch && (
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    مخصصات الشهادة العلمية
                  </label>
                  <select
                    value={educationAllowancePercent}
                    onChange={(e) => setEducationAllowancePercent(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-medium"
                  >
                    {Object.entries(EDUCATION_ALLOWANCE_PRESETS).map(([key, item]) => (
                      <option key={key} value={item.percent}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  مخصصات الخطورة وطبيعة العمل (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    value={hazardAllowancePercent}
                    onChange={(e) => setHazardAllowancePercent(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold font-mono"
                  />
                  <span className="text-slate-500 font-bold">%</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  مخصصات المنصب / الإدارة (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={5}
                    value={positionAllowancePercent}
                    onChange={(e) => setPositionAllowancePercent(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold font-mono"
                  />
                  <span className="text-slate-500 font-bold">%</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  مخصصات النقل والموقع (دينار)
                </label>
                <input
                  type="number"
                  step={5000}
                  value={transportAllowance}
                  onChange={(e) => setTransportAllowance(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold font-mono"
                />
              </div>

              {!isBatch && (
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    مخصصات أخرى مخصصة (دينار)
                  </label>
                  <input
                    type="number"
                    step={5000}
                    value={otherAllowances}
                    onChange={(e) => setOtherAllowances(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Pension Deductions and OPTIONAL Taxes */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-slate-700">
              <ShieldAlert className="w-4 h-4 text-purple-600" />
              الاستقطاعات، التوقيفات التقاعدية، والضرائب (اختياري)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Pension Deduction */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    التوقيفات التقاعدية (10%)
                  </span>
                  <input
                    type="checkbox"
                    checked={isPensionDeducted}
                    onChange={(e) => setIsPensionDeducted(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  استقطاع 10% لصالح صندوق تقاعد موظفي الدولة العراقي.
                </p>
                <div className="mt-2 text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                  القيمة: {formatIQD(livePreview.pensionDeduction)}
                </div>
              </div>

              {/* Optional Income Tax */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    ضريبة الدخل (اختيارية)
                  </span>
                  <input
                    type="checkbox"
                    checked={isTaxEnabled}
                    onChange={(e) => setIsTaxEnabled(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  تفعيل استقطاع ضريبة الدخل بنسبة مئوية قابلة للتخصيص.
                </p>
                {isTaxEnabled && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-slate-500">النسبة:</span>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      step={0.5}
                      value={taxRatePercent}
                      onChange={(e) => setTaxRatePercent(Number(e.target.value))}
                      className="w-16 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 font-bold font-mono text-center"
                    />
                    <span className="text-slate-500">%</span>
                    <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 mr-auto">
                      المبلغ: {formatIQD(livePreview.taxDeduction)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md shadow-amber-600/20 active:scale-98 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'جاري الحفظ...' : 'حفظ وتحديث الرواتب والربط بالأقسام'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
