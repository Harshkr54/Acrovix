import React from 'react';
import SEO from '../components/SEO';
import Breadcrumb from '../components/Breadcrumb';
import SectionHeading from '../components/SectionHeading';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

import { COMPANY_INFO } from '../data/company';
import { Mail, Globe, Phone, MapPin, ArrowRight, ShieldCheck } from 'lucide-react';

const Contact = () => {
  return (
    <>
      <SEO
        title="Contact Us | ACROVIX INNOVATIONS PRIVATE LIMITED"
        description="Get in touch with ACROVIX INNOVATIONS PRIVATE LIMITED for technology, cybersecurity, and infrastructure enquiries."
      />
      <main className="pt-28 pb-16 bg-acrovix-bg min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: 'Contact Us' }]} />

          {/* Hero Header */}
          <div className="py-12 md:py-16 text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase bg-acrovix-card border border-acrovix-teal-primary/20 text-acrovix-teal-primary mb-4">
              <Mail className="w-3.5 h-3.5" />
              COMMUNICATION CHANNEL
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-acrovix-heading tracking-tight [word-spacing:0.18em] leading-[1.14] mb-4">
              Contact ACROVIX
            </h1>
            <p className="text-lg text-acrovix-body leading-relaxed">
              We welcome strategic technology partnerships and enterprise consulting requests.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-20">
            {/* Contact Details Grid */}
            <div className="lg:col-span-6 space-y-6">
              <GlassCard className="p-6 sm:p-8 border-acrovix-teal-primary/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-acrovix-card border border-acrovix-teal-primary/20 flex items-center justify-center text-acrovix-teal-primary flex-shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-acrovix-heading">Corporate Entity</h2>
                    <p className="text-xs font-bold text-acrovix-teal-primary">{COMPANY_INFO.name}</p>
                  </div>
                </div>

                <div className="space-y-5 border-t border-acrovix-teal-primary/10 pt-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-acrovix-card border border-acrovix-teal-primary/20 flex items-center justify-center text-acrovix-teal-primary flex-shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <a href={`mailto:${COMPANY_INFO.contact.email}`} target="_blank" rel="noopener noreferrer" className="text-sm sm:text-base font-bold text-acrovix-heading hover:text-acrovix-teal-primary transition-colors break-all sm:break-normal">
                      {COMPANY_INFO.contact.email}
                    </a>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-acrovix-card border border-acrovix-teal-primary/20 flex items-center justify-center text-acrovix-teal-primary flex-shrink-0">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div className="text-sm sm:text-base font-bold text-acrovix-heading break-all sm:break-normal">
                      {COMPANY_INFO.contact.website}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-acrovix-card border border-acrovix-teal-primary/20 flex items-center justify-center text-acrovix-teal-primary flex-shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div className="text-sm font-semibold text-acrovix-body">
                      {COMPANY_INFO.contact.phone}
                    </div>
                  </div>


                </div>
              </GlassCard>

              {/* Action Banner */}
              <GlassCard className="p-8 border-acrovix-teal-primary/30 text-center bg-acrovix-card dark:bg-[#102936]" glow>
                <h3 className="text-xl font-bold text-acrovix-heading mb-2">
                  Have a Project Requirement?
                </h3>
                <p className="text-xs text-acrovix-body mb-6">
                  Submit a detailed project enquiry for enterprise IT or cybersecurity observability.
                </p>
                <Button to="/enquiry" variant="primary" size="lg" className="w-full">
                  <span>Submit Online Enquiry</span>
                  <ArrowRight className="w-5 h-5 ml-1" />
                </Button>
              </GlassCard>
            </div>

            {/* Map & Office Representation Placeholder */}
            <div className="lg:col-span-6">
              <GlassCard className="p-8 border-acrovix-teal-primary/20 h-full flex flex-col justify-between" hoverEffect={false}>
                <div>
                  <h3 className="text-xl font-bold text-acrovix-heading mb-3">
                    Corporate Operations & Presence
                  </h3>
                  <p className="text-sm text-acrovix-body leading-relaxed mb-6">
                    Our team provides centralized project management, remote infrastructure monitoring, and field execution supervision across strategic project locations.
                  </p>

                  <div className="space-y-5">
                    {/* Bengaluru Office */}
                    <div className="group rounded-2xl bg-acrovix-card dark:bg-[#102936] border border-acrovix-teal-primary/20 p-5 sm:p-6 flex items-start gap-4 hover:border-acrovix-teal-primary/40 transition-colors duration-300">
                      <div className="w-12 h-12 rounded-xl bg-acrovix-bg border border-acrovix-teal-primary/10 flex items-center justify-center text-acrovix-teal-primary flex-shrink-0 shadow-sm">
                        <MapPin className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base sm:text-lg font-bold text-acrovix-heading mb-1.5">Bengaluru Office</h4>
                        <p className="text-sm text-acrovix-body leading-relaxed">
                          Kengeri Satellite Town,<br />
                          Bengaluru, Karnataka, India
                        </p>
                      </div>
                    </div>

                    {/* Bihar Office */}
                    <div className="group rounded-2xl bg-acrovix-card dark:bg-[#102936] border border-acrovix-teal-primary/20 p-5 sm:p-6 flex items-start gap-4 hover:border-acrovix-teal-primary/40 transition-colors duration-300">
                      <div className="w-12 h-12 rounded-xl bg-acrovix-bg border border-acrovix-teal-primary/10 flex items-center justify-center text-acrovix-teal-primary flex-shrink-0 shadow-sm">
                        <MapPin className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base sm:text-lg font-bold text-acrovix-heading mb-1.5">Bihar Office</h4>
                        <p className="text-sm text-acrovix-body leading-relaxed">
                          Near Mahadev Singh College,<br />
                          Sarai, Bhagalpur, Bihar, India
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-acrovix-teal-primary/10 text-xs text-acrovix-muted text-center">
                  Business Hours: Monday – Friday (9:00 AM – 6:00 PM IST)
                </div>
              </GlassCard>
            </div>
          </div>
        </div>


      </main>
    </>
  );
};

export default Contact;
