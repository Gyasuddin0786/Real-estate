import React, { useState } from "react";
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Link as MuiLink,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const BASE_API_URL = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '')
  : 'http://localhost:5000';

const ForgotPassword = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const steps = ["Enter Email", "Verify Code", "Reset Password"];

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${BASE_API_URL}/api/auth/forgot-password`,
        { email },
      );
      setSuccess(response.data.message);
      setActiveStep(1);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to send reset code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${BASE_API_URL}/api/auth/verify-reset-code`,
        { email, code },
      );
      setSuccess(response.data.message);
      setActiveStep(2);
    } catch (error) {
      setError(error.response?.data?.message || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${BASE_API_URL}/api/auth/reset-password`,
        {
          email,
          code,
          newPassword,
        },
      );
      setSuccess(response.data.message);
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          textAlign="center"
          fontWeight="bold"
        >
          🔐 Reset Password
        </Typography>
        <Typography
          variant="body1"
          textAlign="center"
          color="text.secondary"
          sx={{ mb: 4 }}
        >
          Follow the steps to reset your password
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {activeStep === 0 && (
          <Box component="form" onSubmit={handleSendCode}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter your email address and we'll send you a 6-digit verification
              code.
            </Typography>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={{ mb: 3 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                mb: 2,
                bgcolor: "#f59e0b",
                "&:hover": { bgcolor: "#d97706" },
              }}
            >
              {loading ? "Sending..." : "Send Verification Code"}
            </Button>
          </Box>
        )}

        {activeStep === 1 && (
          <Box component="form" onSubmit={handleVerifyCode}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter the 6-digit code sent to <strong>{email}</strong>
            </Typography>
            <TextField
              fullWidth
              label="6-Digit Code"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              required
              inputProps={{
                maxLength: 6,
                style: {
                  fontSize: "24px",
                  letterSpacing: "10px",
                  textAlign: "center",
                },
              }}
              sx={{ mb: 3 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading || code.length !== 6}
              sx={{
                mb: 2,
                bgcolor: "#f59e0b",
                "&:hover": { bgcolor: "#d97706" },
              }}
            >
              {loading ? "Verifying..." : "Verify Code"}
            </Button>
            <Button
              fullWidth
              variant="text"
              onClick={() => setActiveStep(0)}
              disabled={loading}
            >
              Back to Email
            </Button>
          </Box>
        )}

        {activeStep === 2 && (
          <Box component="form" onSubmit={handleResetPassword}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create a new password for your account
            </Typography>
            <TextField
              fullWidth
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              sx={{ mb: 3 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                mb: 2,
                bgcolor: "#10b981",
                "&:hover": { bgcolor: "#059669" },
              }}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </Box>
        )}

        <Typography textAlign="center" sx={{ mt: 2 }}>
          Remember your password?{" "}
          <MuiLink component={Link} to="/login" color="primary">
            Sign in here
          </MuiLink>
        </Typography>
      </Paper>
    </Container>
  );
};

export default ForgotPassword;
