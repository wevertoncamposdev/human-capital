"use client";

import * as React from "react";
import type { ButtonProps } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonProps["variant"];
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = React.createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null);
  const [request, setRequest] = React.useState<ConfirmOptions | null>(null);

  const confirm = React.useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setRequest(options);
    });
  }, []);

  const handleClose = React.useCallback(() => {
    setRequest(null);
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
  }, []);

  const handleConfirm = React.useCallback(async () => {
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
    setRequest(null);
  }, []);

  const value = React.useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {request ? (
        <ConfirmActionDialog
          open
          onOpenChange={(open) => {
            if (!open) handleClose();
          }}
          title={request.title}
          description={request.description}
          confirmLabel={request.confirmLabel}
          cancelLabel={request.cancelLabel}
          confirmVariant={request.confirmVariant}
          onConfirm={handleConfirm}
        />
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = React.useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within <ConfirmProvider />");
  }
  return context;
}

