import { useState } from 'react';
import { UserProfile, TIER_BOT_LIMITS, TIER_FEATURES } from '../types';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { Check, Zap, Shield, Sparkles, Star, Crown, ArrowRight, Info, CreditCard, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SubscriptionProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function Subscription({ userProfile, addToast }: SubscriptionProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const tiers = [
    {
      id: 'free',
      name: 'Novice Oracle',
      price: '0',
      icon: Star,
      color: 'text-white/60',
      bg: 'bg-white/5',
      border: 'border-white/10',
      description: 'Begin your journey into the cosmic markets.',
      features: TIER_FEATURES.free,
    },
    {
      id: 'oracle',
      name: 'Master Oracle',
      price: '299',
      icon: Zap,
      color: 'text-gold',
      bg: 'bg-gold/5',
      border: 'border-gold/30',
      description: 'Unlock the full potential of AI-driven trading.',
      features: TIER_FEATURES.oracle,
      popular: true,
    },
    {
      id: 'zion',
      name: 'Cosmic Entity',
      price: '599',
      icon: Crown,
      color: 'text-purple-400',
      bg: 'bg-purple-500/5',
      border: 'border-purple-500/30',
      description: 'Ultimate power for institutional-grade performance.',
      features: TIER_FEATURES.zion,
    },
  ];

  const handleUpgrade = async (tierId: string) => {
    if (tierId === userProfile.tier) {
      addToast("You are already aligned with this cosmic frequency.", "info");
      return;
    }

    setLoading(tierId);
    try {
      // In a real app, this would trigger a Stripe checkout
      // For this demo, we'll simulate a successful upgrade
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { error } = await supabase
        .from('users')
        .update({
          tier: tierId,
          updated_at: new Date().toISOString()
        })
        .eq('uid', userProfile.uid);
      
      if (error) throw error;

      addToast(`Ascension complete! You are now a ${tiers.find(t => t.id === tierId)?.name}.`, "success");
    } catch (err) {
      handleSupabaseError(err, OperationType.UPDATE, 'users');
      addToast("The cosmic upgrade failed. Please try again.", "error");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-12 max-w-6xl mx-auto">
      <div className="text-center space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs font-bold uppercase tracking-widest"
        >
          <Sparkles size={14} /> Cosmic Ascension
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-display font-bold text-white">Choose Your Frequency</h1>
        <p className="text-white/40 max-w-2xl mx-auto leading-relaxed">
          Unlock advanced AI models, higher bot limits, and institutional-grade execution speeds. 
          Align your strategy with the cosmic flow.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {tiers.map((tier, i) => (
          <motion.div
            key={tier.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`relative glass-card p-8 flex flex-col ${tier.bg} ${tier.border} ${
              tier.popular ? 'ring-2 ring-gold/50 shadow-2xl shadow-gold/10' : ''
            }`}
          >
            {tier.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gold text-black text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full shadow-lg">
                Most Aligned
              </div>
            )}

            <div className="flex items-center justify-between mb-6">
              <div className={`p-3 rounded-2xl bg-white/5 ${tier.color}`}>
                <tier.icon size={24} />
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-white">${tier.price}</span>
                <span className="text-xs text-white/40">/mo</span>
              </div>
            </div>

            <h3 className="text-xl font-display font-bold text-white mb-2">{tier.name}</h3>
            <p className="text-xs text-white/40 leading-relaxed mb-8">{tier.description}</p>

            <div className="space-y-4 mb-10 flex-1">
              {tier.features.map((feature) => (
                <div key={feature} className="flex items-start gap-3">
                  <div className="mt-0.5 p-0.5 rounded-full bg-emerald-400/20 text-emerald-400">
                    <Check size={12} />
                  </div>
                  <span className="text-xs text-white/70">{feature}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleUpgrade(tier.id)}
              disabled={loading !== null || userProfile.tier === tier.id}
              className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all group ${
                userProfile.tier === tier.id
                  ? 'bg-white/5 text-white/40 cursor-default'
                  : tier.id === 'whale'
                  ? 'bg-purple-500 text-white hover:bg-purple-600 shadow-lg shadow-purple-500/20'
                  : tier.id === 'pro'
                  ? 'bg-gold text-black hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-gold/20'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {loading === tier.id ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : userProfile.tier === tier.id ? (
                'Current Frequency'
              ) : (
                <>
                  Ascend Now <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card p-8 border-white/5 flex gap-6 items-start">
          <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-400 shrink-0">
            <Shield size={24} />
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-white">Cosmic Security Guarantee</h4>
            <p className="text-xs text-white/40 leading-relaxed">
              Your assets and data are protected by multi-layer encryption and institutional-grade security protocols. 
              We never store your private keys.
            </p>
          </div>
        </div>

        <div className="glass-card p-8 border-white/5 flex gap-6 items-start">
          <div className="p-4 rounded-2xl bg-gold/10 text-gold shrink-0">
            <CreditCard size={24} />
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-white">Flexible Ascension</h4>
            <p className="text-xs text-white/40 leading-relaxed">
              Upgrade, downgrade, or cancel your alignment at any time. No hidden fees, no terrestrial contracts. 
              Prorated adjustments applied instantly.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center text-gold">
            <Info size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Need a custom enterprise solution?</p>
            <p className="text-xs text-white/40">For funds and institutional oracles managing over $10M.</p>
          </div>
        </div>
        <button className="px-8 py-3 rounded-xl border border-gold/30 text-gold text-sm font-bold hover:bg-gold/10 transition-all">
          Contact Cosmic Support
        </button>
      </div>

      <div className="text-center space-y-4 pt-8">
        <div className="flex items-center justify-center gap-6 text-white/20">
          <Lock size={16} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Secure Checkout</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">SSL Encrypted</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">PCI Compliant</span>
        </div>
      </div>
    </div>
  );
}
