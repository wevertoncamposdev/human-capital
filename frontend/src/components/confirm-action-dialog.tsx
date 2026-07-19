"use client";

import * as React from "react";
import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ConfirmActionDialogProps = {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonProps["variant"];
  confirmDisabled?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmActionDialog({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmVariant = "destructive",
  confirmDisabled,
  onConfirm,
}: ConfirmActionDialogProps) {
  const isControlled = typeof open === "boolean" && typeof onOpenChange === "function";
  const [internalOpen, setInternalOpen] = React.useState(false);
  const resolvedOpen = isControlled ? (open as boolean) : internalOpen;
  const setOpen = isControlled ? (onOpenChange as (open: boolean) => void) : setInternalOpen;

  const [confirming, setConfirming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (confirming) return;
      setError(null);
      setOpen(nextOpen);
    },
    [confirming, setOpen],
  );

  const handleConfirm = React.useCallback(async () => {
    if (confirmDisabled || confirming) return;
    setConfirming(true);
    setError(null);
    try {
      await onConfirm();
      setOpen(false);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Não foi possível concluir a ação.";
      setError(message);
    } finally {
      setConfirming(false);
    }
  }, [confirmDisabled, confirming, onConfirm, setOpen]);

  return (
    <AlertDialog open={resolvedOpen} onOpenChange={handleOpenChange}>
      {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button type="button" variant="outline" disabled={confirming}>
              {cancelLabel}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              type="button"
              variant={confirmVariant}
              onClick={handleConfirm}
              disabled={confirmDisabled || confirming}
            >
              {confirming ? "Processando..." : confirmLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

