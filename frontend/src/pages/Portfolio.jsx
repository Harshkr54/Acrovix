import React from 'react';
import SEO from '../components/SEO';
import Breadcrumb from '../components/Breadcrumb';
import SectionHeading from '../components/SectionHeading';
import PortfolioCard from '../components/PortfolioCard';

import { PORTFOLIO_DATA } from '../data/portfolio';
import { FileText } from 'lucide-react';

const Portfolio = () => {
  return (
    <>
      <SEO
        title="Portfolio & Case Studies | ACROVIX"
        description="Explore sample case studies demonstrating ACROVIX capabilities across cloud observability, system integration, and DevOps."
        path="/portfolio"
        keywords="ACROVIX case studies, IT project portfolio, cloud migration case study, cybersecurity implementation examples"
      />
      <main className="pt-28 pb-16 bg-acrovix-bg min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: 'Portfolio' }]} />

          {/* Hero Header */}
          <div className="py-12 md:py-16 text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase bg-acrovix-card border border-acrovix-teal-primary/20 text-acrovix-teal-primary mb-4">
              <FileText className="w-3.5 h-3.5" />
              CASE STUDY SHOWCASE
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-acrovix-heading tracking-tight [word-spacing:0.18em] leading-[1.14] mb-4">
              Featured Case Studies
            </h1>
            <p className="text-lg text-acrovix-body leading-relaxed">
              Explore sample architecture and project blueprints detailing client requirements, solutions delivered, tech stacks, and operational outcomes.
            </p>
          </div>

          {/* Portfolio Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-20">
            {PORTFOLIO_DATA.map((item) => (
              <PortfolioCard key={item.id} item={item} />
            ))}
          </div>
        </div>


      </main>
    </>
  );
};

export default Portfolio;
