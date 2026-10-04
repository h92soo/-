export type UserRole = 'super_admin' | 'hr_director' | 'attendance_officer' | 'auditor';

export interface UserAccount {
  username: string;
  fullName: string;
  jobTitle: string;
  department: string;
  role: UserRole;
  roleTitleAr: string;
  avatarColor: string;
  permissions: {
    canEditAttendance: boolean;
    canApproveLeaves: boolean;
    canDeleteRecords: boolean;
    canGenerateReports: boolean;
    canAccessMasterSettings: boolean;
    canEditSalaries?: boolean;
    canUpdateSystemSettings?: boolean; // صلاحية تحديث وتغيير إعدادات المنظومة
    canToggleFeatures?: boolean; // صلاحية تفعيل وتعطيل الميزات والوحدات
    canGrantFiveYearLeave?: boolean; // صلاحية منح وتعديل إجازة الـ 5 سنوات
    canManageCareerRules?: boolean; // صلاحية إقرار العلاوات والترفيع والتقاعد
    canExportDatabase?: boolean; // صلاحية تصدير ونسخ قاعدة البيانات
    canManageSystemUsers?: boolean; // صلاحية إدارة المستخدمين والصلاحيات
  };
}

export type ContractType = 'permanent' | 'contract' | 'temporary' | 'daily';

export interface EmploymentTypeLabelsSettings {
  permanent: string; // المسمى المعتمد للملاك الدائم (افتراضياً: ملاك دائم)
  contract: string; // المسمى المعتمد للعقود الوزارية (افتراضياً: عقد وزاري 315)
  temporary?: string; // المسمى المعتمد للأجور والتعيين المؤقت
  daily?: string; // المسمى المعتمد للأجور اليومية
}

export const DEFAULT_EMPLOYMENT_TYPE_LABELS: EmploymentTypeLabelsSettings = {
  permanent: 'ملاك دائم',
  contract: 'عقد وزاري (قرار 315)',
  temporary: 'أجر يومي / مؤقت',
  daily: 'أجور يومية',
};

export type EmployeeStatus = 'active' | 'on_leave' | 'suspended' | 'retired' | 'five_year_leave';

export interface FiveYearLeaveRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department: string;
  salaryType: 'full_base_salary' | 'half_base_salary'; // براتب اسمي كامل أو نصف اسمي
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  orderNumber: string; // رقم الأمر الإداري
  orderDate: string; // تاريخ الأمر
  baseSalary: number; // الراتب الاسمي المعتمد
  monthlyPaidAmount: number; // المبلغ المدفوع شهرياً (اسمي كامل أو نصف اسمي)
  pensionDeductionPercent: number; // نسبة التوقيفات التقاعدية (افتراضياً 10%)
  monthlyPensionDeduction: number; // مبلغ استقطاع التوقيفات
  netMonthlyPaid: number; // الصافي الشهري المستلم
  status: 'active' | 'interrupted' | 'completed' | 'extended'; // حالة الإجازة
  interruptedDate?: string; // في حال قُطعت وباشر الموظف
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CareerTimelineEvent {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeNumber?: string;
  department?: string;
  date: string; // YYYY-MM-DD
  title: string;
  category:
    | 'hire'
    | 'department_change'
    | 'title_change'
    | 'education_change'
    | 'salary_change'
    | 'status_change'
    | 'allowance'
    | 'promotion'
    | 'penalty'
    | 'leave'
    | 'retirement'
    | 'barcode'
    | 'five_year_leave'
    | 'transfer'
    | 'general';
  description: string;
  oldValue?: string;
  newValue?: string;
  orderNumber?: string;
  orderDate?: string;
  performedBy?: string; // اسم المستخدم المسؤول عن التعديل (المشرف / المحرر)
  metadata?: Record<string, any>;
  createdAt: string; // ISO String with time
}

export type EmployeeAuditLogEntry = CareerTimelineEvent;

export type RetirementReason =
  | 'legal_age' // السن القانوني الإلزامي (إكمال 60 سنة وفق المادة 10)
  | 'employee_request' // بناءً على طلب الموظف / التقاعد الاختياري (المادة 12 - خدمة 15 سنة فأكثر)
  | 'health_condition' // لأسباب صحية وعجز طبي بقرار اللجنة الطبية الرسمية (المادة 13)
  | 'service_termination' // إنهاء الخدمة / إلغاء الوظيفة / مقتضيات المصلحة العامة
  | 'resignation'; // استقالة مقبولة مع استحقاق تقاعدي

// Education degree options and Iraqi Civil Service Scale mapping
export interface EducationDegreeOption {
  value: string;
  label: string;
  allowancePercent: number;
  initialCivilGrade: number; // الدرجة المقترحة لبداية التعيين حسب القانون العراقي
  category: 'higher' | 'graduate' | 'diploma' | 'school' | 'basic';
}

