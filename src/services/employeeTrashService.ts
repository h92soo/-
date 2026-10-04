/**
 * مخزن سلة المهملات وسجل التراجع للموظفين المحذوفين
 * Employee Trash & Undo/Redo Audit Service
 * 
 * يتيح نقل الموظف المحذوف إلى جدول مؤقت / سلة مهملات (Trash)
 * بدلاً من حذفه نهائياً مباشرة، مما يوفر نظام Undo / Redo فوري
 * واستعادة الموظف أو حذفه نهائياً أو إفراغ السلة بالكامل.
 */

import { Employee } from '../types';

export interface TrashedEmployeeRecord {
  id: string; // Unique trash record ID
  employee: Employee; // Snapshot of employee data
  deletedAt: string; // ISO timestamp
  deletedBy?: string; // User who deleted
  reason?: string; // Reason or action source (e.g. single delete, batch delete)
}

export interface TrashHistoryAction {
  type: 'delete' | 'restore';
  records: TrashedEmployeeRecord[];
  timestamp: string;
}

const TRASH_STORAGE_KEY = 'gov_emp_trash_records_v1';
const UNDO_STACK_KEY = 'gov_emp_undo_stack_v1';
const REDO_STACK_KEY = 'gov_emp_redo_stack_v1';

// Max records in trash to prevent unbounded memory growth
const MAX_TRASH_RECORDS = 200;

// Listeners for reactive updates
type TrashChangeListener = () => void;
const listeners: Set<TrashChangeListener> = new Set();

export function subscribeTrashChanges(listener: TrashChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyTrashChanged() {
  listeners.forEach((l) => {
    try {
      l();
    } catch (e) {
      console.error('Trash listener error:', e);
    }
  });
}

/**
 * الحصول على كافة الموظفين في سلة المهملات
 */
export function getTrashedEmployees(): TrashedEmployeeRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(TRASH_STORAGE_KEY) || localStorage.getItem(TRASH_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load trashed employees:', e);
    return [];
  }
}

/**
 * حفظ قائمة سلة المهملات
 */
function saveTrashedEmployees(records: TrashedEmployeeRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = records.slice(0, MAX_TRASH_RECORDS);
    const dataStr = JSON.stringify(trimmed);
    sessionStorage.setItem(TRASH_STORAGE_KEY, dataStr);
    localStorage.setItem(TRASH_STORAGE_KEY, dataStr);
    notifyTrashChanged();
  } catch (e) {
    console.error('Failed to save trashed employees:', e);
  }
}

/**
 * الحصول على مكدس التراجع Undo Stack
 */
function getUndoStack(): TrashHistoryAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(UNDO_STACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * حفظ مكدس التراجع Undo Stack
 */
function saveUndoStack(stack: TrashHistoryAction[]): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(UNDO_STACK_KEY, JSON.stringify(stack.slice(-30)));
    notifyTrashChanged();
  } catch {}
}

/**
 * الحصول على مكدس الإعادة Redo Stack
 */
function getRedoStack(): TrashHistoryAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(REDO_STACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * حفظ مكدس الإعادة Redo Stack
 */
function saveRedoStack(stack: TrashHistoryAction[]): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(REDO_STACK_KEY, JSON.stringify(stack.slice(-30)));
    notifyTrashChanged();
  } catch {}
}

/**
 * نقل موظف أو أكثر إلى سلة المهملات مع تسجيل عملية الحذف في مكدس التراجع
 */
