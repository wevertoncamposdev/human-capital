"use client";

export type DomainCombinator = "and" | "or";

export type DomainOperator =
  | "="
  | "!="
  | ">"
  | ">="
  | "<"
  | "<="
  | "in"
  | "not_in"
  | "contains"
  | "ilike"
  | "starts_with"
  | "ends_with"
  | "between"
  | "is_null"
  | "not_null";

export type DomainValue =
  | string
  | number
  | boolean
  | null
  | Array<string | number | boolean | null>
  | [string | number | null, string | number | null];

export type DomainCondition = {
  type: "condition";
  field: string;
  operator: DomainOperator;
  value?: DomainValue;
};

export type DomainGroup = {
  type: "group";
  combinator: DomainCombinator;
  children: DomainNode[];
};

export type DomainNot = {
  type: "not";
  child: DomainNode;
};

export type DomainNode = DomainCondition | DomainGroup | DomainNot;

export type Domain = DomainNode | null;
