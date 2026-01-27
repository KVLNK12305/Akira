import { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // ⚡ STATE MANAGEMENT
  // Initialize token directly from localStorage to prevent empty state on refresh
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);
  const [tempEmail, setTempEmail] = useState(null);
  
  // ⏳ LOADING STATE (Crucial for fixing "Guest" bug)
  // We won't render the app until we've checked if the user is logged in
  const [loading, setLoading] = useState(true);

  // 1. 🔄 REHYDRATE USER ON APP START
  useEffect(() => {
    const loadUser = async () => {
      const storedToken = localStorage.getItem('token');
      
      if (storedToken) {
        // Set the header immediately so the request works
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        
        try {
          // 📡 Call the endpoint we created to get user details
          const res = await api.get('/auth/me');
          
          if (res.data.success) {
             console.log("✅ Session Restored:", res.data.user.username);
             setUser(res.data.user);
             setToken(storedToken);
          }
        } catch (error) {
          console.error("⚠️ Session expired or invalid:", error.message);
          // If token is bad, clear everything
          logout();
        }
      }
      // Done checking, allow app to render
      setLoading(false);
    };

    loadUser();
  }, []);

  // 2. STANDARD LOGIN (Triggers OTP)
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      
      if (res.data.success) {
        setTempEmail(email); // Save email for MFA step
        return { success: true, requireMfa: true };
      }
    } catch (error) {
      console.error("Login Failed:", error.response?.data?.message);
      return { success: false, error: error.response?.data?.error || "Login Failed" };
    }
  };

  // 3. ⚡ SMART GOOGLE LOGIN
  const googleLogin = async (googleEmail) => {
    try {
      console.log(`🔍 Google Request for: ${googleEmail}`);
      const res = await api.post('/auth/google', { email: googleEmail });

      if (res.data.success) {
        setTempEmail(googleEmail);
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

  // 4. ✅ MFA SUCCESS HANDLER (Call this from MFAView)
  const setAuthSuccess = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(newUser);
  };

  // 5. LOGOUT
  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setTempEmail(null);
    window.location.href = "/"; // Force full reload to clear any memory states
  };

  // 6. REGISTER
  const register = async (username, email, password, role) => {
    try {
      const res = await api.post('/auth/register', { username, email, password, role });
      
      // Auto-login after register
      setAuthSuccess(res.data.token, res.data.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || "Registration Failed" };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      tempEmail, 
      loading, // expose loading if you want a spinner in App.jsx
      login, 
      googleLogin, 
      logout, 
      register, 
      setAuthSuccess, // Use this in MFAView instead of setToken
      setToken // Keep for backward compatibility if needed
    }}>
      {/* 🛡️ THE GATEKEEPER: Don't render children until we know who you are */}
      {!loading ? children : <div className="h-screen bg-slate-950 flex items-center justify-center text-emerald-500">Loading Secure Gateway...</div>}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);