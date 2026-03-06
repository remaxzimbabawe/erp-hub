import * as React from "react";
import { PageHeader } from "@/components/layout/PageLayout";
import { DataView } from "@/components/data/DataView";
import { Badge } from "@/components/ui/badge";
import { getAuditLogs, getUsers } from "@/lib/database";
import { useAuth } from "@/lib/auth";
import { ExportMenu } from "@/components/common/ExportMenu";
import type { AuditLog } from "@/types";
import type { ExportColumn } from "@/lib/export";

export default function AuditLogsPage() {
  const { hasRole } = useAuth();
  const logs = getAuditLogs().sort((a, b) => b._creationTime - a._creationTime);
  const users = getUsers();

  if (!hasRole('super_admin')) {
    return <div className="p-8 text-center text-muted-foreground">Access denied. Super Admin only.</div>;
  }

  const getUserName = (userId: string) => users.find(u => u._id === userId)?.name || userId;

  const columns = [
    {
      key: "_creationTime" as const,
      header: "Time",
      render: (item: AuditLog) => new Date(item._creationTime).toLocaleString(),
    },
    {
      key: "userId" as const,
      header: "User",
      render: (item: AuditLog) => <Badge variant="outline">{getUserName(item.userId)}</Badge>,
    },
    {
      key: "action" as const,
      header: "Action",
      render: (item: AuditLog) => (
        <Badge variant={item.action === 'delete' ? 'destructive' : item.action === 'create' ? 'default' : 'secondary'}>
          {item.action}
        </Badge>
      ),
    },
    { key: "entityType" as const, header: "Entity" },
    { key: "description" as const, header: "Description" },
    {
      key: "changes" as const,
      header: "Changes",
      render: (item: AuditLog) => (
        <div className="text-xs space-y-1 max-w-[200px]">
          {item.changes.slice(0, 2).map((c, i) => (
            <div key={i} className="truncate">
              <span className="text-muted-foreground">{c.field}:</span>{" "}
              <span className="text-destructive line-through">{String(c.from ?? '—')}</span>{" → "}
              <span className="text-primary">{String(c.to ?? '—')}</span>
            </div>
          ))}
          {item.changes.length > 2 && <span className="text-muted-foreground">+{item.changes.length - 2} more</span>}
        </div>
      ),
    },
  ];

  const exportColumns: ExportColumn[] = [
    { header: "Time", accessor: (item: AuditLog) => new Date(item._creationTime).toLocaleString() },
    { header: "User", accessor: (item: AuditLog) => getUserName(item.userId) },
    { header: "Action", accessor: (item: AuditLog) => item.action },
    { header: "Entity", accessor: (item: AuditLog) => item.entityType },
    { header: "Description", accessor: (item: AuditLog) => item.description },
    { header: "Changes", accessor: (item: AuditLog) => item.changes.map(c => `${c.field}: ${String(c.from ?? '—')} → ${String(c.to ?? '—')}`).join("; ") },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <PageHeader title="Audit Logs" description="Track all system changes and user actions" />
        <ExportMenu data={logs} columns={exportColumns} title="Audit Logs" filename="audit-logs" />
      </div>
      <DataView
        data={logs}
        columns={columns}
        keyExtractor={(item) => item._id}
        searchKeys={["action", "entityType", "description"]}
        searchPlaceholder="Search logs..."
        emptyMessage="No audit logs recorded yet."
      />
    </div>
  );
}
