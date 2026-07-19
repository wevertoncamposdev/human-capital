"use client";

import { Textarea } from "@/components/ui/textarea";

const textareaClassName =
  "min-h-[220px] rounded-none border-0 border-b border-border/60 bg-transparent px-0 py-3 text-sm shadow-none resize-none focus-visible:border-primary focus-visible:ring-0";

export function DetailNotesPanel({
  value,
  onChange,
  onBlur,
  readOnly,
  placeholder = "Notas internas",
  intro = null,
  footer = null,
}: {
  value: string | null | undefined;
  onChange: (next: string | null) => void;
  onBlur: () => void;
  readOnly?: boolean;
  placeholder?: string;
  intro?: string | null;
  footer?: string | null;
}) {
  return (
    <div className="space-y-3">
      {intro ? (
        <div className="border-b border-border/50 pb-3 text-[11px] text-muted-foreground">
          {intro}
        </div>
      ) : null}
      <Textarea
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={textareaClassName}
        readOnly={readOnly}
      />
      {footer ? <div className="text-[11px] text-muted-foreground">{footer}</div> : null}
    </div>
  );
}
