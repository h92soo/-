import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FolderOpen,
  FileText,
  Search,
  Upload,
  Camera,
  Printer,
  Sparkles,
  CreditCard,
  PenTool,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Users,
  Building2,
  HardDrive,
  RefreshCw,
  Plus,
  Eye,
  Trash2,
  Calendar,
  Layers,
  ShieldCheck,
  Tag,
  Home,
  QrCode,
  FileCheck,
  Sliders,
  Maximize2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import {
  Employee,
  ArchivedDocument,
  ArchivedDocumentCategory,
  ARCHIVE_DOCUMENT_CATEGORIES,
  SmartDossierSummary,
  OrganizationSettings,
  UserAccount,
  DocumentClassificationLevel,
} from '../types';
import { archiveService } from '../services/archiveService';
import { soundEffects } from '../utils/soundEffects';
import { toast } from './ToastNotification';
import { SmartDossierModal } from './SmartDossierModal';
import { DocumentScannerCameraModal } from './DocumentScannerCameraModal';
import { HandwritingOcrViewerModal } from './HandwritingOcrViewerModal';
import { EmployeeDefinitionBadgeModal } from './EmployeeDefinitionBadgeModal';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { OfficialDocumentPrintModal } from './OfficialDocumentPrintModal';
import { DocumentProfileModal } from './DocumentProfileModal';

interface SmartArchiveHubProps {
  employees: Employee[];
  organization: OrganizationSettings;
  currentUser: UserAccount;
  onBackToDashboard: () => void;
  onNavigateToEmployeeProfile?: (employeeId: string) => void;
}

type ArchiveHubSubTab =
  | 'dossiers_grid' // الأضابير الذكية للموظفين
  | 'upload_center' // مركز الرفع والأرشفة والـ OCR
  | 'all_documents' // مستودع الوثائق والبحث بالـ OCR
  | 'employee_badges' // التعاريف والبطاقات الوظيفية
  | 'physical_labels'; // طباعة باركودات الأرشيف المكتبي

