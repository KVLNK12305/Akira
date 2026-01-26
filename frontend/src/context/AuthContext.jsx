import { createContext, useState, useContext } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // ⚡ STATE MANAGEMENT
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null); 
  const [tempEmail, setTempEmail] = useState(null); 

  // 1. STANDARD LOGIN (Triggers OTP)
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      
      if (res.data.success) {
        setTempEmail(email); // Save the ACTUAL email for MFA
        return { success: true, requireMfa: true };
      }
    } catch (error) {
      console.error("Login Failed:", error.response?.data?.message);
      return { success: false, error: error.response?.data?.error || "Login Failed" };
    }
  };

  

  // 2. ⚡ SMART GOOGLE LOGIN (The Fix)
  // Now accepts the 'googleEmail' you selected in the pop-up
// 2. ⚡ SMART GOOGLE LOGIN (Updated)
  const googleLogin = async (googleEmail) => {
    try {
      console.log(`🔍 Google Request for: ${googleEmail}`);
      
      // Call the NEW specialized endpoint
      // This bypasses the "Password Check" completely
      const res = await api.post('/auth/google', { email: googleEmail });

      if (res.data.success) {
        setTempEmail(googleEmail); // Save email for MFA
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