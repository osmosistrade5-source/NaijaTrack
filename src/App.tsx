/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from "recharts";
import { 
  Megaphone, 
  Users, 
  Link as LinkIcon, 
  CheckCircle, 
  TrendingUp, 
  Plus, 
  MessageSquare,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Globe,
  ShieldCheck,
  Smartphone,
  Bell,
  Wallet,
  ArrowDownCircle,
  History,
  LayoutDashboard,
  CreditCard,
  Banknote,
  Calendar,
  Percent,
  ShieldAlert,
  LifeBuoy,
  Settings,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// --- Types ---

interface Campaign {
  id: string;
  brand_id: string;
  title: string;
  description: string;
  budget: number;
  payout_per_lead: number;
  wa_number: string;
  created_at: string;
}

interface Influencer {
  id: string;
  name: string;
  handle: string;
  platform: string;
}

interface CampaignStat {
  influencer_name: string;
  short_code: string;
  click_count: number;
  conversion_count: number;
}

interface Brand {
  id: string;
  name: string;
  email: string;
  subscription_status: 'active' | 'inactive';
  last_payment_date: string | null;
}

// --- Components ---

const Navbar = ({ activeView, setActiveView }: { activeView: string, setActiveView: (v: string) => void }) => (
  <nav className="border-b border-zinc-200 bg-white sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between h-16 items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveView("landing")}>
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">N</div>
          <span className="text-xl font-bold tracking-tight text-zinc-900">NaijaTrack</span>
        </div>
        <div className="hidden sm:flex gap-8">
          {[
            { id: "brand", label: "Brands", icon: Megaphone },
            { id: "influencer", label: "Influencers", icon: Users },
            { id: "sme", label: "SME Portal", icon: CheckCircle },
            { id: "analytics", label: "Analytics", icon: TrendingUp },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                activeView === item.id ? "text-emerald-600" : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </div>
        <button 
          onClick={() => setActiveView("brand")}
          className="bg-zinc-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-zinc-800 transition-all"
        >
          Get Started
        </button>
      </div>
    </div>
  </nav>
);

const LandingPage = ({ onStart }: { onStart: (view: string) => void }) => (
  <div className="bg-white">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <div className="text-center max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-6">
            Performance Marketing for Nigeria
          </span>
          <h1 className="text-5xl sm:text-7xl font-bold text-zinc-900 tracking-tight leading-[1.1] mb-8">
            Bridge Social Media to <span className="text-emerald-600 italic">WhatsApp Sales</span>
          </h1>
          <p className="text-xl text-zinc-500 mb-10 leading-relaxed">
            NaijaTrack helps Nigerian SMEs track influencer ROI by bridging Instagram & TikTok promotions to verifiable WhatsApp commerce closures.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => onStart("brand")}
              className="bg-zinc-900 text-white px-8 py-4 rounded-full font-semibold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
            >
              For Brands <ArrowRight size={20} />
            </button>
            <button 
              onClick={() => onStart("influencer")}
              className="border border-zinc-200 text-zinc-900 px-8 py-4 rounded-full font-semibold hover:bg-zinc-50 transition-all"
            >
              For Influencers
            </button>
          </div>
        </motion.div>
      </div>

      <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-12">
        {[
          {
            title: "Trackable Links",
            desc: "Unique wa.me links with device fingerprinting to attribute every lead.",
            icon: LinkIcon,
            color: "bg-blue-50 text-blue-600"
          },
          {
            title: "ROI Transparency",
            desc: "Shift from flat fees to CPL/CPA. Pay only for verifiable sales closures.",
            icon: TrendingUp,
            color: "bg-emerald-50 text-emerald-600"
          },
          {
            title: "WhatsApp Native",
            desc: "Built for the dominant sales channel in Nigeria. No complex apps needed.",
            icon: MessageSquare,
            color: "bg-amber-50 text-amber-600"
          }
        ].map((feature, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="p-8 rounded-3xl border border-zinc-100 hover:border-zinc-200 transition-all"
          >
            <div className={`w-12 h-12 ${feature.color} rounded-2xl flex items-center justify-center mb-6`}>
              <feature.icon size={24} />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-3">{feature.title}</h3>
            <p className="text-zinc-500 leading-relaxed">{feature.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </div>
);

const BrandDashboard = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<CampaignStat[]>([]);
  const [allInfluencers, setAllInfluencers] = useState<Influencer[]>([]);
  const [showAssign, setShowAssign] = useState(false);

  const [newCampaign, setNewCampaign] = useState({
    title: "",
    description: "",
    budget: 50000,
    payout_per_lead: 1000,
    wa_number: "234"
  });

  useEffect(() => {
    fetchBrands();
    fetchInfluencers();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchCampaigns();
    }
  }, [selectedBrand]);

  useEffect(() => {
    if (selectedCampaign) {
      fetchStats(selectedCampaign.id);
    }
  }, [selectedCampaign]);

  const fetchBrands = async () => {
    const res = await fetch("/api/brands");
    const data = await res.json();
    setBrands(data);
    if (data.length > 0 && !selectedBrand) setSelectedBrand(data[0]);
  };

  const fetchCampaigns = async () => {
    const res = await fetch("/api/campaigns");
    const data = await res.json();
    setCampaigns(data.filter((c: any) => c.brand_id === selectedBrand?.id));
  };

  const handleSubscribe = async () => {
    if (!selectedBrand) return;
    const res = await fetch(`/api/brands/${selectedBrand.id}/subscribe`, { method: "POST" });
    if (res.ok) {
      fetchBrands();
    }
  };

  const fetchInfluencers = async () => {
    const res = await fetch("/api/influencers");
    const data = await res.json();
    setAllInfluencers(data);
  };

  const fetchStats = async (id: string) => {
    const res = await fetch(`/api/campaigns/${id}/stats`);
    const data = await res.json();
    setStats(data);
  };

  const handleAssign = async (influencerId: string) => {
    if (!selectedCampaign) return;
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaign_id: selectedCampaign.id, influencer_id: influencerId })
    });
    if (res.ok) {
      fetchStats(selectedCampaign.id);
      setShowAssign(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newCampaign, brand_id: "demo_brand" })
    });
    if (res.ok) {
      setShowCreate(false);
      fetchCampaigns();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Brand Dashboard</h2>
          <div className="flex items-center gap-3 mt-2">
            <select 
              value={selectedBrand?.id} 
              onChange={(e) => setSelectedBrand(brands.find(b => b.id === e.target.value) || null)}
              className="bg-zinc-100 border-none rounded-lg px-3 py-1 text-sm font-medium outline-none"
            >
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
              selectedBrand?.subscription_status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
              {selectedBrand?.subscription_status || 'inactive'}
            </span>
          </div>
        </div>
        
        {selectedBrand?.subscription_status === 'inactive' ? (
          <button 
            onClick={handleSubscribe}
            className="bg-emerald-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-200"
          >
            <Wallet size={20} /> Pay Monthly Fee (₦15,000)
          </button>
        ) : (
          <button 
            onClick={() => setShowCreate(true)}
            className="bg-zinc-900 text-white px-6 py-3 rounded-full font-semibold hover:bg-zinc-800 transition-all flex items-center gap-2"
          >
            <Plus size={20} /> Create Campaign
          </button>
        )}
      </div>

      {selectedBrand?.subscription_status === 'inactive' && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 mb-12 text-center">
          <h3 className="text-xl font-bold text-amber-900 mb-2">Subscription Required</h3>
          <p className="text-amber-700 max-w-lg mx-auto">Your account is currently inactive. Please pay the monthly platform fee to manage campaigns and view detailed analytics.</p>
        </div>
      )}

      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-8 ${selectedBrand?.subscription_status === 'inactive' ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest px-2">Your Campaigns</h3>
          {campaigns.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCampaign(c)}
              className={`w-full text-left p-6 rounded-3xl border transition-all ${
                selectedCampaign?.id === c.id 
                  ? "border-emerald-600 bg-emerald-50/50 shadow-sm" 
                  : "border-zinc-100 hover:border-zinc-200 bg-white"
              }`}
            >
              <h4 className="font-bold text-zinc-900 mb-1">{c.title}</h4>
              <p className="text-sm text-zinc-500 line-clamp-1">{c.description}</p>
              <div className="mt-4 flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-600">₦{c.payout_per_lead}/lead</span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-tighter">{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selectedCampaign ? (
            <motion.div 
              key={selectedCampaign.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-zinc-900 mb-2">{selectedCampaign.title}</h3>
                  <p className="text-zinc-500">{selectedCampaign.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-zinc-400 uppercase font-bold tracking-widest mb-1">Total Budget</div>
                  <div className="text-2xl font-bold text-zinc-900">₦{selectedCampaign.budget.toLocaleString()}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 mb-12">
                <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-100">
                  <div className="text-zinc-400 text-xs font-bold uppercase mb-2">Total Clicks</div>
                  <div className="text-2xl font-bold text-zinc-900">
                    {stats.reduce((acc, s) => acc + s.click_count, 0)}
                  </div>
                </div>
                <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-100">
                  <div className="text-zinc-400 text-xs font-bold uppercase mb-2">Conversions</div>
                  <div className="text-2xl font-bold text-emerald-600">
                    {stats.reduce((acc, s) => acc + s.conversion_count, 0)}
                  </div>
                </div>
                <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-100">
                  <div className="text-zinc-400 text-xs font-bold uppercase mb-2">Conversion Rate</div>
                  <div className="text-2xl font-bold text-zinc-900">
                    {stats.reduce((acc, s) => acc + s.click_count, 0) > 0 
                      ? ((stats.reduce((acc, s) => acc + s.conversion_count, 0) / stats.reduce((acc, s) => acc + s.click_count, 0)) * 100).toFixed(1)
                      : 0}%
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mb-6">
                <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Influencer Performance</h4>
                <button 
                  onClick={() => setShowAssign(true)}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <Plus size={14} /> Assign Influencer
                </button>
              </div>
              <div className="h-[300px] w-full mb-8">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="influencer_name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      cursor={{ fill: '#f4f4f5' }}
                    />
                    <Bar dataKey="click_count" name="Clicks" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="conversion_count" name="Sales" fill="#064e3b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-hidden rounded-2xl border border-zinc-100">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50 border-b border-zinc-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase">Influencer</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase">Short Code</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase text-right">Clicks</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase text-right">Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {stats.map((s, i) => (
                      <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-zinc-900">{s.influencer_name}</td>
                        <td className="px-6 py-4 font-mono text-xs text-zinc-500">{s.short_code}</td>
                        <td className="px-6 py-4 text-right text-zinc-900">{s.click_count}</td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-600">{s.conversion_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 border-2 border-dashed border-zinc-100 rounded-3xl">
              <Megaphone size={48} className="mb-4 opacity-20" />
              <p>Select a campaign to view detailed analytics</p>
            </div>
          )}
        </div>
      </div>

      {/* Assign Modal */}
      <AnimatePresence>
        {showAssign && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAssign(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <h3 className="text-2xl font-bold text-zinc-900 mb-2">Assign Influencer</h3>
                <p className="text-zinc-500 text-sm mb-6">Generate a unique tracking link for an influencer.</p>
                
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {allInfluencers.filter(i => !stats.some(s => s.influencer_name === i.name)).map(i => (
                    <button
                      key={i.id}
                      onClick={() => handleAssign(i.id)}
                      className="w-full text-left p-4 rounded-2xl border border-zinc-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all flex justify-between items-center group"
                    >
                      <div>
                        <div className="font-bold text-zinc-900">{i.name}</div>
                        <div className="text-xs text-zinc-500">@{i.handle} • {i.platform}</div>
                      </div>
                      <ChevronRight size={18} className="text-zinc-300 group-hover:text-emerald-600 transition-colors" />
                    </button>
                  ))}
                  {allInfluencers.filter(i => !stats.some(s => s.influencer_name === i.name)).length === 0 && (
                    <div className="text-center py-8 text-zinc-400 text-sm">
                      All available influencers are already assigned.
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-zinc-100">
                  <button 
                    onClick={() => setShowAssign(false)}
                    className="w-full py-3 rounded-xl font-bold text-zinc-500 hover:bg-zinc-50 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreate(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <h3 className="text-2xl font-bold text-zinc-900 mb-6">New Campaign</h3>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Campaign Title</label>
                    <input 
                      required
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all"
                      placeholder="e.g. Summer Shoe Sale"
                      value={newCampaign.title}
                      onChange={e => setNewCampaign({...newCampaign, title: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Description</label>
                    <textarea 
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all h-24"
                      placeholder="What are you promoting?"
                      value={newCampaign.description}
                      onChange={e => setNewCampaign({...newCampaign, description: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Budget (₦)</label>
                      <input 
                        type="number"
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all"
                        value={newCampaign.budget}
                        onChange={e => setNewCampaign({...newCampaign, budget: parseInt(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Payout/Lead (₦)</label>
                      <input 
                        type="number"
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all"
                        value={newCampaign.payout_per_lead}
                        onChange={e => setNewCampaign({...newCampaign, payout_per_lead: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">WhatsApp Number</label>
                    <input 
                      required
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all"
                      placeholder="234..."
                      value={newCampaign.wa_number}
                      onChange={e => setNewCampaign({...newCampaign, wa_number: e.target.value})}
                    />
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setShowCreate(false)}
                      className="flex-1 px-6 py-3 rounded-xl font-bold text-zinc-500 hover:bg-zinc-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all"
                    >
                      Launch
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const InfluencerDashboard = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [selectedInfluencer, setSelectedInfluencer] = useState<Influencer | null>(null);
  const [generatedLinks, setGeneratedLinks] = useState<Record<string, string>>({});
  const [walletData, setWalletData] = useState<any>(null);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: "", bank: "", account: "" });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedInfluencer) {
      fetchWallet(selectedInfluencer.id);
    }
  }, [selectedInfluencer]);

  const fetchData = async () => {
    const [cRes, iRes] = await Promise.all([
      fetch("/api/campaigns"),
      fetch("/api/influencers")
    ]);
    setCampaigns(await cRes.json());
    setInfluencers(await iRes.json());
  };

  const fetchWallet = async (id: string) => {
    const res = await fetch(`/api/influencers/${id}/wallet`);
    const data = await res.json();
    setWalletData(data);
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInfluencer) return;
    const res = await fetch("/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        influencer_id: selectedInfluencer.id,
        amount: parseFloat(withdrawForm.amount),
        bank_name: withdrawForm.bank,
        account_number: withdrawForm.account
      })
    });
    if (res.ok) {
      setShowWithdraw(false);
      fetchWallet(selectedInfluencer.id);
      setWithdrawForm({ amount: "", bank: "", account: "" });
    }
  };

  const generateLink = async (campaignId: string) => {
    if (!selectedInfluencer) return;
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaign_id: campaignId, influencer_id: selectedInfluencer.id })
    });
    const data = await res.json();
    setGeneratedLinks(prev => ({ ...prev, [campaignId]: data.short_code }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Influencer Portal</h2>
        <p className="text-zinc-500">Pick a campaign and start earning</p>
      </div>

      <div className="mb-12">
        <label className="block text-xs font-bold text-zinc-400 uppercase mb-4">Select Your Profile</label>
        <div className="flex flex-wrap gap-3">
          {influencers.map(i => (
            <button
              key={i.id}
              onClick={() => setSelectedInfluencer(i)}
              className={`px-6 py-3 rounded-full border font-medium transition-all ${
                selectedInfluencer?.id === i.id 
                  ? "bg-zinc-900 text-white border-zinc-900" 
                  : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
              }`}
            >
              {i.name} (@{i.handle})
            </button>
          ))}
        </div>
      </div>

      {selectedInfluencer && walletData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          <div className="lg:col-span-1 bg-zinc-900 text-white p-8 rounded-[40px] shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <Wallet size={24} className="text-emerald-400" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Available Balance</span>
              </div>
              <div className="text-4xl font-bold mb-2">₦{walletData.wallet?.balance?.toLocaleString() || "0"}</div>
              <div className="text-xs text-white/40 mb-8">Total Earned: ₦{walletData.wallet?.total_earned?.toLocaleString() || "0"}</div>
              <button 
                onClick={() => setShowWithdraw(true)}
                className="w-full bg-emerald-500 text-zinc-900 py-4 rounded-2xl font-bold hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
              >
                <ArrowDownCircle size={20} /> Withdraw Funds
              </button>
            </div>
            {/* Decorative circles */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
          </div>

          <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <History size={20} className="text-zinc-400" />
              <h3 className="font-bold text-zinc-900">Recent Withdrawals</h3>
            </div>
            <div className="space-y-4">
              {walletData.withdrawals.length > 0 ? walletData.withdrawals.map((w: any) => (
                <div key={w.id} className="flex justify-between items-center p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                  <div>
                    <div className="font-bold text-zinc-900">₦{w.amount.toLocaleString()}</div>
                    <div className="text-[10px] text-zinc-400 uppercase tracking-tighter">{w.bank_name} • {w.account_number}</div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                      w.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {w.status}
                    </span>
                    <div className="text-[10px] text-zinc-400 mt-1">{new Date(w.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 text-zinc-400 text-sm italic">No withdrawal history yet.</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-100 border-2 border-dashed border-zinc-200 rounded-[40px] p-12 text-center mb-16">
          <div className="w-16 h-16 bg-zinc-200 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Wallet size={32} className="text-zinc-400" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 mb-2">Wallet Locked</h3>
          <p className="text-zinc-500 max-w-xs mx-auto">Please select an influencer profile above to view your earnings and withdraw funds.</p>
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Available Campaigns</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map(c => (
          <div key={c.id} className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm flex flex-col">
            <div className="flex-1">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-zinc-900">{c.title}</h3>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded uppercase">Active</span>
              </div>
              <p className="text-zinc-500 text-sm mb-6 line-clamp-2">{c.description}</p>
              <div className="flex items-center gap-4 mb-8">
                <div className="flex-1 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Payout</div>
                  <div className="font-bold text-zinc-900">₦{c.payout_per_lead}</div>
                  <div className="text-[8px] text-zinc-400 mt-0.5 italic">(-7% platform fee)</div>
                </div>
                <div className="flex-1 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Budget</div>
                  <div className="font-bold text-zinc-900">₦{c.budget / 1000}k</div>
                </div>
              </div>
            </div>

            {generatedLinks[c.id] ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                  <code className="text-xs font-mono text-emerald-700">
                    {window.location.origin}/t/{generatedLinks[c.id]}
                  </code>
                  <button 
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/t/${generatedLinks[c.id]}`)}
                    className="text-emerald-600 hover:text-emerald-700"
                  >
                    <LinkIcon size={16} />
                  </button>
                </div>
                <p className="text-[10px] text-center text-zinc-400">Share this link in your bio or stories</p>
              </div>
            ) : (
              <button 
                disabled={!selectedInfluencer}
                onClick={() => generateLink(c.id)}
                className={`w-full py-4 rounded-2xl font-bold transition-all ${
                  selectedInfluencer 
                    ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                    : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                }`}
              >
                Generate Trackable Link
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {showWithdraw && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWithdraw(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <h3 className="text-2xl font-bold text-zinc-900 mb-6">Withdraw Funds</h3>
                <form onSubmit={handleWithdraw} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Amount (₦)</label>
                    <input 
                      required
                      type="number"
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all"
                      placeholder="0.00"
                      max={walletData?.wallet?.balance}
                      value={withdrawForm.amount}
                      onChange={e => setWithdrawForm({...withdrawForm, amount: e.target.value})}
                    />
                    <p className="mt-1 text-[10px] text-zinc-400">Max: ₦{walletData?.wallet?.balance?.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Bank Name</label>
                    <input 
                      required
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all"
                      placeholder="e.g. GTBank, Zenith"
                      value={withdrawForm.bank}
                      onChange={e => setWithdrawForm({...withdrawForm, bank: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Account Number</label>
                    <input 
                      required
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all"
                      placeholder="10 digits"
                      maxLength={10}
                      value={withdrawForm.account}
                      onChange={e => setWithdrawForm({...withdrawForm, account: e.target.value})}
                    />
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setShowWithdraw(false)}
                      className="flex-1 px-6 py-3 rounded-xl font-bold text-zinc-500 hover:bg-zinc-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all"
                    >
                      Request Payout
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AnalyticsDashboard = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then(res => res.json())
      .then(setData);
  }, []);

  if (!data) return <div className="p-12 text-center text-zinc-400">Loading analytics...</div>;

  const COLORS = ['#10b981', '#064e3b', '#3b82f6', '#f59e0b'];

  const pieData = [
    { name: 'Sales', value: data.ratio.total_sales },
    { name: 'Clicks', value: Math.max(0, data.ratio.total_clicks - data.ratio.total_sales) },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Ecosystem Analytics</h2>
        <p className="text-zinc-500">Real-time performance across the platform</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* CTR Trends */}
        <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
          <h3 className="font-bold text-zinc-900 mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-600" />
            CTR Trends (Last 14 Days)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  tickFormatter={(str) => str.split('-').slice(1).join('/')}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Line type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={3} dot={false} name="Clicks" />
                <Line type="monotone" dataKey="conversions" stroke="#064e3b" strokeWidth={3} dot={false} name="Sales" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Click vs Sale Ratio */}
        <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm relative">
          <h3 className="font-bold text-zinc-900 mb-6 flex items-center gap-2">
            <CheckCircle size={20} className="text-emerald-600" />
            Click vs Sale Ratio
          </h3>
          <div className="flex items-center justify-center h-[300px] relative">
            <div className="w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-bold text-zinc-900">
                {data.ratio.total_clicks > 0 
                  ? ((data.ratio.total_sales / data.ratio.total_clicks) * 100).toFixed(1) 
                  : 0}%
              </span>
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Conversion</span>
            </div>
          </div>
          <div className="flex justify-center gap-8 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-zinc-500">Sales ({data.ratio.total_sales})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-900" />
              <span className="text-xs text-zinc-500">Other Clicks ({Math.max(0, data.ratio.total_clicks - data.ratio.total_sales)})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Influencer Ranking */}
      <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
        <h3 className="font-bold text-zinc-900 mb-6 flex items-center gap-2">
          <Users size={20} className="text-emerald-600" />
          Top Influencers
        </h3>
        <div className="overflow-hidden rounded-2xl border border-zinc-100">
          <table className="w-full text-left">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase">Rank</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase">Influencer</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase text-right">Sales</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase text-right">Total Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {data.ranking.map((inf: any, i: number) => (
                <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      i === 0 ? 'bg-amber-100 text-amber-700' : 
                      i === 1 ? 'bg-zinc-200 text-zinc-700' : 
                      i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-zinc-50 text-zinc-400'
                    }`}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-zinc-900">{inf.name}</div>
                    <div className="text-xs text-zinc-500">@{inf.handle}</div>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-zinc-900">{inf.conversions}</td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-600">₦{inf.total_earned.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [financeOpen, setFinanceOpen] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: "", bank: "", account: "" });

  const fetchStats = () => {
    fetch("/api/admin/stats")
      .then(res => res.json())
      .then(setStats);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: parseFloat(withdrawForm.amount),
        bank_name: withdrawForm.bank,
        account_number: withdrawForm.account
      })
    });

    if (res.ok) {
      setShowWithdraw(false);
      setWithdrawForm({ amount: "", bank: "", account: "" });
      fetchStats();
    } else {
      const err = await res.json();
      alert(err.error || "Withdrawal failed");
    }
  };

  const menuItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "users", label: "Users", icon: Users },
    { id: "campaigns", label: "Campaigns", icon: Megaphone },
    { id: "conversions", label: "Conversions", icon: CheckCircle },
    { id: "payouts", label: "Payouts", icon: CreditCard },
  ];

  const financeItems = [
    { id: "subscriptions", label: "Brand Subscriptions", icon: Calendar },
    { id: "fees", label: "Platform Fees (7%)", icon: Percent },
    { id: "wallet", label: "Platform Wallet", icon: Wallet },
    { id: "transactions", label: "Transactions", icon: History },
  ];

  const bottomItems = [
    { id: "fraud", label: "Fraud Detection", icon: ShieldAlert },
    { id: "support", label: "Support", icon: LifeBuoy },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  if (!stats) return <div className="p-12 text-center text-zinc-400">Loading admin stats...</div>;

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-zinc-50">
      {/* Admin Sidebar */}
      <aside className="w-72 bg-white border-r border-zinc-200 flex flex-col">
        <div className="p-6 border-b border-zinc-100">
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <ShieldCheck size={20} />
            <span className="text-xs font-bold uppercase tracking-widest">Admin Control</span>
          </div>
          <h2 className="text-xl font-bold text-zinc-900">Dashboard</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === item.id 
                  ? "bg-emerald-50 text-emerald-700 shadow-sm" 
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}

          <div className="pt-4 pb-2">
            <button 
              onClick={() => setFinanceOpen(!financeOpen)}
              className="w-full flex items-center justify-between px-4 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Banknote size={14} />
                Finance
              </div>
              <ChevronDown size={14} className={`transition-transform ${financeOpen ? "" : "-rotate-90"}`} />
            </button>
            
            {financeOpen && (
              <div className="mt-1 space-y-1 ml-2 border-l-2 border-zinc-100">
                {financeItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      activeTab === item.id 
                        ? "text-emerald-700 font-bold" 
                        : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    <item.icon size={14} />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 space-y-1">
            {bottomItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === item.id 
                    ? "bg-emerald-50 text-emerald-700 shadow-sm" 
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-zinc-100">
          <div className="bg-zinc-900 rounded-2xl p-4 text-white">
            <div className="text-[10px] font-bold text-zinc-500 uppercase mb-2">System Status</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium">All systems operational</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8 lg:p-12">
          {activeTab === "overview" && (
            <div className="space-y-12">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Overview</h2>
                  <p className="text-zinc-500">Platform health and revenue monitoring</p>
                </div>
                <div className="text-sm font-medium text-zinc-400 bg-white px-4 py-2 rounded-full border border-zinc-100">
                  Last updated: Just now
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                    <TrendingUp size={20} />
                  </div>
                  <div className="text-sm text-zinc-400 font-bold uppercase tracking-widest mb-1">Total Commissions</div>
                  <div className="text-2xl font-bold text-zinc-900">₦{stats.total_commissions.toLocaleString()}</div>
                  <div className="text-[10px] text-zinc-400 mt-1">7% cut from all confirmed sales</div>
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                    <Wallet size={20} />
                  </div>
                  <div className="text-sm text-zinc-400 font-bold uppercase tracking-widest mb-1">Subscription Revenue</div>
                  <div className="text-2xl font-bold text-zinc-900">₦{stats.total_subscription_revenue.toLocaleString()}</div>
                  <div className="text-[10px] text-zinc-400 mt-1">Monthly fees from brands</div>
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
                  <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
                    <Megaphone size={20} />
                  </div>
                  <div className="text-sm text-zinc-400 font-bold uppercase tracking-widest mb-1">Total Brands</div>
                  <div className="text-2xl font-bold text-zinc-900">{stats.brandCount}</div>
                  <div className="text-[10px] text-zinc-400 mt-1">{stats.activeSubscriptions} active subscriptions</div>
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
                  <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4">
                    <Users size={20} />
                  </div>
                  <div className="text-sm text-zinc-400 font-bold uppercase tracking-widest mb-1">Total Influencers</div>
                  <div className="text-2xl font-bold text-zinc-900">{stats.influencerCount}</div>
                  <div className="text-[10px] text-zinc-400 mt-1">Active on the platform</div>
                </div>
              </div>

              <div className="bg-zinc-900 text-white p-12 rounded-[50px] relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-3xl font-bold">Available Platform Balance</h3>
                    <button 
                      onClick={() => setShowWithdraw(true)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      <ArrowUpRight size={18} />
                      Withdraw to Bank
                    </button>
                  </div>
                  <div className="text-6xl font-bold text-emerald-400 mb-8">
                    ₦{stats.balance?.toLocaleString() || "0"}
                  </div>
                  <div className="grid grid-cols-2 gap-8 max-w-md">
                    <div>
                      <div className="text-xs text-white/40 uppercase font-bold tracking-widest mb-2">Commission Share</div>
                      <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-400 h-full" 
                          style={{ width: `${(stats.total_commissions / (stats.total_commissions + stats.total_subscription_revenue || 1)) * 100}%` }} 
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-white/40 uppercase font-bold tracking-widest mb-2">Subscription Share</div>
                      <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-400 h-full" 
                          style={{ width: `${(stats.total_subscription_revenue / (stats.total_commissions + stats.total_subscription_revenue || 1)) * 100}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-emerald-500/10 to-transparent" />
              </div>
            </div>
          )}

          {activeTab === "wallet" && (
            <div className="space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Platform Wallet</h2>
                  <p className="text-zinc-500">Manage platform revenue and withdrawals</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
                  <div className="text-sm text-zinc-400 font-bold uppercase tracking-widest mb-1">Available Balance</div>
                  <div className="text-3xl font-bold text-zinc-900">₦{stats.balance?.toLocaleString() || "0"}</div>
                </div>
                <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
                  <div className="text-sm text-zinc-400 font-bold uppercase tracking-widest mb-1">Total Commissions</div>
                  <div className="text-3xl font-bold text-zinc-900">₦{stats.total_commissions.toLocaleString()}</div>
                </div>
                <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
                  <div className="text-sm text-zinc-400 font-bold uppercase tracking-widest mb-1">Subscription Revenue</div>
                  <div className="text-3xl font-bold text-zinc-900">₦{stats.total_subscription_revenue.toLocaleString()}</div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
                <h3 className="font-bold text-zinc-900 mb-6">Withdrawal History</h3>
                <div className="overflow-hidden rounded-2xl border border-zinc-100">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50 border-b border-zinc-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase">Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase">Bank Details</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase text-right">Amount</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {stats.withdrawals?.length > 0 ? (
                        stats.withdrawals.map((w: any) => (
                          <tr key={w.id} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="px-6 py-4 text-sm text-zinc-500">
                              {new Date(w.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-bold text-zinc-900">{w.bank_name}</div>
                              <div className="text-xs text-zinc-500">{w.account_number}</div>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-zinc-900">
                              ₦{w.amount.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase">
                                {w.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-zinc-400 italic">No withdrawals yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab !== "overview" && activeTab !== "wallet" && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 bg-zinc-100 text-zinc-400 rounded-3xl flex items-center justify-center mb-6">
                <ShieldCheck size={40} />
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-2">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Module</h3>
              <p className="text-zinc-500 max-w-sm">This administrative module is currently being populated with real-time data from the NaijaTrack ecosystem.</p>
            </div>
          )}
        </div>
      </main>

      {/* Admin Withdraw Modal */}
      <AnimatePresence>
        {showWithdraw && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWithdraw(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <Banknote size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-zinc-900">Platform Payout</h3>
                    <p className="text-xs text-zinc-500">Withdraw revenue to corporate account</p>
                  </div>
                </div>
                
                <form onSubmit={handleWithdraw} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Withdrawal Amount (₦)</label>
                    <input 
                      required
                      type="number"
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all"
                      placeholder="0.00"
                      max={stats.balance}
                      value={withdrawForm.amount}
                      onChange={e => setWithdrawForm({...withdrawForm, amount: e.target.value})}
                    />
                    <p className="mt-1 text-[10px] text-zinc-400">Available: ₦{stats.balance?.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Bank Name</label>
                    <input 
                      required
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all"
                      placeholder="e.g. Access Bank, Zenith"
                      value={withdrawForm.bank}
                      onChange={e => setWithdrawForm({...withdrawForm, bank: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Account Number</label>
                    <input 
                      required
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all"
                      placeholder="10 digits"
                      maxLength={10}
                      value={withdrawForm.account}
                      onChange={e => setWithdrawForm({...withdrawForm, account: e.target.value})}
                    />
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setShowWithdraw(false)}
                      className="flex-1 px-6 py-3 rounded-xl font-bold text-zinc-500 hover:bg-zinc-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      Confirm Payout
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SMEPortal = () => {
  const [clickId, setClickId] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error", message: string } | null>(null);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/conversions/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ click_id: clickId, amount: parseFloat(amount) })
    });
    if (res.ok) {
      setStatus({ type: "success", message: "Sale confirmed! Influencer payout updated." });
      setClickId("");
      setAmount("");
    } else {
      setStatus({ type: "error", message: "Invalid Reference ID or already confirmed." });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-lg mx-auto bg-white p-12 rounded-[40px] border border-zinc-100 shadow-xl">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-3xl font-bold text-zinc-900 mb-2">SME Sale Confirmation</h2>
          <p className="text-zinc-500">Enter the reference ID from the WhatsApp message to confirm a sale.</p>
        </div>

        {status && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl mb-8 text-sm font-medium ${
              status.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}
          >
            {status.message}
          </motion.div>
        )}

        <form onSubmit={handleConfirm} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Reference ID (from WhatsApp)</label>
            <input 
              required
              className="w-full px-6 py-4 rounded-2xl border border-zinc-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all text-lg font-mono"
              placeholder="e.g. x7y2z9"
              value={clickId}
              onChange={e => setClickId(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Sale Amount (₦)</label>
            <input 
              required
              type="number"
              className="w-full px-6 py-4 rounded-2xl border border-zinc-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all text-lg"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-zinc-900 text-white py-5 rounded-2xl font-bold text-lg hover:bg-zinc-800 transition-all shadow-lg"
          >
            Confirm Closure
          </button>
        </form>

        <div className="mt-12 pt-12 border-t border-zinc-100 text-center">
          <p className="text-xs text-zinc-400 leading-relaxed italic">
            "By confirming this sale, you authorize the performance-based payout to the attributed influencer via escrow."
          </p>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeView, setActiveView] = useState("landing");
  const [notifications, setNotifications] = useState<any[]>([]);

  // WebSocket setup
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "CONVERSION") {
        setNotifications(prev => [{
          id: Math.random().toString(36).substring(7),
          ...data,
          timestamp: new Date()
        }, ...prev]);
      }
    };

    return () => ws.close();
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Initial data seeding for demo
  useEffect(() => {
    const seedData = async () => {
      // Check if we already have data
      const res = await fetch("/api/influencers");
      const influencers = await res.json();
      if (influencers.length === 0) {
        // Seed influencers
        await fetch("/api/influencers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Tunde Ednut", handle: "tundeednut", platform: "Instagram" })
        });
        await fetch("/api/influencers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "KieKie", handle: "kie_kie__", platform: "TikTok" })
        });
        
        // Seed a brand and campaign
        const bRes = await fetch("/api/brands", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Zaron Cosmetics", email: "info@zaron.com" })
        });
        const brand = await bRes.json();
        
        await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brand_id: brand.id,
            title: "March Glow Up",
            description: "Promoting our new vitamin C serum. ₦1000 per confirmed sale.",
            budget: 100000,
            payout_per_lead: 1000,
            wa_number: "2348012345678"
          })
        });
      }
    };
    seedData();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 selection:bg-emerald-100 selection:text-emerald-900">
      <Navbar activeView={activeView} setActiveView={setActiveView} />
      
      {/* Toast Notifications */}
      <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-4 pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="pointer-events-auto bg-zinc-900 text-white p-6 rounded-3xl shadow-2xl border border-white/10 flex items-start gap-4 max-w-sm"
            >
              <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shrink-0">
                <Bell size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-sm">Sale Confirmed!</h4>
                  <button onClick={() => removeNotification(n.id)} className="text-white/40 hover:text-white">
                    <Plus size={16} className="rotate-45" />
                  </button>
                </div>
                <p className="text-xs text-white/70 leading-relaxed">
                  <span className="text-white font-medium">{n.influencer_name}</span> just earned from <span className="text-white font-medium">{n.campaign_title}</span>.
                </p>
                <div className="mt-2 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                  ₦{n.amount.toLocaleString()} Closure
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <main className="flex-1">
        <AnimatePresence mode="wait">
          {activeView === "landing" && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LandingPage onStart={setActiveView} />
            </motion.div>
          )}
          {activeView === "brand" && (
            <motion.div key="brand" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <BrandDashboard />
            </motion.div>
          )}
          {activeView === "influencer" && (
            <motion.div key="influencer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <InfluencerDashboard />
            </motion.div>
          )}
          {activeView === "sme" && (
            <motion.div key="sme" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SMEPortal />
            </motion.div>
          )}
          {activeView === "analytics" && (
            <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AnalyticsDashboard />
            </motion.div>
          )}
          {activeView === "admin" && (
            <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <AdminDashboard />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-zinc-200 bg-white py-12 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-start gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-zinc-900 rounded flex items-center justify-center text-white text-[10px] font-bold">N</div>
              <span className="text-sm font-bold tracking-tight text-zinc-900">NaijaTrack</span>
            </div>
            <button 
              onClick={() => setActiveView("admin")}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-emerald-600 transition-colors"
            >
              <ShieldCheck size={14} /> Admin Portal
            </button>
          </div>
          <p className="text-zinc-400 text-xs">© 2026 NaijaTrack. Built for the Nigerian SME ecosystem.</p>
          <div className="flex gap-6">
            <a href="#" className="text-zinc-400 hover:text-zinc-900 transition-colors"><Globe size={18} /></a>
            <a href="#" className="text-zinc-400 hover:text-zinc-900 transition-colors"><Smartphone size={18} /></a>
          </div>
        </div>
      </footer>
    </div>
  );
}
