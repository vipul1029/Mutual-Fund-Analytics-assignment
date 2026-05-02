// // import "dotenv/config";
// // import { PrismaClient } from "@prisma/client";
// // import { request } from "undici";

// // const prisma = new PrismaClient();
// // const baseUrl = process.env.MFAPI_BASE_URL ?? "https://api.mfapi.in";

// // const AMCS = [
// //   "ICICI Prudential",
// //   "HDFC",
// //   "Axis",
// //   "SBI",
// //   "Kotak Mahindra"
// // ];

// // const CATEGORIES = [
// //   { label: "Equity: Mid Cap Direct Growth", tokens: ["mid cap", "direct", "growth"] },
// //   { label: "Equity: Small Cap Direct Growth", tokens: ["small cap", "direct", "growth"] }
// // ];

// // async function search(query) {
// //   const { body, statusCode } = await request(`${baseUrl}/mf/search?q=${encodeURIComponent(query)}`);
// //   if (statusCode < 200 || statusCode >= 300) {
// //     throw new Error(`Search failed: ${statusCode}`);
// //   }
// //   return body.json();
// // }

// // function pickBest(results, amc, categoryTokens) {
// //   const scored = results
// //     .map((item) => {
// //       const name = String(item.schemeName || "").toLowerCase();
// //       const amcScore = name.includes(amc.toLowerCase()) ? 3 : 0;
// //       const tokenScore = categoryTokens.filter((token) => name.includes(token)).length;
// //       return { item, score: amcScore + tokenScore };
// //     })
// //     .filter((row) => row.score >= 5)
// //     .sort((a, b) => b.score - a.score);

// //   return scored[0]?.item ?? null;
// // }

// // async function main() {
// //   const selected = [];

// //   for (const amc of AMCS) {
// //     for (const category of CATEGORIES) {
// //       const query = `${amc} ${category.label}`;
// //       const results = await search(query);
// //       const choice = pickBest(results, amc, category.tokens);
// //       if (!choice) {
// //         throw new Error(`No fund found for ${amc} / ${category.label}`);
// //       }
// //       selected.push({
// //         code: String(choice.schemeCode),
// //         name: choice.schemeName,
// //         amc,
// //         category: category.label
// //       });
// //     }
// //   }

// //   for (const fund of selected) {
// //     await prisma.fund.upsert({
// //       where: { code: fund.code },
// //       create: fund,
// //       update: fund
// //     });
// //   }

// //   console.log(`Seeded ${selected.length} funds.`);
// // }

// // main()
// //   .catch((error) => {
// //     console.error(error);
// //     process.exit(1);
// //   })
// //   .finally(async () => {
// //     await prisma.$disconnect();
// //   });














// import "dotenv/config";
// import { PrismaClient } from "@prisma/client";
// import { request } from "undici";

// const prisma = new PrismaClient();
// const baseUrl = process.env.MFAPI_BASE_URL ?? "https://api.mfapi.in";

// const AMCS = [
//   "ICICI Prudential",
//   "HDFC",
//   "Axis",
//   "SBI",
//   "Kotak Mahindra"
// ];

// const CATEGORIES = [
//   {
//     label: "Equity: Mid Cap Direct Growth",
//     tokens: ["mid", "cap", "direct", "growth"]
//   },
//   {
//     label: "Equity: Small Cap Direct Growth",
//     tokens: ["small", "cap", "direct", "growth"]
//   }
// ];

// async function search(query) {
//   const { body, statusCode } = await request(
//     `${baseUrl}/mf/search?q=${encodeURIComponent(query)}`
//   );

//   if (statusCode < 200 || statusCode >= 300) {
//     throw new Error(`Search failed: ${statusCode}`);
//   }

//   return body.json();
// }

// function pickBest(results, amc, categoryTokens) {
//   const scored = results
//     .map((item) => {
//       const name = String(item.schemeName || "").toLowerCase();

//       const amcScore = name.includes(amc.toLowerCase()) ? 3 : 0;

//       const tokenScore = categoryTokens.filter((token) =>
//         name.includes(token)
//       ).length;

//       return { item, score: amcScore + tokenScore };
//     })
//     .sort((a, b) => b.score - a.score);

//   // Primary selection (good match)
//   if (scored.length > 0 && scored[0].score >= 3) {
//     return scored[0].item;
//   }

//   // Fallback (always pick something to avoid failure)
//   return results[0] ?? null;
// }

// async function main() {
//   const selected = [];

//   for (const amc of AMCS) {
//     for (const category of CATEGORIES) {
//       const query = `${amc} ${category.label}`;

//       console.log(`🔍 Searching: ${query}`);

//       const results = await search(query);

//       if (!results || results.length === 0) {
//         throw new Error(`No results from API for ${query}`);
//       }

//       const choice = pickBest(results, amc, category.tokens);

//       if (!choice) {
//         throw new Error(`No fund found for ${amc} / ${category.label}`);
//       }

