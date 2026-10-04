import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  Building2,
  Briefcase,
  Layers,
  Sparkles,
  CheckCircle2,
  X,
  Plus,
  Minus,
  DollarSign,
  Percent,
  ShieldAlert,
  Award,
  Heart,
  Baby,
  GraduationCap,
} from 'lucide-react';
import { Employee, ContractType, Department, EDUCATION_DEGREE_OPTIONS } from '../types';
import { updateEmployeesBatch } from '../db/indexedDB';
import { employeeService } from '../services/employeeService';
import { getOfficialBaseSalary, formatIQD, inferEducationPercent } from '../utils/iraqiSalaryScale';

interface BatchEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  employees: Employee[];
  onBatchUpdated: (count: number) => void;
}

export function BatchEditModal({
  isOpen,
  onClose,
  selectedIds,
  employees,
  onBatchUpdated,
}: BatchEditModalProps) {
  const [department, setDepartment] = useState('');
  const [changeDepartment, setChangeDepartment] = useState(false);
  const [registeredDepts, setRegisteredDepts] = useState<Department[]>([]);

  // Education Degree Batch Editing
  const [changeEducation, setChangeEducation] = useState(false);
  const [educationDegree, setEducationDegree] = useState('بكالوريوس');

  useEffect(() => {
    if (isOpen) {
      employeeService.getDepartments().then(setRegisteredDepts).catch(() => {});
    }
  }, [isOpen]);

  const [division, setDivision] = useState('');
  const [changeDivision, setChangeDivision] = useState(false);

  const [contractType, setContractType] = useState<ContractType>('permanent');
  const [changeContractType, setChangeContractType] = useState(false);

  const [balanceAdjustment, setBalanceAdjustment] = useState<number>(0);
  const [adjustBalance, setAdjustBalance] = useState(false);

  // Grade & Base Salary Batch Editing
  const [changeGradeStage, setChangeGradeStage] = useState(false);
  const [civilGrade, setCivilGrade] = useState<number>(7);
  const [civilStage, setCivilStage] = useState<number>(1);
  const [overrideBaseSalary, setOverrideBaseSalary] = useState<number>(0);

  // Social & Family Allowance Batch Editing (Iraqi Law)
  const [changeSocial, setChangeSocial] = useState(false);
  const [hasSpouseAllowance, setHasSpouseAllowance] = useState(false);
  const [childrenCount, setChildrenCount] = useState<number>(0);

  // Position Allowance Batch Editing
  const [changePosition, setChangePosition] = useState(false);
  const [positionPercent, setPositionPercent] = useState<number>(20);

  // Hazard Allowance Batch Editing
  const [changeHazard, setChangeHazard] = useState(false);
  const [hazardPercent, setHazardPercent] = useState<number>(20);

  // Optional Tax Batch Editing
  const [changeTax, setChangeTax] = useState(false);
  const [isTaxEnabled, setIsTaxEnabled] = useState(false);
  const [taxRatePercent, setTaxRatePercent] = useState<number>(3);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedEmployees = employees.filter((e) => selectedIds.includes(e.id));

  const standardBaseSalary = getOfficialBaseSalary(civilGrade, civilStage);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;

    const updates: Partial<Employee> = {};

    if (changeDepartment && department.trim()) {
      updates.department = department.trim();
    }
    if (changeDivision && division.trim()) {
      updates.division = division.trim();
    }
    if (changeContractType) {
      updates.contractType = contractType;
      if (contractType === 'permanent') {
        updates.annualBalanceLimit = 36;
        updates.monthlyRate = 3;
        updates.isAccumulative = true;
      } else {
        updates.annualBalanceLimit = 30;
        updates.monthlyRate = 4;
        updates.isAccumulative = false;
      }
    }

    if (changeGradeStage) {
      updates.civilGrade = civilGrade;
      updates.civilStage = civilStage;
      updates.baseSalary = overrideBaseSalary > 0 ? overrideBaseSalary : standardBaseSalary;
    }
    if (changeSocial) {
      updates.hasSpouseAllowance = hasSpouseAllowance;
      updates.childrenCount = Math.min(4, Math.max(0, childrenCount));
    }
    if (changePosition) {
      updates.positionAllowancePercent = positionPercent;
    }
    if (changeHazard) {
      updates.hazardAllowancePercent = hazardPercent;
    }
    if (changeTax) {
      updates.isTaxEnabled = isTaxEnabled;
      updates.taxRatePercent = taxRatePercent;
    }
    if (changeEducation && educationDegree) {
      updates.educationDegree = educationDegree;
      const opt = EDUCATION_DEGREE_OPTIONS.find((o) => o.value === educationDegree);
      updates.educationAllowancePercent = opt ? opt.allowancePercent : inferEducationPercent(educationDegree);
    }

    setIsSaving(true);
    setError(null);

    try {
      let count = 0;
      const isSalaryOrAllowanceChange =
        changeHazard || changeTax || changeGradeStage || changeSocial || changePosition || changeEducation;

      if (isSalaryOrAllowanceChange) {
        count = await employeeService.updateBatchSalariesAndAllowances(
          selectedIds,
          updates,
          'مدير الموارد البشرية والرواتب'
        );
      } else if (adjustBalance && balanceAdjustment !== 0) {
        // Individual adjustment for remaining & used balance
        for (const emp of selectedEmployees) {
          const newUsed = Math.max(0, emp.usedBalance - balanceAdjustment);
          const newRemaining = Math.max(0, emp.annualBalanceLimit - newUsed);
          await updateEmployeesBatch([emp.id], {
            ...updates,
            usedBalance: newUsed,
            remainingBalance: newRemaining,
          });
          count++;
        }
      } else {
        count = await updateEmployeesBatch(selectedIds, updates);
      }

      onBatchUpdated(count);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'خطأ في التعديل الجماعي');
    } finally {
      setIsSaving(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                تعديل جماعي للموظفين المحددين
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                سيتم تطبيق التغييرات على ({selectedIds.length}) موظف تم تحديدهم
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {error}
            </div>
          )}

          {/* 1. Grade & Stage & Base Salary Update */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={changeGradeStage}
                onChange={(e) => setChangeGradeStage(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                تعديل الدرجة والمرحلة والراتب الاسمي جماعياً
              </span>
            </label>
            {changeGradeStage && (
              <div className="space-y-2 pt-1 pr-6 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1">الدرجة الوظيفية:</label>
                    <select
                      value={civilGrade}
                      onChange={(e) => setCivilGrade(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((g) => (
                        <option key={g} value={g}>
                          الدرجة {g}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">المرحلة:</label>
                    <select
                      value={civilStage}
                      onChange={(e) => setCivilStage(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((s) => (
                        <option key={s} value={s}>
                          المرحلة {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex items-center justify-between">
                  <span className="text-amber-800 dark:text-amber-300">
                    الراتب الاسمي القياسي (قانون 22 لسنة 2008):
                  </span>
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-200">
                    {formatIQD(standardBaseSalary)}
                  </span>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">
                    تخصيص راتب اسمي يدوي بديل (اختياري - اتركه 0 للقياسي):
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={overrideBaseSalary || ''}
                    onChange={(e) => setOverrideBaseSalary(Number(e.target.value))}
                    placeholder="مثال: 550000"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Social & Family Allowances (Iraqi Civil Service Law) */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={changeSocial}
                onChange={(e) => setChangeSocial(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                تعديل مخصصات الزوجية والأطفال (وفق القانون العراقي)
              </span>
            </label>
            {changeSocial && (
              <div className="space-y-3 pt-1 pr-6 text-xs">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <input
                    type="checkbox"
                    checked={hasSpouseAllowance}
                    onChange={(e) => setHasSpouseAllowance(e.target.checked)}
                    className="rounded text-amber-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold">استحقاق مخصصات الزوجية</span>
                    <span className="text-[11px] text-slate-500 block">
                      المبلغ الثابت: 50,000 دينار عراقي شهرياً
                    </span>
                  </div>
                </label>

                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Baby className="w-4 h-4 text-sky-500" />
                    <div>
                      <span className="font-bold">عدد الأطفال المستحقين:</span>
                      <span className="text-[10px] text-slate-400 block">
                        (10,000 د.ع لكل طفل - حد أقصى 4 أطفال)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[0, 1, 2, 3, 4].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setChildrenCount(count)}
                        className={`w-7 h-7 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                          childrenCount === count
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Position Allowance Batch Adjustment */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={changePosition}
                onChange={(e) => setChangePosition(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                تعديل نسبة مخصصات المنصب والإدارة
              </span>
            </label>
            {changePosition && (
              <div className="flex items-center gap-2 pt-1 pr-6 text-xs">
                <input
                  type="number"
                  min={0}
                  max={60}
                  step={5}
                  value={positionPercent}
                  onChange={(e) => setPositionPercent(Number(e.target.value))}
                  className="w-20 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold font-mono"
                />
                <span className="text-slate-500 font-bold">%</span>
                <span className="text-[11px] text-slate-500">من الراتب الاسمي</span>
              </div>
            )}
          </div>

          {/* Department update */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={changeDepartment}
                onChange={(e) => setChangeDepartment(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                تغيير القسم / التشكيل الإداري
              </span>
            </label>
            {changeDepartment && (
              <div className="space-y-2 pt-1 pr-6 text-xs">
                {registeredDepts.length > 0 ? (
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    required={changeDepartment}
                  >
                    <option value="">-- اختر القسم أو التشكيل الجديد --</option>
                    {registeredDepts.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name} {d.code ? `(${d.code})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="أدخل اسم القسم الجديد"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    required={changeDepartment}
                  />
                )}
              </div>
            )}
          </div>

          {/* Education Degree Batch update */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={changeEducation}
                onChange={(e) => setChangeEducation(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              <span className="flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-amber-500" />
                تعديل التحصيل الدراسي والشهادة جماعياً
              </span>
            </label>
            {changeEducation && (
              <div className="space-y-2 pt-1 pr-6 text-xs">
                <select
                  value={educationDegree}
                  onChange={(e) => setEducationDegree(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  {EDUCATION_DEGREE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  سيتم تحديث نسبة مخصصات الشهادة واحتساب الراتب الكلي تلقائياً لكافة الموظفين المحددين بموجب قانون رواتب موظفي الدولة العراقي.
                </p>
              </div>
            )}
          </div>

          {/* Division update */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={changeDivision}
                onChange={(e) => setChangeDivision(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              <span>تغيير الشعبة أو الوحدة</span>
            </label>
            {changeDivision && (
              <input
                type="text"
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                placeholder="أدخل اسم الشعبة الجديدة"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                required={changeDivision}
              />
            )}
          </div>

          {/* Contract type update */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={changeContractType}
                onChange={(e) => setChangeContractType(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              <span>تغيير نوع التوظيف / الملاك</span>
            </label>
            {changeContractType && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setContractType('permanent')}
                  className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                    contractType === 'permanent'
                      ? 'bg-amber-500 text-white border-amber-600'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  ملاك دائم (36 يوماً)
                </button>
                <button
                  type="button"
                  onClick={() => setContractType('contract')}
                  className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                    contractType === 'contract'
                      ? 'bg-amber-500 text-white border-amber-600'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  عقد وزاري (30 يوماً)
                </button>
              </div>
            )}
          </div>

          {/* Leave balance adjustment */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={adjustBalance}
                onChange={(e) => setAdjustBalance(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              <span>إضافة / خصم أيام إجازات للجميع</span>
            </label>
            {adjustBalance && (
              <div className="flex items-center gap-3 pt-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setBalanceAdjustment((prev) => prev - 1)}
                    className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-16 text-center font-bold font-mono text-sm">
                    {balanceAdjustment > 0 ? `+${balanceAdjustment}` : balanceAdjustment}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBalanceAdjustment((prev) => prev + 1)}
                    className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-[11px] text-slate-500">
                  {balanceAdjustment > 0
                    ? `إضافة ${balanceAdjustment} أيام للرصيد المتاح`
                    : balanceAdjustment < 0
                    ? `خصم ${Math.abs(balanceAdjustment)} أيام من الرصيد المتاح`
                    : 'اختر قيمة للتعديل'}
                </span>
              </div>
            )}
          </div>

          {/* 5. Hazard Allowance Batch Adjustment */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={changeHazard}
                onChange={(e) => setChangeHazard(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-indigo-500" />
                تعديل نسبة مخصصات الخطورة وطبيعة العمل للمحددين
              </span>
            </label>
            {changeHazard && (
              <div className="flex items-center gap-2 pt-1 pr-6">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={hazardPercent}
                  onChange={(e) => setHazardPercent(Number(e.target.value))}
                  className="w-24 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold font-mono text-xs"
                />
                <span className="text-slate-500 font-bold">%</span>
                <span className="text-[11px] text-slate-500">سيتم تطبيق هذه النسبة وإعادة احتساب الراتب الكلي والصافي فورياً</span>
              </div>
            )}
          </div>

          {/* 6. Optional Income Tax Batch Adjustment */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={changeTax}
                onChange={(e) => setChangeTax(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                تعديل خضوع ضريبة الدخل (اختيارية)
              </span>
            </label>
            {changeTax && (
              <div className="flex flex-wrap items-center gap-3 pt-1 pr-6 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTaxEnabled}
                    onChange={(e) => setIsTaxEnabled(e.target.checked)}
                    className="rounded text-amber-500 cursor-pointer"
                  />
                  <span>تفعيل استقطاع الضريبة</span>
                </label>
                {isTaxEnabled && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">النسبة:</span>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      step={0.5}
                      value={taxRatePercent}
                      onChange={(e) => setTaxRatePercent(Number(e.target.value))}
                      className="w-16 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center font-bold"
                    />
                    <span className="text-slate-500">%</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={
                isSaving ||
                (!changeDepartment &&
                  !changeDivision &&
                  !changeContractType &&
                  !adjustBalance &&
                  !changeGradeStage &&
                  !changeSocial &&
                  !changePosition &&
                  !changeHazard &&
                  !changeTax)
              }
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>جارٍ تطبيق التعديلات...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تطبيق على ({selectedIds.length}) موظف</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
