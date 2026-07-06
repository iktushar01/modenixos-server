#!/usr/bin/env tsx
/**
 * Demo seed script for ModenixOS recruiter demo.
 * Run: npx tsx scripts/seed-demo.ts
 */
import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../src/app/lib/prisma";
import {
  ProductStatus,
  OrderStatus,
  Role,
  ReviewStatus,
  CouponType,
} from "../src/app/lib/prisma-exports";
import { auth } from "../src/app/lib/auth";

export const DEMO_EMAIL = "demo@modenixos.com";
export const DEMO_PASSWORD = "demo123456";
export const DEMO_STORE_SLUG = "luxe-threads";

const FASHION_IMAGES = {
  hero: [
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=2100&q=80",
    "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=2100&q=80",
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=2100&q=80",
  ],
  brandStory: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80",
  categories: {
    men: "https://images.unsplash.com/photo-1617137968427-85924c800a41?w=800&q=80",
    women: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80",
    accessories: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80",
  },
  collections: {
    "new-arrival": "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&q=80",
    summer: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80",
    sale: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80",
  },
  products: [
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80",
    "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80",
    "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600&q=80",
    "https://images.unsplash.com/photo-1624222247344-550fb60583fd?w=600&q=80",
    "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&q=80",
    "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&q=80",
    "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&q=80",
    "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=80",
    "https://images.unsplash.com/photo-1591369833509-4ab27753e616?w=600&q=80",
    "https://images.unsplash.com/photo-1583496664526-48ddd532a741?w=600&q=80",
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80",
    "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80",
  ],
};