export const EDUCATION_DEGREE_OPTIONS: EducationDegreeOption[] = [
  { value: 'دكتوراه', label: 'دكتوراه / بورد طبي (100% مخصصات - الدرجة 5)', allowancePercent: 100, initialCivilGrade: 5, category: 'higher' },
  { value: 'ماجستير', label: 'ماجستير (75% مخصصات - الدرجة 6)', allowancePercent: 75, initialCivilGrade: 6, category: 'higher' },
  { value: 'دبلوم عالي', label: 'دبلوم عالي بعد البكالوريوس (55% مخصصات - الدرجة 6)', allowancePercent: 55, initialCivilGrade: 6, category: 'higher' },
  { value: 'بكالوريوس', label: 'بكالوريوس (45% مخصصات - الدرجة 7)', allowancePercent: 45, initialCivilGrade: 7, category: 'graduate' },
  { value: 'دبلوم', label: 'دبلوم فني / معهد (35% مخصصات - الدرجة 8)', allowancePercent: 35, initialCivilGrade: 8, category: 'diploma' },
  { value: 'إعدادية', label: 'إعدادية / مهني (25% مخصصات - الدرجة 8)', allowancePercent: 25, initialCivilGrade: 8, category: 'school' },
  { value: 'متوسطة', label: 'متوسطة (15% مخصصات - الدرجة 9)', allowancePercent: 15, initialCivilGrade: 9, category: 'school' },
  { value: 'ابتدائية', label: 'ابتدائية (بدون مخصصات - الدرجة 10)', allowancePercent: 0, initialCivilGrade: 10, category: 'basic' },
  { value: 'يقرأ ويكتب', label: 'يقرأ ويكتب (بدون مخصصات - الدرجة 10)', allowancePercent: 0, initialCivilGrade: 10, category: 'basic' },
  { value: 'يقرأ فقط', label: 'يقرأ فقط (بدون مخصصات - الدرجة 10)', allowancePercent: 0, initialCivilGrade: 10, category: 'basic' },
  { value: 'أمي', label: 'أمي / بدون مؤهل دراسي (بدون مخصصات - الدرجة 10)', allowancePercent: 0, initialCivilGrade: 10, category: 'basic' },
];

// Department & Administrative Formation Entity (الأقسام والتشكيلات الإدارية)
export interface Department {
  id: string;
  name: string; // اسم القسم أو التشكيل
  code?: string; // الرمز المختصر (مثال: HR, ENG, IT)
  managerName?: string; // اسم مدير القسم أو رئيس التشكيل
  phone?: string;
  email?: string;
  color?: string; // لون التمييز البصري (indigo, amber, emerald, blue, purple, rose, cyan, orange)
  description?: string; // التوصيف والمهام
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 'dept-hr', name: 'قسم الموارد البشرية والشؤون الإدارية', code: 'HR', managerName: 'أ. د. عبد الله السعدي', color: 'indigo', description: 'إدارة شؤون الموظفين والملاكات والعلاوات والترقيات والتقاعد والأوامر الإدارية' },
  { id: 'dept-dams', name: 'قسم السدود والمشاريع والخزانات المائية', code: 'DAM', managerName: 'م. حيدر جاسم الموسوي', color: 'amber', description: 'متابعة مناسيب السدود والخزانات وتشغيل البوابات والمفيض والتحكم الإستراتيجي' },
  { id: 'dept-irrigation', name: 'قسم شبكات الري والبزل واستصلاح الأراضي', code: 'IRR', managerName: 'م. أحمد مهدي الكرخي', color: 'emerald', description: 'إدارة وتوزيع الحصص المائية وصيانة القنوات والجداول والمشاريع الإروائية' },
  { id: 'dept-groundwater', name: 'قسم إدارة المياه الجوفية والآبار والوديان', code: 'GW', managerName: 'الجيولوجي صباح كاظم', color: 'cyan', description: 'حفر وتراخيص الآبار ومراقبة الخزين الجوفي والسيول والوديان' },
  { id: 'dept-dredging', name: 'شعبة الكري وتطهير مقاطع الأنهار وروافدها', code: 'DRG', managerName: 'م. وسام حميد كريم', color: 'blue', description: 'عمليات كري الترسبات الطينية وتوسيع مقاطع مجاري الأنهار ومحاربة نبات زهرة النيل' },
  { id: 'dept-pumps', name: 'شعبة المحطات الكهروميكانيكية والمضخات', code: 'PMP', managerName: 'م. علي عبد الرضا المهداوي', color: 'orange', description: 'صيانة وتشغيل محطات الضخ الرئيسية ومحركات الديزل ولوحات السيطرة الكهربائية' },
  { id: 'dept-gis', name: 'شعبة المساحة ونظم المعلومات الجغرافية والرصد', code: 'GIS', managerName: 'المهندسة إيمان فاضل', color: 'teal', description: 'الخرائط الهيدرولوجية والمسوحات الطبوغرافية ونظم الاستشعار عن بعد ومقاييس الجريان' },
  { id: 'dept-fin', name: 'قسم الشؤون المالية والحسابات والتدقيق', code: 'FIN', managerName: 'المحاسب عادل عبد الزهرة', color: 'purple', description: 'إعداد قوائم الرواتب والموازنة والمحاسبة الحكومية والرقابة والتدقيق الداخلي' },
  { id: 'dept-safety', name: 'شعبة السلامة المهنية والبيئة المائية والرقابة', code: 'SAF', managerName: 'السيد رائد سلمان التميمي', color: 'rose', description: 'تطبيق معايير السلامة المهنية ومراقبة نوعية المياه والتصدي للمخالفات والتجاوزات' },
];

export interface Employee {
  id: string; // المعرف الفريد الموحد (Employee ID)
  employeeNumber: string; // الرقم الوظيفي الرسمي الموحد
  fullName: string; // الاسم الرباعي واللقب
  department: string; // القسم أو التشكيل
  division?: string; // الشعبة
  jobTitle: string; // العنوان الوظيفي
  contractType: ContractType; // نوع التوظيف (ملاك دائم / عقد)
  hireDate: string; // تاريخ المباشرة أو التعيين
  
  // Civil Service & Grade (الدرجة والمرحلة)
  civilGrade?: number; // الدرجة الوظيفية (مثلاً 1 إلى 10)
  civilStage?: number; // المرحلة (مثلاً 1 إلى 11)
  baseSalary?: number; // الراتب الاسمي
  totalSalary?: number; // الراتب الكلي (الاسمي + مجموع المخصصات)
  netSalary?: number; // صافي الراتب المستلم بعد الاستقطاعات والضرائب

