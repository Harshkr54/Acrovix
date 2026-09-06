import React from 'react';
import { ShieldCheck, Eye, Lock, FileCheck, AlertTriangle, Database, ArrowRight, Zap } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';

const InnovationSection = () => {
  const capabilities = [
    { icon: Eye, title: "Centralized Monitoring", desc: "Single-pane visibility across hybrid cloud, infrastructure, and application logs." },
    { icon: ShieldCheck, title: "Security Visibility", desc: "Real-time threat telemetry, vulnerability detection, and network risk scoring." },
    { icon: FileCheck, title: "Compliance Reporting", desc: "Automated audit report generation for ISO, PCI-DSS, and regulatory data standards." },
    { icon: AlertTriangle, title: "Intrusion Detection", desc: "AI-enabled anomaly recognition to preempt unauthorized network access attempts." },
    { icon: Database, title: "Backup Monitoring", desc: "Automated verification of system backups, disaster recovery readiness, and integrity." },
    { icon: Lock, title: "Multi-Layered Observability", desc: "End-to-end data protection, sensitive field masking, and encryption monitoring." }
  ];

  return (
    <section className="py-20 md:py-28 bg-[#0B1C2A] dark:bg-[#07151F] text-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16">
          <div className="lg:col-span-8 space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase bg-acrovix-teal-primary/20 border border-acrovix-teal-bright/30 text-acrovix-teal-bright">
              <Zap className="w-3.5 h-3.5 text-acrovix-teal-bright" />
              INNOVATION & PLATFORM CAPABILITY
            </span>

            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white [word-spacing:0.18em] leading-[1.12]">
                XDA — <span className="text-acrovix-teal-bright">Xcel Data Armour</span>
              </h2>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed mt-3">
                AI-enabled observability and data protection platform designed to give enterprise leadership unified monitoring, threat visibility, and continuous compliance assurances.
              </p>
            </div>
          </div>

          <div className="lg:col-span-4 flex lg:justify-end">
            <Button to="/xda" variant="primary" size="lg">
              <span>Explore XDA</span>
              <ArrowRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </div>

        {/* 6 Capability Cards (Static Content Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((cap, idx) => {
            const IconComp = cap.icon;
            return (
              <GlassCard
                key={idx}
                className="bg-[#F8FAFC] dark:bg-[#102936] border-slate-200/90 dark:border-acrovix-teal-primary/20 p-6 h-full flex flex-col justify-between"
                hoverEffect={false}
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-acrovix-aqua-light border border-acrovix-teal-primary/25 flex items-center justify-center text-acrovix-teal-primary mb-4 shadow-sm">
                    <IconComp className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-acrovix-heading mb-2">
                    {cap.title}
                  </h3>
                  <p className="text-xs font-medium text-acrovix-body leading-relaxed">
                    {cap.desc}
                  </p>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default InnovationSection;
