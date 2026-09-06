import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Eye,
  Lock,
  FileCheck,
  AlertTriangle,
  Database,
  ArrowRight,
  Zap,
  CheckCircle2,
  Cpu,
  Layers,
  Activity,
  Server,
  Code2,
  FileText,
  Bell,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Building2,
  Radio,
  Stethoscope,
  GraduationCap,
  Landmark,
  ShieldAlert,
  HardDrive,
  Workflow
} from 'lucide-react';
import SEO from '../components/SEO';
import SectionHeading from '../components/SectionHeading';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import Breadcrumb from '../components/Breadcrumb';

const XDA = () => {
  // 1. The Challenge Cards
  const challenges = [
    {
      icon: Eye,
      title: "1. Blind Spots & Data Leaks",
      desc: "Sensitive data and PII stored or logged in plain text without a single view across layers."
    },
    {
      icon: Layers,
      title: "2. Fragmented Monitoring",
      desc: "No end-to-end observability of multi-layered systems in one place."
    },
    {
      icon: ShieldAlert,
      title: "3. Weak Attack Defenses",
      desc: "Limited controls to detect and stop ransomware and intrusions across OS, network and application layers."
    },
    {
      icon: Code2,
      title: "4. Hidden Code Risk",
      desc: "Source-code vulnerabilities can remain undetected until exploited."
    },
    {
      icon: FileText,
      title: "5. Audit Scramble",
      desc: "Compliance evidence for standards and regulations often has to be gathered manually."
    },
    {
      icon: AlertTriangle,
      title: "6. Reactive, Not Proactive",
      desc: "Threats can be discovered after damage has already occurred instead of being detected early."
    }
  ];

  // 2. Statistics
  const statistics = [
    { value: "₹220M", label: "Average cost of a data breach in India", highlight: "India Breach Cost" },
    { value: "$4.44M", label: "Global average cost of a data breach", highlight: "Global Breach Cost" },
    { value: "$10.22M", label: "Average cost of a data breach in the US", highlight: "US Breach Cost" },
    { value: "181 days", label: "Average time to identify a breach", highlight: "Identification Time" },
    { value: "241 days", label: "Full lifecycle to identify and contain a breach", highlight: "Containment Lifecycle" },
    { value: "53%", label: "Of breaches expose customer personal data", highlight: "PII Exposure Risk" }
  ];

  // 3. Solution Capabilities (8 Cards)
  const capabilities = [
    {
      icon: Eye,
      title: "Unified Observability",
      desc: "Single-pane visibility across hybrid cloud, infrastructure, application logs, and system metrics in real time."
    },
    {
      icon: Lock,
      title: "Sensitive-Data Detection & Masking",
      desc: "Automatic detection and zero-trust masking of PII and sensitive data fields across all network and log layers."
    },
    {
      icon: HardDrive,
      title: "Ransomware Protection & Airgap Backup",
      desc: "Automated verification, airgapped immutable snapshot monitoring, and rapid disaster recovery readiness."
    },
    {
      icon: ShieldCheck,
      title: "Intrusion & Anomaly Detection",
      desc: "Real-time threat telemetry, network risk scoring, and rule-based anomaly recognition to stop unauthorized access."
    },
    {
      icon: Code2,
      title: "Source-Code Security Scanning",
      desc: "Automated vulnerability scanning across repositories to catch code security risks early before production release."
    },
    {
      icon: FileCheck,
      title: "Compliance Evidence & Audit Reports",
      desc: "One-plane automated audit report generation for ISO 27001, GDPR, PCI-DSS, and regulatory data standards."
    },
    {
      icon: Bell,
      title: "Real-Time Alerting",
      desc: "Instant threshold alerting, DDoS anomaly notifications, and disk exhaustion predictions routed to operational teams."
    },
    {
      icon: Sparkles,
      title: "AI-Assisted Detection (Roadmap)",
      desc: "Advanced machine learning algorithms to anticipate threat vectors and automate threat response playbooks."
    }
  ];

  // 4. Why XDA Is Different (6 Cards)
  const differentiators = [
    {
      number: "01",
      title: "Proprietary, Purpose-Built Platform",
      desc: "Architected specifically for enterprise-grade security, data protection, and continuous observability."
    },
    {
      number: "02",
      title: "Data Protection + Observability + Security",
      desc: "Unifies log analytics, threat telemetry, and data privacy into a single integrated management plane."
    },
    {
      number: "03",
      title: "Sensitive-Data Masking Everywhere",
      desc: "Automatic PII detection and field masking applied dynamically at ingestion, storage, and presentation levels."
    },
    {
      number: "04",
      title: "Multi-Zone by Design (DMZ & MZ)",
      desc: "Built natively to span multi-layered enterprise networks across public DMZ and airgapped internal MZ environments."
    },
    {
      number: "05",
      title: "Ransomware Resilience",
      desc: "Air-gapped backup monitoring, immutable snapshot verification, and automated disaster recovery validation."
    },
    {
      number: "06",
      title: "Audit-Ready Compliance",
      desc: "Continuous evidence gathering providing instant audit-ready reports for ISO 27001, GDPR, and PCI-DSS."
    }
  ];

  // 5. Market Fit Sectors
  const sectors = [
    { icon: Landmark, name: "Banking & Finance", desc: "Protect transaction data & satisfy stringent financial audits." },
    { icon: Building2, name: "Insurance", desc: "Safeguard policyholder PII and secure claims processing pipelines." },
    { icon: Radio, name: "Telecom", desc: "Monitor massive network throughput with real-time DDoS defense." },
    { icon: Stethoscope, name: "Healthcare", desc: "Ensure patient record privacy and strict HIPAA/GDPR compliance." },
    { icon: ShieldCheck, name: "Government", desc: "Airgapped internal zone security for critical public infrastructure." },
    { icon: GraduationCap, name: "Education", desc: "Protect student research databases and administrative systems." }
  ];

  // 6. Consulting Services
  const consultingServices = [
    {
      title: "API Management",
      desc: "Enterprise API gateway configuration, rate-limiting, authentication policies, and traffic governance."
    },
    {
      title: "Database Services",
      desc: "High-availability database clustering, performance tuning, automated backup, and data masking."
    },
    {
      title: "DevOps & Cloud",
      desc: "Automated CI/CD pipelines, Infrastructure-as-Code (IaC), container orchestration, and cloud cost control."
    },
    {
      title: "VAPT",
      desc: "Vulnerability Assessment & Penetration Testing across web apps, APIs, cloud environments, and internal networks."
    }
  ];

  return (
    <>
      <SEO
        title="XDA — Xcel Data Armour | Data Security, Protection & Observability"
        description="One unified platform for data security, protection & observability. Centralized visibility, threat telemetry, PII masking, and continuous compliance assurances for enterprise leadership."
      />

      {/* Main Container */}
      <div className="bg-acrovix-bg dark:bg-[#07151F] text-acrovix-heading dark:text-[#F4FAF9]">
        {/* HERO SECTION */}
        <section className="bg-[#0B192C] dark:bg-[#07151F] text-white pt-32 pb-20 md:pb-28 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="mb-6">
              <Breadcrumb items={[{ label: 'Platform Capability', path: '/services' }, { label: 'XDA Platform' }]} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-8 space-y-6">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase bg-acrovix-teal-primary/20 border border-acrovix-teal-bright/30 text-acrovix-teal-bright shadow-sm">
                  <Zap className="w-4 h-4 text-acrovix-teal-bright" />
                  INNOVATION & PLATFORM CAPABILITY
                </span>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white [word-spacing:0.18em] leading-[1.14]">
                  XDA — <span className="text-acrovix-teal-bright">Xcel Data Armour</span>
                </h1>

                <p className="text-xl sm:text-2xl font-bold text-acrovix-teal-bright/95 tracking-wide">
                  One unified platform for data security, protection & observability.
                </p>

                <p className="text-base sm:text-lg text-slate-300 max-w-3xl leading-relaxed">
                  XDA provides enterprise leadership with centralized visibility, advanced threat telemetry, automatic sensitive data masking, and continuous compliance assurances across hybrid environments, public DMZ, and airgapped internal networks.
                </p>

                <div className="pt-4 flex flex-wrap items-center gap-4">
                  <Button to="/enquiry" variant="primary" size="lg">
                    <span>Request a Demo</span>
                    <ArrowRight className="w-5 h-5 ml-1" />
                  </Button>
                  <Button to="/contact" variant="secondary" size="lg" className="bg-white/10 text-white hover:bg-white/20 border-white/20">
                    <span>Talk to Our Team</span>
                  </Button>
                </div>
              </div>

              {/* Hero Visual Card */}
              <div className="lg:col-span-4">
                <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-acrovix-teal-primary flex items-center justify-center text-white font-bold">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">XDA Unified Core</div>
                        <div className="text-xs text-acrovix-teal-bright font-semibold">Active Observability</div>
                      </div>
                    </div>
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-black/30 rounded-xl p-3 flex items-center justify-between text-xs text-slate-300">
                      <span className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-acrovix-teal-bright" />
                        Log Stream Telemetry
                      </span>
                      <span className="text-emerald-400 font-bold">100% Monitored</span>
                    </div>

                    <div className="bg-black/30 rounded-xl p-3 flex items-center justify-between text-xs text-slate-300">
                      <span className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-acrovix-teal-bright" />
                        PII Masking Engine
                      </span>
                      <span className="text-emerald-400 font-bold">Zero-Trust Active</span>
                    </div>

                    <div className="bg-black/30 rounded-xl p-3 flex items-center justify-between text-xs text-slate-300">
                      <span className="flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-acrovix-teal-bright" />
                        Audit Compliance
                      </span>
                      <span className="text-emerald-400 font-bold">ISO / GDPR Ready</span>
                    </div>
                  </div>

                  <div className="pt-2 text-center text-xs text-slate-400 border-t border-white/10">
                    Proprietary Enterprise Intelligence Layer
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 1: THE CHALLENGE */}
        <section className="py-20 md:py-24 bg-acrovix-bg relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading
              badge="THE CHALLENGE"
              title="Data Risk Is Multiplying — And Visibility Isn't Keeping Up"
              subtitle="Modern enterprise infrastructures generate fragmented log streams, hidden security vulnerabilities, and compliance bottlenecks."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
              {challenges.map((c, idx) => {
                const Icon = c.icon;
                return (
                  <GlassCard key={idx} className="bg-acrovix-card/80 dark:bg-[#102936] border-slate-200/80 dark:border-acrovix-teal-primary/20 hover:border-acrovix-teal-primary/50 transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-acrovix-heading mb-2">{c.title}</h3>
                    <p className="text-sm text-acrovix-body leading-relaxed">{c.desc}</p>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION 2: WHY IT MATTERS / STATISTICS */}
        <section className="py-20 bg-[#0A1B26] text-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase bg-acrovix-teal-primary/20 border border-acrovix-teal-bright/30 text-acrovix-teal-bright mb-4">
                <TrendingUp className="w-4 h-4" />
                INDUSTRY BENCHMARKS
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight mb-4">
                The High Cost of Invisibility & Data Breaches
              </h2>
              <p className="text-slate-300 text-base md:text-lg">
                Unmonitored environments and delayed detection severely impact enterprise reputation, operational continuity, and financial performance.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
              {statistics.map((s, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-acrovix-teal-bright/40 transition-all duration-300">
                  <div className="text-xs font-bold uppercase tracking-wider text-acrovix-teal-bright mb-2">
                    {s.highlight}
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-white mb-2">
                    {s.value}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center text-xs text-slate-400 font-semibold tracking-wider uppercase">
              Source: IBM Cost of a Data Breach Report 2025
            </div>
          </div>
        </section>

        {/* SECTION 3: XDA SOLUTION (8 CAPABILITY CARDS) */}
        <section className="py-20 md:py-28 bg-acrovix-bg-secondary dark:bg-[#0A1B26]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading
              badge="XDA SOLUTION"
              title="XDA: A Single, Centralised Control Panel"
              subtitle="Real-time security, protection and compliance across every layer and network zone — in one place."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
              {capabilities.map((cap, idx) => {
                const Icon = cap.icon;
                return (
                  <GlassCard key={idx} className="bg-white dark:bg-[#102936] border-slate-200 dark:border-acrovix-teal-primary/20 p-6 flex flex-col justify-between group hover:border-acrovix-teal-primary hover:shadow-card-glow hover:-translate-y-1.5 transition-all duration-300">
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-acrovix-aqua-light border border-acrovix-teal-primary/20 text-acrovix-teal-primary flex items-center justify-center mb-4 group-hover:bg-acrovix-teal-primary group-hover:text-white transition-all duration-300">
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-acrovix-heading mb-2 leading-snug group-hover:text-acrovix-teal-primary transition-colors">{cap.title}</h3>
                      <p className="text-xs text-acrovix-body leading-relaxed">{cap.desc}</p>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION 4: HOW XDA WORKS (Open Source Foundation + Proprietary Layer) */}
        <section className="py-20 bg-acrovix-bg dark:bg-[#07151F] border-t border-b border-acrovix-teal-primary/16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading
              badge="TECHNOLOGY ARCHITECTURE"
              title="Proven Open-Source Foundation, Proprietary Intelligence on Top"
              subtitle="XDA combines battle-tested open-source telemetry frameworks with ACROVIX's proprietary security, data masking, and compliance intelligence."
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
              {/* Foundation Layer */}
              <div className="bg-[#0A1B26] dark:bg-[#102936] text-white rounded-3xl p-8 border border-acrovix-teal-primary/20 relative overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                    FOUNDATION LAYER
                  </span>
                  <Workflow className="w-5 h-5 text-slate-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Open-Source Core</h3>
                <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                  Leverages industry-standard open-source observability tools for high-performance metrics collection, runtime auditing, and dashboard rendering.
                </p>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#142F3D]/80 border border-acrovix-teal-primary/20 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-acrovix-teal-bright flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white text-sm block">Prometheus</strong>
                      <span className="text-xs text-slate-300">High-performance metrics collection and time-series telemetry storage.</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#142F3D]/80 border border-acrovix-teal-primary/20 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-acrovix-teal-bright flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white text-sm block">Grafana</strong>
                      <span className="text-xs text-slate-300">Real-time visualization dashboards and operational metrics rendering.</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#142F3D]/80 border border-acrovix-teal-primary/20 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-acrovix-teal-bright flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white text-sm block">Falco</strong>
                      <span className="text-xs text-slate-300">Cloud-native runtime threat detection and Linux system event auditing.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Proprietary Layer */}
              <div className="bg-[#102936] text-white rounded-3xl p-8 border border-acrovix-teal-primary/30 relative overflow-hidden shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-acrovix-teal-primary/20 text-acrovix-teal-bright border border-acrovix-teal-bright/30">
                    PROPRIETARY LAYER
                  </span>
                  <Sparkles className="w-5 h-5 text-acrovix-teal-bright" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">XDA Enterprise Intelligence</h3>
                <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                  ACROVIX proprietary intelligence modules running on top of telemetry streams to deliver data security, masking, and automated compliance.
                </p>

                <div className="space-y-3 text-xs text-slate-200">
                  <div className="p-3 rounded-xl bg-white/10 border border-white/10 flex items-center gap-3">
                    <Lock className="w-4 h-4 text-acrovix-teal-bright flex-shrink-0" />
                    <span>Sensitive-data detection & real-time PII masking engine</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/10 border border-white/10 flex items-center gap-3">
                    <Server className="w-4 h-4 text-acrovix-teal-bright flex-shrink-0" />
                    <span>Proprietary data-source agents for OS, API, and database logs</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/10 border border-white/10 flex items-center gap-3">
                    <Layers className="w-4 h-4 text-acrovix-teal-bright flex-shrink-0" />
                    <span>Multi-zone control across public DMZ & airgapped internal MZ</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/10 border border-white/10 flex items-center gap-3">
                    <HardDrive className="w-4 h-4 text-acrovix-teal-bright flex-shrink-0" />
                    <span>Airgapped immutable backup & automated recovery validation</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/10 border border-white/10 flex items-center gap-3">
                    <Code2 className="w-4 h-4 text-acrovix-teal-bright flex-shrink-0" />
                    <span>Source-code static vulnerability scanning engine</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/10 border border-white/10 flex items-center gap-3">
                    <FileCheck className="w-4 h-4 text-acrovix-teal-bright flex-shrink-0" />
                    <span>One-plane compliance evidence aggregator & ISO/GDPR report generator</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: XDA ARCHITECTURE VISUALIZATION */}
        <section className="py-20 md:py-24 bg-acrovix-bg-secondary dark:bg-[#0A1B26]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading
              badge="DEPLOYMENT TOPOLOGY"
              title="How XDA Fits Across Your Environment"
              subtitle="End-to-end security architecture designed to span both public DMZ and secure internal airgapped MZ zones."
            />

            <div className="bg-white dark:bg-[#102936] border border-slate-200 dark:border-acrovix-teal-primary/20 rounded-3xl p-6 md:p-10 shadow-sm mt-12">
              <div className="flex flex-col items-center space-y-6 text-center">
                {/* Level 1: Control Panel */}
                <div className="w-full max-w-lg bg-[#0B192C] text-white p-5 rounded-2xl border border-acrovix-teal-bright/50 shadow-md">
                  <div className="text-xs font-bold text-acrovix-teal-bright uppercase tracking-wider mb-1">Top Level</div>
                  <h4 className="text-lg font-extrabold">Unified XDA Control Panel</h4>
                  <p className="text-xs text-slate-300 mt-1">Single-pane dashboards, compliance reports, and threat alerts</p>
                </div>

                <div className="w-0.5 h-8 bg-acrovix-teal-primary/40"></div>

                {/* Level 2: Proprietary Processing */}
                <div className="w-full max-w-lg bg-acrovix-teal-primary text-white p-5 rounded-2xl shadow-md">
                  <div className="text-xs font-bold text-acrovix-aqua-light uppercase tracking-wider mb-1">Intelligence Layer</div>
                  <h4 className="text-lg font-extrabold">XDA Proprietary Processing Engine</h4>
                  <p className="text-xs text-slate-100 mt-1">PII Masking • Intrusion Telemetry • Disk Risk Analytics • Audit Generator</p>
                </div>

                <div className="w-0.5 h-8 bg-acrovix-teal-primary/40"></div>

                {/* Level 3: Monitored Layers */}
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-50 dark:bg-[#142F3D] border border-slate-200 dark:border-acrovix-teal-primary/20 p-4 rounded-xl text-center">
                    <Server className="w-5 h-5 text-acrovix-teal-primary mx-auto mb-2" />
                    <strong className="text-sm font-bold block text-acrovix-heading">OS / Servers</strong>
                    <span className="text-xs text-acrovix-body">Linux & Windows telemetry</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#142F3D] border border-slate-200 dark:border-acrovix-teal-primary/20 p-4 rounded-xl text-center">
                    <Activity className="w-5 h-5 text-acrovix-teal-primary mx-auto mb-2" />
                    <strong className="text-sm font-bold block text-acrovix-heading">Network</strong>
                    <span className="text-xs text-acrovix-body">Flow logs & packet inspection</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#142F3D] border border-slate-200 dark:border-acrovix-teal-primary/20 p-4 rounded-xl text-center">
                    <Database className="w-5 h-5 text-acrovix-teal-primary mx-auto mb-2" />
                    <strong className="text-sm font-bold block text-acrovix-heading">Databases</strong>
                    <span className="text-xs text-acrovix-body">Query logs & storage integrity</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#142F3D] border border-slate-200 dark:border-acrovix-teal-primary/20 p-4 rounded-xl text-center">
                    <Cpu className="w-5 h-5 text-acrovix-teal-primary mx-auto mb-2" />
                    <strong className="text-sm font-bold block text-acrovix-heading">Apps & APIs</strong>
                    <span className="text-xs text-acrovix-body">Payloads, logs & latency</span>
                  </div>
                </div>

                {/* Network Zones Callout */}
                <div className="w-full pt-6 border-t border-slate-200 dark:border-acrovix-teal-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-acrovix-body">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    <span><strong>DMZ Zone:</strong> Internet-Facing Applications & Edge Gateways</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span><strong>MZ Zone:</strong> Internal Enterprise Core & Airgapped Systems</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: WHY XDA IS DIFFERENT (6 CARDS) */}
        <section className="py-20 md:py-28 bg-acrovix-bg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading
              badge="COMPETITIVE ADVANTAGE"
              title="Why XDA Is Different"
              subtitle="Engineered to provide total security assurances without complex legacy software overhead."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
              {differentiators.map((d, idx) => (
                <GlassCard key={idx} className="bg-slate-50 dark:bg-[#102936] border-slate-200/90 dark:border-acrovix-teal-primary/20 p-6 hover:border-acrovix-teal-primary transition-all duration-300">
                  <div className="text-2xl font-black text-acrovix-teal-primary mb-3">{d.number}</div>
                  <h3 className="text-lg font-bold text-acrovix-heading mb-2">{d.title}</h3>
                  <p className="text-xs text-acrovix-body leading-relaxed">{d.desc}</p>
                </GlassCard>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 7: XDA USE CASES (2 USE CASES) */}
        <section className="py-20 md:py-28 bg-[#0D202B] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading
              badge="PROVEN USE CASES"
              title="Real-World Enterprise Implementations"
              subtitle="Demonstrated impact across high-volume production technology platforms."
              titleClassName="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4"
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
              {/* Use Case 1 */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:border-acrovix-teal-bright/40 transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-acrovix-teal-primary/20 text-acrovix-teal-bright border border-acrovix-teal-bright/30">
                      USE CASE 1
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">Event-management technology platform</span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-3">
                    Full-Stack Visibility With Automatic PII Masking
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed mb-6">
                    Delivered continuous single-pane observability for high-throughput mobile app, API, and database logs while automatically masking customer PII data stream.
                  </p>

                  <div className="space-y-2 mb-6 text-xs text-slate-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-acrovix-teal-bright flex-shrink-0" />
                      <span>Real-time CPU, memory and disk telemetry dashboards</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-acrovix-teal-bright flex-shrink-0" />
                      <span>Unified log panel for mobile app, API, and database layers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-acrovix-teal-bright flex-shrink-0" />
                      <span>Threshold alerting & possible-DDoS anomaly detection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-acrovix-teal-bright flex-shrink-0" />
                      <span>GDPR and ISO 27001 automated compliance reporting</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 bg-acrovix-teal-primary/10 rounded-2xl p-4 text-center">
                  <div className="text-3xl font-black text-acrovix-teal-bright">100%</div>
                  <div className="text-xs text-slate-300 font-medium mt-1">
                    of logged PII automatically masked across all layers
                  </div>
                </div>
              </div>

              {/* Use Case 2 */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:border-acrovix-teal-bright/40 transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-acrovix-teal-primary/20 text-acrovix-teal-bright border border-acrovix-teal-bright/30">
                      USE CASE 2
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">Europe-based media & broadcasting corporation</span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-3">
                    API Consumption Intelligence at Enterprise Scale
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed mb-6">
                    Implemented custom API analytics, month-on-month consumption comparisons, and disk exhaustion prediction algorithms for large-scale media streaming APIs.
                  </p>

                  <div className="space-y-2 mb-6 text-xs text-slate-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-acrovix-teal-bright flex-shrink-0" />
                      <span>Custom API usage & throughput analytical dashboards</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-acrovix-teal-bright flex-shrink-0" />
                      <span>Month-on-month API consumption comparison & trend reports</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-acrovix-teal-bright flex-shrink-0" />
                      <span>Real-time threshold alerting on abnormal traffic spikes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-acrovix-teal-bright flex-shrink-0" />
                      <span>Data-disk exhaustion prediction algorithms</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 bg-acrovix-teal-primary/10 rounded-2xl p-4 text-center">
                  <div className="text-3xl font-black text-acrovix-teal-bright">Zero</div>
                  <div className="text-xs text-slate-300 font-medium mt-1">
                    missed capacity events — disk-full risks predicted ahead of time
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 8: MARKET FIT / SECTORS */}
        <section className="py-20 md:py-24 bg-acrovix-bg dark:bg-[#07151F]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading
              badge="TARGET INDUSTRY FIT"
              title="Built for Any Sector That Handles Sensitive Data"
              subtitle="XDA delivers compliant observability tailored to critical regulated industries."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
              {sectors.map((sec, idx) => {
                const Icon = sec.icon;
                return (
                  <GlassCard key={idx} className="bg-acrovix-card dark:bg-[#102936] border-slate-200/90 dark:border-teal-500/20 p-6 flex items-start gap-4 hover:border-acrovix-teal-primary transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-acrovix-aqua-light text-acrovix-teal-primary flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-acrovix-heading mb-1">{sec.name}</h3>
                      <p className="text-xs text-acrovix-body leading-relaxed">{sec.desc}</p>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION 9: CONSULTING SERVICES WE ALSO PROVIDE */}
        <section className="py-20 bg-acrovix-bg-secondary dark:bg-[#0A1B26] border-t border-acrovix-teal-primary/16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading
              badge="EXPERT CONSULTING"
              title="Consulting Services We Also Provide"
              subtitle="Complementing XDA platform capability with specialized technical consulting and engineering services."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
              {consultingServices.map((cs, idx) => (
                <GlassCard key={idx} className="bg-acrovix-card dark:bg-[#102936] border-slate-200 dark:border-teal-500/20 p-6 hover:border-acrovix-teal-primary transition-all duration-300">
                  <h3 className="text-lg font-bold text-acrovix-heading mb-2">{cs.title}</h3>
                  <p className="text-xs text-acrovix-body leading-relaxed">{cs.desc}</p>
                </GlassCard>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 10: FINAL CTA */}
        <section className="py-20 md:py-28 bg-[#081923] text-white text-center relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase bg-acrovix-teal-primary/20 border border-acrovix-teal-bright/30 text-acrovix-teal-bright">
              GET STARTED WITH XDA
            </span>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              Let's Secure Your Data — Together
            </h2>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              See XDA in action with a tailored walkthrough for your enterprise environment.
            </p>

            <div className="pt-4 flex justify-center">
              <Button to="/enquiry" variant="primary" size="lg">
                <span>Request a Demo</span>
                <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default XDA;
