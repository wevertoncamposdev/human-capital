"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MODULE_TABS_LIST_CLASS_NAME,
  MODULE_TAB_TRIGGER_CLASS_NAME,
} from "@/web-client/ui/ModulePrimitives";

export type DetailSideTabItem = {
  value: string;
  label: string;
  badge?: React.ReactNode;
  content: React.ReactNode;
};

export function DetailSideTabs({
  tabs,
  defaultValue,
}: {
  tabs: DetailSideTabItem[];
  defaultValue?: string;
}) {
  const visibleTabs = tabs.filter(Boolean);
  const resolvedDefaultValue = defaultValue ?? visibleTabs[0]?.value;
  const [currentValue, setCurrentValue] = React.useState(resolvedDefaultValue);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const updateScrollState = React.useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;

    const maxScrollLeft = node.scrollWidth - node.clientWidth;
    setCanScrollLeft(node.scrollLeft > 8);
    setCanScrollRight(maxScrollLeft - node.scrollLeft > 8);
  }, []);

  React.useEffect(() => {
    setCurrentValue(resolvedDefaultValue);
  }, [resolvedDefaultValue]);

  React.useEffect(() => {
    updateScrollState();
  }, [tabs, updateScrollState]);

  React.useEffect(() => {
    const activeTrigger = triggerRefs.current[currentValue];
    activeTrigger?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [currentValue]);

  React.useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    updateScrollState();
    const handleResize = () => updateScrollState();
    node.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      node.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", handleResize);
    };
  }, [updateScrollState]);

  const scrollTabsBy = React.useCallback((direction: "left" | "right") => {
    const node = scrollRef.current;
    if (!node) return;

    const distance = Math.max(120, Math.round(node.clientWidth * 0.55));
    node.scrollBy({
      left: direction === "right" ? distance : -distance,
      behavior: "smooth",
    });
  }, []);

  if (!resolvedDefaultValue) {
    return null;
  }

  return (
    <Tabs
      value={currentValue}
      onValueChange={setCurrentValue}
      className="flex h-full min-h-0 flex-col"
    >
      <div className="sticky top-0 z-10 flex items-center gap-1 border-b border-border/60 bg-background">
        <button
          type="button"
          aria-label="Abas anteriores"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
          onClick={() => scrollTabsBy("left")}
          disabled={!canScrollLeft}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        <div
          ref={scrollRef}
          className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          <TabsList
            className={`${MODULE_TABS_LIST_CLASS_NAME} h-10 min-w-max flex-nowrap gap-4 border-0`}
          >
            {visibleTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                ref={(node) => {
                  triggerRefs.current[tab.value] = node;
                }}
                className={`${MODULE_TAB_TRIGGER_CLASS_NAME} shrink-0 whitespace-nowrap`}
              >
                <span>{tab.label}</span>
                {tab.badge ? (
                  <span className="ml-2 text-[11px] font-medium tabular-nums text-muted-foreground">
                    {tab.badge}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <button
          type="button"
          aria-label="Proximas abas"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
          onClick={() => scrollTabsBy("right")}
          disabled={!canScrollRight}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {visibleTabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="mt-4 min-h-0 flex-1 overflow-hidden">
          <div className="h-full min-h-0 overflow-y-auto">{tab.content}</div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
