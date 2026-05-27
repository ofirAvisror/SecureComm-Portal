import React, { useEffect, useState } from 'react';
import {
  Container, Paper, Typography, TextField, Button, Alert, Box, Grid,
  Table, TableHead, TableRow, TableCell, TableBody, Divider,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import apiClient, { extractApiError } from '../api/client';
import { useAuth } from '../state/AuthContext';

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  packageId: '',
  sectorId: ''
};

export default function Dashboard() {
  const { user } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [packages, setPackages] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [lastAdded, setLastAdded] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadCustomers = async () => {
    try {
      const res = await apiClient.get('/customers');
      setCustomers(res.data.customers || []);
    } catch (err) {
      setError(extractApiError(err, 'Failed to load customers.'));
    }
  };

  const loadCatalog = async () => {
    try {
      const [pkgRes, secRes] = await Promise.all([
        apiClient.get('/catalog/packages'),
        apiClient.get('/catalog/sectors')
      ]);
      setPackages(pkgRes.data.packages || []);
      setSectors(secRes.data.sectors || []);
    } catch (err) {
      setError(extractApiError(err, 'Failed to load packages and sectors.'));
    }
  };

  useEffect(() => {
    loadCatalog();
    loadCustomers();
  }, []);

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await apiClient.post('/customers', form);
      const created = res.data.customer;
      setLastAdded(created);
      setForm(initialForm);
      await loadCustomers();
    } catch (err) {
      setError(extractApiError(err, 'Failed to create customer.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Welcome, {user ? user.username : 'Guest'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add a new Comunication_LTD customer.
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Full name"
                value={form.fullName}
                onChange={handleChange('fullName')}
                required
                inputProps={{ maxLength: 120 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                required
                inputProps={{ maxLength: 255 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Phone"
                value={form.phone}
                onChange={handleChange('phone')}
                inputProps={{ maxLength: 32 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel id="package-label">Internet package</InputLabel>
                <Select
                  labelId="package-label"
                  label="Internet package"
                  value={form.packageId}
                  onChange={handleChange('packageId')}
                >
                  <MenuItem value="">None</MenuItem>
                  {packages.map(p => (
                    <MenuItem key={p.id} value={String(p.id)}>{p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel id="sector-label">Sector</InputLabel>
                <Select
                  labelId="sector-label"
                  label="Sector"
                  value={form.sectorId}
                  onChange={handleChange('sectorId')}
                >
                  <MenuItem value="">None</MenuItem>
                  {sectors.map(s => (
                    <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Saving...' : 'Add customer'}
            </Button>
          </Box>
        </Box>

        {lastAdded && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Alert severity="success">
              {/* PART B (section 4): stored XSS */}
              New customer added: <strong dangerouslySetInnerHTML={{ __html: lastAdded.full_name }} />
            </Alert>
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 4 }}>
        <Typography variant="h6" gutterBottom>Recent customers</Typography>
        {customers.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No customers yet.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Package</TableCell>
                <TableCell>Sector</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.map(c => (
                <TableRow key={c.id}>
                  <TableCell dangerouslySetInnerHTML={{ __html: c.full_name }} />
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.phone || ''}</TableCell>
                  <TableCell>{c.package_name || ''}</TableCell>
                  <TableCell>{c.sector || ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Container>
  );
}