  // Family & Social Allowances (المخصصات الاجتماعية والزوجية والأطفال وفق القوانين العراقية)
  maritalStatus?: 'single' | 'married' | 'widowed' | 'divorced';
  hasSpouseAllowance?: boolean; // استحقاق مخصصات الزوجية (50,000 دينار عراقي)
  spouseAllowance?: number; // قيمة مخصصات الزوجية
  childrenCount?: number; // عدد الأطفال المستحقين
  childrenAllowance?: number; // مخصصات الأطفال (10,000 دينار لكل طفل بحد أقصى 4 أطفال)

  // Education Allowance (مخصصات الشهادة والتحصيل الدراسي)
  educationDegree?: string; // التحصيل الدراسي (دكتوراه، ماجستير، بكالوريوس، دبلوم، إعدادية...)
  educationAllowancePercent?: number; // نسبة مخصصات الشهادة (100%، 75%، 45%، 35%، 25%، 15%)
  educationAllowance?: number; // المبلغ النقدي لمخصصات الشهادة

  // Position, Hazard & Special Allowances (مخصصات المنصب، الخطورة، طبيعة العمل، والنقل)
  positionAllowancePercent?: number; // مخصصات المنصب والإدارة (15% إلى 50%)
  positionAllowance?: number;
  hazardAllowancePercent?: number; // مخصصات الخطورة وطبيعة العمل والمهنة (20% إلى 50%)
  hazardAllowance?: number;
  transportAllowance?: number; // مخصصات النقل / الموقع الجغرافي
  otherAllowances?: number; // مخصصات أخرى مخصصة
  totalAllowances?: number; // إجمالي كافة المخصصات الممنوحة

  // Deductions, Pension & Optional Income Tax (الاستقطاعات، التوقيفات التقاعدية، والضرائب الاختيارية)
  isPensionDeducted?: boolean; // خضوع للتوقيفات التقاعدية (10%)
  pensionDeduction?: number; // مبلغ استقطاع التوقيفات التقاعدية
  isTaxEnabled?: boolean; // تفعيل ضريبة الدخل (اختياري حسب رغبة المؤسسة/القانون)
  taxRatePercent?: number; // نسبة استقطاع ضريبة الدخل (مثلاً 3% إلى 5%)
  taxDeduction?: number; // مبلغ استقطاع ضريبة الدخل
  otherDeductions?: number; // استقطاعات أخرى (عقوبات، سلف، غياب)
  totalDeductions?: number; // إجمالي الاستقطاعات والضرائب

  birthDate?: string; // تاريخ الميلاد (لحساب سن التقاعد)
  gender?: 'male' | 'female';
  nationalId?: string; // رقم البطاقة الوطنية أو هوية الأحوال
  pensionFileNumber?: string; // الرقم التقاعدي / رقم السجل التأميني التقاعدي
  nationalStatisticalNumber?: string; // الرقم الإحصائي المركزي
  specialization?: string; // التخصص الدقيق / الاختصاص
  confirmationDate?: string; // تاريخ التثبيت على الملاك الدائم
  workType?: 'office' | 'field' | 'shift' | 'lab'; // طبيعة العمل
  bloodType?: string; // فصيلة الدم
  militaryServiceYears?: number; // سنوات الخدمة العسكرية المضافة
  emergencyPhone?: string; // هاتف الطوارئ
  status?: EmployeeStatus; // الحالة: active, on_leave, suspended, retired
  
  // Barcode & QR Information
  barcodeValue?: string; // المعرف المستخدم في الباركود والـ QR (افتراضياً employeeNumber أو id)
  barcodeBadgePrinted?: boolean; // هل طُبعت الباقة
  barcodeLastScannedAt?: string;

  // Biometric Device Integration (الربط بأجهزة البصمة والآي بي)
  biometricEnrollmentId?: string; // رقم معرف الموظف في جهاز البصمة (Device PIN / User ID)
  biometricDeviceIp?: string; // عنوان آي بي جهاز البصمة المرتبط
  biometricModality?: BiometricModality; // نوع البصمة المعتمدة (إصبع / وجه / كف / بطاقة)
  biometricLastPunchAt?: string; // تاريخ ووقت آخر حركة بصمة مسجلة

  // Allowance details (العلاوة السنوية)
  lastAllowanceDate?: string; // تاريخ آخر علاوة
  nextAllowanceDueDate?: string; // تاريخ استحقاق العلاوة القادمة
  isAllowanceSuspended?: boolean; // هل العلاوة محجوزة أو مؤجلة
  allowanceSuspensionReason?: string;
  allowanceSuspensionReviewDate?: string;

  // Promotion details (الترفيع الوظيفي)
  lastPromotionDate?: string; // تاريخ آخر ترفيع
  nextPromotionDueDate?: string; // تاريخ استحقاق الترفيع
  yearsInCurrentGrade?: number; // عدد سنوات الخدمة في الدرجة الحالية

