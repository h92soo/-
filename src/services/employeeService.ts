/**
 * employeeService.ts - طبقة البيانات المركزية الموحدة (Central Master Employee Data Service)
 * 
 * المنهج الرقمي للإدارة الحكومية (تشغيل 2026)
 * تصميم وتطوير: المهندس حسين عبد المنذر
 * 
 * توفر هذه الخدمة:
 * 1. Single Source of Truth لجميع بيانات الموظفين عبر معرّف موحد (Employee ID).
 * 2. اشتراك تفاعلي للمكونات والشاشات (Reactive Pub/Sub Pattern) بدون إعادة تحميل الصفحة.
 * 3. تسجيل آلي وتلقائي لكل حدث وتغيير في السجل الزمني (Career Timeline).
 * 4. عمليات الترقية، العلاوة، الإحالة للتقاعد، وتوليد الباركود.
 */

import {
  Employee,
  CareerTimelineEvent,
  AllowanceRecord,
  PromotionRecord,
  BarcodeScanLog,
  CareerSystemSettings,
  DEFAULT_CAREER_SETTINGS,
  BatchAllowanceExecutionItem,
  BatchPromotionExecutionItem,
  RetirementReason,
  Department,
  DEFAULT_DEPARTMENTS,
} from '../types';
import {
  computeEmployeeSalaryComponents,
  getOfficialBaseSalary,
  getAnnualIncrementAmount,
} from '../utils/iraqiSalaryScale';
import {
  getAllEmployees,
  getEmployeeById,
  saveEmployee as dbSaveEmployee,
  deleteEmployeeById as dbDeleteEmployeeById,
  deleteEmployeesBatch as dbDeleteEmployeesBatch,
  saveEmployeesBatch as dbSaveEmployeesBatch,
  addTimelineEvent as dbAddTimelineEvent,
  getTimelineEventsByEmployeeId as dbGetTimelineEvents,
  getAllTimelineEvents as dbGetAllTimelineEvents,
  saveAllowanceRecord as dbSaveAllowanceRecord,
  getAllAllowances as dbGetAllAllowances,
  savePromotionRecord as dbSavePromotionRecord,
  getAllPromotions as dbGetAllPromotions,
  saveBarcodeScanLog as dbSaveBarcodeScanLog,
  getBarcodeScanLogs as dbGetBarcodeScanLogs,
  getSystemSetting,
  saveSystemSetting,
} from '../db/indexedDB';

// Event types for the reactive listeners
export type EmployeeChangeListener = (employees: Employee[], targetEmployee?: Employee, action?: string) => void;

class EmployeeService {
  private memoryCache: Employee[] | null = null;
  private listeners: Set<EmployeeChangeListener> = new Set();
  private isInitializing: boolean = false;
  private initPromise: Promise<Employee[]> | null = null;

