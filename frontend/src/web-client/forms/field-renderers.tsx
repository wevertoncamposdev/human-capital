import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichText } from "@/components/ui/richtext/RichText";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TagInput } from "@/components/ui/tag-input";
import { Textarea } from "@/components/ui/textarea";
import type { FormField } from "@/web-client/forms/types";

interface FieldRendererProps<
  TValues extends Record<string, unknown> = Record<string, unknown>,
> {
  field: FormField<TValues>;
  value: unknown;
  disabled?: boolean;
  required?: boolean;
  appearance?: "default" | "inline-detail";
  onChange: (value: unknown) => void;
  onCommit?: (value?: unknown) => void;
}

function normalizeChange(onChange: (value: unknown) => void) {
  return (arg: unknown) => {
    if (typeof arg === "object" && arg !== null && "target" in arg) {
      const target = (arg as { target?: unknown }).target;
      if (typeof target === "object" && target !== null && "value" in target) {
        onChange((target as { value?: unknown }).value);
        return;
      }
    }

    onChange(arg);
  };
}

function parseNumberValue(value: string) {
  if (value === "") return "";
  const parsed = Number(value);
  return Number.isNaN(parsed) ? "" : parsed;
}

function toDateInputValue(value: unknown) {
  if (!value) return "";
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value);
}

