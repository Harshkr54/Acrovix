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
          </div >
        </FloatingElement >
      </div >
    </div >
  );
};

const ServicesSection = () => {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden" id="services-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="inline-block py-1 px-3 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-widest shadow-sm mb-4">
            <span className="w-2 h-2 rounded-full inline-block bg-acrovix-teal-primary mr-2 mb-[1px]"></span>
            What we build
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-acrovix-navy dark:text-white tracking-tight leading-[1.2]">
            Solutions That <br className="md:hidden" /> Drive Growth
          </h2>
        </div>

        <div className="space-y-24 md:space-y-32 max-w-6xl mx-auto">
          {SERVICES_DATA.map((service, index) => {
            const isEven = index % 2 === 0;
            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center group`}
              >
                {/* Content Side */}
                <div className={`space-y-6 ${!isEven ? 'lg:order-2' : ''}`}>
                  <div className="text-5xl font-black text-slate-100 dark:text-slate-800/80 transition-colors tracking-tighter">
                    0{index + 1}
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold text-acrovix-navy dark:text-white group-hover:text-acrovix-teal-primary transition-colors leading-[1.2]">
                    {service.title}
                  </h3>
                  <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    {service.longDescription}
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 pt-4 pb-6">
                    {service.capabilities.slice(0, 4).map((cap, i) => (
                      <li key={i} className="flex items-center text-sm font-medium text-slate-600 dark:text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-acrovix-teal-primary mr-2.5"></span>
                        {cap}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={`/services/${service.slug}`}
                    className="inline-flex items-center gap-2 text-sm font-bold text-acrovix-navy dark:text-white hover:text-acrovix-teal-primary dark:hover:text-acrovix-teal-bright transition-colors bg-white dark:bg-slate-800 px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
                  >
                    <span>View Capabilities</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {/* Visual Side */}
                <div className={`h-[400px] w-full rounded-[2.5rem] p-1 bg-white/50 dark:bg-acrovix-card/50 shadow-sm border border-white dark:border-slate-700/50 backdrop-blur-sm transform transition-transform duration-500 group-hover:-translate-y-2 ${!isEven ? 'lg:order-1' : ''}`}>
                  <ServiceIllustration id={service.id} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
