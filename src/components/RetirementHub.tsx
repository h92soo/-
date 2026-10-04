import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Search,
  Filter,
  FileText,
  Printer,
  History,
  User,
  UserCheck,
  ShieldCheck,
  X,
  ExternalLink,
  RotateCcw,
  Calculator,
  Coins,
  Receipt,
  FileSpreadsheet,
  PlusCircle,
  Edit3,
  CalendarDays,
  Percent,
  Check,
  ChevronDown,
  Info,
  DollarSign,
  ArrowRight,
  TrendingUp,
  Sliders,
  HeartPulse,
  Stethoscope,
  Scale,
  Save,
  FileCheck,
  HelpCircle,
} from 'lucide-react';
import {
  Employee,
  OrganizationSettings,
  CareerSystemSettings,
  FiveYearLeaveRecord,
  RetirementReason,
  DEFAULT_CAREER_SETTINGS,
} from '../types';
import { employeeService } from '../services/employeeService';
import { toast } from './ToastNotification';
import { PaginationControl } from './PaginationControl';
import { GovernmentEmblem } from './GovernmentEmblem';

interface RetirementHubProps {
  organization: OrganizationSettings;
  onOpenEmployeeProfile?: (employeeId: string) => void;
  onBackToDashboard?: () => void;
}