function toTextValue(value: unknown) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return String(value);
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function FieldRenderer<TValues extends Record<string, unknown>>({
  field,
  value,
  disabled,
  required = false,
  appearance = "default",
  onChange,
  onCommit,
}: FieldRendererProps<TValues>) {
  const isDisabled = disabled || field.disabled;
  const handleChange = normalizeChange(onChange);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [selectQuery, setSelectQuery] = React.useState("");
  const [selectOpen, setSelectOpen] = React.useState(false);

  const filteredSelectOptions = React.useMemo(() => {
    if (field.type !== "select") return [];
    const options = field.options ?? [];
    if (!field.searchable) return options;
    const normalizedQuery = normalizeSearchText(selectQuery);
    if (!normalizedQuery) return options;
    return options.filter((option) => {
      const label = normalizeSearchText(option.label ?? "");
      const optionValue = normalizeSearchText(option.value ?? "");
      return label.includes(normalizedQuery) || optionValue.includes(normalizedQuery);
    });
  }, [field, selectQuery]);

  React.useEffect(() => {
    if (selectOpen) return;
    if (selectQuery) setSelectQuery("");
  }, [selectOpen, selectQuery]);

  React.useEffect(() => {
    if (field.type !== "image") return undefined;

    if (value instanceof File) {
      const url = URL.createObjectURL(value);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    }

    if (typeof value === "string" && value.length > 0) {
      setImagePreview(value);
      return undefined;
    }

    setImagePreview(null);
    return undefined;
  }, [field.type, value]);

  const inlineInputClassName =
    appearance === "inline-detail"
      ? "rounded-none border-0 border-b border-border/70 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:border-foreground"
      : undefined;

  const inlineTextareaClassName =
    appearance === "inline-detail"
      ? "min-h-[72px] rounded-none border-0 border-b border-border/70 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:border-foreground"
      : undefined;

  const renderHelperText = () =>
    field.helperText ? (
      <p className="text-xs text-muted-foreground">{field.helperText}</p>
    ) : null;

  const renderLabeledField = (content: React.ReactNode) => (
    <div className={appearance === "inline-detail" ? "space-y-1.5" : "space-y-2"}>
      <Label className="text-sm font-medium">
        {field.label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      {content}
      {renderHelperText()}
    </div>
  );

  switch (field.type) {
    case "text":
    case "password":
    case "email":
    case "phone":
    case "url":
    case "number":
      return renderLabeledField(
        <Input
          type={
            field.type === "number"
              ? "number"
              : field.type === "password"
                ? "password"
                : field.type === "email"
                  ? "email"
                  : field.type === "phone"
                    ? "tel"
                    : field.type === "url"
                      ? "url"
                      : "text"
          }
          value={toTextValue(value)}
          placeholder={"placeholder" in field ? field.placeholder : undefined}
          disabled={isDisabled}
          className={inlineInputClassName}
          onChange={(event) => {
            const raw = event.target.value;
            if (field.type === "number") {
              onChange(parseNumberValue(raw));
              return;
            }
            handleChange(event);
          }}
          onBlur={(event) => {
            if (field.type === "number") {
              onCommit?.(parseNumberValue(event.target.value));
              return;
            }
            onCommit?.(event.target.value);
          }}
        />,
      );

    case "money":
      return renderLabeledField(
        <Input
          type="text"
          inputMode="decimal"
          value={toTextValue(value)}
          disabled={isDisabled}
          className={inlineInputClassName}
          onChange={(event) => onChange(parseNumberValue(event.target.value))}
          onBlur={(event) => onCommit?.(parseNumberValue(event.target.value))}
        />,
      );

    case "cpf":
      return renderLabeledField(
        <Input
          type="text"
          inputMode="numeric"
          value={toTextValue(value)}
          disabled={isDisabled}
          className={inlineInputClassName}
          onChange={handleChange}
          onBlur={(event) => onCommit?.(event.target.value)}
        />,
      );

    case "textarea":
      return renderLabeledField(
        <Textarea
          value={toTextValue(value)}
          placeholder={"placeholder" in field ? field.placeholder : undefined}
          rows={"rows" in field ? field.rows : undefined}
          disabled={isDisabled}
          className={inlineTextareaClassName}
          onChange={handleChange}
          onBlur={(event) => onCommit?.(event.target.value)}
        />,
      );

    case "file":
      return renderLabeledField(
        <Input
          type="file"
          disabled={isDisabled}
          accept={field.accept}
          multiple={field.multiple}
          className={inlineInputClassName}
          onChange={(event) => {
            const files = event.target.files;
            if (field.multiple) {
              const nextValue = files ? Array.from(files) : [];
              onChange(nextValue);
              onCommit?.(nextValue);
              return;
            }
            const nextValue = files?.[0] ?? null;
            onChange(nextValue);
            onCommit?.(nextValue);
          }}
        />,
      );

    case "image":
      return renderLabeledField(
        <div className="flex items-center gap-4">
          <div className="flex size-16 items-center justify-center overflow-hidden rounded-full border bg-muted text-muted-foreground">
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreview} alt={field.label} className="size-full object-cover" />
            ) : (
              <span className="text-xs">Sem foto</span>
            )}
          </div>
          <Input
            type="file"
            accept={field.accept ?? "image/*"}
            disabled={isDisabled}
            className={inlineInputClassName}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              onChange(file);
              onCommit?.(file);
            }}
          />
        </div>,
      );

    case "color":
      return renderLabeledField(
        <Input
          type="color"
          value={typeof value === "string" && value.trim() ? value : "#000000"}
          disabled={isDisabled}
          className={inlineInputClassName}
          onChange={handleChange}
          onBlur={(event) => onCommit?.(event.target.value)}
        />,
      );

    case "boolean": {
      const persistAs = field.persistAs ?? "boolean";
      const switchId = `${field.name}-switch`;
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Switch
              id={switchId}
              checked={Boolean(value)}
              disabled={isDisabled}
              onCheckedChange={(checked) => {
                const nextValue = persistAs === "number" ? (checked ? 1 : 0) : checked;
                onChange(nextValue);
                onCommit?.(nextValue);
              }}
            />
            <Label htmlFor={switchId}>{field.label}</Label>
          </div>
          {renderHelperText()}
        </div>
      );
    }

    case "select":
      return renderLabeledField(
        <Select
          value={toTextValue(value)}
          onValueChange={(nextValue) => {
            onChange(nextValue);
            onCommit?.(nextValue);
          }}
          disabled={isDisabled}
          onOpenChange={setSelectOpen}
        >
          <SelectTrigger className={inlineInputClassName}>
            <SelectValue placeholder={field.label} />
          </SelectTrigger>
          <SelectContent>
            {field.searchable ? (
              <div className="sticky top-0 z-10 bg-popover p-1">
                <Input
                  type="text"
                  value={selectQuery}
                  placeholder={field.searchPlaceholder ?? "Buscar..."}
                  className={inlineInputClassName}
                  onChange={(event) => setSelectQuery(event.target.value)}
                  onKeyDown={(event) => event.stopPropagation()}
                />
              </div>
            ) : null}
            {filteredSelectOptions.length ? (
              filteredSelectOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))
            ) : (
              <div className="px-2 py-2 text-xs text-muted-foreground">
                Nenhum resultado
              </div>
            )}
          </SelectContent>
        </Select>,
      );

    case "multiselect": {
      const selectedValues = Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
      return renderLabeledField(
        <div className="space-y-2">
          {field.options.map((option) => {
            const checkboxId = `${field.name}-${option.value}`;
            const checked = selectedValues.includes(option.value);
            return (
              <div key={option.value} className="flex items-center gap-2">
                <Checkbox
                  id={checkboxId}
                  checked={checked}
                  disabled={isDisabled}
                  onCheckedChange={(nextChecked) => {
                    const isChecked = Boolean(nextChecked);
                    const nextValues = isChecked
                      ? [...selectedValues, option.value]
                      : selectedValues.filter((item) => item !== option.value);
                    onChange(nextValues);
                    onCommit?.(nextValues);
                  }}
                />
                <Label htmlFor={checkboxId}>{option.label}</Label>
              </div>
            );
          })}
        </div>,
      );
    }

    case "tags": {
      const tagsValue = Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
      return renderLabeledField(
        <TagInput
          value={tagsValue}
          onChange={(nextValues) => {
            onChange(nextValues);
            onCommit?.(nextValues);
          }}
          disabled={isDisabled}
          placeholder={"placeholder" in field ? field.placeholder : undefined}
          maxTags={"maxTags" in field ? field.maxTags : undefined}
          suggestions={"suggestions" in field ? field.suggestions : undefined}
        />
      );
    }

    case "richtext":
      return renderLabeledField(
        <RichText
          value={toTextValue(value)}
          disabled={isDisabled}
          onChange={handleChange}
          onBlur={() => onCommit?.(toTextValue(value))}
        />
      );

    case "date":
      return renderLabeledField(
        <Input
          type="date"
          value={toDateInputValue(value)}
          disabled={isDisabled}
          className={inlineInputClassName}
          onChange={handleChange}
          onBlur={(event) => onCommit?.(event.target.value)}
        />
      );

    case "date_range": {
      const rangeValue =
        value && typeof value === "object"
          ? (value as Record<string, unknown>)
          : {};
      const start = toTextValue(rangeValue["start"]);
      const end = toTextValue(rangeValue["end"]);
      return renderLabeledField(
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            type="date"
            value={toDateInputValue(start)}
            disabled={isDisabled}
            className={inlineInputClassName}
            placeholder={"startPlaceholder" in field ? field.startPlaceholder : undefined}
            onChange={(event) => {
              const nextValue = {
                start: event.target.value,
                end,
              };
              onChange(nextValue);
              onCommit?.(nextValue);
            }}
          />
          <Input
            type="date"
            value={toDateInputValue(end)}
            disabled={isDisabled}
            className={inlineInputClassName}
            placeholder={"endPlaceholder" in field ? field.endPlaceholder : undefined}
            onChange={(event) => {
              const nextValue = {
                start,
                end: event.target.value,
              };
              onChange(nextValue);
              onCommit?.(nextValue);
            }}
          />
        </div>,
      );
    }

    case "number_range":
    case "currency_range": {
      const rangeValue =
        value && typeof value === "object"
          ? (value as Record<string, unknown>)
          : {};
      const isCurrency = field.type === "currency_range";
      const min = toTextValue(rangeValue["min"]);
      const max = toTextValue(rangeValue["max"]);
      return renderLabeledField(
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            type={isCurrency ? "text" : "number"}
            inputMode={isCurrency ? "decimal" : undefined}
            value={min}
            disabled={isDisabled}
            className={inlineInputClassName}
            placeholder={"minPlaceholder" in field ? field.minPlaceholder : undefined}
            onChange={(event) => {
              const raw = event.target.value;
              const nextValue = {
                min: parseNumberValue(raw),
                max: max ? parseNumberValue(max) : "",
              };
              onChange(nextValue);
              onCommit?.(nextValue);
            }}
          />
          <Input
            type={isCurrency ? "text" : "number"}
            inputMode={isCurrency ? "decimal" : undefined}
            value={max}
            disabled={isDisabled}
            className={inlineInputClassName}
            placeholder={"maxPlaceholder" in field ? field.maxPlaceholder : undefined}
            onChange={(event) => {
              const raw = event.target.value;
              const nextValue = {
                min: min ? parseNumberValue(min) : "",
                max: parseNumberValue(raw),
              };
              onChange(nextValue);
              onCommit?.(nextValue);
            }}
          />
        </div>,
      );
    }

    default:
      return null;
  }
}
