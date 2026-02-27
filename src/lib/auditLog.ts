import type { AuditLog } from "@/types";

let getDbAndSave: (() => { db: any; save: (db: any) => void }) | null = null;

export function initAuditLog(getter: () => { db: any; save: (db: any) => void }) {
  getDbAndSave = getter;
}

function generateId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function logAction(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  changes: { field: string; from: unknown; to: unknown }[],
  description: string
): void {
  if (!getDbAndSave) return;
  const { db, save } = getDbAndSave();
  const entry: AuditLog = {
    _id: generateId(),
    _creationTime: Date.now(),
    userId,
    action,
    entityType,
    entityId,
    changes,
    description,
  };
  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.push(entry);
  save(db);
}

export function getAuditLogs(): AuditLog[] {
  if (!getDbAndSave) return [];
  const { db } = getDbAndSave();
  return db.auditLogs || [];
}
