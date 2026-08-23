import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Bird,
  CheckCircle2,
  ClipboardList,
  Coins,
  Egg,
  Handshake,
  Layers,
  Package,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Users,
  Wheat,
} from "lucide-react";

const siteUrl = "https://www.poultry360.org";

export type ModuleFeature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type ModuleFaq = {
  question: string;
  answer: string;
};

type ModuleValueProp = {
  title: string;
  description: string;
};

type ModuleAccent = {
  border: string;
  chipBg: string;
  chipBorder: string;
  chipText: string;
  iconBg: string;
  iconText: string;
};

export type ModulePageContent = {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  openGraphTitle: string;
  openGraphDescription: string;
  schemaName: string;
  schemaSubCategory: string;
  heroBadge: string;
  heroTitle: string;
  heroDescription: string;
  moduleEyebrow: string;
  moduleTitle: string;
  moduleSummary: string;
  useCases: string[];
  outcomes: string[];
  whyTitle: string;
  whyDescription: string;
  valueProps: ModuleValueProp[];
  faqs: ModuleFaq[];
  ctaHeading: string;
  ctaDescription: string;
  accent: ModuleAccent;
  features: ModuleFeature[];
};

const sharedFarmerFeatureDescriptions = {
  farmManagement:
    "Keep sheds, flock groups, daily farm activity, and operational records organized in one dashboard instead of scattered notebooks.",
  batchManagement:
    "Track each flock batch with placement details, age, cycle progress, and historical performance so review is always batch-wise.",
  expensesManagement:
    "Record medicine, feed, labor, transport, utility, and maintenance expenses to understand the real cost of poultry production in Nepal.",
  mortalityManagement:
    "Log daily mortality and monitor unusual loss patterns early so farm managers can react before small issues become larger losses.",
  salesManagement:
    "Manage sales entries, customer billing, delivery records, and changing market rates from one reliable operating system.",
  salesBalanceManagement:
    "See which buyers still owe payment, how much balance is pending, and where collection follow-up is needed.",
  partiesManagement:
    "Maintain supplier, customer, and business party ledgers in one place so payment history and transaction records remain easy to audit.",
  inventoryManagement:
    "Monitor stock for feed, medicines, vaccines, packaging, and farm supplies so shortages do not interrupt routine operations.",
  purchaseManagement:
    "Track purchases by vendor, quantity, price, and due amount so procurement stays transparent and easier to control.",
  feedSupplierManagement:
    "Manage feed supplier relationships, order flow, and supply history clearly across batches and farm cycles.",
  connectionSupplierFeatures:
    "Coordinate with connected suppliers and related businesses inside the system instead of depending only on manual calls and chat follow-up.",
  listForSale:
    "List eggs, birds, or other available products for sale so interested buyers can respond faster through your network and marketplace presence.",
  staffSalaryManagement:
    "Track staff roles, salary entries, and payment status so labor costs stay organized and easier to reconcile.",
  fcrEvaluation:
    "Use feed conversion and efficiency indicators to understand where feed cost is rising and where management changes can improve results.",
};

export function buildModuleMetadata(content: ModulePageContent): Metadata {
  const pageUrl = `${siteUrl}/${content.slug}`;

  return {
    title: content.metaTitle,
    description: content.metaDescription,
    alternates: {
      canonical: `/${content.slug}`,
    },
    openGraph: {
      title: content.openGraphTitle,
      description: content.openGraphDescription,
      url: pageUrl,
      siteName: "Poultry360",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: content.openGraphTitle,
      description: content.openGraphDescription,
    },
  };
}

