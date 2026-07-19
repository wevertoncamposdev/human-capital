"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { AdminAccessLog } from "@/features/admin/api";

type LogRow = AdminAccessLog;

const accessLogActionLabels: Record<LogRow["action"], string> = {
  LOGIN: "Login",
  REFRESH: "Refresh",
  LOGOUT: "Logout",
};

export function buildAccessLogColumns(): ColumnDef<LogRow>[] {
  return [
    {
      accessorKey: "action",
      header: "Ação",
      cell: ({ row }) => (
        <Badge variant="outline">{accessLogActionLabels[row.original.action]}</Badge>
      ),
    },
    {
      accessorKey: "ipAddress",
      header: "IP",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.ipAddress ?? "-"}
        </span>
      ),
    },
    {
      accessorKey: "userAgent",
      header: "Dispositivo",
      cell: ({ row }) => (
        <span className="line-clamp-2 text-xs text-muted-foreground">
          {row.original.userAgent ?? "-"}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Data",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
          }).format(new Date(row.original.createdAt))}
        </span>
      ),
    },
  ];
}

