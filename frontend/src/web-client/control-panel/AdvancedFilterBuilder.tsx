"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Domain, DomainCombinator, DomainOperator } from "@/web-client/domain/types";
import type { SearchFieldDefinition, SearchViewDefinition } from "@/web-client/search/types";
import { ModuleEmptyState } from "@/web-client/ui/ModulePrimitives";

type FilterRow = {
  id: string;
  field: string;
  operator: DomainOperator;
  value: string;
  valueTo?: string;
};

type FilterBuilderDensity = "default" | "compact" | "line";

const DEFAULT_OPERATORS_BY_TYPE: Record<
  SearchFieldDefinition["type"],
  DomainOperator[]
> = {
  text: [
    "=",
    "!=",
    "contains",
    "ilike",
    "starts_with",
    "ends_with",
    "in",
    "not_in",
    "is_null",
    "not_null",
  ],
  uuid: ["=", "!=", "in", "not_in", "is_null", "not_null"],
  number: ["=", "!=", ">", ">=", "<", "<=", "between", "in", "not_in", "is_null", "not_null"],
  date: ["between", ">=", "<=", "=", "!=", "is_null", "not_null"],
  select: ["=", "!=", "in", "not_in", "is_null", "not_null"],
  boolean: ["=", "!=", "is_null", "not_null"],
  "multi-select": ["in", "not_in", "is_null", "not_null"],
  enum: ["=", "!=", "in", "not_in", "is_null", "not_null"],
};

function resolveFieldOptions(field: SearchFieldDefinition) {
  if (field.type === "boolean" && !field.options?.length) {
    return [
      { value: "true", label: "Sim" },
      { value: "false", label: "Nao" },
    ];
  }

  return field.options ?? [];
}

