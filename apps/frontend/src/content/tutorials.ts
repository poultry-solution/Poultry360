// Tutorial videos shown on the Tutorials page of each module.
// Wistia ids live in tutorialVideoIds.json (key = "<folder>/<file>"), filled by the upload script.
import videoIds from "./tutorialVideoIds.json";

export type Tutorial = {
  /** "<folder>/<file>", the same as the video file name. */
  key: string;
  title: string;
  description: string;
  /** Length shown on the card, e.g. "1:28". */
  length: string;
};

export type TutorialSection = {
  id: string;
  title: string;
  description?: string;
  videos: Tutorial[];
};

export function wistiaIdFor(key: string): string | undefined {
  return (videoIds as Record<string, string>)[key] || undefined;
}

const v = (folder: string, file: string, title: string, description: string, length: string): Tutorial => ({
  key: `${folder}/${file}`,
  title,
  description,
  length,
});

const dealer: TutorialSection[] = [
  {
    id: "dealer",
    title: "Feed dealer",
    description: "Short videos, step by step. Start with the quick tour.",
    videos: [
      v("dealer", "00-quick-tour-first-sale", "Quick tour: your first sale", "From sign up to your first sale and payment, in 3 minutes.", "2:43"),
      v("dealer", "01-sign-up-and-get-approved", "Sign up and get approved", "Make your account and wait for approval.", "1:03"),
      v("dealer", "02-home-page-tour", "Home page", "What the cards, chart and reminders on your home page mean.", "0:56"),
      v("dealer", "03-companies-add-company-and-buy-feed", "Add a company and buy feed", "Add the company you buy from, record a purchase and save the bill photo.", "1:49"),
      v("dealer", "04-companies-pay-and-see-account", "Pay a company and see the account", "Record a payment and read the company account.", "1:10"),
      v("dealer", "05-inventory-stock-and-prices", "Inventory: stock and prices", "See your stock, change selling prices, and reorder.", "1:06"),
      v("dealer", "06-customers-add-customer-and-opening-balance", "Add a customer", "Add a customer and money they already owed you.", "1:07"),
      v("dealer", "07-customers-take-payment-and-see-account", "Take a payment from a customer", "Record a payment with a receipt photo, and read the customer account.", "1:05"),
      v("dealer", "08-sales-make-a-sale-and-share-bill", "Make a sale and share the bill", "Two products, a discount, part paid, and the bill.", "1:12"),
      v("dealer", "09-broiler-sales-and-settlement", "Broiler sales and settlement", "Sell a farmer's broilers, keep your margin, and settle with the farmer.", "2:39"),
      v("dealer", "10-sell-to-company", "Sell stock to a company", "Give stock back to a company to lower what you owe.", "1:26"),
      v("dealer", "11-payment-reminders", "Payment reminders", "Set reminders to collect or pay money on time.", "1:08"),
      v("dealer", "12-cash-in-hand", "Cash in hand", "Keep track of the cash in your shop drawer.", "1:13"),
      v("dealer", "13-staff-payroll-and-staff-login", "Staff salary and staff login", "Keep staff salary, and give staff their own login.", "1:46"),
      v("dealer", "14-analytics", "Analytics", "Your sales, profit, and money at a glance.", "1:07"),
      v("dealer", "15-activity-and-settings", "Activity and settings", "See who did what, and change your settings.", "1:03"),
    ],
  },
];

