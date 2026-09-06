import React from 'react';
import { ArrowRight, Send, Mail } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

const CTASection = () => {
  return (
    <section className="py-16 md:py-24 bg-acrovix-bg-secondary relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <GlassCard
          className="p-8 sm:p-12 md:p-16 border-acrovix-teal-primary/30 relative overflow-hidden text-center bg-acrovix-card dark:bg-[#102936] shadow-2xl"
          glow
          hoverEffect={false}
        >
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-acrovix-teal-primary/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="max-w-3xl mx-auto space-y-6 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase bg-acrovix-teal-primary/10 border border-acrovix-teal-primary/20 text-acrovix-teal-primary">
              <Send className="w-3.5 h-3.5" />
              START A CONVERSATION
            </span>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-acrovix-heading tracking-tight leading-tight">
              Let's Build Something Together
            </h2>

            <p className="text-base sm:text-lg text-acrovix-body leading-relaxed max-w-xl mx-auto">
              Tell us about your technology, cybersecurity, infrastructure or business requirement. Our engineering team is ready to assist.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button to="/enquiry" variant="primary" size="lg" className="w-full sm:w-auto">
                <span>Send Enquiry</span>
                <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
              <Button to="/contact" variant="secondary" size="lg" className="w-full sm:w-auto">
                <Mail className="w-4 h-4 mr-1" />
                <span>Contact Us</span>
              </Button>
            </div>
          </div>
        </GlassCard>
      </div>
    </section>
  );
};

export default CTASection;
