import React from 'react';
import { Target, Eye, Compass, ShieldCheck, CheckCircle2 } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import SectionHeading from '../components/SectionHeading';
import { COMPANY_INFO } from '../data/company';

const AboutSection = () => {
  return (
    <section className="py-20 md:py-28 bg-acrovix-bg-secondary relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Side Story */}
          <div className="lg:col-span-7 space-y-6">
            <SectionHeading
              align="left"
              badge="ABOUT ACROVIX"
              title="Delivering Integrated Engineering & IT Capabilities"
              subtitle={COMPANY_INFO.description}
            />

            {/* Vision & Mission Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <GlassCard className="p-5 border-acrovix-teal-primary/20" hoverEffect={false}>
                <div className="flex items-center gap-3 mb-2 text-acrovix-teal-primary font-bold">
                  <Eye className="w-5 h-5" />
                  <span className="text-sm uppercase tracking-wider">Vision</span>
                </div>
                <p className="text-xs text-acrovix-body leading-relaxed">
                  {COMPANY_INFO.vision}
                </p>
              </GlassCard>

              <GlassCard className="p-5 border-acrovix-teal-primary/20" hoverEffect={false}>
                <div className="flex items-center gap-3 mb-2 text-acrovix-teal-primary font-bold">
                  <Target className="w-5 h-5" />
                  <span className="text-sm uppercase tracking-wider">Mission</span>
                </div>
                <ul className="space-y-1 text-xs text-acrovix-body">
                  {COMPANY_INFO.mission.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-acrovix-teal-primary font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </div>

            {/* Our Approach */}
            <div className="pt-4 border-t border-acrovix-teal-primary/16">
              <h3 className="text-sm font-bold text-acrovix-heading uppercase tracking-wider mb-4 flex items-center gap-2">
                <Compass className="w-4 h-4 text-acrovix-teal-primary" />
                <span>Our Engineering Approach</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {COMPANY_INFO.approach.map((app, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-acrovix-teal-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-acrovix-heading">{app.title}</h4>
                      <p className="text-xs text-acrovix-muted leading-relaxed">{app.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side Visual */}
          <div className="lg:col-span-5">
            <GlassCard className="p-8 border-acrovix-teal-primary/30 relative overflow-hidden" glow>
              <div className="text-center space-y-6">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-acrovix-teal-primary flex items-center justify-center text-white shadow-xl">
                  <ShieldCheck className="w-10 h-10" />
                </div>

                <div>
                  <span className="text-xs font-bold text-acrovix-teal-primary uppercase tracking-widest block mb-1">
                    ENGINEERING PHILOSOPHY
                  </span>
                  <h3 className="text-2xl font-black text-acrovix-heading">
                    {COMPANY_INFO.name}
                  </h3>
                </div>

                <div className="p-4 rounded-xl bg-acrovix-card border border-acrovix-teal-primary/20 space-y-2">
                  <div className="text-xs font-bold text-acrovix-heading">
                    {COMPANY_INFO.positioning}
                  </div>
                  <div className="text-[11px] text-acrovix-body">
                    Built for enterprise stability, security-first compliance, and measurable execution precision.
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-acrovix-teal-primary/15 text-center">
                  <div className="p-2 rounded bg-acrovix-card/80 dark:bg-[#142F3D]/80">
                    <span className="block text-xs font-bold text-acrovix-teal-primary">IT</span>
                    <span className="text-[10px] text-acrovix-muted">Software & Cloud</span>
                  </div>
                  <div className="p-2 rounded bg-acrovix-card/80 dark:bg-[#142F3D]/80">
                    <span className="block text-xs font-bold text-acrovix-teal-primary">SECURITY</span>
                    <span className="text-[10px] text-acrovix-muted">Observability</span>
                  </div>
                  <div className="p-2 rounded bg-acrovix-card/80 dark:bg-[#142F3D]/80">
                    <span className="block text-xs font-bold text-acrovix-teal-primary">INFRA</span>
                    <span className="text-[10px] text-acrovix-muted">Cloud & DevOps</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