export const RetirementHub: React.FC<RetirementHubProps> = ({
  organization,
  onOpenEmployeeProfile,
  onBackToDashboard,
}) => {
  const [activeTab, setActiveTab] = useState<
    'approaching' | 'gratuity_calculator' | 'ministerial_rules' | 'five_year_leave' | 'retired_directory'
  >('approaching');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [careerSettings, setCareerSettings] = useState<CareerSystemSettings | null>(null);

  // --- Approaching Retirement Filter ---
  const [approachingFilter, setApproachingFilter] = useState<
    'all' | 'legal_age' | 'eligible_by_request' | 'health_condition'
  >('all');

  // --- Ministerial Regulations Form State (تعديل الضوابط والتعليمات الوزارية) ---
  const [ministerialForm, setMinisterialForm] = useState<CareerSystemSettings>(DEFAULT_CAREER_SETTINGS);
  const [isSavingMinisterialRules, setIsSavingMinisterialRules] = useState(false);
  const [rulesSaveSuccess, setRulesSaveSuccess] = useState(false);

  // --- Gratuity & Pension Calculator State ---
  const [calcSelectedEmpId, setCalcSelectedEmpId] = useState<string>('');
  const [calcSelectedReason, setCalcSelectedReason] = useState<RetirementReason>('legal_age');
  const [calcDisabilityPercent, setCalcDisabilityPercent] = useState<number>(60);
  const [calcIsWorkInjury, setCalcIsWorkInjury] = useState<boolean>(false);
  const [calcCustomYears, setCalcCustomYears] = useState<number | ''>('');
  const [calcCustomBaseSalary, setCalcCustomBaseSalary] = useState<number | ''>('');
  const [calcCustomTotalSalary, setCalcCustomTotalSalary] = useState<number | ''>('');

  // --- Retirement Execution Modal State ---
  const [retireTargetEmp, setRetireTargetEmp] = useState<Employee | null>(null);
  const [isNewRetirementModalOpen, setIsNewRetirementModalOpen] = useState(false);
  const [newRetireEmpId, setNewRetireEmpId] = useState('');
  const [retirementReason, setRetirementReason] = useState<RetirementReason>('legal_age');
  const [medicalBoardDecisionNum, setMedicalBoardDecisionNum] = useState('');
  const [medicalBoardDate, setMedicalBoardDate] = useState(new Date().toISOString().slice(0, 10));
  const [disabilityPercent, setDisabilityPercent] = useState<number>(60);
  const [medicalHospital, setMedicalHospital] = useState('دائرة اللجان الطبية المركزية - مستشفى الكرخ التعليمي');
  const [disabilityType, setDisabilityType] = useState('عجز طبي دائم مانع من أداء الواجب الوظيفي');
  const [medicalBoardRecommendation, setMedicalBoardRecommendation] = useState(
    'توصي اللجنة الطبية بعدم صلاحيته للاستمرار في الخدمة المدنية وإحالته للتقاعد الصحي وفق أحكام المادة (13)'
  );
  const [isWorkInjury, setIsWorkInjury] = useState(false);
  const [applicantRequestDate, setApplicantRequestDate] = useState(new Date().toISOString().slice(0, 10));
  const [ministerialApprovalNum, setMinisterialApprovalNum] = useState('');
  const [ministerialApprovalDate, setMinisterialApprovalDate] = useState(new Date().toISOString().slice(0, 10));
  const [retirementDate, setRetirementDate] = useState(new Date().toISOString().slice(0, 10));
  const [retirementOrderNum, setRetirementOrderNum] = useState('');
  const [retirementOrderDate, setRetirementOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [retirementNotes, setRetirementNotes] = useState('');
  const [retiredSearchFilterReason, setRetiredSearchFilterReason] = useState<'all' | RetirementReason>('all');

  // --- 5-Year Leave Management State ---
  const [isFiveYearLeaveModalOpen, setIsFiveYearLeaveModalOpen] = useState(false);
  const [fiveYearTargetEmpId, setFiveYearTargetEmpId] = useState('');
  const [fiveYearSalaryType, setFiveYearSalaryType] = useState<'full_base_salary' | 'half_base_salary'>('full_base_salary');
  const [fiveYearStartDate, setFiveYearStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [fiveYearEndDate, setFiveYearEndDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 5);
    return d.toISOString().slice(0, 10);
  });
  const [fiveYearOrderNum, setFiveYearOrderNum] = useState('');
  const [fiveYearOrderDate, setFiveYearOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [fiveYearPensionPercent, setFiveYearPensionPercent] = useState<number>(10);
  const [fiveYearNotes, setFiveYearNotes] = useState('');

  // Editing existing 5-year leave (ميزة التعديل المستقبلي)
  const [editFiveYearEmp, setEditFiveYearEmp] = useState<Employee | null>(null);
  const [editSalaryType, setEditSalaryType] = useState<'full_base_salary' | 'half_base_salary'>('full_base_salary');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editOrderNum, setEditOrderNum] = useState('');
  const [editOrderDate, setEditOrderDate] = useState('');
  const [editBaseSalary, setEditBaseSalary] = useState<number>(0);
  const [editPensionPercent, setEditPensionPercent] = useState<number>(10);
  const [editNotes, setEditNotes] = useState('');

  // Interrupting / Resuming from 5-Year Leave
  const [interruptTargetEmp, setInterruptTargetEmp] = useState<Employee | null>(null);
  const [interruptDate, setInterruptDate] = useState(new Date().toISOString().slice(0, 10));
  const [interruptOrderNum, setInterruptOrderNum] = useState('');
  const [interruptOrderDate, setInterruptOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [interruptNotes, setInterruptNotes] = useState('');

  // Printable Order Preview
  const [previewOrder, setPreviewOrder] = useState<{
    type: 'retirement' | 'five_year_leave';
    employee: Employee;
    orderNum: string;
    orderDate: string;
    effectiveDate: string;
    notes: string;
    details?: any;
  } | null>(null);

  const RETIREMENT_REASON_TITLES: Record<RetirementReason, string> = {
    legal_age: 'السن القانوني الإلزامي (60 سنة - المادة 10 من قانون التقاعد الموحد)',
    employee_request: 'بناءً على طلب الموظف / التقاعد الاختياري (المادة 12 - خدمة 15 سنة فأكثر)',
    health_condition: 'لأسباب صحية وعجز طبي بقرار اللجنة الطبية الرسمية (المادة 13)',
    service_termination: 'إنهاء الخدمة / إلغاء الوظيفة أو مقتضيات المصلحة العامة والقرارات الوزارية',
    resignation: 'استقالة مقبولة مع استحقاق تقاعدي قانوني',
  };

  const loadData = async () => {
    const [allEmps, settings] = await Promise.all([
      employeeService.getAll(),
      employeeService.getCareerSettings(),
    ]);
    setEmployees(allEmps);
    setCareerSettings(settings);
    if (settings) {
      setMinisterialForm(settings);
    }
    if (!calcSelectedEmpId && allEmps.length > 0) {
      setCalcSelectedEmpId(allEmps[0].id);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = employeeService.subscribe(() => {
      loadData();
    });
    return unsub;
  }, []);

  const retirementAge = careerSettings?.retirementAgeYears || 60;
  const warningMonths = careerSettings?.retirementWarningMonths || 6;
  const earlyAge = careerSettings?.earlyRetirementMinAge || 50;
  const earlyService = careerSettings?.earlyRetirementMinServiceYears || 15;
  const now = new Date();

  // Active vs Retired vs Five-Year Leave
  const activeEmployees = employees.filter((e) => e.status !== 'retired');
  const retiredEmployees = employees.filter((e) => e.status === 'retired');
  const fiveYearLeaveEmployees = employees.filter(
    (e) => e.status === 'five_year_leave' || (e.fiveYearLeave && e.fiveYearLeave.isActive)
  );

  // Pagination states
  const [approachingPage, setApproachingPage] = useState<number>(1);
  const [approachingPageSize, setApproachingPageSize] = useState<number>(20);

  const [retiredPage, setRetiredPage] = useState<number>(1);
  const [retiredPageSize, setRetiredPageSize] = useState<number>(20);

  // Counts of approaching categories
  const legalAgeCount = useMemo(() => {
    return activeEmployees.filter((e) => {
      const birth = e.birthDate ? new Date(e.birthDate) : null;
      if (!birth) return false;
      const retireDue = new Date(birth);
      retireDue.setFullYear(retireDue.getFullYear() + retirementAge);
      const diffMonths = (retireDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.4);
      return diffMonths <= warningMonths;
    }).length;
  }, [activeEmployees, retirementAge, warningMonths, now]);

  const eligibleByRequestCount = useMemo(() => {
    return activeEmployees.filter((e) => {
      const birth = e.birthDate ? new Date(e.birthDate) : null;
      const age = birth ? (now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25) : 0;
      const hireYear = e.hireDate ? parseInt(e.hireDate.slice(0, 4), 10) : 2005;
      const serviceYears = Math.max(0, 2026 - hireYear);
      return age >= earlyAge && serviceYears >= earlyService;
    }).length;
  }, [activeEmployees, earlyAge, earlyService, now]);

  const healthCasesCount = useMemo(() => {
    return activeEmployees.filter(
      (e) =>
        (e.disabilityPercentage && e.disabilityPercentage >= (careerSettings?.healthRetirementMinDisabilityPercent || 50)) ||
        Boolean(e.medicalBoardDecisionNumber)
    ).length;
  }, [activeEmployees, careerSettings]);

  // Approaching Retirement List with full reason tagging
  const approachingRetirementList = useMemo(() => {
    return activeEmployees.filter((e) => {
      const birth = e.birthDate ? new Date(e.birthDate) : null;
      const age = birth ? (now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25) : 0;
      const hireYear = e.hireDate ? parseInt(e.hireDate.slice(0, 4), 10) : 2005;
      const serviceYears = Math.max(0, 2026 - hireYear);

      let isLegalAgeApproaching = false;
      if (birth) {
        const retireDue = new Date(birth);
        retireDue.setFullYear(retireDue.getFullYear() + retirementAge);
        const diffMonths = (retireDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.4);
        isLegalAgeApproaching = diffMonths <= warningMonths;
      }

      const isEligibleByRequest = age >= earlyAge && serviceYears >= earlyService;
      const hasHealthCondition =
        (e.disabilityPercentage && e.disabilityPercentage >= (careerSettings?.healthRetirementMinDisabilityPercent || 50)) ||
        Boolean(e.medicalBoardDecisionNumber);

      if (approachingFilter === 'legal_age') {
        return isLegalAgeApproaching;
      }
      if (approachingFilter === 'eligible_by_request') {
        return isEligibleByRequest;
      }
      if (approachingFilter === 'health_condition') {
        return hasHealthCondition;
      }
      return isLegalAgeApproaching || isEligibleByRequest || hasHealthCondition;
    });
  }, [activeEmployees, retirementAge, warningMonths, earlyAge, earlyService, approachingFilter, careerSettings, now]);

  const paginatedApproachingList = useMemo(() => {
    if (approachingPageSize === 0) return approachingRetirementList;
    const start = (approachingPage - 1) * approachingPageSize;
    return approachingRetirementList.slice(start, start + approachingPageSize);
  }, [approachingRetirementList, approachingPage, approachingPageSize]);

  // Selected Employee for Calculator
  const calcTargetEmp = useMemo(() => {
    return employees.find((e) => e.id === calcSelectedEmpId) || employees[0] || null;
  }, [employees, calcSelectedEmpId]);

  // Real-time Iraqi Law Gratuity & Pension Calculation with Reason & Ministerial Rules
  const gratuityCalculationResult = useMemo(() => {
    if (!calcTargetEmp) return null;

    const customY = calcCustomYears !== '' ? Number(calcCustomYears) : undefined;
    const customB = calcCustomBaseSalary !== '' ? Number(calcCustomBaseSalary) : undefined;
    const customT = calcCustomTotalSalary !== '' ? Number(calcCustomTotalSalary) : undefined;

    return employeeService.calculateIraqiRetirementGratuity(
      calcTargetEmp,
      customY,
      customB,
      customT,
      {
        retirementReason: calcSelectedReason,
        disabilityPercentage: calcDisabilityPercent,
        isWorkInjury: calcIsWorkInjury,
        careerSettings: careerSettings || DEFAULT_CAREER_SETTINGS,
      }
    );
  }, [
    calcTargetEmp,
    calcCustomYears,
    calcCustomBaseSalary,
    calcCustomTotalSalary,
    calcSelectedReason,
    calcDisabilityPercent,
    calcIsWorkInjury,
    careerSettings,
  ]);

  // Quick Presets for Ministerial Policies (نماذج القرارات والتعديلات الوزارية)
  const applyMinisterialPreset = (
    preset: 'law_2019' | 'higher_education' | 'health_ministry' | 'flexible_early' | 'defaults'
  ) => {
    switch (preset) {
      case 'law_2019':
        setMinisterialForm({
          ...DEFAULT_CAREER_SETTINGS,
          retirementAgeYears: 60,
          earlyRetirementMinAge: 50,
          earlyRetirementMinServiceYears: 15,
          universityProfRetirementAge: 63,
          specialistDoctorRetirementAge: 65,
          healthRetirementMinDisabilityPercent: 50,
          minLegalPensionAmount: 600000,
          ministerialCircularReference: 'قانون التقاعد الموحد رقم (9) لسنة 2014 المعدل بالقانون رقم (26) لسنة 2019',
        });
        toast.info('تم تطبيق نموذج: قانون التقاعد الموحد رقم 26 لسنة 2019 (سن 60 إلزامي، 50 اختياري، خدمة 15 سنة)');
        break;
      case 'higher_education':
        setMinisterialForm({
          ...(careerSettings || DEFAULT_CAREER_SETTINGS),
          retirementAgeYears: 60,
          universityProfRetirementAge: 65,
          earlyRetirementMinAge: 50,
          earlyRetirementMinServiceYears: 15,
          ministerialCircularReference: 'ضوابط وزارة التعليم العالي والبحث العلمي - استثناء التدريسيين وحملة الألقاب العلمية (سن 65 سنة)',
        });
        toast.info('تم تطبيق نموذج: ضوابط وزارة التعليم العالي (سن 65 للأكاديميين)');
        break;
      case 'health_ministry':
        setMinisterialForm({
          ...(careerSettings || DEFAULT_CAREER_SETTINGS),
          retirementAgeYears: 60,
          specialistDoctorRetirementAge: 65,
          healthRetirementMinDisabilityPercent: 50,
          healthRetirementRequiresMedicalBoard: true,
          enableHealthRetirementWorkInjuryBonus: true,
          ministerialCircularReference: 'ضوابط وزارة الصحة والبيئة وقرارات مجلس الوزراء للأطباء الاستشاريين والاختصاص',
        });
        toast.info('تم تطبيق نموذج: ضوابط وزارة الصحة والبيئة (سن 65 للأطباء الاختصاص واللجان الطبية)');
        break;
      case 'flexible_early':
        setMinisterialForm({
          ...(careerSettings || DEFAULT_CAREER_SETTINGS),
          retirementAgeYears: 60,
          earlyRetirementMinAge: 45,
          earlyRetirementMinServiceYears: 15,
          minLegalPensionAmount: 600000,
          ministerialCircularReference: 'مقترح التعديل الوزاري المرن - تيسير التقاعد بطلب الموظف في سن 45 سنة',
        });
        toast.info('تم تطبيق نموذج: التقاعد الاختياري المرن (سن 45 سنة مع خدمة 15 سنة)');
        break;
      case 'defaults':
        setMinisterialForm(DEFAULT_CAREER_SETTINGS);
        toast.info('تم استعادة الضوابط الافتراضية لقانون التقاعد الموحد');
        break;
    }
  };

  // Save Ministerial Regulations (حفظ وتطبيق الضوابط والتعليمات الوزارية)
  const handleSaveMinisterialRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingMinisterialRules(true);
    try {
      await employeeService.saveCareerSettings(ministerialForm);
      setCareerSettings(ministerialForm);
      setRulesSaveSuccess(true);
      toast.success('تم حفظ وتحديث الضوابط والتعليمات الوزارية وقوانين التقاعد بنجاح وتطبيقها فورياً على النظام.');
      setTimeout(() => setRulesSaveSuccess(false), 3500);
    } catch {
      toast.error('حدث خطأ أثناء حفظ الضوابط الوزارية.');
    } finally {
      setIsSavingMinisterialRules(false);
    }
  };

  // Helper to open retirement modal with pre-configured settings
  const openRetireModalForEmployee = (emp: Employee, defaultReason: RetirementReason = 'legal_age') => {
    setRetireTargetEmp(emp);
    setNewRetireEmpId(emp.id);
    setRetirementReason(defaultReason);
    setRetirementDate(new Date().toISOString().slice(0, 10));
    setRetirementOrderDate(new Date().toISOString().slice(0, 10));
    setRetirementOrderNum(`تق-2026-${Math.floor(100 + Math.random() * 900)}`);
    setApplicantRequestDate(new Date().toISOString().slice(0, 10));
    setMinisterialApprovalNum(`وز-2026-${Math.floor(100 + Math.random() * 900)}`);
    setMinisterialApprovalDate(new Date().toISOString().slice(0, 10));
    setMedicalBoardDecisionNum(`ل-ط-${Math.floor(100 + Math.random() * 900)}/2026`);
    setMedicalBoardDate(new Date().toISOString().slice(0, 10));
    setDisabilityPercent(careerSettings?.healthRetirementMinDisabilityPercent || 60);
    setIsWorkInjury(false);
    setDisabilityType('عجز طبي دائم مانع من أداء الواجب الوظيفي');
    setMedicalBoardRecommendation('توصي اللجنة الطبية بعدم صلاحيته للاستمرار في الخدمة المدنية وإحالته للتقاعد الصحي وفق المادة (13)');
    if (defaultReason === 'health_condition') {
      setRetirementNotes(
        'استناداً لأحكام المادة (13) من قانون التقاعد الموحد رقم (9) لسنة 2014 المعدل، وبناءً على قرار اللجنة الطبية بثبوت عدم الصلاحية للاستمرار في الخدمة المدنية.'
      );
    } else if (defaultReason === 'employee_request') {
      setRetirementNotes(
        'استناداً لأحكام المادة (12) من قانون التقاعد الموحد رقم (9) لسنة 2014 المعدل، وبناءً على طلب الموظف التحريري وموافقة معالي الوزير المحترم وفق مقتضيات المصلحة العامة.'
      );
    } else {
      setRetirementNotes(
        'استناداً لأحكام المادة (10) من قانون التقاعد الموحد رقم (9) لسنة 2014 المعدل، لبلوغه السن القانوني للإحالة على التقاعد وإكماله المدة القانونية.'
      );
    }
    setIsNewRetirementModalOpen(true);
  };

  // Execute Retirement with Gratuity, Specific Reason, and Full Legal Dossier
  const handleExecuteRetire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retireTargetEmp) return;

    try {
      const calc = employeeService.calculateIraqiRetirementGratuity(
        retireTargetEmp,
        undefined,
        undefined,
        undefined,
        {
          retirementReason,
          disabilityPercentage: Number(disabilityPercent),
          isWorkInjury,
          careerSettings: careerSettings || DEFAULT_CAREER_SETTINGS,
        }
      );

      const orderNumber = retirementOrderNum || `تق-2026-${Math.floor(100 + Math.random() * 900)}`;

      const updated = await employeeService.retireEmployee(retireTargetEmp.id, {
        retirementDate,
        orderNumber,
        orderDate: retirementOrderDate,
        notes: retirementNotes,
        retirementReason,
        retirementReasonTitle: RETIREMENT_REASON_TITLES[retirementReason],
        medicalBoardDecisionNumber: retirementReason === 'health_condition' ? medicalBoardDecisionNum : undefined,
        medicalBoardDate: retirementReason === 'health_condition' ? medicalBoardDate : undefined,
        disabilityPercentage: retirementReason === 'health_condition' ? Number(disabilityPercent) : undefined,
        medicalHospital: retirementReason === 'health_condition' ? medicalHospital : undefined,
        disabilityType: retirementReason === 'health_condition' ? disabilityType : undefined,
        medicalBoardRecommendation: retirementReason === 'health_condition' ? medicalBoardRecommendation : undefined,
        applicantRequestDate: retirementReason === 'employee_request' ? applicantRequestDate : undefined,
        ministerialApprovalNumber: retirementReason === 'employee_request' ? ministerialApprovalNum : undefined,
        ministerialApprovalDate: retirementReason === 'employee_request' ? ministerialApprovalDate : undefined,
        gratuityAmount: calc.gratuityAmount,
        accumulatedLeaveCashAmount: calc.accumulatedLeaveCashAmount,
        estimatedMonthlyPension: calc.estimatedMonthlyPension,
        totalRetirementPayout: calc.totalRetirementPayout,
        calculatedServiceYears: calc.serviceYears,
        performedBy: 'مدير هيئة شؤون التقاعد والخدمة المدنية',
      });

      toast.success(
        `تمت إحالة الموظف (${updated.fullName}) على التقاعد [${RETIREMENT_REASON_TITLES[retirementReason]}] واحتساب مكافأة نهاية الخدمة (${calc.gratuityAmount.toLocaleString('en-US')} د.ع) بنجاح.`
      );

      setPreviewOrder({
        type: 'retirement',
        employee: updated,
        orderNum: orderNumber,
        orderDate: retirementOrderDate,
        effectiveDate: retirementDate,
        notes: retirementNotes,
        details: {
          ...calc,
          retirementReason,
          retirementReasonTitle: RETIREMENT_REASON_TITLES[retirementReason],
          medicalBoardDecisionNumber: medicalBoardDecisionNum,
          medicalBoardDate,
          disabilityPercentage: disabilityPercent,
          medicalHospital,
          disabilityType,
          medicalBoardRecommendation,
          isWorkInjury,
          applicantRequestDate,
          ministerialApprovalNumber: ministerialApprovalNum,
          ministerialApprovalDate,
        },
      });

      setRetireTargetEmp(null);
      setIsNewRetirementModalOpen(false);
      await loadData();
    } catch (err) {
      toast.error('فشل إحالة الموظف على التقاعد');
    }
  };

  // Grant 5-Year Leave
  const handleGrantFiveYearLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fiveYearTargetEmpId) {
      toast.error('يرجى اختيار الموظف أولاً');
      return;
    }

    try {
      const emp = employees.find((e) => e.id === fiveYearTargetEmpId);
      if (!emp) return;

      const orderNumber = fiveYearOrderNum || `إج5-2026-${Math.floor(100 + Math.random() * 900)}`;

      await employeeService.grantFiveYearLeave(emp.id, {
        salaryType: fiveYearSalaryType,
        startDate: fiveYearStartDate,
        endDate: fiveYearEndDate,
        orderNumber,
        orderDate: fiveYearOrderDate,
        pensionDeductionPercent: fiveYearPensionPercent,
        notes: fiveYearNotes,
        performedBy: 'مدير شؤون الموظفين والخدمة المدنية',
      });

      toast.success(
        `تم منح الموظف (${emp.fullName}) إجازة 5 سنوات ${
          fiveYearSalaryType === 'full_base_salary' ? 'براتب اسمي كامل' : 'بنصف راتب اسمي'
        } بنجاح.`
      );

      setIsFiveYearLeaveModalOpen(false);
      setFiveYearTargetEmpId('');
      setFiveYearNotes('');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'فشل منح إجازة الـ 5 سنوات');
    }
  };

  // Update existing 5-Year Leave (تعديل مستقبلي)
  const handleSaveEditFiveYearLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFiveYearEmp) return;

    try {
      await employeeService.updateFiveYearLeave(editFiveYearEmp.id, {
        salaryType: editSalaryType,
        startDate: editStartDate,
        endDate: editEndDate,
        orderNumber: editOrderNum,
        orderDate: editOrderDate,
        baseSalary: editBaseSalary,
        pensionDeductionPercent: editPensionPercent,
        notes: editNotes,
        performedBy: 'مسؤول الموارد البشرية والرواتب',
      });

      toast.success(`تم تحديث وتعديل شروط إجازة الـ 5 سنوات للموظف (${editFiveYearEmp.fullName}) بنجاح.`);
      setEditFiveYearEmp(null);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'فشل تعديل بيانات الإجازة');
    }
  };

  // Interrupt 5-Year Leave (قطع الإجازة والمباشرة بالعمل)
  const handleExecuteInterrupt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interruptTargetEmp) return;

    try {
      await employeeService.interruptFiveYearLeave(
        interruptTargetEmp.id,
        interruptDate,
        'مدير شؤون الموظفين',
        interruptOrderNum || `مب-2026-${Math.floor(100 + Math.random() * 900)}`,
        interruptOrderDate,
        interruptNotes
      );

      toast.success(
        `تم قطع إجازة الـ 5 سنوات ومباشرة الموظف (${interruptTargetEmp.fullName}) بالعمل بنجاح.`
      );
      setInterruptTargetEmp(null);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'فشل قطع الإجازة');
    }
  };

  // Reactivate retired employee
  const handleReactivate = async (emp: Employee) => {
    if (
      confirm(`هل أنت متأكد من رغبتك بإعادة تفعيل سجل الموظف (${emp.fullName}) وإلغاء حالة التقاعد؟`)
    ) {
      try {
        await employeeService.reactivateEmployee(emp.id, 'مدير النظام');
        toast.success(`تمت إعادة تفعيل قيد الموظف (${emp.fullName}) بنجاح.`);
        await loadData();
      } catch (err) {
        toast.error('فشل إعادة تفعيل السجل');
      }
    }
  };

  const filteredRetired = useMemo(() => {
    return retiredEmployees.filter((e) => {
      if (retiredSearchFilterReason !== 'all') {
        const empReason = e.retirementReason || 'legal_age';
        if (empReason !== retiredSearchFilterReason) return false;
      }
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        e.fullName.toLowerCase().includes(q) ||
        e.employeeNumber.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        (e.retirementReasonTitle && e.retirementReasonTitle.toLowerCase().includes(q))
      );
    });
  }, [retiredEmployees, searchQuery, retiredSearchFilterReason]);

  const paginatedRetiredList = useMemo(() => {
    if (retiredPageSize === 0) return filteredRetired;
    const start = (retiredPage - 1) * retiredPageSize;
    return filteredRetired.slice(start, start + retiredPageSize);
  }, [filteredRetired, retiredPage, retiredPageSize]);

  return (
    <div className="space-y-6 pb-8">
      {/* 1. Prestigious Government & Apple-Grade Header Banner */}
      <div className="p-6 rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_20px_rgba(15,23,42,0.04)] backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <GovernmentEmblem
            size="md"
            appearance={{}}
            organization={organization}
            className="w-13 h-13 shrink-0 drop-shadow-sm"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/20">
                قانون التقاعد الموحد رقم (9) لسنة 2014 المعدل ⚖️
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20">
                الضوابط والتعليمات الوزارية المرنة
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              هيئة شؤون التقاعد ومكافأة نهاية الخدمة والضوابط الوزارية
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              إدارة الإحالة على التقاعد بالأسباب الصحية (المادة 13)، بطلب من الموظف (المادة 12)، وبلوغ السن القانوني (المادة 10)، مع تعديل الضوابط الوزارية وإجازات الـ 5 سنوات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              const first = activeEmployees[0];
              if (first) {
                openRetireModalForEmployee(first, 'legal_age');
              } else {
                toast.error('لا يوجد موظفون متاحون للإحالة حالياً');
              }
            }}
            className="px-4 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/20 cursor-pointer"
          >
            <Briefcase className="w-4 h-4" />
            <span>إحالة تقاعد جديدة</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFiveYearTargetEmpId(activeEmployees[0]?.id || '');
              setIsFiveYearLeaveModalOpen(true);
            }}
            className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>منح إجازة 5 سنوات</span>
          </button>

          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all border border-slate-200/80 dark:border-slate-700 cursor-pointer"
            >
              <span>الرئيسية</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Apple-Grade Metric Statistics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Approaching Legal Age */}
        <div className="p-4 rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_12px_rgba(15,23,42,0.03)] flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              تنبيه السن القانوني ({retirementAge} سنة)
            </div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {legalAgeCount}
            </div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
              المادة 10 (خلال {warningMonths} أشهر)
            </div>
          </div>
        </div>

        {/* Eligible by Request */}
        <div className="p-4 rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_12px_rgba(15,23,42,0.03)] flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              مؤهلون بطلب الموظف
            </div>
            <div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
              {eligibleByRequestCount}
            </div>
            <div className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold">
              المادة 12 (خدمة {earlyService}+ سنة وسن {earlyAge}+)
            </div>
          </div>
        </div>

        {/* Total Retired with Reasons Summary */}
        <div className="p-4 rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_12px_rgba(15,23,42,0.03)] flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              المتقاعدون المؤرشفون
            </div>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {retiredEmployees.length}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1.5 flex-wrap">
              <span>صحية: {retiredEmployees.filter((e) => e.retirementReason === 'health_condition').length}</span>
              <span>•</span>
              <span>بطلب: {retiredEmployees.filter((e) => e.retirementReason === 'employee_request').length}</span>
              <span>•</span>
              <span>سن: {retiredEmployees.filter((e) => !e.retirementReason || e.retirementReason === 'legal_age').length}</span>
            </div>
          </div>
        </div>

        {/* 5-Year Leave Count */}
        <div className="p-4 rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_12px_rgba(15,23,42,0.03)] flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              إجازة الـ 5 سنوات
            </div>
            <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
              {fiveYearLeaveEmployees.length}
            </div>
            <div className="text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold">
              براتب اسمي كامل أو نصف اسمي
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sleek Apple-Style Segmented Navigation Tabs */}
      <div className="p-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 flex flex-wrap items-center gap-1.5 text-xs font-bold no-print">
        <button
          type="button"
          onClick={() => setActiveTab('approaching')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'approaching'
              ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-sm border border-slate-200/60 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>القادمون على التقاعد للتنبيه ({approachingRetirementList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gratuity_calculator')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'gratuity_calculator'
              ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-sm border border-slate-200/60 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Calculator className="w-4 h-4 text-purple-600" />
          <span>حاسبة مكافأة نهاية الخدمة والتقاعد الذكية (القانون العراقي)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ministerial_rules')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'ministerial_rules'
              ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-sm border border-slate-200/60 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Scale className="w-4 h-4 text-indigo-600" />
          <span>ضوابط وتعديلات التقاعد الوزارية (تحديث القوانين والتعليمات) ⚖️</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('five_year_leave')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'five_year_leave'
              ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-sm border border-slate-200/60 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CalendarDays className="w-4 h-4 text-indigo-600" />
          <span>إدارة إجازات الـ 5 سنوات ({fiveYearLeaveEmployees.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('retired_directory')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'retired_directory'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200/60 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <History className="w-4 h-4 text-slate-500" />
          <span>أرشيف وسجلات المتقاعدين ({retiredEmployees.length})</span>
        </button>
      </div>

      {/* 4. Tab Content Container */}
      <div className="rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_24px_rgba(15,23,42,0.04)] p-6 space-y-5">
        
        {/* TAB 1: APPROACHING RETIREMENT */}
        {activeTab === 'approaching' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>الموظفون المستوفون أو المشرفون على شروط التقاعد (السن، بطلب الموظف، الأسباب الصحية)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  احتساب دقيق استناداً لقانون التقاعد الموحد رقم (9) لسنة 2014 المعدل مع فرز الحالات بحسب السند القانوني
                </p>
              </div>

              {/* Sub-Filter Controls */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setApproachingFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    approachingFilter === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  الكل ({approachingRetirementList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setApproachingFilter('legal_age')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    approachingFilter === 'legal_age'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  السن القانوني ({legalAgeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setApproachingFilter('eligible_by_request')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    approachingFilter === 'eligible_by_request'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  بطلب الموظف ({eligibleByRequestCount})
                </button>
                <button
                  type="button"
                  onClick={() => setApproachingFilter('health_condition')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    approachingFilter === 'health_condition'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  اللجان الطبية ({healthCasesCount})
                </button>
              </div>
            </div>

            {approachingRetirementList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-80" />
                <p className="text-xs font-semibold">لا يوجد موظفون مطابقون للمحددات المختارة حالياً.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200/80 dark:border-slate-700">
                    <tr>
                      <th className="p-3 font-bold">الرقم الوظيفي</th>
                      <th className="p-3 font-bold">اسم الموظف الرباعي</th>
                      <th className="p-3 font-bold">القسم والتشكيل</th>
                      <th className="p-3 font-bold">تاريخ الميلاد والسن</th>
                      <th className="p-3 font-bold">سنوات الخدمة</th>
                      <th className="p-3 font-bold">السند وحالة الاستحقاق</th>
                      <th className="p-3 font-bold text-center">إجراءات الإحالة والاحتساب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedApproachingList.map((emp) => {
                      const birth = emp.birthDate ? new Date(emp.birthDate) : null;
                      const age = birth ? Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : 0;
                      const retireDue = birth ? new Date(birth) : new Date('2026-01-01');
                      retireDue.setFullYear(retireDue.getFullYear() + retirementAge);
                      const dueStr = retireDue.toISOString().slice(0, 10);
                      const hireYear = emp.hireDate ? parseInt(emp.hireDate.slice(0, 4), 10) : 1995;
                      const serviceYears = Math.max(0, 2026 - hireYear);

                      const diffMonths = birth
                        ? (retireDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.4)
                        : 99;
                      const isLegalAge = diffMonths <= warningMonths;
                      const isEligibleRequest = age >= earlyAge && serviceYears >= earlyService;
                      const hasHealth = Boolean(emp.disabilityPercentage && emp.disabilityPercentage >= 50) || Boolean(emp.medicalBoardDecisionNumber);

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                            {emp.employeeNumber}
                          </td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">
                            <div>{emp.fullName}</div>
                            {emp.jobTitle && <div className="text-[10px] text-slate-400 font-normal">{emp.jobTitle}</div>}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">
                            <div>{emp.department}</div>
                          </td>
                          <td className="p-3 font-mono">
                            <div className="text-slate-700 dark:text-slate-200">{emp.birthDate || '—'}</div>
                            <div className="text-[10px] text-slate-400">العمر الحالي: {age} سنة</div>
                          </td>
                          <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {serviceYears} سنة خدمة
                          </td>
                          <td className="p-3">
                            <div className="space-y-1">
                              {isLegalAge && (
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/80">
                                  <span>⚖️ السن القانوني ({dueStr})</span>
                                </div>
                              )}
                              {isEligibleRequest && (
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300/80">
                                  <span>📝 مؤهل للتقاعد بطلب الموظف (المادة 12)</span>
                                </div>
                              )}
                              {hasHealth && (
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300/80">
                                  <span>🩺 قرار لجنة طبية (المادة 13)</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* Calculate Gratuity Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setCalcSelectedEmpId(emp.id);
                                  if (isEligibleRequest) setCalcSelectedReason('employee_request');
                                  else if (hasHealth) setCalcSelectedReason('health_condition');
                                  else setCalcSelectedReason('legal_age');
                                  setActiveTab('gratuity_calculator');
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                                title="احتساب المكافأة والراتب التقاعدي"
                              >
                                <Calculator className="w-3.5 h-3.5" />
                                <span>حساب المستحقات</span>
                              </button>

                              {/* Execute Retirement based on reason */}
                              {isEligibleRequest ? (
                                <button
                                  type="button"
                                  onClick={() => openRetireModalForEmployee(emp, 'employee_request')}
                                  className="px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                                  title="إحالة على التقاعد بناءً على طلب الموظف (المادة 12)"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>إحالة بطلب الموظف</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openRetireModalForEmployee(emp, 'legal_age')}
                                  className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                                  title="إحالة على التقاعد لبلوغ السن القانوني (المادة 10)"
                                >
                                  <Briefcase className="w-3.5 h-3.5" />
                                  <span>إحالة لبلوغ السن</span>
                                </button>
                              )}

                              {/* Health Retirement Option */}
                              <button
                                type="button"
                                onClick={() => openRetireModalForEmployee(emp, 'health_condition')}
                                className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold text-[11px] transition-colors cursor-pointer"
                                title="إحالة لأسباب صحية وعجز طبي بقرار اللجنة الطبية (المادة 13)"
                              >
                                <HeartPulse className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {approachingRetirementList.length > 20 && (
              <PaginationControl
                totalItems={approachingRetirementList.length}
                currentPage={approachingPage}
                pageSize={approachingPageSize}
                onPageChange={setApproachingPage}
                onPageSizeChange={(sz) => {
                  setApproachingPageSize(sz);
                  setApproachingPage(1);
                }}
              />
            )}
          </div>
        )}

        {/* TAB 2: SMART GRATUITY & PENSION CALCULATOR (قانون التقاعد الموحد العراقي والضوابط الوزارية) */}
        {activeTab === 'gratuity_calculator' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 flex items-start gap-3">
              <Info className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="text-xs text-purple-950 dark:text-purple-200 leading-relaxed">
                <span className="font-bold">السند القانوني المعتمد وفق التعديلات الوزارية: </span>
                تُحسب مكافأة نهاية الخدمة وفق أحكام <strong className="font-bold">المادة (21/أولاً) والمادة (22) من قانون التقاعد الموحد رقم (9) لسنة 2014 المعدل بالقانون (26) لسنة 2019</strong>، مع صرف رصيد الإجازات الاعتيادية المتراكمة نقداً (حتى {careerSettings?.maxAccumulatedLeaveDays || 180} يوماً) وفق المادة (45) من قانون الخدمة المدنية، واحتساب الراتب التقاعدي المضمون للمحالين صحياً (المادة 13) أو بطلب الموظف (المادة 12).
              </div>
            </div>

            {/* Selection & Parameters Inputs */}
            <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اختر الموظف لاحتساب مستحقاته التقاعدية تلقائياً:
                  </label>
                  <select
                    value={calcSelectedEmpId}
                    onChange={(e) => {
                      setCalcSelectedEmpId(e.target.value);
                      setCalcCustomYears('');
                      setCalcCustomBaseSalary('');
                      setCalcCustomTotalSalary('');
                    }}
                    className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.fullName} ({e.employeeNumber}) - {e.department} - {e.jobTitle}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    سبب الإحالة المراد دراسته واحتسابه:
                  </label>
                  <select
                    value={calcSelectedReason}
                    onChange={(e) => setCalcSelectedReason(e.target.value as RetirementReason)}
                    className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 font-bold text-purple-900 dark:text-purple-200 outline-none"
                  >
                    <option value="legal_age">⚖️ بلوغ السن القانوني الإلزامي (المادة 10)</option>
                    <option value="employee_request">📝 بطلب من الموظف / التقاعد الاختياري (المادة 12)</option>
                    <option value="health_condition">🩺 لأسباب صحية وعجز طبي بقرار اللجنة (المادة 13)</option>
                    <option value="service_termination">🏛️ إنهاء خدمة / مصلحة عامة وقرارات وزارية</option>
                    <option value="resignation">📄 استقالة مقبولة مع استحقاق</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Health Parameters for Calculator */}
              {calcSelectedReason === 'health_condition' && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in text-xs">
                  <div>
                    <label className="block font-bold text-rose-900 dark:text-rose-200 mb-1">
                      نسبة العجز الطبي المعتمدة (%):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={calcDisabilityPercent}
                        onChange={(e) => setCalcDisabilityPercent(parseInt(e.target.value, 10))}
                        className="flex-1 accent-rose-600"
                      />
                      <span className="font-mono font-bold text-rose-700 dark:text-rose-300 w-12 text-center bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-rose-200">
                        {calcDisabilityPercent}%
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      الحد الأدنى المعتمد وزارياً: {careerSettings?.healthRetirementMinDisabilityPercent || 50}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-900 dark:text-rose-200">
                      <input
                        type="checkbox"
                        checked={calcIsWorkInjury}
                        onChange={(e) => setCalcIsWorkInjury(e.target.checked)}
                        className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 accent-rose-600"
                      />
                      <span>العجز ناجم عن إصابة عمل أثناء الخدمة وبسببها (+15% مخصصات عجز)</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    سنوات الخدمة التقاعدية:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={
                      calcCustomYears !== ''
                        ? calcCustomYears
                        : gratuityCalculationResult?.serviceYears || 30
                    }
                    onChange={(e) => setCalcCustomYears(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                    placeholder="30"
                  />
                  {calcSelectedReason === 'health_condition' && (
                    <span className="text-[10px] text-indigo-600 font-semibold">
                      تُضمن {careerSettings?.healthRetirementGuaranteedYears || 15} سنة خدمة كحد أدنى للمحال صحياً
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الراتب الاسمي الشهري (د.ع):
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={
                      calcCustomBaseSalary !== ''
                        ? calcCustomBaseSalary
                        : gratuityCalculationResult?.baseSalary || 500000
                    }
                    onChange={(e) => setCalcCustomBaseSalary(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                    placeholder="500000"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الراتب الكلي الأخير (د.ع):
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={
                      calcCustomTotalSalary !== ''
                        ? calcCustomTotalSalary
                        : gratuityCalculationResult?.totalSalary || 850000
                    }
                    onChange={(e) => setCalcCustomTotalSalary(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                    placeholder="850000"
                  />
                </div>
              </div>
            </div>

            {/* Calculations Breakdown Cards */}
            {gratuityCalculationResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: End of Service Gratuity */}
                  <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-200 dark:border-purple-800/80 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                          1. مكافأة نهاية الخدمة (المادة 21)
                        </span>
                        <Coins className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="text-2xl font-black font-mono text-purple-700 dark:text-purple-300 my-1">
                        {gratuityCalculationResult.gratuityAmount.toLocaleString('en-US')} د.ع
                      </div>
                      <p className="text-[11px] text-purple-800/80 dark:text-purple-300/80 leading-relaxed">
                        {gratuityCalculationResult.gratuityRule}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-purple-200/60 dark:border-purple-800/60 text-[10px] text-slate-500 font-medium">
                      المادة 21 / قانون التقاعد الموحد
                    </div>
                  </div>

                  {/* Card 2: Accumulated Leave Payout */}
                  <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-200 dark:border-amber-800/80 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                          2. بدل الإجازات المتراكمة نقداً ({careerSettings?.maxAccumulatedLeaveDays || 180} يوماً)
                        </span>
                        <Receipt className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="text-2xl font-black font-mono text-amber-700 dark:text-amber-300 my-1">
                        {gratuityCalculationResult.accumulatedLeaveCashAmount.toLocaleString('en-US')} د.ع
                      </div>
                      <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                        عن {gratuityCalculationResult.payableLeaveDays} يوماً مستحقاً (بحد أقصى {careerSettings?.maxAccumulatedLeaveDays || 180} يوماً) محسوبة على كامل الراتب والمخصصات.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-amber-200/60 dark:border-amber-800/60 text-[10px] text-slate-500 font-medium">
                      المادة 45 / قانون الخدمة المدنية رقم 24
                    </div>
                  </div>

                  {/* Card 3: Estimated Monthly Pension */}
                  <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-200 dark:border-emerald-800/80 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                          3. الراتب التقاعدي الشهري التقديري
                        </span>
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300 my-1">
                        {gratuityCalculationResult.estimatedMonthlyPension.toLocaleString('en-US')} د.ع / شهرياً
                      </div>
                      <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                        معادلة (الاسمي × {gratuityCalculationResult.effectivePensionYears} سنة × {careerSettings?.pensionCalculationFactor || 2.5}%) مع ضمان الحد الأدنى ({(careerSettings?.minLegalPensionAmount || 600000).toLocaleString('en-US')} د.ع).
                      </p>
                    </div>
                    <div className="pt-3 border-t border-emerald-200/60 dark:border-emerald-800/60 text-[10px] text-slate-500 font-medium">
                      هيئة التقاعد الوطنية / وزارة المالية
                    </div>
                  </div>
                </div>

                {/* Total Immediate Payout Ribbon */}
                <div className="p-5 rounded-3xl bg-slate-900 text-white shadow-xl flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] text-purple-300 font-bold uppercase tracking-wider">
                      إجمالي الدفعة النقدية الفورية المودعة للموظف:
                    </span>
                    <div className="text-3xl font-black font-mono text-white">
                      {gratuityCalculationResult.totalRetirementPayout.toLocaleString('en-US')}{' '}
                      <span className="text-sm font-sans font-normal text-slate-300">دينار عراقي</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      تشمل مكافأة نهاية الخدمة + البدل النقدي لكامل رصيد الإجازات الاعتيادية المتراكمة
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>طباعة بيان الحسبة الرسمية</span>
                    </button>

                    {calcTargetEmp && calcTargetEmp.status !== 'retired' && (
                      <button
                        type="button"
                        onClick={() => openRetireModalForEmployee(calcTargetEmp, calcSelectedReason)}
                        className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Briefcase className="w-4 h-4" />
                        <span>إحالة رسمية مع تثبيت المستحقات</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MINISTERIAL REGULATIONS & DYNAMIC RULES CONFIGURATION (ضوابط وتعديلات التقاعد الوزارية) */}
        {activeTab === 'ministerial_rules' && (
          <div className="space-y-6">
            {/* Header Description & Presets */}
            <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-200 dark:border-indigo-900/60 space-y-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-bold">
                      المرونة الوزارية والتشريعية ⚖️
                    </span>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      لوحة تعديل وتحديث الضوابط والتعليمات الوزارية لقوانين التقاعد
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed max-w-3xl">
                    تتيح هذه اللوحة للإدارة الموارد البشرية تعديل معايير السن القانوني الإجباري، سن التقاعد بطلب الموظف، اشتراطات ونسب العجز الطبي للتقاعد الصحي، والحدود الدنيا للرواتب التقاعدية ومكافآت نهاية الخدمة فورياً وفق أحدث التعاميم وقرارات مجلس الوزراء والوزارات المعنية.
                  </p>
                </div>

                {rulesSaveSuccess && (
                  <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 border border-emerald-300 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>تم تطبيق وتعميم الضوابط المحدثة بنجاح!</span>
                  </div>
                )}
              </div>

              {/* Quick Ministerial Presets Buttons */}
              <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-900/40">
                <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-2">
                  نماذج وسياسات وزارية جاهزة للاستدعاء السريع (One-Click Ministerial Presets):
                </span>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <button
                    type="button"
                    onClick={() => applyMinisterialPreset('law_2019')}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold transition-all shadow-2xs"
                  >
                    قانون 26 لسنة 2019 (سن 60 إلزامي / 50 اختياري)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMinisterialPreset('higher_education')}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold transition-all shadow-2xs"
                  >
                    ضوابط وزارة التعليم العالي (سن 65 للأكاديميين)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMinisterialPreset('health_ministry')}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold transition-all shadow-2xs"
                  >
                    ضوابط وزارة الصحة (الأطباء الاختصاص واللجان الطبية)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMinisterialPreset('flexible_early')}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold transition-all shadow-2xs"
                  >
                    التقاعد الاختياري المرن (سن 45 سنة وخدمة 15 سنة)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMinisterialPreset('defaults')}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold transition-all"
                  >
                    استعادة الضوابط الافتراضية
                  </button>
                </div>
              </div>
            </div>

            {/* Ministerial Rules Form */}
            <form onSubmit={handleSaveMinisterialRules} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* 1. السن القانوني الإلزامي والاستثناءات التخصصية (المادة 10) */}
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 pb-2 border-b border-slate-100 dark:border-slate-700">
                    <Scale className="w-5 h-5" />
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      1. السن القانوني الإلزامي والاستثناءات (المادة 10)
                    </h4>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        السن القانوني الإلزامي العام للتقاعد (سنة):
                      </label>
                      <input
                        type="number"
                        min="50"
                        max="70"
                        required
                        value={ministerialForm.retirementAgeYears}
                        onChange={(e) =>
                          setMinisterialForm({
                            ...ministerialForm,
                            retirementAgeYears: parseInt(e.target.value, 10) || 60,
                          })
                        }
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                      />
                      <span className="text-[10px] text-slate-400">
                        الافتراضي 60 سنة وفق التعديل رقم 26 لسنة 2019 (يمكن التعديل إلى 63 سنة حسب المشاريع الوزارية).
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          سن تقاعد أساتذة الجامعات والتدريسيين:
                        </label>
                        <input
                          type="number"
                          min="60"
                          max="75"
                          required
                          value={ministerialForm.universityProfRetirementAge}
                          onChange={(e) =>
                            setMinisterialForm({
                              ...ministerialForm,
                              universityProfRetirementAge: parseInt(e.target.value, 10) || 63,
                            })
                          }
                          className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                        />
                        <span className="text-[10px] text-slate-400">افتراضياً 63 أو 65 سنة لحملة لقب أستاذ</span>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          سن تقاعد الأطباء الاستشاريين والاختصاص:
                        </label>
                        <input
                          type="number"
                          min="60"
                          max="75"
                          required
                          value={ministerialForm.specialistDoctorRetirementAge}
                          onChange={(e) =>
                            setMinisterialForm({
                              ...ministerialForm,
                              specialistDoctorRetirementAge: parseInt(e.target.value, 10) || 65,
                            })
                          }
                          className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                        />
                        <span className="text-[10px] text-slate-400">افتراضياً 65 سنة للكوادر الطبية التخصصية</span>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        مدة التنبيه والإنذار الإداري المسبق قبل التقاعد (أشهر):
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        required
                        value={ministerialForm.retirementWarningMonths}
                        onChange={(e) =>
                          setMinisterialForm({
                            ...ministerialForm,
                            retirementWarningMonths: parseInt(e.target.value, 10) || 6,
                          })
                        }
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                      />
                      <span className="text-[10px] text-slate-400">
                        مدة ظهور تنبيه الموظف في لوحة القادمين على التقاعد (افتراضياً 6 أشهر).
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. ضوابط التقاعد بناءً على طلب الموظف (المادة 12) */}
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 pb-2 border-b border-slate-100 dark:border-slate-700">
                    <FileText className="w-5 h-5" />
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      2. التقاعد بناءً على طلب الموظف / الاختياري (المادة 12)
                    </h4>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        السن الأدنى لطلب التقاعد الاختياري (سنة):
                      </label>
                      <input
                        type="number"
                        min="40"
                        max="60"
                        required
                        value={ministerialForm.earlyRetirementMinAge}
                        onChange={(e) =>
                          setMinisterialForm({
                            ...ministerialForm,
                            earlyRetirementMinAge: parseInt(e.target.value, 10) || 50,
                          })
                        }
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                      />
                      <span className="text-[10px] text-slate-400">
                        الافتراضي 50 سنة، أو 45 سنة حسب مشاريع تخفيض سن التقاعد الاختياري.
                      </span>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        الحد الأدنى لسنوات الخدمة التقاعدية للتقاعد بطلب الموظف:
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="30"
                        required
                        value={ministerialForm.earlyRetirementMinServiceYears}
                        onChange={(e) =>
                          setMinisterialForm({
                            ...ministerialForm,
                            earlyRetirementMinServiceYears: parseInt(e.target.value, 10) || 15,
                          })
                        }
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                      />
                      <span className="text-[10px] text-slate-400">
                        المادة 12 تشترط خدمة لا تقل عن 15 سنة فعلية مدفوع عنها التوقيفات التقاعدية.
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 text-purple-900 dark:text-purple-200 text-[11px] leading-relaxed">
                      💡 <strong>الاشتراط القانوني:</strong> الإحالة بطلب الموظف تشترط موافقة الوزير المختص أو رئيس الجهة غير المرتبطة بوزارة وفق مقتضيات المصلحة العامة واستمرار المرفق العام.
                    </div>
                  </div>
                </div>

                {/* 3. ضوابط التقاعد لأسباب صحية وعجز طبي (المادة 13) */}
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 pb-2 border-b border-slate-100 dark:border-slate-700">
                    <HeartPulse className="w-5 h-5" />
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      3. ضوابط التقاعد لأسباب صحية وعجز طبي (المادة 13)
                    </h4>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        الحد الأدنى لنسبة العجز الطبي المعتمدة بقرار اللجنة (%):
                      </label>
                      <input
                        type="number"
                        min="20"
                        max="100"
                        required
                        value={ministerialForm.healthRetirementMinDisabilityPercent}
                        onChange={(e) =>
                          setMinisterialForm({
                            ...ministerialForm,
                            healthRetirementMinDisabilityPercent: parseInt(e.target.value, 10) || 50,
                          })
                        }
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                      />
                      <span className="text-[10px] text-slate-400">
                        الحد الأدنى النظامي 50% أو 60% لثبوت عدم صلاحية الموظف للاستمرار في الخدمة.
                      </span>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        سنوات الخدمة المضمونة دنيا لاحتساب الراتب التقاعدي الصحي:
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="25"
                        required
                        value={ministerialForm.healthRetirementGuaranteedYears || 15}
                        onChange={(e) =>
                          setMinisterialForm({
                            ...ministerialForm,
                            healthRetirementGuaranteedYears: parseInt(e.target.value, 10) || 15,
                          })
                        }
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                      />
                      <span className="text-[10px] text-slate-400">
                        المادة 13 تضمن راتباً تقاعدياً للمحال صحياً باحتساب 15 سنة خدمة كحد أدنى حتى وإن كانت خدمته الفعلية أقل.
                      </span>
                    </div>

                    <div className="space-y-2 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={ministerialForm.healthRetirementRequiresMedicalBoard}
                          onChange={(e) =>
                            setMinisterialForm({
                              ...ministerialForm,
                              healthRetirementRequiresMedicalBoard: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                        />
                        <span>اشتراط قرار ومصادقة اللجنة الطبية الرسمية ومستشفى الإحالة</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={ministerialForm.enableHealthRetirementWorkInjuryBonus ?? true}
                          onChange={(e) =>
                            setMinisterialForm({
                              ...ministerialForm,
                              enableHealthRetirementWorkInjuryBonus: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 accent-rose-600"
                        />
                        <span>احتساب مخصصات عجز إضافية (+15%) إذا كان العجز ناشئاً عن إصابة عمل أثناء الخدمة وبسببها</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 4. ضوابط احتساب مكافأة نهاية الخدمة والراتب التقاعدي */}
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 pb-2 border-b border-slate-100 dark:border-slate-700">
                    <Coins className="w-5 h-5" />
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      4. ضوابط المكافأة والرواتب التقاعدية (المادة 21)
                    </h4>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        الحد الأدنى للراتب التقاعدي الشهري المضمون (د.ع):
                      </label>
                      <input
                        type="number"
                        step="50000"
                        min="300000"
                        max="2000000"
                        required
                        value={ministerialForm.minLegalPensionAmount || 600000}
                        onChange={(e) =>
                          setMinisterialForm({
                            ...ministerialForm,
                            minLegalPensionAmount: parseInt(e.target.value, 10) || 600000,
                          })
                        }
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                      />
                      <span className="text-[10px] text-slate-400">
                        الحد الأدنى للراتب التقاعدي وفق قرارات مجلس الوزراء (افتراضياً 600,000 د.ع مع مخصصات المعيشة).
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          معامل احتساب الراتب (%):
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          max="5"
                          required
                          value={ministerialForm.pensionCalculationFactor || 2.5}
                          onChange={(e) =>
                            setMinisterialForm({
                              ...ministerialForm,
                              pensionCalculationFactor: parseFloat(e.target.value) || 2.5,
                            })
                          }
                          className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                        />
                        <span className="text-[10px] text-slate-400">المعامل السنوي (2.5% عن كل سنة خدمة)</span>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          سقف رصيد الإجازات نقداً (أيام):
                        </label>
                        <input
                          type="number"
                          min="30"
                          max="360"
                          required
                          value={ministerialForm.maxAccumulatedLeaveDays || 180}
                          onChange={(e) =>
                            setMinisterialForm({
                              ...ministerialForm,
                              maxAccumulatedLeaveDays: parseInt(e.target.value, 10) || 180,
                            })
                          }
                          className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                        />
                        <span className="text-[10px] text-slate-400">الحد الأقصى للبدل النقدي (180 يوماً / 6 أشهر)</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          نسبة التوقيفات التقاعدية (%):
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="25"
                          required
                          value={ministerialForm.pensionDeductionPercent}
                          onChange={(e) =>
                            setMinisterialForm({
                              ...ministerialForm,
                              pensionDeductionPercent: parseInt(e.target.value, 10) || 10,
                            })
                          }
                          className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                        />
                        <span className="text-[10px] text-slate-400">الاستقطاع الشهري من الراتب الاسمي (10%)</span>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          سقف مكافأة نهاية الخدمة (أشهر):
                        </label>
                        <input
                          type="number"
                          min="12"
                          max="60"
                          required
                          value={ministerialForm.endOfServiceGratuityMonthsCap}
                          onChange={(e) =>
                            setMinisterialForm({
                              ...ministerialForm,
                              endOfServiceGratuityMonthsCap: parseInt(e.target.value, 10) || 36,
                            })
                          }
                          className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                        />
                        <span className="text-[10px] text-slate-400">الحد الأقصى للأشهر المحتسبة (36 شهراً)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. مرجع السند والتعاميم الوزارية الحاكمة */}
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3">
                <label className="block font-bold text-xs text-slate-700 dark:text-slate-300">
                  مرجع السند والتعميم الوزاري الحاكم لهذه الضوابط (يُدرج تلقائياً في الأوامر الإدارية):
                </label>
                <input
                  type="text"
                  required
                  value={
                    ministerialForm.ministerialCircularReference ||
                    'قانون التقاعد الموحد رقم (9) لسنة 2014 المعدل بالقانون رقم (26) لسنة 2019 وقرارات مجلس الوزراء'
                  }
                  onChange={(e) =>
                    setMinisterialForm({
                      ...ministerialForm,
                      ministerialCircularReference: e.target.value,
                    })
                  }
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold font-mono text-slate-900 dark:text-white"
                  placeholder="مثال: قرار مجلس الوزراء رقم 334 لسنة 2023 وتعليمات وزارة المالية"
                />
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setMinisterialForm(DEFAULT_CAREER_SETTINGS)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
                >
                  استعادة القيم الافتراضية الأصلية
                </button>

                <button
                  type="submit"
                  disabled={isSavingMinisterialRules}
                  className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingMinisterialRules ? 'جارٍ حفظ الضوابط...' : 'حفظ وتطبيق الضوابط الوزارية فورياً ⚖️'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: 5-YEAR LEAVE MANAGEMENT (إجازة الخمس سنوات براتب اسمي أو نصف اسمي) */}
        {activeTab === 'five_year_leave' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    إدارة إجازات الخمس سنوات (قوانين الموازنة الاتحادية والخدمة المدنية)
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-500/20">
                    اسمي كامل أو نصف اسمي
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  منح الإجازة، احتساب صافي الراتب بعد استقطاع التوقيفات التقاعدية (10%)، مع إمكانية التعديل المستقبلي أو قطع الإجازة والمباشرة
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFiveYearTargetEmpId(activeEmployees[0]?.id || '');
                  setIsFiveYearLeaveModalOpen(true);
                }}
                className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>منح إجازة جديدة لموظف</span>
              </button>
            </div>

            {fiveYearLeaveEmployees.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <CalendarDays className="w-10 h-10 text-indigo-500 mx-auto opacity-70" />
                <p className="text-xs font-semibold">لا يوجد موظفون متمتعون بإجازة 5 سنوات حالياً.</p>
                <button
                  type="button"
                  onClick={() => {
                    setFiveYearTargetEmpId(activeEmployees[0]?.id || '');
                    setIsFiveYearLeaveModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition-colors"
                >
                  منح أول إجازة الآن
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200/80 dark:border-slate-700">
                    <tr>
                      <th className="p-3 font-bold">الموظف</th>
                      <th className="p-3 font-bold">القسم والوظيفة</th>
                      <th className="p-3 font-bold">نوع الراتب المصروف</th>
                      <th className="p-3 font-bold">تاريخ البدء والانتهاء</th>
                      <th className="p-3 font-bold">الصافي الشهري المستلم</th>
                      <th className="p-3 font-bold">التوقيفات التقاعدية</th>
                      <th className="p-3 font-bold text-center">خيارات التعديل والمباشرة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {fiveYearLeaveEmployees.map((emp) => {
                      const leave = emp.fiveYearLeave;
                      const isFull = leave?.salaryType === 'full_base_salary';

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-3 font-bold text-slate-900 dark:text-white">
                            <div>{emp.fullName}</div>
                            <div className="font-mono text-[11px] text-slate-400 font-normal">
                              {emp.employeeNumber}
                            </div>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">
                            <div>{emp.department}</div>
                            <div className="text-[10px] text-slate-400">{emp.jobTitle}</div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                isFull
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                  : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isFull ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              {isFull ? 'راتب اسمي كامل (100%)' : 'نصف راتب اسمي (50%)'}
                            </span>
                          </td>
                          <td className="p-3 font-mono">
                            <div className="text-slate-800 dark:text-slate-200">من: {leave?.startDate || '—'}</div>
                            <div className="text-indigo-600 dark:text-indigo-400 text-[11px]">إلى: {leave?.endDate || '—'}</div>
                          </td>
                          <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                            {(leave?.netMonthlyPaid || 0).toLocaleString('en-US')} د.ع
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-500">
                            <div>{(leave?.monthlyPensionDeduction || 0).toLocaleString('en-US')} د.ع</div>
                            <div className="text-[10px] text-slate-400">({leave?.pensionDeductionPercent || 10}%) محتسبة للخدمة</div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* Future Edit Button (إمكانية التعديل مستقبلاً) */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditFiveYearEmp(emp);
                                  setEditSalaryType(leave?.salaryType || 'full_base_salary');
                                  setEditStartDate(leave?.startDate || '');
                                  setEditEndDate(leave?.endDate || '');
                                  setEditOrderNum(leave?.orderNumber || '');
                                  setEditOrderDate(leave?.orderDate || '');
                                  setEditBaseSalary(leave?.baseSalaryAtLeave || emp.baseSalary || 500000);
                                  setEditPensionPercent(leave?.pensionDeductionPercent || 10);
                                  setEditNotes(leave?.notes || '');
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                                title="تعديل شروط الإجازة والراتب والتواريخ مستقبلاً"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>تعديل الإجازة</span>
                              </button>

                              {/* Interrupt / Resume Duty Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setInterruptTargetEmp(emp);
                                  setInterruptDate(new Date().toISOString().slice(0, 10));
                                  setInterruptOrderNum(`مب-2026-${Math.floor(100 + Math.random() * 900)}`);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                                title="قطع الإجازة والمباشرة بالعمل فوراً"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>قطع ومباشرة</span>
                              </button>

                              {/* Print Order Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewOrder({
                                    type: 'five_year_leave',
                                    employee: emp,
                                    orderNum: leave?.orderNumber || `إج5-2026-${Math.floor(100 + Math.random() * 900)}`,
                                    orderDate: leave?.orderDate || new Date().toISOString().slice(0, 10),
                                    effectiveDate: leave?.startDate || '',
                                    notes: leave?.notes || '',
                                    details: leave,
                                  });
                                }}
                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                title="طباعة أمر منح الإجازة"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: RETIRED DIRECTORY & ARCHIVE */}
        {activeTab === 'retired_directory' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  أرشيف وسجلات المتقاعدين والمكافآت المصروفة
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  سجلات محفوظة بالكامل مصنفة بحسب السند القانوني (أسباب صحية، بطلب الموظف، السن القانوني) مع إمكانية طباعة الأمر الإداري
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Reason Filter Pills */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setRetiredSearchFilterReason('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      retiredSearchFilterReason === 'all'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    الكل ({retiredEmployees.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRetiredSearchFilterReason('health_condition')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      retiredSearchFilterReason === 'health_condition'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    أسباب صحية ({retiredEmployees.filter((e) => e.retirementReason === 'health_condition').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRetiredSearchFilterReason('employee_request')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      retiredSearchFilterReason === 'employee_request'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    بطلب الموظف ({retiredEmployees.filter((e) => e.retirementReason === 'employee_request').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRetiredSearchFilterReason('legal_age')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      retiredSearchFilterReason === 'legal_age'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    السن ({retiredEmployees.filter((e) => !e.retirementReason || e.retirementReason === 'legal_age').length})
                  </button>
                </div>

                <div className="relative w-full sm:w-56">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="بحث بالاسم أو الرقم..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs pr-9 pl-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  />
                </div>
              </div>
            </div>

            {filteredRetired.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <History className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
                <p className="text-xs">لا يوجد متقاعدون مطابقون للتصنيف المحدد.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200/80 dark:border-slate-700">
                    <tr>
                      <th className="p-3 font-bold">الرقم الوظيفي</th>
                      <th className="p-3 font-bold">اسم المتقاعد</th>
                      <th className="p-3 font-bold">القسم والوظيفة</th>
                      <th className="p-3 font-bold">سبب الإحالة والضوابط الوزارية</th>
                      <th className="p-3 font-bold">تاريخ الإحالة</th>
                      <th className="p-3 font-bold">رقم الأمر الإداري</th>
                      <th className="p-3 font-bold">المكافأة المصروفة</th>
                      <th className="p-3 font-bold text-center">الخيارات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedRetiredList.map((emp) => {
                      const reason = emp.retirementReason || 'legal_age';
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                            {emp.employeeNumber}
                          </td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">
                            <div>{emp.fullName}</div>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">
                            <div>{emp.department}</div>
                            <div className="text-[10px] text-slate-400">{emp.jobTitle}</div>
                          </td>
                          <td className="p-3">
                            {reason === 'health_condition' ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300/80">
                                  <HeartPulse className="w-3 h-3 text-rose-600" />
                                  <span>أسباب صحية (المادة 13)</span>
                                </span>
                                {emp.disabilityPercentage && (
                                  <div className="text-[10px] text-rose-600 dark:text-rose-400 font-mono">
                                    عجز {emp.disabilityPercentage}% {emp.medicalBoardDecisionNumber ? `| قرار: ${emp.medicalBoardDecisionNumber}` : ''}
                                  </div>
                                )}
                              </div>
                            ) : reason === 'employee_request' ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300/80">
                                  <FileText className="w-3 h-3 text-purple-600" />
                                  <span>بطلب الموظف (المادة 12)</span>
                                </span>
                                {emp.ministerialApprovalNumber && (
                                  <div className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">
                                    موافقة وزير: {emp.ministerialApprovalNumber}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/80">
                                <Scale className="w-3 h-3 text-amber-600" />
                                <span>السن القانوني (المادة 10)</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-purple-600 dark:text-purple-400 font-bold">
                            {emp.retirementDate || '—'}
                          </td>
                          <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                            {emp.retirementOrderNumber || '—'}
                          </td>
                          <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {emp.gratuityAmount
                              ? `${emp.gratuityAmount.toLocaleString('en-US')} د.ع`
                              : 'تمت التصفية والتسليم'}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewOrder({
                                    type: 'retirement',
                                    employee: emp,
                                    orderNum: emp.retirementOrderNumber || 'تق-2026-001',
                                    orderDate: emp.retirementDate || '2026-01-01',
                                    effectiveDate: emp.retirementDate || '2026-01-01',
                                    notes: emp.retirementNotes || '',
                                    details: {
                                      gratuityAmount: emp.gratuityAmount,
                                      accumulatedLeaveCashAmount: emp.accumulatedLeaveCashAmount,
                                      estimatedMonthlyPension: emp.estimatedMonthlyPension,
                                      totalRetirementPayout: emp.totalRetirementPayout,
                                      retirementReason: emp.retirementReason || 'legal_age',
                                      retirementReasonTitle:
                                        emp.retirementReasonTitle ||
                                        RETIREMENT_REASON_TITLES[emp.retirementReason || 'legal_age'],
                                      medicalBoardDecisionNumber: emp.medicalBoardDecisionNumber,
                                      medicalBoardDate: emp.medicalBoardDate,
                                      disabilityPercentage: emp.disabilityPercentage,
                                      medicalHospital: emp.medicalHospital,
                                      disabilityType: emp.disabilityType,
                                      medicalBoardRecommendation: emp.medicalBoardRecommendation,
                                      applicantRequestDate: emp.applicantRequestDate,
                                      ministerialApprovalNumber: emp.ministerialApprovalNumber,
                                      ministerialApprovalDate: emp.ministerialApprovalDate,
                                      serviceYears: emp.calculatedServiceYears,
                                    },
                                  });
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                title="طباعة الأمر الإداري"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>الأمر الإداري</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleReactivate(emp)}
                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                                title="إلغاء الإحالة وإعادة التفعيل"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {filteredRetired.length > 20 && (
              <PaginationControl
                totalItems={filteredRetired.length}
                currentPage={retiredPage}
                pageSize={retiredPageSize}
                onPageChange={setRetiredPage}
                onPageSizeChange={(sz) => {
                  setRetiredPageSize(sz);
                  setRetiredPage(1);
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: GRANT 5-YEAR LEAVE MODAL */}
      {isFiveYearLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in no-print">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-indigo-600">
                <CalendarDays className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  منح إجازة 5 سنوات (براتب اسمي كامل أو نصف اسمي)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFiveYearLeaveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGrantFiveYearLeave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اختر الموظف:
                </label>
                <select
                  required
                  value={fiveYearTargetEmpId}
                  onChange={(e) => setFiveYearTargetEmpId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                >
                  <option value="">-- اختر الموظف --</option>
                  {activeEmployees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.fullName} ({e.employeeNumber}) - {e.department} - راتب اسمي: {(e.baseSalary || 500000).toLocaleString('en-US')} د.ع
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  نوع الإجازة ومقدار الراتب المصروف:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFiveYearSalaryType('full_base_salary')}
                    className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                      fiveYearSalaryType === 'full_base_salary'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 font-bold shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold">براتب اسمي كامل (100%)</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">يُصرف كامل الراتب الاسمي مع استقطاع التوقيفات</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFiveYearSalaryType('half_base_salary')}
                    className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                      fiveYearSalaryType === 'half_base_salary'
                        ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 font-bold shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold">بنصف راتب اسمي (50%)</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">يُصرف 50% من الراتب الاسمي مع استقطاع التوقيفات</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ بدء الإجازة:
                  </label>
                  <input
                    type="date"
                    required
                    value={fiveYearStartDate}
                    onChange={(e) => {
                      setFiveYearStartDate(e.target.value);
                      const d = new Date(e.target.value);
                      d.setFullYear(d.getFullYear() + 5);
                      setFiveYearEndDate(d.toISOString().slice(0, 10));
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ انتهاء الإجازة (بعد 5 سنوات):
                  </label>
                  <input
                    type="date"
                    required
                    value={fiveYearEndDate}
                    onChange={(e) => setFiveYearEndDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم الأمر الإداري / الوزاري:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: إج5-2026-441"
                    value={fiveYearOrderNum}
                    onChange={(e) => setFiveYearOrderNum(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ صدور الأمر:
                  </label>
                  <input
                    type="date"
                    required
                    value={fiveYearOrderDate}
                    onChange={(e) => setFiveYearOrderDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  نسبة استقطاع التوقيفات التقاعدية (10% أو 25%):
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="pensionPercent"
                      checked={fiveYearPensionPercent === 10}
                      onChange={() => setFiveYearPensionPercent(10)}
                    />
                    <span>10% (حصة الموظف التقاعدية العادية)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="pensionPercent"
                      checked={fiveYearPensionPercent === 25}
                      onChange={() => setFiveYearPensionPercent(25)}
                    />
                    <span>25% (حصة الموظف 10% + حصة الدائرة 15%)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ملاحظات وشروط الإجازة:
                </label>
                <textarea
                  rows={2}
                  value={fiveYearNotes}
                  onChange={(e) => setFiveYearNotes(e.target.value)}
                  placeholder="بناءً على طلب الموظف التحريري وموافقة معالي الوزير المحترم..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFiveYearLeaveModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20"
                >
                  تأكيد وإصدار أمر الإجازة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT 5-YEAR LEAVE IN THE FUTURE (إمكانية التعديل مستقبلاً) */}
      {editFiveYearEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in no-print">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-indigo-600">
                <Edit3 className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  تعديل شروط إجازة الـ 5 سنوات للموظف ({editFiveYearEmp.fullName})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditFiveYearEmp(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditFiveYearLeave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تعديل نوع الراتب المصروف:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditSalaryType('full_base_salary')}
                    className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                      editSalaryType === 'full_base_salary'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 font-bold shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold">براتب اسمي كامل (100%)</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">كامل الراتب الاسمي</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditSalaryType('half_base_salary')}
                    className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                      editSalaryType === 'half_base_salary'
                        ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 font-bold shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold">بنصف راتب اسمي (50%)</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">نصف الراتب الاسمي</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الراتب الاسمي المعتمد (د.ع):
                  </label>
                  <input
                    type="number"
                    step="1000"
                    value={editBaseSalary}
                    onChange={(e) => setEditBaseSalary(parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نسبة التوقيفات التقاعدية (%):
                  </label>
                  <input
                    type="number"
                    value={editPensionPercent}
                    onChange={(e) => setEditPensionPercent(parseInt(e.target.value, 10) || 10)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ البدء المحدث:
                  </label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ الانتهاء المحدث:
                  </label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ملاحظات التعديل والتمديد:
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditFiveYearEmp(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20"
                >
                  حفظ التعديلات المستقبلية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: INTERRUPT 5-YEAR LEAVE AND RESUME WORK */}
      {interruptTargetEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in no-print">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-emerald-600">
                <UserCheck className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  قطع إجازة الـ 5 سنوات ومباشرة الموظف بالدوام
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInterruptTargetEmp(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              سيتم إنهاء حالة إجازة الـ 5 سنوات وإعادة الموظف (<strong className="text-slate-900 dark:text-white font-bold">{interruptTargetEmp.fullName}</strong>) إلى الخدمة الفعلية وإدراجه في كشوفات الحضور اليومية.
            </p>

            <form onSubmit={handleExecuteInterrupt} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تاريخ مباشرة العمل الفعلي:
                </label>
                <input
                  type="date"
                  required
                  value={interruptDate}
                  onChange={(e) => setInterruptDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم أمر المباشرة:
                  </label>
                  <input
                    type="text"
                    required
                    value={interruptOrderNum}
                    onChange={(e) => setInterruptOrderNum(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ أمر المباشرة:
                  </label>
                  <input
                    type="date"
                    required
                    value={interruptOrderDate}
                    onChange={(e) => setInterruptOrderDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ملاحظات المباشرة:
                </label>
                <textarea
                  rows={2}
                  value={interruptNotes}
                  onChange={(e) => setInterruptNotes(e.target.value)}
                  placeholder="بناءً على مباشرته التحريرية وانفكاكه من الإجازة..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInterruptTargetEmp(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20"
                >
                  تأكيد قطع الإجازة والمباشرة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ADVANCED IRAQI CIVIL SERVICE RETIREMENT EXECUTION MODAL */}
      {(retireTargetEmp || isNewRetirementModalOpen) && (() => {
        const selectedEmp = retireTargetEmp || employees.find((e) => e.id === newRetireEmpId) || activeEmployees[0];
        if (!selectedEmp) return null;

        const birth = selectedEmp.birthDate ? new Date(selectedEmp.birthDate) : null;
        const nowTime = new Date().getTime();
        const empAge = birth ? Math.floor((nowTime - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : 0;
        const hireYear = selectedEmp.hireDate ? parseInt(selectedEmp.hireDate.slice(0, 4), 10) : 1995;
        const empServiceYears = Math.max(0, 2026 - hireYear);

        const currentSettings = careerSettings || DEFAULT_CAREER_SETTINGS;
        const minEarlyAge = currentSettings.earlyRetirementMinAge || 50;
        const minEarlyService = currentSettings.earlyRetirementMinServiceYears || 15;
        const minDisability = currentSettings.healthRetirementMinDisabilityPercent || 50;
        const stdRetireAge = currentSettings.retirementAgeYears || 60;

        const meetsEarlyAge = empAge >= minEarlyAge;
        const meetsEarlyService = empServiceYears >= minEarlyService;
        const meetsEarlyRequest = meetsEarlyAge && meetsEarlyService;
        const meetsDisability = Number(disabilityPercent) >= minDisability;

        // Calculate live estimate
        const liveCalc = employeeService.calculateIraqiRetirementGratuity(
          selectedEmp,
          undefined,
          undefined,
          undefined,
          {
            retirementReason,
            disabilityPercentage: Number(disabilityPercent),
            isWorkInjury,
            careerSettings: currentSettings,
          }
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in no-print overflow-y-auto">
            <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      إحالة على التقاعد واحتساب مكافأة نهاية الخدمة
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      وفق قانون التقاعد الموحد رقم (9) لسنة 2014 والضوابط والتعليمات الوزارية النافذة
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRetireTargetEmp(null);
                    setIsNewRetirementModalOpen(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Employee Selection / Switcher */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  الموظف المراد إحالته على التقاعد:
                </label>
                <select
                  value={selectedEmp.id}
                  onChange={(e) => {
                    const found = employees.find((emp) => emp.id === e.target.value);
                    if (found) {
                      setRetireTargetEmp(found);
                      setNewRetireEmpId(found.id);
                    }
                  }}
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  {activeEmployees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.fullName} ({e.employeeNumber}) — {e.department} — {e.jobTitle}
                    </option>
                  ))}
                </select>

                {/* Employee Quick Info Badge */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <span className="text-[10px] text-slate-400 block">العمر الحالي:</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono text-[11px]">{empAge} سنة</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">سنوات الخدمة:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">{empServiceYears} سنة</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">الراتب الاسمي:</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono text-[11px]">{(selectedEmp.baseSalary || 500000).toLocaleString('en-US')} د.ع</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">الراتب الكلي:</span>
                    <strong className="text-purple-700 dark:text-purple-300 font-mono text-[11px]">{(selectedEmp.totalSalary || 700000).toLocaleString('en-US')} د.ع</strong>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleExecuteRetire} className="space-y-4 text-xs">
                {/* 1. Reason Selection Cards */}
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-2">
                    سبب الإحالة على التقاعد والسند القانوني:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Health Reason */}
                    <button
                      type="button"
                      onClick={() => {
                        setRetirementReason('health_condition');
                        setRetirementNotes(
                          'استناداً لأحكام المادة (13) من قانون التقاعد الموحد رقم (9) لسنة 2014 المعدل، وبناءً على قرار اللجنة الطبية بثبوت عدم الصلاحية للاستمرار في الخدمة المدنية.'
                        );
                      }}
                      className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                        retirementReason === 'health_condition'
                          ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 shadow-sm ring-2 ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300 mb-1">
                        <HeartPulse className="w-4 h-4 shrink-0" />
                        <span>أسباب صحية (المادة 13)</span>
                      </div>
                      <div className="text-[10px] text-slate-500 leading-tight">
                        عجز طبي وقرار لجان طبية رسمية
                      </div>
                    </button>

                    {/* Employee Request */}
                    <button
                      type="button"
                      onClick={() => {
                        setRetirementReason('employee_request');
                        setRetirementNotes(
                          'استناداً لأحكام المادة (12) من قانون التقاعد الموحد رقم (9) لسنة 2014 المعدل، وبناءً على طلب الموظف التحريري وموافقة معالي الوزير المحترم وفق مقتضيات المصلحة العامة.'
                        );
                      }}
                      className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                        retirementReason === 'employee_request'
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/50 text-purple-900 dark:text-purple-200 shadow-sm ring-2 ring-purple-500/20'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300 mb-1">
                        <FileText className="w-4 h-4 shrink-0" />
                        <span>بطلب الموظف (المادة 12)</span>
                      </div>
                      <div className="text-[10px] text-slate-500 leading-tight">
                        تقاعد اختياري بموافقة الوزير
                      </div>
                    </button>

                    {/* Legal Age */}
                    <button
                      type="button"
                      onClick={() => {
                        setRetirementReason('legal_age');
                        setRetirementNotes(
                          'استناداً لأحكام المادة (10) من قانون التقاعد الموحد رقم (9) لسنة 2014 المعدل، لبلوغه السن القانوني للإحالة على التقاعد وإكماله المدة القانونية.'
                        );
                      }}
                      className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                        retirementReason === 'legal_age'
                          ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 shadow-sm ring-2 ring-amber-500/20'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300 mb-1">
                        <Scale className="w-4 h-4 shrink-0" />
                        <span>السن القانوني (المادة 10)</span>
                      </div>
                      <div className="text-[10px] text-slate-500 leading-tight">
                        إكمال سن {stdRetireAge} سنة قانونية
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. DYNAMIC SECTION: HEALTH RETIREMENT (المادة 13) */}
                {retirementReason === 'health_condition' && (
                  <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-3 animate-fade-in">
                    <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold border-b border-rose-200/80 dark:border-rose-800/60 pb-2">
                      <HeartPulse className="w-4 h-4 text-rose-600" />
                      <span>بيانات وقرارات اللجان الطبية الرسمية (المادة 13 من قانون التقاعد)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          رقم قرار اللجنة الطبية الرسمية:
                        </label>
                        <input
                          type="text"
                          required
                          value={medicalBoardDecisionNum}
                          onChange={(e) => setMedicalBoardDecisionNum(e.target.value)}
                          placeholder="مثال: ل-ط-542/2026"
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          تاريخ صدور قرار اللجنة الطبية:
                        </label>
                        <input
                          type="date"
                          required
                          value={medicalBoardDate}
                          onChange={(e) => setMedicalBoardDate(e.target.value)}
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          مستشفى الإحالة / اللجنة الطبية الصادر عنها:
                        </label>
                        <input
                          type="text"
                          required
                          value={medicalHospital}
                          onChange={(e) => setMedicalHospital(e.target.value)}
                          placeholder="مثال: دائرة اللجان الطبية المركزية - مستشفى الكرخ التعليمي"
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          نسبة العجز الطبي المحددة (%):
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="20"
                            max="100"
                            step="5"
                            value={disabilityPercent}
                            onChange={(e) => setDisabilityPercent(parseInt(e.target.value, 10))}
                            className="flex-1 accent-rose-600"
                          />
                          <span className="font-mono font-bold text-rose-700 dark:text-rose-300 w-12 text-center bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-rose-200">
                            {disabilityPercent}%
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px]">
                          <span className="text-slate-500">الحد الوزاري: {minDisability}%</span>
                          {meetsDisability ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>مستوفٍ لنسبة العجز المطلوبة</span>
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              <span>أقل من النسبة (يتطلب استثناءً)</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          نوع العجز الطبي:
                        </label>
                        <input
                          type="text"
                          value={disabilityType}
                          onChange={(e) => setDisabilityType(e.target.value)}
                          placeholder="عجز دائم مانع من أداء الواجب الوظيفي"
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          توصية اللجنة الطبية الرسمية:
                        </label>
                        <input
                          type="text"
                          value={medicalBoardRecommendation}
                          onChange={(e) => setMedicalBoardRecommendation(e.target.value)}
                          placeholder="عدم صلاحيته للاستمرار بالخدمة وإحالته للتقاعد"
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        />
                      </div>
                    </div>

                    <div className="pt-1">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-900 dark:text-rose-200">
                        <input
                          type="checkbox"
                          checked={isWorkInjury}
                          onChange={(e) => setIsWorkInjury(e.target.checked)}
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 accent-rose-600 cursor-pointer"
                        />
                        <span>العجز ناجم عن إصابة عمل أثناء الخدمة وبسببها (+15% مخصصات عجز إضافية وفق القانون العراقي)</span>
                      </label>
                    </div>

                    <div className="p-2.5 rounded-xl bg-rose-100/60 dark:bg-rose-900/30 text-rose-950 dark:text-rose-200 text-[11px] leading-relaxed border border-rose-200 dark:border-rose-800">
                      ⚖️ <strong>الضمانة القانونية للمادة (13):</strong> يُضمن للموظف المحال لأسباب صحية احتساب (15) سنة خدمة كحد أدنى مضمون لصرف الراتب التقاعدي حتى وإن كانت خدمته الفعلية أقل، مع صرف مكافأة نهاية الخدمة وبدل الإجازات الاعتيادية المتراكمة نقداً.
                    </div>
                  </div>
                )}

                {/* 3. DYNAMIC SECTION: EMPLOYEE REQUEST (المادة 12) */}
                {retirementReason === 'employee_request' && (
                  <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 space-y-3 animate-fade-in">
                    <div className="flex items-center gap-2 text-purple-800 dark:text-purple-200 font-bold border-b border-purple-200/80 dark:border-purple-800/60 pb-2">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <span>بيانات طلب الموظف وموافقة الوزير المختص (المادة 12 من قانون التقاعد)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          تاريخ تقديم طلب الموظف:
                        </label>
                        <input
                          type="date"
                          required
                          value={applicantRequestDate}
                          onChange={(e) => setApplicantRequestDate(e.target.value)}
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          رقم موافقة / أمر معالي الوزير:
                        </label>
                        <input
                          type="text"
                          required
                          value={ministerialApprovalNum}
                          onChange={(e) => setMinisterialApprovalNum(e.target.value)}
                          placeholder="مثال: وز-884/2026"
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          تاريخ موافقة معالي الوزير:
                        </label>
                        <input
                          type="date"
                          required
                          value={ministerialApprovalDate}
                          onChange={(e) => setMinisterialApprovalDate(e.target.value)}
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                        />
                      </div>
                    </div>

                    {/* Legal Compliance Check Card */}
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 text-[11px] space-y-2">
                      <div className="font-bold text-purple-900 dark:text-purple-300 flex items-center justify-between">
                        <span>فحص استيفاء المحددات الوزارية للتقاعد الاختياري:</span>
                        {meetsEarlyRequest ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>مستوفٍ لكافة الشروط الوزارية</span>
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>يتطلب موافقة واستثناءً خاصاً</span>
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                          <span>السن: {empAge} سنة (المحدد الوزاري: {minEarlyAge} سنة)</span>
                          <span className={meetsEarlyAge ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                            {meetsEarlyAge ? '✓ مستوفٍ' : '✗ غير مستوفٍ'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                          <span>الخدمة: {empServiceYears} سنة (المحدد الوزاري: {minEarlyService} سنة)</span>
                          <span className={meetsEarlyService ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                            {meetsEarlyService ? '✓ مستوفٍ' : '✗ غير مستوفٍ'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. DYNAMIC SECTION: LEGAL AGE (المادة 10) */}
                {retirementReason === 'legal_age' && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-950 dark:text-amber-200 flex items-center justify-between gap-3 animate-fade-in">
                    <div>
                      <strong>بلوغ السن القانوني الإلزامي: </strong>
                      يبلغ الموظف حالياً ({empAge}) سنة مقارنة بالسن القانوني المعتمد في الوزارة ({stdRetireAge} سنة).
                      <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                        استثناءات قانونية: سن 63 سنة للتدريسيين وحملة لقب أستاذ، وسن 65 سنة للأطباء الاستشاريين والاختصاص.
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-200/60 text-amber-900 font-bold shrink-0 text-[11px]">
                      المادة (10)
                    </span>
                  </div>
                )}

                {/* 5. Order Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      تاريخ الانفكاك والإحالة:
                    </label>
                    <input
                      type="date"
                      required
                      value={retirementDate}
                      onChange={(e) => setRetirementDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      رقم الأمر الإداري:
                    </label>
                    <input
                      type="text"
                      required
                      value={retirementOrderNum}
                      onChange={(e) => setRetirementOrderNum(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      تاريخ الأمر الإداري:
                    </label>
                    <input
                      type="date"
                      required
                      value={retirementOrderDate}
                      onChange={(e) => setRetirementOrderDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    السند القانوني والملاحظات الرسمية:
                  </label>
                  <textarea
                    rows={2}
                    value={retirementNotes}
                    onChange={(e) => setRetirementNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                {/* 6. Live Financial Breakdown Card */}
                {liveCalc && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-transparent border border-purple-200 dark:border-purple-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-900 dark:text-purple-200 border-b border-purple-200/60 pb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-purple-600" />
                        <span>موجز الاحتساب المالي للمستحقات والراتب التقاعدي:</span>
                      </span>
                      <span className="font-mono text-purple-700 dark:text-purple-300">
                        خدمة محتسبة: {liveCalc.serviceYears} سنة
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="text-[10px] text-slate-400">مكافأة نهاية الخدمة</div>
                        <div className="font-mono font-bold text-purple-700 dark:text-purple-300 text-sm mt-0.5">
                          {liveCalc.gratuityAmount.toLocaleString('en-US')} د.ع
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="text-[10px] text-slate-400">بدل الإجازات ({liveCalc.payableLeaveDays} يوم)</div>
                        <div className="font-mono font-bold text-indigo-700 dark:text-indigo-300 text-sm mt-0.5">
                          {liveCalc.accumulatedLeaveCashAmount.toLocaleString('en-US')} د.ع
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="text-[10px] text-slate-400">الراتب التقاعدي التقديري</div>
                        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                          {liveCalc.estimatedMonthlyPension.toLocaleString('en-US')} د.ع
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="text-[10px] text-slate-400">إجمالي الصرف الفوري</div>
                        <div className="font-mono font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                          {liveCalc.totalRetirementPayout.toLocaleString('en-US')} د.ع
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setRetireTargetEmp(null);
                      setIsNewRetirementModalOpen(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأكيد الإحالة على التقاعد وإصدار الأمر الإداري</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL 5: PRINTABLE OFFICIAL LEGAL ORDER (RETIREMENT / 5-YEAR LEAVE A4) */}
      {previewOrder && (() => {
        const orderReason = previewOrder.details?.retirementReason || 'legal_age';
        const isHealth = orderReason === 'health_condition';
        const isRequest = orderReason === 'employee_request';

        let orderTitleText = 'أمر إداري: إحالة على التقاعد واحتساب مكافأة نهاية الخدمة';
        if (previewOrder.type === 'five_year_leave') {
          orderTitleText = 'أمر إداري: منح إجازة خمس سنوات وفق قانون الموازنة العامة';
        } else if (isHealth) {
          orderTitleText = 'أمر إداري: إحالة على التقاعد لأسباب صحية (المادة 13) واحتساب مكافأة نهاية الخدمة';
        } else if (isRequest) {
          orderTitleText = 'أمر إداري: إحالة على التقاعد بناءً على طلب الموظف (المادة 12) واحتساب مكافأة نهاية الخدمة';
        } else {
          orderTitleText = 'أمر إداري: إحالة على التقاعد لبلوغ السن القانوني (المادة 10) واحتساب مكافأة نهاية الخدمة';
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in no-print-bg">
            <div className="w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 no-print">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>الأمر الإداري الرسمي (نموذج معتمد جاهز للطباعة)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setPreviewOrder(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* A4 Paper Document Preview */}
              <div className="p-8 sm:p-12 rounded-2xl bg-white text-slate-900 border border-slate-300 shadow-inner space-y-6 text-right">
                {/* Official Header */}
                <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
                  <div className="space-y-1 text-center sm:text-right">
                    <div className="font-black text-sm">جمهورية العراق</div>
                    <div className="font-bold text-xs">{organization.ministryName || 'وزارة التعليم العالي والبحث العلمي'}</div>
                    <div className="text-[11px] font-semibold text-slate-700">
                      {organization.directorateName || 'دائرة الشؤون الإدارية والمالية'}
                    </div>
                    <div className="text-[10px] text-slate-500">قسم الموارد البشرية والخدمة المدنية</div>
                  </div>

                  <GovernmentEmblem
                    size="md"
                    appearance={{}}
                    organization={organization}
                    className="w-16 h-16 drop-shadow-sm"
                  />

                  <div className="space-y-1 text-left font-mono text-xs">
                    <div>العدد: <span className="font-bold">{previewOrder.orderNum}</span></div>
                    <div>التاريخ: <span className="font-bold">{previewOrder.orderDate}</span></div>
                    <div className="text-[10px] text-slate-400">سنة 2026</div>
                  </div>
                </div>

                {/* Order Title */}
                <div className="text-center py-2">
                  <span className="text-base sm:text-lg font-black underline underline-offset-8">
                    {orderTitleText}
                  </span>
                </div>

                {/* Order Body Text */}
                <div className="text-xs sm:text-sm leading-loose text-justify text-slate-800 space-y-4 font-medium">
                  {previewOrder.type === 'retirement' ? (
                    <>
                      {isHealth ? (
                        <p>
                          استناداً لأحكام <strong className="font-bold">المادة (13) والمادة (21/أولاً) والمادة (22) من قانون التقاعد الموحد رقم (9) لسنة 2014 المعدل</strong> بالقانون رقم (26) لسنة 2019 والضوابط والتعليمات الوزارية النافذة، وبناءً على قرار اللجنة الطبية الرسمية ذي العدد (<strong className="font-mono font-bold">{previewOrder.details?.medicalBoardDecisionNumber || 'ل-ط-542/2026'}</strong>) المؤرخ في ({previewOrder.details?.medicalBoardDate || previewOrder.orderDate}) الصادر عن ({previewOrder.details?.medicalHospital || 'دائرة اللجان الطبية المركزية'}) المتضمن ثبوت عدم صلاحية الموظف للاستمرار في الخدمة المدنية لعجز طبي بنسبة (<strong className="font-mono font-bold">{previewOrder.details?.disabilityPercentage || 60}%</strong>) {previewOrder.details?.isWorkInjury ? 'ناشئ عن إصابة عمل أثناء الخدمة وبسببها' : ''}:
                        </p>
                      ) : isRequest ? (
                        <p>
                          استناداً لأحكام <strong className="font-bold">المادة (12) والمادة (21/أولاً) والمادة (22) من قانون التقاعد الموحد رقم (9) لسنة 2014 المعدل</strong> بالقانون رقم (26) لسنة 2019 والضوابط والتعليمات الوزارية النافذة، وبناءً على الطلب التحريري المقدم من الموظف المؤرخ في ({previewOrder.details?.applicantRequestDate || previewOrder.orderDate}) وموافقة ومصادقة معالي الوزير المحترم بالأمر ذي العدد (<strong className="font-mono font-bold">{previewOrder.details?.ministerialApprovalNumber || 'وز-884/2026'}</strong>) المؤرخ في ({previewOrder.details?.ministerialApprovalDate || previewOrder.orderDate}) لاستيفائه شرطي السن والخدمة الوظيفية ولمقتضيات المصلحة العامة:
                        </p>
                      ) : (
                        <p>
                          استناداً لأحكام <strong className="font-bold">المادة (10) والمادة (21/أولاً) والمادة (22) من قانون التقاعد الموحد رقم (9) لسنة 2014 المعدل</strong> بالقانون رقم (26) لسنة 2019، وبناءً على إكمال الموظف المذكورة بياناته أدناه السن القانوني للإحالة على التقاعد وإكماله الخدمة الوظيفية المعتمدة:
                        </p>
                      )}

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs grid grid-cols-2 gap-3">
                        <div><span className="text-slate-500">اسم الموظف الرباعي: </span><strong className="font-bold">{previewOrder.employee.fullName}</strong></div>
                        <div><span className="text-slate-500">الرقم الوظيفي: </span><span className="font-mono font-bold">{previewOrder.employee.employeeNumber}</span></div>
                        <div><span className="text-slate-500">العنوان الوظيفي: </span><strong>{previewOrder.employee.jobTitle}</strong></div>
                        <div><span className="text-slate-500">القسم والتشكيل: </span><strong>{previewOrder.employee.department}</strong></div>
                        <div><span className="text-slate-500">سند وسبب الإحالة: </span><strong className="text-purple-700">{previewOrder.details?.retirementReasonTitle || RETIREMENT_REASON_TITLES[orderReason]}</strong></div>
                        <div><span className="text-slate-500">تاريخ الانفكاك والإحالة: </span><span className="font-mono font-bold">{previewOrder.effectiveDate}</span></div>
                        <div>
                          <span className="text-slate-500">مكافأة نهاية الخدمة المقررة: </span>
                          <span className="font-mono font-bold text-purple-700">
                            {previewOrder.details?.gratuityAmount
                              ? `${previewOrder.details.gratuityAmount.toLocaleString('en-US')} د.ع`
                              : 'تُصرف دفعة واحدة من صندوق التقاعد'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">بدل الإجازات المتراكمة نقداً: </span>
                          <span className="font-mono font-bold text-emerald-700">
                            {previewOrder.details?.accumulatedLeaveCashAmount
                              ? `${previewOrder.details.accumulatedLeaveCashAmount.toLocaleString('en-US')} د.ع`
                              : 'وفق رصيد الإجازات'}
                          </span>
                        </div>
                      </div>

                      <p>
                        <strong className="font-bold">تقرر ما يأتي:</strong>
                        <br />
                        1. انفكاك الموظف المذكور أنفاً من وظيفته وإحالته على التقاعد اعتباراً من تاريخ ({previewOrder.effectiveDate}).
                        <br />
                        2. صرف مكافأة نهاية الخدمة المستحقة له قانوناً عن خدمته التقاعدية وصرف بدل الإجازات الاعتيادية المتراكمة نقداً وفق السقف القانوني (180 يوماً).
                        <br />
                        3. إرسال أضبارته وسجلاته الثبوتية إلى هيئة التقاعد الوطنية لإصدار الهوية التقاعدية وصرف الراتب التقاعدي الشهري المستحق {isHealth ? 'مع احتساب 15 سنة خدمة كحد أدنى مضمون للمحال صحياً' : ''}.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        استناداً للصلاحيات المخولة لنا ووفقاً لأحكام <strong className="font-bold">قانون الموازنة العامة الاتحادية وضوابط منح إجازة الخمس سنوات</strong> وبناءً على الطلب التحريري المقدم من الموظف:
                      </p>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs grid grid-cols-2 gap-3">
                        <div><span className="text-slate-500">اسم الموظف: </span><strong className="font-bold">{previewOrder.employee.fullName}</strong></div>
                        <div><span className="text-slate-500">الرقم الوظيفي: </span><span className="font-mono font-bold">{previewOrder.employee.employeeNumber}</span></div>
                        <div><span className="text-slate-500">نوع الراتب المصروف: </span><strong className="text-indigo-700">{previewOrder.details?.salaryType === 'full_base_salary' ? 'براتب اسمي كامل (100%)' : 'بنصف راتب اسمي (50%)'}</strong></div>
                        <div><span className="text-slate-500">مدة الإجازة: </span><span className="font-mono font-bold">5 سنوات من ({previewOrder.details?.startDate}) إلى ({previewOrder.details?.endDate})</span></div>
                        <div><span className="text-slate-500">الصافي الشهري المستلم: </span><span className="font-mono font-bold text-emerald-700">{(previewOrder.details?.netMonthlyPaid || 0).toLocaleString('en-US')} د.ع</span></div>
                        <div><span className="text-slate-500">التوقيفات التقاعدية المستقطعة: </span><span className="font-mono font-bold text-slate-700">{previewOrder.details?.pensionDeductionPercent || 10}% لحفظ الخدمة التقاعدية</span></div>
                      </div>

                      <p>
                        <strong className="font-bold">تقرر ما يأتي:</strong>
                        <br />
                        1. منح الموظف المذكور أنفاً إجازة اعتيادية لمدة (5 سنوات) وفق نوع الراتب المبيّن أعلاه.
                        <br />
                        2. تُحسب مدة الإجازة خدمة وظيفية وتقاعدية لأغراض العلاوة والترفيع والتقاعد شريطة دفع التوقيفات التقاعدية المقررة.
                        <br />
                        3. للموظف الحق بقطع إجازته والمباشرة بالوظيفة وفق الضوابط والتعليمات النافذة.
                      </p>
                    </>
                  )}
                </div>

                {/* Signature Block */}
                <div className="pt-8 flex justify-between items-end border-t border-slate-200 text-xs">
                  <div className="text-[11px] text-slate-500 space-y-0.5">
                    <div>نسخة منه إلى:</div>
                    <div>• مكتب السيد الوزير / المحترم</div>
                    <div>• هيئة التقاعد الوطنية / دائرة التقاعد المدني</div>
                    <div>• قسم الشؤون المالية والرواتب / للتنفيذ بموجبه</div>
                    <div>• قسم الأضابير والسجلات المركزية / للحفظ والأرشفة</div>
                  </div>

                  <div className="text-center space-y-1">
                    <div className="font-bold text-sm">المدير العام / وكيل الوزارة</div>
                    <div className="text-xs text-slate-600">{organization.directorateName}</div>
                    <div className="h-10"></div>
                    <div className="font-mono text-[10px] text-slate-400">الختم والتوقيع الرسمي المعتمد</div>
                  </div>
                </div>
              </div>

              {/* Actions Bar */}
              <div className="flex items-center justify-between pt-2 no-print">
                <button
                  type="button"
                  onClick={() => setPreviewOrder(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                >
                  إغلاق النافذة
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الأمر الإداري فورياً (A4)</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