//       selected.push({
//         code: String(choice.schemeCode),
//         name: choice.schemeName,
//         amc,
//         category: category.label
//       });
//     }
//   }

//   for (const fund of selected) {
//     await prisma.fund.upsert({
//       where: { code: fund.code },
//       create: fund,
//       update: fund
//     });

//     console.log(` Inserted: ${fund.name}`);
//   }

//   console.log(` Seeded ${selected.length} funds successfully`);
// }

// main()
//   .catch((error) => {
//     console.error(" Seed failed:", error.message);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
















import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// const FUNDS = [
//   // ICICI
//   {
//     code: "120503",
//     name: "ICICI Prudential Bluechip Fund - Direct Plan - Growth",
//     amc: "ICICI Prudential",
//     category: "Equity: Mid Cap Direct Growth"
//   },
//   {
//     code: "120716",
//     name: "ICICI Prudential Smallcap Fund - Direct Plan - Growth",
//     amc: "ICICI Prudential",
//     category: "Equity: Small Cap Direct Growth"
//   },

//   // HDFC
//   {
//     code: "125497",
//     name: "HDFC Top 100 Fund - Direct Plan - Growth",
//     amc: "HDFC",
//     category: "Equity: Mid Cap Direct Growth"
//   },
//   {
//     code: "118989",
//     name: "HDFC Small Cap Fund - Direct Plan - Growth",
//     amc: "HDFC",
//     category: "Equity: Small Cap Direct Growth"
//   },

//   // Axis
//   {
//     code: "120716",
//     name: "Axis Midcap Fund - Direct Plan - Growth",
//     amc: "Axis",
//     category: "Equity: Mid Cap Direct Growth"
//   },
//   {
//     code: "120503",
//     name: "Axis Small Cap Fund - Direct Plan - Growth",
//     amc: "Axis",
//     category: "Equity: Small Cap Direct Growth"
//   },

//   // SBI
//   {
//     code: "119551",
//     name: "SBI Magnum Midcap Fund - Direct Plan - Growth",
//     amc: "SBI",
//     category: "Equity: Mid Cap Direct Growth"
//   },
//   {
//     code: "120503",
//     name: "SBI Small Cap Fund - Direct Plan - Growth",
//     amc: "SBI",
//     category: "Equity: Small Cap Direct Growth"
//   },

//   // Kotak
//   {
//     code: "120503",
//     name: "Kotak Emerging Equity Fund - Direct Plan - Growth",
//     amc: "Kotak Mahindra",
//     category: "Equity: Mid Cap Direct Growth"
//   },
//   {
//     code: "120716",
//     name: "Kotak Small Cap Fund - Direct Plan - Growth",
//     amc: "Kotak Mahindra",
//     category: "Equity: Small Cap Direct Growth"
//   }
// ];
const FUNDS = [
  // ICICI
  { code: "120503", name: "ICICI Prudential Bluechip Fund - Direct Plan - Growth", amc: "ICICI Prudential", category: "Equity: Mid Cap Direct Growth" },
  { code: "120716", name: "ICICI Prudential Smallcap Fund - Direct Plan - Growth", amc: "ICICI Prudential", category: "Equity: Small Cap Direct Growth" },

  // HDFC
  { code: "125497", name: "HDFC Top 100 Fund - Direct Plan - Growth", amc: "HDFC", category: "Equity: Mid Cap Direct Growth" },
  { code: "118989", name: "HDFC Small Cap Fund - Direct Plan - Growth", amc: "HDFC", category: "Equity: Small Cap Direct Growth" },

  // Axis
  { code: "120465", name: "Axis Midcap Fund - Direct Plan - Growth", amc: "Axis", category: "Equity: Mid Cap Direct Growth" },
  { code: "120472", name: "Axis Small Cap Fund - Direct Plan - Growth", amc: "Axis", category: "Equity: Small Cap Direct Growth" },

  // SBI
  { code: "119551", name: "SBI Magnum Midcap Fund - Direct Plan - Growth", amc: "SBI", category: "Equity: Mid Cap Direct Growth" },
  { code: "125354", name: "SBI Small Cap Fund - Direct Plan - Growth", amc: "SBI", category: "Equity: Small Cap Direct Growth" },

  // Kotak
  { code: "120323", name: "Kotak Emerging Equity Fund - Direct Plan - Growth", amc: "Kotak Mahindra", category: "Equity: Mid Cap Direct Growth" },
  { code: "120327", name: "Kotak Small Cap Fund - Direct Plan - Growth", amc: "Kotak Mahindra", category: "Equity: Small Cap Direct Growth" }
];

async function main() {
  for (const fund of FUNDS) {
    await prisma.fund.upsert({
      where: { code: fund.code },
      update: {},
      create: fund
    });

    console.log(`✅ Inserted: ${fund.name}`);
  }

  console.log("🎉 Seeded 10 funds successfully");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });