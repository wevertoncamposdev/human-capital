"use client";

import * as React from "react";
import { useDetailAutoSaveController } from "@/web-client/detail/useDetailAutoSaveController";

const AUTO_EDITING = {
  saveMode: "auto",
  autoSave: {
    trigger: "field-commit",
  },
} as const;

export function usePeopleRelationFormAutoSave<TDraft extends Record<string, unknown>>({
  initialDraft,
  isSavable,
  persistDraft,
}: {
  initialDraft: TDraft;
  isSavable: (draft: TDraft) => boolean;
  persistDraft: (draft: TDraft) => Promise<TDraft>;
}) {
  const [draft, setDraft] = React.useState<TDraft>(initialDraft);
  const [error, setError] = React.useState<string | null>(null);

  const { saving, replaceSavedDraft, commitDraft } =
    useDetailAutoSaveController<TDraft>({
      draft,
      enabled: true,
      config: AUTO_EDITING,
      normalizeDraft: (value) => value,
      onSave: persistDraft,
      onError: (nextError) => {
        const message =
          nextError && typeof nextError === "object" && "message" in nextError
            ? String((nextError as { message?: string }).message)
            : "Falha ao salvar.";
        setError(message);
      },
    });

  React.useEffect(() => {
    setDraft(initialDraft);
    setError(null);
    replaceSavedDraft(initialDraft);
  }, [initialDraft, replaceSavedDraft]);

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const onValuesChange = React.useCallback(
    (nextDraft: TDraft) => {
      setDraft(nextDraft);
      setError(null);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (!isSavable(nextDraft)) {
        return;
      }
      timerRef.current = setTimeout(() => {
        commitDraft(nextDraft);
      }, 350);
    },
    [commitDraft, isSavable],
  );

  return {
    draft,
    saving,
    error,
    onValuesChange,
  };
}
