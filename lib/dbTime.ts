/**
 * Helpers for Prisma `DateTime @db.Time` fields.
 *
 * The DB stores time-of-day only; Prisma exposes it as a Date (often 1970-01-01
 * in UTC when serialized to JSON). Use UTC hour/minute for display and forms so
 * values round-trip without timezone shifts. If you need true "Sydney wall clock",
 * store timezone explicitly or use `timestamptz` — not plain `TIME`.
 */
const formatter = new Intl.DateTimeFormat("en-AU", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

export const getDbTimeString = (value: string | Date): string => {
  const date = typeof value === "string" ? new Date(value) : value;
  return formatter.format(date);
};
