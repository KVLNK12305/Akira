import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext"; 
import { Eye, EyeOff, Chrome, Zap, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';

export default function LoginView() {
  const { login, register, googleLogin } = useAuth(); 
  
  const [isRegister, setIsRegister] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [bootSequence, setBootSequence] = useState(true);
  const [loading, setLoading] = useState(false); 
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const timer = setTimeout(() => setBootSequence(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const validate = () => {
    let newErrors = {};
    if (isRegister && !formData.username.trim()) newErrors.username = "Username is required.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email)) newErrors.email = "Valid email is required.";
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
    setErrors({}); 
    let result;
    if (isRegister) {
      result = await register(formData.username, formData.email, formData.password, 'Developer');
    } else {
      result = await login(formData.email, formData.password);
    }
    setLoading(false);
    if (!result.success) setErrors({ form: result.error });
  };

  // 🚀 REAL GOOGLE OAUTH LOGIC
  const googleAuth = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        // Fetch user info from Google
        const GOOGLE_USERINFO_URL = import.meta.env.VITE_GOOGLE_USERINFO_URL || 'https://www.googleapis.com/oauth2/v3/userinfo';
        const userInfo = await axios.get(
          GOOGLE_USERINFO_URL,
          { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
        );

        const googleEmail = userInfo.data.email;
        
        // Use our Context to Login/Register this email
        const result = await googleLogin(googleEmail);
        
        if (!result.success) {
          setErrors({ form: "Auth Error: " + (result.error || "Please try again.") });
        }
      } catch (err) {
        setErrors({ form: "Google API Connection Failed" });
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setErrors({ form: "Google Login Failed" });
      setLoading(false);
    },
  });

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
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] bg-emerald-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute -bottom-[20%] -left-[10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-[420px] animate-[fade-in_0.5s_ease-out]">
        <div className="rounded-[32px] p-8 md:p-10 relative overflow-hidden backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl">
          
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
            {errors.form && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={14} /> {errors.form}
              </div>
            )}
            
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

            <div>
              <input 
                className={`w-full bg-white/5 border border-white/10 text-white px-5 py-4 rounded-xl outline-none focus:border-emerald-500/50 transition-colors text-sm font-medium placeholder:text-slate-500 ${errors.email ? 'border-red-500/50' : ''}`}
                placeholder="Email Address"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
              {errors.email && <p className="text-red-400 text-xs mt-1 ml-1">{errors.email}</p>}
            </div>

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

          <div className="relative flex items-center py-6">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-xs text-slate-500">or continue with</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>



          <button 
            type="button" // <--- CRITICAL: Prevents form submit
            onClick={(e) => {
              e.preventDefault(); // <--- CRITICAL: Stops reload
              console.log("Google Button Clicked"); // Debug log
              googleAuth();
            }} 
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl transition-all hover:scale-[1.02]"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : (
              <>
                <Chrome size={18} /> <span className="text-sm font-medium">Google Account</span>
              </>
            )}
          </button>

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