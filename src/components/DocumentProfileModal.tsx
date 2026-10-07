import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Save,
  Building2,
  Calendar,
  Hash,
  Tag,
  ShieldCheck,
  FolderOpen,
  Printer,
  Eye,
  Plus,
  Trash2,
  CheckCircle2,
  Layers,
  Sparkles,
  HelpCircle,
  Archive,
} from 'lucide-react';
import {
  ArchivedDocument,
  ArchivedDocumentCategory,
  ARCHIVE_DOCUMENT_CATEGORIES,
  DocumentClassificationLevel,
  Employee,
} from '../types';
import { soundEffects } from '../utils/soundEffects';
import { toast } from './ToastNotification';

interface DocumentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ArchivedDocument | null;
  employees: Employee[];
  onSaveProfile: (updatedDoc: ArchivedDocument) => void;
  onOpenEmployeeDossier?: (employee: Employee) => void;
  onOpenPreview?: (doc: ArchivedDocument) => void;
  onOpenPrint?: (doc: ArchivedDocument) => void;
}

export const DocumentProfileModal: React.FC<DocumentProfileModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  employees,
  onSaveProfile,
  onOpenEmployeeDossier,
  onOpenPreview,
  onOpenPrint,
}) => {
  const [formData, setFormData] = useState<{
    referenceNumber: string;
    documentDate: string;
    hijriDate: string;
    issuingAuthority: string;
    recipientParty: string;
    documentTitle: string;
    category: ArchivedDocumentCategory;
    confidentiality: DocumentClassificationLevel;
    archiveCabinet: string;
    archiveFolderCode: string;
    notes: string;
    tags: string[];
    customAttributes: Array<{ key: string; label: string; value: string }>;
  }>({
    referenceNumber: '',
    documentDate: '',
    hijriDate: '',
    issuingAuthority: '',
    recipientParty: '',
    documentTitle: '',
    category: 'administrative_order',
    confidentiality: 'normal',
    archiveCabinet: '',
    archiveFolderCode: '',
    notes: '',
    tags: [],
    customAttributes: [],
  });

  const [newTagInput, setNewTagInput] = useState<string>('');
  const [newCustomKey, setNewCustomKey] = useState<string>('');
  const [newCustomValue, setNewCustomValue] = useState<string>('');

  useEffect(() => {
    if (doc) {
      setFormData({
        referenceNumber: doc.referenceNumber || '',
        documentDate: doc.documentDate || '',
        hijriDate: doc.hijriDate || '',
        issuingAuthority: doc.issuingAuthority || '',
        recipientParty: doc.recipientParty || '',
        documentTitle: doc.documentTitle || '',
        category: doc.category || 'administrative_order',
        confidentiality: doc.confidentiality || 'normal',
        archiveCabinet: doc.archiveCabinet || '',
        archiveFolderCode: doc.archiveFolderCode || '',
        notes: doc.notes || '',
        tags: doc.tags || doc.detectedKeywords || [],
        customAttributes: doc.customAttributes || [],
      });
    }
  }, [doc]);

  if (!isOpen || !doc) return null;

  const targetEmp = employees.find((e) => e.id === doc.employeeId);
  const catMeta = ARCHIVE_DOCUMENT_CATEGORIES.find((c) => c.id === formData.category);

  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const tag = newTagInput.trim();
    if (!formData.tags.includes(tag)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }));
  };

  const handleAddCustomAttribute = () => {
    if (!newCustomKey.trim() || !newCustomValue.trim()) {
      toast.warning('يرجى كتابة اسم الخاصية وقيمتها أولاً.');
      return;
    }
    const newAttr = {
      key: `custom_${Date.now()}`,
      label: newCustomKey.trim(),
      value: newCustomValue.trim(),
    };
    setFormData((prev) => ({
      ...prev,
      customAttributes: [...prev.customAttributes, newAttr],
    }));
    setNewCustomKey('');
    setNewCustomValue('');
    toast.success('تمت إضافة الخاصية الديناميكية بنجاح.');
  };

  const handleRemoveCustomAttribute = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      customAttributes: prev.customAttributes.filter((_, idx) => idx !== index),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundEffects.playSuccess();
    const updated: ArchivedDocument = {
      ...doc,
      referenceNumber: formData.referenceNumber.trim(),
      documentDate: formData.documentDate,
      hijriDate: formData.hijriDate.trim(),
      issuingAuthority: formData.issuingAuthority.trim(),
      recipientParty: formData.recipientParty.trim(),
      documentTitle: formData.documentTitle.trim(),
      category: formData.category,
      confidentiality: formData.confidentiality,
      archiveCabinet: formData.archiveCabinet.trim(),
      archiveFolderCode: formData.archiveFolderCode.trim(),
      notes: formData.notes.trim(),
      tags: formData.tags,
      customAttributes: formData.customAttributes,
      updatedAt: new Date().toISOString(),
    };
    onSaveProfile(updated);
    toast.success('تم حفظ وتحديث الملف التعريفي المتقدم للمستند بنجاح! 📋');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fade-in no-print">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  الملف التعريفي والتصنيف الديناميكي للمستند
                </h3>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-md font-bold border ${catMeta?.badgeColor || 'bg-slate-100 text-slate-800'}`}>
                  {catMeta?.nameAr || 'وثيقة رسمية'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                إدارة الخصائص التعريفية الرسمية (رقم الوثيقة، تاريخ الإصدار، الجهة المصدرة، التصنيف الأمني والبيانات الحقلية)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {targetEmp && onOpenEmployeeDossier && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEmployeeDossier(targetEmp);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="عرض كافة مستندات هذا الموظف داخل إضبارته في واجهة واحدة"
              >
                <FolderOpen className="w-4 h-4" />
                <span>إضبارة الموظف الموحدة 📁</span>
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

        {/* Unified Employee Link Banner (المطلوب في الاستفسار بدقة) */}
        {targetEmp && (
          <div className="px-6 py-3 bg-indigo-50/70 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">
                👤 صاحب الإضبارة:
              </span>
              <strong className="text-slate-900 dark:text-white font-bold text-sm">
                {targetEmp.fullName}
              </strong>
              <span className="text-slate-500 font-mono">({targetEmp.employeeNumber})</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-600 dark:text-slate-300">{targetEmp.department}</span>
            </div>

            {onOpenEmployeeDossier && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEmployeeDossier(targetEmp);
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>عرض كافة المستندات المرتبطة بهذا الموظف في إضبارته 📂</span>
              </button>
            )}
          </div>
        )}

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Main Attributes Section (رقم الوثيقة، تاريخ الإصدار، الجهة المصدرة) */}
          <div className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
              <Hash className="w-4 h-4 text-amber-500" />
              <span>البيانات الثبوتية والتعريفية الأساسية (Core Document Identification)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* عنوان الوثيقة */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span>عنوان الوثيقة أو موضوع الكتاب الرسمي: *</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.documentTitle}
                  onChange={(e) => setFormData({ ...formData, documentTitle: e.target.value })}
                  placeholder="مثال: أمر إداري بالترفيع وتعديل العنوان الوظيفي"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* رقم الوثيقة / العدد الرسمي */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-amber-600" />
                  <span>رقم الوثيقة / العدد (الصادر أو الوارد): *</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  placeholder="مثال: 1429 / إ / 2026"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* تاريخ الإصدار (ميلادي) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                  <span>تاريخ الإصدار (الميلادي): *</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.documentDate}
                  onChange={(e) => setFormData({ ...formData, documentDate: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* الجهة المصدرة */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                  <span>الجهة المصدرة للوثيقة: *</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.issuingAuthority}
                  onChange={(e) => setFormData({ ...formData, issuingAuthority: e.target.value })}
                  placeholder="مثال: وزارة الموارد المائية - الدائرة القانونية والإدارية"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* الجهة الوارد إليها / المعنية */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-teal-500" />
                  <span>الجهة المعنية / المستلمة (إلى):</span>
                </label>
                <input
                  type="text"
                  value={formData.recipientParty}
                  onChange={(e) => setFormData({ ...formData, recipientParty: e.target.value })}
                  placeholder="مثال: قسم إدارة الموارد البشرية / شعبة الأرشفة"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Classification & Security Level */}
          <div className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>التصنيف المتقدم ودرجة السرية والموقع الورقي</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* تصنيف الوثيقة */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200">
                  تصنيف ونوع الوثيقة: *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-xs text-slate-800 dark:text-slate-100"
                >
                  {ARCHIVE_DOCUMENT_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              {/* درجة السرية */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200">
                  درجة السرية والتصنيف الأمني:
                </label>
                <select
                  value={formData.confidentiality}
                  onChange={(e) => setFormData({ ...formData, confidentiality: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-xs text-slate-800 dark:text-slate-100"
                >
                  <option value="normal">عادي (متاح لشؤون الموظفين)</option>
                  <option value="confidential">سري (مقيد الصلاحيات)</option>
                  <option value="top_secret">سري للغاية وشخصي</option>
                  <option value="urgent">عاجل وفوري</option>
                </select>
              </div>

              {/* موقع الخزانة الورقية */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200">
                  موقع الحفظ في الأرشيف المكتبي:
                </label>
                <input
                  type="text"
                  value={formData.archiveCabinet}
                  onChange={(e) => setFormData({ ...formData, archiveCabinet: e.target.value })}
                  placeholder="خزانة A-1 / رف 2 / إضبارة 4"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Custom Metadata Attributes (الخصائص والملفات التعريفية المخصصة الديناميكية) */}
          <div className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-500" />
                <span>الخصائص التعريفية الديناميكية المخصصة (Custom Dynamic Attributes)</span>
              </h4>
              <span className="text-[10px] text-slate-400">
                إضافة حقول إضافية غير محدودة خاصة بهذا المستند
              </span>
            </div>

            {/* List of existing custom attributes */}
            {formData.customAttributes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {formData.customAttributes.map((attr, idx) => (
                  <div
                    key={attr.key || idx}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">{attr.label}:</span>
                      <strong className="text-slate-900 dark:text-slate-100 text-xs font-semibold">
                        {attr.value}
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomAttribute(idx)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="حذف الخاصية"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-xs italic">
                لم يتم تعريف حقول مخصصة لهذا المستند بعد. يمكنك إضافة حقول مثل (رقم القرار، مدة الإجازة، الكفيل، النسبة المئوية).
              </p>
            )}

            {/* Form to add a new custom attribute */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="اسم الخاصية (مثال: مدة الإجازة)"
                value={newCustomKey}
                onChange={(e) => setNewCustomKey(e.target.value)}
                className="flex-1 min-w-[140px] p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
              <input
                type="text"
                placeholder="القيمة (مثال: 15 يوماً براتب تام)"
                value={newCustomValue}
                onChange={(e) => setNewCustomValue(e.target.value)}
                className="flex-1 min-w-[140px] p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              />
              <button
                type="button"
                onClick={handleAddCustomAttribute}
                className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة خاصية</span>
              </button>
            </div>
          </div>

          {/* Tags & Keywords */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-indigo-500" />
              <span>الوسوم والكلمات الدلالية المفهرسة (Tags & Keywords)</span>
            </h4>

            <div className="flex flex-wrap items-center gap-1.5">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold text-xs border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-rose-600 text-slate-400 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="أضف وسم جديد..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-100 font-bold text-xs cursor-pointer"
              >
                إضافة وسم
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 dark:text-slate-200">
              ملاحظات وتوجيهات الحفظ الإداري:
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="أي ملاحظات أو قيود أو تواريخ مراجعة..."
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          {/* Bottom Action Footer inside Modal */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {onOpenPreview && (
                <button
                  type="button"
                  onClick={() => onOpenPreview(doc)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-500" />
                  <span>معاينة الوثيقة</span>
                </button>
              )}
              {onOpenPrint && (
                <button
                  type="button"
                  onClick={() => onOpenPrint(doc)}
                  className="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-bold text-xs flex items-center gap-1.5 border border-blue-200 dark:border-blue-800 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-600" />
                  <span>طباعة مصدقة A4</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>حفظ الملف التعريفي 💾</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
