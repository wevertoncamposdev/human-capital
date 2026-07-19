import type { FormField, FormStep } from "@/web-client/forms/types";
import type { PersonFormData } from "../domain/types";
import {
  GENDER_OPTIONS,
  GENDER_LABELS,
  MARITAL_STATUS_OPTIONS,
  PERSON_TYPE_LABELS,
  PERSON_TYPE_OPTIONS,
  PEOPLE_FORM_TEXT,
  RACE_COLOR_OPTIONS,
  RACE_COLOR_LABELS,
  SEX_OPTIONS,
  SEX_LABELS,
  STATUS_OPTIONS,
  STATUS_LABELS,
} from "../domain/people.constants";

const buildOptions = (
  values: readonly string[],
  labels?: Record<string, string>,
) => values.map((value) => ({ label: labels?.[value] ?? value, value }));

export const personFormFields: FormField<PersonFormData>[] = [
  {
    name: "fullName",
    label: PEOPLE_FORM_TEXT.fields.fullName.label,
    type: "text",
    placeholder: PEOPLE_FORM_TEXT.fields.fullName.placeholder,
    required: true,
  },
  {
    name: "avatarUrl",
    label: PEOPLE_FORM_TEXT.fields.avatarUrl.label,
    type: "image",
    defaultValue: null,
  },
  {
    name: "socialName",
    label: PEOPLE_FORM_TEXT.fields.socialName.label,
    type: "text",
    placeholder: PEOPLE_FORM_TEXT.fields.socialName.placeholder,
  },
  {
    name: "email",
    label: PEOPLE_FORM_TEXT.fields.email.label,
    type: "text",
    placeholder: PEOPLE_FORM_TEXT.fields.email.placeholder,
  },
  {
    name: "phone",
    label: PEOPLE_FORM_TEXT.fields.phone.label,
    type: "text",
    placeholder: PEOPLE_FORM_TEXT.fields.phone.placeholder,
  },
  { name: "birthDate", label: PEOPLE_FORM_TEXT.fields.birthDate.label, type: "date" },
  {
    name: "sex",
    label: PEOPLE_FORM_TEXT.fields.sex.label,
    type: "select",
    options: buildOptions(SEX_OPTIONS, SEX_LABELS),
  },
  {
    name: "personType",
    label: PEOPLE_FORM_TEXT.fields.personType.label,
    type: "select",
    options: buildOptions(PERSON_TYPE_OPTIONS, PERSON_TYPE_LABELS),
  },
  {
    name: "gender",
    label: PEOPLE_FORM_TEXT.fields.gender.label,
    type: "select",
    options: buildOptions(GENDER_OPTIONS, GENDER_LABELS),
  },
  {
    name: "raceColor",
    label: PEOPLE_FORM_TEXT.fields.raceColor.label,
    type: "select",
    options: buildOptions(RACE_COLOR_OPTIONS, RACE_COLOR_LABELS),
  },
  {
    name: "maritalStatus",
    label: PEOPLE_FORM_TEXT.fields.maritalStatus.label,
    type: "select",
    options: MARITAL_STATUS_OPTIONS.slice(),
  },
  {
    name: "nationality",
    label: PEOPLE_FORM_TEXT.fields.nationality.label,
    type: "text",
    placeholder: PEOPLE_FORM_TEXT.fields.nationality.placeholder,
  },
  {
    name: "tags",
    label: PEOPLE_FORM_TEXT.fields.tags.label,
    type: "tags",
    placeholder: PEOPLE_FORM_TEXT.fields.tags.placeholder,
  },
  {
    name: "profileSummary",
    label: PEOPLE_FORM_TEXT.fields.profileSummary.label,
    type: "richtext",
  },
  {
    name: "status",
    label: PEOPLE_FORM_TEXT.fields.status.label,
    type: "select",
    options: buildOptions(
      STATUS_OPTIONS.filter((status) => status !== "Em analise"),
      STATUS_LABELS,
    ),
  },
  {
    name: "departureReason",
    label: PEOPLE_FORM_TEXT.fields.departureReason.label,
    type: "textarea",
    placeholder: PEOPLE_FORM_TEXT.fields.departureReason.placeholder,
    requiredWhen: (values) => values.status === "Desligado",
  },
];

export const personFormSteps: FormStep[] = [
  {
    title: PEOPLE_FORM_TEXT.steps.identification.title,
    fields: [
      "fullName",
      "avatarUrl",
      "socialName",
      "email",
      "phone",
      "birthDate",
      "sex",
      "personType",
      "gender",
      "raceColor",
      "maritalStatus",
      "nationality",
    ],
  },
  {
    title: PEOPLE_FORM_TEXT.steps.organization.title,
    fields: ["tags", "status", "departureReason"],
  },
  {
    title: PEOPLE_FORM_TEXT.steps.notes.title,
    fields: ["profileSummary"],
  },
];
