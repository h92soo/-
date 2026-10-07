import React, { useRef, useState } from 'react';
import {
  X,
  Printer,
  ShieldCheck,
  Building2,
  Calendar,
  CreditCard,
  User,
  CheckCircle2,
  Share2,
  Sparkles,
  QrCode,
  Fingerprint,
} from 'lucide-react';
import { Employee, OrganizationSettings, EmployeeDefinitionBadge } from '../types';
import { GovernmentEmblem } from './GovernmentEmblem';
import { BarcodeVisual, QrVisual } from './BarcodeVisual';
import { archiveService } from '../services/archiveService';
import { soundEffects } from '../utils/soundEffects';
import { toast } from './ToastNotification';

interface EmployeeDefinitionBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  organization: OrganizationSettings;
  onBadgeArchived?: (badgeDoc: any) => void;
}

export const EmployeeDefinitionBadgeModal: React.FC<EmployeeDefinitionBadgeModalProps> = ({
  isOpen,
  onClose,
  employee,
  organization,
  onBadgeArchived,
}) => {
  const [badgeSide, setBadgeSide] = useState<'front' | 'back' | 'both'>('both');
  const printRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen || !employee) return null;

  const badgeData: EmployeeDefinitionBadge = archiveService.generateEmployeeBadge(employee);

  const handlePrint = () => {
    soundEffects.playButtonClick();
    toast.success('تم إرسال بطاقة التعريف إلى أمر الطباعة.');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handleArchiveBadgeAsDocument = async () => {
    soundEffects.playSuccess();
    const docTitle = `هوية تعريف وظيفية رسمية (باج 2026 - ${employee.fullName})`;
    const saved = await archiveService.save({
      id: `DOC-BDG-${employee.id}-${Date.now().toString().slice(-4)}`,
      employeeId: employee.id,
      employeeName: employee.fullName,
      employeeNumber: employee.employeeNumber,
      department: employee.department,
      documentTitle: docTitle,
      category: 'employee_badge',
      referenceNumber: badgeData.badgeSerialNumber,
      documentDate: badgeData.issueDate,
      issuingAuthority: `${organization.ministryName} - ${organization.directorateName}`,
      fileUrl: archiveService.createMockDocumentDataUrl(
        'هوية تعريف وظيفية رسمية (باج دائم)',
        employee.fullName,
        employee.department,
        badgeData.badgeSerialNumber,
        '#4f46e5'
      ),
      fileName: `هوية_${employee.employeeNumber}.png`,
      fileType: 'image/png',
      source: 'generated_id',
      isHandwritten: false,
      ocrExtractedText: `جمهورية العراق - ${organization.ministryName}\n${organization.directorateName}\nبطاقة تعريف وهوية وظيفية\nالاسم: ${employee.fullName}\nالدرجة: ${employee.civilGrade || 7}\nالرقم الوظيفي: ${employee.employeeNumber}`,
      ocrConfidence: 99,
      detectedKeywords: ['تعريف وظيفي', 'باج رسمي', 'هوية', employee.fullName],
      ocrStatus: 'completed',
      archiveCabinet: 'خزانة الباجات / رف 1',
      archiveFolderCode: `DOS-${employee.employeeNumber}`,
      confidentiality: 'normal',
      archivedBy: 'مسؤول إصدار الهويات والتعاريف',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (onBadgeArchived) {
      onBadgeArchived(saved);
    }
    toast.success('تمت أرشفة بطاقة التعريف وحفظها مباشرة في إضبارة الموظف.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in no-print-bg">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-800/60 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                إصدار وطباعة التعريف والهوية الوظيفية الرسمية (ID Card & Badge)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                بطاقة ذكية متوافقة مع معايير الخدمة المدنية العراقية مزودة بباركود الحضور والـ QR
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar no-print */}
        <div className="px-6 py-3 bg-slate-100/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 dark:text-slate-400">عرض البطاقة:</span>
            <button
              type="button"
              onClick={() => setBadgeSide('both')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                badgeSide === 'both'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              الوجهين معاً (أمامي + خلفي)
            </button>
            <button
              type="button"
              onClick={() => setBadgeSide('front')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                badgeSide === 'front'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              الوجه الأمامي فقط
            </button>
            <button
              type="button"
              onClick={() => setBadgeSide('back')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                badgeSide === 'back'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              الوجه الخلفي فقط
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleArchiveBadgeAsDocument}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>أرشفة الهوية في الإضبارة 📁</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة فورية A4 / Card 🖨️</span>
            </button>
          </div>
        </div>

        {/* Badge Card Display Area (Printable) */}
        <div
          ref={printRef}
          id="printable-definition-badge"
          className="flex-1 overflow-y-auto p-6 sm:p-10 flex flex-wrap items-center justify-center gap-8 bg-slate-100 dark:bg-slate-950 print:bg-white print:p-0"
        >
          {/* FRONT SIDE */}
          {(badgeSide === 'front' || badgeSide === 'both') && (
            <div className="w-[330px] h-[510px] rounded-2xl bg-white text-slate-900 shadow-2xl border-2 border-indigo-600/30 overflow-hidden flex flex-col justify-between relative print:shadow-none print:border-slate-400">
              {/* Header Ribbon */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3.5 text-center relative border-b-2 border-amber-500">
                <div className="flex items-center justify-between px-1 mb-1">
                  <GovernmentEmblem
                    className="w-9 h-9 shrink-0 drop-shadow-md"
                    emblemUrl={organization.emblemUrl}
                  />
                  <div className="text-center flex-1 px-1">
                    <div className="text-[10px] font-bold tracking-wider text-slate-200">جمهورية العراق</div>
                    <div className="text-[11px] font-bold text-amber-400 leading-tight">
                      {organization.ministryName || 'وزارة الموارد المائية'}
                    </div>
                    <div className="text-[9px] text-slate-300 truncate">
                      {organization.directorateName || 'دائرة الموارد المائية'}
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                  </div>
                </div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-indigo-300 bg-black/40 py-0.5 rounded-full mt-1">
                  بطاقة تعريف وهوية وظيفية رسمية
                </div>
              </div>

              {/* Body: Photo & Employee Main Info */}
              <div className="p-4 flex flex-col items-center flex-1 justify-center space-y-3">
                {/* Avatar / Photo Frame */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-800 p-1 shadow-md">
                    <div className="w-full h-full rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 overflow-hidden">
                      <User className="w-14 h-14 text-indigo-300" />
                    </div>
                  </div>
                  <span className="absolute -bottom-2 inset-x-0 mx-auto w-max px-2 py-0.5 rounded-md bg-amber-500 text-white font-mono text-[9px] font-bold shadow-xs">
                    {employee.employeeNumber}
                  </span>
                </div>

                {/* Name & Title */}
                <div className="text-center space-y-0.5 w-full px-2">
                  <h4 className="font-bold text-sm text-slate-900 leading-tight">{employee.fullName}</h4>
                  <p className="text-xs font-semibold text-indigo-700">{employee.jobTitle}</p>
                  <p className="text-[10px] text-slate-500 truncate">{employee.department}</p>
                </div>

                {/* Grid Details */}
                <div className="w-full grid grid-cols-2 gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200 text-[10px]">
                  <div>
                    <span className="text-slate-400 block text-[9px]">الدرجة والمرحلة:</span>
                    <strong className="text-slate-800">
                      الدرجة {employee.civilGrade || 7} (م {employee.civilStage || 1})
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">نوع التوظيف:</span>
                    <strong className="text-emerald-700">ملاك دائم</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">فصيلة الدم:</span>
                    <strong className="text-rose-600 font-mono">{employee.bloodType || 'O+'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">الرقم الإحصائي:</span>
                    <strong className="font-mono text-slate-800">{employee.employeeNumber}</strong>
                  </div>
                </div>
              </div>

              {/* Front Bottom Barcode */}
              <div className="bg-slate-50 p-2.5 border-t border-slate-200 flex flex-col items-center justify-center">
                <BarcodeVisual
                  value={employee.barcodeValue || employee.employeeNumber}
                  height={32}
                  className="w-full max-w-[220px]"
                />
                <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                  رقم الهوية: {badgeData.badgeSerialNumber}
                </div>
              </div>
            </div>
          )}

          {/* BACK SIDE */}
          {(badgeSide === 'back' || badgeSide === 'both') && (
            <div className="w-[330px] h-[510px] rounded-2xl bg-white text-slate-900 shadow-2xl border-2 border-indigo-600/30 overflow-hidden flex flex-col justify-between relative print:shadow-none print:border-slate-400">
              {/* Back Top */}
              <div className="p-3 bg-slate-900 text-white text-center border-b border-indigo-500">
                <div className="text-xs font-bold text-amber-400">جمهورية العراق - وزارة الموارد المائية</div>
                <div className="text-[10px] text-slate-300">تعليمات وشروط حمل الهوية الرسمية</div>
              </div>

              {/* Instructions List */}
              <div className="p-4 flex-1 space-y-3 text-[10px] text-slate-600 leading-relaxed">
                <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-900 text-[11px] mb-1">تعليمات أمنية وإدارية:</div>
                  <p>1. تعتبر هذه الهوية وثيقة رسمية صادرة للموظف ولا يجوز استخدامها لغير الأغراض المخصصة لها.</p>
                  <p>2. يلتزم حاملها بإبرازها عند الدخول لدوائر الموارد المائية ومحطات السدود ومواقع العمل.</p>
                  <p>3. في حال فقدانها يرجى إبلاغ قسم الموارد البشرية وشعبة التصاريح الأمنية فوراً.</p>
                </div>

                {/* QR Code and Verification */}
                <div className="flex items-center gap-3 bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100">
                  <div className="bg-white p-1 rounded-lg border border-slate-200 shrink-0">
                    <QrVisual value={badgeData.qrPayload} size={64} />
                  </div>
                  <div className="text-[9px] text-slate-600 space-y-0.5">
                    <div className="font-bold text-indigo-900 text-[10px]">رمز التحقق الإلكتروني الذكي</div>
                    <div>تاريخ الإصدار: <span className="font-mono">{badgeData.issueDate}</span></div>
                    <div>تاريخ النفاذ: <span className="font-mono font-bold text-rose-600">{badgeData.expiryDate}</span></div>
                    <div className="text-emerald-700 font-bold">✓ مصدق في قاعدة البيانات</div>
                  </div>
                </div>

                {/* Official Signature */}
                <div className="pt-2 text-center">
                  <div className="text-[10px] font-bold text-slate-800">
                    {badgeData.directorSignatureTitle}
                  </div>
                  <div className="text-[9px] text-slate-500">دائرة الموارد المائية</div>
                  <div className="font-serif italic text-indigo-800 text-xs mt-1">
                    «مصادق ومختوم رسمياً»
                  </div>
                </div>
              </div>

              {/* Republic Seal Banner at Bottom */}
              <div className="bg-slate-900 text-white p-2 text-center text-[9px] font-mono border-t border-slate-800 flex items-center justify-between px-3">
                <span>SECURITY LEVEL: CIVIL-GOV</span>
                <span className="text-amber-400">IRAQ-WATER-2026</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs no-print">
          <span className="text-slate-500">
            مقاس قياسي للطباعة A4 أو بطاقات البلاستيك الحرارية (CR-80 Thermal Badge Standard).
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
