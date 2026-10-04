import * as XLSX from 'xlsx';
import { AttendanceRecord, Employee, EmploymentTypeLabelsSettings } from '../types';
import { getContractTypeLabel } from './contractTypeUtils';

export interface ReportExportOptions {
  reportTitle?: string;
  reportScope?: 'daily' | 'weekly' | 'monthly' | 'custom';
  selectedDate?: string;
  selectedMonth?: string;
  startDate?: string;
  endDate?: string;
  departmentName?: string;
  contractFilter?: string;
  employmentLabels?: EmploymentTypeLabelsSettings;
  stats?: {
    total: number;
    present: number;
    absent: number;
    leave: number;
    timePerm: number;
    totalTimeHours?: number;
    sickLeaves?: number;
    missions?: number;
  };
  includeSignatures?: boolean;
  includeStatsSummary?: boolean;
  includeAttribution?: boolean;
  signatories?: {
    organizerTitle?: string;
    organizerName?: string;
    hrManagerTitle?: string;
    hrManagerName?: string;
    directorTitle?: string;
    directorName?: string;
  };
}

export const OFFICIAL_DESIGNER_CREDIT =
  'صمم بإدارة المبرمج والمهندس حسين عبد المنذر 07711145014 انستا تليكرام واتساب ع المعرف @h92so';

/**
 * Returns the Arabic day of the week for a given YYYY-MM-DD date string
 */
export function getArabicDayOfWeek(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[d.getDay()] || '—';
  } catch {
    return '—';
  }
}

/**
 * Format Arabic status string
 */
export function getArabicStatusText(record: AttendanceRecord): string {
  if (record.movementTitle) return record.movementTitle;
  switch (record.status) {
    case 'present':
      return 'حاضر (دوام رسمي)';
    case 'absent':
      return 'غياب غير مبرر';
    case 'leave':
      return `إجازة (${record.leaveType === 'sick' ? 'مرضية' : record.leaveType === 'maternity' ? 'أمومة' : 'اعتيادية'})`;
    case 'time_permission':
      return `إذن زمنية (${record.timePermissionMinutes ? record.timePermissionMinutes / 60 + ' ساعة' : 'ساعية'})`;
    case 'mission':
      return 'إيفاد / مهمة رسمية';
    case 'official_holiday':
      return 'عطلة رسمية معتمدة';
    case 'duty':
      return 'واجب أو خفارة';
    default:
      return 'دوام رسمي';
  }
}

/**
 * Generate official filename based on report type and date
 */
export function generateReportFilename(options: ReportExportOptions, extension: 'xlsx' | 'pdf' = 'xlsx'): string {
  let datePart = options.selectedDate || new Date().toISOString().slice(0, 10);
  let scopePart = 'اليومي';

  if (options.reportScope === 'monthly') {
    datePart = options.selectedMonth || new Date().toISOString().slice(0, 7);
    scopePart = 'الشهري';
  } else if (options.reportScope === 'weekly') {
    datePart = options.selectedDate || new Date().toISOString().slice(0, 10);
    scopePart = 'الأسبوعي';
  } else if (options.reportScope === 'custom') {
    datePart = `من_${options.startDate || 'بداية'}_إلى_${options.endDate || 'نهاية'}`;
    scopePart = 'المحدد_بتاريخ';
  }

  return `تقرير_حركات_الموقف_${scopePart}_${datePart}.${extension}`;
}

/**
 * Export data to Excel (.xlsx) with Iraqi Ministerial Header, Statistical Summary,
 * Official Signatures, and Developer Attribution
 */
