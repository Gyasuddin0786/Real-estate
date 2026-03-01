import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const AuthSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateUser } = useAuth();
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    if (processed) return;
    
    const token = searchParams.get('token');
    const userParam = searchParams.get('user');

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        updateUser(user);
        setProcessed(true);
        
        // Redirect based on user role
        if (user.role === 'owner' || user.role === 'admin') {
          window.location.href = '/dashboard';
        } else {
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        window.location.href = '/login?error=auth_failed';
      }
    } else {
      window.location.href = '/login?error=auth_failed';
    }
  }, [searchParams, updateUser, processed]);

  return (
    <Box 
      display="flex" 
      flexDirection="column" 
      alignItems="center" 
      justifyContent="center" 
      minHeight="100vh"
    >
      <CircularProgress />
      <Typography variant="h6" sx={{ mt: 2 }}>
        Completing authentication...
      </Typography>
    </Box>
  );
};

export default AuthSuccess;