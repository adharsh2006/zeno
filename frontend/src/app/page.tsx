"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  BarChart as LucideBarChart, 
  Users, 
  Send, 
  DollarSign, 
  TrendingUp, 
  Sparkles, 
  Database, 
  Bell, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  RefreshCw, 
  ChevronRight, 
  AlertTriangle,
  FileText,
  Search,
  Settings,
  HelpCircle,
  Sparkle,
  ArrowRight,
  X,
  ExternalLink,
  Check,
  Smartphone,
  Mail,
  Layers,
  History,
  Activity,
  Layers as LayersIcon,
  Lock,
  LogOut,
  UserCheck
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  CartesianGrid
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FunnelData {
  name: string;
  count: number;
}

interface CampaignMetrics {
  total: number;
  delivered: number;
  failed: number;
  opened: number;
  read: number;
  clicked: number;
  converted: number;
}

interface Campaign {
  id: string;
  name: string;
  segment_name: string;
  status: string;
  created_at: string;
  metrics: CampaignMetrics;
}

interface Customer {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  metadata: any;
  order_count: number;
  total_spend: number;
  created_at: string;
}

interface CustomerDetail {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  metadata: any;
  created_at: string;
  orders: any[];
  touchpoints: any[];
}

interface AuditLog {
  id: string;
  action: string;
  actor: string;
  details: any;
  timestamp: string;
}

interface UserSession {
  id: string;
  username: string;
  email: string;
  role: string;
}

