import { prisma } from "../db/prisma.js";
import { WINDOWS, computeWindowAnalytics } from "../analytics/computeAnalytics.js";

function toNumber(value) {
  return Number(value);
}

function decimal6(value) {
  return Number(value.toFixed(6));
}

export async function recomputeAnalyticsForFund(fundCode) {
  const navRows = await prisma.navData.findMany({
    where: { fundCode },
    orderBy: { date: "asc" }
  });

  const navSeries = navRows.map((row) => ({
    date: row.date,
    nav: toNumber(row.nav)
  }));

  for (const [window, days] of Object.entries(WINDOWS)) {
    const computed = computeWindowAnalytics(navSeries, days);
    if (!computed) {
      continue;
    }

    await prisma.analytics.upsert({
      where: { fundCode_window: { fundCode, window } },
      create: {
        fundCode,
        window,
        minReturn: decimal6(computed.minReturn),
        maxReturn: decimal6(computed.maxReturn),
        medianReturn: decimal6(computed.medianReturn),
        p25: decimal6(computed.p25),
        p75: decimal6(computed.p75),
        maxDrawdown: decimal6(computed.maxDrawdown),
        cagrMin: decimal6(computed.cagrMin),
        cagrMax: decimal6(computed.cagrMax),
        cagrMedian: decimal6(computed.cagrMedian)
      },
      update: {
        minReturn: decimal6(computed.minReturn),
        maxReturn: decimal6(computed.maxReturn),
        medianReturn: decimal6(computed.medianReturn),
        p25: decimal6(computed.p25),
        p75: decimal6(computed.p75),
        maxDrawdown: decimal6(computed.maxDrawdown),
        cagrMin: decimal6(computed.cagrMin),
        cagrMax: decimal6(computed.cagrMax),
        cagrMedian: decimal6(computed.cagrMedian),
        computedAt: new Date()
      }
    });
  }
}
