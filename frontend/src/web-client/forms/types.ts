import type { ComponentType, ReactNode } from "react";

export type FieldType =
  | "text"
  | "password"
  | "email"
  | "phone"
  | "number"
  | "money"
  | "number_range"
  | "currency_range"
  | "cpf"
  | "boolean"
  | "select"
  | "multiselect"
  | "tags"
  | "richtext"
  | "textarea"
  | "date"
  | "date_range"
  | "file"
  | "image"
  | "color"
  | "url";

export interface BaseField<
  TValues extends Record<string, unknown> = Record<string, unknown>,
> {
  name: keyof TValues & string;
  label: string;
  type: FieldType;
  disabled?: boolean;
  defaultValue?: unknown;
  required?: boolean;
  requiredWhen?: (values: TValues) => boolean;
  helperText?: string;
  visibleWhen?: (values: TValues) => boolean;
  hiddenWhen?: (values: TValues) => boolean;
}

export interface TextField<
  TValues extends Record<string, unknown> = Record<string, unknown>,
> extends BaseField<TValues> {
  type: "text" | "password" | "number" | "money" | "cpf" | "email" | "phone" | "url";
  placeholder?: string;
}

export interface DateField<
  TValues extends Record<string, unknown> = Record<string, unknown>,
> extends BaseField<TValues> {
  type: "date";
}

export interface DateRangeField<
  TValues extends Record<string, unknown> = Record<string, unknown>,
> extends BaseField<TValues> {
  type: "date_range";
  startPlaceholder?: string;
  endPlaceholder?: string;
}

export interface NumberRangeField<
  TValues extends Record<string, unknown> = Record<string, unknown>,
> extends BaseField<TValues> {
  type: "number_range" | "currency_range";
  minPlaceholder?: string;
  maxPlaceholder?: string;
}

export interface TextareaField<
  TValues extends Record<string, unknown> = Record<string, unknown>,
> extends BaseField<TValues> {
  type: "textarea";
  placeholder?: string;
  rows?: number;
}

export interface FileField<
  TValues extends Record<string, unknown> = Record<string, unknown>,
> extends BaseField<TValues> {
  type: "file";
  accept?: string;
  multiple?: boolean;
}

export interface ImageField<
  TValues extends Record<string, unknown> = Record<string, unknown>,
> extends BaseField<TValues> {
  type: "image";
  accept?: string;
}

export interface ColorField<
  TValues extends Record<string, unknown> = Record<string, unknown>,
> extends BaseField<TValues> {
  type: "color";
}

export interface BooleanField<
  TValues extends Record<string, unknown> = Record<string, unknown>,
> extends BaseField<TValues> {
  type: "boolean";
  persistAs?: "boolean" | "number";
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectField<
  TValues extends Record<string, unknown> = Record<string, unknown>,
> extends BaseField<TValues> {
  type: "select" | "multiselect";
  options: ReadonlyArray<SelectOption>;
  searchable?: boolean;
  searchPlaceholder?: string;
}

export interface TagsField<
  TValues extends Record<string, unknown> = Record<string, unknown>,
> extends BaseField<TValues> {
  type: "tags";
  placeholder?: string;
  maxTags?: number;
  suggestions?: string[];
}

export interface RichTextField<
  TValues extends Record<string, unknown> = Record<string, unknown>,
> extends BaseField<TValues> {
  type: "richtext";
}

export type FormField<
  TValues extends Record<string, unknown> = Record<string, unknown>,
> =
  | TextField<TValues>
  | BooleanField<TValues>
  | SelectField<TValues>
  | TagsField<TValues>
  | RichTextField<TValues>
  | DateField<TValues>
  | DateRangeField<TValues>
  | NumberRangeField<TValues>
  | TextareaField<TValues>
  | FileField<TValues>
  | ImageField<TValues>
  | ColorField<TValues>;

export interface FormStep {
  title: string;
  fields: ReadonlyArray<string>;
  icon?: ComponentType<{ className?: string }>;
  description?: ReactNode;
}

export type FormAction = {
  label?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export type FormActions = {
  submit?: FormAction;
  cancel?: FormAction;
};

export interface RecordFormProps<
  TValues extends Record<string, unknown> = Record<string, unknown>,
> {
  id?: string;
  appearance?: "default" | "inline-detail";
  fields: ReadonlyArray<FormField<TValues>>;
  steps?: ReadonlyArray<FormStep>;
  initialValues?: Partial<TValues>;
  onSubmit: (values: TValues) => void;
  onFieldChange?: (params: {
    name: keyof TValues & string;
    value: unknown;
    prevValues: TValues;
    nextValues: TValues;
  }) => Partial<TValues> | void;
  onFieldCommit?: (params: {
    name: keyof TValues & string;
    value: unknown;
    values: TValues;
  }) => void;
  onValuesChange?: (values: TValues) => void;
  renderFooter?: ReactNode;
  disabled?: boolean;
  actions?: FormActions;
}
