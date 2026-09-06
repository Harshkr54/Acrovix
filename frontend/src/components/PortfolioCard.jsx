import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle } from 'lucide-react';
import GlassCard from './GlassCard';

const PortfolioCard = ({ item }) => {
  return (
    <GlassCard className="flex flex-col justify-between h-full group border-acrovix-teal-primary/20 hover:border-acrovix-teal-primary/40">
      <div>
        {/* Header Tags */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-acrovix-teal-primary bg-acrovix-aqua-light px-2.5 py-1 rounded-md border border-acrovix-teal-primary/15">
            {item.category}
          </span>
          <span className="text-[11px] font-medium text-acrovix-muted bg-acrovix-card/60 dark:bg-[#142F3D]/80 px-2.5 py-1 rounded-md border border-acrovix-teal-primary/20">
            {item.badgeText || "Sample Case Study"}
          </span>
        </div>

        {/* Visual Header Image Container */}
        <div className="h-40 rounded-xl border border-acrovix-teal-primary/16 mb-5 relative overflow-hidden bg-acrovix-card shadow-sm">
          {item.image && (
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          )}
          <div className="absolute bottom-3 left-3 text-[11px] font-bold text-acrovix-heading bg-acrovix-bg/90 dark:bg-[#102936]/90 backdrop-blur-sm px-2.5 py-0.5 rounded border border-acrovix-teal-primary/10 shadow-sm z-10">
            Industry: {item.industry}
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-xl font-bold text-acrovix-heading mb-3 group-hover:text-acrovix-teal-primary transition-colors">
          {item.title}
        </h3>
        <p className="text-sm text-acrovix-body leading-relaxed mb-6">
          {item.shortDescription}
        </p>

        {/* Delivered Features List */}
        <div className="space-y-1.5 mb-6">
          {item.servicesDelivered.slice(0, 3).map((svc, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-acrovix-body">
              <CheckCircle className="w-3.5 h-3.5 text-acrovix-teal-primary flex-shrink-0" />
              <span className="truncate">{svc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Button */}
      <div className="pt-4 border-t border-acrovix-teal-primary/10">
        <Link
          to={`/portfolio/${item.slug}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-acrovix-teal-primary hover:text-acrovix-teal-bright group-hover:translate-x-1 transition-all"
        >
          <span>View Case Study</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </GlassCard>
  );
};

export default PortfolioCard;
