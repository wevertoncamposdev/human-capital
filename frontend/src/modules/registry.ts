import type { ModuleManifest, NavGroup } from "@/modules/types";
import { coreManifest } from "@/modules/core/manifest";
import { actionsManifest } from "@/modules/actions/manifest";
import { peopleManifest } from "@/modules/people/manifest";
import { peopleSegmentsManifest } from "@/modules/people-segments/manifest";
import { pantryManifest } from "@/modules/pantry/manifest";
import { depositManifest } from "@/modules/deposit/manifest";
import { programsManifest } from "@/modules/programs/manifest";
import { projectsManifest } from "@/modules/projects/manifest";
import { tasksManifest } from "@/modules/tasks/manifest";
import { NAV_GROUP_ORDER } from "@/modules/nav/groups";

export const moduleManifests: ModuleManifest[] = [
  coreManifest,
  peopleManifest,
  peopleSegmentsManifest,
  programsManifest,
  projectsManifest,
  actionsManifest,
  pantryManifest,
  depositManifest,
  tasksManifest,
];

const resolveGroupOrder = (label: string) => NAV_GROUP_ORDER[label] ?? 999;

const resolveItemOrder = (item: { order?: number; title: string }) =>
  item.order ?? 999;

export function buildNavGroupsFromManifests(manifests: ModuleManifest[]): NavGroup[] {
  const map = new Map<string, NavGroup>();

  for (const manifest of manifests) {
    for (const item of manifest.navItems) {
      const label = item.groupLabel ?? manifest.groupLabel;
      const group = map.get(label) ?? { label, items: [] };
      group.items.push(item);
      map.set(label, group);
    }
  }

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      items: [...group.items].sort((a, b) => {
        const delta = resolveItemOrder(a) - resolveItemOrder(b);
        if (delta !== 0) return delta;
        return a.title.localeCompare(b.title);
      }),
    }))
    .sort((a, b) => {
      const delta = resolveGroupOrder(a.label) - resolveGroupOrder(b.label);
      if (delta !== 0) return delta;
      return a.label.localeCompare(b.label);
    });
}

export const navGroups: NavGroup[] = buildNavGroupsFromManifests(moduleManifests);
