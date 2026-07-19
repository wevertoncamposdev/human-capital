import { parseJsonArray } from '../../core/utils/json';

export type AdvancedFilter = {
  columnId: string;
  operator:
    | 'equals'
    | 'contains'
    | 'in'
    | 'notIn'
    | 'isEmpty'
    | 'isNotEmpty'
    | 'between'
    | 'gt'
    | 'lt'
    | 'gte'
    | 'lte'
    | 'starts'
    | 'ends';
  value: string;
};

export type TaskListRow = {
  id: string;
  title: string;
  summary: string | null;
  description: string | null;
  status: string;
  priority: string;
  kind: string;
  owner: string | null;
  team: string | null;
  startDate: string | null;
  dueDate: string | null;
  isMilestone: boolean;
  progress: number;
  effortPoints: number | null;
  tags: string[];
  dueState?: string;
  createdAt: string;
  updatedAt: string;
};

const TEXT_FIELDS = new Set([
  'title',
  'summary',
  'description',
  'owner',
  'team',
  'dueState',
]);
const ENUM_FIELDS = new Set(['status', 'priority', 'kind', 'dueState']);
const DATE_FIELDS = new Set(['startDate', 'dueDate', 'createdAt', 'updatedAt']);
const NUMBER_FIELDS = new Set(['progress', 'effortPoints']);
const BOOLEAN_FIELDS = new Set(['isMilestone']);

const parseBetween = (raw: string) =>
  raw
    .split('..')
    .flatMap((part) => part.split(','))
    .map((value) => value.trim())
    .filter(Boolean);

const parseList = (raw: string) =>
  raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

const normalizeStringValue = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const matchesText = (actual: unknown, query: string) =>
  normalizeStringValue(actual).includes(query);

const matchesStartsWith = (actual: unknown, query: string) =>
  normalizeStringValue(actual).startsWith(query);

const matchesEndsWith = (actual: unknown, query: string) =>
  normalizeStringValue(actual).endsWith(query);

const listIncludes = (actual: string, value: unknown, negate = false) => {
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? parseList(value)
      : [];
  if (!values.length) return true;
  const matched = values.some((entry) => normalizeStringValue(entry) === actual);
  return negate ? !matched : matched;
};

const matchesDateOperator = (
  actual: string | null,
  operator: string,
  value: unknown,
) => {
  const normalized = actual?.trim() || null;
  if (operator === 'is_null') return !normalized;
  if (operator === 'not_null') return Boolean(normalized);
  if (!normalized) return true;

  if (operator === 'between') {
    const [start, end] = typeof value === 'string' ? parseBetween(value) : [];
    if (!start || !end) return true;
    return normalized >= start && normalized <= end;
  }

  const target = typeof value === 'string' ? value.trim().slice(0, 10) : '';
  if (!target) return true;

  switch (operator) {
    case '=':
    case 'equals':
      return normalized === target;
    case '!=':
      return normalized !== target;
    case '>':
    case 'gt':
      return normalized > target;
    case '>=':
    case 'gte':
      return normalized >= target;
    case '<':
    case 'lt':
      return normalized < target;
    case '<=':
    case 'lte':
      return normalized <= target;
    default:
      return true;
  }
};

const matchesTagsCondition = (tags: string[], filter: AdvancedFilter) => {
  const normalizedTags = tags.map((tag) => normalizeStringValue(tag));
  const rawValue = filter.value?.trim();

  if (filter.operator === 'isEmpty') return normalizedTags.length === 0;
  if (filter.operator === 'isNotEmpty') return normalizedTags.length > 0;
  if (!rawValue) return true;

  if (filter.operator === 'in' || filter.operator === 'notIn') {
    const values = parseList(rawValue).map((entry) => normalizeStringValue(entry));
    if (!values.length) return true;
    const matched = values.some((entry) => normalizedTags.includes(entry));
    return filter.operator === 'notIn' ? !matched : matched;
  }

  if (filter.operator === 'contains') {
    return normalizedTags.some((tag) => tag.includes(normalizeStringValue(rawValue)));
  }

  if (filter.operator === 'equals') {
    return normalizedTags.includes(normalizeStringValue(rawValue));
  }

  return true;
};

