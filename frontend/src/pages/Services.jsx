import React from 'react';
import SEO from '../components/SEO';
import Breadcrumb from '../components/Breadcrumb';
import SectionHeading from '../components/SectionHeading';
import ServiceCard from '../components/ServiceCard';

import { SERVICES_DATA } from '../data/services';
import { Layers } from 'lucide-react';

const Services = () => {
  return (
    <>
      <SEO
        title="Services & Capabilities | ACROVIX"
        description="Explore ACROVIX services: Enterprise IT Solutions and Cybersecurity & Observability."
      />
      <main className="pt-28 pb-16 bg-acrovix-bg min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: 'Services' }]} />

          {/* Hero Header */}
          <div className="py-12 md:py-16 text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase bg-acrovix-card border border-acrovix-teal-primary/20 text-acrovix-teal-primary mb-4">
              <Layers className="w-3.5 h-3.5" />
              SOLUTIONS OVERVIEW
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-acrovix-heading tracking-tight [word-spacing:0.18em] leading-[1.14] mb-4">
              Solutions That Drive Growth
            </h1>
            <p className="text-lg text-acrovix-body leading-relaxed">
              Full-spectrum engineering services designed to modernize technology stacks, secure sensitive data assets, and optimize enterprise cloud environments.
            </p>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-20">
            {SERVICES_DATA.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </div>


      </main>
    </>
  );
};

export default Services;
