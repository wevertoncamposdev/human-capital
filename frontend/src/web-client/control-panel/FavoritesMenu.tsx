"use client";

import * as React from "react";
import { Star, StarOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  loadFavorites,
  saveFavorites,
  type FavoriteDefinition,
} from "@/web-client/control-panel/favorites-storage";

export function FavoritesMenu<TState extends Record<string, unknown>>({
  actionId,
  snapshot,
  onApply,
  label = "Favoritos",
  compact = true,
}: {
  actionId: string;
  snapshot: TState;
  onApply: (state: TState) => void;
  label?: string;
  compact?: boolean;
}) {
  const storageKey = `favorites:${actionId}`;
  const [favorites, setFavorites] = React.useState<Array<FavoriteDefinition<TState>>>([]);
  const [open, setOpen] = React.useState(false);
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [name, setName] = React.useState("");

  React.useEffect(() => {
    setFavorites(loadFavorites<TState>(storageKey));
  }, [storageKey]);

  const persist = React.useCallback(
    (next: Array<FavoriteDefinition<TState>>) => {
      setFavorites(next);
      saveFavorites(storageKey, next);
    },
    [storageKey],
  );

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size={compact ? "icon" : "sm"}
            className={compact ? "h-8 w-8" : "h-8"}
            title={label}
            aria-label={label}
          >
            <Star className={compact ? "size-4" : "mr-2 size-4"} />
            {compact ? null : label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Favoritos</DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setName("");
              setSaveOpen(true);
            }}
          >
            <Star className="mr-2 size-4" />
            Salvar filtro atual...
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {favorites.length ? (
            favorites.map((fav) => (
              <DropdownMenuItem
                key={fav.id}
                className="flex items-center justify-between gap-2"
                onSelect={(e) => {
                  e.preventDefault();
                  onApply(fav.state);
                  setOpen(false);
                }}
              >
                <span className="truncate">{fav.name}</span>
                <button
                  type="button"
                  className="inline-flex size-7 items-center justify-center rounded hover:bg-muted"
                  title="Remover"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!window.confirm(`Remover favorito "${fav.name}"?`)) return;
                    persist(favorites.filter((item) => item.id !== fav.id));
                  }}
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </button>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Nenhum favorito salvo.
            </div>
          )}
          {favorites.length ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  if (!window.confirm("Remover todos os favoritos desta tela?")) return;
                  persist([]);
                }}
              >
                <StarOff className="mr-2 size-4" />
                Limpar favoritos
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Salvar favorito</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="favorite-name">Nome</Label>
            <Input
              id="favorite-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Entradas em fevereiro"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSaveOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                const trimmed = name.trim();
                if (!trimmed) return;
                const next: FavoriteDefinition<TState> = {
                  id: crypto.randomUUID(),
                  name: trimmed,
                  state: snapshot,
                  createdAt: new Date().toISOString(),
                };
                persist([next, ...favorites]);
                setSaveOpen(false);
                setOpen(false);
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
