"use client";

export type FieldProps = {
  label: string;
  value?: string | null;
  onCopy?: (value: string) => void;
};

export function Field({ label, value, onCopy }: FieldProps) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      {value ? (
        onCopy ? (
          <button
            type="button"
            className="text-left text-xs font-medium text-foreground hover:text-foreground/80"
            onClick={() => onCopy(value)}
            title="Copiar"
          >
            {value}
          </button>
        ) : (
          <p className="text-xs font-medium">{value}</p>
        )
      ) : (
        <p className="text-xs font-medium text-muted-foreground">-</p>
      )}
    </div>
  );
}