  /**
   * تسجيل مستمع للتغييرات الفورية في جميع الشاشات
   */
  public subscribe(listener: EmployeeChangeListener): () => void {
    this.listeners.add(listener);
    // If cache already ready, notify immediately
    if (this.memoryCache) {
      try {
        listener(this.memoryCache);
      } catch (err) {
        console.error('Error in employee listener:', err);
      }
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * إشعار كافة المستمعين بالتغيير
   */
  private notifyListeners(employees: Employee[], targetEmployee?: Employee, action?: string) {
    this.listeners.forEach((listener) => {
      try {
        listener(employees, targetEmployee, action);
      } catch (err) {
        console.error('Error in employee listener callback:', err);
      }
    });
  }

  /**
   * استرجاع جميع الموظفين (مع التخزين المؤقت في الذاكرة لسرعة الاستجابة)
   */
  public async getAll(): Promise<Employee[]> {
    if (this.memoryCache && this.memoryCache.length > 0) {
      return [...this.memoryCache];
    }

    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = (async () => {
      try {
        const emps = await getAllEmployees();
        // Ensure every employee has barcodeValue and civilGrade defaults if missing
        const enriched = emps.map((emp) => this.ensureEmployeeMasterFields(emp));
        this.memoryCache = enriched;
        return [...enriched];
      } finally {
        this.isInitializing = false;
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * استرجاع موظف واحد بالمعرف الموحد (ID)
   */
  public async getById(id: string): Promise<Employee | undefined> {
    if (this.memoryCache) {
      const found = this.memoryCache.find((e) => e.id === id);
      if (found) return { ...found };
    }
    const emp = await getEmployeeById(id);
    return emp ? this.ensureEmployeeMasterFields(emp) : undefined;
  }

  /**
   * استرجاع موظف بالرقم الوظيفي أو بالباركود
   */
  public async getByBarcodeOrNumber(barcodeOrNumber: string): Promise<Employee | undefined> {
    const term = barcodeOrNumber.trim();
    if (!term) return undefined;
    const all = await this.getAll();
    return all.find(
      (e) =>
        e.barcodeValue === term ||
        e.employeeNumber === term ||
        e.id === term ||
        (e.nationalId && e.nationalId === term)
    );
  }

  /**
   * حفظ أو تحديث موظف في السجل الموحد المركزي
   * وتحديث كل الشاشات والمكونات فوراً وتسجيل الأحداث
   */
  public async save(employee: Employee, performer: string = 'مدير النظام'): Promise<Employee> {
    const existing = await this.getById(employee.id);
    const enriched = this.ensureEmployeeMasterFields(employee);

    // Save to IndexedDB
    await dbSaveEmployee(enriched);

    // Update in-memory cache
    if (this.memoryCache) {
      const idx = this.memoryCache.findIndex((e) => e.id === enriched.id);
      if (idx >= 0) {
        this.memoryCache[idx] = enriched;
      } else {
        this.memoryCache.push(enriched);
      }
    } else {
      this.memoryCache = [enriched];
    }

    // Auto-record Timeline Event / Audit Log if important changes happened
    if (!existing) {
      // New Hire Event
      await this.logTimelineEvent({
        id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        employeeId: enriched.id,
        employeeName: enriched.fullName,
        employeeNumber: enriched.employeeNumber,
        department: enriched.department,
        date: enriched.hireDate || new Date().toISOString().slice(0, 10),
        title: 'التعيين والمباشرة الرسمية',
        category: 'hire',
        description: `تم تسجيل الموظف لأول مرة في السجل الموحد بالرقم الوظيفي (${enriched.employeeNumber}) في قسم (${enriched.department}) بصفة (${enriched.jobTitle}).`,
        oldValue: '—',
        newValue: `قسم ${enriched.department} - ${enriched.jobTitle}`,
        performedBy: performer,
        createdAt: new Date().toISOString(),
      });
    } else {
      let changeRecorded = false;

      // 1. Detect Department change (تغيير القسم الإداري)
      if (existing.department !== enriched.department) {
        changeRecorded = true;
        await this.logTimelineEvent({
          id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          employeeId: enriched.id,
          employeeName: enriched.fullName,
          employeeNumber: enriched.employeeNumber,
          department: enriched.department,
          date: new Date().toISOString().slice(0, 10),
          title: 'نقل / تغيير القسم الإداري',
          category: 'department_change',
          oldValue: existing.department || 'غير محدد',
          newValue: enriched.department || 'غير محدد',
          description: `تم نقل الموظف من قسم (${existing.department || 'غير محدد'}) إلى قسم (${enriched.department || 'غير محدد'}).`,
          performedBy: performer,
          createdAt: new Date().toISOString(),
        });
      }

      // 2. Detect Education Degree / Certificate change (تحديث الشهادة والمؤهل الدراسي)
      if (existing.educationDegree !== enriched.educationDegree) {
        changeRecorded = true;
        await this.logTimelineEvent({
          id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          employeeId: enriched.id,
          employeeName: enriched.fullName,
          employeeNumber: enriched.employeeNumber,
          department: enriched.department,
          date: new Date().toISOString().slice(0, 10),
          title: 'تحديث الشهادة والمؤهل الدراسي',
          category: 'education_change',
          oldValue: existing.educationDegree || 'غير محدد',
          newValue: enriched.educationDegree || 'غير محدد',
          description: `تم تحديث المؤهل الدراسي والشهادة من (${existing.educationDegree || 'غير محدد'}) إلى (${enriched.educationDegree || 'غير محدد'}) - نسبة مخصصات الشهادة: (${enriched.educationAllowancePercent ?? 0}%).`,
          performedBy: performer,
          createdAt: new Date().toISOString(),
        });
      }

      // 3. Detect Salary, Grade, Stage or Allowances change (تعديل الراتب والدرجة والمخصصات)
      const hasSalaryChanged =
        existing.baseSalary !== enriched.baseSalary ||
        existing.civilGrade !== enriched.civilGrade ||
        existing.civilStage !== enriched.civilStage ||
        existing.totalSalary !== enriched.totalSalary ||
        existing.netSalary !== enriched.netSalary ||
        existing.totalAllowances !== enriched.totalAllowances ||
        existing.hazardAllowancePercent !== enriched.hazardAllowancePercent ||
        existing.positionAllowancePercent !== enriched.positionAllowancePercent ||
        existing.spouseAllowance !== enriched.spouseAllowance ||
        existing.childrenAllowance !== enriched.childrenAllowance;

      if (hasSalaryChanged) {
        changeRecorded = true;
        const oldVal = `الدرجة: ${existing.civilGrade || '-'}، المرحلة: ${existing.civilStage || '-'}، الراتب الاسمي: ${(existing.baseSalary || 0).toLocaleString()} د.ع`;
        const newVal = `الدرجة: ${enriched.civilGrade || '-'}، المرحلة: ${enriched.civilStage || '-'}، الراتب الاسمي: ${(enriched.baseSalary || 0).toLocaleString()} د.ع`;
        await this.logTimelineEvent({
          id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          employeeId: enriched.id,
          employeeName: enriched.fullName,
          employeeNumber: enriched.employeeNumber,
          department: enriched.department,
          date: new Date().toISOString().slice(0, 10),
          title: 'تعديل الراتب والدرجة الوظيفية والمخصصات',
          category: 'salary_change',
          oldValue: oldVal,
          newValue: newVal,
          description: `تعديل السلم المالي للموظف: الراتب الاسمي (${(enriched.baseSalary || 0).toLocaleString()} د.ع)، إجمالي المخصصات (${(enriched.totalAllowances || 0).toLocaleString()} د.ع)، صافي الراتب المستحق (${(enriched.netSalary || 0).toLocaleString()} د.ع).`,
          performedBy: performer,
          createdAt: new Date().toISOString(),
        });
      }

      // 4. Detect Job Title change (تغيير العنوان الوظيفي)
      if (existing.jobTitle !== enriched.jobTitle) {
        changeRecorded = true;
        await this.logTimelineEvent({
          id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          employeeId: enriched.id,
          employeeName: enriched.fullName,
          employeeNumber: enriched.employeeNumber,
          department: enriched.department,
          date: new Date().toISOString().slice(0, 10),
          title: 'تغيير العنوان الوظيفي',
          category: 'title_change',
          oldValue: existing.jobTitle || 'غير محدد',
          newValue: enriched.jobTitle || 'غير محدد',
          description: `تعديل العنوان الوظيفي من (${existing.jobTitle}) إلى (${enriched.jobTitle}).`,
          performedBy: performer,
          createdAt: new Date().toISOString(),
        });
      }

      // 5. Detect Status or Contract Type change (الحالة الوظيفية أو نوع التعاقد)
      if (existing.status !== enriched.status || existing.contractType !== enriched.contractType) {
        changeRecorded = true;
        await this.logTimelineEvent({
          id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          employeeId: enriched.id,
          employeeName: enriched.fullName,
          employeeNumber: enriched.employeeNumber,
          department: enriched.department,
          date: new Date().toISOString().slice(0, 10),
          title: 'تعديل الحالة الوظيفية / نوع التوظيف',
          category: 'status_change',
          oldValue: `الحالة: ${existing.status || '-'} | العقد: ${existing.contractType || '-'}`,
          newValue: `الحالة: ${enriched.status || '-'} | العقد: ${enriched.contractType || '-'}`,
          description: `تحديث الحالة الإدارية للموظف إلى (${enriched.status}) ونوع التعاقد إلى (${enriched.contractType}).`,
          performedBy: performer,
          createdAt: new Date().toISOString(),
        });
      }

      // 6. Detect other general profile updates if no primary event was triggered
      if (!changeRecorded && (
        existing.phone !== enriched.phone ||
        existing.division !== enriched.division ||
        existing.notes !== enriched.notes ||
        existing.annualBalanceLimit !== enriched.annualBalanceLimit ||
        existing.specialization !== enriched.specialization
      )) {
        await this.logTimelineEvent({
          id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          employeeId: enriched.id,
          employeeName: enriched.fullName,
          employeeNumber: enriched.employeeNumber,
          department: enriched.department,
          date: new Date().toISOString().slice(0, 10),
          title: 'تحديث بيانات ملف الموظف',
          category: 'general',
          description: `تم تحديث البيانات الإدارية والمعلومات العامة في ملف الموظف.`,
          performedBy: performer,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Broadcast change across UI
    this.notifyListeners([...this.memoryCache], enriched, existing ? 'update' : 'create');

    return enriched;
  }

  /**
   * حذف موظف بواسطة المعرف
   */
  public async delete(id: string): Promise<boolean> {
    await dbDeleteEmployeeById(id);
    if (this.memoryCache) {
      this.memoryCache = this.memoryCache.filter((e) => e.id !== id);
      this.notifyListeners([...this.memoryCache], undefined, 'delete');
    }
    return true;
  }

  /**
   * حذف مجموعة موظفين دفعة واحدة
   */
  public async deleteBatch(ids: string[]): Promise<number> {
    const deletedCount = await dbDeleteEmployeesBatch(ids);
    if (this.memoryCache) {
      this.memoryCache = this.memoryCache.filter((e) => !ids.includes(e.id));
      this.notifyListeners([...this.memoryCache], undefined, 'delete_batch');
    }
    return deletedCount;
  }

  /**
   * حفظ دفعة من الموظفين (استيراد أو تحديث جماعي)
   */
  public async saveBatch(employees: Employee[]): Promise<number> {
    const enrichedList = employees.map((e) => this.ensureEmployeeMasterFields(e));
    const count = await dbSaveEmployeesBatch(enrichedList);
    this.memoryCache = await getAllEmployees();
    this.notifyListeners([...this.memoryCache], undefined, 'batch_save');
    return count;
  }

  /**
   * إعادة تحميل البيانات من قاعدة البيانات ومزامنة الذاكرة
   */
  public async reload(): Promise<Employee[]> {
    this.memoryCache = null;
    return this.getAll();
  }

  /**
   * تسجيل حدث في الخط الزمني للموظف
   */
  public async logTimelineEvent(event: CareerTimelineEvent): Promise<string> {
    return dbAddTimelineEvent(event);
  }

  public async addTimelineEvent(event: CareerTimelineEvent): Promise<string> {
    return this.logTimelineEvent(event);
  }

  public async updateEmployee(employee: Employee, performer: string = 'مدير النظام'): Promise<Employee> {
    return this.save(employee, performer);
  }

  /**
   * استرجاع السجل الزمني الكامل لموظف معين
   */
  public async getEmployeeTimeline(employeeId: string): Promise<CareerTimelineEvent[]> {
    return dbGetTimelineEvents(employeeId);
  }

  /**
   * استرجاع سجل تتبع التعديلات والعمليات الشامل لكافة الموظفين (Audit Log)
   */
  public async getAllAuditLogs(): Promise<CareerTimelineEvent[]> {
    let events = await dbGetAllTimelineEvents();
    if (!events || events.length === 0) {
      events = await this.seedDefaultAuditLogs();
    }
    return events;
  }

  /**
   * استرجاع سجل تتبع التعديلات لموظف محدد
   */
  public async getEmployeeAuditLogs(employeeId: string): Promise<CareerTimelineEvent[]> {
    const all = await this.getAllAuditLogs();
    return all.filter((evt) => evt.employeeId === employeeId);
  }

  /**
   * إضافة قيد تدقيق أو ملاحظة رقابية يدوية في ملف الموظف
   */
  public async logManualAuditEvent(params: {
    employeeId: string;
    employeeName: string;
    employeeNumber: string;
    department: string;
    title: string;
    category?: CareerTimelineEvent['category'];
    description: string;
    oldValue?: string;
    newValue?: string;
    orderNumber?: string;
    orderDate?: string;
    performedBy: string;
  }): Promise<CareerTimelineEvent> {
    const event: CareerTimelineEvent = {
      id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      employeeId: params.employeeId,
      employeeName: params.employeeName,
      employeeNumber: params.employeeNumber,
      department: params.department,
      date: new Date().toISOString().slice(0, 10),
      title: params.title,
      category: params.category || 'general',
      description: params.description,
      oldValue: params.oldValue,
      newValue: params.newValue,
      orderNumber: params.orderNumber,
      orderDate: params.orderDate,
      performedBy: params.performedBy,
      createdAt: new Date().toISOString(),
    };

    await this.logTimelineEvent(event);
    return event;
  }

  /**
   * إنشاء بيانات نموذجية أولية لسجل الرقابة وتتبع التعديلات إذا كانت قاعدة البيانات جديدة
   */
  public async seedDefaultAuditLogs(): Promise<CareerTimelineEvent[]> {
    const demoLogs: CareerTimelineEvent[] = [
      {
        id: 'EVT-INIT-001',
        employeeId: 'EMP-2026-001',
        employeeName: 'كرار حيدر جاسم الموسوي',
        employeeNumber: 'IQ-GOV-98214',
        department: 'قسم الشؤون الهندسية والمشاريع',
        date: '2026-03-24',
        title: 'تعديل الراتب والدرجة الوظيفية والمخصصات',
        category: 'salary_change',
        oldValue: 'الدرجة: 6، المرحلة: 3، الراتب الاسمي: 382,000 د.ع',
        newValue: 'الدرجة: 5، المرحلة: 1، الراتب الاسمي: 429,000 د.ع',
        description: 'تعديل السلم المالي واستحقاق الترفيع بموجب الأمر الإداري رقم (هـ/492) الصادر عن الأمانة العامة.',
        orderNumber: 'أمر إداري 492/هـ',
        orderDate: '2026-03-20',
        performedBy: 'أ. د. عبد الله السعدي - مدير قسم الموارد البشرية',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      },
      {
        id: 'EVT-INIT-002',
        employeeId: 'EMP-2026-002',
        employeeName: 'د. زينب عبد الحسين التميمي',
        employeeNumber: 'IQ-GOV-98215',
        department: 'قسم الشؤون القانونية والإدارية',
        date: '2026-03-18',
        title: 'تحديث الشهادة والمؤهل الدراسي',
        category: 'education_change',
        oldValue: 'ماجستير (75% مخصصات)',
        newValue: 'دكتوراه / بورد طبي (100% مخصصات - الدرجة 5)',
        description: 'معادلة وتقييم شهادة الدكتوراه في القانون المقارن واحتساب مخصصات اللقب العلمي 100%.',
        orderNumber: 'ق/8813',
        orderDate: '2026-03-15',
        performedBy: 'أ. علي عبد الرحمن الحيدري - مسؤول شؤون الموظفين',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      },
      {
        id: 'EVT-INIT-003',
        employeeId: 'EMP-2026-003',
        employeeName: 'أحمد مهدي صالح الجبوري',
        employeeNumber: 'IQ-GOV-98216',
        department: 'قسم الموارد البشرية والخدمة المدنية',
        date: '2026-03-12',
        title: 'نقل / تغيير القسم الإداري',
        category: 'department_change',
        oldValue: 'قسم المخازن والتجهيزات',
        newValue: 'قسم الموارد البشرية والخدمة المدنية',
        description: 'نقل الموظف بناءً على مقتضيات المصلحة العامة لتنسيق وإدارة أجهزة الباركود وشعبة الحضور.',
        orderNumber: 'إ/302',
        orderDate: '2026-03-10',
        performedBy: 'أ. علي عبد الرحمن الحيدري - مسؤول شؤون الموظفين',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
      },
      {
        id: 'EVT-INIT-004',
        employeeId: 'EMP-2026-004',
        employeeName: 'مروة قاسم كاظم الساعدي',
        employeeNumber: 'IQ-GOV-98217',
        department: 'شعبة تكنولوجيا المعلومات والحاسبة',
        date: '2026-02-28',
        title: 'تغيير العنوان الوظيفي',
        category: 'title_change',
        oldValue: 'معاون مبرمج',
        newValue: 'معاون مبرمج / مهندس برمجيات',
        description: 'تعديل العنوان الوظيفي لتطابق التوصيف الهندسي البرمجي المعتمد في الملاك.',
        performedBy: 'د. وسام حميد كريم - مدير التدقيق الداخلي',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString(),
      },
      {
        id: 'EVT-INIT-005',
        employeeId: 'EMP-2026-001',
        employeeName: 'كرار حيدر جاسم الموسوي',
        employeeNumber: 'IQ-GOV-98214',
        department: 'قسم الشؤون الهندسية والمشاريع',
        date: '2026-02-15',
        title: 'تحديث الشهادة والمؤهل الدراسي',
        category: 'education_change',
        oldValue: 'دبلوم فني / معهد (35% مخصصات)',
        newValue: 'بكالوريوس (45% مخصصات - الدرجة 7)',
        description: 'تقديم وثيقة التخرج الرسمية من كلية الهندسة وتعديل نسبة مخصصات الشهادة إلى 45%.',
        orderNumber: 'جامعي/554',
        orderDate: '2026-02-10',
        performedBy: 'أ. د. عبد الله السعدي - مدير قسم الموارد البشرية',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25).toISOString(),
      },
      {
        id: 'EVT-INIT-006',
        employeeId: 'EMP-2026-002',
        employeeName: 'د. زينب عبد الحسين التميمي',
        employeeNumber: 'IQ-GOV-98215',
        department: 'قسم الشؤون القانونية والإدارية',
        date: '2026-01-14',
        title: 'تعديل الراتب والدرجة الوظيفية والمخصصات',
        category: 'salary_change',
        oldValue: 'الدرجة: 4، المرحلة: 2، الراتب الاسمي: 531,000 د.ع',
        newValue: 'الدرجة: 4، المرحلة: 3، الراتب الاسمي: 541,000 د.ع',
        description: 'منح علاوة سنوية استحقاقية لاكتمال المدة القانونية وتقييم أداء امتياز.',
        orderNumber: 'ع/102',
        orderDate: '2026-01-10',
        performedBy: 'أ. علي عبد الرحمن الحيدري - مسؤول شؤون الموظفين',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(),
      },
    ];

    for (const log of demoLogs) {
      await dbAddTimelineEvent(log);
    }

    return demoLogs;
  }

  /**
   * تسجيل حركة مسح باركود جديدة
   */
  public async addBarcodeLog(log: BarcodeScanLog): Promise<void> {
    await dbSaveBarcodeScanLog(log);
  }

  /**
   * منح علاوة سنوية لموظف
   * 1. ترفيع المرحلة بمقدار 1 في السجل الموحد
   * 2. تحديث تاريخ آخر علاوة وتاريخ الاستحقاق القادم
   * 3. تسجيل أمر إداري في جدول العلاوات
   * 4. تسجيل حدث في السجل الزمني للموظف
   */
  public async grantAllowance(
    employeeId: string,
    details: {
      orderNumber: string;
      orderDate: string;
      effectiveDate: string;
      grantedBy: string;
      notes?: string;
    }
  ): Promise<{ employee: Employee; record: AllowanceRecord }> {
    const emp = await this.getById(employeeId);
    if (!emp) throw new Error('الموظف غير موجود في السجل الموحد');

    const prevStage = emp.civilStage || 1;
    const newStage = Math.min(11, prevStage + 1);
    const now = new Date(details.effectiveDate || new Date().toISOString().slice(0, 10));
    
    // Next due date: 1 year from effective date
    const nextDate = new Date(now);
    nextDate.setFullYear(nextDate.getFullYear() + 1);
    const nextDueDateStr = nextDate.toISOString().slice(0, 10);

    const grade = emp.civilGrade || 7;
    const newBaseSalary = getOfficialBaseSalary(grade, newStage);

    // Compute updated salary components
    const computed = computeEmployeeSalaryComponents({
      ...emp,
      civilStage: newStage,
      baseSalary: newBaseSalary,
    });

    const updatedEmp: Employee = {
      ...emp,
      civilStage: newStage,
      baseSalary: computed.baseSalary,
      spouseAllowance: computed.spouseAllowance,
      childrenAllowance: computed.childrenAllowance,
      educationAllowance: computed.educationAllowance,
      positionAllowance: computed.positionAllowance,
      hazardAllowance: computed.hazardAllowance,
      transportAllowance: computed.transportAllowance,
      totalAllowances: computed.totalAllowances,
      totalSalary: computed.grossSalary,
      pensionDeduction: computed.pensionDeduction,
      taxDeduction: computed.taxDeduction,
      totalDeductions: computed.totalDeductions,
      netSalary: computed.netSalary,
      lastAllowanceDate: details.effectiveDate,
      nextAllowanceDueDate: nextDueDateStr,
      isAllowanceSuspended: false,
      allowanceSuspensionReason: undefined,
      allowanceSuspensionReviewDate: undefined,
      updatedAt: new Date().toISOString(),
    };

    const record: AllowanceRecord = {
      id: `ALW-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      employeeId: emp.id,
      employeeName: emp.fullName,
      employeeNumber: emp.employeeNumber,
      department: emp.department,
      grade: emp.civilGrade || 7,
      previousStage: prevStage,
      newStage: newStage,
      grantDate: new Date().toISOString().slice(0, 10),
      effectiveDate: details.effectiveDate,
      orderNumber: details.orderNumber,
      orderDate: details.orderDate,
      status: 'granted',
      notes: details.notes,
      grantedBy: details.grantedBy,
      createdAt: new Date().toISOString(),
    };

    // Save record and updated employee
    await dbSaveAllowanceRecord(record);
    await this.save(updatedEmp, details.grantedBy);

    // Timeline event
    await this.logTimelineEvent({
      id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      employeeId: emp.id,
      date: details.effectiveDate,
      title: `منح العلاوة السنوية (المرحلة ${newStage})`,
      category: 'allowance',
      description: `تم منح الموظف علاوته السنوية وانتقاله من المرحلة (${prevStage}) إلى المرحلة (${newStage}) بموجب الأمر الإداري ذي العدد (${details.orderNumber}) بتاريخ (${details.orderDate}).`,
      orderNumber: details.orderNumber,
      orderDate: details.orderDate,
      performedBy: details.grantedBy,
      createdAt: new Date().toISOString(),
    });

    return { employee: updatedEmp, record };
  }

  /**
   * حجز أو تأجيل العلاوة السنوية
   */
  public async suspendAllowance(
    employeeId: string,
    reason: string,
    reviewDate: string,
    performer: string = 'مدير النظام'
  ): Promise<Employee> {
    const emp = await this.getById(employeeId);
    if (!emp) throw new Error('الموظف غير موجود في السجل الموحد');

    const updatedEmp: Employee = {
      ...emp,
      isAllowanceSuspended: true,
      allowanceSuspensionReason: reason,
      allowanceSuspensionReviewDate: reviewDate,
      updatedAt: new Date().toISOString(),
    };

    await this.save(updatedEmp, performer);

    await this.logTimelineEvent({
      id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      employeeId: emp.id,
      date: new Date().toISOString().slice(0, 10),
      title: 'حجز / تأجيل العلاوة السنوية',
      category: 'penalty',
      description: `تم تأجيل استحقاق العلاوة السنوية للموظف بسبب: (${reason}). موعد إعادة النظر المجدول: (${reviewDate}).`,
      performedBy: performer,
      createdAt: new Date().toISOString(),
    });

    return updatedEmp;
  }

  /**
   * ترقية وترفيع الموظف إلى درجة أعلى
   * 1. رفع الدرجة الوظيفية وتعديل العنوان والراتب إن وجد
   * 2. تصفير سنوات الخدمة في الدرجة الحالية
   * 3. تسجيل أمر الترفيع في جدول الترفيعات
   * 4. توثيق الحدث في السجل الزمني
   */
  public async promoteEmployee(
    employeeId: string,
    details: {
      newGrade: number;
      newTitle: string;
      orderNumber: string;
      orderDate: string;
      effectiveDate: string;
      promotedBy: string;
      newBaseSalary?: number;
      notes?: string;
    }
  ): Promise<{ employee: Employee; record: PromotionRecord }> {
    const emp = await this.getById(employeeId);
    if (!emp) throw new Error('الموظف غير موجود في السجل الموحد');

    const prevGrade = emp.civilGrade || 7;
    const prevTitle = emp.jobTitle;

    const newBase = details.newBaseSalary || getOfficialBaseSalary(details.newGrade, 1);
    const computed = computeEmployeeSalaryComponents({
      ...emp,
      civilGrade: details.newGrade,
      civilStage: 1,
      baseSalary: newBase,
      jobTitle: details.newTitle,
    });

    const updatedEmp: Employee = {
      ...emp,
      civilGrade: details.newGrade,
      civilStage: 1, // يعاد إلى المرحلة الأولى من الدرجة الجديدة
      jobTitle: details.newTitle,
      lastPromotionDate: details.effectiveDate,
      yearsInCurrentGrade: 0,
      baseSalary: computed.baseSalary,
      spouseAllowance: computed.spouseAllowance,
      childrenAllowance: computed.childrenAllowance,
      educationAllowance: computed.educationAllowance,
      positionAllowance: computed.positionAllowance,
      hazardAllowance: computed.hazardAllowance,
      transportAllowance: computed.transportAllowance,
      totalAllowances: computed.totalAllowances,
      totalSalary: computed.grossSalary,
      pensionDeduction: computed.pensionDeduction,
      taxDeduction: computed.taxDeduction,
      totalDeductions: computed.totalDeductions,
      netSalary: computed.netSalary,
      updatedAt: new Date().toISOString(),
    };

    const record: PromotionRecord = {
      id: `PRM-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      employeeId: emp.id,
      employeeName: emp.fullName,
      employeeNumber: emp.employeeNumber,
      department: emp.department,
      previousGrade: prevGrade,
      newGrade: details.newGrade,
      previousTitle: prevTitle,
      newTitle: details.newTitle,
      educationDegree: emp.educationDegree || 'جامعي',
      yearsOfServiceInGrade: emp.yearsInCurrentGrade || 4,
      orderNumber: details.orderNumber,
      orderDate: details.orderDate,
      effectiveDate: details.effectiveDate,
      newBaseSalary: details.newBaseSalary,
      notes: details.notes,
      promotedBy: details.promotedBy,
      createdAt: new Date().toISOString(),
    };

    await dbSavePromotionRecord(record);
    await this.save(updatedEmp, details.promotedBy);

    await this.logTimelineEvent({
      id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      employeeId: emp.id,
      date: details.effectiveDate,
      title: `ترفيع وظيفي إلى الدرجة (${details.newGrade})`,
      category: 'promotion',
      description: `تم ترفيع الموظف من الدرجة (${prevGrade}) والعنوان (${prevTitle}) إلى الدرجة (${details.newGrade}) والعنوان الوظيفي (${details.newTitle}) بموجب الأمر الإداري ذي العدد (${details.orderNumber}) بتاريخ (${details.orderDate}).`,
      orderNumber: details.orderNumber,
      orderDate: details.orderDate,
      performedBy: details.promotedBy,
      createdAt: new Date().toISOString(),
    });

    return { employee: updatedEmp, record };
  }

  /**
   * إحالة الموظف على التقاعد
   * 1. تغيير حالة الموظف في السجل الموحد إلى 'retired'
   * 2. حفظ تاريخ التقاعد ورقم الأمر الإداري وملاحظات الإحالة
   * 3. تسجيل الحدث في السجل الزمني
   * 4. يبقى الملف مؤرشفاً ومحفوظاً بالكامل
   */
  public async retireEmployee(
    employeeId: string,
    details: {
      retirementDate: string;
      orderNumber: string;
      orderDate: string;
      notes?: string;
      performedBy: string;
      gratuityAmount?: number;
      accumulatedLeaveCashAmount?: number;
      estimatedMonthlyPension?: number;
      totalRetirementPayout?: number;
      calculatedServiceYears?: number;
      retirementReason?: RetirementReason;
      retirementReasonTitle?: string;
      medicalBoardDecisionNumber?: string;
      medicalBoardDate?: string;
      disabilityPercentage?: number;
      medicalHospital?: string;
      disabilityType?: string;
      medicalBoardRecommendation?: string;
      applicantRequestDate?: string;
      ministerialApprovalNumber?: string;
      ministerialApprovalDate?: string;
    }
  ): Promise<Employee> {
    const emp = await this.getById(employeeId);
    if (!emp) throw new Error('الموظف غير موجود في السجل الموحد');

    const updatedEmp: Employee = {
      ...emp,
      status: 'retired',
      isRetired: true,
      retirementDate: details.retirementDate,
      retirementOrderNumber: details.orderNumber,
      retirementNotes: details.notes,
      retirementReason: details.retirementReason,
      retirementReasonTitle: details.retirementReasonTitle,
      medicalBoardDecisionNumber: details.medicalBoardDecisionNumber,
      medicalBoardDate: details.medicalBoardDate,
      disabilityPercentage: details.disabilityPercentage,
      medicalHospital: details.medicalHospital,
      disabilityType: details.disabilityType,
      medicalBoardRecommendation: details.medicalBoardRecommendation,
      applicantRequestDate: details.applicantRequestDate,
      ministerialApprovalNumber: details.ministerialApprovalNumber,
      ministerialApprovalDate: details.ministerialApprovalDate,
      gratuityAmount: details.gratuityAmount,
      accumulatedLeaveCashAmount: details.accumulatedLeaveCashAmount,
      estimatedMonthlyPension: details.estimatedMonthlyPension,
      totalRetirementPayout: details.totalRetirementPayout,
      calculatedServiceYears: details.calculatedServiceYears,
      updatedAt: new Date().toISOString(),
    };

    await this.save(updatedEmp, details.performedBy);

    const reasonText = details.retirementReasonTitle ? ` [السبب: ${details.retirementReasonTitle}]` : '';
    const medicalText = details.medicalBoardDecisionNumber
      ? ` | قرار اللجنة الطبية: ${details.medicalBoardDecisionNumber} بنسبة عجز ${details.disabilityPercentage || 0}%`
      : '';
    const calcNote = details.gratuityAmount
      ? ` | مكافأة نهاية الخدمة: ${details.gratuityAmount.toLocaleString('en-US')} د.ع | بدل الإجازات: ${(details.accumulatedLeaveCashAmount || 0).toLocaleString('en-US')} د.ع | الراتب التقاعدي التقديري: ${(details.estimatedMonthlyPension || 0).toLocaleString('en-US')} د.ع`
      : '';

    await this.logTimelineEvent({
      id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      employeeId: emp.id,
      date: details.retirementDate,
      title: `الإحالة على التقاعد ${reasonText}`,
      category: 'retirement',
      description: `تمت إحالة الموظف على التقاعد رسمياً بموجب الأمر الإداري ذي العدد (${details.orderNumber}) بتاريخ (${details.orderDate})${reasonText}${medicalText}.${calcNote}`,
      orderNumber: details.orderNumber,
      orderDate: details.orderDate,
      performedBy: details.performedBy,
      createdAt: new Date().toISOString(),
    });

    return updatedEmp;
  }

  /**
   * احتساب المكافأة والراتب التقاعدي وبدل الإجازات الذكي وفق قانون التقاعد الموحد العراقي رقم (9) لسنة 2014 والضوابط الوزارية
   */
  public calculateIraqiRetirementGratuity(
    emp: Employee,
    customServiceYears?: number,
    customBaseSalary?: number,
    customTotalSalary?: number,
    extraOptions?: {
      retirementReason?: RetirementReason;
      disabilityPercentage?: number;
      isWorkInjury?: boolean;
      careerSettings?: CareerSystemSettings;
    }
  ) {
    const settings = extraOptions?.careerSettings;
    const hireYear = emp.hireDate ? parseInt(emp.hireDate.slice(0, 4), 10) : 1995;
    const computedYears = Math.max(0, 2026 - hireYear);
    const serviceYears = typeof customServiceYears === 'number' ? customServiceYears : computedYears;

    const baseSalary = typeof customBaseSalary === 'number' ? customBaseSalary : (emp.baseSalary || 500000);
    const totalSalary = typeof customTotalSalary === 'number' ? customTotalSalary : (emp.totalSalary || baseSalary || 700000);

    const reason = extraOptions?.retirementReason || emp.retirementReason || 'legal_age';
    const disability = extraOptions?.disabilityPercentage ?? emp.disabilityPercentage ?? 0;
    const isWorkInjury = extraOptions?.isWorkInjury ?? (emp.disabilityType?.includes('إصابة عمل') || false);

    const minLegalPensionAmount = settings?.minLegalPensionAmount || 600000;
    const factorPercent = settings?.pensionCalculationFactor || 2.5;
    const maxLeaveDaysCap = settings?.maxAccumulatedLeaveDays || 180;
    const gratuityCapMonths = settings?.endOfServiceGratuityMonthsCap || 36;
    const healthGuaranteedYears = settings?.healthRetirementGuaranteedYears || 15;

    // 1. مكافأة نهاية الخدمة (End of Service Gratuity) - المادة 21
    let gratuityAmount = 0;
    let gratuityRule = '';
    if (serviceYears >= 30) {
      gratuityAmount = Math.min(totalSalary * 12, totalSalary * gratuityCapMonths);
      gratuityRule = 'استحقاق كامل: 12 شهراً من الراتب الكلي الأخير (خدمة 30 سنة فأكثر وفق المادة 21/أولاً)';
    } else if (serviceYears >= 15) {
      const months = Math.min(serviceYears, gratuityCapMonths);
      gratuityAmount = baseSalary * months;
      gratuityRule = `استحقاق نسبي: شهر واحد من الراتب الاسمي عن كل سنة خدمة (${months} شهر)`;
    } else if (reason === 'health_condition') {
      // استثناء العجز الصحي: احتساب مكافأة تعويضية أو شهر عن كل سنة خدمة فعلية
      gratuityAmount = baseSalary * Math.max(1, serviceYears);
      gratuityRule = `إحالة لأسباب صحية (المادة 13): احتساب مكافأة نسبية عن الخدمة (${serviceYears} سنة) مع استحقاق الراتب التقاعدي المضمون`;
    } else {
      gratuityAmount = 0;
      gratuityRule = 'أقل من 15 سنة خدمة - لا يستحق مكافأة نهاية الخدمة وتُعاد له التوقيفات التقاعدية دفعة واحدة';
    }

    // 2. بدل رصيد الإجازات الاعتيادية المتراكمة نقداً (المادة 45 من قانون الخدمة المدنية رقم 24 لسنة 1960)
    // بحد أقصى maxLeaveDaysCap يوماً محسوبة على أساس الراتب الكامل
    const remainingDays = emp.remainingBalance || 0;
    const payableLeaveDays = Math.min(maxLeaveDaysCap, Math.max(0, remainingDays));
    const accumulatedLeaveCashAmount = Math.round((totalSalary / 30) * payableLeaveDays);

    // 3. الراتب التقاعدي الشهري التقديري المستحق وفق المعادلة القانونية والتعديلات الوزارية:
    // (معدل الراتب الاسمي × سنوات الخدمة × المعامل %) / 100
    // في حالة التقاعد الصحي: يُضمن احتساب ما لا يقل عن healthGuaranteedYears سنة خدمة إذا كانت الخدمة الفعلية أقل
    const effectivePensionYears = reason === 'health_condition' ? Math.max(serviceYears, healthGuaranteedYears) : serviceYears;
    let rawPension = Math.round((baseSalary * effectivePensionYears * factorPercent) / 100);

    // إضافة مخصصات عجز إضافية إذا كانت إصابة عمل أثناء الخدمة وبسببها
    if (reason === 'health_condition' && isWorkInjury) {
      rawPension = Math.round(rawPension * 1.15); // +15% مخصصات إصابة عمل
    }

    // الحد الأدنى للراتب التقاعدي المضمون
    let minLegalPension = 0;
    if (reason === 'health_condition') {
      minLegalPension = minLegalPensionAmount; // مضمون دائماً للمحال صحياً بغض النظر عن مدة الخدمة
    } else if (serviceYears >= 15) {
      minLegalPension = minLegalPensionAmount;
    }

    const estimatedMonthlyPension = Math.max(rawPension, minLegalPension);

    // 4. إجمالي المبالغ النقدية الفورية (مكافأة + رصيد إجازات)
    const totalRetirementPayout = gratuityAmount + accumulatedLeaveCashAmount;

    return {
      serviceYears,
      effectivePensionYears,
      baseSalary,
      totalSalary,
      gratuityAmount,
      gratuityRule,
      payableLeaveDays,
      accumulatedLeaveCashAmount,
      estimatedMonthlyPension,
      rawPension,
      minLegalPension,
      totalRetirementPayout,
      reason,
      disability,
      isWorkInjury,
    };
  }

  /**
   * منح إجازة 5 سنوات براتب اسمي كامل أو نصف اسمي
   */
  public async grantFiveYearLeave(
    employeeId: string,
    details: {
      salaryType: 'full_base_salary' | 'half_base_salary';
      startDate: string;
      endDate: string;
      orderNumber: string;
      orderDate: string;
      baseSalary?: number;
      pensionDeductionPercent?: number;
      notes?: string;
      performedBy: string;
    }
  ): Promise<Employee> {
    const emp = await this.getById(employeeId);
    if (!emp) throw new Error('الموظف غير موجود');

    const baseSalary = details.baseSalary || emp.baseSalary || 500000;
    const isFull = details.salaryType === 'full_base_salary';
    const monthlyPaidAmount = isFull ? baseSalary : Math.round(baseSalary / 2);
    const pensionPercent = typeof details.pensionDeductionPercent === 'number' ? details.pensionDeductionPercent : 10;
    const monthlyPensionDeduction = Math.round((baseSalary * pensionPercent) / 100);
    const netMonthlyPaid = Math.max(0, monthlyPaidAmount - monthlyPensionDeduction);

    const updatedEmp: Employee = {
      ...emp,
      status: 'five_year_leave',
      fiveYearLeave: {
        isActive: true,
        salaryType: details.salaryType,
        startDate: details.startDate,
        endDate: details.endDate,
        orderNumber: details.orderNumber,
        orderDate: details.orderDate,
        baseSalaryAtLeave: baseSalary,
        monthlyPaidAmount,
        pensionDeductionPercent: pensionPercent,
        monthlyPensionDeduction,
        netMonthlyPaid,
        notes: details.notes,
      },
      updatedAt: new Date().toISOString(),
    };

    await this.save(updatedEmp, details.performedBy);

    const salaryTypeLabel = isFull ? 'براتب اسمي كامل (100%)' : 'بنصف راتب اسمي (50%)';

    await this.logTimelineEvent({
      id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      employeeId: emp.id,
      date: details.startDate,
      title: 'منح إجازة 5 سنوات',
      category: 'five_year_leave',
      description: `تم منح الموظف إجازة خمس سنوات ${salaryTypeLabel} بموجب الأمر الإداري (${details.orderNumber}) بتاريخ (${details.orderDate}) للمدة من (${details.startDate}) إلى (${details.endDate}). الصافي الشهري: ${netMonthlyPaid.toLocaleString('en-US')} د.ع مع استقطاع توقيفات تقاعدية (${pensionPercent}%).`,
      orderNumber: details.orderNumber,
      orderDate: details.orderDate,
      performedBy: details.performedBy,
      createdAt: new Date().toISOString(),
    });

    return updatedEmp;
  }

  /**
   * تعديل شروط إجازة 5 سنوات مستقبلاً (الراتب، المدة، الملاحظات)
   */
  public async updateFiveYearLeave(
    employeeId: string,
    details: {
      salaryType?: 'full_base_salary' | 'half_base_salary';
      startDate?: string;
      endDate?: string;
      orderNumber?: string;
      orderDate?: string;
      baseSalary?: number;
      pensionDeductionPercent?: number;
      notes?: string;
      performedBy: string;
    }
  ): Promise<Employee> {
    const emp = await this.getById(employeeId);
    if (!emp) throw new Error('الموظف غير موجود');
    if (!emp.fiveYearLeave) throw new Error('الموظف ليس لديه إجازة 5 سنوات مسجلة');

    const current = emp.fiveYearLeave;
    const salaryType = details.salaryType || current.salaryType;
    const baseSalary = details.baseSalary || current.baseSalaryAtLeave || emp.baseSalary || 500000;
    const isFull = salaryType === 'full_base_salary';
    const monthlyPaidAmount = isFull ? baseSalary : Math.round(baseSalary / 2);
    const pensionPercent = typeof details.pensionDeductionPercent === 'number' ? details.pensionDeductionPercent : current.pensionDeductionPercent;
    const monthlyPensionDeduction = Math.round((baseSalary * pensionPercent) / 100);
    const netMonthlyPaid = Math.max(0, monthlyPaidAmount - monthlyPensionDeduction);

    const updatedEmp: Employee = {
      ...emp,
      fiveYearLeave: {
        ...current,
        salaryType,
        startDate: details.startDate || current.startDate,
        endDate: details.endDate || current.endDate,
        orderNumber: details.orderNumber || current.orderNumber,
        orderDate: details.orderDate || current.orderDate,
        baseSalaryAtLeave: baseSalary,
        monthlyPaidAmount,
        pensionDeductionPercent: pensionPercent,
        monthlyPensionDeduction,
        netMonthlyPaid,
        notes: details.notes !== undefined ? details.notes : current.notes,
      },
      updatedAt: new Date().toISOString(),
    };

    await this.save(updatedEmp, details.performedBy);

    await this.logTimelineEvent({
      id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      employeeId: emp.id,
      date: new Date().toISOString().slice(0, 10),
      title: 'تعديل بيانات إجازة 5 سنوات',
      category: 'five_year_leave',
      description: `تم تحديث وتعديل شروط إجازة الـ 5 سنوات (${isFull ? 'براتب اسمي كامل' : 'بنصف راتب اسمي'}) والصافي الشهري إلى (${netMonthlyPaid.toLocaleString('en-US')} د.ع).`,
      orderNumber: details.orderNumber || current.orderNumber,
      orderDate: details.orderDate || current.orderDate,
      performedBy: details.performedBy,
      createdAt: new Date().toISOString(),
    });

    return updatedEmp;
  }

  /**
   * قطع إجازة الـ 5 سنوات وإعادة الموظف للمباشرة بالعمل
   */
  public async interruptFiveYearLeave(
    employeeId: string,
    resumeDate: string,
    performedBy: string,
    orderNumber?: string,
    orderDate?: string,
    notes?: string
  ): Promise<Employee> {
    const emp = await this.getById(employeeId);
    if (!emp) throw new Error('الموظف غير موجود');

    const updatedEmp: Employee = {
      ...emp,
      status: 'active',
      fiveYearLeave: emp.fiveYearLeave ? { ...emp.fiveYearLeave, isActive: false } : undefined,
      updatedAt: new Date().toISOString(),
    };

    await this.save(updatedEmp, performedBy);

    await this.logTimelineEvent({
      id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      employeeId: emp.id,
      date: resumeDate,
      title: 'قطع إجازة 5 سنوات والمباشرة بالعمل',
      category: 'five_year_leave',
      description: `تم قطع إجازة الخمس سنوات للموظف ومباشرته بالعمل اعتباراً من تاريخ (${resumeDate}) بموجب الأمر (${orderNumber || 'أمر مباشرة'}) بتاريخ (${orderDate || resumeDate}). ${notes || ''}`,
      orderNumber,
      orderDate,
      performedBy,
      createdAt: new Date().toISOString(),
    });

    return updatedEmp;
  }

  /**
   * إعادة تفعيل موظف متقاعد أو موقوف
   */
  public async reactivateEmployee(
    employeeId: string,
    performer: string = 'مدير النظام'
  ): Promise<Employee> {
    const emp = await this.getById(employeeId);
    if (!emp) throw new Error('الموظف غير موجود في السجل الموحد');

    const updatedEmp: Employee = {
      ...emp,
      status: 'active',
      isRetired: false,
      updatedAt: new Date().toISOString(),
    };

    await this.save(updatedEmp, performer);

    await this.logTimelineEvent({
      id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      employeeId: emp.id,
      date: new Date().toISOString().slice(0, 10),
      title: 'إعادة تفعيل السجل الوظيفي',
      category: 'general',
      description: `تمت إعادة تفعيل قيد الموظف في الخدمة المستمرة.`,
      performedBy: performer,
      createdAt: new Date().toISOString(),
    });

    return updatedEmp;
  }

  /**
   * توليد أو إعادة إصدار باركود للموظف (مع إبطال القديم)
   */
  public async regenerateBarcode(
    employeeId: string,
    performer: string = 'مدير النظام'
  ): Promise<Employee> {
    const emp = await this.getById(employeeId);
    if (!emp) throw new Error('الموظف غير موجود');

    // New unique barcode format: IQ-<Number>-<RandomToken>
    const randomToken = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newBarcode = `${emp.employeeNumber}-${randomToken}`;

    const updatedEmp: Employee = {
      ...emp,
      barcodeValue: newBarcode,
      barcodeBadgePrinted: false,
      updatedAt: new Date().toISOString(),
    };

    await this.save(updatedEmp, performer);

    await this.logTimelineEvent({
      id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      employeeId: emp.id,
      date: new Date().toISOString().slice(0, 10),
      title: 'إعادة توليد باركود وهوية الموظف',
      category: 'barcode',
      description: `تم إصدار كود باركود جديد (${newBarcode}) وإبطال الرمز القديم بسبب الفقدان أو التلف.`,
      performedBy: performer,
      createdAt: new Date().toISOString(),
    });

    return updatedEmp;
  }

  /**
   * تسجيل عملية مسح باركود وتوثيق السجل
   */
  public async logBarcodeScan(
    scan: Omit<BarcodeScanLog, 'id' | 'scanTime'>
  ): Promise<BarcodeScanLog> {
    const record: BarcodeScanLog = {
      ...scan,
      id: `SCAN-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      scanTime: new Date().toISOString(),
    };
    await dbSaveBarcodeScanLog(record);

    // If successful employee scan, update last scanned time
    if (record.employeeId) {
      const emp = await this.getById(record.employeeId);
      if (emp) {
        emp.barcodeLastScannedAt = record.scanTime;
        await dbSaveEmployee(emp);
      }
    }

    return record;
  }

  /**
   * استرجاع سجلات مسح الباركود الأخيرة
   */
  public async getBarcodeLogs(limit: number = 50): Promise<BarcodeScanLog[]> {
    return dbGetBarcodeScanLogs(limit);
  }

  /**
   * استرجاع سجلات العلاوات كافة
   */
  public async getAllAllowances(): Promise<AllowanceRecord[]> {
    return dbGetAllAllowances();
  }

  /**
   * استرجاع سجلات الترفيعات كافة
   */
  public async getAllPromotions(): Promise<PromotionRecord[]> {
    return dbGetAllPromotions();
  }

  /**
   * حساب الإحصاءات العامة للوحة التحكم وسجلات الموظفين
   */
  public async getExecutiveMetrics() {
    const employees = await this.getAll();
    const active = employees.filter((e) => e.status !== 'retired');
    const retired = employees.filter((e) => e.status === 'retired');
    const permanent = active.filter((e) => e.contractType === 'permanent');
    const contract = active.filter((e) => e.contractType === 'contract');

    // Allowance due soon (this month / next month)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    const dueAllowances = active.filter((e) => {
      if (e.isAllowanceSuspended) return false;
      const dueDateStr = e.nextAllowanceDueDate;
      if (!dueDateStr) return false;
      const due = new Date(dueDateStr);
      const diffMonths = (due.getFullYear() - currentYear) * 12 + (due.getMonth() + 1 - currentMonth);
      return diffMonths <= 1; // due this month or next month
    });

    // Approaching retirement (within 6 months)
    const settings = await this.getCareerSettings();
    const retirementAge = settings.retirementAgeYears || 60;
    const warningMonths = settings.retirementWarningMonths || 6;

    const nearRetirement = active.filter((e) => {
      if (!e.birthDate) return false;
      const birth = new Date(e.birthDate);
      const retirementDate = new Date(birth);
      retirementDate.setFullYear(retirementDate.getFullYear() + retirementAge);
      const diffTime = retirementDate.getTime() - now.getTime();
      const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.4);
      return diffMonths >= 0 && diffMonths <= warningMonths;
    });

    const unprintedBadges = active.filter((e) => !e.barcodeBadgePrinted);

    // 3. Exhausted or Depleted Leave Balances (رصيد إجازات منتهي أو حرج <= 0 أو <= 3)
    const depletedLeaveEmployees = active.filter((e) => (e.remainingBalance ?? 0) <= 0);
    const lowLeaveEmployees = active.filter(
      (e) => (e.remainingBalance ?? 0) > 0 && (e.remainingBalance ?? 0) <= 3
    );

    return {
      totalEmployees: employees.length,
      activeEmployees: active.length,
      retiredEmployees: retired.length,
      permanentEmployees: permanent.length,
      contractEmployees: contract.length,
      dueAllowancesCount: dueAllowances.length,
      dueAllowancesList: dueAllowances,
      nearRetirementCount: nearRetirement.length,
      nearRetirementList: nearRetirement,
      depletedLeaveCount: depletedLeaveEmployees.length,
      depletedLeaveList: depletedLeaveEmployees,
      lowLeaveCount: lowLeaveEmployees.length,
      lowLeaveList: lowLeaveEmployees,
      unprintedBadgesCount: unprintedBadges.length,
    };
  }

  /**
   * استرجاع إعدادات المسار الوظيفي (العلاوات والترفيعات والتقاعد)
   */
  public async getCareerSettings(): Promise<CareerSystemSettings> {
    return getSystemSetting<CareerSystemSettings>('career_system_settings', DEFAULT_CAREER_SETTINGS);
  }

  /**
   * حفظ إعدادات المسار الوظيفي
   */
  public async saveCareerSettings(settings: CareerSystemSettings): Promise<void> {
    return saveSystemSetting<CareerSystemSettings>('career_system_settings', settings);
  }

  /**
   * تنفيذ منح العلاوات السنوية الجماعية لدفعة من الموظفين بأمر إداري موحد
   */
  public async grantBatchAllowances(
    employeeIds: string[],
    details: {
      orderNumber: string;
      orderDate: string;
      effectiveDate: string;
      grantedBy: string;
      notes?: string;
    }
  ): Promise<{
    updatedEmployees: Employee[];
    records: AllowanceRecord[];
    executionItems: BatchAllowanceExecutionItem[];
  }> {
    const allEmps = await this.getAll();
    const targetEmps = allEmps.filter((e) => employeeIds.includes(e.id) && e.status !== 'retired');

    const updatedEmployees: Employee[] = [];
    const records: AllowanceRecord[] = [];
    const executionItems: BatchAllowanceExecutionItem[] = [];
    const timelineEvents: CareerTimelineEvent[] = [];

    const now = new Date(details.effectiveDate || new Date().toISOString().slice(0, 10));
    const nextDate = new Date(now);
    nextDate.setFullYear(nextDate.getFullYear() + 1);
    const nextDueDateStr = nextDate.toISOString().slice(0, 10);

    for (const emp of targetEmps) {
      const prevStage = emp.civilStage || 1;
      const newStage = Math.min(11, prevStage + 1);
      const grade = emp.civilGrade || 7;
      const prevBaseSalary = emp.baseSalary || getOfficialBaseSalary(grade, prevStage);
      const newBaseSalary = getOfficialBaseSalary(grade, newStage);

      const computed = computeEmployeeSalaryComponents({
        ...emp,
        civilStage: newStage,
        baseSalary: newBaseSalary,
      });

      const updatedEmp: Employee = {
        ...emp,
        civilStage: newStage,
        baseSalary: computed.baseSalary,
        spouseAllowance: computed.spouseAllowance,
        childrenAllowance: computed.childrenAllowance,
        educationAllowance: computed.educationAllowance,
        positionAllowance: computed.positionAllowance,
        hazardAllowance: computed.hazardAllowance,
        transportAllowance: computed.transportAllowance,
        totalAllowances: computed.totalAllowances,
        totalSalary: computed.grossSalary,
        pensionDeduction: computed.pensionDeduction,
        taxDeduction: computed.taxDeduction,
        totalDeductions: computed.totalDeductions,
        netSalary: computed.netSalary,
        lastAllowanceDate: details.effectiveDate,
        nextAllowanceDueDate: nextDueDateStr,
        isAllowanceSuspended: false,
        allowanceSuspensionReason: undefined,
        allowanceSuspensionReviewDate: undefined,
        updatedAt: new Date().toISOString(),
      };

      const record: AllowanceRecord = {
        id: `ALW-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        employeeId: emp.id,
        employeeName: emp.fullName,
        employeeNumber: emp.employeeNumber,
        department: emp.department,
        grade: grade,
        previousStage: prevStage,
        newStage: newStage,
        grantDate: new Date().toISOString().slice(0, 10),
        effectiveDate: details.effectiveDate,
        orderNumber: details.orderNumber,
        orderDate: details.orderDate,
        status: 'granted',
        notes: details.notes || 'منح علاوة سنوية ضمن أمر إداري جماعي موحد',
        grantedBy: details.grantedBy,
        createdAt: new Date().toISOString(),
      };

      timelineEvents.push({
        id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        employeeId: emp.id,
        date: details.effectiveDate,
        title: `منح علاوة سنوية جماعية (المرحلة ${newStage})`,
        category: 'allowance',
        description: `تم منح الموظف علاوته السنوية وانتقاله من المرحلة (${prevStage}) إلى المرحلة (${newStage}) بموجب الأمر الإداري الموحد ذي العدد (${details.orderNumber}) بتاريخ (${details.orderDate}).`,
        orderNumber: details.orderNumber,
        orderDate: details.orderDate,
        performedBy: details.grantedBy,
        createdAt: new Date().toISOString(),
      });

      updatedEmployees.push(updatedEmp);
      records.push(record);
      executionItems.push({
        employeeId: emp.id,
        employeeName: emp.fullName,
        employeeNumber: emp.employeeNumber,
        department: emp.department,
        grade: grade,
        previousStage: prevStage,
        newStage: newStage,
        previousBaseSalary: prevBaseSalary,
        newBaseSalary: newBaseSalary,
      });
    }

    // High performance batch database commit
    if (updatedEmployees.length > 0) {
      await dbSaveEmployeesBatch(updatedEmployees);
      await Promise.all(records.map((r) => dbSaveAllowanceRecord(r)));
      await Promise.all(timelineEvents.map((ev) => this.logTimelineEvent(ev)));
    }

    // Refresh memory cache and notify all listeners
    this.memoryCache = await getAllEmployees();
    this.notifyListeners([...this.memoryCache], undefined, 'batch_allowance');

    return { updatedEmployees, records, executionItems };
  }

  /**
   * تنفيذ ترفيعات وظيفية جماعية لدفعة من الموظفين بأمر إداري موحد
   */
  public async promoteBatchEmployees(
    promotions: Array<{
      employeeId: string;
      newGrade: number;
      newTitle: string;
      newBaseSalary?: number;
    }>,
    details: {
      orderNumber: string;
      orderDate: string;
      effectiveDate: string;
      promotedBy: string;
      notes?: string;
    }
  ): Promise<{
    updatedEmployees: Employee[];
    records: PromotionRecord[];
    executionItems: BatchPromotionExecutionItem[];
  }> {
    const allEmps = await this.getAll();
    const updatedEmployees: Employee[] = [];
    const records: PromotionRecord[] = [];
    const executionItems: BatchPromotionExecutionItem[] = [];
    const timelineEvents: CareerTimelineEvent[] = [];

    for (const item of promotions) {
      const emp = allEmps.find((e) => e.id === item.employeeId);
      if (!emp || emp.status === 'retired') continue;

      const prevGrade = emp.civilGrade || 7;
      const prevTitle = emp.jobTitle;
      const prevBaseSalary = emp.baseSalary || getOfficialBaseSalary(prevGrade, emp.civilStage || 1);
      const newBaseSalary = item.newBaseSalary || getOfficialBaseSalary(item.newGrade, 1);

      const computed = computeEmployeeSalaryComponents({
        ...emp,
        civilGrade: item.newGrade,
        civilStage: 1,
        baseSalary: newBaseSalary,
        jobTitle: item.newTitle,
      });

      const updatedEmp: Employee = {
        ...emp,
        civilGrade: item.newGrade,
        civilStage: 1,
        jobTitle: item.newTitle,
        lastPromotionDate: details.effectiveDate,
        yearsInCurrentGrade: 0,
        baseSalary: computed.baseSalary,
        spouseAllowance: computed.spouseAllowance,
        childrenAllowance: computed.childrenAllowance,
        educationAllowance: computed.educationAllowance,
        positionAllowance: computed.positionAllowance,
        hazardAllowance: computed.hazardAllowance,
        transportAllowance: computed.transportAllowance,
        totalAllowances: computed.totalAllowances,
        totalSalary: computed.grossSalary,
        pensionDeduction: computed.pensionDeduction,
        taxDeduction: computed.taxDeduction,
        totalDeductions: computed.totalDeductions,
        netSalary: computed.netSalary,
        updatedAt: new Date().toISOString(),
      };

      const record: PromotionRecord = {
        id: `PRM-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        employeeId: emp.id,
        employeeName: emp.fullName,
        employeeNumber: emp.employeeNumber,
        department: emp.department,
        previousGrade: prevGrade,
        newGrade: item.newGrade,
        previousTitle: prevTitle,
        newTitle: item.newTitle,
        educationDegree: emp.educationDegree || 'جامعي',
        yearsOfServiceInGrade: emp.yearsInCurrentGrade || 4,
        orderNumber: details.orderNumber,
        orderDate: details.orderDate,
        effectiveDate: details.effectiveDate,
        newBaseSalary: newBaseSalary,
        notes: details.notes || 'ترفيع وظيفي ضمن أمر إداري جماعي موحد',
        promotedBy: details.promotedBy,
        createdAt: new Date().toISOString(),
      };

      timelineEvents.push({
        id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        employeeId: emp.id,
        date: details.effectiveDate,
        title: `ترفيع وظيفي جماعي إلى الدرجة (${item.newGrade})`,
        category: 'promotion',
        description: `تم ترفيع الموظف من الدرجة (${prevGrade}) والعنوان (${prevTitle}) إلى الدرجة (${item.newGrade}) والعنوان الوظيفي (${item.newTitle}) بموجب الأمر الإداري الموحد ذي العدد (${details.orderNumber}) بتاريخ (${details.orderDate}).`,
        orderNumber: details.orderNumber,
        orderDate: details.orderDate,
        performedBy: details.promotedBy,
        createdAt: new Date().toISOString(),
      });

      updatedEmployees.push(updatedEmp);
      records.push(record);
      executionItems.push({
        employeeId: emp.id,
        employeeName: emp.fullName,
        employeeNumber: emp.employeeNumber,
        department: emp.department,
        previousGrade: prevGrade,
        newGrade: item.newGrade,
        previousTitle: prevTitle,
        newTitle: item.newTitle,
        previousBaseSalary: prevBaseSalary,
        newBaseSalary: newBaseSalary,
      });
    }

    // High performance batch database commit
    if (updatedEmployees.length > 0) {
      await dbSaveEmployeesBatch(updatedEmployees);
      await Promise.all(records.map((r) => dbSavePromotionRecord(r)));
      await Promise.all(timelineEvents.map((ev) => this.logTimelineEvent(ev)));
    }

    this.memoryCache = await getAllEmployees();
    this.notifyListeners([...this.memoryCache], undefined, 'batch_promotion');

    return { updatedEmployees, records, executionItems };
  }

  /**
   * التعديل الجماعي للرواتب والمخصصات والضرائب لقسم أو لمجموعة موظفين (مع الربط الشامل)
   */
  public async updateBatchSalariesAndAllowances(
    employeeIds: string[],
    updates: Partial<Employee>,
    performer: string = 'مدير الموارد البشرية'
  ): Promise<number> {
    const allEmps = await this.getAll();
    const targetEmps = allEmps.filter((e) => employeeIds.includes(e.id));
    const updatedEmployees: Employee[] = [];
    const timelineEvents: CareerTimelineEvent[] = [];

    for (const emp of targetEmps) {
      const merged: Employee = {
        ...emp,
        ...updates,
      };

      const computed = computeEmployeeSalaryComponents(merged);
      const updatedEmp: Employee = {
        ...merged,
        baseSalary: computed.baseSalary,
        spouseAllowance: computed.spouseAllowance,
        childrenAllowance: computed.childrenAllowance,
        educationAllowance: computed.educationAllowance,
        positionAllowance: computed.positionAllowance,
        hazardAllowance: computed.hazardAllowance,
        transportAllowance: computed.transportAllowance,
        totalAllowances: computed.totalAllowances,
        totalSalary: computed.grossSalary,
        pensionDeduction: computed.pensionDeduction,
        taxDeduction: computed.taxDeduction,
        totalDeductions: computed.totalDeductions,
        netSalary: computed.netSalary,
        updatedAt: new Date().toISOString(),
      };

      timelineEvents.push({
        id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        employeeId: emp.id,
        date: new Date().toISOString().slice(0, 10),
        title: 'تعديل جماعي للراتب والمخصصات',
        category: 'allowance',
        description: `تم تحديث بنود الراتب والمخصصات جماعياً بواسطة (${performer}). الراتب الاسمي: (${computed.baseSalary.toLocaleString()} د.ع) - الصافي: (${computed.netSalary.toLocaleString()} د.ع).`,
        performedBy: performer,
        createdAt: new Date().toISOString(),
      });

      updatedEmployees.push(updatedEmp);
    }

    if (updatedEmployees.length > 0) {
      await dbSaveEmployeesBatch(updatedEmployees);
      await Promise.all(timelineEvents.map((ev) => this.logTimelineEvent(ev)));
    }

    this.memoryCache = await getAllEmployees();
    this.notifyListeners([...this.memoryCache], undefined, 'batch_salary_update');
    return updatedEmployees.length;
  }

  /**
   * تعديل تفصيلي لراتب ومخصصات موظف منفرد مع توثيق السجل والربط بالأقسام
   */
  public async updateEmployeeSalaryDetails(
    employeeId: string,
    salaryFields: Partial<Employee>,
    performer: string = 'مدير الرواتب والموارد البشرية'
  ): Promise<Employee> {
    const emp = await this.getById(employeeId);
    if (!emp) throw new Error('الموظف غير موجود في السجل');

    const merged: Employee = {
      ...emp,
      ...salaryFields,
    };

    const computed = computeEmployeeSalaryComponents(merged);
    const updatedEmp: Employee = {
      ...merged,
      baseSalary: computed.baseSalary,
      spouseAllowance: computed.spouseAllowance,
      childrenAllowance: computed.childrenAllowance,
      educationAllowance: computed.educationAllowance,
      positionAllowance: computed.positionAllowance,
      hazardAllowance: computed.hazardAllowance,
      transportAllowance: computed.transportAllowance,
      totalAllowances: computed.totalAllowances,
      totalSalary: computed.grossSalary,
      pensionDeduction: computed.pensionDeduction,
      taxDeduction: computed.taxDeduction,
      totalDeductions: computed.totalDeductions,
      netSalary: computed.netSalary,
      updatedAt: new Date().toISOString(),
    };

    await this.save(updatedEmp, performer);

    await this.logTimelineEvent({
      id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      employeeId: emp.id,
      date: new Date().toISOString().slice(0, 10),
      title: 'تعديل الراتب الاسمي والمخصصات',
      category: 'allowance',
      description: `تم تعديل بيانات الراتب والمخصصات للموظف بواسطة (${performer}). الراتب الاسمي: ${computed.baseSalary.toLocaleString()} د.ع | إجمالي المخصصات: ${computed.totalAllowances.toLocaleString()} د.ع | صافي الراتب: ${computed.netSalary.toLocaleString()} د.ع.`,
      performedBy: performer,
      createdAt: new Date().toISOString(),
    });

    return updatedEmp;
  }

  /**
   * ضمان توفر الحقول الموحدة للموظف مع قيم افتراضية متناسقة
   */
  public ensureEmployeeMasterFields(emp: Employee): Employee {
    const rawNumber = emp.employeeNumber ? emp.employeeNumber.trim() : `IQ-${Math.floor(10000 + Math.random() * 90000)}`;
    const barcodeVal = emp.barcodeValue || rawNumber;
    
    // Default birth date estimation if hireDate exists (assume hired at 24)
    let defaultBirthDate = emp.birthDate;
    if (!defaultBirthDate && emp.hireDate) {
      try {
        const hireYear = parseInt(emp.hireDate.slice(0, 4), 10);
        if (!isNaN(hireYear)) {
          defaultBirthDate = `${hireYear - 24}-07-01`;
        }
      } catch {}
    }

    // Default next allowance date if missing (1 year from hire date or last allowance)
    let nextAllowance = emp.nextAllowanceDueDate;
    if (!nextAllowance) {
      const baseDate = emp.lastAllowanceDate || emp.hireDate || new Date().toISOString().slice(0, 10);
      try {
        const d = new Date(baseDate);
        d.setFullYear(d.getFullYear() + 1);
        nextAllowance = d.toISOString().slice(0, 10);
      } catch {
        nextAllowance = '2026-12-31';
      }
    }

    const grade = emp.civilGrade ?? (emp.contractType === 'permanent' ? 7 : 8);
    const stage = emp.civilStage ?? 1;

    // Calculate integrated salary, allowances, and net salary
    const computedSalary = computeEmployeeSalaryComponents({
      ...emp,
      civilGrade: grade,
      civilStage: stage,
    });

    return {
      ...emp,
      employeeNumber: rawNumber,
      barcodeValue: barcodeVal,
      status: emp.status || (emp.isRetired ? 'retired' : 'active'),
      civilGrade: grade,
      civilStage: stage,
      educationDegree: emp.educationDegree || 'بكالوريوس',
      birthDate: defaultBirthDate,
      gender: emp.gender || 'male',
      maritalStatus: emp.maritalStatus || 'married',
      hasSpouseAllowance: emp.hasSpouseAllowance ?? true,
      childrenCount: emp.childrenCount ?? 2,
      baseSalary: computedSalary.baseSalary,
      spouseAllowance: computedSalary.spouseAllowance,
      childrenAllowance: computedSalary.childrenAllowance,
      educationAllowance: computedSalary.educationAllowance,
      positionAllowance: computedSalary.positionAllowance,
      hazardAllowance: computedSalary.hazardAllowance,
      transportAllowance: computedSalary.transportAllowance,
      totalAllowances: computedSalary.totalAllowances,
      totalSalary: computedSalary.grossSalary,
      pensionDeduction: computedSalary.pensionDeduction,
      isPensionDeducted: emp.isPensionDeducted !== false,
      isTaxEnabled: Boolean(emp.isTaxEnabled),
      taxRatePercent: emp.taxRatePercent ?? 3,
      taxDeduction: computedSalary.taxDeduction,
      totalDeductions: computedSalary.totalDeductions,
      netSalary: computedSalary.netSalary,
      lastAllowanceDate: emp.lastAllowanceDate || emp.hireDate,
      nextAllowanceDueDate: nextAllowance,
      isAllowanceSuspended: Boolean(emp.isAllowanceSuspended),
      yearsInCurrentGrade: emp.yearsInCurrentGrade ?? 2,
      barcodeBadgePrinted: emp.barcodeBadgePrinted ?? true,
    };
  }

  // ==========================================
  // إدارة الأقسام والتشكيلات الإدارية (Department Management)
  // ==========================================

  private departmentsCache: Department[] | null = null;
  private departmentListeners: Set<(departments: Department[]) => void> = new Set();

  /**
   * اشتراك في تحديثات الأقسام الفورية
   */
  public subscribeDepartments(listener: (departments: Department[]) => void): () => void {
    this.departmentListeners.add(listener);
    if (this.departmentsCache) {
      try {
        listener(this.departmentsCache);
      } catch (err) {
        console.error('Error in department listener:', err);
      }
    } else {
      this.getDepartments().then((depts) => {
        try {
          listener(depts);
        } catch (err) {
          console.error('Error in department listener:', err);
        }
      });
    }
    return () => {
      this.departmentListeners.delete(listener);
    };
  }

  private notifyDepartmentListeners(departments: Department[]) {
    this.departmentListeners.forEach((listener) => {
      try {
        listener(departments);
      } catch (err) {
        console.error('Error in department listener callback:', err);
      }
    });
  }

  /**
   * استرجاع الأقسام والتشكيلات الإدارية مع دمج التلقائي للأقسام المسجلة
   */
  public async getDepartments(): Promise<Department[]> {
    if (this.departmentsCache && this.departmentsCache.length > 0) {
      return [...this.departmentsCache];
    }

    try {
      const stored = await getSystemSetting<Department[]>('master_departments_catalog', []);
      let result: Department[] = stored && stored.length > 0 ? [...stored] : [...DEFAULT_DEPARTMENTS];

      // Ensure every distinct department currently in employees list exists
      const emps = await this.getAll();
      const existingNames = new Set(result.map((d) => d.name.trim()));

      emps.forEach((emp) => {
        const empDept = emp.department?.trim();
        if (empDept && !existingNames.has(empDept)) {
          existingNames.add(empDept);
          result.push({
            id: `dept-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            name: empDept,
            code: empDept.slice(0, 3).toUpperCase(),
            color: 'slate',
            description: 'قسم مسجل عبر سجلات الموظفين',
            createdAt: new Date().toISOString(),
          });
        }
      });

      this.departmentsCache = result;
      return [...result];
    } catch {
      this.departmentsCache = [...DEFAULT_DEPARTMENTS];
      return [...DEFAULT_DEPARTMENTS];
    }
  }

  /**
   * حفظ قائمة الأقسام وتعميمها
   */
  public async saveDepartments(departments: Department[]): Promise<void> {
    this.departmentsCache = [...departments];
    await saveSystemSetting('master_departments_catalog', departments);
    try {
      localStorage.setItem('master_departments_catalog_backup', JSON.stringify(departments));
    } catch {}
    this.notifyDepartmentListeners(departments);
  }

  /**
   * إضافة قسم جديد
   */
  public async addDepartment(deptData: Omit<Department, 'id'>): Promise<Department> {
    const departments = await this.getDepartments();
    const cleanName = deptData.name.trim();

    if (!cleanName) {
      throw new Error('يرجى إدخال اسم القسم أو التشكيل');
    }

    const exists = departments.some((d) => d.name.trim().toLowerCase() === cleanName.toLowerCase());
    if (exists) {
      throw new Error(`القسم (${cleanName}) مسجل مسبقاً في المنظومة`);
    }

    const newDept: Department = {
      ...deptData,
      id: `dept-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      name: cleanName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedList = [...departments, newDept];
    await this.saveDepartments(updatedList);
    return newDept;
  }

  /**
   * تعديل قسم مع تحديث كافة الموظفين التابعين له تلقائياً في السجل الموحد
   */
  public async updateDepartment(
    id: string,
    updatedData: Partial<Department>
  ): Promise<{ department: Department; affectedEmployeesCount: number }> {
    const departments = await this.getDepartments();
    const targetIndex = departments.findIndex((d) => d.id === id);

    if (targetIndex === -1) {
      throw new Error('القسم غير موجود في السجل');
    }

    const oldDept = departments[targetIndex];
    const oldName = oldDept.name.trim();
    const newName = updatedData.name ? updatedData.name.trim() : oldName;

    // Check duplicate if name changed
    if (newName !== oldName) {
      const exists = departments.some((d) => d.id !== id && d.name.trim().toLowerCase() === newName.toLowerCase());
      if (exists) {
        throw new Error(`يوجد قسم آخر يحمل نفس الاسم (${newName})`);
      }
    }

    const updatedDept: Department = {
      ...oldDept,
      ...updatedData,
      name: newName,
      updatedAt: new Date().toISOString(),
    };

    departments[targetIndex] = updatedDept;
    await this.saveDepartments(departments);

    let affectedCount = 0;
    // If the department name changed, cascade update to all employees who belong to oldName
    if (newName !== oldName) {
      const allEmps = await this.getAll();
      const updatedEmps = allEmps.map((emp) => {
        if (emp.department?.trim() === oldName) {
          affectedCount++;
          return {
            ...emp,
            department: newName,
            updatedAt: new Date().toISOString(),
          };
        }
        return emp;
      });

      if (affectedCount > 0) {
        await dbSaveEmployeesBatch(updatedEmps);
        this.memoryCache = updatedEmps;
        this.notifyListeners(updatedEmps, undefined, 'department_name_cascade_update');
      }
    }

    return { department: updatedDept, affectedEmployeesCount: affectedCount };
  }

  /**
   * حذف قسم وإعادة توجيه / نقل الموظفين التابعين له لقسم بديل
   */
  public async deleteDepartment(
    id: string,
    transferToDepartmentName?: string
  ): Promise<{ affectedEmployeesCount: number }> {
    const departments = await this.getDepartments();
    const targetDept = departments.find((d) => d.id === id);

    if (!targetDept) {
      throw new Error('القسم غير موجود');
    }

    const deptName = targetDept.name.trim();
    const allEmps = await this.getAll();
    const affectedEmployees = allEmps.filter((e) => e.department?.trim() === deptName);

    if (affectedEmployees.length > 0 && !transferToDepartmentName) {
      throw new Error(
        `لا يمكن حذف القسم (${deptName}) لوجود (${affectedEmployees.length}) موظف مسجلين فيه. يرجى اختيار قسم بديل لنقل الموظفين إليه.`
      );
    }

    let affectedCount = 0;
    if (affectedEmployees.length > 0 && transferToDepartmentName) {
      const targetTransfer = transferToDepartmentName.trim();
      const updatedEmps = allEmps.map((emp) => {
        if (emp.department?.trim() === deptName) {
          affectedCount++;
          return {
            ...emp,
            department: targetTransfer,
            updatedAt: new Date().toISOString(),
          };
        }
        return emp;
      });

      await dbSaveEmployeesBatch(updatedEmps);
      this.memoryCache = updatedEmps;
      this.notifyListeners(updatedEmps, undefined, 'department_deleted_transfer');
    }

    const filtered = departments.filter((d) => d.id !== id);
    await this.saveDepartments(filtered);

    return { affectedEmployeesCount: affectedCount };
  }

  /**
   * نقل مجموعة موظفين دفعة واحدة إلى قسم معين
   */
  public async transferEmployeesToDepartment(
    employeeIds: string[],
    targetDepartmentName: string,
    notes?: string,
    performer: string = 'مدير النظام'
  ): Promise<{ updatedCount: number }> {
    const cleanTarget = targetDepartmentName.trim();
    if (!cleanTarget) throw new Error('يرجى تحديد القسم المراد النقل إليه');

    const allEmps = await this.getAll();
    const idsSet = new Set(employeeIds);
    let updatedCount = 0;
    const auditEvents: CareerTimelineEvent[] = [];

    const updatedEmps = allEmps.map((emp) => {
      if (idsSet.has(emp.id) && emp.department !== cleanTarget) {
        updatedCount++;
        auditEvents.push({
          id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          employeeId: emp.id,
          employeeName: emp.fullName,
          employeeNumber: emp.employeeNumber,
          department: cleanTarget,
          date: new Date().toISOString().slice(0, 10),
          title: 'نقل / تغيير القسم الإداري',
          category: 'department_change',
          oldValue: emp.department || 'غير محدد',
          newValue: cleanTarget,
          description: `تم نقل الموظف من قسم (${emp.department || 'غير محدد'}) إلى قسم (${cleanTarget})${notes ? ` - ملاحظات: ${notes}` : ''}.`,
          performedBy: performer,
          createdAt: new Date().toISOString(),
        });
        return {
          ...emp,
          department: cleanTarget,
          notes: notes ? `${emp.notes ? emp.notes + ' | ' : ''}${notes}` : emp.notes,
          updatedAt: new Date().toISOString(),
        };
      }
      return emp;
    });

    if (updatedCount > 0) {
      await dbSaveEmployeesBatch(updatedEmps);
      await Promise.all(auditEvents.map((evt) => this.logTimelineEvent(evt)));
      this.memoryCache = updatedEmps;
      this.notifyListeners(updatedEmps, undefined, 'bulk_department_transfer');
    }

    return { updatedCount };
  }
}

// Export Singleton Instance
export const employeeService = new EmployeeService();
