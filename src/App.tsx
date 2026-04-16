/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from "react";
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
  ChevronDown,
  LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { auth, loginWithGoogle, logout, db, registerWithEmail, loginWithEmail } from "./lib/firebase";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot, collection, serverTimestamp, query, where, getDocs } from "firebase/firestore";

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-zinc-200 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShieldAlert size={32} />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 mb-4">Something went wrong</h2>
            <p className="text-zinc-500 mb-8">We encountered an error. Please try refreshing the page or contact support.</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-zinc-900 text-white py-4 rounded-xl font-bold hover:bg-zinc-800 transition-all"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'BRAND' | 'INFLUENCER';
}

interface Brand {
  id: string;
  companyName: string;
  subscriptionStatus: 'active' | 'inactive';
  balance: number;
}

const Auth = ({ intendedRole, onAuthSuccess }: { intendedRole: 'BRAND' | 'INFLUENCER' | null, onAuthSuccess: () => void }) => {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleGoogleLogin = async () => {
    console.log("Starting Google Login...");
    setLoading(true);
    setError("");
    try {
      const result = await loginWithGoogle();
      console.log("Login successful:", result.user.email);
      onAuthSuccess();
    } catch (err: any) {
      console.error("Login error details:", err);
      setError(`${err.code || "Error"}: ${err.message || "Authentication failed"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const trimmedEmail = email.trim();
    try {
      if (mode === 'signup') {
        const result = await registerWithEmail(trimmedEmail, password);
        if (result.user) {
          await updateProfile(result.user, { displayName: name });
        }
      } else {
        await loginWithEmail(trimmedEmail, password);
      }
      onAuthSuccess();
    } catch (err: any) {
      console.error("Email auth error:", err);
      const errorCode = err.code;
      if (errorCode === 'auth/operation-not-allowed') {
        setError("Email/Password sign-in is not enabled. Please go to Firebase Console > Authentication > Sign-in method and enable 'Email/Password'.");
      } else if (errorCode === 'auth/email-already-in-use') {
        setError("This email is already registered. Try signing in instead.");
      } else if (errorCode === 'auth/weak-password') {
        setError("Password is too weak. Please use at least 6 characters.");
      } else if (errorCode === 'auth/invalid-email') {
        setError("Please enter a valid email address.");
      } else if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
        // Check if user exists in Firestore but maybe not in Auth
        try {
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", trimmedEmail));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            setError("Invalid password. If you signed up with Google, please use the Google button. If you haven't set a password yet, you might need to Sign Up first.");
          } else {
            setError("Invalid email or password. This email doesn't seem to be registered. Please check for typos or Sign Up.");
          }
        } catch (fsErr) {
          console.error("Error checking Firestore for user:", fsErr);
          setError("Invalid email or password. If you signed up with Google, please use the Google button.");
        }
      } else {
        setError(`${errorCode || "Error"}: ${err.message || "Authentication failed."}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-10 border border-zinc-100">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-emerald-600 rounded-3xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6 shadow-lg shadow-emerald-200">N</div>
          <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">
            {mode === 'signup' 
              ? (intendedRole ? `Join as a ${intendedRole === 'BRAND' ? 'Brand' : 'Influencer'}` : 'Join NaijaTrack')
              : 'Welcome Back'}
          </h2>
          <p className="text-zinc-500 mt-3 text-sm">
            {mode === 'signup' 
              ? (intendedRole 
                  ? `Start tracking your ${intendedRole === 'BRAND' ? 'campaigns' : 'earnings'} today.` 
                  : 'Start your performance marketing journey today.')
              : 'Sign in to manage your account.'}
          </p>
        </div>

        <div className="space-y-6">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-zinc-200 text-zinc-700 py-4 rounded-2xl font-bold hover:bg-zinc-50 transition-all shadow-sm disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
            {loading ? "Connecting..." : "Continue with Google"}
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-zinc-100"></div>
            <span className="flex-shrink mx-4 text-zinc-400 text-[10px] font-bold uppercase tracking-widest">or use email</span>
            <div className="flex-grow border-t border-zinc-100"></div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                <input 
                  required
                  type="text"
                  placeholder="John Doe"
                  className="w-full px-5 py-4 rounded-2xl border border-zinc-100 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
              <input 
                required
                type="email"
                placeholder="name@company.com"
                className="w-full px-5 py-4 rounded-2xl border border-zinc-100 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-1">Password</label>
              <input 
                required
                type="password"
                placeholder="••••••••"
                className="w-full px-5 py-4 rounded-2xl border border-zinc-100 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200 disabled:opacity-50"
            >
              {loading ? "Processing..." : (mode === 'signup' ? "Create Account" : "Sign In")}
            </button>
          </form>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-medium border border-red-100">
              {error}
            </div>
          )}

          <div className="text-center">
            <button 
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              {mode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-zinc-100 text-center">
          <p className="text-[10px] text-zinc-400 leading-relaxed uppercase tracking-tight">
            Secure authentication powered by Firebase
          </p>
        </div>
      </div>
    </div>
  );
};

const Navbar = ({ activeView, setActiveView, user, onLogout }: { activeView: string, setActiveView: (v: string) => void, user: User | null, onLogout: () => void }) => (
  <nav className="border-b border-zinc-200 bg-white sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between h-16 items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveView("landing")}>
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">N</div>
          <span className="text-xl font-bold tracking-tight text-zinc-900">NaijaTrack</span>
        </div>
        <div className="hidden sm:flex gap-8">
          {[
            { id: "brand", label: "Brand Dashboard", icon: Megaphone, roles: ["ADMIN", "BRAND"] },
            { id: "influencer", label: "Influencer Portal", icon: Users, roles: ["ADMIN", "INFLUENCER"] },
            { id: "analytics", label: "Analytics", icon: TrendingUp, roles: ["ADMIN", "BRAND", "INFLUENCER"] },
            { id: "admin", label: "Admin", icon: ShieldCheck, roles: ["ADMIN"] },
          ].filter(item => !user || item.roles.includes(user.role)).map((item) => (
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
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <div className="text-sm font-bold text-zinc-900">{user.name}</div>
                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{user.role}</div>
              </div>
              <button
                onClick={onLogout}
                className="text-sm font-bold text-zinc-500 hover:text-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveView("auth")}
              className="bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
            >
              Get Started
            </button>
          )}
        </div>
      </div>
    </div>
  </nav>
);

const LandingPage = ({ onStart }: { onStart: (view: string, role?: 'BRAND' | 'INFLUENCER') => void }) => (
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
              onClick={() => onStart("auth", "BRAND")}
              className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-2"
            >
              I'm a Brand <ArrowRight size={20} />
            </button>
            <button 
              onClick={() => onStart("auth", "INFLUENCER")}
              className="bg-white text-zinc-900 border border-zinc-200 px-8 py-4 rounded-2xl font-bold hover:bg-zinc-50 transition-all flex items-center justify-center gap-2"
            >
              I'm an Influencer <ArrowUpRight size={20} />
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

const BrandDashboard = ({ authenticatedFetch }: { authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response> }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<CampaignStat[]>([]);
  const [allInfluencers, setAllInfluencers] = useState<Influencer[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
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
    try {
      const res = await authenticatedFetch("/api/brands");
      const data = await res.json();
      if (Array.isArray(data)) {
        setBrands(data);
        if (data.length > 0) {
          if (!selectedBrand) {
            setSelectedBrand(data[0]);
          } else {
            const updated = data.find((b: any) => b.id === selectedBrand.id);
            if (updated) setSelectedBrand(updated);
          }
        }
      } else {
        console.error("Fetch brands error: Expected array, got", data);
        setBrands([]);
      }
    } catch (err) {
      console.error("Fetch brands error:", err);
      setBrands([]);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await authenticatedFetch("/api/campaigns");
      const data = await res.json();
      if (Array.isArray(data)) {
        setCampaigns(data.filter((c: any) => c.brandId === selectedBrand?.id));
      } else {
        console.error("Fetch campaigns error: Expected array, got", data);
        setCampaigns([]);
      }
    } catch (err) {
      console.error("Fetch campaigns error:", err);
      setCampaigns([]);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedBrand) return;
    try {
      const res = await authenticatedFetch(`/api/brands/${selectedBrand.id}/subscribe`, { method: "POST" });
      if (res.ok) {
        await fetchBrands();
      } else {
        const error = await res.json();
        alert("Subscription failed: " + (error.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Subscription error:", err);
      alert("An error occurred while processing your subscription.");
    }
  };

  const fetchInfluencers = async () => {
    try {
      const res = await authenticatedFetch("/api/influencers");
      const data = await res.json();
      if (Array.isArray(data)) {
        setAllInfluencers(data);
      } else {
        console.error("Fetch influencers error: Expected array, got", data);
        setAllInfluencers([]);
      }
    } catch (err) {
      console.error("Fetch influencers error:", err);
      setAllInfluencers([]);
    }
  };

  const fetchStats = async (id: string) => {
    const res = await authenticatedFetch(`/api/campaigns/${id}/stats`);
    const data = await res.json();
    setStats(data);
  };

  const handleAssign = async (influencerId: string) => {
    if (!selectedCampaign) return;
    const res = await authenticatedFetch("/api/links", {
      method: "POST",
      body: JSON.stringify({ campaignId: selectedCampaign.id, influencerId })
    });
    if (res.ok) {
      fetchStats(selectedCampaign.id);
      setShowAssign(false);
    }
  };

  const handleConfirmSale = async (shortCode: string) => {
    if (!selectedCampaign) return;
    const res = await authenticatedFetch(`/api/links/${shortCode}/convert`, {
      method: "POST"
    });
    if (res.ok) {
      fetchStats(selectedCampaign.id);
      fetchBrands(); // Update balance
      alert("Sale confirmed! Payout task created for admin approval.");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrand?.id) {
      alert("Please select a brand first");
      return;
    }
    const res = await authenticatedFetch("/api/campaigns", {
      method: "POST",
      body: JSON.stringify({ ...newCampaign, brand_id: selectedBrand.id })
    });
    if (res.ok) {
      setShowCreate(false);
      fetchCampaigns();
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrand) return;
    const res = await authenticatedFetch(`/api/brands/${selectedBrand.id}/deposit`, {
      method: "POST",
      body: JSON.stringify({ amount: parseFloat(depositAmount) })
    });
    if (res.ok) {
      setShowDeposit(false);
      setDepositAmount("");
      fetchBrands();
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
              {brands.map(b => <option key={b.id} value={b.id}>{b.companyName}</option>)}
            </select>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
              selectedBrand?.subscriptionStatus === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
              {selectedBrand?.subscriptionStatus || 'inactive'}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="bg-white px-6 py-3 rounded-2xl border border-zinc-100 shadow-sm flex items-center gap-4">
            <div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Campaign Funds</div>
              <div className="text-xl font-bold text-zinc-900">₦{selectedBrand?.balance?.toLocaleString() || "0"}</div>
            </div>
            <button 
              onClick={() => setShowDeposit(true)}
              className="bg-emerald-50 text-emerald-600 p-2 rounded-xl hover:bg-emerald-100 transition-colors"
              title="Deposit Funds"
            >
              <Plus size={20} />
            </button>
          </div>

          {selectedBrand?.subscriptionStatus === 'inactive' ? (
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
      </div>

      {selectedBrand && selectedBrand.balance < 5000 && selectedBrand.subscriptionStatus === 'active' && (
        <div className="bg-red-50 border border-red-100 rounded-3xl p-6 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h4 className="font-bold text-red-900">Low Campaign Funds</h4>
              <p className="text-sm text-red-700">Your balance is low. Influencers will not be paid for new sales if funds are insufficient.</p>
            </div>
          </div>
          <button 
            onClick={() => setShowDeposit(true)}
            className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-700 transition-all"
          >
            Deposit Now
          </button>
        </div>
      )}

      {selectedBrand?.subscriptionStatus === 'inactive' && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 mb-12 text-center">
          <h3 className="text-xl font-bold text-amber-900 mb-2">Subscription Required</h3>
          <p className="text-amber-700 max-w-lg mx-auto">Your account is currently inactive. Please pay the monthly platform fee to manage campaigns and view detailed analytics.</p>
        </div>
      )}

      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-8 ${selectedBrand?.subscriptionStatus === 'inactive' ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
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
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {stats.map((s, i) => (
                      <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-zinc-900">{s.influencer_name}</td>
                        <td className="px-6 py-4 font-mono text-xs text-zinc-500">{s.short_code}</td>
                        <td className="px-6 py-4 text-right text-zinc-900">{s.click_count}</td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-600">{s.conversion_count}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleConfirmSale(s.short_code)}
                            className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                          >
                            Confirm Sale
                          </button>
                        </td>
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

      {/* Deposit Modal */}
      <AnimatePresence>
        {showDeposit && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeposit(false)}
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
                    <ArrowDownCircle size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-zinc-900">Deposit Funds</h3>
                    <p className="text-xs text-zinc-500">Add funds to your campaign wallet</p>
                  </div>
                </div>
                
                <form onSubmit={handleDeposit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Amount to Deposit (₦)</label>
                    <input 
                      required
                      type="number"
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all"
                      placeholder="e.g. 50000"
                      min="1000"
                      value={depositAmount}
                      onChange={e => setDepositAmount(e.target.value)}
                    />
                  </div>
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <p className="text-[10px] text-zinc-400 uppercase font-bold mb-1">Payment Method</p>
                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                      <CreditCard size={16} />
                      Saved Card (**** 4242)
                    </div>
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setShowDeposit(false)}
                      className="flex-1 px-6 py-3 rounded-xl font-bold text-zinc-500 hover:bg-zinc-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      Confirm Deposit
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

const InfluencerDashboard = ({ authenticatedFetch }: { authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response> }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [walletData, setWalletData] = useState<any>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
    fetchWallet();
    fetchLinks();
  }, []);

  const fetchData = async () => {
    try {
      const res = await authenticatedFetch("/api/campaigns");
      const data = await res.json();
      if (Array.isArray(data)) {
        setCampaigns(data);
      } else {
        console.error("Fetch campaigns error: Expected array, got", data);
        setCampaigns([]);
      }
    } catch (err) {
      console.error("Fetch campaigns error:", err);
      setCampaigns([]);
    }
  };

  const fetchWallet = async () => {
    try {
      const res = await authenticatedFetch("/api/influencers/wallet");
      const data = await res.json();
      if (res.ok) {
        setWalletData(data);
      } else {
        console.error("Fetch wallet error:", data);
      }
    } catch (err) {
      console.error("Fetch wallet error:", err);
    }
  };

  const fetchLinks = async () => {
    try {
      const res = await authenticatedFetch("/api/influencers/links");
      const data = await res.json();
      if (Array.isArray(data)) {
        setLinks(data);
      } else {
        console.error("Fetch links error:", data);
        setLinks([]);
      }
    } catch (err) {
      console.error("Fetch links error:", err);
      setLinks([]);
    }
  };

  const handleGetLink = async (campaignId: string) => {
    setLoading(true);
    try {
      const res = await authenticatedFetch("/api/links", {
        method: "POST",
        body: JSON.stringify({ campaignId })
      });
      if (res.ok) {
        await fetchLinks();
      }
    } catch (err) {
      console.error("Error generating link:", err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    const fullUrl = `${window.location.origin}/l/${text}`;
    navigator.clipboard.writeText(fullUrl);
    alert("Tracking link copied to clipboard!");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Influencer Portal</h2>
          <p className="text-zinc-500">Pick a campaign and start earning</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white px-6 py-3 rounded-2xl border border-zinc-100 shadow-sm">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Earnings</div>
            <div className="text-xl font-bold text-emerald-600">₦{walletData?.influencer?.walletBalance?.toLocaleString() || "0"}</div>
          </div>
        </div>
      </div>

      {walletData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <TrendingUp size={20} className="text-emerald-600" />
                <h3 className="font-bold text-zinc-900">Your Performance</h3>
              </div>
              <div className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Active Links: {links.length}</div>
            </div>
            
            {links.length > 0 ? (
              <div className="overflow-hidden rounded-3xl border border-zinc-50">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50 border-b border-zinc-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase">Campaign</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase text-right">Clicks</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase text-right">Sales</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase text-right">Revenue</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {links.map((link) => (
                      <tr key={link.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-zinc-900 text-sm">{link.campaign?.title || "Unknown"}</div>
                          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-tighter">Code: {link.shortCode}</div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">{link.clickCount}</td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-emerald-600">{link.conversionCount}</td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-zinc-900">
                          ₦{(link.conversionCount * (link.campaign?.payout_per_lead || 0)).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => copyToClipboard(link.shortCode)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Copy Tracking Link"
                          >
                            <LinkIcon size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 bg-zinc-50 rounded-3xl border border-dashed border-zinc-200">
                <LinkIcon size={32} className="mx-auto mb-3 text-zinc-300" />
                <p className="text-zinc-500 text-sm">You haven't generated any tracking links yet.</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-1 bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <History size={20} className="text-zinc-400" />
              <h3 className="font-bold text-zinc-900">Recent Payouts</h3>
            </div>
            <div className="space-y-4">
              {walletData.transactions?.length > 0 ? walletData.transactions.map((t: any) => (
                <div key={t.id} className="flex justify-between items-center p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                  <div>
                    <div className="font-bold text-zinc-900 text-sm">{t.type}</div>
                    <div className="text-[10px] text-zinc-400 uppercase tracking-tighter">{new Date(t.createdAt).toLocaleString()}</div>
                  </div>
                  <div className={`text-right font-bold text-sm ${t.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {t.type === 'CREDIT' ? '+' : '-'}₦{t.amount.toLocaleString()}
                  </div>
                </div>
              )) : <div className="text-center text-zinc-400 py-8 text-sm italic">No transactions yet</div>}
            </div>
          </div>
        </div>
      ) : <div className="p-12 text-center text-zinc-400">Loading wallet...</div>}

      <div className="mb-8 flex justify-between items-end">
        <div>
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-1">Available Campaigns</h3>
          <p className="text-xs text-zinc-500">Earn money by promoting these brands</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((c) => {
          const hasLink = links.some(l => l.campaignId === c.id);
          return (
            <div key={c.id} className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-xl font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors">{c.title}</h4>
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <Megaphone size={20} />
                </div>
              </div>
              <p className="text-zinc-500 text-sm mb-8 line-clamp-2 leading-relaxed">{c.description}</p>
              <div className="flex justify-between items-center pt-6 border-t border-zinc-50">
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Payout</div>
                  <div className="text-lg font-bold text-emerald-600">₦{c.payout_per_lead}/lead</div>
                </div>
                {hasLink ? (
                  <button 
                    onClick={() => copyToClipboard(links.find(l => l.campaignId === c.id).shortCode)}
                    className="bg-emerald-600 text-white px-6 py-3 rounded-2xl text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-100"
                  >
                    <LinkIcon size={14} /> Copy Link
                  </button>
                ) : (
                  <button 
                    onClick={() => handleGetLink(c.id)}
                    disabled={loading}
                    className="bg-zinc-900 text-white px-6 py-3 rounded-2xl text-xs font-bold hover:bg-zinc-800 transition-all disabled:opacity-50"
                  >
                    {loading ? "Generating..." : "Join Campaign"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {campaigns.length === 0 && (
        <div className="text-center py-24 bg-white rounded-[40px] border border-dashed border-zinc-200">
          <Megaphone size={48} className="mx-auto mb-4 text-zinc-200" />
          <h3 className="text-xl font-bold text-zinc-900 mb-2">No Active Campaigns</h3>
          <p className="text-zinc-500 max-w-sm mx-auto">There are currently no open campaigns. Check back later or contact support.</p>
        </div>
      )}
    </div>
  );
};

const AnalyticsDashboard = ({ authenticatedFetch }: { authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response> }) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    authenticatedFetch("/api/admin/stats")
      .then(res => res.json())
      .then(setData);
  }, []);

  if (!data) return <div className="p-12 text-center text-zinc-400">Loading analytics...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Platform Analytics</h2>
        <p className="text-zinc-500">Real-time performance across the platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
          <div className="text-zinc-400 text-xs font-bold uppercase mb-2">Total Earnings</div>
          <div className="text-3xl font-bold text-emerald-600">₦{data.totalEarnings?.toLocaleString() || "0"}</div>
        </div>
        <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
          <div className="text-zinc-400 text-xs font-bold uppercase mb-2">Subscription Revenue</div>
          <div className="text-3xl font-bold text-zinc-900">₦{data.subscriptionRevenue?.toLocaleString() || "0"}</div>
        </div>
        <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
          <div className="text-zinc-400 text-xs font-bold uppercase mb-2">Commission Revenue</div>
          <div className="text-3xl font-bold text-zinc-900">₦{data.commissionRevenue?.toLocaleString() || "0"}</div>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = ({ authenticatedFetch }: { authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response> }) => {
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: "", bankName: "", accountNumber: "" });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await authenticatedFetch("/api/admin/stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch admin stats:", err);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authenticatedFetch("/api/admin/withdraw", {
        method: "POST",
        body: JSON.stringify(withdrawForm)
      });
      if (res.ok) {
        setShowWithdraw(false);
        setWithdrawForm({ amount: "", bankName: "", accountNumber: "" });
        fetchStats();
      } else {
        const error = await res.json();
        alert("Withdrawal failed: " + (error.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Withdrawal error:", err);
    }
  };

  if (!stats) return <div className="p-12 text-center text-zinc-400">Loading admin dashboard...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Admin Control Panel</h2>
          <p className="text-zinc-500">Manage platform operations and revenue</p>
        </div>
        <div className="flex bg-zinc-100 p-1 rounded-2xl">
          {["overview", "wallet", "users"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all capitalize ${
                activeTab === tab ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-zinc-900 text-white p-8 rounded-[40px] shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                <Banknote size={80} />
              </div>
              <div className="relative z-10">
                <div className="text-white/40 text-xs font-bold uppercase mb-2 tracking-widest">Platform Balance</div>
                <div className="text-4xl font-bold text-emerald-400 mb-4">₦{stats.balance?.toLocaleString() || "0"}</div>
                <button 
                  onClick={() => setShowWithdraw(true)}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
                >
                  <ArrowUpRight size={14} /> Withdraw Funds
                </button>
              </div>
            </div>
            <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
              <div className="text-zinc-400 text-xs font-bold uppercase mb-2 tracking-widest">Total Users</div>
              <div className="text-3xl font-bold text-zinc-900 mb-1">{stats.totalUsers || 0}</div>
              <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter flex items-center gap-1">
                <TrendingUp size={10} /> +12% this month
              </div>
            </div>
            <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
              <div className="text-zinc-400 text-xs font-bold uppercase mb-2 tracking-widest">Active Campaigns</div>
              <div className="text-3xl font-bold text-zinc-900 mb-1">{stats.totalCampaigns || 0}</div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Across 42 Brands</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
              <h3 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
                <TrendingUp size={20} className="text-emerald-600" /> Revenue Streams
              </h3>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-zinc-900">Subscriptions</div>
                      <div className="text-xs text-zinc-500">Monthly Brand Fees</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-zinc-900">₦{stats.subscriptionRevenue?.toLocaleString() || "0"}</div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">70% of total</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                      <Percent size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-zinc-900">Commissions</div>
                      <div className="text-xs text-zinc-500">7% Payout Fee</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-zinc-900">₦{stats.commissionRevenue?.toLocaleString() || "0"}</div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">30% of total</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm">
              <h3 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
                <History size={20} className="text-zinc-400" /> Recent Activity
              </h3>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-zinc-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-[10px] font-bold">JD</div>
                      <div>
                        <div className="text-sm font-bold text-zinc-900">New Brand Signup</div>
                        <div className="text-[10px] text-zinc-400 uppercase">2 hours ago</div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-300" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "wallet" && (
        <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm text-center py-24">
          <Banknote size={48} className="mx-auto mb-4 text-zinc-200" />
          <h3 className="text-xl font-bold text-zinc-900 mb-2">Wallet Management</h3>
          <p className="text-zinc-500 max-w-sm mx-auto">Detailed transaction history and withdrawal management will be available here.</p>
        </div>
      )}

      {activeTab === "users" && (
        <div className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm text-center py-24">
          <Users size={48} className="mx-auto mb-4 text-zinc-200" />
          <h3 className="text-xl font-bold text-zinc-900 mb-2">User Management</h3>
          <p className="text-zinc-500 max-w-sm mx-auto">Manage brands, influencers, and system administrators.</p>
        </div>
      )}

      {/* Withdrawal Modal */}
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
              className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <Banknote size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-zinc-900">Withdraw Funds</h3>
                    <p className="text-xs text-zinc-500">Transfer earnings to your bank account</p>
                  </div>
                </div>

                <form onSubmit={handleWithdraw} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Amount (₦)</label>
                    <input 
                      required
                      type="number"
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-emerald-600 outline-none"
                      placeholder="0.00"
                      value={withdrawForm.amount}
                      onChange={e => setWithdrawForm({...withdrawForm, amount: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Bank Name</label>
                    <input 
                      required
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-emerald-600 outline-none"
                      placeholder="e.g. Zenith Bank"
                      value={withdrawForm.bankName}
                      onChange={e => setWithdrawForm({...withdrawForm, bankName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Account Number</label>
                    <input 
                      required
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-emerald-600 outline-none"
                      placeholder="10-digit number"
                      maxLength={10}
                      value={withdrawForm.accountNumber}
                      onChange={e => setWithdrawForm({...withdrawForm, accountNumber: e.target.value})}
                    />
                  </div>
                  <div className="pt-6 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setShowWithdraw(false)}
                      className="flex-1 px-6 py-3 rounded-xl font-bold text-zinc-500 hover:bg-zinc-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-zinc-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-lg"
                    >
                      Confirm
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
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [intendedRole, setIntendedRole] = useState<'BRAND' | 'INFLUENCER' | null>(null);

  // Redirect logged-in users to their correct dashboard
  useEffect(() => {
    if (isAuthReady && user && (activeView === "auth" || activeView === "landing")) {
      if (user.role === "ADMIN") setActiveView("admin");
      else if (user.role === "BRAND") setActiveView("brand");
      else setActiveView("influencer");
    }
  }, [isAuthReady, user, activeView]);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<CampaignStat[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [newCampaign, setNewCampaign] = useState({
    title: "",
    description: "",
    budget: 100000,
    payout_per_lead: 1000,
    wa_number: ""
  });

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const idToken = await firebaseUser.getIdToken();
          setToken(idToken);
          
          // Fetch or create user profile in Firestore
          const userRef = doc(db, "users", firebaseUser.uid);
          let userSnap;
          try {
            userSnap = await getDoc(userRef);
          } catch (err) {
            console.error("Error fetching user profile:", err);
            setUser({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || "User",
              email: firebaseUser.email || "",
              role: intendedRole || "INFLUENCER" // Use intended role if available
            });
            setIsAuthReady(true);
            return;
          }
          
          if (userSnap.exists()) {
            const userData = userSnap.data() as User;
            setUser(userData);
            
            // Ensure associated profile exists
            try {
              if (userData.role === "BRAND") {
                const brandRef = doc(db, "brands", firebaseUser.uid);
                const brandSnap = await getDoc(brandRef);
                if (!brandSnap.exists()) {
                  await setDoc(brandRef, {
                    userId: firebaseUser.uid,
                    companyName: firebaseUser.displayName || "New Brand",
                    subscriptionStatus: "inactive",
                    balance: 0,
                    createdAt: serverTimestamp()
                  });
                }
              } else if (userData.role === "INFLUENCER") {
                const influencerRef = doc(db, "influencers", firebaseUser.uid);
                const influencerSnap = await getDoc(influencerRef);
                if (!influencerSnap.exists()) {
                  await setDoc(influencerRef, {
                    userId: firebaseUser.uid,
                    followers: 0,
                    walletBalance: 0,
                    createdAt: serverTimestamp()
                  });
                }
              }
            } catch (profileErr) {
              console.error("Error ensuring associated profile:", profileErr);
            }
          } else {
            // New user - use intendedRole or default to INFLUENCER
            const newUser: User = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || "New User",
              email: firebaseUser.email || "",
              role: intendedRole || "INFLUENCER"
            };
            
            try {
              await setDoc(userRef, {
                ...newUser,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
              
              if (newUser.role === "BRAND") {
                await setDoc(doc(db, "brands", firebaseUser.uid), {
                  userId: firebaseUser.uid,
                  companyName: firebaseUser.displayName || "New Brand",
                  subscriptionStatus: "inactive",
                  balance: 0,
                  createdAt: serverTimestamp()
                });
              } else {
                await setDoc(doc(db, "influencers", firebaseUser.uid), {
                  userId: firebaseUser.uid,
                  followers: 0,
                  walletBalance: 0,
                  createdAt: serverTimestamp()
                });
              }
            } catch (createErr) {
              console.error("Error creating new user profile:", createErr);
            }
            
            setUser(newUser);
          }
        } else {
          setUser(null);
          setToken(null);
        }
      } catch (globalAuthErr) {
        console.error("Global auth state error:", globalAuthErr);
      } finally {
        setIsAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, [intendedRole]);

  const handleLogout = async () => {
    await logout();
    setActiveView("landing");
    setIntendedRole(null);
  };

  const handleStart = (view: string, role?: 'BRAND' | 'INFLUENCER') => {
    if (role) setIntendedRole(role);
    setActiveView(view);
  };

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const currentToken = await auth.currentUser?.getIdToken();
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${currentToken}`,
        "Content-Type": "application/json",
      },
    });
  };

  const fetchBrands = async () => {
    const res = await authenticatedFetch("/api/brands");
    const data = await res.json();
    if (res.ok) {
      setBrands(data);
      if (data.length > 0 && !selectedBrand) {
        setSelectedBrand(data[0]);
      }
    }
  };

  const fetchCampaigns = async () => {
    const res = await authenticatedFetch("/api/campaigns");
    const data = await res.json();
    if (res.ok) {
      setCampaigns(data);
    }
  };

  const handleSubscribe = async () => {
    const res = await authenticatedFetch("/api/brands/subscribe", { method: "POST" });
    if (res.ok) {
      fetchBrands();
    }
  };

  const fetchStats = async (id: string) => {
    const res = await authenticatedFetch(`/api/campaigns/${id}/stats`);
    const data = await res.json();
    if (res.ok) {
      setStats(data);
    }
  };

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

  useEffect(() => {
    if (token) {
      fetchBrands();
      fetchCampaigns();
    }
  }, [token]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Initial data seeding for demo
  useEffect(() => {
    // Removed demo seeding as we have a real backend
  }, []);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 selection:bg-emerald-100 selection:text-emerald-900">
      <Navbar activeView={activeView} setActiveView={setActiveView} user={user} onLogout={handleLogout} />
      
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
        {!isAuthReady ? (
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeView === "landing" && (
              <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <LandingPage onStart={handleStart} />
              </motion.div>
            )}
            {activeView === "auth" && !user && (
              <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Auth intendedRole={intendedRole} onAuthSuccess={() => {}} />
              </motion.div>
            )}
            {activeView === "brand" && user && (user.role === "BRAND" || user.role === "ADMIN") && (
              <motion.div key="brand" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <BrandDashboard authenticatedFetch={authenticatedFetch} />
              </motion.div>
            )}
            {activeView === "influencer" && user && (user.role === "INFLUENCER" || user.role === "ADMIN") && (
              <motion.div key="influencer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <InfluencerDashboard authenticatedFetch={authenticatedFetch} />
              </motion.div>
            )}
            {activeView === "analytics" && user && (
              <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AnalyticsDashboard authenticatedFetch={authenticatedFetch} />
              </motion.div>
            )}
            {activeView === "admin" && user && user.role === "ADMIN" && (
              <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <AdminDashboard authenticatedFetch={authenticatedFetch} />
              </motion.div>
            )}
            {/* Fallback for unauthorized or unauthenticated */}
            {activeView !== "landing" && activeView !== "auth" && !user && (
              <motion.div key="unauth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Auth intendedRole={intendedRole} onAuthSuccess={() => {}} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
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
    </ErrorBoundary>
  );
}
