"use client";

import Image from "next/image";

const WHY_CHOOSE_US_ROWS = [
  {
    title: "Decade-Long Expertise",
    description:
      "With a legacy dating back to 2009, Livine has amassed over a decade of invaluable experience in revolutionizing poultry management. Our deep-rooted understanding of the industry's complexities enables us to deliver tailored solutions that address specific operational challenges with precision.",
    image: "/about-illustration.png",
    imageLeft: true,
  },
  {
    title: "Collaborative Approach",
    description:
      "Our team comprises seasoned poultry domain experts and technology specialists who work in tandem to develop and implement solutions that drive efficiency and profitability. By understanding your unique business needs, we customize our offerings to maximize your operational potential.",
    image: "/about-illustration.png",
    imageLeft: false,
  },
  {
    title: "Global Reach, Local Expertise",
    description:
      "Trusted by large poultry enterprises across diverse regions including India, the Middle East, and Southeast Asia, Livine's solutions are tailored to meet the specific demands of local markets while leveraging global best practices. This ensures that your business remains competitive in a dynamic industry landscape.",
    image: "/about-illustration.png",
    imageLeft: true,
  },
  {
    title: "All-In-One Solution",
    description:
      "We offer a comprehensive suite of solutions designed to streamline every facet of poultry management. From hatchery operations to flock health monitoring and supply chain optimization, our integrated platform ensures seamless end-to-end management.",
    image: "/about-illustration.png",
    imageLeft: false,
  },
];

export function WhyChooseUs() {
  return (
    <section className="w-full py-12 sm:py-16">
      {/* Intro Header */}
      <div className="space-y-4 mb-16 sm:mb-20">
        <h2 className="text-4xl sm:text-5xl lg:text-[54px] font-semibold text-slate-900 tracking-tight">
          Why <span className="text-primary font-bold">Livine</span>
        </h2>
        <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-4xl font-normal">
          At Livine, we pride ourselves on being the foremost choice for poultry enterprises seeking innovation, efficiency, and sustainable growth. Here are several compelling reasons why industry leaders trust us.
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
