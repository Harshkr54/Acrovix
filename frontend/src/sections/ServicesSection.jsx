import React from 'react';
import SectionHeading from '../components/SectionHeading';
import ServiceCard from '../components/ServiceCard';
import { SERVICES_DATA } from '../data/services';

const ServicesSection = () => {
  return (
    <section className="py-20 md:py-28 bg-acrovix-bg relative overflow-hidden" id="services-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <SectionHeading
          badge="OUR CAPABILITIES"
          title="Solutions That Drive Growth"
          subtitle="Integrated enterprise capabilities spanning digital technology, cloud architecture, and cybersecurity resilience."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {SERVICES_DATA.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
