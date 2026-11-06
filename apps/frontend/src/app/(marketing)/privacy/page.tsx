import type { Metadata } from "next";
import type { ReactNode } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy | Poultry360",
  description: "What information Poultry360 collects, why, who can see it, how long we keep it, and your choices.",
  alternates: { canonical: "/privacy" },
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
  { id: "collect", title: "2. What we collect" },
  { id: "why", title: "3. Why we use it" },
  { id: "see", title: "4. Who can see it" },
  { id: "services", title: "5. Services we use" },
  { id: "cookies", title: "6. Cookies and website tracking" },
  { id: "keep", title: "7. How long we keep it" },
  { id: "safe", title: "8. How we keep it safe" },
  { id: "choices", title: "9. Your choices" },
  { id: "children", title: "10. Children" },
  { id: "changes", title: "11. Changes to this policy" },
  { id: "contact", title: "12. Contact" },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-12 leading-relaxed sm:px-6 sm:py-16">
        <div>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>
          <p className="mt-3 text-slate-600">
            This page tells you what information Poultry360 collects, why we need it, who can see it, and how long we keep
            it. We collect only what we need to run Poultry360 for you.
          </p>
        </div>

        <div className="space-y-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
          <p className="font-semibold text-green-900">In short</p>
          <List
            items={[
              "Your farm and business data belongs to you. We do not sell it.",
              "We use your information only to run Poultry360, give support, and keep accounts safe.",
              "Only you and the staff you allow can see your business data inside the app.",
              "We use a few trusted services to run Poultry360, such as hosting, SMS and image storage.",
              "You can download your data, fix wrong details, or ask us to delete your account.",
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
            Municipality – Ward No. 3, Tikuligadh, Dang. We are responsible for the information described on this page.
          </p>
        </Section>

        <Section id="collect" title="2. What we collect">
          <p className="font-medium">Account details</p>
          <List
            items={[
              "Your name, phone number, business name and location.",
              "Your password. We never keep it as plain text; it is stored in a locked (hashed) form that even we cannot read.",
              "Your settings, such as language and calendar (BS or AD).",
            ]}
          />
          <p className="font-medium">Business data you enter</p>
          <List
            items={[
              "Farm, batch, hatchery, stock, feed, medicine, expense, sale and payment records.",
              "Details of your customers, suppliers and parties, such as names, phone numbers, balances and notes.",
              "Staff details you add, such as name, phone, role, permissions and salary records.",
              "Photos you upload, such as staff or product photos.",
            ]}
          />
          <p className="font-medium">Sign-in and safety records</p>
          <List
            items={[
              "When you sign in, we keep your IP address and basic device details: browser type, operating system, and whether you used a phone, tablet or computer. We may also keep an estimated country or region if our hosting service gives it.",
              "A history of important actions in your account (for example, who added or deleted a sale), so you can check what happened.",
            ]}
          />
          <p className="font-medium">Notifications</p>
          <List
            items={[
              "If you turn on alerts, your browser gives us a notification address so we can send you reminders. We do not get your contacts or other apps.",
            ]}
          />
          <p className="font-medium">What we do not collect</p>
          <List
            items={[
              "Your exact location (GPS), your browser history, your contacts, or your device ID.",
              "Bank card numbers. We do not take card payments inside Poultry360.",
            ]}
          />
        </Section>

        <Section id="why" title="3. Why we use it">
          <List
            items={[
              "To run Poultry360: show your records, reports, bills and reminders.",
              "To let you and your staff sign in, and to send password reset codes by SMS.",
              "To keep accounts safe, stop misuse, and look into problems.",
              "To give support when you ask for help.",
              "To fix bugs and make Poultry360 better.",
              "To contact you about your account, payments, renewals and important changes.",
            ]}
          />
          <p>We do not sell your information, and we do not use your business data for advertising.</p>
        </Section>

        <Section id="see" title="4. Who can see it">
          <List
            items={[
              <>
                <strong>You and your staff:</strong> only the account owner and the staff they allow can see the business
                data. Staff see only what their permissions allow.
              </>,
              <>
                <strong>People you share with:</strong> if you share something on purpose (for example, a share link or a
                printed bill), the people you share it with can see it.
              </>,
              <>
                <strong>Our team:</strong> a small number of Poultry360 staff can see account data when needed to give
                support, fix problems, or check misuse. Sign-in security details are visible only to Poultry360 Super
                Admin.
              </>,
              <>
                <strong>The law:</strong> we share information if Nepal law, a court, or a government authority requires
                it.
              </>,
              <>
                <strong>If our company changes:</strong> if Poultry360 is sold or merged, your data may move to the new
                owner, who must follow this policy. We will tell you first.
              </>,
            ]}
          />
        </Section>

        <Section id="services" title="5. Services we use">
          <p>We use a few trusted companies to run Poultry360. They get only what they need to do their job:</p>
          <List
            items={[
              "Cloud hosting and database services, to run the app and store data. Their servers may be outside Nepal.",
              "An SMS service in Nepal, to send password reset codes to your phone.",
              "An image storage service, to store photos you upload.",
              "Browser notification services (from Google, Apple, Mozilla and others), to deliver alerts you turned on.",
              "Microsoft Clarity, on our public website only (see section 6).",
            ]}
          />
        </Section>

        <Section id="cookies" title="6. Cookies and website tracking">
          <List
            items={[
              "Inside the app, we save small pieces of data in your browser to keep you signed in and to remember your settings, such as language. Without these, the app cannot work.",
              "On our public website (home page, blog and product pages), we use Microsoft Clarity to see how visitors use the pages, for example where they click and scroll. This helps us improve the website. Clarity uses cookies. It is not used inside your farm or business account.",
              "We do not use advertising cookies.",
              "You can block or clear cookies in your browser settings. If you block them inside the app, you may not be able to stay signed in.",
            ]}
          />
        </Section>

        <Section id="keep" title="7. How long we keep it">
          <List
            items={[
              "Account and business data: while your account is active. If your plan ends and is not renewed, we may delete it 90 days after your paid period ends (see our Terms and Conditions).",
              "Sign-in security details (IP and device): deleted automatically after 30 days. A basic record that a sign-in happened stays in our protected history.",
              "Password reset codes: they stop working after a short time and are not used again.",
              "Backups: deleted data can stay in backups for a short time before the backups are replaced.",
              "If the law asks us to keep some records longer (for example, for tax), we keep them only for that.",
            ]}
          />
        </Section>

        <Section id="safe" title="8. How we keep it safe">
          <List
            items={[
              "Data travels over a secure (HTTPS) connection.",
              "Passwords are stored in a locked (hashed) form.",
              "Each account can see only its own data, and staff only what their permissions allow.",
              "We take regular backups.",
              "No system is 100% safe. If we find a data leak that puts your information at risk, we will tell you as soon as we can.",
              "Please help us: use a strong password, do not share it, and remove staff who no longer work for you.",
            ]}
          />
        </Section>

        <Section id="choices" title="9. Your choices">
          <List
            items={[
              "See and download your data: use the reports and download options in the app, or ask us for a full copy.",
              "Fix wrong details: change them in the app, or ask us.",
              "Delete your account: ask us. We will delete your account and data, except what the law asks us to keep.",
              "Turn off alerts: in your browser or phone settings, at any time.",
              "Customer and staff details: if you add other people's details (customers, staff), please make sure they are fine with it. If someone asks us about their details in your account, we may send them to you.",
            ]}
          />
        </Section>

        <Section id="children" title="10. Children">
          <p>Poultry360 is made for businesses and adults. We do not knowingly collect information from children.</p>
        </Section>

        <Section id="changes" title="11. Changes to this policy">
          <p>
            We may update this policy. The date at the top shows the latest version. For big changes, we will tell you in
            the app or by message before they start.
          </p>
        </Section>

        <Section id="contact" title="12. Contact">
          <p>
            For privacy questions or requests, please contact Poultry360 through the{" "}
            <a href="/#contact" className="text-primary underline">
              contact page
            </a>
            . Also see our{" "}
            <a href="/terms" className="text-primary underline">
              Terms and Conditions
            </a>
            .
          </p>
        </Section>
      </main>
      <Footer />
    </div>
  );
}
