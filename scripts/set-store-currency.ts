#!/usr/bin/env tsx
/**
 * Set currency for a storefront by slug.
 * Run: npx tsx scripts/set-store-currency.ts test BDT
 */
import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../src/app/lib/prisma";

async function main() {
  const slug = process.argv[2] ?? "test";
  const currency = (process.argv[3] ?? "BDT").toUpperCase();
  const country = process.argv[4] ?? "Bangladesh";

  const store = await prisma.store.findUnique({ where: { slug } });
  if (!store) {
    console.error(`Store not found for slug: ${slug}`);
    process.exit(1);
  }

  const updated = await prisma.store.update({
    where: { id: store.id },
    data: { currency, country },
  });

  console.log(`Updated /store/${updated.slug} → ${updated.currency} (${updated.country})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
