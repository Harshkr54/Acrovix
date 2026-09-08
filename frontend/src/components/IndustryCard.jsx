import React from 'react';
import { Link } from 'react-router-dom';
import { Landmark, Activity, Building2, Tv, CloudCog, HardHat, Factory, ShoppingBag, ArrowRight } from 'lucide-react';
import GlassCard from './GlassCard';

const iconMap = {
  Landmark,
  Activity,
  Building2,
  Tv,
  CloudCog,
  HardHat,
  Factory,
  ShoppingBag,
};

const IndustryCard = ({ industry }) => {
  const IconComponent = iconMap[industry.iconName] || Building2;

  return (
    <GlassCard className="flex flex-col justify-between h-full group hover:border-acrovix-teal-primary/40 transition-all duration-300">
      <div>
        <div className="w-12 h-12 rounded-xl bg-acrovix-card border border-acrovix-teal-primary/20 flex items-center justify-center text-acrovix-teal-primary mb-5 group-hover:bg-acrovix-teal-primary group-hover:text-white transition-colors duration-300">
          <IconComponent className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-acrovix-heading mb-2 group-hover:text-acrovix-teal-primary transition-colors">
          {industry.title}
        </h3>
        <p className="text-sm text-acrovix-body leading-relaxed mb-4">
          {industry.shortDescription}
        </p>
      </div>

      <div className="pt-4 border-t border-acrovix-teal-primary/10">
        <Link
          to={`/industries/${industry.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-acrovix-teal-primary hover:text-acrovix-teal-bright group-hover:translate-x-1 transition-all"
        >
          <span>View Solutions</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </GlassCard>
  );
};

export default IndustryCard;
