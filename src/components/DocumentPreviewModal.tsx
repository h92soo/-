import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  FileText,
  PenTool,
  Calendar,
  Building2,
  ShieldCheck,
  Tag,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Eye,
} from 'lucide-react';
import { ArchivedDocument, ARCHIVE_DOCUMENT_CATEGORIES } from '../types';
import { soundEffects } from '../utils/soundEffects';
import { toast } from './ToastNotification';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ArchivedDocument | null;
  allDossierDocs?: ArchivedDocument[];
  onSelectAnotherDoc?: (doc: ArchivedDocument) => void;
  onOpenOcrViewer?: (doc: ArchivedDocument) => void;
  onOpenPrintModal?: (doc: ArchivedDocument) => void;
  onOpenProfileModal?: (doc: ArchivedDocument) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  document: currentDoc,
  allDossierDocs = [],
  onSelectAnotherDoc,
  onOpenOcrViewer,
  onOpenPrintModal,
  onOpenProfileModal,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [showMetadataPanel, setShowMetadataPanel] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      setZoomLevel(100);
      setRotationDegrees(0);
    }
  }, [isOpen, currentDoc?.id]);

  if (!isOpen || !currentDoc) return null;

  const catMeta = ARCHIVE_DOCUMENT_CATEGORIES.find((c) => c.id === currentDoc.category);

  const handleZoomIn = () => {
    soundEffects.playButtonClick();
    setZoomLevel((prev) => Math.min(250, prev + 25));
  };

  const handleZoomOut = () => {
    soundEffects.playButtonClick();
    setZoomLevel((prev) => Math.max(50, prev - 25));
  };

  const handleRotate = () => {
    soundEffects.playButtonClick();
    setRotationDegrees((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    soundEffects.playButtonClick();
    setZoomLevel(100);
    setRotationDegrees(0);
  };

  const handleDownload = () => {
    soundEffects.playButtonClick();
    if (!currentDoc.fileUrl) return;
    const a = document.createElement('a');
    a.href = currentDoc.fileUrl;
    a.download = currentDoc.fileName || `${currentDoc.documentTitle}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('تم تنزيل نسخة من المستند بنجاح.');
  };

  // Find index in dossier for next/previous navigation
  const currentIndex = allDossierDocs.findIndex((d) => d.id === currentDoc.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allDossierDocs.length - 1;

  const handlePrevDoc = () => {
    if (hasPrev && onSelectAnotherDoc) {
      soundEffects.playButtonClick();
      onSelectAnotherDoc(allDossierDocs[currentIndex - 1]);
    }
  };

  const handleNextDoc = () => {
    if (hasNext && onSelectAnotherDoc) {
      soundEffects.playButtonClick();
      onSelectAnotherDoc(allDossierDocs[currentIndex + 1]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fade-in no-print">
      <div className="relative w-full max-w-6xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[94vh]">
        {/* Top Header Bar */}
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {currentDoc.documentTitle}
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${catMeta?.badgeColor || 'bg-slate-100 text-slate-800'}`}>
                  {catMeta?.nameAr || 'وثيقة عامة'}
                </span>
                {currentDoc.isHandwritten && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-bold border border-amber-300 flex items-center gap-1">
                    <PenTool className="w-3 h-3 text-amber-600" />
                    <span>مخطوط باليد</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                الموظف: {currentDoc.employeeName} ({currentDoc.employeeNumber}) — {currentDoc.department}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {onOpenPrintModal && (
              <button
                type="button"
                onClick={() => onOpenPrintModal(currentDoc)}
                className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 font-bold text-xs flex items-center gap-1.5 transition-colors border border-blue-200 dark:border-blue-800 cursor-pointer"
                title="طباعة نسخة مصدقة طبق الأصل"
              >
                <Printer className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">طباعة مصدقة A4</span>
              </button>
            )}

            {onOpenOcrViewer && (
              <button
                type="button"
                onClick={() => onOpenOcrViewer(currentDoc)}
                className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 font-bold text-xs flex items-center gap-1.5 transition-colors border border-amber-200 dark:border-amber-800 cursor-pointer"
                title="قراءة وتفريغ النص بالـ OCR"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span className="hidden sm:inline">تفريغ الـ OCR</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownload}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="تنزيل الملف"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Main Visual Document Canvas */}
          <div className="flex-1 bg-slate-950 flex flex-col relative overflow-hidden">
            {/* Viewport Toolbar */}
            <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300 z-10">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  title="تصغير"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] px-1.5 min-w-[42px] text-center">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  title="تكبير"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors ml-1"
                  title="تدوير 90 درجة"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold"
                  title="إعادة ضبط"
                >
                  100%
                </button>
              </div>

              {/* Prev / Next Document in Dossier */}
              {allDossierDocs.length > 1 && (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-400 font-mono ml-2">
                    {currentIndex + 1} / {allDossierDocs.length}
                  </span>
                  <button
                    type="button"
                    disabled={!hasPrev}
                    onClick={handlePrevDoc}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="الوثيقة السابقة"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={!hasNext}
                    onClick={handleNextDoc}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="الوثيقة التالية"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Document Image Display Container */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
              <div
                style={{
                  transform: `scale(${zoomLevel / 100}) rotate(${rotationDegrees}deg)`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-w-full max-h-full flex items-center justify-center select-none"
              >
                {currentDoc.fileUrl ? (
                  <img
                    src={currentDoc.fileUrl}
                    alt={currentDoc.documentTitle}
                    className="max-h-[600px] w-auto object-contain rounded-lg shadow-2xl border border-slate-700/60 block bg-white"
                  />
                ) : (
                  <div className="p-8 text-center text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-slate-600" />
                    <p className="text-xs">المستند غير متوفر كصورة</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Thumbnail Strip (Visual Dossier Browser) */}
            {allDossierDocs.length > 1 && (
              <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-[10px] text-slate-400 font-bold shrink-0 ml-1">
                  وثائق الإضبارة ({allDossierDocs.length}):
                </span>
                {allDossierDocs.map((doc, idx) => {
                  const isSelected = doc.id === currentDoc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => onSelectAnotherDoc && onSelectAnotherDoc(doc)}
                      className={`relative h-14 w-12 rounded-lg overflow-hidden shrink-0 border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-amber-500 ring-2 ring-amber-500/50 scale-105'
                          : 'border-slate-700 opacity-60 hover:opacity-100 hover:border-slate-500'
                      }`}
                      title={`${doc.documentTitle} (${idx + 1})`}
                    >
                      <img
                        src={doc.thumbnailUrl || doc.fileUrl}
                        alt={doc.documentTitle}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                      {doc.isHandwritten && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-amber-500 rounded-tl flex items-center justify-center text-[7px] text-black font-bold">
                          ✍️
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Side Details & OCR Card (Expandable / Toggleable) */}
          <div className="w-full lg:w-80 bg-slate-50 dark:bg-slate-900 border-t lg:border-t-0 lg:border-r border-slate-200 dark:border-slate-800 p-5 overflow-y-auto space-y-4">
            <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>بطاقة الأرشفة والبيانات الرسمية</span>
            </h4>

            {/* Metadata Fields */}
            <div className="space-y-2.5 text-xs">
              <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                <span className="text-[10px] text-slate-400 block">رقم الصادر / العدد:</span>
                <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {currentDoc.referenceNumber || 'غير محدد'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">تاريخ الوثيقة:</span>
                  <div className="font-mono font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                    {currentDoc.documentDate}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">التصنيف الأمني:</span>
                  <span className="text-[11px] font-bold text-amber-600">
                    {currentDoc.confidentiality === 'confidential' ? 'سري' : currentDoc.confidentiality === 'top_secret' ? 'سري للغاية' : 'عادي'}
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] text-slate-400 block">الجهة المصدرة:</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  {currentDoc.issuingAuthority}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] text-slate-400 block">موقع الإضبارة في الأرشيف المكتبي:</span>
                <div className="font-mono text-xs text-slate-900 dark:text-slate-100 font-bold">
                  {currentDoc.archiveCabinet}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  كود الفولدر: {currentDoc.archiveFolderCode}
                </div>
              </div>

              {/* OCR Text / Handwritten Note Snippet */}
              {(currentDoc.handwrittenNotes || currentDoc.ocrExtractedText) && (
                <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                      <PenTool className="w-3.5 h-3.5" />
                      <span>تفريغ الـ OCR المقروء:</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-mono font-bold">
                      {currentDoc.ocrConfidence || 95}% دقة
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-800 dark:text-slate-200 line-clamp-6 leading-relaxed whitespace-pre-wrap font-medium">
                    {currentDoc.handwrittenNotes || currentDoc.ocrExtractedText}
                  </p>
                </div>
              )}
              {/* Custom Dynamic Metadata Attributes if any */}
              {currentDoc.customAttributes && currentDoc.customAttributes.length > 0 && (
                <div className="bg-purple-50/70 dark:bg-purple-950/30 p-3 rounded-xl border border-purple-200 dark:border-purple-900/50 space-y-1.5">
                  <span className="text-[10px] font-bold text-purple-900 dark:text-purple-300 block">
                    خصائص الملف التعريفي الديناميكية:
                  </span>
                  <div className="grid grid-cols-1 gap-1">
                    {currentDoc.customAttributes.map((attr, idx) => (
                      <div key={idx} className="flex justify-between text-[11px] py-0.5 border-b border-purple-100 dark:border-purple-900/30">
                        <span className="text-slate-500">{attr.label}:</span>
                        <strong className="text-slate-900 dark:text-slate-100 font-semibold">{attr.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Print, OCR, and Document Profile Triggers */}
            <div className="pt-2 space-y-2">
              {onOpenProfileModal && (
                <button
                  type="button"
                  onClick={() => onOpenProfileModal(currentDoc)}
                  className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>تعديل الملف التعريفي والتصنيف 📋</span>
                </button>
              )}

              {onOpenPrintModal && (
                <button
                  type="button"
                  onClick={() => onOpenPrintModal(currentDoc)}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة مصدقة طبق الأصل 🖨️</span>
                </button>
              )}

              {onOpenOcrViewer && (
                <button
                  type="button"
                  onClick={() => onOpenOcrViewer(currentDoc)}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <PenTool className="w-4 h-4" />
                  <span>تعديل وقراءة نصوص خط اليد ✍️</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
