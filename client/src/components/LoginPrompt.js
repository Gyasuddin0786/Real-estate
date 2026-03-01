import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import { Login as LoginIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPrompt = () => {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user && !dismissed) {
      const timer = setTimeout(() => {
        setOpen(true);
      }, 30000); // 30 seconds

      return () => clearTimeout(timer);
    }
  }, [user, dismissed]);

  const handleLogin = () => {
    setOpen(false);
    navigate('/login');
  };

  const handleDismiss = () => {
    setOpen(false);
    setDismissed(true);
  };

  if (user) return null;

  return (
    <Dialog open={open} onClose={handleDismiss} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <LoginIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
        <Typography variant="h5" component="div" fontWeight="bold">
          Join Our Community!
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Get access to exclusive features and personalized property recommendations
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            🏠 Save favorite properties
          </Typography>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            📅 Book properties instantly
          </Typography>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            💬 Chat with property owners
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 2 }}>
        <Button 
          onClick={handleLogin} 
          variant="contained" 
          size="large"
          sx={{ px: 4, py: 1.5 }}
        >
          Sign In / Sign up
        </Button>
        <Button 
          onClick={handleDismiss} 
          variant="outlined" 
          size="large"
          sx={{ px: 4, py: 1.5 }}
        >
          Maybe Later
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LoginPrompt;