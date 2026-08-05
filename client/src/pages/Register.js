import React, { useState } from 'react';
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

const BASE_API_URL = process.env.REACT_APP_API_URL?.replace(/\/api$/, '') || 'http://localhost:5000';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

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
      const response = await register({ ...formData, role: 'user' });
      // All new users start as 'user' role
      navigate('/');
    } catch (error) {
      setError(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    window.location.href = `${BASE_API_URL}/api/auth/google`;
  };

  const handleGitHubSignup = () => {
    window.location.href = `${BASE_API_URL}/api/auth/github`;
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom textAlign="center" fontWeight="bold">
          Create Account
        </Typography>
        <Typography variant="body1" textAlign="center" color="text.secondary" sx={{ mb: 3 }}>
          Join our real estate platform
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ mb: 3 }}>
          // <Button
          //   fullWidth
          //   variant="contained"
          //   startIcon={<Google />}
          //   onClick={handleGoogleSignup}
          //   disabled={loading}
          //   sx={{ 
          //     mb: 1, 
          //     py: 1.5,
          //     bgcolor: '#4285f4',
          //     color: 'white',
          //     '&:hover': {
          //       bgcolor: '#3367d6'
          //     },
          //     '&:disabled': {
          //       bgcolor: '#cccccc'
          //     }
          //   }}
          // >
          //   {loading ? 'Signing up...' : 'Sign up with Google'}
          // </Button>
          // <Button
          //   fullWidth
          //   variant="contained"
          //   startIcon={<GitHub />}
          //   onClick={handleGitHubSignup}
          //   disabled={loading}
          //   sx={{ 
          //     py: 1.5,
          //     bgcolor: '#333333',
          //     color: 'white',
          //     '&:hover': {
          //       bgcolor: '#24292e'
          //     },
          //     '&:disabled': {
          //       bgcolor: '#cccccc'
          //     }
          //   }}
          // >
          //   {loading ? 'Signing up...' : 'Sign up with GitHub'}
          // </Button>
        </Box>

        <Divider sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            or
          </Typography>
        </Divider>

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
          />
          
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
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="Phone Number"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            sx={{ mb: 3 }}
          />

          <Box sx={{ mb: 3, p: 3, bgcolor: 'info.light', borderRadius: 2 }}>
            <Typography variant="body2" color="white" textAlign="center">
              📝 All new accounts start as <strong>Tenant</strong> by default.<br/>
              Contact admin to upgrade to Property Owner if needed.
            </Typography>
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ mb: 2, bgcolor: '#2563eb' }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>

          <Typography textAlign="center">
            Already have an account?{' '}
            <MuiLink component={Link} to="/login" color="primary">
              Sign in here
            </MuiLink>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default Register;
