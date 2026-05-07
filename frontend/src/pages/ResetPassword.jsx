import React, { useEffect, useState } from 'react';
import { Container, Paper, Typography, TextField, Button, Alert, Box } from '@mui/material';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import { Link } from '@mui/material';
import apiClient, { extractApiError } from '../api/client';
import PasswordPolicyHint from '../components/PasswordPolicyHint';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ token: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setForm(prev => ({ ...prev, token: tokenFromUrl }));
    }
  }, [searchParams]);

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (form.newPassword !== form.confirm) {
      setError('New passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/auth/reset-password', {
        token: form.token.trim(),
        newPassword: form.newPassword
      });
      setSuccess('Password has been reset. You can now sign in.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(extractApiError(err, 'Failed to reset password.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>Reset password</Typography>
        <Typography variant="body2" color="text.secondary">
          Enter the reset code you received by email and choose a new password.
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Reset code"
            value={form.token}
            onChange={handleChange('token')}
            required
            inputProps={{ maxLength: 80 }}
          />
          <TextField
            label="New password"
            type="password"
            value={form.newPassword}
            onChange={handleChange('newPassword')}
            required
          />
          <TextField
            label="Confirm new password"
            type="password"
            value={form.confirm}
            onChange={handleChange('confirm')}
            required
          />
          <PasswordPolicyHint />
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Resetting...' : 'Reset password'}
          </Button>
          <Typography variant="body2">
            <Link component={RouterLink} to="/forgot-password">Request a new code</Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