  // Retirement & Gratuity details (التقاعد ومكافأة نهاية الخدمة)
  isRetired?: boolean;
  retirementDate?: string;
  retirementOrderNumber?: string;
  retirementNotes?: string;
  retirementReason?: RetirementReason;
  retirementReasonTitle?: string;
  medicalBoardDecisionNumber?: string; // رقم قرار اللجنة الطبية الرسمية
  medicalBoardDate?: string; // تاريخ قرار اللجنة الطبية
  disabilityPercentage?: number; // نسبة العجز الطبي المئوية
  medicalHospital?: string; // المستشفى أو دائرة اللجان الطبية
  disabilityType?: string; // نوع وطبيعة العجز (عجز دائم / عجز كلي / إصابة عمل أثناء الخدمة وبسببها)
  medicalBoardRecommendation?: string; // توصية اللجنة الطبية الرسمية
  applicantRequestDate?: string; // تاريخ تقديم طلب التقاعد من قبل الموظف
  ministerialApprovalNumber?: string; // رقم كتاب موافقة الوزير / الجهة العليا
  ministerialApprovalDate?: string; // تاريخ موافقة الوزير
  gratuityAmount?: number; // مكافأة نهاية الخدمة (12 شهر لخدمة 30 سنة أو شهر عن كل سنة)
  accumulatedLeaveCashAmount?: number; // بدل رصيد الإجازات المتراكمة نقداً (حتى 180 يوم)
  estimatedMonthlyPension?: number; // الراتب التقاعدي الشهري التقديري
  totalRetirementPayout?: number; // إجمالي الدفعة النقدية الفورية
  calculatedServiceYears?: number; // سنوات الخدمة المحتسبة للتقاعد

  // Five-Year Leave (إجازة الـ 5 سنوات براتب اسمي أو نصف اسمي)
  fiveYearLeave?: {
    isActive: boolean;
    salaryType: 'full_base_salary' | 'half_base_salary';
    startDate: string;
    endDate: string;
    orderNumber: string;
    orderDate: string;
    baseSalaryAtLeave: number;
    monthlyPaidAmount: number;
    pensionDeductionPercent: number;
    monthlyPensionDeduction: number;
    netMonthlyPaid: number;
    notes?: string;
  };

  // Leave Balances
  annualBalanceLimit: number; // رصيد الإجازات السنوي (36 للملاك، 30 للعقد)
  usedBalance: number; // المستهلك
  remainingBalance: number; // المتبقي
  monthlyRate: number; // الاستحقاق الشهري (3 أيام للملاك، 4 أيام للعقد)
  isAccumulative: boolean; // هل الإجازات تراكمية
  phone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AllowanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department: string;
  grantDate: string; // تاريخ المنح
  effectiveDate: string; // تاريخ النفاذ
  previousStage: number; // المرحلة السابقة
  newStage: number; // المرحلة الجديدة
  grade: number; // الدرجة
  orderNumber: string; // رقم الأمر الإداري
  orderDate: string; // تاريخ الأمر
  status: 'granted' | 'deferred' | 'withheld'; // ممنوحة / مؤجلة / محجوزة
  statusReason?: string;
  reviewDate?: string;
  notes?: string;
  grantedBy: string;
  createdAt: string;
}

export interface PromotionRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department: string;
  previousGrade: number;
  newGrade: number;
  previousTitle: string;
  newTitle: string;
  educationDegree: string;
  yearsOfServiceInGrade: number;
  orderNumber: string;
  orderDate: string;
  effectiveDate: string;
  newBaseSalary?: number;
  notes?: string;
  promotedBy: string;
  createdAt: string;
}

export interface BatchAllowanceExecutionItem {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department: string;
  grade: number;
  previousStage: number;
  newStage: number;
  previousBaseSalary: number;
  newBaseSalary: number;
}

export interface BatchPromotionExecutionItem {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department: string;
  previousGrade: number;
  newGrade: number;
  previousTitle: string;
  newTitle: string;
  previousBaseSalary: number;
  newBaseSalary: number;
}

export interface UnifiedAdministrativeOrder {
  id: string;
  type: 'allowance_batch' | 'promotion_batch' | 'allowance_single' | 'promotion_single';
  orderNumber: string;
  orderDate: string;
  effectiveDate: string;
  title: string;
  ministryName: string;
  directorateName: string;
  departmentName: string;
  preamble: string;
  decisionText: string;
  items: Array<{
    seq: number;
    employeeName: string;
    employeeNumber: string;
    department: string;
    col1: string; // e.g. الدرجة / المرحلة الحالية
    col2: string; // e.g. الدرجة / المرحلة الجديدة
    col3?: string; // e.g. الراتب الاسمي الجديد
    col4?: string; // e.g. العنوان الوظيفي الجديد
  }>;
  signatoryTitle: string;
  signatoryName: string;
  notes?: string;
  copiesTo: string[];
}

export interface BarcodeScanLog {
  id: string;
  barcode: string;
  employeeId?: string;
  employeeName?: string;
  employeeNumber?: string;
  department?: string;
  scanTime: string; // ISO
  scanType: 'attendance_checkin' | 'attendance_checkout' | 'search_profile' | 'verify_identity';
  status: 'success' | 'late' | 'unknown_barcode' | 'employee_suspended' | 'employee_retired';
  statusMessage: string;
  soundType: 'success' | 'late' | 'warning' | 'error';
  scannedBy?: string;
}