export function moveToTrash(
  employees: Employee[],
  deletedBy = 'مدير النظام',
  reason = 'حذف عادي'
): TrashedEmployeeRecord[] {
  if (!employees || employees.length === 0) return [];

  const existingTrash = getTrashedEmployees();
  const now = new Date().toISOString();

  const newRecords: TrashedEmployeeRecord[] = employees.map((emp) => ({
    id: `trash-${emp.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    employee: { ...emp },
    deletedAt: now,
    deletedBy,
    reason,
  }));

  // Add to trash list (newest first)
  const updatedTrash = [...newRecords, ...existingTrash];
  saveTrashedEmployees(updatedTrash);

  // Push action to Undo stack
  const undoStack = getUndoStack();
  undoStack.push({
    type: 'delete',
    records: newRecords,
    timestamp: now,
  });
  saveUndoStack(undoStack);

  // Clear redo stack on new deletion action
  saveRedoStack([]);

  return newRecords;
}

/**
 * استرجاع موظف محدد من سلة المهملات
 */
export function restoreFromTrash(trashRecordId: string): Employee | null {
  const currentTrash = getTrashedEmployees();
  const targetIndex = currentTrash.findIndex((r) => r.id === r.id && (r.id === trashRecordId || r.employee.id === trashRecordId));

  if (targetIndex === -1) return null;

  const targetRecord = currentTrash[targetIndex];
  const updatedTrash = currentTrash.filter((_, idx) => idx !== targetIndex);
  saveTrashedEmployees(updatedTrash);

  // Push to redo stack or adjust undo stack
  const undoStack = getUndoStack();
  undoStack.push({
    type: 'restore',
    records: [targetRecord],
    timestamp: new Date().toISOString(),
  });
  saveUndoStack(undoStack);

  return targetRecord.employee;
}

/**
 * استرجاع كافة الموظفين في سلة المهملات
 */
export function restoreAllFromTrash(): Employee[] {
  const currentTrash = getTrashedEmployees();
  if (currentTrash.length === 0) return [];

  const restoredEmployees = currentTrash.map((r) => r.employee);
  saveTrashedEmployees([]);

  const undoStack = getUndoStack();
  undoStack.push({
    type: 'restore',
    records: currentTrash,
    timestamp: new Date().toISOString(),
  });
  saveUndoStack(undoStack);

  return restoredEmployees;
}

/**
 * حذف نهائي لموظف محدد من سلة المهملات (لا يمكن استعادته بعدها)
 */
export function permanentlyDeleteFromTrash(trashRecordId: string): boolean {
  const currentTrash = getTrashedEmployees();
  const filtered = currentTrash.filter((r) => r.id !== trashRecordId && r.employee.id !== trashRecordId);
  if (filtered.length === currentTrash.length) return false;
  saveTrashedEmployees(filtered);
  return true;
}

/**
 * إفراغ سلة المهملات بالكامل نهائياً
 */
export function emptyTrash(): void {
  saveTrashedEmployees([]);
  saveUndoStack([]);
  saveRedoStack([]);
}

/**
 * فحص إمكانية التراجع (Undo)
 */
export function canUndo(): boolean {
  return getUndoStack().length > 0;
}

/**
 * فحص إمكانية الإعادة (Redo)
 */
export function canRedo(): boolean {
  return getRedoStack().length > 0;
}

/**
 * تنفيذ عملية التراجع (Undo)
 * يعيد كائناً يحدد ما تم استعادته أو حذفه
 */
export function executeUndo(): {
  action: 'restored' | 'deleted' | null;
  employees: Employee[];
  message: string;
} {
  const undoStack = getUndoStack();
  if (undoStack.length === 0) {
    return { action: null, employees: [], message: 'لا توجد عمليات للتراجع عنها.' };
  }

  const lastAction = undoStack.pop()!;
  saveUndoStack(undoStack);

  const redoStack = getRedoStack();
  redoStack.push(lastAction);
  saveRedoStack(redoStack);

  if (lastAction.type === 'delete') {
    // The previous action was a deletion: Undo means RESTORE these employees!
    const restoredEmployees = lastAction.records.map((r) => r.employee);
    const restoredIds = new Set(lastAction.records.map((r) => r.id));
    
    // Remove restored records from trash
    const currentTrash = getTrashedEmployees();
    const updatedTrash = currentTrash.filter((r) => !restoredIds.has(r.id));
    saveTrashedEmployees(updatedTrash);

    const names = restoredEmployees.map((e) => e.fullName).join('، ');
    return {
      action: 'restored',
      employees: restoredEmployees,
      message: `تم التراجع واستعادة (${restoredEmployees.length}) موظف: ${names}`,
    };
  } else {
    // The previous action was a restore: Undo means DELETE / MOVE BACK TO TRASH
    const currentTrash = getTrashedEmployees();
    const updatedTrash = [...lastAction.records, ...currentTrash];
    saveTrashedEmployees(updatedTrash);

    const redeletedEmployees = lastAction.records.map((r) => r.employee);
    const names = redeletedEmployees.map((e) => e.fullName).join('، ');
    return {
      action: 'deleted',
      employees: redeletedEmployees,
      message: `تم التراجع وإعادة (${redeletedEmployees.length}) موظف لسلة المهملات: ${names}`,
    };
  }
}

/**
 * تنفيذ عملية الإعادة (Redo)
 */
export function executeRedo(): {
  action: 'restored' | 'deleted' | null;
  employees: Employee[];
  message: string;
} {
  const redoStack = getRedoStack();
  if (redoStack.length === 0) {
    return { action: null, employees: [], message: 'لا توجد عمليات للإعادة.' };
  }

  const nextAction = redoStack.pop()!;
  saveRedoStack(redoStack);

  const undoStack = getUndoStack();
  undoStack.push(nextAction);
  saveUndoStack(undoStack);

  if (nextAction.type === 'delete') {
    // Redo deletion: Put them back into trash
    const currentTrash = getTrashedEmployees();
    const updatedTrash = [...nextAction.records, ...currentTrash];
    saveTrashedEmployees(updatedTrash);

    const deleted = nextAction.records.map((r) => r.employee);
    const names = deleted.map((e) => e.fullName).join('، ');
    return {
      action: 'deleted',
      employees: deleted,
      message: `تمت إعادة حذف (${deleted.length}) موظف ونقلهم لسلة المهملات: ${names}`,
    };
  } else {
    // Redo restore: Restore them again
    const restored = nextAction.records.map((r) => r.employee);
    const restoredIds = new Set(nextAction.records.map((r) => r.id));

    const currentTrash = getTrashedEmployees();
    const updatedTrash = currentTrash.filter((r) => !restoredIds.has(r.id));
    saveTrashedEmployees(updatedTrash);

    const names = restored.map((e) => e.fullName).join('، ');
    return {
      action: 'restored',
      employees: restored,
      message: `تمت إعادة استرجاع (${restored.length}) موظف: ${names}`,
    };
  }
}
