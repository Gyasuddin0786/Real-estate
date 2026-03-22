import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Properties from './pages/Properties';
import PropertyDetail from './pages/PropertyDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import AddProperty from './pages/AddProperty';
import ManageProperties from './pages/ManageProperties';
import EditProperty from './pages/EditProperty';
import ManageBookings from './pages/ManageBookings';
import PaymentSuccess from './pages/PaymentSuccess';
import Profile from './pages/Profile';
import AuthSuccess from './pages/AuthSuccess';
import ManageUsers from './pages/ManageUsers';
import OwnerManageUsers from './pages/OwnerManageUsers';
import ChatBot from './bot/components/ChatBotSimple';
import LoginPrompt from './components/LoginPrompt';
import Footer from './components/Footer';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb',
    },
    secondary: {
      main: '#f59e0b',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  components: {
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: '16px',
          paddingRight: '16px',
          '@media (min-width: 600px)': {
            paddingLeft: '24px',
            paddingRight: '24px',
          },
        },
      },
    },
  },
});

const BlockedScreen = () => {
  const { logout } = useAuth();
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(135deg, #1e1e2e 0%, #2d1b1b 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'white', borderRadius: '20px', padding: '48px 40px',
        maxWidth: '440px', width: '90%', textAlign: 'center',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
      }}>
        <div style={{ fontSize: '72px', marginBottom: '16px' }}>🚫</div>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', marginBottom: '12px' }}>
          Account Blocked
        </h2>
        <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: '1.6', marginBottom: '8px' }}>
          Your account has been <strong>blocked by the platform owner</strong>.
        </p>
        <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '32px' }}>
          You cannot access this platform until your account is reactivated.
          Please contact support for assistance.
        </p>
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: '10px', padding: '12px 16px', marginBottom: '28px'
        }}>
          <p style={{ color: '#dc2626', fontSize: '13px', margin: 0 }}>
            📧 support@realestate.com
          </p>
        </div>
        <button
          onClick={logout}
          style={{
            width: '100%', padding: '12px', borderRadius: '10px',
            background: '#dc2626', color: 'white', border: 'none',
            fontSize: '15px', fontWeight: '600', cursor: 'pointer'
          }}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

const AppContent = () => {
  const { isBlocked } = useAuth();
  if (isBlocked) return <BlockedScreen />;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Box component="main" sx={{ flexGrow: 1, width: '100%', overflow: 'hidden' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/property/:id" element={<PropertyDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/add-property" element={<ProtectedRoute><AddProperty /></ProtectedRoute>} />
          <Route path="/manage-properties" element={<ProtectedRoute><ManageProperties /></ProtectedRoute>} />
          <Route path="/edit-property/:id" element={<ProtectedRoute><EditProperty /></ProtectedRoute>} />
          <Route path="/manage-bookings" element={<ProtectedRoute><ManageBookings /></ProtectedRoute>} />
          <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/manage-users" element={<ProtectedRoute><ManageUsers /></ProtectedRoute>} />
          <Route path="/owner-manage-users" element={<ProtectedRoute><OwnerManageUsers /></ProtectedRoute>} />
          <Route path="/auth/success" element={<AuthSuccess />} />
        </Routes>
      </Box>
      <ChatBot />
      <LoginPrompt />
      <Footer />
    </Box>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;