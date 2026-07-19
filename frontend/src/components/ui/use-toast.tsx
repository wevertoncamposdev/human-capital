"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Toast as ToastPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "destructive" | "success";
const DEFAULT_TOAST_DURATION_MS = 5000;

export type ToastOptions = {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  duration?: number;
};

type ToastItem = Required<Pick<ToastOptions, "id">> & ToastOptions;

type ToastContextValue = {
  toast: (options: ToastOptions) => { id: string };
  dismiss: (id?: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

function ToastRoot({
  children,
  variant = "default",
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Root> & { variant?: ToastVariant }) {
  return (
    <ToastPrimitive.Root
      className={cn(
        "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border p-4 shadow-lg",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right-2 data-[state=open]:slide-in-from-right-2",
        variant === "destructive"
          ? "border-destructive bg-destructive text-destructive-foreground"
          : null,
        variant === "success"
          ? "border-emerald-700 bg-emerald-600 text-white"
          : null,
        variant === "default" ? "border-border bg-background text-foreground" : null,
        className,
      )}
      {...props}
    >
      {children}
    </ToastPrimitive.Root>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id?: string) => {
    if (!id) {
      setToasts([]);
      return;
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const toast = React.useCallback((options: ToastOptions) => {
    const id =
      options.id ??
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const item: ToastItem = { ...options, id };
    setToasts((prev) => [...prev, item]);
    return { id };
  }, []);

  const value = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right" duration={DEFAULT_TOAST_DURATION_MS}>
        {children}

        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[9999] flex max-h-screen w-[min(420px,calc(100vw-2rem))] flex-col justify-end gap-2 outline-none" />

        {toasts.map((toastItem) => {
          const isInverted =
            toastItem.variant === "destructive" || toastItem.variant === "success";

          return (
            <ToastRoot
              key={toastItem.id}
              variant={toastItem.variant}
              duration={
                toastItem.duration === 0 ? Number.MAX_SAFE_INTEGER : toastItem.duration
              }
              defaultOpen
              onOpenChange={(open) => {
                if (!open) dismiss(toastItem.id);
              }}
            >
              <div className="grid flex-1 gap-1">
                {toastItem.title ? (
                  <ToastPrimitive.Title
                    className={cn(
                      "text-sm font-semibold",
                      isInverted ? "text-white" : null,
                    )}
                  >
                    {toastItem.title}
                  </ToastPrimitive.Title>
                ) : null}
                {toastItem.description ? (
                  <ToastPrimitive.Description
                    className={cn(
                      "text-sm",
                      isInverted ? "text-white" : "text-muted-foreground",
                    )}
                  >
                    {toastItem.description}
                  </ToastPrimitive.Description>
                ) : null}
              </div>
              <ToastPrimitive.Close
                aria-label="Fechar"
                className={cn(
                  "rounded-md p-1 opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isInverted ? "text-white" : "text-muted-foreground",
                )}
              >
                <X className="size-4" />
              </ToastPrimitive.Close>
            </ToastRoot>
          );
        })}
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within <ToastProvider />");
  }
  return context;
}

