import React from 'react';
import SEO from '../components/SEO';
import Breadcrumb from '../components/Breadcrumb';
import IndustryCard from '../components/IndustryCard';
import CTASection from '../sections/CTASection';
import { INDUSTRIES_DATA } from '../data/industries';
import { Building2 } from 'lucide-react';

const Industries = () => {
  return (
    <>
      <SEO
        title="Industries We Serve | ACROVIX"
        description="Discover industry solutions engineered by ACROVIX for Banking, Healthcare, Government, SaaS, Construction, Manufacturing, and Retail."
      />
      <main className="pt-28 pb-16 bg-acrovix-bg min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: 'Industries' }]} />

          {/* Hero Header */}
          <div className="py-12 md:py-16 text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase bg-acrovix-card border border-acrovix-teal-primary/20 text-acrovix-teal-primary mb-4">
              <Building2 className="w-3.5 h-3.5" />
              VERTICAL EXPERIENCE
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-acrovix-heading tracking-tight [word-spacing:0.18em] leading-[1.14] mb-4">
              Industries We Serve
            </h1>
            <p className="text-lg text-acrovix-body leading-relaxed">
              Tailored technology, data security, and enterprise cloud execution aligned with regulatory mandates and sector requirements.
            </p>
          </div>

          {/* Industries Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {INDUSTRIES_DATA.map((industry) => (
              <IndustryCard key={industry.id} industry={industry} />
            ))}
          </div>
        </div>

        <CTASection />
      </main>
    </>
  );
};

export default Industries;
