import React, { useState } from 'react';
import {
  Award,
  Calendar,
  FileText,
  CheckCircle2,
  X,
  Users,
  CheckSquare,
  Square,
  Printer,
} from 'lucide-react';
import { Employee, UnifiedAdministrativeOrder } from '../types';
import { employeeService } from '../services/employeeService';
import { getOfficialBaseSalary, formatIQD } from '../utils/iraqiSalaryScale';
import { toast } from './ToastNotification';

interface BatchAllowanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  dueEmployees: Employee[];
  organizationName?: string;
  onCompleted: (order: UnifiedAdministrativeOrder) => void;
}

export const BatchAllowanceModal: React.FC<BatchAllowanceModalProps> = ({
  isOpen,
  onClose,
  dueEmployees,
  organizationName = 'وزارة التعليم العالي والبحث العلمي',
  onCompleted,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    dueEmployees.map((e) => e.id)
  );
  const [orderNumber, setOrderNumber] = useState(
    `ع/ج-${Math.floor(1000 + Math.random() * 9000)}/2026`
  );
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('منح العلاوة السنوية لتوفر الشروط القانونية');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const toggleSelectAll = () => {
    if (selectedIds.length === dueEmployees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(dueEmployees.map((e) => e.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      toast.warning('يرجى تحديد موظف واحد على الأقل لمنح العلاوة السنوية.');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await employeeService.grantBatchAllowances(selectedIds, {
        orderNumber,
        orderDate,
        effectiveDate,
        grantedBy: 'مدير الموارد البشرية والخدمة المدنية',
        notes,
      });

      toast.success(
        `تم إصدار ومنح العلاوة السنوية بنجاح لعدد (${result.updatedEmployees.length}) موظفاً وتحديث السجلات والرواتب.`
      );

      // Create unified administrative order
      const unifiedOrder: UnifiedAdministrativeOrder = {
        id: `ORD-ALW-${Date.now()}`,
        type: 'allowance_batch',
        orderNumber,
        orderDate,
        effectiveDate,
        title: 'أمر إداري جماعي: منح العلاوات السنوية لموظفي الدائرة',
        ministryName: organizationName,
        directorateName: 'دائرة الموارد البشرية والخدمة المدنية',
        departmentName: 'قسم شؤون الموظفين والتقاعد',
        preamble:
          'استناداً إلى الصلاحيات المخولة لنا، ولأحكام المادة (3) من قانون رواتب موظفي الدولة والقطاع العام رقم (22) لسنة 2008 المعدل، وقانون الخدمة المدنية رقم (24) لسنة 1960 المعدل، وبناءً على إكمال المدة القانونية وتوفر الشروط القانونية وحسن السيرة والسلوك؛',
        decisionText:
          'تقرر منح الموظفين المدرجة أسماؤهم وتفاصيلهم في الجدول أدناه علاواتهم السنوية وترقيتهم إلى المراحل التالية من درجاتهم الوظيفية اعتباراً من تاريخ الاستحقاق والنفاذ المبين إزاء كل منهم:',
        items: result.executionItems.map((item, idx) => ({
          seq: idx + 1,
          employeeName: item.employeeName,
          employeeNumber: item.employeeNumber,
          department: item.department,
          col1: `الدرجة ${item.grade} - المرحلة ${item.previousStage}`,
          col2: `المرحلة الجديدة (${item.newStage})`,
          col3: formatIQD(item.newBaseSalary),
        })),
        signatoryTitle: 'المدير العام / رئيس الدائرة',
        signatoryName: 'الأستاذ مدير الموارد البشرية',
        notes: notes,
        copiesTo: [
          'مكتب المدير العام / للمعلومات',
          'قسم الحسابات والمالية / لصرف الفروقات وتعديل الراتب الاسمي',
          'قسم التدقيق والرقابة الداخلية / للإشعار',
          'الشعبة القانونية',
          'الملفات الشخصية للموظفين',
        ],
      };

      onCompleted(unifiedOrder);
      onClose();
    } catch (err: any) {
      toast.error(`فشل منح العلاوات السنوية: ${err?.message || 'خطأ'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-4xl my-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center font-bold text-white shadow-inner">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                منح العلاوات السنوية الجماعية (أمر إداري موحد)
              </h3>
              <p className="text-xs text-amber-100">
                منح وتعديل المرحلة والراتب الاسمي لجميع المستحقين المحددين بضغطة واحدة
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

        {/* Content */}
        <form onSubmit={handleExecute} className="p-6 space-y-5 overflow-y-auto text-xs">
          {/* Order Details Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                رقم الأمر الإداري الموحد *
              </label>
              <input
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold font-mono focus:ring-2 focus:ring-amber-500/40"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                تاريخ صدور الأمر *
              </label>
              <input
                type="date"
                required
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                تاريخ النفاذ والاستحقاق *
              </label>
              <input
                type="date"
                required
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono"
              />
            </div>
          </div>

          {/* List of Candidates */}
          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-600" />
                الموظفون المشمولون بالعلاوة السنوية ({selectedIds.length} من {dueEmployees.length})
              </span>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-[11px] font-bold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {selectedIds.length === dueEmployees.length ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                <span>{selectedIds.length === dueEmployees.length ? 'إلغاء تحديد الكل' : 'تحديد جميع المستحقين'}</span>
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold sticky top-0">
                  <tr>
                    <th className="p-2.5 w-10 text-center">تحديد</th>
                    <th className="p-2.5">الموظف والرقم الوظيفي</th>
                    <th className="p-2.5">القسم</th>
                    <th className="p-2.5">الدرجة / المرحلة الحالية</th>
                    <th className="p-2.5 text-amber-600">المرحلة الجديدة</th>
                    <th className="p-2.5 font-mono">الراتب الاسمي الجديد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dueEmployees.map((emp) => {
                    const isChecked = selectedIds.includes(emp.id);
                    const grade = emp.civilGrade || 7;
                    const curStage = emp.civilStage || 1;
                    const nextStage = Math.min(11, curStage + 1);
                    const newBaseSalary = getOfficialBaseSalary(grade, nextStage);

                    return (
                      <tr
                        key={emp.id}
                        onClick={() => toggleSelect(emp.id)}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors ${
                          isChecked ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''
                        }`}
                      >
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                          />
                        </td>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {emp.fullName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {emp.employeeNumber}
                          </div>
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400">
                          {emp.department}
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400">
                          الدرجة {grade} / المرحلة {curStage}
                        </td>
                        <td className="p-2.5 font-bold text-amber-600 dark:text-amber-400">
                          المرحلة {nextStage}
                        </td>
                        <td className="p-2.5 font-bold font-mono text-slate-900 dark:text-white">
                          {formatIQD(newBaseSalary)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
              ملاحظات أو توجيهات إدارية
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isProcessing || selectedIds.length === 0}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md shadow-amber-600/20 active:scale-98 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isProcessing
                  ? 'جاري إصدار الأمر...'
                  : `إصدار الأمر الإداري ومنح العلاوة لـ (${selectedIds.length}) موظفاً`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
