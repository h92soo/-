import React, { useState } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  X,
  Users,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Employee, UnifiedAdministrativeOrder } from '../types';
import { employeeService } from '../services/employeeService';
import { getOfficialBaseSalary, formatIQD, IRAQI_SALARY_SCALE } from '../utils/iraqiSalaryScale';
import { toast } from './ToastNotification';

interface BatchPromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  dueEmployees: Employee[];
  organizationName?: string;
  onCompleted: (order: UnifiedAdministrativeOrder) => void;
}

export const BatchPromotionModal: React.FC<BatchPromotionModalProps> = ({
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
    `ت/ج-${Math.floor(1000 + Math.random() * 9000)}/2026`
  );
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('ترفيع وظيفي لإكمال المدة القانونية واجتياز تقييم الأداء');
  const [isProcessing, setIsProcessing] = useState(false);

  // Custom titles per employee if needed
  const [customTitles, setCustomTitles] = useState<Record<string, string>>({});

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
      toast.warning('يرجى تحديد موظف واحد على الأقل لإصدار الترفيع.');
      return;
    }

    setIsProcessing(true);
    try {
      const promotionsPayload = selectedIds.map((id) => {
        const emp = dueEmployees.find((e) => e.id === id)!;
        const curGrade = emp.civilGrade || 7;
        const nextGrade = Math.max(1, curGrade - 1);
        const gradeDef = IRAQI_SALARY_SCALE[nextGrade];
        const defaultTitle =
          customTitles[id] ||
          (gradeDef && gradeDef.sampleTitles.length > 0
            ? gradeDef.sampleTitles[0]
            : `${emp.jobTitle} (درجة ${nextGrade})`);

        return {
          employeeId: emp.id,
          newGrade: nextGrade,
          newTitle: defaultTitle,
          newBaseSalary: getOfficialBaseSalary(nextGrade, 1),
        };
      });

      const result = await employeeService.promoteBatchEmployees(promotionsPayload, {
        orderNumber,
        orderDate,
        effectiveDate,
        promotedBy: 'مدير الموارد البشرية والخدمة المدنية',
        notes,
      });

      toast.success(
        `تم إصدار وتوثيق الترفيعات الوظيفية بنجاح لعدد (${result.updatedEmployees.length}) موظفاً وتعديل درجاتهم ورواتبهم.`
      );

      const unifiedOrder: UnifiedAdministrativeOrder = {
        id: `ORD-PRM-${Date.now()}`,
        type: 'promotion_batch',
        orderNumber,
        orderDate,
        effectiveDate,
        title: 'أمر إداري جماعي: ترفيع موظفي الدائرة إلى درجات وظيفية أعلى',
        ministryName: organizationName,
        directorateName: 'دائرة الموارد البشرية والخدمة المدنية',
        departmentName: 'قسم الملاك والترفيعات المركزية',
        preamble:
          'استناداً إلى أحكام قانون الخدمة المدنية رقم (24) لسنة 1960 المعدل، وقانون رواتب موظفي الدولة رقم (22) لسنة 2008 المعدل، وبناءً على إكمال المدة المقررة للترفيع وتوفر العنوان الشاغر في الملاك وموافقة لجنة الترفيعات المركزية؛',
        decisionText:
          'تقرر ترفيع الموظفين المذكورة أسماؤهم وتفاصيلهم في القائمة أدناه من درجاتهم وعناوينهم الحالية إلى الدرجات والعناوين الوظيفية الجديدة المبينة إزاء كل منهم وتعديل رواتبهم الاسمية اعتباراً من تاريخ النفاذ:',
        items: result.executionItems.map((item, idx) => ({
          seq: idx + 1,
          employeeName: item.employeeName,
          employeeNumber: item.employeeNumber,
          department: item.department,
          col1: `الدرجة السابقة (${item.previousGrade}) - ${item.previousTitle}`,
          col2: `الدرجة الجديدة (${item.newGrade})`,
          col3: formatIQD(item.newBaseSalary),
          col4: item.newTitle,
        })),
        signatoryTitle: 'المدير العام / رئيس الدائرة',
        signatoryName: 'الأستاذ مدير الموارد البشرية',
        notes,
        copiesTo: [
          'مكتب معالي الوزير / المدير العام',
          'قسم الحسابات / لتعديل الراتب وصرف الفروقات',
          'قسم التدقيق والرقابة المالية',
          'الشعبة القانونية',
          'أضابير الموظفين المشمولين',
        ],
      };

      onCompleted(unifiedOrder);
      onClose();
    } catch (err: any) {
      toast.error(`فشل إصدار الترفيعات الجماعية: ${err?.message || 'خطأ'}`);
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
        <div className="p-5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center font-bold text-white shadow-inner">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                إصدار الترفيعات الوظيفية الجماعية (أمر إداري موحد)
              </h3>
              <p className="text-xs text-indigo-100">
                ترفيع الموظفين الذين أكملوا المدة القانونية (4 أو 5 سنوات) إلى درجات وعناوين أعلى
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
                رقم أمر الترفيع الموحد *
              </label>
              <input
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold font-mono focus:ring-2 focus:ring-indigo-500/40"
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
                <Users className="w-4 h-4 text-indigo-600" />
                الموظفون المستحقون للترفيع ({selectedIds.length} من {dueEmployees.length})
              </span>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
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
                    <th className="p-2.5">الموظف والقسم</th>
                    <th className="p-2.5">الدرجة الحالية والسنوات</th>
                    <th className="p-2.5 text-indigo-600">الدرجة الجديدة</th>
                    <th className="p-2.5">العنوان الوظيفي الجديد المقترح</th>
                    <th className="p-2.5 font-mono">الراتب الاسمي الجديد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dueEmployees.map((emp) => {
                    const isChecked = selectedIds.includes(emp.id);
                    const curGrade = emp.civilGrade || 7;
                    const nextGrade = Math.max(1, curGrade - 1);
                    const gradeDef = IRAQI_SALARY_SCALE[nextGrade];
                    const defaultNewTitle =
                      customTitles[emp.id] ||
                      (gradeDef && gradeDef.sampleTitles.length > 0
                        ? gradeDef.sampleTitles[0]
                        : `${emp.jobTitle} (أقدم)`);
                    const newBaseSalary = getOfficialBaseSalary(nextGrade, 1);

                    return (
                      <tr
                        key={emp.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                          isChecked ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                        }`}
                      >
                        <td className="p-2.5 text-center" onClick={() => toggleSelect(emp.id)}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                          />
                        </td>
                        <td className="p-2.5" onClick={() => toggleSelect(emp.id)}>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {emp.fullName}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {emp.department} • {emp.employeeNumber}
                          </div>
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400" onClick={() => toggleSelect(emp.id)}>
                          الدرجة {curGrade} ({emp.yearsInCurrentGrade || 4} سنوات)
                        </td>
                        <td className="p-2.5 font-bold text-indigo-600 dark:text-indigo-400" onClick={() => toggleSelect(emp.id)}>
                          الدرجة {nextGrade}
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={customTitles[emp.id] ?? defaultNewTitle}
                            onChange={(e) =>
                              setCustomTitles((prev) => ({
                                ...prev,
                                [emp.id]: e.target.value,
                              }))
                            }
                            className="w-full px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                          />
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
              السند القانوني والملاحظات
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
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 active:scale-98 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isProcessing
                  ? 'جاري إصدار الترفيعات...'
                  : `إصدار الأمر الإداري وترفيع (${selectedIds.length}) موظفاً`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
