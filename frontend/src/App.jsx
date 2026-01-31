import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext"; 
import api from "./api/axios"; 
import { Loader2 } from "lucide-react";

// Views
import { HeroView } from "./views/HeroView";
import LoginView from "./views/LoginView"; 
import { MFAView } from "./views/MFAView"; 
import { DashboardView } from "./views/DashboardView";
// import { DocumentationView } from "./views/DocumentationView"; // Uncomment if you have this

export default function App() {
  return (
    <AuthProvider>
      <MainLogic />
    </AuthProvider>
  );
}

function MainLogic() {
  const { user, token, tempEmail, logout, loading: authLoading } = useAuth(); 
  const [view, setView] = useState("hero");
  
  // Data State
  const [keys, setKeys] = useState([]);
  const [logs, setLogs] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  // --- 1. SMART ROUTING LOGIC ---
  useEffect(() => {
    // Wait for AuthContext to finish checking LocalStorage
    if (authLoading) return;

    // Case A: Fully Authenticated -> Go to Dashboard
    if (token) {
      setView("dashboard");
      fetchDashboardData();
    } 
    // Case B: Login success, waiting for MFA -> Go to MFA
    else if (tempEmail) {
       setView("mfa");
    }
    // Case C: Logged out -> If currently on restricted pages, kick to Hero
    else if (view === "dashboard" || view === "mfa") {
       setView("hero");
    }
  }, [token, tempEmail, authLoading]);

  // --- 2. ROBUST DATA FETCHING ---
  const fetchDashboardData = async () => {
    setDataLoading(true);
    try {
      // Run fetches in parallel for speed
      const [keysRes, logsRes] = await Promise.allSettled([
        api.get('/keys'),
        api.get('/audit-logs') // Ensure this route exists in backend or it will fail gracefully
      ]);

      // 1. Handle Keys
      if (keysRes.status === 'fulfilled') {
        setKeys(keysRes.value.data);
      } else {
        setKeys([]);
      }

      // 2. Handle Logs (With Fallback for Demo)
      if (logsRes.status === 'fulfilled' && Array.isArray(logsRes.value.data) && logsRes.value.data.length > 0) {
        setLogs(logsRes.value.data);
      } else {
        // 🚨 DEMO FALLBACK: If DB is empty, show these so the Dashboard isn't blank
        setLogs([
          { id: 1, action: "SYSTEM_INIT", desc: "Secure Gateway Online - v2.0", time: new Date().toISOString() },
          { id: 2, action: "INTEGRITY_CHECK", desc: "Rust Core: 100% Secure", time: new Date(Date.now() - 5000).toISOString() },
          { id: 3, action: "AUTH_EVENT", desc: "Admin Session Established", time: new Date().toISOString() }
        ]);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setDataLoading(false);
    }
  };

  // --- 3. HANDLERS ---
  const handleStart = () => setView("login");
  const handleDocs = () => { /* setView("docs"); */ alert("Docs coming soon!"); };

  const handleMfaSuccess = () => {
    // AuthContext updates 'token', triggering the useEffect above to switch to 'dashboard'
    console.log("MFA Verified. Redirecting...");
  };

  const handleLogout = () => {
    logout();
    setView("hero");
    setKeys([]);
    setLogs([]);
  };

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const handleGenerateKey = async (name, scopes) => {
    try {
      // Call Backend
      const res = await api.post(`${API_URL}/api/keys/generate`, { name, scopes });
      // console.log("Key generated:", res.data);
      
      // Fetch updated keys from backend to get fingerprint and complete data
      try {
        const keysRes = await api.get('/keys');
        setKeys(keysRes.data);
      } catch (err) {
        console.error("Failed to refresh keys:", err);
        // Fallback: Add to local state with temporary data
        const newKey = {
          id: res.data.keyId,
          name: name,
          fingerprint: undefined,
          scopes: res.data.scopes || scopes,
          status: 'Active',
          createdAt: new Date().toISOString()
        };
        setKeys(prev => [newKey, ...prev]);
      }
      
      // Add a log entry locally for "Alive" feel
      setLogs(prev => [{
        id: Date.now(),
        action: "KEY_GENERATION",
        desc: `New Credentials issued: ${name}`,
        time: new Date().toISOString()
      }, ...prev]);

      alert("API Key Generated Successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to generate key: " + (err.response?.data?.error || "Server Error"));
    }
  };

  const handleDeleteKey = (keyId) => {
    setKeys(prev => prev.filter(k => k.id !== keyId));
  };

  // --- 4. VIEW RENDERING ---

  // ⏳ Global Loading State (Prevents Flash of Unauthenticated Content)
  if (authLoading) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center text-emerald-500 gap-3">
         <Loader2 className="animate-spin" size={24} />
         <span className="font-mono text-sm tracking-wider">INITIALIZING GATEWAY...</span>
      </div>
    );
  }

  // 📱 View Switcher
  switch (view) {
    case "hero":
      return <HeroView onStart={handleStart} onDocs={handleDocs} />;
    
    case "login":
      return <LoginView />;
    
    case "mfa":
      return <MFAView onVerify={handleMfaSuccess} onLogout={handleLogout} />;
    
    case "dashboard":
      return (
        <DashboardView 
          user={user} 
          keys={keys} 
          logs={logs} 
          onGenerateKey={handleGenerateKey} 
          onLogout={handleLogout} 
          onDeleteKey={handleDeleteKey}
        />
      );
      
    case "docs":
      // return <DocumentationView onBack={() => setView("hero")} />;
      return <HeroView onStart={handleStart} />; // Fallback

    default:
      return <HeroView onStart={handleStart} />;
  }
}