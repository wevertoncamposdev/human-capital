"use client";

import * as React from "react";
import {
  ClipboardList,
  ChevronRight,
  GraduationCap,
  HeartPulse,
  Lock,
  Pill,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type PeopleDetailTabValue } from "@/modules/people/shared/domain/people-relation-routes";

type PeopleDetailTabsProps = {
  onValueChange: (value: PeopleDetailTabValue) => void;
};

type TabItem = {
  value: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
};

const tabItems: TabItem[] = [
  { value: "familia", label: "Familia", icon: Users },
  { value: "financeiro", label: "Financeiro", icon: Wallet },
  { value: "saude", label: "Condicoes", icon: HeartPulse },
  { value: "medicacoes", label: "Medicacoes", icon: Pill },
  { value: "escolaridade", label: "Escolaridade", icon: GraduationCap },
  { value: "reclusao", label: "Reclusao", icon: Lock },
  { value: "atendimentos", label: "Atendimentos", icon: ClipboardList, disabled: true },
];

export function PeopleDetailTabs({ onValueChange }: PeopleDetailTabsProps) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const updateScrollState = React.useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    const remaining = element.scrollWidth - element.clientWidth - element.scrollLeft;
    setCanScrollRight(remaining > 12);
  }, []);

  React.useEffect(() => {
    updateScrollState();
    const element = scrollRef.current;
    if (!element) return;
    const handle = () => updateScrollState();
    element.addEventListener("scroll", handle, { passive: true });
    window.addEventListener("resize", handle);
    return () => {
      element.removeEventListener("scroll", handle);
      window.removeEventListener("resize", handle);
    };
  }, [updateScrollState]);

  const scrollRight = React.useCallback(() => {
    scrollRef.current?.scrollBy({ left: 220, behavior: "smooth" });
  }, []);

  return (
    <div className="relative border-t border-border/60 pt-2">
      <div
        ref={scrollRef}
        className="overflow-x-auto pr-10 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <TabsList className="h-auto w-max min-w-full flex-nowrap justify-start gap-1 rounded-none border-0 bg-transparent p-0">
          {tabItems.map((item) => {
            const Icon = item.icon;
            return (
              <TabsTrigger
                key={item.value}
                value={item.value}
                disabled={item.disabled}
                onClick={() =>
                  !item.disabled && onValueChange(item.value as PeopleDetailTabValue)
                }
                className="group relative h-11 shrink-0 whitespace-nowrap rounded-none border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground"
              >
                <span className="flex items-center gap-2">
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>
      {canScrollRight ? (
        <button
          type="button"
          onClick={scrollRight}
          className="absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/95 text-muted-foreground shadow-sm transition hover:text-foreground"
          aria-label="Ver mais abas"
          title="Ver mais abas"
        >
          <ChevronRight className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
