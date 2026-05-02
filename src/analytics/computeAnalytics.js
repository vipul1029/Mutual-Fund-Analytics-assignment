import dayjs from "dayjs";
import { summarize } from "../utils/stats.js";

export const WINDOWS = {
  "1Y": 365,
  "3Y": 1095,
  "5Y": 1825,
  "10Y": 3650
};

function findEndIndex(navSeries, startIdx, targetDate) {
  let low = startIdx + 1;
  let high = navSeries.length - 1;
  let ans = -1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (dayjs(navSeries[mid].date).isSame(targetDate) || dayjs(navSeries[mid].date).isAfter(targetDate)) {
      ans = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return ans;
}

export function computeRollingCagr(navSeries, windowDays) {
  const values = [];
  for (let i = 0; i < navSeries.length; i += 1) {
    const start = navSeries[i];
    const target = dayjs(start.date).add(windowDays, "day");
    const endIdx = findEndIndex(navSeries, i, target);
    if (endIdx === -1) {
      continue;
    }
    const end = navSeries[endIdx];
    const actualDays = dayjs(end.date).diff(dayjs(start.date), "day");
    if (actualDays <= 0 || start.nav <= 0 || end.nav <= 0) {
      continue;
    }
    const cagr = Math.pow(end.nav / start.nav, 365 / actualDays) - 1;
    values.push(cagr);
  }
  return values;
}

export function computeMaxDrawdown(navSeries) {
  let peak = -Infinity;
  let maxDrawdown = 0;
  for (const point of navSeries) {
    peak = Math.max(peak, point.nav);
    const drawdown = (point.nav - peak) / peak;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  return maxDrawdown;
}

export function computeWindowAnalytics(navSeries, windowDays) {
  const rolling = computeRollingCagr(navSeries, windowDays);
  const rollingSummary = summarize(rolling);
  if (!rollingSummary) {
    return null;
  }
  const cagrSummary = summarize(rolling);
  return {
    minReturn: rollingSummary.min,
    maxReturn: rollingSummary.max,
    medianReturn: rollingSummary.median,
    p25: rollingSummary.p25,
    p75: rollingSummary.p75,
    maxDrawdown: computeMaxDrawdown(navSeries),
    cagrMin: cagrSummary.min,
    cagrMax: cagrSummary.max,
    cagrMedian: cagrSummary.median
  };
}
