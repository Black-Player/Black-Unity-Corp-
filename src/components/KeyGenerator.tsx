import React, { useState, useEffect } from 'react';
import { 
  Key, Plus, Copy, Check, Trash2, Shield, Clock, Users, Zap, Loader2, 
  Mail, ShieldCheck, Search, ShieldAlert, CheckCircle2, History, X, UserMinus,
  Crown, Sparkles, RefreshCw, KeyRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '../services/dbService';
import { AccessKey, UserProfile, UserRole, Tier, BlessedTierEmail } from '../types';

export default function KeyGenerator({ addToast, userProfile }: { addToast: any, userProfile?: UserProfile }) {
  const [activeTab, setActiveTab] = useState<'blessed' | 'codes' | 'vetted' | 'requests' | 'subscribers' | 'audit'>('blessed');
  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Blessed Tier Email States
  const [blessedEmails, setBlessedEmails] = useState<BlessedTierEmail[]>([]);
  const [loadingBlessed, setLoadingBlessed] = useState(false);
  const [newBlessedEmail, setNewBlessedEmail] = useState('');
  const [newBlessedTier, setNewBlessedTier] = useState<Tier>('creator');
  const [newBlessedNote, setNewBlessedNote] = useState('');
  const [blessing, setBlessing] = useState(false);

  // Standing Code Generation Form state
  const [type, setType] = useState<'student' | 'investor'>('student');
  const [usageLimit, setUsageLimit] = useState(1);
  const [expiryDays, setExpiryDays] = useState(7);

  // Vetted Email List states
  const [newVettedEmail, setNewVettedEmail] = useState('');
  const [vettedEmails, setVettedEmails] = useState<any[]>([]);
  const [addingVetted, setAddingVetted] = useState(false);

  // Pending Code Requests states
  const [codeRequests, setCodeRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Subscribers Monitoring states
  const [subscribers, setSubscribers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);

  // Audit logs states
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    fetchBlessedEmails();
    fetchKeys();
    fetchVettedEmails();
    fetchCodeRequests();
    fetchSubscribers();
    fetchAuditLogs();
  }, []);

  // Fetch functions using dbService
  const fetchBlessedEmails = async () => {
    setLoadingBlessed(true);
    try {
      let data = await dbService.list<BlessedTierEmail>('blessed_tier_emails');
      
      // Auto-provision master creator emails if not already present
      const masterEmails = ['kanitezu@gmail.com', 'andilenqobile561@gmail.com'];
      let needsRefresh = false;

      for (const masterEmail of masterEmails) {
        const exists = data.some(item => item.email?.toLowerCase() === masterEmail);
        if (!exists) {
          const masterDocId = masterEmail.replace(/[@.]/g, '_');
          const initialPin = Math.floor(100000 + Math.random() * 900000).toString();
          const masterRecord: BlessedTierEmail = {
            id: masterDocId,
            email: masterEmail,
            allocated_tier: 'creator',
            pin: initialPin,
            pin_status: 'active',
            blessed_by: 'Creator Auto-Provision',
            blessed_at: new Date().toISOString(),
            notes: 'Master Creator Account Blessed Email'
          };
          await dbService.create('blessed_tier_emails', masterRecord, masterDocId);
          needsRefresh = true;
        }
      }

      if (needsRefresh) {
        data = await dbService.list<BlessedTierEmail>('blessed_tier_emails');
      }

      setBlessedEmails(data.sort((a, b) => new Date(b.blessed_at).getTime() - new Date(a.blessed_at).getTime()));
    } catch (err) {
      console.error('Error fetching blessed emails:', err);
    } finally {
      setLoadingBlessed(false);
    }
  };

  const addBlessedEmail = async () => {
    if (!newBlessedEmail) return;
    setBlessing(true);
    try {
      const email = newBlessedEmail.toLowerCase().trim();
      const exists = blessedEmails.some(b => b.email.toLowerCase() === email);
      if (exists) {
        addToast(`${email} is already on the Blessed Tiers list.`, "info");
        return;
      }

      const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();
      const docId = email.replace(/[@.]/g, '_');

      const newRecord: BlessedTierEmail = {
        id: docId,
        email,
        allocated_tier: newBlessedTier,
        pin: generatedPin,
        pin_status: 'active',
        blessed_by: userProfile?.email || 'Creator',
        blessed_at: new Date().toISOString(),
        notes: newBlessedNote || `Blessed by Creator as ${newBlessedTier.toUpperCase()}`
      };

      await dbService.create('blessed_tier_emails', newRecord, docId);

      await dbService.create('access_audit_logs', {
        action: 'Blessed Email & PIN Generated',
        performed_by: userProfile?.email || 'Creator',
        target_user: email,
        details: `Blessed ${email} with ${newBlessedTier.toUpperCase()} Tier and generated Creator PIN: ${generatedPin}`,
        timestamp: new Date().toISOString()
      });

      addToast(`Blessed ${email}! Creator PIN Generated: ${generatedPin}`, "success");
      setNewBlessedEmail('');
      setNewBlessedNote('');
      fetchBlessedEmails();
      fetchAuditLogs();
    } catch (err) {
      console.error(err);
      addToast("Failed to bless email.", "error");
    } finally {
      setBlessing(false);
    }
  };

  const generateNewPinForEmail = async (item: BlessedTierEmail) => {
    try {
      const newPin = Math.floor(100000 + Math.random() * 900000).toString();
      await dbService.update('blessed_tier_emails', item.id, {
        pin: newPin,
        pin_status: 'active',
        blessed_at: new Date().toISOString()
      });

      await dbService.create('access_audit_logs', {
        action: 'Regenerated Creator PIN',
        performed_by: userProfile?.email || 'Creator',
        target_user: item.email,
        details: `Regenerated new Creator PIN (${newPin}) for blessed email: ${item.email}`,
        timestamp: new Date().toISOString()
      });

      addToast(`New Creator PIN generated for ${item.email}: ${newPin}`, "success");
      fetchBlessedEmails();
      fetchAuditLogs();
    } catch (err) {
      console.error(err);
      addToast("Failed to regenerate PIN.", "error");
    }
  };

  const removeBlessedEmail = async (id: string, email: string) => {
    try {
      await dbService.delete('blessed_tier_emails', id);

      await dbService.create('access_audit_logs', {
        action: 'Revoked Blessed Email',
        performed_by: userProfile?.email || 'Creator',
        target_user: email,
        details: `Removed ${email} from Creator Blessed Tiers list and revoked associated PIN.`,
        timestamp: new Date().toISOString()
      });

      addToast(`Removed ${email} from Creator Blessed list.`, "info");
      fetchBlessedEmails();
      fetchAuditLogs();
    } catch (err) {
      console.error(err);
      addToast("Failed to remove blessed email.", "error");
    }
  };

  const updateBlessedTier = async (item: BlessedTierEmail, tier: Tier) => {
    try {
      await dbService.update('blessed_tier_emails', item.id, {
        allocated_tier: tier
      });

      addToast(`Updated ${item.email} allocated tier to ${tier.toUpperCase()}`, "success");
      fetchBlessedEmails();
    } catch (err) {
      console.error(err);
      addToast("Failed to update allocated tier.", "error");
    }
  };

  // Fetch functions using dbService (Firestore-first with offline-fallback)
  const fetchKeys = async () => {
    setLoading(true);
    try {
      const data = await dbService.list('access_keys');
      setKeys(data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (err) {
      console.error('Error fetching access keys:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVettedEmails = async () => {
    try {
      const data = await dbService.list('investor_approved_emails');
      setVettedEmails(data.sort((a: any, b: any) => new Date(b.approved_at).getTime() - new Date(a.approved_at).getTime()));
    } catch (err) {
      console.error('Error fetching vetted list:', err);
    }
  };

  const fetchCodeRequests = async () => {
    setLoadingRequests(true);
    try {
      const data = await dbService.list('investor_code_requests');
      setCodeRequests(data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (err) {
      console.error('Error fetching code requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchSubscribers = async () => {
    setLoadingSubscribers(true);
    try {
      const data = await dbService.list('users');
      setSubscribers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoadingSubscribers(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const data = await dbService.list('access_audit_logs');
      setAuditLogs(data.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Standalone code generation
  const generateKey = async () => {
    setGenerating(true);
    try {
      const randomString = Math.random().toString(36).substring(2, 10).toUpperCase();
      const prefix = type === 'student' ? 'STU' : 'INV';
      const keyString = `${prefix}-${randomString}`;
      
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);

      const keyId = keyString.toLowerCase();
      const newKey: AccessKey = {
        id: keyId,
        key: keyString,
        type,
        usage_limit: usageLimit,
        usage_count: 0,
        expiry: expiryDate.toISOString(),
        created_at: new Date().toISOString(),
        signature: 'BP-RSA-SECURE-SIG'
      };

      await dbService.create('access_keys', newKey, keyId);

      // Create immutable audit log
      await dbService.create('access_audit_logs', {
        action: 'Generated Code',
        performed_by: userProfile?.email || 'Creator',
        target_user: 'Standalone Issuance',
        details: `Generated standard ${type} key ${keyString} (Limit: ${usageLimit}, Expiring in ${expiryDays} days).`,
        timestamp: new Date().toISOString()
      });

      addToast(`Generated ${type} access code: ${keyString}`, 'success');
      fetchKeys();
      fetchAuditLogs();
    } catch (error) {
      console.error('Error generating key:', error);
      addToast('Failed to generate key.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Standalone code deletion
  const deleteKey = async (id: string, keyStr: string) => {
    try {
      await dbService.delete('access_keys', id);

      // Log in audit trail
      await dbService.create('access_audit_logs', {
        action: 'Revoked Access Key',
        performed_by: userProfile?.email || 'Creator',
        target_user: 'Standalone Key',
        details: `Revoked and deleted access key: ${keyStr}.`,
        timestamp: new Date().toISOString()
      });

      addToast('Access key successfully revoked', 'info');
      fetchKeys();
      fetchAuditLogs();
    } catch (error) {
      console.error('Error deleting key:', error);
      addToast('Failed to revoke access key.', 'error');
    }
  };

  // Add vetted email
  const addVettedEmail = async () => {
    if (!newVettedEmail) return;
    setAddingVetted(true);
    try {
      const email = newVettedEmail.toLowerCase().trim();
      const exists = vettedEmails.some((e: any) => e.email === email);
      if (exists) {
        addToast("Email is already vetted on the approval list.", "info");
        return;
      }

      const docId = email.replace(/[@.]/g, '_');
      await dbService.create('investor_approved_emails', {
        email,
        approved_by: userProfile?.email || 'Creator',
        approved_at: new Date().toISOString()
      }, docId);

      // Immutable Audit log
      await dbService.create('access_audit_logs', {
        action: 'Approved Email',
        performed_by: userProfile?.email || 'Creator',
        target_user: email,
        details: `Vetted and added ${email} to the approved investor list.`,
        timestamp: new Date().toISOString()
      });

      addToast(`Vetted email ${email} successfully added.`, "success");
      setNewVettedEmail('');
      fetchVettedEmails();
      fetchAuditLogs();
    } catch (err) {
      console.error(err);
      addToast("Failed to add email to vetted list.", "error");
    } finally {
      setAddingVetted(false);
    }
  };

  // Delete vetted email
  const removeVettedEmail = async (id: string, email: string) => {
    try {
      await dbService.delete('investor_approved_emails', id);

      // Audit log
      await dbService.create('access_audit_logs', {
        action: 'Revoked Email Vetting',
        performed_by: userProfile?.email || 'Creator',
        target_user: email,
        details: `Revoked approved status and deleted email ${email} from vetting database.`,
        timestamp: new Date().toISOString()
      });

      addToast(`Vetted status revoked for ${email}`, "info");
      fetchVettedEmails();
      fetchAuditLogs();
    } catch (err) {
      console.error(err);
      addToast("Failed to remove vetted email.", "error");
    }
  };

  // Approve requests with automatic code generation
  const approveRequestAndGenerate = async (request: any) => {
    try {
      const randomString = Math.random().toString(36).substring(2, 10).toUpperCase();
      const keyString = `INV-${randomString}`;
      
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30); // 30 days default access

      const keyId = keyString.toLowerCase();
      const newKey: AccessKey = {
        id: keyId,
        key: keyString,
        type: 'investor',
        usage_limit: 1,
        usage_count: 0,
        expiry: expiryDate.toISOString(),
        created_at: new Date().toISOString(),
        signature: 'BP-RSA-SECURE-SIG'
      };

      // Create Key
      await dbService.create('access_keys', newKey, keyId);

      // Update request status
      await dbService.update('investor_code_requests', request.id, {
        status: 'approved',
        code_generated: keyString,
        updated_at: new Date().toISOString()
      });

      // Send immediate in-app notification to the applicant
      await dbService.create('notifications', {
        uid: request.uid,
        title: 'Investor Access Approved! 🌌',
        message: `The Creator has approved your access code! Use your unique code to activate: ${keyString} (Expires in 30 days).`,
        type: 'system',
        read: false,
        created_at: new Date().toISOString()
      });

      // Audit log
      await dbService.create('access_audit_logs', {
        action: 'Approved & Generated Code',
        performed_by: userProfile?.email || 'Creator',
        target_user: request.email,
        details: `Approved code request for ${request.email}. Generated INV code: ${keyString} expiring on ${expiryDate.toLocaleDateString()}.`,
        timestamp: new Date().toISOString()
      });

      addToast(`Approved! Code ${keyString} issued to ${request.email}.`, "success");
      fetchCodeRequests();
      fetchKeys();
      fetchAuditLogs();
    } catch (err) {
      console.error(err);
      addToast("Failed to approve and generate code.", "error");
    }
  };

  // Reject code request
  const rejectRequest = async (id: string, email: string) => {
    try {
      await dbService.update('investor_code_requests', id, {
        status: 'rejected',
        updated_at: new Date().toISOString()
      });

      // Audit log
      await dbService.create('access_audit_logs', {
        action: 'Rejected Code Request',
        performed_by: userProfile?.email || 'Creator',
        target_user: email,
        details: `Rejected code request from: ${email}.`,
        timestamp: new Date().toISOString()
      });

      addToast(`Code request from ${email} rejected.`, "info");
      fetchCodeRequests();
      fetchAuditLogs();
    } catch (err) {
      console.error(err);
      addToast("Failed to reject request.", "error");
    }
  };

  // Manual downgrade of a user's role and tag back to free tier
  const handleDowngradeUser = async (user: UserProfile) => {
    try {
      await dbService.update('users', user.uid, {
        role: 'subscriber',
        tier: 'free',
        subscriber_tag: 'Subscriber',
        access_code_used: null,
        access_code_expiry: null,
        updated_at: new Date().toISOString()
      });

      // Send downgrade notification
      await dbService.create('notifications', {
        uid: user.uid,
        title: 'Access Downgraded ⚠️',
        message: 'Your investor/student access tier has been manually revoked by the Creator.',
        type: 'system',
        read: false,
        created_at: new Date().toISOString()
      });

      // Audit log
      await dbService.create('access_audit_logs', {
        action: 'Manual Tier Downgrade',
        performed_by: userProfile?.email || 'Creator',
        target_user: user.email,
        details: `Manually downgraded user ${user.email} back to free tier and cleared all access tags.`,
        timestamp: new Date().toISOString()
      });

      addToast(`Manually downgraded ${user.email} to Free Tier.`, "info");
      fetchSubscribers();
      fetchAuditLogs();
    } catch (err) {
      console.error(err);
      addToast("Failed to downgrade user.", "error");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    addToast('Key copied to clipboard', 'success');
  };

  // Filter subscribers list
  const filteredSubscribers = subscribers.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.subscriber_tag?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header and Brand */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <span className="text-[10px] bg-gold/10 text-gold font-bold px-3 py-1 rounded-full border border-gold/20 tracking-widest uppercase">
            👑 Creator Oversight Hub
          </span>
          <h1 className="text-3xl font-display font-bold text-white mt-2">Access & Tier Control</h1>
          <p className="text-xs text-white/40 leading-relaxed mt-1">
            Generate and manage time-bound access keys, vetted approval lists, subscriber tags, and immutable audit logs.
          </p>
        </div>
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 shrink-0 select-none">
          {([
            { id: 'blessed', label: 'Blessed Tiers & PINs', icon: Crown },
            { id: 'codes', label: 'Access Keys', icon: Key },
            { id: 'vetted', label: 'Vetted Emails', icon: Mail },
            { id: 'requests', label: 'Requests', icon: Clock },
            { id: 'subscribers', label: 'Tag Monitor', icon: Users },
            { id: 'audit', label: 'Audit Trail', icon: History }
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-gold text-black shadow-lg shadow-gold/10' 
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <tab.icon size={14} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Control Panels */}
      <div className="space-y-6">
        {/* TAB 0: Creator Blessed Tiers & PINs */}
        {activeTab === 'blessed' && (
          <div className="space-y-6">
            <div className="glass-card p-6 border-gold/30 bg-gold/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gold/10 text-gold border border-gold/20">
                    <Crown size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                      Bless Email & Generate PIN
                    </h3>
                    <p className="text-xs text-white/40">
                      Grant special tiers blessed directly by the Creator. Add/remove emails at will and generate unique access PINs.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end pt-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Blessed Email</label>
                  <input
                    type="email"
                    placeholder="e.g. kanitezu@gmail.com or user@domain.com"
                    value={newBlessedEmail}
                    onChange={(e) => setNewBlessedEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-gold/50 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Allocated Tier</label>
                  <select
                    value={newBlessedTier}
                    onChange={(e) => setNewBlessedTier(e.target.value as Tier)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-gold/50 outline-none"
                  >
                    <option value="creator">Creator (Master Tier)</option>
                    <option value="mythic">Mythic</option>
                    <option value="legendary">Legendary</option>
                    <option value="zion">Zion</option>
                    <option value="oracle">Oracle</option>
                  </select>
                </div>

                <button
                  onClick={addBlessedEmail}
                  disabled={blessing || !newBlessedEmail}
                  className="w-full bg-gold text-black font-bold py-2.5 rounded-xl hover:bg-gold/80 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {blessing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                  Bless & Generate PIN
                </button>
              </div>

              <div className="pt-2">
                <input
                  type="text"
                  placeholder="Optional Note / Reason for Blessing (e.g. VIP Creator Partner)"
                  value={newBlessedNote}
                  onChange={(e) => setNewBlessedNote(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white/70 focus:border-gold/50 outline-none"
                />
              </div>
            </div>

            {/* Roster of Creator Blessed Emails */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-widest text-white/60 flex items-center gap-2">
                  <Crown size={16} className="text-gold" /> Creator Blessed Roster ({blessedEmails.length})
                </h4>
                <button
                  onClick={fetchBlessedEmails}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <RefreshCw size={12} /> Refresh Roster
                </button>
              </div>

              {loadingBlessed ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin text-gold" size={32} />
                </div>
              ) : blessedEmails.length === 0 ? (
                <div className="glass-card p-12 text-center border-white/5 opacity-40">
                  <Crown className="mx-auto mb-4" size={48} />
                  <p className="text-sm italic">No blessed emails present. Add emails above to grant creator-blessed PIN access.</p>
                </div>
              ) : (
                <div className="glass-card border-white/5 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] text-white/40 font-bold uppercase tracking-wider">
                          <th className="px-6 py-4">Blessed Email</th>
                          <th className="px-6 py-4">Allocated Tier</th>
                          <th className="px-6 py-4">Creator PIN</th>
                          <th className="px-6 py-4">PIN Status</th>
                          <th className="px-6 py-4">Blessed At</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs text-white/70">
                        {blessedEmails.map((item) => {
                          const isMaster = ['kanitezu@gmail.com', 'andilenqobile561@gmail.com'].includes(item.email.toLowerCase());
                          return (
                            <tr key={item.id} className="hover:bg-white/[0.01] transition-all">
                              <td className="px-6 py-4 font-bold text-white">
                                <div className="flex items-center gap-2">
                                  <span>{item.email}</span>
                                  {isMaster && (
                                    <span className="px-2 py-0.5 rounded-full text-[8px] bg-gold/20 text-gold border border-gold/30 font-bold">
                                      👑 Master Creator
                                    </span>
                                  )}
                                </div>
                                {item.notes && <p className="text-[10px] text-white/40 font-normal mt-0.5">{item.notes}</p>}
                              </td>
                              <td className="px-6 py-4">
                                <select
                                  value={item.allocated_tier || 'creator'}
                                  onChange={(e) => updateBlessedTier(item, e.target.value as Tier)}
                                  className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-gold font-mono uppercase font-bold focus:outline-none"
                                >
                                  <option value="creator">CREATOR</option>
                                  <option value="mythic">MYTHIC</option>
                                  <option value="legendary">LEGENDARY</option>
                                  <option value="zion">ZION</option>
                                  <option value="oracle">ORACLE</option>
                                </select>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-sm text-gold tracking-widest bg-gold/10 px-3 py-1 rounded-lg border border-gold/20">
                                    {item.pin}
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(item.pin, item.id)}
                                    title="Copy PIN"
                                    className="p-1.5 hover:bg-white/10 text-white/40 hover:text-gold rounded-lg transition-all"
                                  >
                                    {copiedId === item.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                  </button>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                                  item.pin_status === 'active'
                                    ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                                    : item.pin_status === 'redeemed'
                                    ? 'bg-blue-400/10 text-blue-400 border border-blue-400/20'
                                    : 'bg-rose-400/10 text-rose-400 border border-rose-400/20'
                                }`}>
                                  {item.pin_status || 'active'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-white/40 text-[10px]">
                                {new Date(item.blessed_at).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end items-center gap-2">
                                  <button
                                    onClick={() => generateNewPinForEmail(item)}
                                    title="Generate New PIN"
                                    className="px-2.5 py-1.5 bg-gold/10 hover:bg-gold/20 text-gold rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                  >
                                    <KeyRound size={12} />
                                    Regenerate PIN
                                  </button>
                                  <button
                                    onClick={() => removeBlessedEmail(item.id, item.email)}
                                    title="Remove Email from Blessed List"
                                    className="p-1.5 text-white/40 hover:text-rose-400 rounded-lg hover:bg-white/5 transition-all"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* TAB 1: Standalone Key Generator & Key List */}
        {activeTab === 'codes' && (
          <div className="space-y-6">
            <div className="glass-card p-6 border-gold/20 bg-gold/5">
              <div className="flex items-center gap-3 mb-6">
                <Key className="text-gold" size={24} />
                <h3 className="text-xl font-display font-bold uppercase tracking-widest">Generate Standalone Keys</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Key Type</label>
                  <select 
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-gold/50 outline-none"
                  >
                    <option value="student">Student (Oracle)</option>
                    <option value="investor">Investor (Zion)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Usage Limit</label>
                  <input 
                    type="number"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-gold/50 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Expiry (Days)</label>
                  <input 
                    type="number"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-gold/50 outline-none"
                  />
                </div>

                <button 
                  onClick={generateKey}
                  disabled={generating}
                  className="w-full bg-gold text-black font-bold py-2.5 rounded-xl hover:bg-gold/80 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {generating ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                  Generate Key
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-white/60 flex items-center gap-2">
                <Shield size={16} /> Standalone Keys Vault
              </h4>

              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin text-gold" size={32} />
                </div>
              ) : keys.length === 0 ? (
                <div className="glass-card p-12 text-center border-white/5 opacity-40">
                  <Key className="mx-auto mb-4" size={48} />
                  <p className="text-sm italic">No standalone access keys present in database.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence initial={false}>
                    {keys.map((key) => (
                      <motion.div
                        key={key.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="glass-card p-4 border-white/5 hover:border-gold/20 transition-all group"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                            key.type === 'student' ? 'bg-blue-400/10 text-blue-400' : 'bg-emerald-400/10 text-emerald-400'
                          }`}>
                            {key.type} Code
                          </span>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => copyToClipboard(key.key, key.id)}
                              className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-gold transition-all"
                            >
                              {copiedId === key.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                            </button>
                            <button 
                              onClick={() => deleteKey(key.id, key.key)}
                              className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-rose-400 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <p className="text-lg font-mono font-bold text-white tracking-wider">{key.key}</p>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-[10px] text-white/40 font-bold uppercase justify-end">
                              <Users size={10} /> {key.usage_count} / {key.usage_limit}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-white/40 font-bold uppercase justify-end">
                              <Clock size={10} /> {new Date(key.expiry!).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Vetted Investor Emails */}
        {activeTab === 'vetted' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 glass-card p-6 h-fit space-y-4">
              <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                <ShieldCheck className="text-emerald-400" size={20} />
                Vet Investor Email
              </h3>
              <p className="text-xs text-white/40 leading-relaxed">
                Add certified investor email addresses below. Only pre-vetted emails are permitted to request/verify premium tier access.
              </p>
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="investor@example.com"
                  value={newVettedEmail}
                  onChange={(e) => setNewVettedEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  onClick={addVettedEmail}
                  disabled={addingVetted || !newVettedEmail}
                  className="w-full bg-emerald-500 text-white font-bold py-3 rounded-xl hover:bg-emerald-600 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {addingVetted ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                  Add to Vetted List
                </button>
              </div>
            </div>

            <div className="md:col-span-2 space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-white/60 flex items-center gap-2">
                <Users size={16} /> Vetted Approval Database ({vettedEmails.length})
              </h4>

              {vettedEmails.length === 0 ? (
                <div className="glass-card p-12 text-center border-white/5 opacity-40">
                  <Mail className="mx-auto mb-4" size={48} />
                  <p className="text-sm italic">No pre-vetted emails registered. Add emails to begin vetting.</p>
                </div>
              ) : (
                <div className="glass-card border-white/5 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] text-white/40 font-bold uppercase tracking-wider">
                          <th className="px-6 py-4">Investor Email</th>
                          <th className="px-6 py-4">Approved By</th>
                          <th className="px-6 py-4">Vetted At</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs text-white/70">
                        {vettedEmails.map((item) => (
                          <tr key={item.id} className="hover:bg-white/[0.01] transition-all">
                            <td className="px-6 py-4 font-bold text-white">{item.email}</td>
                            <td className="px-6 py-4 text-white/40">{item.approved_by}</td>
                            <td className="px-6 py-4 text-white/40">
                              {new Date(item.approved_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => removeVettedEmail(item.id, item.email)}
                                className="p-2 text-white/40 hover:text-rose-400 rounded-lg hover:bg-white/5 transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Pending Code Requests */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <Clock size={20} className="text-purple-400" />
              Incoming Access Code Requests
            </h3>
            <p className="text-xs text-white/40 leading-relaxed max-w-2xl">
              Vetted users submit requests which display here. Granting approval automatically generates a unique time-bound 30-day code and pushes a secure, personalized notification.
            </p>

            {loadingRequests ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-gold" size={32} />
              </div>
            ) : codeRequests.length === 0 ? (
              <div className="glass-card p-12 text-center border-white/5 opacity-40">
                <Clock className="mx-auto mb-4" size={48} />
                <p className="text-sm italic">No incoming requests received.</p>
              </div>
            ) : (
              <div className="glass-card border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] text-white/40 font-bold uppercase tracking-wider">
                        <th className="px-6 py-4">Applicant Email</th>
                        <th className="px-6 py-4">Requested At</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Generated Code</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs text-white/70">
                      {codeRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-white/[0.01] transition-all">
                          <td className="px-6 py-4 font-bold text-white">{req.email}</td>
                          <td className="px-6 py-4 text-white/40">
                            {new Date(req.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                              req.status === 'pending' 
                                ? 'bg-gold/10 text-gold animate-pulse' 
                                : req.status === 'approved' 
                                ? 'bg-emerald-400/10 text-emerald-400' 
                                : 'bg-rose-400/10 text-rose-400'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-gold">
                            {req.code_generated || '—'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {req.status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => approveRequestAndGenerate(req)}
                                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all"
                                >
                                  Approve & Issue
                                </button>
                                <button
                                  onClick={() => rejectRequest(req.id, req.email)}
                                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-bold transition-all"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Subscriber Tag Monitor */}
        {activeTab === 'subscribers' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                  <ShieldCheck size={20} className="text-gold" />
                  Real-time Tag Oversight
                </h3>
                <p className="text-xs text-white/40">Monitor active user profiles, roles, assigned subscriber tags, and time-bound code expirations.</p>
              </div>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
                <input
                  type="text"
                  placeholder="Search email, tag, role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold/50"
                />
              </div>
            </div>

            {loadingSubscribers ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-gold" size={32} />
              </div>
            ) : filteredSubscribers.length === 0 ? (
              <div className="glass-card p-12 text-center border-white/5 opacity-40">
                <Search className="mx-auto mb-4" size={48} />
                <p className="text-sm italic">No matches found for search query.</p>
              </div>
            ) : (
              <div className="glass-card border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] text-white/40 font-bold uppercase tracking-wider">
                        <th className="px-6 py-4">User Profile</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Tier</th>
                        <th className="px-6 py-4">Subscriber Tag</th>
                        <th className="px-6 py-4">Active Key</th>
                        <th className="px-6 py-4">Code Expiration</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs text-white/70">
                      {filteredSubscribers.map((sub) => {
                        const isExpired = sub.access_code_expiry ? new Date(sub.access_code_expiry) < new Date() : false;
                        
                        return (
                          <tr key={sub.uid} className="hover:bg-white/[0.01] transition-all">
                            <td className="px-6 py-4">
                              <p className="font-bold text-white">{sub.email}</p>
                              <p className="text-[9px] text-white/30">ID: {sub.uid}</p>
                            </td>
                            <td className="px-6 py-4 font-mono uppercase text-white/60">{sub.role}</td>
                            <td className="px-6 py-4 font-mono uppercase text-gold">{sub.tier}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                                sub.subscriber_tag === 'Investor' 
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                                  : sub.subscriber_tag === 'Student' 
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                                  : 'bg-white/5 text-white/40'
                              }`}>
                                {sub.subscriber_tag || 'Subscriber'}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono text-white/40">{sub.access_code_used || '—'}</td>
                            <td className="px-6 py-4">
                              {sub.access_code_expiry ? (
                                <div className="space-y-0.5">
                                  <p className={`font-mono font-bold ${isExpired ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    {new Date(sub.access_code_expiry).toLocaleDateString()}
                                  </p>
                                  <p className="text-[9px] text-white/30">
                                    {isExpired ? 'Expired' : `${Math.ceil((new Date(sub.access_code_expiry).getTime() - new Date().getTime()) / (1000 * 3600 * 24))} days left`}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-white/30">Lifetime / Manual</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {(sub.subscriber_tag === 'Investor' || sub.subscriber_tag === 'Student') && (
                                <button
                                  onClick={() => handleDowngradeUser(sub)}
                                  className="px-2.5 py-1.5 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[10px] font-bold flex items-center gap-1.5 ml-auto transition-all"
                                >
                                  <UserMinus size={12} />
                                  Downgrade to Novice
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Immutable Audit Trail */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                  <History size={20} className="text-emerald-400" />
                  Immutable Access Log Trail
                </h3>
                <p className="text-xs text-white/40">Secure history log of all approval vetting, access key generations, code validation activations, and automated server-side downgrades.</p>
              </div>
              <button
                onClick={fetchAuditLogs}
                className="px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <History size={12} />
                Refresh Trail
              </button>
            </div>

            {loadingAudit ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-gold" size={32} />
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="glass-card p-12 text-center border-white/5 opacity-40">
                <History className="mx-auto mb-4" size={48} />
                <p className="text-sm italic">Audit log database empty.</p>
              </div>
            ) : (
              <div className="glass-card border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] text-white/40 font-bold uppercase tracking-wider">
                        <th className="px-6 py-4">Action</th>
                        <th className="px-6 py-4">Performed By</th>
                        <th className="px-6 py-4">Target User</th>
                        <th className="px-6 py-4">Details</th>
                        <th className="px-6 py-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs text-white/60 font-mono">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/[0.01] transition-all">
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                              log.action.includes('Approved') || log.action.includes('Vetted')
                                ? 'bg-emerald-400/10 text-emerald-400' 
                                : log.action.includes('Downgrade') || log.action.includes('Revoked')
                                ? 'bg-rose-400/10 text-rose-400' 
                                : log.action.includes('Generated')
                                ? 'bg-gold/10 text-gold'
                                : 'bg-blue-400/10 text-blue-400'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-white/40 text-[10px] font-bold">{log.performed_by}</td>
                          <td className="px-6 py-4 text-white/70 text-[10px] font-bold">{log.target_user}</td>
                          <td className="px-6 py-4 text-white/60 font-sans text-xs leading-relaxed max-w-sm">{log.details}</td>
                          <td className="px-6 py-4 text-white/30 text-[10px]">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
