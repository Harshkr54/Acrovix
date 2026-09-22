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
duration = { duration }
className = "w-full"
  >
  <Link
    to={`/industries/${industry.slug}`}
    className="block h-full group bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-3xl p-8 shadow-sm border border-white dark:border-slate-700/50 hover:shadow-float hover:bg-white dark:hover:bg-slate-800 hover:-translate-y-2 transition-all duration-300 relative overflow-hidden"
  >
    <IndustryIllustration index={index} />

    <div className="relative z-10">
      <div className="w-14 h-14 rounded-2xl bg-acrovix-light-blue dark:bg-slate-900 flex items-center justify-center text-acrovix-blue dark:text-slate-400 mb-8 group-hover:scale-110 group-hover:bg-acrovix-teal-primary group-hover:text-white transition-all duration-300 border border-white dark:border-slate-700 shadow-sm">
        <IconComponent className="w-7 h-7" />
      </div>

      <h3 className="text-xl font-bold text-acrovix-navy dark:text-white mb-3 group-hover:text-acrovix-teal-primary transition-colors">
        {industry.title}
      </h3>

      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
        {industry.shortDescription}
      </p>
    </div>
  </Link>
                </FloatingElement >
              );
            })}
          </div >
        </div >
      </div >
    </section >
  );
};

export default IndustriesSection;
