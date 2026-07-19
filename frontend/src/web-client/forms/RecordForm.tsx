"use client";

import * as React from "react";
import {
  CalendarRange,
  Check,
  ClipboardList,
  FileText,
  LayoutGrid,
  User,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldRenderer } from "@/web-client/forms/field-renderers";
import type { FormField, RecordFormProps } from "@/web-client/forms/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getEmptyValue<TValues extends Record<string, unknown>>(
  field: FormField<TValues>,
) {
  switch (field.type) {
    case "boolean":
      return false;
    case "multiselect":
    case "tags":
      return [];
    case "date_range":
      return { start: "", end: "" };
    case "number_range":
    case "currency_range":
      return { min: "", max: "" };
    case "file":
    case "image":
      return null;
    default:
      return "";
  }
}

type RecordFormInnerProps<TValues extends Record<string, unknown>> =
  RecordFormProps<TValues> & {
    initialState: TValues;
  };

export function RecordForm<TValues extends Record<string, unknown>>(
  props: RecordFormProps<TValues>,
) {
  const initialState = React.useMemo(() => {
    const state: Record<string, unknown> = {};
    const initial = props.initialValues as Record<string, unknown> | undefined;

    props.fields.forEach((field) => {
      if (initial && field.name in initial) {
        state[field.name] = initial[field.name];
      } else if (field.defaultValue !== undefined) {
        state[field.name] = field.defaultValue;
      } else {
        state[field.name] = getEmptyValue(field);
      }
    });

    return state as TValues;
  }, [props.fields, props.initialValues]);

  const initialStateKey = React.useMemo(
    () => JSON.stringify(initialState),
    [initialState],
  );

  return (
    <RecordFormInner
      key={initialStateKey}
      {...props}
      initialState={initialState}
    />
  );
}

