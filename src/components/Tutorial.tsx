import React, { useState } from 'react';
import { HelpCircle, ChevronRight, ChevronLeft, X, Zap, Shield, Bot, BarChart3, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const STEPS = [
  {
    title: "Welcome to Oracle AI",
    description: "Your cosmic gateway to institutional-grade trading. Let's show you around the singularity.",
    icon: <Zap className="text-gold" size={32} />,
  },
  {
    title: "AI Signals",
    description: "Our Oracle bots use SMC, ICT, and S&D methodologies to find high-precision entries with tight stops.",
    icon: <Bot className="text-gold" size={32} />,
  },
  {
    title: "Risk Management",
    description: "Configure your daily loss limits and risk per trade in the Risk Suite to protect your capital.",
    icon: <Shield className="text-gold" size={32} />,
  },
  {
    title: "Singularity 2.0",
    description: "Enable Auto-Trade to let the AI execute signals automatically based on your risk settings.",
    icon: <Activity className="text-gold" size={32} />,
  },
  {
    title: "Performance Tracking",
    description: "Monitor your equity curve, win rate, and profit factor in real-time on the Stats tab.",
    icon: <BarChart3 className="text-gold" size={32} />,
  },
  {
    title: "Portfolio Management",
    description: "Track your holdings across multiple assets and account types (Demo/Live).",
    icon: <Wallet className="text-gold" size={32} />,
  }
];

import { Activity } from 'lucide-react';

export const Tutorial: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card max-w-md w-full p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
          <motion.div 
            className="h-full bg-gold"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/20 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="space-y-6 py-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto">
              {STEPS[currentStep].icon}
            </div>
            
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-display font-bold text-gold">{STEPS[currentStep].title}</h2>
              <p className="text-white/60 leading-relaxed">{STEPS[currentStep].description}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between pt-8 border-t border-white/5">
          <button
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 text-sm font-bold transition-colors ${currentStep === 0 ? 'text-white/10' : 'text-white/40 hover:text-white'}`}
          >
            <ChevronLeft size={18} /> Back
          </button>

          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div 
                key={i} 
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentStep ? 'bg-gold w-4' : 'bg-white/10'}`} 
              />
            ))}
          </div>

          {currentStep === STEPS.length - 1 ? (
            <button
              onClick={onClose}
              className="gold-button px-6 py-2 text-sm"
            >
              Get Started
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep(prev => Math.min(STEPS.length - 1, prev + 1))}
              className="flex items-center gap-2 text-sm font-bold text-gold hover:text-gold/80 transition-colors"
            >
              Next <ChevronRight size={18} />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
