import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

// Configure axios to use our backend API
axios.defaults.baseURL = 'http://localhost:5000';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [loading, setLoading] = useState(true);

  // Set auth token for all future requests
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Load user profile from localStorage to avoid unnecessary API calls
      const savedUser = JSON.parse(localStorage.getItem('currentUser'));
      if (savedUser) {
        setCurrentUser(savedUser);
      } else {
        // If no saved user but we have a token, fetch profile
        fetchUserProfile();
      }
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setCurrentUser(null);
    }
    
    setLoading(false);
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('/api/profile');
      const userData = response.data;
      
      setCurrentUser(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      logout();
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/login', { email, password });
      const { token: newToken, user } = response.data;
      
      // Save token to localStorage
      localStorage.setItem('authToken', newToken);
      localStorage.setItem('currentUser', JSON.stringify(user));
      
      setToken(newToken);
      setCurrentUser(user);
      
      return user;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Login failed");
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await axios.post('/api/register', {
        name,
        email,
        password
      });
      
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Registration failed");
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put('/api/profile', profileData);
      
      // Update local user data
      const updatedUser = {
        ...currentUser,
        ...response.data.user
      };
      
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      
      return updatedUser;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to update profile");
    }
  };

  const updatePassword = async (currentPassword, newPassword) => {
    try {
      const response = await axios.post('/api/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to update password");
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    setToken(null);
    setCurrentUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    currentUser,
    login,
    register,
    logout,
    updateProfile,
    updatePassword,
    isAuthenticated: !!currentUser,
    isAdmin: currentUser?.role === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}