const farmer: TutorialSection[] = [
  {
    id: "broiler",
    title: "Broiler",
    description: "Everything for a broiler batch. Start with the quick tour.",
    videos: [
      v("farmer-broiler", "00-quick-tour-your-first-batch", "Quick tour: your first batch", "From buying chicks to your profit, in 2 minutes.", "2:04"),
      v("farmer-broiler", "01-sign-up-and-get-approved", "Sign up and get approved", "Make your farm account and wait for approval.", "0:52"),
      v("farmer-broiler", "02-home-page-tour", "Home page", "What your home page shows.", "0:37"),
      v("farmer-broiler", "03-farms-add-a-farm", "Add a farm", "Add the place where you keep your birds.", "0:34"),
      v("farmer-broiler", "04-suppliers-add-and-buy-chicks-feed", "Add your dealer and buy chicks and feed", "Record what you buy, with the bill photo.", "1:28"),
      v("farmer-broiler", "05-suppliers-pay-and-see-account", "Pay your dealer", "Record a payment and read the dealer account.", "0:49"),
      v("farmer-broiler", "06-inventory-stock", "Inventory", "Your stock of feed, chicks and medicine.", "0:44"),
      v("farmer-broiler", "07-start-a-broiler-batch", "Start a broiler batch", "Put chicks from stock into a new batch.", "1:18"),
      v("farmer-broiler", "08-batch-feed-and-expenses", "Feed and other costs", "Record the feed you give and other costs of a batch.", "1:04"),
      v("farmer-broiler", "09-batch-deaths", "Deaths", "Record birds that died, with the reason.", "0:40"),
      v("farmer-broiler", "10-weight-and-fcr", "Weight and FCR", "Record bird weight and read your FCR.", "0:52"),
      v("farmer-broiler", "11-sell-chickens", "Sell chickens", "Sell by weight, with a weight discount, part paid.", "1:08"),
      v("farmer-broiler", "12-customers-and-payments", "Buyers and payments", "Add buyers, take payments, and read their statement.", "1:01"),
      v("farmer-broiler", "13-batch-profit-and-notes", "Batch profit and notes", "See the profit of a batch and keep notes.", "0:48"),
      v("farmer-broiler", "14-close-a-batch", "Close a batch", "Close a batch when all birds are sold.", "0:42"),
      v("farmer-broiler", "15-share-batch-report", "Share a report with your doctor", "Share a batch health report with your veterinary doctor.", "1:47"),
      v("farmer-broiler", "16-reminders", "Reminders", "Set reminders, like a vaccine day.", "0:43"),
      v("farmer-broiler", "17-make-your-own-feed", "Make your own feed", "Record feed you make from maize, soybean and premix.", "1:16"),
      v("farmer-broiler", "18-cash-in-hand", "Cash in hand", "Keep track of the cash at your farm.", "1:00"),
      v("farmer-broiler", "19-staff-payroll-and-staff-login", "Staff salary and staff login", "Keep workers' salary, and give them a login.", "1:11"),
      v("farmer-broiler", "20-analytics", "Analytics", "How your farm is doing.", "0:51"),
      v("farmer-broiler", "21-activity-and-settings", "Activity and settings", "See who did what, and change your settings.", "0:41"),
    ],
  },
  {
    id: "layers",
    title: "Layers",
    description: "Everything for a layer batch, from day old chicks to eggs. Start with the quick tour.",
    videos: [
      v("farmer-layers", "00-quick-tour-layer-batch", "Quick tour: a layer batch", "From day old chicks to eggs, egg cost and profit.", "1:00"),
      v("farmer-layers", "01-sign-up-and-get-approved", "Sign up and get approved", "Make your farm account and wait for approval.", "1:09"),
      v("farmer-layers", "02-home-page-tour", "Home page", "What your home page shows, and the quick buttons.", "0:39"),
      v("farmer-layers", "03-farms-add-a-farm", "Add a farm", "Add the place where you keep your hens.", "0:35"),
      v("farmer-layers", "04-suppliers-add-and-buy-chicks-feed", "Add your dealer and buy chicks and feed", "Record day old chicks and layer feed you buy, with the bill photo.", "1:32"),
      v("farmer-layers", "05-suppliers-pay-and-see-account", "Pay your dealer", "Record a payment and read the dealer account.", "0:50"),
      v("farmer-layers", "06-inventory-stock", "Inventory", "Your stock of feed, chicks, medicine and eggs.", "0:53"),
      v("farmer-layers", "07-start-a-layer-batch", "Start a layer batch", "Choose the batch type Layers, and put in day old chicks.", "0:51"),
      v("farmer-layers", "08-egg-types", "Egg types", "Set Large, Medium, Small and Cracked, once.", "0:41"),
      v("farmer-layers", "09-feed-and-other-costs", "Feed, medicine and other costs", "Record the feed and medicine you give, and other costs.", "1:34"),
      v("farmer-layers", "10-deaths", "Deaths", "Record hens that died, with the reason.", "0:41"),
      v("farmer-layers", "11-daily-egg-production", "Daily egg production", "Record the eggs you collect every day.", "0:44"),
      v("farmer-layers", "12-egg-stock", "Egg stock", "See how many eggs you have.", "0:27"),
      v("farmer-layers", "13-sell-eggs", "Sell eggs", "Sell eggs with a rate for each type.", "1:09"),
      v("farmer-layers", "14-buyers-and-payments", "Buyers and payments", "Add egg buyers, take payments, and read their statement.", "1:03"),
      v("farmer-layers", "15-egg-cost-per-egg-and-carat", "Egg cost", "Cost per egg and per carat, margin, and payback.", "1:15"),
      v("farmer-layers", "16-layer-overview-and-profit", "Overview and profit", "Laying percent and the profit of a layer batch.", "0:39"),
      v("farmer-layers", "17-notes-and-reminders", "Notes and reminders", "Keep notes for your batch, and set reminders like a vaccine day.", "1:01"),
      v("farmer-layers", "18-share-report-with-your-doctor", "Share a report with your doctor", "Share the batch health report, with eggs, with your veterinary doctor.", "0:49"),
      v("farmer-layers", "19-sell-old-hens", "Sell old hens", "Sell hens that stopped laying.", "0:46"),
      v("farmer-layers", "20-close-a-layer-batch", "Close a layer batch", "Close the batch when laying is finished and the old hens are sold.", "1:07"),
      v("farmer-layers", "21-make-your-own-feed", "Make your own feed", "Record layer feed you make from maize, soybean and premix.", "1:18"),
      v("farmer-layers", "22-cash-in-hand", "Cash in hand", "Keep track of the cash at your farm.", "0:56"),
      v("farmer-layers", "23-staff-payroll-and-staff-login", "Staff salary and staff login", "Keep workers' salary, and give them a login.", "1:09"),
      v("farmer-layers", "24-layer-analytics", "Layer analytics", "Eggs laid, sold, and laying percent.", "0:30"),
      v("farmer-layers", "25-activity-and-settings", "Activity and settings", "See who did what, and change your settings.", "0:37"),
    ],
  },
];