export interface CareerSystemSettings {
  allowanceIntervalMonths: number; // افتراضياً 12 شهر (سنة)
  retirementAgeYears: number; // السن القانوني للإحالة للتقاعد العام (افتراضياً 60 سنة وفق القانون العراقي المعدل)
  retirementWarningMonths: number; // مدة التنبيه قبل التقاعد بالأشهر (افتراضياً 6 أشهر)
  earlyRetirementMinAge: number; // الحد الأدنى لسن التقاعد بطلب الموظف (افتراضياً 50 أو 45 سنة حسب التعديلات الوزارية)
  earlyRetirementMinServiceYears: number; // الحد الأدنى لسنوات الخدمة للتقاعد بطلب الموظف (افتراضياً 15 سنة)
  universityProfRetirementAge: number; // سن تقاعد أساتذة الجامعات والتدريسيين (افتراضياً 63 سنة)
  specialistDoctorRetirementAge: number; // سن تقاعد الأطباء الاستشاريين والاختصاص (افتراضياً 65 سنة)
  healthRetirementMinDisabilityPercent: number; // الحد الأدنى لنسبة العجز الطبي المعتمدة (افتراضياً 50%)
  healthRetirementRequiresMedicalBoard: boolean; // اشتراط مصادقة اللجنة الطبية الرسمية (true)
  healthRetirementGuaranteedYears?: number; // سنوات الخدمة المضمونة دنيا لاحتساب الراتب التقاعدي الصحي (افتراضياً 15 سنة)
  enableHealthRetirementWorkInjuryBonus?: boolean; // احتساب مخصصات إضافية لعجز إصابة العمل أثناء الخدمة وبسببها
  minLegalPensionAmount?: number; // الحد الأدنى القانوني للراتب التقاعدي المضمون (افتراضياً 600,000 د.ع)
  pensionCalculationFactor?: number; // معامل احتساب الراتب التقاعدي المئوي (افتراضياً 2.5%)
  maxAccumulatedLeaveDays?: number; // السقف الأعلى لبدل رصيد الإجازات المتراكمة نقداً (افتراضياً 180 يوماً)
  ministerialCircularReference?: string; // رقم وتاريخ التعميم أو القرار الوزاري الحاكم
  pensionDeductionPercent: number; // نسبة الاستقطاع التقاعدي الرسمية (10%)
  endOfServiceGratuityMonthsCap: number; // السقف الأعلى لمكافأة نهاية الخدمة بالأشهر (افتراضياً 36 شهراً)
  promotionRequirementsPerGrade: Record<number, { minYears: number; requiredEducation?: string }>;
}

export const DEFAULT_CAREER_SETTINGS: CareerSystemSettings = {
  allowanceIntervalMonths: 12,
  retirementAgeYears: 60,
  retirementWarningMonths: 6,
  earlyRetirementMinAge: 50,
  earlyRetirementMinServiceYears: 15,
  universityProfRetirementAge: 63,
  specialistDoctorRetirementAge: 65,
  healthRetirementMinDisabilityPercent: 50,
  healthRetirementRequiresMedicalBoard: true,
  healthRetirementGuaranteedYears: 15,
  enableHealthRetirementWorkInjuryBonus: true,
  minLegalPensionAmount: 600000,
  pensionCalculationFactor: 2.5,
  maxAccumulatedLeaveDays: 180,
  ministerialCircularReference: 'قانون التقاعد الموحد رقم (9) لسنة 2014 المعدل بالقانون رقم (26) لسنة 2019 وقرارات مجلس الوزراء',
  pensionDeductionPercent: 10,
  endOfServiceGratuityMonthsCap: 36,
  promotionRequirementsPerGrade: {
    10: { minYears: 4 },
    9: { minYears: 4 },
    8: { minYears: 4 },
    7: { minYears: 4 },
    6: { minYears: 4 },
    5: { minYears: 4 },
    4: { minYears: 4 },
    3: { minYears: 4 },
    2: { minYears: 5 },
    1: { minYears: 5 },
  },
};

export interface LeaveRulesSettings {
  permanentAnnualBalance: number; // 36
  permanentMonthlyRate: number; // 3
  permanentAccumulative: boolean; // true
  contractAnnualBalance: number; // 30
  contractMonthlyRate: number; // 4
  contractAccumulative: boolean; // false
  maxTimePermissionsHoursMonthly: number; // الحد الأقصى لساعات الزمنية شهرياً (مثلاً 4 ساعات)
  timePermissionHoursToLeaveDay: number; // كم ساعة زمنيات تعادل إجازة يوم اعتيادي (مثلاً 7 ساعات)
  earlyWarningThresholdDays: number; // حد التنبيه المبكر عند وصول الرصيد إلى أقل من X أيام

  // ضوابط وقوانين إجازات الحامل والوضع والأمومة وفق القوانين العراقية
  maternityPreDays: number; // إجازة ما قبل الوضع للحامل براتب تام (21 يوماً وفق قانون الخدمة المدنية وقانون العمل)
  maternityPostDays: number; // إجازة ما بعد الوضع براتب تام (51 يوماً)
  maternityTotalDeliveryDays: number; // إجمالي إجازة الحمل والوضع (72 يوماً = 21 قبل + 51 بعد)
  maternityChildCareDays: number; // إجازة الأمومة ورعاية الطفل (365 يوماً - سنة كاملة)
  maternityChildCareFirstHalfPaid?: boolean; // أول 6 أشهر براتب تام و6 أشهر بنصف راتب
}

export type LeaveType =
  | 'annual'
  | 'sick'
  | 'unpaid'
  | 'maternity'
  | 'maternity_pre_21' // إجازة ما قبل الوضع للحامل (21 يوماً)
  | 'maternity_post_51' // إجازة ما بعد الوضع (51 يوماً)
  | 'maternity_full_72' // إجازة الحمل والوضع التامة (72 يوماً: 21 قبل + 51 بعد)
  | 'maternity_care_year' // إجازة الأمومة ورعاية الطفل (سنة كاملة)
  | 'study'
  | 'bereavement'
  | 'hajj'
  | 'marriage'
  | 'five_year_full' // إجازة خمس (5) سنوات براتب اسمي كامل
  | 'five_year_half'; // إجازة خمس (5) سنوات بنصف راتب اسمي

export interface SystemFeatureConfig {
  enableFiveYearLeave: boolean;
  enableRetirementHub: boolean;
  enableBarcodeHub: boolean;
  enableAllowancesPromotions: boolean;
  enableAnalyticsHub: boolean;
  enableSalariesCalculation: boolean;
  enableAutoBackup: boolean;
  enableMovementDesigner: boolean;
}

