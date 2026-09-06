/**
 * ACROVIX AI Chatbot - Local Demo Data & Keyword Matcher
 * 
 * Strictly isolated frontend demo data.
 * No external API dependencies or authentication required.
 */

export const INITIAL_WELCOME_MESSAGE = {
  id: 'welcome_1',
  sender: 'ai',
  text: "Hello! Welcome to ACROVIX. I'm the ACROVIX Assistant. How can I help you today?",
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  showQuickActions: true
};

export const QUICK_ACTIONS = [
  { id: 'qa_services', label: 'Explore Services', action: 'services', path: '/services' },
  { id: 'qa_products', label: 'Explore Products', action: 'products', path: '/products' },
  { id: 'qa_consultation', label: 'Request Consultation', action: 'consultation', path: '/enquiry' },
  { id: 'qa_contact', label: 'Contact Us', action: 'contact', path: '/contact' }
];

/**
 * Demo AI Response Engine
 * Evaluates user message against local keywords and returns appropriate response object.
 * 
 * @param {string} userMessage - Text typed by user
 * @returns {Object} Response object with text, optional path link, and timestamp
 */
export function getAIResponse(userMessage) {
  const query = userMessage.toLowerCase().trim();

  let responseText = "";
  let navigationLink = null;

  if (query.includes('cybersecurity') || query.includes('security') || query.includes('ransomware') || query.includes('vapt') || query.includes('data protection')) {
    responseText = "ACROVIX provides cybersecurity and observability solutions including infrastructure monitoring, API security, sensitive data protection, compliance monitoring and ransomware protection.";
    navigationLink = { label: "Explore Cybersecurity Services", path: "/services/cybersecurity-observability" };
  } 
  else if (query.includes('service') || query.includes('solution') || query.includes('observability') || query.includes('devops') || query.includes('cloud') || query.includes('infrastructure')) {
    responseText = "ACROVIX delivers enterprise IT solutions including cloud & DevOps, system integration, API management, infrastructure deployment, cybersecurity & observability, and 24/7 managed services.";
    navigationLink = { label: "View All Services", path: "/services" };
  }
  else if (query.includes('product') || query.includes('vendor') || query.includes('accops') || query.includes('commvault') || query.includes('druva') || query.includes('kaspersky') || query.includes('storage') || query.includes('vdi')) {
    responseText = "ACROVIX partners with industry leaders to deliver solutions across Virtualization (Accops), Cloud Storage (Cloudian, VAST, DDN), Data Protection (Commvault, Druva, ExaGrid), Endpoint Management (Jamf), Security (Kaspersky, ESET, Safetica), and Hardware (Supermicro, Infortrend).";
    navigationLink = { label: "Browse Product Portfolio", path: "/products" };
  }
  else if (query.includes('project') || query.includes('consultation') || query.includes('discuss') || query.includes('requirement') || query.includes('quote') || query.includes('enquiry')) {
    responseText = "Sure! I can help you get started. Please share your requirement and our team can review it. You can also request a direct consultation with our solution architects.";
    navigationLink = { label: "Request a Consultation", path: "/enquiry" };
  }
  else if (query.includes('contact') || query.includes('email') || query.includes('phone') || query.includes('reach') || query.includes('office') || query.includes('support')) {
    responseText = "You can reach our technical and business solutions team through our Contact page or submit your query directly on our portal.";
    navigationLink = { label: "Go to Contact Page", path: "/contact" };
  }
  else if (query.includes('xda') || query.includes('diagnostics') || query.includes('telemetry')) {
    responseText = "ACROVIX XDA (Extended Diagnostics & Observability Architecture) provides unified telemetry, AI anomaly detection, and comprehensive visibility across complex hybrid workloads.";
    navigationLink = { label: "Discover ACROVIX XDA", path: "/xda" };
  }
  else if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('greetings')) {
    responseText = "Hello there! How can ACROVIX assist your organization today? Feel free to ask about our services, products, or request a technical consultation.";
  }
  else {
    responseText = "Thanks for reaching out. Please share a little more about your requirement, and I'll help you find the right ACROVIX solution.";
  }

  return {
    id: `ai_${Date.now()}`,
    sender: 'ai',
    text: responseText,
    link: navigationLink,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}
