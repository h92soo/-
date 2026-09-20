import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  FileText,
  User,
  Building2,
  ShieldCheck,
  Sparkles,
  Timer,
  Save,
} from 'lucide-react';
import { Employee, AttendanceRecord, AttendanceStatus, UserAccount, LeaveType } from '../types';
import { saveAttendanceLogsBatch, saveEmployee } from '../db/indexedDB';

export interface QuickMovementActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  currentRecord?: AttendanceRecord | null;
  targetDate: string;
  currentUser?: UserAccount | null;
  onSuccess: (updatedRecord: AttendanceRecord, updatedEmployee?: Employee) => void;
}

export const QuickMovementActionModal: React.FC<QuickMovementActionModalProps> = ({
  isOpen,
  onClose,
  employee,
  currentRecord,
  targetDate,
  currentUser,
  onSuccess,
}) => {
  const [status, setStatus] = useState<AttendanceStatus>('present');
  const [leaveType, setLeaveType] = useState<LeaveType>('annual');
  const [leaveDaysCount, setLeaveDaysCount] = useState<number>(1);
  const [timePermissionMinutes, setTimePermissionMinutes] = useState<number>(60);
  const [exitTime, setExitTime] = useState<string>('11:00');
  const [returnTime, setReturnTime] = useState<string>('12:00');
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to add days to date
  const calculateEndDate = (startDateStr: string, days: number): string => {
    try {
      const parts = startDateStr.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      d.setDate(d.getDate() + Math.max(0, days - 1));
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    } catch {
      return startDateStr;
    }
  };

  // Initialize form when opened or record changes
  useEffect(() => {
    if (currentRecord) {
      setStatus(currentRecord.status);
      setLeaveType(currentRecord.leaveType || 'annual');
      setLeaveDaysCount(currentRecord.customLeaveDays || currentRecord.durationDays || 1);
      setTimePermissionMinutes(currentRecord.timePermissionMinutes || 60);
      setOrderNumber(currentRecord.orderNumber || '');
      setNotes(currentRecord.notes || '');
    } else {
      setStatus('present');
      setLeaveType('annual');
      setLeaveDaysCount(1);
      setTimePermissionMinutes(60);
      setOrderNumber('');
      setNotes('');
    }
    setError(null);
  }, [currentRecord, isOpen]);

  if (!isOpen || !employee) return null;

  const handleSelectLeaveType = (type: LeaveType) => {
    setLeaveType(type);
    if (type === 'maternity_pre_21') setLeaveDaysCount(21);
    else if (type === 'maternity_post_51') setLeaveDaysCount(51);
    else if (type === 'maternity_full_72') setLeaveDaysCount(72);
    else if (type === 'maternity_care_year') setLeaveDaysCount(365);
    else if (type === 'maternity') setLeaveDaysCount(72);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const recordId = currentRecord?.id || `REC-${employee.id}-${targetDate}-${Date.now().toString().slice(-4)}`;

      // Determine movement title
      let movementTitle = 'حاضر (دوام رسمي)';
      if (status === 'absent') {
        movementTitle = 'غياب غير مبرر';
      } else if (status === 'leave') {
        if (leaveType === 'sick') movementTitle = 'إجازة مرضية (تقرير طبي)';
        else if (leaveType === 'maternity_pre_21') movementTitle = 'إجازة الحمل قبل الوضع (21 يوماً - براتب تام)';
        else if (leaveType === 'maternity_post_51') movementTitle = 'إجازة الوضع بعد الولادة (51 يوماً - براتب تام)';
        else if (leaveType === 'maternity_full_72') movementTitle = 'إجازة الوضع التامة (72 يوماً = 21+51)';
        else if (leaveType === 'maternity_care_year') movementTitle = 'إجازة الأمومة ورعاية الطفل (سنة كاملة)';
        else if (leaveType === 'maternity') movementTitle = 'إجازة أمومة وولادة';
        else movementTitle = `إجازة اعتيادية (${leaveDaysCount} يوماً)`;
      } else if (status === 'time_permission') {
        movementTitle = `إذن زمنية (${timePermissionMinutes / 60} ساعة)`;
      } else if (status === 'mission') {
        movementTitle = 'إيفاد / مهمة رسمية';
      }

      const isMultiDay = status === 'leave' && leaveDaysCount > 1;
      const isAnnualDeduct = status === 'leave' && leaveType === 'annual';

      const newRecord: AttendanceRecord = {
        id: recordId,
        employeeId: employee.id,
        employeeName: employee.fullName,
        employeeNumber: employee.employeeNumber,
        department: employee.department,
        contractType: employee.contractType,
        date: targetDate,
        endDate: isMultiDay ? calculateEndDate(targetDate, leaveDaysCount) : undefined,
        status,
        leaveType: status === 'leave' ? leaveType : undefined,
        durationDays: status === 'leave' ? leaveDaysCount : 1,
        customLeaveDays: status === 'leave' ? leaveDaysCount : undefined,
        deductFromAnnualBalance: isAnnualDeduct,
        timePermissionMinutes: status === 'time_permission' ? timePermissionMinutes : undefined,
        orderNumber: orderNumber.trim() || undefined,
        notes: notes.trim() ? `${notes.trim()}${status === 'time_permission' ? ` [الخروج: ${exitTime}]` : ''}` : undefined,
        movementTitle,
      };

      // Save attendance log
      await saveAttendanceLogsBatch([newRecord]);

      // If status is annual leave, update employee balance
      let updatedEmployee: Employee | undefined = undefined;
      if (isAnnualDeduct) {
        const previousDeducted =
          currentRecord?.status === 'leave' && currentRecord?.leaveType === 'annual'
            ? currentRecord.customLeaveDays || currentRecord.durationDays || 1
            : 0;
        const netDiff = leaveDaysCount - previousDeducted;
        const newUsed = Math.max(0, employee.usedBalance + netDiff);
        const newRemaining = Math.max(0, employee.annualBalanceLimit - newUsed);
        updatedEmployee = {
          ...employee,
          usedBalance: newUsed,
          remainingBalance: newRemaining,
        };
        await saveEmployee(updatedEmployee);
      } else if (
        currentRecord?.status === 'leave' &&
        currentRecord.leaveType === 'annual' &&
        (!isAnnualDeduct)
      ) {
        // Revert previous annual leave deduction
        const previousDeducted = currentRecord.customLeaveDays || currentRecord.durationDays || 1;
        const newUsed = Math.max(0, employee.usedBalance - previousDeducted);
        const newRemaining = Math.min(employee.annualBalanceLimit, employee.remainingBalance + previousDeducted);
        updatedEmployee = {
          ...employee,
          usedBalance: newUsed,
          remainingBalance: newRemaining,
        };
        await saveEmployee(updatedEmployee);
      }

      onSuccess(newRecord, updatedEmployee);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'حدث خطأ أثناء حفظ الإجراء.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        id="quick-movement-modal"
        className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>تخصيص الموقف والإجراء الإداري السريع</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                التاريخ المستهدف: <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{targetDate}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Employee Summary Card */}
        <div className="p-4 mx-5 mt-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-sm">
              {employee.fullName.charAt(0)}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {employee.fullName}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span className="font-mono">{employee.employeeNumber}</span>
                <span>•</span>
                <span className={employee.contractType === 'permanent' ? 'text-amber-600 font-semibold' : 'text-blue-600 font-semibold'}>
                  {employee.contractType === 'permanent' ? 'ملاك دائم' : 'عقد وزاري'}
                </span>
                <span>•</span>
                <span>{employee.department}</span>
              </div>
            </div>
          </div>

          {/* Current Balance */}
          <div className="text-left">
            <div className="text-[10px] text-slate-400">الرصيد المتبقي:</div>
            <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {employee.remainingBalance} / {employee.annualBalanceLimit} يوم
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Status Pills */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              تحديد الحالة والموقف:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {/* 1. Present */}
              <button
                type="button"
                onClick={() => setStatus('present')}
                className={`p-2.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                  status === 'present'
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>حاضر (دوام رسمي)</span>
              </button>

              {/* 2. Leave */}
              <button
                type="button"
                onClick={() => setStatus('leave')}
                className={`p-2.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                  status === 'leave'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>إجازة رسمية</span>
              </button>

              {/* 3. Time Permission */}
              <button
                type="button"
                onClick={() => setStatus('time_permission')}
                className={`p-2.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                  status === 'time_permission'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>إذن زمنية ساعية</span>
              </button>

              {/* 4. Absent */}
              <button
                type="button"
                onClick={() => setStatus('absent')}
                className={`p-2.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                  status === 'absent'
                    ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>غياب غير مبرر</span>
              </button>
            </div>
          </div>

          {/* Conditional Options depending on Status */}
          {status === 'leave' && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
              <div>
                <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1.5">
                  نوع الإجازة (وفق قانون الخدمة المدنية وقانون العمل العراقي):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLeaveType('annual');
                    }}
                    className={`p-2 rounded-xl text-xs font-semibold text-right border transition-all cursor-pointer ${
                      leaveType === 'annual'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="font-bold">اعتيادية</div>
                    <div className="text-[10px] opacity-80">تستقطع من الرصيد</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLeaveType('sick');
                    }}
                    className={`p-2 rounded-xl text-xs font-semibold text-right border transition-all cursor-pointer ${
                      leaveType === 'sick'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="font-bold">مرضية</div>
                    <div className="text-[10px] opacity-80">تقرير طبي رسمي</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectLeaveType('maternity_pre_21')}
                    className={`p-2 rounded-xl text-xs font-semibold text-right border transition-all cursor-pointer ${
                      leaveType === 'maternity_pre_21'
                        ? 'bg-pink-600 text-white border-pink-700 shadow-xs'
                        : 'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800'
                    }`}
                  >
                    <div className="font-bold">حمل (21 يوماً)</div>
                    <div className="text-[10px] opacity-80">قبل الوضع - براتب تام</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectLeaveType('maternity_post_51')}
                    className={`p-2 rounded-xl text-xs font-semibold text-right border transition-all cursor-pointer ${
                      leaveType === 'maternity_post_51'
                        ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                        : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                    }`}
                  >
                    <div className="font-bold">وضع (51 يوماً)</div>
                    <div className="text-[10px] opacity-80">بعد الولادة - براتب تام</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectLeaveType('maternity_full_72')}
                    className={`p-2 rounded-xl text-xs font-semibold text-right border transition-all cursor-pointer ${
                      leaveType === 'maternity_full_72'
                        ? 'bg-fuchsia-600 text-white border-fuchsia-700 shadow-xs'
                        : 'bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800'
                    }`}
                  >
                    <div className="font-bold">ولادة تامة (72 يوماً)</div>
                    <div className="text-[10px] opacity-80">21 قبل + 51 بعد</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectLeaveType('maternity_care_year')}
                    className={`p-2 rounded-xl text-xs font-semibold text-right border transition-all cursor-pointer ${
                      leaveType === 'maternity_care_year'
                        ? 'bg-violet-600 text-white border-violet-700 shadow-xs'
                        : 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800'
                    }`}
                  >
                    <div className="font-bold">أمومة (365 يوماً)</div>
                    <div className="text-[10px] opacity-80">رعاية طفل (سنة)</div>
                  </button>
                </div>
              </div>

              {/* Leave Days Count & Presets */}
              <div className="pt-2 border-t border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    عدد أيام الإجازة:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={leaveDaysCount}
                      onChange={(e) => setLeaveDaysCount(Math.max(1, Number(e.target.value)))}
                      className="w-20 px-2 py-1 text-center font-mono font-bold text-xs rounded-xl border border-amber-400 dark:border-amber-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">يوماً</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 5, 21, 51, 72, 365].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setLeaveDaysCount(d)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        leaveDaysCount === d
                          ? 'bg-amber-600 text-white border-amber-700'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-amber-100'
                      }`}
                    >
                      {d === 21
                        ? '21 يوماً (حامل قبل الوضع)'
                        : d === 51
                        ? '51 يوماً (وضع بعد الولادة)'
                        : d === 72
                        ? '72 يوماً (ولادة كاملة)'
                        : d === 365
                        ? '365 يوماً (سنة أمومة)'
                        : `${d} ${d === 1 ? 'يوم' : d === 2 ? 'يومان' : 'أيام'}`}
                    </button>
                  ))}
                </div>

                {leaveDaysCount > 1 && (
                  <div className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold">
                    الفترة المحسوبة: من {targetDate} لغاية {calculateEndDate(targetDate, leaveDaysCount)}
                  </div>
                )}
              </div>

              {/* Legal Reference Note for Maternity */}
              {(leaveType.startsWith('maternity') || leaveDaysCount === 21 || leaveDaysCount === 51 || leaveDaysCount === 72 || leaveDaysCount === 365) && (
                <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-[11px] text-pink-900 dark:text-pink-200 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-pink-600" />
                    <span>سند قانوني عراقي (مادة 43 قانون الخدمة المدنية رقم 24 لسنة 1960 وقانون العمل):</span>
                  </div>
                  <p className="leading-relaxed">
                    إجازة الحمل 21 يوماً قبل الوضع، وإجازة الوضع 51 يوماً بعد الولادة براتب تام ولا تحسم من رصيد الإجازات السنوية الاعتيادية.
                  </p>
                </div>
              )}
            </div>
          )}

          {status === 'time_permission' && (
            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                  مدة الزمنية:
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTimePermissionMinutes(60)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer ${
                      timePermissionMinutes === 60 ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-700'
                    }`}
                  >
                    ساعة واحدة (60 د)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimePermissionMinutes(120)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer ${
                      timePermissionMinutes === 120 ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-700'
                    }`}
                  >
                    ساعتان (120 د)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">وقت الخروج:</label>
                  <input
                    type="time"
                    value={exitTime}
                    onChange={(e) => setExitTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">وقت العودة المقدر:</label>
                  <input
                    type="time"
                    value={returnTime}
                    onChange={(e) => setReturnTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Administrative Order Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              رقم السند أو الأمر الإداري (اختياري):
            </label>
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="مثال: أ/2026/894"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
              dir="ltr"
              style={{ textAlign: 'right' }}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ملاحظات أو مبرر الإجراء:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: مراجعة دائرة التقاعد والضمان الاجتماعي"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الحفظ...' : 'تثبيت الإجراء الإداري'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
