import React from 'react';
import { ArrowRight, ShieldCheck, Server, Cpu, Database, Activity, Lock } from 'lucide-react';
import Button from '../components/Button';
import GlassCard from '../components/GlassCard';
import { COMPANY_INFO } from '../data/company';

const Hero = () => {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-acrovix-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Content */}
          <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-acrovix-card border border-acrovix-teal-primary/20 shadow-sm text-acrovix-teal-primary text-xs font-semibold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-acrovix-teal-bright animate-ping"></span>
              <span>Enterprise IT • Cybersecurity • Cloud Solutions</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[44px] font-semibold text-acrovix-heading tracking-tight [word-spacing:0.18em] leading-[1.14] max-w-xl mx-auto lg:mx-0">
              Engineering Growth Through <span className="text-acrovix-teal-primary">Technology</span> <br />
              <span className="text-acrovix-teal-primary">& Infrastructure</span>
            </h1>

            <p className="text-base sm:text-lg text-acrovix-body max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Enterprise technology, cybersecurity, infrastructure and digital solutions designed to help organizations scale securely and efficiently.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <Button to="/services" variant="primary" size="lg" className="w-full sm:w-auto">
                <span>Explore Services</span>
                <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
              <Button to="/enquiry" variant="secondary" size="lg" className="w-full sm:w-auto">
                <span>Talk to Us</span>
              </Button>
            </div>

            {/* Micro Highlights */}
            <div className="pt-8 mt-4 grid grid-cols-3 gap-4 border-t border-acrovix-teal-primary/16 max-w-md mx-auto lg:mx-0">
              <div>
                <span className="block text-lg font-bold text-acrovix-heading">SYNC</span>
                <span className="text-xs text-acrovix-muted">Integrated Systems</span>
              </div>
              <div>
                <span className="block text-lg font-bold text-acrovix-heading">SCALE</span>
                <span className="text-xs text-acrovix-muted">Resilient Cloud</span>
              </div>
              <div>
                <span className="block text-lg font-bold text-acrovix-heading">SUCCEED</span>
                <span className="text-xs text-acrovix-muted">Measurable Outcomes</span>
              </div>
            </div>
          </div>

          {/* Right Hero Graphic Visual */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Main Interactive Glass Node Graphic */}
              <GlassCard className="relative z-20 border-acrovix-teal-primary/30 p-8 shadow-2xl overflow-hidden" glow>
                <div className="flex items-center justify-between border-b border-acrovix-teal-primary/15 pb-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <span className="text-xs font-mono font-bold text-acrovix-teal-primary uppercase tracking-widest">
                    ACROVIX CORE API & INFRA
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Node 1 */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-acrovix-bg/90 dark:bg-[#102936]/90 border border-acrovix-teal-primary/20 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-acrovix-card text-acrovix-teal-primary">
                        <Server className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-acrovix-heading">Enterprise IT Architecture</div>
                        <div className="text-[11px] text-acrovix-muted">System Integration & DevOps</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span className="text-[10px] font-bold text-acrovix-muted uppercase tracking-wider">
                        ACTIVE
                      </span>
                    </div>
                  </div>

                  {/* Node 2 */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-acrovix-bg/90 dark:bg-[#102936]/90 border border-acrovix-teal-primary/20 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-acrovix-card text-acrovix-teal-primary">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-acrovix-heading">Cybersecurity & XDA</div>
                        <div className="text-[11px] text-acrovix-muted">Unified Observability & Data Armour</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                      <span className="text-[10px] font-bold text-acrovix-muted uppercase tracking-wider">
                        PROTECTED
                      </span>
                    </div>
                  </div>

                  {/* Node 3 */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-acrovix-bg/90 dark:bg-[#102936]/90 border border-acrovix-teal-primary/20 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-acrovix-card text-acrovix-teal-primary">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-acrovix-heading">Cloud & DevOps Solutions</div>
                        <div className="text-[11px] text-acrovix-muted">AWS, Azure & Hybrid Deployment</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                      <span className="text-[10px] font-bold text-acrovix-muted uppercase tracking-wider">
                        SCALED
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-acrovix-teal-primary/15 flex items-center justify-between text-xs text-acrovix-muted">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-acrovix-teal-primary animate-pulse" />
                    <span>Live Monitoring Engine</span>
                  </div>
                  <span className="font-mono text-acrovix-heading font-semibold">99.99% Uptime</span>
                </div>
              </GlassCard>

              {/* Floating Element 1 */}
              <div className="absolute -top-6 -left-6 z-30 hidden sm:block p-3 rounded-xl bg-acrovix-bg/95 dark:bg-[#142F3D]/95 backdrop-blur-md border border-acrovix-teal-primary/20 shadow-lg text-xs font-bold text-acrovix-heading animate-bounce">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-acrovix-teal-primary" />
                  <span>Zero-Trust Data Protection</span>
                </div>
              </div>

              {/* Floating Element 2 */}
              <div className="absolute -bottom-6 -right-6 z-30 hidden sm:block p-3 rounded-xl bg-acrovix-bg/95 dark:bg-[#142F3D]/95 backdrop-blur-md border border-acrovix-teal-primary/20 shadow-lg text-xs font-bold text-acrovix-heading">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-acrovix-teal-bright" />
                  <span>PostgreSQL & Cloud Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
