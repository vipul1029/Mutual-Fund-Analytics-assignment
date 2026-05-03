import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

    console.log(`Inserted: ${fund.name}`);
  }

  console.log(" Seeded 10 funds successfully");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });