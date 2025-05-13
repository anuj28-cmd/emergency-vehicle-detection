import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';

// Lazy load pages for better performance
const Home = React.lazy(() => import('./pages/Home'));
const Detector = React.lazy(() => import('./pages/Detector'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const History = React.lazy(() => import('./pages/History'));
const Statistics = React.lazy(() => import('./pages/Statistics'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Profile = React.lazy(() => import('./pages/Profile'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

// Loading component for suspense fallback
const LoadingPage = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center',
    height: '100vh',
    flexDirection: 'column',
    background: 'linear-gradient(145deg, #0a1929, #12213a)'
  }}>
    <div className="pulse" style={{ 
      width: '100px',
      height: '100px',
      borderRadius: '50%',
      background: 'linear-gradient(145deg, #00e5ff, #2196f3)',
      marginBottom: '20px'
    }}></div>
    <h2 className="gradient-text">Loading...</h2>
  </div>
);

// Protected route component
const ProtectedRoute = ({ children, requireAdmin }) => {
  const { isAuthenticated, currentUser } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (requireAdmin && currentUser?.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

function App() {
  return (
    <React.Suspense fallback={<LoadingPage />}>
      <Layout>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected routes */}
          <Route path="/detector" element={
            <ProtectedRoute>
              <Detector />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          
          {/* Admin-only routes */}
          <Route path="/statistics" element={
            <ProtectedRoute requireAdmin={true}>
              <Statistics />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute requireAdmin={true}>
              <Settings />
            </ProtectedRoute>
          } />
          
          {/* Not found page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </React.Suspense>
  );
}

export default App;