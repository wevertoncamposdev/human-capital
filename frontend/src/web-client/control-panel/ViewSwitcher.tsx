"use client";

import * as React from "react";
import {
  RecordBrowserViewSwitcher,
  type RecordBrowserViewOption,
} from "@/components/record-browser/RecordBrowserViewSwitcher";

export function ViewSwitcher<V extends string>({
  value,
  options,
  onChange,
  showLabels = false,
  size = "sm",
}: {
  value: V;
  options: RecordBrowserViewOption<V>[];
  onChange: (next: V) => void;
  showLabels?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <RecordBrowserViewSwitcher
      value={value}
      options={options}
      onChange={onChange}
      showLabels={showLabels}
      size={size}
    />
  );
}
