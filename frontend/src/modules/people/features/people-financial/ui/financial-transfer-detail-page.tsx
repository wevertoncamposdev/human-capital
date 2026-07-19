"use client";

import { FinancialEntryDetailPage } from "@/modules/people/features/people-financial/ui/financial-entry-detail-page";

export function FinancialTransferDetailPage({ mode }: { mode: "create" | "edit" }) {
  return <FinancialEntryDetailPage mode={mode} />;
}
