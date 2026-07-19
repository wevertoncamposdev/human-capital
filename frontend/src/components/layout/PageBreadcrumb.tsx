"use client";

import { useEffect } from "react";
import {
  useBreadcrumb,
  type BreadcrumbAction,
  type BreadcrumbItem,
} from "@/components/layout/BreadcrumbContext";

type PageBreadcrumbProps = {
  title: string;
  items: BreadcrumbItem[];
  action?: BreadcrumbAction;
  actionSlot?: React.ReactNode;
};

export function PageBreadcrumb({
  title,
  items,
  action,
  actionSlot,
}: PageBreadcrumbProps) {
  const { setPageBreadcrumb } = useBreadcrumb();

  useEffect(() => {
    setPageBreadcrumb(title, items, action, actionSlot);
  }, [title, items, action, actionSlot, setPageBreadcrumb]);

  return null;
}
