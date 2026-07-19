"use client";

import * as React from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterDrawer } from "@/components/FilterEngine/FilterDrawer";
import type { Domain } from "@/web-client/domain/types";
import type { SearchViewDefinition } from "@/web-client/search/types";
import { AdvancedFilterBuilder } from "./AdvancedFilterBuilder";

export function FilterMenu({
  searchView,
  domain,
  onChange,
}: {
  searchView: SearchViewDefinition;
  domain: Domain;
  onChange: (next: Domain) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => setOpen(true)}
        title="Filtros"
        aria-label="Filtros"
      >
        <SlidersHorizontal className="size-4" />
      </Button>

      <FilterDrawer open={open} onOpenChange={setOpen} title="Filtros avançados">
        <AdvancedFilterBuilder
          searchView={searchView}
          value={domain}
          onChange={onChange}
        />
      </FilterDrawer>
    </>
  );
}
