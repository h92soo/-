/**
 * iraqiSalaryScale.ts - محرك احتساب سلم الرواتب والمخصصات والضرائب والتقاعد
 * استناداً إلى القوانين والتشريعات العراقية النافذة:
 * - قانون رواتب موظفي الدولة والقطاع العام رقم 22 لسنة 2008 المعدل
 * - قانون الخدمة المدنية رقم 24 لسنة 1960 المعدل
 * - قانون التقاعد الموحد رقم 9 لسنة 2014 المعدل
 * 
 * المنهج الرقمي للإدارة الحكومية (تشغيل 2026)
 * إعداد وتطوير: المهندس حسين عبد المنذر
 */

import { Employee } from '../types';

export interface SalaryGradeDefinition {
  grade: number;
  gradeNameAr: string;
  stage1Base: number; // الراتب الاسمي للمرحلة الأولى (دينار عراقي)
  annualIncrement: number; // مقدار العلاوة السنوية (دينار عراقي)
  maxStage: number; // أقصى مرحلة (11)
  minYearsForPromotion: number; // الحد الأدنى لسنوات الترفيع (4 أو 5 سنوات)
  nextPromotedGrade?: number; // الدرجة التالية عند الترفيع
  sampleTitles: string[]; // نماذج العناوين الوظيفية
}

/**
 * جدول درجات ومراحل سلم الرواتب العراقي المعتمد رسمياً (قانون 22 لسنة 2008 المعدل)
 */
export const IRAQI_SALARY_SCALE: Record<number, SalaryGradeDefinition> = {
  1: {
    grade: 1,
    gradeNameAr: 'الدرجة الأولى',
    stage1Base: 910000,
    annualIncrement: 20000,
    maxStage: 11,
    minYearsForPromotion: 5,
    sampleTitles: ['مدير عام', 'رئيس مهندسين أقدم', 'مشاور قانوني أقدم', 'خبير'],
  },
  2: {
    grade: 2,
    gradeNameAr: 'الدرجة الثانية',
    stage1Base: 793000,
    annualIncrement: 17000,
    maxStage: 11,
    minYearsForPromotion: 5,
    nextPromotedGrade: 1,
    sampleTitles: ['معاون مدير عام', 'رئيس مهندسين', 'مشاور قانوني', 'مدير أقدم'],
  },
  3: {
    grade: 3,
    gradeNameAr: 'الدرجة الثالثة',
    stage1Base: 600000,
    annualIncrement: 10000,
    maxStage: 11,
    minYearsForPromotion: 4,
    nextPromotedGrade: 2,
    sampleTitles: ['رئيس مهندسين معاون', 'مشاور قانوني مساعد', 'مدير', 'رئيس إحصائيين'],
  },
  4: {
    grade: 4,
    gradeNameAr: 'الدرجة الرابعة',
    stage1Base: 509000,
    annualIncrement: 8000,
    maxStage: 11,
    minYearsForPromotion: 4,
    nextPromotedGrade: 3,
    sampleTitles: ['مهندس أقدم', 'ملاحظ أقدم', 'محاسب أقدم', 'مبرمج أقدم', 'مدرس'],
  },
  5: {
    grade: 5,
    gradeNameAr: 'الدرجة الخامسة',
    stage1Base: 429000,
    annualIncrement: 6000,
    maxStage: 11,
    minYearsForPromotion: 4,
    nextPromotedGrade: 4,
    sampleTitles: ['مهندس', 'ملاحظ', 'محاسب', 'مبرمج', 'معلم جامعي'],
  },
  6: {
    grade: 6,
    gradeNameAr: 'الدرجة السادسة',
    stage1Base: 362000,
    annualIncrement: 6000,
    maxStage: 11,
    minYearsForPromotion: 4,
    nextPromotedGrade: 5,
    sampleTitles: ['معاون مهندس', 'معاون ملاحظ', 'معاون محاسب', 'مساعد مبرمج'],
  },
  7: {
    grade: 7,
    gradeNameAr: 'الدرجة السابعة',
    stage1Base: 296000,
    annualIncrement: 6000,
    maxStage: 11,
    minYearsForPromotion: 4,
    nextPromotedGrade: 6,
    sampleTitles: ['فني أقدم', 'كاتب طابع أقدم', 'مدقق مساعد', 'مساعد مدرب فني'],
  },
  8: {
    grade: 8,
    gradeNameAr: 'الدرجة الثامنة',
    stage1Base: 260000,
    annualIncrement: 3000,
    maxStage: 11,
    minYearsForPromotion: 4,
    nextPromotedGrade: 7,
    sampleTitles: ['فني', 'كاتب', 'حرفي أقدم', 'سائق أول'],
  },
  9: {
    grade: 9,
    gradeNameAr: 'الدرجة التاسعة',
    stage1Base: 210000,
    annualIncrement: 3000,
    maxStage: 11,
    minYearsForPromotion: 4,
    nextPromotedGrade: 8,
    sampleTitles: ['معاون فني', 'كاتب مبتدئ', 'حرفي', 'سائق ثان'],
  },
  10: {
    grade: 10,
    gradeNameAr: 'الدرجة العاشرة',
    stage1Base: 170000,
    annualIncrement: 3000,
    maxStage: 11,
    minYearsForPromotion: 4,
    nextPromotedGrade: 9,
    sampleTitles: ['معاون حرفي', 'حارس', 'عامل خدمة', 'سائق ثالث'],
  },
};

