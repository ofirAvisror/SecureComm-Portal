import React, { useState } from 'react';
import { Container, Paper, Typography, TextField, Button, Alert, Box, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import apiClient, { extractApiError } from '../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      const res = await apiClient.post('/auth/forgot-password', { email });
      setInfo(res.data.message || 'If the email is registered, a reset code has been sent.');
    } catch (err) {
      setError(extractApiError(err, 'Failed to start password reset.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>Forgot password</Typography>
        <Typography variant="body2" color="text.secondary">
          Enter your account email. If it exists, we will send a reset code to your inbox.
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            inputProps={{ maxLength: 255 }}
          />
          {error && <Alert severity="error">{error}</Alert>}
          {info && <Alert severity="success">{info}</Alert>}
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Sending...' : 'Send reset code'}
          </Button>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Link component={RouterLink} to="/login" variant="body2">
              Back to login
            </Link>
            <Link component={RouterLink} to="/reset-password" variant="body2">
              I have a code
            </Link>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
