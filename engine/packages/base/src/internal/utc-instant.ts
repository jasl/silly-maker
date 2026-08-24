// SPDX-License-Identifier: MIT

export interface UtcInstantFieldsInternalV1 {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly fraction: string;
}

const utcInstantFieldsPatternInternalV1 =
  /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.([0-9]+))?Z$/u;

/** @internal Performs ASCII lexical scanning only; policy owns semantic admission. */
export function scanUtcInstantFieldsInternalV1(
  value: unknown,
): UtcInstantFieldsInternalV1 | null {
  if (typeof value !== "string") return null;
  const match = utcInstantFieldsPatternInternalV1.exec(value);
  if (match === null) return null;
  const [, year, month, day, hour, minute, second, fraction] = match;
  if (
    year === undefined || month === undefined || day === undefined || hour === undefined ||
    minute === undefined || second === undefined
  ) {
    return null;
  }
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
    fraction: fraction ?? "",
  };
}

export function isUtcLeapYearInternalV1(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function utcDaysInMonthInternalV1(year: number, month: number): number {
  if (month === 2) return isUtcLeapYearInternalV1(year) ? 29 : 28;
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

export function incrementUtcDayInternalV1(
  year: number,
  month: number,
  day: number,
): { readonly year: number; readonly month: number; readonly day: number } {
  // Preserve loose day overflow for the legacy filename policy. Its separate
  // forward-normalization pass owns month/year rollover.
  return { year, month, day: day + 1 };
}

function hasOnlyZeroFractionDigitsInternalV1(fraction: string): boolean {
  return !/[1-9]/u.test(fraction);
}

/** @internal Strict B-prime persisted/diagnostic IsoUtcInstant policy. */
export function isPersistedIsoUtcInstantInternalV1(
  fields: UtcInstantFieldsInternalV1,
): boolean {
  if (
    fields.month < 1 || fields.month > 12 || fields.day < 1 ||
    fields.day > utcDaysInMonthInternalV1(fields.year, fields.month) ||
    fields.minute > 59 || fields.second > 59
  ) {
    return false;
  }
  if (fields.hour <= 23) return true;
  return fields.hour === 24 && fields.minute === 0 && fields.second === 0 &&
    hasOnlyZeroFractionDigitsInternalV1(fields.fraction);
}

/** @internal Legacy loose filename policy; intentionally not persistence admission. */
export function formatLegacyExportTimestampInternalV1(
  fields: UtcInstantFieldsInternalV1,
): string | null {
  let { year, month, day, hour } = fields;
  if (
    month < 1 || month > 12 || day < 1 || day > 31 || hour > 24 || fields.minute > 59 ||
    fields.second > 59 ||
    (hour === 24 &&
      (fields.minute !== 0 || fields.second !== 0 ||
        !hasOnlyZeroFractionDigitsInternalV1(fields.fraction)))
  ) {
    return null;
  }
  if (hour === 24) {
    hour = 0;
    const incremented = incrementUtcDayInternalV1(year, month, day);
    ({ year, month, day } = incremented);
  }
  while (day > utcDaysInMonthInternalV1(year, month)) {
    day -= utcDaysInMonthInternalV1(year, month);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  const pad = (value: number): string => String(value).padStart(2, "0");
  return (
    `${String(year)}${pad(month)}${pad(day)}` +
    `${pad(hour)}${pad(fields.minute)}${pad(fields.second)}`
  );
}