export const DEFAULT_SYSTEM_FEATURE_CONFIG: SystemFeatureConfig = {
  enableFiveYearLeave: true,
  enableRetirementHub: true,
  enableBarcodeHub: true,
  enableAllowancesPromotions: true,
  enableAnalyticsHub: true,
  enableSalariesCalculation: true,
  enableAutoBackup: true,
  enableMovementDesigner: true,
};

export interface OrganizationSettings {
  ministryName: string; // اسم الوزارة (مثال: وزارة التعليم العالي والبحث العلمي)
  directorateName: string; // اسم الدائرة / التشكيل
  departmentName: string; // اسم القسم / الشعبة
  officialEmblem: 'gold' | 'dark' | 'crest';
  operatingYear: number;
}

export type FontFamilyOption =
  | 'Readex Pro'
  | 'Cairo'
  | 'Alexandria'
  | 'Almarai'
  | 'Tajawal'
  | 'IBM Plex Sans Arabic'
  | 'Noto Sans Arabic';

export interface AppearanceSettings {
  showStatsCards: boolean;
  compactTable: boolean;
  showDigitalClock: boolean;
  showEarlyWarningBadges: boolean;
  fontSize: 'compact' | 'normal' | 'large';
  accentTone: 'amber' | 'emerald' | 'blue';
  fontFamily?: FontFamilyOption;
  navigationLayout?: 'dashboard_hub' | 'sidebar'; // 'dashboard_hub' = لوحة التحكم المركزية بالأزرار الملونة | 'sidebar' = القائمة الجانبية المستمرة
}

export type HolidayCategory =
  | 'national' // مناسبات وطنية وقومية
  | 'religious_islamic' // مناسبات دينية إسلامية
  | 'religious_christian' // مناسبات دينية مسيحية
  | 'religious_other' // مناسبات الأديان الأخرى (إيزيديون، صابئة مندائيون)
  | 'international' // مناسبات دولية وعالمية
  | 'cabinet_special'; // قرارات رئاسة مجلس الوزراء الخاصة والاستثنائية

export interface OfficialHoliday {
  id: string;
  title: string; // مسمى العطلة أو المناسبة
  date: string; // YYYY-MM-DD
  endDate?: string; // تاريخ انتهاء العطلة إذا كانت ممتدة
  durationDays: number; // عدد الأيام
  isOfficialOff: boolean; // عطلة رسمية معطلة للدوام (true) أو مناسبة بدون تعطيل (false)
  category: HolidayCategory;
  cabinetDecreeNumber?: string; // رقم قرار مجلس الوزراء أو السند القانوني
  decreeDate?: string;
  applicableTarget?: 'all' | 'central_ministries' | 'governorates' | 'specific_groups';
  notes?: string;
  isCirculated?: boolean; // هل تم تعميم العطلة على سجلات دوام الموظفين
  circulatedAt?: string;
  year?: number;
}

export interface SystemUserAccount extends UserAccount {
  id: string;
  passwordHash: string; // أو كلمة المرور للمنظومة المحلية
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'leave'
  | 'time_permission'
  | 'official_holiday'
  | 'mission'
  | 'duty';

export type MovementCategory =
  | 'attendance' // الحضور والدوام والمناوبات
  | 'time_permission' // الزمنيات والأذونات الساعية
  | 'leave' // الإجازات الرسمية بأنواعها
  | 'mission' // الإيفادات والمهام واللجان
  | 'violation' // الغيابات والتأخير والعقوبات
  | 'holiday'; // العطل الرسمية

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department: string;
  contractType: ContractType;
  date: string; // YYYY-MM-DD
  endDate?: string; // تاريخ نهاية الحركة إذا كانت تمتد لعدة أيام
  status: AttendanceStatus;
  
  // Extended Movement categorization
  category?: MovementCategory;
  movementType?: string; // نوع الحركة الدقيق (إجازة اعتيادية، زمنية صباحية، إيفاد، خفارة...)
  movementTitle?: string; // مسمى الحركة للعرض
  
  // Hours, minutes, and timings
  timePermissionMinutes?: number; // للموظف الحاصل على زمنية
  timePermissionType?: 'morning' | 'noon' | 'evening'; // صباحية أو ظهيرة أو مسائية
  startTime?: string; // مثلاً 08:30
  endTime?: string; // مثلاً 11:30
  durationDays?: number; // عدد الأيام
  durationHours?: number; // عدد الساعات
  
  // Leave specific
  leaveType?: LeaveType;
  customLeaveDays?: number; // عدد أيام الإجازة المحددة (مثلاً 21 للحامل، 51 للوضع، أو أي عدد مخصص)
  deductFromAnnualBalance?: boolean; // هل تخصم من الرصيد السنوي للموظف
  
  // Administrative Order & Details
  orderNumber?: string; // رقم الأمر الإداري / الاستمارة
  orderDate?: string; // تاريخ صدور الأمر الإداري
  destination?: string; // الجهة المقصودة أو الموفد إليها أو المستشفى
  approvedBy?: string; // المسؤول أو المدير المانح للموافقة
  
  notes?: string;
  recordedBy?: string;
  createdAt?: string;
}

