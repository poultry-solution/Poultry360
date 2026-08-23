"use client";

import Image from "next/image";

const WHY_CHOOSE_US_ROWS = [
  {
    title: "Built for Nepal's Poultry Ecosystem",
    description:
      "Poultry360 is being built specifically for the operational reality of Nepal's poultry sector. We are focused on digitizing the links between farms, hatcheries, feed dealers, inventory, sales, and business records so the ecosystem can run with better visibility and less manual friction.",
    image: "/about-illustration.png",
    imageLeft: true,
  },
  {
    title: "Practical Product Thinking",
    description:
      "We are not building generic software for agriculture. Poultry360 is shaped around day-to-day poultry workflows such as batch management, mortality tracking, egg production, feed movement, sales, balances, and party ledgers so the product stays useful in real operations.",
    image: "/product-thinking-about-us.png",
    imageLeft: false,
  },
  {
    title: "Focused on Digitization, Not Complexity",
    description:
      "The goal is simple: replace disconnected manual records with a cleaner digital system. By centralizing core poultry activities in one platform, Poultry360 helps owners and teams reduce confusion, improve accountability, and make decisions from real data instead of guesswork.",
    image: "/second-last-about-us.png",
    imageLeft: true,
  },
  {
    title: "All-In-One Solution",
    description:
      "Poultry360 brings together the modules needed across broiler farms, layer farms, hatcheries, feed dealers, and related poultry businesses. That means fewer separate tools, more consistent records, and a stronger digital foundation for the industry's next phase.",
    image: "/last-section-about-us.png",
    imageLeft: false,
  },
];

export function WhyChooseUs() {
  return (
    <section className="w-full py-12 sm:py-16">
      {/* Intro Header */}
      <div className="space-y-4 mb-16 sm:mb-20">
        <h2 className="text-4xl sm:text-5xl lg:text-[54px] font-semibold text-slate-900 tracking-tight">
          Why <span className="text-primary font-bold">Poultry360</span>
        </h2>
        <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-4xl font-normal">
          Poultry360 exists to help modernize the way Nepal's poultry businesses operate. These are the reasons we believe a focused digital platform can create real value across the ecosystem.
        </p>
      </div>

      {/* Alternating Feature Rows */}
      <div className="space-y-20 sm:space-y-28">
        {WHY_CHOOSE_US_ROWS.map((item, index) => (
          <div
            key={index}
            className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center"
          >
            {/* Image Column */}
            <div
              className={`lg:col-span-6 ${
                item.imageLeft ? "lg:order-1" : "lg:order-2"
              }`}
            >
              <div className="relative w-full aspect-[4/3] rounded-3xl bg-[#F8FAFC] border border-slate-100 overflow-hidden flex items-center justify-center p-6 sm:p-10 shadow-xs">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-contain p-6"
                />
              </div>
            </div>

            {/* Text Column */}
            <div
              className={`lg:col-span-6 space-y-4 ${
                item.imageLeft ? "lg:order-2" : "lg:order-1"
              }`}
            >
              <h3 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-slate-900 tracking-tight leading-tight">
                {item.title}
              </h3>
              <p className="text-slate-600 text-base sm:text-lg leading-relaxed font-normal">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
