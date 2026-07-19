"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  areTagsEqual,
  formatDelimitedTags,
  parseDelimitedTags,
} from "@/web-client/detail/tag-utils";

const inputClassName =
  "h-10 rounded-none border-0 border-b border-border/60 bg-transparent px-0 shadow-none focus-visible:border-primary focus-visible:ring-0";

export function DetailTagsField({
  value,
  onChange,
  onCommit,
  readOnly,
  label = "Tags",
  placeholder = "Adicionar tags",
  helperText = null,
  emptyLabel = "Sem tags.",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  onCommit?: (next: string[]) => void;
  readOnly?: boolean;
  label?: string;
  placeholder?: string;
  helperText?: string | null;
  emptyLabel?: string;
}) {
  const [inputValue, setInputValue] = React.useState(() => formatDelimitedTags(value));

  React.useEffect(() => {
    const formattedValue = formatDelimitedTags(value);
    setInputValue((previous) => (previous === formattedValue ? previous : formattedValue));
  }, [value]);

  const commitTags = React.useCallback(() => {
    if (readOnly) {
      return;
    }

    const nextTags = parseDelimitedTags(inputValue);
    const formattedNextTags = formatDelimitedTags(nextTags);

    setInputValue(formattedNextTags);

    if (!areTagsEqual(value, nextTags)) {
      onChange(nextTags);
    }

    onCommit?.(nextTags);
  }, [inputValue, onChange, onCommit, readOnly, value]);

  return (
    <div className="space-y-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>

      <Input
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onBlur={commitTags}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitTags();
            event.currentTarget.blur();
          }
        }}
        className={inputClassName}
        placeholder={placeholder}
        readOnly={readOnly}
      />

      {helperText ? <div className="text-[11px] text-muted-foreground">{helperText}</div> : null}

      <div className="flex flex-wrap gap-1.5">
        {value.length ? (
          value.map((tag) => (
            <Badge key={tag} variant="outline" className="rounded-full px-2 text-[10px]">
              {tag}
            </Badge>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">{emptyLabel}</span>
        )}
      </div>
    </div>
  );
}