export function exportMovementsToExcel(
  records: AttendanceRecord[],
  options: ReportExportOptions = {}
): string {
  const {
    reportTitle = 'تقرير موقف الدوام وحركات الكوادر الرسمية',
    reportScope = 'daily',
    selectedDate = new Date().toISOString().slice(0, 10),
    selectedMonth = new Date().toISOString().slice(0, 7),
    startDate,
    endDate,
    departmentName = 'كافة التشكيلات والأقسام',
    stats,
    includeSignatures = true,
    includeStatsSummary = true,
    includeAttribution = true,
    signatories = {
      organizerTitle: 'منظم التقرير (مسؤول البصمة والحركات)',
      hrManagerTitle: 'مسؤول شعبة إدارة الموارد البشرية',
      directorTitle: 'مصادقة السيد مدير الدائرة',
    },
  } = options;

  const aoa: any[][] = [];

  // 1. Official Ministerial Header
  aoa.push(['جمهورية العراق']);
  aoa.push(['وزارة الموارد المائية']);
  aoa.push(['المديرية العامة لتشغيل وصيانة حوض نهر دجلة / تشكيل بغداد']);
  aoa.push(['شعبة إدارة الموارد البشرية والخدمة المدنية']);
  aoa.push(['السنة المالية والتشغيلية: 2026']);
  aoa.push([]); // blank

  // 2. Report Title & Scope
  aoa.push([reportTitle]);
  const scopeInfo =
    reportScope === 'monthly'
      ? `نطاق التقرير: شهري (شهر: ${selectedMonth})`
      : reportScope === 'weekly'
      ? `نطاق التقرير: أسبوعي (ابتداءً من: ${selectedDate})`
      : reportScope === 'custom'
      ? `نطاق التقرير: محدد حسب التاريخ (من: ${startDate || '—'} إلى: ${endDate || '—'})`
      : `نطاق التقرير: يومي (تاريخ: ${selectedDate} - يوم: ${getArabicDayOfWeek(selectedDate)})`;

  aoa.push([scopeInfo, '', `القسم / التشكيل: ${departmentName}`, '', `تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-IQ')} ${new Date().toLocaleTimeString('ar-IQ')}`]);
  aoa.push([]); // blank

  // 3. Table Column Headers
  // As explicitly required: Sequence number (#Seq), Name, Contract type ONLY (strictly exclude job title)
  const headers = [
    'ت',
    'الرقم الوظيفي',
    'اسم الموظف الرباعي واللقب',
    'نوع الملاك والتوظيف',
    'القسم / التشكيل',
    'نوع الحركة / الموقف',
    'اليوم',
    'التاريخ',
    'مدة الإذن الزمني',
    'رقم السند الإداري / الملاحظات',
  ];
  aoa.push(headers);

  // 4. Data Rows
  records.forEach((r, idx) => {
    const contractText = getContractTypeLabel(r.contractType, options.employmentLabels);
    const dayName = getArabicDayOfWeek(r.date);
    const statusText = getArabicStatusText(r);
    const timePerm = r.timePermissionMinutes
      ? `${r.timePermissionMinutes} دقيقة (${(r.timePermissionMinutes / 60).toFixed(1)} ساعة)`
      : '—';
    const notesAndOrder = [r.orderNumber ? `أمر: ${r.orderNumber}` : '', r.notes || ''].filter(Boolean).join(' - ') || '—';

    aoa.push([
      idx + 1,
      r.employeeNumber || '—',
      r.employeeName || (r as any).fullName || '—',
      contractText,
      r.department || '—',
      statusText,
      dayName,
      r.date,
      timePerm,
      notesAndOrder,
    ]);
  });

  // 5. Statistical Summary Block
  if (includeStatsSummary) {
    aoa.push([]); // blank
    aoa.push(['=== الملخص الإحصائي المعتمد للموقف ===']);
    
    const countTotal = records.length;
    const countPresent = stats?.present ?? records.filter((r) => r.status === 'present').length;
    const countAbsent = stats?.absent ?? records.filter((r) => r.status === 'absent').length;
    const countLeaves = stats?.leave ?? records.filter((r) => r.status === 'leave').length;
    const countTimePerms = stats?.timePerm ?? records.filter((r) => r.status === 'time_permission').length;
    const count1Hr = records.filter((r) => r.status === 'time_permission' && (r.timePermissionMinutes === 60 || (r.timePermissionMinutes || 0) <= 60)).length;
    const count2Hr = records.filter((r) => r.status === 'time_permission' && (r.timePermissionMinutes || 0) > 60).length;
    const countMissions = stats?.missions ?? records.filter((r) => r.status === 'mission').length;

    aoa.push(['إجمالي الكوادر المستهدفة:', countTotal, 'الحضور الفعلي الملتزم:', countPresent]);
    aoa.push(['الغياب غير المبرر:', countAbsent, 'الإجازات الرسمية المعتمدة:', countLeaves]);
    aoa.push(['أذونات زمنية (ساعة واحدة):', count1Hr, 'أذونات زمنية (ساعتان):', count2Hr]);
    aoa.push(['إجمالي حالات الزمنيات:', countTimePerms, 'الإيفادات والمهام الرسمية:', countMissions]);
  }

  // 6. Official Signatures
  if (includeSignatures) {
    aoa.push([]); // blank
    aoa.push([]); // blank
    aoa.push([
      signatories.organizerTitle || 'منظم التقرير (مسؤول البصمة)',
      '',
      signatories.hrManagerTitle || 'مسؤول شعبة إدارة الموارد البشرية',
      '',
      signatories.directorTitle || 'مصادقة السيد مدير الدائرة',
    ]);
    aoa.push([
      '(التوقيع والختم)',
      '',
      '(التوقيع والختم)',
      '',
      '(التوقيع والختم)',
    ]);
  }

  // 7. Developer Attribution Footer
  if (includeAttribution) {
    aoa.push([]); // blank
    aoa.push([OFFICIAL_DESIGNER_CREDIT]);
  }

  // Create Sheet & Workbook
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Define Column Widths
  ws['!cols'] = [
    { wch: 6 },  // ت
    { wch: 14 }, // الرقم الوظيفي
    { wch: 28 }, // اسم الموظف
    { wch: 20 }, // نوع الملاك
    { wch: 26 }, // القسم
    { wch: 22 }, // نوع الحركة
    { wch: 10 }, // اليوم
    { wch: 12 }, // التاريخ
    { wch: 16 }, // مدة الإذن
    { wch: 32 }, // الملاحظات
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الموقف_اليومي_والحركات');

  const filename = generateReportFilename(options, 'xlsx');
  XLSX.writeFile(wb, filename);

  return filename;
}

export interface ComprehensiveExcelExportOptions {
  reportTitle?: string;
  departmentName?: string;
  employmentLabels?: EmploymentTypeLabelsSettings;
  signatories?: {
    organizerTitle?: string;
    organizerName?: string;
    hrManagerTitle?: string;
    hrManagerName?: string;
    directorTitle?: string;
    directorName?: string;
  };
}

/**
 * Automatically calculates ideal column widths based on contents and headers.
 */
function calculateAutoColumnWidths(aoa: any[][], defaultMinWidth = 10): { wch: number }[] {
  const colWidths: number[] = [];
  aoa.forEach((row) => {
    if (!Array.isArray(row)) return;
    row.forEach((cell, colIdx) => {
      const cellStr = cell != null ? String(cell) : '';
      const len = cellStr.length;
      colWidths[colIdx] = Math.max(colWidths[colIdx] || defaultMinWidth, len + 3);
    });
  });
  return colWidths.map((w) => ({ wch: Math.min(Math.max(w, defaultMinWidth), 60) }));
}

/**
 * Comprehensive export of ALL employees AND current movements into a single,
 * auto-formatted multi-sheet Excel (.xlsx) workbook ready for spreadsheet software.
 */
export function exportComprehensiveExcel(
  employees: import('../types').Employee[],
  records: AttendanceRecord[] = [],
  options: ComprehensiveExcelExportOptions = {}
): string {
  const wb = XLSX.utils.book_new();
  const dateStamp = new Date().toISOString().slice(0, 10);
  const timeStamp = new Date().toLocaleTimeString('ar-IQ');
  const dateFormattedAr = new Date().toLocaleDateString('ar-IQ');

  // =========================================================================
  // SHEET 1: سجل الموظفين والملاك (Employees & Staff Registry)
  // =========================================================================
  const empAoa: any[][] = [];
  empAoa.push(['جمهورية العراق']);
  empAoa.push(['وزارة الموارد المائية - المديرية العامة لتشغيل وصيانة حوض نهر دجلة']);
  empAoa.push(['شعبة إدارة الموارد البشرية والخدمة المدنية']);
  empAoa.push(['السجل العام الرسمي لكافة الكوادر والموظفين والملاك']);
  empAoa.push([
    `تاريخ التصدير: ${dateFormattedAr} (${timeStamp})`,
    '',
    `إجمالي الموظفين المسجلين: ${employees.length} موظفاً`,
    '',
    `الجهة المصدرة: منظومة إدارة شؤون الموظفين الرسمية`,
  ]);
  empAoa.push([]); // blank

  // Employee Table Headers
  const empHeaders = [
    'ت',
    'الرقم الوظيفي',
    'اسم الموظف الرباعي واللقب',
    'القسم / التشكيل',
    'الشعبة / الوحدة',
    'العنوان الوظيفي',
    'نوع الملاك والتوظيف',
    'تاريخ المباشرة والتعيين',
    'رصيد الإجازات السنوي (يوم)',
    'الرصيد المستهلك (يوم)',
    'الرصيد المتبقي (يوم)',
    'الاستحقاق الشهري (أيام/شهر)',
    'هل الإجازة تراكمية؟',
    'رقم الهاتف',
    'الملاحظات والأوامر الإدارية',
  ];
  empAoa.push(empHeaders);

  let totalAnnual = 0;
  let totalUsed = 0;
  let totalRemaining = 0;

  employees.forEach((emp, idx) => {
    const contractLabel = getContractTypeLabel(emp.contractType, options?.employmentLabels);

    const annual = Number(emp.annualBalanceLimit) || 0;
    const used = Number(emp.usedBalance) || 0;
    const remaining = Number(emp.remainingBalance) || 0;
    const monthlyRate = Number(emp.monthlyRate) || 0;

    totalAnnual += annual;
    totalUsed += used;
    totalRemaining += remaining;

    empAoa.push([
      idx + 1,
      emp.employeeNumber || '—',
      emp.fullName || '—',
      emp.department || '—',
      emp.division || '—',
      emp.jobTitle || '—',
      contractLabel,
      emp.hireDate || '—',
      annual,
      used,
      remaining,
      monthlyRate,
      emp.isAccumulative ? 'نعم (تراكمي)' : 'لا (سنوي)',
      emp.phone || '—',
      emp.notes || '—',
    ]);
  });

  // Employee Summary Row
  empAoa.push([]);
  empAoa.push([
    'المجموع الإجمالي للأرصدة',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    totalAnnual,
    totalUsed,
    totalRemaining,
    '',
    '',
    '',
    '',
  ]);
  empAoa.push([]);
  empAoa.push([OFFICIAL_DESIGNER_CREDIT]);

  const wsEmployees = XLSX.utils.aoa_to_sheet(empAoa);
  wsEmployees['!cols'] = calculateAutoColumnWidths(empAoa, 12);
  wsEmployees['!views'] = [{ RTL: true }];
  XLSX.utils.book_append_sheet(wb, wsEmployees, 'سجل_الموظفين_والملاك');

  // =========================================================================
  // SHEET 2: حركات ومواقف الدوام الحالية (Attendance & Movements)
  // =========================================================================
  const movAoa: any[][] = [];
  movAoa.push(['جمهورية العراق']);
  movAoa.push(['وزارة الموارد المائية - إدارة الموارد البشرية']);
  movAoa.push(['سجل حركات ومواقف الدوام، الإجازات الرسمية، الأذونات الزمنية، والإيفادات']);
  movAoa.push([
    `تاريخ استخراج الحركات: ${dateFormattedAr} (${timeStamp})`,
    '',
    `إجمالي الحركات المسجلة: ${records.length} حركة`,
  ]);
  movAoa.push([]); // blank

  // Movement Table Headers
  const movHeaders = [
    'ت',
    'الرقم الوظيفي',
    'اسم الموظف الرباعي واللقب',
    'نوع الملاك والتوظيف',
    'القسم / التشكيل',
    'نوع الحركة / الموقف',
    'تاريخ الحركة',
    'اليوم',
    'وقت البصمة / الحضور',
    'وقت الانصراف',
    'مدة الإذن الزمني (دقيقة)',
    'مدة الإذن الزمني (ساعات)',
    'رقم السند / الأمر الإداري',
    'الملاحظات والتوجيهات',
  ];
  movAoa.push(movHeaders);

  records.forEach((r, idx) => {
    const contractText = getContractTypeLabel(r.contractType, options?.employmentLabels);

    const dayName = getArabicDayOfWeek(r.date);
    const statusText = getArabicStatusText(r);
    const timeMinutes = r.timePermissionMinutes || 0;
    const timeHours = timeMinutes > 0 ? Number((timeMinutes / 60).toFixed(1)) : 0;
    const notesAndOrder = [r.orderNumber ? `أمر: ${r.orderNumber}` : '', r.notes || ''].filter(Boolean).join(' - ') || '—';

    movAoa.push([
      idx + 1,
      r.employeeNumber || '—',
      r.employeeName || (r as any).fullName || '—',
      contractText,
      r.department || '—',
      statusText,
      r.date,
      dayName,
      r.startTime || '—',
      r.endTime || '—',
      timeMinutes > 0 ? `${timeMinutes} دقيقة` : '—',
      timeHours,
      r.orderNumber || '—',
      notesAndOrder,
    ]);
  });

  movAoa.push([]);
  movAoa.push([OFFICIAL_DESIGNER_CREDIT]);

  const wsMovements = XLSX.utils.aoa_to_sheet(movAoa);
  wsMovements['!cols'] = calculateAutoColumnWidths(movAoa, 12);
  wsMovements['!views'] = [{ RTL: true }];
  XLSX.utils.book_append_sheet(wb, wsMovements, 'حركات_ومواقف_الدوام');

  // =========================================================================
  // SHEET 3: الملخص الإحصائي المعتمد (Executive KPI Summary)
  // =========================================================================
  const statAoa: any[][] = [];
  statAoa.push(['جمهورية العراق - كشف المؤشرات الإحصائية العامة للمنظومة والملاك']);
  statAoa.push([`تاريخ الإصدار والتوثيق: ${dateFormattedAr} ${timeStamp}`]);
  statAoa.push([]); // blank

  const permCount = employees.filter((e) => e.contractType === 'permanent').length;
  const contCount = employees.filter((e) => e.contractType === 'contract').length;
  const otherCount = employees.length - permCount - contCount;

  const countPresent = records.filter((r) => r.status === 'present').length;
  const countAbsent = records.filter((r) => r.status === 'absent').length;
  const countLeave = records.filter((r) => r.status === 'leave').length;
  const countSick = records.filter((r) => r.status === 'leave' && r.leaveType === 'sick').length;
  const countTimePerm = records.filter((r) => r.status === 'time_permission').length;
  const totalTimeMinutes = records.reduce((acc, curr) => acc + (curr.timePermissionMinutes || 0), 0);
  const totalTimeHours = (totalTimeMinutes / 60).toFixed(1);
  const countMission = records.filter((r) => r.status === 'mission').length;

  statAoa.push(['=== أولاً: إحصائيات الكوادر والملاك ===', '']);
  statAoa.push(['إجمالي موظفي المنظومة المسجلين', employees.length]);
  statAoa.push(['عدد موظفي الملاك الدائم', permCount]);
  statAoa.push(['عدد موظفي العقود الوزارية (قرار 315)', contCount]);
  if (otherCount > 0) {
    statAoa.push(['موظفون بصيغ تعيين أخرى', otherCount]);
  }
  statAoa.push([]);

  statAoa.push(['=== ثانياً: إحصائيات رصيد الإجازات السنوية ===', '']);
  statAoa.push(['إجمالي الأرصدة السنوية المخصصة (يوم)', totalAnnual]);
  statAoa.push(['إجمالي الأرصدة المستهلكة رسمياً (يوم)', totalUsed]);
  statAoa.push(['صافي الأرصدة المتبقية المتاحة (يوم)', totalRemaining]);
  statAoa.push([
    'نسبة استهلاك الإجازات الكلية',
    totalAnnual > 0 ? `${((totalUsed / totalAnnual) * 100).toFixed(1)}%` : '0%',
  ]);
  statAoa.push([]);

  statAoa.push(['=== ثالثاً: ملخص حركات ومواقف الدوام المسجلة ===', '']);
  statAoa.push(['إجمالي حركات وسجلات الدوام الحالية', records.length]);
  statAoa.push(['حالات الحضور الفعلي الملتزم', countPresent]);
  statAoa.push(['حالات الغياب غير المبرر', countAbsent]);
  statAoa.push(['حالات الإجازات الرسمية المعتمدة', countLeave]);
  statAoa.push(['منها إجازات مرضية مثبتة', countSick]);
  statAoa.push(['إجمالي حالات الأذونات الزمنية', countTimePerm]);
  statAoa.push(['إجمالي ساعات الأذونات الزمنية المستهلكة', `${totalTimeHours} ساعة`]);
  statAoa.push(['حالات الإيفادات والمهام الرسمية', countMission]);
  statAoa.push([]);

  // Official Signatures
  const signatories = options.signatories || {
    organizerTitle: 'منظم التقرير (مسؤول البصمة والتوثيق)',
    hrManagerTitle: 'مسؤول شعبة إدارة الموارد البشرية',
    directorTitle: 'مصادقة السيد مدير الدائرة',
  };

  statAoa.push(['=== رابعاً: المصادقات والتوقيعات الإدارية الرسمية ===', '', '', '', '']);
  statAoa.push([
    signatories.organizerTitle || 'منظم التقرير',
    '',
    signatories.hrManagerTitle || 'مسؤول الموارد البشرية',
    '',
    signatories.directorTitle || 'مصادقة المدير العام',
  ]);
  statAoa.push(['(التوقيع والختم)', '', '(التوقيع والختم)', '', '(التوقيع والختم)']);
  statAoa.push([]);
  statAoa.push([OFFICIAL_DESIGNER_CREDIT]);

  const wsStats = XLSX.utils.aoa_to_sheet(statAoa);
  wsStats['!cols'] = calculateAutoColumnWidths(statAoa, 14);
  wsStats['!views'] = [{ RTL: true }];
  XLSX.utils.book_append_sheet(wb, wsStats, 'الملخص_الإحصائي_الشامل');

  // Generate and save workbook
  const filename = `المصنف_الشامل_لسجلات_الموظفين_وحركات_الدوام_${dateStamp}.xlsx`;
  XLSX.writeFile(wb, filename);

  return filename;
}

/**
 * Prepares the page for printing as official A4 PDF, setting document title
 * so default file name matches the official report specification.
 */
export function triggerOfficialPrint(options: ReportExportOptions = {}) {
  const originalTitle = document.title;
  const pdfFilename = generateReportFilename(options, 'pdf').replace('.pdf', '');

  // Set title so browser print dialog uses it as default PDF save name
  document.title = pdfFilename;

  // Small delay to ensure render passes before print trigger
  setTimeout(() => {
    window.print();
    // Restore title after print dialog closes
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  }, 150);
}
