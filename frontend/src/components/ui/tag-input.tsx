"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TagInputProps = {
  value?: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxTags?: number;
  suggestions?: string[];
};

const normalizeTag = (value: string) => value.trim().replace(/\s+/g, " ");

export function TagInput({
  value = [],
  onChange,
  placeholder = "Digite e pressione Enter",
  disabled = false,
  maxTags,
  suggestions = [],
}: TagInputProps) {
  const [input, setInput] = React.useState("");

  const addTag = React.useCallback(
    (raw: string) => {
      const tag = normalizeTag(raw);
      if (!tag) return;
      if (maxTags && value.length >= maxTags) return;
      if (value.includes(tag)) return;
      onChange([...value, tag]);
      setInput("");
    },
    [maxTags, onChange, value],
  );

  const removeTag = React.useCallback(
    (tag: string) => {
      onChange(value.filter((item) => item !== tag));
    },
    [onChange, value],
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.length ? (
          value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              {!disabled ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0"
                  onClick={() => removeTag(tag)}
                >
                  <X className="size-3" />
                </Button>
              ) : null}
            </Badge>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">
            Nenhuma tag adicionada
          </span>
        )}
      </div>
      <Input
        value={input}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            addTag(input);
          }
        }}
        onBlur={() => {
          if (input.trim()) {
            addTag(input);
          }
        }}
      />
      {suggestions.length ? (
        <div className="flex flex-wrap gap-1">
          {suggestions
            .map((tag) => tag.trim())
            .filter(Boolean)
            .filter((tag, index, arr) => arr.indexOf(tag) === index)
            .filter((tag) => !value.includes(tag))
            .filter((tag) =>
              input.trim()
                ? tag.toLowerCase().includes(input.trim().toLowerCase())
                : true,
            )
            .slice(0, 12)
            .map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted/70"
              >
                {tag}
              </button>
            ))}
        </div>
      ) : null}
    </div>
  );
}
