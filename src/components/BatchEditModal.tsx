import React, { useState } from 'react';
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
} from 'lucide-react';
import { Employee, ContractType } from '../types';
import { updateEmployeesBatch } from '../db/indexedDB';

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

  const [division, setDivision] = useState('');
  const [changeDivision, setChangeDivision] = useState(false);

  const [contractType, setContractType] = useState<ContractType>('permanent');
  const [changeContractType, setChangeContractType] = useState(false);

  const [balanceAdjustment, setBalanceAdjustment] = useState<number>(0);
  const [adjustBalance, setAdjustBalance] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedEmployees = employees.filter((e) => selectedIds.includes(e.id));

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

    setIsSaving(true);
    setError(null);

    try {
      let count = 0;
      if (adjustBalance && balanceAdjustment !== 0) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
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
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {error}
            </div>
          )}

          {/* Department update */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={changeDepartment}
                onChange={(e) => setChangeDepartment(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              <span>تغيير القسم / التشكيل الإداري</span>
            </label>
            {changeDepartment && (
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
              disabled={isSaving || (!changeDepartment && !changeDivision && !changeContractType && !adjustBalance)}
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
    </div>
  );
}
