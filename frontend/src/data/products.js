// ACROVIX Enterprise Products & Technology Ecosystem Data
// Referenced from TechnoBind Portfolio Ecosystem Specification
import { PRODUCT_LOGOS } from '../assets/productLogos';

export const PRODUCTS_DATA = [
  {
    id: 'accops',
    name: 'Accops VDI & Identity Management',
    vendor: 'Accops',
    category: 'VDI & Identity Management',
    logoImage: PRODUCT_LOGOS.accops,
    logo: PRODUCT_LOGOS.accops,
    badgeColor: 'bg-teal-500/10 text-teal-700 border-teal-500/20',
    shortDescription: 'Virtual Desktop Infrastructure (VDI), Identity & Access Management (IAM), and Zero Trust Network Access (ZTNA).',
    capabilities: [
      'Centralized Virtual Desktop Infrastructure (VDI) workspace delivery',
      'Zero Trust Network Access (ZTNA) contextual security policies',
      'Multi-Factor Authentication (MFA) & Single Sign-On (SSO)',
      'Granular user access governance & session recording',
      'Seamless remote workforce access across multi-device endpoints'
    ]
  },
  {
    id: 'cloudian',
    name: 'Cloudian S3 Object Storage',
    vendor: 'Cloudian',
    category: 'Data Storage & Management',
    logoImage: PRODUCT_LOGOS.cloudian,
    logo: PRODUCT_LOGOS.cloudian,
    badgeColor: 'bg-sky-500/10 text-sky-700 border-sky-500/20',
    shortDescription: 'Enterprise S3-compatible hybrid cloud object storage software and hardware solutions.',
    capabilities: [
      '100% native S3 API compatibility for enterprise workloads',
      'Horizontal scale-out architecture from terabytes to exabytes',
      'Object Lock data immutability for ransomware protection',
      'Multi-tenant security isolation & end-to-end data encryption',
      'Automated hybrid cloud tiering & storage lifecycle management'
    ]
  },
  {
    id: 'infortrend',
    name: 'Infortrend Storage Solutions',
    vendor: 'Infortrend',
    category: 'Data Storage & Management',
    logoImage: PRODUCT_LOGOS.infortrend,
    logo: PRODUCT_LOGOS.infortrend,
    badgeColor: 'bg-sky-500/10 text-sky-700 border-sky-500/20',
    shortDescription: 'Enterprise-grade unified data storage solutions for SAN, NAS, and cloud environments.',
    capabilities: [
      'High-throughput SAN & NAS unified storage architecture',
      'Automated storage tiering & intelligent cache acceleration',
      'Redundant dual-controller architecture for continuous uptime',
      'Flexible SSD/HDD hybrid array configurations',
      'Snapshot & remote replication for enterprise data resilience'
    ]
  },
  {
    id: 'vast-data',
    name: 'VAST Data Storage Platform',
    vendor: 'VAST Data',
    category: 'Data Storage & Management',
    logoImage: PRODUCT_LOGOS.vast,
    logo: PRODUCT_LOGOS.vast,
    badgeColor: 'bg-sky-500/10 text-sky-700 border-sky-500/20',
    shortDescription: 'High-performance scalable all-flash data platform designed for AI & enterprise workloads.',
    capabilities: [
      'Disaggregated Shared Everything (DASE) architecture',
      'All-flash performance at archive storage cost efficiency',
      'Exabyte-scale multi-protocol storage (NFS, S3, SMB, NVMe)',
      'Similarity-based data reduction & deduplication',
      'Optimized for AI, deep learning, & high-performance analytics'
    ]
  },
  {
    id: 'supermicro',
    name: 'Supermicro Server & AI Storage',
    vendor: 'Supermicro',
    category: 'Data Storage & Management',
    logoImage: PRODUCT_LOGOS.supermicro,
    logo: PRODUCT_LOGOS.supermicro,
    badgeColor: 'bg-sky-500/10 text-sky-700 border-sky-500/20',
    shortDescription: 'Energy-efficient server, storage, AI, IoT, and high-performance switch systems.',
    capabilities: [
      'High-density GPU-accelerated servers for AI & Machine Learning',
      'Green Computing eco-friendly thermal & power efficiency',
      'Enterprise NVMe storage systems & modular server nodes',
      'High-speed 100G/400G networking switches & interconnects',
      'Customizable building-block architecture for data centers'
    ]
  },
  {
    id: 'ddn',
    name: 'DDN Storage for AI & HPC',
    vendor: 'DDN',
    category: 'Data Storage & Management',
    logoImage: PRODUCT_LOGOS.ddn,
    logo: PRODUCT_LOGOS.ddn,
    badgeColor: 'bg-sky-500/10 text-sky-700 border-sky-500/20',
    shortDescription: 'High-performance data storage & management solutions engineered for AI & HPC.',
    capabilities: [
      'Parallel file system storage delivering terabytes/sec throughput',
      'GPU-direct storage integration for accelerated AI pipelines',
      'Automated data placement & multi-tiered workflow routing',
      'Proven scale-out architecture for high-performance computing',
      'Enterprise reliability for data-intensive research & analytics'
    ]
  },
  {
    id: 'commvault',
    name: 'Commvault Data Protection',
    vendor: 'Commvault',
    category: 'Backup & Disaster Recovery',
    logoImage: PRODUCT_LOGOS.commvault,
    logo: PRODUCT_LOGOS.commvault,
    badgeColor: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
    shortDescription: 'Unified enterprise data protection, backup management, and cyber resilience.',
    capabilities: [
      'Comprehensive backup & recovery across hybrid cloud environments',
      'Ransomware anomaly detection & automated threat response',
      'Automated disaster recovery testing & failover orchestration',
      'Global data deduplication & storage optimization',
      'Compliance evidence logging & immutable storage targets'
    ]
  },
  {
    id: 'carbonite',
    name: 'Carbonite by OpenText',
    vendor: 'Carbonite (OpenText)',
    category: 'Backup & Disaster Recovery',
    logoImage: PRODUCT_LOGOS.carbonite,
    logo: PRODUCT_LOGOS.carbonite,
    badgeColor: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
    shortDescription: 'Enterprise backup, data protection, disaster recovery, and cloud migration.',
    capabilities: [
      'Continuous data protection (CDP) for critical servers',
      'Byte-level replication with near-zero RPO and RTO',
      'Cross-platform cloud backup & workload migration',
      'Centralized management dashboard for distributed sites',
      'Encrypted cloud storage with rapid bare-metal recovery'
    ]
  },
  {
    id: 'druva',
    name: 'Druva SaaS Backup Cloud',
    vendor: 'Druva',
    category: 'Backup & Disaster Recovery',
    logoImage: PRODUCT_LOGOS.druva,
    logo: PRODUCT_LOGOS.druva,
    badgeColor: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
    shortDescription: 'Fully managed 100% SaaS-based enterprise backup and cyber resiliency platform.',
    capabilities: [
      'Zero-hardware cloud-native backup & recovery SaaS',
      'Automated backup for SaaS apps, endpoints, & cloud VMs',
      'Air-gapped immutable cloud storage for ransomware defense',
      'Global deduplication & automated cost management',
      'eDiscovery & legal hold data management'
    ]
  },
  {
    id: 'exagrid',
    name: 'ExaGrid Tiered Backup Storage',
    vendor: 'ExaGrid',
    category: 'Backup & Disaster Recovery',
    logoImage: PRODUCT_LOGOS.exagrid,
    logo: PRODUCT_LOGOS.exagrid,
    badgeColor: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
    shortDescription: 'Tiered backup storage with Landing Zone & Retention Time-Lock ransomware recovery.',
    capabilities: [
      'Disk-cache Landing Zone for fastest restore performance',
      'Retention Time-Lock (airgap) for ransomware recovery',
      'Adaptive deduplication for optimized storage efficiency',
      'Scale-out architecture avoiding forklift upgrades',
      'Seamless integration with top backup software applications'
    ]
  },
  {
    id: 'jamf-endpoint',
    name: 'Jamf Endpoint Security',
    vendor: 'Jamf',
    category: 'Endpoint Security',
    logoImage: PRODUCT_LOGOS['jamf-endpoint'],
    logo: PRODUCT_LOGOS['jamf-endpoint'],
    badgeColor: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    shortDescription: 'Purpose-built Apple endpoint security and real-time threat prevention.',
    capabilities: [
      'Real-time behavioral malware protection for macOS and iOS',
      'On-device threat prevention & automated isolation',
      'Zero-trust network access & risk-based authentication',
      'Unified security telemetry & SIEM integration',
      'Minimal OS performance impact with native Apple architecture'
    ]
  },
  {
    id: 'jamf-mobile',
    name: 'Jamf Mobile Security',
    vendor: 'Jamf',
    category: 'Mobile Security',
    logoImage: PRODUCT_LOGOS['jamf-mobile'],
    logo: PRODUCT_LOGOS['jamf-mobile'],
    badgeColor: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    shortDescription: 'Secure mobile device access control and mobile threat defense.',
    capabilities: [
      'Secure access control for corporate mobile devices',
      'Phishing prevention & malicious domain filtering',
      'Data exfiltration protection on unmanaged networks',
      'Compliance monitoring for enterprise BYOD deployments',
      'Automated remediation of compromised mobile endpoints'
    ]
  },
  {
    id: 'jamf-mdm',
    name: 'Jamf Apple Device MDM & Security',
    vendor: 'Jamf',
    category: 'Endpoint & Device Management',
    logoImage: PRODUCT_LOGOS['jamf-device'],
    logo: PRODUCT_LOGOS['jamf-device'],
    badgeColor: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
    shortDescription: 'Enterprise Mobile Device Management (MDM) purpose-built for Apple devices.',
    capabilities: [
      'Zero-touch deployment & automated configuration for macOS and iOS',
      'Inventory management & real-time device health monitoring',
      'Patch management & app distribution across distributed fleets',
      'Identity-based access control & passwordless login enforcement',
      'Seamless integration with Apple Business Manager'
    ]
  },
  {
    id: 'kaspersky',
    name: 'Kaspersky Endpoint Security',
    vendor: 'Kaspersky',
    category: 'Endpoint Security',
    logoImage: PRODUCT_LOGOS.kaspersky,
    logo: PRODUCT_LOGOS.kaspersky,
    badgeColor: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    shortDescription: 'Next-generation endpoint protection, anti-malware, and automated EDR.',
    capabilities: [
      'Real-time behavior-based malware & ransomware protection',
      'Endpoint Detection and Response (EDR) telemetry',
      'Automated patch management & vulnerability assessment',
      'Web, device, & application control governance',
      'Unified cloud or on-premises security management'
    ]
  },
  {
    id: 'safetica',
    name: 'Safetica Data Loss Prevention',
    vendor: 'Safetica',
    category: 'Endpoint Security',
    logoImage: PRODUCT_LOGOS.safetica,
    logo: PRODUCT_LOGOS.safetica,
    badgeColor: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    shortDescription: 'Enterprise Data Loss Prevention (DLP) and insider threat protection.',
    capabilities: [
      'Sensitive data discovery & classification across endpoints',
      'Real-time prevention of unauthorized data exfiltration',
      'Insider risk monitoring & anomalous user behavior detection',
      'Regulatory compliance enforcement (GDPR, PCI-DSS, ISO)',
      'Data flow analytics & security event reporting'
    ]
  },
  {
    id: 'eset',
    name: 'ESET Endpoint Security',
    vendor: 'ESET',
    category: 'Endpoint Security',
    logoImage: PRODUCT_LOGOS.eset,
    logo: PRODUCT_LOGOS.eset,
    badgeColor: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    shortDescription: 'Multi-layered endpoint protection, cloud sandbox, and full disk encryption.',
    capabilities: [
      'Multi-layered anti-malware & threat intelligence engine',
      'Cloud-based sandbox analysis for zero-day threats',
      'Full disk encryption for Windows and macOS endpoints',
      'Advanced brute-force attack & botnet protection',
      'Centralized cloud management console'
    ]
  },
  {
    id: 'sonicwall',
    name: 'SonicWall Next-Gen Firewall',
    vendor: 'SonicWall',
    category: 'Firewall Security',
    logoImage: PRODUCT_LOGOS.sonicwall,
    logo: PRODUCT_LOGOS.sonicwall,
    badgeColor: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    shortDescription: 'Next-Generation Firewalls (NGFW) to prevent unauthorized access and network intrusions.',
    capabilities: [
      'Deep Packet Inspection (DPI) for encrypted traffic',
      'Real-time breach prevention & sandbox analysis',
      'High-speed SD-WAN & secure encrypted VPN connections',
      'Intrusion Prevention System (IPS) & gateway anti-virus',
      'Centralized cloud network security management'
    ]
  },
  {
    id: 'appsentinels',
    name: 'AppSentinels AI API Security',
    vendor: 'AppSentinels.ai',
    category: 'Application & API Security',
    logoImage: PRODUCT_LOGOS.appsentinels,
    logo: PRODUCT_LOGOS.appsentinels,
    badgeColor: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
    shortDescription: 'AI-powered stateful API security platform protecting enterprise APIs against threats.',
    capabilities: [
      'Automated API discovery & shadow API inventory tracking',
      'Stateful API threat analysis & OWASP API Top 10 defense',
      'Real-time detection of data exfiltration via APIs',
      'Continuous API vulnerability scanning & risk scoring',
      'Zero-touch deployment with zero performance latency'
    ]
  },
  {
    id: 'opentext-appsec',
    name: 'OpenText Application & Security Solutions',
    vendor: 'OpenText Security',
    category: 'Application & API Security',
    logoImage: PRODUCT_LOGOS.opentext,
    logo: PRODUCT_LOGOS.opentext,
    badgeColor: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
    shortDescription: 'Enterprise application security, code vulnerability scanning, and secure API management.',
    capabilities: [
      'Static & dynamic application security testing (SAST/DAST)',
      'Software supply chain & open-source dependency auditing',
      'API vulnerability scanning & runtime application self-protection',
      'Automated DevSecOps pipeline security integration',
      'Comprehensive compliance reporting & risk remediation'
    ]
  },
  {
    id: 'logmein',
    name: 'LogMeIn Unified Device Management',
    vendor: 'LogMeIn',
    category: 'Endpoint & Device Management',
    logoImage: PRODUCT_LOGOS.logmein,
    logo: PRODUCT_LOGOS.logmein,
    badgeColor: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
    shortDescription: 'Unified management for all devices, platforms, and distributed enterprise environments.',
    capabilities: [
      'Centralized remote endpoint management & real-time monitoring',
      'Automated patch management & software deployment',
      'Cross-platform support for Windows, macOS, Android, & iOS',
      'Bank-grade 256-bit AES encrypted remote desktop control',
      'Proactive IT asset inventory & vulnerability assessment'
    ]
  },
  {
    id: 'seclore',
    name: 'Seclore Data Rights Management',
    vendor: 'Seclore',
    category: 'Data Rights & Password Management',
    logoImage: PRODUCT_LOGOS.seclore,
    logo: PRODUCT_LOGOS.seclore,
    badgeColor: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
    shortDescription: 'Enterprise Data Rights Management (DRM) protecting sensitive files wherever they travel.',
    capabilities: [
      'Persistent file-level encryption & granular access controls',
      'Dynamic permission revocation even after file sharing',
      'Detailed audit trail of document view, edit, & print actions',
      'Integration with enterprise DLP, EFSS, & email systems',
      'Automated classification-based protection rules'
    ]
  },
  {
    id: 'goto',
    name: 'GoTo Remote Support & Communications',
    vendor: 'GoTo',
    category: 'Remote Support & Communications',
    logoImage: PRODUCT_LOGOS.goto,
    logo: PRODUCT_LOGOS.goto,
    badgeColor: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20',
    shortDescription: 'Unified remote support, IT management, and communications tools for enterprise teams.',
    capabilities: [
      'Secure remote desktop support & attended/unattended access',
      'Unified IT management for endpoints & remote devices',
      'Encrypted remote communications & video collaboration',
      'Multi-factor authentication & session audit logging',
      'Automated routine IT task scripting & deployment'
    ]
  },
  {
    id: 'teamviewer',
    name: 'TeamViewer Enterprise Support',
    vendor: 'TeamViewer',
    category: 'Remote Support & Communications',
    logoImage: PRODUCT_LOGOS.teamviewer,
    logo: PRODUCT_LOGOS.teamviewer,
    badgeColor: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20',
    shortDescription: 'Enterprise remote support, device connectivity, and AI-assisted troubleshooting tools.',
    capabilities: [
      'End-to-end 256-bit AES encrypted remote connectivity',
      'AI-assisted IT helpdesk automation & smart diagnostics',
      'Cross-platform support for desktop, mobile, & IoT systems',
      'Role-based access control & centralized device administration',
      'Unattended enterprise asset monitoring & management'
    ]
  },
  {
    id: 'docusign',
    name: 'DocuSign E-Signature CLM',
    vendor: 'DocuSign',
    category: 'Business Operations',
    logoImage: PRODUCT_LOGOS.docusign,
    logo: PRODUCT_LOGOS.docusign,
    badgeColor: 'bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/20',
    shortDescription: 'Enterprise electronic signatures, contract lifecycle management, and workflow automation.',
    capabilities: [
      'Legally binding electronic signatures & document workflows',
      'Contract Lifecycle Management (CLM) from draft to approval',
      'Automated identity verification & audit trail generation',
      'Seamless integration with CRM, ERP, & cloud storage',
      'Enterprise bank-grade security & compliance standards'
    ]
  },
  {
    id: 'yotta',
    name: 'Yotta Co-Hosted Data Centers',
    vendor: 'Yotta',
    category: 'Data Centers & Hosting',
    logoImage: PRODUCT_LOGOS.yotta,
    logo: PRODUCT_LOGOS.yotta,
    badgeColor: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    shortDescription: 'Hyperscale co-hosted data centers, sovereign cloud, and infrastructure hosting.',
    capabilities: [
      'Tier IV fault-tolerant data center infrastructure',
      'High-density rack hosting for AI & enterprise workloads',
      'Sovereign cloud security & strict data residency compliance',
      '100% green energy & ultra-low PUE energy efficiency',
      'Managed colocation, interconnects, & cloud connectivity'
    ]
  },
  {
    id: 'edb',
    name: 'EDB PostgreSQL with AI',
    vendor: 'EDB (EnterpriseDB)',
    category: 'PostgreSQL with AI',
    logoImage: PRODUCT_LOGOS.edb,
    logo: PRODUCT_LOGOS.edb,
    badgeColor: 'bg-emerald-600/10 text-emerald-700 border-emerald-600/20',
    shortDescription: 'Enterprise PostgreSQL database platform with AI-driven predictive analytics and forecasting.',
    capabilities: [
      'Enterprise-grade PostgreSQL with Oracle compatibility',
      'High availability, multi-region replication, & failover',
      'AI-driven query optimization & predictive performance analytics',
      'Zero-downtime database upgrades & continuous backup',
      'Advanced database security, masking, & compliance controls'
    ]
  },
  {
    id: 'beyondtrust',
    name: 'BeyondTrust PAM Identity Security',
    vendor: 'BeyondTrust',
    category: 'Identity and Access Management',
    logoImage: PRODUCT_LOGOS.beyondtrust,
    logo: PRODUCT_LOGOS.beyondtrust,
    badgeColor: 'bg-violet-500/10 text-violet-700 border-violet-500/20',
    shortDescription: 'Privileged Access Management (PAM) & identity security protecting credentials and sessions.',
    capabilities: [
      'Privileged Password Management & credential vaulting',
      'Endpoint Privilege Management (least privilege enforcement)',
      'Secure Remote Access for vendors & internal administrators',
      'Real-time privileged session monitoring & recording',
      'Threat intelligence analytics for identity risk detection'
    ]
  },
  {
    id: 'one-identity',
    name: 'One Identity by Quest',
    vendor: 'One Identity (Quest)',
    category: 'Identity and Access Management',
    logoImage: PRODUCT_LOGOS['one-identity'],
    logo: PRODUCT_LOGOS['one-identity'],
    badgeColor: 'bg-violet-500/10 text-violet-700 border-violet-500/20',
    shortDescription: 'Unified Identity Governance and Administration (IGA) & Privileged Access Management (PAM).',
    capabilities: [
      'Identity Lifecycle Management & automated user provisioning',
      'Privileged Access Governance & session monitoring',
      'Active Directory security & access certification workflows',
      'Risk-based Multi-Factor Authentication (MFA) & Single Sign-On',
      'Unified cloud & on-premises identity security posture'
    ]
  },
  {
    id: 'thales-iam',
    name: 'Thales Identity & Access Governance',
    vendor: 'Thales',
    category: 'Identity and Access Management',
    logoImage: PRODUCT_LOGOS['thales-iam'],
    logo: PRODUCT_LOGOS['thales-iam'],
    badgeColor: 'bg-violet-500/10 text-violet-700 border-violet-500/20',
    shortDescription: 'Identity lifecycle management, authentication, and credential management.',
    capabilities: [
      'Centralized identity lifecycle management & access governance',
      'Adaptive Multi-Factor Authentication (MFA) & SSO',
      'FIDO2 passwordless authentication & identity protection',
      'Privileged credential vaulting & session audit logging',
      'Seamless enterprise IAM ecosystem integration'
    ]
  },
  {
    id: 'thales-byoe',
    name: 'Thales CipherTrust Key & Encryption',
    vendor: 'Thales',
    category: 'Encryption & Key Management',
    logoImage: PRODUCT_LOGOS['thales-byoe'],
    logo: PRODUCT_LOGOS['thales-byoe'],
    badgeColor: 'bg-teal-600/10 text-teal-700 border-teal-600/20',
    shortDescription: 'Bring Your Own Key (BYOK) & Bring Your Own Encryption (BYOE) enterprise data protection.',
    capabilities: [
      'Centralized CipherTrust key management & HSM security',
      'Bring Your Own Key (BYOK) for AWS, Azure, & Google Cloud',
      'Full-disk & file-level transparent data encryption',
      'Tokenization & dynamic data masking for compliance',
      'FIPS 140-2 Level 3 certified Hardware Security Modules (HSM)'
    ]
  },
  {
    id: 'vertiv',
    name: 'Vertiv Infrastructure & Racks',
    vendor: 'Vertiv',
    category: 'IT Infrastructure & Asset Management',
    logoImage: PRODUCT_LOGOS.vertiv,
    logo: PRODUCT_LOGOS.vertiv,
    badgeColor: 'bg-slate-600/10 text-slate-700 border-slate-600/20',
    shortDescription: 'Critical digital infrastructure, smart racks, UPS, thermal management, and power systems.',
    capabilities: [
      'Smart data center rack systems & modular infrastructure',
      'Uninterruptible Power Supply (UPS) & power distribution',
      'Precision cooling & thermal management solutions',
      'Real-time infrastructure monitoring & asset tracking',
      'High-efficiency energy management for data centers'
    ]
  },
  {
    id: 'quest',
    name: 'Quest Platform & Asset Management',
    vendor: 'Quest',
    category: 'IT Infrastructure & Asset Management',
    logoImage: PRODUCT_LOGOS.quest,
    logo: PRODUCT_LOGOS.quest,
    badgeColor: 'bg-slate-600/10 text-slate-700 border-slate-600/20',
    shortDescription: 'Windows platform management, database monitoring, asset tracking, and data protection.',
    capabilities: [
      'Active Directory management, migration, & security governance',
      'Cross-platform database performance monitoring & tuning',
      'Enterprise IT asset tracking & license management',
      'Automated system backup, recovery, & patch management',
      'Unified endpoint & Microsoft 365 environment administration'
    ]
  }
];

export const PRODUCT_CATEGORIES = [
  'All',
  'VDI & Identity Management',
  'Data Storage & Management',
  'Backup & Disaster Recovery',
  'Endpoint Security',
  'Mobile Security',
  'Firewall Security',
  'Application & API Security',
  'Endpoint & Device Management',
  'Data Rights & Password Management',
  'Remote Support & Communications',
  'Business Operations',
  'Data Centers & Hosting',
  'PostgreSQL with AI',
  'Identity and Access Management',
  'Encryption & Key Management',
  'IT Infrastructure & Asset Management'
];