const DEMO_THEME = {
  templateId: "theme1",
  colorMode: "light",
  palettePreset: "classic-retail",
  brandColors: { primary: "#1a1a2e", accent: "#c9a96e" },
  typography: { preset: "editorial" },
  heroSlides: FASHION_IMAGES.hero,
  heroHeadline: "Elevated essentials",
  heroSubtext: "Premium fashion for the modern wardrobe — timeless pieces, thoughtfully curated.",
  promoText: "Free shipping on orders over $75 · New arrivals weekly",
  promoEnabled: true,
  brandStoryTitle: "Crafted for the discerning",
  brandStoryContent:
    "Luxe Threads was born from a simple belief: quality should feel effortless. Every piece in our collection is selected for exceptional materials, refined silhouettes, and lasting style. From our atelier to your wardrobe.",
  brandStoryImage: FASHION_IMAGES.brandStory,
  newsletterEnabled: true,
  sections: {
    categories: true,
    collections: true,
    featured: true,
    trending: true,
    promo: true,
    brandStory: true,
    reviews: true,
    newsletter: true,
  },
  header: {
    announcement: { enabled: true, text: "Free shipping on orders over $75" },
    tagline: "Premium fashion for the modern wardrobe",
    navSource: "categories",
    showSearch: true,
    showPhone: true,
  },
  contact: { phone: "+1 (555) 012-3456" },
  social: {
    instagram: "https://instagram.com",
    twitter: "https://twitter.com",
  },
  layout: { fullWidth: true, heroHeight: "72vh" },
};

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

  const storeData = {
    brandName: "Luxe Threads",
    slug: DEMO_STORE_SLUG,
    country: "United States",
    currency: "USD",
    description: "Premium fashion for the modern wardrobe.",
    isPublished: true,
    theme: DEMO_THEME,
    banner: FASHION_IMAGES.hero[0],
  };

  if (!store) {
    store = await prisma.store.create({
      data: { ownerId: user.id, ...storeData },
    });
  } else {
    store = await prisma.store.update({
      where: { id: store.id },
      data: storeData,
    });
  }

  const categoryDefs = [
    { name: "Men", slug: "men", image: FASHION_IMAGES.categories.men },
    { name: "Women", slug: "women", image: FASHION_IMAGES.categories.women },
    { name: "Accessories", slug: "accessories", image: FASHION_IMAGES.categories.accessories },
  ];

  const categoryMap: Record<string, string> = {};
  for (const cat of categoryDefs) {
    const row = await prisma.category.upsert({
      where: { storeId_slug: { storeId: store.id, slug: cat.slug } },
      create: { storeId: store.id, name: cat.name, slug: cat.slug, image: cat.image },
      update: { image: cat.image },
    });
    categoryMap[cat.slug] = row.id;
  }

  const collectionDefs = [
    { name: "New Arrival", slug: "new-arrival", isFeatured: true, image: FASHION_IMAGES.collections["new-arrival"] },
    { name: "Summer", slug: "summer", isFeatured: true, image: FASHION_IMAGES.collections.summer },
    { name: "Sale", slug: "sale", isFeatured: false, image: FASHION_IMAGES.collections.sale },
  ];

  const collectionMap: Record<string, string> = {};
  for (const col of collectionDefs) {
    const row = await prisma.collection.upsert({
      where: { storeId_slug: { storeId: store.id, slug: col.slug } },
      create: { storeId: store.id, name: col.name, slug: col.slug, isFeatured: col.isFeatured, image: col.image },
      update: { image: col.image, isFeatured: col.isFeatured },
    });
    collectionMap[col.slug] = row.id;
  }

  const productNames = [
    "Classic White Tee", "Denim Jacket", "Silk Blouse", "Leather Belt",
    "Wool Sweater", "Linen Pants", "Cashmere Scarf", "Canvas Sneakers",
    "Tailored Blazer", "Midi Skirt", "Crossbody Bag", "Gold Hoop Earrings",
  ];

  const productIds: string[] = [];
  for (let i = 0; i < productNames.length; i++) {
    const name = productNames[i]!;
    const categorySlug = i % 3 === 0 ? "men" : i % 3 === 1 ? "women" : "accessories";
    const collectionSlug = i < 4 ? "new-arrival" : i < 8 ? "summer" : "sale";

    const existing = await prisma.product.findFirst({ where: { storeId: store.id, name } });
    if (!existing) {
      const created = await prisma.product.create({
        data: {
          storeId: store.id,
          name,
          description: `Premium ${name.toLowerCase()} from Luxe Threads. Crafted with exceptional materials for everyday elegance.`,
          price: 49.99 + i * 10,
          discountPrice: i % 3 === 0 ? 39.99 + i * 8 : undefined,
          categoryId: categoryMap[categorySlug],
          collectionId: collectionMap[collectionSlug],
          stock: 50,
          sku: `LT-${1000 + i}`,
          images: [FASHION_IMAGES.products[i]!],
          sizes: ["S", "M", "L", "XL"],
          colors: ["Black", "White", "Navy"],
          tags: ["fashion", "premium"],
          status: ProductStatus.ACTIVE,
          sortOrder: i,
        },
      });
      productIds.push(created.id);
    } else {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          images: [FASHION_IMAGES.products[i]!],
          categoryId: categoryMap[categorySlug],
          collectionId: collectionMap[collectionSlug],
          sortOrder: i,
        },
      });
      productIds.push(existing.id);
    }
  }

  const reviewCount = await prisma.review.count({ where: { storeId: store.id } });
  if (reviewCount === 0) {
    const reviewers = [
      { name: "Sarah M.", rating: 5, comment: "Absolutely love the quality. The silk blouse is stunning!" },
      { name: "James K.", rating: 5, comment: "Best denim jacket I've owned. Fits perfectly." },
      { name: "Elena R.", rating: 4, comment: "Beautiful pieces, fast delivery. Will order again." },
      { name: "Michael T.", rating: 5, comment: "The cashmere scarf is incredibly soft. Great gift." },
      { name: "Priya S.", rating: 5, comment: "Elegant designs and thoughtful packaging." },
      { name: "David L.", rating: 4, comment: "Classic styles that last. Highly recommend." },
    ];

    for (let i = 0; i < reviewers.length; i++) {
      const r = reviewers[i]!;
      await prisma.review.create({
        data: {
          storeId: store.id,
          productId: productIds[i % productIds.length]!,
          guestName: r.name,
          guestEmail: `reviewer${i + 1}@example.com`,
          rating: r.rating,
          comment: r.comment,
          status: ReviewStatus.APPROVED,
        },
      });
    }
  }

  await prisma.coupon.upsert({
    where: { storeId_code: { storeId: store.id, code: "WELCOME10" } },
    create: {
      storeId: store.id,
      code: "WELCOME10",
      type: CouponType.PERCENT,
      value: 10,
      minOrder: 50,
      isActive: true,
    },
    update: { isActive: true },
  });

  await prisma.coupon.upsert({
    where: { storeId_code: { storeId: store.id, code: "LUXE20" } },
    create: {
      storeId: store.id,
      code: "LUXE20",
      type: CouponType.FIXED,
      value: 20,
      minOrder: 100,
      isActive: true,
    },
    update: { isActive: true },
  });

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
  console.log(`Storefront: /store/${DEMO_STORE_SLUG}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
