import React from 'react';
import SectionHeading from '../components/SectionHeading';
import IndustryCard from '../components/IndustryCard';
import { INDUSTRIES_DATA } from '../data/industries';

const IndustriesSection = () => {
  return (
    <section className="py-20 md:py-28 bg-acrovix-bg-secondary relative overflow-hidden" id="industries-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <SectionHeading
          badge="SECTOR EXPERIENCE"
          title="Industries We Serve"
          subtitle="Specialized technology and infrastructure solutions engineered for the operational needs of major industries."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {INDUSTRIES_DATA.map((industry) => (
            <IndustryCard key={industry.id} industry={industry} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default IndustriesSection;
