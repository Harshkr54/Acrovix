import observabilityImg from '../assets/visuals/portfolio/case_study_observability.png';
import cloudIntegrationImg from '../assets/visuals/portfolio/case_study_cloud_integration.png';

import telemetryDashboardImg from '../assets/visuals/portfolio/gallery_telemetry_dashboard.png';
import dataMaskingPipelineImg from '../assets/visuals/portfolio/gallery_data_masking_pipeline.png';
import cloudTopologyImg from '../assets/visuals/portfolio/gallery_cloud_topology.png';
import devopsBlueprintImg from '../assets/visuals/portfolio/gallery_devops_blueprint.png';

export const PORTFOLIO_DATA = [
  {
    id: "case-study-enterprise-observability",
    slug: "enterprise-observability-deployment",
    title: "Unified Cloud & Security Observability Architecture",
    category: "Cybersecurity & Observability",
    industry: "Banking & Financial Services",
    badgeText: "Sample Case Study",
    image: observabilityImg,
    shortDescription: "Architected a multi-cloud observability framework with automated sensitive data masking and real-time security alerting for a financial service provider.",
    overview: "This case study demonstrates the deployment of a unified telemetry and data protection framework designed to handle high-frequency transaction logging without compromising PII security or regulatory compliance.",
    clientRequirement: "The client required centralized visibility across hybrid cloud infrastructure while ensuring all financial records and sensitive customer attributes were masked before hitting log storage.",
    solution: "Acrovix deployed an integrated observability pipeline incorporating automated data masking rules, intrusion detection, and real-time dashboarding with zero operational latency penalties.",
    servicesDelivered: [
      "Unified Observability Platform Setup",
      "Sensitive Data Detection & Masking",
      "Compliance Monitoring & Reporting",
      "API Security Integration"
    ],
    technology: ["XDA - Xcel Data Armour", "Kubernetes", "Prometheus & Grafana", "OpenTelemetry", "PostgreSQL"],
    implementation: "Phased rollout across staging and production environments, establishing zero-trust logging relays and automated alert policies.",
    outcome: "Achieved 100% compliance with data privacy mandates, 45% reduction in mean time to detect (MTTD) operational anomalies, and seamless log searchability.",
    gallery: [
      { caption: "Unified Security Telemetry Dashboard", type: "architecture", image: telemetryDashboardImg },
      { caption: "Automated Data Masking Pipeline Flow", type: "diagram", image: dataMaskingPipelineImg }
    ]
  },
  {
    id: "case-study-cloud-migration",
    slug: "hybrid-cloud-migration-integration",
    title: "Enterprise System Integration & Hybrid Cloud Setup",
    category: "Enterprise IT Solutions",
    industry: "Enterprise IT & SaaS",
    badgeText: "Sample Case Study",
    image: cloudIntegrationImg,
    shortDescription: "Migrated mission-critical legacy databases to high-availability cloud architecture with zero data loss and automated DevOps workflows.",
    overview: "A comprehensive modernization blueprint showcasing legacy database migration, microservice containerization, and automated CI/CD pipeline establishment.",
    clientRequirement: "Legacy database performance bottlenecks restricted business scaling during peak volume events. The organization needed high-availability cloud deployment with zero disruption to daily services.",
    solution: "Engineered a containerized microservices ecosystem with PostgreSQL replication, automated blue-green deployments, and multi-region failover protection.",
    servicesDelivered: [
      "Enterprise Infrastructure Setup",
      "Cloud & DevOps Solutions",
      "Database Services & Migration",
      "System Integration"
    ],
    technology: ["AWS / Azure Hybrid", "Docker & Kubernetes", "Spring Boot Architecture", "PostgreSQL Replication", "Terraform"],
    implementation: "Executed live migration using zero-downtime database synchronization scripts and automated health-check relays.",
    outcome: "99.99% system availability achieved during peak transaction periods with 3x improvement in query response latency.",
    gallery: [
      { caption: "Hybrid Cloud Architecture Topology", type: "architecture", image: cloudTopologyImg },
      { caption: "Automated DevOps Pipeline Blueprint", type: "diagram", image: devopsBlueprintImg }
    ]
  }
];

