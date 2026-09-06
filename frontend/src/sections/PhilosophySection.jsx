import React from 'react';
import { RefreshCw, TrendingUp, Award } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import SectionHeading from '../components/SectionHeading';
import { COMPANY_INFO } from '../data/company';

const iconMap = {
  SYNC: RefreshCw,
  SCALE: TrendingUp,
  SUCCEED: Award
};

const PhilosophySection = () => {
  const titleJSX = (
    <span className="inline-flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5 md:gap-5">
      <span>SYNC</span>
      <span className="text-acrovix-teal-primary/40 font-light select-none text-xl sm:text-2xl md:text-3xl font-normal">|</span>
      <span>SCALE</span>
      <span className="text-acrovix-teal-primary/40 font-light select-none text-xl sm:text-2xl md:text-3xl font-normal">|</span>
      <span>SUCCEED</span>
    </span>
  );

  return (
    <section className="py-20 md:py-28 bg-acrovix-bg relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <SectionHeading
          badge="OUR BRAND PHILOSOPHY"
          title={titleJSX}
          titleClassName="text-2xl sm:text-3xl md:text-[38px] lg:text-[42px] font-bold text-acrovix-heading tracking-wide mb-4"
          subtitle="Three core pillars driving our strategy, technological delivery, and long-term enterprise partnerships."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {COMPANY_INFO.pillars.map((pillar, idx) => {
            const IconComponent = iconMap[pillar.title] || RefreshCw;
            return (
              <GlassCard
                key={idx}
                className="flex flex-col justify-between h-full p-8 group border-acrovix-teal-primary/20 hover:border-acrovix-teal-primary/50 relative overflow-hidden"
              >
                <div>
                  {/* Pillar Icon & Step Number */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-acrovix-card border border-acrovix-teal-primary/20 flex items-center justify-center text-acrovix-teal-primary group-hover:scale-110 group-hover:bg-acrovix-teal-primary group-hover:text-white transition-all duration-300">
                      <IconComponent className="w-7 h-7" />
                    </div>
                    <span className="text-3xl font-black text-acrovix-teal-primary/20 group-hover:text-acrovix-teal-primary/40 transition-colors">
                      0{idx + 1}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-acrovix-heading mb-1 group-hover:text-acrovix-teal-primary transition-colors">
                    {pillar.title}
                  </h3>
                  <div className="text-xs font-bold text-acrovix-teal-primary uppercase tracking-wider mb-4">
                    {pillar.subtitle}
                  </div>

                  <p className="text-sm text-acrovix-body leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PhilosophySection;