/**
 * نسب مخصصات الشهادة المعتمدة في الخدمة المدنية العراقية
 */
export const EDUCATION_ALLOWANCE_PRESETS: Record<string, { label: string; percent: number }> = {
  phd: { label: 'دكتوراه / بورد طبي (100%)', percent: 100 },
  master: { label: 'ماجستير (75%)', percent: 75 },
  higher_diploma: { label: 'دبلوم عالي بعد البكالوريوس (55%)', percent: 55 },
  bachelor: { label: 'بكالوريوس (45%)', percent: 45 },
  technical_diploma: { label: 'دبلوم فني / معهد (35%)', percent: 35 },
  high_school: { label: 'إعدادية / ما يعادلها (25%)', percent: 25 },
  middle_school: { label: 'متوسطة (15%)', percent: 15 },
  elementary: { label: 'ابتدائية (0% بدون مخصصات)', percent: 0 },
  reads_and_writes: { label: 'يقرأ ويكتب (0% بدون مخصصات)', percent: 0 },
  reads_only: { label: 'يقرأ فقط (0% بدون مخصصات)', percent: 0 },
  illiterate: { label: 'أمي / بدون مؤهل (0% بدون مخصصات)', percent: 0 },
  none: { label: 'بدون مخصصات شهادة (0%)', percent: 0 },
};

/**
 * المخصصات الاجتماعية القانونية الثابتة
 */
export const STANDARD_SPOUSE_ALLOWANCE = 50000; // مخصصات الزوجية: 50,000 دينار عراقي
export const STANDARD_CHILD_ALLOWANCE = 10000; // مخصصات الطفل: 10,000 دينار عراقي لكل طفل
export const MAX_CHILDREN_ALLOWANCE_COUNT = 4; // الحد الأقصى للأطفال المشمولين بالمخصصات (4 أطفال = 40,000 دينار)
export const STANDARD_PENSION_RATE = 0.10; // استقطاع التوقيفات التقاعدية (10% من الراتب الاسمي)

/**
 * استخراج الراتب الاسمي الرسمي حسب الدرجة والمرحلة
 */
export function getOfficialBaseSalary(grade: number, stage: number): number {
  const safeGrade = Math.min(10, Math.max(1, grade || 7));
  const safeStage = Math.min(11, Math.max(1, stage || 1));
  const def = IRAQI_SALARY_SCALE[safeGrade] || IRAQI_SALARY_SCALE[7];
  return def.stage1Base + (safeStage - 1) * def.annualIncrement;
}

/**
 * مقدار العلاوة السنوية للدرجة
 */
export function getAnnualIncrementAmount(grade: number): number {
  const safeGrade = Math.min(10, Math.max(1, grade || 7));
  return (IRAQI_SALARY_SCALE[safeGrade] || IRAQI_SALARY_SCALE[7]).annualIncrement;
}

/**
 * استنتاج نسبة مخصصات الشهادة التلقائية من مسمى التحصيل الدراسي
 */
export function inferEducationPercent(degree?: string): number {
  if (!degree) return 45; // افتراضياً بكالوريوس
  const d = degree.trim().toLowerCase();
  if (d.includes('دكتور') || d.includes('بورد') || d.includes('phd')) return 100;
  if (d.includes('ماجستير') || d.includes('master') || d.includes('msc')) return 75;
  if (d.includes('دبلوم عالي')) return 55;
  if (d.includes('بكالوريوس') || d.includes('جامعي') || d.includes('bsc') || d.includes('ba')) return 45;
  if (d.includes('دبلوم') || d.includes('معهد')) return 35;
  if (d.includes('إعداد') || d.includes('اعداد')) return 25;
  if (d.includes('متوسط')) return 15;
  if (
    d.includes('ابتدائي') ||
    d.includes('يقرأ') ||
    d.includes('يقراء') ||
    d.includes('أمي') ||
    d.includes('امي') ||
    d.includes('بدون')
  ) {
    return 0;
  }
  return 45;
}