export interface DatabaseBackupPayload {
  system: 'GovPersonnelDB';
  version: number;
  backupDate: string;
  appVersion: string;
  metadata: {
    systemTitle: string;
    operatingYear: number;
    exportTimestamp: number;
    exportedBy?: string;
    developer: {
      name: string;
      phone: string;
      telegram: string;
    };
  };
  statistics: {
    employeesCount: number;
    attendanceSheetsCount: number;
    settingsCount: number;
    usersCount: number;
    attendanceLogsCount: number;
  };
  data: {
    employees: Employee[];
    attendanceSheets: any[];
    systemSettings: { key: string; value: any }[];
    systemUsers: SystemUserAccount[];
    attendanceLogs: AttendanceRecord[];
    careerTimeline?: CareerTimelineEvent[];
    allowances?: AllowanceRecord[];
    promotions?: PromotionRecord[];
    barcodeLogs?: BarcodeScanLog[];
  };
}

export interface AutoBackupRecord {
  id: string;
  timestamp: string;
  triggerReason: 'logout' | 'major_change' | 'periodic' | 'manual';
  triggerDescription: string;
  employeeCount: number;
  totalRecordsCount: number;
  sizeKb: number;
  payload: DatabaseBackupPayload;
}

export interface AutoBackupSettings {
  enabled: boolean;
  backupOnLogout: boolean;
  backupOnMajorChanges: boolean;
  periodicIntervalMinutes: number; // e.g. 30, 60, 120
  majorChangeThreshold: number; // e.g. 5 changes or batch ops
  maxRetainedBackups: number; // e.g. 10
}

export type WorkspaceTab =
  | 'dashboard'
  | 'employees'
  | 'daily_movements'
  | 'reports'
  | 'calendar'
  | 'settings'
  | 'profile'
  | 'db_test'
  | 'backup'
  | 'movement_designer'
  | 'allow_promotions' // العلاوات والترفيعات
  | 'retirement' // هيئة وإجراءات التقاعد
  | 'barcode_hub' // مركز الباركود والبطاقات الذكية الحضور
  | 'analytics'; // رسوم بيانية تفاعلية للموظفين (Recharts)

// Commercial Licensing & Trial Management
export type LicenseType = 'trial' | 'time_limited' | 'lifetime';

export interface LicenseStatus {
  isLicensed: boolean; // True if valid active license OR active trial
  licenseType: LicenseType;
  licenseKey?: string;
  activatedAt?: string;
  expiresAt?: string; // ISO date string, or 'never' for lifetime
  daysRemaining: number;
  isExpired: boolean;
  isLifetime: boolean;
  isTrial: boolean;
  trialDaysTotal: number;
  trialDaysRemaining: number;
  clientName?: string;
  organizationName?: string;
  deviceId: string;
  hardwareFingerprint: string;
  sellerContactPhone: string;
  sellerContactWhatsApp: string;
  lastClockCheck?: string;
  tamperDetected?: boolean;
}

export interface LicenseConfig {
  trialDays: number; // e.g. 15, 30 days
  allowTrial: boolean;
  firstInstallDate?: string;
  activeLicenseKey?: string;
  licensePayload?: {
    key: string;
    type: 'time_limited' | 'lifetime';
    durationDays?: number;
    expiresAt?: string;
    clientName?: string;
    deviceId?: string;
    issuedAt: string;
    signature: string;
  };
  sellerPhone: string;
  sellerWhatsApp: string;
  sellerMasterPin: string; // PIN to open seller key generator
  generatedKeysHistory: GeneratedKeyRecord[];
}

export interface GeneratedKeyRecord {
  id: string;
  key: string;
  licenseType: 'time_limited' | 'lifetime';
  durationDays?: number;
  clientName?: string;
  boundDeviceId?: string; // empty if usable on any machine
  generatedAt: string;
  notes?: string;
  isRedeemed?: boolean;
}

// -------------------------------------------------------------
// كيانات ونماذج أجهزة البصمة والربط المباشر مع المنظومة (Biometric Device & Integration)
// -------------------------------------------------------------

export type BiometricBrand =
  | 'zkteco'
  | 'realand'
  | 'anviz'
  | 'hikvision'
  | 'dahua'
  | 'suprema'
  | 'virdi'
  | 'idemia'
  | 'matrix'
  | 'universal_usb'
  | 'other';

export type BiometricModality =
  | 'fingerprint' // بصمة إصبع
  | 'face' // بصمة وجه
  | 'palm' // بصمة كف
  | 'iris' // بصمة عين / قزحية
  | 'iris_palm' // بصمة عين وكف
  | 'rfid_card' // بطاقة ذكية RFID
  | 'password' // رمز سري PIN
  | 'voice' // بصمة صوت
  | 'voice_pin' // صوت ورمز سري
  | 'multi_biometric'; // متعدد المقاييس الحيوية (وجه + إصبع + بطاقة)

export type BiometricConnectionType =
  | 'tcp_ip' // شبكة سلكية LAN (TCP/IP Standalone Port 4370)
  | 'wifi' // شبكة لاسلكية Wi-Fi TCP/IP
  | 'usb_direct' // توصيل مباشر بالحاسبة كابل USB (WebUSB / WebSerial)
  | 'cloud_adms' // بروتوكول السحابة ADMS Push
  | 'http_api' // واجهة برمجية HTTP / REST API (هيكفيجن / داهوا)
  | 'rs485' // منفذ تسلسلي RS485 / COM Port
  | 'usb_flash_import'; // استيراد فلاش ميموري USB (.dat / .csv / .xlsx / .txt)

export type BiometricDeviceStatus = 'online' | 'offline' | 'connecting' | 'warning';

