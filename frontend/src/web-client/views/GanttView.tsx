"use client";

import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModuleEmptyState, ModuleSurface } from "@/web-client/ui/ModulePrimitives";

type GanttScale = "week" | "month" | "quarter";

type GanttWindow = {
  start: Date;
  end: Date;
};

type GanttBounds = {
  start?: Date | null;
  end?: Date | null;
};

type GanttBarGeometry = {
  x: number;
  width: number;
  centerX: number;
  centerY: number;
  startX: number;
  endX: number;
};

type GanttRow<TItem, TChild> = {
  kind: "item" | "child";
  rowKey: string;
  itemId: string;
  item: TItem;
  child?: TChild;
  level: 0 | 1;
  window: GanttWindow | null;
  bounds: GanttBounds | null;
  isMilestone: boolean;
  dependencyIds: string[];
  editable: boolean;
  hasChildren: boolean;
  expanded: boolean;
  childCount: number;
};

type GanttGroup<TItem, TChild> = {
  key: string;
  label: string;
  rows: Array<GanttRow<TItem, TChild>>;
};

type GanttRenderRow<TItem, TChild> =
  | {
      kind: "group";
      key: string;
      label: string;
      top: number;
      height: number;
    }
  | {
      kind: "row";
      key: string;
      row: GanttRow<TItem, TChild>;
      top: number;
      height: number;
      geometry: GanttBarGeometry | null;
    };

type GanttDependencyEdge = {
  key: string;
  fromItemId: string;
  toItemId: string;
  path: string;
};

const ITEM_COLUMN_WIDTH = 288;
const GROUP_ROW_HEIGHT = 36;
const ITEM_ROW_HEIGHT = 56;
const MIN_BAR_WIDTH = 18;
const MILESTONE_SIZE = 14;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_LABELS = [
  "JAN",
  "FEV",
  "MAR",
  "ABR",
  "MAI",
  "JUN",
  "JUL",
  "AGO",
  "SET",
  "OUT",
  "NOV",
  "DEZ",
] as const;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return startOfDay(next);
}

function addMonths(date: Date, amount: number) {
  return startOfDay(new Date(date.getFullYear(), date.getMonth() + amount, 1));
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(next, diff);
}

function endOfWeek(date: Date) {
  return addDays(startOfWeek(date), 6);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfQuarter(date: Date) {
  const month = Math.floor(date.getMonth() / 3) * 3;
  return new Date(date.getFullYear(), month, 1);
}

function endOfQuarter(date: Date) {
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3 + 3, 0);
}

function formatWeekLabel(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")} ${MONTH_LABELS[date.getMonth()]}`;
}

