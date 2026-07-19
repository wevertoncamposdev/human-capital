export type FilterOption = {
  value: string;
  label: string;
};

type BaseField<TValues> = {
  key: keyof TValues & string;
  label?: string;
  placeholder?: string;
  /** Querystring/API param name override (default: key). */
  apiKey?: string;
  /** If true, omit from query params. */
  omitWhen?: (value: unknown, values: TValues) => boolean;
};

export type TextFilterField<TValues> = BaseField<TValues> & {
  type: "text";
};

export type DateFilterField<TValues> = BaseField<TValues> & {
  type: "date";
};

export type SelectFilterField<TValues> = BaseField<TValues> & {
  type: "select";
  options: FilterOption[];
};

export type FilterField<TValues> =
  | TextFilterField<TValues>
  | DateFilterField<TValues>
  | SelectFilterField<TValues>;

export type FilterSchema<TValues> = ReadonlyArray<FilterField<TValues>>;

