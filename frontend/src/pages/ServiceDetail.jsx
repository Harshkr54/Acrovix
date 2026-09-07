import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import SEO from '../components/SEO';
import Breadcrumb from '../components/Breadcrumb';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

import { SERVICES_DATA } from '../data/services';
import { Cpu, ShieldCheck, CheckCircle2, ArrowRight, Layers, Compass } from 'lucide-react';

const iconMap = {
  Cpu,
  ShieldCheck,
};

const ServiceDetail = () => {
  const { slug } = useParams();
  const service = SERVICES_DATA.find((s) => s.slug === slug);

  if (!service) {
    return <Navigate to="/services" replace />;
  }

  const IconComponent = iconMap[service.iconName] || Cpu;

  return (
    <>
      <SEO
        title={`${service.title} | Services`}
        description={service.shortDescription}
      />
      <main className="pt-28 pb-16 bg-acrovix-bg min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: 'Services', path: '/services' },
              { label: service.title }
            ]}
          />

          {/* Service Header */}
          <div className="py-10 md:py-14 border-b border-acrovix-teal-primary/16 mb-12">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="max-w-3xl space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-acrovix-card border border-acrovix-teal-primary/20 text-acrovix-teal-primary">
                  {service.category}
                </span>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-acrovix-heading tracking-tight [word-spacing:0.18em] leading-[1.14]">
                  {service.title}
                </h1>
                <p className="text-base sm:text-lg text-acrovix-body leading-relaxed">
                  {service.longDescription}
                </p>
              </div>

              <div className="flex-shrink-0">
                <GlassCard className="p-8 border-acrovix-teal-primary/30 text-center" hoverEffect={false}>
                  <div className="w-16 h-16 rounded-2xl bg-acrovix-teal-primary text-white flex items-center justify-center mx-auto mb-4 shadow-md">
                    <IconComponent className="w-8 h-8" />
                  </div>
                  <Button to="/enquiry" variant="primary" size="md" className="w-full">
                    <span>Discuss Requirement</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </GlassCard>
              </div>
            </div>
          </div>

          {/* Capabilities Grid */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-acrovix-heading mb-6 flex items-center gap-2">
              <Layers className="w-6 h-6 text-acrovix-teal-primary" />
              <span>Full Capabilities & Scope</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {service.capabilities.map((cap, idx) => (
                <GlassCard key={idx} className="p-5 border-acrovix-teal-primary/20 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-acrovix-teal-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-base font-bold text-acrovix-heading">{cap}</h3>
                    <p className="text-xs text-acrovix-body mt-1">Enterprise-grade execution tailored to client specifications.</p>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>

          {/* Our Approach & Target Industries */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
            {/* Approach */}
            <GlassCard className="p-8 border-acrovix-teal-primary/20">
              <h3 className="text-xl font-bold text-acrovix-heading mb-4 flex items-center gap-2">
                <Compass className="w-5 h-5 text-acrovix-teal-primary" />
                <span>Delivery Approach</span>
              </h3>
              <ul className="space-y-3">
                {service.approach.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-acrovix-body">
                    <span className="w-5 h-5 rounded-full bg-acrovix-card text-acrovix-teal-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>

            {/* Target Industries */}
            <GlassCard className="p-8 border-acrovix-teal-primary/20">
              <h3 className="text-xl font-bold text-acrovix-heading mb-4">
                Primary Target Industries
              </h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {service.targetIndustries.map((ind, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-lg bg-acrovix-card border border-acrovix-teal-primary/20 text-acrovix-heading text-xs font-semibold"
                  >
                    {ind}
                  </span>
                ))}
              </div>
              <div className="pt-4 border-t border-acrovix-teal-primary/10">
                <p className="text-xs text-acrovix-muted mb-4">
                  Need a custom infrastructure or technology configuration for your industry?
                </p>
                <Link
                  to="/enquiry"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-acrovix-teal-primary hover:text-acrovix-teal-bright"
                >
                  <span>Request Custom Industry Solution</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </GlassCard>
          </div>
        </div>


      </main>
    </>
  );
};

export default ServiceDetail;
