import { formatDateOnlyPtBR } from "@/lib/date";

const parseBirthDateParts = (value?: string | null) => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
      return { year, month, day };
    }
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
};

export const getAgeFromBirthDate = (value?: string | null) => {
  const parts = parseBirthDateParts(value);
  if (!parts) return null;
  const today = new Date();
  let age = today.getFullYear() - parts.year;
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();
  if (
    currentMonth < parts.month ||
    (currentMonth === parts.month && currentDay < parts.day)
  ) {
    age -= 1;
  }
  return age < 0 ? 0 : age;
};

export const isBirthdayInCurrentMonth = (value?: string | null) => {
  const parts = parseBirthDateParts(value);
  if (!parts) return false;
  const currentMonth = new Date().getMonth() + 1;
  return parts.month === currentMonth;
};

export const isBirthdayToday = (value?: string | null) => {
  const parts = parseBirthDateParts(value);
  if (!parts) return false;
  const today = new Date();
  return parts.month === today.getMonth() + 1 && parts.day === today.getDate();
};

export const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

export const resolvePersonDisplayNames = (
  fullName: string,
  socialName?: string | null,
) => {
  const trimmedSocial = socialName?.trim() ?? "";
  const primary = trimmedSocial || fullName;
  const secondary = trimmedSocial ? fullName : null;
  return { primary, secondary };
};

export const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return formatDateOnlyPtBR(value);
};

export const toDateInputValue = (value?: string | null) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

export const resolveLabel = (
  value: string | null | undefined,
  dictionary: Record<string, string>,
) => {
  if (!value) return "-";
  return dictionary[value] ?? value;
};
