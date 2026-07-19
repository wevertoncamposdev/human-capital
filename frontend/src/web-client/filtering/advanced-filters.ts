export type AdvancedFilter = {
  columnId: string;
  operator:
    | "equals"
    | "contains"
    | "in"
    | "notIn"
    | "isEmpty"
    | "isNotEmpty"
    | "between"
    | "gt"
    | "lt"
    | "gte"
    | "lte"
    | "starts"
    | "ends";
  value: string;
};
