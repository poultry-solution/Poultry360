// Roles shown in the home page section "Built for every role in the poultry chain".
// Keep the words short and simple. Only list what the app really does today.
import type { LucideIcon } from "lucide-react";
import {
  Bird,
  Building2,
  Coins,
  Egg,
  Factory,
  Layers,
  Package,
  Receipt,
  ShoppingBag,
  Thermometer,
  Users,
} from "lucide-react";

export type LandingFeatureGroup = {
  title: string;
  icon: LucideIcon;
  items: string[];
};

export type LandingModule = {
  id: string;
  label: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  signupHref: string;
  /** Module detail page, if there is one. */
  detailHref?: string;
  groups: LandingFeatureGroup[];
};

const farmerBuyingAndStock = (stock: string): LandingFeatureGroup => ({
  title: "Buying and stock",
  icon: Package,
  items: ["Supplier ledger with bill photos", stock, "Make your own feed", "More than one farm"],
});

const farmerTeamAndTools = (listForSale: string): LandingFeatureGroup => ({
  title: "Team and tools",
  icon: Users,
  items: [
    "Staff salary",
    "Staff login and activity log",
    "Cash in hand",
    "Reminders and batch notes",
    "Share a health report with your vet",
    "Analytics and downloads",
    listForSale,
    "Nepali date and Nepali language",
    "Tutorial videos",
  ],
});

export const landingModules: LandingModule[] = [
  {
    id: "layer",
    label: "Layer Farmer",
    eyebrow: "For egg farms",
    description: "Track hens, eggs and money, from day-old chicks to the last egg.",
    icon: Egg,
    signupHref: "/auth/signup",
    detailHref: "/layer-farm-software",
    groups: [
      {
        title: "Hens and eggs",
        icon: Egg,
        items: [
          "Layer batches from day-old chicks",
          "Daily eggs by type (Large, Medium, Small, Cracked)",
          "Laying percent",
          "Egg stock",
          "Deaths with reason",
        ],
      },
      {
        title: "Money",
        icon: Coins,
        items: [
          "Egg cost per egg and per carat",
          "Profit per batch and hen payback",
          "Sell eggs by type and sell old hens",
          "Buyers, payments and what they owe",
          "Feed, medicine and other costs",
        ],
      },
      farmerBuyingAndStock("Stock of feed, chicks, medicine and eggs"),
      farmerTeamAndTools("List eggs or birds for sale"),
    ],
  },
  {
    id: "broiler",
    label: "Broiler Farmer",
    eyebrow: "For meat bird farms",
    description: "Run every batch from chicks to sale, and know your profit.",
    icon: Bird,
    signupHref: "/auth/signup",
    detailHref: "/broiler-farm-software",
    groups: [
      {
        title: "Birds and growth",
        icon: Bird,
        items: [
          "Batches from chicks to sale",
          "Deaths with reason",
          "Weight and FCR",
          "Corrected FCR (cFCR)",
          "Share a health report with your vet",
        ],
      },
      {
        title: "Money",
        icon: Coins,
        items: [
          "Profit per batch, cost per bird and per kilo",
          "Sell by weight, with weight discount",
          "Buyers, payments and what they owe",
          "Feed and other costs",
        ],
      },
      farmerBuyingAndStock("Stock of feed, chicks and medicine"),
      farmerTeamAndTools("List birds for sale"),
    ],
  },
  {
    id: "dealer",
    label: "Feed Dealer",
    eyebrow: "For feed shops",
    description: "Buy from companies, sell to farmers, and always know who owes what.",
    icon: ShoppingBag,
    signupHref: "/auth/signup/dealer",
    detailHref: "/feed-dealer-software",
    groups: [
      {
        title: "Companies",
        icon: Building2,
        items: [
          "Buy stock with bill photos",
          "Pay companies and see each account",
          "Sell stock back to a company",
        ],
      },
      {
        title: "Stock and sales",
        icon: Receipt,
        items: [
          "Stock with selling prices and reorder",
          "Sales with discount and part payment",
          "Share bills on WhatsApp",
        ],
      },
      {
        title: "Customers",
        icon: Coins,
        items: [
          "Customers with old balance",
          "Take payments with receipt photos",
          "Payment reminders",
          "Broiler sales and settlement with farmers",
        ],
      },
      {
        title: "Team and tools",
        icon: Users,
        items: [
          "Staff salary",
          "Staff login and activity log",
          "Cash in hand",
          "Analytics and downloads",
          "Nepali date and Nepali language",
          "Tutorial videos",
        ],
      },
    ],
  },
  {
    id: "feedmill",
    label: "Feed Mill Company",
    eyebrow: "For feed companies",
    description: "Make feed, sell to dealers, and control dealer balances.",
    icon: Factory,
    signupHref: "/auth/signup/company",
    groups: [
      {
        title: "Dealers and sales",
        icon: Building2,
        items: ["Dealer accounts", "Sales to dealers", "Balance limit for each dealer"],
      },
      {
        title: "Production and stock",
        icon: Factory,
        items: ["Purchases of raw material", "Feed production", "Inventory"],
      },
      {
        title: "Team",
        icon: Users,
        items: ["Staff salary"],
      },
    ],
  },
  {
    id: "hatchery",
    label: "Hatchery",
    eyebrow: "For hatcheries",
    description: "From parent flock eggs to chicks sold, in one place.",
    icon: Layers,
    signupHref: "/auth/signup/hatchery",
    detailHref: "/hatchery-software",
    groups: [
      {
        title: "Parent flock and eggs",
        icon: Egg,
        items: ["Parent batches", "Daily eggs by type", "Your own egg types", "Egg stock by batch"],
      },
      {
        title: "Incubation",
        icon: Thermometer,
        items: [
          "Set eggs",
          "Candling on day 9",
          "Move to hatcher on day 18",
          "Hatch result with Grade A, B and cull",
          "Today's work on the home page",
        ],
      },
      {
        title: "Sales and money",
        icon: Coins,
        items: [
          "Sell chicks and share the bill",
          "Sell table eggs and old parent birds",
          "Parties, ledger and payments",
          "Supplier ledger and inventory",
        ],
      },
      {
        title: "Team and tools",
        icon: Users,
        items: ["Staff login and activity log", "Reminders and notes", "Analytics and downloads", "Tutorial videos"],
      },
    ],
  },
];
