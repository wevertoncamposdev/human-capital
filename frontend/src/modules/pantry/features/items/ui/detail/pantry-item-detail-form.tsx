"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { repairTextDecoding } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ItemDraft,
  PantryItemDetailMode,
} from "@/modules/pantry/features/items/domain/pantry-item-detail.types";
import { toInt } from "@/modules/pantry/features/items/domain/pantry-item-detail.helpers";
import {
  PANTRY_ITEM_GROUP,
  PANTRY_ITEM_UNIT,
} from "@/modules/pantry/shared/domain/pantry.constants";

export type PantryItemDetailFormProps = {
  mode: PantryItemDetailMode;
  readOnly: boolean;
  draft: ItemDraft;
  setDraft: React.Dispatch<React.SetStateAction<ItemDraft>>;
  onCommitField: (key: keyof ItemDraft) => void;
  onUnitChange: (value: string) => void;
  onGroupChange: (value: string | null) => void;
  sectorsLoading: boolean;
  sectorOptions: string[];
  onDefaultSectorChange: (value: string) => void;
  onOpenNewSector: () => void;
  inputLineClassName: string;
};

export function PantryItemDetailForm({
  mode,
  readOnly,
  draft,
  setDraft,
  onCommitField,
  onUnitChange,
  onGroupChange,
  sectorsLoading,
  sectorOptions,
  onDefaultSectorChange,
  onOpenNewSector,
  inputLineClassName,
}: PantryItemDetailFormProps) {
  const unitOptions = React.useMemo(() => {
    const base = PANTRY_ITEM_UNIT.map((opt) => ({
      label: String(opt.label),
      value: String(opt.value),
    }));
    const current = draft.unit?.trim();
    if (current && !base.some((opt) => opt.value === current)) {
      return [{ label: repairTextDecoding(current) ?? current, value: current }, ...base];
    }
    return base;
  }, [draft.unit]);

  const groupOptions = React.useMemo(() => {
    const base = PANTRY_ITEM_GROUP.map((opt) => ({
      label: String(opt.label),
      value: String(opt.value),
    }));
    const current = (draft.group ?? "").trim();
    if (current && !base.some((opt) => opt.value === current)) {
      return [{ label: repairTextDecoding(current) ?? current, value: current }, ...base];
    }
    return base;
  }, [draft.group]);

  return (
    <div className="border-y border-border/60 bg-transparent py-4">
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Nome
            </div>
            <Input
              value={draft.name}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, name: e.target.value }))
              }
              onBlur={() => onCommitField("name")}
              placeholder="Ex: Arroz"
              className={inputLineClassName}
              readOnly={readOnly}
            />
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Unidade
            </div>
            <Select
              value={draft.unit}
              onValueChange={(value) => {
                setDraft((prev) => ({ ...prev, unit: value }));
                onUnitChange(value);
              }}
              disabled={readOnly}
            >
              <SelectTrigger className={inputLineClassName}>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {unitOptions.map((unit) => (
                  <SelectItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Grupo de alimentos
            </div>
            <Select
              value={draft.group ?? "__none__"}
              onValueChange={(value) => {
                const next = value === "__none__" ? null : value;
                setDraft((prev) => ({ ...prev, group: next }));
                onGroupChange(next);
              }}
              disabled={readOnly}
            >
              <SelectTrigger className={inputLineClassName}>
                <SelectValue placeholder="Sem grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem grupo</SelectItem>
                {groupOptions.map((group) => (
                  <SelectItem key={group.value} value={group.value}>
                    {group.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Setor
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={draft.defaultSector}
                onValueChange={(value) => {
                  setDraft((prev) => ({ ...prev, defaultSector: value }));
                  onDefaultSectorChange(value);
                }}
                disabled={readOnly || sectorsLoading}
              >
                <SelectTrigger className={inputLineClassName}>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {sectorOptions.map((sector) => (
                    <SelectItem key={sector} value={sector}>
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {!readOnly ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Novo setor"
                  aria-label="Novo setor"
                  onClick={onOpenNewSector}
                >
                  <Plus className="size-4" />
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Estoque mínimo
            </div>
            <Input
              type="number"
              value={String(draft.minStock)}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, minStock: toInt(e.target.value) }))
              }
              onBlur={() => onCommitField("minStock")}
              className={inputLineClassName}
              readOnly={readOnly}
            />
          </div>
        </div>

        {readOnly ? (
          <div className="border border-dashed border-border/60 px-4 py-3 text-xs text-muted-foreground">
            {mode === "create"
              ? "Você não tem permissão para criar."
              : "Você não tem permissão para editar."}
          </div>
        ) : null}
      </div>
    </div>
  );
}