/**
 * استنتاج الدرجة الوظيفية الابتدائية للتعيين بموجب قانون الخدمة المدنية رقم 24 لسنة 1960 وسلم الرواتب
 */
export function getSuggestedGradeForDegree(degree?: string): { grade: number; stage: number } {
  if (!degree) return { grade: 7, stage: 1 };
  const d = degree.trim().toLowerCase();
  if (d.includes('دكتور') || d.includes('بورد') || d.includes('phd')) return { grade: 5, stage: 1 };
  if (d.includes('ماجستير') || d.includes('master')) return { grade: 6, stage: 1 };
  if (d.includes('دبلوم عالي')) return { grade: 6, stage: 1 };
  if (d.includes('بكالوريوس') || d.includes('جامعي')) return { grade: 7, stage: 1 };
  if (d.includes('دبلوم') || d.includes('معهد')) return { grade: 8, stage: 1 };
  if (d.includes('إعداد') || d.includes('اعداد')) return { grade: 8, stage: 1 };
  if (d.includes('متوسط')) return { grade: 9, stage: 1 };
  // ابتدائية، يقرأ ويكتب، يقرأ فقط، أمي
  return { grade: 10, stage: 1 };
}

export interface ComputedSalaryResult {
  baseSalary: number;
  spouseAllowance: number;
  childrenAllowance: number;
  educationAllowance: number;
  positionAllowance: number;
  hazardAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  totalAllowances: number;
  grossSalary: number; // الراتب الكلي (الاسمي + المخصصات)
  pensionDeduction: number;
  taxDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number; // صافي الراتب المستحق
}

/**
 * الحساب المتكامل لكافة بنود الراتب والمخصصات والاستقطاعات والضرائب لموظف
 */
export function computeEmployeeSalaryComponents(emp: Partial<Employee>): ComputedSalaryResult {
  const grade = emp.civilGrade || 7;
  const stage = emp.civilStage || 1;

  // الراتب الاسمي: إذا كان محدداً يدوياً يعتمد، وإلا يحسب من سلم الرواتب العراقي
  const baseSalary =
    typeof emp.baseSalary === 'number' && emp.baseSalary > 0
      ? emp.baseSalary
      : getOfficialBaseSalary(grade, stage);

  // 1. مخصصات الزوجية: 50,000 د.ع إذا كان متزوجاً ومستحقاً
  const isMarriedOrEligible =
    emp.hasSpouseAllowance ?? (emp.maritalStatus === 'married');
  const spouseAllowance =
    isMarriedOrEligible
      ? typeof emp.spouseAllowance === 'number'
        ? emp.spouseAllowance
        : STANDARD_SPOUSE_ALLOWANCE
      : 0;

  // 2. مخصصات الأطفال: 10,000 د.ع لكل طفل حتى 4 أطفال
  const count = Math.max(0, Math.min(MAX_CHILDREN_ALLOWANCE_COUNT, emp.childrenCount ?? 0));
  const childrenAllowance =
    typeof emp.childrenAllowance === 'number'
      ? emp.childrenAllowance
      : count * STANDARD_CHILD_ALLOWANCE;

  // 3. مخصصات الشهادة: نسبة مئوية من الراتب الاسمي
  const eduPercent =
    typeof emp.educationAllowancePercent === 'number'
      ? emp.educationAllowancePercent
      : inferEducationPercent(emp.educationDegree);
  const educationAllowance =
    typeof emp.educationAllowance === 'number'
      ? emp.educationAllowance
      : Math.round((baseSalary * eduPercent) / 100);

  // 4. مخصصات المنصب: نسبة مئوية من الراتب الاسمي (أو مبلغ مباشر)
  const posPercent = emp.positionAllowancePercent || 0;
  const positionAllowance =
    typeof emp.positionAllowance === 'number' && emp.positionAllowance > 0
      ? emp.positionAllowance
      : Math.round((baseSalary * posPercent) / 100);

  // 5. مخصصات الخطورة وطبيعة العمل: نسبة من الاسمي
  const hazardPercent = emp.hazardAllowancePercent || 0;
  const hazardAllowance =
    typeof emp.hazardAllowance === 'number' && emp.hazardAllowance > 0
      ? emp.hazardAllowance
      : Math.round((baseSalary * hazardPercent) / 100);

  // 6. مخصصات النقل / الموقع الجغرافي
  const transportAllowance = emp.transportAllowance || 0;

  // 7. مخصصات أخرى مخصصة
  const otherAllowances = emp.otherAllowances || 0;

  // إجمالي المخصصات
  const totalAllowances =
    spouseAllowance +
    childrenAllowance +
    educationAllowance +
    positionAllowance +
    hazardAllowance +
    transportAllowance +
    otherAllowances;

  // الراتب الكلي
  const grossSalary = baseSalary + totalAllowances;

  // 8. التوقيفات التقاعدية (10% من الراتب الاسمي - مفعّلة تلقائياً للملاك والعقود)
  const isPensionActive = emp.isPensionDeducted !== false;
  const pensionDeduction =
    isPensionActive
      ? typeof emp.pensionDeduction === 'number'
        ? emp.pensionDeduction
        : Math.round(baseSalary * STANDARD_PENSION_RATE)
      : 0;

  // 9. ضريبة الدخل (اختيارية حسب طلب المستخدم)
  const isTaxActive = Boolean(emp.isTaxEnabled);
  const taxRate = emp.taxRatePercent || 3; // افتراضياً 3% إذا تم تفعيل الضريبة
  const taxDeduction =
    isTaxActive
      ? typeof emp.taxDeduction === 'number'
        ? emp.taxDeduction
        : Math.max(0, Math.round(((baseSalary + totalAllowances) * taxRate) / 100))
      : 0;

  // 10. استقطاعات أخرى
  const otherDeductions = emp.otherDeductions || 0;

  // إجمالي الاستقطاعات
  const totalDeductions = pensionDeduction + taxDeduction + otherDeductions;

  // صافي الراتب المستلم
  const netSalary = Math.max(0, grossSalary - totalDeductions);

  return {
    baseSalary,
    spouseAllowance,
    childrenAllowance,
    educationAllowance,
    positionAllowance,
    hazardAllowance,
    transportAllowance,
    otherAllowances,
    totalAllowances,
    grossSalary,
    pensionDeduction,
    taxDeduction,
    otherDeductions,
    totalDeductions,
    netSalary,
  };
}

