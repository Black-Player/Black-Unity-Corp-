import { useState } from 'react';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Share2, Copy, Check, Globe, MessageSquare, Bell, Shield, Terminal, Code, ExternalLink, Sparkles } from 'lucide-react';

export default function SignalStream({ userProfile, addToast }: { userProfile: UserProfile, addToast: any }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'webhooks' | 'api' | 'integrations'>('webhooks');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    addToast('Copied to cosmic clipboard.', 'success');
    setTimeout(() => setCopied(null), 2000);
  };

  const webhooks = [
    { id: 'telegram', name: 'Telegram Bot', url: `https://api.blackunity.corp/v1/webhooks/tg/${userProfile.uid}`, icon: MessageSquare },
    { id: 'discord', name: 'Discord Webhook', url: `https://api.blackunity.corp/v1/webhooks/dc/${userProfile.uid}`, icon: Globe },
    { id: 'custom', name: 'Custom Endpoint', url: `https://api.blackunity.corp/v1/webhooks/custom/${userProfile.uid}`, icon: Terminal },
  ];

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-3xl font-display font-bold gold-gradient">Signal Stream</h1>
        <p className="text-white/40">Export Oracle prophecies to your favorite platforms in real-time.</p>
      </header>

      <div className="flex gap-4 p-1 bg-white/5 rounded-xl w-fit border border-white/5">
        {['webhooks', 'api', 'integrations'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
              activeTab === tab ? 'bg-gold text-black' : 'text-white/40 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'webhooks' && (
              <motion.div
                key="webhooks"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {webhooks.map((webhook) => (
                  <div key={webhook.id} className="glass-card p-6 border-white/5 hover:border-gold/20 transition-all space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center text-gold border border-gold/20">
                          <webhook.icon size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg font-display font-bold">{webhook.name}</h3>
                          <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Real-time signal push</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-400/10 text-emerald-400 text-[8px] font-bold uppercase tracking-widest">Active</span>
                        <button className="p-2 text-white/20 hover:text-white transition-all"><Settings size={16} /></button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-xs text-white/40 truncate">
                        {webhook.url}
                      </div>
                      <button 
                        onClick={() => copyToClipboard(webhook.url, webhook.id)}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-gold transition-all"
                      >
                        {copied === webhook.id ? <Check size={20} /> : <Copy size={20} />}
                      </button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'api' && (
              <motion.div
                key="api"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-card p-8 border-white/5 space-y-8"
              >
                <div className="space-y-4">
                  <h3 className="text-xl font-display font-bold flex items-center gap-2">
                    <Code className="text-gold" size={20} /> API Access Keys
                  </h3>
                  <div className="p-4 rounded-xl bg-gold/5 border border-gold/10 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Production Key</p>
                      <p className="font-mono text-sm text-gold mt-1">bu_live_••••••••••••••••••••••••</p>
                    </div>
                    <button className="gold-button px-4 py-2 text-[10px]">Reveal Key</button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-display font-bold">Quick Start</h3>
                  <div className="bg-black/60 rounded-xl p-6 font-mono text-xs text-emerald-400/80 space-y-2 overflow-x-auto">
                    <p>curl -X GET "https://api.blackunity.corp/v1/signals"</p>
                    <p>  -H "Authorization: Bearer YOUR_API_KEY"</p>
                    <p>  -H "Content-Type: application/json"</p>
                  </div>
                </div>

                <button className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/40 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2">
                  <ExternalLink size={14} /> View Documentation
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 bg-gold/5 border-gold/20 space-y-4">
            <h3 className="text-lg font-display font-bold flex items-center gap-2">
              <Shield className="text-gold" size={20} /> Security Policy
            </h3>
            <p className="text-xs text-white/60 leading-relaxed">
              All signal streams are encrypted using AES-256. Webhooks are signed with a secret key to ensure authenticity. Never share your API keys with anyone.
            </p>
            <div className="pt-4 border-t border-white/5 space-y-3">
              <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold">
                <span className="text-white/40">IP Whitelisting</span>
                <span className="text-emerald-400">Enabled</span>
              </div>
              <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold">
                <span className="text-white/40">Rate Limit</span>
                <span className="text-gold">100 req/min</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 border-white/5 space-y-4">
            <h3 className="text-lg font-display font-bold flex items-center gap-2 text-white/60">
              <Sparkles size={20} /> Pro Features
            </h3>
            <div className="space-y-3">
              {[
                { label: 'WebSocket Stream', desc: 'Real-time low latency' },
                { label: 'Batch Export', desc: 'Daily CSV/JSON reports' },
                { label: 'Custom Payload', desc: 'Map signals to your schema' },
              ].map((feature) => (
                <div key={feature.label} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-gold" />
                  <div>
                    <p className="text-xs font-bold">{feature.label}</p>
                    <p className="text-[10px] text-white/40">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Settings({ size }: { size: number }) {
  return <Zap size={size} />;
}
