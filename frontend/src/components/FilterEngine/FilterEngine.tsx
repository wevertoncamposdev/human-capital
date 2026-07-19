"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FilterField, FilterSchema } from "@/lib/filters/types";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium text-muted-foreground">{children}</p>
  );
}

function renderField<TValues extends Record<string, unknown>>({
  field,
  value,
  onChange,
}: {
  field: FilterField<TValues>;
  value: TValues;
  onChange: (next: TValues) => void;
}) {
  const fieldValue = value[field.key];

  if (field.type === "select") {
    return (
      <div className="space-y-1">
        {field.label ? <FieldLabel>{field.label}</FieldLabel> : null}
        <Select
          value={String(fieldValue ?? "")}
          onValueChange={(v) =>
            onChange({ ...value, [field.key]: v } as TValues)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder ?? "Selecione"} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === "date") {
    return (
      <div className="space-y-1">
        {field.label ? <FieldLabel>{field.label}</FieldLabel> : null}
        <Input
          type="date"
          value={String(fieldValue ?? "")}
          onChange={(e) =>
            onChange({ ...value, [field.key]: e.target.value } as TValues)
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {field.label ? <FieldLabel>{field.label}</FieldLabel> : null}
      <Input
        value={String(fieldValue ?? "")}
        onChange={(e) =>
          onChange({ ...value, [field.key]: e.target.value } as TValues)
        }
        placeholder={field.placeholder}
      />
    </div>
  );
}

export function FilterEngine<TValues extends Record<string, unknown>>({
  schema,
  value,
  onChange,
  columns = 2,
}: {
  schema: FilterSchema<TValues>;
  value: TValues;
  onChange: (next: TValues) => void;
  columns?: 1 | 2 | 3 | 4;
}) {
  const gridCols =
    columns === 1
      ? "grid-cols-1"
      : columns === 3
        ? "grid-cols-1 lg:grid-cols-3"
        : columns === 4
          ? "grid-cols-1 lg:grid-cols-4"
          : "grid-cols-1 lg:grid-cols-2";

  return (
    <div className={`grid gap-3 ${gridCols}`}>
      {schema.map((field) => (
        <React.Fragment key={field.key}>
          {renderField({ field, value, onChange })}
        </React.Fragment>
      ))}
    </div>
  );
}