function RecordFormInner<TValues extends Record<string, unknown>>({
  id,
  appearance = "default",
  fields,
  steps,
  initialState,
  onSubmit,
  onFieldChange,
  onFieldCommit,
  onValuesChange,
  disabled,
  actions,
}: RecordFormInnerProps<TValues>) {
  const [values, setValues] = React.useState<TValues>(initialState);
  const [currentStep, setCurrentStep] = React.useState(0);
  const notifyValuesChangeRef = React.useRef(false);
  const isInlineDetail = appearance === "inline-detail";

  React.useEffect(() => {
    if (!notifyValuesChangeRef.current) return;
    notifyValuesChangeRef.current = false;
    onValuesChange?.(values);
  }, [values, onValuesChange]);

  const handleChange = React.useCallback(
    (name: keyof TValues & string, value: unknown) => {
      notifyValuesChangeRef.current = true;
      setValues((previous) => {
        const next = { ...previous, [name]: value } as TValues;
        const patch = onFieldChange?.({
          name,
          value,
          prevValues: previous,
          nextValues: next,
        });
        if (patch && typeof patch === "object") {
          return { ...next, ...(patch as Partial<TValues>) } as TValues;
        }
        return next;
      });
    },
    [onFieldChange],
  );

  const handleCommit = React.useCallback(
    (name: keyof TValues & string, value?: unknown) => {
      if (!onFieldCommit) return;
      const nextValues =
        typeof value === "undefined"
          ? values
          : ({ ...values, [name]: value } as TValues);
      onFieldCommit({
        name,
        value: typeof value === "undefined" ? values[name] : value,
        values: nextValues,
      });
    },
    [onFieldCommit, values],
  );

  const isFieldRequired = React.useCallback(
    (field: FormField<TValues>) => {
      const conditional = field.requiredWhen?.(values) ?? false;
      return Boolean(field.required || conditional);
    },
    [values],
  );

  const isFieldFilled = React.useCallback(
    (field: FormField<TValues>, value: unknown) => {
      switch (field.type) {
        case "boolean":
          return value !== undefined && value !== null;
        case "multiselect":
        case "tags":
          return Array.isArray(value) && value.length > 0;
        case "date_range": {
          if (!isRecord(value)) return false;
          return Boolean(value["start"]) && Boolean(value["end"]);
        }
        case "number_range":
        case "currency_range": {
          if (!isRecord(value)) return false;
          const min = value["min"];
          const max = value["max"];
          return min !== "" && min !== undefined && max !== "" && max !== undefined;
        }
        case "file":
        case "image":
          return Boolean(value);
        default:
          return String(value ?? "").trim() !== "";
      }
    },
    [],
  );

  const isFieldVisible = React.useCallback(
    (field: FormField<TValues>) => {
      const hidden = field.hiddenWhen?.(values) ?? false;
      if (hidden) return false;
      const visible = field.visibleWhen?.(values);
      if (visible === undefined) return true;
      return Boolean(visible);
    },
    [values],
  );

  const visibleFields = React.useMemo(() => {
    if (!steps) return fields.filter(isFieldVisible);
    const step = steps[currentStep];
    return fields.filter(
      (field) => step.fields.includes(field.name) && isFieldVisible(field),
    );
  }, [fields, steps, currentStep, isFieldVisible]);

  const isCurrentStepValid = steps
    ? visibleFields.every((field) => {
        if (!isFieldRequired(field)) return true;
        return isFieldFilled(field, values[field.name]);
      })
    : true;

  const isFormValid = fields
    .filter(isFieldVisible)
    .every((field) => {
      if (!isFieldRequired(field)) return true;
      return isFieldFilled(field, values[field.name]);
    });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (steps && !isCurrentStepValid) return;
    if (!steps && !isFormValid) return;

    if (steps) {
      const isLastStep = currentStep === steps.length - 1;
      if (!isLastStep) {
        setCurrentStep((stepIndex) => stepIndex + 1);
        return;
      }
    }

    if (!isFormValid) return;
    onSubmit(values);
  };

  function resolveButtonVariant(
    variant?: "primary" | "secondary" | "ghost" | "danger",
  ) {
    switch (variant) {
      case "secondary":
        return "secondary";
      case "ghost":
        return "ghost";
      case "danger":
        return "destructive";
      default:
        return "default";
    }
  }

  function resolveStepIcon(index: number) {
    const icons = [User, Wallet, CalendarRange, FileText, ClipboardList];
    return icons[index % icons.length] ?? LayoutGrid;
  }

  const stepStates = React.useMemo(() => {
    if (!steps) return [];

    const byName = new Map<string, FormField<TValues>>(
      fields.map((field) => [field.name, field]),
    );

    const resolveStepFields = (index: number) => {
      const step = steps[index];
      const list = step?.fields
        .map((name) => byName.get(name))
        .filter(Boolean) as FormField<TValues>[];
      return list.filter(isFieldVisible);
    };

    const isStepValid = (index: number) => {
      const list = resolveStepFields(index);
      return list.every((field) => {
        if (!isFieldRequired(field)) return true;
        return isFieldFilled(field, values[field.name]);
      });
    };

    return steps.map((step, index) => {
      const Icon = step.icon ?? resolveStepIcon(index);
      const active = index === currentStep;
      const complete = index < currentStep && isStepValid(index);
      const canGoTo =
        index <= currentStep ||
        Array.from({ length: index }, (_, position) => position).every((position) =>
          isStepValid(position),
        );

      return {
        id: String(index),
        title: step.title,
        description:
          typeof step.description === "string" ? step.description : undefined,
        Icon,
        active,
        complete,
        canGoTo,
      };
    });
  }, [
    steps,
    fields,
    values,
    currentStep,
    isFieldVisible,
    isFieldRequired,
    isFieldFilled,
  ]);

  return (
    <form id={id} onSubmit={handleSubmit} className="space-y-6">
      {steps ? (
        <div
          className={
            isInlineDetail
              ? "space-y-4"
              : "rounded-xl border border-border/60 bg-card shadow-sm"
          }
        >
          <div
            className={
              isInlineDetail
                ? "border-b border-border/60 pb-3"
                : "rounded-t-xl border-b border-border/60 bg-muted/20 px-4 py-4 sm:px-6"
            }
          >
            {isInlineDetail ? (
              <>
                <div className="overflow-x-auto pb-1">
                  <div className="flex min-w-max items-center gap-6 border-b border-border/60">
                    {stepStates.map((step) => (
                      <button
                        key={step.id}
                        type="button"
                        disabled={!step.canGoTo}
                        onClick={() => {
                          if (!step.canGoTo) return;
                          const index = Number(step.id);
                          if (!Number.isNaN(index)) setCurrentStep(index);
                        }}
                        aria-current={step.active ? "step" : undefined}
                        className={[
                          "relative -mb-px whitespace-nowrap border-b-2 px-0 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                          step.active
                            ? "border-primary text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground",
                        ].join(" ")}
                        title={step.title}
                      >
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={[
                              "inline-flex size-5 items-center justify-center rounded-full text-[11px]",
                              step.active
                                ? "bg-primary text-primary-foreground"
                                : step.complete
                                  ? "bg-primary/15 text-primary"
                                  : "bg-muted text-muted-foreground",
                            ].join(" ")}
                          >
                            {step.complete ? (
                              <Check className="size-3.5" />
                            ) : (
                              Number(step.id) + 1
                            )}
                          </span>
                          {step.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {steps[currentStep]?.description ? (
                  <p className="pt-2 text-sm text-muted-foreground">
                    {steps[currentStep].description}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-[220px]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Etapa {currentStep + 1} de {stepStates.length}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {stepStates[currentStep]?.title}
                    </p>
                  </div>

                  <div className="text-[11px] text-muted-foreground">
                    {isCurrentStepValid
                      ? "Tudo certo para continuar"
                      : "Preencha os campos obrigatorios"}
                  </div>
                </div>

                <div className="mt-3 overflow-x-auto pb-1">
                  <div className="min-w-[520px]">
                    <div className="relative pt-1">
                      <div className="absolute inset-x-0 top-6 h-[2px] rounded-full bg-border/60" />
                      <div
                        className="absolute left-0 top-6 h-[2px] rounded-full bg-primary transition-[width] duration-300"
                        style={{
                          width:
                            stepStates.length <= 1
                              ? "100%"
                              : `${Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    (currentStep / (stepStates.length - 1)) * 100,
                                  ),
                                )}%`,
                        }}
                      />

                      <div
                        className="grid items-start gap-4"
                        style={{
                          gridTemplateColumns: `repeat(${Math.max(stepStates.length, 1)}, minmax(120px, 1fr))`,
                        }}
                      >
                        {stepStates.map((step) => {
                          const iconClasses = step.complete
                            ? "bg-primary text-primary-foreground border-primary/30"
                            : step.active
                              ? "bg-background text-primary border-primary/40 ring-4 ring-primary/10"
                              : "bg-background text-muted-foreground border-border/70";

                          return (
                            <div
                              key={step.id}
                              className="flex flex-col items-center gap-2"
                            >
                              <button
                                type="button"
                                disabled={!step.canGoTo}
                                onClick={() => {
                                  if (!step.canGoTo) return;
                                  const index = Number(step.id);
                                  if (!Number.isNaN(index)) setCurrentStep(index);
                                }}
                                aria-current={step.active ? "step" : undefined}
                                className="group flex flex-col items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                                title={step.title}
                              >
                                <span
                                  className={[
                                    "relative z-10 flex size-11 items-center justify-center rounded-full border shadow-sm transition-colors",
                                    iconClasses,
                                  ].join(" ")}
                                >
                                  {step.complete ? (
                                    <Check className="size-5" />
                                  ) : (
                                    <step.Icon className="size-5" />
                                  )}
                                </span>
                                <span
                                  className={[
                                    "text-center text-[11px] font-semibold transition-colors",
                                    step.active
                                      ? "text-foreground"
                                      : "text-muted-foreground group-hover:text-foreground",
                                  ].join(" ")}
                                >
                                  {step.title}
                                </span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {steps[currentStep]?.description ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {steps[currentStep].description}
                  </p>
                ) : null}
              </>
            )}
          </div>

          <div className={isInlineDetail ? "space-y-5" : "space-y-5 px-4 py-5 sm:px-6 sm:py-6"}>
            {visibleFields.map((field) => (
              <FieldRenderer
                key={field.name}
                field={field}
                value={values[field.name]}
                disabled={disabled}
                required={isFieldRequired(field)}
                appearance={appearance}
                onChange={(value) => handleChange(field.name, value)}
                onCommit={(value) => handleCommit(field.name, value)}
              />
            ))}

            {!(isInlineDetail && !actions) ? (
              <div className="border-t border-border/60 pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    {actions?.cancel ? (
                      <Button
                        type="button"
                        variant={resolveButtonVariant(actions.cancel.variant ?? "ghost")}
                        onClick={actions.cancel.onClick}
                      >
                        {actions.cancel.label ?? "Cancelar"}
                      </Button>
                    ) : null}
                    {currentStep > 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setCurrentStep((stepIndex) => stepIndex - 1)}
                      >
                        Voltar
                      </Button>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      variant={resolveButtonVariant(
                        currentStep < steps.length - 1
                          ? "secondary"
                          : (actions?.submit?.variant ?? "primary"),
                      )}
                      disabled={
                        !isCurrentStepValid ||
                        disabled ||
                        (currentStep === steps.length - 1 && !isFormValid)
                      }
                    >
                      {currentStep < steps.length - 1
                        ? "Proximo"
                        : (actions?.submit?.label ?? "Salvar")}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div
          className={
            isInlineDetail
              ? "space-y-5"
              : "space-y-5 rounded-lg border bg-card/70 p-6 shadow-sm"
          }
        >
          {visibleFields.map((field) => (
            <FieldRenderer
              key={field.name}
              field={field}
              value={values[field.name]}
              disabled={disabled}
              required={isFieldRequired(field)}
              appearance={appearance}
              onChange={(value) => handleChange(field.name, value)}
              onCommit={(value) => handleCommit(field.name, value)}
            />
          ))}

          <div className="border-t border-border/60 pt-4">
            {actions ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                {actions.cancel ? (
                  <Button
                    type="button"
                    variant={resolveButtonVariant(actions.cancel.variant ?? "secondary")}
                    onClick={actions.cancel.onClick}
                  >
                    {actions.cancel.label ?? "Cancelar"}
                  </Button>
                ) : null}

                {actions.submit ? (
                  <Button
                    type="submit"
                    variant={resolveButtonVariant(actions.submit.variant ?? "primary")}
                    disabled={!isFormValid || disabled}
                  >
                    {actions.submit.label ?? "Salvar"}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </form>
  );
}
