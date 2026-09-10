/**
 * ACROVIX AI Assistant — Enhanced Local Knowledge-Base Response Engine
 *
 * Used as FALLBACK when Gemini API is unavailable.
 * Includes: Hindi/Hinglish support, Quick Actions on fallback,
 * structured replies, and lead capture state detection.
 */

import { COMPANY_INFO } from '../../data/company';
import { SERVICES_DATA } from '../../data/services';
import { INDUSTRIES_DATA } from '../../data/industries';
import { PRODUCTS_DATA } from '../../data/products';
import { PORTFOLIO_DATA } from '../../data/portfolio';

export const INITIAL_WELCOME_MESSAGE = {
  id: 'welcome_1',
  sender: 'ai',
  text: `Hello! Welcome to ACROVIX 👋\n\nI'm the ACROVIX Assistant. I can help you explore our services, products, industries we serve, or connect you with our team.\n\nAap Hindi mein bhi pooch sakte hain! 🇮🇳`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  showQuickActions: true
};

export const QUICK_ACTIONS = [
  { id: 'qa_services',      label: '🔧 Our Services',        action: 'services',      path: '/services' },
  { id: 'qa_products',      label: '📦 Our Products',         action: 'products',      path: '/products' },
  { id: 'qa_industries',    label: '🏭 Industries We Serve',  action: 'industries',    path: '/industries' },
  { id: 'qa_consultation',  label: '📋 Request Consultation', action: 'consultation',  path: '/enquiry' },
  { id: 'qa_contact',       label: '📞 Contact Us',           action: 'contact',       path: '/contact' }
];

