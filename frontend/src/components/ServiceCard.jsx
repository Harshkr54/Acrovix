import React from 'react';
import { Link } from 'react-router-dom';
import { Cpu, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import GlassCard from './GlassCard';

const iconMap = {
  Cpu: Cpu,
  ShieldCheck: ShieldCheck,
};

const ServiceCard = ({ service }) => {
  const IconComponent = iconMap[service.iconName] || Cpu;
  const visibleCapabilities = service.capabilities ? service.capabilities.slice(0, 4) : [];

  return (
    <GlassCard className="flex flex-col h-full justify-between group border-acrovix-teal-primary/20 hover:border-acrovix-teal-primary/40">
      <div>
        {/* Category & Icon */}
        <div className="flex items-center justify-between mb-6">
          <div className="w-14 h-14 rounded-2xl bg-acrovix-card border border-acrovix-teal-primary/20 flex items-center justify-center text-acrovix-teal-primary group-hover:bg-acrovix-teal-primary group-hover:text-white transition-all duration-300 shadow-sm">
            <IconComponent className="w-7 h-7" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-acrovix-teal-primary px-3 py-1 bg-acrovix-aqua-light/60 rounded-full border border-acrovix-teal-primary/10">
            {service.category}
          </span>
        </div>

        {/* Service Title */}
        <h3 className="text-2xl font-bold text-acrovix-heading mb-3 group-hover:text-acrovix-teal-primary transition-colors">
          {service.title}
        </h3>

        {/* Short Description */}
        <p className="text-sm text-acrovix-body leading-relaxed mb-8">
          {service.shortDescription}
        </p>

        {/* Capability Preview */}
        <div className="space-y-3 mb-8 border-t border-acrovix-teal-primary/10 pt-6">
          <h4 className="text-xs font-bold text-acrovix-heading uppercase tracking-wider mb-2">
            Key Capabilities
          </h4>
          
          <div className="space-y-2.5">
            {visibleCapabilities.map((cap, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-sm text-acrovix-body">
                <CheckCircle2 className="w-4 h-4 text-acrovix-teal-primary flex-shrink-0 mt-0.5" />
                <span>{cap}</span>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* CTA Button */}
      <div className="pt-4 border-t border-acrovix-teal-primary/10">
        <Link
          to={`/services/${service.slug}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-acrovix-teal-primary hover:text-acrovix-teal-bright group-hover:translate-x-1 transition-all"
        >
          <span>Explore Services</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </GlassCard>
  );
};

export default ServiceCard;