function formatMonthLabel(date: Date) {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatQuarterLabel(date: Date) {
  return `T${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
}

function normalizeItemWindow(start: Date | null, end: Date | null): GanttWindow | null {
  if (!start && !end) {
    return null;
  }

  const safeStart = startOfDay(start ?? end ?? new Date());
  const safeEnd = startOfDay(end ?? start ?? new Date());
  if (safeStart.getTime() <= safeEnd.getTime()) {
    return { start: safeStart, end: safeEnd };
  }

  return { start: safeEnd, end: safeStart };
}

function normalizeBounds(bounds?: GanttBounds | null): GanttBounds | null {
  if (!bounds) return null;
  const start = bounds.start ? startOfDay(bounds.start) : null;
  const end = bounds.end ? startOfDay(bounds.end) : null;
  if (!start && !end) return null;
  if (start && end && start.getTime() > end.getTime()) {
    return { start: end, end: start };
  }
  return { start, end };
}

function resolveGroupValues(value: unknown) {
  if (Array.isArray(value)) {
    const values = Array.from(
      new Set(value.map((entry) => String(entry ?? "").trim()).filter(Boolean)),
    );
    return values.length ? values : ["Sem valor"];
  }

  const normalized = String(value ?? "").trim();
  return [normalized || "Sem valor"];
}

function defaultGroupLabel(value: unknown) {
  return String(value ?? "Sem valor");
}

function getColumnWidth(scale: GanttScale) {
  switch (scale) {
    case "week":
      return 152;
    case "quarter":
      return 280;
    case "month":
    default:
      return 220;
  }
}

function buildColumns(minimumDate: Date | null, maximumDate: Date | null, scale: GanttScale) {
  const fallbackDate = startOfDay(new Date());
  const minDate = minimumDate ?? fallbackDate;
  const maxDate = maximumDate ?? minimumDate ?? fallbackDate;

  let cursor: Date;
  let endBoundary: Date;
  let advance: (date: Date) => Date;
  let label: (date: Date) => string;

  switch (scale) {
    case "week":
      cursor = startOfWeek(minDate);
      endBoundary = endOfWeek(maxDate);
      advance = (date) => addDays(date, 7);
      label = formatWeekLabel;
      break;
    case "quarter":
      cursor = startOfQuarter(minDate);
      endBoundary = endOfQuarter(maxDate);
      advance = (date) => addMonths(date, 3);
      label = formatQuarterLabel;
      break;
    case "month":
    default:
      cursor = startOfMonth(minDate);
      endBoundary = endOfMonth(maxDate);
      advance = (date) => addMonths(date, 1);
      label = formatMonthLabel;
      break;
  }

  const columns: Array<{ key: string; label: string; start: Date; end: Date }> = [];
  while (cursor.getTime() <= endBoundary.getTime()) {
    const start = cursor;
    const end =
      scale === "week"
        ? endOfWeek(start)
        : scale === "quarter"
          ? endOfQuarter(start)
          : endOfMonth(start);
    columns.push({
      key: `${scale}:${start.toISOString()}`,
      label: label(start),
      start,
      end,
    });
    cursor = advance(start);
  }

  return columns;
}

function areWindowsEqual(left: GanttWindow | null, right: GanttWindow | null) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return (
    startOfDay(left.start).getTime() === startOfDay(right.start).getTime() &&
    startOfDay(left.end).getTime() === startOfDay(right.end).getTime()
  );
}

function applyWindowDelta(
  window: GanttWindow,
  deltaDays: number,
  mode: "move" | "start" | "end",
) {
  if (!deltaDays) return window;

  if (mode === "move") {
    return {
      start: addDays(window.start, deltaDays),
      end: addDays(window.end, deltaDays),
    };
  }

  if (mode === "start") {
    const nextStart = addDays(window.start, deltaDays);
    return {
      start: nextStart.getTime() <= window.end.getTime() ? nextStart : window.end,
      end: window.end,
    };
  }

  const nextEnd = addDays(window.end, deltaDays);
  return {
    start: window.start,
    end: nextEnd.getTime() >= window.start.getTime() ? nextEnd : window.start,
  };
}

function clampWindowToBounds(
  window: GanttWindow,
  bounds: GanttBounds | null | undefined,
  mode: "move" | "start" | "end",
) {
  const normalizedBounds = normalizeBounds(bounds);
  if (!normalizedBounds?.start && !normalizedBounds?.end) {
    return window;
  }

  let nextStart = window.start;
  let nextEnd = window.end;

  if (mode === "move") {
    const durationDays = Math.round((nextEnd.getTime() - nextStart.getTime()) / DAY_MS);

    if (normalizedBounds.start && nextStart.getTime() < normalizedBounds.start.getTime()) {
      nextStart = normalizedBounds.start;
      nextEnd = addDays(nextStart, durationDays);
    }

    if (normalizedBounds.end && nextEnd.getTime() > normalizedBounds.end.getTime()) {
      nextEnd = normalizedBounds.end;
      nextStart = addDays(nextEnd, -durationDays);
    }

    if (normalizedBounds.start && nextStart.getTime() < normalizedBounds.start.getTime()) {
      nextStart = normalizedBounds.start;
    }

    if (normalizedBounds.end && nextEnd.getTime() > normalizedBounds.end.getTime()) {
      nextEnd = normalizedBounds.end;
    }
  } else if (mode === "start") {
    if (normalizedBounds.start && nextStart.getTime() < normalizedBounds.start.getTime()) {
      nextStart = normalizedBounds.start;
    }
    if (normalizedBounds.end && nextStart.getTime() > normalizedBounds.end.getTime()) {
      nextStart = normalizedBounds.end;
    }
  } else {
    if (normalizedBounds.end && nextEnd.getTime() > normalizedBounds.end.getTime()) {
      nextEnd = normalizedBounds.end;
    }
    if (normalizedBounds.start && nextEnd.getTime() < normalizedBounds.start.getTime()) {
      nextEnd = normalizedBounds.start;
    }
  }

  if (nextStart.getTime() > nextEnd.getTime()) {
    if (mode === "start") {
      nextStart = nextEnd;
    } else {
      nextEnd = nextStart;
    }
  }

  return {
    start: nextStart,
    end: nextEnd,
  };
}

function buildDependencyPath(from: GanttBarGeometry, to: GanttBarGeometry) {
  const startX = from.endX;
  const endX = to.startX;
  const startY = from.centerY;
  const endY = to.centerY;
  const elbowX = startX + Math.max(18, Math.min(54, (endX - startX) / 2));
  return `M ${startX} ${startY} H ${elbowX} V ${endY} H ${endX}`;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function getBarGeometry(
  window: GanttWindow,
  timelineStart: Date,
  timelineEnd: Date,
  timelineWidth: number,
  centerY: number,
  isMilestone: boolean,
): GanttBarGeometry {
  const rangeStart = startOfDay(timelineStart).getTime();
  const rangeEnd = addDays(startOfDay(timelineEnd), 1).getTime();
  const total = Math.max(rangeEnd - rangeStart, DAY_MS);
  const windowStart = clamp(startOfDay(window.start).getTime(), rangeStart, rangeEnd);
  const windowEnd = clamp(addDays(startOfDay(window.end), 1).getTime(), rangeStart, rangeEnd);

  if (isMilestone) {
    const centerX =
      ((clamp(startOfDay(window.end).getTime(), rangeStart, rangeEnd) - rangeStart) / total) *
      timelineWidth;
    return {
      x: centerX - MILESTONE_SIZE / 2,
      width: MILESTONE_SIZE,
      centerX,
      centerY,
      startX: centerX,
      endX: centerX,
    };
  }

  const x = ((windowStart - rangeStart) / total) * timelineWidth;
  const xEnd = ((windowEnd - rangeStart) / total) * timelineWidth;
  const width = Math.max(MIN_BAR_WIDTH, xEnd - x);
  return {
    x,
    width,
    centerX: x + width / 2,
    centerY,
    startX: x,
    endX: x + width,
  };
}

export function GanttView<TItem, TChild = unknown>({
  items,
  getItemId,
  getItemLabel,
  getStartDate,
  getEndDate,
  renderTitle,
  renderMeta,
  getProgress,
  renderExternalLabel,
  getGroupValue,
  getGroupLabel = defaultGroupLabel,
  getDependencyIds,
  getIsMilestone,
  onItemClick,
  onItemDateRangeChange,
  isItemDateRangeEditable,
  getItemConstraintWindow,
  getChildren,
  getChildId,
  getChildLabel,
  getChildStartDate,
  getChildEndDate,
  renderChildTitle,
  renderChildMeta,
  getChildProgress,
  renderChildExternalLabel,
  getChildIsMilestone,
  onChildClick,
  onChildDateRangeChange,
  isChildDateRangeEditable,
  getChildConstraintWindow,
  scale = "month",
  emptyState = "Nada para exibir no cronograma.",
  className,
}: {
  items: TItem[];
  getItemId: (item: TItem) => string;
  getItemLabel: (item: TItem) => string;
  getStartDate: (item: TItem) => Date | null;
  getEndDate: (item: TItem) => Date | null;
  renderTitle?: (item: TItem) => React.ReactNode;
  renderMeta?: (item: TItem) => React.ReactNode;
  getProgress?: (item: TItem) => number | null | undefined;
  renderExternalLabel?: (item: TItem) => React.ReactNode;
  getGroupValue?: (item: TItem) => unknown;
  getGroupLabel?: (value: unknown) => string;
  getDependencyIds?: (item: TItem) => string[];
  getIsMilestone?: (item: TItem) => boolean;
  onItemClick?: (item: TItem) => void;
  onItemDateRangeChange?: (item: TItem, nextWindow: GanttWindow) => Promise<void> | void;
  isItemDateRangeEditable?: (item: TItem) => boolean;
  getItemConstraintWindow?: (item: TItem) => GanttBounds | null;
  getChildren?: (item: TItem) => TChild[];
  getChildId?: (child: TChild, item: TItem) => string;
  getChildLabel?: (child: TChild, item: TItem) => string;
  getChildStartDate?: (child: TChild, item: TItem) => Date | null;
  getChildEndDate?: (child: TChild, item: TItem) => Date | null;
  renderChildTitle?: (child: TChild, item: TItem) => React.ReactNode;
  renderChildMeta?: (child: TChild, item: TItem) => React.ReactNode;
  getChildProgress?: (child: TChild, item: TItem) => number | null | undefined;
  renderChildExternalLabel?: (child: TChild, item: TItem) => React.ReactNode;
  getChildIsMilestone?: (child: TChild, item: TItem) => boolean;
  onChildClick?: (child: TChild, item: TItem) => void;
  onChildDateRangeChange?: (
    child: TChild,
    item: TItem,
    nextWindow: GanttWindow,
  ) => Promise<void> | void;
  isChildDateRangeEditable?: (child: TChild, item: TItem) => boolean;
  getChildConstraintWindow?: (child: TChild, item: TItem) => GanttBounds | null;
  scale?: GanttScale;
  emptyState?: string;
  className?: string;
}) {
  const [expandedIds, setExpandedIds] = React.useState<string[]>([]);
  const [windowOverrides, setWindowOverrides] = React.useState<Record<string, GanttWindow>>({});
  const [pendingIds, setPendingIds] = React.useState<string[]>([]);
  const [selectedDependencyKey, setSelectedDependencyKey] = React.useState<string | null>(null);
  const dragStateRef = React.useRef<{
    rowKey: string;
    row: GanttRow<TItem, TChild>;
    mode: "move" | "start" | "end";
    originX: number;
    initialWindow: GanttWindow;
    pixelsPerDay: number;
    didMove: boolean;
  } | null>(null);

  const groups = React.useMemo(() => {
    const groupMap = new Map<string, GanttGroup<TItem, TChild>>();

    items.forEach((item) => {
      const itemId = getItemId(item);
      const children = getChildren?.(item) ?? [];
      const itemRow: Omit<GanttRow<TItem, TChild>, "rowKey"> = {
        kind: "item",
        itemId,
        item,
        level: 0,
        window: normalizeItemWindow(getStartDate(item), getEndDate(item)),
        bounds: normalizeBounds(getItemConstraintWindow?.(item)),
        isMilestone: getIsMilestone?.(item) ?? false,
        dependencyIds: getDependencyIds?.(item) ?? [],
        editable: Boolean(onItemDateRangeChange) && (isItemDateRangeEditable?.(item) ?? true),
        hasChildren: children.length > 0,
        expanded: expandedIds.includes(itemId),
        childCount: children.length,
      };

      resolveGroupValues(getGroupValue ? getGroupValue(item) : "Todos").forEach((groupValue) => {
        const groupKey = String(groupValue ?? "Sem valor");
        const group =
          groupMap.get(groupKey) ??
          {
            key: groupKey,
            label: getGroupLabel(groupValue),
            rows: [],
          };

        group.rows.push({
          ...itemRow,
          rowKey: `${groupKey}::${itemId}`,
        });

        if (itemRow.expanded && children.length) {
          children.forEach((child) => {
            const childId = getChildId?.(child, item) ?? `${itemId}:child`;
            group.rows.push({
              kind: "child",
              rowKey: `${groupKey}::${itemId}::${childId}`,
              itemId,
              item,
              child,
              level: 1,
              window: normalizeItemWindow(
                getChildStartDate?.(child, item) ?? null,
                getChildEndDate?.(child, item) ?? null,
              ),
              bounds: normalizeBounds(getChildConstraintWindow?.(child, item)),
              isMilestone: getChildIsMilestone?.(child, item) ?? false,
              dependencyIds: [],
              editable:
                Boolean(onChildDateRangeChange) &&
                (isChildDateRangeEditable?.(child, item) ?? true),
              hasChildren: false,
              expanded: false,
              childCount: 0,
            });
          });
        }

        groupMap.set(groupKey, group);
      });
    });

    return Array.from(groupMap.values());
  }, [
    expandedIds,
    getChildEndDate,
    getChildConstraintWindow,
    getChildId,
    getChildIsMilestone,
    getChildStartDate,
    getChildren,
    getDependencyIds,
    getEndDate,
    getGroupLabel,
    getGroupValue,
    getItemConstraintWindow,
    getIsMilestone,
    getItemId,
    getStartDate,
    isChildDateRangeEditable,
    isItemDateRangeEditable,
    items,
    onChildDateRangeChange,
    onItemDateRangeChange,
  ]);

  const timelineMeta = React.useMemo(() => {
    const windows = groups.flatMap((group) =>
      group.rows.map((row) => row.window).filter(Boolean) as GanttWindow[],
    );

    if (!windows.length) {
      return null;
    }

    const minimumDate = windows.reduce(
      (current, entry) => (entry.start.getTime() < current.getTime() ? entry.start : current),
      windows[0].start,
    );
    const maximumDate = windows.reduce(
      (current, entry) => (entry.end.getTime() > current.getTime() ? entry.end : current),
      windows[0].end,
    );
    const columns = buildColumns(minimumDate, maximumDate, scale);
    const columnWidth = getColumnWidth(scale);

    return {
      columns,
      columnWidth,
      timelineWidth: columns.length * columnWidth,
      timelineStart: columns[0].start,
      timelineEnd: columns[columns.length - 1].end,
    };
  }, [groups, scale]);

  React.useEffect(() => {
    if (!groups.length) {
      setWindowOverrides({});
      return;
    }

    const validKeys = new Set(groups.flatMap((group) => group.rows.map((row) => row.rowKey)));
    setWindowOverrides((previous) => {
      let next: Record<string, GanttWindow> | null = null;
      Object.keys(previous).forEach((key) => {
        if (!validKeys.has(key)) {
          next ??= { ...previous };
          delete next[key];
        }
      });
      return next ?? previous;
    });
  }, [groups]);

  const renderPlan = React.useMemo(() => {
    if (!timelineMeta) {
      return {
        rows: [] as Array<GanttRenderRow<TItem, TChild>>,
        totalHeight: 0,
        dependencyEdges: [] as GanttDependencyEdge[],
        todayX: null as number | null,
      };
    }

    const rows: Array<GanttRenderRow<TItem, TChild>> = [];
    const barPositions = new Map<string, GanttBarGeometry>();
    let top = 0;

    groups.forEach((group) => {
      rows.push({
        kind: "group",
        key: `group:${group.key}`,
        label: group.label,
        top,
        height: GROUP_ROW_HEIGHT,
      });
      top += GROUP_ROW_HEIGHT;

      group.rows.forEach((row) => {
        const activeWindow = windowOverrides[row.rowKey] ?? row.window;
        const geometry = activeWindow
          ? getBarGeometry(
              activeWindow,
              timelineMeta.timelineStart,
              timelineMeta.timelineEnd,
              timelineMeta.timelineWidth,
              top + ITEM_ROW_HEIGHT / 2,
              row.isMilestone,
            )
          : null;

        if (row.kind === "item" && geometry && !barPositions.has(row.itemId)) {
          barPositions.set(row.itemId, geometry);
        }

        rows.push({
          kind: "row",
          key: row.rowKey,
          row,
          top,
          height: ITEM_ROW_HEIGHT,
          geometry,
        });
        top += ITEM_ROW_HEIGHT;
      });
    });

    const dependencyEdges = rows.flatMap((entry) => {
      if (entry.kind !== "row" || entry.row.kind !== "item" || !entry.geometry) {
        return [];
      }

      const entryGeometry = entry.geometry;
      return entry.row.dependencyIds
        .map((dependencyId) => {
          const dependencyGeometry = barPositions.get(dependencyId);
          if (!dependencyGeometry) return null;
          return {
            key: `${dependencyId}->${entry.row.itemId}`,
            fromItemId: dependencyId,
            toItemId: entry.row.itemId,
            path: buildDependencyPath(dependencyGeometry, entryGeometry),
          };
        })
        .filter((edge): edge is GanttDependencyEdge => Boolean(edge));
    });

    const today = startOfDay(new Date());
    const totalRange =
      addDays(timelineMeta.timelineEnd, 1).getTime() -
      startOfDay(timelineMeta.timelineStart).getTime();
    const todayX =
      today.getTime() >= startOfDay(timelineMeta.timelineStart).getTime() &&
      today.getTime() <= addDays(timelineMeta.timelineEnd, 1).getTime()
        ? ((today.getTime() - startOfDay(timelineMeta.timelineStart).getTime()) / totalRange) *
          timelineMeta.timelineWidth
        : null;

    return {
      rows,
      totalHeight: top,
      dependencyEdges,
      todayX,
    };
  }, [groups, timelineMeta, windowOverrides]);

  const handleCommitWindow = React.useCallback(
    async (row: GanttRow<TItem, TChild>, nextWindow: GanttWindow) => {
      setPendingIds((previous) => Array.from(new Set([...previous, row.rowKey])));
      try {
        if (row.kind === "item") {
          await onItemDateRangeChange?.(row.item, nextWindow);
        } else if (row.child) {
          await onChildDateRangeChange?.(row.child, row.item, nextWindow);
        }
      } catch (error) {
        setWindowOverrides((previous) => {
          const next = { ...previous };
          delete next[row.rowKey];
          return next;
        });
        throw error;
      } finally {
        setPendingIds((previous) => previous.filter((entry) => entry !== row.rowKey));
      }
    },
    [onChildDateRangeChange, onItemDateRangeChange],
  );

  React.useEffect(() => {
    return () => {
      dragStateRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    if (
      selectedDependencyKey &&
      !renderPlan.dependencyEdges.some((edge) => edge.key === selectedDependencyKey)
    ) {
      setSelectedDependencyKey(null);
    }
  }, [renderPlan.dependencyEdges, selectedDependencyKey]);

  const selectedDependency = React.useMemo(
    () =>
      selectedDependencyKey
        ? renderPlan.dependencyEdges.find((edge) => edge.key === selectedDependencyKey) ?? null
        : null,
    [renderPlan.dependencyEdges, selectedDependencyKey],
  );
  const selectedItemIds = React.useMemo(() => {
    const ids = new Set<string>();
    if (selectedDependency) {
      ids.add(selectedDependency.fromItemId);
      ids.add(selectedDependency.toItemId);
    }
    return ids;
  }, [selectedDependency]);
  const itemLabels = React.useMemo(() => {
    const labels = new Map<string, string>();
    items.forEach((item) => {
      labels.set(getItemId(item), getItemLabel(item));
    });
    return labels;
  }, [getItemId, getItemLabel, items]);
  const selectedDependencySummary = React.useMemo(() => {
    if (!selectedDependency) {
      return null;
    }

    const blocker = itemLabels.get(selectedDependency.fromItemId) ?? selectedDependency.fromItemId;
    const blocked = itemLabels.get(selectedDependency.toItemId) ?? selectedDependency.toItemId;
    return {
      blocker,
      blocked,
    };
  }, [itemLabels, selectedDependency]);

  const handlePointerDown = React.useCallback(
    (
      event: React.PointerEvent<HTMLDivElement>,
      row: GanttRow<TItem, TChild>,
      mode: "move" | "start" | "end",
    ) => {
      if (!timelineMeta) return;
      const activeWindow = windowOverrides[row.rowKey] ?? row.window;
      if (!activeWindow || !row.editable) return;

      event.preventDefault();
      event.stopPropagation();

      const rangeStart = startOfDay(timelineMeta.timelineStart).getTime();
      const rangeEnd = addDays(timelineMeta.timelineEnd, 1).getTime();
      const pixelsPerDay =
        timelineMeta.timelineWidth / Math.max((rangeEnd - rangeStart) / DAY_MS, 1);

      dragStateRef.current = {
        rowKey: row.rowKey,
        row,
        mode,
        originX: event.clientX,
        initialWindow: activeWindow,
        pixelsPerDay,
        didMove: false,
      };

      const handlePointerMove = (nextEvent: PointerEvent) => {
        const dragState = dragStateRef.current;
        if (!dragState) return;

        const deltaDays = Math.round(
          (nextEvent.clientX - dragState.originX) / dragState.pixelsPerDay,
        );
        const nextWindow = clampWindowToBounds(
          applyWindowDelta(dragState.initialWindow, deltaDays, dragState.mode),
          dragState.row.bounds,
          dragState.mode,
        );
        dragState.didMove = dragState.didMove || deltaDays !== 0;
        setWindowOverrides((previous) => ({
          ...previous,
          [dragState.rowKey]: nextWindow,
        }));
      };

      const handlePointerUp = (nextEvent: PointerEvent) => {
        const dragState = dragStateRef.current;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        dragStateRef.current = null;

        if (!dragState) return;

        const deltaDays = Math.round(
          (nextEvent.clientX - dragState.originX) / dragState.pixelsPerDay,
        );
        const nextWindow = clampWindowToBounds(
          applyWindowDelta(dragState.initialWindow, deltaDays, dragState.mode),
          dragState.row.bounds,
          dragState.mode,
        );
        if (!dragState.didMove || areWindowsEqual(dragState.initialWindow, nextWindow)) {
          setWindowOverrides((previous) => {
            const next = { ...previous };
            delete next[dragState.rowKey];
            return next;
          });
          return;
        }

        void handleCommitWindow(dragState.row, nextWindow);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [handleCommitWindow, timelineMeta, windowOverrides],
  );

  if (!items.length) {
    return <ModuleEmptyState title="Sem registros" description={emptyState} />;
  }

  if (!timelineMeta) {
    return (
      <ModuleEmptyState
        title="Sem cronograma"
        description="Inclua datas de inicio ou entrega para visualizar o Gantt."
      />
    );
  }

  return (
    <ModuleSurface className={cn("overflow-hidden", className)}>
      <div className="overflow-auto" onClick={() => setSelectedDependencyKey(null)}>
        <div
          className="relative min-w-full"
          style={{ minWidth: ITEM_COLUMN_WIDTH + timelineMeta.timelineWidth }}
        >
          <div className="sticky top-0 z-40 flex border-b border-border/60 bg-background/95 backdrop-blur">
            <div
              className="sticky left-0 z-50 shrink-0 border-r border-border/60 bg-background px-5 py-5 shadow-[10px_0_18px_-18px_rgba(15,23,42,0.45)]"
              style={{ width: ITEM_COLUMN_WIDTH }}
            >
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Tarefa
              </div>
            </div>

            <div
              className="relative shrink-0 overflow-hidden"
              style={{ width: timelineMeta.timelineWidth }}
            >
              <div className="flex">
                {timelineMeta.columns.map((column) => (
                  <div
                    key={column.key}
                    className="shrink-0 border-l border-border/60 px-4 py-5 first:border-l-0"
                    style={{ width: timelineMeta.columnWidth }}
                  >
                    <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      {column.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {selectedDependencySummary ? (
            <div className="sticky left-0 top-[68px] z-30 flex border-b border-primary/20 bg-primary/5 px-5 py-2 text-xs">
              <div className="min-w-0 truncate text-primary">
                <span className="font-medium">Dependencia selecionada:</span>{" "}
                <span className="text-foreground">{selectedDependencySummary.blocked}</span>
                <span className="text-muted-foreground"> bloqueada por </span>
                <span className="text-foreground">{selectedDependencySummary.blocker}</span>
              </div>
            </div>
          ) : null}

          <div className="relative">
            <div
              className="pointer-events-none absolute top-0 z-10"
              style={{
                left: ITEM_COLUMN_WIDTH,
                width: timelineMeta.timelineWidth,
                height: renderPlan.totalHeight,
              }}
            >
              {renderPlan.todayX !== null ? (
                <div
                  className="pointer-events-none absolute bottom-0 top-0 w-px bg-primary/40"
                  style={{ left: renderPlan.todayX }}
                />
              ) : null}

              {renderPlan.dependencyEdges.length ? (
                <svg
                  className="pointer-events-auto absolute inset-0 overflow-visible"
                  width={timelineMeta.timelineWidth}
                  height={renderPlan.totalHeight}
                  viewBox={`0 0 ${timelineMeta.timelineWidth} ${renderPlan.totalHeight}`}
                  fill="none"
                >
                  <defs>
                    <marker
                      id="gantt-arrow"
                      markerWidth="8"
                      markerHeight="8"
                      refX="6"
                      refY="4"
                      orient="auto"
                    >
                      <path d="M0 0L8 4L0 8Z" fill="currentColor" />
                    </marker>
                  </defs>
                  {renderPlan.dependencyEdges.map((edge) => {
                    const isSelected = edge.key === selectedDependencyKey;
                    return (
                      <g key={edge.key} className="pointer-events-auto">
                        <path
                          d={edge.path}
                          stroke="transparent"
                          strokeWidth="10"
                          fill="none"
                          className="cursor-pointer"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedDependencyKey((previous) =>
                              previous === edge.key ? null : edge.key,
                            );
                          }}
                        />
                        <path
                          d={edge.path}
                          stroke="currentColor"
                          strokeWidth={isSelected ? "2.25" : "1.5"}
                          strokeDasharray={isSelected ? undefined : "4 3"}
                          className={isSelected ? "text-primary" : "text-primary/40"}
                          markerEnd="url(#gantt-arrow)"
                        />
                      </g>
                    );
                  })}
                </svg>
              ) : null}
            </div>

            {renderPlan.rows.map((entry) => {
              if (entry.kind === "group") {
                return (
                  <div key={entry.key} className="flex border-b border-border/50">
                    <div
                      className="sticky left-0 z-30 shrink-0 border-r border-border/60 bg-muted/15 px-5 py-2 shadow-[10px_0_18px_-18px_rgba(15,23,42,0.45)]"
                      style={{ width: ITEM_COLUMN_WIDTH, height: entry.height }}
                    >
                      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        {entry.label}
                      </div>
                    </div>
                    <div
                      className="relative shrink-0 bg-muted/5"
                      style={{ width: timelineMeta.timelineWidth, height: entry.height }}
                    />
                  </div>
                );
              }

              const { row, geometry } = entry;
              const isPending = pendingIds.includes(row.rowKey);
              const isSelectedRow = row.kind === "item" && selectedItemIds.has(row.itemId);
              const isBlockedRow = row.kind === "item" && row.dependencyIds.length > 0;
              const titleNode =
                row.kind === "item"
                  ? renderTitle?.(row.item) ?? getItemLabel(row.item)
                  : row.child
                    ? renderChildTitle?.(row.child, row.item) ??
                      getChildLabel?.(row.child, row.item) ??
                      ""
                    : "";
              const metaNode =
                row.kind === "item"
                  ? renderMeta?.(row.item)
                  : row.child
                    ? renderChildMeta?.(row.child, row.item)
                    : null;
              const progress =
                row.kind === "item"
                  ? getProgress?.(row.item)
                  : row.child
                    ? getChildProgress?.(row.child, row.item)
                    : null;
              const externalLabel =
                row.kind === "item"
                  ? renderExternalLabel?.(row.item)
                  : row.child
                    ? renderChildExternalLabel?.(row.child, row.item)
                    : null;
              const showExternalLabel =
                Boolean(externalLabel) &&
                (!geometry || row.kind === "child" || row.isMilestone || geometry.width < 110);

              return (
                <div key={entry.key} className="flex border-b border-border/50 last:border-b-0">
                  <div
                    className={cn(
                      "sticky left-0 z-30 shrink-0 border-r border-border/60 px-4 py-2 shadow-[10px_0_18px_-18px_rgba(15,23,42,0.45)]",
                      isSelectedRow
                        ? "bg-primary/8 ring-1 ring-inset ring-primary/25"
                        : isBlockedRow
                          ? "bg-amber-500/5"
                          : "bg-background",
                    )}
                    style={{ width: ITEM_COLUMN_WIDTH, height: entry.height }}
                  >
                    <div
                      className={cn(
                        "flex h-full min-w-0 items-center gap-2",
                        row.level === 1 && "pl-7",
                      )}
                    >
                      {row.kind === "item" && row.hasChildren ? (
                        <button
                          type="button"
                          className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
                          onClick={() =>
                            setExpandedIds((previous) =>
                              previous.includes(row.itemId)
                                ? previous.filter((entryId) => entryId !== row.itemId)
                                : [...previous, row.itemId],
                            )
                          }
                        >
                          {row.expanded ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </button>
                      ) : row.level === 1 ? (
                        <div className="size-6 shrink-0" />
                      ) : null}

                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => {
                          if (row.kind === "item") {
                            onItemClick?.(row.item);
                          } else if (row.child) {
                            onChildClick?.(row.child, row.item);
                          }
                        }}
                      >
                        <div className="truncate text-sm font-medium text-foreground">
                          {titleNode}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          {isBlockedRow ? (
                            <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-amber-700 dark:text-amber-200">
                              Bloqueada
                            </span>
                          ) : null}
                          {row.kind === "item" && row.childCount ? (
                            <span>{row.childCount} subtarefa(s)</span>
                          ) : null}
                          {metaNode ? <span className="truncate">{metaNode}</span> : null}
                        </div>
                      </button>
                    </div>
                  </div>

                  <div
                    className="relative shrink-0"
                    style={{ width: timelineMeta.timelineWidth, height: entry.height }}
                  >
                    <div className="absolute inset-0 flex">
                      {timelineMeta.columns.map((column) => (
                        <div
                          key={`${entry.key}:${column.key}`}
                          className="h-full shrink-0 border-l border-border/40 first:border-l-0"
                          style={{ width: timelineMeta.columnWidth }}
                        />
                      ))}
                    </div>

                    {geometry ? (
                      <div
                        className="absolute inset-y-0"
                        style={{
                          left: geometry.x,
                          width: row.isMilestone ? MILESTONE_SIZE : geometry.width,
                        }}
                      >
                        {row.isMilestone ? (
                          <div
                            className={cn(
                              "absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[3px] border shadow-sm transition",
                              row.kind === "child"
                                ? "border-sky-500/50 bg-sky-500/90"
                                : "border-primary/50 bg-primary/90",
                              isSelectedRow && "ring-4 ring-primary/15",
                              isBlockedRow && row.kind === "item" && "border-amber-500/50 bg-amber-500/85",
                              row.editable && "cursor-grab active:cursor-grabbing",
                              isPending && "opacity-60",
                            )}
                            onPointerDown={
                              row.editable
                                ? (event) => handlePointerDown(event, row, "move")
                                : undefined
                            }
                          />
                        ) : (
                          <div
                            className={cn(
                              "absolute left-0 top-1/2 h-9 -translate-y-1/2 rounded-md border shadow-sm transition",
                              row.kind === "child"
                                ? "border-sky-500/30 bg-sky-500/10"
                                : "border-primary/30 bg-primary/15",
                              isSelectedRow && "ring-2 ring-primary/20",
                              isBlockedRow && row.kind === "item" && "border-amber-500/35 bg-amber-500/10",
                              row.editable && "cursor-grab active:cursor-grabbing",
                              isPending && "opacity-60",
                            )}
                            style={{ width: geometry.width }}
                            onPointerDown={
                              row.editable
                                ? (event) => handlePointerDown(event, row, "move")
                                : undefined
                            }
                          >
                            <div
                              className={cn(
                                "absolute inset-y-0 left-0 rounded-md",
                                row.kind === "child" ? "bg-sky-500/75" : "bg-primary/75",
                                isBlockedRow && row.kind === "item" && "bg-amber-500/80",
                              )}
                              style={{ width: `${clamp(Number(progress ?? 0), 0, 100)}%` }}
                            />
                            <div className="relative flex h-full items-center px-3 text-xs font-medium text-primary-foreground/95">
                              <span className="truncate">
                                {row.kind === "item"
                                  ? getItemLabel(row.item)
                                  : row.child
                                    ? getChildLabel?.(row.child, row.item)
                                    : ""}
                              </span>
                            </div>

                            {row.editable ? (
                              <>
                                <div
                                  className="absolute inset-y-0 left-0 w-2 cursor-ew-resize rounded-l-md"
                                  onPointerDown={(event) => handlePointerDown(event, row, "start")}
                                />
                                <div
                                  className="absolute inset-y-0 right-0 w-2 cursor-ew-resize rounded-r-md"
                                  onPointerDown={(event) => handlePointerDown(event, row, "end")}
                                />
                              </>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ) : null}

                    {geometry && showExternalLabel ? (
                      <div
                        className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-[10px] leading-tight text-muted-foreground"
                        style={{
                          left: Math.min(
                            geometry.x + (row.isMilestone ? MILESTONE_SIZE : geometry.width) + 8,
                            Math.max(12, timelineMeta.timelineWidth - 176),
                          ),
                          maxWidth: 168,
                        }}
                      >
                        <div className="truncate">{externalLabel}</div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ModuleSurface>
  );
}
