import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext"; 
import api from "./api/axios"; 

// Views
import { HeroView } from "./views/HeroView";
import LoginView from "./views/LoginView"; 
import { MFAView } from "./views/MFAView"; 
import { DashboardView } from "./views/DashboardView";
import { DocumentationView } from "./views/DocumentationView"; 

export default function App() {
  return (
    <AuthProvider>
      <MainLogic />
    </AuthProvider>
  );
}

function MainLogic() {
  const { user, token, tempEmail, logout } = useAuth(); 
  const [view, setView] = useState("hero");
  
  // Data State
  const [keys, setKeys] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- 1. SMART ROUTING LOGIC ---
  useEffect(() => {
    // Case A: User has a Token -> They are fully logged in -> Dashboard
    if (token) {
      if (view !== "dashboard") {
        setView("dashboard");
        fetchDashboardData();
      }
    } 
    // Case B: No Token, but we have a Temp Email -> They need MFA -> MFA Screen
    else if (tempEmail) {
       if (view !== "mfa") setView("mfa");
    }
    // Case C: No Token, No Email -> Stay on Hero/Login
  }, [token, tempEmail, view]);

  // --- 2. Data Fetching ---
  const fetchDashboardData = async () => {
    try {
      const keyRes = await api.get('/keys'); 
      setKeys(keyRes.data);
      
      setLogs([
        { id: 1, action: "SYSTEM_INIT", desc: "Secure Gateway Online", time: new Date().toLocaleTimeString(), signature: "sys_root" }
      ]);
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  // --- 3. Handlers ---
  const handleStart = () => setView("login");
  const handleDocs = () => setView("docs");

  const handleMfaSuccess = () => {
    // We don't need to manually redirect here. 
    // MFAView sets the Token in LocalStorage/Context.
    // The useEffect above detects the new token and auto-redirects to Dashboard.
  };

  const handleLogout = () => {
    logout();
    setView("hero");
    setKeys([]);
  };

  const handleGenerateKey = async (name, scopes) => {
    try {
      setLoading(true);
      const res = await api.post('/keys/generate', { 
        name: name || "New Service", 
        scopes: scopes || ["read:data"] 
      });
      
      const newKey = {
        id: res.data.keyId,
        prefix: res.data.apiKey, // SHOWS FULL KEY ONCE
        created: new Date().toLocaleTimeString(),
        fingerprint: "SHA-256: (Hidden)", 
        status: "Active"
      };
      
      setKeys([newKey, ...keys]);
      
      setLogs(prev => [{
        id: Date.now(),
        action: "KEY_GENERATED",
        desc: `AES-256 Key for ${name}`,
        time: new Date().toLocaleTimeString(),
        signature: "sig_" + Math.random().toString(16).substr(2, 6) 
      }, ...prev]);

    } catch (err) {
      alert("Failed to generate key: " + err.response?.data?.error);
    } finally {
      setLoading(false);
    }
  };

  // --- 4. View Rendering ---

  if (view === "hero") return <HeroView onStart={handleStart} onDocs={handleDocs} />;
  
  if (view === "docs") return <DocumentationView onBack={() => setView("hero")} />;
  
  if (view === "login") return <LoginView />; 
  
  if (view === "mfa") {
    return <MFAView onVerify={handleMfaSuccess} loading={loading} onLogout={handleLogout} />;
  }
  
  if (view === "dashboard") {
    return (
      <DashboardView 
        user={user || { username: "Admin", role: "SuperAdmin" }} 
        keys={keys} 
        logs={logs} 
        onGenerateKey={handleGenerateKey} 
        onLogout={handleLogout} 
      />
    );
  }

  // Fallback
  return <HeroView onStart={handleStart} onDocs={handleDocs} />;
}