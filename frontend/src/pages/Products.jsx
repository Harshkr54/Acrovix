import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  PRODUCTS_DATA, 
  PRODUCT_CATEGORIES 
} from '../data/products';
import { 
  ArrowRight, 
  RotateCcw, 
  CheckCircle2, 
  Layers, 
  ShieldCheck, 
  ChevronRight
} from 'lucide-react';

// Specialized SVG Vendor Logo Renderer for crisp visual fidelity and authentic branding
const VendorLogo = ({ vendor, logoText }) => {
  switch (vendor) {
    case 'Accops':
      return (
        <div className="flex items-center gap-2 font-bold tracking-tight text-xl text-slate-800">
          <div className="w-4 h-6 bg-gradient-to-br from-amber-500 to-orange-600 rounded-sm transform -skew-x-12" />
          <span className="text-slate-900 font-extrabold text-2xl tracking-tighter">
            acc<span className="text-slate-700">ops</span>
          </span>
        </div>
      );

    case 'Cloudian':
      return (
        <div className="flex items-center gap-2 text-slate-800 font-bold">
          <svg className="w-7 h-7 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1" strokeLinecap="round" />
            <circle cx="12" cy="12" r="4" fill="currentColor" className="text-sky-500" />
          </svg>
          <span className="text-xl font-extrabold tracking-widest text-slate-900">CLOUDIAN</span>
        </div>
      );

    case 'Infortrend':
      return (
        <div className="flex items-center gap-1.5 font-bold">
          <div className="w-5 h-5 rounded-full border-4 border-sky-500 border-t-teal-600 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-sky-600 rounded-full" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-sky-600">Infortrend</span>
        </div>
      );

    case 'VAST Data':
      return (
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 2 22 22 22" fill="none" stroke="currentColor" strokeWidth="3" />
            <polygon points="12 8 6 18 18 18" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <span className="text-xl font-extrabold tracking-wider text-slate-900">VAST</span>
        </div>
      );

    case 'Supermicro':
      return (
        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 bg-emerald-700 text-white font-extrabold text-xs tracking-wider rounded-sm uppercase">
            SUPERMICRO
          </div>
          <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse" />
        </div>
      );

    case 'DDN':
      return (
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-orange-600 flex items-center justify-center text-white text-[10px] font-bold">
            ddn
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-900">ddn</span>
        </div>
      );

    case 'Commvault':
      return (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-purple-600 rotate-45 flex items-center justify-center">
            <div className="w-2 h-2 bg-purple-600" />
          </div>
          <span className="text-xl font-bold tracking-tight text-purple-950">Commvault</span>
        </div>
      );

    case 'Carbonite (OpenText)':
      return (
        <div className="flex flex-col items-start leading-none">
          <span className="text-lg font-black tracking-wider text-sky-900">CARBONITE</span>
          <span className="text-[10px] font-medium tracking-widest text-slate-500 uppercase">by openText</span>
        </div>
      );

    case 'Druva':
      return (
        <div className="flex items-center gap-1.5 font-bold">
          <span className="text-2xl font-extrabold tracking-tight text-amber-500">druva</span>
          <div className="w-2 h-2 bg-teal-500 rounded-full" />
        </div>
      );

    case 'ExaGrid':
      return (
        <div className="flex items-center gap-1">
          <span className="text-xl font-black italic tracking-tighter text-teal-700">EXA</span>
          <span className="text-xl font-light italic tracking-tight text-sky-600">GRID</span>
        </div>
      );

    case 'Kaspersky':
      return (
        <div className="flex items-center gap-2">
          <span className="text-xl font-extrabold tracking-widest text-teal-800 uppercase">KASPERSKY</span>
        </div>
      );

    case 'Safetica':
      return (
        <div className="flex items-center gap-1 font-bold">
          <span className="text-2xl font-black tracking-tight text-sky-500">safetica</span>
        </div>
      );

    case 'ESET':
      return (
        <div className="px-3 py-1 bg-teal-900 text-teal-300 font-extrabold text-lg tracking-widest rounded-md">
          eset
        </div>
      );

    case 'SonicWall':
      return (
        <div className="flex items-center gap-1">
          <span className="text-xl font-black tracking-tight text-slate-800">SONICWALL</span>
          <div className="w-2 h-4 bg-amber-500 transform skew-x-12" />
        </div>
      );

    case 'AppSentinels.ai':
      return (
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-amber-600" />
          <span className="text-lg font-bold tracking-tight text-slate-900">AppSentinels<span className="text-amber-600">.ai</span></span>
        </div>
      );

    case 'Seclore':
      return (
        <div className="flex items-center gap-2">
          <span className="text-xl font-black tracking-widest text-rose-600 uppercase">SECLORE</span>
        </div>
      );

    case 'LogMeIn':
      return (
        <div className="flex items-center font-extrabold tracking-tight text-2xl text-slate-900">
          <span>LogMe</span>
          <span className="bg-yellow-400 text-slate-900 px-1.5 py-0.5 rounded-xs ml-0.5">In</span>
        </div>
      );

    case 'GoTo':
    case 'GoTo (LogMeIn)':
      return (
        <div className="flex items-center gap-1">
          <span className="px-2.5 py-0.5 bg-yellow-400 text-slate-900 font-extrabold text-xl tracking-tight rounded-sm">
            GoTo
          </span>
        </div>
      );

    case 'TeamViewer':
      return (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
            ↔
          </div>
          <span className="text-xl font-bold tracking-tight text-blue-900">TeamViewer</span>
        </div>
      );

    case 'DocuSign':
      return (
        <div className="flex items-center gap-2">
          <span className="text-xl font-extrabold tracking-tight text-slate-900">Docu<span className="text-amber-500">Sign</span></span>
        </div>
      );

    case 'Yotta':
      return (
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-indigo-600 flex items-center justify-center transform rotate-45">
            <div className="w-1.5 h-1.5 bg-indigo-600" />
          </div>
          <span className="text-xl font-extrabold tracking-widest text-indigo-950">YOTTA</span>
        </div>
      );

    case 'EDB (EnterpriseDB)':
      return (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full border-2 border-teal-600 flex items-center justify-center text-teal-600 font-bold text-xs">
            EDB
          </div>
          <span className="text-xl font-extrabold tracking-tight text-teal-900">EDB Postgres</span>
        </div>
      );

    case 'BeyondTrust':
      return (
        <div className="flex items-center gap-2">
          <div className="w-5 h-6 bg-gradient-to-b from-orange-500 to-red-600 rounded-xs flex items-center justify-center text-white text-[10px] font-extrabold">
            BT
          </div>
          <span className="text-xl font-extrabold tracking-tight text-slate-900">BeyondTrust</span>
        </div>
      );

    case 'Thales':
      return (
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-[0.25em] text-blue-900 uppercase">THALES</span>
        </div>
      );

    case 'Vertiv':
      return (
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-slate-800 rotate-45 flex items-center justify-center">
            <div className="w-2 h-2 bg-slate-800" />
          </div>
          <span className="text-xl font-black tracking-widest text-slate-900 uppercase">VERTIV</span>
        </div>
      );

    case 'Jamf':
      return (
        <div className="flex items-center gap-1.5 font-bold">
          <div className="w-5 h-5 bg-indigo-600 rounded-xs flex items-center justify-center text-white text-[11px] font-black italic">
            j
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-900">jamf</span>
        </div>
      );

    case 'OpenText Security':
      return (
        <div className="flex items-center gap-1 font-bold">
          <span className="text-xl font-black tracking-wider text-[#002D62]">open</span>
          <span className="text-xl font-black tracking-wider text-[#00A3E0]">text</span>
        </div>
      );

    case 'One Identity (Quest)':
      return (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full border-2 border-sky-500 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-sky-500" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-base font-extrabold tracking-tight text-slate-900">ONE IDENTITY</span>
            <span className="text-[9px] text-slate-500 font-medium tracking-widest uppercase">by Quest</span>
          </div>
        </div>
      );

    case 'Quest':
      return (
        <div className="flex items-center gap-1">
          <span className="text-2xl font-black tracking-tight text-orange-600">Quest</span>
        </div>
      );

    default:
      return (
        <div className="flex items-center gap-2">
          <Layers className="w-6 h-6 text-teal-600" />
          <span className="text-lg font-bold text-slate-800">{logoText || vendor}</span>
        </div>
      );
  }
};