/**
 * تنسيق المبالغ بالدينار العراقي
 */
export function formatIQD(amount: number = 0): string {
  return `${amount.toLocaleString('en-US')} د.ع`;
}

export interface DepartmentSalarySummary {
  department: string;
  employeeCount: number;
  totalBaseSalaries: number;
  totalAllowances: number;
  totalGrossSalaries: number;
  totalPensionDeductions: number;
  totalTaxDeductions: number;
  totalDeductions: number;
  totalNetSalaries: number;
  averageNetSalary: number;
}

/**
 * حساب إحصائيات الرواتب والمخصصات والضرائب المجمعة لكل قسم في المؤسسة (الربط بجميع الأقسام)
 */
export function getDepartmentSalarySummaries(employees: Employee[]): DepartmentSalarySummary[] {
  const activeEmps = employees.filter((e) => e.status !== 'retired');
  const deptMap = new Map<string, DepartmentSalarySummary>();

  activeEmps.forEach((emp) => {
    const dept = emp.department || 'غير مصنف';
    const computed = computeEmployeeSalaryComponents(emp);

    if (!deptMap.has(dept)) {
      deptMap.set(dept, {
        department: dept,
        employeeCount: 0,
        totalBaseSalaries: 0,
        totalAllowances: 0,
        totalGrossSalaries: 0,
        totalPensionDeductions: 0,
        totalTaxDeductions: 0,
        totalDeductions: 0,
        totalNetSalaries: 0,
        averageNetSalary: 0,
      });
    }

    const item = deptMap.get(dept)!;
    item.employeeCount += 1;
    item.totalBaseSalaries += computed.baseSalary;
    item.totalAllowances += computed.totalAllowances;
    item.totalGrossSalaries += computed.grossSalary;
    item.totalPensionDeductions += computed.pensionDeduction;
    item.totalTaxDeductions += computed.taxDeduction;
    item.totalDeductions += computed.totalDeductions;
    item.totalNetSalaries += computed.netSalary;
  });

  const list = Array.from(deptMap.values()).map((dept) => ({
    ...dept,
    averageNetSalary: dept.employeeCount > 0 ? Math.round(dept.totalNetSalaries / dept.employeeCount) : 0,
  }));

  // فرز الأقسام تنازلياً حسب إجمالي صافي الرواتب
  return list.sort((a, b) => b.totalNetSalaries - a.totalNetSalaries);
}
