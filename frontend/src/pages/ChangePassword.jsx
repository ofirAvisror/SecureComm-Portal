import React, { useState } from 'react';
import { Container, Paper, Typography, TextField, Button, Alert, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import apiClient, { extractApiError } from '../api/client';
import PasswordPolicyHint from '../components/PasswordPolicyHint';

export default function ChangePassword() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      await apiClient.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });
      setSuccess('Password updated successfully.');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (err) {
      setError(extractApiError(err, 'Failed to change password.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>Change password</Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Current password"
            type="password"
            value={form.currentPassword}
            onChange={handleChange('currentPassword')}
            required
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
            {submitting ? 'Updating...' : 'Update password'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
