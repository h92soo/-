import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileText,
  FolderOpen,
  Camera,
  Upload,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Award,
  TrendingUp,
  CreditCard,
  PenTool,
  Search,
  Plus,
  Eye,
  Trash2,
  Calendar,
  Sparkles,
  Building2,
  Layers,
  ArrowRight,
  RefreshCw,
  HardDrive,
  LayoutGrid,
  List,
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
} from '../types';
import { archiveService } from '../services/archiveService';
import { DocumentScannerCameraModal } from './DocumentScannerCameraModal';
import { HandwritingOcrViewerModal } from './HandwritingOcrViewerModal';
import { EmployeeDefinitionBadgeModal } from './EmployeeDefinitionBadgeModal';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { OfficialDocumentPrintModal } from './OfficialDocumentPrintModal';
import { DocumentProfileModal } from './DocumentProfileModal';
import { soundEffects } from '../utils/soundEffects';
import { toast } from './ToastNotification';

interface SmartDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  organization: OrganizationSettings;
  onDossierUpdated?: () => void;
}

export const SmartDossierModal: React.FC<SmartDossierModalProps> = ({
  isOpen,
  onClose,
  employee,
  organization,
  onDossierUpdated,
}) => {
  const [documents, setDocuments] = useState<ArchivedDocument[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ArchivedDocumentCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Pagination & Layout State (لعلاج تجمد الشاشة وعرض 10 أو 20 بالسجل)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals
  const [isScannerModalOpen, setIsScannerModalOpen] = useState<boolean>(false);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState<boolean>(false);
  const [selectedDocForOcr, setSelectedDocForOcr] = useState<ArchivedDocument | null>(null);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<ArchivedDocument | null>(null);
  const [selectedDocForPrint, setSelectedDocForPrint] = useState<ArchivedDocument | null>(null);
  const [selectedDocForProfile, setSelectedDocForProfile] = useState<ArchivedDocument | null>(null);

  // File Upload Ref
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const loadEmployeeDocuments = async () => {
    if (!employee) return;
    setIsLoading(true);
    try {
      const docs = await archiveService.getByEmployeeId(employee.id);
      setDocuments(docs);
    } catch (err) {
      console.error(err);
      toast.error('فشل استرجاع وثائق الإضبارة.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && employee) {
      loadEmployeeDocuments();
    }
  }, [isOpen, employee]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  if (!isOpen || !employee) return null;

  const dossierSummary: SmartDossierSummary = archiveService.calculateDossierCompleteness(
    employee,
    documents
  );

  const filteredDocs = documents.filter((doc) => {
    const matchesCat = selectedCategory === 'all' || doc.category === selectedCategory;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      doc.documentTitle.toLowerCase().includes(query) ||
      doc.referenceNumber.toLowerCase().includes(query) ||
      (doc.ocrExtractedText && doc.ocrExtractedText.toLowerCase().includes(query)) ||
      (doc.handwrittenNotes && doc.handwrittenNotes.toLowerCase().includes(query));
    return matchesCat && matchesSearch;
  });

  const totalPages = Math.ceil(filteredDocs.length / pageSize) || 1;
  const paginatedDocs = filteredDocs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Handle direct file upload (PDF or Images)
  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employee) return;

    setIsUploading(true);
    soundEffects.playScannerSweep();
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const fileDataUrl = reader.result as string;
        const fileType = file.type || 'image/jpeg';
        const isPdf = fileType.includes('pdf');

        // Generate thumbnail immediately
        const thumbnailUrl = await archiveService.generateThumbnail(
          fileDataUrl,
          180,
          240,
          file.name
        );

        // Process OCR on upload using Tesseract.js / Arabic Document Parser
        const ocrResult = await archiveService.processOcr(fileDataUrl, {
          isHandwritten: true,
          documentTitle: file.name.replace(/\.[^/.]+$/, ''),
          category: 'administrative_order',
        });

        const newDoc: ArchivedDocument = {
          id: `DOC-UPL-${Date.now().toString().slice(-6)}`,
          employeeId: employee.id,
          employeeName: employee.fullName,
          employeeNumber: employee.employeeNumber,
          department: employee.department,
          documentTitle: file.name.replace(/\.[^/.]+$/, '') || 'مستند مؤرشف جديد',
          category: 'administrative_order',
          referenceNumber: ocrResult.referenceNumber,
          documentDate: ocrResult.documentDate,
          issuingAuthority: ocrResult.issuingAuthority,
          fileUrl: isPdf ? archiveService.createMockDocumentDataUrl('ملف PDF مؤرشف', employee.fullName, employee.department, ocrResult.referenceNumber, '#1e3a8a') : fileDataUrl,
          thumbnailUrl,
          fileName: file.name,
          fileType,
          fileSizeBytes: file.size,
          source: 'file_upload',
          isHandwritten: Boolean(ocrResult.handwrittenNotes),
          ocrExtractedText: ocrResult.extractedText,
          ocrConfidence: ocrResult.confidence,
          handwrittenNotes: ocrResult.handwrittenNotes,
          detectedKeywords: ocrResult.detectedKeywords,
          ocrStatus: 'completed',
          archiveCabinet: dossierSummary.physicalCabinetLocation,
          archiveFolderCode: dossierSummary.dossierCode,
          confidentiality: 'normal',
          archivedBy: 'مسؤول الأرشفة الرقمية',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await archiveService.save(newDoc);
        await loadEmployeeDocuments();
        if (onDossierUpdated) onDossierUpdated();
        toast.success(`تم رفع وأرشفة المستند واستخراج النصوص بالـ OCR بنجاح (${ocrResult.confidence}% دقة).`);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      toast.error('فشل رفع المستند.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle capture from scanner / live camera modal
  const handleCaptureCompleted = async (
    fileDataUrl: string,
    fileName: string,
    fileType: string,
    source: 'scanner' | 'camera' | 'file_upload'
  ) => {
    soundEffects.playSuccess();
    try {
      const ocrResult = await archiveService.processOcr(fileDataUrl, {
        isHandwritten: true,
        documentTitle: fileName,
        category: 'administrative_order',
      });

      const newDoc: ArchivedDocument = {
        id: `DOC-SCN-${Date.now().toString().slice(-6)}`,
        employeeId: employee.id,
        employeeName: employee.fullName,
        employeeNumber: employee.employeeNumber,
        department: employee.department,
        documentTitle: `مستند ممسوح ضوئياً (${new Date().toLocaleDateString('ar-IQ')})`,
        category: 'administrative_order',
        referenceNumber: ocrResult.referenceNumber,
        documentDate: ocrResult.documentDate,
        issuingAuthority: ocrResult.issuingAuthority,
        fileUrl: fileDataUrl,
        fileName,
        fileType,
        source,
        isHandwritten: true,
        ocrExtractedText: ocrResult.extractedText,
        ocrConfidence: ocrResult.confidence,
        handwrittenNotes: ocrResult.handwrittenNotes,
        detectedKeywords: ocrResult.detectedKeywords,
        ocrStatus: 'completed',
        archiveCabinet: dossierSummary.physicalCabinetLocation,
        archiveFolderCode: dossierSummary.dossierCode,
        confidentiality: 'normal',
        archivedBy: 'مشغل الماسح الضوئي',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await archiveService.save(newDoc);
      await loadEmployeeDocuments();
      if (onDossierUpdated) onDossierUpdated();
      toast.success('تمت إضافة المستند الممسوح إلى إضبارة الموظف بنجاح.');
    } catch (err) {
      console.error(err);
      toast.error('فشل حفظ المستند الممسوح.');
    }
  };

  const handleDeleteDocument = async (docId: string, docTitle: string) => {
    if (confirm(`هل أنت متأكد من رغبتك بحذف المستند (${docTitle}) من إضبارة الموظف؟`)) {
      await archiveService.delete(docId);
      await loadEmployeeDocuments();
      if (onDossierUpdated) onDossierUpdated();
      toast.success('تم حذف المستند بنجاح.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in no-print">
      <div className="relative w-full max-w-6xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-800/60">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  الإضبارة الذكية الشاملة للموظف (Smart Digital Dossier)
                </h3>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold">
                  {dossierSummary.dossierCode}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {employee.fullName} — الرقم الوظيفي: {employee.employeeNumber} ({employee.department})
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

        {/* Dossier Completeness Bar & Physical Cabinet Info */}
        <div className="px-6 py-4 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Score pill */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">مؤشر اكتمال الإضبارة:</span>
              <span
                className={`px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1 ${
                  dossierSummary.completenessScore >= 80
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                    : dossierSummary.completenessScore >= 50
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{dossierSummary.completenessScore}% اكتمال وثائقي</span>
              </span>
            </div>

            {/* Cabinet Location */}
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <HardDrive className="w-3.5 h-3.5 text-amber-500" />
              <span>موقع الإضبارة الورقية: </span>
              <strong className="text-slate-900 dark:text-white font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                {dossierSummary.physicalCabinetLocation}
              </strong>
            </div>

            {/* Total counts */}
            <div className="text-slate-500 text-[11px] flex items-center gap-3">
              <span>إجمالي الوثائق: <strong className="text-slate-800 dark:text-slate-200 font-mono">{dossierSummary.totalDocuments}</strong></span>
              <span>مخطوط باليد: <strong className="text-amber-600 font-mono">{dossierSummary.handwrittenCount}</strong> ✍️</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
            <div
              style={{ width: `${dossierSummary.completenessScore}%` }}
              className={`h-full transition-all duration-500 ${
                dossierSummary.completenessScore >= 80
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : dossierSummary.completenessScore >= 50
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                  : 'bg-gradient-to-r from-rose-500 to-red-500'
              }`}
            />
          </div>

          {/* Missing Required Docs Badges */}
          {dossierSummary.missingRequiredDocs.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 p-2 rounded-xl border border-rose-200 dark:border-rose-900/50">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="font-bold">وثائق أساسية ناقصة في الإضبارة:</span>
              {dossierSummary.missingRequiredDocs.map((docName, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 font-semibold"
                >
                  {docName}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions Toolbar */}
        <div className="px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsScannerModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>ماسح ضوئي / تصوير حي 📷</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>رفع PDF / صورة 📂</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleDirectFileUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => setIsBadgeModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>إصدار بطاقة الهوية والتعريف 🪪</span>
            </button>
          </div>

          {/* Search in Dossier */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث في نصوص وكتب الإضبارة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Category Filter Drawers & Pagination Header */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-xl font-bold shrink-0 transition-colors cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              كافة الوثائق ({documents.length})
            </button>
            {ARCHIVE_DOCUMENT_CATEGORIES.map((cat) => {
              const count = documents.filter((d) => d.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-xl font-semibold shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{cat.nameAr}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 text-[10px] font-mono">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View Mode & Page Size Selector (منع تجمد الشاشة والتعليق) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-400 font-bold">عرض بالسجل:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-transparent font-bold text-xs text-amber-600 outline-none cursor-pointer"
              >
                <option value={10}>10 وثائق</option>
                <option value={20}>20 وثيقة</option>
                <option value={50}>50 وثيقة</option>
              </select>
            </div>

            <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
                title="عرض شبكة مصغرات بصرية"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
                title="عرض جدول تفصيلي"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Documents Content View */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/60 dark:bg-slate-950">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-amber-500 mb-2" />
              <p className="text-xs">جاري تحميل إضبارة الموظف...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-3">
              <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-semibold">لا توجد وثائق في هذا القسم من الإضبارة حالياً.</p>
              <button
                type="button"
                onClick={() => setIsScannerModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 text-white font-bold text-xs shadow-xs hover:bg-amber-600 transition-colors"
              >
                ابدأ بمسح وتصوير أول وثيقة 📷
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* Visual Thumbnails Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedDocs.map((doc) => {
                const catMeta = ARCHIVE_DOCUMENT_CATEGORIES.find((c) => c.id === doc.category);
                return (
                  <div
                    key={doc.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
                  >
                    {/* Top Doc Card Header */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${catMeta?.badgeColor || 'bg-slate-100 text-slate-800'}`}>
                          {catMeta?.nameAr || 'وثيقة عامة'}
                        </span>
                        <div className="flex items-center gap-1">
                          {doc.isHandwritten && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold border border-amber-300 flex items-center gap-1">
                              <PenTool className="w-3 h-3 text-amber-600" />
                              <span>خط يد</span>
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc.id, doc.documentTitle)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors opacity-0 group-hover:opacity-100"
                            title="حذف المستند"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Doc Title */}
                      <h4
                        onClick={() => setSelectedDocForPreview(doc)}
                        className="font-bold text-xs text-slate-900 dark:text-white line-clamp-2 leading-relaxed cursor-pointer hover:text-amber-600"
                      >
                        {doc.documentTitle}
                      </h4>

                      {/* Meta info */}
                      <div className="text-[10px] text-slate-500 space-y-0.5">
                        <div className="flex justify-between">
                          <span>العدد: <strong className="font-mono text-slate-800 dark:text-slate-200">{doc.referenceNumber}</strong></span>
                          <span>التاريخ: <strong className="font-mono text-slate-800 dark:text-slate-200">{doc.documentDate}</strong></span>
                        </div>
                        <div className="truncate text-slate-400">
                          الجهة: {doc.issuingAuthority}
                        </div>
                      </div>

                      {/* Thumbnail Preview Container */}
                      <div
                        onClick={() => setSelectedDocForPreview(doc)}
                        className="relative h-32 w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer group-hover:border-amber-500 transition-colors flex items-center justify-center shadow-inner"
                      >
                        <img
                          src={doc.thumbnailUrl || doc.fileUrl}
                          alt={doc.documentTitle}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1.5">
                          <Eye className="w-4 h-4 text-amber-400" />
                          <span>معاينة وتكبير 🔍</span>
                        </div>
                      </div>

                      {/* Handwritten Note Snippet if present */}
                      {doc.handwrittenNotes && (
                        <p className="text-[10px] text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-lg border border-amber-200 dark:border-amber-900/40 line-clamp-2 font-medium">
                          {doc.handwrittenNotes}
                        </p>
                      )}
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="grid grid-cols-4 gap-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setSelectedDocForProfile(doc)}
                        className="py-1.5 px-1 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-bold text-[10px] flex items-center justify-center gap-0.5 transition-colors cursor-pointer border border-purple-200 dark:border-purple-800"
                        title="الملف التعريفي والتصنيف المتقدم للوثيقة"
                      >
                        <FileText className="w-3 h-3 text-purple-600" />
                        <span>تعريفي</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedDocForPreview(doc)}
                        className="py-1.5 px-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
                        title="معاينة"
                      >
                        <Eye className="w-3 h-3 text-amber-500" />
                        <span>معاينة</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedDocForPrint(doc)}
                        className="py-1.5 px-1 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold text-[10px] flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
                        title="طباعة مصدقة A4"
                      >
                        <Printer className="w-3 h-3 text-blue-600" />
                        <span>طباعة</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedDocForOcr(doc)}
                        className="py-1.5 px-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 font-bold text-[10px] flex items-center justify-center gap-0.5 transition-colors cursor-pointer"
                        title="قراءة وتفريغ OCR"
                      >
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>OCR</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">المصغرة</th>
                    <th className="py-2.5 px-3">عنوان الوثيقة والكتاب</th>
                    <th className="py-2.5 px-3">النوع</th>
                    <th className="py-2.5 px-3">العدد والتاريخ</th>
                    <th className="py-2.5 px-3">قراءة OCR</th>
                    <th className="py-2.5 px-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {paginatedDocs.map((doc) => {
                    const catMeta = ARCHIVE_DOCUMENT_CATEGORIES.find((c) => c.id === doc.category);
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2 px-3">
                          <div
                            onClick={() => setSelectedDocForPreview(doc)}
                            className="w-10 h-12 rounded overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer"
                          >
                            <img
                              src={doc.thumbnailUrl || doc.fileUrl}
                              alt=""
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">{doc.documentTitle}</div>
                          <div className="text-[10px] text-slate-400">{doc.issuingAuthority}</div>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${catMeta?.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                            {catMeta?.nameAr || 'عام'}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px]">
                          <div className="font-bold">{doc.referenceNumber}</div>
                          <div className="text-slate-400 text-[10px]">{doc.documentDate}</div>
                        </td>
                        <td className="py-2 px-3">
                          {doc.isHandwritten ? (
                            <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                              <PenTool className="w-3 h-3" /> خط يد
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> مطبوع
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedDocForProfile(doc)}
                              className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs cursor-pointer border border-purple-200"
                              title="الملف التعريفي والتصنيف"
                            >
                              <FileText className="w-3.5 h-3.5 text-purple-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedDocForPreview(doc)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs cursor-pointer"
                              title="معاينة"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedDocForPrint(doc)}
                              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs cursor-pointer"
                              title="طباعة"
                            >
                              <Printer className="w-3.5 h-3.5 text-blue-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedDocForOcr(doc)}
                              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs cursor-pointer"
                              title="OCR"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(doc.id, doc.documentTitle)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 text-xs cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

        {/* Pagination Toolbar (علاج تجمد الشاشة والتصفح السلس 10/20) */}
        {filteredDocs.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-slate-500 font-medium">
              عرض <strong className="text-slate-900 dark:text-white font-mono">{(currentPage - 1) * pageSize + 1}</strong> إلى{' '}
              <strong className="text-slate-900 dark:text-white font-mono">
                {Math.min(filteredDocs.length, currentPage * pageSize)}
              </strong>{' '}
              من إجمالي <strong className="text-slate-900 dark:text-white font-mono">{filteredDocs.length}</strong> وثيقة
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span>السابق</span>
                </button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-7 h-7 rounded-lg font-bold font-mono transition-colors cursor-pointer ${
                            currentPage === pageNum
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                      return <span key={pageNum} className="text-slate-400">..</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1"
                >
                  <span>التالي</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 transition-colors"
            >
              إغلاق الإضبارة
            </button>
          </div>
        )}
      </div>

      {/* Sub-modals */}
      <DocumentScannerCameraModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        initialEmployeeName={employee.fullName}
        initialEmployeeId={employee.id}
        employees={[employee]}
        onCaptureCompleted={handleCaptureCompleted}
        onDirectArchiveSaved={() => {
          loadEmployeeDocuments();
          if (onDossierUpdated) onDossierUpdated();
        }}
      />

      <EmployeeDefinitionBadgeModal
        isOpen={isBadgeModalOpen}
        onClose={() => setIsBadgeModalOpen(false)}
        employee={employee}
        organization={organization}
        onBadgeArchived={loadEmployeeDocuments}
      />

      <HandwritingOcrViewerModal
        isOpen={Boolean(selectedDocForOcr)}
        onClose={() => setSelectedDocForOcr(null)}
        document={selectedDocForOcr}
        onSaveUpdatedDoc={async (updated) => {
          await archiveService.save(updated);
          await loadEmployeeDocuments();
          setSelectedDocForOcr(null);
        }}
        onPrintDocument={(doc) => {
          setSelectedDocForPrint(doc);
        }}
      />

      {/* Full Document Preview & Lightbox */}
      <DocumentPreviewModal
        isOpen={Boolean(selectedDocForPreview)}
        onClose={() => setSelectedDocForPreview(null)}
        document={selectedDocForPreview}
        allDossierDocs={filteredDocs}
        onSelectAnotherDoc={(nextDoc) => setSelectedDocForPreview(nextDoc)}
        onOpenOcrViewer={(doc) => {
          setSelectedDocForPreview(null);
          setSelectedDocForOcr(doc);
        }}
        onOpenPrintModal={(doc) => {
          setSelectedDocForPrint(doc);
        }}
      />

      {/* Official Archival Print Modal */}
      <OfficialDocumentPrintModal
        isOpen={Boolean(selectedDocForPrint)}
        onClose={() => setSelectedDocForPrint(null)}
        document={selectedDocForPrint}
        employee={employee}
        organization={organization}
      />

      {/* Dynamic Document Profile Modal (الملف التعريفي والتصنيف المتقدم) */}
      <DocumentProfileModal
        isOpen={Boolean(selectedDocForProfile)}
        onClose={() => setSelectedDocForProfile(null)}
        document={selectedDocForProfile}
        employees={employee ? [employee] : []}
        onSaveProfile={async (updated) => {
          await archiveService.save(updated);
          await loadEmployeeDocuments();
          if (onDossierUpdated) onDossierUpdated();
          setSelectedDocForProfile(null);
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
    </div>
  );
};