export default function Dashboard() {
  const [showLanding, setShowLanding] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authRole, setAuthRole] = useState("viewer");
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Dashboard Metrics state
  const [shoppersCount, setShoppersCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [campaignsCount, setCampaignsCount] = useState(0);
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [conversionRates, setConversionRates] = useState({ open_rate: 0, click_rate: 0, conversion_rate: 0 });
  const [ltvChartData, setLtvChartData] = useState<any[]>([]);
  
  // Lists
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Detailed Customer Drawer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isCardView, setIsCardView] = useState(false);
  const [isKanban, setIsKanban] = useState(false);

  // Cursor Aura
  const [cursorGlowEnabled, setCursorGlowEnabled] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // AI strategy builder state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<any>(null);
  const [campaignName, setCampaignName] = useState("");
  const [launchingCampaign, setLaunchingCampaign] = useState(false);

  // Animated Agent Pipeline Simulator
  const [agentStep, setAgentStep] = useState<number>(-1);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [previewChannel, setPreviewChannel] = useState<"whatsapp" | "sms" | "rcs" | "email">("whatsapp");

  // Status message
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Wrapper for authenticated API fetch requests
  const apiFetch = async (path: string, options: RequestInit = {}) => {
    const savedToken = localStorage.getItem("xeno_token");
    const headers = new Headers(options.headers || {});
    if (savedToken) {
      headers.set("Authorization", `Bearer ${savedToken}`);
    }
    if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    
    const res = await fetch(`${BACKEND_URL}${path}`, {
      ...options,
      headers
    });
    
    if (res.status === 401) {
      // Clear expired / invalid token automatically
      localStorage.removeItem("xeno_token");
      setCurrentUser(null);
      setToken(null);
      showToast("Session expired. Please log in again.", "info");
    }
    return res;
  };

  // Restore session on startup
  useEffect(() => {
    const checkExistingSession = async () => {
      const savedToken = localStorage.getItem("xeno_token");
      if (!savedToken) return;
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
          headers: { "Authorization": `Bearer ${savedToken}` }
        });
        if (res.ok) {
          const user = await res.json();
          setCurrentUser(user);
          setToken(savedToken);
        } else {
          localStorage.removeItem("xeno_token");
        }
      } catch (err) {
        console.error("Session restoration failed", err);
      }
    };
    checkExistingSession();
  }, []);

  // Track Mouse Movements for Cursor Aura
  useEffect(() => {
    if (!cursorGlowEnabled) return;
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [cursorGlowEnabled]);

  // Card Mouse spotlight effect helper
  const handleSpotlightMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
  };

  // Fetch all backend stats
  const fetchOverviewStats = async () => {
    try {
      const res = await apiFetch("/api/v1/analytics/overview");
      if (res.ok) {
        const data = await res.json();
        setShoppersCount(data.total_shoppers);
        setTotalRevenue(data.total_revenue);
        setCampaignsCount(data.campaigns_count);
        setRecentCampaigns(data.recent_campaigns);
        setConversionRates(data.rates);
        
        const funnel = [
          { name: "Sent", count: data.funnel.sent },
          { name: "Delivered", count: data.funnel.delivered },
          { name: "Opened", count: data.funnel.opened },
          { name: "Read", count: data.funnel.read },
          { name: "Clicked", count: data.funnel.clicked },
          { name: "Converted", count: data.funnel.converted },
        ];
        setFunnelData(funnel);

        const ltvTimeline = [
          { date: "May 25", Revenue: Math.max(0, data.total_revenue * 0.4) },
          { date: "May 30", Revenue: Math.max(0, data.total_revenue * 0.55) },
          { date: "Jun 04", Revenue: Math.max(0, data.total_revenue * 0.7) },
          { date: "Jun 09", Revenue: Math.max(0, data.total_revenue * 0.85) },
          { date: "Jun 14", Revenue: data.total_revenue },
        ];
        setLtvChartData(ltvTimeline);
      }
    } catch (err) {
      console.error("Failed to fetch overview analytics", err);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await apiFetch("/api/v1/campaigns/");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (err) {
      console.error("Failed to fetch campaigns", err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await apiFetch("/api/v1/customers/");
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error("Failed to fetch customers", err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await apiFetch("/api/v1/analytics/audit-logs");
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
    }
  };

  const openCustomerDrawer = async (customerId: string) => {
    setSelectedCustomerId(customerId);
    setDrawerLoading(true);
    setDrawerOpen(true);
    try {
      const res = await apiFetch(`/api/v1/customers/${customerId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCustomer(data);
      } else {
        showToast("Failed to fetch shopper details.", "error");
      }
    } catch (err) {
      console.error("Failed to fetch customer profile", err);
      showToast("Backend connection error.", "error");
    } finally {
      setDrawerLoading(false);
    }
  };

  const reloadAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchOverviewStats(),
      fetchCampaigns(),
      fetchCustomers(),
      fetchAuditLogs()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    if (!currentUser) return;
    reloadAllData();
    const interval = setInterval(() => {
      fetchOverviewStats();
      fetchCampaigns();
      fetchAuditLogs();
    }, 4500);
    return () => clearInterval(interval);
  }, [currentUser]);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Login handler
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError(null);
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append("username", authEmail);
      formData.append("password", authPassword);

      const res = await fetch(`${BACKEND_URL}/api/v1/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString()
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("xeno_token", data.access_token);
        setToken(data.access_token);
        setCurrentUser(data.user);
        showToast(`Welcome back, ${data.user.username}!`);
      } else {
        const err = await res.json();
        setLoginError(err.detail || "Authentication failed. Check credentials.");
      }
    } catch (err) {
      setLoginError("Authentication server unreachable.");
    } finally {
      setLoading(false);
    }
  };

  // Register handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: authUsername,
          email: authEmail,
          password: authPassword,
          role: authRole
        })
      });

      if (res.ok) {
        showToast("Registration successful! Please log in.");
        setIsRegisterMode(false);
        setAuthPassword("");
      } else {
        const err = await res.json();
        setLoginError(err.detail || "Registration failed.");
      }
    } catch (err) {
      setLoginError("Authentication server unreachable.");
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("xeno_token");
    setToken(null);
    setCurrentUser(null);
    showToast("Logged out successfully.");
  };

  // Quick Select Persona Login
  const loginAsPersona = (email: string) => {
    setAuthEmail(email);
    setAuthPassword("password123");
    setLoading(true);
    setLoginError(null);

    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", "password123");

    fetch(`${BACKEND_URL}/api/v1/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString()
    })
    .then(res => {
      if (res.ok) return res.json();
      throw new Error("Persona authentication failed.");
    })
    .then(data => {
      localStorage.setItem("xeno_token", data.access_token);
      setToken(data.access_token);
      setCurrentUser(data.user);
      showToast(`Logged in as ${data.user.username} (${data.user.role})!`);
    })
    .catch(() => {
      setLoginError("Failed to authenticate persona.");
    })
    .finally(() => {
      setLoading(false);
    });
  };

  // Seed DB with mock shopper intelligence data
  const handleSeedData = async () => {
    if (currentUser?.role !== "admin") {
      showToast("Access Denied: Only Admins can hydrate data.", "error");
      return;
    }
    setSeeding(true);
    showToast("Generating mock shopper profiles and histories...", "info");
    
    const mockData = {
      customers: [
        {
          email: "chloe.jones@example.com",
          phone: "+1555019201",
          first_name: "Chloe",
          last_name: "Jones",
          metadata: { city: "New York", preferred_category: "Fashion", loyalty_tier: "Gold" },
          orders: [
            { amount: 149.99, items: [{ name: "Designer Blazer", qty: 1, price: 149.99, category: "Fashion" }] },
            { amount: 89.50, items: [{ name: "Silk Scarf", qty: 1, price: 89.50, category: "Fashion" }] }
          ]
        },
        {
          email: "marcus.tucker@example.com",
          phone: "+1555029302",
          first_name: "Marcus",
          last_name: "Tucker",
          metadata: { city: "San Francisco", preferred_category: "Coffee", loyalty_tier: "VIP" },
          orders: [
            { amount: 45.00, items: [{ name: "Ethiopian Roast Beans", qty: 3, price: 15.00, category: "Coffee" }] },
            { amount: 30.00, items: [{ name: "Organic Espresso Blend", qty: 2, price: 15.00, category: "Coffee" }] }
          ]
        },
        {
          email: "sarah.connor@example.com",
          phone: "+1555039403",
          first_name: "Sarah",
          last_name: "Connor",
          metadata: { city: "Austin", preferred_category: "Electronics", loyalty_tier: "Silver" },
          orders: [
            { amount: 599.00, items: [{ name: "Active Noise Headphones", qty: 1, price: 599.00, category: "Electronics" }] }
          ]
        },
        {
          email: "david.miller@example.com",
          phone: "+1555049504",
          first_name: "David",
          last_name: "Miller",
          metadata: { city: "Chicago", preferred_category: "Coffee", loyalty_tier: "Regular" },
          orders: [
            { amount: 15.00, items: [{ name: "Cold Brew Pack", qty: 1, price: 15.00, category: "Coffee" }], order_date: "2026-04-10T12:00:00Z" }
          ]
        },
        {
          email: "emma.watson@example.com",
          phone: "+1555059605",
          first_name: "Emma",
          last_name: "Watson",
          metadata: { city: "Los Angeles", preferred_category: "Fashion", loyalty_tier: "VIP" },
          orders: [
            { amount: 250.00, items: [{ name: "Premium Leather Boot", qty: 1, price: 250.00, category: "Fashion" }] },
            { amount: 120.00, items: [{ name: "Summer Sundress", qty: 1, price: 120.00, category: "Fashion" }] },
            { amount: 75.00, items: [{ name: "Knit Beanie", qty: 1, price: 75.00, category: "Fashion" }] }
          ]
        },
        {
          email: "alex.mercer@example.com",
          phone: "+1555069706",
          first_name: "Alex",
          last_name: "Mercer",
          metadata: { city: "Seattle", preferred_category: "Electronics", loyalty_tier: "Regular" },
          orders: []
        }
      ]
    };

    try {
      const res = await apiFetch("/api/v1/customers/ingest", {
        method: "POST",
        body: JSON.stringify(mockData)
      });
      if (res.ok) {
        showToast("Database successfully hydrated with D2C profiles!");
        reloadAllData();
      } else {
        const err = await res.json();
        showToast(err.detail || "Failed to seed database.", "error");
      }
    } catch (err) {
      showToast("Ingestion server unreachable.", "error");
    } finally {
      setSeeding(false);
    }
  };

  // Run LangGraph marketing recommend loops
  const handleGenerateStrategy = async () => {
    if (currentUser?.role === "viewer") {
      showToast("Access Denied: Viewers cannot trigger strategist runs.", "error");
      return;
    }
    if (!aiPrompt) return;
    setAiLoading(true);
    setAiRecommendation(null);
    setAgentStep(0);
    setAgentLogs(["[System] Initializing autonomous multi-agent compilation graph..."]);

    const logsSequence = [
      { step: 0, text: "[Audience Miner Agent] Analyzing database for target shopper segments..." },
      { step: 0, text: "[Audience Miner Agent] Running cohort analysis on purchase patterns & inactivity..." },
      { step: 1, text: "[Content Composer Agent] Crafting custom copy tailored to user interests..." },
      { step: 1, text: "[Content Composer Agent] Inserting discount tags and personalized names..." },
      { step: 2, text: "[Channel Router Agent] Evaluating channel open rates vs carrier dispatch costs..." },
      { step: 2, text: "[Channel Router Agent] Selecting WhatsApp for high-propensity VIPs, SMS for others..." },
      { step: 3, text: "[Optimization Agent] Building campaign feedback loops and webhook models..." },
      { step: 3, text: "[System] Finalizing recommendation strategy data structures..." }
    ];

    let logIndex = 0;
    const logInterval = setInterval(() => {
      if (logIndex < logsSequence.length) {
        const item = logsSequence[logIndex];
        setAgentStep(item.step);
        setAgentLogs(prev => [...prev, item.text]);
        logIndex++;
      } else {
        clearInterval(logInterval);
      }
    }, 1200);

    try {
      const res = await apiFetch("/api/v1/campaigns/recommend", {
        method: "POST",
        body: JSON.stringify({ prompt: aiPrompt })
      });
      
      setTimeout(async () => {
        if (res.ok) {
          const data = await res.json();
          setAiRecommendation(data);
          setCampaignName(`AI Campaign: ${aiPrompt.slice(0, 24)}...`);
          setPreviewChannel(data.channel?.toLowerCase() as any || "whatsapp");
          setAgentStep(4);
          setAgentLogs(prev => [...prev, "[System] Recommendation generated successfully! View strategy board below."]);
        } else {
          const err = await res.json();
          showToast(err.detail || "Agent recommendation engine error.", "error");
          setAgentStep(-1);
        }
        setAiLoading(false);
      }, 9800);

    } catch (err) {
      showToast("Recommendation API unreachable.", "error");
      setAiLoading(false);
      setAgentStep(-1);
    }
  };

  // Accept Strategy & Dispatch Campaign
  const handleLaunchCampaign = async (customName?: string, overrideRec?: any) => {
    if (currentUser?.role === "viewer") {
      showToast("Access Denied: Viewers cannot launch campaigns.", "error");
      return;
    }
    const targetRec = overrideRec || aiRecommendation;
    if (!targetRec) return;
    setLaunchingCampaign(true);
    showToast("Orchestrating campaign dispatch...", "info");

    const nameToUse = customName || campaignName;

    try {
      const segRes = await apiFetch("/api/v1/campaigns/segments", {
        method: "POST",
        body: JSON.stringify({
          name: `${nameToUse} - Cohort`,
          description: `Segment compiled by AI for prompt: ${aiPrompt || "Direct Dispatch"}`,
          rules: targetRec.rules,
          ai_explanation: targetRec.explanation
        })
      });
      
      if (!segRes.ok) {
        throw new Error("Failed to register campaign segment.");
      }
      const segment = await segRes.json();

      const campRes = await apiFetch("/api/v1/campaigns/create", {
        method: "POST",
        body: JSON.stringify({
          name: nameToUse,
          segment_id: segment.id,
          channel: targetRec.channel,
          content: targetRec.content,
          prompt: aiPrompt || "Direct Dashboard Launch"
        })
      });
      
      if (!campRes.ok) {
        throw new Error("Failed to create campaign draft.");
      }
      const campaign = await campRes.json();

      const sendRes = await apiFetch(`/api/v1/campaigns/${campaign.campaign.id}/send`, {
        method: "POST",
        body: JSON.stringify({
          channel: targetRec.channel,
          content: targetRec.content
        })
      });

      if (sendRes.ok) {
        showToast("Campaign deployed! Webhooks will report engagement metrics.");
        setAiRecommendation(null);
        setAiPrompt("");
        setAgentStep(-1);
        setActiveTab("campaigns");
        setIsKanban(true);
        reloadAllData();
      } else {
        const body = await sendRes.json();
        showToast(body.detail || "Failed to trigger campaign dispatch.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to launch campaign.", "error");
    } finally {
      setLaunchingCampaign(false);
    }
  };

  // Launch pre-built campaign draft from Kanban board
  const handleLaunchFromKanban = async (c: Campaign) => {
    if (currentUser?.role === "viewer") {
      showToast("Access Denied: Viewers cannot launch campaigns.", "error");
      return;
    }
    showToast(`Triggering campaign: ${c.name}`, "info");
    try {
      const sendRes = await apiFetch(`/api/v1/campaigns/${c.id}/send`, {
        method: "POST",
        body: JSON.stringify({
          channel: "whatsapp",
          content: "Hello from Xeno campaign trigger!"
        })
      });
      if (sendRes.ok) {
        showToast("Campaign launched! Updates processing...");
        reloadAllData();
      } else {
        const err = await sendRes.json();
        showToast(err.detail || "Failed to trigger dispatch.", "error");
      }
    } catch (err) {
      showToast("Connection failed.", "error");
    }
  };

  // Filter Customers
  const filteredCustomers = customers.filter(c => {
    const fullName = `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase();
    const email = (c.email || "").toLowerCase();
    const phone = (c.phone || "");
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || 
                          email.includes(searchQuery.toLowerCase()) || 
                          phone.includes(searchQuery);

    const tier = c.metadata?.loyalty_tier || "Regular";
    const matchesTier = selectedTier === "All" || tier === selectedTier;

    const category = c.metadata?.preferred_category || "Unassigned";
    const matchesCategory = selectedCategory === "All" || category === selectedCategory;

    return matchesSearch && matchesTier && matchesCategory;
  });

  return (
    <div className="flex flex-1 min-h-screen bg-[#040406] text-zinc-100 overflow-hidden relative">
      
      {/* Background Glowing Grids */}
      <div className="grid-overlay" />
      <div className="ambient-glow" />

      {/* Cursor Aura Glow */}
      {cursorGlowEnabled && (
        <div 
          className="cursor-aura hidden md:block" 
          style={{ left: `${mousePos.x}px`, top: `${mousePos.y}px` }} 
        />
      )}

      {/* Toast Alert popup */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl border shadow-2xl glass-panel ${
              toast.type === "error" ? "border-red-500/20 text-red-300 bg-red-950/20" :
              toast.type === "info" ? "border-indigo-500/20 text-indigo-300 bg-indigo-950/20" :
              "border-emerald-500/20 text-emerald-300 bg-emerald-950/20"
            }`}
          >
            {toast.type === "error" ? <AlertTriangle size={18} className="text-red-400" /> : <CheckCircle2 size={18} className="text-emerald-400" />}
            <span className="text-xs font-semibold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECURE PORTAL USER AUTHENTICATION SCREEN */}
      {!currentUser ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 z-30 font-sans min-h-screen">
          <div className="w-full max-w-md p-8 rounded-2xl glass-panel border border-white/[0.04] shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-tr from-violet-600/10 to-indigo-600/10 blur-xl -z-10" />
            
            {/* Logo */}
            <div className="flex flex-col items-center gap-2 mb-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center font-bold text-zinc-950 shadow-lg relative">
                <span className="text-white text-sm">X</span>
              </div>
              <h2 className="font-extrabold text-lg text-zinc-100 tracking-wider">XENO AI MARKETING CRM</h2>
              <span className="text-[10px] text-zinc-500 font-mono">Secure Access Gateway</span>
            </div>

            {/* Error alerts */}
            {loginError && (
              <div className="p-3 rounded-lg border border-red-500/20 bg-red-950/10 text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={14} />
                <span>{loginError}</span>
              </div>
            )}

            {/* Forms fields */}
            <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-4">
              {isRegisterMode && (
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Username</label>
                  <input
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    required
                    placeholder="Enter username"
                    className="w-full px-3.5 py-2.5 bg-black/45 border border-white/[0.05] rounded-xl text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                  placeholder="name@company.com"
                  className="w-full px-3.5 py-2.5 bg-black/45 border border-white/[0.05] rounded-xl text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-black/45 border border-white/[0.05] rounded-xl text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500/50"
                />
              </div>

              {isRegisterMode && (
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Default Permissions Role</label>
                  <select
                    value={authRole}
                    onChange={(e) => setAuthRole(e.target.value)}
                    className="w-full px-3 py-2.5 bg-black/45 border border-white/[0.05] rounded-xl text-xs text-zinc-400 focus:outline-none focus:border-violet-500/50"
                  >
                    <option value="viewer">Viewer (Read-Only stats, locked actions)</option>
                    <option value="marketer">Marketer (Compile & Launch campaigns)</option>
                    <option value="admin">Administrator (Full accesses & database seeds)</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <RefreshCw size={13} className="animate-spin" /> : isRegisterMode ? "Create Account" : "Access Console"}
              </button>
            </form>

            {/* Quick Login Test Personas (Horilla style) */}
            <div className="border-t border-white/[0.03] pt-4 space-y-3">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block text-center">Prefilled Test Persona Shortcuts</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => loginAsPersona("admin@xeno.com")}
                  className="px-2 py-1.5 rounded bg-zinc-950 border border-white/[0.04] text-[9px] hover:border-violet-500/30 transition text-zinc-300 font-bold flex flex-col items-center gap-0.5"
                >
                  <span>Admin</span>
                  <span className="text-[8px] text-violet-400 font-normal">Full Access</span>
                </button>
                <button
                  onClick={() => loginAsPersona("marketer@xeno.com")}
                  className="px-2 py-1.5 rounded bg-zinc-950 border border-white/[0.04] text-[9px] hover:border-indigo-500/30 transition text-zinc-300 font-bold flex flex-col items-center gap-0.5"
                >
                  <span>Marketer</span>
                  <span className="text-[8px] text-indigo-400 font-normal">No database seed</span>
                </button>
                <button
                  onClick={() => loginAsPersona("viewer@xeno.com")}
                  className="px-2 py-1.5 rounded bg-zinc-950 border border-white/[0.04] text-[9px] hover:border-zinc-800 transition text-zinc-300 font-bold flex flex-col items-center gap-0.5"
                >
                  <span>Viewer</span>
                  <span className="text-[8px] text-zinc-500 font-normal">Read-Only</span>
                </button>
              </div>
            </div>

            {/* Switch toggle mode */}
            <div className="text-center pt-2">
              <button
                onClick={() => setIsRegisterMode(!isRegisterMode)}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 underline"
              >
                {isRegisterMode ? "Already registered? Sign In" : "Need a custom role account? Sign Up"}
              </button>
            </div>

          </div>
        </div>
      ) : showLanding ? (
        
        // PRODUCT LANDING PAGE VIEW (Authenticated)
        <div className="flex-1 overflow-y-auto flex flex-col z-20 min-h-screen">
          
          {/* Landing Header */}
          <header className="h-20 border-b border-white/[0.03] px-8 flex items-center justify-between bg-black/25 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-fuchsia-500 flex items-center justify-center font-bold text-zinc-950 shadow-lg relative cursor-pointer" onClick={() => setShowLanding(false)}>
                <span className="text-white text-sm">X</span>
              </div>
              <span className="font-extrabold text-sm text-zinc-200 tracking-widest bg-gradient-to-r from-violet-200 to-indigo-300 bg-clip-text text-transparent">XENO</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-8 text-[11px] font-semibold text-zinc-400">
              <a href="#features" className="hover:text-zinc-100 transition">Shopper Intelligence</a>
              <a href="#playground" className="hover:text-zinc-100 transition">AI Playground</a>
            </nav>

            <div className="flex items-center gap-4">
              {/* Active User session block */}
              <div className="hidden md:flex items-center gap-2 border border-white/[0.04] bg-white/[0.01] px-3 py-1 rounded-xl text-[10px] font-semibold">
                <UserCheck size={11} className="text-violet-400" />
                <span className="text-zinc-300">{currentUser.username}</span>
                <span className="px-1.5 py-0.2 rounded bg-violet-500/10 text-violet-300 text-[8px] uppercase tracking-wider">{currentUser.role}</span>
              </div>

              <button 
                onClick={() => setCursorGlowEnabled(!cursorGlowEnabled)}
                className={`text-[10px] font-semibold px-3 py-1.5 rounded-lg border transition ${
                  cursorGlowEnabled 
                    ? "bg-violet-500/10 border-violet-500/20 text-violet-300" 
                    : "bg-zinc-900 border-zinc-800 text-zinc-500"
                }`}
              >
                Glow: {cursorGlowEnabled ? "ON" : "OFF"}
              </button>
              
              <button 
                onClick={() => setShowLanding(false)}
                className="glow-button px-5 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-lg transition"
              >
                Enter CRM Dashboard
              </button>
            </div>
          </header>

          {/* Hero Section */}
          <section className="px-6 py-20 md:py-32 max-w-5xl mx-auto text-center space-y-8 relative">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/5 text-[10px] font-bold text-violet-300 uppercase tracking-wider"
            >
              <Sparkles size={10} />
              Autonomous Journey Engine v2.0
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-black tracking-tight leading-tight mesh-gradient-text text-glow"
            >
              AI-Native Customer Engagement<br />For High-Growth Brands
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xs md:text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed font-sans"
            >
              Stop designing static segment builders and hardcoding message templates. Xeno's multi-agent network analyzes shopper demographics, writes personalized copy, routes across carrier channels, and self-optimizes in real time.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center gap-4 pt-4"
            >
              <button 
                onClick={() => setShowLanding(false)}
                className="glow-button px-6 py-3 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-xl flex items-center gap-2"
              >
                Launch CRM Console <ArrowRight size={14} />
              </button>
              
              {/* Seed Button under Admin Auth Guard */}
              <button 
                onClick={handleSeedData}
                disabled={seeding || currentUser.role !== "admin"}
                className={`px-6 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 border transition ${
                  currentUser.role === "admin"
                    ? "bg-zinc-950/80 hover:bg-zinc-900 border-white/[0.05] text-zinc-300 hover:text-white"
                    : "bg-zinc-900/40 border-white/[0.02] text-zinc-600 cursor-not-allowed"
                }`}
                title={currentUser.role === "admin" ? "Seed mock D2C shopper data" : "Requires Admin privileges"}
              >
                {currentUser.role === "admin" ? <Database size={13} className={seeding ? "animate-spin text-violet-400" : ""} /> : <Lock size={12} className="text-zinc-600" />}
                {seeding ? "Hydrating profiles..." : currentUser.role === "admin" ? "Hydrate Sample Shoppers" : "Hydration Locked"}
              </button>
            </motion.div>
          </section>

          {/* Features Ticker */}
          <div className="border-y border-white/[0.03] bg-white/[0.01] py-4">
            <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-around gap-6 text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold">
              <span>🚀 45% Conversion Lift</span>
              <span>⚡ Asynchronous Webhooks</span>
              <span>🤖 Multi-Agent LangGraph Network</span>
              <span>🔒 Immutable Audit Activity</span>
            </div>
          </div>

          {/* Features Cards Grid */}
          <section id="features" className="py-20 px-8 max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-zinc-200">Built for Marketer Productivity</h2>
              <p className="text-xs text-zinc-500">Every tool is reimagined with autonomous shopper intelligence.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { 
                  title: "Shopper Intelligence", 
                  desc: "Digests demographics, loyalty tiers, and purchase records to formulate custom cohort metrics.", 
                  icon: Users,
                  color: "from-violet-500/10 to-indigo-500/5"
                },
                { 
                  title: "Campaign Pipelines", 
                  desc: "Visualize your lifecycles in Kanban columns. Launch drafts and watch callbacks transition cards.", 
                  icon: Layers,
                  color: "from-fuchsia-500/10 to-pink-500/5"
                },
                { 
                  title: "Explainable AI Routing", 
                  desc: "Understands cost vs open rate ratio. Recommends carrier channels with logical justifications.", 
                  icon: Sparkles,
                  color: "from-indigo-500/10 to-cyan-500/5"
                },
                { 
                  title: "Immutable Audits", 
                  desc: "Tracks carrier callback, API, and agent activities in a structured system ledger.", 
                  icon: FileText,
                  color: "from-emerald-500/10 to-teal-500/5"
                }
              ].map((feat, i) => {
                const Icon = feat.icon;
                return (
                  <div 
                    key={i}
                    onMouseMove={handleSpotlightMouseMove}
                    className="spotlight-card p-6 rounded-2xl border border-white/[0.04] bg-[#0c0c0e]/60 space-y-4 hover:border-white/[0.08] transition duration-300"
                  >
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-violet-400 w-fit">
                      <Icon size={18} />
                    </div>
                    <h3 className="text-sm font-bold text-zinc-200">{feat.title}</h3>
                    <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">{feat.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Interactive Agent Playground Sandbox */}
          <section id="playground" className="py-20 px-8 border-t border-white/[0.03] bg-zinc-950/20">
            <div className="max-w-4xl mx-auto space-y-10">
              <div className="text-center space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Marketer Test Drive</span>
                <h2 className="text-xl font-bold tracking-tight text-zinc-200">Interactive Agent Sandbox</h2>
                <p className="text-xs text-zinc-500 font-sans">Simulate our agent workflow in real time before entering the CRM dashboard.</p>
              </div>

              <div className="p-6 rounded-2xl border border-white/[0.04] bg-[#0b0b0d]/80 backdrop-blur-md space-y-6">
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Enter a marketer prompt, e.g. 'Target inactive VIP shopper fashion cohorts on RCS with summer discount code'..."
                  disabled={currentUser.role === "viewer"}
                  className={`w-full h-20 p-4 rounded-xl border text-xs text-zinc-200 placeholder-zinc-700 resize-none transition duration-200 leading-relaxed ${
                    currentUser.role === "viewer"
                      ? "bg-zinc-950/30 border-white/[0.02] cursor-not-allowed"
                      : "bg-black/90 border-white/[0.05] focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30"
                  }`}
                />

                <div className="flex flex-wrap gap-2">
                  {[
                    "Target inactive VIP coffee cohort on WhatsApp",
                    "Win back gold fashion buyers with RCS catalog early deals"
                  ].map((tpl, idx) => (
                    <button
                      key={idx}
                      onClick={() => setAiPrompt(tpl)}
                      disabled={currentUser.role === "viewer"}
                      className="text-[10px] px-3 py-1.5 rounded-full border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] text-zinc-500 hover:text-zinc-300 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {tpl}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleGenerateStrategy}
                    disabled={aiLoading || !aiPrompt || currentUser.role === "viewer"}
                    className="glow-button flex items-center gap-2 py-2.5 px-6 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition disabled:opacity-40"
                  >
                    {currentUser.role === "viewer" ? <Lock size={12} /> : aiLoading ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {currentUser.role === "viewer" ? "strategist locked" : aiLoading ? "Agent compiling..." : "Simulate Agent Run"}
                  </button>
                </div>

                {/* Simulated Agent Graph Node Visualizer */}
                {agentStep >= 0 && (
                  <div className="border-t border-white/[0.04] pt-6 space-y-6">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-center font-sans">Multi-Agent Node Lifecycle</h4>
                    
                    <div className="grid grid-cols-4 gap-4">
                      {[
                        { name: "Audience Miner", icon: Users, desc: "Segment compilation" },
                        { name: "Content Designer", icon: MessageSquare, desc: "Copy drafts" },
                        { name: "Channel Router", icon: Send, desc: "ROI carrier routing" },
                        { name: "Optimization Loop", icon: Activity, desc: "Attribution weight" }
                      ].map((node, index) => {
                        const NodeIcon = node.icon;
                        const isActive = agentStep === index;
                        const isCompleted = agentStep > index;
                        return (
                          <div 
                            key={index}
                            className={`p-4 rounded-xl border text-center transition-all duration-500 relative ${
                              isActive ? "border-violet-500 bg-violet-950/10 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.1)] scale-105" :
                              isCompleted ? "border-emerald-500/40 bg-emerald-950/5 text-emerald-400" :
                              "border-white/[0.03] bg-white/[0.005] text-zinc-500"
                            }`}
                          >
                            {/* Connector line */}
                            {index < 3 && (
                              <div className={`absolute top-1/2 -right-4 w-4 h-[1.5px] -translate-y-1/2 hidden md:block z-10 ${
                                isCompleted ? "bg-emerald-500/40" : "bg-white/[0.03]"
                              }`} />
                            )}
                            <div className="mx-auto p-2 rounded-lg bg-black/40 border border-white/[0.03] w-fit mb-2">
                              <NodeIcon size={14} className={isActive ? "animate-pulse" : ""} />
                            </div>
                            <span className="text-[10px] font-bold block">{node.name}</span>
                            <span className="text-[9px] text-zinc-500 block mt-0.5">{node.desc}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Agent thought code terminal */}
                    <div className="terminal-window rounded-xl overflow-hidden scanline">
                      <div className="terminal-header px-4 py-2 flex items-center justify-between">
                        <div className="flex gap-1.5">
                          <span className="terminal-dot bg-red-500/80" />
                          <span className="terminal-dot bg-amber-500/80" />
                          <span className="terminal-dot bg-emerald-500/80" />
                        </div>
                        <span className="text-[9px] text-zinc-600 font-mono">agent_thoughts.log</span>
                      </div>
                      <div className="p-4 h-32 overflow-y-auto font-mono text-[10px] text-zinc-400 space-y-1.5 scrollbar-thin">
                        {agentLogs.map((log, idx) => (
                          <div key={idx} className="flex gap-2">
                            <span className="text-violet-500 font-bold select-none">&gt;</span>
                            <span>{log}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Recommendation output inside Landing Page */}
                {aiRecommendation && (
                  <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider font-sans">Simulated strategy ready</h4>
                      <button 
                        onClick={() => {
                          setShowLanding(false);
                          setActiveTab("copilot");
                        }}
                        className="text-[10px] font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 cursor-pointer font-sans"
                      >
                        Inspect details in Workspace <ExternalLink size={10} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-xs font-sans">
                      <div className="p-3 bg-black/40 border border-white/[0.03] rounded-lg">
                        <span className="text-[9px] text-zinc-500 block">Audience SQL rules:</span>
                        <pre className="text-[9px] text-zinc-400 font-mono mt-1 overflow-x-auto">
                          {jsonClean(aiRecommendation.rules)}
                        </pre>
                      </div>
                      <div className="p-3 bg-black/40 border border-white/[0.03] rounded-lg">
                        <span className="text-[9px] text-zinc-500 block">Recommended channel:</span>
                        <span className="inline-block mt-2 px-2.5 py-0.5 bg-violet-500/10 text-violet-300 border border-violet-500/20 rounded font-bold uppercase text-[9px] font-mono">
                          {aiRecommendation.channel}
                        </span>
                        <p className="text-[9px] text-zinc-500 mt-2 leading-relaxed">{aiRecommendation.explanation?.slice(0, 80)}...</p>
                      </div>
                      <div className="p-3 bg-black/40 border border-white/[0.03] rounded-lg">
                        <span className="text-[9px] text-zinc-500 block">Personalized Copy:</span>
                        <p className="text-[10px] text-zinc-300 mt-1 italic leading-relaxed">"{aiRecommendation.content}"</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Landing Footer */}
          <footer className="border-t border-white/[0.03] py-12 px-6 bg-[#030305] text-center space-y-4 z-20">
            <span className="text-[10px] font-mono text-zinc-600 block">Xeno CRM Console v2.1 | Deployed locally on ports 3000 & 8000</span>
            <button 
              onClick={() => setShowLanding(false)}
              className="text-xs font-bold text-violet-400 hover:text-violet-300 underline"
            >
              Skip landing and load CRM Dashboard
            </button>
          </footer>
        </div>
      ) : (
        
        // CORE INTEGRATED CRM WORKSPACE (Authenticated)
        <div className="flex flex-1 min-h-screen relative overflow-hidden">

          {/* Side Drawer details */}
          <AnimatePresence>
            {drawerOpen && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setDrawerOpen(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40"
                />
                
                <motion.div 
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="fixed right-0 top-0 h-screen w-full md:w-[460px] bg-[#09090b] border-l border-white/[0.06] shadow-2xl z-50 p-6 overflow-y-auto flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between pb-6 border-b border-white/[0.04]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-zinc-950 text-sm">
                          {selectedCustomer?.first_name ? selectedCustomer.first_name[0] : "U"}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-zinc-100 uppercase tracking-wider">
                            {selectedCustomer?.first_name || "Shopper"} {selectedCustomer?.last_name || "Profile"}
                          </h3>
                          <span className="text-[10px] text-zinc-500">{selectedCustomer?.email}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setDrawerOpen(false)}
                        className="p-1 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] transition text-zinc-400 hover:text-zinc-200 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {drawerLoading ? (
                      <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-500">
                        <RefreshCw size={24} className="animate-spin text-violet-400" />
                        <span className="text-xs font-semibold">Compiling shopper history...</span>
                      </div>
                    ) : selectedCustomer ? (
                      <div className="space-y-6 pt-6">
                        
                        {/* Demographic details metadata */}
                        <div className="p-4 rounded-xl border border-white/[0.03] bg-zinc-950/40 grid grid-cols-2 gap-4 text-xs font-sans">
                          <div>
                            <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-wider">Loyalty Level</span>
                            <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-300 border-violet-500/20">
                              {selectedCustomer.metadata?.loyalty_tier || "Regular"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-wider">Interest Category</span>
                            <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full border text-[9px] font-semibold bg-white/[0.02] border-white/[0.05] text-zinc-300">
                              {selectedCustomer.metadata?.preferred_category || "Unassigned"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-wider">Mobile Number</span>
                            <span className="text-[10px] text-zinc-300 font-mono mt-1 block">{selectedCustomer.phone || "No Number"}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-wider">Region / City</span>
                            <span className="text-[10px] text-zinc-300 mt-1 block">{selectedCustomer.metadata?.city || "Unknown"}</span>
                          </div>
                        </div>

                        {/* AI Intelligence Stats Card */}
                        <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-950/10 space-y-3">
                          <div className="flex items-center gap-2 text-violet-300">
                            <Sparkles size={13} />
                            <span className="text-[10px] font-bold uppercase tracking-wider font-sans">AI Shopper Intelligence insights</span>
                          </div>
                          <div className="space-y-2 text-[11px] text-violet-200 leading-relaxed font-sans">
                            <p>🎯 <strong>Recommended Next Action:</strong> Deploy {selectedCustomer.metadata?.preferred_category === "Coffee" ? "beans refresh coupon" : "new styles catalog"} via <strong>WhatsApp</strong>.</p>
                            <p>📊 <strong>Churn Likelihood:</strong> {selectedCustomer.orders.length === 0 ? "⚠️ High Churn Risk" : selectedCustomer.orders.length > 2 ? "🟢 Low Risk (VIP Retained)" : "🟡 Medium Risk"}</p>
                          </div>
                        </div>

                        {/* Orders Timeline */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Order Purchase History</h4>
                          {selectedCustomer.orders.length > 0 ? (
                            <div className="relative pl-6 space-y-4 font-sans">
                              <div className="timeline-line" />
                              {selectedCustomer.orders.map((order, i) => (
                                <div key={i} className="relative text-xs">
                                  <div className="timeline-dot" />
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="font-semibold text-zinc-200">Order Dispatched</span>
                                      <span className="text-[9px] text-zinc-500 block mt-0.5">{new Date(order.order_date).toLocaleDateString()}</span>
                                    </div>
                                    <span className="font-mono text-zinc-100">${parseFloat(order.amount).toFixed(2)}</span>
                                  </div>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {order.items?.map((item: any, idx: number) => (
                                      <span key={idx} className="text-[8px] bg-white/[0.02] border border-white/[0.04] px-1.5 py-0.5 rounded text-zinc-400">
                                        {item.name || "Product"} (x{item.qty || 1})
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4 border border-dashed border-white/[0.03] rounded-lg text-[10px] text-zinc-600 font-sans">
                              No purchase events registered.
                            </div>
                          )}
                        </div>

                        {/* Messaging Touchpoints */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Marketing Touchpoints History</h4>
                          {selectedCustomer.touchpoints.length > 0 ? (
                            <div className="relative pl-6 space-y-4 font-sans">
                              <div className="timeline-line" />
                              {selectedCustomer.touchpoints.map((tp, i) => (
                                <div key={i} className="relative text-xs">
                                  <div className="timeline-dot bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="font-semibold text-zinc-200">{tp.campaign_name}</span>
                                      <span className="text-[9px] text-zinc-500 block mt-0.5">Sent via {tp.channel} • {new Date(tp.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <span className={`text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                                      tp.status === "converted" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                      tp.status === "read" || tp.status === "opened" ? "bg-violet-500/10 text-violet-400 border border-violet-500/20" :
                                      tp.status === "failed" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                                      "bg-zinc-800 text-zinc-400 border-zinc-700/20"
                                    }`}>
                                      {tp.status}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-zinc-500 italic mt-1 bg-black/40 p-2 rounded border border-white/[0.02]">
                                    "{tp.content}"
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4 border border-dashed border-white/[0.03] rounded-lg text-[10px] text-zinc-600 font-sans">
                              No campaigns targeted to this customer yet.
                            </div>
                          )}
                        </div>

                      </div>
                    ) : (
                      <div className="text-center py-20 text-xs text-zinc-600 font-sans">
                        Select a customer to inspect.
                      </div>
                    )}
                  </div>

                  {/* Drawer Footer info */}
                  <div className="border-t border-white/[0.04] pt-4 mt-6">
                    <span className="text-[9px] font-mono text-zinc-600 block text-center">PostgreSQL UUID Key: {selectedCustomer?.id}</span>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Sidebar navigation */}
          <aside className="w-64 border-r border-white/[0.04] bg-[#08080a]/90 backdrop-blur-xl flex flex-col justify-between p-6 z-20 shrink-0 font-sans">
            <div>
              {/* Logo */}
              <div className="flex items-center gap-2.5 mb-10 pl-2">
                <button 
                  onClick={() => setShowLanding(true)}
                  className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 via-indigo-600 to-fuchsia-500 flex items-center justify-center font-bold text-zinc-950 shadow-lg relative cursor-pointer"
                >
                  <span className="text-white text-sm">X</span>
                  <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-tr from-violet-500 to-fuchsia-500 opacity-30 blur-sm -z-10" />
                </button>
                <div>
                  <span className="font-extrabold text-sm text-zinc-200 tracking-wider bg-gradient-to-r from-violet-200 via-zinc-100 to-indigo-300 bg-clip-text text-transparent">XENO</span>
                  <span className="text-[9px] ml-1.5 px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-300 font-semibold border border-violet-500/20">AGENT</span>
                </div>
              </div>

              {/* Nav Items */}
              <nav className="space-y-1">
                {[
                  { id: "overview", label: "Dashboard Hub", icon: LucideBarChart },
                  { id: "copilot", label: "AI Copilot Workspace", icon: Sparkles },
                  { id: "campaigns", label: "Campaign Orchestrator", icon: Send },
                  { id: "shoppers", label: "Shopper Database", icon: Users },
                  { id: "audit", label: "System Audits Logs", icon: FileText }
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${
                        activeTab === item.id 
                          ? "bg-white/[0.04] text-zinc-100 border border-white/[0.06] shadow-sm pl-4 relative" 
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.01]"
                      }`}
                    >
                      {activeTab === item.id && (
                        <div className="absolute left-1 w-1 h-4 bg-violet-400 rounded-full" />
                      )}
                      <Icon size={14} className={activeTab === item.id ? "text-violet-400" : ""} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Sidebar Footer */}
            <div className="border-t border-white/[0.04] pt-6 space-y-4">
              
              {/* Active User tag */}
              <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-violet-950 border border-violet-800 flex items-center justify-center font-bold text-[10px] text-violet-300">
                  {currentUser.username?.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-[10px] font-bold text-zinc-200 truncate">{currentUser.username}</span>
                  <span className="block text-[8px] text-zinc-500 font-mono uppercase truncate">{currentUser.role} permissions</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="text-zinc-500 hover:text-red-400 transition"
                  title="Sign Out"
                >
                  <LogOut size={12} />
                </button>
              </div>

              {/* Seed Button under Admin Auth Guard */}
              <button 
                onClick={handleSeedData}
                disabled={seeding || currentUser.role !== "admin"}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-[11px] font-semibold border transition ${
                  currentUser.role === "admin"
                    ? "bg-zinc-950/80 hover:bg-zinc-900 border-white/[0.05] text-zinc-300 hover:text-zinc-100 cursor-pointer"
                    : "bg-zinc-900/40 border-white/[0.02] text-zinc-600 cursor-not-allowed"
                }`}
                title={currentUser.role === "admin" ? "Hydrate database" : "Admin privileges required"}
              >
                {currentUser.role === "admin" ? <Database size={12} className={seeding ? "animate-spin text-violet-400" : ""} /> : <Lock size={11} className="text-zinc-600" />}
                {seeding ? "Hydrating Database..." : currentUser.role === "admin" ? "Hydrate D2C Profiles" : "Hydration Locked"}
              </button>
              
              <div className="flex items-center gap-3 px-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                <span className="text-[10px] text-zinc-500 font-medium">Webhook Sim: Active</span>
                <button 
                  onClick={reloadAllData} 
                  className="ml-auto text-zinc-500 hover:text-zinc-300 transition"
                  title="Refresh stats"
                >
                  <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
                </button>
              </div>
            </div>
          </aside>

          {/* Main Panel */}
          <main className="flex-1 flex flex-col min-w-0 overflow-y-auto z-10 relative">
            <header className="h-16 border-b border-white/[0.03] px-8 flex items-center justify-between bg-black/20 backdrop-blur-md sticky top-0 z-30 font-sans">
              
              {/* Command K input mockup */}
              <div 
                onClick={() => {
                  if (currentUser.role !== "viewer") {
                    setActiveTab("copilot");
                    setAiPrompt("Target coffee buyers who haven't ordered recently...");
                  } else {
                    showToast("Access Denied: Viewers cannot trigger strategist prompts.", "error");
                  }
                }}
                className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.04] px-3.5 py-1.5 rounded-xl w-80 text-zinc-500 text-xs cursor-pointer hover:border-white/[0.08] transition"
              >
                <Search size={13} />
                <span className="flex-1 text-left text-zinc-500">Quick actions (e.g. winback coffee)...</span>
                <span className="text-[10px] font-mono bg-white/[0.03] border border-white/[0.05] px-1.5 py-0.5 rounded text-zinc-400">⌘K</span>
              </div>

              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowLanding(true)}
                  className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 border border-white/[0.04] bg-white/[0.01] px-2.5 py-1 rounded-lg cursor-pointer"
                >
                  Landing Preview
                </button>
                <div className="flex items-center gap-1.5 text-[10px] bg-zinc-900/80 px-2.5 py-1 rounded-full border border-white/[0.03] text-zinc-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  SQL Sandbox Connected
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-950 to-indigo-950 border border-white/[0.06] flex items-center justify-center text-xs font-semibold text-violet-300 shadow">
                  {currentUser.role?.slice(0, 2).toUpperCase()}
                </div>
              </div>
            </header>

            <div className="p-8 max-w-7xl w-full mx-auto space-y-8">
              
              {/* OVERVIEW DASHBOARD */}
              {activeTab === "overview" && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="space-y-8"
                >
                  {/* Stats Widgets */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                    {[
                      { label: "Unified Shopper Profiles", value: shoppersCount, sub: "Loyalty segment profiles", icon: Users },
                      { label: "Customer Lifetime Value", value: `$${totalRevenue.toLocaleString()}`, sub: "Gross orders database", icon: DollarSign },
                      { label: "Campaigns Dispatched", value: campaignsCount, sub: "Automation logs active", icon: Send },
                      { label: "Average Value per shopper", value: `$${(shoppersCount ? (totalRevenue / shoppersCount) : 0).toFixed(2)}`, sub: "Aggregated spend per cohort", icon: TrendingUp }
                    ].map((stat, i) => {
                      const Icon = stat.icon;
                      return (
                        <div 
                          key={i} 
                          onMouseMove={handleSpotlightMouseMove}
                          className="spotlight-card p-6 rounded-2xl border border-white/[0.03] shadow-md flex items-center justify-between hover:border-white/[0.07] hover:bg-[#0c0c0e]/80 transition-all duration-300 relative group"
                        >
                          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-tr from-violet-500/0 via-indigo-500/0 to-fuchsia-500/0 group-hover:from-violet-500/5 group-hover:via-indigo-500/2 group-hover:to-fuchsia-500/5 transition-all duration-500 -z-10" />
                          <div>
                            <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">{stat.label}</span>
                            <h3 className="text-2xl font-bold tracking-tight text-zinc-100 mt-1.5">{stat.value}</h3>
                            <p className="text-[9px] text-zinc-500 mt-0.5">{stat.sub}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-white/[0.02] text-violet-400 border border-white/[0.04]">
                            <Icon size={16} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Charts area */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* LTV Growth Area Chart */}
                    <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0b0b0d]/70 border border-white/[0.03] flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Customer Lifetime Value Growth</h3>
                        <p className="text-[10px] text-zinc-500 mt-0.5 font-sans">Attributed sales conversions driven by AI targeting recommendations.</p>
                      </div>
                      
                      <div className="h-64 mt-6">
                        {ltvChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={ltvChartData}>
                              <defs>
                                <linearGradient id="colorLtv" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.35}/>
                                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.015)" />
                              <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                              <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: "#09090b", borderColor: "rgba(255,255,255,0.05)", borderRadius: "10px" }}
                                labelStyle={{ color: "#a1a1aa", fontSize: "11px", fontWeight: 600 }}
                              />
                              <Area type="monotone" dataKey="Revenue" stroke="#a78bfa" strokeWidth={2} fillOpacity={1} fill="url(#colorLtv)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center border border-dashed border-white/[0.03] rounded-xl bg-white/[0.005]">
                            <span className="text-xs text-zinc-500">Generating analytics metrics...</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Funnel chart */}
                    <div className="p-6 rounded-2xl bg-[#0b0b0d]/70 border border-white/[0.03] flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Engagement Funnel</h3>
                        <p className="text-[10px] text-zinc-500 mt-0.5 font-sans">Real-time webhook callback funnel rates.</p>
                      </div>
                      
                      <div className="h-64 mt-6">
                        {funnelData.length > 0 && funnelData.some(d => d.count > 0) ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={funnelData} barSize={16}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.015)" />
                              <XAxis dataKey="name" stroke="#71717a" fontSize={8} tickLine={false} axisLine={false} />
                              <YAxis stroke="#71717a" fontSize={8} tickLine={false} axisLine={false} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: "#09090b", borderColor: "rgba(255,255,255,0.05)", borderRadius: "10px" }}
                                labelStyle={{ color: "#a1a1aa", fontSize: "10px", fontWeight: 600 }}
                              />
                              <Bar dataKey="count" fill="url(#colorPurple)" radius={[3, 3, 0, 0]} />
                              <defs>
                                <linearGradient id="colorPurple" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#c084fc" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05}/>
                                </linearGradient>
                              </defs>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center border border-dashed border-white/[0.03] rounded-xl bg-white/[0.005]">
                            <span className="text-[10px] text-zinc-500 text-center px-4">No campaigns dispatched. Seed data and prompt AI strategy to simulate webhooks.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Conversion Metrics Tickers & Recent Campaign log */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Rate metrics */}
                    <div className="p-6 rounded-2xl bg-[#0b0b0d]/70 border border-white/[0.03] flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Carrier Channel open rates</h3>
                        <p className="text-[10px] text-zinc-500 mt-0.5 font-sans">Asynchronous campaign tracking</p>
                      </div>

                      <div className="space-y-6 my-6">
                        {[
                          { label: "Delivery Open Rate", value: `${conversionRates.open_rate}%`, barWidth: conversionRates.open_rate },
                          { label: "Open Click Rate (CTR)", value: `${conversionRates.click_rate}%`, barWidth: conversionRates.click_rate },
                          { label: "Click Purchase Conversion", value: `${conversionRates.conversion_rate}%`, barWidth: conversionRates.conversion_rate }
                        ].map((rate, i) => (
                          <div key={i} className="space-y-1.5">
                            <div className="flex justify-between text-[11px] font-medium font-mono">
                              <span className="text-zinc-500">{rate.label}</span>
                              <span className="text-zinc-200">{rate.value}</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-700" 
                                style={{ width: `${Math.min(100, Math.max(0, rate.barWidth))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-3.5 rounded-xl bg-violet-950/15 border border-violet-900/20 text-[10px] text-violet-300 leading-relaxed font-sans">
                        🌟 <strong>Intelligence:</strong> WhatsApp demonstrates highest delivery open rate. Email is cost-effective for VIP collections.
                      </div>
                    </div>

                    {/* Recent executions */}
                    <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0b0b0d]/70 border border-white/[0.03]">
                      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Recent Campaign Executions</h3>
                      <div className="divide-y divide-white/[0.03] max-h-[220px] overflow-y-auto pr-1">
                        {recentCampaigns.length > 0 ? (
                          recentCampaigns.map((c, i) => (
                            <div key={i} className="py-3 flex items-center justify-between text-xs hover:bg-white/[0.005] px-2 rounded-lg transition duration-150">
                              <div className="flex items-center gap-3 font-sans">
                                <div className="p-1.5 rounded-lg bg-white/[0.02] text-zinc-400 border border-white/[0.04]">
                                  <Send size={12} />
                                </div>
                                <div>
                                  <span className="font-semibold text-zinc-200">{c.name}</span>
                                  <span className="text-[9px] text-zinc-500 ml-3">{new Date(c.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${
                                c.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                c.status === "sending" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse" :
                                "bg-zinc-800 text-zinc-400 border-zinc-700/20"
                              }`}>
                                {c.status}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-12 text-xs text-zinc-600 font-sans">
                            No campaigns active. Enter "AI Copilot" tab to create one.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* AI COPILOT WORKSPACE */}
              {activeTab === "copilot" && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                >
                  
                  {/* Left Column: Input Prompt and Agent compilation log */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="p-8 rounded-2xl bg-[#0b0b0d]/70 border border-white/[0.03] shadow-xl space-y-6 relative overflow-hidden group">
                      <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-tr from-violet-500/0 to-fuchsia-500/10 opacity-30 blur-md -z-10 group-hover:to-fuchsia-500/20 transition duration-500" />
                      
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center text-zinc-950 shadow-md">
                          <Sparkles size={14} className="text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-200">Autonomous Marketing Strategist</h3>
                          <p className="text-[11px] text-zinc-500 mt-0.5 font-sans">Define your goals, and Xeno will segment the cohort, recommend the channel, and compose copy.</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <textarea
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder="Describe your strategy: 'Re-engage customers who preferred fashion items and haven't ordered in 60 days...'"
                          disabled={currentUser.role === "viewer"}
                          className={`w-full h-24 p-4 rounded-xl border text-xs text-zinc-200 placeholder-zinc-700 resize-none transition duration-200 leading-relaxed ${
                            currentUser.role === "viewer"
                              ? "bg-zinc-950/20 border-white/[0.03] cursor-not-allowed"
                              : "bg-[#030303]/90 border-white/[0.05] focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30"
                          }`}
                        />
                        
                        {/* Preset prompt templates */}
                        <div className="flex flex-wrap gap-2 pt-1 font-sans">
                          {[
                            "Target inactive coffee buyers and win them back on WhatsApp",
                            "Find VIP fashion spenders and reward them with early RCS deals",
                            "Target regular shoppers who ordered recently with a discount code"
                          ].map((tpl, i) => (
                            <button
                              key={i}
                              onClick={() => setAiPrompt(tpl)}
                              disabled={currentUser.role === "viewer"}
                              className="text-[10px] px-2.5 py-1.5 rounded-full border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] text-zinc-500 hover:text-zinc-300 transition duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              {tpl}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={handleGenerateStrategy}
                          disabled={aiLoading || !aiPrompt || currentUser.role === "viewer"}
                          className="flex items-center gap-2 py-2 px-5 rounded-xl text-xs font-semibold bg-violet-500 hover:bg-violet-400 text-zinc-950 font-bold transition duration-200 shadow-md disabled:opacity-40"
                        >
                          {currentUser.role === "viewer" ? <Lock size={12} /> : aiLoading ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                          {currentUser.role === "viewer" ? "strategist locked" : aiLoading ? "Orchestrating agents..." : "Synthesize Strategy"}
                        </button>
                      </div>
                    </div>

                    {/* Simulated Agent Graph Node Visualizer */}
                    {agentStep >= 0 && (
                      <div className="p-6 rounded-2xl bg-[#0b0b0d]/70 border border-white/[0.03] space-y-6">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-center font-sans">Multi-Agent Node Graph Execution</h4>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            { name: "Audience Miner", icon: Users, desc: "Compiles rules" },
                            { name: "Content Designer", icon: MessageSquare, desc: "Personalizes copy" },
                            { name: "Channel Router", icon: Send, desc: "Selects carrier" },
                            { name: "Optimizer Graph", icon: Activity, desc: "Adjusts weights" }
                          ].map((node, index) => {
                            const NodeIcon = node.icon;
                            const isActive = agentStep === index;
                            const isCompleted = agentStep > index;
                            return (
                              <div 
                                key={index}
                                className={`p-4 rounded-xl border text-center transition-all duration-300 relative ${
                                  isActive ? "border-violet-500 bg-violet-950/10 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.1)] scale-102" :
                                  isCompleted ? "border-emerald-500/40 bg-emerald-950/5 text-emerald-400" :
                                  "border-white/[0.03] bg-white/[0.005] text-zinc-500"
                                }`}
                              >
                                <div className="mx-auto p-2 rounded-lg bg-black/40 border border-white/[0.03] w-fit mb-2">
                                  <NodeIcon size={14} className={isActive ? "animate-pulse" : ""} />
                                </div>
                                <span className="text-[10px] font-bold block">{node.name}</span>
                                <span className="text-[9px] text-zinc-500 block mt-0.5">{node.desc}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Terminal code console log */}
                        <div className="terminal-window rounded-xl overflow-hidden scanline">
                          <div className="terminal-header px-4 py-2 flex items-center justify-between">
                            <div className="flex gap-1.5">
                              <span className="terminal-dot bg-red-500/80" />
                              <span className="terminal-dot bg-amber-500/80" />
                              <span className="terminal-dot bg-emerald-500/80" />
                            </div>
                            <span className="text-[9px] text-zinc-600 font-mono">agent_thoughts.log</span>
                          </div>
                          <div className="p-4 h-32 overflow-y-auto font-mono text-[10px] text-zinc-400 space-y-1.5 scrollbar-thin">
                            {agentLogs.map((log, idx) => (
                              <div key={idx} className="flex gap-2">
                                <span className="text-violet-500 font-bold select-none">&gt;</span>
                                <span>{log}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Recommendation details form cards */}
                    <AnimatePresence>
                      {aiRecommendation && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-6 overflow-hidden"
                        >
                          <div className="border border-white/[0.03] bg-[#0c0c0e]/80 backdrop-blur-xl rounded-2xl p-6 space-y-6 relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/[0.01] to-fuchsia-500/[0.01] rounded-2xl pointer-events-none" />
                            
                            <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
                              <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Marketing Strategy Board</h3>
                                <p className="text-[10px] text-zinc-500 font-sans">Edit details and deploy when ready</p>
                              </div>
                              <input
                                value={campaignName}
                                onChange={(e) => setCampaignName(e.target.value)}
                                className="px-3 py-1.5 rounded-xl border border-white/[0.05] bg-[#030303] text-xs font-semibold w-64 focus:outline-none focus:border-violet-500/50 text-zinc-200"
                                placeholder="Campaign Name"
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              
                              {/* 1. Audience Cohort card */}
                              <div className="p-5 rounded-xl bg-zinc-950/40 border border-white/[0.03] space-y-4">
                                <div className="flex items-center gap-2 text-zinc-400">
                                  <Users size={14} className="text-violet-400" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">Shopper Cohort Filters</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-zinc-500 block mb-1.5 font-sans">SQL targeting filters:</span>
                                  <pre className="text-[10px] text-zinc-400 bg-black/40 p-3 rounded-lg border border-white/[0.02] font-mono leading-relaxed overflow-x-auto">
                                    {jsonClean(aiRecommendation.rules)}
                                  </pre>
                                </div>
                              </div>

                              {/* 2. Routing Card */}
                              <div className="p-5 rounded-xl bg-zinc-950/40 border border-white/[0.03] space-y-4">
                                <div className="flex items-center gap-2 text-zinc-400">
                                  <Send size={14} className="text-violet-400" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">Routing & Rationale</span>
                                </div>
                                <div className="space-y-4 font-sans">
                                  <div>
                                    <span className="text-[10px] text-zinc-500 block mb-1">Recommended Delivery:</span>
                                    <span className="inline-block px-2.5 py-1 rounded bg-violet-500/10 text-violet-300 font-mono text-[10px] uppercase font-bold border border-violet-500/20">
                                      {aiRecommendation.channel}
                                    </span>
                                  </div>
                                  
                                  <div className="space-y-1">
                                    <span className="text-[9px] text-zinc-500">Explainable AI Reasoning:</span>
                                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                                      {aiRecommendation.explanation}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* 3. Messaging Copy card */}
                              <div className="p-5 rounded-xl bg-zinc-950/40 border border-white/[0.03] space-y-4">
                                <div className="flex items-center gap-2 text-zinc-400">
                                  <MessageSquare size={14} className="text-violet-400" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">Personalized Message Copy</span>
                                </div>
                                <div className="space-y-2 font-sans">
                                  <span className="text-[10px] text-zinc-500 block">Drafted Message Content:</span>
                                  <textarea
                                    value={aiRecommendation.content}
                                    onChange={(e) => setAiRecommendation({ ...aiRecommendation, content: e.target.value })}
                                    className="w-full h-32 p-3 text-[11px] text-zinc-300 bg-black/40 border border-white/[0.03] rounded-lg focus:outline-none focus:border-violet-500/50 resize-none leading-relaxed"
                                  />
                                </div>
                              </div>

                            </div>

                            <div className="flex justify-end pt-4 border-t border-white/[0.04]">
                              <button
                                onClick={() => handleLaunchCampaign()}
                                disabled={launchingCampaign || currentUser.role === "viewer"}
                                className="flex items-center gap-2 py-2 px-5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition font-bold shadow-md shadow-emerald-500/10 cursor-pointer"
                              >
                                {launchingCampaign ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                                {launchingCampaign ? "Deploying..." : "Launch Campaign"}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Right Column: Simulated Mobile preview phone shell */}
                  <div className="flex flex-col items-center justify-start space-y-4 pt-4 font-sans">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Live Carrier Previews</span>
                    
                    {/* Device frame previewer */}
                    <div className="phone-shell p-4 pt-10 flex flex-col justify-between">
                      <div className="phone-speaker" />
                      
                      {/* Interactive header of screen */}
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold border-b border-white/[0.03] pb-2">
                        <div className="flex items-center gap-1">
                          <Smartphone size={10} className="text-zinc-600" />
                          <span>Xeno Carrier v2.0</span>
                        </div>
                        <span className="text-[8px] px-1 bg-white/[0.02] border border-white/[0.05] rounded text-zinc-600 font-mono">5G LTE</span>
                      </div>

                      {/* Render Screen body */}
                      <div className="flex-1 overflow-y-auto py-4 flex flex-col justify-start gap-4">
                        {previewChannel === "whatsapp" && (
                          <div className="whatsapp-bubble font-sans">
                            {aiRecommendation?.content || "Your personalized AI strategy copy bubble will render here..."}
                            <span className="text-[8px] text-white/50 text-right block mt-1">11:04 AM • Read ✓✓</span>
                          </div>
                        )}

                        {previewChannel === "sms" && (
                          <div className="sms-bubble font-sans">
                            {aiRecommendation?.content || "SMS text copy preview bubble will render here..."}
                          </div>
                        )}

                        {previewChannel === "rcs" && (
                          <div className="rcs-card font-sans">
                            <div className="h-24 bg-gradient-to-tr from-violet-900 to-zinc-950 flex items-center justify-center text-[10px] text-violet-400 font-bold border-b border-white/[0.04]">
                              [ RCS Brand Image Mock ]
                            </div>
                            <div className="p-3 space-y-2">
                              <h5 className="text-[10px] font-bold text-zinc-200">Exclusive Reward</h5>
                              <p className="text-[9px] text-zinc-500 leading-relaxed">
                                {aiRecommendation?.content || "RCS rich card content bubble..."}
                              </p>
                              <div className="flex gap-2">
                                <button className="flex-1 py-1 rounded bg-violet-600 text-white font-bold text-[8px]">Shop Now</button>
                                <button className="flex-1 py-1 rounded bg-zinc-900 border border-white/[0.04] text-zinc-400 text-[8px]">View More</button>
                              </div>
                            </div>
                          </div>
                        )}

                        {previewChannel === "email" && (
                          <div className="p-3 bg-[#0a0a0c] border border-white/[0.05] rounded-xl text-left font-sans space-y-2">
                            <div className="border-b border-white/[0.03] pb-2 text-[9px] text-zinc-500">
                              <span className="block"><strong>Subject:</strong> Exclusive Loyalty Reward</span>
                              <span className="block mt-0.5"><strong>From:</strong> newsletter@brand.com</span>
                            </div>
                            <p className="text-[10px] text-zinc-400 leading-relaxed italic">
                              "{aiRecommendation?.content || "HTML email campaign newsletter text body will render here..."}"
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Tabs at base of mobile layout */}
                      <div className="border-t border-white/[0.03] pt-2 flex items-center justify-around">
                        {[
                          { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
                          { id: "sms", label: "SMS", icon: Smartphone },
                          { id: "rcs", label: "RCS", icon: Sparkles },
                          { id: "email", label: "Email", icon: Mail }
                        ].map((chnl) => {
                          const ChnlIcon = chnl.icon;
                          const isActive = previewChannel === chnl.id;
                          return (
                            <button
                              key={chnl.id}
                              onClick={() => setPreviewChannel(chnl.id as any)}
                              className={`p-1.5 rounded-lg flex flex-col items-center gap-0.5 transition cursor-pointer ${
                                isActive ? "bg-white/[0.04] text-violet-400" : "text-zinc-600 hover:text-zinc-400"
                              }`}
                              title={chnl.label}
                            >
                              <ChnlIcon size={11} />
                              <span className="text-[7px] font-bold uppercase tracking-wider">{chnl.label}</span>
                            </button>
                          );
                        })}
                      </div>

                    </div>
                  </div>
                </motion.div>
              )}

              {/* CAMPAIGNS TAB */}
              {activeTab === "campaigns" && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="space-y-6"
                >
                  
                  {/* View mode toggle */}
                  <div className="flex justify-between items-center font-sans">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Campaign Lifecycles</h3>
                      <p className="text-[10px] text-zinc-500 font-sans mt-0.5">Track sends and real-time webhook metric transitions.</p>
                    </div>

                    <div className="flex gap-2 border border-white/[0.04] bg-white/[0.01] p-1 rounded-xl">
                      <button 
                        onClick={() => setIsKanban(false)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                          !isKanban ? "bg-white/[0.04] text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        <LucideBarChart size={12} />
                        List View
                      </button>
                      <button 
                        onClick={() => setIsKanban(true)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                          isKanban ? "bg-white/[0.04] text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        <LayersIcon size={12} />
                        Kanban Board
                      </button>
                    </div>
                  </div>

                  {isKanban ? (
                    
                    /* KANBAN BOARD VIEW (Horilla CRM Inspired) */
                    <div className="kanban-board font-sans">
                      
                      {/* Column 1: Drafts */}
                      <div className="kanban-col space-y-3">
                        <div className="flex items-center justify-between px-2 pb-1 border-b border-white/[0.02]">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Drafts</span>
                          <span className="px-1.5 py-0.5 text-[9px] bg-zinc-900 border border-white/[0.04] rounded-full text-zinc-500 font-mono">
                            {campaigns.filter(c => c.status === "draft" || c.status === "failed").length}
                          </span>
                        </div>
                        <div className="space-y-3 h-[500px] overflow-y-auto pr-1">
                          {campaigns.filter(c => c.status === "draft" || c.status === "failed").map((c, i) => (
                            <div key={i} className="kanban-item space-y-3 font-sans">
                              <div className="flex justify-between items-start">
                                <h4 className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider">{c.name?.slice(0, 26)}</h4>
                              </div>
                              <span className="text-[9px] text-zinc-500 block">Cohort: {c.segment_name?.slice(0, 30)}</span>
                              <div className="flex items-center justify-between pt-2 border-t border-white/[0.02]">
                                <span className="text-[8px] px-1.5 py-0.5 bg-zinc-900 text-zinc-500 rounded border border-white/[0.04] uppercase font-bold">whatsapp</span>
                                
                                {currentUser.role === "viewer" ? (
                                  <div className="text-[9px] text-zinc-600 flex items-center gap-1">
                                    <Lock size={9} /> Restricted
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => handleLaunchFromKanban(c)}
                                    className="text-[9px] font-semibold bg-violet-600 hover:bg-violet-500 text-white px-2 py-1 rounded cursor-pointer"
                                  >
                                    Deploy
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Column 2: Orchestrating */}
                      <div className="kanban-col space-y-3">
                        <div className="flex items-center justify-between px-2 pb-1 border-b border-white/[0.02]">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Orchestrating</span>
                          <span className="px-1.5 py-0.5 text-[9px] bg-zinc-900 border border-white/[0.04] rounded-full text-zinc-500 font-mono">
                            {campaigns.filter(c => c.status === "sending" && c.metrics.total === 0).length}
                          </span>
                        </div>
                        <div className="space-y-3 h-[500px] overflow-y-auto pr-1">
                          {campaigns.filter(c => c.status === "sending" && c.metrics.total === 0).map((c, i) => (
                            <div key={i} className="kanban-item border border-violet-500/20 bg-violet-950/5 space-y-3 font-sans">
                              <h4 className="text-[11px] font-bold text-violet-300 uppercase tracking-wider">{c.name?.slice(0, 26)}</h4>
                              <div className="flex items-center gap-2 text-[9px] text-violet-400 font-sans">
                                <RefreshCw size={10} className="animate-spin" />
                                <span>AI segmenting and routing...</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Column 3: Sending */}
                      <div className="kanban-col space-y-3">
                        <div className="flex items-center justify-between px-2 pb-1 border-b border-white/[0.02]">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Sending</span>
                          <span className="px-1.5 py-0.5 text-[9px] bg-zinc-900 border border-white/[0.04] rounded-full text-zinc-500 font-mono">
                            {campaigns.filter(c => c.status === "sending" && c.metrics.total > 0).length}
                          </span>
                        </div>
                        <div className="space-y-3 h-[500px] overflow-y-auto pr-1">
                          {campaigns.filter(c => c.status === "sending" && c.metrics.total > 0).map((c, i) => (
                            <div key={i} className="kanban-item space-y-3 font-sans border-l-2 border-l-indigo-500">
                              <h4 className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider">{c.name?.slice(0, 26)}</h4>
                              <div className="space-y-1 text-[9px] text-zinc-500 font-sans">
                                <div className="flex justify-between">
                                  <span>Outbox scheduled:</span>
                                  <span className="font-bold text-zinc-300">{c.metrics.total}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Conversions attributed:</span>
                                  <span className="font-bold text-emerald-400">{c.metrics.converted}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Column 4: Completed */}
                      <div className="kanban-col space-y-3">
                        <div className="flex items-center justify-between px-2 pb-1 border-b border-white/[0.02]">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Completed</span>
                          <span className="px-1.5 py-0.5 text-[9px] bg-zinc-900 border border-white/[0.04] rounded-full text-zinc-500 font-mono">
                            {campaigns.filter(c => c.status === "completed").length}
                          </span>
                        </div>
                        <div className="space-y-3 h-[500px] overflow-y-auto pr-1">
                          {campaigns.filter(c => c.status === "completed").map((c, i) => (
                            <div key={i} className="kanban-item space-y-3 font-sans border-l-2 border-l-emerald-500 bg-zinc-950/20">
                              <h4 className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider">{c.name?.slice(0, 26)}</h4>
                              <div className="space-y-1 text-[9px] text-zinc-500 font-sans">
                                <div className="flex justify-between">
                                  <span>Total Sent:</span>
                                  <span className="font-bold text-zinc-300">{c.metrics.total}</span>
                                </div>
                                <div className="flex justify-between text-violet-400">
                                  <span>Converted Sales:</span>
                                  <span className="font-bold">${(c.metrics.converted * 89).toFixed(0)} LTV</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  ) : (
                    
                    /* STANDARD DETAILED LIST VIEW */
                    <div className="border border-white/[0.03] bg-[#0b0b0d]/70 rounded-2xl overflow-hidden shadow-xl font-sans">
                      <div className="divide-y divide-white/[0.03]">
                        {campaigns.length > 0 ? (
                          campaigns.map((c, i) => {
                            const m = c.metrics;
                            const hasMessages = m.total > 0;
                            
                            const delivPct = hasMessages ? Math.round((m.delivered / m.total) * 100) : 0;
                            const openPct = hasMessages ? Math.round((m.opened / m.total) * 100) : 0;
                            const clickPct = hasMessages ? Math.round((m.clicked / m.total) * 100) : 0;
                            const convPct = hasMessages ? Math.round((m.converted / m.total) * 100) : 0;

                            return (
                              <div key={i} className="p-6 space-y-4 hover:bg-white/[0.005] transition duration-200">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-bold text-zinc-200 text-xs uppercase tracking-wider">{c.name}</h4>
                                    <span className="text-[10px] text-zinc-500 block mt-0.5 font-sans">Cohort Filter: {c.segment_name}</span>
                                  </div>
                                  
                                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                    c.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                    c.status === "sending" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse" :
                                    "bg-zinc-800/80 text-zinc-400 border-zinc-700/30"
                                  }`}>
                                    {c.status}
                                  </span>
                                </div>

                                {/* Stat Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-2 font-mono">
                                  {[
                                    { label: "Outbox Triggers", val: m.total, sub: "Sends scheduled" },
                                    { label: "Delivered", val: `${m.delivered} (${delivPct}%)`, sub: "Carrier callbacks" },
                                    { label: "Opened", val: `${m.opened} (${openPct}%)`, sub: "Read tracking" },
                                    { label: "Link Clicks", val: `${m.clicked} (${clickPct}%)`, sub: "URL actions" },
                                    { label: "Converted Spend", val: `${m.converted} (${convPct}%)`, sub: "Purchases made", highlight: true }
                                  ].map((stat, idx) => (
                                    <div key={idx} className={`p-4 rounded-xl border transition duration-200 ${
                                      stat.highlight 
                                        ? "bg-violet-950/15 border-violet-900/20 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.02)]" 
                                        : "bg-black/20 border-white/[0.02] hover:border-white/[0.05]"
                                    }`}>
                                      <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-wider">{stat.label}</span>
                                      <span className="text-sm font-bold block mt-1.5">{stat.val}</span>
                                      <span className="text-[9px] text-zinc-600 block mt-0.5">{stat.sub}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-12 text-center text-xs text-zinc-500 font-sans">
                            No campaigns active.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* SHOPPER DATABASE TAB */}
              {activeTab === "shoppers" && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="space-y-6"
                >
                  
                  {/* Search and Filters Bar */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0b0b0d]/70 p-4 rounded-2xl border border-white/[0.03] font-sans">
                    
                    {/* Search query box */}
                    <div className="relative w-full md:w-80">
                      <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search name, email, or phone..."
                        className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/[0.05] rounded-xl text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500/50"
                      />
                    </div>

                    {/* Filter chips */}
                    <div className="flex flex-wrap items-center gap-4 text-xs font-sans">
                      
                      {/* Loyalty Tier Filter */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-sans">Tier:</span>
                        <div className="flex gap-1">
                          {["All", "VIP", "Gold", "Silver", "Regular"].map(tier => (
                            <button
                              key={tier}
                              onClick={() => setSelectedTier(tier)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                selectedTier === tier 
                                  ? "bg-violet-500/10 border border-violet-500/20 text-violet-300" 
                                  : "bg-white/[0.01] border border-white/[0.04] text-zinc-400 hover:text-zinc-200"
                              }`}
                            >
                              {tier}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Category preference filters */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-sans">Category:</span>
                        <div className="flex gap-1">
                          {["All", "Fashion", "Coffee", "Electronics"].map(cat => (
                            <button
                              key={cat}
                              onClick={() => setSelectedCategory(cat)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                selectedCategory === cat 
                                  ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-300" 
                                  : "bg-white/[0.01] border border-white/[0.04] text-zinc-400 hover:text-zinc-200"
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* View toggle switcher */}
                      <div className="flex gap-1 border-l border-white/[0.05] pl-4">
                        <button 
                          onClick={() => setIsCardView(false)}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            !isCardView ? "bg-white/[0.04] text-violet-400" : "text-zinc-500 hover:text-zinc-300"
                          }`}
                          title="List Table view"
                        >
                          <FileText size={13} />
                        </button>
                        <button 
                          onClick={() => setIsCardView(true)}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            isCardView ? "bg-white/[0.04] text-violet-400" : "text-zinc-500 hover:text-zinc-300"
                          }`}
                          title="Card Grid view"
                        >
                          <Database size={13} />
                        </button>
                      </div>

                    </div>
                  </div>

                  {isCardView ? (
                    
                    /* SHOPPER CARD GRID VIEW */
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((c, i) => {
                          const tier = c.metadata?.loyalty_tier || "Regular";
                          return (
                            <div 
                              key={i}
                              onMouseMove={handleSpotlightMouseMove}
                              className="spotlight-card p-6 rounded-2xl border border-white/[0.03] space-y-4 hover:border-white/[0.07] transition duration-300 relative"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-zinc-900 border border-white/[0.04] flex items-center justify-center font-bold text-violet-300 text-xs">
                                    {c.first_name ? c.first_name[0] : "U"}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-zinc-100">{c.first_name} {c.last_name}</h4>
                                    <span className="text-[10px] text-zinc-500 block">{c.email}</span>
                                  </div>
                                </div>
                                <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                  tier === "VIP" ? "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20" :
                                  tier === "Gold" ? "bg-amber-500/10 text-amber-300 border-amber-500/20" :
                                  "bg-zinc-800 text-zinc-400 border-zinc-700/20"
                                }`}>
                                  {tier}
                                </span>
                              </div>

                              {/* Spent details progress bar */}
                              <div className="space-y-1.5 pt-2">
                                <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
                                  <span>CLV SPEND:</span>
                                  <span className="text-zinc-300">${c.total_spend.toLocaleString()}</span>
                                </div>
                                <div className="h-1 w-full bg-zinc-950 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                                    style={{ width: `${Math.min(100, (c.total_spend / 1000) * 100)}%` }}
                                  />
                                </div>
                              </div>

                              <div className="flex justify-between items-center pt-2">
                                <span className="text-[9px] px-2 py-0.5 bg-white/[0.02] border border-white/[0.05] rounded text-zinc-400">
                                  {c.metadata?.preferred_category || "Unassigned"}
                                </span>
                                <button 
                                  onClick={() => openCustomerDrawer(c.id)}
                                  className="text-[9px] font-bold text-violet-400 hover:text-violet-300 flex items-center gap-0.5 cursor-pointer font-sans"
                                >
                                  Inspect Profile <ChevronRight size={10} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="col-span-3 text-center py-20 text-xs text-zinc-600 font-sans">
                          No shoppers found. Hydrate D2C database in sidebar.
                        </div>
                      )}
                    </div>
                  ) : (
                    
                    /* STANDARD DATABASE TABLE VIEW */
                    <div className="border border-white/[0.03] bg-[#0b0b0d]/70 rounded-2xl overflow-hidden shadow-xl font-sans">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-white/[0.03] text-zinc-500 font-semibold bg-zinc-950/20 text-[10px] uppercase tracking-wider font-sans">
                              <th className="p-4 pl-6">Shopper</th>
                              <th className="p-4">Demographics</th>
                              <th className="p-4">Loyalty Preference</th>
                              <th className="p-4 text-right">Orders</th>
                              <th className="p-4 text-right pr-6">LTV Aggregate</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.03] font-sans">
                            {filteredCustomers.length > 0 ? (
                              filteredCustomers.map((c, i) => (
                                <tr 
                                  key={i} 
                                  onClick={() => openCustomerDrawer(c.id)}
                                  className="hover:bg-white/[0.008] transition duration-150 cursor-pointer"
                                >
                                  <td className="p-4 pl-6 font-semibold text-zinc-200 font-sans">
                                    {c.first_name || "Unknown"} {c.last_name || ""}
                                    {c.metadata?.loyalty_tier && (
                                      <span className={`ml-2 px-2 py-0.5 rounded-full text-[8px] font-bold border uppercase tracking-wider ${
                                        c.metadata.loyalty_tier === "VIP" ? "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20" :
                                        c.metadata.loyalty_tier === "Gold" ? "bg-amber-500/10 text-amber-300 border-amber-500/20" :
                                        "bg-zinc-800 text-zinc-400 border-zinc-700/20"
                                      }`}>
                                        {c.metadata.loyalty_tier}
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-4 space-y-0.5 text-zinc-400">
                                    <span className="block">{c.email}</span>
                                    <span className="block text-zinc-500 text-[10px] font-mono">{c.phone || "No phone"}</span>
                                  </td>
                                  <td className="p-4">
                                    <span className="px-2 py-0.5 rounded-full bg-white/[0.02] border border-white/[0.05] text-[10px] text-zinc-400">
                                      {c.metadata?.preferred_category || "Unassigned"}
                                    </span>
                                    {c.metadata?.city && (
                                      <span className="ml-2 text-zinc-600 text-[10px]">
                                        {c.metadata.city}
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-4 text-right font-medium text-zinc-300 font-mono">{c.order_count}</td>
                                  <td className="p-4 text-right pr-6 font-semibold text-violet-300 font-mono">${c.total_spend.toLocaleString()}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="p-12 text-center text-zinc-500 font-sans">
                                  Shopper directory is empty. Hydrate database using the sidebar button.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* AUDIT TRAILS TAB */}
              {activeTab === "audit" && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="space-y-6"
                >
                  <div className="border border-white/[0.03] bg-[#0b0b0d]/70 rounded-2xl overflow-hidden shadow-xl font-sans">
                    <div className="p-6 border-b border-white/[0.03]">
                      <h3 className="text-sm font-semibold text-zinc-200">System Activity Logs</h3>
                      <p className="text-[11px] text-zinc-500 mt-0.5">Immutable audit logging detailing webhook interactions and database dispatches.</p>
                    </div>

                    <div className="divide-y divide-white/[0.02] p-4 font-mono text-[10px] text-zinc-500 max-h-[500px] overflow-y-auto leading-relaxed">
                      {auditLogs.length > 0 ? (
                        auditLogs.map((log, i) => (
                          <div key={i} className="py-2.5 flex items-start gap-4 hover:bg-white/[0.003] px-2 rounded">
                            <span className="text-zinc-600 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <span className="text-violet-400 font-bold shrink-0 uppercase tracking-wider">{log.action}</span>
                            <span className="text-zinc-600 shrink-0">by {log.actor}</span>
                            <span className="text-zinc-400 break-all">{JSON.stringify(log.details)}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-xs text-zinc-500 font-sans">
                          No system logs recorded.
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

            </div>
          </main>
        </div>
      )}
    </div>
  );
}

// Visual JSON cleaner utility for pre-renders
function jsonClean(obj: any): string {
  if (!obj) return "";
  try {
    return JSON.stringify(obj, null, 1)
      .replace(/\{|\}|\"/g, "")
      .trim();
  } catch(e) {
    return "";
  }
}
