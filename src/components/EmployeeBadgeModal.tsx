import React, { useRef } from 'react';
import {
  Printer,
  X,
  Building2,
  Calendar,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  Download,
  Share2,
} from 'lucide-react';
import { Employee, OrganizationSettings } from '../types';
import { GovernmentEmblem } from './GovernmentEmblem';
import { BarcodeVisual, QrVisual } from './BarcodeVisual';
import { employeeService } from '../services/employeeService';
import { toast } from './ToastNotification';

interface EmployeeBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  organization: OrganizationSettings;
  onBadgePrinted?: (employee: Employee) => void;
}

export const EmployeeBadgeModal: React.FC<EmployeeBadgeModalProps> = ({
  isOpen,
  onClose,
  employee,
  organization,
  onBadgePrinted,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !employee) return null;

  const handlePrint = async () => {
    // Mark badge as printed in master employee record
    try {
      const updated = await employeeService.save({
        ...employee,
        barcodeBadgePrinted: true,
      });
      if (onBadgePrinted) {
        onBadgePrinted(updated);
      }
      toast.success('تم إرسال بطاقة الهوية إلى أمر الطباعة بنجاح.');
    } catch (err) {
      console.error(err);
    }
    window.print();
  };

  const handleRegenerate = async () => {
    if (confirm(`هل أنت متأكد من رغبتك بإعادة إصدار باركود جديد للموظف (${employee.fullName}) وإبطال الرمز القديم؟`)) {
      try {
        const updated = await employeeService.regenerateBarcode(employee.id);
        toast.success(`تم توليد باركود جديد بنجاح: ${updated.barcodeValue}`);
      } catch (err) {
        toast.error('فشل إعادة توليد الباركود');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in no-print-bg">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                بطاقة الهوية والتعريف الرسمية (Badge ID)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                مقاس قياسي مخصص للطباعة والتعليق مع الباركود والـ QR الموحد
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Printable Preview Area */}
        <div className="p-6 overflow-y-auto flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950">
          {/* Printable Badge Card */}
          <div
            ref={printRef}
            id="printable-badge"
            className="w-[340px] rounded-2xl bg-white text-slate-900 shadow-xl border-2 border-slate-300 relative overflow-hidden flex flex-col print:shadow-none print:border print:m-0"
            style={{ minHeight: '480px' }}
          >
            {/* Iraqi Flag Strip Top Header */}
            <div className="h-2 w-full flex">
              <div className="w-1/3 bg-rose-600" />
              <div className="w-1/3 bg-white" />
              <div className="w-1/3 bg-slate-900" />
            </div>

            {/* Ministry & Directorate Emblem */}
            <div className="p-4 text-center border-b border-slate-100 bg-gradient-to-b from-amber-50/50 to-white">
              <div className="flex justify-center mb-1.5">
                <GovernmentEmblem size="sm" />
              </div>
              <div className="text-[11px] font-bold text-slate-800 tracking-tight">
                {organization.ministryName || 'جمهورية العراق'}
              </div>
              <div className="text-[10px] text-slate-500 font-semibold truncate">
                {organization.directorateName || 'دائرة الموارد البشرية والخدمة المدنية'}
              </div>
            </div>

            {/* Employee Photo & Identification */}
            <div className="p-4 flex flex-col items-center text-center flex-1">
              {/* Photo Frame */}
              <div className="w-24 h-24 rounded-2xl border-2 border-amber-500/40 p-1 shadow-inner bg-slate-50 mb-3 relative">
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white text-2xl font-black shadow-xs">
                  {employee.fullName.charAt(0)}
                </div>
                <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-emerald-500 text-white border-2 border-white">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Full Name & Job Title */}
              <h4 className="text-base font-black text-slate-900 leading-tight">
                {employee.fullName}
              </h4>
              <div className="text-xs font-bold text-amber-700 mt-0.5">
                {employee.jobTitle}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {employee.department} {employee.division ? `— ${employee.division}` : ''}
              </div>

              {/* Number and Grade Pill */}
              <div className="mt-3 flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                  ت: {employee.employeeNumber}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  {employee.contractType === 'permanent' ? 'ملاك دائم' : 'عقد وزاري'}
                </span>
                {employee.civilGrade && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 font-mono">
                    درجة {employee.civilGrade}
                  </span>
                )}
              </div>

              {/* Barcode & QR Code Section */}
              <div className="mt-4 pt-3 border-t border-slate-100 w-full flex items-center justify-between px-2 gap-2">
                {/* QR Code */}
                <div className="shrink-0">
                  <QrVisual value={employee.barcodeValue || employee.employeeNumber} size={64} />
                </div>
                {/* Barcode Lines */}
                <div className="flex-1 flex justify-center">
                  <BarcodeVisual
                    value={employee.barcodeValue || employee.employeeNumber}
                    width={170}
                    height={42}
                  />
                </div>
              </div>
            </div>

            {/* Official Badge Footer */}
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
              <span>سنة التشغيل: 2026</span>
              <span className="font-mono">معرف موحد: {employee.id}</span>
              <span>بطاقة رسمية معتمدة</span>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleRegenerate}
            className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer"
            title="إبطال الباركود الحالي وتوليد كود جديد للموظف عند فقدان البطاقة"
          >
            إعادة إصدار باركود جديد
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              إغلاق
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة بطاقة الهوية (A4 / Badge)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
