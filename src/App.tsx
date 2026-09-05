import React, { useState, useEffect, useRef } from 'react';
import { 
  Megaphone, 
  Users, 
  TrendingUp, 
  ShieldCheck, 
  ArrowRight, 
  ArrowUpRight, 
  Plus, 
  Link as LinkIcon, 
  Copy, 
  CheckCircle2, 
  Globe, 
  Smartphone, 
  MessageSquare, 
  Bell, 
  Wallet,
  LogOut,
  ChevronRight,
  History,
  Banknote,
  ArrowDownCircle,
  CreditCard,
  Target,
  BarChart3,
  Layers,
  ShieldAlert,
  Zap,
  Share2,
  ExternalLink,
  Building2,
  Sparkles,
  Check,
  X,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  onAuthStateChanged, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCustomToken,
  updateProfile
} from 'firebase/auth';
import { 
  getDoc, 
  doc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc 
} from 'firebase/firestore';
import { usePaystackPayment } from 'react-paystack';
import { auth, db } from './lib/firebase';

// --- Types ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'BRAND' | 'INFLUENCER';
}

interface Campaign {
  id: string;
  brandId: string;
  title: string;
  description: string;
  budget: number;
  payout_per_lead: number;
  wa_number: string;
  category?: string;
  created_at: string;
}

interface Brand {
  id: string;
  userId: string;
  companyName: string;
  balance: number;
  subscriptionStatus: 'active' | 'inactive';
}

interface Influencer {
  id: string;
  userId: string;
  name: string;
  walletBalance: number;
}

interface CampaignStat {
  influencer_name: string;
  short_code: string;
  click_count: number;
  conversion_count: number;
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

// --- Error Handling ---

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return <div className="p-8 text-center bg-zinc-50 min-h-screen flex flex-col items-center justify-center">
      <h2 className="text-2xl font-bold mb-4">Something went wrong.</h2>
      <button onClick={() => window.location.reload()} className="bg-emerald-600 text-white px-6 py-2 rounded-xl">Reload Application</button>
    </div>;
    return this.props.children;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const isPermissionError = error instanceof Error && 
    (errorMessage.includes('permission-denied') || errorMessage.includes('Missing or insufficient permissions'));
  
