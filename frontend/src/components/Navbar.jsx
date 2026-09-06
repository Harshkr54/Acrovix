import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';
import Button from './Button';
import ThemeToggle from './ThemeToggle';
import acrovixLogo from '../assets/acrovix_logo1.png';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Services', path: '/services' },
    { name: 'Industries', path: '/industries' },
    { name: 'Products', path: '/products' },
    { name: 'Portfolio', path: '/portfolio' },
    { name: 'Contact', path: '/contact' },
  ];

  const isActive = (path) => location.pathname === path;

  const handleNavClick = (path) => {
    setMobileMenuOpen(false);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (location.pathname === path) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: prefersReducedMotion ? 'instant' : 'smooth'
      });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
          ? 'bg-white/75 dark:bg-[#081923]/95 backdrop-blur-md shadow-[0_4px_20px_rgba(16,42,67,0.06)] border-b border-acrovix-teal-primary/14 py-1.5'
          : 'bg-white/68 dark:bg-[#081923]/85 backdrop-blur-sm py-2'
        }`}
    >
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          {/* Brand Logo Lockup */}
          <Link
            to="/"
            onClick={() => handleNavClick('/')}
            className="inline-flex items-center justify-center h-[52px] sm:h-[56px] px-3.5 sm:px-4 py-1.5 rounded-xl bg-transparent dark:bg-[#F7FCFA] border border-transparent dark:border-acrovix-teal-primary/20 transition-all flex-shrink-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-acrovix-teal-primary/60"
            aria-label="ACROVIX INNOVATIONS PRIVATE LIMITED Home"
          >
            <img
              src={acrovixLogo}
              alt="ACROVIX INNOVATIONS PRIVATE LIMITED"
              className="h-[44px] sm:h-[48px] w-auto object-contain"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-3 xl:gap-6" aria-label="Main Navigation">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => handleNavClick(link.path)}
                className={`text-xs xl:text-sm font-bold transition-colors duration-200 hover:text-acrovix-teal-primary relative py-1 whitespace-nowrap ${isActive(link.path)
                    ? 'text-acrovix-teal-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-acrovix-teal-primary after:rounded-full'
                    : 'text-acrovix-heading'
                  }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Primary Actions & Theme Toggle (Desktop) */}
          <div className="hidden lg:flex items-center gap-3 xl:gap-4 flex-shrink-0">
            <Button to="/enquiry" onClick={() => handleNavClick('/enquiry')} variant="primary" size="md" className="whitespace-nowrap flex-shrink-0">
              <span>Get in Touch</span>
              <ArrowRight className="w-4 h-4 ml-1 flex-shrink-0" />
            </Button>
            <ThemeToggle />
          </div>

          {/* Mobile Right Bar (Theme Toggle + Hamburger) */}
          <div className="lg:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-acrovix-heading hover:text-acrovix-teal-primary hover:bg-acrovix-card focus:outline-none"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-[62px] sm:top-[70px] bg-acrovix-bg/95 backdrop-blur-xl border-b border-acrovix-teal-primary/20 shadow-2xl p-6 max-h-[calc(100vh-85px)] overflow-y-auto z-50 animate-in slide-in-from-top-4">
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => handleNavClick(link.path)}
                className={`text-base font-semibold py-2.5 px-3 rounded-lg transition-colors ${isActive(link.path)
                    ? 'text-acrovix-teal-primary bg-acrovix-card font-bold'
                    : 'text-acrovix-heading hover:bg-acrovix-bg-secondary'
                  }`}
              >
                {link.name}
              </Link>
            ))}

            <div className="pt-4 border-t border-acrovix-teal-primary/16 flex flex-col gap-3">
              <div className="flex items-center justify-between py-2 px-1">
                <span className="text-sm font-semibold text-acrovix-heading">Appearance Theme</span>
                <ThemeToggle />
              </div>
              <Button to="/enquiry" onClick={() => handleNavClick('/enquiry')} variant="primary" size="md" className="w-full justify-center whitespace-nowrap">
                <span>Get in Touch</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