const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const reply = (text, link = null, showQuickActions = false) => ({
  id: `ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
  sender: 'ai',
  text,
  link,
  timestamp: now(),
  showQuickActions
});

/** True if the query contains at least one of the given keywords/phrases. */
function includesAny(query, keywords) {
  return keywords.some((kw) => query.includes(kw));
}

/**
 * Local Fallback AI Response Engine
 * Used when Gemini API is unavailable.
 * Includes Hindi/Hinglish + Quick Actions on fallback.
 *
 * @param {string} userMessage
 * @returns {Object}
 */
export function getAIResponse(userMessage) {
  const query = userMessage.toLowerCase().trim();

  if (!query) {
    return reply(
      "Could you tell me a bit more about what you're looking for? I can help with services, products, industries, or connecting you with our team.",
      null, true
    );
  }

  // ── Hindi / Hinglish greetings ──────────────────────────────────────────
  if (includesAny(query, ['namaste', 'namaskar', 'jai hind', 'sat sri akal', 'assalam', 'adaab'])) {
    return reply(
      `Namaste! 🙏 ACROVIX mein aapka swagat hai!\n\nMain aapki madad kar sakta hoon — services, products, ya consultation ke baare mein koi bhi sawaal poochh sakte hain.`,
      null, true
    );
  }

  // ── Hindi help / kya hai / batao ────────────────────────────────────────
  if (includesAny(query, ['kya hai', 'kya karta hai', 'kya krta', 'batao', 'bata do', 'samjhao', 'help karo', 'madad', 'poochna tha'])) {
    return reply(
      `ACROVIX ek enterprise technology company hai jo aapke business ko SYNC, SCALE aur SUCCEED karne mein madad karta hai. 🚀\n\nHum Enterprise IT, Cybersecurity aur Infrastructure solutions provide karte hain.`,
      { label: 'Hamare Services Dekhein', path: '/services' }
    );
  }

  // ── Hindi price / cost ──────────────────────────────────────────────────
  if (includesAny(query, ['kitna paisa', 'kitna lagega', 'cost kitna', 'price btao', 'price batao', 'budget', 'daam', 'rate kya'])) {
    return reply(
      `ACROVIX ke solutions har organization ki zaroorat ke hisaab se customize hote hain, isliye pricing alag-alag hoti hai. 💼\n\nApni requirement share karein aur humare solution architects aapko detailed quote bhejenge.`,
      { label: 'Quote Request Karein', path: '/enquiry' }
    );
  }

  // ── Hindi consultation / project ────────────────────────────────────────
  if (includesAny(query, ['consult karna', 'baat karni', 'milna', 'project hai', 'kaam chahiye', 'solution chahiye', 'help chahiye', 'inquiry', 'enquiry karna'])) {
    return reply(
      `Zaroor! 😊 Apna project requirement hamein bataein aur hum aapse jald contact karenge.\n\nAap niche diye form se apni enquiry submit kar sakte hain.`,
      { label: 'Enquiry Submit Karein', path: '/enquiry' }
    );
  }

  // ── English Greetings ────────────────────────────────────────────────────
  if (includesAny(query, ['hello', 'hi ', ' hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings', 'howdy'])) {
    return reply(
      `Hello there! 👋 How can ACROVIX assist your organization today?\n\nFeel free to ask about our services, products, or request a technical consultation.`,
      null, true
    );
  }

  // ── Thanks ──────────────────────────────────────────────────────────────
  if (includesAny(query, ['thank', 'thanks', 'appreciate', 'thankyou', 'thank you', 'shukriya', 'dhanyawad'])) {
    return reply(`You're most welcome! 😊 If anything else comes to mind — services, pricing, or a consultation — I'm right here.`);
  }

  // ── Goodbye ─────────────────────────────────────────────────────────────
  if (includesAny(query, ['bye', 'goodbye', 'see you', 'alvida', 'phir milenge', 'ok bye'])) {
    return reply(`Thanks for stopping by ACROVIX! Have a great day, and feel free to reopen this chat anytime. 👋`);
  }

  // ── Bot identity ─────────────────────────────────────────────────────────
  if (includesAny(query, ['are you human', 'are you a bot', 'are you ai', 'are you real', 'who are you', 'what are you', 'tum kaun ho', 'bot ho'])) {
    return reply(
      `I'm the ACROVIX Assistant — a virtual guide built to help you find the right service, product, or contact at ACROVIX. 🤖\n\nFor detailed discussions, I'll connect you with our human team.`,
      { label: 'Talk to Our Team', path: '/contact' }
    );
  }

  // ── Pricing / cost / quote ───────────────────────────────────────────────
  if (includesAny(query, ['price', 'pricing', 'cost', 'how much', 'charges', 'fees', 'budget', 'quote', 'quotation'])) {
    return reply(
      `ACROVIX solutions are customized to each organization's scale and compliance needs, so pricing is tailored rather than fixed. 💼\n\nShare your requirement and our solution architects will get back to you with a detailed quote.`,
      { label: 'Request a Quote', path: '/enquiry' }
    );
  }

  // ── Careers / jobs ──────────────────────────────────────────────────────
  if (includesAny(query, ['career', 'careers', 'job', 'jobs', 'hiring', 'vacancy', 'work with', 'internship', 'naukri'])) {
    return reply(
      `We don't have a dedicated careers portal yet. If you'd like to explore opportunities with ${COMPANY_INFO.shortName}, please write to us directly — our team will get back to you. 📩`,
      { label: 'Contact Us', path: '/contact' }
    );
  }

  // ── Location / address / office ─────────────────────────────────────────
  if (includesAny(query, ['location', 'address', 'where are you', 'office', 'headquarters', 'based in', 'city', 'kahan hai', 'office kahan'])) {
    return reply(
      `ACROVIX has offices in:\n📍 Bengaluru — Kengeri Satellite Town, Karnataka\n📍 Bhagalpur — Near Mahadev Singh College, Sarai, Bihar\n\nFor a visit or virtual meeting, please reach out via our Contact page.`,
      { label: 'Go to Contact Page', path: '/contact' }
    );
  }

  // ── XDA ─────────────────────────────────────────────────────────────────
  if (includesAny(query, ['xda', 'xcel data armour', 'data armour', 'diagnostics', 'telemetry'])) {
    return reply(
      `ACROVIX XDA (Xcel Data Armour) is our flagship platform for data security, protection & observability. 🛡️\n\nIt offers centralized visibility, threat telemetry, PII masking, and continuous compliance assurance for enterprise leadership.`,
      { label: 'Discover ACROVIX XDA', path: '/xda' }
    );
  }

  // ── Specific service match ───────────────────────────────────────────────
  const matchedService = SERVICES_DATA.find((service) => {
    const haystack = [service.title, service.category, ...(service.capabilities || [])]
      .join(' ')
      .toLowerCase();
    return (
      service.title.toLowerCase().split(' ').some((word) => word.length > 3 && query.includes(word)) ||
      includesAny(query, haystack.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)) ||
      (service.slug === 'cybersecurity-observability' &&
        includesAny(query, ['cybersecurity', 'security', 'ransomware', 'vapt', 'data protection', 'observability', 'compliance', 'threat'])) ||
      (service.slug === 'enterprise-it' &&
        includesAny(query, ['enterprise it', 'cloud', 'devops', 'infrastructure', 'system integration', 'api management', 'database migration']))
    );
  });
  if (matchedService) {
    return reply(
      `**${matchedService.title}**\n${matchedService.shortDescription}`,
      { label: `Explore ${matchedService.title}`, path: `/services/${matchedService.slug}` }
    );
  }

  // ── General services ─────────────────────────────────────────────────────
  if (includesAny(query, ['service', 'solution', 'what do you do', 'what does acrovix do', 'help with', 'offer', 'kya dete'])) {
    const titles = SERVICES_DATA.map((s) => s.title).join(' and ');
    return reply(
      `ACROVIX delivers ${titles.toLowerCase()} — covering cloud & DevOps, system integration, API management, infrastructure deployment, and 24/7 managed services. 🔧`,
      { label: 'View All Services', path: '/services' }
    );
  }

  // ── Specific industry match ──────────────────────────────────────────────
  const matchedIndustry = INDUSTRIES_DATA.find(
    (ind) => query.includes(ind.title.toLowerCase()) || query.includes(ind.slug.replace(/-/g, ' '))
  );
  if (matchedIndustry) {
    return reply(
      `For **${matchedIndustry.title}**: ${matchedIndustry.shortDescription}`,
      { label: `See ${matchedIndustry.title} Solutions`, path: `/industries/${matchedIndustry.slug}` }
    );
  }

  // ── General industries ───────────────────────────────────────────────────
  if (includesAny(query, ['industry', 'industries', 'sector', 'domain', 'vertical', 'banking', 'healthcare', 'government'])) {
    const list = INDUSTRIES_DATA.slice(0, 5).map((i) => i.title).join(', ');
    return reply(
      `ACROVIX serves industries including ${list}, and more — each with tailored technology and security solutions. 🏭`,
      { label: 'View All Industries', path: '/industries' }
    );
  }

  // ── Specific product match ───────────────────────────────────────────────
  const matchedProduct = PRODUCTS_DATA.find(
    (p) => query.includes(p.vendor.toLowerCase()) || query.includes(p.name.toLowerCase())
  );
  if (matchedProduct) {
    return reply(
      `**${matchedProduct.name}**: ${matchedProduct.shortDescription}`,
      { label: 'Browse Product Portfolio', path: '/products' }
    );
  }

  // ── General products ─────────────────────────────────────────────────────
  if (includesAny(query, ['product', 'vendor', 'storage', 'backup', 'vdi', 'firewall', 'endpoint', 'antivirus', 'encryption', 'identity', 'iam'])) {
    const vendors = [...new Set(PRODUCTS_DATA.map((p) => p.vendor))].slice(0, 8).join(', ');
    return reply(
      `ACROVIX partners with industry-leading vendors including ${vendors}, and more — spanning virtualization, cloud storage, data protection, endpoint security, and identity management. 📦`,
      { label: 'Browse Product Portfolio', path: '/products' }
    );
  }

  // ── Portfolio / case studies ──────────────────────────────────────────────
  if (includesAny(query, ['portfolio', 'case study', 'case studies', 'past work', 'projects', 'clients', 'experience', 'track record'])) {
    const list = PORTFOLIO_DATA.map((p) => p.title).join(' | ');
    return reply(
      `Here's a glimpse of our work:\n${list}\n\nSee the full breakdown — client requirement, solution, and measurable outcomes — on our Portfolio page. 📊`,
      { label: 'View Case Studies', path: '/portfolio' }
    );
  }

  // ── About / company ──────────────────────────────────────────────────────
  if (includesAny(query, ['about', 'who is acrovix', 'about acrovix', 'company', 'vision', 'mission', 'tagline', 'sync scale succeed'])) {
    return reply(
      `${COMPANY_INFO.name} — "${COMPANY_INFO.tagline}"\n\n${COMPANY_INFO.description}`,
      { label: 'Learn More About Us', path: '/about' }
    );
  }

  // ── Consultation / project ────────────────────────────────────────────────
  if (includesAny(query, ['project', 'consultation', 'consult', 'discuss', 'requirement', 'enquiry', 'inquiry', 'get started', 'talk to someone', 'demo', 'meet'])) {
    return reply(
      `Sure! I can help you get started. 🚀\n\nPlease share your requirement and our team will review it — you can also request a direct consultation with our solution architects.`,
      { label: 'Request a Consultation', path: '/enquiry' }
    );
  }

  // ── Contact ───────────────────────────────────────────────────────────────
  if (includesAny(query, ['contact', 'email', 'phone', 'reach', 'support', 'call', 'number', 'talk to', 'sampark'])) {
    return reply(
      `You can reach our team at:\n📧 ${COMPANY_INFO.contact.email}\n📞 ${COMPANY_INFO.contact.phone}\n\nOr submit your query directly on our Contact page.`,
      { label: 'Go to Contact Page', path: '/contact' }
    );
  }

  // ── Fallback — with Quick Actions ─────────────────────────────────────────
  return reply(
    `Thanks for reaching out! I might not have caught that exactly. 😊\n\nYou can ask me about our services, products, industries, or request a consultation — or pick a quick option below:`,
    { label: 'Talk to Our Team', path: '/enquiry' },
    true  // ← show Quick Actions on fallback
  );
}