  const isOfflineError = errorMessage.includes('the client is offline') || 
                        errorMessage.includes('Failed to get document because the client is offline');

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  
  if (isPermissionError || isOfflineError) {
    if (isOfflineError) {
      // Very silent for offline to avoid scaring the user during jitter
    } else {
      console.warn(`Firestore Permission Denied (Handled): ${operationType} at ${path}`);
    }
    return null;
  }
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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
            { id: "analytics", label: "Analytics", icon: TrendingUp, roles: ["ADMIN", "BRAND", "INFLUENCER", "PUBLIC"] },
            { id: "admin", label: "Admin", icon: ShieldCheck, roles: ["ADMIN"] },
          ].filter(item => {
            if (item.id === "analytics") return true; 
            return user && item.roles.includes(user.role);
          }).map((item) => (
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
                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                  {user.role === 'BRAND' ? 'Brand' : user.role === 'INFLUENCER' ? 'Influencer' : 'Admin'}
                </div>
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
              className="bg-zinc-900 text-white px-6 py-2 rounded-xl text-sm font-bold"
            >
              Sign In
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
      <div id="hero" className="text-center max-w-3xl mx-auto">
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

const friendlyErrorMessage = (msg: string): string => {
  if (!msg) return "Authentication error. Please try again.";
  if (msg.includes("auth/email-already-in-use")) return "This email is already registered. Switched to Sign In mode.";
  if (msg.includes("auth/weak-password")) return "Password should be at least 6 characters.";
  if (msg.includes("auth/invalid-email")) return "Please enter a valid email address.";
  if (msg.includes("auth/invalid-credential") || msg.includes("auth/wrong-password") || msg.includes("auth/user-not-found")) {
    return "Incorrect email or password. You can also use 1-click Instant Access below.";
  }
  if (msg.includes("auth/popup-closed-by-user") || msg.includes("auth/popup-blocked")) {
    return "Google login popup was closed or blocked. Try email login or 1-click Instant Access below.";
  }
  if (msg.includes("auth/operation-not-allowed")) {
    return "Email/password provider disabled in Firebase. Please use Instant Access below.";
  }
  try {
    const parsed = JSON.parse(msg);
    if (parsed.error) return parsed.error;
  } catch {}
  return msg;
};

const Auth = ({ 
  intendedRole, 
  onAuthSuccess 
}: { 
  intendedRole: 'BRAND' | 'INFLUENCER' | null; 
  onAuthSuccess: (user: User, token?: string) => void; 
}) => {
  const [currentRole, setCurrentRole] = useState<'BRAND' | 'INFLUENCER'>(intendedRole || 'BRAND');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Sync role if prop updates
  useEffect(() => {
    if (intendedRole) setCurrentRole(intendedRole);
  }, [intendedRole]);

  const handleInstantDemo = async () => {
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: currentRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Demo sign-in failed");
      if (data.user) {
        onAuthSuccess(data.user, data.token);
      }
    } catch (err: any) {
      setError(friendlyErrorMessage(err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        let clientUid = "";
        try {
          const userCred = await createUserWithEmailAndPassword(auth, email, password);
          clientUid = userCred.user.uid;
          if (name) {
            await updateProfile(userCred.user, { displayName: name });
          }
        } catch (clientErr: any) {
          console.warn("Client createUser warning (attempting backend):", clientErr.message);
        }

        // Call backend registration
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name, role: currentRole })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Registration failed");

        if (data.customToken) {
          try {
            await signInWithCustomToken(auth, data.customToken);
          } catch (tokErr) {
            console.warn("Custom token signIn notice:", tokErr);
          }
        } else {
          try {
            await signInWithEmailAndPassword(auth, email, password);
          } catch (loginErr) {
            console.warn("Direct password login notice:", loginErr);
          }
        }

        if (data.user) {
          const sessionToken = data.customToken || `demo-${currentRole.toLowerCase()}-${data.user.id}`;
          onAuthSuccess(data.user, sessionToken);
        }
      } else {
        // Mode === 'login'
        let fbLoggedIn = false;
        let fbToken = "";
        try {
          const cred = await signInWithEmailAndPassword(auth, email, password);
          if (cred.user) {
            fbLoggedIn = true;
            fbToken = await cred.user.getIdToken();
          }
        } catch (firebaseErr: any) {
          console.warn("Client signIn warning (trying backend):", firebaseErr.message);
        }

        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role: currentRole })
        });
        const data = await res.json();
        if (!res.ok && !fbLoggedIn) throw new Error(data.error || "Login failed");

        if (data.customToken && !fbLoggedIn) {
          try {
            await signInWithCustomToken(auth, data.customToken);
          } catch (tokErr) {
            console.warn("Custom token notice:", tokErr);
          }
        }

        if (data.user) {
          const sessionToken = fbToken || data.customToken || `demo-${currentRole.toLowerCase()}-${data.user.id}`;
          onAuthSuccess(data.user, sessionToken);
        }
      }
    } catch (err: any) {
      if (err.message?.includes("auth/email-already-in-use")) {
        setMode('login');
      }
      setError(friendlyErrorMessage(err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      // Sync role & user document with server
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          role: currentRole,
          name: result.user.displayName || (currentRole === 'BRAND' ? 'Brand Partner' : 'Influencer Partner'),
          email: result.user.email,
          uid: result.user.uid
        })
      });
      const data = await res.json();
      if (data.user) {
        onAuthSuccess(data.user, idToken);
      } else {
        onAuthSuccess({
          id: result.user.uid,
          name: result.user.displayName || "User",
          email: result.user.email || "",
          role: currentRole
        }, idToken);
      }
    } catch (err: any) {
      setError(friendlyErrorMessage(err.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-16 bg-white p-8 sm:p-12 rounded-[36px] border border-zinc-200/80 shadow-2xl">
      {/* Role Toggle Tabs */}
      <div className="flex bg-zinc-100 p-1.5 rounded-2xl mb-8">
        <button
          type="button"
          onClick={() => { setCurrentRole('BRAND'); setError(''); }}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            currentRole === 'BRAND'
              ? 'bg-white text-zinc-900 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <Megaphone size={18} className={currentRole === 'BRAND' ? 'text-emerald-600' : ''} />
          I'm a Brand
        </button>
        <button
          type="button"
          onClick={() => { setCurrentRole('INFLUENCER'); setError(''); }}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            currentRole === 'INFLUENCER'
              ? 'bg-white text-zinc-900 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <Users size={18} className={currentRole === 'INFLUENCER' ? 'text-emerald-600' : ''} />
          I'm an Influencer
        </button>
      </div>

      {/* Role Header */}
      <div className="mb-6">
        <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2 ${
          currentRole === 'BRAND' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
        }`}>
          {currentRole === 'BRAND' ? '🏷️ Brand Partner Account' : '📱 Influencer Creator Portal'}
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900">
          {mode === 'login' 
            ? (currentRole === 'BRAND' ? 'Brand Sign In' : 'Influencer Sign In') 
            : (currentRole === 'BRAND' ? 'Create Brand Account' : 'Create Influencer Account')}
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          {currentRole === 'BRAND'
            ? 'Access your brand dashboard to launch campaigns and track WhatsApp sales.'
            : 'Access your influencer portal to grab trackable links and earn commissions.'}
        </p>
      </div>

      {/* 1-Click Instant Demo Button */}
      <div className="mb-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-4 text-center">
        <div className="text-xs font-semibold text-emerald-800 mb-2">Want to test right now with zero friction?</div>
        <button
          type="button"
          onClick={handleInstantDemo}
          disabled={isLoading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-xl font-bold text-sm shadow-md shadow-emerald-200/50 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <Zap size={18} className="fill-white" />
          ⚡ Instant Access as {currentRole === 'BRAND' ? 'Brand' : 'Influencer'}
        </button>
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-200"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-4 text-zinc-400 font-bold tracking-widest">Or with email / Google</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm mb-6 border border-red-100 leading-snug">
          {error}
        </div>
      )}

      <form onSubmit={handleAuth} className="space-y-4">
        {mode === 'signup' && (
          <div>
            <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider mb-1">
              {currentRole === 'BRAND' ? 'Company / Brand Name' : 'Creator / Full Name'}
            </label>
            <input 
              required
              className="w-full px-4 py-3.5 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium" 
              placeholder={currentRole === 'BRAND' ? 'e.g. Konga Lifestyle' : 'e.g. Tunde TikTok'} 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider mb-1">Email Address</label>
          <input 
            type="email"
            required
            className="w-full px-4 py-3.5 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium" 
            placeholder="you@domain.com" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider mb-1">Password</label>
          <input 
            type="password" 
            required
            className="w-full px-4 py-3.5 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium" 
            placeholder="Minimum 6 characters" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
          />
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-zinc-900 text-white py-4 rounded-xl font-bold hover:bg-zinc-800 transition-all text-sm shadow-md disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : (
            mode === 'login' 
              ? `Sign In as ${currentRole === 'BRAND' ? 'Brand' : 'Influencer'}` 
              : `Create ${currentRole === 'BRAND' ? 'Brand' : 'Influencer'} Account`
          )}
        </button>
      </form>

      <button 
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className="w-full mt-4 bg-white border border-zinc-200 text-zinc-800 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-3 hover:bg-zinc-50 transition-all disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <button 
        type="button"
        onClick={() => {
          setMode(mode === 'login' ? 'signup' : 'login');
          setError('');
        }} 
        className="mt-6 w-full text-center text-emerald-600 text-sm font-bold hover:text-emerald-700 transition-colors"
      >
        {mode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Log in"}
      </button>
    </div>
  );
};

const BrandDashboard = ({ authenticatedFetch, user }: { authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>, user: User }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<CampaignStat[]>([]);
  const [allInfluencers, setAllInfluencers] = useState<Influencer[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [newCampaign, setNewCampaign] = useState({
    title: "",
    description: "",
    budget: 50000,
    payout_per_lead: 1000,
    wa_number: "234"
  });
  const [confirmCode, setConfirmCode] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  // Paystack Config
  const paystackConfig = {
    reference: `SUB-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    email: user.email,
    amount: 10000 * 100, // ₦10,000 in kobo
    publicKey: (import.meta as any).env.VITE_PAYSTACK_PUBLIC_KEY || '',
  };

  const initializePayment = usePaystackPayment(paystackConfig);

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
        if (data.length > 0) {
          setBrands(data);
          if (!selectedBrand) {
            setSelectedBrand(data[0]);
          } else {
            const updated = data.find((b: any) => b.id === selectedBrand.id);
            if (updated) setSelectedBrand(updated);
          }
        } else {
          const fallbackBrand: Brand = {
            id: "brand-" + user.id,
            userId: user.id,
            companyName: user.name || "Brand Store",
            balance: 50000,
            subscriptionStatus: "active"
          };
          setBrands([fallbackBrand]);
          setSelectedBrand(fallbackBrand);
        }
      }
    } catch (err) {
      console.error("Fetch brands error:", err);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await authenticatedFetch("/api/campaigns");
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const brandCampaigns = data.filter((c: any) => c.brandId === selectedBrand?.id);
        const listToDisplay = brandCampaigns.length > 0 ? brandCampaigns : data;
        setCampaigns(listToDisplay);
        if (!selectedCampaign && listToDisplay.length > 0) {
          setSelectedCampaign(listToDisplay[0]);
        }
      }
    } catch (err) {
      console.error("Fetch campaigns error:", err);
    }
  };

  const fetchInfluencers = async () => {
    try {
      const res = await authenticatedFetch("/api/influencers");
      const data = await res.json();
      if (Array.isArray(data)) {
        setAllInfluencers(data);
      }
    } catch (err) {
      console.error("Fetch influencers error:", err);
    }
  };

  const fetchStats = async (id: string) => {
    const res = await authenticatedFetch(`/api/campaigns/${id}/stats`);
    const data = await res.json();
    setStats(data);
  };

  const handleConfirmSale = async (shortCodeToConfirm?: string) => {
    const code = shortCodeToConfirm || confirmCode;
    if (!code) return;
    
    setIsConfirming(true);
    try {
      const res = await authenticatedFetch(`/api/links/${code}/convert`, {
        method: "POST"
      });
      const data = await res.json();
      
      if (res.ok) {
        if (selectedCampaign) fetchStats(selectedCampaign.id);
        fetchBrands(); // Update balance
        setConfirmCode("");
        alert("Sale confirmed! The influencer has been paid instantly via escrow.");
      } else {
        alert(data.error || "Failed to confirm sale. Please check the reference code.");
      }
    } catch (err) {
      console.error("Confirm conversion error:", err);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrand?.id) return;
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

  const handlePaystackSuccess = async (referenceObj: any) => {
    try {
      setIsActivating(true);
      // We can pass the reference to the server to verify and activate
      const res = await authenticatedFetch("/api/brands/subscribe", {
        method: "POST",
        body: JSON.stringify({ reference: referenceObj.reference })
      });
      if (res.ok) {
        alert("Subscription successful! Your account is now active.");
        fetchBrands();
      } else {
        const data = await res.json();
        alert(data.error || "Payment successful, but subscription activation failed. Please contact support.");
      }
    } catch (err) {
      console.error("Subscription error:", err);
    } finally {
      setIsActivating(false);
    }
  };

  const handlePaystackClose = () => {
    console.log("Paystack dialog closed");
  };

  const handlePayMonthlyFee = () => {
    setShowPayModal(true);
  };

  const triggerPaystack = () => {
    if (!paystackConfig.publicKey || paystackConfig.publicKey === 'your_paystack_public_key') {
      alert("Paystack Public Key is not configured. Please add VITE_PAYSTACK_PUBLIC_KEY to your environment.");
      return;
    }
    setShowPayModal(false);
    initializePayment({
        onSuccess: handlePaystackSuccess,
        onClose: handlePaystackClose
    });
  };

  const handlePayFromBalance = async () => {
    try {
      setIsActivating(true);
      const res = await authenticatedFetch("/api/brands/subscribe", {
        method: "POST",
        body: JSON.stringify({}) // No reference means use balance
      });
      const data = await res.json();
      if (res.ok) {
        alert("Subscription successful! Your account is now active.");
        setShowPayModal(false);
        fetchBrands();
      } else {
        alert(data.error || "Failed to process subscription.");
      }
    } catch (err) {
      console.error("Subscription error:", err);
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Brand Dashboard</h2>
          <div className="flex items-center gap-3 mt-2">
            <select 
              value={selectedBrand?.id || ""} 
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
            {selectedBrand?.subscriptionStatus !== 'active' && (
              <button 
                onClick={handlePayMonthlyFee}
                disabled={isActivating}
                className="bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded uppercase tracking-wider hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {isActivating ? "Processing..." : "Pay Monthly Fee (₦10,000)"}
              </button>
            )}
          </div>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl border border-zinc-100 shadow-sm flex items-center gap-4">
          <div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Campaign Funds</div>
            <div className="text-xl font-bold text-zinc-900">₦{selectedBrand?.balance?.toLocaleString() || "0"}</div>
          </div>
          <button onClick={() => setShowDeposit(true)} className="bg-emerald-50 text-emerald-600 p-2 rounded-xl">
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Quick Confirmation Portal */}
      <div className="mb-12">
        <div className="bg-zinc-900 rounded-[40px] p-8 md:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <MessageSquare size={120} />
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-2">WhatsApp Sale Confirmation</h3>
            <p className="text-zinc-400 max-w-sm text-sm">Paste the "Ref Code" from your customer's WhatsApp message here to trigger an instant influencer payout.</p>
          </div>
          <div className="relative z-10 w-full md:w-auto flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value.trim())}
                placeholder="Paste Ref Code (e.g. konga7x)"
                className="w-full sm:w-64 bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-white placeholder:text-zinc-500 font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
              <button 
                disabled={!confirmCode || isConfirming}
                onClick={() => handleConfirmSale()}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black px-8 py-4 rounded-2xl font-black shadow-xl transition-all cursor-pointer"
              >
                {isConfirming ? "Processing..." : "Confirm & Pay Influencer"}
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span>Quick test ref codes:</span>
              {["konga7x", "street24", "chow99"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setConfirmCode(c)}
                  className="bg-white/10 hover:bg-white/20 text-emerald-400 font-mono px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Your Campaigns</h3>
            <button 
              onClick={() => setShowCreate(true)}
              className="w-8 h-8 flex items-center justify-center bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-all"
            >
              <Plus size={18} />
            </button>
          </div>
          {campaigns.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCampaign(c)}
              className={`w-full text-left p-6 rounded-3xl border transition-all ${
                selectedCampaign?.id === c.id ? "border-emerald-600 bg-emerald-50/50" : "bg-white border-zinc-100"
              }`}
            >
              <h4 className="font-bold text-zinc-900">{c.title}</h4>
              <p className="text-xs text-zinc-500 line-clamp-1">{c.description}</p>
            </button>
          ))}
          {campaigns.length === 0 && (
            <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-zinc-200 text-zinc-400 text-xs">
              No campaigns yet. Click the + to start.
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedCampaign ? (
            <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm">
              <h3 className="text-2xl font-bold text-zinc-900 mb-8">{selectedCampaign.title}</h3>
              
              <div className="grid grid-cols-3 gap-6 mb-12">
                <div className="p-6 rounded-2xl bg-zinc-50">
                  <div className="text-zinc-400 text-[10px] font-bold uppercase mb-2">Total Clicks</div>
                  <div className="text-2xl font-bold text-zinc-900">{stats.reduce((acc, s) => acc + s.click_count, 0)}</div>
                </div>
                <div className="p-6 rounded-2xl bg-zinc-50">
                  <div className="text-zinc-400 text-[10px] font-bold uppercase mb-2">Conversions</div>
                  <div className="text-2xl font-bold text-emerald-600">{stats.reduce((acc, s) => acc + s.conversion_count, 0)}</div>
                </div>
                <div className="p-6 rounded-2xl bg-zinc-50">
                  <div className="text-zinc-400 text-[10px] font-bold uppercase mb-2">Payout/Lead</div>
                  <div className="text-2xl font-bold text-zinc-900">₦{selectedCampaign.payout_per_lead}</div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-zinc-100">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase">Influencer</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase text-right">Sales</th>
                      <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {stats.map((s, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 text-zinc-900">{s.influencer_name}</td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-600">{s.conversion_count}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleConfirmSale(s.short_code)} className="text-[10px] font-bold text-emerald-600">Confirm Sale</button>
                        </td>
                      </tr>
                    ))}
                    {stats.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-zinc-400 text-xs italic">No activity recorded yet for this campaign.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-zinc-400 border-2 border-dashed border-zinc-100 rounded-[40px] bg-white">
              <Megaphone size={40} className="mb-4 opacity-20" />
              <p className="text-sm">Select a campaign to view detailed performance</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Campaign Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[40px] p-12 max-w-xl w-full shadow-2xl"
            >
              <h3 className="text-3xl font-bold mb-8">Launch Campaign</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <input 
                  className="w-full px-6 py-4 rounded-2xl border border-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium" 
                  placeholder="Campaign Title" 
                  value={newCampaign.title} 
                  onChange={e => setNewCampaign({...newCampaign, title: e.target.value})} 
                  required
                />
                <textarea 
                  className="w-full px-6 py-4 rounded-2xl border border-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium min-h-[120px]" 
                  placeholder="Description" 
                  value={newCampaign.description} 
                  onChange={e => setNewCampaign({...newCampaign, description: e.target.value})} 
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 px-6">Payout per Lead (₦)</label>
                    <input 
                      type="number" 
                      className="w-full px-6 py-4 rounded-2xl border border-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium" 
                      value={newCampaign.payout_per_lead} 
                      onChange={e => setNewCampaign({...newCampaign, payout_per_lead: parseInt(e.target.value)})} 
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 px-6">WhatsApp (234...)</label>
                    <input 
                      className="w-full px-6 py-4 rounded-2xl border border-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium" 
                      value={newCampaign.wa_number} 
                      onChange={e => setNewCampaign({...newCampaign, wa_number: e.target.value})} 
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-4 font-bold text-zinc-500">Cancel</button>
                  <button type="submit" className="flex-1 bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all">Create Campaign</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Deposit Modal */}
      <AnimatePresence>
        {showDeposit && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[40px] p-12 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-3xl font-bold mb-4">Add Funds</h3>
              <p className="text-zinc-500 mb-8">Deposit funds to pay your influencers automatically.</p>
              <form onSubmit={handleDeposit} className="space-y-4">
                <input 
                  type="number" 
                  className="w-full px-6 py-4 rounded-2xl border border-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-2xl text-center" 
                  placeholder="₦0.00" 
                  value={depositAmount} 
                  onChange={e => setDepositAmount(e.target.value)} 
                  required
                />
                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => setShowDeposit(false)} className="flex-1 py-4 font-bold text-zinc-500">Cancel</button>
                  <button type="submit" className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all">Confirm Deposit</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Selection Modal */}
      <AnimatePresence>
        {showPayModal && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)]"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-3xl font-bold text-zinc-900 mb-2">Payment Options</h3>
                  <p className="text-zinc-500 text-sm">Subscription Fee: <span className="text-zinc-900 font-black">₦10,000/month</span></p>
                </div>
                <button onClick={() => setShowPayModal(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={triggerPaystack}
                  className="w-full bg-emerald-600 text-white p-6 rounded-3xl flex items-center justify-between hover:bg-emerald-700 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                      <CreditCard size={24} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">Card or Bank Transfer</div>
                      <div className="text-xs text-emerald-100">Pay securely via Paystack</div>
                    </div>
                  </div>
                  <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                </button>

                <button 
                  disabled={!selectedBrand || selectedBrand.balance < 10000 || isActivating}
                  onClick={handlePayFromBalance}
                  className="w-full bg-zinc-50 border border-zinc-100 p-6 rounded-3xl flex items-center justify-between hover:bg-zinc-100 transition-all group disabled:opacity-50 disabled:grayscale"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl border border-zinc-100 flex items-center justify-center text-zinc-900">
                      <Wallet size={24} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-zinc-900">Deduct from Balance</div>
                      <div className="text-xs text-zinc-400">Current: ₦{selectedBrand?.balance?.toLocaleString()}</div>
                    </div>
                  </div>
                  {selectedBrand && selectedBrand.balance < 10000 ? (
                    <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest bg-red-50 px-2 py-1 rounded">Low Funds</div>
                  ) : (
                    <ChevronRight className="group-hover:translate-x-1 transition-transform text-zinc-400" />
                  )}
                </button>
              </div>

              <p className="mt-8 text-[10px] text-center text-zinc-400 uppercase font-bold tracking-widest leading-relaxed">
                By subscribing, you agree to NaijaTrack's terms and performance-based commission structure.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const InfluencerDashboard = ({ authenticatedFetch, lastNotification, user }: { authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>, lastNotification?: any, user: User }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [walletData, setWalletData] = useState<any>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [lastEarnings, setLastEarnings] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  // Withdrawal State
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedBank, setSelectedBank] = useState("GTBank");
  const [accountNumber, setAccountNumber] = useState("0123456789");
  const [accountName, setAccountName] = useState(user.name || "Influencer Creator");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState("");

  // Simulation State
  const [simulatingCode, setSimulatingCode] = useState<string | null>(null);

  const NIGERIAN_BANKS = [
    "GTBank (Guaranty Trust Bank)",
    "Access Bank",
    "Zenith Bank",
    "OPay Digital Services",
    "PalmPay",
    "Kuda Microfinance Bank",
    "Moniepoint MFB",
    "United Bank for Africa (UBA)",
    "First Bank of Nigeria",
    "Stanbic IBTC Bank"
  ];

  useEffect(() => {
    fetchData();
    fetchWallet();
    fetchLinks();
  }, []);

  useEffect(() => {
    if (lastNotification?.type === "CONVERSION") {
      fetchWallet();
      fetchLinks();
      
      // If it's for this influencer, show a special toast
      if (lastNotification.influencer_id === user.id) {
        setLastEarnings(lastNotification);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 5000);
      }
    }
  }, [lastNotification, user.id]);

  const fetchData = async () => {
    try {
      const res = await authenticatedFetch("/api/campaigns");
      const data = await res.json();
      if (Array.isArray(data)) setCampaigns(data);
    } catch (err) {
      console.error("Fetch campaigns error:", err);
    }
  };

  const fetchWallet = async () => {
    try {
      const res = await authenticatedFetch("/api/influencers/wallet");
      const data = await res.json();
      if (res.ok) setWalletData(data);
    } catch (err) {
      console.error("Fetch wallet error:", err);
    }
  };

  const fetchLinks = async () => {
    try {
      const res = await authenticatedFetch("/api/influencers/links");
      const data = await res.json();
      if (Array.isArray(data)) setLinks(data);
    } catch (err) {
      console.error("Fetch links error:", err);
    }
  };

  const handleGetLink = async (campaignId: string) => {
    setLoading(true);
    try {
      const res = await authenticatedFetch("/api/links", {
        method: "POST",
        body: JSON.stringify({ campaignId })
      });
      if (res.ok) await fetchLinks();
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (shortCode: string) => {
    const fullUrl = `${window.location.origin}/l/${shortCode}`;
    navigator.clipboard.writeText(fullUrl);
    alert(`Tracking link copied: ${fullUrl}`);
  };

  const shareToWhatsApp = (shortCode: string, campaignTitle: string) => {
    const fullUrl = `${window.location.origin}/l/${shortCode}`;
    const text = encodeURIComponent(`🔥 Hot Deal Alert on ${campaignTitle}! Tap here to place your verified WhatsApp order: ${fullUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const handleSimulateSale = async (shortCode: string) => {
    setSimulatingCode(shortCode);
    try {
      const res = await authenticatedFetch(`/api/links/${shortCode}/simulate`, {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok) {
        setLastEarnings({
          amount: data.amount,
          campaign_title: `${data.customer.product} (${data.customer.city})`
        });
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 5000);
        await fetchWallet();
        await fetchLinks();
      } else {
        alert(data.error || "Simulation failed.");
      }
    } catch (err) {
      console.error("Simulate sale error:", err);
    } finally {
      setSimulatingCode(null);
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawAmount);
    if (!amountNum || amountNum <= 0) {
      alert("Please enter a valid withdrawal amount.");
      return;
    }
    const currentBalance = walletData?.influencer?.walletBalance || 0;
    if (amountNum > currentBalance) {
      alert("Withdrawal amount exceeds your available balance.");
      return;
    }

    setIsWithdrawing(true);
    try {
      const res = await authenticatedFetch("/api/influencers/withdraw", {
        method: "POST",
        body: JSON.stringify({
          amount: amountNum,
          bankName: selectedBank,
          accountNumber,
          accountName
        })
      });
      const data = await res.json();
      if (res.ok) {
        setWithdrawSuccessMsg(data.message || `₦${amountNum.toLocaleString()} paid out to ${selectedBank}!`);
        await fetchWallet();
        setTimeout(() => {
          setShowWithdrawModal(false);
          setWithdrawSuccessMsg("");
          setWithdrawAmount("");
        }, 2200);
      } else {
        alert(data.error || "Failed to process withdrawal.");
      }
    } catch (err) {
      console.error("Withdrawal error:", err);
      alert("Failed to submit withdrawal request.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const totalClicks = links.reduce((acc, l) => acc + (l.clickCount || 0), 0);
  const totalConversions = links.reduce((acc, l) => acc + (l.conversionCount || 0), 0);
  const walletBalance = walletData?.influencer?.walletBalance || 0;

  const categories = ["All", "Tech & Gadgets", "Fashion", "Food & Groceries", "Travel & Tourism"];
  const filteredCampaigns = selectedCategory === "All" 
    ? campaigns 
    : campaigns.filter(c => (c.category || "").toLowerCase() === selectedCategory.toLowerCase());

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
      {/* Real-time Earnings Alert */}
      <AnimatePresence>
        {showSuccessToast && lastEarnings && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="fixed bottom-8 right-8 z-[200] bg-emerald-600 text-white p-6 rounded-[32px] shadow-[0_20px_50px_rgba(5,150,105,0.3)] flex items-center gap-6 max-w-sm"
          >
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <Banknote size={32} className="text-white" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-100 mb-1">Live Commission Paid!</div>
              <div className="text-xl font-black mb-1">₦{lastEarnings.amount?.toLocaleString()}</div>
              <div className="text-xs text-emerald-50 text-balance">Escrow released from <span className="font-bold underline">{lastEarnings.campaign_title}</span></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Wallet Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Verified Creator Account • {walletData?.influencer?.followers ? `${walletData.influencer.followers.toLocaleString()} Followers` : "Active"}
          </div>
          <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Influencer Partner Studio</h2>
          <p className="text-zinc-500 text-sm mt-1">Promote verified Nigerian merchants, drive WhatsApp sales, and withdraw escrow commissions instantly.</p>
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 flex items-center gap-6 w-full md:w-auto justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <Wallet size={24} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Available Wallet</div>
              <div className="text-2xl font-black text-emerald-600">₦{walletBalance.toLocaleString()}</div>
            </div>
          </div>
          <button 
            onClick={() => {
              setWithdrawAmount(walletBalance.toString());
              setShowWithdrawModal(true);
            }}
            disabled={walletBalance <= 0}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold px-5 py-3 rounded-2xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Banknote size={16} />
            Withdraw Payout
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Clicks</span>
            <Globe size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900">{totalClicks.toLocaleString()}</div>
          <div className="text-[11px] text-zinc-400 mt-1">Direct follower traffic</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">WhatsApp Leads</span>
            <MessageSquare size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{totalConversions.toLocaleString()}</div>
          <div className="text-[11px] text-zinc-400 mt-1">Verified merchant orders</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Links</span>
            <LinkIcon size={18} className="text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900">{links.length}</div>
          <div className="text-[11px] text-zinc-400 mt-1">Live tracking funnels</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Conversion Rate</span>
            <TrendingUp size={18} className="text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900">
            {totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : "12.7"}%
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Above Lagos affiliate avg.</div>
        </div>
      </div>

      {/* My Active Referral Links Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
              <LinkIcon size={20} className="text-emerald-600" />
              My Active WhatsApp Tracking Links
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">Share these links to your WhatsApp Status, Instagram Bio, TikTok, or Twitter to earn per verified order.</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full">
            {links.length} Active Funnels
          </span>
        </div>

        {links.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-zinc-200 p-12 text-center text-zinc-400">
            <Megaphone size={36} className="mx-auto mb-3 opacity-30 text-emerald-600" />
            <p className="text-sm font-bold text-zinc-700">No active tracking links yet</p>
            <p className="text-xs text-zinc-500 mt-1">Join any of the high-paying campaigns below to generate your personal WhatsApp attribution link!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {links.map((link) => {
              const c = link.campaign || campaigns.find(item => item.id === link.campaignId) || {
                title: "Nigerian Partner Deal",
                payout_per_lead: 3000,
                wa_number: "2348031234567"
              };
              const payout = c.payout_per_lead || 2500;
              const linkUrl = `${window.location.origin}/l/${link.shortCode}`;
              const isSimulatingThis = simulatingCode === link.shortCode;

              return (
                <div key={link.id || link.shortCode} className="bg-white rounded-3xl border border-zinc-100 p-6 shadow-sm flex flex-col justify-between hover:border-emerald-200 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg uppercase tracking-wider">
                        ₦{payout.toLocaleString()} / Lead
                      </span>
                      <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-50 px-2 py-0.5 rounded">
                        #{link.shortCode}
                      </span>
                    </div>

                    <h4 className="font-bold text-zinc-900 text-base mb-1 line-clamp-1">{c.title}</h4>
                    <p className="text-xs text-zinc-400 font-mono break-all line-clamp-1 mb-4">{linkUrl}</p>

                    <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50 rounded-2xl mb-5">
                      <div>
                        <div className="text-[10px] font-bold text-zinc-400 uppercase">Clicks</div>
                        <div className="text-lg font-bold text-zinc-900">{link.clickCount || 0}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-zinc-400 uppercase">Sales</div>
                        <div className="text-lg font-bold text-emerald-600">{link.conversionCount || 0}</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-zinc-50">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => copyToClipboard(link.shortCode)}
                        className="flex items-center justify-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold py-2.5 px-3 rounded-xl transition-colors cursor-pointer"
                      >
                        <Copy size={13} />
                        Copy Link
                      </button>

                      <button
                        onClick={() => shareToWhatsApp(link.shortCode, c.title)}
                        className="flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-colors cursor-pointer"
                      >
                        <Share2 size={13} />
                        WhatsApp
                      </button>
                    </div>

                    <button
                      disabled={isSimulatingThis}
                      onClick={() => handleSimulateSale(link.shortCode)}
                      className="w-full flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold py-2.5 px-3 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                      title="Simulate an instant customer order from your WhatsApp link"
                    >
                      <Zap size={14} className="text-emerald-600" />
                      {isSimulatingThis ? "Simulating Order..." : "⚡ Test Follower WhatsApp Order"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Campaigns Directory */}
      <div className="bg-white rounded-[40px] border border-zinc-100 shadow-sm overflow-hidden mb-12">
        <div className="px-8 py-6 border-b border-zinc-100 bg-zinc-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-lg">
              <Megaphone size={18} className="text-emerald-600" />
              Available Nigerian Campaigns
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">Explore active merchants with funded escrow budgets ready to pay influencers.</p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat 
                    ? "bg-zinc-900 text-white" 
                    : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="px-8 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Brand Campaign</th>
                <th className="px-8 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Category</th>
                <th className="px-8 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Payout / Lead</th>
                <th className="px-8 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filteredCampaigns.map((c) => {
                const linkObj = links.find(l => l.campaignId === c.id);
                const hasLink = !!linkObj;
                
                return (
                  <tr key={c.id} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="font-bold text-zinc-900 mb-1">{c.title}</div>
                      <div className="text-xs text-zinc-500 max-w-md line-clamp-1">{c.description}</div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-medium px-2.5 py-1 bg-zinc-100 text-zinc-700 rounded-lg">
                        {c.category || "General"}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-black text-sm">₦{c.payout_per_lead?.toLocaleString() || "2,500"}</span>
                        <span className="text-[10px] text-zinc-400 font-medium">per lead</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {hasLink ? (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Active Link</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-zinc-300" />
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Available</span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      {hasLink ? (
                        <div className="inline-flex items-center gap-2">
                          <button 
                            onClick={() => copyToClipboard(linkObj.shortCode)}
                            className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all cursor-pointer"
                          >
                            <Copy size={12} />
                            Copy Link
                          </button>
                        </div>
                      ) : (
                        <button 
                          disabled={loading}
                          onClick={() => handleGetLink(c.id)}
                          className="inline-flex items-center gap-1.5 bg-zinc-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          <Plus size={13} />
                          Join Campaign
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredCampaigns.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center text-zinc-400 italic">No campaigns found in this category.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction & Payout History */}
      <div className="bg-white rounded-[40px] border border-zinc-100 shadow-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-zinc-900 text-lg flex items-center gap-2">
              <History size={18} className="text-emerald-600" />
              Payout Receipts & Earnings History
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">Real-time ledger of verified WhatsApp sales and direct bank transfers.</p>
          </div>
          <span className="text-xs font-bold text-zinc-400">
            {walletData?.transactions?.length || 0} Transactions
          </span>
        </div>

        <div className="divide-y divide-zinc-100">
          {(walletData?.transactions || []).map((tx: any, idx: number) => {
            const isDebit = tx.type === "BANK_WITHDRAWAL" || tx.type === "BANK_PAYOUT";
            const dateStr = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
              year: "numeric"
            }) : "Today";

            return (
              <div key={tx.id || idx} className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    isDebit ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                  }`}>
                    {isDebit ? <ArrowDownCircle size={20} /> : <Banknote size={20} />}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-zinc-900">{tx.title || (isDebit ? "Bank Transfer Payout" : "Campaign Commission")}</div>
                    <div className="text-xs text-zinc-400 flex items-center gap-2">
                      <span>{dateStr}</span>
                      <span>•</span>
                      <span className="font-mono text-[11px]">{tx.reference || "REF-NT"}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`font-black text-sm ${isDebit ? "text-red-600" : "text-emerald-600"}`}>
                    {isDebit ? "-" : "+"}₦{tx.amount?.toLocaleString()}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-emerald-100 text-emerald-700">
                    {tx.status || "SUCCESS"}
                  </span>
                </div>
              </div>
            );
          })}
          {(!walletData?.transactions || walletData.transactions.length === 0) && (
            <div className="py-8 text-center text-xs text-zinc-400 italic">
              No transactions recorded yet. Join a campaign and test an order!
            </div>
          )}
        </div>
      </div>

      {/* Bank Withdrawal Modal */}
      <AnimatePresence>
        {showWithdrawModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setShowWithdrawModal(false)}
                className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">Withdraw to Bank Account</h3>
                  <p className="text-xs text-zinc-500">Instant payout to any Nigerian commercial bank or fintech.</p>
                </div>
              </div>

              {withdrawSuccessMsg ? (
                <div className="py-8 text-center">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={32} />
                  </div>
                  <h4 className="text-lg font-bold text-zinc-900 mb-1">Transfer Successful!</h4>
                  <p className="text-xs text-zinc-500">{withdrawSuccessMsg}</p>
                </div>
              ) : (
                <form onSubmit={handleWithdrawal} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Select Bank</label>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-emerald-500"
                    >
                      {NIGERIAN_BANKS.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Account Number (NUBAN)</label>
                    <input
                      type="text"
                      maxLength={10}
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="0123456789"
                      required
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="e.g. Tunde Babatunde"
                      required
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-zinc-500">Withdrawal Amount (₦)</label>
                      <span className="text-xs text-emerald-600 font-bold">Max: ₦{walletBalance.toLocaleString()}</span>
                    </div>
                    <input
                      type="number"
                      max={walletBalance}
                      min={1000}
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="e.g. 15000"
                      required
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 focus:outline-none focus:border-emerald-500"
                    />

                    <div className="flex items-center gap-2 mt-2">
                      {[5000, 10000, 25000].filter(a => a <= walletBalance).map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setWithdrawAmount(val.toString())}
                          className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-xs font-bold text-zinc-700 transition-colors"
                        >
                          ₦{val.toLocaleString()}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setWithdrawAmount(walletBalance.toString())}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-xs font-bold text-emerald-700 transition-colors"
                      >
                        All (₦{walletBalance.toLocaleString()})
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isWithdrawing || walletBalance <= 0}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-4"
                  >
                    <Banknote size={18} />
                    {isWithdrawing ? "Sending Instant Transfer..." : "Confirm & Send Transfer"}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminDashboard = ({ authenticatedFetch }: { authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response> }) => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await authenticatedFetch("/api/admin/stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Fetch admin stats error:", err);
    }
  };

  if (!stats) return <div className="p-12 text-center text-zinc-400">Loading admin dashboard...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h2 className="text-3xl font-bold text-zinc-900 mb-12">Admin Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm">
          <div className="text-zinc-400 text-xs font-bold uppercase mb-2">Total Managed Budget</div>
          <div className="text-3xl font-bold text-zinc-900">₦{stats.totalBudget?.toLocaleString() || "0"}</div>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm">
          <div className="text-zinc-400 text-xs font-bold uppercase mb-2">Active Influencers</div>
          <div className="text-3xl font-bold text-zinc-900">{stats.influencerCount || "0"}</div>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm">
          <div className="text-zinc-400 text-xs font-bold uppercase mb-2">Total Payouts</div>
          <div className="text-3xl font-bold text-emerald-600">₦{stats.totalPayouts?.toLocaleString() || "0"}</div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [activeView, setActiveView] = useState("landing");
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [intendedRole, setIntendedRole] = useState<'BRAND' | 'INFLUENCER' | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const idToken = await firebaseUser.getIdToken();
          setToken(idToken);
          
          const userRef = doc(db, "users", firebaseUser.uid);
          let userSnap;
          try {
            userSnap = await getDoc(userRef);
          } catch (err) {
            const handled = handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
            if (handled === null) {
               const fallbackUser: User = {
                 id: firebaseUser.uid,
                 name: firebaseUser.displayName || "User",
                 email: firebaseUser.email || "",
                 role: intendedRole || "INFLUENCER"
               };
               setUser(fallbackUser);
               setIsAuthReady(true);
               
               if (activeView === "auth" || activeView === "landing") {
                 if (fallbackUser.role === "BRAND") setActiveView("brand");
                 else if (fallbackUser.role === "INFLUENCER") setActiveView("influencer");
                 else if (fallbackUser.role === "ADMIN") setActiveView("admin");
               }
               return;
            }
            return;
          }
          
          if (userSnap.exists()) {
            const userData = userSnap.data() as User;
            setUser(userData);
            
            // Auto-redirect after login
            if (activeView === "auth" || activeView === "landing") {
              if (userData.role === "BRAND") setActiveView("brand");
              else if (userData.role === "INFLUENCER") setActiveView("influencer");
              else if (userData.role === "ADMIN") setActiveView("admin");
            }
          } else {
            const fallbackRole = intendedRole || "INFLUENCER";
            const newUser: User = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || (fallbackRole === "BRAND" ? "Brand Partner" : "Influencer Partner"),
              email: firebaseUser.email || "",
              role: fallbackRole
            };
            setUser(newUser);
            if (activeView === "auth" || activeView === "landing") {
              if (newUser.role === "BRAND") setActiveView("brand");
              else if (newUser.role === "INFLUENCER") setActiveView("influencer");
              else if (newUser.role === "ADMIN") setActiveView("admin");
            }
            fetch("/api/auth/sync", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${idToken}`
              },
              body: JSON.stringify({
                role: fallbackRole,
                name: newUser.name,
                email: newUser.email,
                uid: firebaseUser.uid
              })
            }).catch(e => console.warn("Background auth sync warning:", e));
          }
        } else {
          setUser(null);
          setToken(null);
        }
      } finally {
        setIsAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, [intendedRole, activeView]);

  // WebSocket for real-time notifications
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

  const handleAuthSuccess = (authUser: User, authToken?: string) => {
    setUser(authUser);
    if (authToken) setToken(authToken);
    if (authUser.role === "BRAND") setActiveView("brand");
    else if (authUser.role === "INFLUENCER") setActiveView("influencer");
    else if (authUser.role === "ADMIN") setActiveView("admin");
  };

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    let currentToken = token;
    if (!currentToken && auth.currentUser) {
      try {
        currentToken = await auth.currentUser.getIdToken();
        setToken(currentToken);
      } catch (e) {
        console.warn("Token refresh notice:", e);
      }
    }
    if (!currentToken && user) {
      currentToken = `demo-${user.role.toLowerCase()}-${user.id}`;
    }
    const headers = {
      ...(options.headers || {}),
      'Authorization': `Bearer ${currentToken}`,
      'Content-Type': 'application/json'
    };
    return fetch(url, { ...options, headers });
  };

  const handleLogout = async () => {
    await signOut(auth);
    setActiveView("landing");
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (!isAuthReady) return <div className="h-screen flex items-center justify-center bg-zinc-50"><div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 selection:bg-emerald-100 selection:text-emerald-900">
        <Navbar activeView={activeView} setActiveView={setActiveView} user={user} onLogout={handleLogout} />
        
        {/* Toast Notifications */}
        <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-4">
          <AnimatePresence>
            {notifications.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-zinc-900 text-white p-6 rounded-3xl shadow-2xl border border-white/10 flex items-start gap-4 max-w-sm"
              >
                <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shrink-0">
                  <Bell size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-sm">Sale Confirmed!</h4>
                    <button onClick={() => removeNotification(n.id)} className="text-white/40"><Plus size={16} className="rotate-45" /></button>
                  </div>
                  <p className="text-xs text-white/70">
                    <span className="text-white font-medium">{n.influencer_name}</span> just earned from <span className="text-white font-medium">{n.campaign_title}</span>.
                  </p>
                  <div className="mt-2 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">₦{n.amount?.toLocaleString()} Earned</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <main className="flex-1">
          <AnimatePresence mode="wait">
            {activeView === "landing" && (
              <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <LandingPage onStart={(view, role) => {
                  if (role) setIntendedRole(role);
                  setActiveView(view);
                }} />
              </motion.div>
            )}
            {activeView === "auth" && !user && (
              <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Auth intendedRole={intendedRole} onAuthSuccess={handleAuthSuccess} />
              </motion.div>
            )}
            {activeView === "brand" && user && (user.role === "BRAND" || user.role === "ADMIN") && (
              <motion.div key="brand" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <BrandDashboard authenticatedFetch={authenticatedFetch} user={user} />
              </motion.div>
            )}
            {activeView === "influencer" && user && (user.role === "INFLUENCER" || user.role === "ADMIN") && (
              <motion.div key="influencer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <InfluencerDashboard authenticatedFetch={authenticatedFetch} lastNotification={notifications[0]} user={user} />
              </motion.div>
            )}
            {activeView === "admin" && user && user.role === "ADMIN" && (
              <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AdminDashboard authenticatedFetch={authenticatedFetch} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="border-t border-zinc-200 bg-white py-12 mt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-zinc-900 rounded flex items-center justify-center text-white text-[10px] font-bold">N</div>
              <span className="text-sm font-bold tracking-tight text-zinc-900">NaijaTrack</span>
            </div>
            <p className="text-zinc-400 text-xs">© 2026 NaijaTrack. Performance Tracking for Nigeria.</p>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
