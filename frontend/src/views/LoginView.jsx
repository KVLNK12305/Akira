import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext"; // <--- 1. Import Context
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Chrome, Zap, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";

const QUOTES = [
  { text: "Security is a process, not a product.", author: "Bruce Schneier" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" }
];

export default function Login() {
  const { login, register } = useAuth(); // <--- 2. Get Actions
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [bootSequence, setBootSequence] = useState(true);
  const [loading, setLoading] = useState(false); // Local loading state

  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Shorten boot sequence for dev speed (optional)
    const timer = setTimeout(() => setBootSequence(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  // 🛡️ VALIDATION LOGIC (Refined for Backend)
  const validate = () => {
    let newErrors = {};
    
    // 1. Username: Only required for REGISTER
    if (isRegister && !formData.username.trim()) {
      newErrors.username = "Username is required for new agents.";
    }

    // 2. Email: Required for BOTH
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email)) {
      newErrors.email = "Valid email is required.";
    }

    // 3. Password Rules
    if (isRegister) {
      const passRegex = /^(?=.*[A-Z])(?=.*[!@#$&*])(?=.*[0-9]).{8,}$/;
      if (!passRegex.test(formData.password)) {
        newErrors.password = "Weak Password: Need 8+ chars, 1 Upper, 1 Number, 1 Special.";
      }
    } else {
      if (!formData.password) newErrors.password = "Password is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({}); // Clear previous errors

    let result;

    if (isRegister) {
      // Register: Username + Email + Password + Default Role
      result = await register(formData.username, formData.email, formData.password, 'Developer');
    } else {
      // Login: Email + Password
      result = await login(formData.email, formData.password);
    }

    setLoading(false);

    if (result.success) {
      navigate('/dashboard'); // <--- Redirect to Dashboard on success
    } else {
      // Show Backend Error (e.g., "Invalid credentials")
      setErrors({ form: result.error });
    }
  };

  // 📟 BOOT SEQUENCE
  if (bootSequence) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center font-mono text-emerald-500 text-xs md:text-sm p-8 select-none">
        <div className="w-full max-w-md space-y-1">
          <p className="animate-pulse">&gt; KERNEL_INIT...</p>
          <p className="opacity-0 animate-[fade-in_0.2s_0.5s_forwards] text-white">LOADING_ASSETS... [OK]</p>
          <p className="opacity-0 animate-[fade-in_0.2s_1.0s_forwards]">MOUNTING_UI_ENGINE... [OK]</p>
          <p className="opacity-0 animate-[fade-in_0.2s_1.5s_forwards] text-emerald-300">ESTABLISHING_SECURE_UPLINK... [OK]</p>
          <div className="w-full bg-gray-900 h-0.5 mt-6 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 animate-[width-grow_2s_ease-out_forwards]" style={{width: '0%'}}></div>
          </div>
        </div>
        <style>{`@keyframes width-grow { to { width: 100%; } }`}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-slate-950 flex items-center justify-center p-4 overflow-hidden font-sans">
      
      {/* Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] bg-emerald-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute -bottom-[20%] -left-[10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Glass Card */}
      <div className="relative z-10 w-full max-w-[420px] animate-[fade-in_0.5s_ease-out]">
        <div className="rounded-[32px] p-8 md:p-10 relative overflow-hidden backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl">
          
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 mb-4 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
              {isRegister ? "Join AKIRA" : "Welcome Back"}
            </h1>
            <p className="text-slate-400 text-sm">
              {isRegister ? "Create your secure identity." : "Authenticate to access the gateway."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Global Error Message from Backend */}
            {errors.form && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={14} /> {errors.form}
              </div>
            )}

            {/* Username (Register Only) */}
            {isRegister && (
              <div className="animate-[fade-in_0.3s]">
                <input 
                  className={`w-full bg-white/5 border border-white/10 text-white px-5 py-4 rounded-xl outline-none focus:border-emerald-500/50 transition-colors text-sm font-medium placeholder:text-slate-500 ${errors.username ? 'border-red-500/50' : ''}`}
                  placeholder="Agent Username"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
                {errors.username && <p className="text-red-400 text-xs mt-1 ml-1">{errors.username}</p>}
              </div>
            )}

            {/* Email (Always Required) */}
            <div>
              <input 
                className={`w-full bg-white/5 border border-white/10 text-white px-5 py-4 rounded-xl outline-none focus:border-emerald-500/50 transition-colors text-sm font-medium placeholder:text-slate-500 ${errors.email ? 'border-red-500/50' : ''}`}
                placeholder="Email Address"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
              {errors.email && <p className="text-red-400 text-xs mt-1 ml-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div className="relative">
              <input 
                type={showPass ? "text" : "password"}
                className={`w-full bg-white/5 border border-white/10 text-white px-5 py-4 rounded-xl outline-none focus:border-emerald-500/50 transition-colors text-sm font-medium placeholder:text-slate-500 ${errors.password ? 'border-red-500/50' : ''}`}
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
              {errors.password && <p className="text-red-400 text-xs mt-1 ml-1">{errors.password}</p>}
            </div>

            {/* Submit Button */}
            <button 
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_-5px_rgba(16,185,129,0.6)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  {isRegister ? "Initialize Identity" : "Authenticate"} 
                  <Zap size={18} fill="currentColor" />
                </>
              )}
            </button>

          </form>

          {/* Toggle Login/Register */}
          <div className="mt-8 text-center">
            <button 
              onClick={() => { setIsRegister(!isRegister); setErrors({}); }}
              className="text-slate-400 hover:text-emerald-400 text-sm font-medium transition-colors"
            >
              {isRegister ? "Already initialized? Access Gateway" : "New Unit? Register Identity"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}