import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  X,
  AlertCircle,
  HelpCircle,
  Briefcase,
  Layers,
  UserCheck,
  FileText,
  Check,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Employee, ContractType } from '../types';
import { saveEmployeesBatch } from '../db/indexedDB';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (count: number) => void;
  existingEmployees: Employee[];
}

interface ParsedEmployeeRow {
  index: number;
  data?: Employee;
  raw: Record<string, any>;
  isValid: boolean;
  errors: string[];
}

export type EmploymentTypeOverride = 'auto' | 'permanent' | 'contract';

export function CsvImportModal({
  isOpen,
  onClose,
  onImportSuccess,
  existingEmployees,
}: CsvImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [parseError, setParseError] = useState<string | null>(null);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedEmployeeRow[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'valid' | 'errors'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 35;
  const [isDragging, setIsDragging] = useState(false);
  const [sheetName, setSheetName] = useState<string | null>(null);

  // Employment Type selector: auto (from file), permanent, or contract
  const [employmentTypeOverride, setEmploymentTypeOverride] =
    useState<EmploymentTypeOverride>('auto');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Normalization helper for header keys
  const normalizeStr = (str: string): string => {
    return (str || '').trim().toLowerCase().replace(/[\s_\-–—./\\]+/g, '');
  };

  // Pre-indexes columns once per sheet to eliminate expensive nested loops
  const buildColumnResolver = (sampleRow: Record<string, any>) => {
    const rawKeys = Object.keys(sampleRow || {});
    const map = new Map<string, string>();
    for (const key of rawKeys) {
      map.set(normalizeStr(key), key);
    }

    return (row: Record<string, any>, aliases: string[]): string => {
      if (!row) return '';
      // 1. Direct or normalized exact match
      for (const alias of aliases) {
        if (row[alias] !== undefined && row[alias] !== null) {
          const val = String(row[alias]).trim();
          if (val) return val;
        }
        const normAlias = normalizeStr(alias);
        const actualKey = map.get(normAlias);
        if (actualKey && row[actualKey] !== undefined && row[actualKey] !== null) {
          const val = String(row[actualKey]).trim();
          if (val) return val;
        }
      }
      // 2. Partial substring search (only if exact match not found)
      for (const alias of aliases) {
        const normAlias = normalizeStr(alias);
        if (!normAlias) continue;
        for (const [normKey, actualKey] of map.entries()) {
          if (normKey.includes(normAlias) || normAlias.includes(normKey)) {
            const val = row[actualKey];
            if (val !== undefined && val !== null) {
              const strVal = String(val).trim();
              if (strVal) return strVal;
            }
          }
        }
      }
      return '';
    };
  };

  // Date parsing helper with support for Excel serial dates, standard ISO, and Arabic/Gregorian formats
  const parseHireDate = (rawDate: any): string => {
    if (!rawDate) return new Date().toISOString().split('T')[0];
    if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
      return rawDate.toISOString().split('T')[0];
    }
    // Check if numeric serial (Excel date serial number e.g. 44927)
    if (typeof rawDate === 'number' && rawDate > 20000 && rawDate < 60000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const dateObj = new Date(excelEpoch.getTime() + rawDate * 86400000);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().split('T')[0];
      }
    }
    const str = String(rawDate).trim();
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str)) {
      return str.replace(/\//g, '-');
    }
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(str)) {
      const parts = str.split(/[-/]/);
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return new Date().toISOString().split('T')[0];
  };

  // Fast and lenient Name Extractor: accepts any name format (quadruple, triple, double, single)
  const extractFullNameFast = (
    row: Record<string, any>,
    resolveCol: (row: Record<string, any>, aliases: string[]) => string,
    idx: number
  ): string => {
    // 1. Direct standard aliases
    const aliasMatch = resolveCol(row, [
      'الاسم الرباعي',
      'الاسم الثلاثي',
      'الاسم الكامل',
      'اسم الموظف',
      'اسم الشخص',
      'اسم المنتسب',
      'الاسم',
      'اسم',
      'الموظف',
      'المنتسب',
      'الأسماء',
      'الاسماء',
      'الموظفين',
      'اسم_الموظف',
      'fullname',
      'full name',
      'employee name',
      'emp name',
      'name',
      'employee',
    ]);
    if (aliasMatch && aliasMatch.length > 0) {
      return aliasMatch;
    }

    // 2. Check if any key in row contains 'اسم' or 'name' or 'منتسب'
    for (const [key, val] of Object.entries(row)) {
      if (val === undefined || val === null) continue;
      const str = String(val).trim();
      if (!str) continue;
      const normKey = normalizeStr(key);
      if (normKey.includes('اسم') || normKey.includes('name') || normKey.includes('منتسب')) {
        return str;
      }
    }

    // 3. Scan row values for any non-numeric string with Arabic or Latin letters
    for (const [key, val] of Object.entries(row)) {
      if (val === undefined || val === null) continue;
      const str = String(val).trim();
      if (!str || /^[\d\-+./\s()]+$/.test(str)) continue;

      const normKey = normalizeStr(key);
      const isOtherField =
        normKey.includes('قسم') ||
        normKey.includes('شعبة') ||
        normKey.includes('ملاحظ') ||
        normKey.includes('هاتف') ||
        normKey.includes('dept') ||
        normKey.includes('phone') ||
        normKey.includes('notes');

      if (!isOtherField && /[\u0600-\u06FFa-zA-Z]/.test(str)) {
        return str;
      }
    }

    // 4. Fallback to any non-numeric value in the row
    for (const val of Object.values(row)) {
      if (val !== undefined && val !== null) {
        const str = String(val).trim();
        if (str && !/^[\d\-+./\s()]+$/.test(str)) {
          return str;
        }
      }
    }

    // 5. Ultimate fallback: never let row fail
    return `موظف جديد (${idx + 1})`;
  };

  // 100% Lenient & O(1) row evaluation: zero freezing, zero unbounded loops
  const evaluateRows = (
    rows: Record<string, any>[],
    overrideMode: EmploymentTypeOverride
  ): ParsedEmployeeRow[] => {
    try {
      const seenNumbersInFile = new Set<string>();
      const existingNumbers = new Set(existingEmployees.map((e) => e.employeeNumber.trim()));
      const timestampBase = Date.now() % 100000;

      // Filter out completely empty rows
      const validRawRows = rows.filter((row) =>
        Object.values(row).some(
          (val) => val !== undefined && val !== null && String(val).trim().length > 0
        )
      );

      if (validRawRows.length === 0) return [];

      // Build header column index ONCE from the first non-empty row
      const resolveCol = buildColumnResolver(validRawRows[0]);

      return validRawRows.map((row, idx) => {
        // 1. Extract name with 100% fallback handling
        const fullName = extractFullNameFast(row, resolveCol, idx);

        // 2. Extract or auto-generate unique Employee Number silently
        const empNumRaw = resolveCol(row, [
          'الرقم الوظيفي',
          'رقم الموظف',
          'كود الموظف',
          'الرقم',
          'employeenumber',
          'empnumber',
          'code',
          'id',
        ]);

        let employeeNumber = empNumRaw;
        if (!employeeNumber) {
          employeeNumber = `IQ-GOV-${timestampBase}-${String(idx + 1).padStart(4, '0')}`;
          if (seenNumbersInFile.has(employeeNumber) || existingNumbers.has(employeeNumber)) {
            employeeNumber = `IQ-GOV-${timestampBase}-${String(idx + 1).padStart(4, '0')}-${idx + 1}`;
          }
        } else {
          if (seenNumbersInFile.has(employeeNumber) || existingNumbers.has(employeeNumber)) {
            employeeNumber = `${employeeNumber}-${idx + 1}`;
          }
        }
        seenNumbersInFile.add(employeeNumber);

        // 3. Extract or default Department & Division silently
        const department =
          resolveCol(row, [
            'القسم',
            'التشكيل',
            'الدائرة',
            'الجهة',
            'department',
            'dept',
          ]) || 'القسم الإداري العام';

        const division =
          resolveCol(row, ['الشعبة', 'الوحدة', 'division', 'unit']) || 'الديوان العام';

        const jobTitle =
          resolveCol(row, [
            'العنوان الوظيفي',
            'الوظيفة',
            'المسمى الوظيفي',
            'الدرجة',
            'jobtitle',
            'title',
          ]) || 'موظف';

        // 4. Contract Type determination
        const contractTypeRaw = resolveCol(row, [
          'نوع الملاك',
          'نوع التوظيف',
          'الصفة',
          'الحالة الوظيفية',
          'contracttype',
          'type',
        ]);

        let contractType: ContractType = 'permanent';
        if (overrideMode === 'permanent') {
          contractType = 'permanent';
        } else if (overrideMode === 'contract') {
          contractType = 'contract';
        } else {
          if (
            contractTypeRaw.includes('عقد') ||
            contractTypeRaw.toLowerCase().includes('contract') ||
            contractTypeRaw.includes('315')
          ) {
            contractType = 'contract';
          } else {
            contractType = 'permanent';
          }
        }

        // 5. Hire Date & Balances with instant defaults
        const rawHireDate = resolveCol(row, [
          'تاريخ المباشرة',
          'تاريخ التعيين',
          'المباشرة',
          'hiredate',
          'date',
        ]);
        const hireDate = parseHireDate(rawHireDate);

        const defaultLimit = contractType === 'permanent' ? 36 : 30;
        const defaultMonthly = contractType === 'permanent' ? 3 : 4;
        const isAccumulative = contractType === 'permanent';

        const annualLimitRaw = resolveCol(row, [
          'رصيد الإجازات',
          'الرصيد السنوي',
          'الرصيد',
          'annuallimit',
          'balance',
        ]);
        const usedBalanceRaw = resolveCol(row, [
          'المستهلك',
          'الرصيد المستهلك',
          'المستنفذ',
          'usedbalance',
          'used',
        ]);

        const annualBalanceLimit =
          Number(annualLimitRaw) > 0 ? Number(annualLimitRaw) : defaultLimit;
        const usedBalance = Number(usedBalanceRaw) >= 0 ? Number(usedBalanceRaw) : 0;
        const remainingBalance = Math.max(0, annualBalanceLimit - usedBalance);

        const phone =
          resolveCol(row, ['الهاتف', 'رقم الهاتف', 'الموبايل', 'phone', 'mobile']) || '';
        const notes =
          resolveCol(row, ['ملاحظات', 'notes', 'remarks']) || 'مستورد عبر ملف إكسل';

        const employee: Employee = {
          id: `EMP-${Date.now()}-${idx + 1}-${Math.random().toString(36).substring(2, 6)}`,
          employeeNumber,
          fullName,
          department,
          division,
          jobTitle,
          contractType,
          hireDate,
          annualBalanceLimit,
          usedBalance,
          remainingBalance,
          monthlyRate: defaultMonthly,
          isAccumulative,
          phone,
          notes:
            overrideMode !== 'auto'
              ? `${notes} - تم تحديد ${contractType === 'permanent' ? 'ملاك دائم' : 'عقد وزاري'} أثناء الاستيراد`
              : notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        return {
          index: idx + 1,
          data: employee,
          raw: row,
          isValid: true,
          errors: [],
        };
      });
    } catch (err) {
      console.error('Safe evaluation error:', err);
      return [];
    }
  };

  // Safe file reader with timeout protection and non-blocking asynchronous yielding
  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setParseError(null);
    setParsedRows([]);
    setRawRows([]);
    setIsParsing(true);
    setSheetName(null);
    setCurrentPage(1);

    // Yield to the browser event loop so React can render the loading state
    await new Promise((resolve) => setTimeout(resolve, 30));

    const fileNameLower = selectedFile.name.toLowerCase();
    const isExcel =
      fileNameLower.endsWith('.xlsx') ||
      fileNameLower.endsWith('.xls') ||
      fileNameLower.endsWith('.xlsm') ||
      fileNameLower.endsWith('.xlsb');

    // 12-second safety timeout promise to prevent any hanging
    let timeoutId: any;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new Error(
            'استغرقت قراءة الملف وقتاً أطول من المعتاد. يرجى التأكد من سلامة تنسيق الملف وإعادة المحاولة.'
          )
        );
      }, 12000);
    });

    try {
      if (isExcel) {
        const parseExcel = async (): Promise<Record<string, any>[]> => {
          const arrayBuffer = await selectedFile.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, {
            type: 'array',
            cellDates: true,
            dateNF: 'yyyy-mm-dd',
          });

          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('ملف الإكسل فارغ ولا يحتوي على أي ورقة عمل.');
          }

          const firstSheetName = workbook.SheetNames[0];
          setSheetName(firstSheetName);
          const worksheet = workbook.Sheets[firstSheetName];

          // 1. Read sheet as 2D array of rows to reliably detect header position
          const raw2D: any[][] = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
            raw: false,
          });

          if (!raw2D || raw2D.length === 0) {
            throw new Error(`ورقة العمل الأولى (${firstSheetName}) فارغة ولا تحتوي على بيانات.`);
          }

          // 2. Scan the first 8 rows to detect header row if headers start after titles or blank lines
          let headerRowIdx = -1;
          for (let r = 0; r < Math.min(raw2D.length, 8); r++) {
            const row = raw2D[r] || [];
            const rowText = row
              .map((cell: any) => normalizeStr(String(cell || '')))
              .join(' ');

            if (
              rowText.includes('اسم') ||
              rowText.includes('name') ||
              rowText.includes('موظف') ||
              rowText.includes('منتسب') ||
              rowText.includes('رقم') ||
              rowText.includes('قسم') ||
              rowText.includes('dept')
            ) {
              headerRowIdx = r;
              break;
            }
          }

          if (headerRowIdx >= 0) {
            const headerRow = (raw2D[headerRowIdx] || []).map((h: any, cIdx: number) => {
              const str = String(h || '').trim();
              return str || `عمود_${cIdx + 1}`;
            });

            const dataRows: Record<string, any>[] = [];
            for (let r = headerRowIdx + 1; r < raw2D.length; r++) {
              const row = raw2D[r] || [];
              const hasData = row.some((cell: any) => String(cell || '').trim().length > 0);
              if (!hasData) continue;

              const obj: Record<string, any> = {};
              headerRow.forEach((colName: string, cIdx: number) => {
                obj[colName] = row[cIdx] !== undefined ? String(row[cIdx]).trim() : '';
              });
              dataRows.push(obj);
            }

            if (dataRows.length > 0) {
              return dataRows;
            }
          }

          // 3. Fallback to standard sheet_to_json
          const standardData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
            defval: '',
            raw: false,
          });

          if (standardData.length > 0) {
            return standardData;
          }

          // 4. Raw fallback: treat first column of every non-empty row as name
          const fallbackRows: Record<string, any>[] = [];
          for (let r = 0; r < raw2D.length; r++) {
            const row = raw2D[r] || [];
            const hasData = row.some((cell: any) => String(cell || '').trim().length > 0);
            if (!hasData) continue;

            const obj: Record<string, any> = {};
            row.forEach((cell: any, cIdx: number) => {
              obj[cIdx === 0 ? 'الاسم الرباعي' : `عمود_${cIdx + 1}`] = String(cell || '').trim();
            });
            fallbackRows.push(obj);
          }

          if (fallbackRows.length === 0) {
            throw new Error(`ورقة العمل (${firstSheetName}) لا تحتوي على صفوف صالحة.`);
          }

          return fallbackRows;
        };

        const data = await Promise.race([parseExcel(), timeoutPromise]);
        clearTimeout(timeoutId);

        setRawRows(data);
        const evaluated = evaluateRows(data, employmentTypeOverride);
        setParsedRows(evaluated);
        setIsParsing(false);
      } else {
        // Parse CSV with PapaParse in a Promise with timeout
        const parseCsv = new Promise<Record<string, any>[]>((resolve, reject) => {
          Papa.parse<any[]>(selectedFile, {
            header: false,
            skipEmptyLines: 'greedy',
            encoding: 'UTF-8',
            complete: (results) => {
              const raw2D = results.data;
              if (!raw2D || raw2D.length === 0) {
                reject(new Error('ملف CSV فارغ ولا يحتوي على بيانات.'));
                return;
              }

              // Search for header row in the first 8 rows
              let headerRowIdx = -1;
              for (let r = 0; r < Math.min(raw2D.length, 8); r++) {
                const row = raw2D[r] || [];
                const rowText = row
                  .map((c: any) => normalizeStr(String(c || '')))
                  .join(' ');

                if (
                  rowText.includes('اسم') ||
                  rowText.includes('name') ||
                  rowText.includes('موظف') ||
                  rowText.includes('منتسب') ||
                  rowText.includes('رقم') ||
                  rowText.includes('قسم')
                ) {
                  headerRowIdx = r;
                  break;
                }
              }

              if (headerRowIdx >= 0) {
                const headerRow = (raw2D[headerRowIdx] || []).map((h: any, cIdx: number) => {
                  const str = String(h || '').trim();
                  return str || `عمود_${cIdx + 1}`;
                });
                const dataRows: Record<string, any>[] = [];
                for (let r = headerRowIdx + 1; r < raw2D.length; r++) {
                  const row = raw2D[r] || [];
                  const hasData = row.some((cell: any) => String(cell || '').trim().length > 0);
                  if (!hasData) continue;
                  const obj: Record<string, any> = {};
                  headerRow.forEach((colName: string, cIdx: number) => {
                    obj[colName] = row[cIdx] !== undefined ? String(row[cIdx]).trim() : '';
                  });
                  dataRows.push(obj);
                }
                if (dataRows.length > 0) {
                  resolve(dataRows);
                  return;
                }
              }

              // Fallback: row 0 or indexed
              const dataRows: Record<string, any>[] = [];
              const startIndex = raw2D.length > 1 ? 1 : 0;
              const headerRow = (raw2D[0] || []).map(
                (h: any, i: number) =>
                  String(h || '').trim() || (i === 0 ? 'الاسم الرباعي' : `عمود_${i + 1}`)
              );

              for (let r = startIndex; r < raw2D.length; r++) {
                const row = raw2D[r] || [];
                const hasData = row.some((cell: any) => String(cell || '').trim().length > 0);
                if (!hasData) continue;
                const obj: Record<string, any> = {};
                row.forEach((cell: any, cIdx: number) => {
                  const colName = headerRow[cIdx] || (cIdx === 0 ? 'الاسم الرباعي' : `عمود_${cIdx + 1}`);
                  obj[colName] = String(cell || '').trim();
                });
                dataRows.push(obj);
              }

              if (dataRows.length > 0) {
                resolve(dataRows);
              } else {
                reject(new Error('الملف لا يحتوي على صفوف صالحة.'));
              }
            },
            error: (err) => reject(err),
          });
        });

        const data = await Promise.race([parseCsv, timeoutPromise]);
        clearTimeout(timeoutId);

        setRawRows(data);
        const evaluated = evaluateRows(data, employmentTypeOverride);
        setParsedRows(evaluated);
        setIsParsing(false);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      setIsParsing(false);
      console.error('Error parsing file:', err);
      setParseError(err.message || 'حدث خطأ أثناء قراءة الملف. تأكد من أن الملف ليس تالفاً.');
    }
  };

  // Re-evaluate rows when employment type override changes smoothly
  const handleEmploymentTypeChange = (newOverride: EmploymentTypeOverride) => {
    setEmploymentTypeOverride(newOverride);
    if (rawRows.length > 0) {
      const reEvaluated = evaluateRows(rawRows, newOverride);
      setParsedRows(reEvaluated);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      const name = droppedFile.name.toLowerCase();
      if (
        name.endsWith('.xlsx') ||
        name.endsWith('.xls') ||
        name.endsWith('.csv') ||
        droppedFile.type.includes('sheet') ||
        droppedFile.type.includes('excel') ||
        droppedFile.type === 'text/csv'
      ) {
        handleFileSelect(droppedFile);
      } else {
        setParseError('يرجى اختيار ملف بصيغة Excel (.xlsx / .xls) أو ملف CSV.');
      }
    }
  };

  // Download official Excel template (.xlsx)
  const handleDownloadExcelTemplate = () => {
    const wb = XLSX.utils.book_new();
    const sampleData = [
      {
        'الرقم الوظيفي': 'IQ-GOV-98301',
        'الاسم الرباعي': 'حسين علي رضا العبادي',
        'القسم': 'قسم الموارد البشرية',
        'الشعبة': 'شعبة شؤون الموظفين',
        'العنوان الوظيفي': 'مدير شعبة / ملاحظ إداري',
        'نوع الملاك': 'ملاك دائم',
        'تاريخ المباشرة': '2020-04-01',
        'رصيد الإجازات السنوي': 36,
        'المستهلك': 2,
        'الهاتف': '07801112233',
        'ملاحظات': 'سجل رسمي معتمد',
      },
      {
        'الرقم الوظيفي': 'IQ-GOV-98302',
        'الاسم الرباعي': 'فاطمة جاسم محمد الزبيدي',
        'القسم': 'قسم الشؤون المالية',
        'الشعبة': 'شعبة الحسابات والرواتب',
        'العنوان الوظيفي': 'محاسب أقدم',
        'نوع الملاك': 'عقد وزاري',
        'تاريخ المباشرة': '2023-08-15',
        'رصيد الإجازات السنوي': 30,
        'المستهلك': 5,
        'الهاتف': '07704445566',
        'ملاحظات': 'عقد وفق القرار 315',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws['!cols'] = [
      { wch: 16 },
      { wch: 26 },
      { wch: 22 },
      { wch: 24 },
      { wch: 24 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
      { wch: 12 },
      { wch: 16 },
      { wch: 24 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'سجل_الموظفين');
    XLSX.writeFile(wb, 'قالب_استيراد_الموظفين_2026.xlsx');
  };

  // Download official CSV template
  const handleDownloadCsvTemplate = () => {
    const csvContent =
      '\uFEFF' +
      'الرقم الوظيفي,الاسم الرباعي,القسم,الشعبة,العنوان الوظيفي,نوع الملاك,تاريخ المباشرة,رصيد الإجازات السنوي,المستهلك,الهاتف,ملاحظات\n' +
      'IQ-GOV-98301,حسين علي رضا العبادي,قسم الموارد البشرية,شعبة الحضور,مدير شعبة,ملاك دائم,2020-04-01,36,2,07801112233,سجل رسمي\n' +
      'IQ-GOV-98302,فاطمة جاسم محمد الزبيدي,قسم الشؤون المالية,شعبة الحسابات,محاسب أقدم,عقد وزاري,2023-08-15,30,5,07704445566,قرار 315';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'قالب_استيراد_الموظفين_2026.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Execute ultra-safe, non-freezing import of valid rows to IndexedDB
  const handleConfirmImport = async () => {
    // 1. Collect all employees to save
    let employeesToSave = parsedRows
      .filter((r) => r.isValid && r.data)
      .map((r) => r.data as Employee);

    if (employeesToSave.length === 0 && parsedRows.length > 0) {
      employeesToSave = parsedRows.filter((r) => r.data).map((r) => r.data as Employee);
    }

    if (employeesToSave.length === 0 && rawRows.length > 0) {
      const fallbackEvaluated = evaluateRows(rawRows, employmentTypeOverride);
      employeesToSave = fallbackEvaluated
        .filter((r) => r.data)
        .map((r) => r.data as Employee);
    }

    if (employeesToSave.length === 0) {
      setParseError('لم يتم العثور على أي سجلات موظفين في الملف المرفوع.');
      return;
    }

    setIsSaving(true);
    setParseError(null);
    setSaveProgress({ current: 0, total: employeesToSave.length });

    // Yield to the browser so the button spinner animates immediately
    await new Promise((resolve) => setTimeout(resolve, 30));

    // Safety timeout promise (8 seconds) to prevent any UI freezing
    let safetyTimeout: any;
    const timeoutPromise = new Promise<never>((_, reject) => {
      safetyTimeout = setTimeout(() => {
        reject(
          new Error(
            'انتهت مهلة حفظ السجلات في قاعدة البيانات المحلية. تم إيقاف العملية لمنع تجميد الشاشة.'
          )
        );
      }, 8500);
    });

    try {
      const performSave = async (): Promise<number> => {
        const BATCH_SIZE = 250;
        let totalSaved = 0;

        for (let i = 0; i < employeesToSave.length; i += BATCH_SIZE) {
          const chunk = employeesToSave.slice(i, i + BATCH_SIZE);
          try {
            const savedInBatch = await saveEmployeesBatch(chunk);
            totalSaved += savedInBatch;
          } catch (batchErr) {
            console.warn('Batch save error, falling back to individual items:', batchErr);
            // Fallback: save one by one so valid records are kept
            for (const emp of chunk) {
              try {
                await saveEmployeesBatch([emp]);
                totalSaved++;
              } catch (singleErr) {
                console.warn('Skipped record in fallback:', emp.employeeNumber, singleErr);
              }
            }
          }
          setSaveProgress({ current: totalSaved, total: employeesToSave.length });
          // Yield to browser event loop
          await new Promise((resolve) => setTimeout(resolve, 15));
        }

        return totalSaved;
      };

      const finalCount = await Promise.race([performSave(), timeoutPromise]);
      clearTimeout(safetyTimeout);

      if (finalCount > 0) {
        try {
          onImportSuccess(finalCount);
        } catch (cbErr) {
          console.error('onImportSuccess callback error:', cbErr);
        }
        onClose();
      } else {
        setParseError('لم يتم حفظ أي سجل. يرجى مراجعة محتوى الملف والمحاولة مرة أخرى.');
      }
    } catch (err: unknown) {
      clearTimeout(safetyTimeout);
      console.error('Import save error:', err);
      const errorMsg = err instanceof Error ? err.message : 'خطأ غير متوقع';
      setParseError(`فشل حفظ السجلات في قاعدة البيانات المحلية (IndexedDB): ${errorMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const validRows = parsedRows.filter((r) => r.isValid);
  const errorRows = parsedRows.filter((r) => !r.isValid);

  const displayedRows =
    activeTab === 'valid'
      ? validRows
      : activeTab === 'errors'
      ? errorRows
      : parsedRows;

  // Lightweight pagination for preview table to eliminate DOM lag
  const totalPages = Math.max(1, Math.ceil(displayedRows.length / PAGE_SIZE));
  const currentDisplayedRows = displayedRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving && !isParsing) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>استيراد سجلات الموظفين من ملف Excel أو CSV</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-semibold">
                  معالجة آمنة وسريعة
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                استيراد مرن بنسبة 100%: اعتماد الاسم فقط وتوليد الأرقام الإدارية والأقسام تلقائياً وحفظها في IndexedDB
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Section 1: Employment Type Selector */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  محدد نوع التوظيف للقائمة المستوردة:
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                تطبيق صفة التوظيف تلقائياً على كافة سجلات الملف
              </span>
            </div>

            {/* Selection Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Option 1: Auto detect from file */}
              <button
                type="button"
                onClick={() => handleEmploymentTypeChange('auto')}
                className={`p-3 rounded-xl border text-right transition-all flex items-start gap-2.5 cursor-pointer ${
                  employmentTypeOverride === 'auto'
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    employmentTypeOverride === 'auto'
                      ? 'bg-indigo-600 text-white'
                      : 'border border-slate-300 dark:border-slate-600 text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    <span>تلقائي من الملف</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    وفق عمود نوع الملاك أو الصفة في الملف
                  </div>
                </div>
              </button>

              {/* Option 2: Permanent Staff */}
              <button
                type="button"
                onClick={() => handleEmploymentTypeChange('permanent')}
                className={`p-3 rounded-xl border text-right transition-all flex items-start gap-2.5 cursor-pointer ${
                  employmentTypeOverride === 'permanent'
                    ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    employmentTypeOverride === 'permanent'
                      ? 'bg-amber-600 text-white'
                      : 'border border-slate-300 dark:border-slate-600 text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>ملاك دائم (Permanent)</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    رصيد 36 يوماً، معدل 3/شهر، تراكمي
                  </div>
                </div>
              </button>

              {/* Option 3: Ministerial Contracts */}
              <button
                type="button"
                onClick={() => handleEmploymentTypeChange('contract')}
                className={`p-3 rounded-xl border text-right transition-all flex items-start gap-2.5 cursor-pointer ${
                  employmentTypeOverride === 'contract'
                    ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    employmentTypeOverride === 'contract'
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 dark:border-slate-600 text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                    <span>عقود وزارية (قرار 315)</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    رصيد 30 يوماً، معدل 4/شهر، غير تراكمي
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Templates Download Banner */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
              <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                هل ترغب بنموذج جاهز؟ يمكنك تنزيل القالب الرسمي المتوافق مع الترميز العراقي والعربي.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadExcelTemplate}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                title="تحميل قالب Microsoft Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>قالب Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadCsvTemplate}
                className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="تحميل قالب CSV (UTF-8)"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>قالب CSV</span>
              </button>
            </div>
          </div>

          {/* Section 3: Upload Drag & Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !isParsing && !isSaving && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-6 text-center transition-all ${
              isParsing || isSaving ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
            } ${
              isDragging
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500/60 bg-slate-50/50 dark:bg-slate-800/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              disabled={isParsing || isSaving}
              accept=".xlsx,.xls,.xlsm,.xlsb,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 shadow-xs">
              {isParsing ? (
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              ) : (
                <UploadCloud className="w-6 h-6" />
              )}
            </div>

            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {isParsing ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  جارٍ فحص وتحليل الملف بسرعة وأمان...
                </span>
              ) : file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>{file.name}</span>
                  {sheetName && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-mono">
                      ورقة: {sheetName}
                    </span>
                  )}
                </div>
              ) : (
                'اسحب وأفلت ملف Excel (.xlsx, .xls) أو CSV هنا، أو انقر للاختيار'
              )}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              يدعم ملفات Microsoft Excel (.xlsx, .xls) و Google Sheets وجداول CSV بترميز UTF-8
            </p>
          </div>

          {/* Loading Indicator */}
          {isParsing && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-3 shadow-xs">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold">جارٍ معالجة بيانات الموظفين...</div>
                <div className="text-[11px] opacity-80">
                  يتم الآن استخراج الأسماء وضبط الأرصدة وتوليد الأرقام الوظيفية بسلاسة دون تجميد.
                </div>
              </div>
            </div>
          )}

          {/* Parse Errors */}
          {parseError && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold">ملاحظة حول الملف:</div>
                <div>{parseError}</div>
              </div>
            </div>
          )}

          {/* Section 4: Evaluation Results & Summary */}
          {parsedRows.length > 0 && (
            <div className="space-y-4">
              {/* Summary Badges & Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    إجمالي الصفوف: {parsedRows.length}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    جاهزة للاستيراد: {validRows.length}
                  </span>
                  {errorRows.length > 0 && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        تحتوي أخطاء: {errorRows.length}
                      </span>
                    </>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('all');
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      activeTab === 'all'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    الكل ({parsedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('valid');
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      activeTab === 'valid'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    الصالحة ({validRows.length})
                  </button>
                  {errorRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('errors');
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                        activeTab === 'errors'
                          ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      الأخطاء ({errorRows.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Preview Table (Fast Paginated Rendering) */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 sticky top-0 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">الحالة</th>
                        <th className="p-2.5">الرقم الوظيفي</th>
                        <th className="p-2.5">اسم الموظف</th>
                        <th className="p-2.5">القسم</th>
                        <th className="p-2.5">نوع الملاك</th>
                        <th className="p-2.5">الرصيد المحسوب</th>
                        <th className="p-2.5">تفاصيل التدقيق</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {currentDisplayedRows.map((row) => (
                        <tr
                          key={row.index}
                          className={
                            row.isValid
                              ? 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                              : 'bg-rose-50/50 dark:bg-rose-950/20'
                          }
                        >
                          <td className="p-2.5 font-mono text-slate-400">{row.index}</td>
                          <td className="p-2.5">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="w-3 h-3" />
                                صالح للاستيراد
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                                <AlertTriangle className="w-3 h-3" />
                                خطأ
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-mono font-semibold text-slate-800 dark:text-slate-200">
                            <div className="flex items-center gap-1">
                              <span>{row.data?.employeeNumber || '—'}</span>
                              {row.data?.employeeNumber.startsWith('IQ-GOV-') && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50">
                                  تلقائي
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                            {row.data?.fullName || '—'}
                          </td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-300">
                            {row.data?.department || '—'}
                          </td>
                          <td className="p-2.5">
                            {row.data?.contractType === 'permanent' ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                ملاك دائم
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                عقد وزاري (315)
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-mono text-slate-700 dark:text-slate-300">
                            {row.data ? `${row.data.remainingBalance} / ${row.data.annualBalanceLimit} يوم` : '—'}
                          </td>
                          <td className="p-2.5">
                            {row.isValid ? (
                              <span className="text-emerald-600 dark:text-emerald-400 text-[11px] flex items-center gap-1 font-medium">
                                <Check className="w-3 h-3" />
                                جاهز للحفظ فوراً
                              </span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400 text-[11px] font-semibold">
                                {row.errors.join('، ')}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {displayedRows.length > PAGE_SIZE && (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <div>
                      عرض الصفحة <span className="font-bold text-slate-900 dark:text-white">{currentPage}</span> من <span className="font-bold text-slate-900 dark:text-white">{totalPages}</span> (إجمالي {displayedRows.length} سجل)
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span>السابق</span>
                      </button>
                      <button
                        type="button"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>التالي</span>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors cursor-pointer disabled:opacity-50"
          >
            إلغاء
          </button>

          <button
            type="button"
            id="confirm-import-excel-btn"
            disabled={validRows.length === 0 || isSaving}
            onClick={handleConfirmImport}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>
                  جارٍ تخزين السجلات في IndexedDB ({saveProgress.current} / {saveProgress.total})...
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  حفظ السجلات الصالحة ({validRows.length}) مباشرة في IndexedDB
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
