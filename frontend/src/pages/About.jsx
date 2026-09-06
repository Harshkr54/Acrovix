import React from 'react';
import SEO from '../components/SEO';
import Breadcrumb from '../components/Breadcrumb';
import SectionHeading from '../components/SectionHeading';
import GlassCard from '../components/GlassCard';
import CTASection from '../sections/CTASection';
import { COMPANY_INFO } from '../data/company';
import { Target, Eye, Compass, ShieldCheck, CheckCircle2, Award, Building } from 'lucide-react';

const About = () => {
  return (
    <>
      <SEO
        title="About Us | ACROVIX INNOVATIONS PRIVATE LIMITED"
        description="Learn about ACROVIX INNOVATIONS PRIVATE LIMITED — our vision, mission, approach, and enterprise technology and cloud capabilities."
      />
      <main className="pt-28 pb-16 bg-acrovix-bg min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: 'About Us' }]} />

          {/* Hero Banner */}
          <div className="py-12 md:py-16 text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase bg-acrovix-card border border-acrovix-teal-primary/20 text-acrovix-teal-primary mb-4">
              <Building className="w-3.5 h-3.5" />
              CORPORATE PROFILE
            </span>
            <h1 className="text-[2.15rem] leading-[1.18] font-semibold text-acrovix-heading tracking-tight [word-spacing:0.18em] mb-4 max-w-2xl mx-auto">
              About ACROVIX INNOVATIONS <span className="block sm:inline md:block">PRIVATE LIMITED</span>
            </h1>
            <p className="text-lg text-acrovix-body leading-relaxed">
              {COMPANY_INFO.positioning}. Delivering integrated enterprise solutions across IT, cybersecurity, and cloud infrastructure.
            </p>
          </div>

          {/* Company Story & Philosophy */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-20">
            <div className="lg:col-span-7 space-y-6">
              <h2 className="text-2xl md:text-3xl font-bold text-acrovix-heading">
                Who We Are
              </h2>
              <p className="text-base text-acrovix-body leading-relaxed text-justify">
                {COMPANY_INFO.description}
              </p>
              <p className="text-base text-acrovix-body leading-relaxed text-justify">
                Our operations combine software engineering precision, zero-trust cybersecurity architectures, and cloud deployment capabilities into an integrated corporate offering.
              </p>

              <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <GlassCard className="p-6 border-acrovix-teal-primary/20">
                  <div className="flex items-center gap-2 text-acrovix-teal-primary font-bold mb-2">
                    <Eye className="w-5 h-5" />
                    <span className="text-sm uppercase tracking-wider">Vision</span>
                  </div>
                  <p className="text-xs text-acrovix-body leading-relaxed">
                    {COMPANY_INFO.vision}
                  </p>
                </GlassCard>

                <GlassCard className="p-6 border-acrovix-teal-primary/20">
                  <div className="flex items-center gap-2 text-acrovix-teal-primary font-bold mb-2">
                    <Target className="w-5 h-5" />
                    <span className="text-sm uppercase tracking-wider">Mission</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-acrovix-body">
                    {COMPANY_INFO.mission.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-acrovix-teal-primary font-bold flex-shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </div>
            </div>

            <div className="lg:col-span-5">
              <GlassCard className="p-8 border-acrovix-teal-primary/30 text-center space-y-6" glow>
                <div className="w-16 h-16 rounded-2xl bg-acrovix-teal-primary text-white flex items-center justify-center mx-auto shadow-lg">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-xs font-bold text-acrovix-teal-primary uppercase tracking-widest mb-1">
                    BRAND PHILOSOPHY
                  </div>
                  <h3 className="text-2xl font-black text-acrovix-heading">
                    {COMPANY_INFO.tagline}
                  </h3>
                </div>
                <div className="space-y-3 text-left pt-4 border-t border-acrovix-teal-primary/15">
                  {COMPANY_INFO.pillars.map((pillar, i) => (
                    <div key={i} className="p-3 rounded-lg bg-white/80 dark:bg-[#102936]/80 border border-acrovix-teal-primary/10">
                      <p className="text-xs text-acrovix-body leading-relaxed">
                        <span className="font-extrabold text-acrovix-teal-primary">{pillar.title}</span>
                        <span className="mx-1 text-acrovix-teal-primary font-bold">—</span>
                        {pillar.description}
                      </p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Approach & Values */}
          <div className="mb-20">
            <SectionHeading
              badge="METHODOLOGY"
              title="Our Engineering Approach"
              subtitle="Precision, innovation, and client-centric execution in every project."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {COMPANY_INFO.approach.map((app, idx) => (
                <GlassCard key={idx} className="p-6 border-acrovix-teal-primary/20">
                  <div className="w-10 h-10 rounded-xl bg-acrovix-card border border-acrovix-teal-primary/20 flex items-center justify-center text-acrovix-teal-primary mb-4 font-bold">
                    0{idx + 1}
                  </div>
                  <h3 className="text-lg font-bold text-acrovix-heading mb-2">{app.title}</h3>
                  <p className="text-xs text-acrovix-body leading-relaxed text-justify">{app.desc}</p>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>

        <CTASection />
      </main>
    </>
  );
};

export default About;