const hatchery: TutorialSection[] = [
  {
    id: "hatchery",
    title: "Hatchery",
    description: "From eggs to chicks sold. Start with the quick tour.",
    videos: [
      v("hatchery", "00-quick-tour-eggs-to-chicks", "Quick tour: eggs to chicks", "The full path, from eggs to chicks sold.", "2:22"),
      v("hatchery", "01-sign-up-and-get-approved", "Sign up and get approved", "Make your hatchery account and wait for approval.", "1:11"),
      v("hatchery", "02-home-and-todays-work", "Home and today's work", "What needs candling, moving or hatching today.", "0:41"),
      v("hatchery", "03-egg-types", "Egg types", "Hatchable, table and cracked eggs, and your own types.", "0:31"),
      v("hatchery", "04-parent-batches", "Parent batches", "Your breeder flocks and what each tab shows.", "0:57"),
      v("hatchery", "05-daily-egg-collection", "Daily egg collection", "Record the eggs you collect every day.", "0:40"),
      v("hatchery", "06-egg-stock", "Egg stock", "See your eggs by batch and type.", "0:25"),
      v("hatchery", "07-start-an-incubation", "Start an incubation", "Set hatchable eggs in the setter.", "0:44"),
      v("hatchery", "08-candling", "Candling", "Day 9: take out infertile and early dead eggs.", "0:41"),
      v("hatchery", "09-move-to-hatcher", "Move to hatcher", "Day 18: move eggs to the hatcher.", "0:29"),
      v("hatchery", "10-hatch-result", "Hatch result", "Day 21: count Grade A, Grade B and cull chicks.", "0:40"),
      v("hatchery", "11-chick-stock", "Chick stock", "Chicks ready to sell.", "0:29"),
      v("hatchery", "12-sell-chicks", "Sell chicks", "Sell day old chicks and share the bill.", "0:38"),
      v("hatchery", "13-sell-eggs-and-parent-birds", "Sell eggs and parent birds", "Sell table and cracked eggs, and old parent birds.", "0:43"),
      v("hatchery", "14-parties-and-payments", "Parties and payments", "Your buyers, their ledger, and payments.", "1:01"),
      v("hatchery", "15-suppliers-and-inventory", "Suppliers and inventory", "What you buy, and your stock.", "0:48"),
      v("hatchery", "16-reminders-and-notes", "Reminders and notes", "Never miss a step, and keep your team informed.", "0:40"),
      v("hatchery", "17-analytics", "Analytics", "Hatch percent, sales and profit.", "0:39"),
      v("hatchery", "18-staff-activity-and-settings", "Staff, activity and settings", "Staff logins, activity log and settings.", "1:10"),
    ],
  },
];

export const tutorialsByModule = { dealer, farmer, hatchery } as const;
export type TutorialModule = keyof typeof tutorialsByModule;
