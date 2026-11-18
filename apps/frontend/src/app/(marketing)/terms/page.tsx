import type { Metadata } from "next";
import type { ReactNode } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Terms and Conditions | Poultry360",
  description: "The rules for using Poultry360: payment, renewal, your data, our limits, and what happens if the service stops.",
  alternates: { canonical: "/terms" },
};

const LAST_UPDATED = "Kartik 20, 2083 (November 6, 2026)";

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

const SECTIONS: Array<{ id: string; title: string }> = [
  { id: "who", title: "1. Who we are" },
  { id: "agree", title: "2. Agreeing to these terms" },
  { id: "account", title: "3. Your account and staff" },
  { id: "payment", title: "4. Plans and payment" },
  { id: "renewal", title: "5. Renewal and late payment" },
  { id: "data", title: "6. Your data" },
  { id: "use", title: "7. Fair use" },
  { id: "advice", title: "8. Reports are a help, not advice" },
  { id: "service", title: "9. How the service runs" },
  { id: "liability", title: "10. Limit of our responsibility" },
  { id: "you-stop", title: "11. If you stop using Poultry360" },
  { id: "we-stop", title: "12. If we stop Poultry360" },
  { id: "suspend", title: "13. When we can block an account" },
  { id: "ours", title: "14. Our software" },
  { id: "outside", title: "15. Things outside our control" },
  { id: "changes", title: "16. Changes to these terms" },
  { id: "law", title: "17. Law and disputes" },
  { id: "contact", title: "18. Contact" },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-12 leading-relaxed sm:px-6 sm:py-16">
        <div>
          <h1 className="text-3xl font-bold">Terms and Conditions</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>
          <p className="mt-3 text-slate-600">
            These are the rules for using Poultry360. Please read them. By using Poultry360, you agree to them.
          </p>
        </div>

        <div className="space-y-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
          <p className="font-semibold text-green-900">In short</p>
          <List
            items={[
              "You pay for a time period in advance. The service runs for the time you paid for.",
              "Your farm and business data belongs to you. You can download it.",
              "If you do not renew, your account becomes view only, and later your data may be deleted.",
              "Our responsibility is limited to the amount you paid for the current paid period.",
              "If we ever stop Poultry360, we tell you at least 60 days before, and we help you take your data with you.",
              "Reports help you decide, but you are responsible for your own decisions, taxes and bills.",
            ]}
          />
        </div>

        <nav aria-label="Sections" className="rounded-lg border border-slate-200 p-4 text-sm">
          <p className="mb-2 font-semibold">Sections</p>
          <ol className="grid gap-1 sm:grid-cols-2">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-slate-600 hover:text-primary">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <Section id="who" title="1. Who we are">
          <p>
            Poultry360 is a software product of <strong>SajiloDev Engineering Pvt. Ltd.</strong> (PAN 121335439), Lamahi
            Municipality – Ward No. 3, Tikuligadh, Dang. In these terms, &quot;we&quot;, &quot;us&quot; and &quot;our&quot;
            mean SajiloDev Engineering Pvt. Ltd. &quot;You&quot; means the person or business that uses Poultry360.
          </p>
        </Section>

        <Section id="agree" title="2. Agreeing to these terms">
          <List
            items={[
              "By creating an account or using Poultry360, you agree to these terms.",
              "If you use Poultry360 for a business, you confirm you are allowed to agree for that business.",
              "If you have a separate signed agreement or quotation with us, that document comes first where it is different from these terms.",
            ]}
          />
        </Section>

        <Section id="account" title="3. Your account and staff">
          <List
            items={[
              "Give correct details when you sign up, and keep them up to date.",
              "Keep your password safe. Do not share it. Anything done with your login is your responsibility.",
              "You decide which staff can use your account and what they can do. You are responsible for what your staff do in Poultry360.",
              "Tell us quickly if you think someone else is using your account.",
            ]}
          />
        </Section>

        <Section id="payment" title="4. Plans and payment">
          <List
            items={[
              "Prices and plans are shown in your quotation, invoice, or on our website.",
              "You pay in advance for a time period (for example, one month or one year).",
              "Payments are not refunded, except where these terms say so (see section 12).",
              "If we change prices, we tell you at least 30 days before. New prices start only from your next renewal, not in the middle of a paid period.",
              "Prices may include or exclude taxes such as VAT, as written on your invoice.",
              "Custom work (for example, a special module or feature built only for you) is priced and agreed separately.",
            ]}
          />
        </Section>

        <Section id="renewal" title="5. Renewal and late payment">
          <List
            items={[
              "Your plan does not renew by itself. You renew by paying for the next period before the current one ends.",
              "If you do not renew on time, we give you 15 days of extra time. After that, your account becomes view only: you can see and download your data, but you cannot add new entries.",
              "If you still have not renewed 90 days after your paid period ended, we may delete your account and data. We will try to remind you before we do this.",
              "When you renew, everything works again as before, as long as your data has not been deleted.",
            ]}
          />
        </Section>

        <Section id="data" title="6. Your data">
          <List
            items={[
              "The farm and business data you put into Poultry360 belongs to you.",
              "We use your data only to run Poultry360 for you, give support, keep the service safe, and fix problems. We do not sell your data.",
              "You can download your data from the app (for example, Excel and PDF reports). If you need a full copy, ask us.",
              "Your data is stored with trusted cloud hosting companies. Their servers may be outside Nepal.",
              "We take regular backups and work hard to keep data safe, but no system is perfect. Please keep your own copies of important records too.",
              <>
                How we collect and use information is written in our{" "}
                <a href="/privacy" className="text-primary underline">
                  Privacy Policy
                </a>
                .
              </>,
            ]}
          />
        </Section>

        <Section id="use" title="7. Fair use">
          <p>You must not:</p>
          <List
            items={[
              "use Poultry360 for anything illegal, or to cheat other people;",
              "try to get into accounts or data that are not yours;",
              "try to break, overload or attack the service, or get around our security;",
              "copy, sell, rent or share Poultry360 with others who have not paid;",
              "upload harmful files or content that is not yours to share.",
            ]}
          />
        </Section>

        <Section id="advice" title="8. Reports are a help, not advice">
          <List
            items={[
              "Numbers, charts, reminders and reports in Poultry360 come from the data you and your staff enter. If the data is wrong, the results will be wrong.",
              "They are a help for your work. They are not money, tax, legal, or animal health (vet) advice. Please check important decisions with the right expert.",
              "Poultry360 is not billing software approved by the Inland Revenue Department (IRD). Bills and receipts from Poultry360 are for your own records. You are responsible for your own tax bills, VAT and tax filing.",
            ]}
          />
        </Section>

        <Section id="service" title="9. How the service runs">
          <List
            items={[
              "We work hard to keep Poultry360 running all the time, but we cannot promise it will never stop or never have mistakes.",
              "Sometimes we need to stop the service for a short time to update or fix it. We try to do this at quiet times.",
              "We keep improving Poultry360. We may add, change or remove features. If we remove a main feature you paid for, we will tell you first.",
              "The service is given \"as it is\". Apart from what is written in these terms, we do not give extra promises.",
            ]}
          />
        </Section>

        <Section id="liability" title="10. Limit of our responsibility">
          <List
            items={[
              <>
                If we are responsible for a loss, the most we will pay in total is{" "}
                <strong>the amount you paid us for the current paid period</strong> in which the problem happened.
              </>,
              "We are not responsible for indirect losses, such as lost profit, lost business, lost birds or stock, or lost chances, even if we were told they could happen.",
              "We are not responsible for losses caused by wrong data entered by you or your staff, by your staff's actions, by shared passwords, or by your own internet or device problems.",
              "We have no responsibility for any time you did not pay for, including after your paid period has ended.",
              "Nothing in these terms removes rights that Nepal law does not allow to be removed.",
            ]}
          />
        </Section>

        <Section id="you-stop" title="11. If you stop using Poultry360">
          <List
            items={[
              "You can stop at any time. Just do not renew, or tell us.",
              "Money already paid for the current period is not refunded.",
              "Please download your data before you leave. Section 5 explains how long we keep it after your paid period ends.",
            ]}
          />
        </Section>

        <Section id="we-stop" title="12. If we stop Poultry360">
          <p>We may decide to stop Poultry360, stop one module, or close our company. If this happens:</p>
          <List
            items={[
              "We will tell you at least 60 days before, by email, phone, SMS or a message in the app.",
              "We will not take new renewals after we tell you.",
              "If you have already paid for time after the stop date, we will either keep the service running until your paid time ends, or refund the full unused months.",
              "We will help you take your data with you in a common format (such as Excel/CSV). If you ask, we will also give reasonable help to move your data to another software, even a competitor.",
              "After the stop date and the data handover, we will delete your data from our systems.",
            ]}
          />
        </Section>

        <Section id="suspend" title="13. When we can block an account">
          <List
            items={[
              "We may block or close an account that breaks these terms (for example, the rules in section 7), or to protect other users or the service.",
              "Where it is safe to do so, we will tell you first and give you time to fix the problem.",
              "If we close your account because you broke these terms, paid money is not refunded.",
            ]}
          />
        </Section>

        <Section id="ours" title="14. Our software">
          <List
            items={[
              "Poultry360, its code, design, name and logo belong to SajiloDev Engineering Pvt. Ltd.",
              "Paying gives you the right to use Poultry360 for your own business during your paid period. It does not give you ownership of the software.",
              "If you send us ideas or feedback, we may use them to improve Poultry360 without paying you.",
            ]}
          />
        </Section>

        <Section id="outside" title="15. Things outside our control">
          <p>
            We are not responsible for delays or problems caused by things we cannot control, such as natural disasters,
            power cuts, internet or mobile network failures, government action, strikes, war, or outages of hosting and
            other service companies we use.
          </p>
        </Section>

        <Section id="changes" title="16. Changes to these terms">
          <List
            items={[
              "We may update these terms. The date at the top shows the latest version.",
              "For big changes, we will tell you at least 15 days before they start.",
              "If you keep using Poultry360 after the changes start, you agree to the new terms.",
            ]}
          />
        </Section>

        <Section id="law" title="17. Law and disputes">
          <List
            items={[
              "These terms follow the laws of Nepal.",
              "If there is a problem, please talk to us first. We will try to solve it together within 30 days.",
              "If we cannot solve it, the matter will go to the courts of Nepal, in Dang district.",
            ]}
          />
        </Section>

        <Section id="contact" title="18. Contact">
          <p>
            For questions about these terms, please contact Poultry360 through the{" "}
            <a href="/#contact" className="text-primary underline">
              contact page
            </a>
            .
          </p>
        </Section>
      </main>
      <Footer />
    </div>
  );
}
