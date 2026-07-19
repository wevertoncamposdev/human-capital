"use client";

import * as React from "react";
import type { BreadcrumbAction } from "@/components/layout/BreadcrumbContext";

export type ControlPanelState = {
  primaryAction?: BreadcrumbAction;
  primaryActionSlot?: React.ReactNode;
  leftSlot?: React.ReactNode;
  searchSlot?: React.ReactNode;
  filterSlot?: React.ReactNode;
  groupBySlot?: React.ReactNode;
  favoritesSlot?: React.ReactNode;
  viewSwitcherSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  viewControlsSlot?: React.ReactNode;
};

type ControlPanelContextValue = {
  controlPanel: ControlPanelState;
  setControlPanel: (next: ControlPanelState) => void;
  clearControlPanel: () => void;
};

const ControlPanelContext = React.createContext<ControlPanelContextValue | null>(
  null,
);

const defaultState: ControlPanelState = {};

export function ControlPanelProvider({ children }: { children: React.ReactNode }) {
  const [controlPanel, setControlPanel] = React.useState<ControlPanelState>(
    defaultState,
  );

  const clearControlPanel = React.useCallback(() => {
    setControlPanel(defaultState);
  }, []);

  const value = React.useMemo(
    () => ({ controlPanel, setControlPanel, clearControlPanel }),
    [controlPanel, clearControlPanel],
  );

  return (
    <ControlPanelContext.Provider value={value}>
      {children}
    </ControlPanelContext.Provider>
  );
}

export function useControlPanel() {
  const ctx = React.useContext(ControlPanelContext);
  if (!ctx) {
    throw new Error("useControlPanel must be used within ControlPanelProvider");
  }
  return ctx;
}
