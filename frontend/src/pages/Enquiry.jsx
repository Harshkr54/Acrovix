import React, { useState } from 'react';
import SEO from '../components/SEO';
import Breadcrumb from '../components/Breadcrumb';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import CTASection from '../sections/CTASection';
import { submitEnquiry } from '../api/enquiryService';
import { Send, CheckCircle2, AlertCircle, RefreshCw, Building, ShieldCheck } from 'lucide-react';

const Enquiry = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    requirement: '',
    industry: '',
    service: '',
    preferredContactMethod: 'Email',
  });

  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState(null);

  const serviceOptions = [
    'Enterprise IT Solutions',
    'Cybersecurity',
    'Observability',
    'Cloud & DevOps',
    'System Integration',
    'Infrastructure',
    'Consulting',
    'Other',
  ];

  const industryOptions = [
    'Banking & Financial Services',
    'Healthcare',
    'Government & Public Sector',
    'Media & Broadcasting',
    'Enterprise IT & SaaS',
    'Infrastructure & Construction',
    'Manufacturing',
    'Retail & E-commerce',
    'Other',
  ];

  const contactMethodOptions = ['Email', 'Phone', 'F2F', 'Video Call'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (status === 'error') {
      setStatus('idle');
      setErrorMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation for required fields
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.company.trim() ||
      !formData.phone.trim() ||
      !formData.requirement.trim()
    ) {
      setStatus('error');
      setErrorMessage('Please fill out all required fields: Full Name, Business Email, Company / Organization, Phone Number, and Requirement.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setStatus('error');
      setErrorMessage('Please enter a valid business email address.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await submitEnquiry(formData);
      if (response.success) {
        setStatus('success');
        setSuccessData(response);
        // Clear form after success
        setFormData({
          name: '',
          email: '',
          company: '',
          phone: '',
          requirement: '',
          industry: '',
          service: '',
          preferredContactMethod: 'Email',
        });
      } else {
        setStatus('error');
        setErrorMessage(response.message || 'Unable to submit your enquiry.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message || 'A network error occurred. Please try again.');
    }
  };

  return (
    <>
      <SEO
        title="Submit Enquiry | ACROVIX INNOVATIONS PRIVATE LIMITED"
        description="Submit your enterprise IT, cybersecurity, or cloud infrastructure requirement to ACROVIX INNOVATIONS PRIVATE LIMITED."
      />
      <main className="pt-28 pb-16 bg-acrovix-bg min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: 'Enquiry Form' }]} />

          {/* Hero Header */}
          <div className="py-10 md:py-14 text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase bg-acrovix-card border border-acrovix-teal-primary/20 text-acrovix-teal-primary mb-4">
              <Send className="w-3.5 h-3.5" />
              PROJECT ENQUIRY
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-acrovix-heading tracking-tight [word-spacing:0.18em] leading-[1.14] mb-4">
              Submit Your Requirement
            </h1>
            <p className="text-base sm:text-lg text-acrovix-body leading-relaxed">
              Tell us about your technology, cybersecurity, or infrastructure requirement. Our enterprise team will review and respond promptly.
            </p>
          </div>

          <div className="max-w-4xl mx-auto mb-20">
            <GlassCard className="p-5 sm:p-8 md:p-12 border-acrovix-teal-primary/30 relative overflow-hidden" glow hoverEffect={false}>
              
              {/* SUCCESS STATE UI */}
              {status === 'success' ? (
                <div className="text-center py-12 space-y-6 animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-20 h-20 bg-emerald-100 border border-emerald-300 rounded-3xl text-emerald-600 flex items-center justify-center mx-auto shadow-lg">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>

                  <h2 className="text-3xl font-black text-acrovix-heading">
                    Enquiry Received Successfully
                  </h2>

                  <p className="text-base text-acrovix-body max-w-lg mx-auto leading-relaxed">
                    Thank you for reaching out to <strong>ACROVIX INNOVATIONS PRIVATE LIMITED</strong>. Your requirement has been logged and our engineering team will review your submission.
                  </p>

                  {successData?.data?.referenceId && (
                    <div className="inline-block p-4 rounded-xl bg-acrovix-card border border-acrovix-teal-primary/20 text-xs font-mono font-bold text-acrovix-heading">
                      Reference ID: <span className="text-acrovix-teal-primary">{successData.data.referenceId}</span>
                    </div>
                  )}

                  <div className="pt-6">
                    <Button onClick={() => setStatus('idle')} variant="secondary" size="md">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Submit Another Requirement
                    </Button>
                  </div>
                </div>
              ) : (
                /* FORM STATE UI */
                <form onSubmit={handleSubmit} className="space-y-8" noValidate>
                  
                  {/* ERROR BANNER */}
                  {status === 'error' && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-sm animate-in fade-in">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold block">Submission Error</strong>
                        <span>{errorMessage}</span>
                      </div>
                    </div>
                  )}

                  {/* SECTION 1: REQUIRED CONTACT INFORMATION */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-acrovix-heading uppercase tracking-wider border-b border-acrovix-teal-primary/16 pb-2 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-acrovix-teal-primary" />
                      <span>Required Contact Information</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Full Name */}
                      <div>
                        <label htmlFor="name" className="block text-xs font-bold text-acrovix-heading uppercase tracking-wider mb-2">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="e.g. Rahul Sharma"
                          className="w-full px-4 py-3 rounded-xl bg-white/90 dark:bg-[#102936] border border-acrovix-teal-primary/25 dark:border-teal-500/20 text-acrovix-heading dark:text-[#F4FAF9] placeholder:text-acrovix-muted text-sm focus:outline-none focus:ring-2 focus:ring-acrovix-teal-bright focus:border-transparent transition-all shadow-sm"
                        />
                      </div>

                      {/* Business Email */}
                      <div>
                        <label htmlFor="email" className="block text-xs font-bold text-acrovix-heading uppercase tracking-wider mb-2">
                          Business Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="e.g. rahul@company.com"
                          className="w-full px-4 py-3 rounded-xl bg-white/90 dark:bg-[#102936] border border-acrovix-teal-primary/25 dark:border-teal-500/20 text-acrovix-heading dark:text-[#F4FAF9] placeholder:text-acrovix-muted text-sm focus:outline-none focus:ring-2 focus:ring-acrovix-teal-bright focus:border-transparent transition-all shadow-sm"
                        />
                      </div>

                      {/* Company / Organization (Compulsory) */}
                      <div>
                        <label htmlFor="company" className="block text-xs font-bold text-acrovix-heading uppercase tracking-wider mb-2">
                          Company / Organization <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="company"
                          name="company"
                          required
                          value={formData.company}
                          onChange={handleChange}
                          placeholder="e.g. Acme Corp"
                          className="w-full px-4 py-3 rounded-xl bg-white/90 dark:bg-[#102936] border border-acrovix-teal-primary/25 dark:border-teal-500/20 text-acrovix-heading dark:text-[#F4FAF9] placeholder:text-acrovix-muted text-sm focus:outline-none focus:ring-2 focus:ring-acrovix-teal-bright focus:border-transparent transition-all shadow-sm"
                        />
                      </div>

                      {/* Phone Number (Compulsory) */}
                      <div>
                        <label htmlFor="phone" className="block text-xs font-bold text-acrovix-heading uppercase tracking-wider mb-2">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          required
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="e.g. +91 98765 43210"
                          className="w-full px-4 py-3 rounded-xl bg-white/90 dark:bg-[#102936] border border-acrovix-teal-primary/25 dark:border-teal-500/20 text-acrovix-heading dark:text-[#F4FAF9] placeholder:text-acrovix-muted text-sm focus:outline-none focus:ring-2 focus:ring-acrovix-teal-bright focus:border-transparent transition-all shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Requirement Textarea */}
                    <div>
                      <label htmlFor="requirement" className="block text-xs font-bold text-acrovix-heading uppercase tracking-wider mb-2">
                        Project / Business Requirement <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="requirement"
                        name="requirement"
                        required
                        rows={4}
                        value={formData.requirement}
                        onChange={handleChange}
                        placeholder="Please describe your technology, cybersecurity, observability, or infrastructure requirements in detail..."
                        className="w-full px-4 py-3 rounded-xl bg-white/90 dark:bg-[#102936] border border-acrovix-teal-primary/25 dark:border-teal-500/20 text-acrovix-heading dark:text-[#F4FAF9] placeholder:text-acrovix-muted text-sm focus:outline-none focus:ring-2 focus:ring-acrovix-teal-bright focus:border-transparent transition-all shadow-sm resize-y"
                      ></textarea>
                    </div>
                  </div>

                  {/* SECTION 2: OPTIONAL DETAILS */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-acrovix-heading uppercase tracking-wider border-b border-acrovix-teal-primary/16 pb-2 flex items-center gap-2">
                      <Building className="w-4 h-4 text-acrovix-teal-primary" />
                      <span>Optional Details</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      {/* Industry Sector */}
                      <div>
                        <label htmlFor="industry" className="block text-xs font-semibold text-acrovix-heading mb-2">
                          Industry Sector
                        </label>
                        <select
                          id="industry"
                          name="industry"
                          value={formData.industry}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 rounded-xl bg-white/80 dark:bg-[#102936] border border-acrovix-teal-primary/20 dark:border-teal-500/20 text-acrovix-heading dark:text-[#F4FAF9] text-sm focus:outline-none focus:ring-2 focus:ring-acrovix-teal-bright transition-all"
                        >
                          <option value="" className="bg-white dark:bg-[#102936] text-acrovix-heading dark:text-[#F4FAF9]">Select Industry...</option>
                          {industryOptions.map((ind, idx) => (
                            <option key={idx} value={ind} className="bg-white dark:bg-[#102936] text-acrovix-heading dark:text-[#F4FAF9]">{ind}</option>
                          ))}
                        </select>
                      </div>

                      {/* Service Required Dropdown */}
                      <div>
                        <label htmlFor="service" className="block text-xs font-semibold text-acrovix-heading mb-2">
                          Service Required
                        </label>
                        <select
                          id="service"
                          name="service"
                          value={formData.service}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 rounded-xl bg-white/80 dark:bg-[#102936] border border-acrovix-teal-primary/20 dark:border-teal-500/20 text-acrovix-heading dark:text-[#F4FAF9] text-sm focus:outline-none focus:ring-2 focus:ring-acrovix-teal-bright transition-all"
                        >
                          <option value="" className="bg-white dark:bg-[#102936] text-acrovix-heading dark:text-[#F4FAF9]">Select Service...</option>
                          {serviceOptions.map((svc, idx) => (
                            <option key={idx} value={svc} className="bg-white dark:bg-[#102936] text-acrovix-heading dark:text-[#F4FAF9]">{svc}</option>
                          ))}
                        </select>
                      </div>

                      {/* Preferred Contact Method Dropdown */}
                      <div>
                        <label htmlFor="preferredContactMethod" className="block text-xs font-semibold text-acrovix-heading mb-2">
                          Preferred Contact Method
                        </label>
                        <select
                          id="preferredContactMethod"
                          name="preferredContactMethod"
                          value={formData.preferredContactMethod}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 rounded-xl bg-white/80 dark:bg-[#102936] border border-acrovix-teal-primary/20 dark:border-teal-500/20 text-acrovix-heading dark:text-[#F4FAF9] text-sm focus:outline-none focus:ring-2 focus:ring-acrovix-teal-bright transition-all"
                        >
                          {contactMethodOptions.map((m, idx) => (
                            <option key={idx} value={m} className="bg-white dark:bg-[#102936] text-acrovix-heading dark:text-[#F4FAF9]">{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SUBMIT BUTTON */}
                  <div className="pt-6 border-t border-acrovix-teal-primary/16 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-acrovix-muted">
                      Your information is transmitted securely and handled in strict confidence.
                    </p>
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      loading={status === 'loading'}
                      disabled={status === 'loading'}
                      className="w-full sm:w-auto cursor-pointer"
                    >
                      <span>{status === 'loading' ? 'Submitting Enquiry...' : 'Submit Enquiry'}</span>
                      {status !== 'loading' && <Send className="w-4 h-4 ml-1" />}
                    </Button>
                  </div>
                </form>
              )}
            </GlassCard>
          </div>
        </div>

        <CTASection />
      </main>
    </>
  );
};

export default Enquiry;
