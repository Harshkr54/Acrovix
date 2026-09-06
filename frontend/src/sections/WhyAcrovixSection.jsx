import React from 'react';
import { Award, ShieldCheck, TrendingUp, Cpu, Users, Handshake } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';
import GlassCard from '../components/GlassCard';
import { COMPANY_INFO } from '../data/company';

const iconMap = {
  'enterprise-expertise': Award,
  'security-focused': ShieldCheck,
  'scalable-solutions': TrendingUp,
  'end-to-end': Cpu,
  'client-centric': Users,
  'long-term-partner': Handshake
};

const WhyAcrovixSection = () => {
  return (
    <section className="py-20 md:py-28 bg-acrovix-bg relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <SectionHeading
          badge="THE ACROVIX ADVANTAGE"
          title="Why Acrovix?"
          subtitle="Built on technical rigor, security-first architecture, and client-focused commitment."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {COMPANY_INFO.whyUs.map((item) => {
            const IconComp = iconMap[item.id] || Award;
            return (
              <GlassCard
                key={item.id}
                className="flex flex-col p-6 group border-acrovix-teal-primary/20 hover:border-acrovix-teal-primary/40"
              >
                <div className="w-12 h-12 rounded-xl bg-acrovix-card border border-acrovix-teal-primary/20 flex items-center justify-center text-acrovix-teal-primary mb-5 group-hover:bg-acrovix-teal-primary group-hover:text-white transition-colors duration-300">
                  <IconComp className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-acrovix-heading mb-2 group-hover:text-acrovix-teal-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-acrovix-body leading-relaxed">
                  {item.description}
                </p>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WhyAcrovixSection;