export interface BiometricDevice {
  id: string; // المعرف الفريد للجهاز (مثال: DEV-ZK-01)
  name: string; // اسم الجهاز (مثال: جهاز بصمة البوابة الرئيسية - ZKTeco)
  model: string; // الموديل (مثال: ZKTeco uFace800 / Realand A-C071)
  brand: BiometricBrand;
  deviceType: BiometricModality; // نوع البصمة (إصبع / وجه / كف / بطاقة / عين / صوت)
  ipAddress: string; // عنوان الآي بي (قابل للتعديل بحسب العنوان الحقيقي بالشبكة)
  port: number; // المنفذ (Default: 4370 للـ ZKTeco, 80 أو 8000 للهيكفيجن)
  subnetMask?: string; // قناع الشبكة
  gateway?: string; // البوابة الافتراضية
  connectionType: BiometricConnectionType; // نوع وطريقة التوصيل
  serialNumber?: string;
  commKey?: string; // مفتاح الاتصال / كلمة المرور (Comm Key / Password)
  departmentId?: string;
  departmentName?: string; // القسم التابع له الجهاز
  location: string; // موقع التثبيت
  status: BiometricDeviceStatus;
  lastPingLatencyMs?: number; // زمن استجابة البينغ بالملي ثانية
  lastPingAt?: string; // وقت وتاريخ آخر فحص بينغ ناجح
  lastSyncAt?: string; // وقت وتاريخ آخر مزامنة وسحب للسجلات
  userCount?: number; // عدد الموظفين المسجلين في ذاكرة الجهاز
  logCount?: number; // عدد سجلات البصمة المخزنة في الجهاز
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BiometricPunchRecord {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceIp?: string;
  deviceType: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  department: string;
  timestamp: string; // ISO datetime
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  punchType: 'check_in' | 'check_out' | 'break_out' | 'break_in';
  verificationType: 'fingerprint' | 'face' | 'card' | 'palm' | 'iris' | 'password' | 'voice';
  status: 'on_time' | 'late' | 'early_leave' | 'leave_authorized' | 'regular';
  lateMinutes?: number;
  associatedLeave?: string; // e.g. "إجازة اعتيادية"
  isProcessedInMovements: boolean;
  notes?: string;
}

export interface BiometricProbePacket {
  packetNumber: number;
  success: boolean;
  latencyMs: number;
  message: string;
  bytesReceived: number;
  ttl?: number;
}

export interface BiometricPingResult {
  deviceIp: string;
  port: number;
  success: boolean;
  latencyMs: number;
  packetsTransmitted: number;
  packetsReceived: number;
  packetLossPercent: number;
  timestamp: string;
  details: string;
  packets?: BiometricProbePacket[];
}

export const DEFAULT_BIOMETRIC_DEVICES: BiometricDevice[] = [
  {
    id: 'DEV-ZK-01',
    name: 'جهاز بصمة البوابة والمدخل الرئيسي (ZKTeco)',
    model: 'ZKTeco uFace800 Plus',
    brand: 'zkteco',
    deviceType: 'multi_biometric',
    ipAddress: '192.168.1.201',
    port: 4370,
    subnetMask: '255.255.255.0',
    gateway: '192.168.1.1',
    connectionType: 'tcp_ip',
    serialNumber: 'ZK-IQ-8839210',
    commKey: '0',
    departmentName: 'المدخل العام والمصاعد',
    location: 'بوابة الاستقبال المركزية - الطابق الأرضي',
    status: 'offline',
    userCount: 42,
    logCount: 0,
    notes: 'جهاز متعدد حيوي (بصمة وجه + بصمة إصبع + بطاقة RFID)',
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'DEV-HK-02',
    name: 'جهاز بصمة قسم الشؤون الهندسية والمشاريع',
    model: 'Hikvision DS-K1T671MF Face Terminal',
    brand: 'hikvision',
    deviceType: 'face',
    ipAddress: '192.168.1.202',
    port: 80,
    subnetMask: '255.255.255.0',
    gateway: '192.168.1.1',
    connectionType: 'tcp_ip',
    serialNumber: 'HK-ENG-491028',
    commKey: 'admin123',
    departmentName: 'قسم الشؤون الهندسية والمشاريع',
    location: 'مدخل قسم الهندسة - الطابق الأول',
    status: 'offline',
    userCount: 18,
    logCount: 0,
    notes: 'محطة تعرف على الوجه فائقة السرعة مع كاميرا مزدوجة',
    createdAt: '2026-01-15T09:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'DEV-RL-03',
    name: 'جهاز بصمة قسم الموارد البشرية (USB مباشر مع الحاسبة)',
    model: 'Realand A-C071 USB/LAN',
    brand: 'realand',
    deviceType: 'fingerprint',
    ipAddress: '192.168.1.203',
    port: 5005,
    connectionType: 'usb_direct',
    serialNumber: 'RL-HR-992314',
    commKey: '0',
    departmentName: 'قسم إدارة الموارد البشرية',
    location: 'مكتب مسؤول شؤون الموظفين (متصل بالحاسبة مباشرة عبر USB)',
    status: 'offline',
    userCount: 28,
    logCount: 0,
    notes: 'جهاز بصمة إصبع متصل بكابل USB مباشر مع حاسبة شؤون الموظفين (Plug & Play)',
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'DEV-AN-04',
    name: 'جهاز بصمة شعبة تكنولوجيا المعلومات والحاسبة',
    model: 'Anviz FacePass 7 Pro',
    brand: 'anviz',
    deviceType: 'iris_palm',
    ipAddress: '192.168.1.204',
    port: 5010,
    connectionType: 'wifi',
    serialNumber: 'ANV-IT-33201',
    commKey: '0',
    departmentName: 'شعبة تكنولوجيا المعلومات والحاسبة',
    location: 'غرفة السيرفرات والتحكم المركزي',
    status: 'offline',
    userCount: 12,
    logCount: 0,
    notes: 'يدعم بصمة الكف والأشعة تحت الحمراء وشبكة Wi-Fi',
    createdAt: '2026-02-10T11:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
];




