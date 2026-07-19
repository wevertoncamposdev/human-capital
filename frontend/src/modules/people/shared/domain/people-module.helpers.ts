"use client";

import {
  getAgeFromBirthDate,
  isBirthdayInCurrentMonth,
  isBirthdayToday,
} from "@/modules/people/shared/domain/utils";
import type { ApiPeopleRecordMetadata, ApiPerson } from "@/modules/people/api";
import type {
  PeopleRecordMetadata,
  PeopleTableItem,
  Person,
} from "@/modules/people/shared/domain/types";

export function mapApiPersonToPerson(person: ApiPerson): Person {
  return {
    id: person.id,
    fullName: person.fullName,
    socialName: person.socialName ?? null,
    email: person.email ?? null,
    phone: person.phone ?? null,
    birthDate: person.birthDate ?? null,
    sex: person.sex ?? null,
    gender: person.gender ?? null,
    raceColor: person.raceColor ?? null,
    maritalStatus: person.maritalStatus ?? null,
    nationality: person.nationality ?? null,
    status: person.status as Person["status"],
    personType: person.personType ?? null,
    departureReason: person.departureReason ?? null,
    notes: person.notes ?? null,
    tags: person.tags ?? [],
    comments: person.comments ?? [],
    attachments: person.attachments ?? [],
    hasHealthCondition: person.hasHealthCondition ?? false,
    hasMedication: person.hasMedication ?? false,
    profileSummary: person.profileSummary ?? null,
    avatarUrl: person.avatarUrl ?? null,
    createdAt: person.createdAt ?? null,
    updatedAt: person.updatedAt ?? null,
  };
}

export function mapApiPersonToTableItem(person: ApiPerson): PeopleTableItem {
  return {
    id: person.id,
    fullName: person.fullName,
    socialName: person.socialName,
    sex: person.sex,
    gender: person.gender,
    raceColor: person.raceColor,
    maritalStatus: person.maritalStatus,
    nationality: person.nationality,
    email: person.email,
    phone: person.phone,
    status: person.status as PeopleTableItem["status"],
    personType: person.personType ?? null,
    departureReason: person.departureReason,
    notes: person.notes,
    tags: person.tags ?? [],
    hasHealthCondition: person.hasHealthCondition ?? false,
    hasMedication: person.hasMedication ?? false,
    profileSummary: person.profileSummary,
    birthDate: person.birthDate,
    age: getAgeFromBirthDate(person.birthDate),
    isBirthdayMonth: isBirthdayInCurrentMonth(person.birthDate),
    isBirthdayToday: isBirthdayToday(person.birthDate),
    avatarUrl: person.avatarUrl ?? null,
    createdAt: person.createdAt,
    updatedAt: person.updatedAt,
  };
}

export function mapApiPeopleRecordMetadata(
  metadata: ApiPeopleRecordMetadata,
): PeopleRecordMetadata {
  return {
    comments: metadata.comments ?? [],
    attachments: metadata.attachments ?? [],
    tags: metadata.tags ?? [],
  };
}
