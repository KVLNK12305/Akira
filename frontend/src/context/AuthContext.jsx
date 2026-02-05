import { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // ⚡ STATE MANAGEMENT
  const [user, setUser] = useState(null);
  const [tempEmail, setTempEmail] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. 🔄 REHYDRATE USER ON APP START
  useEffect(() => {
    const loadUser = async () => {
      // CLEAR LEGACY TOKENS (SECURITY HARDENING)
      localStorage.removeItem('token');

      try {
        // 📡 Call /auth/me - Browser sends HttpOnly 'token' cookie automatically
        const res = await api.get('/auth/me');

        if (res.data.success) {
          console.log("✅ Secure Session Restored:", res.data.user.username);
          setUser(res.data.user);
        }
      } catch (error) {
        // Not logged in or session expired - this is fine for initial load
        console.log("ℹ️ No active secure session Found.");
      }

      setLoading(false);
    };

    loadUser();
  }, []);

  // 2. STANDARD LOGIN (Triggers OTP)
  const login = async (email, password) => {
    try {
      const normalizedEmail = email.toLowerCase();
      const res = await api.post('/auth/login', { email: normalizedEmail, password });

      if (res.data.success) {
        setTempEmail(normalizedEmail); // Save email for MFA step
        return { success: true, requireMfa: true };
      }
    } catch (error) {
      console.error("Login Failed:", error.response?.data?.message);
      return { success: false, error: error.response?.data?.error || "Login Failed" };
    }
  };

  // 3. ⚡ SMART GOOGLE LOGIN
  const googleLogin = async (googleEmail, profilePicture) => {
    try {
      const normalizedEmail = googleEmail.toLowerCase();
      console.log(`🔍 Google Request for: ${normalizedEmail}`);
      const res = await api.post('/auth/google', { email: normalizedEmail, profilePicture });

      if (res.data.success) {
        setTempEmail(normalizedEmail);
        return { success: true, requireMfa: true };
      }
    } catch (error) {
      console.error("Google Auth Failed:", error.response?.data);
      return {
        success: false,
        error: error.response?.data?.error || "Google Login Failed"
      };
    }
  };

  // 4. ✅ MFA SUCCESS HANDLER
  const setAuthSuccess = (newToken, newUser) => {
    // We ignore newToken now because it's handled by HttpOnly Cookie
    setUser(newUser || newToken); // Handle cases where only 1 arg is passed if needed
  };

  // 5. LOGOUT
  const logout = async () => {
    try {
      await api.get('/auth/logout');
    } catch (err) {
      console.error("Logout failed:", err);
    }
    setUser(null);
    setTempEmail(null);
    localStorage.removeItem('token');
  };

  // 6. REGISTER
  const register = async (username, email, password, role) => {
    try {
      const normalizedEmail = email.toLowerCase();
      const res = await api.post('/auth/register', { username, email: normalizedEmail, password, role });

      if (res.data.success && res.data.requireMfa) {
        setTempEmail(normalizedEmail); // Save email for MFA step
        return { success: true, requireMfa: true };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || "Registration Failed" };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      tempEmail,
      loading,
      login,
      googleLogin,
      logout,
      register,
      setAuthSuccess,
      updateUser: (newData) => setUser(prev => ({ ...prev, ...newData }))
    }}>
      {/* 🛡️ THE GATEKEEPER: Don't render children until we know who you are */}
      {!loading ? children : <div className="h-screen bg-slate-950 flex items-center justify-center text-emerald-500 font-mono tracking-tighter">Authenticating Identity...</div>}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);