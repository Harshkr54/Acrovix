import React from 'react';
import { Server, Shield, Layers, Cloud, GitMerge, Settings } from 'lucide-react';
import { CAPABILITY_STRIP_ITEMS } from '../data/services';

const iconMap = {
  Server,
  Shield,
  Layers,
  Cloud,
  GitMerge,
  Settings,
};

const CapabilityStrip = () => {
  return (
    <section className="py-6 bg-acrovix-bg/70 dark:bg-[#0A1B26]/80 backdrop-blur-md border-y border-acrovix-teal-primary/16 relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-6 md:gap-4">
          {CAPABILITY_STRIP_ITEMS.map((item, idx) => {
            const IconComp = iconMap[item.icon] || Server;
            return (
              <div
                key={idx}
                className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-acrovix-heading hover:text-acrovix-teal-primary transition-colors cursor-default"
              >
                <div className="w-8 h-8 rounded-lg bg-acrovix-card border border-acrovix-teal-primary/20 flex items-center justify-center text-acrovix-teal-primary flex-shrink-0">
                  <IconComp className="w-4 h-4" />
                </div>
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CapabilityStrip;
