"use client";

import * as React from "react";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type BreadcrumbAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
};

type BreadcrumbState = {
  title: string;
  items: BreadcrumbItem[];
  action?: BreadcrumbAction;
  actionSlot?: React.ReactNode;
};

type BreadcrumbContextValue = {
  breadcrumb: BreadcrumbState;
  setBreadcrumb: (next: BreadcrumbState) => void;
  setPageBreadcrumb: (
    title: string,
    items: BreadcrumbItem[],
    action?: BreadcrumbAction,
    actionSlot?: React.ReactNode,
  ) => void;
};

const BreadcrumbContext = React.createContext<BreadcrumbContextValue | null>(null);

const defaultBreadcrumb: BreadcrumbState = {
  title: "Dashboard",
  items: [],
};

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [breadcrumb, setBreadcrumb] = React.useState<BreadcrumbState>(
    defaultBreadcrumb,
  );

  const setPageBreadcrumb = React.useCallback(
    (
      title: string,
      items: BreadcrumbItem[],
      action?: BreadcrumbAction,
      actionSlot?: React.ReactNode,
    ) => {
      setBreadcrumb({
        title,
        items,
        action,
        actionSlot,
      });
    },
    [],
  );

  const value = React.useMemo(
    () => ({ breadcrumb, setBreadcrumb, setPageBreadcrumb }),
    [breadcrumb, setPageBreadcrumb],
  );

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumb() {
  const ctx = React.useContext(BreadcrumbContext);
  if (!ctx) {
    throw new Error("useBreadcrumb must be used within BreadcrumbProvider");
  }
  return ctx;
}
