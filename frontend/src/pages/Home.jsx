import React from 'react';
import SEO from '../components/SEO';
import Hero from '../sections/Hero';
import CapabilityStrip from '../sections/CapabilityStrip';
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
      />
      <main>
        <Hero />
        <CapabilityStrip />
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
