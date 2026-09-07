import React, { useState, useEffect } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import SEO from '../components/SEO';
import Breadcrumb from '../components/Breadcrumb';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

import { PORTFOLIO_DATA } from '../data/portfolio';
import { FileText, CheckCircle2, Cpu, ArrowRight, Layers, Award, X, Maximize2 } from 'lucide-react';

const PortfolioDetail = () => {
  const { slug } = useParams();
  const [activeImage, setActiveImage] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveImage(null);
      }
    };
    if (activeImage) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeImage]);

  const caseStudy = PORTFOLIO_DATA.find((p) => p.slug === slug);

  if (!caseStudy) {
    return <Navigate to="/portfolio" replace />;
  }

  return (
    <>
      <SEO
        title={`${caseStudy.title} | Case Study`}
        description={caseStudy.shortDescription}
      />
      <main className="pt-28 pb-16 bg-acrovix-bg min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: 'Portfolio', path: '/portfolio' },
              { label: caseStudy.title }
            ]}
          />

          {/* Case Study Header */}
          <div className="py-10 md:py-14 border-b border-acrovix-teal-primary/16 mb-12">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="max-w-3xl space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-acrovix-teal-primary bg-acrovix-aqua-light px-3 py-1 rounded-md border border-acrovix-teal-primary/15">
                    {caseStudy.category}
                  </span>
                  <span className="text-xs font-semibold text-acrovix-muted bg-white dark:bg-[#142F3D] px-3 py-1 rounded-md border border-slate-200 dark:border-teal-500/20">
                    {caseStudy.badgeText}
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-acrovix-heading tracking-tight [word-spacing:0.18em] leading-[1.14]">
                  {caseStudy.title}
                </h1>
                <p className="text-base sm:text-lg text-acrovix-body leading-relaxed">
                  {caseStudy.overview}
                </p>
              </div>

              <div className="flex-shrink-0">
                <GlassCard className="p-6 border-acrovix-teal-primary/30 text-center" hoverEffect={false}>
                  <div className="text-xs font-bold text-acrovix-muted uppercase tracking-wider mb-2">Industry Sector</div>
                  <div className="text-base font-bold text-acrovix-heading mb-4">{caseStudy.industry}</div>
                  <Button to="/enquiry" variant="primary" size="md" className="w-full">
                    <span>Discuss Similar Requirement</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </GlassCard>
              </div>
            </div>
          </div>

          {/* Featured Case Study Visual */}
          {caseStudy.image && (
            <div
              onClick={() => setActiveImage({ src: caseStudy.image, caption: caseStudy.title, type: caseStudy.category })}
              className="h-64 sm:h-80 md:h-96 rounded-2xl overflow-hidden border border-acrovix-teal-primary/20 mb-12 shadow-sm relative group cursor-pointer"
            >
              <img
                src={caseStudy.image}
                alt={caseStudy.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-sm rounded-2xl backdrop-blur-[2px]">
                <Maximize2 className="w-5 h-5 text-acrovix-teal-bright" />
                <span>Click to view full image</span>
              </div>
            </div>
          )}

          {/* Requirement & Solution Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            <GlassCard className="p-8 border-acrovix-teal-primary/20">
              <h2 className="text-xl font-bold text-acrovix-heading mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-acrovix-teal-primary" />
                <span>Client Requirement</span>
              </h2>
              <p className="text-sm text-acrovix-body leading-relaxed">
                {caseStudy.clientRequirement}
              </p>
            </GlassCard>

            <GlassCard className="p-8 border-acrovix-teal-primary/20">
              <h2 className="text-xl font-bold text-acrovix-heading mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-acrovix-teal-primary" />
                <span>Our Solution</span>
              </h2>
              <p className="text-sm text-acrovix-body leading-relaxed">
                {caseStudy.solution}
              </p>
            </GlassCard>
          </div>

          {/* Delivered Services & Tech Stack */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
            <div className="lg:col-span-7">
              <GlassCard className="p-8 border-acrovix-teal-primary/20 h-full">
                <h2 className="text-xl font-bold text-acrovix-heading mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-acrovix-teal-primary" />
                  <span>Services Delivered</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {caseStudy.servicesDelivered.map((svc, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-semibold text-acrovix-heading bg-acrovix-card p-3 rounded-xl border border-acrovix-teal-primary/15">
                      <CheckCircle2 className="w-4 h-4 text-acrovix-teal-primary flex-shrink-0" />
                      <span>{svc}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>

            <div className="lg:col-span-5">
              <GlassCard className="p-8 border-acrovix-teal-primary/20 h-full">
                <h2 className="text-xl font-bold text-acrovix-heading mb-4 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-acrovix-teal-primary" />
                  <span>Technology Stack</span>
                </h2>
                <div className="flex flex-wrap gap-2">
                  {caseStudy.technology.map((tech, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#142F3D] border border-acrovix-teal-primary/20 dark:border-teal-500/20 text-acrovix-heading text-xs font-semibold shadow-sm">
                      {tech}
                    </span>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Implementation & Outcome */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            <GlassCard className="p-8 border-acrovix-teal-primary/20">
              <h2 className="text-xl font-bold text-acrovix-heading mb-3">
                Implementation Details
              </h2>
              <p className="text-sm text-acrovix-body leading-relaxed">
                {caseStudy.implementation}
              </p>
            </GlassCard>

            <GlassCard className="p-8 border-acrovix-teal-primary/30 bg-acrovix-card dark:bg-[#102936]" glow>
              <h2 className="text-xl font-bold text-acrovix-heading mb-3 flex items-center gap-2">
                <Award className="w-5 h-5 text-acrovix-teal-primary" />
                <span>Operational Outcome</span>
              </h2>
              <p className="text-sm font-medium text-acrovix-heading leading-relaxed">
                {caseStudy.outcome}
              </p>
            </GlassCard>
          </div>

          {/* Architecture & Diagram Gallery */}
          <div className="mb-20">
            <h2 className="text-2xl font-bold text-acrovix-heading mb-6">
              Architecture & Diagram Gallery
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {caseStudy.gallery.map((g, i) => (
                <GlassCard key={i} className="p-5 border-acrovix-teal-primary/20 group hover:border-acrovix-teal-primary/40 transition-all flex flex-col justify-between">
                  <div
                    onClick={() => g.image && setActiveImage({ src: g.image, caption: g.caption, type: g.type })}
                    className="rounded-xl overflow-hidden border border-acrovix-teal-primary/16 mb-4 bg-acrovix-card shadow-sm h-64 sm:h-72 flex items-center justify-center p-1 relative group cursor-pointer"
                  >
                    {g.image ? (
                      <>
                        <img
                          src={g.image}
                          alt={g.caption}
                          className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs rounded-lg backdrop-blur-[2px]">
                          <Maximize2 className="w-4 h-4 text-acrovix-teal-bright" />
                          <span>Click to enlarge diagram</span>
                        </div>
                      </>
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-acrovix-card border border-acrovix-teal-primary/20 flex items-center justify-center mx-auto text-acrovix-teal-primary">
                        <FileText className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <h3 className="text-sm sm:text-base font-bold text-acrovix-heading group-hover:text-acrovix-teal-primary transition-colors">
                      {g.caption}
                    </h3>
                    <span className="text-[10px] font-semibold text-acrovix-teal-primary uppercase tracking-wider bg-acrovix-aqua-light px-2.5 py-1 rounded-md border border-acrovix-teal-primary/15 flex-shrink-0">
                      {g.type}
                    </span>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>

        {/* Lightbox Image Modal */}
        {activeImage && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 md:p-10 animate-fadeIn"
            onClick={() => setActiveImage(null)}
          >
            <div
              className="relative max-w-5xl max-h-[92vh] w-full bg-slate-900 border border-slate-700/60 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Transparent Cross Close Button */}
              <button
                onClick={() => setActiveImage(null)}
                className="absolute top-4 right-4 z-20 w-11 h-11 rounded-full bg-black/40 hover:bg-black/80 text-white/90 hover:text-white flex items-center justify-center border border-white/20 backdrop-blur-md transition-all shadow-lg hover:scale-105"
                title="Close image"
                aria-label="Close image"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Enlarged Image Display */}
              <div className="p-3 sm:p-6 flex items-center justify-center max-h-[80vh] overflow-hidden bg-black/50">
                <img
                  src={activeImage.src}
                  alt={activeImage.caption || "Enlarged Visual"}
                  className="max-w-full max-h-[74vh] object-contain rounded-lg shadow-2xl"
                />
              </div>

              {/* Modal Footer Bar */}
              {activeImage.caption && (
                <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-4">
                  <span className="text-sm sm:text-base font-bold text-white">
                    {activeImage.caption}
                  </span>
                  {activeImage.type && (
                    <span className="text-xs font-bold text-acrovix-teal-primary uppercase tracking-wider bg-acrovix-teal-primary/10 px-3 py-1 rounded-md border border-acrovix-teal-primary/30 flex-shrink-0">
                      {activeImage.type}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}


      </main>
    </>
  );
};

export default PortfolioDetail;
