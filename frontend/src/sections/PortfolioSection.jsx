import React from 'react';
import SectionHeading from '../components/SectionHeading';
import PortfolioCard from '../components/PortfolioCard';
import { PORTFOLIO_DATA } from '../data/portfolio';
import Button from '../components/Button';
import { ArrowRight } from 'lucide-react';

const PortfolioSection = () => {
  return (
    <section className="py-20 md:py-28 bg-acrovix-bg relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <SectionHeading
          badge="CASE STUDIES"
          title="Featured Portfolio Showcase"
          subtitle="Explore sample case studies demonstrating our capabilities across cloud observability, system integration, and DevOps."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
          {PORTFOLIO_DATA.map((item) => (
            <PortfolioCard key={item.id} item={item} />
          ))}
        </div>

        <div className="text-center">
          <Button to="/portfolio" variant="secondary" size="lg">
            <span>View All Case Studies</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PortfolioSection;
