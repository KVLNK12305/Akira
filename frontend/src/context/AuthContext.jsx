import { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // 1. LOGIN ACTION
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      
      // Save data
      const { token: newToken, ...userData } = res.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      return { success: true };
    } catch (error) {
      console.error("Login Failed:", error.response?.data?.message);
      return { success: false, error: error.response?.data?.error || "Login Failed" };
    }
  };

  // 2. LOGOUT ACTION
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  // 3. REGISTER ACTION (For the Viva demo)
  const register = async (username, email, password, role) => {
    try {
      const res = await api.post('/auth/register', { username, email, password, role });
      const { token: newToken, ...userData } = res.data;
      
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || "Registration Failed" };
    }
  };

  // Check if user is already logged in on refresh
  useEffect(() => {
    const checkUser = async () => {
        // Ideally verify token with backend here, for now we trust the token presence
       setLoading(false);
    };
    checkUser();
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, register, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);