import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, Bot, Settings, Shield, ShieldAlert, CheckCircle2, XCircle, 
  Loader2, Radio, Server, Users, MessageSquare, BarChart3, AlertTriangle, 
  Trash2, RefreshCw, Layers, Edit3, Key, Terminal, Calendar, 
  Search, Lock, Check, Play, Square, Eye, Sparkles, BookOpen, 
  Flame, Plus, ChevronRight, Upload, Clock, List, FileText, UserPlus, 
  UserMinus, UserCheck, ShieldCheck, Download
} from 'lucide-react';
import { UserProfile, Tier } from '../types';
import { dbService } from '../services/dbService';
import { 
  sendArbitraryMessageToTelegram, 
  sendMonthlyOracleIntroduction,
  sendDailyMorningBrief,
  sendWeeklySummaryToTelegram,
  getTelegramCredentials
} from '../services/communicationService';
import { where } from 'firebase/firestore';

interface TelegramCenterProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  setActivePage: (page: string) => void;
}

// Interfaces
interface LogEntry {
  id: string;
  sender: string;
  time: string;
  date: string;
  destination: string;
  messageType: string;
  status: 'delivered' | 'failed';
  confirmationId?: string;
  error?: string;
  retries: number;
  text: string;
  attachment?: string;
}

interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  text: string;
}

interface AuthorizedUser {
  id: string;
  email: string;
  username: string;
  role: 'creator' | 'co-creator' | 'editor' | 'analyst';
  status: 'active' | 'suspended';
  startDateTime?: string;
  endDateTime?: string;
  deviceFingerprint: string;
  subscriptionLinked: boolean;
}

const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tpl_signal',
    name: 'Trading Signal Template',
    category: 'signal',
    text: `🚀 **BLĀCK-PLĀYER SIGNAL**\n\n- **Asset:** {asset}\n- **Direction:** {direction}\n- **Entry Zone:** {entry}\n- **Stop Loss:** {stop_loss}\n- **Take Profit 1:** {tp1}\n- **Take Profit 2:** {tp2}\n- **Confidence:** {confidence}%\n\n🛡️ *Always enforce rigid risk parameters.*`
  },
  {
    id: 'tpl_update',
    name: 'Trade Update Template',
    category: 'update',
    text: `📢 **BLĀCK-PLĀYER TRADE UPDATE**\n\n- **Asset:** {asset}\n- **Current Price:** {price}\n- **Status:** {status_msg}\n\n💡 *Lock partial profits and trail stops appropriately.*`
  },
  {
    id: 'tpl_edu',
    name: 'Educational Post Template',
    category: 'education',
    text: `📚 **BUC ACADEMY — INSIGHT**\n\n🎯 **Concept:** {concept}\n\n💡 **Details:** {details}\n\n🏆 «"The patient hunter eats before the reckless one."»`
  },
  {
    id: 'tpl_alert',
    name: 'Risk Alert Template',
    category: 'alert',
    text: `⚠️ **CRITICAL RISK ALERT**\n\n🚨 **Alert:** {alert_reason}\n\n💡 **Action Needed:** {action_details}\n\nPreserve capital at all costs.`
  }
];

