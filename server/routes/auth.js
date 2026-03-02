const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { sendWelcomeEmail } = require('../utils/emailService');

const router = express.Router();

// Configure Google OAuth
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    let isNewUser = false;
    
    if (user) {
      return done(null, user);
    }
    
    const email = profile.emails?.[0]?.value;
    if (email) {
      user = await User.findOne({ email });
      if (user) {
        user.googleId = profile.id;
        await user.save();
        return done(null, user);
      }
    }
    
    isNewUser = true;
    user = new User({
      googleId: profile.id,
      name: profile.displayName,
      email: email || `google_${profile.id}@oauth.local`,
      avatar: profile.photos?.[0]?.value,
      role: 'user'
    });
    
    await user.save();
    
    // Send welcome email for new users
    if (isNewUser && email) {
      sendWelcomeEmail(user.email, user.name).catch(err => 
        console.error('Failed to send welcome email:', err)
      );
    }
    
    done(null, user);
  } catch (error) {
    done(error, null);
  }
}));

// Configure GitHub OAuth
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: "/api/auth/github/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ githubId: profile.id });
    let isNewUser = false;
    
    if (user) {
      return done(null, user);
    }
    
    const email = profile.emails?.[0]?.value;
    if (email) {
      user = await User.findOne({ email });
      if (user) {
        user.githubId = profile.id;
        await user.save();
        return done(null, user);
      }
    }
    
    isNewUser = true;
    user = new User({
      githubId: profile.id,
      name: profile.displayName || profile.username,
      email: email || `github_${profile.id}@oauth.local`,
      avatar: profile.photos?.[0]?.value,
      role: 'user'
    });
    
    await user.save();
    
    // Send welcome email for new users
    if (isNewUser && email) {
      sendWelcomeEmail(user.email, user.name).catch(err => 
        console.error('Failed to send welcome email:', err)
      );
    }
    
    done(null, user);
  } catch (error) {
    done(error, null);
  }
}));

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes working!' });
});

// Register route
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    
    // Create new user - always with 'user' role for security
    const user = new User({
      name,
      email,
      password,
      phone,
      role: 'user' // Force all new registrations to be 'user' role
    });
    
    await user.save();
    
    // Send welcome email
    sendWelcomeEmail(user.email, user.name).catch(err => 
      console.error('Failed to send welcome email:', err)
    );
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Forgot Password - Send Reset Code
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }
    
    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save code and expiry (10 minutes)
    user.resetPasswordToken = resetCode;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save();
    
    // Send email
    const { sendPasswordResetEmail } = require('../utils/emailService');
    await sendPasswordResetEmail(user.email, user.name, resetCode);
    
    res.json({ message: 'Password reset code sent to your email' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify Reset Code
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    const user = await User.findOne({ 
      email,
      resetPasswordToken: code,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }
    
    res.json({ message: 'Code verified successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    
    const user = await User.findOne({ 
      email,
      resetPasswordToken: code,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }
    
    // Update password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Debug route
router.get('/debug', (req, res) => {
  res.json({
    message: 'OAuth Debug Info',
    googleConfigured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    githubConfigured: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    clientUrl: process.env.CLIENT_URL,
    routes: {
      google: '/api/auth/google',
      googleCallback: '/api/auth/google/callback',
      github: '/api/auth/github', 
      githubCallback: '/api/auth/github/callback'
    }
  });
});

// Get current user route
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Google OAuth routes
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(400).json({ 
      error: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file' 
    });
  }
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next);
});

router.get('/google/callback', 
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=google_auth_failed`
  }),
  (req, res) => {
    try {
      if (!req.user) {
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=no_user`);
      }
      
      const token = jwt.sign(
        { userId: req.user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      const user = {
        id: req.user._id.toString(),
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      };
      
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/success?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);
    } catch (error) {
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=callback_error`);
    }
  }
);

// GitHub OAuth routes
router.get('/github', (req, res, next) => {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return res.status(400).json({ 
      error: 'GitHub OAuth not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env file' 
    });
  }
  passport.authenticate('github', {
    scope: ['user:email']
  })(req, res, next);
});

router.get('/github/callback',
  passport.authenticate('github', { 
    session: false,
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=github_auth_failed`
  }),
  (req, res) => {
    try {
      if (!req.user) {
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=no_user`);
      }
      
      const token = jwt.sign(
        { userId: req.user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      const user = {
        id: req.user._id.toString(),
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      };
      
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/success?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);
    } catch (error) {
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=callback_error`);
    }
  }
);

module.exports = router;