"use client";

import * as React from "react";
import { isDetailAutoSaveSuspended } from "@/web-client/detail/detail-media-autosave-guard";
import type { DetailEditingConfig } from "@/web-client/registry/types";

type UseDetailAutoSaveControllerOptions<TDraft extends Record<string, unknown>> = {
  draft: TDraft | null;
  enabled?: boolean;
  config?: DetailEditingConfig;
  normalizeDraft?: (draft: TDraft) => TDraft;
  areEqual?: (left: TDraft | null, right: TDraft | null) => boolean;
  onSave: (draft: TDraft) => Promise<TDraft>;
  onError?: (error: unknown) => void;
};

type CommitField<TDraft extends Record<string, unknown>> = <
  K extends keyof TDraft,
>(
  field: K,
  nextValue?: TDraft[K],
) => void;

function defaultAreEqual<TDraft extends Record<string, unknown>>(
  left: TDraft | null,
  right: TDraft | null,
  normalizeDraft: (draft: TDraft) => TDraft,
) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return JSON.stringify(normalizeDraft(left)) === JSON.stringify(normalizeDraft(right));
}

export function useDetailAutoSaveController<
  TDraft extends Record<string, unknown>,
>({
  draft,
  enabled = true,
  config,
  normalizeDraft,
  areEqual,
  onSave,
  onError,
}: UseDetailAutoSaveControllerOptions<TDraft>) {
  const [saving, setSaving] = React.useState(false);
  const lastSavedRef = React.useRef<TDraft | null>(null);
  const queuedDraftRef = React.useRef<TDraft | null>(null);
  const savingRef = React.useRef(false);
  const draftRef = React.useRef<TDraft | null>(draft);
  const autoSaveEnabledRef = React.useRef(false);
  const onSaveRef = React.useRef(onSave);
  const onErrorRef = React.useRef(onError);

  const autoSaveEnabled =
    enabled &&
    config?.saveMode === "auto" &&
    (config.autoSave?.trigger ?? "field-commit") === "field-commit";

  React.useEffect(() => {
    savingRef.current = saving;
  }, [saving]);

  React.useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  React.useEffect(() => {
    autoSaveEnabledRef.current = autoSaveEnabled;
  }, [autoSaveEnabled]);

  React.useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  React.useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const normalize = React.useCallback(
    (value: TDraft) => (normalizeDraft ? normalizeDraft(value) : value),
    [normalizeDraft],
  );

  const compareDrafts = React.useCallback(
    (left: TDraft | null, right: TDraft | null) =>
      areEqual ? areEqual(left, right) : defaultAreEqual(left, right, normalize),
    [areEqual, normalize],
  );
  const normalizeRef = React.useRef(normalize);
  const compareDraftsRef = React.useRef(compareDrafts);

  React.useEffect(() => {
    normalizeRef.current = normalize;
  }, [normalize]);

  React.useEffect(() => {
    compareDraftsRef.current = compareDrafts;
  }, [compareDrafts]);

  const replaceSavedDraft = React.useCallback(
    (nextDraft: TDraft | null) => {
      lastSavedRef.current = nextDraft ? normalizeRef.current(nextDraft) : null;
    },
    [],
  );

  const commitDraftAsync = React.useCallback(
    async (nextDraft?: TDraft | null) => {
      const candidate = nextDraft ?? draftRef.current;
      if (!autoSaveEnabledRef.current || !candidate) {
        return;
      }

      const normalizedDraft = normalizeRef.current(candidate);
      if (compareDraftsRef.current(normalizedDraft, lastSavedRef.current)) {
        return;
      }

      if (isDetailAutoSaveSuspended()) {
        queuedDraftRef.current = normalizedDraft;
        return;
      }

      if (savingRef.current) {
        queuedDraftRef.current = normalizedDraft;
        return;
      }

      setSaving(true);
      try {
        const savedDraft = await onSaveRef.current(normalizedDraft);
        lastSavedRef.current = normalizeRef.current(savedDraft);
      } catch (error) {
        onErrorRef.current?.(error);
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    if (saving || !queuedDraftRef.current) {
      return;
    }

    if (isDetailAutoSaveSuspended()) {
      return;
    }

    const nextDraft = queuedDraftRef.current;
    queuedDraftRef.current = null;
    void commitDraftAsync(nextDraft);
  }, [commitDraftAsync, saving]);

  React.useEffect(() => {
    const handleSuspensionChange = () => {
      if (savingRef.current || !queuedDraftRef.current || isDetailAutoSaveSuspended()) {
        return;
      }

      const nextDraft = queuedDraftRef.current;
      queuedDraftRef.current = null;
      void commitDraftAsync(nextDraft);
    };

    window.addEventListener(
      "detail:media-autosave-suspension-change",
      handleSuspensionChange,
    );

    return () => {
      window.removeEventListener(
        "detail:media-autosave-suspension-change",
        handleSuspensionChange,
      );
    };
  }, [commitDraftAsync]);

  const commitDraft = React.useCallback(
    (nextDraft?: TDraft | null) => {
      void commitDraftAsync(nextDraft);
    },
    [commitDraftAsync],
  );

  const commitField = React.useCallback<CommitField<TDraft>>(
    (field, nextValue) => {
      const currentDraft = draftRef.current;
      if (!currentDraft) {
        return;
      }

      const nextDraft =
        typeof nextValue === "undefined"
          ? currentDraft
          : ({ ...currentDraft, [field]: nextValue } as TDraft);

      commitDraft(nextDraft);
    },
    [commitDraft],
  );

  return {
    autoSaveEnabled,
    saving,
    lastSavedRef,
    replaceSavedDraft,
    commitDraft,
    commitField,
  };
}