function parseListValue(raw: string) {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function stringifyListValue(values: string[]) {
  return values.join(", ");
}

function castFieldValue(field: SearchFieldDefinition, value: string) {
  if (field.type === "number") return Number(value);
  if (field.type === "boolean") return value === "true";
  return value;
}

function operatorLabel(operator: DomainOperator) {
  switch (operator) {
    case "ilike":
      return "contem (A/a)";
    case "contains":
      return "contem";
    case "=":
      return "= Igual";
    case "!=":
      return "!= Diferente";
    case ">":
      return "maior que";
    case ">=":
      return "maior ou igual";
    case "<":
      return "menor que";
    case "<=":
      return "menor ou igual";
    case "between":
      return "entre";
    case "in":
      return "dentro de (lista)";
    case "not_in":
      return "fora da lista";
    case "starts_with":
      return "comeca com";
    case "ends_with":
      return "termina com";
    case "is_null":
      return "vazio";
    case "not_null":
      return "nao vazio";
    default:
      return operator;
  }
}

function createRow(field: SearchFieldDefinition): FilterRow {
  const operators = field.operators?.length
    ? field.operators
    : DEFAULT_OPERATORS_BY_TYPE[field.type];

  return {
    id: crypto.randomUUID(),
    field: field.name,
    operator: field.defaultOperator ?? operators[0] ?? "=",
    value: "",
    valueTo: "",
  };
}

function toDomain(
  combinator: DomainCombinator,
  rows: FilterRow[],
  fieldsByName: Map<string, SearchFieldDefinition>,
): Domain {
  const children = rows
    .map((row) => {
      const field = fieldsByName.get(row.field);
      if (!field) return null;

      const normalize = (raw: string) => raw.trim();
      const value = normalize(row.value);
      const valueTo = normalize(row.valueTo ?? "");

      if (row.operator === "is_null" || row.operator === "not_null") {
        return {
          type: "condition",
          field: row.field,
          operator: row.operator,
        } as const;
      }

      if (row.operator === "between") {
        if (!value && !valueTo) return null;
        return {
          type: "condition",
          field: row.field,
          operator: row.operator,
          value: [value || null, valueTo || null],
        } as const;
      }

      if (row.operator === "in" || row.operator === "not_in") {
        const parts = parseListValue(value);
        if (!parts.length) return null;

        const casted = parts
          .map((part) => castFieldValue(field, part))
          .filter((entry) => (typeof entry === "number" ? Number.isFinite(entry) : true));

        if (!casted.length) return null;

        return {
          type: "condition",
          field: row.field,
          operator: row.operator,
          value: casted,
        } as const;
      }

      if (!value) return null;

      return {
        type: "condition",
        field: row.field,
        operator: row.operator,
        value: castFieldValue(field, value),
      } as const;
    })
    .filter(Boolean) as NonNullable<Domain>[];

  if (!children.length) return null;
  if (children.length === 1) return children[0];
  return { type: "group", combinator, children };
}

function fromDomain(domain: Domain): { combinator: DomainCombinator; rows: FilterRow[] } {
  if (!domain) return { combinator: "and", rows: [] };

  if (domain.type === "group") {
    return {
      combinator: domain.combinator,
      rows: domain.children
        .map((node) => {
          if (node.type !== "condition") return null;

          const row: FilterRow = {
            id: crypto.randomUUID(),
            field: node.field,
            operator: node.operator,
            value: "",
            valueTo: "",
          };

          if (node.operator === "between" && Array.isArray(node.value)) {
            row.value =
              node.value[0] === null || node.value[0] === undefined
                ? ""
                : String(node.value[0]);
            row.valueTo =
              node.value[1] === null || node.value[1] === undefined
                ? ""
                : String(node.value[1]);
            return row;
          }

          if (
            (node.operator === "in" || node.operator === "not_in") &&
            Array.isArray(node.value)
          ) {
            row.value = stringifyListValue(node.value.map((value) => String(value)));
            return row;
          }

          row.value =
            node.value === null || node.value === undefined ? "" : String(node.value);

          return row;
        })
        .filter(Boolean) as FilterRow[],
    };
  }

  if (domain.type === "condition") {
    return {
      combinator: "and",
      rows: [
        {
          id: crypto.randomUUID(),
          field: domain.field,
          operator: domain.operator,
          value:
            domain.value === null || domain.value === undefined
              ? ""
              : String(domain.value),
          valueTo: "",
        },
      ],
    };
  }

  return { combinator: "and", rows: [] };
}

function renderValueInput({
  field,
  row,
  onChange,
  density,
  valueSuggestions,
}: {
  field: SearchFieldDefinition;
  row: FilterRow;
  onChange: (next: Partial<FilterRow>) => void;
  density: FilterBuilderDensity;
  valueSuggestions?: (fieldName: string) => string[];
}) {
  const controlClassName =
    density === "line"
      ? "h-8 rounded-none border-0 border-b border-border/60 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
      : density === "compact"
        ? "h-8 text-xs"
        : undefined;

  if (row.operator === "is_null" || row.operator === "not_null") {
    return <div className="text-xs text-muted-foreground">Sem valor</div>;
  }

  const options = resolveFieldOptions(field);

  if (
    (field.type === "select" ||
      field.type === "boolean" ||
      field.type === "enum") &&
    options.length &&
    row.operator !== "in" &&
    row.operator !== "not_in"
  ) {
    return (
      <Select value={row.value} onValueChange={(value) => onChange({ value })}>
        <SelectTrigger className={cn("h-9", controlClassName)}>
          <SelectValue placeholder="Selecione..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.type === "multi-select" && options.length) {
    const selectedValues = new Set(parseListValue(row.value));

    return (
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selectedValues.has(option.value);

          return (
            <button
              key={option.value}
              type="button"
              className={cn(
                "rounded-full border px-2 py-1 text-xs transition-colors",
                active
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
              onClick={() => {
                const next = new Set(selectedValues);

                if (active) {
                  next.delete(option.value);
                } else {
                  next.add(option.value);
                }

                onChange({ value: stringifyListValue(Array.from(next)) });
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (row.operator === "between") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <Input
          type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
          value={row.value}
          onChange={(event) => onChange({ value: event.target.value })}
          placeholder="De"
          className={controlClassName}
        />
        <Input
          type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
          value={row.valueTo ?? ""}
          onChange={(event) => onChange({ valueTo: event.target.value })}
          placeholder="Ate"
          className={controlClassName}
        />
      </div>
    );
  }

  const suggestions = valueSuggestions?.(field.name) ?? [];
  const listId = suggestions.length ? `filter-suggestions:${row.id}` : undefined;

  return (
    <>
      <Input
        type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
        value={row.value}
        onChange={(event) => onChange({ value: event.target.value })}
        placeholder={
          row.operator === "in" || row.operator === "not_in"
            ? "val1, val2, val3"
            : field.placeholder ?? "Valor..."
        }
        list={listId}
        className={controlClassName}
      />
      {listId ? (
        <datalist id={listId}>
          {suggestions.slice(0, 80).map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      ) : null}
    </>
  );
}

export function AdvancedFilterBuilder({
  searchView,
  value,
  onChange,
  density = "default",
  syncFromValue = true,
  allowedCombinators = ["and"],
  valueSuggestions,
  className,
}: {
  searchView: SearchViewDefinition;
  value: Domain;
  onChange: (next: Domain) => void;
  density?: FilterBuilderDensity;
  syncFromValue?: boolean;
  allowedCombinators?: DomainCombinator[];
  valueSuggestions?: (fieldName: string) => string[];
  className?: string;
}) {
  const fieldsByName = React.useMemo(() => {
    const map = new Map<string, SearchFieldDefinition>();
    searchView.fields.forEach((field) => map.set(field.name, field));
    return map;
  }, [searchView.fields]);

  const [combinator, setCombinator] = React.useState<DomainCombinator>(
    () => fromDomain(value).combinator,
  );
  const [rows, setRows] = React.useState<FilterRow[]>(() => fromDomain(value).rows);
  const [unsupportedDomain, setUnsupportedDomain] = React.useState(false);

  React.useEffect(() => {
    if (!syncFromValue) return;

    const parsed = fromDomain(value);
    const isCombinatorAllowed = allowedCombinators.includes(parsed.combinator);
    const isSupported =
      !value ||
      value.type === "condition" ||
      (value.type === "group" && value.children.every((node) => node.type === "condition"));

    setUnsupportedDomain(!isSupported || !isCombinatorAllowed);
    setCombinator(isCombinatorAllowed ? parsed.combinator : allowedCombinators[0]);
    setRows(isSupported ? parsed.rows : []);
  }, [allowedCombinators, syncFromValue, value]);

  React.useEffect(() => {
    if (allowedCombinators.includes(combinator)) return;
    setCombinator(allowedCombinators[0]);
  }, [allowedCombinators, combinator]);

  const update = React.useCallback(
    (nextRows: FilterRow[], nextCombinator: DomainCombinator = combinator) => {
      setUnsupportedDomain(false);
      setRows(nextRows);
      setCombinator(nextCombinator);
      onChange(toDomain(nextCombinator, nextRows, fieldsByName));
    },
    [combinator, fieldsByName, onChange],
  );

  const selectTriggerClassName =
    density === "line"
      ? "h-8 rounded-none border-0 border-b border-border/60 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
      : density === "compact"
        ? "h-8 text-xs"
        : "h-9";

  const addButtonClassName =
    density === "line"
      ? "h-8 px-2 text-xs"
      : density === "compact"
        ? "h-8 px-2 text-xs"
        : undefined;

  const rowContainerClassName =
    density === "line"
      ? "border-b border-border/60 pb-2"
      : density === "compact"
        ? "rounded-md border border-border/50 bg-transparent p-2"
        : "rounded-md border border-border/60 bg-background p-3";

  const gridTemplateClassName =
    density === "line"
      ? "grid grid-cols-1 gap-2 sm:grid-cols-[10rem_9rem_1fr_auto] sm:items-end"
      : density === "compact"
        ? "grid grid-cols-1 gap-2 sm:grid-cols-[10rem_9rem_1fr_auto] sm:items-end"
        : "grid grid-cols-1 gap-2 sm:grid-cols-[12rem_10rem_1fr_auto] sm:items-end";

  return (
    <div
      className={cn(
        density === "line" ? "space-y-3" : density === "compact" ? "space-y-2" : "space-y-4",
        className,
      )}
    >
      {unsupportedDomain ? (
        <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Este filtro e avancado e nao pode ser editado aqui. Clique em{" "}
          <button
            type="button"
            className="underline underline-offset-2 hover:text-foreground"
            onClick={() => update([], allowedCombinators[0])}
          >
            limpar e comecar
          </button>
          .
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {allowedCombinators.length > 1 ? (
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Combinacao
            </Label>
            <Select
              value={combinator}
              onValueChange={(next) => update(rows, next as DomainCombinator)}
            >
              <SelectTrigger
                className={cn(
                  selectTriggerClassName,
                  density === "compact" ? "w-[9.5rem]" : "w-[10rem]",
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedCombinators.includes("and") ? (
                  <SelectItem value="and">Todas (AND)</SelectItem>
                ) : null}
                {allowedCombinators.includes("or") ? (
                  <SelectItem value="or">Qualquer (OR)</SelectItem>
                ) : null}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div />
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className={addButtonClassName}
          onClick={() => {
            const first = searchView.fields[0];
            if (!first) return;
            update([...rows, createRow(first)]);
          }}
        >
          Adicionar filtro
        </Button>
      </div>

      {rows.length ? (
        <div className={cn(density === "compact" ? "space-y-2" : "space-y-3")}>
          {rows.map((row, index) => {
            const field = fieldsByName.get(row.field) ?? searchView.fields[0] ?? null;
            if (!field) return null;

            const operators = field.operators?.length
              ? field.operators
              : DEFAULT_OPERATORS_BY_TYPE[field.type];

            return (
              <div key={row.id} className={rowContainerClassName}>
                <div className={gridTemplateClassName}>
                  <div className={cn("space-y-1", density === "line" ? "space-y-0" : undefined)}>
                    {density !== "line" ? (
                      <Label className="text-xs text-muted-foreground">Campo</Label>
                    ) : null}
                    <Select
                      value={row.field}
                      onValueChange={(nextField) => {
                        const nextDef = fieldsByName.get(nextField) ?? field;
                        const nextRow = createRow(nextDef);

                        update(
                          rows.map((entry, entryIndex) =>
                            entryIndex === index ? { ...nextRow, id: entry.id } : entry,
                          ),
                        );
                      }}
                    >
                      <SelectTrigger className={selectTriggerClassName}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {searchView.fields.map((item) => (
                          <SelectItem key={item.name} value={item.name}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className={cn("space-y-1", density === "line" ? "space-y-0" : undefined)}>
                    {density !== "line" ? (
                      <Label className="text-xs text-muted-foreground">Operador</Label>
                    ) : null}
                    <Select
                      value={row.operator}
                      onValueChange={(operator) => {
                        update(
                          rows.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, operator: operator as DomainOperator }
                              : entry,
                          ),
                        );
                      }}
                    >
                      <SelectTrigger className={selectTriggerClassName}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((operator) => (
                          <SelectItem key={operator} value={operator}>
                            {operatorLabel(operator)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className={cn("space-y-1", density === "line" ? "space-y-0" : undefined)}>
                    {density !== "line" ? (
                      <Label className="text-xs text-muted-foreground">Valor</Label>
                    ) : null}
                    {renderValueInput({
                      field,
                      row,
                      density,
                      valueSuggestions,
                      onChange: (partial) => {
                        update(
                          rows.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, ...partial } : entry,
                          ),
                        );
                      },
                    })}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => update(rows.filter((_, entryIndex) => entryIndex !== index))}
                      className="text-destructive"
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <ModuleEmptyState
          title="Sem filtros"
          description="Nenhum filtro avancado aplicado."
          compact
          className="rounded-lg border border-dashed border-border/60"
        />
      )}
    </div>
  );
}
