import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { GoogleButton } from "../components/UI/GoogleButton";

export default function LoginView() {
  const { login, register, googleLogin } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const [errors, setErrors] = useState({});

  const passChecks = {
    length: formData.password.length >= 8,
    upper: /[A-Z]/.test(formData.password),
    lower: /[a-z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: /[!@#$%^&*_\-.]/.test(formData.password),
  };

  const validate = () => {
    let newErrors = {};
    if (isRegister && !formData.username.trim()) newErrors.username = "Required.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email)) newErrors.email = "Invalid email.";
    if (isRegister) {
      if (!Object.values(passChecks).every(Boolean)) {
        newErrors.password = "Weak password.";
      }
    } else {
      if (!formData.password) newErrors.password = "Required.";
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
        setErrors({ form: "Google API Connection Failed" });
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setErrors({ form: "Google Login Failed." });
      setLoading(false);
    },
    onNonOAuthError: () => {
      setErrors({ form: "Google Sign-In popup blocked." });
      setLoading(false);
    }
  });

  return (
    <div className="min-h-screen relative bg-[#02050e] flex items-center justify-center p-6 overflow-hidden font-sans selection:bg-white/20 selection:text-white">
      {/* Ultra-Minimal Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/[0.02] rounded-full blur-[120px] mix-blend-screen"></div>
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay"></div>
      </div>

      <div className="relative z-10 w-full max-w-[380px] animate-fade-in">
        <div className="rounded-[24px] p-8 sm:p-10 relative overflow-hidden backdrop-blur-3xl bg-white/[0.02] border border-white/[0.05] shadow-[0_24px_80px_-20px_rgba(0,0,0,1)]">
          
          <div className="mb-10 text-center">
            <h1 className="text-2xl font-semibold text-white tracking-tight mb-2">
              {isRegister ? "Create Account" : "Welcome Back"}
            </h1>
            <p className="text-white/40 text-[14px]">
              {isRegister ? "Enter your details to get started." : "Please enter your details to sign in."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.form && (
              <div className="p-3 rounded-2xl bg-white/5 text-white/90 text-[13px] flex items-start gap-2 border border-white/10">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errors.form}</span>
              </div>
            )}

            {isRegister && (
              <div className="space-y-1.5">
                <input
                  className="w-full bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.05] text-white px-5 py-3.5 rounded-2xl text-[15px] placeholder:text-white/30 transition-all outline-none border border-transparent focus:border-white/10"
                  placeholder="Username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <input
                type="email"
                className="w-full bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.05] text-white px-5 py-3.5 rounded-2xl text-[15px] placeholder:text-white/30 transition-all outline-none border border-transparent focus:border-white/10"
                placeholder="Email Address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-1.5 relative">
              <input
                type={showPass ? "text" : "password"}
                className="w-full bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.05] text-white px-5 py-3.5 pr-12 rounded-2xl text-[15px] placeholder:text-white/30 transition-all outline-none border border-transparent focus:border-white/10"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Minimalist Password Strength Indicator */}
            {isRegister && (
              <div className="flex justify-between items-center px-2 pt-1">
                <div className="flex gap-1.5">
                  {[
                    passChecks.length,
                    passChecks.upper,
                    passChecks.lower,
                    passChecks.number,
                    passChecks.special
                  ].map((check, i) => (
                    <div 
                      key={i} 
                      className={`h-1 w-7 rounded-full transition-colors duration-500 ${check ? 'bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'bg-white/10'}`} 
                    />
                  ))}
                </div>
              </div>
            )}

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-white text-black hover:bg-white/90 font-medium py-3.5 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 mt-4 text-[15px]"
            >
              {loading ? <Loader2 className="animate-spin text-black" size={18} /> : (isRegister ? "Create Account" : "Sign In")}
            </button>
          </form>

          <div className="relative flex items-center py-7">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="mx-4 text-[13px] text-white/30">or</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          {/* Minimalist Google Button Wrapper */}
          <div className="opacity-90 hover:opacity-100 transition-opacity">
            <GoogleButton 
              onClick={(e) => { e.preventDefault(); googleAuth(); }} 
              loading={loading} 
            />
          </div>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setErrors({}); }}
              className="text-white/40 hover:text-white text-[14px] transition-colors"
            >
              {isRegister ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}