export const modulePageContent: Record<string, ModulePageContent> = {
  layer: {
    slug: "layer-farm-software",
    metaTitle:
      "Layer Farm Software for Nepal | Egg Production Management | Poultry360",
    metaDescription:
      "Layer farm software for Nepal to manage egg production, batch records, mortality, expenses, inventory, sales, supplier ledgers, and FCR in one poultry management system.",
    openGraphTitle: "Layer Farm Software for Nepal | Poultry360",
    openGraphDescription:
      "Manage egg production, flock batches, inventory, expenses, supplier records, and sales with Poultry360 layer farm software.",
    schemaName: "Poultry360 Layer Farm Software",
    schemaSubCategory: "Layer Farm Management Software",
    heroBadge: "Layer Farm Software for Nepal",
    heroTitle:
      "Manage egg production, flock records, and farm operations in one layer farm system",
    heroDescription:
      "Poultry360 is built for layer farms in Nepal that want better visibility into egg production, flock performance, mortality, feed usage, inventory, sales, and expenses without depending on manual registers. The result is faster decisions, cleaner records, and a clearer view of farm profitability.",
    moduleEyebrow: "Built for egg-producing farms",
    moduleTitle: "Layer Farmer Module",
    moduleSummary:
      "This module gives layer farm owners and managers a complete operating view: production, batches, mortality, expenses, purchases, inventory, supplier coordination, staff salary, and egg-specific performance tracking.",
    useCases: [
      "Daily flock performance monitoring for layer farms in Nepal",
      "Egg production tracking by batch, age, and output percentage",
      "Expense, sales, and purchase records in one layer farm software",
      "Supplier, customer, and balance follow-up without manual ledger confusion",
    ],
    outcomes: [
      "Clear daily visibility into egg production and mortality",
      "Better control of feed, medicine, and operating costs",
      "Faster sales tracking and buyer balance recovery",
      "Cleaner records for farm owners, managers, and field staff",
    ],
    whyTitle: "Better records for the realities of Nepal layer farming",
    whyDescription:
      "Layer farms do not struggle only with production. They also deal with variable feed cost, staff coordination, buyer credit, mortality events, and manual reporting. Poultry360 helps bring these moving pieces into one working system.",
    valueProps: [
      {
        title: "Operational clarity",
        description:
          "Know what happened today across egg count, mortality, expenses, sales, and inventory without waiting for end-of-day manual summaries.",
      },
      {
        title: "Cost visibility",
        description:
          "Track feed, medicine, labor, and procurement costs in one place so profit decisions are based on actual data, not assumptions.",
      },
      {
        title: "Buyer and supplier control",
        description:
          "Keep party ledgers, purchase records, and sales balances organized so cash flow problems are easier to spot and manage.",
      },
      {
        title: "Stronger performance review",
        description:
          "Use batch records, egg percentage, and FCR evaluation to review which flock is performing and where corrective action is needed.",
      },
    ],
    faqs: [
      {
        question: "Who is this layer farm software for?",
        answer:
          "It is built for layer farmers, farm managers, poultry business owners, and teams in Nepal who need one system for flock records, egg production, inventory, expenses, and sales.",
      },
      {
        question: "Can Poultry360 track daily egg production by batch?",
        answer:
          "Yes. The layer module is designed to track batch-wise production, egg percentage, mortality, expenses, and sales so you can review performance by flock and by day.",
      },
      {
        question: "Does it help with feed and inventory control?",
        answer:
          "Yes. You can record feed stock, medicines, farm supplies, purchases, and supplier activity so inventory decisions are based on actual usage and remaining stock.",
      },
      {
        question: "Is this useful for Nepal poultry farms with multiple staff members?",
        answer:
          "Yes. Poultry360 centralizes farm operations, salary records, ledgers, and daily activity so owners and staff are not relying on separate notebooks or spreadsheets.",
      },
      {
        question: "How does this improve decision-making for layer farms?",
        answer:
          "By bringing production, mortality, inventory, expenses, and sales into one system, the software makes it easier to identify low-performing batches, rising costs, and delayed customer payments.",
      },
    ],
    ctaHeading:
      "Start with a cleaner system for production, inventory, expenses, and egg sales",
    ctaDescription:
      "If you are comparing poultry software in Nepal, Poultry360 gives layer farms a focused operating system built around daily production reality, not generic farm record keeping.",
    accent: {
      border: "border-emerald-200",
      chipBg: "bg-emerald-50",
      chipBorder: "border-emerald-200",
      chipText: "text-emerald-700",
      iconBg: "bg-emerald-100",
      iconText: "text-emerald-700",
    },
    features: [
      {
        title: "Farm management",
        description: sharedFarmerFeatureDescriptions.farmManagement,
        icon: Egg,
      },
      {
        title: "Batch management",
        description:
          "Track every flock batch from chick placement to laying cycle with batch-wise age, production stage, and performance history.",
        icon: ClipboardList,
      },
      {
        title: "Expenses management",
        description: sharedFarmerFeatureDescriptions.expensesManagement,
        icon: Coins,
      },
      {
        title: "Mortality management",
        description: sharedFarmerFeatureDescriptions.mortalityManagement,
        icon: Activity,
      },
      {
        title: "Sales management",
        description:
          "Handle egg sales, customer billing, rate changes, and daily dispatch without relying on scattered notebooks or spreadsheets.",
        icon: TrendingUp,
      },
      {
        title: "Sales balance management",
        description: sharedFarmerFeatureDescriptions.salesBalanceManagement,
        icon: Receipt,
      },
      {
        title: "Parties management",
        description: sharedFarmerFeatureDescriptions.partiesManagement,
        icon: Users,
      },
      {
        title: "Inventory management",
        description:
          "Monitor stock for feed, medicine, vaccines, trays, packaging, and farm supplies to avoid costly shortages during peak production.",
        icon: Package,
      },
      {
        title: "Purchase management",
        description: sharedFarmerFeatureDescriptions.purchaseManagement,
        icon: ShoppingCart,
      },
      {
        title: "Feed Supplier management",
        description: sharedFarmerFeatureDescriptions.feedSupplierManagement,
        icon: Wheat,
      },
      {
        title: "Connection supplier features",
        description: sharedFarmerFeatureDescriptions.connectionSupplierFeatures,
        icon: Handshake,
      },
      {
        title: "List for sale your products",
        description: sharedFarmerFeatureDescriptions.listForSale,
        icon: CheckCircle2,
      },
      {
        title: "Staff salary management",
        description: sharedFarmerFeatureDescriptions.staffSalaryManagement,
        icon: Users,
      },
      {
        title: "FCR evaluation",
        description: sharedFarmerFeatureDescriptions.fcrEvaluation,
        icon: BarChart3,
      },
      {
        title: "Egg production tracking by type",
        description:
          "Record production by egg category or type to understand output mix, sales potential, and layer performance more clearly.",
        icon: Egg,
      },
      {
        title: "Egg % tracking",
        description:
          "Follow daily egg production percentage against flock size so you can spot performance drops early and act before losses compound.",
        icon: TrendingUp,
      },
    ],
  },
  broiler: {
    slug: "broiler-farm-software",
    metaTitle:
      "Broiler Farm Software for Nepal | Batch and FCR Tracking | Poultry360",
    metaDescription:
      "Broiler farm software for Nepal to manage batches, mortality, feed conversion, expenses, purchases, inventory, sales, and party ledgers in one poultry system.",
    openGraphTitle: "Broiler Farm Software for Nepal | Poultry360",
    openGraphDescription:
      "Track broiler batches, mortality, FCR, expenses, inventory, and sales with Poultry360 broiler farm software.",
    schemaName: "Poultry360 Broiler Farm Software",
    schemaSubCategory: "Broiler Farm Management Software",
    heroBadge: "Broiler Farm Software for Nepal",
    heroTitle:
      "Run broiler batches, cost control, and sales tracking from one broiler farm dashboard",
    heroDescription:
      "Poultry360 helps broiler farms in Nepal manage fast-moving flock cycles with better visibility into batches, mortality, expenses, purchases, inventory, customer balances, and FCR. It replaces scattered manual tracking with one clear operating system for day-to-day broiler decisions.",
    moduleEyebrow: "Built for meat bird operations",
    moduleTitle: "Broiler Farmer Module",
    moduleSummary:
      "This module is built for broiler businesses that need tight control over batch turnover, feed efficiency, farm records, purchases, party balances, inventory, and bird sales in one place.",
    useCases: [
      "Broiler batch tracking from placement to sale",
      "Mortality, FCR, and operating cost monitoring for broiler farms in Nepal",
      "Sales, purchase, and party balance management in one broiler software",
      "Inventory and supplier coordination without manual record mismatch",
    ],
    outcomes: [
      "Clearer control over each broiler batch cycle",
      "Faster identification of mortality and feed efficiency problems",
      "Better visibility into sales balance and operating costs",
      "Stronger daily coordination between farm, stock, and purchase records",
    ],
    whyTitle: "Designed for the speed and pressure of broiler farming",
    whyDescription:
      "Broiler operations move quickly. Small delays in tracking cost, mortality, feed efficiency, or customer balance can distort profit. Poultry360 keeps the full broiler cycle visible so managers can act faster with cleaner data.",
    valueProps: [
      {
        title: "Batch-first tracking",
        description:
          "Review every broiler flock by batch so placement, mortality, sales timing, and performance stay tied to the same record set.",
      },
      {
        title: "Profit-focused visibility",
        description:
          "See where cost is rising through feed, medicine, labor, and purchases before the batch closes and margins are already lost.",
      },
      {
        title: "Sales and balance control",
        description:
          "Track customer invoices and outstanding balances so broiler sales do not create avoidable cash flow pressure.",
      },
      {
        title: "Operational discipline",
        description:
          "Keep farm activity, inventory, supplier follow-up, and salary records organized so daily execution becomes more reliable.",
      },
    ],
    faqs: [
      {
        question: "Who should use this broiler farm software?",
        answer:
          "It is built for broiler farmers, farm supervisors, poultry business owners, and teams in Nepal that need one place for batch, mortality, cost, sales, and inventory tracking.",
      },
      {
        question: "Does Poultry360 help with FCR tracking for broiler farms?",
        answer:
          "Yes. The broiler module includes FCR evaluation so farms can review feed efficiency and compare batch performance more clearly.",
      },
      {
        question: "Can it manage sales and pending balances from buyers?",
        answer:
          "Yes. Poultry360 tracks sales entries and balance management so you can monitor what has been sold, what has been paid, and what is still due.",
      },
      {
        question: "Is this useful for farms still using notebooks or Excel?",
        answer:
          "Yes. It centralizes batch, expense, inventory, and party records into one system, reducing duplication and manual reporting errors.",
      },
      {
        question: "Why is software important for broiler farming in Nepal?",
        answer:
          "Because broiler cycles are short and cost-sensitive. A system that tracks mortality, feed conversion, purchases, and sales in one place helps protect margins and improve decisions.",
      },
    ],
    ctaHeading:
      "Bring every broiler batch, sale, and farm cost into one working system",
    ctaDescription:
      "For broiler farms in Nepal, Poultry360 gives a structured way to manage fast cycle operations without losing visibility across costs, stock, and customer payments.",
    accent: {
      border: "border-orange-200",
      chipBg: "bg-orange-50",
      chipBorder: "border-orange-200",
      chipText: "text-orange-700",
      iconBg: "bg-orange-100",
      iconText: "text-orange-700",
    },
    features: [
      {
        title: "Farm management",
        description: sharedFarmerFeatureDescriptions.farmManagement,
        icon: Bird,
      },
      {
        title: "Batch management",
        description:
          "Track every broiler batch from placement to sale with age, flock cycle, and performance history tied to the same record.",
        icon: ClipboardList,
      },
      {
        title: "Expenses management",
        description: sharedFarmerFeatureDescriptions.expensesManagement,
        icon: Coins,
      },
      {
        title: "Mortality management",
        description: sharedFarmerFeatureDescriptions.mortalityManagement,
        icon: Activity,
      },
      {
        title: "Sales management",
        description:
          "Record bird sales, customer billing, dispatch details, and pricing changes without depending on manual sheets.",
        icon: TrendingUp,
      },
      {
        title: "Sales balance management",
        description: sharedFarmerFeatureDescriptions.salesBalanceManagement,
        icon: Receipt,
      },
      {
        title: "Parties management",
        description: sharedFarmerFeatureDescriptions.partiesManagement,
        icon: Users,
      },
      {
        title: "Inventory management",
        description: sharedFarmerFeatureDescriptions.inventoryManagement,
        icon: Package,
      },
      {
        title: "Purchase management",
        description: sharedFarmerFeatureDescriptions.purchaseManagement,
        icon: ShoppingCart,
      },
      {
        title: "Feed Supplier management",
        description: sharedFarmerFeatureDescriptions.feedSupplierManagement,
        icon: Wheat,
      },
      {
        title: "Connection supplier features",
        description: sharedFarmerFeatureDescriptions.connectionSupplierFeatures,
        icon: Handshake,
      },
      {
        title: "List for sale your products",
        description:
          "List available birds or related products for sale so buyers can discover stock faster and your team can move inventory efficiently.",
        icon: CheckCircle2,
      },
      {
        title: "Staff salary management",
        description: sharedFarmerFeatureDescriptions.staffSalaryManagement,
        icon: Users,
      },
      {
        title: "FCR evaluation",
        description:
          "Evaluate feed conversion by batch so broiler farms can compare flock performance and spot efficiency issues earlier.",
        icon: BarChart3,
      },
    ],
  },
  dealer: {
    slug: "feed-dealer-software",
    metaTitle:
      "Feed Dealer Software for Nepal | Inventory and Farmer Network | Poultry360",
    metaDescription:
      "Feed dealer software for Nepal to manage company purchases, balances, payments, inventory, sales, farmer records, staff salary, and dealer-farmer connections.",
    openGraphTitle: "Feed Dealer Software for Nepal | Poultry360",
    openGraphDescription:
      "Manage inventory, company balances, sales, farmer records, and payments with Poultry360 feed dealer software.",
    schemaName: "Poultry360 Feed Dealer Software",
    schemaSubCategory: "Feed Dealer Management Software",
    heroBadge: "Feed Dealer Software for Nepal",
    heroTitle:
      "Control feed inventory, farmer relationships, and company balances from one dealer system",
    heroDescription:
      "Poultry360 is built for feed dealers in Nepal who need tighter control over inventory, company purchases, sales, farmer accounts, payment follow-up, and staff operations. It keeps distribution records structured so your business can scale with less confusion.",
    moduleEyebrow: "Built for feed distribution businesses",
    moduleTitle: "Feed Dealer Module",
    moduleSummary:
      "This module helps feed dealers manage supply from company purchase to farmer sale, while also keeping balances, payments, staff salary, and business relationships visible in one dashboard.",
    useCases: [
      "Dealer inventory and stock movement tracking",
      "Company purchase, balance, and payment records in one system",
      "Farmer account management for repeat poultry customers in Nepal",
      "Sales follow-up and dealer-farmer connection history without ledger confusion",
    ],
    outcomes: [
      "Clear visibility into current stock and sales movement",
      "Better company balance and payment control",
      "Stronger farmer relationship tracking and service follow-up",
      "Cleaner staff and business records across the dealership",
    ],
    whyTitle: "Feed dealership software that matches real field operations",
    whyDescription:
      "Feed dealers manage both sides of the business: upstream company relationships and downstream farmer service. Poultry360 connects those records in one place so stock, sales, balances, and farmer follow-up do not drift apart.",
    valueProps: [
      {
        title: "Inventory discipline",
        description:
          "Know what came in, what went out, and what is left in stock before shortages or over-ordering affect dealer operations.",
      },
      {
        title: "Company account control",
        description:
          "Track purchases, balances, and company payments clearly so supplier relationships stay organized and easier to reconcile.",
      },
      {
        title: "Farmer network visibility",
        description:
          "Maintain farmer records and connection history so repeat customers, credit behavior, and service follow-up are easier to manage.",
      },
      {
        title: "Sales process clarity",
        description:
          "Bring dealer sales, staff salary, and account movement into one workflow instead of splitting them across multiple manual records.",
      },
    ],
    faqs: [
      {
        question: "Who should use this feed dealer software?",
        answer:
          "It is built for poultry feed dealers, feed distributors, and dealer teams in Nepal that need better control over inventory, company balances, farmer accounts, and sales records.",
      },
      {
        question: "Can Poultry360 manage both company-side and farmer-side records?",
        answer:
          "Yes. The dealer module tracks company purchases, balances, and payments while also managing farmer records, sales, and connection history.",
      },
      {
        question: "Does it help with stock and inventory management?",
        answer:
          "Yes. Poultry360 lets dealers track inventory movement so stock levels stay visible and ordering decisions are based on actual data.",
      },
      {
        question: "Is it useful for dealers handling credit and follow-up?",
        answer:
          "Yes. The software helps organize farmer relationships, payment records, and balance follow-up so dealer operations remain more structured.",
      },
      {
        question: "Why is software helpful for poultry feed dealers in Nepal?",
        answer:
          "Because dealership businesses depend on clean stock records, timely payment reconciliation, and strong farmer relationships. Software reduces ledger confusion and improves service consistency.",
      },
    ],
    ctaHeading:
      "Build a cleaner system for dealership inventory, payments, and farmer service",
    ctaDescription:
      "If your feed dealership is growing, Poultry360 helps centralize company accounts, inventory movement, and farmer records before manual processes slow everything down.",
    accent: {
      border: "border-blue-200",
      chipBg: "bg-blue-50",
      chipBorder: "border-blue-200",
      chipText: "text-blue-700",
      iconBg: "bg-blue-100",
      iconText: "text-blue-700",
    },
    features: [
      {
        title: "Company Purchase management",
        description:
          "Track feed or product purchases from the parent company with quantity, pricing, and incoming stock details in one place.",
        icon: ShoppingCart,
      },
      {
        title: "Company Balance management",
        description:
          "Monitor how much balance is outstanding with the supplying company so dealer cash flow decisions stay clearer.",
        icon: Receipt,
      },
      {
        title: "Company Payment management",
        description:
          "Record payments made to the company and reconcile purchase obligations without depending on manual ledger matching.",
        icon: Coins,
      },
      {
        title: "Inventory management",
        description:
          "Keep stock levels, movement, and available product visibility updated so dealer operations do not run blind on inventory.",
        icon: Package,
      },
      {
        title: "Sales management",
        description:
          "Manage dealer sales entries, farmer billing, delivery activity, and product movement from one dashboard.",
        icon: TrendingUp,
      },
      {
        title: "Farmer management",
        description:
          "Maintain farmer profiles, buying history, contact details, and account relationships to support repeat business.",
        icon: Users,
      },
      {
        title: "Staff salary management",
        description:
          "Track staff salary records and payment status so dealership labor management stays organized.",
        icon: Users,
      },
      {
        title: "Connection with farmer",
        description:
          "Keep dealer-farmer connection history visible so communication, support, and customer follow-up remain easier to manage.",
        icon: Handshake,
      },
    ],
  },
  hatchery: {
    slug: "hatchery-software",
    metaTitle:
      "Hatchery Software for Nepal | Incubation and Chick Tracking | Poultry360",
    metaDescription:
      "Hatchery software for Nepal to manage parent flock batches, egg inventory, incubation lifecycle, hatch result, chick grading, party ledgers, and chick sales.",
    openGraphTitle: "Hatchery Software for Nepal | Poultry360",
    openGraphDescription:
      "Manage parent flock records, incubation workflow, chick grading, stock, and sales with Poultry360 hatchery software.",
    schemaName: "Poultry360 Hatchery Software",
    schemaSubCategory: "Hatchery Management Software",
    heroBadge: "Hatchery Software for Nepal",
    heroTitle:
      "Track parent flock eggs, incubation, hatch result, and chick sales in one hatchery system",
    heroDescription:
      "Poultry360 gives hatchery businesses in Nepal a clearer way to manage parent flock batches, egg inventory, incubation stages, hatch performance, chick grading, party balances, and delivery records. It turns the full hatchery lifecycle into an organized digital workflow.",
    moduleEyebrow: "Built for hatchery operations",
    moduleTitle: "Hatchery Module",
    moduleSummary:
      "This module is designed for hatcheries that need one system for parent flock records, egg production, setter and hatcher workflow, hatch result analysis, chick stock visibility, and sales management.",
    useCases: [
      "Parent flock and batch-wise egg production tracking",
      "Incubation workflow management from setter to hatcher",
      "Hatch result, chick grading, and produced stock visibility",
      "Party ledger, payment, and chick sales management for Nepal hatcheries",
    ],
    outcomes: [
      "More reliable incubation and hatch lifecycle records",
      "Stronger visibility into egg inventory and chick stock",
      "Cleaner party, sales, and payment management",
      "Better review of hatch result and grade performance",
    ],
    whyTitle: "Hatchery operations need lifecycle tracking, not just stock records",
    whyDescription:
      "Hatcheries manage a chain of events, not a single transaction. Parent flock batches, egg inventory, incubation stages, hatch result, chick grading, and sales all affect outcome. Poultry360 keeps that lifecycle connected in one system.",
    valueProps: [
      {
        title: "Lifecycle visibility",
        description:
          "Track the path from parent flock and egg production to incubation, hatching, chick grading, and stock without breaking the data chain.",
      },
      {
        title: "Egg and chick accountability",
        description:
          "Know what is in egg inventory, what is in incubation, and what chicks were produced so operational review stays grounded in actual numbers.",
      },
      {
        title: "Sales and party control",
        description:
          "Manage party ledgers, payments, and chick sales in the same system used for hatch records, reducing reconciliation confusion.",
      },
      {
        title: "Performance insight",
        description:
          "Review hatch result and grade distribution clearly so management can identify quality issues and improve future cycles.",
      },
    ],
    faqs: [
      {
        question: "Who is this hatchery software for?",
        answer:
          "It is built for hatchery owners, hatchery managers, and poultry businesses in Nepal that need one system for incubation records, chick stock, party ledgers, and hatch result tracking.",
      },
      {
        question: "Can Poultry360 manage the full incubation lifecycle?",
        answer:
          "Yes. The hatchery module is designed to track stages such as setter, candling, hatcher, and resulting chick output in one connected workflow.",
      },
      {
        question: "Does it help with chick sales and payment management?",
        answer:
          "Yes. Poultry360 tracks chick sales, party ledgers, and payment activity so hatchery business operations stay connected to production records.",
      },
      {
        question: "Can I track parent flock batches and egg inventory?",
        answer:
          "Yes. The module includes parent flock batch management, egg production tracking, and batch-wise egg inventory visibility.",
      },
      {
        question: "Why is hatchery software important for poultry businesses in Nepal?",
        answer:
          "Because hatcheries manage multiple linked stages where missing records can hide losses or quality issues. Software creates a clearer operational chain from egg to chick sale.",
      },
    ],
    ctaHeading:
      "Connect incubation workflow, hatch output, and chick sales in one hatchery platform",
    ctaDescription:
      "For hatcheries in Nepal, Poultry360 helps turn complex lifecycle tracking into a cleaner operating system with stronger visibility from parent flock to delivered chicks.",
    accent: {
      border: "border-rose-200",
      chipBg: "bg-rose-50",
      chipBorder: "border-rose-200",
      chipText: "text-rose-700",
      iconBg: "bg-rose-100",
      iconText: "text-rose-700",
    },
    features: [
      {
        title: "Supplier ledger management",
        description:
          "Track supplier account activity and ledger balance so procurement and partner relationships stay transparent.",
        icon: Users,
      },
      {
        title: "Inventory management",
        description:
          "Monitor hatchery inventory, operational materials, and available stock so supply gaps do not disrupt workflow.",
        icon: Package,
      },
      {
        title: "Parent flock batch management",
        description:
          "Maintain parent flock batch records with structured history so egg production and hatch performance can be reviewed accurately.",
        icon: Bird,
      },
      {
        title: "Egg production tracking by type",
        description:
          "Record egg production by type or category to improve inventory review and planning before incubation.",
        icon: Egg,
      },
      {
        title: "Batch-wise egg inventory",
        description:
          "Track egg inventory by batch so available stock, usage, and incubation flow remain easier to manage.",
        icon: ClipboardList,
      },
      {
        title: "Incubation lifecycle (setter/candling/hatcher)",
        description:
          "Follow each incubation stage in sequence so hatchery teams know where eggs are in the process and where issues may be occurring.",
        icon: Layers,
      },
      {
        title: "Hatch result and chick grade tracking",
        description:
          "Review hatch performance and chick grading outcomes clearly so quality and productivity trends are easier to identify.",
        icon: BarChart3,
      },
      {
        title: "Chick sales management",
        description:
          "Manage chick sales, customer records, dispatch activity, and sales follow-up in one hatchery workflow.",
        icon: TrendingUp,
      },
      {
        title: "Party ledger and payments",
        description:
          "Track customer or partner ledger activity and payments so hatchery business records stay easier to reconcile.",
        icon: Receipt,
      },
      {
        title: "Produced chicks stock view",
        description:
          "Keep a clear view of produced chick stock so delivery planning and inventory decisions can happen with confidence.",
        icon: ShoppingBag,
      },
    ],
  },
};