const Products = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [flippedCardId, setFlippedCardId] = useState(null);

  // Filter products based on selected category
  const filteredProducts = selectedCategory === 'All'
    ? PRODUCTS_DATA
    : PRODUCTS_DATA.filter(item => item.category === selectedCategory);

  const handleCardClick = (id) => {
    setFlippedCardId(prev => (prev === id ? null : id));
  };

  const handleKeyDown = (e, id) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick(id);
    }
  };

  return (
    <div className="min-h-screen bg-acrovix-bg pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      {/* Container */}
      <div className="max-w-7xl mx-auto">
        
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-acrovix-teal-primary font-semibold text-xs sm:text-sm tracking-wider uppercase mb-4">
            <Layers className="w-4 h-4 text-acrovix-teal-bright" />
            <span>PRODUCTS &amp; TECHNOLOGY ECOSYSTEM</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-acrovix-heading tracking-tight mb-4 leading-tight">
            Technology Solutions Built for Enterprise Needs
          </h1>

          <p className="text-base sm:text-lg text-acrovix-body leading-relaxed max-w-2xl mx-auto">
            Explore technology products and solution capabilities that help organizations strengthen infrastructure, security, productivity, and operational resilience.
          </p>
        </div>

        {/* Category Filter Bar with Custom Modern Teal Scrollbar (No Arrows) */}
        <div className="mb-10 custom-scrollbar-x pb-3.5">
          <div className="flex items-center justify-start lg:justify-center gap-2.5 min-w-max px-1">
            {PRODUCT_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setFlippedCardId(null);
                  }}
                  className={`px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-acrovix-teal-primary text-white shadow-none'
                      : 'bg-acrovix-card/80 hover:bg-acrovix-card text-acrovix-body hover:text-acrovix-heading border border-acrovix-teal-primary/15 shadow-none'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between mb-8 px-2">
          <p className="text-sm font-medium text-acrovix-muted">
            Showing <span className="text-acrovix-heading font-semibold">{filteredProducts.length}</span> Enterprise Solutions
            {selectedCategory !== 'All' && <span> in <span className="text-acrovix-teal-primary font-semibold">{selectedCategory}</span></span>}
          </p>
          <span className="text-xs text-acrovix-muted hidden sm:inline-block">
            💡 Click any product card to flip and view key capabilities
          </span>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {filteredProducts.map((product) => {
            const isHovered = hoveredCardId === product.id;
            const isFlipped = flippedCardId === product.id;
            const isAnyHovered = hoveredCardId !== null;

            // Strict Hover & Flipped Card Class Isolation logic
            let containerStateClasses = 'transition-all duration-300 transform rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-acrovix-teal-primary focus-visible:ring-offset-2';

            if (isFlipped) {
              // Flipped card MUST ALWAYS remain 100% visible, opaque, sharp HD, and on top of other cards
              containerStateClasses += ' z-30 opacity-100 filter-none lg:scale-[1.01] shadow-xl shadow-teal-900/15';
            } else if (isHovered) {
              containerStateClasses += ' z-20 opacity-100 filter-none lg:scale-[1.02] shadow-xl shadow-teal-900/10';
            } else if (isAnyHovered) {
              containerStateClasses += ' z-10 lg:opacity-70 lg:blur-[1px] lg:scale-[0.99]';
            } else {
              containerStateClasses += ' z-10 opacity-100 filter-none scale-100';
            }

            return (
              <div
                key={product.id}
                onMouseEnter={() => setHoveredCardId(product.id)}
                onMouseLeave={() => setHoveredCardId(null)}
                tabIndex={0}
                role="button"
                aria-label={`Product card for ${product.name}. ${isFlipped ? 'Flipped. Press enter to flip back.' : 'Press enter to view key capabilities.'}`}
                aria-expanded={isFlipped}
                onKeyDown={(e) => handleKeyDown(e, product.id)}
                onClick={() => handleCardClick(product.id)}
                className={`perspective-1000 cursor-pointer ${containerStateClasses}`}
              >
                {/* Card 3D Flip Container */}
                <div
                  className={`relative w-full h-[390px] sm:h-[410px] transform-style-3d transition-transform duration-600 ease-in-out rounded-2xl ${
                    isFlipped ? 'rotate-y-180' : ''
                  }`}
                >
                  {/* FRONT SIDE (Solid Glass Surface) */}
                  <div className="absolute inset-0 w-full h-full bg-white dark:bg-acrovix-card rounded-2xl border border-teal-500/20 dark:border-acrovix-teal-primary/30 p-6 sm:p-7 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow backface-hidden hd-text">
                    <div>
                      {/* Top Bar: Category Badge */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide border ${product.badgeColor || 'bg-teal-500/10 text-acrovix-teal-primary border-teal-500/20'}`}>
                          {product.category}
                        </span>
                        <span className="text-[11px] font-medium text-acrovix-muted flex items-center gap-1">
                          <RotateCcw className="w-3 h-3 text-acrovix-teal-bright" /> Flip
                        </span>
                      </div>

                      {/* Vendor Logo Area (High contrast container for SVG logos in both themes) */}
                      <div className="h-20 w-full bg-white/95 dark:bg-white/95 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-center p-2.5 mb-4 group-hover:border-acrovix-teal-primary/40 transition-colors overflow-hidden">
                        {(product.logo || product.logoImage) ? (
                          <img
                            src={product.logo || product.logoImage}
                            alt={`${product.vendor} logo`}
                            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                            loading="eager"
                          />
                        ) : (
                          <VendorLogo vendor={product.vendor} logoText={product.logoText} />
                        )}
                      </div>

                      {/* Product Name */}
                      <h3 className="text-lg font-semibold text-acrovix-heading mb-2 line-clamp-1 group-hover:text-acrovix-teal-primary transition-colors">
                        {product.name}
                      </h3>

                      {/* Short Description */}
                      <p className="text-xs sm:text-sm text-acrovix-body leading-relaxed line-clamp-3">
                        {product.shortDescription}
                      </p>
                    </div>

                    {/* Card Footer Indicator */}
                    <div className="pt-4 border-t border-acrovix-teal-primary/15 flex items-center justify-between text-acrovix-teal-primary font-medium text-xs sm:text-sm">
                      <span className="flex items-center gap-1 group-hover:underline">
                        View Details
                      </span>
                      <div className="w-7 h-7 rounded-full bg-acrovix-card dark:bg-acrovix-aqua-light flex items-center justify-center group-hover:bg-acrovix-teal-primary group-hover:text-white transition-all">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  {/* BACK SIDE (Premium Surface — Soft Glass, HD Crisp Typography) */}
                  <div className="absolute inset-0 w-full h-full bg-[#EBF7F5] dark:bg-[#102936] rounded-2xl p-6 sm:p-7 flex flex-col justify-between shadow-lg rotate-y-180 backface-hidden border border-teal-500/30 hd-text">
                    <div className="flex flex-col h-full justify-between">
                      {/* Back Header */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          {(product.logo || product.logoImage) ? (
                            <div className="h-8 sm:h-9 px-2 py-1 bg-white/90 rounded-md border border-slate-200/60 inline-flex items-center">
                              <img
                                src={product.logo || product.logoImage}
                                alt={product.vendor}
                                className="h-full w-auto max-w-[130px] object-contain"
                              />
                            </div>
                          ) : (
                            <span className="text-[11px] font-bold uppercase tracking-wide text-acrovix-teal-primary px-2.5 py-1 rounded-md bg-teal-500/10 border border-teal-500/20">
                              {product.vendor}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCardClick(product.id);
                            }}
                            className="text-acrovix-muted hover:text-acrovix-teal-primary text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-acrovix-teal-primary" /> Back
                          </button>
                        </div>

                        <h4 className="text-base sm:text-lg font-bold text-acrovix-heading mb-1.5 leading-snug tracking-tight">
                          {product.name}
                        </h4>

                        <div className="w-12 h-1 bg-acrovix-teal-primary rounded-full mb-3" />

                        <p className="text-[11px] font-black uppercase tracking-wider text-acrovix-teal-primary mb-2">
                          KEY CAPABILITIES
                        </p>
                      </div>

                      {/* Capabilities Bullet Points (Custom Teal Scrollbar, HD Text, No Arrows) */}
                      <div className="custom-scrollbar-y my-1.5 pr-2.5 flex-1 min-h-0 overflow-y-auto">
                        <ul className="space-y-2.5">
                          {product.capabilities.map((cap, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-acrovix-heading font-medium leading-relaxed">
                              <CheckCircle2 className="w-4 h-4 text-acrovix-teal-primary shrink-0 mt-0.5" />
                              <span className="hd-text">{cap}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Back Footer */}
                      <div className="pt-3 border-t border-teal-500/20 flex items-center justify-between text-xs text-acrovix-body font-medium shrink-0">
                        <span className="text-[11px] text-acrovix-muted">
                          Click card to return
                        </span>
                        <span className="text-[11px] text-acrovix-teal-primary font-bold">Acrovix Hub</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Call to Action Section */}
        <div className="mt-16 sm:mt-20 bg-[#102A43] dark:bg-[#05111A] text-white rounded-3xl p-8 sm:p-12 border border-teal-500/30 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-acrovix-teal-bright/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl text-center md:text-left">
              <span className="text-xs font-bold uppercase tracking-widest text-acrovix-teal-bright px-3 py-1 bg-teal-950/60 rounded-full border border-teal-500/30 inline-block mb-3">
                INTEGRATED DEPLOYMENT &amp; CONSULTING
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-3 tracking-tight">
                Need Architectural Guidance or Product Integration?
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Acrovix team assists enterprise organizations with end-to-end strategy, sizing, deployment, and operational management across our entire technology product ecosystem.
              </p>
            </div>
            <div className="shrink-0">
              <Link
                to="/enquiry"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-acrovix-teal-primary hover:bg-acrovix-teal-bright text-white font-semibold text-sm sm:text-base transition-all cursor-pointer shadow-none"
              >
                <span>Request Enterprise Consultation</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Products;
