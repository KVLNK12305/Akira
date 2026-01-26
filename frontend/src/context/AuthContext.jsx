import { createContext, useState, useContext } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // ⚡ STATE MANAGEMENT
  const [user, setUser] = useState(null);
  
  // Start null so refreshing the page resets the demo (as requested)
  const [token, setToken] = useState(null); 
  
  // Stores email temporarily during the MFA phase
  const [tempEmail, setTempEmail] = useState(null); 

  // 1. LOGIN ACTION (Triggers OTP)
  // We do NOT set the token here. We only set 'tempEmail'.
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      
      if (res.data.success) {
        setTempEmail(email); // Move App to MFA Screen
        return { success: true, requireMfa: true };
      }
    } catch (error) {
      console.error("Login Failed:", error.response?.data?.message);
      return { success: false, error: error.response?.data?.error || "Login Failed" };
    }
  };

  // 2. GOOGLE LOGIN SIMULATION
  // Reuses the backend login to send a real OTP to the admin email
  const googleLogin = async () => {
    // For Lab Demo: We simulate Google by logging in as the Admin automatically
    // This triggers the real "AKIRA Security" email to your Gmail
    return login("admin@akira.dev", "securePassword123");
  };

  // 3. LOGOUT
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setTempEmail(null);
  };

  // 4. REGISTER
  const register = async (username, email, password, role) => {
    try {
      const res = await api.post('/auth/register', { username, email, password, role });
      
      // Registration allows immediate access (or you can force login)
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
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
      login, 
      googleLogin, 
      logout, 
      register, 
      setToken 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);