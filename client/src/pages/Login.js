import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Link as MuiLink,
  Divider
} from '@mui/material';
import { Google, GitHub } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !hasRedirected) {
      setHasRedirected(true);
      const userRole = user.role;
      if (userRole === 'owner' || userRole === 'admin') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [user, navigate, hasRedirected]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(formData.email, formData.password);
      const userRole = response?.user?.role;
      
      if (userRole === 'owner' || userRole === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

  const handleGitHubLogin = () => {
    window.location.href = 'http://localhost:5000/api/auth/github';
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom textAlign="center" fontWeight="bold">
          Welcome Back
        </Typography>
        <Typography variant="body1" textAlign="center" color="text.secondary" sx={{ mb: 3 }}>
          Sign in to your account
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ mb: 3 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<Google />}
            onClick={handleGoogleLogin}
            disabled={loading}
            sx={{ 
              mb: 1, 
              py: 1.5,
              bgcolor: '#4285f4',
              color: 'white',
              '&:hover': {
                bgcolor: '#3367d6'
              },
              '&:disabled': {
                bgcolor: '#cccccc'
              }
            }}
          >
            Sign in with Google
          </Button>
          <Button
            fullWidth
            variant="contained"
            startIcon={<GitHub />}
            onClick={handleGitHubLogin}
            disabled={loading}
            sx={{ 
              py: 1.5,
              bgcolor: '#333333',
              color: 'white',
              '&:hover': {
                bgcolor: '#24292e'
              },
              '&:disabled': {
                bgcolor: '#cccccc'
              }
            }}
          >
            Sign in with GitHub
          </Button>
        </Box>

        <Divider sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            or
          </Typography>
        </Divider>

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            sx={{ mb: 3 }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ mb: 2, bgcolor: '#2563eb' }}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>

          <Typography textAlign="center">
            Don't have an account?{' '}
            <MuiLink component={Link} to="/register" color="primary">
              Sign up here
            </MuiLink>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login;