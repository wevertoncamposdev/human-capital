"use client";

import * as React from "react";
import { useControlPanel, type ControlPanelState } from "./ControlPanelContext";

type PageControlPanelProps = ControlPanelState;

export function PageControlPanel(props: PageControlPanelProps) {
  const { setControlPanel, clearControlPanel } = useControlPanel();

  React.useEffect(() => {
    setControlPanel(props);
    return () => clearControlPanel();
  }, [props, setControlPanel, clearControlPanel]);

  return null;
}

