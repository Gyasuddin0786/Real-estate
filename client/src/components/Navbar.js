import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { Home, Menu as MenuIcon, Close } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    handleClose();
    setMobileOpen(false);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMobileNavClick = () => {
    setMobileOpen(false);
  };

  const drawer = (
    <Box sx={{ width: 250, pt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, pb: 2 }}>
        <Typography variant="h6" sx={{ color: '#2563eb', fontWeight: 'bold' }}>
          Real-Estate
        </Typography>
        <IconButton onClick={handleDrawerToggle} sx={{ color: '#666' }}>
          <Close />
        </IconButton>
      </Box>

      <Divider />
      <List>
        <ListItem component={Link} to="/properties" onClick={handleMobileNavClick} sx={{ cursor: 'pointer' }}>
          <ListItemText primary="Properties" />
        </ListItem>
        {user ? (
          <>
            <ListItem component={Link} to="/dashboard" onClick={handleMobileNavClick} sx={{ cursor: 'pointer' }}>
              <ListItemText primary="Dashboard" />
            </ListItem>
            {user.role === 'admin' ? (
              <>
                <ListItem component={Link} to="/manage-users" onClick={handleMobileNavClick} sx={{ cursor: 'pointer' }}>
                  <ListItemText primary="Manage Users" />
                </ListItem>
                <ListItem component={Link} to="/manage-properties" onClick={handleMobileNavClick} sx={{ cursor: 'pointer' }}>
                  <ListItemText primary="All Properties" />
                </ListItem>
              </>
            ) : user.role === 'owner' ? (
              <>
                <ListItem component={Link} to="/add-property" onClick={handleMobileNavClick} sx={{ cursor: 'pointer' }}>
                  <ListItemText primary="Add Property" />
                </ListItem>
                <ListItem component={Link} to="/manage-properties" onClick={handleMobileNavClick} sx={{ cursor: 'pointer' }}>
                  <ListItemText primary="Manage Properties" />
                </ListItem>
              </>
            ) : (
              <ListItem component={Link} to="/manage-bookings" onClick={handleMobileNavClick} sx={{ cursor: 'pointer' }}>
                <ListItemText primary="Manage My Bookings" />
              </ListItem>
            )}
            <Divider />
            <ListItem component={Link} to="/profile" onClick={handleMobileNavClick} sx={{ cursor: 'pointer' }}>
              <ListItemText primary="Profile" />
            </ListItem>
            <ListItem onClick={handleLogout} sx={{ cursor: 'pointer' }}>
              <ListItemText primary="Logout" />
            </ListItem>
          </>
        ) : (
          <>
            <ListItem component={Link} to="/login" onClick={handleMobileNavClick} sx={{ cursor: 'pointer' }}>
              <ListItemText primary="Login" />
            </ListItem>
            <ListItem component={Link} to="/register" onClick={handleMobileNavClick} sx={{ cursor: 'pointer' }}>
              <ListItemText primary="Sign Up" />
            </ListItem>
          </>
        )}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar position="sticky" sx={{ backgroundColor: '#fff', color: '#333', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <Toolbar sx={{ px: { xs: 1, sm: 2 }, minHeight: { xs: 56, sm: 64 } }}>
          {/* Mobile menu button */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <IconButton
            component={Link}
            to="/"
            sx={{ mr: 2, color: '#2563eb', display: { xs: 'none', sm: 'inline-flex' } }}
          >
            <Home />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: '#2563eb', fontWeight: 'bold' }}>
            Real-Estate
          </Typography>

          {/* Desktop menu */}
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 2 }}>
            <Button component={Link} to="/properties" sx={{ color: '#333' }}>
              Properties
            </Button>
            
            {user ? (
              <>
                <Button component={Link} to="/dashboard" sx={{ color: '#333' }}>
                  Dashboard
                </Button>
                {user.role === 'admin' ? (
                  <>
                    <Button component={Link} to="/manage-users" sx={{ color: '#333' }}>
                      Manage Users
                    </Button>
                    <Button component={Link} to="/manage-properties" sx={{ color: '#333' }}>
                      All Properties
                    </Button>
                  </>
                ) : user.role === 'owner' ? (
                  <>
                    <Button component={Link} to="/add-property" sx={{ color: '#333' }}>
                      Add Property
                    </Button>
                    <Button component={Link} to="/manage-properties" sx={{ color: '#333' }}>
                      Manage Properties
                    </Button>
                  </>
                ) : (
                  <Button component={Link} to="/manage-bookings" sx={{ color: '#333' }}>
                    Manage My Bookings
                  </Button>
                )}
                <IconButton onClick={handleMenu} sx={{ color: '#333' }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: '#2563eb' }}>
                    {user.name.charAt(0)}
                  </Avatar>
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                >
                  <MenuItem component={Link} to="/profile" onClick={handleClose}>Profile</MenuItem>
                  <Divider />
                  <MenuItem onClick={handleLogout}>Logout</MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <Button component={Link} to="/login" sx={{ color: '#333' }}>
                  Login
                </Button>
                <Button 
                  component={Link} 
                  to="/register" 
                  variant="contained"
                  sx={{ bgcolor: '#2563eb' }}
                >
                  Sign Up
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 250 },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
};

export default Navbar;