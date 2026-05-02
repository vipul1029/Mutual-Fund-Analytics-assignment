import { parseMfapiDate, toDateOnly } from "../utils/date.js";

export function planNavUpserts(navRows, lastSyncedDate) {
  const lastSynced = lastSyncedDate ? new Date(lastSyncedDate) : null;
  const transformed = [];

  for (const row of navRows) {
    const parsedDate = parseMfapiDate(row.date);
    const nav = Number(row.nav);
    if (!parsedDate.isValid() || Number.isNaN(nav)) {
      continue;
    }
    const date = toDateOnly(parsedDate);
    if (lastSynced && date <= lastSynced) {
      continue;
    }
    transformed.push({
      date,
      nav
    });
  }

  transformed.sort((a, b) => a.date.getTime() - b.date.getTime());
  const latestDate = transformed.length ? transformed[transformed.length - 1].date : lastSynced;

  return { rows: transformed, latestDate };
}

export function buildFundSchedule(index, batchSize, batchDelayMs, requestSpacingMs) {
  const batchOffset = Math.floor(index / batchSize) * batchDelayMs;
  const spacingOffset = index * requestSpacingMs;
  return batchOffset + spacingOffset;
}
