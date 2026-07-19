"use client";

import * as React from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getWeek,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ModuleEmptyState,
  ModuleSectionHeader,
  ModuleSurface,
} from "@/web-client/ui/ModulePrimitives";

function toDateOnlyKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type CalendarMode = "day" | "week" | "month" | "year";

const WEEKDAY_LABELS = ["DOM.", "SEG.", "TER.", "QUA.", "QUI.", "SEX.", "SAB."] as const;

type DateFieldOption = { value: string; label: string };

export function CalendarView<TItem>({
  items,
  getDate,
  renderItem,
  mode: controlledMode,
  onModeChange,
  selected: controlledSelected,
  onSelectedChange,
  dateFieldOptions,
  activeDateField,
  onActiveDateFieldChange,
  rangeFrom,
  rangeTo,
  onRangeFromChange,
  onRangeToChange,
  showModeSelect = true,
  showDateFieldSelect = true,
  showRangeInputs = true,
  className,
  emptyState = "Nenhum evento neste dia.",
}: {
  items: TItem[];
  getDate: (item: TItem) => Date | null;
  renderItem: (item: TItem) => React.ReactNode;
  mode?: CalendarMode;
  onModeChange?: (mode: CalendarMode) => void;
  selected?: Date;
  onSelectedChange?: (date: Date) => void;
  dateFieldOptions?: DateFieldOption[];
  activeDateField?: string;
  onActiveDateFieldChange?: (field: string) => void;
  rangeFrom?: string;
  rangeTo?: string;
  onRangeFromChange?: (value: string) => void;
  onRangeToChange?: (value: string) => void;
  showModeSelect?: boolean;
  showDateFieldSelect?: boolean;
  showRangeInputs?: boolean;
  className?: string;
  emptyState?: string;
}) {
  const [uncontrolledSelected, setUncontrolledSelected] = React.useState<Date>(new Date());
  const selected = controlledSelected ?? uncontrolledSelected;
  const setSelected = React.useCallback(
    (next: Date) => {
      onSelectedChange?.(next);
      if (!controlledSelected) setUncontrolledSelected(next);
    },
    [controlledSelected, onSelectedChange],
  );

  const [uncontrolledMode, setUncontrolledMode] =
    React.useState<CalendarMode>("month");
  const mode = controlledMode ?? uncontrolledMode;
  const setMode = React.useCallback(
    (next: CalendarMode) => {
      onModeChange?.(next);
      if (!controlledMode) setUncontrolledMode(next);
    },
    [controlledMode, onModeChange],
  );

  const byDay = React.useMemo(() => {
    const fromKey = rangeFrom?.trim() ? rangeFrom.trim() : null;
    const toKey = rangeTo?.trim() ? rangeTo.trim() : null;
    const map = new Map<string, TItem[]>();

    items.forEach((item) => {
      const date = getDate(item);
      if (!date) return;

      const key = toDateOnlyKey(date);
      if (fromKey && key < fromKey) return;
      if (toKey && key > toKey) return;

      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    });

    return map;
  }, [getDate, items, rangeFrom, rangeTo]);

  const isKeyInRange = React.useCallback(
    (key: string) => {
      const fromKey = rangeFrom?.trim() ? rangeFrom.trim() : null;
      const toKey = rangeTo?.trim() ? rangeTo.trim() : null;
      if (fromKey && key < fromKey) return false;
      if (toKey && key > toKey) return false;
      return true;
    },
    [rangeFrom, rangeTo],
  );

  const selectedKey = selected ? toDateOnlyKey(selected) : null;
  const selectedItems = selectedKey ? byDay.get(selectedKey) ?? [] : [];

  const title = React.useMemo(() => {
    if (mode === "year") return format(selected, "yyyy", { locale: ptBR });
    if (mode === "month") return format(selected, "MMMM yyyy", { locale: ptBR });
    if (mode === "week") {
      const start = startOfWeek(selected, { weekStartsOn: 0 });
      const end = addDays(start, 6);
      const sameMonth =
        start.getMonth() === end.getMonth() &&
        start.getFullYear() === end.getFullYear();

      return sameMonth
        ? `${format(start, "d", { locale: ptBR })} - ${format(end, "d 'de' MMMM yyyy", {
            locale: ptBR,
          })}`
        : `${format(start, "d 'de' MMM", { locale: ptBR })} - ${format(
            end,
            "d 'de' MMM yyyy",
            { locale: ptBR },
          )}`;
    }
    return format(selected, "d 'de' MMMM yyyy", { locale: ptBR });
  }, [mode, selected]);

  const goPrev = React.useCallback(() => {
    if (mode === "day") setSelected(addDays(selected, -1));
    else if (mode === "week") setSelected(addWeeks(selected, -1));
    else if (mode === "month") setSelected(addMonths(selected, -1));
    else setSelected(addYears(selected, -1));
  }, [mode, selected, setSelected]);

  const goNext = React.useCallback(() => {
    if (mode === "day") setSelected(addDays(selected, 1));
    else if (mode === "week") setSelected(addWeeks(selected, 1));
    else if (mode === "month") setSelected(addMonths(selected, 1));
    else setSelected(addYears(selected, 1));
  }, [mode, selected, setSelected]);

  const goToday = React.useCallback(() => setSelected(new Date()), [setSelected]);

  const monthGrid = React.useMemo(() => {
    const start = startOfWeek(startOfMonth(selected), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(selected), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [selected]);

  const weekGrid = React.useMemo(() => {
    const start = startOfWeek(selected, { weekStartsOn: 0 });
    const end = addDays(start, 6);
    return eachDayOfInterval({ start, end });
  }, [selected]);

  const yearMonths = React.useMemo(() => {
    const base = startOfYear(selected);
    return Array.from({ length: 12 }, (_, index) => addMonths(base, index));
  }, [selected]);

  const renderMonthGrid = React.useCallback(
    ({ days, compact }: { days: Date[]; compact: boolean }) => {
      const rows = Math.ceil(days.length / 7);
      const showWeekNumbers = !compact;

      return (
        <div
          className="grid rounded-lg border border-border/60 bg-background"
          style={{
            gridTemplateColumns: showWeekNumbers
              ? "auto repeat(7, minmax(0, 1fr))"
              : "repeat(7, minmax(0, 1fr))",
          }}
        >
          {Array.from({ length: rows }).map((_, rowIndex) => {
            const weekStart = days[rowIndex * 7]!;

            return (
              <React.Fragment key={`${weekStart.toISOString()}-row`}>
                {showWeekNumbers ? (
                  <div
                    className={cn(
                      "flex items-center justify-center border-b border-r border-border/60 text-[11px] font-medium text-muted-foreground",
                      compact ? "h-10" : "h-16",
                    )}
                  >
                    {getWeek(weekStart, { weekStartsOn: 0 })}
                  </div>
                ) : null}

                {days.slice(rowIndex * 7, rowIndex * 7 + 7).map((day) => {
                  const key = toDateOnlyKey(day);
                  const count = byDay.get(key)?.length ?? 0;
                  const isInMonth = isSameMonth(day, selected);
                  const isSelected = isSameDay(day, selected);
                  const today = isToday(day);
                  const inRange = isKeyInRange(key);

                  return (
                    <button
                      key={key}
                      type="button"
                      className={cn(
                        "relative border-b border-r border-border/60 text-left transition-colors hover:bg-muted/20 focus:outline-none",
                        compact ? "h-10 px-1.5" : "h-16 px-2",
                        !showWeekNumbers && day.getDay() === 6 ? "border-r-0" : undefined,
                        !isInMonth ? "bg-muted/5 text-muted-foreground/60" : undefined,
                        isSelected
                          ? "bg-primary/8 ring-1 ring-inset ring-primary/40"
                          : undefined,
                        !inRange ? "opacity-40 hover:bg-transparent" : undefined,
                      )}
                      onClick={inRange ? () => setSelected(day) : undefined}
                      disabled={!inRange}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className={cn(
                            "text-xs tabular-nums",
                            today ? "font-semibold text-primary" : "text-foreground",
                          )}
                        >
                          {format(day, "d", { locale: ptBR })}
                        </div>

                        {count ? (
                          <div
                            className={cn(
                              "rounded-full bg-primary/12 px-1.5 py-0.5 text-[10px] font-medium text-primary",
                              compact ? "leading-none" : undefined,
                            )}
                            title={`${count} evento(s)`}
                          >
                            {count}
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      );
    },
    [byDay, isKeyInRange, selected, setSelected],
  );

  return (
    <div className={cn("grid gap-4 lg:grid-cols-[1fr_360px] lg:items-start", className)}>
      <ModuleSurface>
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={goPrev}
              aria-label="Anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={goNext}
              aria-label="Proximo"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 px-3 text-xs"
              onClick={goToday}
            >
              Hoje
            </Button>
          </div>

          <div className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {title}
          </div>

          {showModeSelect ? (
            <Select value={mode} onValueChange={(value) => setMode(value as CalendarMode)}>
              <SelectTrigger className="h-8 w-[7rem] text-xs">
                <SelectValue placeholder="Visao..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Dia</SelectItem>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="month">Mes</SelectItem>
                <SelectItem value="year">Ano</SelectItem>
              </SelectContent>
            </Select>
          ) : null}

          {showDateFieldSelect && dateFieldOptions?.length && onActiveDateFieldChange ? (
            <Select
              value={
                dateFieldOptions.some((option) => option.value === activeDateField)
                  ? (activeDateField as string)
                  : dateFieldOptions[0]!.value
              }
              onValueChange={(value) => onActiveDateFieldChange(value)}
            >
              <SelectTrigger className="h-8 w-[12rem] text-xs">
                <SelectValue placeholder="Data..." />
              </SelectTrigger>
              <SelectContent>
                {dateFieldOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {showRangeInputs && onRangeFromChange ? (
            <Input
              type="date"
              value={rangeFrom ?? ""}
              onChange={(event) => onRangeFromChange(event.target.value)}
              className="h-8 w-[9rem] text-xs"
              title="Inicio"
            />
          ) : null}

          {showRangeInputs && onRangeToChange ? (
            <Input
              type="date"
              value={rangeTo ?? ""}
              onChange={(event) => onRangeToChange(event.target.value)}
              className="h-8 w-[9rem] text-xs"
              title="Fim"
            />
          ) : null}
        </div>

        <div className="p-3">
          {mode === "month" ? (
            <div className="space-y-2">
              <div
                className="grid text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground"
                style={{ gridTemplateColumns: "auto repeat(7, minmax(0, 1fr))" }}
              >
                <div className="px-2 py-1" />
                {WEEKDAY_LABELS.map((label) => (
                  <div key={label} className="px-2 py-1 text-center">
                    {label}
                  </div>
                ))}
              </div>
              {renderMonthGrid({ days: monthGrid, compact: false })}
            </div>
          ) : mode === "week" ? (
            <div className="grid grid-cols-7 gap-2">
              {weekGrid.map((day) => {
                const key = toDateOnlyKey(day);
                const selectedDay = isSameDay(day, selected);
                const count = byDay.get(key)?.length ?? 0;
                const inRange = isKeyInRange(key);

                return (
                  <button
                    key={key}
                    type="button"
                    className={cn(
                      "flex flex-col gap-2 rounded-lg border border-border/60 bg-background px-2 py-2 text-left hover:bg-muted/20",
                      selectedDay ? "ring-1 ring-inset ring-primary/40" : undefined,
                      !inRange ? "opacity-40 hover:bg-transparent" : undefined,
                    )}
                    onClick={inRange ? () => setSelected(day) : undefined}
                    disabled={!inRange}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={cn(
                          "text-xs font-medium uppercase tracking-[0.14em]",
                          isToday(day) ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        {WEEKDAY_LABELS[day.getDay()]}
                      </div>
                      {count ? (
                        <div className="rounded-full bg-primary/12 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          {count}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-sm font-medium tabular-nums text-foreground">
                      {format(day, "d", { locale: ptBR })}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : mode === "day" ? (
            <ModuleEmptyState
              title="Selecione uma data"
              description="Escolha um dia para ver os eventos."
              compact
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {yearMonths.map((monthDate) => {
                const monthDays = eachDayOfInterval({
                  start: startOfWeek(startOfMonth(monthDate), { weekStartsOn: 0 }),
                  end: endOfWeek(endOfMonth(monthDate), { weekStartsOn: 0 }),
                });

                return (
                  <div
                    key={monthDate.toISOString()}
                    className="overflow-hidden rounded-lg border border-border/60 bg-background"
                  >
                    <ModuleSectionHeader
                      title={format(monthDate, "MMMM", { locale: ptBR })}
                      className="px-3 pt-3"
                    />
                    <div className="px-2 pb-2">
                      <div className="grid grid-cols-7 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        {WEEKDAY_LABELS.map((label) => (
                          <div key={label} className="text-center">
                            {label.slice(0, 1)}
                          </div>
                        ))}
                      </div>
                      {renderMonthGrid({ days: monthDays, compact: true })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ModuleSurface>

      <ModuleSurface className="p-3">
        <ModuleSectionHeader
          title={selectedKey ?? "Selecione uma data"}
          meta={selectedItems.length ? `${selectedItems.length} evento(s)` : "-"}
        />
        {selectedItems.length ? (
          <div className="space-y-3 pt-3">
            {selectedItems.map((item, index) => (
              <div key={index}>{renderItem(item)}</div>
            ))}
          </div>
        ) : (
          <ModuleEmptyState
            title="Sem eventos"
            description={emptyState}
            compact
            className="pt-6"
          />
        )}
      </ModuleSurface>
    </div>
  );
}
