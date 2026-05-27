import React, { useState } from 'react';
import { Container, Paper, Typography, TextField, Button, Alert, Box, Link } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { extractApiError } from '../api/client';
import PasswordPolicyHint from '../components/PasswordPolicyHint';

// PART B (section 1): reflected XSS when registration fails — username rendered as HTML.
export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await register(form.username, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(extractApiError(err, 'Registration failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>Register</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Create a new Comunication_LTD account.
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Username"
            value={form.username}
            onChange={handleChange('username')}
            required
            inputProps={{ maxLength: 64 }}
          />
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={handleChange('email')}
            required
            inputProps={{ maxLength: 255 }}
          />
          <TextField
            label="Password"
            type="password"
            value={form.password}
            onChange={handleChange('password')}
            required
          />
          <TextField
            label="Confirm password"
            type="password"
            value={form.confirm}
            onChange={handleChange('confirm')}
            required
          />
          <PasswordPolicyHint />
          {error && <Alert severity="error">{error}</Alert>}
          {error && form.username && (
            <Alert severity="warning">
              Attempted username:{' '}
              <span dangerouslySetInnerHTML={{ __html: form.username }} />
            </Alert>
          )}
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Register'}
          </Button>
          <Typography variant="body2">
            Already have an account?{' '}
            <Link component={RouterLink} to="/login">Sign in</Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
