"use client";

import * as React from "react";
import Image from "next/image";
import { resolveMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  resumeDetailAutoSave,
  suspendDetailAutoSave,
} from "@/web-client/detail/detail-media-autosave-guard";

function resolveInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function DetailIdentityMediaField({
  name,
  value,
  readOnly = false,
  busy = false,
  onFileSelect,
  shape = "circle",
  variant = "panel",
  className,
}: {
  label?: string;
  title?: string;
  description?: string;
  name: string;
  value: string | File | null;
  readOnly?: boolean;
  busy?: boolean;
  onFileSelect?: (file: File) => Promise<void> | void;
  onRemove?: () => Promise<void> | void;
  shape?: "circle" | "rounded";
  variant?: "panel" | "header";
  className?: string;
}) {
  const initials = React.useMemo(() => resolveInitials(name || "Registro"), [name]);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const previewUrl = React.useMemo(() => {
    if (value instanceof File) {
      return URL.createObjectURL(value);
    }
    if (typeof value === "string" && value.trim()) {
      return resolveMediaUrl(value);
    }
    return "";
  }, [value]);

  React.useEffect(() => {
    if (!(value instanceof File) || !previewUrl.startsWith("blob:")) {
      return undefined;
    }
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl, value]);

  const avatarClassName =
    variant === "header"
      ? shape === "rounded"
        ? "size-14 rounded-2xl border border-border/60"
        : "size-14 rounded-full border border-border/60"
      : shape === "rounded"
        ? "size-20 rounded-2xl border border-border/60"
        : "size-20 rounded-full border border-border/60";

  const interactive = Boolean(onFileSelect) && !readOnly;

  const handlePreventFocusShift = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement> | React.PointerEvent<HTMLButtonElement>) => {
      if (!interactive || busy) return;
      event.preventDefault();
      suspendDetailAutoSave();
    },
    [busy, interactive],
  );

  const handleOpenPicker = React.useCallback(() => {
    if (!interactive || busy) return;
    suspendDetailAutoSave();
    inputRef.current?.click();
  }, [busy, interactive]);

  const handleFileChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      event.currentTarget.value = "";
      if (!file) {
        resumeDetailAutoSave();
        return;
      }
      try {
        await onFileSelect?.(file);
      } finally {
        resumeDetailAutoSave();
      }
    },
    [onFileSelect],
  );

  const mediaNode = (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-muted text-xs font-medium text-muted-foreground",
        interactive ? "cursor-pointer transition hover:border-primary/60 hover:bg-muted/80" : "",
        avatarClassName,
        className,
      )}
      data-slot="avatar"
    >
      {previewUrl ? (
        <Image
          key={previewUrl}
          src={previewUrl}
          alt={name}
          fill
          unoptimized
          sizes={variant === "header" ? "56px" : "80px"}
          className="object-cover"
          data-slot="avatar-image"
        />
      ) : (
        <span>{initials}</span>
      )}
    </span>
  );

  if (!interactive) {
    return mediaNode;
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={busy}
      />
      <button
        type="button"
        className="inline-flex"
        onMouseDown={handlePreventFocusShift}
        onPointerDown={handlePreventFocusShift}
        onClick={handleOpenPicker}
        title={previewUrl ? "Clique para alterar foto" : "Clique para adicionar foto"}
        disabled={busy}
      >
        {mediaNode}
      </button>
    </>
  );
}
