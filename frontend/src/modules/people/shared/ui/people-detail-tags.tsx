"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TagInput } from "@/components/ui/tag-input";
import { Plus } from "lucide-react";

export const TagList = ({ tags }: { tags?: string[] | null }) => (
  <div className="flex flex-wrap gap-2">
    {tags && tags.length ? (
      tags.map((tag) => (
        <Badge key={tag} variant="secondary">
          {tag}
        </Badge>
      ))
    ) : (
      <span className="text-xs text-muted-foreground">Sem tags</span>
    )}
  </div>
);

export type TagEditorProps = {
  tags?: string[] | null;
  suggestions?: string[];
  disabled?: boolean;
  onSave?: (tags: string[]) => Promise<void> | void;
};

export function TagEditor({
  tags,
  suggestions,
  disabled,
  onSave,
}: TagEditorProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<string[]>(tags ?? []);

  React.useEffect(() => {
    setDraft(tags ?? []);
  }, [tags]);

  return (
    <div className="flex items-start gap-2">
      <TagList tags={tags} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={disabled}
            aria-label="Editar tags"
          >
            <Plus className="size-3" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar tags</DialogTitle>
            <DialogDescription>
              Use tags para organizar e filtrar pessoas.
            </DialogDescription>
          </DialogHeader>
          <TagInput
            value={draft}
            onChange={setDraft}
            suggestions={suggestions}
          />
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                await onSave?.(draft);
                setOpen(false);
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