export const SmartArchiveHub: React.FC<SmartArchiveHubProps> = ({
  employees,
  organization,
  currentUser,
  onBackToDashboard,
  onNavigateToEmployeeProfile,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<ArchiveHubSubTab>('upload_center');
  const [allDocs, setAllDocs] = useState<ArchivedDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<ArchivedDocumentCategory | 'all'>('all');
  const [filterHandwrittenOnly, setFilterHandwrittenOnly] = useState<boolean>(false);

  // Pagination Controls (لعلاج تجمد الشاشة وعرض 10 أو 20 بالسجل)
  const [docsPage, setDocsPage] = useState<number>(1);
  const [docsPageSize, setDocsPageSize] = useState<number>(10);
  const [dossiersPage, setDossiersPage] = useState<number>(1);
  const [dossiersPageSize, setDossiersPageSize] = useState<number>(12);

  // Selected Employee for Dossier Modal
  const [selectedEmployeeForDossier, setSelectedEmployeeForDossier] = useState<Employee | null>(null);
  const [selectedDocForOcrViewer, setSelectedDocForOcrViewer] = useState<ArchivedDocument | null>(null);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<ArchivedDocument | null>(null);
  const [selectedDocForPrint, setSelectedDocForPrint] = useState<ArchivedDocument | null>(null);
  const [selectedDocForProfile, setSelectedDocForProfile] = useState<ArchivedDocument | null>(null);
  const [selectedEmployeeForBadge, setSelectedEmployeeForBadge] = useState<Employee | null>(null);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState<boolean>(false);

  // Upload Form State
  const [uploadEmployeeId, setUploadEmployeeId] = useState<string>('');
  const [uploadCategory, setUploadCategory] = useState<ArchivedDocumentCategory>('administrative_order');
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadRefNumber, setUploadRefNumber] = useState<string>('');
  const [uploadDocDate, setUploadDocDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [uploadAuthority, setUploadAuthority] = useState<string>(
    `${organization.ministryName} - ${organization.directorateName}`
  );
  const [uploadConfidentiality, setUploadConfidentiality] = useState<DocumentClassificationLevel>('normal');
  const [uploadCabinetLocation, setUploadCabinetLocation] = useState<string>('خزانة الموظفين A-1 / رف 2');
  const [uploadFileData, setUploadFileData] = useState<string | null>(null);
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [uploadFileType, setUploadFileType] = useState<string>('');
  const [uploadSource, setUploadSource] = useState<'scanner' | 'camera' | 'file_upload'>('file_upload');
  const [isExtractingOcr, setIsExtractingOcr] = useState<boolean>(false);
  const [extractedOcrPreview, setExtractedOcrPreview] = useState<{
    text: string;
    confidence: number;
    handwrittenNotes?: string;
    keywords: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load Archive on Mount
  const loadArchiveData = async () => {
    setIsLoading(true);
    try {
      const docs = await archiveService.init(employees);
      setAllDocs(docs);
    } catch (err) {
      console.error(err);
      toast.error('فشل تحميل مستندات الأرشيف.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadArchiveData();
    const unsub = archiveService.subscribe((updatedList) => {
      setAllDocs(updatedList);
    });
    return () => unsub();
  }, [employees]);

  // Set default employee for upload form
  useEffect(() => {
    if (employees.length > 0 && !uploadEmployeeId) {
      setUploadEmployeeId(employees[0].id);
    }
  }, [employees, uploadEmployeeId]);

  // Compute stats
  const totalDocsCount = allDocs.length;
  const handwrittenDocsCount = allDocs.filter((d) => d.isHandwritten).length;
  const certifiedBadgesCount = allDocs.filter((d) => d.category === 'employee_badge').length;

  const dossiersSummaryList = useMemo(() => {
    return employees.map((emp) => archiveService.calculateDossierCompleteness(emp, allDocs));
  }, [employees, allDocs]);

  const avgCompleteness = useMemo(() => {
    if (dossiersSummaryList.length === 0) return 0;
    const sum = dossiersSummaryList.reduce((acc, curr) => acc + curr.completenessScore, 0);
    return Math.round(sum / dossiersSummaryList.length);
  }, [dossiersSummaryList]);

  // Departments List
  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [employees]);

  // Handle file select in upload center
  const handleSelectUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundEffects.playScannerSweep();
    setUploadFileName(file.name);
    setUploadFileType(file.type || 'image/jpeg');
    setUploadSource('file_upload');
    if (!uploadTitle) {
      setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setUploadFileData(dataUrl);

      // Run Tesseract OCR & Arabic Handwriting extraction
      setIsExtractingOcr(true);
      try {
        const ocrRes = await archiveService.processOcr(dataUrl, {
          isHandwritten: true,
          documentTitle: file.name,
          category: uploadCategory,
        });
        setExtractedOcrPreview({
          text: ocrRes.extractedText,
          confidence: ocrRes.confidence,
          handwrittenNotes: ocrRes.handwrittenNotes,
          keywords: ocrRes.detectedKeywords,
        });
        if (ocrRes.referenceNumber && !uploadRefNumber) {
          setUploadRefNumber(ocrRes.referenceNumber);
        }
        if (ocrRes.documentDate) {
          setUploadDocDate(ocrRes.documentDate);
        }
        toast.success(`تم التعرف الضوئي على المستند بنجاح (دقة ${ocrRes.confidence}%).`);
      } catch (err) {
        console.warn('OCR note:', err);
      } finally {
        setIsExtractingOcr(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle capture from Camera/Scanner modal in upload center
  const handleScannerCaptureCompleted = async (
    fileDataUrl: string,
    fileName: string,
    fileType: string,
    source: 'scanner' | 'camera' | 'file_upload'
  ) => {
    soundEffects.playSuccess();
    setUploadFileData(fileDataUrl);
    setUploadFileName(fileName);
    setUploadFileType(fileType);
    setUploadSource(source);
    if (!uploadTitle) {
      setUploadTitle(`مستند ممسوح ضوئياً - ${new Date().toLocaleDateString('ar-IQ')}`);
    }

    setIsExtractingOcr(true);
    try {
      const ocrRes = await archiveService.processOcr(fileDataUrl, {
        isHandwritten: true,
        documentTitle: fileName,
        category: uploadCategory,
      });
      setExtractedOcrPreview({
        text: ocrRes.extractedText,
        confidence: ocrRes.confidence,
        handwrittenNotes: ocrRes.handwrittenNotes,
        keywords: ocrRes.detectedKeywords,
      });
      if (ocrRes.referenceNumber && !uploadRefNumber) {
        setUploadRefNumber(ocrRes.referenceNumber);
      }
      toast.success(`تم إتمام المسح واستخراج نصوص الـ OCR بنجاح (${ocrRes.confidence}%).`);
    } finally {
      setIsExtractingOcr(false);
    }
  };

  // Submit and archive document directly to target employee's dossier
  const handleSubmitArchivedDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmp = employees.find((emp) => emp.id === uploadEmployeeId);
    if (!targetEmp) {
      toast.error('يرجى اختيار الموظف لربط المستند بإضباره.');
      return;
    }
    if (!uploadTitle.trim()) {
      toast.error('يرجى كتابة عنوان الوثيقة أو موضوع الكتاب.');
      return;
    }

    soundEffects.playSuccess();
    try {
      const isPdf = uploadFileType.includes('pdf');
      const finalFileUrl =
        uploadFileData ||
        archiveService.createMockDocumentDataUrl(
          uploadTitle,
          targetEmp.fullName,
          targetEmp.department,
          uploadRefNumber || '101/إ',
          '#1e3a8a'
        );

      const thumbnail = await archiveService.generateThumbnail(
        finalFileUrl,
        180,
        240,
        uploadTitle
      );

      const newDoc: ArchivedDocument = {
        id: `DOC-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
        employeeId: targetEmp.id,
        employeeName: targetEmp.fullName,
        employeeNumber: targetEmp.employeeNumber,
        department: targetEmp.department,
        documentTitle: uploadTitle.trim(),
        category: uploadCategory,
        referenceNumber: uploadRefNumber.trim() || `${Math.floor(100 + Math.random() * 900)} / إ`,
        documentDate: uploadDocDate || new Date().toISOString().slice(0, 10),
        issuingAuthority: uploadAuthority.trim() || `${organization.ministryName} - ${organization.directorateName}`,
        fileUrl: finalFileUrl,
        thumbnailUrl: thumbnail,
        fileName: uploadFileName || `${uploadTitle}.jpg`,
        fileType: uploadFileType || 'image/jpeg',
        source: uploadSource,
        isHandwritten: Boolean(extractedOcrPreview?.handwrittenNotes),
        ocrExtractedText: extractedOcrPreview?.text || `${uploadTitle} - تم التدقيق والمطابقة بالإضبارة`,
        ocrConfidence: extractedOcrPreview?.confidence || 95,
        handwrittenNotes: extractedOcrPreview?.handwrittenNotes,
        detectedKeywords: extractedOcrPreview?.keywords || [uploadTitle, targetEmp.fullName],
        ocrStatus: 'completed',
        archiveCabinet: uploadCabinetLocation,
        archiveFolderCode: `DOS-${targetEmp.employeeNumber}`,
        confidentiality: uploadConfidentiality,
        archivedBy: currentUser.fullName || 'مسؤول الأرشفة والوثائق',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await archiveService.save(newDoc);
      await loadArchiveData();

      // Reset form
      setUploadFileData(null);
      setUploadFileName('');
      setUploadTitle('');
      setUploadRefNumber('');
      setExtractedOcrPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      toast.success(
        `✅ تم ربط وحفظ المستند مباشرة في إضبارة الموظف (${targetEmp.fullName}) بنجاح!`
      );
    } catch (err) {
      console.error(err);
      toast.error('فشل حفظ المستند في الأرشيف.');
    }
  };

  // Filtered documents for global search
  const filteredAllDocs = useMemo(() => {
    return allDocs.filter((doc) => {
      const matchesCat = selectedCategory === 'all' || doc.category === selectedCategory;
      const matchesDept = selectedDepartment === 'all' || doc.department === selectedDepartment;
      const matchesEmp = selectedEmployeeFilter === 'all' || doc.employeeId === selectedEmployeeFilter;
      const matchesHandwritten = !filterHandwrittenOnly || doc.isHandwritten;

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        doc.documentTitle.toLowerCase().includes(q) ||
        doc.employeeName.toLowerCase().includes(q) ||
        doc.employeeNumber.toLowerCase().includes(q) ||
        doc.referenceNumber.toLowerCase().includes(q) ||
        (doc.ocrExtractedText && doc.ocrExtractedText.toLowerCase().includes(q)) ||
        (doc.handwrittenNotes && doc.handwrittenNotes.toLowerCase().includes(q));

      return matchesCat && matchesDept && matchesEmp && matchesHandwritten && matchesSearch;
    });
  }, [allDocs, selectedCategory, selectedDepartment, selectedEmployeeFilter, filterHandwrittenOnly, searchQuery]);

  // Reset pagination on filter change
  useEffect(() => {
    setDocsPage(1);
    setDossiersPage(1);
  }, [selectedCategory, selectedDepartment, selectedEmployeeFilter, filterHandwrittenOnly, searchQuery]);

  // Paginated documents for global search table
  const totalDocPages = Math.ceil(filteredAllDocs.length / docsPageSize) || 1;
  const paginatedAllDocs = useMemo(() => {
    const start = (docsPage - 1) * docsPageSize;
    return filteredAllDocs.slice(start, start + docsPageSize);
  }, [filteredAllDocs, docsPage, docsPageSize]);

  // Filtered employees for dossiers grid
  const filteredDossiers = useMemo(() => {
    return dossiersSummaryList.filter((item) => {
      const emp = employees.find((e) => e.id === item.employeeId);
      const matchesDept = selectedDepartment === 'all' || (emp && emp.department === selectedDepartment);
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.employeeName.toLowerCase().includes(q) ||
        item.employeeNumber.toLowerCase().includes(q);
      return matchesDept && matchesSearch;
    });
  }, [dossiersSummaryList, employees, selectedDepartment, searchQuery]);

  // Paginated dossiers for dossiers grid
  const totalDossierPages = Math.ceil(filteredDossiers.length / dossiersPageSize) || 1;
  const paginatedDossiers = useMemo(() => {
    const start = (dossiersPage - 1) * dossiersPageSize;
    return filteredDossiers.slice(start, start + dossiersPageSize);
  }, [filteredDossiers, dossiersPage, dossiersPageSize]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Navigation Toolbar */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20">
            <FolderOpen className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                مركز الأرشفة الرقمي والإضبارة الذكية
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-xs border border-amber-500/30">
                Tesseract.js OCR Ready ⚡
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              أرشفة المستندات الورقية، قراءة الخط اليدوي، السكنر المكتبي، والتعاريف والبطاقات الوظيفية الرسمية
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>الرئيسية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('upload_center')}
            className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>أرشفة وثيقة جديدة 📂</span>
          </button>
        </div>
      </div>

      {/* 2. Top Stats KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">إجمالي الوثائق المؤرشفة</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{totalDocsCount}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0">
            <PenTool className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">مستندات وتهميشات خط اليد</span>
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">{handwrittenDocsCount}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">متوسط اكتمال الأضابير</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{avgCompleteness}%</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">التعاريف والبطاقات الوظيفية</span>
            <span className="text-xl font-bold text-purple-600 dark:text-purple-400 font-mono">{certifiedBadgesCount}</span>
          </div>
        </div>
      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto text-xs font-bold no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveSubTab('upload_center')}
          className={`px-4 py-2.5 rounded-2xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeSubTab === 'upload_center'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>مركز رفع وتصنيف الوثائق (PDF & صور) ⚡</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('dossiers_grid')}
          className={`px-4 py-2.5 rounded-2xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeSubTab === 'dossiers_grid'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>الأضابير الذكية للموظفين ({employees.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('all_documents')}
          className={`px-4 py-2.5 rounded-2xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeSubTab === 'all_documents'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>مستودع الوثائق والبحث بالـ OCR ({allDocs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('employee_badges')}
          className={`px-4 py-2.5 rounded-2xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeSubTab === 'employee_badges'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>التعاريف والبطاقات الوظيفية 🪪</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('physical_labels')}
          className={`px-4 py-2.5 rounded-2xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeSubTab === 'physical_labels'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>ليبل وباركود الأرشيف الورقي 🏷️</span>
        </button>
      </div>

      {/* 4. CONTENT SECTIONS */}

      {/* SUB-TAB 1: UPLOAD & DIGITAL INGESTION CENTER (المطلوب في الاستفسار بدقة) */}
      {activeSubTab === 'upload_center' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Side */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    رفع وأرشفة مستند جديد وربطه بإضبارة الموظف
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    يدعم ملفات PDF، الصور الورقية، والسكانر المباشر مع استخراج Tesseract.js OCR
                  </p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
                ربط لحظي بالإضبارة
              </span>
            </div>

            <form onSubmit={handleSubmitArchivedDocument} className="space-y-4 text-xs">
              {/* Target Employee Selection (ربطها مباشرة بإضبارة الموظف المختار) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-500" />
                    <span>الموظف المستهدف (ربط المستند بإضباره مباشرة): *</span>
                  </span>
                  <span className="text-[11px] text-slate-400">اختر الموظف المراد إيداع الوثيقة في ملفه</span>
                </label>
                <select
                  value={uploadEmployeeId}
                  onChange={(e) => setUploadEmployeeId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-amber-500"
                >
                  <option value="" disabled>-- حدد الموظف --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeNumber}) — {emp.department}
                    </option>
                  ))}
                </select>
              </div>

              {/* Document Category Selection (أوامر إدارية، طلبات إجازة، شهادات...) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-500" />
                    <span>تصنيف ونوع الوثيقة: *</span>
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as ArchivedDocumentCategory)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-semibold"
                  >
                    {ARCHIVE_DOCUMENT_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>درجة السرية والتصنيف الأمني:</span>
                  </label>
                  <select
                    value={uploadConfidentiality}
                    onChange={(e) => setUploadConfidentiality(e.target.value as DocumentClassificationLevel)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-semibold"
                  >
                    <option value="normal">عادي (متاح لشؤون الموظفين)</option>
                    <option value="confidential">سري (مقيد الصلاحيات)</option>
                    <option value="top_secret">سري للغاية وشخصي</option>
                    <option value="urgent">عاجل وفوري</option>
                  </select>
                </div>
              </div>

              {/* Document Title & Reference Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 dark:text-slate-200">
                    عنوان الوثيقة أو موضوع الكتاب: *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: أمر إداري بالمباشرة والتثبيت"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 dark:text-slate-200">
                    رقم العدد / الصادر:
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 1420 / إ / 2026"
                    value={uploadRefNumber}
                    onChange={(e) => setUploadRefNumber(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold font-mono"
                  />
                </div>
              </div>

              {/* Document Date & Issuing Authority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 dark:text-slate-200">
                    تاريخ الوثيقة أو الأمر:
                  </label>
                  <input
                    type="date"
                    value={uploadDocDate}
                    onChange={(e) => setUploadDocDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 dark:text-slate-200">
                    الجهة المصدرة للكتاب:
                  </label>
                  <input
                    type="text"
                    value={uploadAuthority}
                    onChange={(e) => setUploadAuthority(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* File Attachment Dropzone & Scanner Camera Buttons */}
              <div className="space-y-2 pt-1">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>ملف الوثيقة (PDF أو صورة ممسوحة ضوئياً): *</span>
                  {uploadFileName && (
                    <span className="text-[11px] text-emerald-600 font-bold truncate max-w-[200px]">
                      ✓ {uploadFileName}
                    </span>
                  )}
                </label>

                <div className="p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex flex-col items-center justify-center space-y-3 text-center">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>استعراض ملف PDF أو صورة 📂</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      onChange={handleSelectUploadFile}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => setIsScannerModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>مسح عبر السكانر / الكاميرا 📷</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    يدعم رفع ملفات PDF وصور المستندات الورقية بجودة عالية ويقوم Tesseract.js بتحويلها تلقائياً لنصوص قابلة للبحث
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isExtractingOcr}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer mt-4"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>حفظ وأرشفة المستند مباشرة في إضبارة الموظف ⚡</span>
              </button>
            </form>
          </div>

          {/* Side 2: Live OCR Preview (Tesseract.js OCR Recognition & Handwriting) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      محرك Tesseract.js للتعرف الضوئي (OCR)
                    </h4>
                    <span className="text-[10px] text-slate-400">تحويل الصور والماسح لنصوص قابلة للبحث</span>
                  </div>
                </div>

                {extractedOcrPreview && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-200">
                    دقة {extractedOcrPreview.confidence}%
                  </span>
                )}
              </div>

              {isExtractingOcr ? (
                <div className="py-12 text-center text-slate-400 space-y-3">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin text-amber-500" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    جاري فحص المستند واستخراج النصوص العربية بخوارزمية Tesseract.js...
                  </p>
                  <p className="text-[11px] text-slate-400">يتم تفريغ الأختام والهوامش والتواقيع اليدوية</p>
                </div>
              ) : uploadFileData ? (
                <div className="space-y-3">
                  {/* Visual preview */}
                  <div className="h-44 rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center relative">
                    <img
                      src={uploadFileData}
                      alt="Preview"
                      className="max-h-full w-auto object-contain"
                    />
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-mono">
                      {uploadSource === 'scanner' ? 'Optical Scan' : uploadSource === 'camera' ? 'Camera Snapshot' : 'Uploaded File'}
                    </span>
                  </div>

                  {/* Handwritten margin note box */}
                  {extractedOcrPreview?.handwrittenNotes && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs space-y-1">
                      <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1 text-[11px]">
                        <PenTool className="w-3 h-3 text-amber-600" />
                        <span>الهامش اليدوي المستخرج من المستند:</span>
                      </span>
                      <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed text-[11px]">
                        {extractedOcrPreview.handwrittenNotes}
                      </p>
                    </div>
                  )}

                  {/* OCR Transcribed text area */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                      النص المقروء والمفهرس آلياً للبحث:
                    </span>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-200 font-mono leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto select-text shadow-inner">
                      {extractedOcrPreview?.text || 'تم استخراج بيانات الوثيقة.'}
                    </div>
                  </div>

                  {/* Keywords */}
                  {extractedOcrPreview?.keywords && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {extractedOcrPreview.keywords.map((kw, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold"
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-10 text-center text-slate-400 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center text-slate-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    قم برفع ملف PDF أو صورة من النموذج الأيمن لتشغيل محرك التعرف الضوئي Tesseract.js فوراً.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: EMPLOYEE SMART DOSSIERS GRID (أضابير ذكية لكل موظف) */}
      {activeSubTab === 'dossiers_grid' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث باسم الموظف أو الرقم الوظيفي..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-8 pl-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                />
              </div>

              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              >
                <option value="all">كافة الأقسام والتشكيلات</option>
                {departmentsList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-400 font-bold">عرض بالسجل:</span>
                <select
                  value={dossiersPageSize}
                  onChange={(e) => {
                    setDossiersPageSize(Number(e.target.value));
                    setDossiersPage(1);
                  }}
                  className="bg-transparent font-bold text-xs text-amber-600 outline-none cursor-pointer"
                >
                  <option value={12}>12 إضبارة</option>
                  <option value={24}>24 إضبارة</option>
                  <option value={48}>48 إضبارة</option>
                </select>
              </div>

              <div className="text-slate-500 text-xs font-medium">
                عرض <strong className="text-slate-900 dark:text-white font-mono">{filteredDossiers.length}</strong> إضبارة موظف
              </div>
            </div>
          </div>

          {/* Dossiers Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedDossiers.map((dossier) => {
              const emp = employees.find((e) => e.id === dossier.employeeId);
              return (
                <div
                  key={dossier.employeeId}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    {/* Card Top */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400 font-bold block">
                          {dossier.dossierCode}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                          {dossier.employeeName}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">{dossier.department}</p>
                      </div>

                      {/* Completeness Pill */}
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                          dossier.completenessScore >= 80
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : dossier.completenessScore >= 50
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {dossier.completenessScore}% اكتمال
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${dossier.completenessScore}%` }}
                        className={`h-full ${
                          dossier.completenessScore >= 80
                            ? 'bg-emerald-500'
                            : dossier.completenessScore >= 50
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                      />
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                      <div>
                        <span className="text-slate-400 block text-[10px]">الوثائق المؤرشفة:</span>
                        <strong className="text-slate-800 dark:text-slate-100 font-mono">
                          {dossier.totalDocuments} مستند
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">مخطوط باليد:</span>
                        <strong className="text-amber-600 font-mono">{dossier.handwrittenCount} ✍️</strong>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-slate-400 block text-[10px]">موقع الخزانة الورقية:</span>
                        <strong className="text-slate-700 dark:text-slate-300 font-mono text-[10px]">
                          {dossier.physicalCabinetLocation}
                        </strong>
                      </div>
                    </div>

                    {/* Missing items warning if any */}
                    {dossier.missingRequiredDocs.length > 0 && (
                      <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 bg-rose-50 dark:bg-rose-950/30 p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 truncate">
                        <AlertTriangle className="w-3 h-3 shrink-0 text-rose-500" />
                        <span>نواقص: {dossier.missingRequiredDocs.join('، ')}</span>
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSelectedEmployeeForDossier(emp || null)}
                      className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>فتح الإضبارة 📁</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedEmployeeForBadge(emp || null)}
                      className="py-2 px-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>الهوية والباج 🪪</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dossiers Pagination Toolbar */}
          {totalDossierPages > 1 && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between text-xs">
              <div className="text-slate-500">
                صفحة <strong className="font-mono text-slate-900 dark:text-white">{dossiersPage}</strong> من{' '}
                <strong className="font-mono text-slate-900 dark:text-white">{totalDossierPages}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={dossiersPage === 1}
                  onClick={() => setDossiersPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span>السابق</span>
                </button>
                <button
                  type="button"
                  disabled={dossiersPage === totalDossierPages}
                  onClick={() => setDossiersPage((p) => Math.min(totalDossierPages, p + 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1"
                >
                  <span>التالي</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: GLOBAL DOCUMENT REPOSITORY & OCR SEARCH */}
      {activeSubTab === 'all_documents' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[260px]">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث بالنص الكامل أو التهميشات أو رقم العدد..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-8 pl-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              >
                <option value="all">كافة أنواع الوثائق</option>
                {ARCHIVE_DOCUMENT_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr}
                  </option>
                ))}
              </select>

              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              >
                <option value="all">كافة الأقسام</option>
                {departmentsList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              {/* فلتر وتحديد الموظف لعرض كافة مستنداته في واجهة واحدة */}
              <select
                value={selectedEmployeeFilter}
                onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
                className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              >
                <option value="all">كافة الموظفين ({employees.length})</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.employeeNumber})
                  </option>
                ))}
              </select>

              {selectedEmployeeFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => {
                    const emp = employees.find((e) => e.id === selectedEmployeeFilter);
                    if (emp) setSelectedEmployeeForDossier(emp);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>عرض إضبارة الموظف الموحدة 📁</span>
                </button>
              )}

              <label className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterHandwrittenOnly}
                  onChange={(e) => setFilterHandwrittenOnly(e.target.checked)}
                  className="rounded accent-amber-500"
                />
                <span>مخطوط باليد فقط ✍️</span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-400 font-bold">عرض بالسجل:</span>
                <select
                  value={docsPageSize}
                  onChange={(e) => {
                    setDocsPageSize(Number(e.target.value));
                    setDocsPage(1);
                  }}
                  className="bg-transparent font-bold text-xs text-amber-600 outline-none cursor-pointer"
                >
                  <option value={10}>10 وثائق</option>
                  <option value={20}>20 وثيقة</option>
                  <option value={50}>50 وثيقة</option>
                  <option value={100}>100 وثيقة</option>
                </select>
              </div>

              <div className="text-slate-500 text-xs">
                النتائج المطابقة: <strong className="text-slate-900 dark:text-white font-mono">{filteredAllDocs.length}</strong> وثيقة
              </div>
            </div>
          </div>

          {/* Documents Table / Grid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="py-3 px-3 font-bold">المعاينة</th>
                    <th className="py-3 px-4 font-bold">عنوان الوثيقة والكتاب</th>
                    <th className="py-3 px-4 font-bold">الموظف المعني</th>
                    <th className="py-3 px-4 font-bold">النوع والتصنيف</th>
                    <th className="py-3 px-4 font-bold">العدد والتاريخ</th>
                    <th className="py-3 px-4 font-bold">قراءة الـ OCR وخط اليد</th>
                    <th className="py-3 px-4 font-bold">الموقع الورقي</th>
                    <th className="py-3 px-4 font-bold text-center">الإجراءات والملف التعريفي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {paginatedAllDocs.map((doc) => {
                    const catMeta = ARCHIVE_DOCUMENT_CATEGORIES.find((c) => c.id === doc.category);
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3">
                          <div
                            onClick={() => setSelectedDocForPreview(doc)}
                            className="w-10 h-13 rounded-lg overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer shadow-xs hover:border-amber-500 transition-colors"
                            title="معاينة مصغرة سريعة"
                          >
                            <img
                              src={doc.thumbnailUrl || doc.fileUrl}
                              alt=""
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div
                            onClick={() => setSelectedDocForPreview(doc)}
                            className="font-bold text-slate-900 dark:text-white cursor-pointer hover:text-amber-600"
                          >
                            {doc.documentTitle}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[220px]">
                            {doc.issuingAuthority}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{doc.employeeName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{doc.employeeNumber}</div>
                          <button
                            type="button"
                            onClick={() => {
                              const emp = employees.find((e) => e.id === doc.employeeId);
                              if (emp) setSelectedEmployeeForDossier(emp);
                            }}
                            className="mt-1 px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[10px] border border-amber-200 dark:border-amber-800/60 inline-flex items-center gap-1 cursor-pointer transition-colors"
                            title="عرض كافة مستندات هذا الموظف داخل إضبارته في واجهة موحدة"
                          >
                            <FolderOpen className="w-3 h-3 text-amber-600" />
                            <span>عرض إضبارة الموظف 📁</span>
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] border ${catMeta?.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                            {catMeta?.nameAr || 'عام'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{doc.referenceNumber}</div>
                          <div className="text-slate-400 text-[10px]">{doc.documentDate}</div>
                        </td>
                        <td className="py-3 px-4">
                          {doc.isHandwritten ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px] flex items-center gap-1 w-max border border-amber-300">
                              <PenTool className="w-3 h-3 text-amber-600" />
                              <span>تفريغ خط اليد (OCR)</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>نص رقمي مطبوع</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                          {doc.archiveCabinet}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedDocForProfile(doc)}
                              className="px-2 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-bold text-xs shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1 border border-purple-200 dark:border-purple-800"
                              title="الملف التعريفي والتصنيف الديناميكي للمستند"
                            >
                              <FileText className="w-3.5 h-3.5 text-purple-600" />
                              <span className="hidden sm:inline">الملف التعريفي 📋</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedDocForPreview(doc)}
                              className="px-2 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="معاينة الوثيقة"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-500" />
                              <span className="hidden sm:inline">معاينة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedDocForPrint(doc)}
                              className="px-2 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold text-xs shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="طباعة مصدقة A4"
                            >
                              <Printer className="w-3.5 h-3.5 text-blue-600" />
                              <span className="hidden sm:inline">طباعة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedDocForOcrViewer(doc)}
                              className="px-2 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="استعراض وتدقيق الـ OCR"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>OCR</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Bar */}
            {totalDocPages > 1 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="text-slate-500 font-medium">
                  عرض <strong className="font-mono text-slate-900 dark:text-white">{(docsPage - 1) * docsPageSize + 1}</strong> إلى{' '}
                  <strong className="font-mono text-slate-900 dark:text-white">
                    {Math.min(filteredAllDocs.length, docsPage * docsPageSize)}
                  </strong>{' '}
                  من إجمالي <strong className="font-mono text-slate-900 dark:text-white">{filteredAllDocs.length}</strong> وثيقة
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={docsPage === 1}
                    onClick={() => setDocsPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span>السابق</span>
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalDocPages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      if (
                        pageNum === 1 ||
                        pageNum === totalDocPages ||
                        (pageNum >= docsPage - 1 && pageNum <= docsPage + 1)
                      ) {
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setDocsPage(pageNum)}
                            className={`w-7 h-7 rounded-lg font-bold font-mono transition-colors cursor-pointer ${
                              docsPage === pageNum
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                      if (pageNum === docsPage - 2 || pageNum === docsPage + 2) {
                        return <span key={pageNum} className="text-slate-400">..</span>;
                      }
                      return null;
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={docsPage === totalDocPages}
                    onClick={() => setDocsPage((p) => Math.min(totalDocPages, p + 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1"
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

      {/* SUB-TAB 4: EMPLOYEE DEFINITIONS & BADGES */}
      {activeSubTab === 'employee_badges' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                دليل التعاريف والبطاقات الوظيفية الرسمية (Employee Official Identity Cards)
              </h3>
              <p className="text-xs text-slate-500">
                إصدار، معاينة، وطباعة هويات الموظفين المعتمدة مع الباركود والـ QR الموحد
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كافة الباجات A4</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{emp.fullName}</h4>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400">{emp.jobTitle}</p>
                  <p className="text-[11px] text-slate-400 font-mono">الرقم: {emp.employeeNumber} — {emp.department}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEmployeeForBadge(emp)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>معاينة وطباعة الهوية</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: PHYSICAL LABELS PRINTING (ليبل الباركود للأرشيف الورقي) */}
      {activeSubTab === 'physical_labels' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                طباعة ليبلات الباركود للأضابير الورقية والخزائن (Archive Box File Labels)
              </h3>
              <p className="text-xs text-slate-500">
                ملصقات باركود حرارية لتثبيتها على البوكس فايل الورقي في دواليب ورفوف الأرشيف
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>أمر طباعة الملصقات 🖨️</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((emp) => {
              const summary = archiveService.calculateDossierCompleteness(emp, allDocs);
              return (
                <div
                  key={emp.id}
                  className="p-4 rounded-2xl bg-white text-slate-900 border-2 border-slate-300 shadow-sm flex flex-col justify-between space-y-2 print:border-black"
                >
                  <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-slate-500">دائرة الموارد المائية - الأرشيف</div>
                      <div className="text-xs font-bold text-slate-900">{emp.fullName}</div>
                    </div>
                    <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded">
                      {emp.employeeNumber}
                    </span>
                  </div>

                  <div className="text-[10px] space-y-1">
                    <div>القسم: <strong>{emp.department}</strong></div>
                    <div>رمز الإضبارة: <strong className="font-mono">{summary.dossierCode}</strong></div>
                    <div>الموقع: <strong className="font-mono text-amber-700">{summary.physicalCabinetLocation}</strong></div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-center font-mono text-[10px] font-bold">
                    *DOS-{emp.employeeNumber}*
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODALS */}
      <SmartDossierModal
        isOpen={Boolean(selectedEmployeeForDossier)}
        onClose={() => setSelectedEmployeeForDossier(null)}
        employee={selectedEmployeeForDossier}
        organization={organization}
        onDossierUpdated={loadArchiveData}
      />

      <EmployeeDefinitionBadgeModal
        isOpen={Boolean(selectedEmployeeForBadge)}
        onClose={() => setSelectedEmployeeForBadge(null)}
        employee={selectedEmployeeForBadge}
        organization={organization}
        onBadgeArchived={loadArchiveData}
      />

      <HandwritingOcrViewerModal
        isOpen={Boolean(selectedDocForOcrViewer)}
        onClose={() => setSelectedDocForOcrViewer(null)}
        document={selectedDocForOcrViewer}
        onSaveUpdatedDoc={async (updated) => {
          await archiveService.save(updated);
          await loadArchiveData();
          setSelectedDocForOcrViewer(null);
        }}
        onPrintDocument={(doc) => {
          setSelectedDocForPrint(doc);
        }}
      />

      {/* Full Document Preview & Lightbox Modal */}
      <DocumentPreviewModal
        isOpen={Boolean(selectedDocForPreview)}
        onClose={() => setSelectedDocForPreview(null)}
        document={selectedDocForPreview}
        allDossierDocs={filteredAllDocs}
        onSelectAnotherDoc={(nextDoc) => setSelectedDocForPreview(nextDoc)}
        onOpenOcrViewer={(doc) => {
          setSelectedDocForPreview(null);
          setSelectedDocForOcrViewer(doc);
        }}
        onOpenPrintModal={(doc) => {
          setSelectedDocForPrint(doc);
        }}
      />

      {/* Official Certified Archival Print Modal */}
      <OfficialDocumentPrintModal
        isOpen={Boolean(selectedDocForPrint)}
        onClose={() => setSelectedDocForPrint(null)}
        document={selectedDocForPrint}
        employee={employees.find((e) => e.id === selectedDocForPrint?.employeeId) || null}
        organization={organization}
      />

      {/* Dynamic Document Profile Modal (الملف التعريفي والتصنيف المتقدم للوثيقة) */}
      <DocumentProfileModal
        isOpen={Boolean(selectedDocForProfile)}
        onClose={() => setSelectedDocForProfile(null)}
        document={selectedDocForProfile}
        employees={employees}
        onSaveProfile={async (updated) => {
          await archiveService.save(updated);
          await loadArchiveData();
          setSelectedDocForProfile(null);
        }}
        onOpenEmployeeDossier={(emp) => {
          setSelectedDocForProfile(null);
          setSelectedEmployeeForDossier(emp);
        }}
        onOpenPreview={(doc) => {
          setSelectedDocForProfile(null);
          setSelectedDocForPreview(doc);
        }}
        onOpenPrint={(doc) => {
          setSelectedDocForProfile(null);
          setSelectedDocForPrint(doc);
        }}
      />

      <DocumentScannerCameraModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        initialEmployeeName={employees.find((e) => e.id === uploadEmployeeId)?.fullName}
        initialEmployeeId={uploadEmployeeId}
        employees={employees}
        onCaptureCompleted={handleScannerCaptureCompleted}
        onDirectArchiveSaved={loadArchiveData}
      />
    </div>
  );
};
