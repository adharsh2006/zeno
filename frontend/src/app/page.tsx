"use client";

import React, { useState, useEffect } from "react";
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
  FileText
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
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

interface AuditLog {
  id: string;
  action: string;
  actor: string;
  details: any;
  timestamp: string;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  
  // Dashboard Metrics state
  const [shoppersCount, setShoppersCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [campaignsCount, setCampaignsCount] = useState(0);
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [conversionRates, setConversionRates] = useState({ open_rate: 0, click_rate: 0, conversion_rate: 0 });
  
  // Lists
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // AI strategy builder state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<any>(null);
  const [campaignName, setCampaignName] = useState("");
  const [launchingCampaign, setLaunchingCampaign] = useState(false);

  // Status message
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Fetch all backend stats
  const fetchOverviewStats = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/analytics/overview`);
      if (res.ok) {
        const data = await res.json();
        setShoppersCount(data.total_shoppers);
        setTotalRevenue(data.total_revenue);
        setCampaignsCount(data.campaigns_count);
        setRecentCampaigns(data.recent_campaigns);
        setConversionRates(data.rates);
        
        // Formulate Recharts funnel
        const funnel = [
          { name: "Sent", count: data.funnel.sent },
          { name: "Delivered", count: data.funnel.delivered },
          { name: "Opened", count: data.funnel.opened },
          { name: "Read", count: data.funnel.read },
          { name: "Clicked", count: data.funnel.clicked },
          { name: "Converted", count: data.funnel.converted },
        ];
        setFunnelData(funnel);
      }
    } catch (err) {
      console.error("Failed to fetch overview analytics", err);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/campaigns/`);
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
      const res = await fetch(`${BACKEND_URL}/api/v1/customers/`);
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
      const res = await fetch(`${BACKEND_URL}/api/v1/analytics/audit-logs`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
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
    reloadAllData();
    // Poll for updates in background (helpful for webhook callback visualization)
    const interval = setInterval(() => {
      fetchOverviewStats();
      fetchCampaigns();
      fetchAuditLogs();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Seed DB with mock shopper intelligence data
  const handleSeedData = async () => {
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
          orders: [] // No orders yet (churn candidate / cold lead)
        }
      ]
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/customers/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockData)
      });
      if (res.ok) {
        showToast("Database successfully seeded with shopper intelligence profiles!");
        reloadAllData();
      } else {
        showToast("Failed to seed database.", "error");
      }
    } catch (err) {
      showToast("Ingestion server unreachable.", "error");
    } finally {
      setSeeding(false);
    }
  };

  // Run LangGraph marketing recommend loops
  const handleGenerateStrategy = async () => {
    if (!aiPrompt) return;
    setAiLoading(true);
    setAiRecommendation(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/campaigns/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      if (res.ok) {
        const data = await res.json();
        setAiRecommendation(data);
        setCampaignName(`AI Campaign: ${aiPrompt.slice(0, 20)}...`);
      } else {
        showToast("Agent recommendation engine error.", "error");
      }
    } catch (err) {
      showToast("Recommendation API unreachable.", "error");
    } finally {
      setAiLoading(false);
    }
  };

  // Accept Strategy & Dispatch Campaign
  const handleLaunchCampaign = async () => {
    if (!aiRecommendation) return;
    setLaunchingCampaign(true);
    showToast("Orchestrating campaign dispatch...", "info");

    try {
      // 1. Create segment first
      const segRes = await fetch(`${BACKEND_URL}/api/v1/campaigns/segments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${campaignName} - Cohort`,
          description: `Segment compiled by AI for prompt: ${aiPrompt}`,
          rules: aiRecommendation.rules,
          ai_explanation: aiRecommendation.explanation
        })
      });
      
      if (!segRes.ok) {
        throw new Error("Failed to register campaign segment.");
      }
      const segment = await segRes.json();

      // 2. Create Campaign Draft
      const campRes = await fetch(`${BACKEND_URL}/api/v1/campaigns/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName,
          segment_id: segment.id,
          channel: aiRecommendation.channel,
          content: aiRecommendation.content,
          prompt: aiPrompt
        })
      });
      
      if (!campRes.ok) {
        throw new Error("Failed to create campaign draft.");
      }
      const campaign = await campRes.json();

      // 3. Dispatch send triggers
      const sendRes = await fetch(`${BACKEND_URL}/api/v1/campaigns/${campaign.campaign.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: aiRecommendation.channel,
          content: aiRecommendation.content
        })
      });

      if (sendRes.ok) {
        showToast("Campaign deployed! Monitoring live callback receipts...");
        setAiRecommendation(null);
        setAiPrompt("");
        setActiveTab("campaigns");
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

  return (
    <div className="flex flex-1 min-h-screen bg-[#09090b] text-zinc-100 overflow-hidden">
      
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl border shadow-2xl glass ${
              toast.type === "error" ? "border-red-500/30 text-red-300" :
              toast.type === "info" ? "border-indigo-500/30 text-indigo-300" :
              "border-emerald-500/30 text-emerald-300"
            }`}
          >
            {toast.type === "error" ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar navigation */}
      <aside className="w-64 border-r border-zinc-800/80 bg-[#0c0c0e] flex flex-col justify-between p-6">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-400 flex items-center justify-center font-bold text-zinc-950 shadow-md">
              X
            </div>
            <div>
              <span className="font-semibold text-zinc-200 tracking-tight">XENO</span>
              <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded bg-zinc-800 text-violet-400 font-mono">AI</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1">
            {[
              { id: "overview", label: "Overview", icon: LucideBarChart },
              { id: "copilot", label: "AI Copilot", icon: Sparkles },
              { id: "campaigns", label: "Campaigns", icon: Send },
              { id: "shoppers", label: "Shoppers", icon: Users },
              { id: "audit", label: "Audit Trails", icon: FileText }
            ].map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                    activeTab === item.id 
                      ? "bg-zinc-800/80 text-zinc-100 font-medium border-l-2 border-violet-400 pl-4" 
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-zinc-800/60 pt-6 space-y-4">
          <button 
            onClick={handleSeedData}
            disabled={seeding}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-zinc-100 transition duration-150 disabled:opacity-50"
          >
            <Database size={13} />
            {seeding ? "Seeding..." : "Seed Shopper Data"}
          </button>
          
          <div className="flex items-center gap-3 px-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-zinc-500 font-medium">Simulator: Active</span>
            <button 
              onClick={reloadAllData} 
              className="ml-auto text-zinc-600 hover:text-zinc-400 transition"
              title="Refresh"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#09090b] overflow-y-auto">
        <header className="h-16 border-b border-zinc-800/50 px-8 flex items-center justify-between bg-[#0a0a0c]/80 backdrop-blur-md sticky top-0 z-30">
          <h1 className="text-base font-semibold text-zinc-200 capitalize">
            {activeTab === "copilot" ? "AI Campaign Workspace" : activeTab}
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-xs text-zinc-500">Local Time: 12:00 AM</span>
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-violet-400">
              AD
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl w-full mx-auto space-y-8">
          
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="space-y-8"
            >
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                {[
                  { label: "Total Shoppers", value: shoppersCount, sub: "Loyalty segment profiles", icon: Users },
                  { label: "Total Revenue LTV", value: `$${totalRevenue.toLocaleString()}`, sub: "Gross orders database", icon: DollarSign },
                  { label: "Campaigns Executed", value: campaignsCount, sub: "Automation logs active", icon: Send },
                  { label: "Average Value", value: `$${(shoppersCount ? (totalRevenue / shoppersCount) : 0).toFixed(2)}`, sub: "Spend per cohort profile", icon: TrendingUp }
                ].map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div key={i} className="p-6 rounded-2xl bg-[#141416] border border-zinc-800/80 shadow-md flex items-center justify-between">
                      <div>
                        <span className="text-xs text-zinc-500 font-medium">{stat.label}</span>
                        <h3 className="text-2xl font-bold tracking-tight text-zinc-100 mt-1">{stat.value}</h3>
                        <p className="text-[10px] text-zinc-600 mt-0.5">{stat.sub}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-800/40 text-violet-400 border border-zinc-800/60">
                        <Icon size={18} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Funnel chart and details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Funnel chart */}
                <div className="lg:col-span-2 p-6 rounded-2xl bg-[#141416] border border-zinc-800/80 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">Aggregate Communication Funnel</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Real-time receipt webhook conversion funnel</p>
                  </div>
                  
                  <div className="h-64 mt-6">
                    {funnelData.length > 0 && funnelData.some(d => d.count > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={funnelData} barSize={32}>
                          <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "12px" }}
                            labelStyle={{ color: "#a1a1aa", fontSize: "12px", fontWeight: 600 }}
                          />
                          <Bar dataKey="count" fill="url(#colorPurple)" radius={[6, 6, 0, 0]} />
                          <defs>
                            <linearGradient id="colorPurple" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#c084fc" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#818cf8" stopOpacity={0.2}/>
                            </linearGradient>
                          </defs>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl">
                        <span className="text-xs text-zinc-600">No campaigns sent. Seed data and prompt AI to send campaigns.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Conversion Stats */}
                <div className="p-6 rounded-2xl bg-[#141416] border border-zinc-800/80 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">AI Engagement Statistics</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Closed-loop efficiency tracking</p>
                  </div>

                  <div className="space-y-6 my-6">
                    {[
                      { label: "Delivery Open Rate", value: `${conversionRates.open_rate}%`, barWidth: conversionRates.open_rate },
                      { label: "Open Click Rate (CTR)", value: `${conversionRates.click_rate}%`, barWidth: conversionRates.click_rate },
                      { label: "Click Purchase Conversion", value: `${conversionRates.conversion_rate}%`, barWidth: conversionRates.conversion_rate }
                    ].map((rate, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-zinc-400">{rate.label}</span>
                          <span className="text-zinc-200">{rate.value}</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-violet-500 to-indigo-400 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(100, Math.max(0, rate.barWidth))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-xl bg-violet-950/20 border border-violet-900/30 text-xs text-violet-300">
                    💡 <strong>Insight:</strong> WhatsApp has 4x higher CTR than Email this week. Consider prioritizing WhatsApp for churn cohort retention campaigns.
                  </div>
                </div>
              </div>

              {/* Recent campaigns section */}
              <div className="p-6 rounded-2xl bg-[#141416] border border-zinc-800/80">
                <h3 className="text-sm font-semibold text-zinc-200 mb-4">Recent Automation Execution</h3>
                <div className="divide-y divide-zinc-800/60">
                  {recentCampaigns.length > 0 ? (
                    recentCampaigns.map((c, i) => (
                      <div key={i} className="py-3.5 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-zinc-800/50 text-zinc-400">
                            <Send size={14} />
                          </div>
                          <div>
                            <span className="font-semibold text-zinc-300">{c.name}</span>
                            <span className="text-[10px] text-zinc-500 ml-3">Created: {new Date(c.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                            c.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                            c.status === "sending" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse" :
                            "bg-zinc-800 text-zinc-400"
                          }`}>
                            {c.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-zinc-600">
                      No campaigns found.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* AI COPILOT WORKSPACE TAB */}
          {activeTab === "copilot" && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="space-y-6"
            >
              {/* Input Strategist Box */}
              <div className="p-8 rounded-2xl bg-[#141416] border border-zinc-800/80 shadow-xl space-y-6 ai-glow">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center">
                    <Sparkles size={14} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">AI CRM Copilot</h3>
                    <p className="text-xs text-zinc-500">State what campaign strategy you want, and Xeno will choose who to target, what message to write, and route it.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="E.g. Target VIP high spending customers, offer them early access to a new collection, and use the best channel."
                    className="w-full h-24 p-4 rounded-xl border border-zinc-800 bg-[#09090b] text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/50 resize-none transition"
                  />
                  
                  {/* Preset prompt templates */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {[
                      "Target inactive coffee bean buyers and send a discount code",
                      "Find fashion VIPs with high spend, thank them, and offer free shipping",
                      "Re-engage regular dormant accounts with a flash discount link"
                    ].map((tpl, i) => (
                      <button
                        key={i}
                        onClick={() => setAiPrompt(tpl)}
                        className="text-[11px] px-2.5 py-1 rounded-full border border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                      >
                        {tpl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleGenerateStrategy}
                    disabled={aiLoading || !aiPrompt}
                    className="flex items-center gap-2 py-2 px-5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-zinc-950 font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aiLoading ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    {aiLoading ? "Consulting Agents..." : "Analyze & Recommend"}
                  </button>
                </div>
              </div>

              {/* Recommendation strategy board */}
              <AnimatePresence>
                {aiRecommendation && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-6 overflow-hidden"
                  >
                    <div className="border border-zinc-800/80 bg-[#101012] rounded-2xl p-6 space-y-6">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-200">Strategy Board</h3>
                          <p className="text-xs text-zinc-500">Edit values and launch autonomous dispatch when ready</p>
                        </div>
                        <input
                          value={campaignName}
                          onChange={(e) => setCampaignName(e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-[#09090b] text-xs font-semibold w-64 focus:outline-none focus:border-violet-500"
                          placeholder="Campaign Name"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* 1. Audience Cohort card */}
                        <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/60 space-y-4">
                          <div className="flex items-center gap-2.5 text-zinc-400">
                            <Users size={15} />
                            <span className="text-xs font-semibold uppercase tracking-wider">Audience Recommendation</span>
                          </div>
                          <div>
                            <span className="text-xs text-zinc-500 block">Identified segment filters:</span>
                            <pre className="text-[11px] text-zinc-400 mt-2 bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800/40 font-mono">
                              {JSON.stringify(aiRecommendation.rules, null, 2)}
                            </pre>
                          </div>
                        </div>

                        {/* 2. Routing Card */}
                        <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/60 space-y-4">
                          <div className="flex items-center gap-2.5 text-zinc-400">
                            <Send size={15} />
                            <span className="text-xs font-semibold uppercase tracking-wider">Channel & Routing</span>
                          </div>
                          <div>
                            <span className="text-xs text-zinc-500 block">Recommended Delivery:</span>
                            <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-zinc-950/40 border border-zinc-800/40 w-fit">
                              <MessageSquare size={13} className="text-violet-400" />
                              <span className="text-xs uppercase font-bold text-violet-400 font-mono">{aiRecommendation.channel}</span>
                            </div>
                            
                            <div className="mt-4 space-y-1">
                              <span className="text-[10px] text-zinc-500">Explainable AI Reasoning:</span>
                              <p className="text-[11px] text-zinc-400 leading-relaxed">
                                {aiRecommendation.explanation}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* 3. Messaging Copy card */}
                        <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/60 space-y-4">
                          <div className="flex items-center gap-2.5 text-zinc-400">
                            <MessageSquare size={15} />
                            <span className="text-xs font-semibold uppercase tracking-wider">Personalized Copy</span>
                          </div>
                          <div className="space-y-2">
                            <span className="text-xs text-zinc-500 block">Drafted Message Content:</span>
                            <textarea
                              value={aiRecommendation.content}
                              onChange={(e) => setAiRecommendation({ ...aiRecommendation, content: e.target.value })}
                              className="w-full h-32 p-3 text-xs text-zinc-300 bg-zinc-950/40 border border-zinc-800/40 rounded-lg focus:outline-none focus:border-violet-500/70"
                            />
                          </div>
                        </div>

                      </div>

                      <div className="flex justify-end pt-4 border-t border-zinc-800">
                        <button
                          onClick={handleLaunchCampaign}
                          disabled={launchingCampaign}
                          className="flex items-center gap-2 py-2 px-5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-zinc-950 transition font-bold"
                        >
                          {launchingCampaign ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                          {launchingCampaign ? "Deploying..." : "Launch Campaign"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* CAMPAIGNS LIST TAB */}
          {activeTab === "campaigns" && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="space-y-6"
            >
              <div className="border border-zinc-800/80 bg-[#141416] rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800/60">
                  <h3 className="text-sm font-semibold text-zinc-200">Active Campaign Lifecycles</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Real-time callbacks trace sends from start to purchase conversions.</p>
                </div>
                
                <div className="divide-y divide-zinc-800/50">
                  {campaigns.length > 0 ? (
                    campaigns.map((c, i) => {
                      const m = c.metrics;
                      const hasMessages = m.total > 0;
                      
                      // Percentages
                      const delivPct = hasMessages ? Math.round((m.delivered / m.total) * 100) : 0;
                      const openPct = hasMessages ? Math.round((m.opened / m.total) * 100) : 0;
                      const clickPct = hasMessages ? Math.round((m.clicked / m.total) * 100) : 0;
                      const convPct = hasMessages ? Math.round((m.converted / m.total) * 100) : 0;

                      return (
                        <div key={i} className="p-6 space-y-4 hover:bg-zinc-800/10 transition">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-zinc-200 text-sm">{c.name}</h4>
                              <span className="text-[10px] text-zinc-500">Segment: {c.segment_name}</span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                c.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                c.status === "sending" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse" :
                                "bg-zinc-800 text-zinc-400"
                              }`}>
                                {c.status}
                              </span>
                            </div>
                          </div>

                          {/* Live callback delivery progress funnels */}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-2">
                            {[
                              { label: "Dispatched", val: m.total, sub: "Outbox triggers" },
                              { label: "Delivered", val: `${m.delivered} (${delivPct}%)`, sub: "Deliver receipt" },
                              { label: "Opened", val: `${m.opened} (${openPct}%)`, sub: "Read receipt" },
                              { label: "Clicked", val: `${m.clicked} (${clickPct}%)`, sub: "Link actions" },
                              { label: "Converted", val: `${m.converted} (${convPct}%)`, sub: "Purchased items", highlight: true }
                            ].map((stat, idx) => (
                              <div key={idx} className={`p-3 rounded-xl border ${
                                stat.highlight ? "bg-violet-950/20 border-violet-900/30 text-violet-300" : "bg-zinc-900/30 border-zinc-800/55"
                              }`}>
                                <span className="text-[10px] text-zinc-500 block uppercase font-medium">{stat.label}</span>
                                <span className="text-base font-bold block mt-1">{stat.val}</span>
                                <span className="text-[9px] text-zinc-600 block mt-0.5">{stat.sub}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-12 text-center text-xs text-zinc-600">
                      No campaigns found. Go to "AI Copilot" to generate and send campaigns.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* SHOPPERS TAB */}
          {activeTab === "shoppers" && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="space-y-6"
            >
              <div className="border border-zinc-800/80 bg-[#141416] rounded-2xl overflow-hidden shadow-lg">
                <div className="p-6 border-b border-zinc-800/60 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">Customer profiles & demographic metrics</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Shopper Intelligence profiles including unified order spend.</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-500 font-semibold bg-zinc-900/40">
                        <th className="p-4 pl-6">Shopper</th>
                        <th className="p-4">Contact</th>
                        <th className="p-4">Tags / Preferred category</th>
                        <th className="p-4 text-right">Orders</th>
                        <th className="p-4 text-right pr-6">Lifetime Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {customers.length > 0 ? (
                        customers.map((c, i) => (
                          <tr key={i} className="hover:bg-zinc-800/10 transition">
                            <td className="p-4 pl-6 font-semibold text-zinc-200">
                              {c.first_name || "Unknown"} {c.last_name || ""}
                              {c.metadata?.loyalty_tier && (
                                <span className="ml-2 px-1.5 py-0.5 rounded bg-violet-950 text-violet-300 text-[9px] font-bold">
                                  {c.metadata.loyalty_tier}
                                </span>
                              )}
                            </td>
                            <td className="p-4 space-y-0.5">
                              <span className="block text-zinc-400">{c.email}</span>
                              <span className="block text-zinc-500 text-[10px]">{c.phone || "No phone"}</span>
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/50 text-[10px] text-zinc-400">
                                {c.metadata?.preferred_category || "Unassigned"}
                              </span>
                              {c.metadata?.city && (
                                <span className="ml-1.5 text-zinc-600 text-[10px]">
                                  {c.metadata.city}
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right font-medium text-zinc-300">{c.order_count}</td>
                            <td className="p-4 text-right pr-6 font-semibold text-violet-300">${c.total_spend.toLocaleString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-12 text-center text-zinc-600">
                            Shopper directory is empty. Click "Seed Shopper Data" below or in the sidebar to populate.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* AUDIT TRAILS TAB */}
          {activeTab === "audit" && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="space-y-6"
            >
              <div className="border border-zinc-800/80 bg-[#141416] rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800/60">
                  <h3 className="text-sm font-semibold text-zinc-200">System Activity Logs</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Immutable audit logging detailing webhook interactions and database dispatches.</p>
                </div>

                <div className="divide-y divide-zinc-800/40 p-4 font-mono text-[11px] text-zinc-400 max-h-[500px] overflow-y-auto">
                  {auditLogs.length > 0 ? (
                    auditLogs.map((log, i) => (
                      <div key={i} className="py-2.5 flex items-start gap-4">
                        <span className="text-zinc-600 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span className="text-violet-400 font-semibold shrink-0 uppercase tracking-wider">{log.action}</span>
                        <span className="text-zinc-500 shrink-0">by {log.actor}</span>
                        <span className="text-zinc-300 break-all">{JSON.stringify(log.details)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-zinc-600 font-sans">
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
  );
}