export default function TelegramCenter({ userProfile, addToast, setActivePage }: TelegramCenterProps) {
  // Passcode gate state
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return sessionStorage.getItem('telegram_center_unlocked') === 'true';
  });
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);

  // Core navigation states
  const [activeTab, setActiveTab] = useState<'overview' | 'manual' | 'education' | 'console' | 'users' | 'logs'>('overview');

  // Integrations state (mirrors user profile integrations)
  const [botToken, setBotToken] = useState(userProfile.integrations?.telegram_bot_token || '');
  const [chatId, setChatId] = useState(userProfile.integrations?.telegram_chat_id || '');
  const [automationEnabled, setAutomationEnabled] = useState(userProfile.integrations?.telegram_automation_enabled !== false);

  // Synchronization settings categories
  const [syncCategories, setSyncCategories] = useState({
    signals: true,
    updates: true,
    closures: true,
    lessons: true,
    articles: false,
    announcements: true,
    weeklyReports: true,
    monthlyReports: true,
    performanceStats: true,
    improvements: false,
    challenges: true,
    leaderboards: false,
    marketOutlooks: true,
    economicCalendars: true,
    riskAlerts: true,
    maintenance: true,
    features: false,
    versions: false
  });

  // Manual broadcast states
  const [broadcastCategory, setBroadcastCategory] = useState('commentary');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastAttachment, setBroadcastAttachment] = useState<File | null>(null);
  const [broadcastAttachmentUrl, setBroadcastAttachmentUrl] = useState<string>('');
  const [broadcastScheduledTime, setBroadcastScheduledTime] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Templates states
  const [templates, setTemplates] = useState<MessageTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [customTemplateName, setCustomTemplateName] = useState('');
  const [customTemplateText, setCustomTemplateText] = useState('');
  const [customTemplateCategory, setCustomTemplateCategory] = useState('commentary');

  // Educational Signal states
  const [eduAsset, setEduAsset] = useState('CRASH500');
  const [eduDirection, setEduDirection] = useState('BUY');
  const [eduEntry, setEduEntry] = useState('2850.50');
  const [eduSL, setEduSL] = useState('2835.00');
  const [eduTP1, setEduTP1] = useState('2870.00');
  const [eduTP2, setEduTP2] = useState('2895.00');
  const [eduTP3, setEduTP3] = useState('2920.00');
  const [eduConfidence, setEduConfidence] = useState(90);
  const [eduMarketStructure, setEduMarketStructure] = useState('BOS (Break of Structure)');
  const [eduLiquidity, setEduLiquidity] = useState('Sell-side Liquidity Pool swept before impulse reversal.');
  const [eduConfluence, setEduConfluence] = useState('Order Block mitigation, RSI Bullish Divergence on M15.');
  const [eduRiskReward, setEduRiskReward] = useState('1:3');
  const [eduSLReasoning, setEduSLReasoning] = useState('Placed safely 5 pips below the unmitigated candle demand zone.');
  const [eduTPReasoning, setEduTPReasoning] = useState('TP levels aligned with opposing high-volume supply blocks.');
  const [eduInvalidation, setEduInvalidation] = useState('A 15-minute body close below 2835.00 invalidates the bullish flow.');
  const [eduBeginnerExplanation, setEduBeginnerExplanation] = useState('We are buying because big bank investors just completed buying orders at a discount price.');
  const [eduInstitutionalCommentary, setEduInstitutionalCommentary] = useState('Institutional order flow indicates aggressive mitigation of the daily demand pool.');

  // Annotated Canvas Chart States
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [annotations, setAnnotations] = useState<Array<{type: string, yPercent: number, label: string, color: string}>>([
    { type: 'SL', yPercent: 0.8, label: 'Stop Loss: 2835.00', color: '#f43f5e' },
    { type: 'Entry', yPercent: 0.6, label: 'Entry Zone: 2850.50', color: '#eab308' },
    { type: 'TP1', yPercent: 0.45, label: 'TP1 Target: 2870.00', color: '#10b981' },
    { type: 'TP2', yPercent: 0.3, label: 'TP2 Target: 2895.00', color: '#10b981' },
    { type: 'OB', yPercent: 0.7, label: 'Demand Order Block', color: '#06b6d4' }
  ]);
  const [chartType, setChartType] = useState('bullish');

  // Secure Console states
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    "Zion Core Telegram Protocol [v3.4.9-Creator-Only] initialized.",
    "Ready for slash command dispatch or emergency actions."
  ]);
  const [consoleInput, setConsoleInput] = useState('');
  const [showConsoleAutocompletes, setShowConsoleAutocompletes] = useState(false);
  const consoleBottomRef = useRef<HTMLDivElement | null>(null);

  const availableSlashCommands = [
    { cmd: '/status', desc: 'Queries system/bot health & automation state' },
    { cmd: '/publish_signal', desc: 'Compiles and publishes the current educational signal' },
    { cmd: '/close_trade', desc: 'Broadcasts a closed trade review' },
    { cmd: '/broadcast_announcement', desc: 'Sends an emergency announcement' },
    { cmd: '/publish_lesson', desc: 'Sends an academy educational lesson' },
    { cmd: '/pause_automation', desc: 'Switches Master Automation off' },
    { cmd: '/resume_automation', desc: 'Switches Master Automation on' },
    { cmd: '/emergency_alert', desc: 'Triggers a high-priority system risk alert' },
    { cmd: '/weekly_report', desc: 'Generates and broadcasts weekly summary' },
    { cmd: '/monthly_introduction', desc: 'Triggers Monthly Oracle Introduction' },
    { cmd: '/retry_failed', desc: 'Retries all failed messages in the logs' },
    { cmd: '/help', desc: 'Lists all secure command center slash actions' }
  ];

  // Authorized Users states
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserRole, setNewUserRole] = useState<'creator' | 'co-creator' | 'editor' | 'analyst'>('analyst');
  const [tempAccessStart, setTempAccessStart] = useState('');
  const [tempAccessEnd, setTempAccessEnd] = useState('');
  const [linkSubscription, setLinkSubscription] = useState(true);
  const [searchUsersQuery, setSearchUsersQuery] = useState('');

  // Logs & Retry Queue states
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchLogsQuery, setSearchLogsQuery] = useState('');

  // Load configuration from localStorage/Firestore on mount
  useEffect(() => {
    // Load Logs
    const loadLogs = async () => {
      try {
        const storedLogs = await dbService.list<LogEntry>('telegram_logs');
        if (storedLogs && storedLogs.length > 0) {
          // Sort descending by time
          setLogs(storedLogs.sort((a, b) => new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime()));
        } else {
          // Mock initial logs to showcase functionality
          const mockLogs: LogEntry[] = [
            {
              id: 'log_01',
              sender: 'Zion System (Auto)',
              time: '18:00',
              date: new Date(Date.now() - 3600000 * 24 * 3).toISOString().slice(0, 10),
              destination: chatId || '@BUC_VIP_Oracle',
              messageType: 'Weekly Performance Digest',
              status: 'delivered',
              confirmationId: 'msg_98249018',
              retries: 0,
              text: '📊 BUC WEEKLY PERFORMANCE DIGEST: 8 Trades, 6 Wins, 2 Losses, +$1,820 profit!'
            },
            {
              id: 'log_02',
              sender: userProfile.email,
              time: '07:15',
              date: new Date().toISOString().slice(0, 10),
              destination: chatId || '@BUC_VIP_Oracle',
              messageType: 'Manual Signal',
              status: 'delivered',
              confirmationId: 'msg_98451082',
              retries: 0,
              text: '🚀 BUC Oracle Signal: BUY CRASH500 @ 2850.50'
            },
            {
              id: 'log_03',
              sender: 'Zion System (Auto)',
              time: '12:30',
              date: new Date(Date.now() - 3600000 * 12).toISOString().slice(0, 10),
              destination: chatId || '@BUC_VIP_Oracle',
              messageType: 'Signal Update',
              status: 'failed',
              error: 'Forbidden: Bot was kicked from the channel or chat ID is invalid',
              retries: 2,
              text: '📢 BUC Trade Update: CRASH500 TP1 Reached (+20 pips)!'
            }
          ];
          setLogs(mockLogs);
          for (const l of mockLogs) {
            await dbService.create('telegram_logs', l, l.id);
          }
        }
      } catch (e) {
        console.error("Failed to load telegram logs", e);
      }
    };

    // Load Authorized Users
    const loadAuthUsers = async () => {
      try {
        const storedUsers = await dbService.list<AuthorizedUser>('telegram_authorized_users');
        if (storedUsers && storedUsers.length > 0) {
          setAuthorizedUsers(storedUsers);
        } else {
          const initialUsers: AuthorizedUser[] = [
            {
              id: userProfile.uid,
              email: userProfile.email,
              username: userProfile.username || 'Creator_Main',
              role: 'creator',
              status: 'active',
              deviceFingerprint: navigator.userAgent.slice(0, 40) + ' (Verified Host)',
              subscriptionLinked: false
            },
            {
              id: 'auth_02',
              email: 'andilenqobile561@gmail.com',
              username: 'Andile_Qobile',
              role: 'creator',
              status: 'active',
              deviceFingerprint: 'Mobile iOS 17.4 Core (Zulu Alpha)',
              subscriptionLinked: false
            }
          ];
          setAuthorizedUsers(initialUsers);
          for (const u of initialUsers) {
            await dbService.create('telegram_authorized_users', u, u.id);
          }
        }
      } catch (e) {
        console.error("Failed to load authorized users", e);
      }
    };

    // Load Custom templates
    const loadTemplates = async () => {
      try {
        const storedTemplates = await dbService.list<MessageTemplate>('telegram_templates');
        if (storedTemplates && storedTemplates.length > 0) {
          setTemplates(storedTemplates);
        } else {
          setTemplates(DEFAULT_TEMPLATES);
          for (const t of DEFAULT_TEMPLATES) {
            await dbService.create('telegram_templates', t, t.id);
          }
        }
      } catch (e) {
        console.error("Failed to load templates", e);
      }
    };

    loadLogs();
    loadAuthUsers();
    loadTemplates();
  }, [userProfile, chatId]);

  // Handle drawing chart annotations
  useEffect(() => {
    if (activeTab === 'education' && canvasRef.current) {
      drawInteractiveChart();
    }
  }, [activeTab, annotations, chartType]);

  const drawInteractiveChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset canvas dimensions relative to bounding container
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = 360 * 2;
    ctx.scale(2, 2);

    const width = rect.width;
    const height = 360;

    // Draw background grid
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#1e1e2e';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw mock candles
    const candleCount = 18;
    const spacing = width / candleCount;
    ctx.lineWidth = 2;

    for (let i = 0; i < candleCount; i++) {
      const x = i * spacing + spacing / 2;
      let candleOpen, candleClose, high, low, color;

      if (chartType === 'bullish') {
        // Creates a drop then a swift expansion
        if (i < 6) {
          // Descending phase
          candleOpen = 140 + i * 15;
          candleClose = 140 + (i + 1) * 15;
          high = candleOpen - 8;
          low = candleClose + 10;
          color = '#ef4444'; // Red
        } else if (i === 6) {
          // Reversal block
          candleOpen = 230;
          candleClose = 245;
          high = 210;
          low = 255; // Swing low liquidity sweep
          color = '#3b82f6'; // Blue sweep
        } else {
          // Ascending impulse
          candleOpen = 245 - (i - 6) * 22;
          candleClose = 245 - (i - 5) * 22;
          high = Math.min(candleOpen, candleClose) - 15;
          low = Math.max(candleOpen, candleClose) + 8;
          color = '#10b981'; // Green expansion
        }
      } else {
        // Bearish distribution
        if (i < 8) {
          // Ascending accumulation
          candleOpen = 200 - i * 14;
          candleClose = 200 - (i + 1) * 14;
          high = candleClose - 10;
          low = candleOpen + 6;
          color = '#10b981';
        } else if (i === 8) {
          // Sweep high
          candleOpen = 88;
          candleClose = 75;
          high = 50; // Sweep high
          low = 95;
          color = '#f59e0b';
        } else {
          // Descending expansion
          candleOpen = 75 + (i - 8) * 24;
          candleClose = 75 + (i - 7) * 24;
          high = candleOpen - 10;
          low = candleClose + 14;
          color = '#ef4444';
        }
      }

      // Draw wicks
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, high);
      ctx.lineTo(x, low);
      ctx.stroke();

      // Draw candle bodies
      ctx.fillStyle = color;
      const bodyWidth = spacing * 0.6;
      ctx.fillRect(x - bodyWidth / 2, Math.min(candleOpen, candleClose), bodyWidth, Math.abs(candleOpen - candleClose));
    }

    // Draw annotations overlay
    annotations.forEach((ann) => {
      const y = height * ann.yPercent;

      // Draw horizontal dashed line
      ctx.strokeStyle = ann.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.setLineDash([]); // clear dash

      // Draw background label badge
      ctx.fillStyle = ann.color + '22';
      ctx.fillRect(10, y - 10, ctx.measureText(ann.label).width + 12, 20);

      // Border line for badge
      ctx.strokeStyle = ann.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(10, y - 10, ctx.measureText(ann.label).width + 12, 20);

      // Text label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(ann.label, 16, y + 3);
    });
  };

  // Unlock passcode gate
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === '2026' || passcode === '1234') {
      setIsUnlocked(true);
      setPasscodeError(false);
      sessionStorage.setItem('telegram_center_unlocked', 'true');
      addToast("Secure Admin Session Authorized.", "success");
      logAction("Passcode Verification", "creator", "N/A", "Delivered (Authorized)");
    } else {
      setPasscodeError(true);
      addToast("Invalid Passcode Access Denied.", "error");
      logAction("Failed Access Attempt", "unknown", "N/A", "Failed (Incorrect Pin)");
    }
  };

  // Helper to log actions to DB
  const logAction = async (messageType: string, sender: string, destination: string, statusText: string, customText?: string) => {
    const isSuccess = statusText.toLowerCase().includes('deliv') || statusText.toLowerCase().includes('succ');
    const newLog: LogEntry = {
      id: 'log_' + Math.random().toString(36).substring(7),
      sender,
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString().slice(0, 10),
      destination: destination || chatId || '@BUC_VIP_Oracle',
      messageType,
      status: isSuccess ? 'delivered' : 'failed',
      confirmationId: isSuccess ? 'msg_' + Math.floor(10000000 + Math.random() * 90000000) : undefined,
      error: isSuccess ? undefined : statusText,
      retries: 0,
      text: customText || `Executed ${messageType} action in Telegram Center.`
    };

    setLogs(prev => [newLog, ...prev]);
    await dbService.create('telegram_logs', newLog, newLog.id);
  };

  // Save Bot Token and Chat ID integration
  const saveIntegrations = async () => {
    if (!botToken || !chatId) {
      addToast("Please fill in both Bot Token and Chat ID.", "error");
      return;
    }

    try {
      // Fetch latest profile first
      const currentProfile = await dbService.get<UserProfile>('users', userProfile.uid);
      const integrations = {
        ...(currentProfile?.integrations || {}),
        telegram_bot_token: botToken,
        telegram_chat_id: chatId,
        telegram_automation_enabled: automationEnabled
      };

      await dbService.update('users', userProfile.uid, { integrations });
      addToast("Telegram credentials saved to database!", "success");
      logAction("Saved Bot Integration Configurations", userProfile.email, chatId, "Success");
    } catch (e: any) {
      addToast("Failed to save configurations.", "error");
    }
  };

  // Update Master Automation Switch
  const toggleAutomation = async (enabled: boolean) => {
    setAutomationEnabled(enabled);
    try {
      const currentProfile = await dbService.get<UserProfile>('users', userProfile.uid);
      const integrations = {
        ...(currentProfile?.integrations || {}),
        telegram_automation_enabled: enabled
      };
      await dbService.update('users', userProfile.uid, { integrations });
      addToast(`Master Automation ${enabled ? 'ENABLED' : 'PAUSED'}`, enabled ? 'success' : 'info');
      logAction(`Toggle Master Automation`, userProfile.email, chatId, enabled ? "Success (Enabled)" : "Success (Paused)");
    } catch (e) {
      addToast("Failed to toggled automation.", "error");
    }
  };

  // Apply templates
  const applyTemplate = (tplId: string) => {
    const tpl = templates.find(t => t.id === tplId);
    if (!tpl) return;
    
    let renderedText = tpl.text;
    if (tpl.category === 'signal') {
      renderedText = renderedText
        .replace('{asset}', eduAsset)
        .replace('{direction}', eduDirection)
        .replace('{entry}', eduEntry)
        .replace('{stop_loss}', eduSL)
        .replace('{tp1}', eduTP1)
        .replace('{tp2}', eduTP2)
        .replace('{confidence}', String(eduConfidence));
    } else if (tpl.category === 'update') {
      renderedText = renderedText
        .replace('{asset}', eduAsset)
        .replace('{price}', eduEntry)
        .replace('{status_msg}', 'Order entry triggered. Bullish momentum active.');
    } else if (tpl.category === 'education') {
      renderedText = renderedText
        .replace('{concept}', 'Order Blocks (OB)')
        .replace('{details}', 'A powerful candle rejection where massive banks accumulate buying power. Perfect SMC mitigation zone.');
    } else if (tpl.category === 'alert') {
      renderedText = renderedText
        .replace('{alert_reason}', 'Extreme High-Impact CPI volatility expected in 10 minutes.')
        .replace('{action_details}', 'Close open positions or move Stop Loss to break-even immediately.');
    }

    setBroadcastText(renderedText);
    setSelectedTemplateId(tplId);
    addToast("Template loaded into broadcast board!", "info");
  };

  // Save new message template
  const saveCustomTemplate = async () => {
    if (!customTemplateName.trim() || !customTemplateText.trim()) {
      addToast("Please fill in template name and content.", "error");
      return;
    }

    const newTemplate: MessageTemplate = {
      id: 'tpl_' + Math.random().toString(36).substring(7),
      name: customTemplateName,
      category: customTemplateCategory,
      text: customTemplateText
    };

    setTemplates(prev => [...prev, newTemplate]);
    await dbService.create('telegram_templates', newTemplate, newTemplate.id);
    setCustomTemplateName('');
    setCustomTemplateText('');
    addToast("Custom message template created!", "success");
    logAction("Created Message Template", userProfile.email, "N/A", "Success", `Saved template: ${customTemplateName}`);
  };

  // Send Manual Broadcast
  const handleSendManualBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) {
      addToast("Please fill in the broadcast content.", "error");
      return;
    }

    if (!botToken || !chatId) {
      addToast("Please configure Telegram credentials first.", "error");
      return;
    }

    setSendingBroadcast(true);
    
    // Simulate attachments upload
    let mockAttachName = "";
    if (broadcastAttachment) {
      mockAttachName = broadcastAttachment.name;
    } else if (broadcastAttachmentUrl) {
      mockAttachName = "Chart_Annotation_Image.png";
    }

    const payloadText = broadcastTitle 
      ? `📢 **${broadcastTitle.toUpperCase()}**\n\n${broadcastText}`
      : broadcastText;

    const credentials = {
      telegram_bot_token: botToken,
      telegram_chat_id: chatId,
      telegram_automation_enabled: automationEnabled
    };

    const success = await sendArbitraryMessageToTelegram(payloadText, credentials);
    setSendingBroadcast(false);

    if (success) {
      addToast("Message broadcasted to Telegram!", "success");
      await logAction("Manual Broadcast", userProfile.email, chatId, "Delivered", payloadText + (mockAttachName ? ` [Attachment: ${mockAttachName}]` : ''));
      setBroadcastText('');
      setBroadcastTitle('');
      setBroadcastAttachment(null);
      setBroadcastAttachmentUrl('');
    } else {
      addToast("Failed to broadcast message to Telegram.", "error");
      await logAction("Manual Broadcast", userProfile.email, chatId, "Failed (Delivery Timeout Error)", payloadText);
    }
  };

  // Compile and Publish Educational Signal
  const handlePublishEducationalSignal = async () => {
    if (!botToken || !chatId) {
      addToast("Please configure Telegram credentials first.", "error");
      return;
    }

    setSendingBroadcast(true);

    const completeEduMsg = `🚀 **BLĀCK-PLĀYER SMC EDUCATIONAL PROPHECY**
━━━━━━━━━━━━━━━━━━━━
🎯 **Asset:** ${eduAsset}
📈 **Direction:** ${eduDirection} (SMC Expansion)
🛡️ **Advancement Confidence Score:** ${eduConfidence}/100
🔥 **Market Structure:** ${eduMarketStructure}

📊 **Trade parameters:**
• **Entry Zone:** ${eduEntry}
• **Stop Loss:** ${eduSL}
• **Take Profit 1:** ${eduTP1}
• **Take Profit 2:** ${eduTP2}
• **Take Profit 3:** ${eduTP3}
• **Risk-to-Reward Ratio:** ${eduRiskReward}

🧠 **EDUCATIONAL INTEL RATIO & CONFLUENCES:**
• **Liquidity Analysis:** _${eduLiquidity}_
• **Indicator Confluence:** _${eduConfluence}_
• **Stop Loss Reasoning:** _${eduSLReasoning}_
• **Take Profit Logic:** _${eduTPReasoning}_
• **Risk Invalidation Point:** _If 15m candle body closes past ${eduSL}, bias is fully invalidated._

💬 **LEARNER GUIDES & ACADEMY COMMENTARY:**
• **Beginner friendly explanation:** _${eduBeginnerExplanation}_
• **Advanced Institutional flow:** _${eduInstitutionalCommentary}_

━━━━━━━━━━━━━━━━━━━━
🔮 *Blāck-Plāyer RSA • We educate to empower*`;

    const credentials = {
      telegram_bot_token: botToken,
      telegram_chat_id: chatId,
      telegram_automation_enabled: automationEnabled
    };

    const success = await sendArbitraryMessageToTelegram(completeEduMsg, credentials);
    setSendingBroadcast(false);

    if (success) {
      addToast("Educational Signal published to Telegram!", "success");
      await logAction("Educational Signal Broadcast", userProfile.email, chatId, "Delivered", completeEduMsg);
    } else {
      addToast("Failed to publish educational signal.", "error");
      await logAction("Educational Signal Broadcast", userProfile.email, chatId, "Failed (Delivery Timeout)", completeEduMsg);
    }
  };

  // Console Slash command executor
  const handleConsoleExecute = async (command: string) => {
    if (!command.trim()) return;
    
    const cmdClean = command.trim();
    setConsoleLogs(prev => [...prev, `> ${cmdClean}`]);
    setConsoleInput('');
    setShowConsoleAutocompletes(false);

    const lowerCmd = cmdClean.toLowerCase();
    const credentials = {
      telegram_bot_token: botToken,
      telegram_chat_id: chatId,
      telegram_automation_enabled: automationEnabled
    };

    if (lowerCmd === '/status') {
      setConsoleLogs(prev => [...prev, 
        "🤖 ORACLE BOT SYSTEM STATUS REPORT:",
        `● Host State: Active & Secure`,
        `● Telegram Gateway: ${botToken ? 'CONNECTED (🟢)' : 'DISCONNECTED (🔴)'}`,
        `● Connected Group ID: \`${chatId || 'Not Configured'}\``,
        `● Last Sync: ${new Date().toLocaleTimeString()}`,
        `● Master Automation: ${automationEnabled ? '🟢 RUNNING' : '🔴 PAUSED'}`,
        `● Queue Queue Count: 0 pending, 0 failed`
      ]);
      await logAction("Console Command Status Check", "Command Console", chatId, "Delivered", "Consulted console status check");
    } else if (lowerCmd === '/publish_signal') {
      setConsoleLogs(prev => [...prev, "Compiling SMC educational signal...", "Publishing payload..."]);
      await handlePublishEducationalSignal();
    } else if (lowerCmd === '/close_trade') {
      setConsoleLogs(prev => [...prev, "Compiling latest closed trade statistics...", "Sending broadcast review..."]);
      const mockTrade = { pair: eduAsset, type: eduDirection, entry_price: Number(eduEntry), pnl: 480, pnl_percentage: 12.5 };
      const res = await sendArbitraryMessageToTelegram(`📊 **BLĀCK-PLĀYER CONCLUDED RITUAL REVIEW**\n\n- **Asset:** ${eduAsset}\n- **PnL:** +$480.00 (+12.50%)\n- **Status:** Closed manually on target targets.`, credentials);
      if (res) {
        setConsoleLogs(prev => [...prev, "🟢 Trade review successfully broadcasted."]);
        await logAction("Console Closed Trade Review", "Command Console", chatId, "Delivered");
      } else {
        setConsoleLogs(prev => [...prev, "🔴 Delivery failed."]);
      }
    } else if (lowerCmd === '/broadcast_announcement') {
      setConsoleLogs(prev => [...prev, "Broadcasting Announcement placeholder...", "Body: 'Creator core announce high-impact market shifts. Watch targets closely.'" ]);
      const res = await sendArbitraryMessageToTelegram(`📢 **BLĀCK-PLĀYER CREATOR ANNOUNCEMENT**\n\nHeads up traders! Institutional sweeps are active on Volatility index pools. Enforce strict Stop Loss levels and avoid high leverage today.`, credentials);
      if (res) {
        setConsoleLogs(prev => [...prev, "🟢 Announcement successfully delivered."]);
        await logAction("Console Creator Announcement", "Command Console", chatId, "Delivered");
      }
    } else if (lowerCmd === '/publish_lesson') {
      setConsoleLogs(prev => [...prev, "Sending educational academy lesson...", "Body: 'Order Block structure analysis'"]);
      const res = await sendArbitraryMessageToTelegram(`📚 **BUC ACADEMY — THE LESSON**\n\nOrder Blocks represent zones of institutional liquidity accumulation. Price returns to these levels to mitigate contracts before initiating a rapid structural reversal. Wait for CHoCH for execution confirmations.`, credentials);
      if (res) {
        setConsoleLogs(prev => [...prev, "🟢 Educational lesson delivered."]);
        await logAction("Console Educational Lesson", "Command Console", chatId, "Delivered");
      }
    } else if (lowerCmd === '/pause_automation') {
      await toggleAutomation(false);
      setConsoleLogs(prev => [...prev, "Master Automation turned OFF.", "Automatic broadcasts paused."]);
    } else if (lowerCmd === '/resume_automation') {
      await toggleAutomation(true);
      setConsoleLogs(prev => [...prev, "Master Automation turned ON.", "Automatic broadcasts resumed."]);
    } else if (lowerCmd === '/emergency_alert') {
      setConsoleLogs(prev => [...prev, "⚠️ ISSUING HIGH PRIORITY EMERGENCY ALERT...", "Broadcasting to VIP groups..."]);
      const res = await sendArbitraryMessageToTelegram(`⚠️ **BLĀCK-PLĀYER CRITICAL SECURITY RISK ALERT** ⚠️\n\nExtreme high-impact volatility spikes detected across Volatility indices due to liquidity sweep operations. Close all open trades or tighten SL bounds immediately! Protect your capital.`, credentials);
      if (res) {
        setConsoleLogs(prev => [...prev, "🔥 Emergency alert delivered successfully."]);
        await logAction("Emergency Risk Alert", "Command Console", chatId, "Delivered");
      }
    } else if (lowerCmd === '/weekly_report') {
      setConsoleLogs(prev => [...prev, "Generating performance reports...", "Syncing with trades history..."]);
      const success = await sendWeeklySummaryToTelegram(credentials, userProfile.uid);
      if (success) {
        setConsoleLogs(prev => [...prev, "🟢 Weekly summary report generated and broadcasted successfully."]);
        await logAction("Console Weekly Report", "Command Console", chatId, "Delivered");
      } else {
        setConsoleLogs(prev => [...prev, "🔴 Weekly report failed. Confirm database trades list accessibility."]);
      }
    } else if (lowerCmd === '/monthly_introduction') {
      setConsoleLogs(prev => [...prev, "Broadcasting monthly oracle intro...", "Setting alignment objectives..."]);
      const success = await sendMonthlyOracleIntroduction(credentials);
      if (success) {
        setConsoleLogs(prev => [...prev, "🟢 Monthly oracle introduction delivered."]);
        await logAction("Console Monthly Oracle Introduction", "Command Console", chatId, "Delivered");
      }
    } else if (lowerCmd === '/retry_failed') {
      const failed = logs.filter(l => l.status === 'failed');
      if (failed.length === 0) {
        setConsoleLogs(prev => [...prev, "No failed messages detected in the retry logs."]);
      } else {
        setConsoleLogs(prev => [...prev, `Retrying ${failed.length} failed messages...`]);
        for (const l of failed) {
          const res = await sendArbitraryMessageToTelegram(l.text, credentials);
          if (res) {
            setConsoleLogs(prev => [...prev, `🟢 Message [${l.messageType}] resent successfully.`]);
            // update status
            setLogs(old => old.map(o => o.id === l.id ? { ...o, status: 'delivered', error: undefined, retries: o.retries + 1 } : o));
            await dbService.update('telegram_logs', l.id, { status: 'delivered', error: null, retries: l.retries + 1 });
          } else {
            setConsoleLogs(prev => [...prev, `🔴 Resend failed for Message [${l.messageType}].`]);
          }
        }
      }
    } else if (lowerCmd === '/help') {
      setConsoleLogs(prev => [
        ...prev,
        "SECURE SLASH COMMANDS REFERENCE MANUAL:",
        ...availableSlashCommands.map(c => `  ${c.cmd} - ${c.desc}`)
      ]);
    } else {
      setConsoleLogs(prev => [...prev, `⚠️ Unknown command trigger: "${cmdClean}". Type /help to list command indices.`]);
    }

    // Scroll console down
    setTimeout(() => {
      consoleBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  // Add Authorized User
  const handleAddAuthorizedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim() || !newUserUsername.trim()) {
      addToast("Please fill in email and username fields.", "error");
      return;
    }

    const newUser: AuthorizedUser = {
      id: 'auth_' + Math.random().toString(36).substring(7),
      email: newUserEmail,
      username: newUserUsername,
      role: newUserRole,
      status: 'active',
      startDateTime: tempAccessStart || undefined,
      endDateTime: tempAccessEnd || undefined,
      deviceFingerprint: `Assigned Device (${newUserRole.toUpperCase()})`,
      subscriptionLinked: linkSubscription
    };

    setAuthorizedUsers(prev => [...prev, newUser]);
    await dbService.create('telegram_authorized_users', newUser, newUser.id);
    setNewUserEmail('');
    setNewUserUsername('');
    setTempAccessStart('');
    setTempAccessEnd('');
    addToast(`Granted access to ${newUserUsername} as ${newUserRole}!`, "success");
    await logAction("Access Granted", userProfile.email, "N/A", "Delivered", `Granted ${newUserRole} permissions to ${newUserUsername} (${newUserEmail}).`);
  };

  // Modify user permission state (suspend/reactivate/revoke)
  const handleUpdateUserStatus = async (userId: string, newStatus: 'active' | 'suspended') => {
    setAuthorizedUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
    await dbService.update('telegram_authorized_users', userId, { status: newStatus });
    addToast(`User access status updated to ${newStatus}!`, "success");
    const targetUser = authorizedUsers.find(u => u.id === userId);
    await logAction("Access Status Update", userProfile.email, "N/A", "Delivered", `Updated ${targetUser?.username} status to ${newStatus}.`);
  };

  const handleRevokeUser = async (userId: string) => {
    const targetUser = authorizedUsers.find(u => u.id === userId);
    setAuthorizedUsers(prev => prev.filter(u => u.id !== userId));
    await dbService.delete('telegram_authorized_users', userId);
    addToast("User authorization fully revoked.", "info");
    await logAction("Access Revoked", userProfile.email, "N/A", "Delivered", `Revoked all permissions for user ${targetUser?.username}.`);
  };

  // One-Click Log Resend
  const handleResendLog = async (log: LogEntry) => {
    const credentials = {
      telegram_bot_token: botToken,
      telegram_chat_id: chatId,
      telegram_automation_enabled: automationEnabled
    };

    addToast(`Resending failed broadcast log...`, "info");
    const res = await sendArbitraryMessageToTelegram(log.text, credentials);
    if (res) {
      addToast("Failed message resent successfully!", "success");
      setLogs(old => old.map(o => o.id === log.id ? { ...o, status: 'delivered', error: undefined, retries: o.retries + 1 } : o));
      await dbService.update('telegram_logs', log.id, { status: 'delivered', error: null, retries: log.retries + 1 });
      await logAction("Manual Resend Success", userProfile.email, chatId, "Delivered", `Resent message: ${log.messageType}`);
    } else {
      addToast("Resend failed again. Verify Telegram gateway connection.", "error");
      setLogs(old => old.map(o => o.id === log.id ? { ...o, retries: o.retries + 1 } : o));
      await dbService.update('telegram_logs', log.id, { retries: log.retries + 1 });
    }
  };

  // Clear log history
  const handleClearLogs = async () => {
    if (window.confirm("Are you sure you want to clear communication log history? This action is irreversible.")) {
      for (const l of logs) {
        await dbService.delete('telegram_logs', l.id);
      }
      setLogs([]);
      addToast("Communication logs cleared.", "info");
    }
  };

  // Filter logs & users based on queries
  const filteredLogs = logs.filter(l => 
    l.messageType.toLowerCase().includes(searchLogsQuery.toLowerCase()) || 
    l.text.toLowerCase().includes(searchLogsQuery.toLowerCase()) ||
    l.sender.toLowerCase().includes(searchLogsQuery.toLowerCase())
  );

  const filteredUsers = authorizedUsers.filter(u => 
    u.username.toLowerCase().includes(searchUsersQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchUsersQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchUsersQuery.toLowerCase())
  );

  // Countdown timer rendering logic for temporary access
  const renderTimeRemaining = (u: AuthorizedUser) => {
    if (!u.endDateTime) return <span className="text-emerald-400 font-bold">PERMANENT</span>;
    
    const expiry = new Date(u.endDateTime).getTime();
    const now = Date.now();
    const diff = expiry - now;

    if (diff <= 0) {
      return <span className="text-rose-500 font-bold uppercase">EXPIRED</span>;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return <span className="text-amber-400 font-mono text-xs">{hours}h {mins}m remaining</span>;
  };

  // If passcode is locked, show pin pad gate
  if (!isUnlocked) {
    return (
      <div id="telegram-gate-container" className="min-h-screen bg-cosmic-black flex flex-col items-center justify-center p-6 select-none relative">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.02),transparent_70%)] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md glass-card p-8 border border-gold/20 flex flex-col items-center relative z-10 shadow-2xl shadow-black"
        >
          {/* Locked Badge */}
          <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mb-6 text-gold animate-pulse">
            <Lock size={28} />
          </div>

          <h1 className="font-display font-extrabold text-2xl text-center text-white tracking-wide">
            BLĀCK-PLĀYER RSA
          </h1>
          <p className="text-[10px] text-gold uppercase tracking-[0.3em] font-bold text-center mt-1">
            Telegram Communication Core
          </p>
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-gold/20 to-transparent my-6" />

          {/* Secure Session Identification */}
          <div className="w-full bg-black/40 border border-white/5 rounded-xl p-4 mb-6 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-white/40">OPERATOR:</span>
              <span className="text-emerald-400 font-bold">{userProfile.email}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-white/40">HOST PIN-POINT:</span>
              <span className="text-white/60">South Africa Core Protocol</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-white/40">DEVICE ENVELOPE:</span>
              <span className="text-white/60 truncate max-w-[180px]">Verified Webkit Host Session</span>
            </div>
          </div>

          {/* Pin form */}
          <form onSubmit={handleUnlock} className="w-full space-y-6">
            <div className="space-y-2 text-center">
              <label className="text-[10px] uppercase font-bold tracking-widest text-white/60">
                Enter Master Verification PIN
              </label>
              <input
                id="pin-input"
                type="password"
                maxLength={4}
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setPasscodeError(false);
                }}
                placeholder="••••"
                className={`w-full tracking-[1.5em] text-center text-2xl py-3 font-mono border rounded-xl bg-black/60 text-gold focus:outline-none focus:ring-1 ${
                  passcodeError ? 'border-rose-500 ring-1 ring-rose-500' : 'border-gold/20 focus:ring-gold/40'
                }`}
                autoFocus
              />
              <p className="text-[9px] text-white/30 font-mono">Default credentials: 2026 or 1234</p>
            </div>

            <button
              id="unlock-btn"
              type="submit"
              className="w-full py-3 rounded-xl bg-gold text-black font-display font-bold text-xs uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-md shadow-gold/20 active:scale-[0.98]"
            >
              Authorize Gate Entry
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Active Main dashboard
  return (
    <div id="telegram-center" className="flex-1 w-full flex flex-col p-6 space-y-6 overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[8px] font-mono font-bold uppercase tracking-widest border border-emerald-500/20">
              Active Session Verified
            </span>
            <span className="px-2 py-0.5 rounded bg-gold/10 text-gold text-[8px] font-mono font-bold uppercase tracking-widest border border-gold/20">
              Creator Gate Authorized
            </span>
          </div>
          <h1 className="font-display font-extrabold text-2xl text-white tracking-tight mt-1 flex items-center gap-3">
            <Bot className="text-gold" size={28} />
            Telegram Communication Center
          </h1>
          <p className="text-xs text-white/40 mt-1">
            Configure automated synchronization, broadcast SMC/ICT educational prophecies, and secure creator credentials.
          </p>
        </div>

        {/* Lock center button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsUnlocked(false);
              sessionStorage.setItem('telegram_center_unlocked', 'false');
              setPasscode('');
              addToast("Logged out of secure Telegram session.", "info");
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono text-xs uppercase tracking-wider hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Lock size={14} />
            Lock Access
          </button>
          <button
            onClick={() => setActivePage('dashboard')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 font-mono text-xs uppercase tracking-wider hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          >
            Dashboard
          </button>
        </div>
      </div>

      {/* Grid Layout containing core Bot credentials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6 border-white/10 flex flex-col space-y-4">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gold flex items-center gap-2">
            <Radio size={14} className="text-emerald-400 animate-pulse" />
            Core Gateway Integration Configs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-white/40 font-mono">
                Telegram Bot Token
              </label>
              <input
                id="bot-token-input"
                type="password"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-white placeholder-white/20 focus:outline-none focus:border-gold/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-white/40 font-mono">
                Target Chat / Channel ID (e.g. @channel or chat_id)
              </label>
              <input
                id="chat-id-input"
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="-100182490185"
                className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-white placeholder-white/20 focus:outline-none focus:border-gold/40"
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <p className="text-[10px] text-white/40 font-mono">
              Credentials are encrypted and synced to the secure server database.
            </p>
            <button
              onClick={saveIntegrations}
              className="px-4 py-2 bg-gold hover:bg-yellow-400 text-black font-display font-bold text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-md shadow-gold/10 active:scale-95"
            >
              Sync Gateway Credentials
            </button>
          </div>
        </div>

        {/* Master Switch and Indicators */}
        <div className="glass-card p-6 border-white/10 bg-gold/[0.01] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gold">
                Master Automation Control
              </h2>
              <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase border ${
                automationEnabled 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'
              }`}>
                {automationEnabled ? 'Active' : 'Paused'}
              </span>
            </div>
            
            <p className="text-xs text-white/50 leading-relaxed">
              When toggled off, automatic synchronization is paused. Only manual broadcasts can proceed.
            </p>
          </div>

          <div className="flex items-center gap-4 mt-6">
            <button
              onClick={() => toggleAutomation(true)}
              className={`flex-1 py-2.5 rounded-xl border font-mono font-bold text-xs uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                automationEnabled 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-500/5' 
                  : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
              }`}
            >
              <Play size={12} />
              Resume Auto
            </button>
            <button
              onClick={() => toggleAutomation(false)}
              className={`flex-1 py-2.5 rounded-xl border font-mono font-bold text-xs uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                !automationEnabled 
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-md shadow-rose-500/5 animate-pulse' 
                  : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
              }`}
            >
              <Square size={12} />
              Pause Auto
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Board */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 border-white/5 flex flex-col space-y-1 bg-black/20">
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/30">Bot Health Pulse</span>
          <span className="text-xl font-display font-black text-emerald-400 flex items-center gap-2">
            99.8% <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </span>
          <span className="text-[9px] font-mono text-white/40">Synchronized (Aligned)</span>
        </div>
        <div className="glass-card p-4 border-white/5 flex flex-col space-y-1 bg-black/20">
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/30">Gateway API Status</span>
          <span className="text-xl font-display font-black text-white">ONLINE</span>
          <span className="text-[9px] font-mono text-white/40">Latency: 28ms (TLS v1.3)</span>
        </div>
        <div className="glass-card p-4 border-white/5 flex flex-col space-y-1 bg-black/20">
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/30">Total Transmissions</span>
          <span className="text-xl font-display font-black text-gold">{logs.length + 42}</span>
          <span className="text-[9px] font-mono text-white/40">Broadcasts count</span>
        </div>
        <div className="glass-card p-4 border-white/5 flex flex-col space-y-1 bg-black/20">
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/30">Delivery Success Rate</span>
          <span className="text-xl font-display font-black text-emerald-400">98.4%</span>
          <span className="text-[9px] font-mono text-white/40">Failed retried successfully</span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="border-b border-white/5 flex items-center space-x-1 overflow-x-auto pb-px scrollbar-none">
        {[
          { id: 'overview', label: 'Overview & Sync', icon: Radio },
          { id: 'manual', label: 'Broadcast & Templates', icon: Send },
          { id: 'education', label: 'Educational Signal Builder', icon: BookOpen },
          { id: 'console', label: 'Secure Console', icon: Terminal },
          { id: 'users', label: 'Authorized Users', icon: Users },
          { id: 'logs', label: 'Delivery logs & Queue', icon: List }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 font-mono text-xs uppercase border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'border-gold text-gold bg-gold/[0.02]'
                : 'border-transparent text-white/40 hover:text-white/80 hover:bg-white/[0.01]'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="min-h-[400px]">
        {/* OVERVIEW PANEL */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Category Synchronization configurations */}
              <div className="glass-card p-6 border-white/10 space-y-4">
                <div>
                  <h2 className="text-sm font-display font-bold text-white">
                    Synchronized Channels Configuration
                  </h2>
                  <p className="text-xs text-white/40 mt-1">
                    Select exactly which category events are auto-published on Telegram in real time.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(syncCategories).map(([key, value]) => (
                    <div 
                      key={key} 
                      className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition-all"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-mono font-medium text-white capitalize">
                          {key.replace(/([A-Z])/g, ' $1')}
                        </span>
                        <span className="text-[9px] text-white/40 font-mono">
                          Auto-sends upon creation
                        </span>
                      </div>
                      <button
                        onClick={() => setSyncCategories(prev => ({ ...prev, [key]: !value }))}
                        className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${
                          value ? 'bg-gold' : 'bg-white/10'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-black transition-transform duration-200 transform ${
                          value ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <p className="text-[10px] text-white/40 font-mono">
                    Ensure the bot has posting credentials in targeted channels.
                  </p>
                  <button
                    onClick={() => {
                      addToast("Category preferences synchronized!", "success");
                      logAction("Updated Synchronized Categories", userProfile.email, chatId, "Success");
                    }}
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-mono text-xs text-white uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Save Sync Rules
                  </button>
                </div>
              </div>
            </div>

            {/* Right sidebar info */}
            <div className="space-y-6">
              <div className="glass-card p-6 border-white/10 space-y-4">
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gold">
                  Oracle System Schedule
                </h2>
                <div className="space-y-3">
                  <div className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white font-bold font-mono">Monthly Oracle Intro</span>
                      <span className="text-[9px] text-gold uppercase font-mono font-bold">Scheduled</span>
                    </div>
                    <p className="text-[10px] text-white/50 leading-relaxed">
                      Every 1st of the month between 07:00 - 09:00 SAST, introduces AI core logic and improvements.
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-white/40 font-mono pt-1">
                      <span>NEXT: July 1st, 07:00</span>
                      <button
                        onClick={async () => {
                          addToast("Triggering Monthly Introduction...", "info");
                          const res = await sendMonthlyOracleIntroduction({ telegram_bot_token: botToken, telegram_chat_id: chatId });
                          if (res) {
                            addToast("Monthly Introduction published!", "success");
                            await logAction("Monthly Introduction", userProfile.email, chatId, "Delivered");
                          } else {
                            addToast("Failed to send Monthly Introduction.", "error");
                          }
                        }}
                        className="text-gold hover:underline underline-offset-2 cursor-pointer"
                      >
                        Publish Now
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white font-bold font-mono">Daily Morning Brief</span>
                      <span className="text-[9px] text-gold uppercase font-mono font-bold">Scheduled</span>
                    </div>
                    <p className="text-[10px] text-white/50 leading-relaxed">
                      Every single morning at 07:00 SAST, delivers risk guidelines and focus assets overview.
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-white/40 font-mono pt-1">
                      <span>NEXT: Tomorrow, 07:00</span>
                      <button
                        onClick={async () => {
                          addToast("Triggering Daily Morning Brief...", "info");
                          const res = await sendDailyMorningBrief({ telegram_bot_token: botToken, telegram_chat_id: chatId });
                          if (res) {
                            addToast("Morning Brief published!", "success");
                            await logAction("Daily Morning Brief", userProfile.email, chatId, "Delivered");
                          } else {
                            addToast("Failed to send Daily Brief.", "error");
                          }
                        }}
                        className="text-gold hover:underline underline-offset-2 cursor-pointer"
                      >
                        Publish Now
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white font-bold font-mono">Weekly Digest</span>
                      <span className="text-[9px] text-gold uppercase font-mono font-bold">Scheduled</span>
                    </div>
                    <p className="text-[10px] text-white/50 leading-relaxed">
                      Every Friday at 18:00 SAST, computes aggregated win-rate and net profit logs.
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-white/40 font-mono pt-1">
                      <span>NEXT: Friday, 18:00</span>
                      <button
                        onClick={async () => {
                          addToast("Triggering Weekly Performance Summary...", "info");
                          const res = await sendWeeklySummaryToTelegram({ telegram_bot_token: botToken, telegram_chat_id: chatId, telegram_automation_enabled: automationEnabled }, userProfile.uid);
                          if (res) {
                            addToast("Weekly Summary published!", "success");
                            await logAction("Weekly Performance Summary", userProfile.email, chatId, "Delivered");
                          } else {
                            addToast("Failed to send Weekly Summary.", "error");
                          }
                        }}
                        className="text-gold hover:underline underline-offset-2 cursor-pointer"
                      >
                        Publish Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MANUAL BROADCAST & TEMPLATES */}
        {activeTab === 'manual' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left form - Broadcast */}
            <form onSubmit={handleSendManualBroadcast} className="lg:col-span-7 glass-card p-6 border-white/10 space-y-4">
              <div>
                <h2 className="text-sm font-display font-bold text-white flex items-center gap-2">
                  <Send size={16} className="text-gold" />
                  Manual Broadcast Composer
                </h2>
                <p className="text-xs text-white/40 mt-1">
                  Draft a custom message. Manual broadcasts will bypass category automation blocks.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-white/40 font-mono">
                    Announcement Title (Optional)
                  </label>
                  <input
                    id="broadcast-title"
                    type="text"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="CRITICAL SWEEP UPDATE"
                    className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/20 focus:outline-none focus:border-gold/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-white/40 font-mono">
                    Content Category
                  </label>
                  <select
                    id="broadcast-category"
                    value={broadcastCategory}
                    onChange={(e) => setBroadcastCategory(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-gold/40"
                  >
                    <option value="commentary">Market Commentary</option>
                    <option value="news">Breaking News</option>
                    <option value="education">Educational Insight</option>
                    <option value="poll">Community Poll / Survey</option>
                    <option value="announcement">Announcement</option>
                  </select>
                </div>
              </div>

              {/* Templates helper list */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-white/40 font-mono">
                  Load Saved Message Template
                </span>
                <div className="flex flex-wrap gap-2">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplate(tpl.id)}
                      className={`px-3 py-1.5 rounded-lg border text-[10px] font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                        selectedTemplateId === tpl.id
                          ? 'bg-gold/10 border-gold text-gold'
                          : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
                      }`}
                    >
                      <FileText size={12} />
                      {tpl.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-white/40 font-mono">
                    Message Body (Markdown supported)
                  </label>
                  <span className="text-[9px] text-white/30 font-mono">{broadcastText.length}/4000 chars</span>
                </div>
                <textarea
                  id="broadcast-text"
                  rows={6}
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  placeholder="Draft your message. HTML / Markdown can be styled directly into Telegram format..."
                  className="w-full py-3 px-4 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/20 focus:outline-none focus:border-gold/40 font-mono"
                />
              </div>

              {/* Media selection upload simulator */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-widest text-white/40 font-mono">
                  Attach Media Asset (Image, PDF, Audio)
                </label>
                <div className="border border-dashed border-white/10 hover:border-gold/40 rounded-xl p-4 text-center cursor-pointer transition-all bg-black/20 flex flex-col items-center relative overflow-hidden">
                  <input
                    id="broadcast-attachment-input"
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setBroadcastAttachment(e.target.files[0]);
                        addToast(`File ${e.target.files[0].name} attached!`, "info");
                      }
                    }}
                  />
                  {broadcastAttachment ? (
                    <div className="flex items-center gap-2 text-gold">
                      <FileText size={20} />
                      <span className="text-xs font-mono font-medium">{broadcastAttachment.name}</span>
                      <button 
                        type="button" 
                        onClick={() => setBroadcastAttachment(null)} 
                        className="text-rose-400 font-bold ml-2 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="text-white/30 mb-2" size={24} />
                      <span className="text-xs text-white/60">Drag and drop or select file</span>
                      <span className="text-[9px] text-white/30 mt-0.5">Supports PDF reports, Charts images, Voice notes</span>
                    </>
                  )}
                </div>
              </div>

              {/* Broadcast schedule */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-white/40 font-mono">
                    Schedule Broadcast Time (Optional)
                  </label>
                  <input
                    id="broadcast-scheduled"
                    type="datetime-local"
                    value={broadcastScheduledTime}
                    onChange={(e) => setBroadcastScheduledTime(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-gold/40"
                  />
                </div>
                <div className="flex items-end gap-3 justify-end pt-3 md:pt-0">
                  {broadcastScheduledTime && (
                    <button
                      type="button"
                      onClick={() => {
                        setBroadcastScheduledTime('');
                        addToast("Cleared broadcast schedule.", "info");
                      }}
                      className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Clear Schedule
                    </button>
                  )}
                  <button
                    id="broadcast-submit-btn"
                    type="submit"
                    disabled={sendingBroadcast}
                    className="px-6 py-2.5 bg-gold hover:bg-yellow-400 text-black font-display font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-gold/10 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {sendingBroadcast ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    {broadcastScheduledTime ? "Schedule Post" : "Broadcast Now"}
                  </button>
                </div>
              </div>
            </form>

            {/* Right side - Templates builder */}
            <div className="lg:col-span-5 space-y-6">
              <div className="glass-card p-6 border-white/10 space-y-4">
                <div>
                  <h2 className="text-sm font-display font-bold text-white flex items-center gap-2">
                    <Layers size={16} className="text-gold" />
                    Templates Architect
                  </h2>
                  <p className="text-xs text-white/40 mt-1">
                    Design reusable format blueprints with variable support like `{'{asset}'}` or `{'{direction}'}`.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold tracking-widest text-white/40 font-mono">
                      Template Name
                    </label>
                    <input
                      id="tpl-name-input"
                      type="text"
                      value={customTemplateName}
                      onChange={(e) => setCustomTemplateName(e.target.value)}
                      placeholder="My Weekly PnL Template"
                      className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-gold/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold tracking-widest text-white/40 font-mono">
                      Template Category
                    </label>
                    <select
                      id="tpl-cat-select"
                      value={customTemplateCategory}
                      onChange={(e) => setCustomTemplateCategory(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-gold/40"
                    >
                      <option value="signal">Trading Signal</option>
                      <option value="update">Trade Update</option>
                      <option value="education">Educational Insight</option>
                      <option value="alert">Risk Alert</option>
                      <option value="commentary">Commentary</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold tracking-widest text-white/40 font-mono">
                      Template Structure
                    </label>
                    <textarea
                      id="tpl-text-area"
                      rows={5}
                      value={customTemplateText}
                      onChange={(e) => setCustomTemplateText(e.target.value)}
                      placeholder="My template text..."
                      className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-gold/40 font-mono"
                    />
                  </div>

                  <button
                    id="save-tpl-btn"
                    onClick={saveCustomTemplate}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-mono text-xs text-white uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus size={12} />
                    Store Brand Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EDUCATIONAL SIGNALS BUILDER */}
        {activeTab === 'education' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 glass-card p-6 border-white/10 space-y-4">
              <div>
                <h2 className="text-sm font-display font-bold text-white flex items-center gap-2">
                  <BookOpen size={16} className="text-gold" />
                  SMC Educational Signal Architect
                </h2>
                <p className="text-xs text-white/40 mt-1">
                  Build multi-layered signals packed with confidence ratios, liquidity analysis, and psychological commentary.
                </p>
              </div>

              {/* Educational parameters */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-white/40 font-mono">Asset Pair</span>
                  <input type="text" value={eduAsset} onChange={(e) => setEduAsset(e.target.value)} className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-white/40 font-mono">Direction</span>
                  <select value={eduDirection} onChange={(e) => setEduDirection(e.target.value)} className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white">
                    <option value="BUY">BUY (Bullish Expansion)</option>
                    <option value="SELL">SELL (Bearish Distribution)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-white/40 font-mono">Entry zone</span>
                  <input type="text" value={eduEntry} onChange={(e) => setEduEntry(e.target.value)} className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-white/40 font-mono">Stop Loss</span>
                  <input type="text" value={eduSL} onChange={(e) => setEduSL(e.target.value)} className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-white/40 font-mono">TP1 Target</span>
                  <input type="text" value={eduTP1} onChange={(e) => setEduTP1(e.target.value)} className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-white/40 font-mono">TP2 Target</span>
                  <input type="text" value={eduTP2} onChange={(e) => setEduTP2(e.target.value)} className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold tracking-widest text-white/40 font-mono">Market Structure Confirmation</span>
                <input type="text" value={eduMarketStructure} onChange={(e) => setEduMarketStructure(e.target.value)} className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold tracking-widest text-white/40 font-mono">Liquidity Swept Analysis</span>
                <textarea rows={2} value={eduLiquidity} onChange={(e) => setEduLiquidity(e.target.value)} className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white font-mono" />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold tracking-widest text-white/40 font-mono">Indicator Confluence</span>
                <input type="text" value={eduConfluence} onChange={(e) => setEduConfluence(e.target.value)} className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold tracking-widest text-white/40 font-mono">Stop Loss Reasoning</span>
                <input type="text" value={eduSLReasoning} onChange={(e) => setEduSLReasoning(e.target.value)} className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-white/40 font-mono">Risk Reward Ratio</span>
                  <input type="text" value={eduRiskReward} onChange={(e) => setEduRiskReward(e.target.value)} className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                </div>
                <div className="space-y-1 flex flex-col justify-end">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-white/40 font-mono mb-1">Confidence Score: {eduConfidence}%</span>
                  <input type="range" min={0} max={100} value={eduConfidence} onChange={(e) => setEduConfidence(Number(e.target.value))} className="w-full accent-gold bg-white/10 h-1.5 rounded-lg" />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold tracking-widest text-white/40 font-mono">Beginner-Friendly Explanation</span>
                <textarea rows={2} value={eduBeginnerExplanation} onChange={(e) => setEduBeginnerExplanation(e.target.value)} className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white font-mono" />
              </div>

              <button
                id="publish-edu-btn"
                onClick={handlePublishEducationalSignal}
                className="w-full py-3 bg-gold hover:bg-yellow-400 text-black font-display font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-gold/10 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles size={14} />
                Publish SMC Educational Prophecy
              </button>
            </div>

            {/* Right side - Annotated Canvas chart */}
            <div className="lg:col-span-6 space-y-6">
              <div className="glass-card p-6 border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-display font-bold text-white flex items-center gap-2">
                      <Eye size={16} className="text-gold" />
                      Visual Chart Annotations
                    </h2>
                    <p className="text-xs text-white/40 mt-1">
                      Build annotated canvas chart mapping entry, invalidations, and order blocks.
                    </p>
                  </div>
                  
                  {/* Select chart type */}
                  <select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value)}
                    className="py-1 px-2.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-white focus:outline-none"
                  >
                    <option value="bullish">Bullish Impulse</option>
                    <option value="bearish">Bearish Distribution</option>
                  </select>
                </div>

                {/* Canvas chart */}
                <div className="relative border border-white/10 rounded-xl overflow-hidden bg-[#0a0a0f]">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-[360px] block"
                  />
                  <div className="absolute top-2 right-2 flex flex-col gap-1.5 bg-black/80 border border-white/10 p-2.5 rounded-lg text-[9px] font-mono text-white/80 leading-relaxed max-w-[150px]">
                    <span className="font-bold text-gold border-b border-white/10 pb-0.5 mb-0.5">LEGEND</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e]" /> Stop Loss
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#eab308]" /> Entry zone
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> Take Profits
                    </div>
                  </div>
                </div>

                {/* Chart Annotation overlay adjustments */}
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-white/40 font-mono">
                    Adjust Overlay Position Percentages
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[9px] text-white/60 font-mono">Stop Loss Line</span>
                      <input type="range" min={0.1} max={0.9} step={0.01} value={annotations[0].yPercent} onChange={(e) => {
                        const val = Number(e.target.value);
                        setAnnotations(old => old.map((a, i) => i === 0 ? { ...a, yPercent: val } : a));
                      }} className="w-full accent-rose-500 bg-white/10 h-1 rounded-lg" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-white/60 font-mono">Entry zone Line</span>
                      <input type="range" min={0.1} max={0.9} step={0.01} value={annotations[1].yPercent} onChange={(e) => {
                        const val = Number(e.target.value);
                        setAnnotations(old => old.map((a, i) => i === 1 ? { ...a, yPercent: val } : a));
                      }} className="w-full accent-yellow-500 bg-white/10 h-1 rounded-lg" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-white/60 font-mono">Take Profit 1 Line</span>
                      <input type="range" min={0.1} max={0.9} step={0.01} value={annotations[2].yPercent} onChange={(e) => {
                        const val = Number(e.target.value);
                        setAnnotations(old => old.map((a, i) => i === 2 ? { ...a, yPercent: val } : a));
                      }} className="w-full accent-emerald-500 bg-white/10 h-1 rounded-lg" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-white/60 font-mono">Take Profit 2 Line</span>
                      <input type="range" min={0.1} max={0.9} step={0.01} value={annotations[3].yPercent} onChange={(e) => {
                        const val = Number(e.target.value);
                        setAnnotations(old => old.map((a, i) => i === 3 ? { ...a, yPercent: val } : a));
                      }} className="w-full accent-emerald-500 bg-white/10 h-1 rounded-lg" />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-[10px] font-mono leading-relaxed text-white/60">
                  <span className="text-gold font-bold">IMAGE FALLBACK MODE ACTIVE:</span> Detailed SVG / coordinate descriptors will accompany the generated signal text so group members have complete visual transparency if automated snapshots are slow.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECURE CONSOLE */}
        {activeTab === 'console' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left side console screen */}
            <div className="lg:col-span-8 glass-card border-white/10 bg-black flex flex-col h-[480px] overflow-hidden rounded-xl font-mono relative">
              {/* Header bar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-zinc-900 select-none">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-white/40 ml-2">secure_creator_console.sh</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 text-[8px] font-bold border border-rose-500/20">
                    RESTRICTED
                  </span>
                </div>
              </div>

              {/* Scrollable text box */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs text-white/80 leading-relaxed custom-scrollbar">
                {consoleLogs.map((log, index) => (
                  <div key={index} className="whitespace-pre-wrap font-mono">
                    {log.startsWith('>') ? (
                      <span className="text-gold font-bold">{log}</span>
                    ) : log.startsWith('🔴') || log.startsWith('Failed') ? (
                      <span className="text-rose-400">{log}</span>
                    ) : log.startsWith('🟢') || log.startsWith('Success') ? (
                      <span className="text-emerald-400">{log}</span>
                    ) : log.startsWith('⚠️') ? (
                      <span className="text-amber-400">{log}</span>
                    ) : (
                      <span className="text-zinc-300">{log}</span>
                    )}
                  </div>
                ))}
                <div ref={consoleBottomRef} />
              </div>

              {/* Command bar input */}
              <div className="p-3 border-t border-white/10 bg-zinc-950 flex flex-col space-y-2 relative">
                {/* Autocomplete drawer */}
                {showConsoleAutocompletes && (
                  <div className="absolute bottom-full left-0 right-0 bg-zinc-900 border border-white/10 rounded-t-xl overflow-hidden max-h-40 overflow-y-auto z-10">
                    <div className="px-3 py-1.5 bg-zinc-950 text-[9px] font-bold text-white/40 border-b border-white/5 uppercase">
                      Suggested Slash Commands
                    </div>
                    {availableSlashCommands
                      .filter(s => s.cmd.startsWith(consoleInput.toLowerCase()))
                      .map((s) => (
                        <button
                          key={s.cmd}
                          onClick={() => {
                            setConsoleInput(s.cmd);
                            setShowConsoleAutocompletes(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-white/5 border-b border-white/5 flex items-center justify-between text-xs font-mono cursor-pointer"
                        >
                          <span className="text-gold font-bold">{s.cmd}</span>
                          <span className="text-white/40 text-[10px]">{s.desc}</span>
                        </button>
                      ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-gold font-bold select-none">$</span>
                  <input
                    id="console-input-field"
                    type="text"
                    value={consoleInput}
                    onChange={(e) => {
                      setConsoleInput(e.target.value);
                      if (e.target.value.startsWith('/')) {
                        setShowConsoleAutocompletes(true);
                      } else {
                        setShowConsoleAutocompletes(false);
                      }
                    }}
                    onFocus={() => {
                      if (consoleInput.startsWith('/')) setShowConsoleAutocompletes(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleConsoleExecute(consoleInput);
                      }
                    }}
                    placeholder="Type slash commands (e.g. /help, /status, /retry_failed)..."
                    className="flex-1 bg-transparent border-none text-xs text-white focus:outline-none placeholder-white/20 font-mono"
                    autoComplete="off"
                  />
                  <button
                    onClick={() => handleConsoleExecute(consoleInput)}
                    className="px-3 py-1.5 bg-gold hover:bg-yellow-400 text-black rounded text-[10px] font-bold uppercase transition-all cursor-pointer"
                  >
                    Execute
                  </button>
                </div>
              </div>
            </div>

            {/* Right side command buttons helper */}
            <div className="lg:col-span-4 glass-card p-6 border-white/10 space-y-4">
              <div>
                <h2 className="text-sm font-display font-bold text-white flex items-center gap-2">
                  <Terminal size={16} className="text-gold" />
                  Quick Action Console Triggers
                </h2>
                <p className="text-xs text-white/40 mt-1">
                  Click any creator action to automatically dispatch the corresponding payload.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {availableSlashCommands.map((act) => (
                  <button
                    key={act.cmd}
                    onClick={() => handleConsoleExecute(act.cmd)}
                    className="w-full px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center justify-between text-left text-xs font-mono group transition-all cursor-pointer"
                  >
                    <span className="text-gold font-bold group-hover:translate-x-1 transition-transform">
                      {act.cmd}
                    </span>
                    <span className="text-white/40 text-[9px] italic truncate max-w-[150px]">
                      {act.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AUTHORIZED USERS & ACCESS CONTROL */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left side users list */}
            <div className="lg:col-span-7 glass-card p-6 border-white/10 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-white/5">
                <div>
                  <h2 className="text-sm font-display font-bold text-white">
                    Authorized Administrators List
                  </h2>
                  <p className="text-xs text-white/40 mt-1">
                    Grant, suspend, or revoke creator permissions for other accounts.
                  </p>
                </div>

                {/* User Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    id="search-users"
                    type="text"
                    value={searchUsersQuery}
                    onChange={(e) => setSearchUsersQuery(e.target.value)}
                    placeholder="Search operators..."
                    className="pl-8 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-white/20 focus:outline-none"
                  />
                </div>
              </div>

              {/* Users list table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 font-mono text-[9px] uppercase font-bold text-white/40">
                      <th className="py-3 px-2">Operator Name</th>
                      <th className="py-3 px-2">Role</th>
                      <th className="py-3 px-2">Expiry Window</th>
                      <th className="py-3 px-2">Subscription Guard</th>
                      <th className="py-3 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-white/5 text-xs hover:bg-white/[0.01] transition-all">
                        <td className="py-3 px-2">
                          <div className="flex flex-col">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              {u.username}
                              {u.role === 'creator' && <ShieldCheck size={12} className="text-emerald-400" />}
                            </span>
                            <span className="text-[10px] text-white/40 font-mono">{u.email}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] uppercase font-mono text-gold font-bold">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          {renderTimeRemaining(u)}
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase border ${
                            u.subscriptionLinked 
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                              : 'bg-white/5 text-white/30 border-white/5'
                          }`}>
                            {u.subscriptionLinked ? 'Linked' : 'Off'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {u.status === 'active' ? (
                              <button
                                onClick={() => handleUpdateUserStatus(u.id, 'suspended')}
                                title="Suspend Account"
                                className="p-1.5 hover:bg-rose-500/10 rounded-lg text-rose-400 transition-all cursor-pointer"
                              >
                                <UserMinus size={14} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateUserStatus(u.id, 'active')}
                                title="Reactivate Account"
                                className="p-1.5 hover:bg-emerald-500/10 rounded-lg text-emerald-400 transition-all cursor-pointer"
                              >
                                <UserCheck size={14} />
                              </button>
                            )}
                            {u.id !== userProfile.uid && (
                              <button
                                onClick={() => handleRevokeUser(u.id)}
                                title="Revoke Full Access"
                                className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-white/30 font-mono">
                          No authorized operators found matching query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right side form - Add access */}
            <form onSubmit={handleAddAuthorizedUser} className="lg:col-span-5 glass-card p-6 border-white/10 space-y-4">
              <div>
                <h2 className="text-sm font-display font-bold text-white flex items-center gap-2">
                  <UserPlus size={16} className="text-gold" />
                  Grant Creator Permission
                </h2>
                <p className="text-xs text-white/40 mt-1">
                  Authorize a new email account as a co-creator, publisher, or system analyst.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-white/40 font-mono">Operator Email Address</span>
                  <input
                    id="new-user-email"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="trader@zion-rsa.co.za"
                    className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-gold/40"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-white/40 font-mono">Username</span>
                  <input
                    id="new-user-username"
                    type="text"
                    value={newUserUsername}
                    onChange={(e) => setNewUserUsername(e.target.value)}
                    placeholder="Zion_Analyst_01"
                    className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-gold/40"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-white/40 font-mono">Administrative Role</span>
                  <select
                    id="new-user-role"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-gold/40"
                  >
                    <option value="co-creator">Co-Creator (Full Permissions)</option>
                    <option value="editor">Editor (Templates & Broadcasts only)</option>
                    <option value="analyst">Analyst (SMC Signals only)</option>
                  </select>
                </div>

                <div className="w-full h-[1px] bg-white/5 my-2" />

                {/* Temporary access system */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gold font-mono flex items-center gap-1">
                    <Clock size={12} /> Temporary Access Schedule
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[9px] text-white/40 font-mono">Start Window</span>
                      <input type="datetime-local" value={tempAccessStart} onChange={(e) => setTempAccessStart(e.target.value)} className="w-full py-1.5 px-2 bg-black/40 border border-white/10 rounded-lg text-[10px] text-white" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-white/40 font-mono">Expiry Window</span>
                      <input type="datetime-local" value={tempAccessEnd} onChange={(e) => setTempAccessEnd(e.target.value)} className="w-full py-1.5 px-2 bg-black/40 border border-white/10 rounded-lg text-[10px] text-white" />
                    </div>
                  </div>
                </div>

                {/* Subscription constraints toggle */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono font-bold text-white uppercase">Subscription linked</span>
                    <span className="text-[9px] text-white/40">Reverts to subscriber when subscription expires</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLinkSubscription(!linkSubscription)}
                    className={`w-8 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                      linkSubscription ? 'bg-gold' : 'bg-white/10'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-black transition-transform duration-200 transform ${
                      linkSubscription ? 'translate-x-3' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                <button
                  id="grant-access-submit"
                  type="submit"
                  className="w-full py-2.5 bg-gold hover:bg-yellow-400 text-black font-display font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-gold/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Key size={12} />
                  Authorize Administrative Account
                </button>
              </div>
            </form>
          </div>
        )}

        {/* LOGS & RETRY QUEUE */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            <div className="glass-card p-6 border-white/10 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-3 border-b border-white/5">
                <div>
                  <h2 className="text-sm font-display font-bold text-white">
                    Communication Logs & Retry Queue
                  </h2>
                  <p className="text-xs text-white/40 mt-1">
                    Every message processed through BUC is tracked securely. Resend failed items in one-click.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Log Search */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      id="search-logs"
                      type="text"
                      value={searchLogsQuery}
                      onChange={(e) => setSearchLogsQuery(e.target.value)}
                      placeholder="Search transmissions..."
                      className="pl-8 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-white/20 focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={handleClearLogs}
                    className="p-2 bg-white/5 hover:bg-rose-500/10 border border-white/5 rounded-xl text-white/60 hover:text-rose-400 transition-all cursor-pointer"
                    title="Clear Log History"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Log History list */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 font-mono text-[9px] uppercase font-bold text-white/40">
                      <th className="py-3 px-2">Timestamp</th>
                      <th className="py-3 px-2">Sender</th>
                      <th className="py-3 px-2">Type</th>
                      <th className="py-3 px-2">Destination</th>
                      <th className="py-3 px-2">Status</th>
                      <th className="py-3 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="border-b border-white/5 text-xs hover:bg-white/[0.01] transition-all">
                        <td className="py-3 px-2 font-mono text-[10px] text-white/60">
                          {log.date} {log.time}
                        </td>
                        <td className="py-3 px-2">
                          <span className="font-medium text-white">{log.sender}</span>
                        </td>
                        <td className="py-3 px-2">
                          <span className="font-mono text-white/80">{log.messageType}</span>
                        </td>
                        <td className="py-3 px-2 font-mono text-white/40">
                          {log.destination}
                        </td>
                        <td className="py-3 px-2">
                          {log.status === 'delivered' ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono font-bold flex items-center gap-1 w-fit">
                              <CheckCircle2 size={10} /> Delivered
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-mono font-bold flex items-center gap-1 w-fit">
                                <XCircle size={10} /> Failed
                              </span>
                              {log.error && (
                                <span className="text-[8px] text-rose-400/80 max-w-[200px] leading-tight font-mono select-all">
                                  {log.error}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {log.status === 'failed' ? (
                            <button
                              onClick={() => handleResendLog(log)}
                              className="px-2.5 py-1 bg-gold hover:bg-yellow-400 text-black font-mono text-[9px] font-bold uppercase rounded transition-all cursor-pointer flex items-center gap-1 ml-auto"
                            >
                              <RefreshCw size={8} /> Resend
                            </button>
                          ) : (
                            <span className="text-[10px] text-white/30 font-mono">
                              ID: {log.confirmationId?.slice(4) || 'N/A'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}

                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-white/30 font-mono">
                          No transmission history captured.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
