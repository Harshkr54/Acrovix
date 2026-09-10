import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Activity, Users, ShieldCheck, Zap } from 'lucide-react';

const AnimatedCounter = ({ target, duration, isDecimal = false, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      const currentVal = progress * target;
      setCount(currentVal);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };
    window.requestAnimationFrame(step);
  }, [isVisible, target, duration]);

  const displayValue = isDecimal ? count.toFixed(1) : Math.floor(count);

  return (
    <span ref={ref}>
      {displayValue}
      {suffix}
    </span>
  );
};

const StatsSection = () => {
  const stats = [
    {
      id: 1,
      icon: <Activity className="w-8 h-8 text-acrovix-teal-primary" />,
      target: 99.9,
      isDecimal: true,
      suffix: '%',
      title: 'Uptime SLA',
      description: 'Guaranteed High Availability'
    },
    {
      id: 2,
      icon: <Users className="w-8 h-8 text-acrovix-teal-primary" />,
      target: 8,
      isDecimal: false,
      suffix: '+ Yrs',
      title: 'Combined Experience',
      description: 'Of Core Engineering Expertise'
    },
    {
      id: 3,
      icon: <ShieldCheck className="w-8 h-8 text-acrovix-teal-primary" />,
      target: 24,
      isDecimal: false,
      suffix: '/7',
      title: 'Security Monitoring',
      description: 'Active Threat Hunting'
    },
    {
      id: 4,
      icon: <Zap className="w-8 h-8 text-acrovix-teal-primary" />,
      target: 15,
      isDecimal: false,
      prefix: '<',
      suffix: ' Min',
      title: 'Response Time',
      description: 'Critical Issue Resolution'
    }
  ];

  return (
    <section className="py-16 bg-[#07151F] relative overflow-hidden border-y border-acrovix-teal-primary/10">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-acrovix-teal-primary/5 rounded-full blur-3xl mix-blend-screen" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#00A3FF]/5 rounded-full blur-3xl mix-blend-screen" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat, index) => (
            <motion.div 
              key={stat.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white/5 dark:bg-[#102936]/40 backdrop-blur-md border border-white/10 dark:border-acrovix-teal-primary/20 rounded-2xl p-8 hover:bg-white/10 dark:hover:bg-[#102936]/60 transition-all duration-300 group hover:-translate-y-1 shadow-lg shadow-black/10"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 bg-acrovix-teal-primary/10 rounded-xl group-hover:scale-110 group-hover:bg-acrovix-teal-primary/20 transition-all duration-300">
                  {stat.icon}
                </div>
                
                <div>
                  <h3 className="text-4xl lg:text-5xl font-bold text-white mb-2 tracking-tight">
                    {stat.prefix}
                    <AnimatedCounter 
                      target={stat.target} 
                      duration={2000} 
                      isDecimal={stat.isDecimal}
                      suffix={stat.suffix}
                    />
                  </h3>
                  <p className="text-lg font-semibold text-acrovix-teal-light dark:text-acrovix-teal-bright mb-1">
                    {stat.title}
                  </p>
                  <p className="text-sm text-acrovix-muted">
                    {stat.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
