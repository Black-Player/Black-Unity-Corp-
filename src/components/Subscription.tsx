import { useState } from 'react';
import { UserProfile, TIER_BOT_LIMITS, TIER_FEATURES, BlessedTierEmail } from '../types';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { dbService } from '../services/dbService';
import { where } from 'firebase/firestore';
import { Check, Zap, Shield, Sparkles, Star, Crown, ArrowRight, Info, CreditCard, Lock, Mail, Key, Send, Loader2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SubscriptionProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function Subscription({ userProfile, addToast }: SubscriptionProps) {
  const [loading, setLoading] = useState<string | null>(null);

  // Investor Access System States
  const [code, setCode] = useState('');
  const [checkingCode, setCheckingCode] = useState(false);
  const [emailToCheck, setEmailToCheck] = useState('');
  const [checkingApproval, setCheckingApproval] = useState(false);
  const [approvedStatus, setApprovedStatus] = useState<'idle' | 'approved' | 'not_approved' | 'request_pending'>('idle');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const checkEmailApproval = async () => {
    if (!emailToCheck) return;
    setCheckingApproval(true);
    setApprovedStatus('idle');
    try {
      const trimmedEmail = emailToCheck.toLowerCase().trim();
      
      // Query collection 'investor_approved_emails' for this email
      const approvedList = await dbService.list('investor_approved_emails', [
        where('email', '==', trimmedEmail)
      ]);
      
      if (approvedList.length > 0) {
        // Yes, this email is approved! Let's check for existing request
        const reqs = await dbService.list('investor_code_requests', [
          where('email', '==', trimmedEmail),
          where('status', '==', 'pending')
        ]);
        if (reqs.length > 0) {
          setApprovedStatus('request_pending');
        } else {
          setApprovedStatus('approved');
        }
      } else {
        setApprovedStatus('not_approved');
      }
    } catch (err) {
      console.error(err);
      addToast("Failed to verify email against vetted approval list.", "error");
    } finally {
      setCheckingApproval(false);
    }
  };

  const submitCodeRequest = async () => {
    if (!emailToCheck) return;
    setSubmittingRequest(true);
    try {
      const trimmedEmail = emailToCheck.toLowerCase().trim();
      
      await dbService.create('investor_code_requests', {
        email: trimmedEmail,
        uid: userProfile.uid,
        status: 'pending',
        created_at: new Date().toISOString()
      });

      // Send automated notifications in-app to Creators
      const creatorEmails = ['kanitezu@gmail.com', 'andilenqobile561@gmail.com'];
      const users = await dbService.list('users');
      const creators = users.filter((u: any) => u.role === 'creator' || creatorEmails.includes(u.email?.toLowerCase()));
      
      for (const creator of creators) {
        await dbService.create('notifications', {
          uid: creator.uid,
          title: 'New Access Code Request 📬',
          message: `Investor ${trimmedEmail} requested an access code. Review and generate in Creator Dashboard.`,
          type: 'system',
          read: false,
          created_at: new Date().toISOString()
        });
      }

      // Record audit log
      await dbService.create('access_audit_logs', {
        action: 'Requested Access Code',
        performed_by: userProfile.email || userProfile.uid,
        target_user: trimmedEmail,
        details: `Submitted access code request for vetted email: ${trimmedEmail}. Notification sent to Creator.`,
        timestamp: new Date().toISOString()
      });

      addToast("Request submitted! Notification dispatched to the Creators.", "success");
      setApprovedStatus('request_pending');
    } catch (err) {
      console.error(err);
      addToast("Failed to submit access code request.", "error");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code) return;
    setCheckingCode(true);
    try {
      const cleanCode = code.trim();
      const uppercaseCode = cleanCode.toUpperCase();

      // 1. Check Creator Blessed Tier PINs first!
      const blessedList = await dbService.list<BlessedTierEmail>('blessed_tier_emails');
      const blessedRecord = blessedList.find(b => 
        b.pin === cleanCode || 
        b.pin === uppercaseCode || 
        `PIN-${b.pin}` === uppercaseCode
      );

      if (blessedRecord) {
        if (blessedRecord.pin_status === 'revoked') {
          addToast("This Creator PIN has been revoked.", "error");
          return;
        }

        const allocatedTier = blessedRecord.allocated_tier || 'creator';
        const newRole = allocatedTier === 'creator' ? 'creator' : 'investor';
        const tag = `Blessed (${allocatedTier.toUpperCase()})`;

        // Update User Profile
        await dbService.update('users', userProfile.uid, {
          role: newRole,
          tier: allocatedTier,
          subscriber_tag: tag,
          access_code_used: `PIN-${blessedRecord.pin}`,
          access_code_expiry: null, // Permanent Creator Blessing
          updated_at: new Date().toISOString()
        });

        // Mark PIN as redeemed
        await dbService.update('blessed_tier_emails', blessedRecord.id, {
          pin_status: 'redeemed',
          redeemed_by_uid: userProfile.uid,
          redeemed_at: new Date().toISOString()
        });

        // Welcome Notification
        await dbService.create('notifications', {
          uid: userProfile.uid,
          title: '👑 Creator Blessed Tier Activated!',
          message: `Your account has been elevated to the ${allocatedTier.toUpperCase()} tier blessed directly by the Creator! All features unlocked.`,
          type: 'system',
          read: false,
          created_at: new Date().toISOString()
        });

        // Audit Trail
        await dbService.create('access_audit_logs', {
          action: 'Redeemed Blessed Creator PIN',
          performed_by: userProfile.email || userProfile.uid,
          target_user: blessedRecord.email,
          details: `Activated ${allocatedTier.toUpperCase()} Tier via Creator Blessed PIN (${blessedRecord.pin}).`,
          timestamp: new Date().toISOString()
        });

        addToast(`👑 Creator Blessed Tier (${allocatedTier.toUpperCase()}) Unlocked!`, "success");
        setCode('');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
        return;
      }

      // 2. Standard Access Keys check
      const keys = await dbService.list('access_keys');
      const keyData = keys.find((k: any) => k.key === uppercaseCode) as any;

      if (!keyData) {
        addToast("Invalid access code or PIN. Please check and try again.", "error");
        return;
      }

      // Check expiry
      if (keyData.expiry && new Date(keyData.expiry) < new Date()) {
        addToast("This access code has reached its cosmic expiration date.", "error");
        return;
      }

      // Check usage count
      if (keyData.usage_count >= keyData.usage_limit) {
        addToast("This access code has exceeded its active usage limit.", "error");
        return;
      }

      const role = keyData.type === 'student' ? 'student' : 'investor';
      const tier = role === 'investor' ? 'zion' : 'oracle';
      const tag = role === 'investor' ? 'Investor' : 'Student';

      // Update User Profile
      await dbService.update('users', userProfile.uid, {
        role,
        tier,
        subscriber_tag: tag,
        access_code_used: keyData.key,
        access_code_expiry: keyData.expiry || null,
        updated_at: new Date().toISOString()
      });

      // Update Key Usage Count
      await dbService.update('access_keys', keyData.id, {
        usage_count: (keyData.usage_count || 0) + 1
      });

      // Push Welcome Notification
      await dbService.create('notifications', {
        uid: userProfile.uid,
        title: 'Access Tier Unlocked 🔓',
        message: `Welcome to the ${tag} tier! Your unique access code was verified successfully and features are now fully unlocked.`,
        type: 'system',
        read: false,
        created_at: new Date().toISOString()
      });

      // Log to Audit Trail
      await dbService.create('access_audit_logs', {
        action: 'Entered Code',
        performed_by: userProfile.email || userProfile.uid,
        target_user: userProfile.email || userProfile.uid,
        details: `Activated ${tag} tier access via code ${keyData.key}. Expiry: ${keyData.expiry || 'Never'}.`,
        timestamp: new Date().toISOString()
      });

      addToast(`Verification successful! Welcome to the ${tag} tier.`, "success");
      setCode('');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error(err);
      addToast("Failed to verify access code or PIN. Please try again.", "error");
    } finally {
      setCheckingCode(false);
    }
  };

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
      await handleSupabaseError(err, OperationType.UPDATE, 'users');
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

      {/* Investor Access and Creator Code Issuance System */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
        {/* 1. Enter Access Code */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 border-gold/20 bg-gold/5 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gold/10 text-gold">
                <Key size={24} />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                  <Crown size={18} className="text-gold" /> Creator PIN or Access Code
                </h3>
                <p className="text-xs text-white/40">Enter your Creator-blessed PIN or unique access code below.</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ENTER CREATOR PIN OR ACCESS CODE (e.g. 777999 or BPRSA-XXXX)"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-gold/50 transition-all font-mono"
                />
              </div>

              {userProfile.subscriber_tag && (
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="text-xs text-white/60">
                    Current Tag: <span className="text-gold font-bold">{userProfile.subscriber_tag}</span>
                  </div>
                  {userProfile.access_code_expiry && (
                    <div className="text-[10px] text-white/40 font-mono">
                      Expires: {new Date(userProfile.access_code_expiry).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleVerifyCode}
            disabled={checkingCode || !code}
            className="w-full mt-6 bg-gold text-black py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
          >
            {checkingCode ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                Unlock Ascension <ArrowRight size={16} />
              </>
            )}
          </button>
        </motion.div>

        {/* 2. Request Investor Code (POPIA & Vetted List Compliant) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 border-white/10 bg-white/5 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400">
                <Mail size={24} />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-white">Vetted Investor Access</h3>
                <p className="text-xs text-white/40">Submit your email to request a secure code from the Creators.</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your vetted investor email"
                  value={emailToCheck}
                  onChange={(e) => {
                    setEmailToCheck(e.target.value);
                    setApprovedStatus('idle');
                  }}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition-all"
                />
                <button
                  onClick={checkEmailApproval}
                  disabled={checkingApproval || !emailToCheck}
                  className="px-4 bg-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {checkingApproval ? <Loader2 className="animate-spin" size={16} /> : "Verify"}
                </button>
              </div>

              {/* Status Indicator */}
              <AnimatePresence mode="wait">
                {approvedStatus === 'approved' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2"
                  >
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold">Email verified on approval list!</p>
                      <p className="text-[10px] opacity-80 mt-1">Submit your request below to notify the Creators. A unique code will be generated and issued directly to you.</p>
                    </div>
                  </motion.div>
                )}

                {approvedStatus === 'not_approved' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2"
                  >
                    <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold">Email not on vetted list</p>
                      <p className="text-[10px] opacity-80 mt-1">Only pre-approved investor emails qualify for upgrade requests. Contact the Creators for verification and manual vetting.</p>
                    </div>
                  </motion.div>
                )}

                {approvedStatus === 'request_pending' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs flex items-start gap-2"
                  >
                    <Loader2 className="animate-spin mt-0.5 shrink-0" size={16} />
                    <div>
                      <p className="font-bold">Request Pending</p>
                      <p className="text-[10px] opacity-80 mt-1">The Creators have been notified of your code request. Please await direct delivery to your email.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* POPIA Disclaimer */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] text-white/30 leading-relaxed">
                🛡️ <span className="font-bold text-white/50">POPIA Compliance:</span> We only retain approved emails solely for tier-access authentication. No promotional, tracker, or third-party marketing sharing of personal details is conducted.
              </div>
            </div>
          </div>

          <button
            onClick={submitCodeRequest}
            disabled={approvedStatus !== 'approved' || submittingRequest}
            className="w-full mt-6 bg-purple-500 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-purple-600 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
          >
            {submittingRequest ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                Request Code from Creators <Send size={14} />
              </>
            )}
          </button>
        </motion.div>
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
