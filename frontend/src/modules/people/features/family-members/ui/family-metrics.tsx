"use client";

import { Badge } from "@/components/ui/badge";

export const FamilyMetricField = ({ label, value }: { label: string; value?: string }) => (
  <div>
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold text-foreground">{value || "-"}</p>
  </div>
);

export const FamilyMetricBadge = ({
  label,
  value,
  variant = "outline",
}: {
  label: string;
  value: string | number;
  variant?: "outline" | "secondary";
}) => (
  <Badge variant={variant} className="text-[10px]">
    {label}: {value}
  </Badge>
);
