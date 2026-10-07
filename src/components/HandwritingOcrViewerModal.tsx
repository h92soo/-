import React, { useState } from 'react';
import {
  X,
  FileText,
  PenTool,
  CheckCircle2,
  Copy,
  Printer,
  Download,
  Search,
  Sparkles,
  Edit3,
  Save,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ShieldCheck,
  Tag,
  Calendar,
  Hash,
  Building2,
} from 'lucide-react';
import { ArchivedDocument } from '../types';
import { soundEffects } from '../utils/soundEffects';
import { toast } from './ToastNotification';

interface HandwritingOcrViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ArchivedDocument | null;
  onSaveUpdatedDoc?: (updated: ArchivedDocument) => void;
  onPrintDocument?: (doc: ArchivedDocument) => void;
}

export const HandwritingOcrViewerModal: React.FC<HandwritingOcrViewerModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  onSaveUpdatedDoc,
  onPrintDocument,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedText, setEditedText] = useState<string>('');
  const [editedNotes, setEditedNotes] = useState<string>('');
  const [editedRefNumber, setEditedRefNumber] = useState<string>('');
  const [editedDocDate, setEditedDocDate] = useState<string>('');

  React.useEffect(() => {
    if (doc) {
      setEditedText(doc.ocrExtractedText || '');
      setEditedNotes(doc.handwrittenNotes || '');
      setEditedRefNumber(doc.referenceNumber || '');
      setEditedDocDate(doc.documentDate || '');
      setIsEditing(false);
      setZoomLevel(100);
    }
  }, [doc]);

  if (!isOpen || !doc) return null;

  const handleCopyText = () => {
    soundEffects.playButtonClick();
    navigator.clipboard.writeText(editedText || doc.ocrExtractedText || '');
    toast.success('تم نسخ النص المستخرج بالكامل إلى الحافظة.');
  };

  const handleSaveEdits = () => {
    soundEffects.playSuccess();
    const updated: ArchivedDocument = {
      ...doc,
      ocrExtractedText: editedText,
      handwrittenNotes: editedNotes,
      referenceNumber: editedRefNumber,
      documentDate: editedDocDate,
      ocrStatus: 'manual_verified',
      updatedAt: new Date().toISOString(),
    };
    if (onSaveUpdatedDoc) {
      onSaveUpdatedDoc(updated);
    }
    setIsEditing(false);
    toast.success('تم حفظ وتدقيق نصوص المستند بنجاح.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in no-print">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  قارئ المستندات وتفريغ الخط اليدوي الذكي (Tesseract OCR)
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>دقة التعرف: {doc.ocrConfidence || 92}%</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {doc.documentTitle} — {doc.employeeName} ({doc.department})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onPrintDocument && (
              <button
                type="button"
                onClick={() => onPrintDocument(doc)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors"
                title="طباعة نسخة مصدقة طبق الأصل"
              >
                <Printer className="w-4 h-4 text-blue-500" />
                <span>طباعة مصدقة A4</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Split View: Document on Left / OCR Transcribed on Right (RTL: Document on Right, OCR on Left) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-slate-200 dark:divide-slate-800">
          {/* Side 1: Scanned Document Image with Zoom Controls */}
          <div className="flex flex-col h-full bg-slate-950 overflow-hidden">
            {/* Image Toolbar */}
            <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
              <span className="font-bold flex items-center gap-1.5 text-amber-400">
                <FileText className="w-3.5 h-3.5" />
                <span>الوثيقة الأصلية الممسوحة</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  title="تصغير"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] px-1.5">{zoomLevel}%</span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(220, z + 15))}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  title="تكبير"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(100)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold"
                  title="إعادة ضبط الحجم"
                >
                  100%
                </button>
              </div>
            </div>

            {/* Document Viewer Frame */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[300px]">
              <div
                style={{
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-w-full shadow-2xl rounded-lg overflow-hidden border border-slate-700 bg-white"
              >
                <img
                  src={doc.fileUrl}
                  alt={doc.documentTitle}
                  className="max-h-[520px] w-auto object-contain block"
                />
              </div>
            </div>

            {/* Bottom Meta Pill */}
            <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>المصدر: {doc.source === 'scanner' ? 'ماسح ضوئي مكتبي' : doc.source === 'camera' ? 'كاميرا حية' : 'ملف محفوظ'}</span>
              <span>خزانة: {doc.archiveCabinet}</span>
            </div>
          </div>

          {/* Side 2: Transcribed Text & OCR Engine Results */}
          <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/80 overflow-y-auto p-5 space-y-4">
            {/* Quick Metadata Card */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>البيانات الرسمية المستخرجة آلياً:</span>
                </span>
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>تعديل وتدقيق</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveEdits}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>حفظ التعديل</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">العدد / الصادر:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedRefNumber}
                      onChange={(e) => setEditedRefNumber(e.target.value)}
                      className="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                    />
                  ) : (
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                      {editedRefNumber || 'غير محدد'}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">تاريخ الوثيقة:</span>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editedDocDate}
                      onChange={(e) => setEditedDocDate(e.target.value)}
                      className="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                    />
                  ) : (
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                      {editedDocDate || 'غير محدد'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Handwritten Marginal Notes (الهوامش والتهميشات اليدوية) */}
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <PenTool className="w-4 h-4 text-amber-600" />
                  <span>الهوامش والتهميشات المكتوبة بخط اليد:</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold">
                  ✍️ خط يد
                </span>
              </div>
              {isEditing ? (
                <textarea
                  rows={2}
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  className="w-full p-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 font-medium"
                />
              ) : (
                <p className="text-xs text-amber-950 dark:text-amber-200 font-semibold leading-relaxed bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
                  {editedNotes || 'لا توجد هوامش خطية ملحوظة في هذا المستند.'}
                </p>
              )}
            </div>

            {/* Full OCR Transcribed Text Box */}
            <div className="space-y-2 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <span>النص الكامل المفرغ (Searchable OCR Text):</span>
                </label>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ النص</span>
                </button>
              </div>

              {isEditing ? (
                <textarea
                  rows={8}
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="w-full flex-1 p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-slate-200 leading-relaxed shadow-inner"
                />
              ) : (
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-mono leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto shadow-inner select-text">
                  {editedText || 'جاري التعرف على النصوص...'}
                </div>
              )}
            </div>

            {/* Auto-Indexed Keywords */}
            {doc.detectedKeywords && doc.detectedKeywords.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-amber-500" />
                  <span>الكلمات المفتاحية المفهرسة آلياً في محرك البحث:</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {doc.detectedKeywords.map((kw, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            تمت الأرشفة بواسطة: <strong className="text-slate-700 dark:text-slate-300">{doc.archivedBy}</strong> ({new Date(doc.createdAt).toLocaleDateString('ar-IQ')})
          </span>
          <div className="flex items-center gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={handleSaveEdits}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-md cursor-pointer"
              >
                اعتماد وتحديث المستند ⚡
              </button>
            )}
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
    </div>
  );
};
