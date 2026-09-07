import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import SEO from '../components/SEO';
import Breadcrumb from '../components/Breadcrumb';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

import { INDUSTRIES_DATA } from '../data/industries';
import { Landmark, Activity, Building2, Tv, CloudCog, HardHat, Factory, ShoppingBag, ArrowRight, CheckCircle2 } from 'lucide-react';

const iconMap = {
  Landmark,
  Activity,
  Building2,
  Tv,
  CloudCog,
  HardHat,
  Factory,
  ShoppingBag,
};

const IndustryDetail = () => {
  const { slug } = useParams();
  const industry = INDUSTRIES_DATA.find((ind) => ind.slug === slug);

  if (!industry) {
    return <Navigate to="/industries" replace />;
  }

  const IconComponent = iconMap[industry.iconName] || Building2;

  return (
    <>
      <SEO
        title={`${industry.title} | Industries`}
        description={industry.shortDescription}
      />
      <main className="pt-28 pb-16 bg-acrovix-bg min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: 'Industries', path: '/industries' },
              { label: industry.title }
            ]}
          />

          {/* Industry Header */}
          <div className="py-10 md:py-14 border-b border-acrovix-teal-primary/16 mb-12">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="max-w-3xl space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-acrovix-card border border-acrovix-teal-primary/20 flex items-center justify-center text-acrovix-teal-primary mb-2">
                  <IconComponent className="w-7 h-7" />
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-acrovix-heading tracking-tight [word-spacing:0.18em] leading-[1.14]">
                  {industry.title}
                </h1>
                <p className="text-base sm:text-lg text-acrovix-body leading-relaxed">
                  {industry.overview}
                </p>
              </div>

              <div className="flex-shrink-0">
                <GlassCard className="p-8 border-acrovix-teal-primary/30 text-center" hoverEffect={false}>
                  <Button to="/enquiry" variant="primary" size="md" className="w-full">
                    <span>Consult Our Sector Team</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </GlassCard>
              </div>
            </div>
          </div>

          {/* Key Solutions for this Industry */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-acrovix-heading mb-6">
              Tailored Sector Solutions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {industry.keySolutions.map((sol, idx) => (
                <GlassCard key={idx} className="p-6 border-acrovix-teal-primary/20 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-acrovix-teal-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-base font-bold text-acrovix-heading">{sol}</h3>
                    <p className="text-xs text-acrovix-body mt-1">Engineered to comply with regulatory mandates and high availability requirements.</p>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>


      </main>
    </>
  );
};

export default IndustryDetail;
