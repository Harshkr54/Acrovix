import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Globe, Phone, ArrowUpRight } from 'lucide-react';
import { COMPANY_INFO } from '../data/company';
import acrovixLogo from '../assets/Acrovix_logo.png';

const Footer = () => {
  return (
    <footer className="bg-[#102A43] dark:bg-[#05111A] text-white pt-16 pb-12 border-t border-acrovix-teal-primary/20 relative overflow-hidden">
      {/* Background orb decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-acrovix-teal-primary/10 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link
              to="/"
              className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl bg-[#F7FCFA] border border-acrovix-teal-primary/20 transition-all flex-shrink-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-acrovix-teal-primary/60"
              aria-label="ACROVIX INNOVATIONS PRIVATE LIMITED Home"
            >
              <img
                src={acrovixLogo}
                alt="ACROVIX INNOVATIONS PRIVATE LIMITED"
                className="h-12 sm:h-14 w-auto object-contain"
              />
            </Link>

            <p className="font-semibold text-acrovix-teal-bright text-sm tracking-widest uppercase">
              {COMPANY_INFO.name}
            </p>
            <p className="text-sm text-slate-300 max-w-sm leading-relaxed">
              {COMPANY_INFO.positioning}. Engineering enterprise technology, cybersecurity, and infrastructure solutions for sustainable growth.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-bold tracking-widest text-acrovix-teal-bright uppercase">
              <span>SYNC</span>
              <span className="text-slate-600">|</span>
              <span>SCALE</span>
              <span className="text-slate-600">|</span>
              <span>SUCCEED</span>
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-l-2 border-acrovix-teal-primary pl-2.5">
              Company
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/about" className="text-slate-300 hover:text-acrovix-teal-bright transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-slate-300 hover:text-acrovix-teal-bright transition-colors">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-slate-300 hover:text-acrovix-teal-bright transition-colors">
                  Products
                </Link>
              </li>
              <li>
                <Link to="/industries" className="text-slate-300 hover:text-acrovix-teal-bright transition-colors">
                  Industries Served
                </Link>
              </li>
              <li>
                <Link to="/portfolio" className="text-slate-300 hover:text-acrovix-teal-bright transition-colors">
                  Portfolio Case Studies
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-slate-300 hover:text-acrovix-teal-bright transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Capabilities Links */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-l-2 border-acrovix-teal-primary pl-2.5">
              Capabilities
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/services/enterprise-it" className="text-slate-300 hover:text-acrovix-teal-bright transition-colors">
                  Enterprise IT Solutions
                </Link>
              </li>
              <li>
                <Link to="/services/cybersecurity-observability" className="text-slate-300 hover:text-acrovix-teal-bright transition-colors">
                  Cybersecurity &amp; Observability
                </Link>
              </li>
              <li>
                <Link to="/enquiry" className="text-slate-300 hover:text-acrovix-teal-bright transition-colors">
                  Cloud &amp; DevOps Consultation
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-l-2 border-acrovix-teal-primary pl-2.5">
              Contact &amp; Enquiries
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2.5 text-slate-300">
                <Mail className="w-4 h-4 text-acrovix-teal-bright flex-shrink-0" />
                <a href={`mailto:${COMPANY_INFO.contact.email}`} className="hover:text-white transition-colors">
                  {COMPANY_INFO.contact.email}
                </a>
              </li>
              <li className="flex items-center gap-2.5 text-slate-300">
                <Globe className="w-4 h-4 text-acrovix-teal-bright flex-shrink-0" />
                <span>{COMPANY_INFO.contact.website}</span>
              </li>
              <li className="flex items-center gap-2.5 text-slate-300">
                <Phone className="w-4 h-4 text-acrovix-teal-bright flex-shrink-0" />
                <a href={`tel:${COMPANY_INFO.contact.phone}`} className="hover:text-white transition-colors">
                  {COMPANY_INFO.contact.phone}
                </a>
              </li>
              <li className="pt-2">
                <Link
                  to="/enquiry"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-acrovix-teal-primary/20 text-acrovix-teal-bright text-xs font-semibold hover:bg-acrovix-teal-primary hover:text-white transition-all border border-acrovix-teal-primary/30"
                >
                  <span>Submit Requirement</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <div>
            © {new Date().getFullYear()} <strong className="text-slate-200">{COMPANY_INFO.name}</strong>. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <span className="text-slate-500">Corporate IT Services &amp; Infrastructure</span>
            <Link to="/contact" className="hover:text-slate-200 transition-colors">Privacy Policy</Link>
            <Link to="/contact" className="hover:text-slate-200 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
