import React from 'react';
import SEO from '../components/SEO';
import Hero from '../sections/Hero';
import CapabilityStrip from '../sections/CapabilityStrip';
import StatsSection from '../sections/StatsSection';
import ServicesSection from '../sections/ServicesSection';
import AboutSection from '../sections/AboutSection';
import PhilosophySection from '../sections/PhilosophySection';
import IndustriesSection from '../sections/IndustriesSection';
import PortfolioSection from '../sections/PortfolioSection';
import InnovationSection from '../sections/InnovationSection';
import WhyAcrovixSection from '../sections/WhyAcrovixSection';

const Home = () => {
  return (
    <>
      <SEO
        title="ACROVIX — Technology, Cybersecurity & Infrastructure Solutions"
        description="ACROVIX INNOVATIONS PRIVATE LIMITED — Enterprise technology, cybersecurity, infrastructure and digital solutions designed to help organizations scale securely and efficiently."
        path="/"
        keywords="IT services company, IT solutions provider, cybersecurity company, managed IT services, enterprise IT infrastructure, cloud & DevOps services, IT company India"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "ACROVIX",
          "url": "https://acrovix.com",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://acrovix.com/services?query={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        }}
      />
      <main>
        <Hero />
        <CapabilityStrip />
        <StatsSection />
        <ServicesSection />
        <AboutSection />
        <PhilosophySection />
        <IndustriesSection />
        <PortfolioSection />
        <InnovationSection />
        <WhyAcrovixSection />

      </main>
    </>
  );
};

export default Home;
