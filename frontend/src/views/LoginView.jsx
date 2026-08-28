import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { 
  Eye, EyeOff, ShieldCheck, AlertCircle, Loader2, 
  Lock, KeyRound, Mail, User, CheckCircle2, XCircle, 
  Sparkles, Terminal, ArrowRight, Shield, Cpu 
} from "lucide-react";
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { GoogleButton } from "../components/UI/GoogleButton";

export default function LoginView() {
  const { login, register, googleLogin } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [bootSequence, setBootSequence] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const timer = setTimeout(() => setBootSequence(false), 1400);
    return () => clearTimeout(timer);
  }, []);

  // Live password validation checklist
  const passChecks = {
    length: formData.password.length >= 8,
    upper: /[A-Z]/.test(formData.password),
    lower: /[a-z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: /[!@#$%^&*_\-.]/.test(formData.password),
  };

  const validate = () => {
    let newErrors = {};
    if (isRegister && !formData.username.trim()) newErrors.username = "Agent username is required.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email)) newErrors.email = "Valid enterprise email required.";
    if (isRegister) {
      if (!Object.values(passChecks).every(Boolean)) {
        newErrors.password = "Security Policy: Must meet all 5 cryptographic requirements.";
      }
    } else {
      if (!formData.password) newErrors.password = "Security credential required.";
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
    prompt: 'select_account',
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const GOOGLE_USERINFO_URL = import.meta.env.VITE_GOOGLE_USERINFO_URL || 'https://www.googleapis.com/oauth2/v3/userinfo';
        const userInfo = await axios.get(
          GOOGLE_USERINFO_URL,
          { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
        );

        const googleEmail = userInfo.data.email;
        const result = await googleLogin(googleEmail, userInfo.data.picture, tokenResponse.access_token);

        if (!result.success) {
          setErrors({ form: "Auth Error: " + (result.error || "Please try again.") });
        }
      } catch (err) {
        console.error("Google API / Server error:", err);
        setErrors({ form: "Google API Connection or Server Verification Failed" });
      } finally {
        setLoading(false);
      }
    },
    onError: (err) => {
      console.error("Google OAuth Error:", err);
      setErrors({ form: "Google Login Failed. Please try again." });
      setLoading(false);
    },
    onNonOAuthError: (err) => {
      console.error("Google Non-OAuth Error:", err);
      setErrors({ form: "Google Sign-In popup was closed or blocked. Please allow popups." });
      setLoading(false);
    }
  });

  if (bootSequence) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center font-mono text-emerald-400 text-xs md:text-sm p-8 select-none">
        <div className="w-full max-w-md space-y-2 p-6 rounded-2xl bg-[#091122]/80 border border-emerald-500/20 shadow-2xl">
          <div className="flex items-center gap-2 text-emerald-400 font-bold mb-3 border-b border-emerald-500/20 pb-2">
            <Terminal size={16} />
            <span>AKIRA SECURITY GATEWAY // INITIALIZING</span>
          </div>
          <p className="animate-pulse flex items-center gap-2">
            <span className="text-emerald-500">▶</span> KERNEL_INIT: Rust FFI Attestation Layer...
          </p>
          <p className="text-slate-300 flex items-center gap-2">
            <span className="text-emerald-400">✓</span> NIST_800_63B_MFA_PIPELINE: MOUNTED
          </p>
          <p className="text-cyan-300 flex items-center gap-2">
            <span className="text-cyan-400">✓</span> AES_256_GCM_AEAD_VAULT: ENCRYPTED
          </p>
          <p className="text-emerald-300 flex items-center gap-2">
            <span className="text-emerald-400">✓</span> ESTABLISHING_SECURE_UPLINK... [OK]
          </p>
          <div className="w-full bg-slate-900 h-1.5 mt-6 rounded-full overflow-hidden border border-slate-800">
            <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 animate-[width-grow_1.4s_ease-out_forwards]" style={{ width: '0%' }}></div>
          </div>
        </div>
        <style>{`@keyframes width-grow { to { width: 100%; } }`}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[#020617] flex items-center justify-center p-4 sm:p-6 overflow-hidden font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Background Cyber Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/[0.08] rounded-full blur-[140px] animate-pulse-glow"></div>
        <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-cyan-500/[0.06] rounded-full blur-[130px]"></div>
        <div className="absolute inset-0 cyber-grid-pattern opacity-30"></div>
      </div>

      <div className="relative z-10 w-full max-w-[440px] animate-fade-in">
        <div className="rounded-3xl p-7 sm:p-9 relative overflow-hidden backdrop-blur-2xl bg-[#091226]/85 border border-white/[0.09] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]">
          
          {/* Header Title Section */}
          <div className="mb-7 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 mb-4 border border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_-3px_rgba(16,185,129,0.3)]">
              <ShieldCheck className="w-7 h-7 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display mb-1.5">
              {isRegister ? "Deploy Agent Identity" : "Security Gateway Access"}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm font-normal">
              {isRegister ? "Create NIST-hardened administrative credentials." : "Zero-Trust authenticated session required."}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-[#060c1c] rounded-xl border border-white/[0.06] mb-6">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setErrors({}); }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                !isRegister 
                  ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setErrors({}); }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                isRegister 
                  ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Create Identity
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.form && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errors.form}</span>
              </div>
            )}

            {isRegister && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="block text-xs font-mono font-medium text-slate-300 uppercase tracking-wider">
                  Operator Handle
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    className={`w-full bg-[#0a1020]/90 border text-slate-100 pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder:text-slate-500 transition-all outline-none ${
                      errors.username 
                        ? 'border-rose-500/60 focus:border-rose-500' 
                        : 'border-slate-800 focus:border-emerald-500/70 focus:bg-[#0d162d]'
                    }`}
                    placeholder="e.g. sec_operator_01"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                {errors.username && <p className="text-rose-400 text-xs font-mono mt-1">{errors.username}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-medium text-slate-300 uppercase tracking-wider">
                Enterprise Email
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  className={`w-full bg-[#0a1020]/90 border text-slate-100 pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder:text-slate-500 transition-all outline-none ${
                    errors.email 
                      ? 'border-rose-500/60 focus:border-rose-500' 
                      : 'border-slate-800 focus:border-emerald-500/70 focus:bg-[#0d162d]'
                  }`}
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              {errors.email && <p className="text-rose-400 text-xs font-mono mt-1">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-medium text-slate-300 uppercase tracking-wider">
                Passphrase Credential
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPass ? "text" : "password"}
                  className={`w-full bg-[#0a1020]/90 border text-slate-100 pl-10 pr-10 py-2.5 rounded-xl text-sm placeholder:text-slate-500 transition-all outline-none ${
                    errors.password 
                      ? 'border-rose-500/60 focus:border-rose-500' 
                      : 'border-slate-800 focus:border-emerald-500/70 focus:bg-[#0d162d]'
                  }`}
                  placeholder="••••••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-rose-400 text-xs font-mono mt-1">{errors.password}</p>}
            </div>

            {/* Registration Password Complexity Checklist */}
            {isRegister && (
              <div className="p-3 rounded-xl bg-[#060c1c]/90 border border-slate-800 text-[11px] space-y-1.5 font-mono">
                <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">NIST Complexity Policy:</p>
                <div className="grid grid-cols-2 gap-1.5 text-slate-400">
                  <span className={passChecks.length ? "text-emerald-400 flex items-center gap-1" : "flex items-center gap-1"}>
                    {passChecks.length ? "✓" : "○"} 8+ Characters
                  </span>
                  <span className={passChecks.upper ? "text-emerald-400 flex items-center gap-1" : "flex items-center gap-1"}>
                    {passChecks.upper ? "✓" : "○"} 1 Uppercase
                  </span>
                  <span className={passChecks.lower ? "text-emerald-400 flex items-center gap-1" : "flex items-center gap-1"}>
                    {passChecks.lower ? "✓" : "○"} 1 Lowercase
                  </span>
                  <span className={passChecks.number ? "text-emerald-400 flex items-center gap-1" : "flex items-center gap-1"}>
                    {passChecks.number ? "✓" : "○"} 1 Numeric
                  </span>
                  <span className={passChecks.special ? "text-emerald-400 flex items-center gap-1 col-span-2" : "flex items-center gap-1 col-span-2"}>
                    {passChecks.special ? "✓" : "○"} 1 Special Symbol (!@#$%^&*_-.)
                  </span>
                </div>
              </div>
            )}

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold py-3.5 rounded-xl transition-all duration-300 shadow-[0_0_20px_-3px_rgba(16,185,129,0.5)] hover:shadow-[0_0_25px_0_rgba(16,185,129,0.7)] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin text-slate-950" size={18} />
                  <span className="font-mono text-xs uppercase tracking-wider">Verifying Cryptographic Attestation...</span>
                </>
              ) : (
                <>
                  <span className="font-display tracking-wide">{isRegister ? "Initialize Identity" : "Authenticate Session"}</span>
                  <ArrowRight size={16} className="stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Social Auth Separator */}
          <div className="relative flex items-center py-5">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink-0 mx-4 text-[11px] font-mono text-slate-500 uppercase tracking-wider">or verify via SSO</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Google OAuth Button */}
          <GoogleButton 
            onClick={(e) => {
              e.preventDefault();
              googleAuth();
            }} 
            loading={loading} 
          />

          {/* Bottom Link */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setErrors({}); }}
              className="text-slate-400 hover:text-emerald-400 text-xs font-mono transition-colors tracking-wide"
            >
              {isRegister ? "← Already have an account? Sign In" : "Need administrative credentials? Create Identity →"}
            </button>
          </div>

        </div>

        {/* Security Compliance Guarantee */}
        <div className="mt-4 flex items-center justify-center gap-3 text-slate-500 text-[10px] font-mono tracking-widest uppercase">
          <span className="flex items-center gap-1 text-emerald-500/70">
            <Lock size={10} /> ARGON2ID HASHING
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 text-cyan-500/70">
            <Cpu size={10} /> ZERO-ALLOCATION RUST
          </span>
        </div>
      </div>
    </div>
  );
}