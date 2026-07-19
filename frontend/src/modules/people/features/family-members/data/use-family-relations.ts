"use client";

import * as React from "react";
import { useAuth } from "@/features/auth/auth-context";
import type {
  FamilyIncomeSummary,
  FamilySummary,
  HouseholdProfile,
  HouseholdAsset,
  PersonAssetsGroup,
  PersonRelation,
  PersonRelationInput,
  PersonRelationsResponse,
  PersonSummary,
} from "@/modules/people/shared/domain/types";
import {
  createHouseholdAsset,
  createPersonAsset,
  createPersonRelation,
  deleteHouseholdAsset,
  deletePersonAsset,
  deletePersonRelation,
  getFamilyIncomeSummary,
  getFamilySummary,
  getHouseholdAssets,
  getHouseholdPersonAssets,
  getHouseholdProfile,
  getPersonRelations,
  listPeople,
  updateHouseholdAsset,
  updatePersonAsset,
  updatePersonRelation,
  upsertHouseholdProfile,
  type ApiPerson,
} from "@/modules/people/api";

type AssetInput = {
  category: string;
  item: string;
  quantity?: number | null;
  condition?: string | null;
  notes?: string | null;
};

type LoadMode = "summary" | "detailed";

type LoadTimes = {
  summaryMs?: number;
  detailedMs?: number;
};

