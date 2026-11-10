import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  CalendarCheck,
  Camera,
  KeyRound,
  Languages,
  Scale,
  Share2,
  Thermometer,
  Undo2,
  Wallet,
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
  /** Which group the card is shown in (see `featureGroups`). */
  group: string;
};

type ModuleFaq = {
  question: string;
  answer: string;
};

type ModuleValueProp = {
  title: string;
  description: string;
};

export type ModulePageContent = {
  slug: string;
  signupHref: string;
  metaTitle: string;
  metaDescription: string;
  openGraphTitle: string;
  openGraphDescription: string;
  schemaName: string;
  schemaSubCategory: string;
  heroBadge: string;
  heroTitle: string;
  heroDescription: string;
  wistiaMediaId?: string;
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
  /** Order of the feature groups on the page. */
  featureGroups: string[];
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
    "Manage sales entries, customer billing, shareable bills, and changing rates from one reliable operating system.",
  salesBalanceManagement:
    "See which buyers still owe payment, how much balance is pending, and where collection follow-up is needed.",
  partiesManagement:
    "Maintain supplier, customer, and business party ledgers in one place so payment history and transaction records remain easy to audit.",
  inventoryManagement:
    "Monitor stock for feed, chicks, medicines, vaccines, and farm supplies so shortages do not interrupt routine operations.",
  purchaseManagement:
    "Track purchases by vendor, quantity, price, and due amount so procurement stays transparent and easier to control.",
  feedSupplierManagement:
    "Manage feed supplier relationships, purchases, payments, and supply history clearly across batches and farm cycles.",
  listForSale:
    "List eggs, birds, or other available products for sale so interested buyers can respond faster through your network and marketplace presence.",
  staffSalaryManagement:
    "Track staff roles, salary entries, and payment status so labor costs stay organized and easier to reconcile.",
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
    signupHref: "/auth/signup",
    metaTitle:
      "Layer Farm Software for Nepal | Egg Production Management | Poultry360",
    metaDescription:
      "Layer farm software for Nepal to manage egg production, batch records, mortality, expenses, inventory, sales, supplier ledgers, and egg cost in one poultry management system.",
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
    wistiaMediaId: "0tgwy6qx60",
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
          "Use batch records, egg percentage, and egg cost per egg to review which flock is performing and where corrective action is needed.",
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
    featureGroups: ["Hens and eggs", "Money", "Buying and stock", "Team and tools"],
    features: [
      {
        title: "Farm management",
        group: "Buying and stock",
        description: sharedFarmerFeatureDescriptions.farmManagement,
        icon: Egg,
      },
      {
        title: "Batch management",
        group: "Hens and eggs",
        description:
          "Track every flock batch from chick placement to laying cycle with batch-wise age, production stage, and performance history.",
        icon: ClipboardList,
      },
      {
        title: "Expenses management",
        group: "Money",
        description: sharedFarmerFeatureDescriptions.expensesManagement,
        icon: Coins,
      },
      {
        title: "Mortality management",
        group: "Hens and eggs",
        description: sharedFarmerFeatureDescriptions.mortalityManagement,
        icon: Activity,
      },
      {
        title: "Sales management",
        group: "Money",
        description:
          "Handle egg sales by type, customer billing, rate changes, and buyer payments without relying on scattered notebooks or spreadsheets.",
        icon: TrendingUp,
      },
      {
        title: "Sales balance management",
        group: "Money",
        description: sharedFarmerFeatureDescriptions.salesBalanceManagement,
        icon: Receipt,
      },
      {
        title: "Parties management",
        group: "Money",
        description: sharedFarmerFeatureDescriptions.partiesManagement,
        icon: Users,
      },
      {
        title: "Inventory management",
        group: "Buying and stock",
        description:
          "Monitor stock for feed, chicks, medicine, vaccines, and eggs to avoid costly shortages during peak production.",
        icon: Package,
      },
      {
        title: "Purchase management",
        group: "Buying and stock",
        description: sharedFarmerFeatureDescriptions.purchaseManagement,
        icon: ShoppingCart,
      },
      {
        title: "Feed Supplier management",
        group: "Buying and stock",
        description: sharedFarmerFeatureDescriptions.feedSupplierManagement,
        icon: Wheat,
      },
      {
        title: "List for sale your products",
        group: "Team and tools",
        description: sharedFarmerFeatureDescriptions.listForSale,
        icon: CheckCircle2,
      },
      {
        title: "Staff salary management",
        group: "Team and tools",
        description: sharedFarmerFeatureDescriptions.staffSalaryManagement,
        icon: Users,
      },
      {
        title: "Egg production tracking by type",
        group: "Hens and eggs",
        description:
          "Record production by egg category or type to understand output mix, sales potential, and layer performance more clearly.",
        icon: Egg,
      },
      {
        title: "Egg % tracking",
        group: "Hens and eggs",
        description:
          "Follow daily egg production percentage against flock size so you can spot performance drops early and act before losses compound.",
        icon: TrendingUp,
      },
      {
        title: "Egg stock",
        group: "Hens and eggs",
        description:
          "See how many eggs of each type are in stock for every layer batch. Eggs you record go up, and eggs you sell go down by themselves.",
        icon: Package,
      },
      {
        title: "Egg cost per egg and per carat",
        group: "Money",
        description:
          "Know what one egg and one carat really cost you, your sale price, and your margin, so you can price eggs with confidence.",
        icon: Coins,
      },
      {
        title: "Profit per batch and hen payback",
        group: "Money",
        description:
          "See the profit and loss of each layer batch, and how egg sales pay back the cost of raising the hens.",
        icon: TrendingUp,
      },
      {
        title: "Sell old hens",
        group: "Money",
        description:
          "Sell hens that stopped laying, and add that money to the batch profit before you close the batch.",
        icon: Bird,
      },
      {
        title: "Make your own feed",
        group: "Buying and stock",
        description:
          "Record feed you make from maize, soybean, and premix, and know its real cost per kilo.",
        icon: Wheat,
      },
      {
        title: "Staff login and activity log",
        group: "Team and tools",
        description:
          "Give workers their own login with only the access they need, and see who did what, and when, in the activity log.",
        icon: KeyRound,
      },
      {
        title: "Cash in hand",
        group: "Team and tools",
        description:
          "Keep a daily cash book for the farm: cash in, cash out, and the cash you should have now. Close each day when the count matches.",
        icon: Wallet,
      },
      {
        title: "Reminders and batch notes",
        group: "Team and tools",
        description:
          "Set reminders for vaccines, payments, and other work, and keep batch notes that show who wrote each one.",
        icon: Bell,
      },
      {
        title: "Share a health report with your vet",
        group: "Team and tools",
        description:
          "Send a live batch health report to your veterinary doctor on WhatsApp. It shows deaths, weight, feed, and medicine, but no money.",
        icon: Share2,
      },
      {
        title: "Analytics and downloads",
        group: "Team and tools",
        description:
          "See sales, costs, profit, and batch results over time, and download statements and reports to share or print.",
        icon: BarChart3,
      },
      {
        title: "Nepali date and Nepali language",
        group: "Team and tools",
        description:
          "Use the app in Nepali or English, with Nepali (BS) dates on records and reports.",
        icon: Languages,
      },
    ],
  },
  broiler: {
    slug: "broiler-farm-software",
    signupHref: "/auth/signup",
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
    wistiaMediaId: "mav2cdjek1",
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
    featureGroups: ["Birds and growth", "Money", "Buying and stock", "Team and tools"],
    features: [
      {
        title: "Farm management",
        group: "Buying and stock",
        description: sharedFarmerFeatureDescriptions.farmManagement,
        icon: Bird,
      },
      {
        title: "Batch management",
        group: "Birds and growth",
        description:
          "Track every broiler batch from placement to sale with age, flock cycle, and performance history tied to the same record.",
        icon: ClipboardList,
      },
      {
        title: "Expenses management",
        group: "Money",
        description: sharedFarmerFeatureDescriptions.expensesManagement,
        icon: Coins,
      },
      {
        title: "Mortality management",
        group: "Birds and growth",
        description: sharedFarmerFeatureDescriptions.mortalityManagement,
        icon: Activity,
      },
      {
        title: "Sales management",
        group: "Money",
        description:
          "Record bird sales by weight, customer billing, weight discount, and pricing changes without depending on manual sheets.",
        icon: TrendingUp,
      },
      {
        title: "Sales balance management",
        group: "Money",
        description: sharedFarmerFeatureDescriptions.salesBalanceManagement,
        icon: Receipt,
      },
      {
        title: "Parties management",
        group: "Money",
        description: sharedFarmerFeatureDescriptions.partiesManagement,
        icon: Users,
      },
      {
        title: "Inventory management",
        group: "Buying and stock",
        description: sharedFarmerFeatureDescriptions.inventoryManagement,
        icon: Package,
      },
      {
        title: "Purchase management",
        group: "Buying and stock",
        description: sharedFarmerFeatureDescriptions.purchaseManagement,
        icon: ShoppingCart,
      },
      {
        title: "Feed Supplier management",
        group: "Buying and stock",
        description: sharedFarmerFeatureDescriptions.feedSupplierManagement,
        icon: Wheat,
      },
      {
        title: "List for sale your products",
        group: "Team and tools",
        description:
          "List available birds or related products for sale so buyers can discover stock faster and your team can move inventory efficiently.",
        icon: CheckCircle2,
      },
      {
        title: "Staff salary management",
        group: "Team and tools",
        description: sharedFarmerFeatureDescriptions.staffSalaryManagement,
        icon: Users,
      },
      {
        title: "FCR evaluation",
        group: "Birds and growth",
        description:
          "Evaluate feed conversion by batch so broiler farms can compare flock performance and spot efficiency issues earlier.",
        icon: BarChart3,
      },
      {
        title: "Weight and corrected FCR (cFCR)",
        group: "Birds and growth",
        description:
          "Record bird weight every week, and compare batches fairly with FCR corrected to one target weight.",
        icon: Scale,
      },
      {
        title: "Share a health report with your vet",
        group: "Birds and growth",
        description:
          "Send a live batch health report to your veterinary doctor on WhatsApp. It shows deaths, weight, feed, and medicine, but no money.",
        icon: Share2,
      },
      {
        title: "Profit per batch",
        group: "Money",
        description:
          "See money from sales, all costs, and the profit of each batch, with cost per bird and per kilo.",
        icon: TrendingUp,
      },
      {
        title: "Make your own feed",
        group: "Buying and stock",
        description:
          "Record feed you make from maize, soybean, and premix, and know its real cost per kilo.",
        icon: Wheat,
      },
      {
        title: "Staff login and activity log",
        group: "Team and tools",
        description:
          "Give workers their own login with only the access they need, and see who did what, and when, in the activity log.",
        icon: KeyRound,
      },
      {
        title: "Cash in hand",
        group: "Team and tools",
        description:
          "Keep a daily cash book for the farm: cash in, cash out, and the cash you should have now. Close each day when the count matches.",
        icon: Wallet,
      },
      {
        title: "Reminders and batch notes",
        group: "Team and tools",
        description:
          "Set reminders for vaccines, payments, and other work, and keep batch notes that show who wrote each one.",
        icon: Bell,
      },
      {
        title: "Analytics and downloads",
        group: "Team and tools",
        description:
          "See sales, costs, profit, and batch results over time, and download statements and reports to share or print.",
        icon: BarChart3,
      },
      {
        title: "Nepali date and Nepali language",
        group: "Team and tools",
        description:
          "Use the app in Nepali or English, with Nepali (BS) dates on records and reports.",
        icon: Languages,
      },
    ],
  },
  dealer: {
    slug: "feed-dealer-software",
    signupHref: "/auth/signup/dealer",
    metaTitle:
      "Feed Dealer Software for Nepal | Inventory and Farmer Network | Poultry360",
    metaDescription:
      "Feed dealer software for Nepal to manage company purchases, balances, payments, inventory, sales, farmer records, staff salary, and payment reminders.",
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
    wistiaMediaId: "p7h6y74gsz",
    moduleEyebrow: "Built for feed distribution businesses",
    moduleTitle: "Feed Dealer Module",
    moduleSummary:
      "This module helps feed dealers manage supply from company purchase to farmer sale, while also keeping balances, payments, staff salary, and business relationships visible in one dashboard.",
    useCases: [
      "Dealer inventory and stock movement tracking",
      "Company purchase, balance, and payment records in one system",
      "Farmer account management for repeat poultry customers in Nepal",
      "Sales follow-up and customer payment history without ledger confusion",
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
          "Maintain farmer records, credit, and payment history so repeat customers, credit behavior, and service follow-up are easier to manage.",
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
          "Yes. The dealer module tracks company purchases, balances, and payments while also managing farmer records, sales, and payment history.",
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
    featureGroups: ["Companies", "Stock and sales", "Customers", "Team and tools"],
    features: [
      {
        title: "Company Purchase management",
        group: "Companies",
        description:
          "Track feed or product purchases from the parent company with quantity, pricing, and incoming stock details in one place.",
        icon: ShoppingCart,
      },
      {
        title: "Company Balance management",
        group: "Companies",
        description:
          "Monitor how much balance is outstanding with the supplying company so dealer cash flow decisions stay clearer.",
        icon: Receipt,
      },
      {
        title: "Company Payment management",
        group: "Companies",
        description:
          "Record payments made to the company and reconcile purchase obligations without depending on manual ledger matching.",
        icon: Coins,
      },
      {
        title: "Inventory management",
        group: "Stock and sales",
        description:
          "Keep stock levels, movement, and available product visibility updated so dealer operations do not run blind on inventory.",
        icon: Package,
      },
      {
        title: "Sales management",
        group: "Stock and sales",
        description:
          "Manage dealer sales entries, farmer billing, bills shared on WhatsApp, and product movement from one dashboard.",
        icon: TrendingUp,
      },
      {
        title: "Farmer management",
        group: "Customers",
        description:
          "Maintain farmer profiles, buying history, contact details, and account relationships to support repeat business.",
        icon: Users,
      },
      {
        title: "Staff salary management",
        group: "Team and tools",
        description:
          "Track staff salary records and payment status so dealership labor management stays organized.",
        icon: Users,
      },
      {
        title: "Sell stock back to a company",
        group: "Companies",
        description:
          "Give stock back to a company and lower what you owe them, with the company account updated at once.",
        icon: Undo2,
      },
      {
        title: "Purchase bill photos",
        group: "Companies",
        description:
          "Save a photo of every purchase bill and payment receipt with the record, so nothing is lost.",
        icon: Camera,
      },
      {
        title: "Share bills on WhatsApp",
        group: "Stock and sales",
        description:
          "Print a sale bill or share it with your customer on WhatsApp right after the sale.",
        icon: Share2,
      },
      {
        title: "Payment reminders",
        group: "Customers",
        description:
          "Set reminders to collect money from customers and to pay companies on time.",
        icon: Bell,
      },
      {
        title: "Broiler sales and settlement",
        group: "Customers",
        description:
          "Sell a farmer's broilers to buyers, keep your margin, and settle the farmer's feed credit in one place.",
        icon: Handshake,
      },
      {
        title: "Staff login and activity log",
        group: "Team and tools",
        description:
          "Give staff their own login with only the access they need, and see who did what, and when.",
        icon: KeyRound,
      },
      {
        title: "Cash in hand",
        group: "Team and tools",
        description:
          "Keep a daily cash book for the shop: cash in, cash out, and the cash you should have now.",
        icon: Wallet,
      },
      {
        title: "Analytics and downloads",
        group: "Team and tools",
        description:
          "See sales, profit, and money owed over time, and download statements and reports.",
        icon: BarChart3,
      },
      {
        title: "Nepali date and Nepali language",
        group: "Team and tools",
        description:
          "Use the app in Nepali or English, with Nepali (BS) dates on records and reports.",
        icon: Languages,
      },
    ],
  },
  hatchery: {
    slug: "hatchery-software",
    signupHref: "/auth/signup/hatchery",
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
      "Poultry360 gives hatchery businesses in Nepal a clearer way to manage parent flock batches, egg inventory, incubation stages, hatch performance, chick grading, party balances, and sales records. It turns the full hatchery lifecycle into an organized digital workflow.",
    wistiaMediaId: "e36j6s9t1k",
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
      "For hatcheries in Nepal, Poultry360 helps turn complex lifecycle tracking into a cleaner operating system with stronger visibility from parent flock to sold chicks.",
    featureGroups: ["Parent flock and eggs", "Incubation", "Sales and money", "Team and tools"],
    features: [
      {
        title: "Supplier ledger management",
        group: "Sales and money",
        description:
          "Track supplier account activity and ledger balance so procurement and partner relationships stay transparent.",
        icon: Users,
      },
      {
        title: "Inventory management",
        group: "Sales and money",
        description:
          "Monitor hatchery inventory, operational materials, and available stock so supply gaps do not disrupt workflow.",
        icon: Package,
      },
      {
        title: "Parent flock batch management",
        group: "Parent flock and eggs",
        description:
          "Maintain parent flock batch records with structured history so egg production and hatch performance can be reviewed accurately.",
        icon: Bird,
      },
      {
        title: "Egg production tracking by type",
        group: "Parent flock and eggs",
        description:
          "Record egg production by type or category to improve inventory review and planning before incubation.",
        icon: Egg,
      },
      {
        title: "Batch-wise egg inventory",
        group: "Parent flock and eggs",
        description:
          "Track egg inventory by batch so available stock, usage, and incubation flow remain easier to manage.",
        icon: ClipboardList,
      },
      {
        title: "Incubation lifecycle (setter/candling/hatcher)",
        group: "Incubation",
        description:
          "Follow each incubation stage in sequence so hatchery teams know where eggs are in the process and where issues may be occurring.",
        icon: Layers,
      },
      {
        title: "Hatch result and chick grade tracking",
        group: "Incubation",
        description:
          "Review hatch performance and chick grading outcomes clearly so quality and productivity trends are easier to identify.",
        icon: BarChart3,
      },
      {
        title: "Chick sales management",
        group: "Sales and money",
        description:
          "Manage chick sales, customer records, shareable bills, and sales follow-up in one hatchery workflow.",
        icon: TrendingUp,
      },
      {
        title: "Party ledger and payments",
        group: "Sales and money",
        description:
          "Track customer or partner ledger activity and payments so hatchery business records stay easier to reconcile.",
        icon: Receipt,
      },
      {
        title: "Produced chicks stock view",
        group: "Incubation",
        description:
          "Keep a clear view of produced chick stock so sales planning and inventory decisions can happen with confidence.",
        icon: ShoppingBag,
      },
      {
        title: "Your own egg types",
        group: "Parent flock and eggs",
        description:
          "Use hatchable, table, and cracked eggs, and add your own egg types for your business.",
        icon: Egg,
      },
      {
        title: "Candling and move to hatcher",
        group: "Incubation",
        description:
          "Record candling on day 9 and moving eggs to the hatcher on day 18, with infertile and dead eggs taken out.",
        icon: Thermometer,
      },
      {
        title: "Today's work",
        group: "Incubation",
        description:
          "See which incubations need candling, moving, or hatching today, right on the home page.",
        icon: CalendarCheck,
      },
      {
        title: "Sell eggs and parent birds",
        group: "Sales and money",
        description:
          "Sell table and cracked eggs, and old parent birds, with the money added to the right party account.",
        icon: ShoppingCart,
      },
      {
        title: "Staff login and activity log",
        group: "Team and tools",
        description:
          "Give staff their own login with only the access they need, and see who did what, and when.",
        icon: KeyRound,
      },
      {
        title: "Reminders and notes",
        group: "Team and tools",
        description:
          "Set reminders so no stage is missed, and keep batch and incubation notes that show who wrote each one.",
        icon: Bell,
      },
      {
        title: "Analytics and downloads",
        group: "Team and tools",
        description:
          "See hatch percent, sales, and profit over time, and download party statements.",
        icon: BarChart3,
      },
    ],
  },
};