const matchesTaskCondition = (row: TaskListRow, filter: AdvancedFilter) => {
  const field = filter.columnId;
  const operator = filter.operator;
  const value = filter.value;

  if (TEXT_FIELDS.has(field)) {
    const actual = row[field as keyof TaskListRow];
    if (operator === 'isEmpty') return !String(actual ?? '').trim();
    if (operator === 'isNotEmpty') return Boolean(String(actual ?? '').trim());
    if (operator === 'equals') return String(actual ?? '') === value;
    if (operator === 'contains') return matchesText(actual, normalizeStringValue(value));
    if (operator === 'starts') return matchesStartsWith(actual, normalizeStringValue(value));
    if (operator === 'ends') return matchesEndsWith(actual, normalizeStringValue(value));
    if (operator === 'in') return listIncludes(normalizeStringValue(actual), value, false);
    if (operator === 'notIn') return listIncludes(normalizeStringValue(actual), value, true);
    return true;
  }

  if (ENUM_FIELDS.has(field)) {
    const actual = String(row[field as keyof TaskListRow] ?? '');
    if (operator === 'isEmpty') return !actual;
    if (operator === 'isNotEmpty') return Boolean(actual);
    if (operator === 'equals') return actual === value;
    if (operator === 'in') return listIncludes(normalizeStringValue(actual), value, false);
    if (operator === 'notIn') return listIncludes(normalizeStringValue(actual), value, true);
    return true;
  }

  if (DATE_FIELDS.has(field)) {
    const actual = row[field as keyof TaskListRow];
    return matchesDateOperator(
      typeof actual === 'string' ? actual : null,
      operator,
      value,
    );
  }

  if (NUMBER_FIELDS.has(field)) {
    const actual = toNumber(row[field as keyof TaskListRow]);
    if (operator === 'isEmpty') return actual === null;
    if (operator === 'isNotEmpty') return actual !== null;
    const target = toNumber(value);
    if (actual === null || target === null) return true;

    switch (operator) {
      case 'equals':
        return actual === target;
      case 'gt':
        return actual > target;
      case 'gte':
        return actual >= target;
      case 'lt':
        return actual < target;
      case 'lte':
        return actual <= target;
      default:
        return true;
    }
  }

  if (BOOLEAN_FIELDS.has(field)) {
    const actual = Boolean(row[field as keyof TaskListRow]);
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return true;
    if (operator === 'equals') {
      return actual === (normalized === 'true' || normalized === '1' || normalized === 'sim');
    }
    return true;
  }

  if (field === 'tags') {
    return matchesTagsCondition(row.tags, filter);
  }

  return true;
};

export const parseAdvancedFilters = (raw?: string) =>
  parseJsonArray<AdvancedFilter>(raw);

export const parseGrouping = (raw?: string) => parseJsonArray<string>(raw);

export const applyTaskSearch = (rows: TaskListRow[], query?: string) => {
  const needle = query?.trim().toLowerCase();
  if (!needle) return rows;

  return rows.filter((row) =>
    [
      row.title,
      row.summary ?? '',
      row.description ?? '',
      row.status,
      row.priority,
      row.kind,
      row.owner ?? '',
      row.team ?? '',
      row.dueState ?? '',
      row.isMilestone ? 'marco milestone' : 'tarefa',
      row.startDate ?? '',
      row.dueDate ?? '',
      row.tags.join(' '),
    ]
      .join(' ')
      .toLowerCase()
      .includes(needle),
  );
};

export const applyTaskFilters = (rows: TaskListRow[], filters: AdvancedFilter[]) => {
  if (!filters.length) return rows;
  return rows.filter((row) => filters.every((filter) => matchesTaskCondition(row, filter)));
};

export const sortTaskRows = (rows: TaskListRow[], grouping: string[]) => {
  const uniqueGrouping = grouping.filter(
    (field, index, values) => values.indexOf(field) === index,
  );

  const sorted = [...rows];
  sorted.sort((left, right) => {
    for (const field of uniqueGrouping) {
      const leftValue = String(left[field as keyof TaskListRow] ?? '');
      const rightValue = String(right[field as keyof TaskListRow] ?? '');
      const comparison = leftValue.localeCompare(rightValue, 'pt-BR', {
        numeric: true,
        sensitivity: 'base',
      });
      if (comparison !== 0) {
        return comparison;
      }
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  });

  return sorted;
};