type UseFamilyRelationsResult = {
  data: PersonRelationsResponse | null;
  peopleOptions: PersonSummary[];
  incomeSummary: FamilyIncomeSummary | null;
  householdProfile: HouseholdProfile | null;
  householdAssets: HouseholdAsset[];
  personAssetsByMember: PersonAssetsGroup[];
  summary: FamilySummary | null;
  summaryLoading: boolean;
  summaryError: string | null;
  detailedLoading: boolean;
  detailedError: string | null;
  loadSummary: (force?: boolean) => Promise<void>;
  loadDetailed: (force?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  loadTimes: LoadTimes;
  create: (payload: PersonRelationInput) => Promise<PersonRelation | null>;
  update: (
    relationId: string,
    payload: Partial<PersonRelationInput>,
  ) => Promise<PersonRelation | null>;
  remove: (relationId: string) => Promise<void>;
  upsertHouseholdProfile: (payload: Partial<HouseholdProfile>) => Promise<void>;
  createHouseholdAsset: (payload: AssetInput) => Promise<void>;
  updateHouseholdAsset: (
    assetId: string,
    payload: Partial<AssetInput>,
  ) => Promise<void>;
  removeHouseholdAsset: (assetId: string) => Promise<void>;
  createPersonAsset: (personId: string, payload: AssetInput) => Promise<void>;
  updatePersonAsset: (
    personId: string,
    assetId: string,
    payload: Partial<AssetInput>,
  ) => Promise<void>;
  removePersonAsset: (personId: string, assetId: string) => Promise<void>;
};

const buildPeopleIndex = (people: ApiPerson[]) =>
  people.reduce<Record<string, ApiPerson>>((acc, person) => {
    acc[person.id] = person;
    return acc;
  }, {});

const mergePersonSummary = (
  person: PersonSummary,
  index: Record<string, ApiPerson>,
): PersonSummary => {
  const details = index[person.id];
  if (!details) return person;
  return {
    ...person,
    avatarUrl: person.avatarUrl ?? details.avatarUrl ?? null,
    birthDate: person.birthDate ?? details.birthDate ?? null,
    sex: person.sex ?? details.sex ?? null,
    gender: person.gender ?? details.gender ?? null,
    raceColor: person.raceColor ?? details.raceColor ?? null,
    status: person.status ?? details.status ?? null,
    personType: person.personType ?? details.personType ?? null,
    hasHealthCondition:
      person.hasHealthCondition ?? details.hasHealthCondition ?? null,
    hasMedication: person.hasMedication ?? details.hasMedication ?? null,
  };
};

const mergeRelationsResponse = (
  response: PersonRelationsResponse,
  index: Record<string, ApiPerson>,
): PersonRelationsResponse => ({
  ...response,
  householdMembers: response.householdMembers.map((member) => ({
    ...member,
    person: mergePersonSummary(member.person, index),
  })),
  relations: response.relations.map((relation) => ({
    ...relation,
    relatedPerson: mergePersonSummary(relation.relatedPerson, index),
  })),
});

const shouldLogLoad = () => process.env.NODE_ENV !== "production";

export function useFamilyRelations(
  personId: string,
  options?: { autoLoad?: boolean; initialMode?: LoadMode },
): UseFamilyRelationsResult {
  const { token } = useAuth();
  const autoLoad = options?.autoLoad ?? true;
  const initialMode: LoadMode = options?.initialMode ?? "summary";

  const [data, setData] = React.useState<PersonRelationsResponse | null>(null);
  const [peopleOptions, setPeopleOptions] = React.useState<PersonSummary[]>([]);
  const [peopleIndex, setPeopleIndex] = React.useState<Record<string, ApiPerson>>({});
  const peopleIndexRef = React.useRef<Record<string, ApiPerson>>({});
  const [incomeSummary, setIncomeSummary] =
    React.useState<FamilyIncomeSummary | null>(null);
  const [householdProfile, setHouseholdProfile] =
    React.useState<HouseholdProfile | null>(null);
  const [householdAssets, setHouseholdAssets] = React.useState<
    HouseholdAsset[]
  >([]);
  const [personAssetsByMember, setPersonAssetsByMember] = React.useState<
    PersonAssetsGroup[]
  >([]);
  const [summary, setSummary] = React.useState<FamilySummary | null>(null);
  const [summaryLoading, setSummaryLoading] = React.useState(false);
  const [summaryError, setSummaryError] = React.useState<string | null>(null);
  const [detailedLoading, setDetailedLoading] = React.useState(false);
  const [detailedError, setDetailedError] = React.useState<string | null>(null);
  const [summaryLoaded, setSummaryLoaded] = React.useState(false);
  const [detailedLoaded, setDetailedLoaded] = React.useState(false);
  const [peopleLoaded, setPeopleLoaded] = React.useState(false);
  const [loadTimes, setLoadTimes] = React.useState<LoadTimes>({});

  const logLoad = React.useCallback((mode: LoadMode, elapsed: number) => {
    setLoadTimes((prev) => ({
      ...prev,
      [mode === "summary" ? "summaryMs" : "detailedMs"]: elapsed,
    }));
    if (shouldLogLoad()) {
      const label = mode === "summary" ? "Resumo" : "Detalhado";
      console.info(`[Família] ${label} carregado em ${elapsed.toFixed(0)}ms`);
    }
  }, []);

  const loadPeopleOptions = React.useCallback(async () => {
    if (!token || peopleLoaded) return;
    try {
      const response = await listPeople(token, { all: true });
      const index = buildPeopleIndex(response.data);
      setPeopleIndex(index);
      const options = response.data
        .filter((item) => item.id !== personId)
        .map((item) => ({
          id: item.id,
          fullName: item.fullName,
          avatarUrl: item.avatarUrl,
          birthDate: item.birthDate,
          sex: item.sex,
          gender: item.gender,
          raceColor: item.raceColor,
          status: item.status,
          personType: item.personType ?? null,
          hasHealthCondition: item.hasHealthCondition ?? null,
          hasMedication: item.hasMedication ?? null,
        }));
      setPeopleOptions(options);
      setPeopleLoaded(true);
    } catch {
      setPeopleOptions([]);
    }
  }, [token, peopleLoaded, personId]);

  const loadSummary = React.useCallback(
    async (force = false) => {
      if (!token) return;
      if (summaryLoaded && !force) return;
      setSummaryLoading(true);
      setSummaryError(null);
      const start = performance.now();
      try {
        const response = await getFamilySummary(token, personId);
        setSummary(response);
        setIncomeSummary(response.incomeSummary ?? null);
        setHouseholdProfile(response.householdProfile ?? null);
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message)
            : "Falha ao carregar resumo familiar.";
        setSummaryError(message);
      } finally {
        const elapsed = performance.now() - start;
        logLoad("summary", elapsed);
        setSummaryLoading(false);
        setSummaryLoaded(true);
      }
    },
    [token, personId, summaryLoaded, logLoad],
  );

  const loadDetailed = React.useCallback(
    async (force = false) => {
      if (!token) return;
      if (detailedLoaded && !force) return;
      setDetailedLoading(true);
      setDetailedError(null);
      const start = performance.now();
      try {
        const incomePromise =
          incomeSummary && !force
            ? Promise.resolve(incomeSummary)
            : getFamilyIncomeSummary(token, personId);
        const profilePromise =
          householdProfile && !force
            ? Promise.resolve(householdProfile)
            : getHouseholdProfile(token, personId);

        const [
          relationsResponse,
          householdAssetsResponse,
          personAssetsResponse,
          incomeResponse,
          profileResponse,
        ] = await Promise.all([
          getPersonRelations(token, personId),
          getHouseholdAssets(token, personId),
          getHouseholdPersonAssets(token, personId),
          incomePromise,
          profilePromise,
        ]);

        const enriched = mergeRelationsResponse(
          relationsResponse,
          peopleIndexRef.current,
        );
        setData(enriched);
        setHouseholdAssets(householdAssetsResponse);
        setPersonAssetsByMember(personAssetsResponse);
        setIncomeSummary(incomeResponse ?? null);
        setHouseholdProfile(profileResponse ?? null);
        loadPeopleOptions();
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message)
            : "Falha ao carregar vínculos familiares.";
        setDetailedError(message);
      } finally {
        const elapsed = performance.now() - start;
        logLoad("detailed", elapsed);
        setDetailedLoading(false);
        setDetailedLoaded(true);
      }
    },
    [
      token,
      personId,
      detailedLoaded,
      incomeSummary,
      householdProfile,
      loadPeopleOptions,
      logLoad,
    ],
  );

  const refresh = React.useCallback(async () => {
    await Promise.all([loadSummary(true), loadDetailed(true)]);
  }, [loadSummary, loadDetailed]);

  React.useEffect(() => {
    if (!autoLoad || !token) return;
    if (initialMode === "detailed") {
      loadDetailed();
    } else {
      loadSummary();
    }
  }, [autoLoad, token, initialMode, loadDetailed, loadSummary]);

  React.useEffect(() => {
    peopleIndexRef.current = peopleIndex;
  }, [peopleIndex]);

  React.useEffect(() => {
    if (!peopleLoaded) return;
    setData((prev) =>
      prev ? mergeRelationsResponse(prev, peopleIndexRef.current) : prev,
    );
  }, [peopleIndex, peopleLoaded]);

  const create = React.useCallback(
    async (payload: PersonRelationInput) => {
      if (!token) return null;
      const created = await createPersonRelation(token, personId, payload);
      setData((previous) =>
        previous
          ? {
              ...previous,
              relations: [
                ...previous.relations,
                {
                  ...created,
                  relatedPerson:
                    previous.householdMembers.find(
                      (member) => member.personId === created.relatedPersonId,
                    )?.person ??
                    previous.relations.find(
                      (relation) => relation.relatedPersonId === created.relatedPersonId,
                    )?.relatedPerson ??
                    peopleOptions.find((person) => person.id === created.relatedPersonId) ?? {
                      id: created.relatedPersonId,
                      fullName: "Pessoa relacionada",
                    },
                },
              ],
            }
          : previous,
      );
      return created;
    },
    [token, personId, peopleOptions],
  );

  const update = React.useCallback(
    async (relationId: string, payload: Partial<PersonRelationInput>) => {
      if (!token) return null;
      const updated = await updatePersonRelation(token, personId, relationId, payload);
      setData((previous) =>
        previous
          ? {
              ...previous,
              relations: previous.relations.map((relation) =>
                relation.id === relationId
                  ? {
                      ...updated,
                      relatedPerson:
                        relation.relatedPerson ??
                        peopleOptions.find((person) => person.id === updated.relatedPersonId) ?? {
                          id: updated.relatedPersonId,
                          fullName: "Pessoa relacionada",
                        },
                    }
                  : relation,
              ),
            }
          : previous,
      );
      return updated;
    },
    [token, personId, peopleOptions],
  );

  const remove = React.useCallback(
    async (relationId: string) => {
      if (!token) return;
      await deletePersonRelation(token, personId, relationId);
    },
    [token, personId],
  );

  const upsertHouseholdProfileHandler = React.useCallback(
    async (payload: Partial<HouseholdProfile>) => {
      if (!token) return;
      await upsertHouseholdProfile(token, personId, payload);
      await refresh();
    },
    [token, personId, refresh],
  );

  const createHouseholdAssetHandler = React.useCallback(
    async (payload: AssetInput) => {
      if (!token) return;
      await createHouseholdAsset(token, personId, payload);
      await refresh();
    },
    [token, personId, refresh],
  );

  const updateHouseholdAssetHandler = React.useCallback(
    async (assetId: string, payload: Partial<AssetInput>) => {
      if (!token) return;
      await updateHouseholdAsset(token, personId, assetId, payload);
      await refresh();
    },
    [token, personId, refresh],
  );

  const removeHouseholdAssetHandler = React.useCallback(
    async (assetId: string) => {
      if (!token) return;
      await deleteHouseholdAsset(token, personId, assetId);
      await refresh();
    },
    [token, personId, refresh],
  );

  const createPersonAssetHandler = React.useCallback(
    async (targetPersonId: string, payload: AssetInput) => {
      if (!token) return;
      await createPersonAsset(token, targetPersonId, payload);
      await refresh();
    },
    [token, refresh],
  );

  const updatePersonAssetHandler = React.useCallback(
    async (
      targetPersonId: string,
      assetId: string,
      payload: Partial<AssetInput>,
    ) => {
      if (!token) return;
      await updatePersonAsset(token, targetPersonId, assetId, payload);
      await refresh();
    },
    [token, refresh],
  );

  const removePersonAssetHandler = React.useCallback(
    async (targetPersonId: string, assetId: string) => {
      if (!token) return;
      await deletePersonAsset(token, targetPersonId, assetId);
      await refresh();
    },
    [token, refresh],
  );

  return {
    data,
    peopleOptions,
    incomeSummary,
    householdProfile,
    householdAssets,
    personAssetsByMember,
    summary,
    summaryLoading,
    summaryError,
    detailedLoading,
    detailedError,
    loadSummary,
    loadDetailed,
    refresh,
    loadTimes,
    create,
    update,
    remove,
    upsertHouseholdProfile: upsertHouseholdProfileHandler,
    createHouseholdAsset: createHouseholdAssetHandler,
    updateHouseholdAsset: updateHouseholdAssetHandler,
    removeHouseholdAsset: removeHouseholdAssetHandler,
    createPersonAsset: createPersonAssetHandler,
    updatePersonAsset: updatePersonAssetHandler,
    removePersonAsset: removePersonAssetHandler,
  };
}

