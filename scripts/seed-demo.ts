#!/usr/bin/env tsx
/**
 * Demo seed script for ModenixOS recruiter demo.
 * Run: npx tsx scripts/seed-demo.ts
 */
import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../src/app/lib/prisma";
import { ProductStatus, OrderStatus, Role } from "../src/app/lib/prisma-exports";
import { auth } from "../src/app/lib/auth";

const DEMO_EMAIL = "demo@modenixos.com";
const DEMO_PASSWORD = "demo123456";

async function main() {
  console.log("Seeding ModenixOS demo data...");

  let user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });

  if (!user) {
    const { user: authUser } = await auth.api.signUpEmail({
      body: {
        name: "Demo Owner",
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        role: Role.CLIENT,
        needPasswordChange: false,
      },
    });

    await prisma.client.create({
      data: {
        userId: authUser.id,
        name: "Demo Owner",
        email: DEMO_EMAIL,
      },
    });

    user = await prisma.user.update({
      where: { id: authUser.id },
      data: { emailVerified: true },
    });
  }

  let store = await prisma.store.findUnique({ where: { ownerId: user.id } });

  if (!store) {
    store = await prisma.store.create({
      data: {
        ownerId: user.id,
        brandName: "Luxe Threads",
        slug: "luxe-threads",
        country: "United States",
        currency: "USD",
        description: "Premium fashion for the modern wardrobe.",
        isPublished: true,
        theme: {
          primaryColor: "#1a1a2e",
          secondaryColor: "#e94560",
          fontFamily: "Inter",
        },
      },
    });
  }

  const categories = ["Men", "Women", "Accessories"];
  for (const name of categories) {
    const slug = name.toLowerCase();
    await prisma.category.upsert({
      where: { storeId_slug: { storeId: store.id, slug } },
      create: { storeId: store.id, name, slug },
      update: {},
    });
  }

  const collections = [
    { name: "New Arrival", slug: "new-arrival", isFeatured: true },
    { name: "Summer", slug: "summer", isFeatured: true },
    { name: "Sale", slug: "sale", isFeatured: false },
  ];

  for (const col of collections) {
    await prisma.collection.upsert({
      where: { storeId_slug: { storeId: store.id, slug: col.slug } },
      create: { storeId: store.id, ...col },
      update: {},
    });
  }

  const cat = await prisma.category.findFirst({ where: { storeId: store.id } });
  const col = await prisma.collection.findFirst({ where: { storeId: store.id } });

  const productNames = [
    "Classic White Tee", "Denim Jacket", "Silk Blouse", "Leather Belt",
    "Wool Sweater", "Linen Pants", "Cashmere Scarf", "Canvas Sneakers",
    "Tailored Blazer", "Midi Skirt", "Crossbody Bag", "Gold Hoop Earrings",
  ];

  for (let i = 0; i < productNames.length; i++) {
    const name = productNames[i]!;
    const existing = await prisma.product.findFirst({ where: { storeId: store.id, name } });
    if (!existing) {
      await prisma.product.create({
        data: {
          storeId: store.id,
          name,
          description: `Premium ${name.toLowerCase()} from Luxe Threads.`,
          price: 49.99 + i * 10,
          discountPrice: i % 3 === 0 ? 39.99 + i * 8 : undefined,
          categoryId: cat?.id,
          collectionId: col?.id,
          stock: 50,
          sku: `LT-${1000 + i}`,
          images: [`https://picsum.photos/seed/${i + 1}/600/800`],
          sizes: ["S", "M", "L", "XL"],
          colors: ["Black", "White", "Navy"],
          tags: ["fashion", "premium"],
          status: ProductStatus.ACTIVE,
        },
      });
    }
  }

  const orderCount = await prisma.order.count({ where: { storeId: store.id } });
  if (orderCount === 0) {
    const products = await prisma.product.findMany({ where: { storeId: store.id }, take: 3 });
    const statuses = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.CANCELLED];

    for (let i = 0; i < 5; i++) {
      const product = products[i % products.length]!;
      await prisma.order.create({
        data: {
          storeId: store.id,
          orderNumber: `ORD-DEMO-${i + 1}`,
          status: statuses[i]!,
          paymentMethod: "COD",
          items: [{
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
          }],
          customerName: `Customer ${i + 1}`,
          customerEmail: `customer${i + 1}@example.com`,
          shippingAddress: {
            line1: "123 Fashion Ave",
            city: "New York",
            postalCode: "10001",
            country: "US",
          },
          subtotal: product.price,
          total: product.price + 5,
          shipping: 5,
        },
      });
    }
  }

  console.log("Demo seed complete!");
  console.log(`Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`Storefront: /store/luxe-threads`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
