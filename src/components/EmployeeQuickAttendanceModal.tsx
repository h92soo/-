import React from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar } from 'lucide-react';
import { Employee } from '../types';
import { QuickMonthlyAttendanceSheet } from './QuickMonthlyAttendanceSheet';

export interface EmployeeQuickAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onEmployeesUpdated?: (employees: Employee[]) => void;
  allEmployees: Employee[];
}

export const EmployeeQuickAttendanceModal: React.FC<EmployeeQuickAttendanceModalProps> = ({
  isOpen,
  onClose,
  employee,
  onEmployeesUpdated,
  allEmployees,
}) => {
  if (!isOpen || !employee) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150 no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        id="employee-quick-attendance-modal"
        className="w-full max-w-7xl max-h-[94vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden text-right animate-in zoom-in-95 duration-150 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Quick Header Bar for this specific employee */}
        <div className="p-4 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{employee.fullName}</h3>
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                  {employee.employeeNumber || '—'}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    employee.contractType === 'permanent'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  }`}
                >
                  {employee.contractType === 'permanent' ? 'ملاك دائم' : 'عقد وزاري'}
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                <span>{employee.department} - {employee.division}</span>
                <span>|</span>
                <span>رصيد الإجازات المتبقي: <strong className="text-emerald-400 font-mono">{employee.remainingBalance || 0}</strong> يوماً</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Monthly Attendance Sheet for this employee */}
        <div className="flex-1 overflow-y-auto p-1 sm:p-2">
          <QuickMonthlyAttendanceSheet
            employees={allEmployees}
            focusedEmployeeId={employee.id}
            onEmployeesUpdated={onEmployeesUpdated}
            isModal={true}
            onClose={onClose}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};
