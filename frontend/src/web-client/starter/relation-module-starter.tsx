"use client";

import {
  createStandardDetailQueryState,
  createStandardDetailView,
  createStandardFeatureFlags,
} from "@/web-client/starter/record-module-starter";
import {
  defineRecordModule,
  type RecordModuleDefinition,
  type RecordQueryState,
} from "@/web-client/registry/types";

export function defineRelationDetailModule<
  TContext extends Record<string, unknown>,
  TState extends RecordQueryState = RecordQueryState,
>(definition: {
  moduleId: string;
  basePath: string;
  actionKey: string;
  favoriteKey: string;
  entityLabelSingular?: string;
  entityLabelPlural?: string;
  fallbackTitle?: string;
  permissions?: RecordModuleDefinition<TState, TContext>["permissions"];
}): RecordModuleDefinition<TState, TContext> {
  return defineRecordModule<TState, TContext>({
    moduleId: definition.moduleId,
    basePath: definition.basePath,
    featureFlags: createStandardFeatureFlags({
      list: false,
      detail: true,
    }),
    actionKey: definition.actionKey,
    favoriteKey: definition.favoriteKey,
    permissions: definition.permissions,
    actions: {},
    queryAdapters: {
      listDataProvider: { model: "detail.relation" },
    },
    domainAdapter: {
      entity: {
        singular: definition.entityLabelSingular ?? "Registro",
        plural: definition.entityLabelPlural ?? "Registros",
      },
      detail: {
        createTitle: "Novo registro",
        fallbackTitle: definition.fallbackTitle ?? "Registro",
      },
    },
    searchConfig: {
      id: `${definition.moduleId}.search`,
      model: "detail.relation",
      fields: [],
      features: {
        groupBy: false,
      },
    },
    views: [createStandardDetailView()],
    defaultView: "detail" as TState["view"],
    defaultQueryState: createStandardDetailQueryState<TState>(),
  });
}
