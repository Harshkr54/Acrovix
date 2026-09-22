import React from 'react';
import { motion } from 'framer-motion';
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-7 space-y-5 text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-acrovix-card border border-acrovix-teal-primary/20 shadow-sm text-acrovix-teal-primary text-xs font-semibold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-acrovix-teal-bright animate-ping"></span>
              <span>Enterprise IT • Cybersecurity • Cloud Solutions</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-semibold text-acrovix-heading tracking-tight [word-spacing:0.18em] leading-[1.5] max-w-2xl mx-auto lg:mx-0">
              From Architecture to <br />
              <span className="text-acrovix-teal-primary">Security:</span> Complete <br />
              <span className="text-acrovix-teal-primary">Enterprise IT Solutions</span>
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
          </motion.div>

          {/* Right Hero Graphic Visual */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-5"
          >
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
              <div className="absolute -top-6 -left-6 z-30 hidden sm:block p-3 rounded-xl bg-acrovix-bg/95 dark:bg-[#142F3D]/95 backdrop-blur-md border border-acrovix-teal-primary/20 shadow-lg text-xs font-bold text-acrovix-heading">
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
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
                        
                        <circle cx="20" cy="25" r="2.5" fill="white" stroke="#2563EB" strokeWidth="2" />
                        <circle cx="70" cy="35" r="2.5" fill="white" stroke="#0D9488" strokeWidth="2" />
                        <circle cx="80" cy="10" r="2.5" fill="white" stroke="#2563EB" strokeWidth="2" />
                        
                        <defs>
                          <linearGradient id="gradientBlue" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#2563EB" />
                            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                          </linearGradient>
                          <linearGradient id="gradientTeal" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#0D9488" />
                            <stop offset="100%" stopColor="#0D9488" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                      </svg >
                    </div >

  {/* Metric Cards */ }
  < div className = "grid grid-cols-3 gap-4" >
                      <div className="bg-[#F9FAFB] dark:bg-slate-700/80 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-600 transition-transform hover:-translate-y-1 duration-300">
                        <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">System Status</div>
                        <div className="text-sm font-extrabold text-[#0D9488] mt-1.5">Active</div>
                      </div>
                      <div className="bg-[#F9FAFB] dark:bg-slate-700/80 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-600 transition-transform hover:-translate-y-1 duration-300">
                        <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Infrastructure</div>
                        <div className="text-sm font-extrabold text-[#2563EB] mt-1.5">Optimal</div>
                      </div>
                      <div className="bg-[#F9FAFB] dark:bg-slate-700/80 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-600 transition-transform hover:-translate-y-1 duration-300">
                        <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Security Layer</div>
                        <div className="text-sm font-extrabold text-[#0D9488] mt-1.5">Enabled</div>
                      </div>
                    </div >
                  </div >
                </div >
              </div >
            </FloatingElement >

  {/* Right Floating Card: Threat Protection */ }
  < FloatingElement
yOffset = {- 15}
duration = { 1.1}
delay = { 0.3}
className = "absolute top-[20%] right-[-10%] z-30"
  >
  <div className="bg-white dark:bg-slate-800 backdrop-blur-xl text-acrovix-navy dark:text-white shadow-[0_15px_40px_rgba(11,25,44,0.12)] rounded-[20px] py-4 px-6 flex items-center gap-4 border border-[#CCFBF1]/50 dark:border-slate-700">
    <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-[#0D9488] to-[#14B8A6] flex items-center justify-center shadow-md">
      <ShieldCheck className="w-6 h-6 text-white" />
    </div>
    <div>
      <div className="text-sm font-bold tracking-tight">Threat Protection</div>
      <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Always Active</div>
    </div>
    <div className="pl-4 opacity-20 flex gap-1">
      <div className="w-1.5 h-1.5 rounded-full bg-acrovix-navy dark:bg-white"></div>
      <div className="w-1.5 h-1.5 rounded-full bg-acrovix-navy dark:bg-white"></div>
      <div className="w-1.5 h-1.5 rounded-full bg-acrovix-navy dark:bg-white"></div>
    </div>
  </div>
            </FloatingElement >

  {/* Bottom Right Floating Card: API Integration */ }
  < FloatingElement
yOffset = { 10}
duration = { 0.9}
delay = { 0.4}
className = "absolute bottom-[5%] right-[-5%] z-30"
  >
  <div className="bg-white dark:bg-slate-800 backdrop-blur-xl text-acrovix-navy dark:text-white shadow-[0_15px_40px_rgba(11,25,44,0.12)] rounded-[20px] py-4 px-6 flex items-center gap-4 border border-[#DBEAFE]/50 dark:border-slate-700">
    <div className="w-12 h-12 rounded-full bg-[#ECFEFF] flex items-center justify-center shadow-inner border border-[#CCFBF1]">
      <Database className="w-6 h-6 text-[#0D9488]" />
    </div>
    <div>
      <div className="text-sm font-bold tracking-tight">API Integration</div>
      <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Connected Systems</div>
    </div>
    <div className="pl-4 opacity-20 flex gap-1">
      <div className="w-1.5 h-1.5 rounded-full bg-acrovix-navy dark:bg-white"></div>
      <div className="w-1.5 h-1.5 rounded-full bg-acrovix-navy dark:bg-white"></div>
      <div className="w-1.5 h-1.5 rounded-full bg-acrovix-navy dark:bg-white"></div>
    </div>
  </div>
            </FloatingElement >

  {/* Bottom Left: Server Stack Visual */ }
  < FloatingElement
yOffset = {- 12}
duration = { 1.2}
delay = { 0.5}
className = "absolute bottom-[-5%] left-[5%] z-20"
  >
  <div className="relative">
    <div className="absolute inset-0 bg-[#0D9488]/30 blur-[40px] transform translate-y-10"></div>
    <div className="flex flex-col gap-2 relative z-10 perspective-1000 rotate-x-12 rotate-y-[-15deg] scale-110">
      <div className="w-32 h-8 bg-[#0B192C] rounded-md border-t-2 border-[#1E3A5F] border-l-2 border-[#1E3A5F] flex items-center justify-between px-3 shadow-[0_15px_30px_rgba(11,25,44,0.4)]">
        <div className="flex gap-1.5">
          <div className="w-1.5 h-1.5 bg-[#0D9488] rounded-full"></div>
          <div className="w-1.5 h-1.5 bg-[#0D9488] rounded-full"></div>
        </div>
      </div>
      <div className="w-32 h-8 bg-[#0B192C] rounded-md border-t-2 border-[#1E3A5F] border-l-2 border-[#1E3A5F] flex items-center justify-between px-3 shadow-[0_15px_30px_rgba(11,25,44,0.4)]">
        <div className="flex gap-1.5">
          <div className="w-1.5 h-1.5 bg-[#0D9488] rounded-full"></div>
          <div className="w-1.5 h-1.5 bg-[#0D9488] rounded-full"></div>
        </div>
      </div>
      <div className="w-32 h-8 bg-[#0B192C] rounded-md border-t-2 border-[#1E3A5F] border-l-2 border-[#1E3A5F] flex items-center justify-between px-3 shadow-[0_15px_30px_rgba(11,25,44,0.4)]">
        <div className="flex gap-1.5">
          <div className="w-1.5 h-1.5 bg-[#0D9488] rounded-full"></div>
          <div className="w-1.5 h-1.5 bg-[#2563EB] rounded-full"></div>
        </div>
      </div>
    </div>
  </div>
            </FloatingElement >
           </motion.div >

  {/* Feature Row - Placed after illustration in source order so it stacks bottom on mobile, but placed via grid in Desktop */ }
  < motion.div
initial = {{ opacity: 0, y: 20 }}
animate = {{ opacity: 1, y: 0 }}
transition = {{ duration: 0.6, delay: 0.4 }}
className = "order-3 lg:row-start-2 lg:col-start-1 lg:self-start w-full pt-8 lg:pt-0 border-t border-slate-200/50 dark:border-slate-800/50 lg:border-t-0"
  >
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left max-w-lg mx-auto lg:mx-0 lg:border-t lg:border-slate-200/60 lg:dark:border-slate-800/60 lg:pt-6">
    <div className="group cursor-default">
      <div className="w-12 h-12 mx-auto sm:mx-0 rounded-full bg-gradient-to-br from-[#DBEAFE] to-[#CCFBF1] dark:from-blue-900/40 dark:to-teal-900/40 flex items-center justify-center mb-4 shadow-inner">
        <Activity className="w-6 h-6 text-[#2563EB]" />
      </div>
      <h4 className="font-extrabold text-[#0B192C] dark:text-white text-base">Innovate</h4>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-medium leading-relaxed">Modern technology solutions</p>
    </div>
    <div className="group cursor-default">
      <div className="w-12 h-12 mx-auto sm:mx-0 rounded-full bg-gradient-to-br from-[#CCFBF1] to-[#14B8A6]/20 dark:from-teal-900/40 dark:to-teal-800/40 flex items-center justify-center mb-4 shadow-inner">
        <ShieldCheck className="w-6 h-6 text-[#0D9488]" />
      </div>
      <h4 className="font-extrabold text-[#0B192C] dark:text-white text-base">Secure</h4>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-medium leading-relaxed">Resilient and compliant</p>
    </div>
    <div className="group cursor-default">
      <div className="w-12 h-12 mx-auto sm:mx-0 rounded-full bg-gradient-to-br from-[#DBEAFE] to-[#2563EB]/20 dark:from-blue-900/40 dark:to-blue-800/40 flex items-center justify-center mb-4 shadow-inner">
        <LineChart className="w-6 h-6 text-[#2563EB]" />
      </div>
      <h4 className="font-extrabold text-[#0B192C] dark:text-white text-base">Scale</h4>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-medium leading-relaxed">Built for what's next</p>
    </div>
  </div>
           </motion.div >
        </div >
      </div >
    </section >
  );
};

export default Hero;
