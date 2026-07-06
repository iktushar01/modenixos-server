import { DEMO_STORE_PATH } from "../../constants/demo";

export type KnowledgeItem = {
  sourceKey: string;
  title: string;
  content: string;
  category: string;
};

export const CHATBOT_KNOWLEDGE: KnowledgeItem[] = [
  {
    sourceKey: "overview",
    title: "What is ModenixOS",
    category: "overview",
    content:
      "ModenixOS is an all-in-one e-commerce platform for online businesses. It includes a beautiful storefront, product catalog with variants, inventory, orders, customers, coupons, reviews, analytics, and a dashboard to manage everything. Businesses can launch a live store in under 10 minutes without coding.",
  },
  {
    sourceKey: "how-it-works-1",
    title: "Step 1 — Create your store",
    category: "getting-started",
    content:
      "Getting started step 1: Sign up at /register, verify your email, then complete onboarding at /onboarding with your business name, slug, logo, country, and currency.",
  },
  {
    sourceKey: "how-it-works-2",
    title: "Step 2 — Add products",
    category: "getting-started",
    content:
      "Getting started step 2: Add products from the dashboard at /dashboard/products. Upload images, set price, variants (sizes, colors), categories, and collections. Set product status to ACTIVE to show on the storefront.",
  },
  {
    sourceKey: "how-it-works-3",
    title: "Step 3 — Customize and publish",
    category: "getting-started",
    content:
      "Getting started step 3: Customize branding, colors, logo, and theme from dashboard settings. Publish your store from /dashboard/settings so your public storefront goes live at /store/your-slug.",
  },
  {
    sourceKey: "how-it-works-4",
    title: "Step 4 — Sell and scale",
    category: "getting-started",
    content:
      "Getting started step 4: Process orders from /dashboard/orders, engage customers, use coupons on Growth plan, and track revenue from /dashboard/analytics.",
  },
  {
    sourceKey: "demo-store",
    title: "Live demo storefront",
    category: "demo",
    content:
      `Explore a live demo storefront at ${DEMO_STORE_PATH} (shortcut: /demo). It shows a fashion brand example with products, cart, and guest checkout. No login required to browse.`,
  },
  {
    sourceKey: "plan-starter",
    title: "Starter plan (free)",
    category: "pricing",
    content:
      "Starter plan is free ($0/month). Includes 1 online store, up to 50 products, public storefront, basic analytics, guest checkout, and email support. No credit card required. Sign up at /register.",
  },
  {
    sourceKey: "plan-growth",
    title: "Growth plan",
    category: "pricing",
    content:
      "Growth plan is $29/month. Includes unlimited products, custom branding and theme, coupons and promotions, advanced analytics, and priority support. Upgrade from /dashboard/settings/billing.",
  },
  {
    sourceKey: "plan-scale",
    title: "Scale plan",
    category: "pricing",
    content:
      "Scale plan is for teams and high-volume sellers. Includes multiple stores, custom domains, dedicated onboarding, API access, SLA, and custom integrations. Contact sales at support@modenixos.com.",
  },
  {
    sourceKey: "feature-storefronts",
    title: "Beautiful storefronts",
    category: "features",
    content:
      "ModenixOS storefronts are mobile-ready with your branding, collections, and product pages. Each store lives at /store/your-slug with cart, checkout, and order tracking.",
  },
  {
    sourceKey: "feature-inventory",
    title: "Smart inventory",
    category: "features",
    content:
      "Track stock, variants, and SKUs across categories. See what is selling and what needs restocking from the dashboard.",
  },
  {
    sourceKey: "feature-variants",
    title: "Product variants",
    category: "features",
    content:
      "Support sizes, colors, and custom attributes. Handle complex catalogs without spreadsheets.",
  },
  {
    sourceKey: "feature-customers",
    title: "Customer management",
    category: "features",
    content:
      "View customer purchase history, contact details, and lifetime value from /dashboard/customers.",
  },
  {
    sourceKey: "feature-checkout",
    title: "Secure checkout",
    category: "features",
    content:
      "Guest checkout is supported — customers can order with name and email without creating an account. Payment-ready flows with order confirmation.",
  },
  {
    sourceKey: "feature-orders",
    title: "Order fulfillment",
    category: "features",
    content:
      "Manage orders from pending to delivered at /dashboard/orders. Update status and keep customers informed.",
  },
  {
    sourceKey: "feature-coupons",
    title: "Coupons and promotions",
    category: "features",
    content:
      "Run discount codes and limited-time offers from /dashboard/coupons. Available on the Growth plan and above.",
  },
  {
    sourceKey: "feature-analytics",
    title: "Sales analytics",
    category: "features",
    content:
      "Revenue, orders, top products, and trends at /dashboard/analytics. Basic analytics on Starter; advanced analytics on Growth.",
  },
  {
    sourceKey: "industry-fashion",
    title: "Fashion industry",
    category: "industries",
    content:
      `ModenixOS works for fashion brands. Example demo: Luxe Threads at ${DEMO_STORE_PATH} with apparel, sizes, and collections.`,
  },
  {
    sourceKey: "industry-electronics",
    title: "Electronics industry",
    category: "industries",
    content:
      "ModenixOS supports electronics sellers with variants like storage, color, and SKU tracking.",
  },
  {
    sourceKey: "industry-furniture",
    title: "Furniture industry",
    category: "industries",
    content:
      "ModenixOS handles furniture catalogs with complex variants and fulfillment workflows.",
  },
  {
    sourceKey: "industry-beauty",
    title: "Beauty industry",
    category: "industries",
    content:
      "Beauty and cosmetics brands use ModenixOS for product catalogs, promotions, and repeat customer management.",
  },
  {
    sourceKey: "industry-grocery",
    title: "Grocery and general retail",
    category: "industries",
    content:
      "ModenixOS is industry-agnostic — grocery, books, pet supplies, digital products, and more are supported.",
  },
  {
    sourceKey: "faq-business-types",
    title: "What businesses can use ModenixOS",
    category: "faq",
    content:
      "Any business that sells online can use ModenixOS — fashion, electronics, furniture, grocery, beauty, digital products, books, pet supplies, and more.",
  },
  {
    sourceKey: "faq-technical-skills",
    title: "Technical skills required",
    category: "faq",
    content:
      "No technical skills required. ModenixOS is built for business owners and operators, not developers.",
  },
  {
    sourceKey: "faq-launch-time",
    title: "How quickly can I launch",
    category: "faq",
    content:
      "Most businesses go from signup to a live storefront in under 10 minutes. Average time to go live is about 5 minutes.",
  },
  {
    sourceKey: "faq-guest-checkout",
    title: "Guest checkout",
    category: "faq",
    content:
      "Yes, customers can checkout without an account. Guest checkout uses name and email only.",
  },
  {
    sourceKey: "faq-free-plan",
    title: "Free plan details",
    category: "faq",
    content:
      "The free Starter plan includes one store, up to 50 products, public storefront, basic analytics, and guest checkout. No credit card required.",
  },
  {
    sourceKey: "faq-plan-changes",
    title: "Upgrade or downgrade plans",
    category: "faq",
    content:
      "You can change plans anytime. Upgrades take effect immediately; downgrades apply at the end of the billing period.",
  },
  {
    sourceKey: "support-contact",
    title: "Contact support",
    category: "support",
    content:
      "For Scale plan or custom needs, email support@modenixos.com. Starter users get email support; Growth users get priority support.",
  },
];

export const CHATBOT_STARTER_PROMPTS = [
  "What is ModenixOS?",
  "How do I start for free?",
  "Compare pricing plans",
  "Show me the demo store",
];
