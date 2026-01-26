import { useState, useEffect } from "react";
import { Eye, EyeOff, Facebook, Chrome, Zap, ShieldCheck, UserPlus, LogIn, AlertCircle } from "lucide-react";
// ✅ IMPORT FIX: Ensure strict casing matches your file system
import { Button } from "../components/UI/Button"; 

const QUOTES = [
  { text: "Security is a process, not a product.", author: "Bruce Schneier" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" }
];

export function LoginView({ onLogin, loading }) {
  const [isRegister, setIsRegister] = useState(false); // Toggle Login/Register
  const [showPass, setShowPass] = useState(false);
  const [bootSequence, setBootSequence] = useState(true);
  const [quote, setQuote] = useState(QUOTES[0]);

  // Form State
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    const timer = setTimeout(() => setBootSequence(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // 🛡️ REGEX VALIDATION LOGIC
  const validate = () => {
    let newErrors = {};
    
    // 1. Username (Required)
    if (!formData.username.trim()) newErrors.username = "Username is required.";

    if (isRegister) {
      // 2. Email Regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) newErrors.email = "Invalid email address.";

      // 3. Password Regex (8 chars, 1 upper, 1 special)
      const passRegex = /^(?=.*[A-Z])(?=.*[!@#$&*])(?=.*[0-9]).{8,}$/;
      if (!passRegex.test(formData.password)) {
        newErrors.password = "Must have 8+ chars, 1 Uppercase, 1 Number, 1 Special (!@#$&*)";
      }
    } else {
      if (!formData.password) newErrors.password = "Password is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onLogin(formData); // Proceed if valid
    }
  };

  // 📟 BOOT SEQUENCE (Fixed the '>' error using &gt;)
  if (bootSequence) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center font-mono text-emerald-500 text-xs md:text-sm p-8 select-none">
        <div className="w-full max-w-md space-y-1">
          <p className="animate-pulse">&gt; KERNEL_INIT...</p> {/* ✅ FIXED HERE */}
          <p className="opacity-0 animate-[fade-in_0.2s_0.5s_forwards] text-white">LOADING_ASSETS... [OK]</p>
          <p className="opacity-0 animate-[fade-in_0.2s_1.0s_forwards]">MOUNTING_UI_ENGINE... [OK]</p>
          <div className="w-full bg-gray-900 h-0.5 mt-6 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 animate-[width-grow_2s_ease-out_forwards]" style={{width: '0%'}}></div>
          </div>
        </div>
        <style>{`@keyframes width-grow { to { width: 100%; } }`}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-slate-950 flex items-center justify-center p-4 overflow-hidden">
      
      {/* Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] bg-emerald-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute -bottom-[20%] -left-[10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Glass Card */}
      <div className="relative z-10 w-full max-w-[420px] animate-[fade-in_0.5s_ease-out]">
        <div className="glass-card-pro rounded-[32px] p-8 md:p-10 relative overflow-hidden backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl">
          
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 mb-4 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
              {isRegister ? "Join the Force" : "Welcome Back"}
            </h1>
            <p className="text-slate-400 text-sm">
              {isRegister ? "Create your secure identity." : "Authenticate to access the gateway."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Username */}
            <div>
              <input 
                className={`input-glass w-full px-5 py-4 rounded-xl outline-none text-sm font-medium ${errors.username ? 'border-red-500/50' : ''}`}
                placeholder="Username"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
              />
              {errors.username && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={10}/> {errors.username}</p>}
            </div>

            {/* Email (Register Only) */}
            {isRegister && (
              <div className="animate-[fade-in_0.3s]">
                <input 
                  className={`input-glass w-full px-5 py-4 rounded-xl outline-none text-sm font-medium ${errors.email ? 'border-red-500/50' : ''}`}
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
                {errors.email && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={10}/> {errors.email}</p>}
              </div>
            )}

            {/* Password */}
            <div className="relative">
              <input 
                type={showPass ? "text" : "password"}
                className={`input-glass w-full px-5 py-4 rounded-xl outline-none text-sm font-medium ${errors.password ? 'border-red-500/50' : ''}`}
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
              <button 
                type="button" 
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-4 text-slate-500 hover:text-white transition-colors"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              {errors.password && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={10}/> {errors.password}</p>}
            </div>

            <Button loading={loading} className="mt-4">
              {isRegister ? "Create Account" : "Sign In"} <Zap size={18} fill="currentColor" />
            </Button>

          </form>

          {/* Social Auth */}
          <div className="relative flex items-center py-6">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-xs text-slate-500">or continue with</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <button 
            type="button"
            className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl transition-all"
            onClick={() => alert("Google Auth Simulated")}
          >
            <Chrome size={18} /> <span className="text-sm font-medium">Google Account</span>
          </button>

          {/* Toggle Login/Register */}
          <div className="mt-6 text-center">
            <button 
              onClick={() => { setIsRegister(!isRegister); setErrors({}); }}
              className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
            >
              {isRegister ? "Already have an account? Sign In" : "Don't have an account? Register"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}